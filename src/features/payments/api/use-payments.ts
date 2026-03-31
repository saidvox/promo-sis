import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type PagoRow = Database['public']['Tables']['pagos']['Row']
type PerfilRow = Pick<Database['public']['Tables']['perfiles']['Row'], 'nombre_completo' | 'codigo_u' | 'dni'>
type CuotaRow = Pick<Database['public']['Tables']['config_cuotas']['Row'], 'mes_nombre' | 'monto' | 'activo'>

export type PagoConDetalles = PagoRow & {
  perfil: PerfilRow | null
  config_cuotas: CuotaRow | null
}

/**
 * Hook para traer pagos en bulk junto con la configuración de la cuota pagada y el usuario.
 * Cumple Vercel Best Practices de Deduplicación mediante SWR y fetch consolidado.
 */
export const usePayments = () => {
  const fetcher = async () => {
    // Left Join explícito a config_cuotas y perfiles
    const { data, error } = await supabase
      .from('pagos')
      .select(`
        *,
        perfil:perfiles ( nombre_completo, codigo_u, dni ),
        config_cuotas:config_cuotas ( mes_nombre, monto, activo )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return data as any as PagoConDetalles[]
  }

  const { data, error, isLoading, mutate } = useSWR<PagoConDetalles[], Error>('api/payments', fetcher)

  return { data, error, isLoading, mutate }
}
