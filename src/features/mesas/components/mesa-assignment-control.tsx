import { useState } from 'react'
import { ArrowRightLeftIcon, LockKeyholeIcon, SaveIcon, UserRoundMinusIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import type { MatrixData } from '@/features/payments/api/use-payments-matrix'
import type { SalonObjeto } from '@/types/mesas.types'
import type { MesaAction } from './mesa-family-panel'
import { ParticipantPicker } from './participant-picker'
import { useMesaPermissions } from '../utils/mesa-permissions'

export function MesaAssignmentControl({ object, objects, profiles, busy, onAction }: {
  object: SalonObjeto; objects: SalonObjeto[]; profiles: MatrixData['perfilesInscritos']; busy: boolean; onAction: MesaAction
}) {
  const [chosen, setChosen] = useState(object.perfil_id ?? '')
  const { canManage } = useMesaPermissions()
  const locked = !canManage(object.perfil_id)
  const current = profiles.find((profile) => profile.id === object.perfil_id)
  const otherTable = objects.find((item) => item.perfil_id === chosen && item.id !== object.id)
  const details = Object.fromEntries(objects.filter((item) => item.perfil_id).map((item) => [item.perfil_id!, item.nombre]))
  const changed = chosen !== (object.perfil_id ?? '')
  return <div className="flex flex-col gap-3">
    <Field>
      <FieldLabel>Graduado y familia</FieldLabel>
      <ParticipantPicker profiles={profiles.filter((profile) => profile.activo && profile.inscrito)} value={chosen} onSelect={setChosen} details={details} disabledIds={profiles.filter((profile) => !canManage(profile.id)).map((profile) => profile.id)} label={'Elegir familia para ' + object.nombre} className="sm:w-full" disabled={busy || locked} />
    </Field>
    {changed && chosen && <p className="flex gap-2 text-xs text-muted-foreground"><ArrowRightLeftIcon className="mt-0.5 size-3.5 shrink-0" />{otherTable
      ? current ? `Se intercambiarán las familias de ${object.nombre} y ${otherTable.nombre}.` : `La familia pasará de ${otherTable.nombre} a ${object.nombre}; su mesa anterior quedará libre.`
      : current ? `${current.nombre_completo} quedará sin mesa. Sus pagos y extras se conservan.` : 'Esta familia ocupará los ocho asientos incluidos de la mesa.'}</p>}
    {locked && <p className="flex items-start gap-2 text-xs text-muted-foreground"><LockKeyholeIcon className="size-3.5 shrink-0" />Elección protegida: solo su titular o el owner puede cambiarla.</p>}
    <Button size="sm" disabled={busy || locked || !canManage(chosen) || !chosen || !changed} onClick={() => { void onAction(() => supabase.rpc('asignar_familia_mesa', { p_objeto: object.id, p_version: object.version, p_perfil_id: chosen }), 'Familia asignada a ' + object.nombre) }}><SaveIcon data-icon="inline-start" />{otherTable && current ? 'Intercambiar familias' : 'Asignar familia'}</Button>
    {object.perfil_id && <Button size="sm" variant="ghost" disabled={busy || locked} onClick={() => { void onAction(() => supabase.rpc('asignar_familia_mesa', { p_objeto: object.id, p_version: object.version, p_perfil_id: null }), 'Mesa disponible para asignar') }}><UserRoundMinusIcon data-icon="inline-start" />Dejar mesa libre</Button>}
  </div>
}
