import { useState, useEffect } from 'react'
import { Loader2Icon, CheckCircle2Icon } from 'lucide-react'
import { getErrorMessage } from '@/lib/error-utils'
import { toast } from 'sonner'
import { useActivities, type ActividadRow } from '../api/use-activities'
import { useSWRConfig } from 'swr'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface FinalizeActivityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activity: ActividadRow | null
}

export function FinalizeActivityDialog({ open, onOpenChange, activity }: FinalizeActivityDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { updateActivity } = useActivities()
  const { mutate } = useSWRConfig()

  const [monto, setMonto] = useState<number | ''>('')

  useEffect(() => {
    if (open) {
      setMonto('')
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!activity) return

    if (monto === '' || Number(monto) < 0) {
      toast.error('Por favor ingresa un monto válido (puede ser 0 si no se recaudó nada).')
      return
    }

    setIsSubmitting(true)

    try {
      await updateActivity(activity.id, {
        estado: 'Finalizada',
        monto_recaudado: Number(monto),
      })

      toast.success('Actividad finalizada correctamente')
      mutate('api/dashboard-stats')
      mutate('api/expenses') // Actualizar saldo disponible en toda la app
      onOpenChange(false)
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Error al finalizar actividad'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!activity) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Finalizar Recaudación</DialogTitle>
            <DialogDescription>
              Ingresa el monto total recaudado en <strong>{activity.nombre}</strong>. Al finalizar, la actividad se cerrará y el dinero se sumará al pozo.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-6">
            <div className="grid gap-2">
              <Label htmlFor="monto_final">Monto Total Recaudado (S/)</Label>
              <Input
                id="monto_final"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 h-14"
                value={monto}
                onChange={(e) => setMonto(e.target.value ? Number(e.target.value) : '')}
                disabled={isSubmitting}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || monto === ''}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Finalizando...
                </>
              ) : (
                <>
                  <CheckCircle2Icon className="mr-2 h-4 w-4" />
                  Confirmar y Finalizar
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
