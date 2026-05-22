import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale/es'
import { ExternalLinkIcon, FileImageIcon, HistoryIcon, Loader2Icon, PaperclipIcon, WalletIcon } from 'lucide-react'
import { useSWRConfig } from 'swr'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'


import type { Database } from '@/types/database.types'
import type { PaymentMovement } from '../api/use-payments-matrix'

type PerfilRow = Pick<Database['public']['Tables']['perfiles']['Row'], 'id' | 'nombre_completo' | 'dni' | 'rol'>
type CuotaRow = Pick<Database['public']['Tables']['config_cuotas']['Row'], 'id' | 'mes_nombre' | 'monto' | 'fecha_vencimiento'>
type PagoRow = Database['public']['Tables']['pagos']['Row']
type MovementInsert = Database['public']['Tables']['pago_movimientos']['Insert']

interface CreatePaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  perfil: PerfilRow | null
  cuota: CuotaRow | null
  pagoExistente?: PagoRow
  movements?: PaymentMovement[]
}

const VOUCHER_BUCKET = 'payment-vouchers'
const MAX_VOUCHER_SIZE = 5 * 1024 * 1024
const ALLOWED_VOUCHER_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const sanitizeFileName = (fileName: string) =>
  fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 90)

const validateVoucherFile = (file: File) => {
  if (!ALLOWED_VOUCHER_TYPES.includes(file.type)) {
    return 'Solo se permiten imagenes JPG, PNG o WebP.'
  }

  if (file.size > MAX_VOUCHER_SIZE) {
    return 'La imagen no puede pesar mas de 5 MB.'
  }

  return null
}

const buildVoucherPath = (perfilId: string, cuotaId: string, movementId: string, file: File) =>
  `${perfilId}/${cuotaId}/${movementId}-${Date.now()}-${sanitizeFileName(file.name)}`

