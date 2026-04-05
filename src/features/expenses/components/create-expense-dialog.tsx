import { useState } from 'react'
import { PlusIcon, Loader2Icon } from 'lucide-react'
import { useSWRConfig } from 'swr'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export function CreateExpenseDialog() {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { mutate } = useSWRConfig()

  const [concepto, setConcepto] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [categoria, setCategoria] = useState('Otros')
  const [monto, setMonto] = useState<number | ''>('')
  const [fechaProgramada, setFechaProgramada] = useState('')

  const resetForm = () => {
    setConcepto('')
    setDescripcion('')
    setCategoria('Otros')
    setMonto('')
    setFechaProgramada('')
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) resetForm()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!concepto.trim() || !monto || Number(monto) <= 0) {
      toast.error('Completa el concepto y un monto válido.')
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await supabase.from('egresos').insert({
        concepto: concepto.trim(),
        descripcion: descripcion.trim() || null,
        categoria,
        monto: Number(monto),
        fecha_programada: fechaProgramada || null,
        estado: 'Pendiente',
      })

      if (error) throw error

      toast.success('Egreso registrado correctamente')
      mutate('api/expenses')
      mutate('api/dashboard-stats')
      handleOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || 'Error al registrar egreso')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button className="gap-2">
            <PlusIcon className="h-4 w-4" />
            Nuevo Egreso
          </Button>
        }
      />

      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Registrar Nuevo Egreso</DialogTitle>
            <DialogDescription>
              Crea un compromiso de pago pendiente que podrás ejecutar cuando dispongas del saldo.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="concepto">Concepto</Label>
              <Input
                id="concepto"
                placeholder="Ej: Pago mensual a productora"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="descripcion">
                Descripción <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Textarea
                id="descripcion"
                placeholder="Detalle adicional del gasto..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                disabled={isSubmitting}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Categoría</Label>
                <Select value={categoria} onValueChange={(v) => v && setCategoria(v)} disabled={isSubmitting}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Productora">Productora (RG)</SelectItem>
                    <SelectItem value="Otros">Otros Gastos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="monto">Monto (S/)</Label>
                <Input
                  id="monto"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  className="font-semibold"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value ? Number(e.target.value) : '')}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="fecha">Fecha Programada de Pago</Label>
              <Input
                id="fecha"
                type="date"
                value={fechaProgramada}
                onChange={(e) => setFechaProgramada(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !concepto.trim() || !monto}>
              {isSubmitting ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                'Crear Egreso'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
