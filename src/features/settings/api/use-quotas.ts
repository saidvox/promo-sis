import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'
import { recordAuditEvent } from '@/features/audit/api/audit-events'
import { toAuditJson } from '@/features/audit/utils/audit-format'

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
      const payload = { monto, fecha_vencimiento, updated_at: new Date().toISOString() }
      const { error } = await supabase
        .from('config_cuotas')
        .update(payload)
        .eq('id', existing.id)
      
      if (error) throw error
      await recordAuditEvent({
        action: 'quota.updated',
        entityType: 'config_cuota',
        entityId: existing.id,
        summary: `Edito cuota ${mes_nombre} a S/ ${monto.toFixed(2)}`,
        metadata: { mes_nombre, monto, fecha_vencimiento },
        beforeData: toAuditJson(existing),
        afterData: toAuditJson(payload),
      })
    } else {
      const payload = { mes_nombre, monto, fecha_vencimiento }
      const { data: newQuota, error } = await supabase
        .from('config_cuotas')
        .insert(payload)
        .select('id')
        .single()
      
      if (error) throw error
      await recordAuditEvent({
        action: 'quota.created',
        entityType: 'config_cuota',
        entityId: newQuota.id,
        summary: `Creo cuota ${mes_nombre} por S/ ${monto.toFixed(2)}`,
        metadata: { mes_nombre, monto, fecha_vencimiento },
        afterData: toAuditJson(payload),
      })
    }

    // Invalidar caché para forzar refresco del módulo matriz también
    await mutate()
    // Como otros hooks usan esta data, podríamos despachar un evento global,
    // pero SWR global mutate también sirve:
    import('swr').then(m => m.mutate('api/payments-matrix'))
  }

  const deleteQuota = async (id: string) => {
    const existing = data?.find((quota) => quota.id === id)
    // Alarma: borrar configuración de un mes podría violar FK constraints si ya tiene pagos.
    // Solo permitir si no tiene pagos.
    const { error } = await supabase
      .from('config_cuotas')
      .delete()
      .eq('id', id)
      
    if (error) throw error
    await recordAuditEvent({
      action: 'quota.deleted',
      entityType: 'config_cuota',
      entityId: id,
      summary: `Elimino cuota ${existing?.mes_nombre ?? id}`,
      metadata: { mes_nombre: existing?.mes_nombre ?? null },
      beforeData: toAuditJson(existing ?? { id }),
    })
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
