import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

export type ActividadRow = Database['public']['Tables']['actividades']['Row']
export type ActividadInsert = Database['public']['Tables']['actividades']['Insert']
export type ActividadUpdate = Database['public']['Tables']['actividades']['Update']

export type ActivityStats = {
  totalRecaudado: number
  totalEnCurso: number
}

/**
 * Hook para actividades con métricas de recaudación.
 */
export const useActivities = () => {
  const fetcher = async () => {
    const res = await supabase
      .from('actividades')
      .select('*')
      .order('fecha_evento', { ascending: false })

    if (res.error) throw res.error

    const actividades = res.data as ActividadRow[]
    
    let totalEnCurso = 0

    actividades.forEach(a => {
      if (a.estado === 'En curso') {
        totalEnCurso += Number(a.monto_recaudado) // O podríamos considerarlo solo si está finalizada
      }
    })

    // Sumamos todo el monto recaudado independientemente del estado por ahora, 
    // o dependiendo de la lógica que prefiera el usuario. Asumamos que todo suma.
    const recaudacionGlobal = actividades.reduce((acc, a) => acc + Number(a.monto_recaudado), 0)

    const stats: ActivityStats = {
      totalRecaudado: recaudacionGlobal,
      totalEnCurso,
    }

    return { actividades, stats }
  }

  const { data, error, isLoading, mutate } = useSWR<
    { actividades: ActividadRow[]; stats: ActivityStats },
    Error
  >('api/activities', fetcher)

  const createActivity = async (payload: ActividadInsert) => {
    const { data: newActivity, error } = await supabase
      .from('actividades')
      .insert(payload)
      .select()
      .single()

    if (error) throw error
    await mutate()
    return newActivity
  }

  const updateActivity = async (id: string, payload: ActividadUpdate) => {
    const { data: updatedActivity, error } = await supabase
      .from('actividades')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    await mutate()
    return updatedActivity
  }

  const deleteActivity = async (id: string) => {
    const { error } = await supabase
      .from('actividades')
      .delete()
      .eq('id', id)

    if (error) throw error
    await mutate()
  }

  return { 
    data, 
    error, 
    isLoading, 
    mutate,
    createActivity,
    updateActivity,
    deleteActivity
  }
}
