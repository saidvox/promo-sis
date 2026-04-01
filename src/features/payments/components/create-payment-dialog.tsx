import { useState } from 'react'
import { PlusIcon, Loader2Icon, CheckIcon, ChevronsUpDownIcon } from 'lucide-react'
import { useSWRConfig } from 'swr'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

import { usePaymentDependencies } from '../api/use-payment-dependencies'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

import type { Database } from '@/types/database.types'

type EstadoPago = Database['public']['Enums']['estado_pago']

interface CreatePaymentDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultPerfilId?: string
  defaultCuotaId?: string
  trigger?: React.ReactElement
}

export function CreatePaymentDialog({ 
  open: externalOpen, 
  onOpenChange: setExternalOpen, 
  defaultPerfilId = '', 
  defaultCuotaId = '',
  trigger 
}: CreatePaymentDialogProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = externalOpen !== undefined
  const open = isControlled ? externalOpen : internalOpen
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Data Fetching Paralelo
  const { data: deps, isLoading: depsLoading } = usePaymentDependencies()
  const { mutate } = useSWRConfig()

  // Form State
  const [openCombobox, setOpenCombobox] = useState(false)
  const [perfilId, setPerfilId] = useState(defaultPerfilId)
  const [cuotaId, setCuotaId] = useState(defaultCuotaId)
  const [montoPagado, setMontoPagado] = useState<number | ''>('')
  const [estado, setEstado] = useState<EstadoPago>('Pagado')
  const [urlVoucher, setUrlVoucher] = useState('')

  // Sync default values when they change externally if opening
  import('react').then(R => {
    R.useEffect(() => {
      if (open) {
        setPerfilId(defaultPerfilId)
        setCuotaId(defaultCuotaId)
        
        if (defaultCuotaId && deps?.cuotas) {
          const cuotaSeleccionada = deps.cuotas.find(c => c.id === defaultCuotaId)
          if (cuotaSeleccionada) setMontoPagado(cuotaSeleccionada.monto)
        }
      }
    }, [open, defaultPerfilId, defaultCuotaId, deps?.cuotas])
  })

  const resetForm = () => {
    setPerfilId(defaultPerfilId)
    setCuotaId(defaultCuotaId)
    setMontoPagado('')
    setEstado('Pagado')
    setUrlVoucher('')
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (isControlled && setExternalOpen) {
      setExternalOpen(newOpen)
    } else {
      setInternalOpen(newOpen)
    }
    
    if (!newOpen) {
      resetForm()
    }
  }

  const handleCuotaChange = (selectedCuotaId: string | null) => {
    if (!selectedCuotaId) {
      setCuotaId('')
      setMontoPagado('')
      return
    }
    setCuotaId(selectedCuotaId)
    // Auto-cálculo: fijar monto predeterminado de la cuota seleccionada
    const cuotaSeleccionada = deps?.cuotas.find(c => c.id === selectedCuotaId)
    if (cuotaSeleccionada) {
      setMontoPagado(cuotaSeleccionada.monto)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!perfilId || !cuotaId || montoPagado === '') {
      toast.error('Por favor, completa todos los campos obligatorios.')
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await supabase
        .from('pagos')
        .insert({
          perfil_id: perfilId,
          cuota_id: cuotaId,
          monto_pagado: Number(montoPagado),
          estado,
          url_voucher: urlVoucher || null,
        })

      if (error) {
        // Validación Anti-Dobles: Unique Constraint Violation Code en Postgres
        if (error.code === '23505') {
          throw new Error('Este alumno ya tiene registrado un pago para esta cuota específica. No se admiten cobros duplicados.')
        }
        throw error
      }

      toast.success('Pago registrado correctamente')
      mutate('api/payments')
      mutate('api/payments-matrix') // Evict both history and matrix cache
      handleOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || 'Error al registrar el pago')
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedPerfil = deps?.perfiles.find(p => p.id === perfilId)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? (
        <DialogTrigger render={trigger} />
      ) : !isControlled && (
        <DialogTrigger 
          render={<Button variant="default" />}
          className={cn(buttonVariants({ variant: 'default' }))}
        >
          <PlusIcon className="mr-2 h-4 w-4" />
          Registrar Pago
        </DialogTrigger>
      )}
      
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Registrar Nuevo Pago</DialogTitle>
          <DialogDescription>
            Selecciona el alumno, la cuota y verifica el monto. Evita registrar pagos duplicados para un mismo mes.
          </DialogDescription>
        </DialogHeader>

        {depsLoading ? (
          <div className="flex justify-center p-8">
            <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form id="payment-form" onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Alumno Participante</Label>
              <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                <PopoverTrigger
                  role="combobox"
                  aria-expanded={openCombobox}
                  className={cn(buttonVariants({ variant: 'outline' }), "w-full justify-between")}
                  disabled={isSubmitting}
                >
                  {selectedPerfil 
                    ? `${selectedPerfil.nombre_completo} - ${selectedPerfil.dni}` 
                    : "Buscar alumno (Nombre o DNI)..."}
                  <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Buscar alumno..." />
                    <CommandList>
                      <CommandEmpty>No se encontró ningún estudiante.</CommandEmpty>
                      <CommandGroup>
                        {deps?.perfiles.map((perfil) => (
                          <CommandItem
                            key={perfil.id}
                            value={`${perfil.nombre_completo} ${perfil.dni} ${perfil.codigo_u}`}
                            onSelect={() => {
                              setPerfilId(perfil.id)
                              setOpenCombobox(false)
                            }}
                          >
                            <CheckIcon
                              className={cn(
                                "mr-2 h-4 w-4",
                                perfilId === perfil.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {perfil.nombre_completo} ({perfil.dni})
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="cuota">Cuota Activa</Label>
                <Select
                  value={cuotaId}
                  onValueChange={handleCuotaChange}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="cuota">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {deps?.cuotas.map((cuota) => (
                      <SelectItem key={cuota.id} value={cuota.id}>
                        {cuota.mes_nombre} (S/ {cuota.monto})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="monto">Monto Pagado (S/)</Label>
                <Input
                  id="monto"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={montoPagado}
                  onChange={(e) => setMontoPagado(e.target.value ? Number(e.target.value) : '')}
                  disabled={isSubmitting || !cuotaId}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="estado">Estado del Pago</Label>
              <Select
                value={estado}
                onValueChange={(value) => setEstado(value as EstadoPago)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="estado">
                  <SelectValue placeholder="Estado..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pagado">Pagado</SelectItem>
                  <SelectItem value="Pendiente">Pendiente (Promesa)</SelectItem>
                  <SelectItem value="Rechazado">Rechazado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="voucher">
                Link del Voucher <span className="text-muted-foreground font-normal">(Opcional)</span>
              </Label>
              <Input
                id="voucher"
                placeholder="https://drive.google.com/..."
                value={urlVoucher}
                onChange={(e) => setUrlVoucher(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </form>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            form="payment-form" 
            disabled={isSubmitting || depsLoading}
          >
            {isSubmitting ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Registrando...
              </>
            ) : (
              'Guardar Pago'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
