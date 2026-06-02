import { useState, useEffect } from 'react'
import { Loader2Icon, AlertTriangleIcon, CheckCircle2Icon, BanknoteIcon } from 'lucide-react'
import { useSWRConfig } from 'swr'
import { supabase } from '@/lib/supabase/client'
import { getErrorMessage } from '@/lib/error-utils'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

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
import { DatePicker } from '@/components/ui/date-picker'

import type { EgresoWithAbonos } from '../api/use-expenses'

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

const buildVoucherPath = (egresoId: string, movementId: string, file: File) =>
  `${egresoId}/${movementId}-${Date.now()}-${sanitizeFileName(file.name)}`

interface PayExpenseDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly egreso: EgresoWithAbonos | null
  readonly saldoDisponible: number
}

export function PayExpenseDialog({ open, onOpenChange, egreso, saldoDisponible }: PayExpenseDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [montoAbono, setMontoAbono] = useState<string>('')
  const [fechaPago, setFechaPago] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'))
  const [voucherFile, setVoucherFile] = useState<File | null>(null)
  const { mutate } = useSWRConfig()

  const pagadoAcumulado = egreso?.abonos_egresos.reduce((acc, a) => acc + a.monto_abono, 0) ?? 0
  const pendiente = (egreso?.monto ?? 0) - pagadoAcumulado

  useEffect(() => {
    if (open && egreso) {
      setMontoAbono(pendiente.toString())
      setFechaPago(format(new Date(), 'yyyy-MM-dd'))
      setVoucherFile(null)
    }
  }, [open, egreso, pendiente])

  if (!egreso) return null

  const montoAbonoNum = Number.parseFloat(montoAbono) || 0
  const saldoDespues = saldoDisponible - montoAbonoNum
  const insufficient = saldoDespues < 0
  const excedePendiente = montoAbonoNum > pendiente

  const uploadVoucher = async (movementId: string, file: File) => {
    const validationError = validateVoucherFile(file)
    if (validationError) {
      throw new Error(validationError)
    }

    const voucherPath = buildVoucherPath(egreso.id, movementId, file)
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
    let uploadedVoucherPath: string | null = null
    let voucherPersisted = false
    try {
      const movementId = crypto.randomUUID()
      const voucherData = voucherFile ? await uploadVoucher(movementId, voucherFile) : null
      uploadedVoucherPath = voucherData?.voucher_path ?? null

      const now = new Date()
      const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
      const localDateTimeStr = `${fechaPago}T${timeString}`
      const customFechaPago = new Date(localDateTimeStr).toISOString()

      const abonoData = {
        id: movementId,
        egreso_id: egreso.id,
        monto_abono: montoAbonoNum,
        fecha_pago: customFechaPago,
        ...voucherData,
      }
      const { error: abonoError } = await supabase
        .from('abonos_egresos')
        .insert(abonoData)

      if (abonoError) throw abonoError
      voucherPersisted = true

      const nuevoTotalPagado = pagadoAcumulado + montoAbonoNum
      const nuevoEstado = nuevoTotalPagado >= egreso.monto ? 'Pagado' : 'Pendiente'
      const { error: statusError } = await supabase
        .from('egresos')
        .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
        .eq('id', egreso.id)

      if (statusError) throw statusError

      toast.success(nuevoTotalPagado >= egreso.monto ? 'Egreso liquidado por completo' : 'Abono registrado correctamente')
      mutate('api/expenses')
      mutate('api/dashboard-stats')
      onOpenChange(false)
    } catch (error: unknown) {
      if (uploadedVoucherPath && !voucherPersisted) {
        await supabase.storage.from(VOUCHER_BUCKET).remove([uploadedVoucherPath])
      }
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

          <div className="grid gap-2">
            <Label htmlFor="fecha-pago">Fecha de pago</Label>
            <DatePicker
              id="fecha-pago"
              date={fechaPago}
              onChange={(newDate) => setFechaPago(newDate || format(new Date(), 'yyyy-MM-dd'))}
              disabled={isSubmitting}
              allowClear={false}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="voucher-file">Comprobante de pago (opcional)</Label>
            <Input
              id="voucher-file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null
                if (file) {
                  const validationError = validateVoucherFile(file)
                  if (validationError) {
                    toast.error(validationError)
                    event.target.value = ''
                    setVoucherFile(null)
                  } else {
                    setVoucherFile(file)
                  }
                } else {
                  setVoucherFile(null)
                }
              }}
              disabled={isSubmitting}
            />
            <p className="text-[10px] text-muted-foreground">
              JPG, PNG o WebP hasta 5 MB. {voucherFile ? `Seleccionado: ${voucherFile.name}` : ''}
            </p>
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
