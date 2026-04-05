import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

export type ConfigCuota = Database['public']['Tables']['config_cuotas']['Row']

export const MESES_DEL_ANO = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 
  'Mayo', 'Junio', 'Julio', 'Agosto', 
  'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

async function fetchQuotas() {
  const { data, error } = await supabase
    .from('config_cuotas')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export function useQuotas() {
  const { data, error, isLoading, mutate } = useSWR<ConfigCuota[]>(
    'api/config_cuotas',
    fetchQuotas,
    {
      revalidateOnFocus: false,
    }
  )

  const saveQuota = async (mes_nombre: string, monto: number, fecha_vencimiento: string | null) => {
    // Busca si ya existe
    const existing = data?.find((q) => q.mes_nombre === mes_nombre)

    if (existing) {
      const { error } = await supabase
        .from('config_cuotas')
        .update({ monto, fecha_vencimiento, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
      
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('config_cuotas')
        .insert({ mes_nombre, monto, fecha_vencimiento })
      
      if (error) throw error
    }

    // Invalidar caché para forzar refresco del módulo matriz también
    await mutate()
    // Como otros hooks usan esta data, podríamos despachar un evento global,
    // pero SWR global mutate también sirve:
    import('swr').then(m => m.mutate('api/payments-matrix'))
  }

  const deleteQuota = async (id: string) => {
    // Alarma: borrar configuración de un mes podría violar FK constraints si ya tiene pagos.
    // Solo permitir si no tiene pagos.
    const { error } = await supabase
      .from('config_cuotas')
      .delete()
      .eq('id', id)
      
    if (error) throw error
    await mutate()
    import('swr').then(m => m.mutate('api/payments-matrix'))
  }

  // Pre-calcular el mapa agrupado para lectura rápida
  const index = data ? data.reduce((acc, curr) => {
    acc[curr.mes_nombre] = curr
    return acc
  }, {} as Record<string, ConfigCuota>) : {}

  return {
    data: index,
    list: data || [],
    isLoading,
    error,
    saveQuota,
    deleteQuota
  }
}
