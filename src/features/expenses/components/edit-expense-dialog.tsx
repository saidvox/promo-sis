import { useState, useEffect } from 'react'
import { Loader2Icon } from 'lucide-react'
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
} from '@/components/ui/dialog'
import { DatePicker } from '@/components/ui/date-picker'

import type { EgresoRow } from '../api/use-expenses'

interface EditExpenseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  egreso: EgresoRow | null
}

export function EditExpenseDialog({ open, onOpenChange, egreso }: EditExpenseDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { mutate } = useSWRConfig()

  const [concepto, setConcepto] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [categoria, setCategoria] = useState('Otros')
  const [monto, setMonto] = useState<number | ''>('')
  const [fechaProgramada, setFechaProgramada] = useState('')

  useEffect(() => {
    if (open && egreso) {
      setConcepto(egreso.concepto)
      setDescripcion(egreso.descripcion || '')
      setCategoria(egreso.categoria)
      setMonto(egreso.monto)
      setFechaProgramada(egreso.fecha_programada || '')
    }
  }, [open, egreso])

  if (!egreso) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!concepto.trim() || !monto || Number(monto) <= 0) {
      toast.error('Completa el concepto y un monto válido.')
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await supabase
        .from('egresos')
        .update({
          concepto: concepto.trim(),
          descripcion: descripcion.trim() || null,
          categoria,
          monto: Number(monto),
          fecha_programada: fechaProgramada || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', egreso.id)

      if (error) throw error

      toast.success('Egreso actualizado correctamente')
      mutate('api/expenses')
      mutate('api/dashboard-stats')
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar egreso')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar Egreso</DialogTitle>
            <DialogDescription>
              Modifica los datos de este compromiso de pago.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-concepto">Concepto</Label>
              <Input
                id="edit-concepto"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-desc">
                Descripción <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Textarea
                id="edit-desc"
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
                <Label htmlFor="edit-monto">Monto (S/)</Label>
                <Input
                  id="edit-monto"
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="font-semibold"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value ? Number(e.target.value) : '')}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-fecha">Fecha Programada</Label>
              <DatePicker
                date={fechaProgramada}
                onChange={setFechaProgramada}
                disabled={isSubmitting}
                placeholder="Selecciona la fecha de pago"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !concepto.trim() || !monto}>
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