export function CreatePaymentDialog({ 
  open, 
  onOpenChange, 
  perfil, 
  cuota, 
  pagoExistente,
  movements = [],
}: CreatePaymentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [attachingMovementId, setAttachingMovementId] = useState<string | null>(null)
  const [viewingMovementId, setViewingMovementId] = useState<string | null>(null)
  const { mutate } = useSWRConfig()

  const [montoAbonar, setMontoAbonar] = useState<number | ''>('')
  const [voucherFile, setVoucherFile] = useState<File | null>(null)

  useEffect(() => {
    if (open) {
      setMontoAbonar('')
      setVoucherFile(null)
      setAttachingMovementId(null)
      setViewingMovementId(null)
    }
  }, [open])

  if (!perfil || !cuota) return null

  // Mathematic states
  const totalPagado = pagoExistente?.monto_pagado || 0
  const meta = cuota.monto
  const deudaRestante = Math.max(0, meta - totalPagado)
  const isFullyPaid = totalPagado >= meta
  const sortedMovements = [...movements].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  
  const percentage = Math.min(100, Math.round((totalPagado / meta) * 100))

  const refreshPaymentData = () => {
    mutate('api/payments-matrix')
    mutate('api/dashboard-stats')
    mutate('api/expenses')
  }

  const uploadVoucher = async (movementId: string, file: File) => {
    const validationError = validateVoucherFile(file)
    if (validationError) {
      throw new Error(validationError)
    }

    const voucherPath = buildVoucherPath(perfil.id, cuota.id, movementId, file)
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

  const insertMovement = async (movement: MovementInsert) => {
    const { data, error } = await supabase
      .from('pago_movimientos')
      .insert(movement)
      .select()
      .single()

    if (error) throw error
    return data
  }

  const updateMovementVoucher = async (movementId: string, file: File, previousPath?: string | null) => {
    const voucherData = await uploadVoucher(movementId, file)
    const { error } = await supabase
      .from('pago_movimientos')
      .update(voucherData)
      .eq('id', movementId)

    if (error) throw error

    if (previousPath) {
      await supabase.storage.from(VOUCHER_BUCKET).remove([previousPath])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (montoAbonar === '' || Number(montoAbonar) <= 0) {
      toast.error('Ingresa un monto válido a abonar.')
      return
    }

    const incremento = Number(montoAbonar)
    
    if (incremento > deudaRestante) {
      toast.error(`El abono no puede ser mayor a la deuda restante (S/ ${deudaRestante.toFixed(2)})`)
      return
    }

    const nuevoTotal = totalPagado + incremento
    // Estado eval: si el nuevo total llega a la cuota, es 'Pagado', sino 'Pendiente'
    const nuevoEstado = nuevoTotal >= meta ? 'Pagado' : 'Pendiente'

    setIsSubmitting(true)

    try {
      let paymentId = pagoExistente?.id

      if (pagoExistente) {
        // Upsert / Update
        const { error } = await supabase
          .from('pagos')
          .update({
            monto_pagado: nuevoTotal,
            estado: nuevoEstado,
            updated_at: new Date().toISOString()
          })
          .eq('id', pagoExistente.id)

        if (error) throw error
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('pagos')
          .insert({
            perfil_id: perfil.id,
            cuota_id: cuota.id,
            monto_pagado: nuevoTotal,
            estado: nuevoEstado
          })
          .select()
          .single()

        if (error) throw error
        paymentId = data.id
      }

      if (paymentId) {
        const movementId = crypto.randomUUID()
        const voucherData = voucherFile ? await uploadVoucher(movementId, voucherFile) : {}

        await insertMovement({
          id: movementId,
          pago_id: paymentId,
          perfil_id: perfil.id,
          cuota_id: cuota.id,
          origen: 'manual',
          monto: incremento,
          nota: 'Abono manual registrado desde matriz de pagos',
          ...voucherData,
        })
      }

      toast.success('Abono registrado correctamente')
      refreshPaymentData()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || 'Error al registrar el abono')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Prellenado rápido sugerido (rellena la deuda que falta)
  const suggestFullPayment = () => {
    setMontoAbonar(deudaRestante)
  }

  const handleVoucherSelection = (file: File | null) => {
    if (!file) {
      setVoucherFile(null)
      return
    }

    const validationError = validateVoucherFile(file)
    if (validationError) {
      toast.error(validationError)
      return
    }

    setVoucherFile(file)
  }

  const handleAttachVoucher = async (movement: PaymentMovement, file: File | null) => {
    if (!file) return

    setAttachingMovementId(movement.id)
    try {
      await updateMovementVoucher(movement.id, file, movement.voucher_path)
      toast.success('Comprobante adjuntado correctamente')
      refreshPaymentData()
    } catch (error: any) {
      toast.error(error.message || 'No se pudo adjuntar el comprobante')
    } finally {
      setAttachingMovementId(null)
    }
  }

  const handleAttachLegacyVoucher = async (file: File | null) => {
    if (!file || !pagoExistente) return

    const movementId = crypto.randomUUID()
    setAttachingMovementId('legacy')

    try {
      const voucherData = await uploadVoucher(movementId, file)
      await insertMovement({
        id: movementId,
        pago_id: pagoExistente.id,
        perfil_id: perfil.id,
        cuota_id: cuota.id,
        origen: 'manual',
        monto: totalPagado,
        nota: 'Pago registrado previamente',
        ...voucherData,
      })

      toast.success('Comprobante adjuntado al pago existente')
      refreshPaymentData()
    } catch (error: any) {
      toast.error(error.message || 'No se pudo adjuntar el comprobante')
    } finally {
      setAttachingMovementId(null)
    }
  }

  const handleOpenVoucher = async (movement: PaymentMovement) => {
    if (!movement.voucher_path) return

    setViewingMovementId(movement.id)
    try {
      const { data, error } = await supabase.storage
        .from(VOUCHER_BUCKET)
        .createSignedUrl(movement.voucher_path, 60)

      if (error) throw error
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (error: any) {
      toast.error(error.message || 'No se pudo abrir el comprobante')
    } finally {
      setViewingMovementId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Registrar Abono a {cuota.mes_nombre}</DialogTitle>
          <DialogDescription>
            Agregando fondos a la cuenta de {perfil.nombre_completo}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-4">
          <div className="rounded-lg bg-secondary/30 p-4 space-y-3 border border-border/50">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Progreso de la cuota</span>
              <span className="font-semibold">{percentage}%</span>
            </div>
            <div className="h-2 w-full bg-secondary overflow-hidden rounded-full">
              <div 
                className="h-full bg-primary transition-all duration-500 ease-in-out" 
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs font-medium">
              <div className="flex flex-col">
                <span className="text-muted-foreground">Metálica: S/ {meta.toFixed(2)}</span>
                <span className="text-emerald-500">Pagado: S/ {totalPagado.toFixed(2)}</span>
              </div>
              <div className="flex flex-col text-right">
                <span className={cn(deudaRestante > 0 ? "text-rose-500" : "text-muted-foreground opacity-50")}>
                  Deuda Restante: S/ {deudaRestante.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-background/60">
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <div className="flex items-center gap-2">
                <HistoryIcon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold">Historial de abonos</p>
                  <p className="text-xs text-muted-foreground">Cada comprobante queda asociado a su abono.</p>
                </div>
              </div>
              <Badge variant="outline">{sortedMovements.length}</Badge>
            </div>

            <div className="divide-y divide-border/60">
              {sortedMovements.map((movement) => {
                const hasVoucher = Boolean(movement.voucher_path)
                const isAttaching = attachingMovementId === movement.id
                const isViewing = viewingMovementId === movement.id

                return (
                  <div key={movement.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">S/ {Number(movement.monto).toFixed(2)}</span>
                        <Badge variant={movement.origen === 'manual' ? 'secondary' : 'outline'}>
                          {movement.origen === 'beneficio_actividad' ? 'Beneficio' : 'Manual'}
                        </Badge>
                        {hasVoucher && (
                          <Badge variant="outline" className="gap-1 text-emerald-600">
                            <FileImageIcon className="h-3 w-3" />
                            Voucher
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {format(new Date(movement.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                      </p>
                      {movement.nota && (
                        <p className="mt-1 truncate text-xs text-muted-foreground">{movement.nota}</p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {hasVoucher && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenVoucher(movement)}
                          disabled={isViewing}
                        >
                          {isViewing ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <ExternalLinkIcon className="h-3.5 w-3.5" />}
                          Ver
                        </Button>
                      )}
                      <Label
                        htmlFor={`voucher-${movement.id}`}
                        className={cn(
                          'inline-flex h-8 cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-xs font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground',
                          isAttaching && 'pointer-events-none opacity-60'
                        )}
                      >
                        {isAttaching ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <PaperclipIcon className="h-3.5 w-3.5" />}
                        {hasVoucher ? 'Cambiar' : 'Adjuntar'}
                      </Label>
                      <Input
                        id={`voucher-${movement.id}`}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        disabled={isAttaching}
                        onChange={(event) => {
                          void handleAttachVoucher(movement, event.target.files?.[0] ?? null)
                          event.target.value = ''
                        }}
                      />
                    </div>
                  </div>
                )
              })}

              {sortedMovements.length === 0 && (
                <div className="px-4 py-5 text-sm text-muted-foreground">
                  Aun no hay movimientos detallados para esta cuota.
                </div>
              )}
            </div>
          </div>

          <form id="abono-form" onSubmit={handleSubmit} className="grid gap-4 pt-2">
            {!isFullyPaid ? (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="monto">Monto a abonar AHORA (S/)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="monto"
                      type="number"
                      step="0.01"
                      min="0.1"
                      className={cn(
                        "text-lg font-bold",
                        Number(montoAbonar) > deudaRestante && "border-rose-500 ring-rose-500/20 text-rose-500"
                      )}
                      placeholder="0.00"
                      value={montoAbonar}
                      onChange={(e) => setMontoAbonar(e.target.value ? Number(e.target.value) : '')}
                      disabled={isSubmitting}
                    />
                    <Button 
                      type="button" 
                      variant="secondary" 
                      onClick={suggestFullPayment}
                      disabled={isSubmitting || deudaRestante <= 0}
                    >
                      Restante
                    </Button>
                  </div>
                  {Number(montoAbonar) > deudaRestante && (
                    <p className="text-[10px] text-rose-500 font-medium">No puedes abonar más de la deuda restante.</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="voucher-file">Comprobante opcional</Label>
                  <Input
                    id="voucher-file"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => handleVoucherSelection(event.target.files?.[0] ?? null)}
                    disabled={isSubmitting}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    JPG, PNG o WebP hasta 5 MB. {voucherFile ? `Seleccionado: ${voucherFile.name}` : 'Puedes registrar el abono sin imagen.'}
                  </p>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400">
                <WalletIcon className="h-10 w-10 mb-2 opacity-80" />
                <p className="font-semibold text-center">Cuota Completada</p>
                <p className="text-xs text-center mt-1 opacity-80">El sistema ha validado que ya no existen deudas para este mes.</p>
                {sortedMovements.length === 0 && pagoExistente && (
                  <div className="mt-4 flex flex-col items-center gap-2">
                    <Label
                      htmlFor="legacy-voucher-file"
                      className={cn(
                        'inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90',
                        attachingMovementId === 'legacy' && 'pointer-events-none opacity-60'
                      )}
                    >
                      {attachingMovementId === 'legacy'
                        ? <Loader2Icon className="h-4 w-4 animate-spin" />
                        : <PaperclipIcon className="h-4 w-4" />}
                      Adjuntar comprobante
                    </Label>
                    <Input
                      id="legacy-voucher-file"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(event) => {
                        void handleAttachLegacyVoucher(event.target.files?.[0] ?? null)
                        event.target.value = ''
                      }}
                    />
                    <p className="max-w-xs text-center text-[10px] text-emerald-700/80 dark:text-emerald-300/80">
                      Se creara un movimiento historico por S/ {totalPagado.toFixed(2)} sin cambiar el monto pagado.
                    </p>
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {isFullyPaid ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!isFullyPaid && (
            <Button 
              type="submit" 
              form="abono-form" 
              disabled={isSubmitting || !montoAbonar || Number(montoAbonar) <= 0 || Number(montoAbonar) > deudaRestante}
            >
              {isSubmitting ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                'Procesar Abono'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
