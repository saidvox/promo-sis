import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { FileTextIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import type { EgresoWithAbonos } from '../api/use-expenses'

interface ExpenseDetailsDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly egreso: EgresoWithAbonos | null
}

export function ExpenseDetailsDialog({
  open,
  onOpenChange,
  egreso,
}: ExpenseDetailsDialogProps) {
  if (!egreso) return null

  const totalAbonado = egreso.abonos_egresos.reduce(
    (total, abono) => total + abono.monto_abono,
    0
  )
  const pendiente = Math.max(egreso.monto - totalAbonado, 0)
  const isFullyPaid = egreso.estado === 'Pagado' || pendiente === 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileTextIcon className="h-4 w-4 text-muted-foreground" />
            Detalle del egreso
          </DialogTitle>
          <DialogDescription>
            Información completa del concepto registrado.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-4 overflow-y-auto py-1 pr-1">
          <div className="space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Concepto
            </p>
            <p className="break-words font-medium text-foreground [overflow-wrap:anywhere]">
              {egreso.concepto}
            </p>
          </div>

          {egreso.descripcion && (
            <div className="space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Descripción
              </p>
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground [overflow-wrap:anywhere]">
                {egreso.descripcion}
              </p>
            </div>
          )}

          {egreso.actividades && (
            <div className="space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Actividad
              </p>
              <p className="break-words text-sm text-foreground [overflow-wrap:anywhere]">
                {egreso.actividades.nombre}
                {egreso.actividad_grupos ? ` · ${egreso.actividad_grupos.nombre}` : ''}
              </p>
            </div>
          )}

          <div className="grid gap-3 rounded-xl border border-border/50 bg-muted/30 p-4 sm:grid-cols-3">
            <div className="space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Monto
              </p>
              <p className="font-semibold tabular-nums text-foreground">
                S/ {egreso.monto.toFixed(2)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Abonado
              </p>
              <p className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                S/ {totalAbonado.toFixed(2)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Pendiente
              </p>
              <p className="font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                S/ {pendiente.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Categoría
              </p>
              <p className="text-sm text-foreground">{egreso.categoria}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Fecha programada
              </p>
              <p className="text-sm text-foreground">
                {egreso.fecha_programada
                  ? format(new Date(`${egreso.fecha_programada}T00:00:00`), 'd MMM yyyy', {
                      locale: es,
                    })
                  : 'Sin fecha'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Estado
              </p>
              <Badge variant="outline">
                {isFullyPaid ? 'Pagado' : totalAbonado > 0 ? 'Parcial' : 'Pendiente'}
              </Badge>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
