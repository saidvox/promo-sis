import { useState, lazy, Suspense } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Trash2Icon, PhoneIcon } from 'lucide-react'
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
import { toast } from 'sonner'
import { useSWRConfig } from 'swr'
import { supabase } from '@/lib/supabase/client'
import { useStudents, type Perfil } from '@/features/students/api/use-students'
import { getRoleColor } from '@/features/students/utils/get-role-color'
const CreateParticipantDialog = lazy(() => import('./create-participant-dialog').then(m => ({ default: m.CreateParticipantDialog })))
const EditParticipantDialog = lazy(() => import('./edit-participant-dialog').then(m => ({ default: m.EditParticipantDialog })))

export function ParticipantsTable() {
  const { data, isLoading, error } = useStudents()
  const { mutate } = useSWRConfig()
  const [activeTab, setActiveTab] = useState<string>('todos')
  const [participantToDelete, setParticipantToDelete] = useState<Perfil | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  if (error) {
    return (
      <div className="flex justify-center p-8 text-destructive">
        Error cargando participantes. Por favor intenta de nuevo.
      </div>
    )
  }

  // Derived current array based on activeTab
  const getFilteredData = () => {
    if (!data) return []
    if (activeTab === 'comite') return data.staff
    if (activeTab === 'alumnos') return data.students
    return data.all
  }
  
  const filteredData = getFilteredData()

  const handleDelete = async () => {
    if (!participantToDelete) return
    
    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('perfiles')
        .delete()
        .eq('id', participantToDelete.id)

      if (error) throw error
      
      toast.success('Participante eliminado correctamente')
      mutate('api/students')
      setParticipantToDelete(null)
    } catch (err: any) {
      console.error('Error eliminando participante:', err)
      toast.error(err.message || 'Error al eliminar')
    } finally {
      setIsDeleting(false)
    }
  }

  const getInscriptionBadge = (participant: Perfil) => {
    const insc = (participant as any).inscripciones
    const isEnrolled = Array.isArray(insc) ? insc.length > 0 : !!insc
    return isEnrolled ? (
      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400 text-xs">
        Inscrito
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-muted text-muted-foreground border-border/50 text-xs">
        No Inscrito
      </Badge>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar: stacked on mobile, row on desktop */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList className="grid w-full grid-cols-3 sm:w-[300px]">
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="comite">Comité</TabsTrigger>
            <TabsTrigger value="alumnos">Alumnos</TabsTrigger>
          </TabsList>
        </Tabs>
        <CreateParticipantDialog className="w-full sm:w-auto" />
      </div>

      {/* MOBILE Card View (hidden on sm+) */}
      <div className="block sm:hidden space-y-2">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-16" />
            </div>
          ))
        ) : filteredData.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground text-sm">
            No hay participantes registrados en esta categoría.
          </div>
        ) : (
          filteredData.map((participant) => (
            <div key={participant.id} className="rounded-xl border bg-card p-4 space-y-2.5 shadow-sm">
              {/* Header row: name + role badge */}
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5 min-w-0">
                  <p className="font-semibold text-sm leading-tight truncate">{participant.nombre_completo}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">{participant.codigo_u} · {participant.dni}</p>
                </div>
                <Badge variant="outline" className={`${getRoleColor(participant.rol)} text-xs shrink-0`}>
                  {participant.rol}
                </Badge>
              </div>

              {/* Second row: inscription + phone */}
              <div className="flex items-center gap-3">
                {getInscriptionBadge(participant)}
                {participant.telefono && (
                  <a
                    href={`tel:${participant.telefono}`}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <PhoneIcon className="h-3 w-3" />
                    {participant.telefono}
                  </a>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 pt-1 border-t border-border/40">
                <Suspense>
                  <EditParticipantDialog participant={participant} />
                </Suspense>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setParticipantToDelete(participant)}
                >
                  <Trash2Icon className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* DESKTOP Table View (hidden on mobile) */}
      <div className="hidden sm:block rounded-md border bg-card text-card-foreground shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">DNI</TableHead>
              <TableHead className="w-[150px]">Código U</TableHead>
              <TableHead>Nombre Completo</TableHead>
              <TableHead className="w-[120px] text-center">Inscripción</TableHead>
              <TableHead className="w-[120px]">Teléfono</TableHead>
              <TableHead className="text-right">Rol</TableHead>
              <TableHead className="w-[80px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell className="text-right flex justify-end">
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell className="text-right flex justify-end">
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No hay participantes registrados en esta categoría.
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((participant) => (
                <TableRow key={participant.id}>
                  <TableCell className="font-medium text-muted-foreground">{participant.dni}</TableCell>
                  <TableCell>{participant.codigo_u}</TableCell>
                  <TableCell className="font-medium">{participant.nombre_completo}</TableCell>
                  <TableCell className="text-center">
                    {getInscriptionBadge(participant)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{participant.telefono || '-'}</TableCell>
                  <TableCell className="text-right">
                    <Badge 
                      variant="outline"
                      className={getRoleColor(participant.rol)}
                    >
                      {participant.rol}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right flex items-center justify-end gap-1">
                    <Suspense>
                      <EditParticipantDialog participant={participant} />
                    </Suspense>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setParticipantToDelete(participant)}
                    >
                      <Trash2Icon className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Resumen de Inscripciones */}
      {!isLoading && data && (
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Inscritos</span>
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {data.all.filter(p => {
                const insc = (p as any).inscripciones
                return Array.isArray(insc) ? insc.length > 0 : !!insc
              }).length}
              <span className="text-sm font-normal text-muted-foreground ml-1">/ {data.all.length}</span>
            </span>
          </div>
          <div className="h-8 w-px bg-border hidden sm:block"></div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Recaudado por Inscripciones</span>
            <span className="text-xl font-bold">
              S/ {(data.all.filter(p => {
                const insc = (p as any).inscripciones
                return Array.isArray(insc) ? insc.length > 0 : !!insc
              }).length * 100).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}

      <AlertDialog open={participantToDelete !== null} onOpenChange={(open) => !open && setParticipantToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente a <strong>{participantToDelete?.nombre_completo}</strong> del sistema. No podrás deshacer esta operación.
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
