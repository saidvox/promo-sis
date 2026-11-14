import { useState } from 'react'
import { SaveIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel, FieldGroup } from '@/components/ui/field'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { SalonObjeto } from '@/types/mesas.types'
import type { MatrixData } from '@/features/payments/api/use-payments-matrix'
import type { MesasData } from '../api/use-mesas'
import type { MesaAction } from './mesa-family-panel'
import { familyColor } from '../utils/salon-geometry'
import { MesaAssignmentControl } from './mesa-assignment-control'
import { useMesaPermissions } from '../utils/mesa-permissions'

export function MesaObjectPanel({ object, data, matrix, busy, onAction, onSave }: {
  object: SalonObjeto; data: MesasData; matrix: MatrixData; busy: boolean
  onAction: MesaAction; onSave: (object: SalonObjeto) => Promise<void>
}) {
  const [name, setName] = useState(object.nombre)
  const { canManage } = useMesaPermissions()
  const [width, setWidth] = useState(String(object.ancho))
  const [height, setHeight] = useState(String(object.alto))
  const profileMap = new Map(matrix.perfilesInscritos.map((p) => [p.id, p]))

  return <div className="flex flex-col gap-5">
    {object.tipo === 'mesa_familiar' && <>
      <h2 className="text-base font-semibold">Mesa familiar · 8 asientos</h2>
      <p className="text-sm text-muted-foreground">Esta mesa está libre. Asigna al graduado cuya familia ocupará sus ocho asientos.</p>
      <MesaAssignmentControl key={object.version} object={object} objects={data.objetos} profiles={matrix.perfilesInscritos} busy={busy} onAction={onAction} />
    </>}
    <form className="flex flex-col gap-3" onSubmit={(event) => {
      event.preventDefault()
      void onSave({ ...object, nombre: name.trim(), ancho: Number(width), alto: Number(height) })
    }}>
      <h2 className="text-base font-semibold">{object.tipo === 'mesa_extras' ? 'Mesa compartida · 8 asientos' : object.tipo === 'zona' ? 'Zona del salón' : 'Nombre de la mesa'}</h2>
      <FieldGroup>
        <Field><FieldLabel htmlFor="objeto-nombre">Nombre en el plano</FieldLabel><Input id="objeto-nombre" value={name} onChange={(event) => setName(event.target.value)} required maxLength={80} disabled={busy} /></Field>
        {object.tipo === 'zona' && <>
          <Field><FieldLabel htmlFor="objeto-ancho">Ancho en el plano</FieldLabel><Input id="objeto-ancho" type="number" min="80" max="4000" value={width} onChange={(event) => setWidth(event.target.value)} required disabled={busy} /></Field>
          <Field><FieldLabel htmlFor="objeto-alto">Alto en el plano</FieldLabel><Input id="objeto-alto" type="number" min="80" max="4000" value={height} onChange={(event) => setHeight(event.target.value)} required disabled={busy} /></Field>
        </>}
      </FieldGroup>
      <Button type="submit" variant="outline" disabled={busy}><SaveIcon data-icon="inline-start" />Guardar nombre{object.tipo === 'zona' && ' y tamaño'}</Button>
    </form>
    {object.tipo === 'mesa_extras' && <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">Familia de cada asiento</h3>
      <p className="text-xs text-muted-foreground">Los colores identifican los roles del comité; el resto de familias se ve en blanco y negro. Para mover un invitado, libera su asiento y asígnalo en la posición deseada.</p>
      {Array.from({ length: 8 }, (_, index) => {
        const position = index + 1
        const seat = data.asientos.find((item) => item.objeto_id === object.id && item.posicion === position)
        const options = data.resumen.filter((item) =>
          item.extras_usados > item.asientos_asignados || item.perfil_id === seat?.perfil_id
        )
        const family = data.resumen.find((item) => item.perfil_id === seat?.perfil_id)
        const guestOptions = Array.from({length: family?.extras_usados ?? 0}, (_, index) => {
          const guestPosition = index + 9
          const guest = data.invitados.find((item) => item.perfil_id === seat?.perfil_id && item.posicion === guestPosition)
          return { position: guestPosition, label: guest ? `${guest.nombres} ${guest.apellidos}`.trim() : `Extra ${index+1} · Sin nombre` }
        })
        return <div key={position} className="flex flex-col gap-2 rounded-lg border p-3"><div className="flex items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full border text-xs" style={seat ? { borderColor: familyColor(profileMap.get(seat.perfil_id)?.rol) } : undefined}>{position}</span>
          <Select value={seat?.perfil_id ?? 'libre'} disabled={busy || !canManage(seat?.perfil_id)} onValueChange={(value) => {
            const profileId = value === 'libre' ? null : value
            if ((seat?.perfil_id ?? null) === profileId) return
            void onAction(() => supabase.rpc('asignar_asiento_mesa', {
              p_objeto: object.id, p_posicion: position, p_perfil_id: profileId, p_version: object.version,
            }), 'Asiento actualizado')
          }}>
            <SelectTrigger className="w-full min-w-0" aria-label={`Familia del asiento ${position}`}><SelectValue>{seat ? profileMap.get(seat.perfil_id)?.nombre_completo ?? 'Familia no disponible' : 'Asiento libre'}</SelectValue></SelectTrigger>
            <SelectContent><SelectGroup>
              <SelectItem value="libre">Asiento libre</SelectItem>
              {options.map((item) => <SelectItem key={item.perfil_id} value={item.perfil_id} disabled={!canManage(item.perfil_id)}>{profileMap.get(item.perfil_id)?.nombre_completo ?? 'Participante'}</SelectItem>)}
            </SelectGroup></SelectContent>
          </Select>
        </div>{seat && <Select value={String(seat.invitado_posicion ?? '')} disabled={busy || !canManage(seat.perfil_id)} onValueChange={(value) => {
          if (!value || Number(value) === seat.invitado_posicion) return
          void onAction(() => supabase.rpc('asignar_invitado_asiento_mesa', { p_objeto: object.id, p_posicion: position, p_perfil_id: seat.perfil_id, p_invitado_posicion: Number(value), p_version: object.version }), 'Invitado asignado a la silla')
        }}>
          <SelectTrigger className="w-full" aria-label={'Invitado del asiento ' + position}><SelectValue>{guestOptions.find((guest) => guest.position === seat.invitado_posicion)?.label ?? 'Elegir invitado'}</SelectValue></SelectTrigger>
          <SelectContent><SelectGroup>{guestOptions.map((guest) => <SelectItem key={guest.position} value={String(guest.position)}>{guest.label}</SelectItem>)}</SelectGroup></SelectContent>
        </Select>}</div>
      })}
    </div>}
  </div>
}
