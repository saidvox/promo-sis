import { useState, useCallback, lazy, Suspense } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Trash2Icon, PencilIcon, DollarSignIcon, PlayIcon, EyeIcon, UndoIcon, UsersIcon } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useActivities, type ActividadRow } from '../api/use-activities'
import { useSWRConfig } from 'swr'


import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const CreateActivityDialog = lazy(() => import('./create-activity-dialog').then(m => ({ default: m.CreateActivityDialog as React.ComponentType<{ className?: string }> })))
const EditActivityDialog = lazy(() => import('./edit-activity-dialog').then(m => ({ default: m.EditActivityDialog as React.ComponentType<{ open: boolean; onOpenChange: (open: boolean) => void; activity: ActividadRow }> })))
const FinalizeActivityDialog = lazy(() => import('./finalize-activity-dialog').then(m => ({ default: m.FinalizeActivityDialog as React.ComponentType<{ open: boolean; onOpenChange: (open: boolean) => void; activity: ActividadRow }> })))

export function ActivitiesTable() {
  const { data, isLoading, error, deleteActivity, updateActivity, revertActivity } = useActivities()
  const { mutate } = useSWRConfig()

  const [editingActivity, setEditingActivity] = useState<ActividadRow | null>(null)
  const [finalizingActivity, setFinalizingActivity] = useState<ActividadRow | null>(null)
  const [activityToDelete, setActivityToDelete] = useState<ActividadRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)

  const handleStartActivity = async (id: string) => {
    setIsUpdating(id)
    try {
      await updateActivity(id, { estado: 'En curso' })
      toast.success('Actividad iniciada')
    } catch (e) {
      toast.error('Error al iniciar la actividad')
    } finally {
      setIsUpdating(null)
    }
  }

  const handleRevertActivity = async (id: string) => {
    setIsUpdating(id)
    try {
      await revertActivity(id)
      toast.success('Actividad revertida y beneficios descontados')
      mutate('api/dashboard-stats')
      mutate('api/expenses')
      mutate('api/payments-matrix')
    } catch (e) {
      toast.error('Error al revertir la actividad')
    } finally {
      setIsUpdating(null)
    }
  }

  const handleDelete = useCallback(async () => {
    if (!activityToDelete) return
    
    setIsDeleting(true)
    try {
      await deleteActivity(activityToDelete.id)
      toast.success('Actividad eliminada')
      // Actualizar también dashboard-stats si existe
      mutate('api/dashboard-stats')
      mutate('api/expenses') // Porque afecta el saldo general
      setActivityToDelete(null)
    } catch (err: unknown) {
      toast.error('Error al eliminar la actividad')
    } finally {
      setIsDeleting(false)
    }
  }, [activityToDelete, deleteActivity, mutate])

  const stats = data?.stats
  const actividades = data?.actividades || []

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-destructive">
        <p className="font-semibold text-lg">Error al cargar actividades</p>
        <p className="text-sm opacity-80">{error.message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* HEADER / TOOLBAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/30 p-4 rounded-xl border border-border/50">
        <div className="flex flex-col">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <DollarSignIcon className="h-4 w-4 text-emerald-500" />
            Recaudación Global
          </h3>
          {isLoading ? (
            <Skeleton className="h-8 w-32 mt-1" />
          ) : (
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              S/ {stats?.totalRecaudado.toFixed(2) || '0.00'}
            </div>
          )}
        </div>

        <Suspense fallback={<Skeleton className="h-10 w-40" />}>
          <CreateActivityDialog className="w-full sm:w-auto" />
        </Suspense>
      </div>

      {/* MOBILE CARD VIEW */}
      <div className="block sm:hidden space-y-2">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))
        ) : actividades.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
            No hay actividades registradas aún.
          </div>
        ) : (
          actividades.map((act) => (
            <div key={act.id} className="rounded-xl border bg-card p-4 space-y-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5 min-w-0">
                  <p className="font-semibold text-sm leading-tight">{act.nombre}</p>
                  {act.descripcion && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{act.descripcion}</p>
                  )}
                  {(act.usa_grupos || act.usa_premios) && (
                    <div className="flex items-center gap-1 pt-1 text-[10px] text-muted-foreground">
                      <UsersIcon className="h-3 w-3" />
                      {act.usa_grupos ? 'Con grupos' : 'Sin grupos'}
                      {act.usa_premios ? ' · premios externos' : ''}
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground pt-1">
                    {format(new Date(act.fecha_evento + 'T00:00:00'), 'd MMM yyyy', { locale: es })}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0 text-xs",
                    act.estado === 'Finalizada'
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400"
                      : act.estado === 'En curso'
                      ? "bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400"
                      : "bg-muted text-muted-foreground border-border/50"
                  )}
                >
                  {act.estado}
                </Badge>
              </div>

              <div className="flex items-center justify-between border-t border-border/40 pt-2">
                <span className="font-bold text-sm tabular-nums text-emerald-600 dark:text-emerald-400">
                  + S/ {act.monto_recaudado.toFixed(2)}
                </span>
                {act.total_beneficio > 0 && (
                  <span className="text-[10px] font-medium text-blue-600">
                    Beneficio S/ {Number(act.total_beneficio).toFixed(2)}
                  </span>
                )}
                <div className="flex gap-1">
                  {act.estado === 'Planeada' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 text-blue-600 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900/30"
                      onClick={() => handleStartActivity(act.id)}
                      disabled={isUpdating === act.id}
                    >
                      <PlayIcon className="h-3.5 w-3.5 shrink-0" />
                      <span className="leading-none mt-[1px]">Iniciar</span>
                    </Button>
                  )}
                  {act.estado === 'En curso' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-700 dark:bg-emerald-950 dark:border-emerald-800 dark:hover:bg-emerald-900"
                      onClick={() => setFinalizingActivity(act)}
                    >
                      <EyeIcon className="h-3.5 w-3.5 shrink-0" />
                      <span className="leading-none mt-[1px]">Ver detalles</span>
                    </Button>
                  )}
                  {act.estado === 'Finalizada' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 text-amber-600 hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-900/30"
                      onClick={() => handleRevertActivity(act.id)}
                      disabled={isUpdating === act.id}
                    >
                      <UndoIcon className="h-3.5 w-3.5 shrink-0" />
                      <span className="leading-none mt-[1px]">Revertir</span>
                    </Button>
                  )}
                  {act.estado === 'Finalizada' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5"
                      onClick={() => setFinalizingActivity(act)}
                    >
                      <EyeIcon className="h-3.5 w-3.5 shrink-0" />
                      <span className="leading-none mt-[1px]">Detalles</span>
                    </Button>
                  )}
                  
                  {act.estado !== 'Finalizada' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Editar detalles"
                      className="h-8 w-8 hover:bg-muted"
                      onClick={() => setEditingActivity(act)}
                    >
                      <PencilIcon className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Eliminar"
                    className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setActivityToDelete(act)}
                  >
                    <Trash2Icon className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* DESKTOP TABLE VIEW */}
      <div className="hidden sm:block rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre / Evento</TableHead>
              <TableHead className="w-[120px]">Fecha</TableHead>
              <TableHead className="w-[120px] text-center">Estado</TableHead>
              <TableHead className="w-[140px] text-right">Recaudado</TableHead>
              <TableHead className="w-[180px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : actividades.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  No hay actividades registradas aún.
                </TableCell>
              </TableRow>
            ) : (
              actividades.map((act) => (
                <TableRow key={act.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{act.nombre}</span>
                      {act.descripcion && (
                        <span className="text-xs text-muted-foreground line-clamp-1">{act.descripcion}</span>
                      )}
                      <span className="text-[11px] text-muted-foreground">
                        {act.etiqueta_unidad}: S/ {Number(act.precio_unitario).toFixed(2)} · minimo {act.minimo_unidades_beneficio}
                        {act.usa_grupos ? ' · grupos' : ''}
                        {act.usa_premios ? ' · premios externos' : ''}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(act.fecha_evento + 'T00:00:00'), 'd MMM yyyy', { locale: es })}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={cn(
                        act.estado === 'Finalizada'
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400"
                          : act.estado === 'En curso'
                          ? "bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400"
                          : "bg-muted text-muted-foreground border-border/50"
                      )}
                    >
                      {act.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                      + S/ {act.monto_recaudado.toFixed(2)}
                    </span>
                    {act.total_beneficio > 0 && (
                      <span className="block text-[10px] font-medium text-blue-600">
                        Beneficio S/ {Number(act.total_beneficio).toFixed(2)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {act.estado === 'Planeada' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 text-blue-600 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900/30"
                          onClick={() => handleStartActivity(act.id)}
                          disabled={isUpdating === act.id}
                        >
                          <PlayIcon className="h-3.5 w-3.5 shrink-0" />
                          <span className="leading-none mt-[1px]">Iniciar</span>
                        </Button>
                      )}
                      {act.estado === 'En curso' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-700 dark:bg-emerald-950 dark:border-emerald-800 dark:hover:bg-emerald-900"
                          onClick={() => setFinalizingActivity(act)}
                        >
                          <EyeIcon className="h-3.5 w-3.5 shrink-0" />
                          <span className="leading-none mt-[1px]">Ver detalles</span>
                        </Button>
                      )}
                      {act.estado === 'Finalizada' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 text-amber-600 hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-900/30"
                          onClick={() => handleRevertActivity(act.id)}
                          disabled={isUpdating === act.id}
                        >
                          <UndoIcon className="h-3.5 w-3.5 shrink-0" />
                          <span className="leading-none mt-[1px]">Revertir</span>
                        </Button>
                      )}
                      {act.estado === 'Finalizada' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5"
                          onClick={() => setFinalizingActivity(act)}
                        >
                          <EyeIcon className="h-3.5 w-3.5 shrink-0" />
                          <span className="leading-none mt-[1px]">Detalles</span>
                        </Button>
                      )}

                      {act.estado !== 'Finalizada' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Editar detalles"
                          className="h-8 w-8 hover:bg-muted"
                          onClick={() => setEditingActivity(act)}
                        >
                          <PencilIcon className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        title="Eliminar"
                        className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setActivityToDelete(act)}
                      >
                        <Trash2Icon className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Suspense>
        {editingActivity && (
          <EditActivityDialog
            open={!!editingActivity}
            onOpenChange={(isOpen: boolean) => { if (!isOpen) setEditingActivity(null) }}
            activity={editingActivity}
          />
        )}
        {finalizingActivity && (
          <FinalizeActivityDialog
            open={!!finalizingActivity}
            onOpenChange={(isOpen: boolean) => { if (!isOpen) setFinalizingActivity(null) }}
            activity={finalizingActivity}
          />
        )}
      </Suspense>

      <AlertDialog open={activityToDelete !== null} onOpenChange={(open) => !open && setActivityToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta actividad?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La actividad <strong>{activityToDelete?.nombre}</strong> y su dinero recaudado serán borrados permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Eliminando...' : 'Sí, eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
