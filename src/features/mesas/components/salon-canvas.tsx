import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { ExpandIcon, FocusIcon, HandIcon, MinusIcon, PlusIcon, RotateCcwIcon, ShrinkIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { MesaAsiento, MesaInvitado, SalonObjeto } from '@/types/mesas.types'
import type { MatrixData } from '@/features/payments/api/use-payments-matrix'
import { familyColor, seatPoint } from '../utils/salon-geometry'
import type { SalonViewport as Viewport, SalonFocus } from '../utils/salon-geometry'
import { useMesaPermissions } from '../utils/mesa-permissions'
type Gesture = {
  x: number; y: number; viewport: Viewport; selectionId?: string; moved: boolean
}

type Props = {
  objects: SalonObjeto[]
  seats: MesaAsiento[]
  guests: MesaInvitado[]
  profiles: MatrixData['perfilesInscritos']
  selectedId: string | null
  onSelect: (id: string | null) => void
  focus: SalonFocus | null
  onFocused: () => void
  viewport: Viewport
  setViewport: Dispatch<SetStateAction<Viewport>>
  expanded: boolean
  onFullscreen: () => void
  busy: boolean
  onRestore: () => Promise<boolean>
}

export function SalonCanvas({ objects, seats, guests, profiles, selectedId, onSelect, focus, onFocused, viewport, setViewport, expanded, onFullscreen, busy, onRestore }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const { isOwner } = useMesaPermissions()
  const gesture = useRef<Gesture | null>(null)
  const didFit = useRef(viewport.x !== 20 || viewport.y !== 20 || viewport.scale !== 0.2)
  const handledFocus = useRef<number | null>(null)
  const viewportRef = useRef(viewport)
  const animation = useRef<number | null>(null)
  const [panning, setPanning] = useState(false)
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]))
  const seatMap = new Map(seats.map((seat) => [`${seat.objeto_id}-${seat.posicion}`, seat]))
  const guestMap = new Map(guests.map((guest) => [`${guest.perfil_id}-${guest.posicion}`, guest]))
  const width = Math.max(3450, ...objects.map((object) => object.x + object.ancho + 100))
  const height = Math.max(900, ...objects.map((object) => object.y + object.alto + 100))

  useEffect(() => { viewportRef.current = viewport }, [viewport])
  useEffect(() => () => {
    if (animation.current !== null) cancelAnimationFrame(animation.current)
  }, [])

  useEffect(() => {
    const reset = () => {
      gesture.current = null
      setPanning(false)
    }
    const visibilityChanged = () => { if (document.hidden) reset() }
    window.addEventListener('blur', reset)
    document.addEventListener('visibilitychange', visibilityChanged)
    return () => {
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
    const scale = Math.max(0.05, Math.min((rect.width - 48) / width, (rect.height - 48) / height, 1))
    animateTo({ x: (rect.width - width * scale) / 2, y: (rect.height - height * scale) / 2, scale })
  }, [width, height, animateTo])

  const previousBounds = useRef({width,height})
  useEffect(() => {
    if(previousBounds.current.width === width && previousBounds.current.height === height) return
    previousBounds.current = {width,height}
    if(focus || gesture.current) return
    const frame = requestAnimationFrame(fit)
    return () => cancelAnimationFrame(frame)
  }, [width,height,fit,focus])

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

  const finishGesture = (cancel = false) => {
    const current = gesture.current
    gesture.current = null
    setPanning(false)
    if (current && !current.moved && current.selectionId && !cancel) onSelect(current.selectionId)
  }

  return (
    <div className={cn('flex min-h-0 min-w-0 flex-1 select-none flex-col overflow-hidden bg-background', expanded ? 'rounded-none' : 'rounded-xl border')} data-salon-canvas>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-2 text-xs font-medium" role="status">
            <HandIcon className="size-4" />Recorrer plano
          </span>
          <span className="hidden text-xs text-muted-foreground sm:inline">Mesas fijas · Distribución automática</span>
        </div>
        <div className="flex items-center gap-1">
          {isOwner && <Button variant="outline" size="sm" disabled={busy} onClick={async () => { if (await onRestore()) fit() }} aria-label="Restaurar distribución simétrica"><RotateCcwIcon data-icon="inline-start" />Restaurar distribución</Button>}
          <Button variant="ghost" size="icon-sm" onClick={() => zoom(0.8)} aria-label="Alejar"><MinusIcon /></Button>
          <span className="w-12 text-center text-xs tabular-nums">{Math.round(viewport.scale * 100)}%</span>
          <Button variant="ghost" size="icon-sm" onClick={() => zoom(1.25)} aria-label="Acercar"><PlusIcon /></Button>
          <Button variant="outline" size="sm" onClick={fit}><FocusIcon data-icon="inline-start" />Encajar</Button>
          <Button variant="ghost" size="icon-sm" onClick={onFullscreen} aria-label={expanded ? 'Salir de pantalla completa' : 'Ampliar plano'}>{expanded ? <ShrinkIcon /> : <ExpandIcon />}</Button>
        </div>
      </div>
      <svg
        ref={svgRef} className={cn('salon-canvas min-h-0 w-full flex-1 touch-none select-none outline-none',
          panning ? 'cursor-grabbing' : 'cursor-grab')}
        role="application" aria-label="Plano del salón con mesas fijas. Arrastra para recorrer, usa la rueda para acercar y haz clic en una mesa para ver sus datos."
        tabIndex={0}
        onDragStart={(event) => event.preventDefault()}
        onKeyDown={(event) => {
          if (event.code === 'Space') { event.preventDefault(); return }
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
          if (busy || event.button !== 0) return
          event.preventDefault()
          svgRef.current?.focus({ preventScroll: true })
          const id = (event.target as Element).closest('[data-object]')?.getAttribute('data-object')
          if (animation.current !== null) cancelAnimationFrame(animation.current)
          svgRef.current?.setPointerCapture(event.pointerId)
          setPanning(true)
          gesture.current = { x: event.clientX, y: event.clientY, viewport, selectionId: id ?? undefined, moved: false }
        }}
        onPointerMove={(event) => {
          const current = gesture.current
          if (!current) return
          const dx = event.clientX - current.x
          const dy = event.clientY - current.y
          if (Math.abs(dx) + Math.abs(dy) > 4) current.moved = true
          if (!current.moved) return
          setViewport({ ...current.viewport, x: current.viewport.x + dx, y: current.viewport.y + dy })
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
          <rect x="20" y="20" width={width - 70} height={height - 70} rx="24" className="fill-none stroke-border" strokeWidth="3" />
          {objects.map((savedObject) => {
            const object = savedObject
            const profile = object.perfil_id ? profileMap.get(object.perfil_id) : undefined
            const color = profile ? familyColor(profile.rol) : undefined
            const selected = selectedId === object.id
            const shared = object.tipo === 'mesa_extras'
            if (object.tipo === 'zona') return (
              <g key={object.id} data-object={object.id} transform={`translate(${object.x} ${object.y})`} className="cursor-inherit">
                <rect width={object.ancho} height={object.alto} rx="12" className={cn('fill-muted/70 stroke-border', selected && 'stroke-primary')} strokeWidth={selected ? 4 : 2} />
                <text x={object.ancho / 2} y={object.alto / 2} textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-[22px] font-medium tracking-wider">{object.nombre}</text>
              </g>
            )
            return (
              <g key={object.id} data-object={object.id} transform={`translate(${object.x} ${object.y}) scale(${object.ancho / 180} ${object.alto / 180})`} style={{cursor:'inherit'}}>
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
        <span>Arrastra para recorrer · Rueda para zoom · Las mesas no se mueven</span>
        <span>Distribución ilustrativa · Posiciones guardadas en el sistema</span>
      </div>
    </div>
  )
}
