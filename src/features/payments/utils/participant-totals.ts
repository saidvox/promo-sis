import type { MatrixData } from '../api/use-payments-matrix'

export const formatMoney = (amount: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount)

export function getParticipantTotals(data: MatrixData, profileId: string) {
  const quotas = Object.values(data.cuotasPorMes).filter((fee) => fee.mes_nombre !== 'Enero')
  const promotionExpected = 100 + quotas.reduce((total, fee) => total + Number(fee.monto), 0)
  const promotionPaid = Number(data.inscripcionesMap[profileId] ?? 0) + quotas.reduce((total, fee) => {
    const payment = data.pagosMap[`${profileId}-${fee.id}`]
    return total + (payment?.estado === 'Rechazado' ? 0 : Number(payment?.monto_pagado ?? 0))
  }, 0)
  const extras = data.mesasMap[profileId]
  const extrasExpected = Number(extras?.costo_extras ?? 0)
  const extrasPaid = Number(extras?.abonado_extras ?? 0)
  const promotionDebt = Math.max(0, promotionExpected - promotionPaid)
  const extrasDebt = Math.max(0, extrasExpected - extrasPaid)
  return {
    promotionExpected, promotionPaid, promotionDebt, extrasExpected, extrasPaid, extrasDebt,
    totalExpected: promotionExpected + extrasExpected,
    totalPaid: promotionPaid + extrasPaid,
    totalDebt: promotionDebt + extrasDebt,
  }
}
