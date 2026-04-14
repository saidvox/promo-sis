import { useState, useEffect } from 'react'
import { Loader2Icon, AlertTriangleIcon, CheckCircle2Icon, BanknoteIcon } from 'lucide-react'
import { useSWRConfig } from 'swr'
import { supabase } from '@/lib/supabase/client'
import { getErrorMessage } from '@/lib/error-utils'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
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

import type { EgresoWithAbonos } from '../api/use-expenses'

interface PayExpenseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  egreso: EgresoWithAbonos | null
  saldoDisponible: number
}

export function PayExpenseDialog({ open, onOpenChange, egreso, saldoDisponible }: PayExpenseDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [montoAbono, setMontoAbono] = useState<string>('')
  const { mutate } = useSWRConfig()

  const pagadoAcumulado = egreso?.abonos_egresos.reduce((acc, a) => acc + a.monto_abono, 0) ?? 0
  const pendiente = (egreso?.monto ?? 0) - pagadoAcumulado

  useEffect(() => {
    if (open && egreso) {
      setMontoAbono(pendiente.toString())
    }
  }, [open, egreso, pendiente])

  if (!egreso) return null

  const montoAbonoNum = parseFloat(montoAbono) || 0
  const saldoDespues = saldoDisponible - montoAbonoNum
  const insufficient = saldoDespues < 0
  const excedePendiente = montoAbonoNum > pendiente

  const handlePay = async () => {
    if (montoAbonoNum <= 0) {
      toast.error('El monto a pagar debe ser mayor a 0')
      return
    }

    if (excedePendiente) {
      toast.error('El abono no puede superar el saldo pendiente del egreso')
      return
    }

    if (insufficient) {
      toast.error('Saldo insuficiente en caja para realizar este pago')
      return
    }

    setIsSubmitting(true)
    try {
      // 1. Insertar el abono
      const { error: abonoError } = await supabase
        .from('abonos_egresos')
        .insert({
          egreso_id: egreso.id,
          monto_abono: montoAbonoNum,
          fecha_pago: new Date().toISOString()
        })

      if (abonoError) throw abonoError

      // 2. Si el nuevo total cubierto es el 100%, marcar como Pagado
      const nuevoTotalPagado = pagadoAcumulado + montoAbonoNum
      if (nuevoTotalPagado >= egreso.monto) {
        const { error: statusError } = await supabase
          .from('egresos')
          .update({ estado: 'Pagado', updated_at: new Date().toISOString() })
          .eq('id', egreso.id)
        
        if (statusError) throw statusError
      }

      toast.success(nuevoTotalPagado >= egreso.monto ? 'Egreso liquidado por completo' : 'Abono registrado correctamente')
      mutate('api/expenses')
      mutate('api/dashboard-stats')
      onOpenChange(false)
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Error al procesar el pago'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Abonar Pago de Egreso</DialogTitle>
          <DialogDescription>
            Registra un pago para "{egreso.concepto}". Pendiente: S/ {pendiente.toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="montoAbono">Monto a abonar</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm text-muted-foreground font-semibold">S/</span>
              <Input
                id="montoAbono"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="pl-8"
                value={montoAbono}
                onChange={(e) => setMontoAbono(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            {excedePendiente && (
              <p className="text-[10px] text-rose-500 font-medium">El monto excede el saldo pendiente.</p>
            )}
            {insufficient && montoAbonoNum > 0 && (
              <p className="text-[10px] text-rose-500 font-medium">No hay suficiente saldo en caja.</p>
            )}
          </div>

          <div className="rounded-lg bg-secondary/30 border border-border/50 p-4 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Saldo actual en caja</span>
              <span className="font-semibold text-emerald-600">S/ {saldoDisponible.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Este abono</span>
              <span className="font-semibold text-rose-500">- S/ {montoAbonoNum.toFixed(2)}</span>
            </div>
            <div className="h-px bg-border/50"></div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Saldo resultante</span>
              <span className={cn("font-bold text-lg", insufficient ? "text-rose-500" : "text-emerald-500")}>
                S/ {saldoDespues.toFixed(2)}
              </span>
            </div>
          </div>

          {insufficient && (
            <div className="flex items-start gap-3 rounded-lg bg-rose-500/10 border border-rose-500/30 p-3">
              <AlertTriangleIcon className="h-5 w-5 text-rose-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-rose-600 dark:text-rose-400">Operación restringida</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  No se permite realizar pagos que excedan el saldo actual de la caja. Por favor, recauda más fondos antes de continuar.
                </p>
              </div>
            </div>
          )}

          {!insufficient && montoAbonoNum > 0 && !excedePendiente && (
            <div className="flex items-center gap-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3">
              <CheckCircle2Icon className="h-5 w-5 text-emerald-500 shrink-0" />
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                {montoAbonoNum >= pendiente ? 'Este pago liquidará el 100% del gasto.' : 'Abono parcial listo para procesar.'}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={handlePay}
            disabled={isSubmitting || montoAbonoNum <= 0 || excedePendiente || insufficient}
            variant="default"
            className="gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2Icon className="h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <BanknoteIcon className="h-4 w-4" />
                Registrar Pago
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
