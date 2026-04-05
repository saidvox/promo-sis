import { useState } from 'react'
import { PlusIcon, Loader2Icon } from 'lucide-react'
import { useSWRConfig } from 'swr'
import { supabase } from '@/lib/supabase/client'
import type { Role } from '@/types/role'
import { getRoleColor } from '@/features/students/utils/get-role-color'
import { cn } from '@/lib/utils'

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

export function CreateParticipantDialog({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { mutate } = useSWRConfig()

  // Form State
  const [dni, setDni] = useState('')
  const [codigoU, setCodigoU] = useState('')
  const [nombre, setNombre] = useState('')
  const [rol, setRol] = useState<Role>('Alumno')
  const [telefono, setTelefono] = useState('')

  const resetForm = () => {
    setDni('')
    setCodigoU('')
    setNombre('')
    setRol('Alumno')
    setTelefono('')
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      resetForm()
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

    if (!/^U\d{8}$/.test(codigoU)) {
      toast.error('El código debe tener el formato U + 8 números (Ej: U22205106)')
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await supabase
        .from('perfiles')
        .insert({
          id: crypto.randomUUID(),
          dni,
          codigo_u: codigoU,
          nombre_completo: nombre,
          rol,
          telefono: telefono || null,
        })

      if (error) throw error

      toast.success('Participante registrado exitosamente')
      
      // Vercel Best Practice: client-swr-dedup. Mutate the cache immediately to trigger a re-render
      await mutate('api/students')
      
      handleOpenChange(false)
    } catch (error: any) {
      console.error('Error insertando perfil:', error)
      toast.error(`Error: ${error.message || 'Error al registrar participante. Verifica DNI/Código.'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger className={cn(buttonVariants({ size: 'sm' }), "gap-2", className)}>
        <PlusIcon className="h-4 w-4" />
        <span>Nuevo Participante</span>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Registrar Participante</DialogTitle>
            <DialogDescription>
              Añade un nuevo miembro a la promoción.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="dni">DNI</Label>
              <Input
                id="dni"
                type="text"
                maxLength={8}
                placeholder="12345678"
                value={dni}
                onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
                disabled={isSubmitting}
                className="col-span-3"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="codigoU">Código Universitario</Label>
              <Input
                id="codigoU"
                placeholder="U12345678"
                maxLength={9}
                value={codigoU}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  if (val === '') {
                    setCodigoU('');
                    return;
                  }
                  // Si no empieza con U, se la ponemos. Luego solo permitimos números después
                  const formatted = val.startsWith('U') ? val : 'U' + val;
                  const uPart = formatted.slice(0, 1);
                  const digitsPart = formatted.slice(1).replace(/\D/g, '').slice(0, 8);
                  setCodigoU(uPart + digitsPart);
                }}
                disabled={isSubmitting}
                className="col-span-3"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="nombre">Nombre Completo</Label>
              <Input
                id="nombre"
                placeholder="Juan Pérez"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                disabled={isSubmitting}
                className="col-span-3"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="telefono">
                Teléfono <span className="text-muted-foreground font-normal">(Opcional)</span>
              </Label>
              <Input
                id="telefono"
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
              <Label htmlFor="rol">Rol</Label>
              <Select
                value={rol}
                onValueChange={(value) => setRol(value as Role)}
                disabled={isSubmitting}
              >
                <SelectTrigger>
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
                'Registrar'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
