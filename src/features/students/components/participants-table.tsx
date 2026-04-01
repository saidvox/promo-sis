import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { useSWRConfig } from 'swr'
import { supabase } from '@/lib/supabase/client'
import { useStudents, type Perfil } from '@/features/students/api/use-students'
import { getRoleColor } from '@/features/students/utils/get-role-color'
import { CreateParticipantDialog } from './create-participant-dialog'
import { EditParticipantDialog } from './edit-participant-dialog'

export function ParticipantsTable() {
  const { data, isLoading, error } = useStudents()
  const { mutate } = useSWRConfig()
  const [activeTab, setActiveTab] = useState<string>('todos')

  if (error) {
    return (
      <div className="flex justify-center p-8 text-destructive">
        Error cargando participantes. Por favor intenta de nuevo.
      </div>
    )
  }

  // Derived current array based on activeTab
  const getFilteredData = () => {
    if (!data) return []
    if (activeTab === 'comite') return data.staff
    if (activeTab === 'alumnos') return data.students
    return data.all
  }
  
  const filteredData = getFilteredData()

  const handleDelete = async (participant: Perfil) => {
    const isConfirmed = window.confirm(`¿Estás seguro que deseas eliminar a ${participant.nombre_completo}?`)
    if (!isConfirmed) return

    try {
      const { error } = await supabase
        .from('perfiles')
        .delete()
        .eq('id', participant.id)

      if (error) throw error
      
      toast.success('Participante eliminado correctamente')
      mutate('api/students')
    } catch (err: any) {
      console.error('Error eliminando participante:', err)
      toast.error('Ocurrió un error al intentar eliminar.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[400px]">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="comite">Comité</TabsTrigger>
            <TabsTrigger value="alumnos">Alumnos</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <CreateParticipantDialog />
      </div>

      <div className="rounded-md border bg-card text-card-foreground shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">DNI</TableHead>
              <TableHead className="w-[150px]">Código U</TableHead>
              <TableHead>Nombre Completo</TableHead>
              <TableHead className="w-[120px]">Teléfono</TableHead>
              <TableHead className="text-right">Rol</TableHead>
              <TableHead className="w-[80px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Silent Skeletons for Vercel best practices (no jarring jumps)
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell className="text-right flex justify-end">
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell className="text-right flex justify-end">
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No hay participantes registrados en esta categoría.
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((participant) => (
                <TableRow key={participant.id}>
                  <TableCell className="font-medium text-muted-foreground">{participant.dni}</TableCell>
                  <TableCell>{participant.codigo_u}</TableCell>
                  <TableCell className="font-medium">{participant.nombre_completo}</TableCell>
                  <TableCell className="text-muted-foreground">{participant.telefono || '-'}</TableCell>
                  <TableCell className="text-right">
                    <Badge 
                      variant="outline"
                      className={getRoleColor(participant.rol)}
                    >
                      {participant.rol}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right flex items-center justify-end gap-1">
                    <EditParticipantDialog participant={participant} />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" 
                      aria-label="Eliminar participante"
                      onClick={() => handleDelete(participant)}
                    >
                      <Trash2Icon className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
