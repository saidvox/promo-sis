import { useState } from 'react'
import { ArmchairIcon, LocateFixedIcon, LockKeyholeIcon, SearchIcon, UsersIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getRoleColor } from '@/features/students/utils/get-role-color'
import type { MatrixData } from '@/features/payments/api/use-payments-matrix'
import type { SalonObjeto } from '@/types/mesas.types'
import { familyColor, isCommittee } from '../utils/salon-geometry'
import type { MesaAction } from './mesa-family-panel'
import { MesaAssignmentControl } from './mesa-assignment-control'
import { useMesaPermissions } from '../utils/mesa-permissions'

export function MesasAssignmentBoard({ objects, profiles, busy, onAction, onLocate, mobile = false }: {
  objects: SalonObjeto[]; profiles: MatrixData['perfilesInscritos']; busy: boolean
  onAction: MesaAction; onLocate: (id: string) => void
  mobile?: boolean
}) {
  const [search, setSearch] = useState('')
  const { isProtected, canManage } = useMesaPermissions()
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]))
  const tables = objects.filter((object) => object.tipo === 'mesa_familiar').sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true }))
  const assigned = tables.filter((table) => table.perfil_id).length
  const filtered = tables.filter((table) => `${table.nombre} ${profileMap.get(table.perfil_id ?? '')?.nombre_completo ?? ''}`.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')))
  return <div className="flex min-h-0 flex-1 flex-col gap-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-col gap-1"><h2 className="text-base font-semibold">Asigna una familia a cada mesa</h2><p className="text-xs text-muted-foreground">Elige el número y busca al graduado. El comité aparece primero en los selectores; los pagos se conservan al cambiar de mesa.</p></div>
      <div className="flex gap-2"><Badge variant="secondary"><UsersIcon />{assigned} asignadas</Badge><Badge variant="outline"><ArmchairIcon />{tables.length - assigned} libres</Badge></div>
    </div>
    <div className="relative w-full sm:max-w-xs"><SearchIcon className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar mesa o familia…" aria-label="Buscar mesa o familia" className="pl-9" /></div>
    <div className="grid max-h-[70dvh] min-h-0 grid-cols-1 gap-3 overflow-y-auto p-0.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {filtered.map((object) => {
        const profile = profileMap.get(object.perfil_id ?? '')
        return <article key={object.id} className="flex flex-col gap-4 rounded-xl border p-4">
          <div className="flex items-center justify-between gap-2"><h3 className="flex items-center gap-2 text-sm font-semibold"><ArmchairIcon className="size-4" style={profile ? {color:familyColor(profile.rol)} : undefined} />{object.nombre}</h3><Button size="icon-xs" variant="ghost" aria-label={mobile ? 'Ver detalle de ' + object.nombre : 'Ver ' + object.nombre + ' en el plano'} onClick={() => onLocate(object.id)}>{mobile ? <UsersIcon /> : <LocateFixedIcon />}</Button></div>
          <div className="flex min-h-12 flex-col gap-1"><span className="text-sm font-medium">{profile?.nombre_completo ?? 'Sin familia asignada'}</span><span className="text-xs text-muted-foreground">8 asientos incluidos</span>{profile && isCommittee(profile.rol) && <Badge className={'w-fit ' + getRoleColor(profile.rol)}>{profile.rol}</Badge>}</div>
          {isProtected(object.perfil_id) && <Badge variant="outline" className="w-fit"><LockKeyholeIcon />{canManage(object.perfil_id) ? 'Cuenta del sistema' : 'Elección protegida'}</Badge>}
          <MesaAssignmentControl key={object.version + '-' + object.perfil_id} object={object} objects={objects} profiles={profiles} busy={busy} onAction={onAction} />
        </article>
      })}
      {filtered.length === 0 && <p className="col-span-full py-8 text-center text-sm text-muted-foreground">No hay mesas con esa búsqueda.</p>}
    </div>
  </div>
}
