import { useState } from 'react'
import { PlusIcon, SaveIcon, XIcon, CalendarIcon, Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale/es'

import { useQuotas, MESES_DEL_ANO } from '../api/use-quotas'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DatePicker } from '@/components/ui/date-picker'
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

export function QuotasConfigView() {
  const { data, isLoading, error, saveQuota, deleteQuota } = useQuotas()
  const [selectedMes, setSelectedMes] = useState<string | null>(null)
  
  // Local Form state
  const [monto, setMonto] = useState<number>(150)
  const [fechaVencimiento, setFechaVencimiento] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [deletingQuota, setDeletingQuota] = useState<{ mes: string, id: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleEdit = (mes: string) => {
    const config = data[mes]
    setSelectedMes(mes)
    if (config) {
      setMonto(config.monto)
      setFechaVencimiento(config.fecha_vencimiento || '')
    } else {
      setMonto(150) // Default sugerido
      setFechaVencimiento('')
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMes) return

    setIsSaving(true)
    const formFecha = fechaVencimiento.trim() === '' ? null : fechaVencimiento
    
    try {
      await saveQuota(selectedMes, monto, formFecha)
      toast.success(`Cuota de ${selectedMes} configurada exitosamente.`)
      setSelectedMes(null)
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar la configuración')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeactivate = async () => {
    if (!deletingQuota) return
    
    setIsDeleting(true)
    try {
      await deleteQuota(deletingQuota.id)
      toast.success(`${deletingQuota.mes} ha sido desactivado.`)
      setDeletingQuota(null)
    } catch (err: any) {
      toast.error('No se puede desactivar. Probablemente ya existen pagos en este mes.')
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center text-muted-foreground">
        <Loader2Icon className="h-6 w-6 animate-spin mr-2" />
        <p>Cargando calendario financiero...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-destructive">
        <p>Error cargando la configuración: {error.message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* MOBILE VIEW: Cards */}
      <div className="grid gap-3 sm:hidden">
        {MESES_DEL_ANO.map((mes) => {
          const config = data[mes]
          const isActive = !!config

          return (
            <div 
              key={mes} 
              className={cn(
                "group relative overflow-hidden rounded-xl border bg-card p-4 transition-all hover:shadow-md",
                !isActive && "opacity-70 grayscale-[0.5]"
              )}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg tracking-tight">{mes}</h3>
                  <div className="flex items-center gap-2">
                    {isActive ? (
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        S/ {config.monto.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Inactivo</span>
                    )}
                    {isActive && config.fecha_vencimiento && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground border-l pl-2 border-border/50">
                        <CalendarIcon className="h-3 w-3" />
                        {format(new Date(`${config.fecha_vencimiento}T00:00:00`), 'dd MMM', { locale: es })}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isActive ? (
                    <>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => handleEdit(mes)}
                        className="h-9 px-4 text-xs font-semibold shadow-sm"
                      >
                        Modificar
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-rose-500 hover:bg-rose-500/10"
                        onClick={() => setDeletingQuota({ mes, id: config.id })}
                      >
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="h-9 px-6 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                      onClick={() => handleEdit(mes)}
                    >
                      <PlusIcon className="mr-1.5 h-3.5 w-3.5" /> Activar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* DESKTOP VIEW: Table */}
      <div className="hidden sm:block overflow-hidden rounded-xl border border-border/40 bg-card shadow-sm">

        <Table>
          <TableHeader className="bg-secondary/40">
            <TableRow>
              <TableHead className="w-[140px] sm:w-[180px]">Mes</TableHead>
              <TableHead>Monto (S/)</TableHead>
              <TableHead className="hidden sm:table-cell">Fecha Límite</TableHead>
              <TableHead className="text-right">Gestión</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MESES_DEL_ANO.map((mes) => {
              const config = data[mes]
              const isActive = !!config

              return (
                <TableRow key={mes} className={cn("transition-colors hover:bg-muted/30", !isActive && "opacity-60")}>
                  <TableCell className="font-medium text-sm">
                    {mes}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {isActive ? (
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        S/ {config.monto.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs italic">- Inactivo -</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isActive && config.fecha_vencimiento ? (
                      <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        {format(new Date(`${config.fecha_vencimiento}T00:00:00`), 'dd MMM yyyy', { locale: es })}
                      </div>
                    ) : (
                      <span className="hidden sm:inline text-muted-foreground text-xs">{isActive ? 'Sin fecha' : '-'}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {isActive ? (
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleEdit(mes)}
                          className="h-7 text-xs font-medium"
                        >
                          Modificar
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-rose-500 hover:bg-rose-500/10"
                          title="Desactivar mes"
                          onClick={() => setDeletingQuota({ mes, id: config.id })}
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="h-7 text-xs"
                        onClick={() => handleEdit(mes)}
                      >
                        <PlusIcon className="mr-1 h-3 w-3" /> Activar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={selectedMes !== null} onOpenChange={(o) => !o && setSelectedMes(null)}>
        {selectedMes && (
          <DialogContent aria-describedby="Configurar Detalles de Cuota" className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Configurar {selectedMes}</DialogTitle>
              <DialogDescription>Ajusta el valor monetario a cobrar y la fecha en que vencen estas aportaciones para efectos de contabilidad.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSave} className="grid gap-6 py-4">
              <div className="grid gap-2">
                <Label htmlFor="monto">Monto a Cohortar (S/)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                    S/
                  </span>
                  <Input
                    id="monto"
                    type="number"
                    step="0.10"
                    min="1"
                    className="pl-8 text-lg font-semibold"
                    value={monto}
                    onChange={(e) => setMonto(parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fecha">Fecha Límite (Productora) <span className="text-muted-foreground text-xs font-normal ml-1">(Opcional)</span></Label>
                <DatePicker
                  date={fechaVencimiento}
                  onChange={setFechaVencimiento}
                  disabled={isSaving}
                  id="fecha"
                  placeholder="Sin fecha límite"
                  className="w-full text-sm font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setSelectedMes(null)}>Cancelar</Button>
                <Button type="submit" disabled={isSaving} className="gap-1.5 shadow-sm">
                  {isSaving ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <SaveIcon className="h-4 w-4" />}
                  {data[selectedMes] ? 'Guardar Cambios' : 'Activar Mes'}
                </Button>
              </div>
            </form>
          </DialogContent>
        )}
      </Dialog>

      <AlertDialog open={deletingQuota !== null} onOpenChange={(open) => !open && setDeletingQuota(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar cuota de {deletingQuota?.mes}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción desactivará el mes para cobros. <strong>Atención:</strong> Esta operación podría fallar si ya existen pagos registrados para este mes en la base de datos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault()
                handleDeactivate()
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Desactivando...' : 'Sí, desactivar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
