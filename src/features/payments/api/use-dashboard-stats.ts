import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'

export type DashboardStats = {
  totalIncome: number
  totalExpenses: number
  balance: number
  pendingStudentsCount: number
  totalInscripciones: number
}

type PaymentSummary = {
  perfil_id: string | null
  cuota_id: string | null
  monto_pagado: number
}

type EnrollmentSummary = {
  perfil_id: string
  perfiles: { activo: boolean } | { activo: boolean }[] | null
}

type ActiveQuota = {
  id: string
  monto: number
}

function buildPaymentsMap(payments: PaymentSummary[]) {
  const paymentsMap: Record<string, number> = {}
  for (const payment of payments) {
    if (payment.perfil_id && payment.cuota_id) {
      paymentsMap[`${payment.perfil_id}-${payment.cuota_id}`] = payment.monto_pagado
    }
  }
  return paymentsMap
}

function isActiveEnrollment(enrollment: EnrollmentSummary) {
  const profile = Array.isArray(enrollment.perfiles)
    ? enrollment.perfiles[0]
    : enrollment.perfiles
  return profile?.activo !== false
}

function countPendingStudents(
  enrollments: EnrollmentSummary[],
  activeQuotas: ActiveQuota[],
  paymentsMap: Record<string, number>
) {
  const enrolledIds = new Set(
    enrollments.filter(isActiveEnrollment).map((enrollment) => enrollment.perfil_id)
  )

  let pendingStudentsCount = 0
  for (const profileId of enrolledIds) {
    const hasDebt = activeQuotas.some((quota) => {
      const paidAmount = paymentsMap[`${profileId}-${quota.id}`] || 0
      return paidAmount < quota.monto
    })
    if (hasDebt) pendingStudentsCount++
  }
  return pendingStudentsCount
}

/**
 * Hook analítico: Usa strict 'async-parallel' para disparar requests simultáneas 
 * mitigando el Waterfall, devolviendo métricas unificadas, rápidas usando Promise.all().
 * 
 * "Alumnos con Deuda" ahora evalúa desde la Matriz real:
 * Un alumno tiene deuda si tiene al menos 1 cuota activa sin pago o con pago parcial.
 */
export const useDashboardStats = () => {
  const fetcher = async (): Promise<DashboardStats> => {
    // Disparo PARALELO de todas las queries necesarias
    const [
      pagosRes, 
      egresosRes, 
      inscripcionesRes, 
      cuotasRes, 
      allPagosRes, 
      inscritosRes,
      actividadesRes,
      abonosRes,
      activityBenefitMovementsRes
    ] = await Promise.all([
      supabase.from('pagos').select('monto_pagado').neq('estado', 'Rechazado'),
      supabase.from('egresos').select('monto, estado'),
      supabase.from('inscripciones').select('monto'),
      supabase.from('config_cuotas').select('id, monto').eq('activo', true),
      supabase.from('pagos').select('perfil_id, cuota_id, monto_pagado'),
      supabase.from('inscripciones').select('perfil_id, perfiles!inner(activo)'),
      supabase.from('actividades').select('total_promocion, total_beneficio, monto_recaudado'),
      supabase.from('abonos_egresos').select('monto_abono'),
      supabase.from('pago_movimientos').select('monto').eq('origen', 'beneficio_actividad'),
    ])

    if (pagosRes.error) throw pagosRes.error
    if (egresosRes.error) throw egresosRes.error
    if (inscripcionesRes.error) throw inscripcionesRes.error
    if (cuotasRes.error) throw cuotasRes.error
    if (allPagosRes.error) throw allPagosRes.error
    if (inscritosRes.error) throw inscritosRes.error
    if (actividadesRes.error) throw actividadesRes.error
    if (abonosRes.error) throw abonosRes.error
    if (activityBenefitMovementsRes.error) throw activityBenefitMovementsRes.error

    const totalPagos = pagosRes.data.reduce((acc, cur) => acc + cur.monto_pagado, 0)
    const totalInscripciones = inscripcionesRes.data.reduce((acc, cur) => acc + cur.monto, 0)
    const totalActivityPromotion = actividadesRes.data.reduce(
      (acc, cur) => acc + Number(cur.total_promocion ?? cur.monto_recaudado ?? 0),
      0
    )
    const totalActivityBenefit = actividadesRes.data.reduce((acc, cur) => acc + Number(cur.total_beneficio ?? 0), 0)
    const totalActivityBenefitApplied = activityBenefitMovementsRes.data.reduce((acc, movement) => acc + Number(movement.monto ?? 0), 0)
    const totalActivityPendingBenefit = Math.max(0, totalActivityBenefit - totalActivityBenefitApplied)
    const totalActividades = totalActivityPromotion + totalActivityPendingBenefit
    
    const totalIncome = totalPagos + totalInscripciones + totalActividades
    
    // El gasto real es la suma de todos los abonos realizados
    const totalExpenses = abonosRes.data.reduce((acc, cur) => acc + cur.monto_abono, 0)

    // Evaluar deudores reales desde la Matriz:
    // Un alumno tiene deuda si existe al menos 1 cuota activa que NO pagó completamente
    const paymentsMap = buildPaymentsMap(allPagosRes.data)
    const pendingStudentsCount = countPendingStudents(
      inscritosRes.data,
      cuotasRes.data,
      paymentsMap
    )

    return {
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      pendingStudentsCount,
      totalInscripciones,
    }
  }

  const { data, error, isLoading, mutate } = useSWR<DashboardStats, Error>('api/dashboard-stats', fetcher)

  return { data, error, isLoading, mutate }
}
