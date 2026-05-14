import type { MatrixData, MesAno } from '../api/use-payments-matrix'
import { MESES_DEL_ANO } from '../api/use-payments-matrix'

const INSCRIPCION_AMOUNT = 100
const MONEY_FORMAT = '"S/ "#,##0.00'
const PERCENT_FORMAT = '0.0%'

type ExcelStatus = 'Al dia' | 'Parcial' | 'Pendiente' | 'Sin configurar'

type MonthDetail = {
  month: MesAno
  concept: string
  expected: number
  paid: number
  manualPaid: number
  activityBenefit: number
  debt: number
  status: ExcelStatus
  dueDate: string
  origins: string
}

type ParticipantReportRow = {
  id: string
  name: string
  code: string
  dni: string
  role: string
  generalStatus: 'Al dia' | 'Con deuda'
  expected: number
  paid: number
  debt: number
  progress: number
  months: MonthDetail[]
}

function normalizePaidAmount(amount: number | null | undefined, rejected?: boolean) {
  if (rejected) return 0
  return Number(amount ?? 0)
}

function getMonthDetail(data: MatrixData, profileId: string, month: MesAno): MonthDetail {
  if (month === 'Enero') {
    const paid = normalizePaidAmount(data.inscripcionesMap[profileId])
    const debt = Math.max(INSCRIPCION_AMOUNT - paid, 0)

    return {
      month,
      concept: 'Inscripcion',
      expected: INSCRIPCION_AMOUNT,
      paid,
      manualPaid: paid,
      activityBenefit: 0,
      debt,
      status: paid >= INSCRIPCION_AMOUNT ? 'Al dia' : paid > 0 ? 'Parcial' : 'Pendiente',
      dueDate: '-',
      origins: 'Inscripcion',
    }
  }

  const fee = data.cuotasPorMes[month]
  if (!fee) {
    return {
      month,
      concept: 'Cuota mensual',
      expected: 0,
      paid: 0,
      manualPaid: 0,
      activityBenefit: 0,
      debt: 0,
      status: 'Sin configurar',
      dueDate: '-',
      origins: '-',
    }
  }

  const payment = data.pagosMap[`${profileId}-${fee.id}`]
  const movements = data.paymentMovementsMap[`${profileId}-${fee.id}`] ?? []
  const activityBenefit = movements
    .filter((movement) => movement.origen === 'beneficio_actividad')
    .reduce((total, movement) => total + Number(movement.monto), 0)
  const manualPaid = movements
    .filter((movement) => movement.origen === 'manual')
    .reduce((total, movement) => total + Number(movement.monto), 0)
  const origins = movements.length > 0
    ? movements.map((movement) => {
        const label = movement.origen === 'beneficio_actividad'
          ? `Beneficio: ${movement.actividades?.nombre ?? 'Actividad'}`
          : 'Manual'
        return `${label} S/ ${Number(movement.monto).toFixed(2)}`
      }).join(' | ')
    : 'Sin historial'
  const paid = normalizePaidAmount(payment?.monto_pagado, payment?.estado === 'Rechazado')
  const expected = Number(fee.monto ?? 0)
  const debt = Math.max(expected - paid, 0)

  return {
    month,
    concept: 'Cuota mensual',
    expected,
    paid,
    manualPaid,
    activityBenefit,
    debt,
    status: paid >= expected ? 'Al dia' : paid > 0 ? 'Parcial' : 'Pendiente',
    dueDate: fee.fecha_vencimiento ?? '-',
    origins,
  }
}

