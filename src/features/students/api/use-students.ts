import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

// Supabase devuelve un objeto singular (no array) para relaciones isOneToOne
export type Perfil = Database['public']['Tables']['perfiles']['Row'] & {
  inscripciones: { id: string } | null
}

/**
 * Data fetching hook para obtener perfiles aplicando 'client-swr-dedup'.
 * Retorna estudiantes vs comité usando filtrado directo sin dobles requests.
 * Incluye un left-join con inscripciones para saber si pagaron matrícula.
 */
export const useStudents = () => {
  const fetcher = async () => {
    const { data, error } = await supabase
      .from('perfiles')
      .select('*, inscripciones(id)')
      .order('nombre_completo', { ascending: true })

    if (error) {
      throw error
    }

    const all = (data ?? []) as unknown as Perfil[]
    const students = all.filter((p) => p.rol === 'Alumno')
    const staff = all.filter((p) => p.rol !== 'Alumno')

    return { all, students, staff }
  }

  const { data, error, isLoading, mutate } = useSWR<
    { all: Perfil[]; students: Perfil[]; staff: Perfil[] },
    Error
  >('api/students', fetcher)

  return { data, error, isLoading, mutate }
}
