import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'
import { refreshMesas } from './use-mesas'

export function useFamilyGuests(profileId: string, open: boolean) {
  const result = useSWR(open ? ['api/family-guests', profileId] : null, async () => {
    const { error: prepareError } = await supabase.rpc('preparar_mesas_evento')
    if (prepareError) throw prepareError
    const [guests, version, summary, seats, objects] = await Promise.all([
      supabase.from('mesa_invitados').select('*').eq('perfil_id', profileId).order('posicion'),
      supabase.from('mesa_invitados_versiones').select('version').eq('perfil_id', profileId).maybeSingle(),
      supabase.from('mesas_resumen').select('*').eq('perfil_id', profileId).maybeSingle(),
      supabase.from('mesa_asientos').select('*').eq('perfil_id', profileId),
      supabase.from('salon_objetos').select('*'),
    ])
    for (const response of [guests,version,summary,seats,objects]) if (response.error) throw response.error
    return { guests: guests.data ?? [], version: version.data?.version ?? 0, extras: summary.data?.extras_usados ?? 0, seats: seats.data ?? [], objects: objects.data ?? [] }
  }, { revalidateOnFocus: false })
  return { ...result, refresh: refreshMesas }
}

export type FamilyGuestsData = NonNullable<ReturnType<typeof useFamilyGuests>['data']>
