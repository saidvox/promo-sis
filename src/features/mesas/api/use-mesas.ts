import useSWR, { mutate } from 'swr'
import { supabase } from '@/lib/supabase/client'
import type { MesaResumen, MesaAsiento, MesaCesion, MesaAbono, MesaInvitado, MesaCuenta, SalonObjeto } from '@/types/mesas.types'

export type MesasData = {
  resumen: MesaResumen[]
  objetos: SalonObjeto[]
  asientos: MesaAsiento[]
  cesiones: MesaCesion[]
  abonos: MesaAbono[]
  invitados: MesaInvitado[]
  cuentas: MesaCuenta[]
}

async function fetchMesas(): Promise<MesasData> {
  const { error: prepareError } = await supabase.rpc('preparar_mesas_evento')
  if (prepareError) throw prepareError
  const results = await Promise.all([
    supabase.from('mesas_resumen').select('*'),
    supabase.from('salon_objetos').select('*').order('nombre'),
    supabase.from('mesa_asientos').select('*'),
    supabase.from('mesa_cesiones').select('*').order('created_at', { ascending: false }),
    supabase.from('mesa_abonos').select('*').order('created_at', { ascending: false }),
    supabase.from('mesa_invitados').select('*'),
    supabase.from('mesa_cuentas_sistema').select('*'),
  ])
  for (const result of results) if (result.error) throw result.error
  return {
    resumen: results[0].data ?? [],
    objetos: results[1].data ?? [],
    asientos: results[2].data ?? [],
    cesiones: results[3].data ?? [],
    abonos: results[4].data ?? [],
    invitados: results[5].data ?? [],
    cuentas: results[6].data ?? [],
  }
}

export function useMesas() {
  return useSWR<MesasData, Error>('api/mesas', fetchMesas, {
    revalidateOnFocus: false,
    refreshInterval: 60_000,
  })
}

export async function refreshMesas() {
  await Promise.all([
    mutate('api/mesas'),
    mutate('api/payments-matrix'),
    mutate('api/dashboard-stats'),
    mutate((key) => Array.isArray(key) && String(key[0]).includes('audit-logs')),
    mutate((key) => Array.isArray(key) && key[0] === 'api/family-guests'),
  ])
}

export async function saveSalonObject(object: SalonObjeto) {
  const { error } = await supabase.rpc('guardar_objeto_salon', {
    p_id: object.id,
    p_version: object.version,
    p_x: Math.round(object.x),
    p_y: Math.round(object.y),
    p_nombre: object.nombre.trim(),
    p_ancho: Math.round(object.ancho),
    p_alto: Math.round(object.alto),
  })
  if (error) throw new Error(error.message)
  await mutate('api/mesas')
}
