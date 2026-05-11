import { useState, useEffect } from 'react'
import { Loader2Icon } from 'lucide-react'
import { getErrorMessage } from '@/lib/error-utils'
import { toast } from 'sonner'
import { useActivities, type ActividadRow } from '../api/use-activities'
import { useSWRConfig } from 'swr'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { DatePicker } from '@/components/ui/date-picker'

interface EditActivityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activity: ActividadRow | null
}

export function EditActivityDialog({ open, onOpenChange, activity }: EditActivityDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { updateActivity } = useActivities()
  const { mutate } = useSWRConfig()

  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [fechaEvento, setFechaEvento] = useState('')

  useEffect(() => {
    if (open && activity) {
      setNombre(activity.nombre)
      setDescripcion(activity.descripcion || '')
      setFechaEvento(activity.fecha_evento)
    }
  }, [open, activity])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!activity || !nombre.trim() || !fechaEvento) {
      toast.error('Completa el nombre y la fecha del evento.')
      return
    }

    setIsSubmitting(true)

    try {
      await updateActivity(activity.id, {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        fecha_evento: fechaEvento,
      })

      toast.success('Actividad actualizada correctamente')
      mutate('api/dashboard-stats')
      mutate('api/expenses') // Actualizar saldo disponible en toda la app
      onOpenChange(false)
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Error al actualizar actividad'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar Actividad</DialogTitle>
            <DialogDescription>
              Modifica los datos de la actividad o actualiza el monto recaudado.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-nombre">Nombre de la actividad</Label>
              <Input
                id="edit-nombre"
                placeholder="Ej: Rifa Navideña"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-descripcion">
                Descripción <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Textarea
                id="edit-descripcion"
                placeholder="Detalle o meta de la actividad..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                disabled={isSubmitting}
                rows={2}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-fecha">Fecha del Evento</Label>
              <DatePicker
                date={fechaEvento}
                onChange={setFechaEvento}
                disabled={isSubmitting}
                id="edit-fecha"
                placeholder="Selecciona la fecha"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !nombre.trim() || !fechaEvento}>
              {isSubmitting ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
