import { useEffect, useState } from 'react'
import { Loader2Icon } from 'lucide-react'
import { useSWRConfig } from 'swr'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/error-utils'
import { useActivities, type ActividadRow } from '../api/use-activities'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

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
  const [etiquetaUnidad, setEtiquetaUnidad] = useState('unidades')
  const [precioUnitario, setPrecioUnitario] = useState<number | ''>('')
  const [minimoUnidades, setMinimoUnidades] = useState<number | ''>('')
  const [montoPromocion, setMontoPromocion] = useState<number | ''>('')
  const [montoBeneficio, setMontoBeneficio] = useState<number | ''>('')
  const [usaGrupos, setUsaGrupos] = useState(false)
  const [usaPremios, setUsaPremios] = useState(false)

  useEffect(() => {
    if (open && activity) {
      setNombre(activity.nombre)
      setDescripcion(activity.descripcion || '')
      setFechaEvento(activity.fecha_evento)
      setEtiquetaUnidad(activity.etiqueta_unidad || 'unidades')
      setPrecioUnitario(Number(activity.precio_unitario || 0))
      setMinimoUnidades(Number(activity.minimo_unidades_beneficio || 0))
      setMontoPromocion(Number(activity.monto_promocion_unitario || 0))
      setMontoBeneficio(Number(activity.monto_beneficio_unitario || 0))
      setUsaGrupos(Boolean(activity.usa_grupos))
      setUsaPremios(Boolean(activity.usa_premios))
    }
  }, [open, activity])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!activity || !nombre.trim() || !fechaEvento || !etiquetaUnidad.trim()) {
      toast.error('Completa el nombre, fecha y unidad de venta.')
      return
    }

    const price = Number(precioUnitario)
    const promotion = Number(montoPromocion)
    const benefit = Number(montoBeneficio)

    if (price < 0 || promotion < 0 || benefit < 0 || promotion + benefit > price) {
      toast.error('Promocion + beneficio no puede superar el precio por unidad.')
      return
    }

    setIsSubmitting(true)

    try {
      await updateActivity(activity.id, {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        fecha_evento: fechaEvento,
        etiqueta_unidad: etiquetaUnidad.trim(),
        precio_unitario: price,
        minimo_unidades_beneficio: Number(minimoUnidades || 0),
        monto_promocion_unitario: promotion,
        monto_beneficio_unitario: benefit,
        usa_grupos: usaGrupos,
        usa_premios: usaPremios,
      })

      toast.success('Actividad actualizada correctamente')
      mutate('api/activities')
      mutate('api/dashboard-stats')
      mutate('api/expenses')
      onOpenChange(false)
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Error al actualizar actividad'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!activity) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[720px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar actividad</DialogTitle>
            <DialogDescription>
              Modifica datos generales, reglas de venta, grupos y premios antes de finalizar.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
              <div className="grid gap-2">
                <Label htmlFor="edit-nombre">Nombre de la actividad</Label>
                <Input
                  id="edit-nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-fecha">Fecha</Label>
                <DatePicker
                  date={fechaEvento}
                  onChange={setFechaEvento}
                  disabled={isSubmitting}
                  id="edit-fecha"
                  placeholder="Selecciona"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-descripcion">
                Descripcion <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Textarea
                id="edit-descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                disabled={isSubmitting}
                rows={2}
              />
            </div>

            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="mb-4">
                <h4 className="text-sm font-semibold">Reglas de venta y beneficio</h4>
                <p className="text-xs text-muted-foreground">
                  Estos valores definen el calculo automatico al registrar resultados.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="edit-unidad">Unidad</Label>
                  <Input
                    id="edit-unidad"
                    value={etiquetaUnidad}
                    onChange={(e) => setEtiquetaUnidad(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-precio">Precio por unidad (S/)</Label>
                  <Input
                    id="edit-precio"
                    type="number"
                    step="0.01"
                    min="0"
                    value={precioUnitario}
                    onChange={(e) => setPrecioUnitario(e.target.value ? Number(e.target.value) : '')}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-minimo">Minimo para beneficio</Label>
                  <Input
                    id="edit-minimo"
                    type="number"
                    step="1"
                    min="0"
                    value={minimoUnidades}
                    onChange={(e) => setMinimoUnidades(e.target.value ? Number(e.target.value) : '')}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-promo">Promocion/u.</Label>
                    <Input
                      id="edit-promo"
                      type="number"
                      step="0.01"
                      min="0"
                      value={montoPromocion}
                      onChange={(e) => setMontoPromocion(e.target.value ? Number(e.target.value) : '')}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-beneficio">Beneficio/u.</Label>
                    <Input
                      id="edit-beneficio"
                      type="number"
                      step="0.01"
                      min="0"
                      value={montoBeneficio}
                      onChange={(e) => setMontoBeneficio(e.target.value ? Number(e.target.value) : '')}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
                  <Checkbox checked={usaGrupos} onCheckedChange={(v) => setUsaGrupos(v === true)} disabled={isSubmitting} />
                  Usar grupos
                </label>
                <label className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
                  <Checkbox checked={usaPremios} onCheckedChange={(v) => setUsaPremios(v === true)} disabled={isSubmitting} />
                  Registrar premios externos
                </label>
              </div>
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
                'Guardar cambios'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
