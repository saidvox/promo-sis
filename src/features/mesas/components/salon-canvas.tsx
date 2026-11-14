import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { ExpandIcon, FocusIcon, HandIcon, MinusIcon, MoveIcon, PlusIcon, RotateCcwIcon, ShrinkIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { MesaAsiento, MesaInvitado, SalonObjeto } from '@/types/mesas.types'
import type { MatrixData } from '@/features/payments/api/use-payments-matrix'
import { familyColor, seatPoint } from '../utils/salon-geometry'
import type { SalonViewport as Viewport, SalonFocus } from '../utils/salon-geometry'
import { useMesaPermissions } from '../utils/mesa-permissions'
type Gesture = {
  x: number; y: number; viewport: Viewport; object?: SalonObjeto; selectionId?: string; moved: boolean
  mode: 'pan' | 'move' | 'select'
}

type Props = {
  objects: SalonObjeto[]
  seats: MesaAsiento[]
  guests: MesaInvitado[]
  profiles: MatrixData['perfilesInscritos']
  selectedId: string | null
  onSelect: (id: string | null) => void
  onSave: (object: SalonObjeto) => Promise<void>
  focus: SalonFocus | null
  onFocused: () => void
  viewport: Viewport
  setViewport: Dispatch<SetStateAction<Viewport>>
  expanded: boolean
  onFullscreen: () => void
  busy: boolean
  onRestore: () => Promise<boolean>
}

export function SalonCanvas({ objects, seats, guests, profiles, selectedId, onSelect, onSave, focus, onFocused, viewport, setViewport, expanded, onFullscreen, busy, onRestore }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const { canManage, isOwner } = useMesaPermissions()
  const gesture = useRef<Gesture | null>(null)
  const didFit = useRef(viewport.x !== 20 || viewport.y !== 20 || viewport.scale !== 0.2)
  const handledFocus = useRef<number | null>(null)
  const viewportRef = useRef(viewport)
  const animation = useRef<number | null>(null)
  const spaceHeld = useRef(false)
  const pointerInside = useRef(false)
  const draftRef = useRef<SalonObjeto | null>(null)
  const [spacePressed, setSpacePressed] = useState(false)
  const [dragMode, setDragMode] = useState<'pan' | 'move' | null>(null)
  const [draft, setDraft] = useState<SalonObjeto | null>(null)
  const [saving, setSaving] = useState(false)
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]))
  const seatMap = new Map(seats.map((seat) => [`${seat.objeto_id}-${seat.posicion}`, seat]))
  const guestMap = new Map(guests.map((guest) => [`${guest.perfil_id}-${guest.posicion}`, guest]))
  const canMove = (object?: SalonObjeto) => !object || (canManage(object.perfil_id)
    && (object.tipo !== 'mesa_extras' || seats.filter((seat) => seat.objeto_id === object.id).every((seat) => canManage(seat.perfil_id))))

  useEffect(() => { viewportRef.current = viewport }, [viewport])
  useEffect(() => () => {
    if (animation.current !== null) cancelAnimationFrame(animation.current)
  }, [])

  useEffect(() => {
    const releaseSpace = () => {
      spaceHeld.current = false
      setSpacePressed(false)
    }
    const keydown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return
      const target = event.target instanceof Element ? event.target : null
      // Keep typing, native button activation and modal shortcuts independent of the canvas.
      if (target?.closest('input, textarea, select, button, [role="textbox"], [role="combobox"], [role="dialog"], [role="alertdialog"], [contenteditable]:not([contenteditable="false"])')) return
      if (!pointerInside.current && !svgRef.current?.contains(target)) return
      event.preventDefault()
      if (!spaceHeld.current) { spaceHeld.current = true; setSpacePressed(true) }
    }
    const keyup = (event: KeyboardEvent) => { if (event.code === 'Space') releaseSpace() }
    const reset = () => {
      releaseSpace()
      gesture.current = null
      draftRef.current = null
      setDraft(null)
      setDragMode(null)
    }
    const visibilityChanged = () => { if (document.hidden) reset() }
    window.addEventListener('keydown', keydown)
    window.addEventListener('keyup', keyup)
    window.addEventListener('blur', reset)
    document.addEventListener('visibilitychange', visibilityChanged)
    return () => {
      window.removeEventListener('keydown', keydown)
      window.removeEventListener('keyup', keyup)
      window.removeEventListener('blur', reset)
      document.removeEventListener('visibilitychange', visibilityChanged)
    }
  }, [])

  const animateTo = useCallback((target: Viewport, complete?: () => void) => {
    if (animation.current !== null) cancelAnimationFrame(animation.current)
    if (globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setViewport(target)
      complete?.()
      return
    }
    const from = viewportRef.current
    const started = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / 500)
      const eased = 1 - Math.pow(1 - progress, 3)
      setViewport({
        x: from.x + (target.x - from.x) * eased,
        y: from.y + (target.y - from.y) * eased,
        scale: from.scale + (target.scale - from.scale) * eased,
      })
      if (progress < 1) animation.current = requestAnimationFrame(tick)
      else { animation.current = null; complete?.() }
    }
    animation.current = requestAnimationFrame(tick)
  }, [setViewport])

  const fit = useCallback(() => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const width = Math.max(3450, ...objects.map((object) => object.x + object.ancho + 100))
    const height = Math.max(3350, ...objects.map((object) => object.y + object.alto + 100))
    const scale = Math.max(0.05, Math.min((rect.width - 48) / width, (rect.height - 48) / height, 1))
    animateTo({ x: (rect.width - width * scale) / 2, y: (rect.height - height * scale) / 2, scale })
  }, [objects, animateTo])

  useEffect(() => {
    const node = svgRef.current
    if (!node) return
    const observer = new ResizeObserver(() => {
      if (!didFit.current) { didFit.current = true; if (!focus) fit() }
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [fit, focus])

  const zoom = useCallback((factor: number, px?: number, py?: number) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    if (animation.current !== null) cancelAnimationFrame(animation.current)
    const centerX = px ?? rect.width / 2
    const centerY = py ?? rect.height / 2
    setViewport((previous) => {
      const scale = Math.max(0.05, Math.min(2.5, previous.scale * factor))
      const ratio = scale / previous.scale
      return { scale, x: centerX - (centerX - previous.x) * ratio, y: centerY - (centerY - previous.y) * ratio }
    })
  }, [setViewport])

  useEffect(() => {
    const node = svgRef.current
    if (!node) return
    const wheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = node.getBoundingClientRect()
      zoom(Math.exp(-event.deltaY * 0.0015), event.clientX - rect.left, event.clientY - rect.top)
    }
    node.addEventListener('wheel', wheel, { passive: false })
    return () => node.removeEventListener('wheel', wheel)
  }, [zoom])

  useEffect(() => {
    if (!focus || handledFocus.current === focus.request) return
    const node = svgRef.current
    const object = objects.find((item) => item.id === focus.id)
    if (!node || !object) return
    const rect = node.getBoundingClientRect()
    // Centrar una búsqueda no altera las posiciones guardadas del salón.
    const timer = setTimeout(() => {
      handledFocus.current = focus.request
      animateTo({
        scale: 0.9,
        x: rect.width / 2 - (object.x + object.ancho / 2) * 0.9,
        y: rect.height / 2 - (object.y + object.alto / 2) * 0.9,
      }, onFocused)
    }, 0)
    return () => clearTimeout(timer)
  }, [focus, objects, animateTo, onFocused])

  const finishGesture = async (cancel = false) => {
    const current = gesture.current
    const movedObject = draftRef.current
    gesture.current = null
    draftRef.current = null
    setDragMode(null)
    if (current && !current.moved && current.selectionId && !cancel) onSelect(current.selectionId)
    if (!current?.object || !current.moved || !movedObject || cancel) { setDraft(null); return }
    setSaving(true)
    try { await onSave(movedObject) } finally { setSaving(false); setDraft(null) }
  }

  return (
    <div className={cn('flex min-h-0 min-w-0 flex-1 select-none flex-col overflow-hidden bg-background', expanded ? 'rounded-none' : 'rounded-xl border')} data-salon-canvas>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-2 text-xs font-medium" role="status">
            {spacePressed || dragMode === 'pan' ? <HandIcon className="size-4" /> : <MoveIcon className="size-4" />}
            {saving ? 'Guardando posición…' : spacePressed || dragMode === 'pan' ? 'Recorrer plano' : 'Mover mesas'}
          </span>
          <span className="hidden text-xs text-muted-foreground sm:inline">Mantén <kbd className="rounded border bg-muted px-1.5 py-0.5 font-sans text-[10px]">Espacio</kbd> para recorrer</span>
        </div>
        <div className="flex items-center gap-1">
          {isOwner && <Button variant="outline" size="sm" disabled={busy || saving} onClick={async () => { if (await onRestore()) fit() }} aria-label="Restaurar distribución simétrica"><RotateCcwIcon data-icon="inline-start" />Restaurar distribución</Button>}
          <Button variant="ghost" size="icon-sm" onClick={() => zoom(0.8)} aria-label="Alejar"><MinusIcon /></Button>
          <span className="w-12 text-center text-xs tabular-nums">{Math.round(viewport.scale * 100)}%</span>
          <Button variant="ghost" size="icon-sm" onClick={() => zoom(1.25)} aria-label="Acercar"><PlusIcon /></Button>
          <Button variant="outline" size="sm" onClick={fit}><FocusIcon data-icon="inline-start" />Encajar</Button>
          <Button variant="ghost" size="icon-sm" onClick={onFullscreen} aria-label={expanded ? 'Salir de pantalla completa' : 'Ampliar plano'}>{expanded ? <ShrinkIcon /> : <ExpandIcon />}</Button>
        </div>
      </div>
      <svg
        ref={svgRef} className={cn('salon-canvas min-h-0 w-full flex-1 touch-none select-none outline-none',
          dragMode === 'pan' ? 'cursor-grabbing' : dragMode === 'move' ? 'cursor-move' : spacePressed ? 'cursor-grab' : 'cursor-default')}
        role="application" aria-label="Plano del salón. Arrastra las mesas para moverlas. Mantén Espacio y arrastra para recorrer. Usa la rueda para acercar y haz clic en una mesa para ver sus datos."
        tabIndex={0}
        onPointerEnter={() => { pointerInside.current = true }}
        onPointerLeave={() => { pointerInside.current = false }}
        onDragStart={(event) => event.preventDefault()}
        onKeyDown={(event) => {
          const pan: Record<string, [number, number]> = { ArrowLeft: [50, 0], ArrowRight: [-50, 0], ArrowUp: [0, 50], ArrowDown: [0, -50] }
          if (pan[event.key]) {
            event.preventDefault()
            const [x, y] = pan[event.key]
            setViewport((previous) => ({ ...previous, x: previous.x + x, y: previous.y + y }))
          } else if (event.key === '+' || event.key === '=') zoom(1.25)
          else if (event.key === '-') zoom(0.8)
          else if (event.key === '0') fit()
        }}
        onPointerDown={(event) => {
          if (saving || busy || event.button !== 0) return
          event.preventDefault()
          svgRef.current?.focus({ preventScroll: true })
          const id = (event.target as Element).closest('[data-object]')?.getAttribute('data-object')
          const object = objects.find((item) => item.id === id)
          const panning = spaceHeld.current || (event.pointerType === 'touch' && !object)
          if (!panning && !object) return
          if (animation.current !== null) cancelAnimationFrame(animation.current)
          svgRef.current?.setPointerCapture(event.pointerId)
          const mode = panning ? 'pan' : canMove(object) ? 'move' : 'select'
          setDragMode(mode === 'select' ? null : mode)
          gesture.current = { x: event.clientX, y: event.clientY, viewport, mode, object: mode === 'move' ? object : undefined, selectionId: panning ? undefined : id ?? undefined, moved: false }
        }}
        onPointerMove={(event) => {
          const current = gesture.current
          if (!current) return
          const dx = event.clientX - current.x
          const dy = event.clientY - current.y
          if (Math.abs(dx) + Math.abs(dy) > 4) current.moved = true
          if (!current.moved) return
          if (current.object) {
            const movedObject = { ...current.object,
              x: Math.max(0, Math.min(5000, current.object.x + dx / current.viewport.scale)),
              y: Math.max(0, Math.min(5000, current.object.y + dy / current.viewport.scale)),
            }
            draftRef.current = movedObject
            setDraft(movedObject)
          } else if (current.mode === 'pan') setViewport({ ...current.viewport, x: current.viewport.x + dx, y: current.viewport.y + dy })
        }}
        onPointerUp={() => { void finishGesture() }}
        onPointerCancel={() => { void finishGesture(true) }}
        onLostPointerCapture={() => { if (gesture.current) void finishGesture(true) }}
      >
        <defs>
          <pattern id="salon-grid" width={Math.max(16, 32 * viewport.scale)} height={Math.max(16, 32 * viewport.scale)} patternUnits="userSpaceOnUse" x={viewport.x} y={viewport.y}>
            <circle cx="1" cy="1" r="0.7" fill="currentColor" opacity="0.2" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#salon-grid)" />
        <g transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.scale})`}>
          <rect x="20" y="20" width="3380" height="3310" rx="24" className="fill-none stroke-border" strokeWidth="3" />
          {objects.map((savedObject) => {
            const object = draft?.id === savedObject.id ? draft : savedObject
            const profile = object.perfil_id ? profileMap.get(object.perfil_id) : undefined
            const color = profile ? familyColor(profile.rol) : undefined
            const selected = selectedId === object.id
            const shared = object.tipo === 'mesa_extras'
            if (object.tipo === 'zona') return (
              <g key={object.id} data-object={object.id} transform={`translate(${object.x} ${object.y})`} style={{ cursor: spacePressed || dragMode !== null ? 'inherit' : 'move' }}>
                <rect width={object.ancho} height={object.alto} rx="12" className={cn('fill-muted/70 stroke-border', selected && 'stroke-primary')} strokeWidth={selected ? 4 : 2} />
                <text x={object.ancho / 2} y={object.alto / 2} textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-[22px] font-medium tracking-wider">{object.nombre}</text>
              </g>
            )
            return (
              <g key={object.id} data-object={object.id} transform={`translate(${object.x} ${object.y}) scale(${object.ancho / 180} ${object.alto / 180})`} style={{ cursor: spacePressed || dragMode !== null ? 'inherit' : canMove(object) ? 'move' : 'pointer' }}>
                <circle cx="90" cy="90" r="64" className={cn(shared ? 'fill-event-transfer/10 stroke-event-transfer/70' : 'fill-card stroke-border', selected && 'stroke-primary')} strokeWidth={selected ? 4 : 2} strokeDasharray={shared ? '6 4' : undefined} />
                {object.tipo === 'mesa_familiar' && <circle cx="90" cy="90" r="57" fill={color} opacity="0.1" />}
                {shared && <g><rect x="54" y="39" width="72" height="15" rx="7.5" className="fill-event-transfer/20" /><text x="90" y="49.5" textAnchor="middle" className="fill-event-transfer text-[7px] font-semibold tracking-wider">COMPARTIDA</text></g>}
                {Array.from({ length: 8 }, (_, index) => {
                  const point = seatPoint(index + 1)
                  const assignment = seatMap.get(`${object.id}-${index + 1}`)
                  const seatColor = color ?? (assignment ? familyColor(profileMap.get(assignment.perfil_id)?.rol) : undefined)
                  const owner = object.perfil_id ?? assignment?.perfil_id
                  const guestPosition = object.tipo === 'mesa_familiar' ? index+1 : assignment?.invitado_posicion
                  const guest = guestMap.get(`${owner}-${guestPosition}`)
                  const guestName = guestPosition === 1 ? profile?.nombre_completo : guest ? `${guest.nombres} ${guest.apellidos}`.trim() : undefined
                  return (
                    <g key={index}>
                      <circle cx={point.x} cy={point.y} r="11" fill={seatColor ?? 'var(--color-background)'} className={shared ? 'stroke-event-transfer/60' : 'stroke-border'} strokeWidth="1.5">
                        <title>{`Asiento ${index+1} · ${guestName || (owner ? 'Invitado sin registrar' : 'Libre')}${assignment ? ' · Familia de ' + (profileMap.get(assignment.perfil_id)?.nombre_completo ?? 'Participante') : ''}`}</title>
                      </circle>
                      {object.tipo === 'mesa_extras' && <text x={point.x} y={point.y + 3} textAnchor="middle" className="fill-foreground text-[8px]">{index + 1}</text>}
                    </g>
                  )
                })}
                <text x="90" y="70" textAnchor="middle" className="fill-foreground text-[14px] font-semibold">{object.nombre.slice(0, 22)}</text>
                <text x="90" y="91" textAnchor="middle" className="fill-foreground text-[10px]">
                  {profile ? profile.nombre_completo.split(' ').slice(0, 2).join(' ').slice(0, 24) : object.tipo === 'mesa_familiar' ? 'Sin asignar' : '8 asientos'}
                </text>
                <text x="90" y="106" textAnchor="middle" className="fill-muted-foreground text-[10px]">
                  {profile ? profile.nombre_completo.split(' ').slice(2).join(' ').slice(0, 25) : object.tipo === 'mesa_familiar' ? 'Elige una familia' : `${seats.filter((seat) => seat.objeto_id === object.id).length} de 8 asignados`}
                </text>
                <text x="90" y="126" textAnchor="middle" className="fill-muted-foreground text-[9px]">
                  {object.tipo === 'mesa_familiar' ? '8 incluidos' : 'Invitados adicionales'}
                </text>
              </g>
            )
          })}
        </g>
      </svg>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2 text-[11px] text-muted-foreground">
        <span>Arrastra mesas para ordenar · Espacio + arrastrar para recorrer · Rueda para zoom</span>
        <span>Distribución ilustrativa · Posiciones guardadas en el sistema</span>
      </div>
    </div>
  )
}
