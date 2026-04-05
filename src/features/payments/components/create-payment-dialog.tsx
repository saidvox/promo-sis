import { useState, useEffect } from 'react'
import { Loader2Icon, WalletIcon } from 'lucide-react'
import { useSWRConfig } from 'swr'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

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

type PerfilRow = Pick<Database['public']['Tables']['perfiles']['Row'], 'id' | 'nombre_completo' | 'dni' | 'rol'>
type CuotaRow = Pick<Database['public']['Tables']['config_cuotas']['Row'], 'id' | 'mes_nombre' | 'monto' | 'fecha_vencimiento'>
type PagoRow = Database['public']['Tables']['pagos']['Row']

interface CreatePaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  perfil: PerfilRow | null
  cuota: CuotaRow | null
  pagoExistente?: PagoRow
}

export function CreatePaymentDialog({ 
  open, 
  onOpenChange, 
  perfil, 
  cuota, 
  pagoExistente 
}: CreatePaymentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { mutate } = useSWRConfig()

  const [montoAbonar, setMontoAbonar] = useState<number | ''>('')

  useEffect(() => {
    if (open) {
      setMontoAbonar('')
    }
  }, [open])

  if (!perfil || !cuota) return null

  // Mathematic states
  const totalPagado = pagoExistente?.monto_pagado || 0
  const meta = cuota.monto
  const deudaRestante = Math.max(0, meta - totalPagado)
  const isFullyPaid = totalPagado >= meta
  
  const percentage = Math.min(100, Math.round((totalPagado / meta) * 100))

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
        const { error } = await supabase
          .from('pagos')
          .insert({
            perfil_id: perfil.id,
            cuota_id: cuota.id,
            monto_pagado: nuevoTotal,
            estado: nuevoEstado
          })

        if (error) throw error
      }

      toast.success('Abono registrado correctamente')
      mutate('api/payments-matrix') // Forzar refetch local
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
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
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400">
                <WalletIcon className="h-10 w-10 mb-2 opacity-80" />
                <p className="font-semibold text-center">Cuota Completada</p>
                <p className="text-xs text-center mt-1 opacity-80">El sistema ha validado que ya no existen deudas para este mes.</p>
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
