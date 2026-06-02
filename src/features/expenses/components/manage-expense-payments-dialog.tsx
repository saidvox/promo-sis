import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { HistoryIcon, Loader2Icon, RotateCcwIcon, PencilIcon, XIcon, FileImageIcon, ExternalLinkIcon, PaperclipIcon } from 'lucide-react'
import { useSWRConfig } from 'swr'
import { supabase } from '@/lib/supabase/client'
import { getErrorMessage } from '@/lib/error-utils'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'

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
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly egreso: EgresoWithAbonos | null
}

export function ManageExpensePaymentsDialog({
  open,
  onOpenChange,
  egreso,
}: ManageExpensePaymentsDialogProps) {
  const [abonos, setAbonos] = useState<AbonoRow[]>([])
  const [abonoToRevert, setAbonoToRevert] = useState<AbonoRow | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingAbonoId, setEditingAbonoId] = useState<string | null>(null)
  const [attachingAbonoId, setAttachingAbonoId] = useState<string | null>(null)
  const [viewingAbonoId, setViewingAbonoId] = useState<string | null>(null)
  const { mutate } = useSWRConfig()

  useEffect(() => {
    if (!open || !egreso) {
      setAbonoToRevert(null)
      setEditingAbonoId(null)
      setAttachingAbonoId(null)
      setViewingAbonoId(null)
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

  const VOUCHER_BUCKET = 'expense-vouchers'
  const MAX_VOUCHER_SIZE = 5 * 1024 * 1024
  const ALLOWED_VOUCHER_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

  const sanitizeFileName = (fileName: string) =>
    fileName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 90)

  const validateVoucherFile = (file: File) => {
    if (!ALLOWED_VOUCHER_TYPES.has(file.type)) {
      return 'Solo se permiten imagenes JPG, PNG o WebP.'
    }
    if (file.size > MAX_VOUCHER_SIZE) {
      return 'La imagen no puede pesar mas de 5 MB.'
    }
    return null
  }

  const buildVoucherPath = (egresoId: string, abonoId: string, file: File) =>
    `${egresoId}/${abonoId}-${Date.now()}-${sanitizeFileName(file.name)}`

  const uploadVoucher = async (abonoId: string, file: File) => {
    const validationError = validateVoucherFile(file)
    if (validationError) {
      throw new Error(validationError)
    }

    const voucherPath = buildVoucherPath(egreso.id, abonoId, file)
    const { error } = await supabase.storage
      .from(VOUCHER_BUCKET)
      .upload(voucherPath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (error) throw error

    return {
      voucher_path: voucherPath,
      voucher_filename: file.name,
      voucher_mime_type: file.type,
      voucher_size: file.size,
      voucher_uploaded_at: new Date().toISOString(),
    }
  }

  const handleAttachVoucher = async (abono: AbonoRow, file: File | null) => {
    if (!file) return

    setAttachingAbonoId(abono.id)
    let uploadedVoucherPath: string | null = null
    try {
      const voucherData = await uploadVoucher(abono.id, file)
      uploadedVoucherPath = voucherData.voucher_path
      
      const { error: updateError } = await supabase
        .from('abonos_egresos')
        .update(voucherData)
        .eq('id', abono.id)

      if (updateError) throw updateError
      uploadedVoucherPath = null

      if (abono.voucher_path) {
        await supabase.storage.from(VOUCHER_BUCKET).remove([abono.voucher_path])
      }

      toast.success('Comprobante adjuntado correctamente')
      
      setAbonos((current) =>
        current.map((item) =>
          item.id === abono.id
            ? { ...item, ...voucherData }
            : item
        )
      )

      mutate('api/expenses')
    } catch (error: any) {
      if (uploadedVoucherPath) {
        await supabase.storage.from(VOUCHER_BUCKET).remove([uploadedVoucherPath])
      }
      toast.error(error.message || 'No se pudo adjuntar el comprobante')
    } finally {
      setAttachingAbonoId(null)
    }
  }

  const handleOpenVoucher = async (abono: AbonoRow) => {
    if (!abono.voucher_path) return

    setViewingAbonoId(abono.id)
    try {
      const { data, error } = await supabase.storage
        .from(VOUCHER_BUCKET)
        .createSignedUrl(abono.voucher_path, 60)

      if (error) throw error
      globalThis.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (error: any) {
      toast.error(error.message || 'No se pudo abrir el comprobante')
    } finally {
      setViewingAbonoId(null)
    }
  }

  const handleUpdateAbonoDate = async (abonoId: string, newDateStr: string) => {
    if (!newDateStr) return
    try {
      const abonoObj = abonos.find(a => a.id === abonoId)
      if (!abonoObj) return

      const originalDate = new Date(abonoObj.fecha_pago)
      const timeString = `${String(originalDate.getHours()).padStart(2, '0')}:${String(originalDate.getMinutes()).padStart(2, '0')}:${String(originalDate.getSeconds()).padStart(2, '0')}`
      const localDateTimeStr = `${newDateStr}T${timeString}`
      const updatedFechaPago = new Date(localDateTimeStr).toISOString()

      const { error } = await supabase
        .from('abonos_egresos')
        .update({ fecha_pago: updatedFechaPago })
        .eq('id', abonoId)

      if (error) throw error
      toast.success('Fecha de pago actualizada')
      
      setAbonos((current) =>
        current.map((item) =>
          item.id === abonoId
            ? { ...item, fecha_pago: updatedFechaPago }
            : item
        ).sort((a, b) => new Date(b.fecha_pago).getTime() - new Date(a.fecha_pago).getTime())
      )

      mutate('api/expenses')
    } catch (error: any) {
      toast.error(error.message || 'No se pudo actualizar la fecha')
    }
  }
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

      const totalAbonadoPostReversion = totalAbonado - abonoToRevert.monto_abono
      const nextStatus = totalAbonadoPostReversion >= egreso.monto ? 'Pagado' : 'Pendiente'
      const { error: updateError } = await supabase
        .from('egresos')
        .update({
          estado: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', egreso.id)

      if (updateError) throw updateError

      if (abonoToRevert.voucher_path) {
        await supabase.storage.from(VOUCHER_BUCKET).remove([abonoToRevert.voucher_path])
      }

      setAbonos((current) => current.filter((abono) => abono.id !== abonoToRevert.id))
      setAbonoToRevert(null)

      toast.success(
        totalAbonadoPostReversion > 0
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
              <div className="max-h-[320px] space-y-3 overflow-y-auto pr-1">
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
                          {abono.voucher_path && (
                            <Badge
                              variant="outline"
                              className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 gap-1"
                            >
                              <FileImageIcon className="h-3 w-3" />
                              Voucher
                            </Badge>
                          )}
                        </div>
                        {editingAbonoId === abono.id ? (
                          <div className="flex items-center gap-2 mt-1">
                            <DatePicker
                              date={format(new Date(abono.fecha_pago), "yyyy-MM-dd")}
                              onChange={(newDate) => {
                                if (newDate) {
                                  void handleUpdateAbonoDate(abono.id, newDate)
                                }
                                setEditingAbonoId(null)
                              }}
                              allowClear={false}
                              className="h-8 text-xs max-w-[150px]"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              onClick={() => setEditingAbonoId(null)}
                            >
                              <XIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 mt-1 group/date">
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(abono.fecha_pago), "d MMM yyyy 'a las' HH:mm", {
                                locale: es,
                              })}
                            </p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 opacity-0 group-hover/date:opacity-100 transition-opacity"
                              onClick={() => setEditingAbonoId(abono.id)}
                              title="Editar fecha de pago"
                            >
                              <PencilIcon className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </div>
                        )}
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

                    <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/40 pt-2.5">
                      <div className="flex items-center gap-2 w-full">
                        {abono.voucher_path ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1"
                            onClick={() => handleOpenVoucher(abono)}
                            disabled={viewingAbonoId === abono.id}
                          >
                            {viewingAbonoId === abono.id ? (
                              <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <ExternalLinkIcon className="h-3.5 w-3.5" />
                            )}
                            Ver Comprobante
                          </Button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">Sin comprobante</span>
                        )}

                        <Label
                          htmlFor={`voucher-${abono.id}`}
                          className={cn(
                            'inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground',
                            attachingAbonoId === abono.id && 'pointer-events-none opacity-60'
                          )}
                        >
                          {attachingAbonoId === abono.id ? (
                            <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <PaperclipIcon className="h-3.5 w-3.5" />
                          )}
                          {abono.voucher_path ? 'Cambiar' : 'Adjuntar'}
                        </Label>
                        <Input
                          id={`voucher-${abono.id}`}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          disabled={attachingAbonoId === abono.id}
                          onChange={(event) => {
                            void handleAttachVoucher(abono, event.target.files?.[0] ?? null)
                            event.target.value = ''
                          }}
                        />
                      </div>
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
