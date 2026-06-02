import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale/es'
import { ExternalLinkIcon, FileImageIcon, HistoryIcon, Loader2Icon, PaperclipIcon, WalletIcon, PencilIcon, XIcon, Trash2Icon } from 'lucide-react'
import { useSWRConfig } from 'swr'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { recordAuditEvent } from '@/features/audit/api/audit-events'
import { toAuditJson } from '@/features/audit/utils/audit-format'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/ui/date-picker'
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
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly perfil: PerfilRow | null
  readonly cuota: CuotaRow | null
  readonly pagoExistente?: PagoRow
  readonly movements?: PaymentMovement[]
}

const VOUCHER_BUCKET = 'payment-vouchers'
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
  const [fechaAbono, setFechaAbono] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'))
  const [editingMovementId, setEditingMovementId] = useState<string | null>(null)
  const [editingMovementDetailsId, setEditingMovementDetailsId] = useState<string | null>(null)
  const [editMonto, setEditMonto] = useState<number | ''>('')
  const [editNota, setEditNota] = useState<string>('')

  useEffect(() => {
    if (open) {
      setMontoAbonar('')
      setVoucherFile(null)
      setAttachingMovementId(null)
      setViewingMovementId(null)
      setFechaAbono(format(new Date(), 'yyyy-MM-dd'))
      setEditingMovementId(null)
      setEditingMovementDetailsId(null)
      setEditMonto('')
      setEditNota('')
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
    mutate('api/payments')
    mutate('api/payments-matrix')
    mutate('api/dashboard-stats')
    mutate('api/expenses')
    mutate((key) => Array.isArray(key) && String(key[0]).includes('audit'))
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

    if (error) {
      await supabase.storage.from(VOUCHER_BUCKET).remove([voucherData.voucher_path])
      throw error
    }

    if (previousPath) {
      await supabase.storage.from(VOUCHER_BUCKET).remove([previousPath])
    }

    await recordAuditEvent({
      action: 'payment.voucher_uploaded',
      entityType: 'pago_movimiento',
      entityId: movementId,
      summary: `Adjunto voucher de pago para ${perfil.nombre_completo} (${cuota.mes_nombre})`,
      metadata: {
        perfil_id: perfil.id,
        perfil_nombre: perfil.nombre_completo,
        cuota_id: cuota.id,
        cuota_mes: cuota.mes_nombre,
        previous_voucher_path: previousPath ?? null,
        voucher_path: voucherData.voucher_path,
      },
      afterData: toAuditJson(voucherData),
    })
  }

  const handleUpdateMovementDate = async (movementId: string, newDateStr: string) => {
    if (!newDateStr) return
    try {
      const movementObj = sortedMovements.find(m => m.id === movementId)
      if (!movementObj) return

      // Parse the original time to preserve it
      const originalDate = new Date(movementObj.created_at)
      const timeString = `${String(originalDate.getHours()).padStart(2, '0')}:${String(originalDate.getMinutes()).padStart(2, '0')}:${String(originalDate.getSeconds()).padStart(2, '0')}`
      const localDateTimeStr = `${newDateStr}T${timeString}`
      const updatedCreatedAt = new Date(localDateTimeStr).toISOString()

      const { error } = await supabase
        .from('pago_movimientos')
        .update({ created_at: updatedCreatedAt })
        .eq('id', movementId)

      if (error) throw error
      await recordAuditEvent({
        action: 'payment.date_updated',
        entityType: 'pago_movimiento',
        entityId: movementId,
        summary: `Actualizo la fecha de abono de ${perfil.nombre_completo} (${cuota.mes_nombre})`,
        metadata: {
          perfil_id: perfil.id,
          cuota_id: cuota.id,
          cuota_mes: cuota.mes_nombre,
        },
        beforeData: toAuditJson({ created_at: movementObj.created_at }),
        afterData: toAuditJson({ created_at: updatedCreatedAt }),
      })
      toast.success('Fecha de abono actualizada')
      refreshPaymentData()
    } catch (error: any) {
      toast.error(error.message || 'No se pudo actualizar la fecha')
    }
  }

  const handleDeleteMovement = async (movement: PaymentMovement) => {
    const confirmDelete = globalThis.confirm(`¿Estás seguro de que deseas eliminar este abono de S/ ${Number(movement.monto).toFixed(2)}?`)
    if (!confirmDelete) return

    setIsSubmitting(true)

    try {
      const { data: voucherPath, error: deleteError } = await supabase
        .rpc('eliminar_abono_manual', { p_movement_id: movement.id })

      if (deleteError) throw deleteError

      if (voucherPath) {
        await supabase.storage.from(VOUCHER_BUCKET).remove([voucherPath])
      }

      await recordAuditEvent({
        action: 'payment.manual_deleted',
        entityType: 'pago_movimiento',
        entityId: movement.id,
        summary: `Elimino abono S/ ${Number(movement.monto).toFixed(2)} de ${perfil.nombre_completo} (${cuota.mes_nombre})`,
        metadata: {
          perfil_id: perfil.id,
          cuota_id: cuota.id,
          cuota_mes: cuota.mes_nombre,
          monto: Number(movement.monto),
          voucher_path: voucherPath ?? movement.voucher_path ?? null,
        },
        beforeData: toAuditJson(movement),
      })

      toast.success('Abono eliminado correctamente')
      refreshPaymentData()
      setEditingMovementDetailsId(null)
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar el abono')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateMovementDetails = async (movement: PaymentMovement) => {
    if (editMonto === '' || Number(editMonto) <= 0) {
      toast.error('Ingresa un monto válido.')
      return
    }

    const nuevoMonto = Number(editMonto)
    const montoAnterior = Number(movement.monto)
    const diferencia = nuevoMonto - montoAnterior
    const nuevoTotal = totalPagado + diferencia

    if (nuevoTotal > meta) {
      toast.error(`El monto total del pago no puede superar la cuota de S/ ${meta.toFixed(2)} (Total actual: S/ ${nuevoTotal.toFixed(2)})`)
      return
    }

    setIsSubmitting(true)

    try {
      const { error: updateError } = await supabase
        .rpc('actualizar_abono_manual', {
          p_movement_id: movement.id,
          p_monto: nuevoMonto,
          p_nota: editNota,
        })

      if (updateError) throw updateError

      await recordAuditEvent({
        action: 'payment.manual_updated',
        entityType: 'pago_movimiento',
        entityId: movement.id,
        summary: `Edito abono de ${perfil.nombre_completo}: S/ ${montoAnterior.toFixed(2)} a S/ ${nuevoMonto.toFixed(2)}`,
        metadata: {
          perfil_id: perfil.id,
          cuota_id: cuota.id,
          cuota_mes: cuota.mes_nombre,
        },
        beforeData: toAuditJson({ monto: montoAnterior, nota: movement.nota }),
        afterData: toAuditJson({ monto: nuevoMonto, nota: editNota }),
      })

      toast.success('Abono actualizado correctamente')
      refreshPaymentData()
      setEditingMovementDetailsId(null)
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar el abono')
    } finally {
      setIsSubmitting(false)
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

    setIsSubmitting(true)
    let uploadedVoucherPath: string | null = null

    try {
      const movementId = crypto.randomUUID()
      const voucherData = voucherFile ? await uploadVoucher(movementId, voucherFile) : null
      uploadedVoucherPath = voucherData?.voucher_path ?? null

      const now = new Date()
      const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
      const localDateTimeStr = `${fechaAbono}T${timeString}`
      const customCreatedAt = new Date(localDateTimeStr).toISOString()

      const { error } = await supabase.rpc('registrar_abono_manual', {
        p_movement_id: movementId,
        p_perfil_id: perfil.id,
        p_cuota_id: cuota.id,
        p_monto: incremento,
        p_nota: 'Abono manual registrado desde matriz de pagos',
        p_created_at: customCreatedAt,
        p_voucher_path: voucherData?.voucher_path,
        p_voucher_filename: voucherData?.voucher_filename,
        p_voucher_mime_type: voucherData?.voucher_mime_type,
        p_voucher_size: voucherData?.voucher_size,
        p_voucher_uploaded_at: voucherData?.voucher_uploaded_at,
      })

      if (error) throw error
      uploadedVoucherPath = null

      await recordAuditEvent({
        action: 'payment.manual_created',
        entityType: 'pago_movimiento',
        entityId: movementId,
        summary: `Registro abono S/ ${incremento.toFixed(2)} para ${perfil.nombre_completo} (${cuota.mes_nombre})`,
        metadata: {
          pago_id: pagoExistente?.id ?? null,
          perfil_id: perfil.id,
          perfil_nombre: perfil.nombre_completo,
          cuota_id: cuota.id,
          cuota_mes: cuota.mes_nombre,
          monto: incremento,
          voucher: Boolean(voucherData),
        },
        afterData: toAuditJson({
          monto: incremento,
          created_at: customCreatedAt,
          voucher: voucherData,
        }),
      })

      toast.success('Abono registrado correctamente')
      refreshPaymentData()
      onOpenChange(false)
    } catch (error: any) {
      if (uploadedVoucherPath) {
        await supabase.storage.from(VOUCHER_BUCKET).remove([uploadedVoucherPath])
      }
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
    let uploadedVoucherPath: string | null = null

    try {
      const voucherData = await uploadVoucher(movementId, file)
      uploadedVoucherPath = voucherData.voucher_path
      await insertMovement({
        id: movementId,
        pago_id: pagoExistente.id,
        perfil_id: perfil.id,
        cuota_id: cuota.id,
        origen: 'manual',
        monto: totalPagado,
        nota: 'Pago registrado previamente',
        es_ajuste_historico: true,
        ...voucherData,
      })
      uploadedVoucherPath = null

      await recordAuditEvent({
        action: 'payment.legacy_voucher_uploaded',
        entityType: 'pago_movimiento',
        entityId: movementId,
        summary: `Adjunto voucher historico para ${perfil.nombre_completo} (${cuota.mes_nombre})`,
        metadata: {
          pago_id: pagoExistente.id,
          perfil_id: perfil.id,
          cuota_id: cuota.id,
          cuota_mes: cuota.mes_nombre,
          monto: totalPagado,
        },
        afterData: toAuditJson(voucherData),
      })

      toast.success('Comprobante adjuntado al pago existente')
      refreshPaymentData()
    } catch (error: any) {
      if (uploadedVoucherPath) {
        await supabase.storage.from(VOUCHER_BUCKET).remove([uploadedVoucherPath])
      }
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
      globalThis.open(data.signedUrl, '_blank', 'noopener,noreferrer')
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

                if (editingMovementDetailsId === movement.id) {
                  return (
                    <div key={movement.id} className="flex flex-col gap-3 px-4 py-3 bg-secondary/15">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div className="grid gap-1">
                          <Label htmlFor={`edit-monto-${movement.id}`} className="text-[10px] font-semibold text-muted-foreground uppercase">Monto (S/)</Label>
                          <Input
                            id={`edit-monto-${movement.id}`}
                            type="number"
                            step="0.01"
                            min="0.1"
                            value={editMonto}
                            onChange={(e) => setEditMonto(e.target.value ? Number(e.target.value) : '')}
                            className="h-8 text-xs font-bold"
                          />
                        </div>
                        <div className="grid gap-1">
                          <Label htmlFor={`edit-nota-${movement.id}`} className="text-[10px] font-semibold text-muted-foreground uppercase">Nota / Comentario</Label>
                          <Input
                            id={`edit-nota-${movement.id}`}
                            type="text"
                            value={editNota}
                            onChange={(e) => setEditNota(e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px]"
                          onClick={() => setEditingMovementDetailsId(null)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 text-[11px] bg-primary text-primary-foreground"
                          onClick={() => void handleUpdateMovementDetails(movement)}
                          disabled={editMonto === '' || Number(editMonto) <= 0}
                        >
                          Guardar Cambios
                        </Button>
                      </div>
                    </div>
                  )
                }

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
                      {editingMovementId === movement.id ? (
                        <div className="flex items-center gap-2 mt-1">
                          <DatePicker
                            date={format(new Date(movement.created_at), "yyyy-MM-dd")}
                            onChange={(newDate) => {
                              if (newDate) {
                                void handleUpdateMovementDate(movement.id, newDate)
                              }
                              setEditingMovementId(null)
                            }}
                            allowClear={false}
                            className="h-8 text-xs max-w-[150px]"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => setEditingMovementId(null)}
                          >
                            <XIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 mt-1 group/date">
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(movement.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                          </p>
                          {movement.origen === 'manual' && !movement.es_ajuste_historico && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 opacity-0 group-hover/date:opacity-100 transition-opacity"
                              onClick={() => setEditingMovementId(movement.id)}
                              title="Editar fecha"
                            >
                              <PencilIcon className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          )}
                        </div>
                      )}
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
                      {movement.origen === 'manual' && !movement.es_ajuste_historico && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setEditingMovementDetailsId(movement.id)
                              setEditMonto(Number(movement.monto))
                              setEditNota(movement.nota || '')
                            }}
                            title="Editar monto y nota"
                          >
                            <PencilIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 border-rose-200 hover:border-rose-300 hover:bg-rose-50 text-rose-500 hover:text-rose-600"
                            onClick={() => void handleDeleteMovement(movement)}
                            title="Eliminar abono"
                          >
                            <Trash2Icon className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
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
                  <Label htmlFor="fecha-abono">Fecha del abono</Label>
                  <DatePicker
                    id="fecha-abono"
                    date={fechaAbono}
                    onChange={(newDate) => setFechaAbono(newDate || format(new Date(), 'yyyy-MM-dd'))}
                    disabled={isSubmitting}
                    allowClear={false}
                  />
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
