import { useState } from 'react'
import { PlusIcon, SaveIcon, XIcon, CalendarIcon, Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

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

export function QuotasConfigView() {
  const { data, isLoading, error, saveQuota, deleteQuota } = useQuotas()
  const [selectedMes, setSelectedMes] = useState<string | null>(null)
  
  // Local Form state
  const [monto, setMonto] = useState<number>(150)
  const [fechaVencimiento, setFechaVencimiento] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)

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

  const handleDelete = async (mes: string, id: string) => {
    if (!window.confirm(`¿Seguro que deseas desactivar la cuota de ${mes}? Esto podría fallar si ya tiene pagos asociados.`)) return
    
    try {
      await deleteQuota(id)
      toast.success(`${mes} ha sido descativado.`)
    } catch (err: any) {
      toast.error('No se puede desactivar. Probablemente ya existen pagos en este mes.')
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
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-foreground tracking-tight">Calendario de Recaudación</h2>
        <p className="text-sm text-muted-foreground">
          Define qué meses son cobrables indicando su tarifa exacta y su fecha límite proyectada. Los meses que actives aparecerán en rojo en la Tabla de Pagos de forma inmediata para todos los participantes inscritos.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/40 bg-card shadow-sm">
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
                          variant="destructive"
                          size="icon-xs"
                          className="h-6 w-6 opacity-40 hover:opacity-100"
                          title="Desactivar mes"
                          onClick={() => handleDelete(mes, config.id)}
                        >
                          <XIcon className="h-3 w-3" />
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
    </div>
  )
}
