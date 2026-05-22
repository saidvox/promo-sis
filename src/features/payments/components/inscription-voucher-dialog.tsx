import { useState } from 'react'
import { ExternalLinkIcon, FileImageIcon, Loader2Icon, PaperclipIcon } from 'lucide-react'
import { useSWRConfig } from 'swr'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
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
import type { Database } from '@/types/database.types'
import {
  openInscriptionVoucher,
  removeInscriptionVoucher,
  uploadInscriptionVoucher,
  validateInscriptionVoucherFile,
} from '../utils/inscription-vouchers'

type PerfilRow = Pick<Database['public']['Tables']['perfiles']['Row'], 'id' | 'nombre_completo' | 'codigo_u' | 'dni'>
type InscripcionRow = Pick<Database['public']['Tables']['inscripciones']['Row'], 'id' | 'perfil_id' | 'monto' | 'metodo_pago' | 'url_voucher' | 'created_at'>

interface InscriptionVoucherDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  perfil: PerfilRow | null
  inscripcion?: InscripcionRow
}

export function InscriptionVoucherDialog({ open, onOpenChange, perfil, inscripcion }: InscriptionVoucherDialogProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isViewing, setIsViewing] = useState(false)
  const { mutate } = useSWRConfig()

  if (!perfil || !inscripcion) return null

  const refreshData = () => {
    mutate('api/inscripciones')
    mutate('api/payments-matrix')
    mutate('api/students')
  }

  const handleUpload = async (file: File | null) => {
    if (!file) return

    const validationError = validateInscriptionVoucherFile(file)
    if (validationError) {
      toast.error(validationError)
      return
    }

    setIsUploading(true)
    let uploadedPath: string | null = null

    try {
      uploadedPath = await uploadInscriptionVoucher(perfil.id, inscripcion.id, file)

      const { error } = await supabase
        .from('inscripciones')
        .update({ url_voucher: uploadedPath })
        .eq('id', inscripcion.id)

      if (error) throw error

      await removeInscriptionVoucher(inscripcion.url_voucher)
      toast.success('Comprobante de inscripcion guardado')
      refreshData()
    } catch (error: any) {
      await removeInscriptionVoucher(uploadedPath)
      toast.error(error.message || 'No se pudo guardar el comprobante')
    } finally {
      setIsUploading(false)
    }
  }

  const handleOpenVoucher = async () => {
    if (!inscripcion.url_voucher) return

    setIsViewing(true)
    try {
      await openInscriptionVoucher(inscripcion.url_voucher)
    } catch (error: any) {
      toast.error(error.message || 'No se pudo abrir el comprobante')
    } finally {
      setIsViewing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Comprobante de inscripcion</DialogTitle>
          <DialogDescription>
            Revisa o adjunta la captura/voucher de la inscripcion de {perfil.nombre_completo}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-border/60 bg-secondary/20 p-4">
            <p className="text-sm font-semibold">{perfil.nombre_completo}</p>
            <p className="text-xs text-muted-foreground">{perfil.codigo_u || perfil.dni}</p>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Monto</p>
                <p className="font-semibold">S/ {Number(inscripcion.monto).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Metodo</p>
                <p className="font-semibold">{inscripcion.metodo_pago ?? 'Sin metodo'}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <FileImageIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {inscripcion.url_voucher ? 'Comprobante adjunto' : 'Sin comprobante'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG o WebP hasta 5 MB.
                  </p>
                </div>
              </div>

              {inscripcion.url_voucher && (
                <Button type="button" variant="outline" size="sm" onClick={handleOpenVoucher} disabled={isViewing}>
                  {isViewing ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <ExternalLinkIcon className="h-3.5 w-3.5" />}
                  Ver
                </Button>
              )}
            </div>

            <div className="mt-4">
              <Label
                htmlFor="attach-inscription-voucher"
                className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
              >
                {isUploading ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <PaperclipIcon className="h-4 w-4" />}
                {inscripcion.url_voucher ? 'Cambiar comprobante' : 'Adjuntar comprobante'}
              </Label>
              <Input
                id="attach-inscription-voucher"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={isUploading}
                onChange={(event) => {
                  void handleUpload(event.target.files?.[0] ?? null)
                  event.target.value = ''
                }}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
