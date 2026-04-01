import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type InscripcionRow = Database['public']['Tables']['inscripciones']['Row']
type PerfilRow = Pick<Database['public']['Tables']['perfiles']['Row'], 'id' | 'nombre_completo' | 'dni' | 'rol'>

export type InscripcionWithPerfil = InscripcionRow & {
  perfil: PerfilRow
}

export const useInscripciones = () => {
  const fetcher = async (): Promise<InscripcionWithPerfil[]> => {
    const { data, error } = await supabase
      .from('inscripciones')
      .select(`
        *,
        perfil:perfiles(id, nombre_completo, dni, rol)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    
    // Type assertion since we know we're joining
    return (data as any) as InscripcionWithPerfil[]
  }

  const { data, error, isLoading, mutate } = useSWR<InscripcionWithPerfil[], Error>(
    'api/inscripciones',
    fetcher
  )

  return { 
    data, 
    error, 
    isLoading,
    mutate 
  }
}
