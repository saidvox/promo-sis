import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'

export type DashboardStats = {
  totalIncome: number
  totalExpenses: number
  balance: number
  pendingStudentsCount: number
  totalInscripciones: number
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
      abonosRes
    ] = await Promise.all([
      supabase.from('pagos').select('monto_pagado').neq('estado', 'Rechazado'),
      supabase.from('egresos').select('monto, estado'),
      supabase.from('inscripciones').select('monto'),
      supabase.from('config_cuotas').select('id, monto').eq('activo', true),
      supabase.from('pagos').select('perfil_id, cuota_id, monto_pagado'),
      supabase.from('inscripciones').select('perfil_id, perfiles!inner(activo)'),
      supabase.from('actividades').select('monto_recaudado'),
      supabase.from('abonos_egresos').select('monto_abono'),
    ])

    if (pagosRes.error) throw pagosRes.error
    if (egresosRes.error) throw egresosRes.error
    if (inscripcionesRes.error) throw inscripcionesRes.error
    if (cuotasRes.error) throw cuotasRes.error
    if (allPagosRes.error) throw allPagosRes.error
    if (inscritosRes.error) throw inscritosRes.error
    if (actividadesRes.error) throw actividadesRes.error
    if (abonosRes.error) throw abonosRes.error

    const totalPagos = pagosRes.data.reduce((acc, cur) => acc + cur.monto_pagado, 0)
    const totalInscripciones = inscripcionesRes.data.reduce((acc, cur) => acc + cur.monto, 0)
    const totalActividades = actividadesRes.data.reduce((acc, cur) => acc + Number(cur.monto_recaudado), 0)
    
    const totalIncome = totalPagos + totalInscripciones + totalActividades
    
    // El gasto real es la suma de todos los abonos realizados
    const totalExpenses = abonosRes.data.reduce((acc, cur) => acc + cur.monto_abono, 0)

    // Evaluar deudores reales desde la Matriz:
    // Un alumno tiene deuda si existe al menos 1 cuota activa que NO pagó completamente
    const cuotasActivas = cuotasRes.data
    const pagosMap: Record<string, number> = {}
    for (const p of allPagosRes.data) {
      if (p.perfil_id && p.cuota_id) {
        pagosMap[`${p.perfil_id}-${p.cuota_id}`] = p.monto_pagado
      }
    }

    const enrolledIds = new Set(
      inscritosRes.data
        .filter((i: any) => {
          const perfil = Array.isArray(i.perfiles) ? i.perfiles[0] : i.perfiles
          return perfil?.activo !== false
        })
        .map(i => i.perfil_id)
    )
    let pendingStudentsCount = 0

    for (const perfilId of enrolledIds) {
      for (const cuota of cuotasActivas) {
        const montoPagado = pagosMap[`${perfilId}-${cuota.id}`] || 0
        if (montoPagado < cuota.monto) {
          pendingStudentsCount++
          break // Basta 1 mes con deuda para contar al alumno
        }
      }
    }

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
