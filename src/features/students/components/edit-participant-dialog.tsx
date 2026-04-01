import { useState } from 'react'
import { PencilIcon, Loader2Icon } from 'lucide-react'
import { useSWRConfig } from 'swr'
import { supabase } from '@/lib/supabase/client'
import type { Role } from '@/types/role'
import type { Perfil } from '@/features/students/api/use-students'
import { getRoleColor } from '@/features/students/utils/get-role-color'

import { Button, buttonVariants } from '@/components/ui/button'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

interface EditParticipantDialogProps {
  participant: Perfil
}

export function EditParticipantDialog({ participant }: EditParticipantDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { mutate } = useSWRConfig()

  // Form State
  const [dni, setDni] = useState(participant.dni || '')
  const [codigoU, setCodigoU] = useState(participant.codigo_u || '')
  const [nombre, setNombre] = useState(participant.nombre_completo || '')
  const [rol, setRol] = useState<Role>((participant.rol as Role) || 'Alumno')
  const [telefono, setTelefono] = useState(participant.telefono || '')

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      // Option to reset form to original if cancelled
      setDni(participant.dni || '')
      setCodigoU(participant.codigo_u || '')
      setNombre(participant.nombre_completo || '')
      setRol((participant.rol as Role) || 'Alumno')
      setTelefono(participant.telefono || '')
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!dni || !codigoU || !nombre || !rol) {
      toast.error('Todos los campos son obligatorios')
      return
    }

    if (dni.length !== 8) {
      toast.error('El DNI debe tener exactamente 8 dígitos')
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await supabase
        .from('perfiles')
        .update({
          dni,
          codigo_u: codigoU,
          nombre_completo: nombre,
          rol,
          telefono: telefono || null,
        })
        .eq('id', participant.id)

      if (error) throw error

      toast.success('Información actualizada correctamente')
      
      // SWR Vercel dedup best practice
      await mutate('api/students')
      
      handleOpenChange(false)
    } catch (error: any) {
      console.error('Error actualizando perfil:', error)
      toast.error('No se pudieron guardar los cambios.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger className={buttonVariants({ variant: 'ghost', size: 'icon', className: 'h-8 w-8 hover:bg-muted' })} aria-label="Editar participante">
        <PencilIcon className="h-4 w-4" />
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Editar Participante</DialogTitle>
            <DialogDescription>
              Modifica los datos del usuario {participant.codigo_u}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor={`edit-dni-${participant.id}`}>DNI</Label>
              <Input
                id={`edit-dni-${participant.id}`}
                type="text"
                maxLength={8}
                value={dni}
                onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
                disabled={isSubmitting}
                className="col-span-3"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`edit-codigoU-${participant.id}`}>Código Universitario</Label>
              <Input
                id={`edit-codigoU-${participant.id}`}
                value={codigoU}
                onChange={(e) => setCodigoU(e.target.value)}
                disabled={isSubmitting}
                className="col-span-3"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`edit-nombre-${participant.id}`}>Nombre Completo</Label>
              <Input
                id={`edit-nombre-${participant.id}`}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                disabled={isSubmitting}
                className="col-span-3"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`edit-telefono-${participant.id}`}>
                Teléfono <span className="text-muted-foreground font-normal">(Opcional)</span>
              </Label>
              <Input
                id={`edit-telefono-${participant.id}`}
                placeholder="987654321"
                type="tel"
                maxLength={9}
                value={telefono}
                onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))}
                disabled={isSubmitting}
                className="col-span-3"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`edit-rol-${participant.id}`}>Rol</Label>
              <Select
                value={rol}
                onValueChange={(value) => setRol(value as Role)}
                disabled={isSubmitting}
              >
                <SelectTrigger id={`edit-rol-${participant.id}`}>
                  <SelectValue placeholder="Selecciona un rol">
                    {rol && (
                      <Badge variant="outline" className={getRoleColor(rol)}>
                        {rol}
                      </Badge>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Presidente">
                    <Badge variant="outline" className={getRoleColor('Presidente')}>Presidente</Badge>
                  </SelectItem>
                  <SelectItem value="Tesorero">
                    <Badge variant="outline" className={getRoleColor('Tesorero')}>Tesorero</Badge>
                  </SelectItem>
                  <SelectItem value="Sub Presidente">
                    <Badge variant="outline" className={getRoleColor('Sub Presidente')}>Sub Presidente</Badge>
                  </SelectItem>
                  <SelectItem value="Secretaria">
                    <Badge variant="outline" className={getRoleColor('Secretaria')}>Secretaria</Badge>
                  </SelectItem>
                  <SelectItem value="Logistica">
                    <Badge variant="outline" className={getRoleColor('Logistica')}>Logística</Badge>
                  </SelectItem>
                  <SelectItem value="Redes">
                    <Badge variant="outline" className={getRoleColor('Redes')}>Redes</Badge>
                  </SelectItem>
                  <SelectItem value="Alumno">
                    <Badge variant="outline" className={getRoleColor('Alumno')}>Alumno</Badge>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
