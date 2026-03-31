import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'

export type DashboardStats = {
  totalIncome: number
  totalExpenses: number
  balance: number
  pendingStudentsCount: number
}

/**
 * Hook analítico: Usa strict 'async-parallel' para disparar requests simultáneas 
 * mitigando el Waterfall, devolviendo métricas unificadas, rápidas usando Promise.all().
 */
export const useDashboardStats = () => {
  const fetcher = async (): Promise<DashboardStats> => {
    // Disparo PARALELO de las tres queries necesarias (Async-Parallel Rule)
    const [pagosRes, pendingPagosRes, egresosRes] = await Promise.all([
      supabase.from('pagos').select('monto_pagado').eq('estado', 'Pagado'),
      supabase.from('pagos').select('perfil_id').eq('estado', 'Pendiente'),
      supabase.from('egresos').select('monto')
    ])

    // Validación de errores unificada
    if (pagosRes.error) throw pagosRes.error
    if (pendingPagosRes.error) throw pendingPagosRes.error
    if (egresosRes.error) throw egresosRes.error

    const totalIncome = pagosRes.data.reduce((acc, current) => acc + current.monto_pagado, 0)
    const totalExpenses = egresosRes.data.reduce((acc, current) => acc + current.monto, 0)
    
    // Contar cuántos estudiantes únicos tienen pagos pendientes
    const uniquePendingStudents = new Set(pendingPagosRes.data.map(p => p.perfil_id))
    const pendingStudentsCount = uniquePendingStudents.size

    return {
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      pendingStudentsCount
    }
  }

  const { data, error, isLoading, mutate } = useSWR<DashboardStats, Error>('api/dashboard-stats', fetcher)

  return { data, error, isLoading, mutate }
}
