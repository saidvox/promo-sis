import { useEffect, useMemo, useState } from 'react'
import { PlusIcon, Loader2Icon } from 'lucide-react'
import { useSWRConfig } from 'swr'
import { supabase } from '@/lib/supabase/client'
import { getErrorMessage } from '@/lib/error-utils'
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

import { DatePicker } from '@/components/ui/date-picker'
import { cn } from '@/lib/utils'

export function CreateExpenseDialog({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { mutate } = useSWRConfig()

  const [concepto, setConcepto] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [categoria, setCategoria] = useState('Otros')
  const [monto, setMonto] = useState<number | ''>('')
  const [fechaProgramada, setFechaProgramada] = useState('')
  const [actividadId, setActividadId] = useState('none')
  const [actividadGrupoId, setActividadGrupoId] = useState('none')
  const [activities, setActivities] = useState<Array<{ id: string; nombre: string }>>([])
  const [activityGroups, setActivityGroups] = useState<Array<{ id: string; actividad_id: string; nombre: string }>>([])

  useEffect(() => {
    if (!open) return

    const loadLinks = async () => {
      const [activitiesRes, groupsRes] = await Promise.all([
        supabase.from('actividades').select('id, nombre').order('fecha_evento', { ascending: false }),
        supabase.from('actividad_grupos').select('id, actividad_id, nombre').order('created_at', { ascending: true }),
      ])

      if (!activitiesRes.error) setActivities(activitiesRes.data ?? [])
      if (!groupsRes.error) setActivityGroups(groupsRes.data ?? [])
    }

    loadLinks()
  }, [open])

  const filteredGroups = useMemo(() => {
    if (actividadId === 'none') return []
    return activityGroups.filter((group) => group.actividad_id === actividadId)
  }, [actividadId, activityGroups])

  const resetForm = () => {
    setConcepto('')
    setDescripcion('')
    setCategoria('Otros')
    setMonto('')
    setFechaProgramada('')
    setActividadId('none')
    setActividadGrupoId('none')
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
        actividad_id: actividadId === 'none' ? null : actividadId,
        actividad_grupo_id: actividadGrupoId === 'none' ? null : actividadGrupoId,
        estado: 'Pendiente',
      })

      if (error) throw error

      toast.success('Egreso registrado correctamente')
      mutate('api/expenses')
      mutate('api/dashboard-stats')
      handleOpenChange(false)
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Error al registrar egreso'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button className={cn("gap-2", className)}>
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
                <Label htmlFor="categoria">Categoría</Label>
                <Select value={categoria} onValueChange={(v) => v && setCategoria(v)} disabled={isSubmitting}>
                  <SelectTrigger id="categoria">
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
              <DatePicker
                date={fechaProgramada}
                onChange={setFechaProgramada}
                disabled={isSubmitting}
                id="fecha"
                placeholder="Selecciona la fecha de pago"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="actividad">Actividad vinculada</Label>
                <Select
                  value={actividadId}
                  onValueChange={(value) => {
                    setActividadId(value ?? 'none')
                    setActividadGrupoId('none')
                  }}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="actividad">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin actividad</SelectItem>
                    {activities.map((activity) => (
                      <SelectItem key={activity.id} value={activity.id}>
                        {activity.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="actividad-grupo">Grupo vinculado</Label>
                <Select
                  value={actividadGrupoId}
                  onValueChange={(value) => setActividadGrupoId(value ?? 'none')}
                  disabled={isSubmitting || filteredGroups.length === 0}
                >
                  <SelectTrigger id="actividad-grupo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin grupo</SelectItem>
                    {filteredGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
