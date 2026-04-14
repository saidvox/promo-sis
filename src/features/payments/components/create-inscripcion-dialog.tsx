import { useState } from 'react'
import { PlusIcon, Loader2Icon, CheckIcon, ChevronsUpDownIcon } from 'lucide-react'
import { useSWRConfig } from 'swr'
import { supabase } from '@/lib/supabase/client'
import { getErrorMessage } from '@/lib/error-utils'
import { useStudents, type Perfil } from '@/features/students/api/use-students'
import { useInscripciones } from '../api/use-inscripciones'
import { getRoleColor } from '@/features/students/utils/get-role-color'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function CreateInscripcionDialog({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { mutate } = useSWRConfig()

  const { data: studentsGroup, isLoading: studentsLoading } = useStudents()
  const { data: inscripciones, isLoading: inscripcionesLoading } = useInscripciones()

  const [openCombobox, setOpenCombobox] = useState(false)
  const [perfilId, setPerfilId] = useState('')
  const [metodoPago, setMetodoPago] = useState('Efectivo')

  const resetForm = () => {
    setPerfilId('')
    setMetodoPago('Efectivo')
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      resetForm()
    }
  }

  const enrolledIds = new Set(inscripciones?.map((inscripcion) => inscripcion.perfil_id) ?? [])
  const allStudents: Perfil[] = studentsGroup?.all ?? []
  const availableStudents = allStudents.filter((student) => !enrolledIds.has(student.id))
  const selectedStudent = availableStudents.find((student) => student.id === perfilId)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!perfilId) {
      toast.error('Debes seleccionar un estudiante')
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await supabase
        .from('inscripciones')
        .insert({
          perfil_id: perfilId,
          monto: 100.0,
          metodo_pago: metodoPago,
        })

      if (error) throw error

      toast.success('Inscripción registrada correctamente', {
        description: 'El alumno ha sido desbloqueado en la Sabana de Pagos.',
      })

      mutate('api/inscripciones')
      mutate('api/payments-matrix')
      mutate('api/students')

      handleOpenChange(false)
    } catch (error: unknown) {
      console.error('Error insertando inscripción:', error)
      toast.error('Error al registrar inscripción.', {
        description: getErrorMessage(error, 'No se pudo registrar la inscripción.'),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLoading = studentsLoading || inscripcionesLoading

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant="default"
            className={cn(
              'gap-2 bg-indigo-600 text-white shadow-md hover:bg-indigo-700',
              className
            )}
          >
            <PlusIcon className="h-4 w-4" />
            <span>Registrar Inscripción</span>
          </Button>
        }
      />

      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Nueva Inscripción</DialogTitle>
            <DialogDescription>
              Habilita a un nuevo estudiante en el sistema de pagos cobrando la cuota de pre-ingreso.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="perfil">Alumno (No Inscrito)</Label>
              <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      role="combobox"
                      id="perfil"
                      aria-expanded={openCombobox}
                      className="w-full justify-between font-normal"
                      disabled={isLoading || isSubmitting}
                    >
                      {isLoading ? (
                        <span className="flex items-center text-muted-foreground">
                          <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                          Cargando...
                        </span>
                      ) : selectedStudent ? (
                        <span className="truncate">{selectedStudent.nombre_completo}</span>
                      ) : (
                        <span className="text-muted-foreground">Escribe un nombre o DNI...</span>
                      )}
                      <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  }
                />
                <PopoverContent className="w-[375px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar por nombre o DNI..." />
                    <CommandList>
                      <CommandEmpty>No se encontraron alumnos pendientes.</CommandEmpty>
                      <CommandGroup>
                        {availableStudents.map((perfil) => (
                          <CommandItem
                            key={perfil.id}
                            value={`${perfil.nombre_completo} ${perfil.dni}`}
                            className="items-start gap-3 py-3"
                            onSelect={() => {
                              setPerfilId(perfil.id)
                              setOpenCombobox(false)
                            }}
                          >
                            <CheckIcon
                              className={cn(
                                'mt-1 h-4 w-4 shrink-0',
                                perfilId === perfil.id ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            <div className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-foreground">
                                {perfil.nombre_completo}
                              </span>
                              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="text-xs text-muted-foreground">
                                  DNI: {perfil.dni}
                                </span>
                                {perfil.rol !== 'Alumno' && (
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'h-5 border-transparent px-1.5 py-0 text-[10px] leading-none',
                                      getRoleColor(perfil.rol)
                                    )}
                                  >
                                    {perfil.rol}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="mt-2 grid gap-2">
              <Label htmlFor="monto">Monto Obligatorio</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-medium text-muted-foreground">
                  S/
                </span>
                <Input
                  id="monto"
                  type="text"
                  value="100.00"
                  disabled
                  className="bg-muted pl-8 text-lg font-semibold text-muted-foreground"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                El precio de inscripción esta congelado por configuración.
              </p>
            </div>

            <div className="mt-2 grid gap-2">
              <Label htmlFor="metodo_pago">Tipo de Operación</Label>
              <Select
                value={metodoPago}
                onValueChange={(value) => value && setMetodoPago(value)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="metodo_pago">
                  <SelectValue placeholder="Selecciona el metodo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Efectivo">Billetes / Efectivo</SelectItem>
                  <SelectItem value="Transferencia">Transferencia Bancaria</SelectItem>
                  <SelectItem value="Yape">Yape</SelectItem>
                  <SelectItem value="Plin">Plin</SelectItem>
                  <SelectItem value="Otro">Otro medio</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !perfilId}>
              {isSubmitting ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                'Finalizar Inscripción'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
