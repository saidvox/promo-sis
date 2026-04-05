import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

export type EgresoRow = Database['public']['Tables']['egresos']['Row']

export type ExpenseStats = {
  saldoDisponible: number
  totalPagadoProductora: number
  totalPagadoOtros: number
  totalComprometido: number
}

/**
 * Hook para egresos con métricas financieras.
 * Vercel Best Practice: async-parallel para cálculos globales.
 */
export const useExpenses = () => {
  const fetcher = async () => {
    const [egresosRes, pagosRes, inscripcionesRes] = await Promise.all([
      supabase
        .from('egresos')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('pagos')
        .select('monto_pagado')
        .eq('estado', 'Pagado'),
      supabase
        .from('inscripciones')
        .select('monto'),
    ])

    if (egresosRes.error) throw egresosRes.error
    if (pagosRes.error) throw pagosRes.error
    if (inscripcionesRes.error) throw inscripcionesRes.error

    const egresos = egresosRes.data as EgresoRow[]
    
    const totalIngresos = 
      pagosRes.data.reduce((acc, p) => acc + p.monto_pagado, 0) +
      inscripcionesRes.data.reduce((acc, i) => acc + i.monto, 0)

    const egresosPagados = egresos.filter(e => e.estado === 'Pagado')
    const egresosPendientes = egresos.filter(e => e.estado === 'Pendiente')

    const totalGastado = egresosPagados.reduce((acc, e) => acc + e.monto, 0)

    const stats: ExpenseStats = {
      saldoDisponible: totalIngresos - totalGastado,
      totalPagadoProductora: egresosPagados.filter(e => e.categoria === 'Productora').reduce((acc, e) => acc + e.monto, 0),
      totalPagadoOtros: egresosPagados.filter(e => e.categoria !== 'Productora').reduce((acc, e) => acc + e.monto, 0),
      totalComprometido: egresosPendientes.reduce((acc, e) => acc + e.monto, 0),
    }

    return { egresos, stats }
  }

  const { data, error, isLoading, mutate } = useSWR<
    { egresos: EgresoRow[]; stats: ExpenseStats },
    Error
  >('api/expenses', fetcher)

  return { data, error, isLoading, mutate }
}
