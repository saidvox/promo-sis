import { useState } from 'react'
import { ArmchairIcon, CheckCircle2Icon, SaveIcon, UsersIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { useIsMobile } from '@/hooks/use-mobile'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { useFamilyGuests, type FamilyGuestsData } from '../api/use-family-guests'
import type { MesaInvitado } from '@/types/mesas.types'

type Profile = { id: string; nombre_completo: string }

export function FamilyGuestsContent({ profile, open }: { profile: Profile; open: boolean }) {
  const { data, error, refresh, mutate } = useFamilyGuests(profile.id, open)
  if (error) return <div className="flex flex-col gap-3" role="alert"><p className="text-sm">No se pudo cargar la lista de familiares.</p><Button variant="outline" onClick={() => { void mutate() }}>Reintentar</Button></div>
  if (!data) return <div className="flex flex-col gap-3"><Skeleton className="h-16" /><Skeleton className="h-64" /></div>
  return <FamilyGuestsEditor key={profile.id + '-' + data.version} profile={profile} data={data} onSaved={refresh} />
}

function FamilyGuestsEditor({ profile, data, onSaved }: { profile: Profile; data: FamilyGuestsData; onSaved: () => Promise<void> }) {
  const lastPosition = Math.max(8 + data.extras, ...data.guests.map((guest) => guest.posicion))
  const [guests, setGuests] = useState<MesaInvitado[]>(() => Array.from({ length: lastPosition - 1 }, (_, index) => {
    const position = index + 2
    return data.guests.find((guest) => guest.posicion === position) ?? { perfil_id: profile.id, posicion: position, nombres: '', apellidos: '' }
  }))
  const [busy, setBusy] = useState(false)
  const completed = guests.filter((guest) => guest.nombres.trim() && guest.apellidos.trim()).length
  const incomplete = guests.some((guest) => Boolean(guest.nombres.trim()) !== Boolean(guest.apellidos.trim()))
  const familyTable = data.objects.find((object) => object.perfil_id === profile.id)
  const change = (position: number, field: 'nombres' | 'apellidos', value: string) => setGuests((current) => current.map((guest) => guest.posicion === position ? { ...guest, [field]: value } : guest))
  return <form className="flex flex-col gap-4" onSubmit={async (event) => {
    event.preventDefault()
    if (incomplete) { toast.error('Completa los nombres y apellidos de cada invitado que empezaste a llenar.'); return }
    setBusy(true)
    try {
      const { error } = await supabase.rpc('guardar_invitados_mesa', { p_perfil_id: profile.id, p_version: data.version, p_invitados: guests.map(({posicion,nombres,apellidos}) => ({posicion,nombres,apellidos})) })
      if (error) throw error
      await onSaved(); toast.success('Nombres de familiares guardados')
    } catch (error) { toast.error(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'No se pudo guardar. Revisa la conexión e intenta de nuevo.') }
    finally { setBusy(false) }
  }}>
    <div className="flex flex-wrap gap-2"><Badge variant="secondary"><UsersIcon />8 incluidos</Badge><Badge variant="outline">{data.extras} extras</Badge><Badge variant="outline"><CheckCircle2Icon />{completed} nombres completos</Badge></div>
    <p className="text-xs text-muted-foreground">Escribe apellidos y nombres completos por separado. Usa Tab para avanzar rápido. Puedes dejar filas vacías; cada invitado que llenes debe tener ambos campos completos.</p>
    <div className="rounded-xl border bg-muted/30 p-3"><span className="mb-1 flex items-center gap-2 text-xs text-muted-foreground"><ArmchairIcon className="size-3.5" />Asiento 1 · Graduado{familyTable ? ' · ' + familyTable.nombre : ' · Mesa por asignar'}</span><p className="text-sm font-semibold">{profile.nombre_completo}</p></div>
    <div className="flex flex-col gap-3">
      {guests.map((guest) => {
        const extra = guest.posicion > 8
        const withoutSlot = guest.posicion > 8 + data.extras
        const seat = data.seats.find((seat) => seat.invitado_posicion === guest.posicion)
        const location = seat ? `${data.objects.find((object) => object.id === seat.objeto_id)?.nombre ?? 'Mesa compartida'} · silla ${seat.posicion}` : extra ? 'Silla por asignar' : familyTable?.nombre ?? 'Mesa por asignar'
        const partial = Boolean(guest.nombres.trim()) !== Boolean(guest.apellidos.trim())
        return <fieldset key={guest.posicion} className="rounded-xl border p-3" disabled={busy}>
          <legend className="px-1 text-xs font-medium">{extra ? 'Extra ' + (guest.posicion-8) : 'Asiento ' + guest.posicion + ' · Familiar'}</legend>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex min-w-0 flex-col gap-1"><label htmlFor={'apellido-invitado-' + guest.posicion} className="text-[11px] text-muted-foreground">Apellidos</label><Input id={'apellido-invitado-' + guest.posicion} value={guest.apellidos} onChange={(event) => change(guest.posicion,'apellidos',event.target.value)} maxLength={120} autoComplete="off" placeholder="Apellidos completos" required={Boolean(guest.nombres.trim())} aria-invalid={partial && !guest.apellidos.trim()} aria-describedby={partial ? 'invitado-incompleto-' + guest.posicion : undefined} aria-label={'Apellidos de ' + (extra ? 'extra ' + (guest.posicion-8) : 'familiar ' + guest.posicion)} /></div>
            <div className="flex min-w-0 flex-col gap-1"><label htmlFor={'nombre-invitado-' + guest.posicion} className="text-[11px] text-muted-foreground">Nombres</label><Input id={'nombre-invitado-' + guest.posicion} value={guest.nombres} onChange={(event) => change(guest.posicion,'nombres',event.target.value)} maxLength={100} autoComplete="off" placeholder="Nombres completos" required={Boolean(guest.apellidos.trim())} aria-invalid={partial && !guest.nombres.trim()} aria-describedby={partial ? 'invitado-incompleto-' + guest.posicion : undefined} aria-label={'Nombres de ' + (extra ? 'extra ' + (guest.posicion-8) : 'familiar ' + guest.posicion)} /></div>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">{withoutSlot ? 'Sin cupo: conserva sus datos. Aumenta los extras para asignarle una silla.' : location}</p>
          {partial && <p id={'invitado-incompleto-' + guest.posicion} className="mt-2 text-xs text-destructive">Completa nombres y apellidos de este invitado.</p>}
        </fieldset>
      })}
    </div>
    <div className="sticky bottom-0 -mx-1 border-t bg-popover px-1 pt-3 pb-1">{incomplete && <p className="mb-2 text-xs text-destructive">Hay invitados con nombres o apellidos incompletos.</p>}<Button type="submit" className="w-full" disabled={busy || incomplete}><SaveIcon data-icon="inline-start" />{busy ? 'Guardando nombres…' : 'Guardar nombres'}</Button></div>
  </form>
}

export function FamilyGuestsDrawer({ profile, open, onOpenChange }: { profile: Profile; open: boolean; onOpenChange: (open: boolean) => void }) {
  const mobile = useIsMobile()
  return <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle={mobile} swipeDirection={mobile ? 'down' : 'right'}>
    <DrawerContent className="data-[swipe-axis=x]:sm:[--drawer-content-width:34rem] data-[swipe-axis=y]:[--drawer-content-max-height:92dvh]">
      <DrawerHeader className="relative gap-2 border-b p-5 pr-12"><DrawerTitle>Familia e invitados</DrawerTitle><DrawerDescription>{profile.nombre_completo}</DrawerDescription><DrawerClose render={<Button variant="ghost" size="icon-sm" className="absolute top-4 right-4" aria-label="Cerrar lista de familiares" />}><XIcon /></DrawerClose></DrawerHeader>
      <div className="min-h-0 flex-1 overflow-y-auto p-5"><FamilyGuestsContent profile={profile} open={open} /></div>
    </DrawerContent>
  </Drawer>
}
