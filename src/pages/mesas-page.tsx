import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArmchairIcon, RefreshCwIcon, UsersIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'
import { useIsMobile } from '@/hooks/use-mobile'
import { useAuth } from '@/hooks/use-auth'
import { createMesaPermissions, MesaPermissionsContext } from '@/features/mesas/utils/mesa-permissions'
import { usePaymentsMatrix, type MatrixData } from '@/features/payments/api/use-payments-matrix'
import { formatMoney } from '@/features/payments/utils/participant-totals'
import { refreshMesas, saveSalonObject, useMesas, type MesasData } from '@/features/mesas/api/use-mesas'
import { SalonCanvas } from '@/features/mesas/components/salon-canvas'
import { ParticipantPicker } from '@/features/mesas/components/participant-picker'
import { MesaDetailDrawer } from '@/features/mesas/components/mesa-detail-drawer'
import { MesasParticipantsTable } from '@/features/mesas/components/mesas-participants-table'
import { MesasAssignmentBoard } from '@/features/mesas/components/mesas-assignment-board'
import { sortParticipants } from '@/features/mesas/utils/participant-order'
import { activeSalonLayout } from '@/features/mesas/utils/active-salon-layout'
import type { MesaAction } from '@/features/mesas/components/mesa-family-panel'
import type { SalonViewport, SalonFocus } from '@/features/mesas/utils/salon-geometry'
import type { SalonObjeto } from '@/types/mesas.types'

export function MesasPage() {
  const { data, error, isLoading, mutate } = useMesas()
  const { data: matrix, error: matrixError } = usePaymentsMatrix(60_000)
  if (error || matrixError) return <div className="flex flex-col items-start gap-3 p-6" role="alert">
    <h1 className="text-lg font-semibold">No se pudo cargar Mesas</h1>
    <p className="text-sm text-muted-foreground">{error?.message ?? matrixError?.message}</p>
    <Button variant="outline" onClick={() => { void refreshMesas() }}><RefreshCwIcon data-icon="inline-start" />Reintentar</Button>
  </div>
  if (isLoading || !data || !matrix) return <div className="flex flex-col gap-4 p-6"><Skeleton className="h-14" /><Skeleton className="h-[70vh]" /></div>
  return <MesasWorkspace data={data} matrix={matrix} onRefresh={() => mutate()} />
}

