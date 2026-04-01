import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type PerfilMin = Pick<Database['public']['Tables']['perfiles']['Row'], 'id' | 'nombre_completo' | 'dni' | 'codigo_u'>
type CuotaMin = Pick<Database['public']['Tables']['config_cuotas']['Row'], 'id' | 'mes_nombre' | 'monto'>

export type PaymentDependencies = {
  perfiles: PerfilMin[]
  cuotas: CuotaMin[]
}

/**
 * Hook para traer las dependencias necesarias para crear un pago (Alumnos y Cuotas activas).
 * Cumple Vercel Best Practices: async-parallel mediante Promise.all para evitar waterfalls
 * al abrir el modal de registro de pagos.
 */
export const usePaymentDependencies = () => {
  const fetcher = async (): Promise<PaymentDependencies> => {
    // Promise.all garantiza el fetch paralelo de ambos recursos independientes
    const [perfilesResult, cuotasResult] = await Promise.all([
      supabase
        .from('perfiles')
        .select('id, nombre_completo, dni, codigo_u')
        .order('nombre_completo', { ascending: true }),
        
      supabase
        .from('config_cuotas')
        .select('id, mes_nombre, monto')
        .eq('activo', true)
        .order('created_at', { ascending: true })
    ])

    if (perfilesResult.error) throw perfilesResult.error
    if (cuotasResult.error) throw cuotasResult.error

    return {
      perfiles: perfilesResult.data as PerfilMin[],
      cuotas: cuotasResult.data as CuotaMin[]
    }
  }

  const { data, error, isLoading, mutate } = useSWR<PaymentDependencies, Error>(
    'api/payment-dependencies',
    fetcher,
    {
      revalidateOnFocus: false, // Las dependencias no mutan tan frecuentemente
    }
  )

  return { data, error, isLoading, mutate }
}
