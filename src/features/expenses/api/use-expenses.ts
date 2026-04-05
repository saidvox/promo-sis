import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

export type EgresoRow = Database['public']['Tables']['egresos']['Row']

export type AbonoRow = {
  id: string
  egreso_id: string
  monto_abono: number
  fecha_pago: string
  created_at: string
}

export type EgresoWithAbonos = EgresoRow & {
  abonos_egresos: AbonoRow[]
}

export type ExpenseStats = {
  saldoDisponible: number
  totalPagadoProductora: number
  totalPagadoOtros: number
  totalComprometido: number
}

/**
 * Hook para egresos con métricas financieras.
 * Vercel Best Practice: async-parallel con joins para integridad.
 */
export const useExpenses = () => {
  const fetcher = async () => {
    const [egresosRes, pagosRes, inscripcionesRes] = await Promise.all([
      supabase
        .from('egresos')
        .select('*, abonos_egresos(*)')
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

    const egresos = egresosRes.data as EgresoWithAbonos[]
    
    const totalIngresos = 
      pagosRes.data.reduce((acc, p) => acc + p.monto_pagado, 0) +
      inscripcionesRes.data.reduce((acc, i) => acc + i.monto, 0)

    // El "Total Gastado" es la suma de TODOS los abonos efectivamente realizados
    let totalAbonadoAcumulado = 0
    let totalPagadoProductora = 0
    let totalPagadoOtros = 0
    let totalComprometido = 0

    egresos.forEach(e => {
      const pagadoEsteEgreso = e.abonos_egresos.reduce((acc: number, a: AbonoRow) => acc + a.monto_abono, 0)
      totalAbonadoAcumulado += pagadoEsteEgreso
      
      if (e.categoria === 'Productora') {
        totalPagadoProductora += pagadoEsteEgreso
      } else {
        totalPagadoOtros += pagadoEsteEgreso
      }

      if (e.estado === 'Pendiente') {
        totalComprometido += (e.monto - pagadoEsteEgreso)
      }
    })

    const stats: ExpenseStats = {
      saldoDisponible: totalIngresos - totalAbonadoAcumulado,
      totalPagadoProductora,
      totalPagadoOtros,
      totalComprometido,
    }

    return { egresos, stats }
  }

  const { data, error, isLoading, mutate } = useSWR<
    { egresos: EgresoWithAbonos[]; stats: ExpenseStats },
    Error
  >('api/expenses', fetcher)

  return { data, error, isLoading, mutate }
}
