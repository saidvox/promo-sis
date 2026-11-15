import type { MesaAsiento, SalonObjeto } from '@/types/mesas.types'

// Keep physical table IDs and assignments stable. Surplus empty capacity can be
// hidden when participation falls, without deleting historical seating data.
export function activeSalonLayout(objects: SalonObjeto[], activeIds: Set<string>, seats: MesaAsiento[]) {
  const ordered = [...objects].sort((a,b) => a.nombre.localeCompare(b.nombre, 'es', {numeric:true}) || a.id.localeCompare(b.id))
  const assigned = ordered.filter(o => o.tipo === 'mesa_familiar' && o.perfil_id && activeIds.has(o.perfil_id))
  const empty = ordered.filter(o => o.tipo === 'mesa_familiar' && !o.perfil_id).slice(0, Math.max(0, activeIds.size-assigned.length))
  const families = [...assigned,...empty]
  const occupiedExtras = new Set(seats.filter(seat => activeIds.has(seat.perfil_id)).map(seat => seat.objeto_id))
  const shared = ordered.filter(o => o.tipo === 'mesa_extras' && occupiedExtras.has(o.id))
  shared.push(...ordered.filter(o => o.tipo === 'mesa_extras' && !occupiedExtras.has(o.id)).slice(0, Math.max(0,Math.ceil(families.length/4)-shared.length)))
  const bottom = Math.max(900,...[...families,...shared].map(o => o.y+o.alto))
  const zones = objects.filter(o => o.tipo === 'zona').map(o => {
    if(o.nombre === 'Pista de baile') return {...o,alto:Math.max(320,bottom+40-o.y)}
    if(o.nombre === 'Ingreso') return {...o,y:bottom+180}
    return o
  })
  return [...families,...shared,...zones]
}
