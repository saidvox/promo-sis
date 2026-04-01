import { useState, useCallback } from 'react'
import { Loader2Icon, ShieldAlertIcon, MoreHorizontalIcon, BanknoteIcon } from 'lucide-react'
import { usePaymentsMatrix, MESES_DEL_ANO } from '../api/use-payments-matrix'
import { PaymentMatrixCell } from './payment-matrix-cell'
import { CreatePaymentDialog } from './create-payment-dialog'
import { getRoleColor } from '@/features/students/utils/get-role-color'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

export function PaymentsMatrix() {
  const { data, isLoading, error } = usePaymentsMatrix()
  const [activeCell, setActiveCell] = useState<{ perfilId: string, cuotaId: string } | null>(null)

  const handleCellClick = useCallback((perfilId: string, cuotaId: string) => {
    setActiveCell({ perfilId, cuotaId })
  }, [])

  const handleDialogOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) setActiveCell(null)
  }, [])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-destructive">
        <ShieldAlertIcon className="h-10 w-10 mb-4 opacity-50" />
        <p className="font-semibold text-lg">Matriz desincronizada</p>
        <p className="text-sm opacity-80">{error.message}</p>
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="flex flex-col items-center justify-center p-24 text-muted-foreground">
        <Loader2Icon className="h-8 w-8 animate-spin mb-4" />
        <p className="font-medium">Construyendo arquitectura matricial...</p>
      </div>
    )
  }

  const { perfilesInscritos, cuotasPorMes, pagosMap } = data

  return (
    <div className="relative rounded-xl border bg-card shadow-sm">
      <div className="overflow-x-auto relative w-full h-full max-h-[70vh] custom-scrollbar">
        <Table className="relative w-full border-collapse">
          <TableHeader className="sticky top-0 bg-secondary/80 z-20 backdrop-blur-md">
            <TableRow>
              {/* Celda ancla para Perfiles */}
              <TableHead className="sticky left-0 top-0 z-30 min-w-[280px] w-[300px] border-r bg-secondary shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                <span className="font-bold uppercase tracking-wider text-xs">Alumno Inscrito</span>
              </TableHead>
              
              {/* Calendario Fijo 12 Meses */}
              {MESES_DEL_ANO.map((mes) => {
                const configCuota = cuotasPorMes[mes]
                return (
                  <TableHead 
                    key={mes} 
                    className={cn(
                      "min-w-[120px] text-center border-x font-semibold",
                      configCuota ? "text-foreground bg-secondary/80" : "text-muted-foreground bg-muted/30"
                    )}
                  >
                    {mes}
                    <span className="block text-xs font-normal">
                      {configCuota ? `S/ ${configCuota.monto}` : '(En Espera)'}
                    </span>
                  </TableHead>
                )
              })}

              <TableHead className="sticky right-0 top-0 z-30 min-w-[100px] text-center border-l bg-secondary shadow-[-2px_0_5px_rgba(0,0,0,0.05)]">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          
          <TableBody>
            {perfilesInscritos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={14} className="h-32 text-center text-muted-foreground">
                  Aún no existen participantes habilitados. Registra su inscripción primero.
                </TableCell>
              </TableRow>
            ) : null}

            {perfilesInscritos.map((perfil) => (
              <TableRow key={perfil.id} className="hover:bg-muted/30 group transition-colors">
                {/* Nombre (Sticky Left) */}
                <TableCell className="sticky left-0 z-10 border-r bg-card transition-colors group-hover:bg-muted/50 p-2 px-4 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-sm leading-tight text-foreground truncate w-full" title={perfil.nombre_completo}>
                      {perfil.nombre_completo}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {perfil.dni}
                      </span>
                      {perfil.rol !== 'Alumno' && (
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4 border-transparent", getRoleColor(perfil.rol))}>
                          {perfil.rol}
                        </Badge>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* React.memo Rendering de Celdas Fijas */}
                {MESES_DEL_ANO.map((mes) => {
                  const cuota = cuotasPorMes[mes]
                  
                  // Si el mes no ha sido instanciado en Settings, bloqueado.
                  if (!cuota) {
                    return (
                      <TableCell key={mes} className="border-x p-0 bg-muted/10 opacity-40 select-none">
                        <div className="flex h-full w-full items-center justify-center p-2">
                          <div className="h-6 w-6 rounded-full bg-border flex items-center justify-center">
                            <span className="sr-only">Inactivo</span>
                          </div>
                        </div>
                      </TableCell>
                    )
                  }

                  const mapKey = `${perfil.id}-${cuota.id}`
                  const pagoAsociado = pagosMap[mapKey]
                  
                  return (
                    <TableCell key={mapKey} className="border-x p-0 transition-colors hover:bg-muted/40">
                      <PaymentMatrixCell
                        perfilId={perfil.id}
                        cuotaId={cuota.id}
                        pago={pagoAsociado}
                        onCellClick={handleCellClick}
                      />
                    </TableCell>
                  )
                })}

                {/* Action Menu (Sticky Right) */}
                <TableCell className="sticky right-0 z-10 border-l bg-card text-center p-2 shadow-[-2px_0_5px_rgba(0,0,0,0.05)] group-hover:bg-muted/50">
                  <DropdownMenu>
                    <DropdownMenuTrigger 
                      render={
                        <Button variant="ghost" size="icon" className="h-8 w-8 data-[state=open]:bg-muted">
                          <MoreHorizontalIcon className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end" className="w-[200px]">
                      <DropdownMenuLabel>Acciones Directas</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {MESES_DEL_ANO.map(mes => {
                        const cuota = cuotasPorMes[mes]
                        if (!cuota) return null // Mes inactivo escapa
                        const yaPagado = pagosMap[`${perfil.id}-${cuota.id}`]
                        if (yaPagado) return null // Si ya pagó, no sugerimos cobro
                        
                        return (
                          <DropdownMenuItem 
                            key={`cobro-${mes}`}
                            onClick={() => handleCellClick(perfil.id, cuota.id)}
                            className="font-medium flex cursor-pointer"
                          >
                            <BanknoteIcon className="mr-2 h-4 w-4 text-emerald-500" />
                            Cobrar {mes}
                          </DropdownMenuItem>
                        )
                      })}
                      {Object.keys(cuotasPorMes).length === Object.keys(pagosMap).filter(k => k.startsWith(perfil.id)).length && (
                        <div className="p-2 text-xs text-center text-muted-foreground">
                          Alumno al día.
                        </div>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <CreatePaymentDialog 
        open={activeCell !== null}
        onOpenChange={handleDialogOpenChange}
        defaultPerfilId={activeCell?.perfilId}
        defaultCuotaId={activeCell?.cuotaId}
      />
    </div>
  )
}
