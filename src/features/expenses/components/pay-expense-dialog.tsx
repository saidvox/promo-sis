import { useState } from 'react'
import { Loader2Icon, AlertTriangleIcon, CheckCircle2Icon } from 'lucide-react'
import { useSWRConfig } from 'swr'
import { supabase } from '@/lib/supabase/client'
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

import type { EgresoRow } from '../api/use-expenses'

interface PayExpenseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  egreso: EgresoRow | null
  saldoDisponible: number
}

export function PayExpenseDialog({ open, onOpenChange, egreso, saldoDisponible }: PayExpenseDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { mutate } = useSWRConfig()

  if (!egreso) return null

  const saldoDespues = saldoDisponible - egreso.monto
  const insufficient = saldoDespues < 0

  const handlePay = async () => {
    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('egresos')
        .update({ estado: 'Pagado', updated_at: new Date().toISOString() })
        .eq('id', egreso.id)

      if (error) throw error

      toast.success('Egreso pagado exitosamente')
      mutate('api/expenses')
      mutate('api/dashboard-stats')
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || 'Error al procesar el pago')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Confirmar Pago de Egreso</DialogTitle>
          <DialogDescription>
            Estás a punto de ejecutar el pago de "{egreso.concepto}".
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Resumen Financiero */}
          <div className="rounded-lg bg-secondary/30 border border-border/50 p-4 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Saldo actual</span>
              <span className="font-semibold">S/ {saldoDisponible.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Monto del egreso</span>
              <span className="font-semibold text-rose-500">- S/ {egreso.monto.toFixed(2)}</span>
            </div>
            <div className="h-px bg-border/50"></div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Saldo resultante</span>
              <span className={cn("font-bold text-lg", insufficient ? "text-rose-500" : "text-emerald-500")}>
                S/ {saldoDespues.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Advertencia si no alcanza */}
          {insufficient && (
            <div className="flex items-start gap-3 rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
              <AlertTriangleIcon className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Saldo insuficiente</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  El saldo quedará en negativo. Puedes continuar si así lo deseas, pero considera recaudar más antes de ejecutar.
                </p>
              </div>
            </div>
          )}

          {!insufficient && (
            <div className="flex items-center gap-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3">
              <CheckCircle2Icon className="h-5 w-5 text-emerald-500 shrink-0" />
              <p className="text-sm text-emerald-600 dark:text-emerald-400">El saldo es suficiente para cubrir este egreso.</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={handlePay}
            disabled={isSubmitting}
            variant={insufficient ? "destructive" : "default"}
          >
            {isSubmitting ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              insufficient ? 'Pagar de todas formas' : 'Confirmar Pago'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