function buildReportRows(data: MatrixData): ParticipantReportRow[] {
  return data.perfilesInscritos.map((profile) => {
    const months = MESES_DEL_ANO.map((month) => getMonthDetail(data, profile.id, month))
    const expected = months.reduce((total, month) => total + month.expected, 0)
    const paid = months.reduce((total, month) => total + month.paid, 0)
    const debt = Math.max(expected - paid, 0)

    return {
      id: profile.id,
      name: profile.nombre_completo,
      code: profile.codigo_u ?? '',
      dni: profile.dni ?? '',
      role: profile.rol ?? 'Alumno',
      generalStatus: debt <= 0 ? 'Al dia' : 'Con deuda',
      expected,
      paid,
      debt,
      progress: expected > 0 ? paid / expected : 0,
      months,
    }
  })
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

function argb(hex: string) {
  return `FF${hex.replace('#', '').toUpperCase()}`
}

function statusFill(status: ExcelStatus | ParticipantReportRow['generalStatus']) {
  if (status === 'Al dia') return argb('#DCFCE7')
  if (status === 'Parcial') return argb('#FEF3C7')
  if (status === 'Sin configurar') return argb('#F1F5F9')
  return argb('#FFE4E6')
}

function statusFont(status: ExcelStatus | ParticipantReportRow['generalStatus']) {
  if (status === 'Al dia') return argb('#166534')
  if (status === 'Parcial') return argb('#92400E')
  if (status === 'Sin configurar') return argb('#64748B')
  return argb('#9F1239')
}

export async function exportPaymentsExcel(data: MatrixData) {
  const ExcelJSModule = await import('exceljs')
  const WorkbookCtor = ExcelJSModule.Workbook ?? ExcelJSModule.default.Workbook
  const rows = buildReportRows(data)

  const workbook = new WorkbookCtor()
  workbook.creator = 'Promo SIS'
  workbook.created = new Date()
  workbook.modified = new Date()

  const summary = workbook.addWorksheet('Resumen', {
    views: [{ showGridLines: false }],
  })
  const matrix = workbook.addWorksheet('Matriz de cuotas', {
    views: [{ state: 'frozen', xSplit: 5, ySplit: 6, showGridLines: false }],
  })
  const detail = workbook.addWorksheet('Detalle mensual', {
    views: [{ state: 'frozen', ySplit: 1, showGridLines: false }],
  })

  const totalExpected = rows.reduce((total, row) => total + row.expected, 0)
  const totalPaid = rows.reduce((total, row) => total + row.paid, 0)
  const totalDebt = rows.reduce((total, row) => total + row.debt, 0)
  const upToDateCount = rows.filter((row) => row.generalStatus === 'Al dia').length
  const debtCount = rows.length - upToDateCount

  summary.mergeCells('A1:H1')
  summary.getCell('A1').value = 'Reporte de cuotas - Promocion Sistemas'
  summary.getCell('A1').font = { bold: true, size: 18, color: { argb: argb('#0F172A') } }
  summary.getCell('A1').alignment = { vertical: 'middle' }
  summary.getRow(1).height = 30

  summary.mergeCells('A2:H2')
  summary.getCell('A2').value = `Generado el ${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`
  summary.getCell('A2').font = { color: { argb: argb('#64748B') } }

  const kpis = [
    ['Participantes', rows.length],
    ['Al dia', upToDateCount],
    ['Con deuda', debtCount],
    ['Esperado', totalExpected],
    ['Recaudado', totalPaid],
    ['Pendiente', totalDebt],
  ]

  for (let rowIndex = 4; rowIndex <= 5; rowIndex += 1) {
    for (let columnIndex = 1; columnIndex <= 6; columnIndex += 1) {
      summary.getCell(rowIndex, columnIndex).border = {
        top: { style: 'thin', color: { argb: argb('#E2E8F0') } },
        left: { style: 'thin', color: { argb: argb('#E2E8F0') } },
        bottom: { style: 'thin', color: { argb: argb('#E2E8F0') } },
        right: { style: 'thin', color: { argb: argb('#E2E8F0') } },
      }
    }
  }

  kpis.forEach(([label, value], index) => {
    const column = index + 1
    summary.getCell(4, column).value = label
    summary.getCell(4, column).font = { bold: true, color: { argb: argb('#64748B') }, size: 10 }
    summary.getCell(5, column).value = value
    summary.getCell(5, column).font = { bold: true, color: { argb: argb('#0F172A') }, size: 14 }
    summary.getCell(5, column).numFmt = column >= 4 ? MONEY_FORMAT : '#,##0'
    summary.getColumn(column).width = 16
  })

  summary.getCell('A8').value = 'Recaudacion por mes'
  summary.getCell('A8').font = { bold: true, size: 13, color: { argb: argb('#0F172A') } }
  summary.addTable({
    name: 'ResumenMensual',
    ref: 'A10',
    headerRow: true,
    totalsRow: true,
    style: { theme: 'TableStyleMedium4', showRowStripes: true },
    columns: [
      { name: 'Mes', filterButton: true, totalsRowLabel: 'Total' },
      { name: 'Esperado', filterButton: false, totalsRowFunction: 'sum' },
      { name: 'Recaudado', filterButton: false, totalsRowFunction: 'sum' },
      { name: 'Pendiente', filterButton: false, totalsRowFunction: 'sum' },
      { name: 'Avance', filterButton: false },
    ],
    rows: MESES_DEL_ANO.map((month) => {
      const monthlyExpected = rows.reduce((total, row) => total + row.months.find((item) => item.month === month)!.expected, 0)
      const monthlyPaid = rows.reduce((total, row) => total + row.months.find((item) => item.month === month)!.paid, 0)
      const monthlyDebt = Math.max(monthlyExpected - monthlyPaid, 0)
      return [month, monthlyExpected, monthlyPaid, monthlyDebt, monthlyExpected > 0 ? monthlyPaid / monthlyExpected : 0]
    }),
  })
  for (let rowIndex = 11; rowIndex <= 23; rowIndex += 1) {
    summary.getCell(rowIndex, 2).numFmt = MONEY_FORMAT
    summary.getCell(rowIndex, 3).numFmt = MONEY_FORMAT
    summary.getCell(rowIndex, 4).numFmt = MONEY_FORMAT
    summary.getCell(rowIndex, 5).numFmt = PERCENT_FORMAT
  }
  summary.getColumn(1).width = 18
  summary.getColumn(5).width = 14

  matrix.mergeCells('A1:Q1')
  matrix.getCell('A1').value = 'Matriz de cuotas por participante'
  matrix.getCell('A1').font = { bold: true, size: 16, color: { argb: argb('#0F172A') } }
  matrix.getCell('A2').value = 'Cada mes muestra el monto pagado y estado. Los pagos rechazados no se cuentan como recaudado.'
  matrix.mergeCells('A2:Q2')
  matrix.getCell('A2').font = { color: { argb: argb('#64748B') } }

  const matrixHeaders = [
    'Alumno',
    'Codigo',
    'DNI',
    'Rol',
    'Estado',
    'Esperado',
    'Pagado',
    'Deuda',
    'Avance',
    ...MESES_DEL_ANO,
  ]
  matrix.getRow(5).values = matrixHeaders
  matrix.getRow(5).height = 24
  matrix.getRow(5).eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb('#0F172A') } }
    cell.font = { bold: true, color: { argb: argb('#FFFFFF') }, size: 10 }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })

  rows.forEach((row, index) => {
    const excelRow = matrix.getRow(index + 6)
    excelRow.values = [
      row.name,
      row.code,
      row.dni,
      row.role,
      row.generalStatus,
      row.expected,
      row.paid,
      row.debt,
      row.progress,
      ...row.months.map((month) => {
        if (month.status === 'Sin configurar') return '-'
        return `${month.status} | S/ ${month.paid.toFixed(2)}`
      }),
    ]

    excelRow.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusFill(row.generalStatus) } }
    excelRow.getCell(5).font = { bold: true, color: { argb: statusFont(row.generalStatus) } }
    excelRow.getCell(6).numFmt = MONEY_FORMAT
    excelRow.getCell(7).numFmt = MONEY_FORMAT
    excelRow.getCell(8).numFmt = MONEY_FORMAT
    excelRow.getCell(9).numFmt = PERCENT_FORMAT

    row.months.forEach((month, monthIndex) => {
      const cell = excelRow.getCell(10 + monthIndex)
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusFill(month.status) } }
      cell.font = { color: { argb: statusFont(month.status) }, size: 9 }
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    })
  })

  matrix.columns = [
    { width: 34 },
    { width: 14 },
    { width: 12 },
    { width: 14 },
    { width: 13 },
    { width: 13 },
    { width: 13 },
    { width: 13 },
    { width: 11 },
    ...MESES_DEL_ANO.map(() => ({ width: 16 })),
  ]
  matrix.eachRow((row, rowNumber) => {
    if (rowNumber < 5) return
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: argb('#E2E8F0') } },
        left: { style: 'thin', color: { argb: argb('#E2E8F0') } },
        bottom: { style: 'thin', color: { argb: argb('#E2E8F0') } },
        right: { style: 'thin', color: { argb: argb('#E2E8F0') } },
      }
    })
  })
  matrix.autoFilter = {
    from: { row: 5, column: 1 },
    to: { row: Math.max(rows.length + 5, 6), column: matrixHeaders.length },
  }

  detail.columns = [
    { header: 'Alumno', key: 'name', width: 34 },
    { header: 'Codigo', key: 'code', width: 14 },
    { header: 'DNI', key: 'dni', width: 12 },
    { header: 'Rol', key: 'role', width: 14 },
    { header: 'Mes', key: 'month', width: 14 },
    { header: 'Concepto', key: 'concept', width: 18 },
    { header: 'Vencimiento', key: 'dueDate', width: 15 },
    { header: 'Esperado', key: 'expected', width: 14 },
    { header: 'Pagado', key: 'paid', width: 14 },
    { header: 'Manual', key: 'manualPaid', width: 14 },
    { header: 'Beneficio actividad', key: 'activityBenefit', width: 20 },
    { header: 'Deuda', key: 'debt', width: 14 },
    { header: 'Estado', key: 'status', width: 16 },
    { header: 'Origen', key: 'origins', width: 44 },
  ]
  detail.getRow(1).eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb('#0F172A') } }
    cell.font = { bold: true, color: { argb: argb('#FFFFFF') } }
    cell.alignment = { horizontal: 'center' }
  })
  rows.forEach((row) => {
    row.months.forEach((month) => {
      detail.addRow({
        name: row.name,
        code: row.code,
        dni: row.dni,
        role: row.role,
        month: month.month,
        concept: month.concept,
        dueDate: month.dueDate,
        expected: month.expected,
        paid: month.paid,
        manualPaid: month.manualPaid,
        activityBenefit: month.activityBenefit,
        debt: month.debt,
        status: month.status,
        origins: month.origins,
      })
    })
  })
  detail.getColumn('expected').numFmt = MONEY_FORMAT
  detail.getColumn('paid').numFmt = MONEY_FORMAT
  detail.getColumn('manualPaid').numFmt = MONEY_FORMAT
  detail.getColumn('activityBenefit').numFmt = MONEY_FORMAT
  detail.getColumn('debt').numFmt = MONEY_FORMAT
  detail.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const status = row.getCell('status').value as ExcelStatus
    row.getCell('status').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusFill(status) } }
    row.getCell('status').font = { bold: true, color: { argb: statusFont(status) } }
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: argb('#E2E8F0') } },
        left: { style: 'thin', color: { argb: argb('#E2E8F0') } },
        bottom: { style: 'thin', color: { argb: argb('#E2E8F0') } },
        right: { style: 'thin', color: { argb: argb('#E2E8F0') } },
      }
    })
  })
  detail.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(detail.rowCount, 2), column: 14 },
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  const date = new Date().toISOString().slice(0, 10)
  downloadBlob(blob, `reporte-cuotas-promo-sis-${date}.xlsx`)
}
