import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type Perfil = Database['public']['Tables']['perfiles']['Row']

/**
 * Data fetching hook para obtener perfiles aplicando 'client-swr-dedup'.
 * Retorna estudiantes vs comité usando filtrado directo sin dobles requests.
 */
export const useStudents = () => {
  const fetcher = async () => {
    const { data, error } = await supabase
      .from('perfiles')
      .select('*')
      .order('nombre_completo', { ascending: true })

    if (error) {
      throw error
    }

    const students = data.filter((p) => p.rol === 'Alumno')
    const staff = data.filter((p) => p.rol !== 'Alumno')

    return { all: data, students, staff }
  }

  const { data, error, isLoading, mutate } = useSWR<
    { all: Perfil[]; students: Perfil[]; staff: Perfil[] },
    Error
  >('api/students', fetcher)

  return { data, error, isLoading, mutate }
}
