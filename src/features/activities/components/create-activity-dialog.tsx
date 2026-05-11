import { useState } from 'react'
import { PlusIcon, Loader2Icon } from 'lucide-react'
import { getErrorMessage } from '@/lib/error-utils'
import { toast } from 'sonner'
import { useActivities } from '../api/use-activities'

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
  DialogTrigger,
} from '@/components/ui/dialog'

import { DatePicker } from '@/components/ui/date-picker'
import { cn } from '@/lib/utils'

export function CreateActivityDialog({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { createActivity } = useActivities()

  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [fechaEvento, setFechaEvento] = useState('')

  const resetForm = () => {
    setNombre('')
    setDescripcion('')
    setFechaEvento('')
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) resetForm()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nombre.trim() || !fechaEvento) {
      toast.error('Completa el nombre y la fecha del evento.')
      return
    }

    setIsSubmitting(true)

    try {
      await createActivity({
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        estado: 'Planeada',
        monto_recaudado: 0,
        fecha_evento: fechaEvento,
      })

      toast.success('Actividad registrada correctamente')
      handleOpenChange(false)
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Error al registrar actividad'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={<Button className={cn("gap-2", className)} />}
      >
        <PlusIcon className="h-4 w-4" />
        Nueva Actividad
      </DialogTrigger>

      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Registrar Nueva Actividad</DialogTitle>
            <DialogDescription>
              Crea un evento de recaudación como una rifa, fiesta o donación para sumar al pozo general.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nombre">Nombre de la actividad</Label>
              <Input
                id="nombre"
                placeholder="Ej: Rifa Navideña"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="descripcion">
                Descripción <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Textarea
                id="descripcion"
                placeholder="Detalle o meta de la actividad..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                disabled={isSubmitting}
                rows={2}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="fecha">Fecha del Evento</Label>
              <DatePicker
                date={fechaEvento}
                onChange={setFechaEvento}
                disabled={isSubmitting}
                id="fecha"
                placeholder="Selecciona la fecha"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !nombre.trim() || !fechaEvento}>
              {isSubmitting ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                'Crear Actividad'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
