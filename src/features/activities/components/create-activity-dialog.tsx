import { useState } from 'react'
import { Loader2Icon, PlusIcon } from 'lucide-react'
import { useSWRConfig } from 'swr'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/error-utils'
import { cn } from '@/lib/utils'
import { useActivities } from '../api/use-activities'

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
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

type ActivityFormType = 'venta_unidades' | 'aporte_manual'

export function CreateActivityDialog({ className }: { readonly className?: string }) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { createActivity } = useActivities()
  const { mutate } = useSWRConfig()

  const [tipoActividad, setTipoActividad] = useState<ActivityFormType>('venta_unidades')
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [fechaEvento, setFechaEvento] = useState('')
  const [montoRecaudado, setMontoRecaudado] = useState<number | ''>('')
  const [etiquetaUnidad, setEtiquetaUnidad] = useState('rifas')
  const [precioUnitario, setPrecioUnitario] = useState<number | ''>(7)
  const [minimoUnidades, setMinimoUnidades] = useState<number | ''>(5)
  const [montoPromocion, setMontoPromocion] = useState<number | ''>(3)
  const [montoBeneficio, setMontoBeneficio] = useState<number | ''>(4)
  const [usaGrupos, setUsaGrupos] = useState(true)
  const [usaPremios, setUsaPremios] = useState(true)

  const resetForm = () => {
    setTipoActividad('venta_unidades')
    setNombre('')
    setDescripcion('')
    setFechaEvento('')
    setMontoRecaudado('')
    setEtiquetaUnidad('rifas')
    setPrecioUnitario(7)
    setMinimoUnidades(5)
    setMontoPromocion(3)
    setMontoBeneficio(4)
    setUsaGrupos(true)
    setUsaPremios(true)
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) resetForm()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nombre.trim() || !fechaEvento) {
      toast.error('Completa el nombre y la fecha de la actividad.')
      return
    }

    if (tipoActividad === 'aporte_manual') {
      const income = Number(montoRecaudado)

      if (income <= 0) {
        toast.error('El monto recaudado debe ser mayor que 0.')
        return
      }

      setIsSubmitting(true)

      try {
        await createActivity({
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || null,
          estado: 'Finalizada',
          monto_recaudado: income,
          fecha_evento: fechaEvento,
          tipo_actividad: 'aporte_manual',
          etiqueta_unidad: 'ingreso',
          precio_unitario: 0,
          minimo_unidades_beneficio: 0,
          monto_promocion_unitario: 0,
          monto_beneficio_unitario: 0,
          usa_grupos: false,
          usa_premios: false,
          total_bruto: income,
          total_promocion: income,
          total_beneficio: 0,
          total_premios_externos: 0,
        })

        mutate('api/dashboard-stats')
        mutate('api/expenses')
        toast.success('Ingreso simple registrado correctamente')
        handleOpenChange(false)
      } catch (error: unknown) {
        toast.error(getErrorMessage(error, 'Error al registrar ingreso simple'))
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    if (!etiquetaUnidad.trim()) {
      toast.error('Completa el nombre, la fecha y la unidad de venta.')
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
      await createActivity({
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        estado: 'Planeada',
        monto_recaudado: 0,
        fecha_evento: fechaEvento,
        tipo_actividad: 'venta_unidades',
        etiqueta_unidad: etiquetaUnidad.trim(),
        precio_unitario: price,
        minimo_unidades_beneficio: Number(minimoUnidades || 0),
        monto_promocion_unitario: promotion,
        monto_beneficio_unitario: benefit,
        usa_grupos: usaGrupos,
        usa_premios: usaPremios,
      })

      mutate('api/dashboard-stats')
      mutate('api/expenses')
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
      <DialogTrigger render={<Button className={cn('gap-2', className)} />}>
        <PlusIcon className="h-4 w-4" />
        Nueva Actividad
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[720px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Registrar actividad</DialogTitle>
            <DialogDescription>
              Registra rifas, ventas por unidades o ingresos directos de recaudacion.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="tipo-actividad">Tipo de actividad</Label>
              <Select
                value={tipoActividad}
                onValueChange={(value) => setTipoActividad((value ?? 'venta_unidades') as ActivityFormType)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="tipo-actividad" className="w-full">
                  <span>{tipoActividad === 'aporte_manual' ? 'Ingreso simple' : 'Venta por unidades'}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="venta_unidades">Venta por unidades</SelectItem>
                  <SelectItem value="aporte_manual">Ingreso simple</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
              <div className="grid gap-2">
                <Label htmlFor="nombre">Nombre de la actividad</Label>
                <Input
                  id="nombre"
                  placeholder={tipoActividad === 'aporte_manual' ? 'Ej: Venta de comida' : 'Ej: Rifa Dia de la Madre'}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="fecha">Fecha</Label>
                <DatePicker
                  date={fechaEvento}
                  onChange={setFechaEvento}
                  disabled={isSubmitting}
                  id="fecha"
                  placeholder="Selecciona"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="descripcion">
                Descripcion <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Textarea
                id="descripcion"
                placeholder="Notas internas, meta de la actividad o contexto..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                disabled={isSubmitting}
                rows={2}
              />
            </div>

            {tipoActividad === 'aporte_manual' && (
              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="grid gap-2">
                  <Label htmlFor="monto-recaudado">Monto recaudado (S/)</Label>
                  <Input
                    id="monto-recaudado"
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    value={montoRecaudado}
                    onChange={(e) => setMontoRecaudado(e.target.value ? Number(e.target.value) : '')}
                    disabled={isSubmitting}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Este ingreso quedara finalizado y sumara al saldo de la promocion inmediatamente.
                </p>
              </div>
            )}

            {tipoActividad === 'venta_unidades' && (
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="mb-4">
                <h4 className="text-sm font-semibold">Reglas de venta y beneficio</h4>
                <p className="text-xs text-muted-foreground">
                  Ejemplo rifa: S/7 por rifa, minimo 5 rifas, S/3 para promocion y S/4 para cuota.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="unidad">Unidad</Label>
                  <Input
                    id="unidad"
                    placeholder="rifas, entradas, tickets"
                    value={etiquetaUnidad}
                    onChange={(e) => setEtiquetaUnidad(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="precio">Precio por unidad (S/)</Label>
                  <Input
                    id="precio"
                    type="number"
                    step="0.01"
                    min="0"
                    value={precioUnitario}
                    onChange={(e) => setPrecioUnitario(e.target.value ? Number(e.target.value) : '')}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="minimo">Minimo para beneficio</Label>
                  <Input
                    id="minimo"
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
                    <Label htmlFor="promo">Promocion/u.</Label>
                    <Input
                      id="promo"
                      type="number"
                      step="0.01"
                      min="0"
                      value={montoPromocion}
                      onChange={(e) => setMontoPromocion(e.target.value ? Number(e.target.value) : '')}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="beneficio">Beneficio/u.</Label>
                    <Input
                      id="beneficio"
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
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                !nombre.trim() ||
                !fechaEvento ||
                (tipoActividad === 'aporte_manual' && Number(montoRecaudado) <= 0)
              }
            >
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
