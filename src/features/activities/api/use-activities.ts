import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'
import { recordAuditEvent } from '@/features/audit/api/audit-events'
import { toAuditJson } from '@/features/audit/utils/audit-format'

export type ActividadRow = Database['public']['Tables']['actividades']['Row']
export type ActividadInsert = Database['public']['Tables']['actividades']['Insert']
export type ActividadUpdate = Database['public']['Tables']['actividades']['Update']
export type ActividadGrupoRow = Database['public']['Tables']['actividad_grupos']['Row']
export type ActividadParticipanteRow = Database['public']['Tables']['actividad_participantes']['Row']

export type ActivityStats = {
  totalRecaudado: number
  totalEnCurso: number
}

type ActivityBenefitMovement = {
  pago_id: string | null
  monto: number
}

async function revertPaymentMovement(movement: ActivityBenefitMovement) {
  if (!movement.pago_id) return

  const pagoRes = await supabase
    .from('pagos')
    .select('id, monto_pagado, config_cuotas(monto)')
    .eq('id', movement.pago_id)
    .single()

  if (pagoRes.error) throw pagoRes.error

  const cuota = Array.isArray(pagoRes.data.config_cuotas)
    ? pagoRes.data.config_cuotas[0]
    : pagoRes.data.config_cuotas
  const nextAmount = Math.max(0, Number(pagoRes.data.monto_pagado) - Number(movement.monto))
  const nextState = nextAmount >= Number(cuota?.monto ?? 0) ? 'Pagado' : 'Pendiente'

  if (nextAmount <= 0) {
    const { error } = await supabase.from('pagos').delete().eq('id', movement.pago_id)
    if (error) throw error
    return
  }

  const { error } = await supabase
    .from('pagos')
    .update({
      monto_pagado: nextAmount,
      estado: nextState,
      updated_at: new Date().toISOString(),
    })
    .eq('id', movement.pago_id)

  if (error) throw error
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
    await recordAuditEvent({
      action: 'activity.created',
      entityType: 'actividad',
      entityId: newActivity.id,
      summary: `Creo actividad ${newActivity.nombre}`,
      metadata: {
        nombre: newActivity.nombre,
        estado: newActivity.estado,
        fecha_evento: newActivity.fecha_evento,
      },
      afterData: toAuditJson(newActivity),
    })
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
    await recordAuditEvent({
      action: 'activity.updated',
      entityType: 'actividad',
      entityId: id,
      summary: `Edito actividad ${updatedActivity.nombre}`,
      metadata: {
        nombre: updatedActivity.nombre,
        estado: updatedActivity.estado,
        fecha_evento: updatedActivity.fecha_evento,
      },
      afterData: toAuditJson(updatedActivity),
    })
    await mutate()
    return updatedActivity
  }

  const deleteActivity = async (id: string) => {
    const existing = data?.actividades.find((activity) => activity.id === id)
    const { error } = await supabase
      .from('actividades')
      .delete()
      .eq('id', id)

    if (error) throw error
    await recordAuditEvent({
      action: 'activity.deleted',
      entityType: 'actividad',
      entityId: id,
      summary: `Elimino actividad ${existing?.nombre ?? id}`,
      metadata: { nombre: existing?.nombre ?? null },
      beforeData: toAuditJson(existing ?? { id }),
    })
    await mutate()
  }

  const revertActivity = async (id: string) => {
    const movimientosRes = await supabase
      .from('pago_movimientos')
      .select('id, pago_id, monto')
      .eq('actividad_id', id)
      .eq('origen', 'beneficio_actividad')

    if (movimientosRes.error) throw movimientosRes.error

    for (const movimiento of movimientosRes.data ?? []) {
      await revertPaymentMovement(movimiento)
    }

    const deleteMovementsRes = await supabase
      .from('pago_movimientos')
      .delete()
      .eq('actividad_id', id)
      .eq('origen', 'beneficio_actividad')

    if (deleteMovementsRes.error) throw deleteMovementsRes.error

    const resetParticipantsRes = await supabase
      .from('actividad_participantes')
      .update({
        monto_beneficio_aplicado: 0,
        monto_beneficio_pendiente: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('actividad_id', id)

    if (resetParticipantsRes.error) throw resetParticipantsRes.error

    const revertedActivity = await updateActivity(id, {
      estado: 'En curso',
      monto_recaudado: 0,
      total_bruto: 0,
      total_promocion: 0,
      total_beneficio: 0,
      total_premios_externos: 0,
    })
    await recordAuditEvent({
      action: 'activity.reverted',
      entityType: 'actividad',
      entityId: id,
      summary: `Revirtio actividad ${revertedActivity.nombre}`,
      metadata: {
        movimientos_revertidos: movimientosRes.data?.length ?? 0,
      },
      afterData: toAuditJson(revertedActivity),
    })
  }

  return { 
    data, 
    error, 
    isLoading, 
    mutate,
    createActivity,
    updateActivity,
    deleteActivity,
    revertActivity
  }
}