function MesasWorkspace({ data, matrix, onRefresh }: {
  data: MesasData; matrix: MatrixData; onRefresh: () => Promise<MesasData | undefined>
}) {
  const mobile = useIsMobile()
  const { session } = useAuth()
  const permissions = useMemo(() => createMesaPermissions(data.cuentas, session?.user.id), [data.cuentas, session?.user.id])
  const [requestedView, setView] = useState('plano')
  const view = mobile && requestedView === 'plano' ? 'asignacion' : requestedView
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [focus, setFocus] = useState<SalonFocus | null>(null)
  const focusRequest = useRef(0)
  const [viewport, setViewport] = useState<SalonViewport>({ x: 20, y: 20, scale: 0.2 })
  const [busy, setBusy] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [showInactive, setShowInactive] = useState(false)
  const profiles = useMemo(() => sortParticipants(matrix.perfilesInscritos.filter((profile) => showInactive || profile.activo)), [matrix.perfilesInscritos, showInactive])
  const visibleObjects = useMemo(() => {
    const ids = new Set(matrix.perfilesInscritos.filter(profile => profile.activo && profile.inscrito).map(profile => profile.id))
    return activeSalonLayout(data.objetos, ids, data.asientos)
  }, [data.objetos, data.asientos, matrix.perfilesInscritos])

  useEffect(() => {
    if (!fullscreen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [fullscreen])

  useEffect(() => {
    if (!fullscreen) return
    const exitOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented && !drawerOpen) setFullscreen(false)
    }
    document.addEventListener('keydown', exitOnEscape)
    return () => document.removeEventListener('keydown', exitOnEscape)
  }, [fullscreen, drawerOpen])

  const onAction: MesaAction = useCallback(async (operation, message) => {
    setBusy(true)
    try {
      const { error: operationError } = await operation()
      if (operationError) throw new Error(operationError.message)
      await refreshMesas()
      toast.success(message)
      return true
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : 'No se pudo guardar. Intenta actualizar los datos.')
      await onRefresh()
      return false
    } finally { setBusy(false) }
  }, [onRefresh])

  const saveObject = async (object: SalonObjeto) => {
    setBusy(true)
    try { await saveSalonObject(object); toast.success('Plano guardado') }
    catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'No se pudo guardar la posición')
      await onRefresh()
    } finally { setBusy(false) }
  }

  const handleFocused = useCallback(() => { setFocus(null); setDrawerOpen(true) }, [])

  const locateObject = (objectId: string) => {
    setDrawerOpen(mobile)
    setSelectedProfileId(null)
    setSelectedId(objectId)
    if (mobile) { setFocus(null); return }
    setView('plano')
    focusRequest.current++
    setFocus({ id: objectId, request: focusRequest.current })
  }

  const locateProfile = (profileId: string) => {
    const object = data.objetos.find((item) => item.perfil_id === profileId)
    if (!object || !visibleObjects.some(item => item.id === object.id)) { setView('asignacion'); toast.info('Para aparecer en el plano, el participante debe estar activo e inscrito.'); return }
    locateObject(object.id)
  }

  const openProfile = (profileId: string) => {
    const object = data.objetos.find((item) => item.perfil_id === profileId)
    if (view === 'plano' && object && visibleObjects.some(item => item.id === object.id)) { locateObject(object.id); return }
    setSelectedId(object?.id ?? null)
    setSelectedProfileId(object ? null : profileId)
    setDrawerOpen(true)
  }

  const selectedProfile = matrix.perfilesInscritos.find((profile) => profile.id === selectedProfileId)
  const selected = data.objetos.find((object) => object.id === selectedId) ?? (selectedProfile ? {
    id: 'profile-' + selectedProfile.id, perfil_id: selectedProfile.id, tipo: 'mesa_familiar' as const,
    nombre: 'Sin mesa asignada', x: 0, y: 0, ancho: 180, alto: 180, version: 0,
  } : undefined)
  const activeIds = new Set(matrix.perfilesInscritos.filter((profile) => profile.activo && profile.inscrito).map((profile) => profile.id))
  const summaries = data.resumen.filter((mesa) => activeIds.has(mesa.perfil_id))
  const extraTables = visibleObjects.filter((object) => object.tipo === 'mesa_extras').length
  const extraGuests = summaries.reduce((sum, mesa) => sum + mesa.extras_usados, 0)
  const extraDebt = summaries.reduce((sum, mesa) => sum + Number(mesa.saldo_extras), 0)
  const assignedFamilies = visibleObjects.filter((object) => object.tipo === 'mesa_familiar' && object.perfil_id).length

  const workspace = (
    <section data-mesas-fullscreen={fullscreen || undefined} className={cn(
      'flex min-h-0 min-w-0 flex-1 flex-col',
      fullscreen ? 'fixed inset-0 z-40 h-dvh w-screen overflow-hidden bg-background' : 'gap-3 p-4 sm:p-5'
    )}>
      {!fullscreen && <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">Distribución de mesas</h1>
          <p className="text-sm text-muted-foreground">Solo activos e inscritos · 8 personas por mesa · S/40 por adicional</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary"><UsersIcon />{assignedFamilies} / {activeIds.size} familias ubicadas</Badge>
          <Badge variant="outline"><ArmchairIcon />{extraTables} mesas compartidas</Badge>
          <Badge variant="outline" className="border-event-extra/25 text-event-extra">{extraGuests} extras · {formatMoney(extraDebt)} pendiente</Badge>
        </div>
      </header>}
      <div className={cn('flex shrink-0 flex-wrap items-center justify-between gap-3', fullscreen && 'border-b px-3 py-2')}>
        <div className="flex flex-wrap items-center gap-3">
          {fullscreen && <span className="hidden items-center gap-2 text-sm font-semibold lg:flex"><ArmchairIcon className="size-4" />Mesas</span>}
          <Tabs value={view} onValueChange={(value) => setView(String(value))}>
            <TabsList>{!mobile && <TabsTrigger value="plano" aria-label="Plano del salón">Plano del salón</TabsTrigger>}<TabsTrigger value="lista" aria-label="Participantes y saldos"><span className="sm:hidden">Saldos</span><span className="hidden sm:inline">Participantes y saldos</span></TabsTrigger><TabsTrigger value="asignacion">Asignar mesas</TabsTrigger></TabsList>
          </Tabs>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Checkbox id="mesas-inactivos" checked={showInactive} onCheckedChange={setShowInactive} />
            <label htmlFor="mesas-inactivos" className="cursor-pointer text-xs text-muted-foreground">Incluir inactivos</label>
          </div>
          <ParticipantPicker profiles={profiles} value={selected?.perfil_id ?? undefined} onSelect={openProfile} label="Buscar participante" />
          <Button variant="outline" size="icon-sm" disabled={busy} onClick={() => { void refreshMesas() }} aria-label="Actualizar mesas"><RefreshCwIcon /></Button>
          {fullscreen && view !== 'plano' && <Button variant="ghost" size="icon-sm" onClick={() => setFullscreen(false)} aria-label="Salir de pantalla completa"><XIcon /></Button>}
        </div>
      </div>
      {view === 'plano' ? (
        <div className={cn('flex min-h-0 flex-col', fullscreen ? 'flex-1' : 'h-[calc(100dvh-230px)] min-h-[480px]')}>
          <SalonCanvas objects={visibleObjects} seats={data.asientos} guests={data.invitados} profiles={profiles} selectedId={selected?.id ?? null}
            onSelect={(id) => { setSelectedProfileId(null); setSelectedId(id); setDrawerOpen(Boolean(id)) }}
            focus={focus} onFocused={handleFocused}
            viewport={viewport} setViewport={setViewport} expanded={fullscreen}
            busy={busy} onRestore={() => onAction(() => supabase.rpc('restaurar_distribucion_salon'), 'Distribución simétrica restaurada')}
            onFullscreen={() => setFullscreen((value) => !value)} />
        </div>
      ) : view === 'asignacion' ? (
        <div className={cn('flex min-h-0 flex-col', fullscreen && 'flex-1 overflow-hidden p-3')}>
          {mobile && <p className="mb-3 text-xs text-muted-foreground">Asigna las familias desde aquí. El plano de consulta está disponible en escritorio.</p>}
          <MesasAssignmentBoard objects={visibleObjects} profiles={profiles.filter(profile => profile.activo && profile.inscrito)} busy={busy} onAction={onAction} onLocate={locateObject} mobile={mobile} />
        </div>
      ) : (
        <div className={cn('flex min-h-0 flex-col gap-3', fullscreen ? 'flex-1 overflow-hidden p-3' : '')}>
          <p className="text-xs text-muted-foreground">Primero el comité, con colores según su rol; después los alumnos, en blanco y negro. Las etiquetas indican el estado de sus pagos.</p>
          <MesasParticipantsTable profiles={profiles} matrix={matrix} summaries={data.resumen} onDetail={openProfile} onLocate={locateProfile} />
        </div>
      )}
    </section>
  )

  return <MesaPermissionsContext.Provider value={permissions}>
    {fullscreen ? createPortal(workspace, document.body) : workspace}
    <MesaDetailDrawer object={selected} open={drawerOpen} onOpenChange={setDrawerOpen}
      matrix={matrix} data={data} busy={busy} onAction={onAction} onSave={saveObject} onLocateObject={locateObject} />
  </MesaPermissionsContext.Provider>
}
