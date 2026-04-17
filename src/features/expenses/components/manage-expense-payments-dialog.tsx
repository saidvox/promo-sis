import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { HistoryIcon, Loader2Icon, RotateCcwIcon } from 'lucide-react'
import { useSWRConfig } from 'swr'
import { supabase } from '@/lib/supabase/client'
import { getErrorMessage } from '@/lib/error-utils'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

import type { AbonoRow, EgresoWithAbonos } from '../api/use-expenses'

interface ManageExpensePaymentsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  egreso: EgresoWithAbonos | null
}

export function ManageExpensePaymentsDialog({
  open,
  onOpenChange,
  egreso,
}: ManageExpensePaymentsDialogProps) {
  const [abonos, setAbonos] = useState<AbonoRow[]>([])
  const [abonoToRevert, setAbonoToRevert] = useState<AbonoRow | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { mutate } = useSWRConfig()

  useEffect(() => {
    if (!open || !egreso) {
      setAbonoToRevert(null)
      return
    }

    const sortedAbonos = [...(egreso.abonos_egresos ?? [])].sort(
      (a, b) => new Date(b.fecha_pago).getTime() - new Date(a.fecha_pago).getTime()
    )

    setAbonos(sortedAbonos)
  }, [open, egreso])

  const totalAbonado = useMemo(
    () => abonos.reduce((acc, abono) => acc + abono.monto_abono, 0),
    [abonos]
  )

  if (!egreso) return null

  const pendiente = Math.max(egreso.monto - totalAbonado, 0)
  const restoredAmount = abonoToRevert?.monto_abono ?? 0
  const totalTrasReversion = Math.max(totalAbonado - restoredAmount, 0)
  const pendienteTrasReversion = Math.max(egreso.monto - totalTrasReversion, 0)

  const handleRevertPayment = async () => {
    if (!abonoToRevert) return

    setIsSubmitting(true)
    try {
      const { error: deleteError } = await supabase
        .from('abonos_egresos')
        .delete()
        .eq('id', abonoToRevert.id)

      if (deleteError) throw deleteError

      const nextStatus = totalTrasReversion >= egreso.monto ? 'Pagado' : 'Pendiente'
      const { error: updateError } = await supabase
        .from('egresos')
        .update({
          estado: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', egreso.id)

      if (updateError) throw updateError

      setAbonos((current) => current.filter((abono) => abono.id !== abonoToRevert.id))
      setAbonoToRevert(null)

      toast.success(
        totalTrasReversion > 0
          ? 'Abono revertido. El egreso quedo con saldo pendiente.'
          : 'Pago revertido. El egreso quedo nuevamente pendiente.'
      )

      mutate('api/expenses')
      mutate('api/dashboard-stats')
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Error al revertir el pago'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HistoryIcon className="h-4 w-4 text-muted-foreground" />
              Gestionar pagos del egreso
            </DialogTitle>
            <DialogDescription>
              Revisa los abonos de "{egreso.concepto}" y revierte solo el movimiento incorrecto. El
              saldo vuelve automaticamente a caja.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid gap-3 rounded-xl border border-border/50 bg-muted/30 p-4 sm:grid-cols-3">
              <div className="space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Abonado
                </p>
                <p className="text-lg font-semibold tabular-nums text-foreground">
                  S/ {totalAbonado.toFixed(2)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Pendiente
                </p>
                <p className="text-lg font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                  S/ {pendiente.toFixed(2)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Registros
                </p>
                <p className="text-lg font-semibold tabular-nums text-foreground">{abonos.length}</p>
              </div>
            </div>

            {abonos.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center">
                <p className="text-sm font-medium text-foreground">No quedan pagos registrados.</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Puedes cerrar esta ventana y volver a abonar el egreso cuando corresponda.
                </p>
              </div>
            ) : (
              <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                {abonos.map((abono, index) => (
                  <div
                    key={abono.id}
                    className="rounded-xl border border-border/60 bg-background px-3 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-foreground">
                            Abono {abonos.length - index}
                          </p>
                          {index === 0 && (
                            <Badge
                              variant="outline"
                              className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            >
                              Ultimo
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(abono.fecha_pago), "d MMM yyyy 'a las' HH:mm", {
                            locale: es,
                          })}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                          S/ {abono.monto_abono.toFixed(2)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">Salida registrada</p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
                      <div className="space-y-0.5">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          Si lo reviertes
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Regresan S/ {abono.monto_abono.toFixed(2)} a caja.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={cn(
                          'shrink-0 gap-1.5 border-rose-500/30 text-rose-600 hover:bg-rose-500/10 hover:text-rose-700',
                          isSubmitting && abonoToRevert?.id === abono.id && 'pointer-events-none'
                        )}
                        onClick={() => setAbonoToRevert(abono)}
                        disabled={isSubmitting}
                      >
                        <RotateCcwIcon className="h-3.5 w-3.5" />
                        Revertir
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={abonoToRevert !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !isSubmitting) setAbonoToRevert(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader className="items-start text-left">
            <AlertDialogTitle>Revertir este pago?</AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              Vas a devolver S/ {restoredAmount.toFixed(2)} al saldo disponible. El egreso quedara
              con S/ {pendienteTrasReversion.toFixed(2)} pendiente luego de la correccion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                handleRevertPayment()
              }}
              disabled={isSubmitting}
              className="gap-2 bg-rose-600 text-white hover:bg-rose-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                  Revirtiendo...
                </>
              ) : (
                <>
                  <RotateCcwIcon className="h-4 w-4" />
                  Si, revertir
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
