import { useState, useCallback, useMemo, useEffect } from 'react'
import { Loader2Icon, ShieldAlertIcon, SearchIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { usePaymentsMatrix, MESES_DEL_ANO } from '../api/use-payments-matrix'
import { PaymentMatrixCell } from './payment-matrix-cell'
import { CreatePaymentDialog } from './create-payment-dialog'
import { CreateInscripcionDialog } from './create-inscripcion-dialog'
import { getRoleColor } from '@/features/students/utils/get-role-color'
import { cn } from '@/lib/utils'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'

const ROWS_PER_PAGE = 10

type FilterStatus = 'all' | 'morosos' | 'aldia'

export function PaymentsMatrix() {
  const { data, isLoading, error } = usePaymentsMatrix()
  const [activeCell, setActiveCell] = useState<{ perfilId: string, cuotaId: string } | null>(null)
  
  // Data Table States
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [currentPage, setCurrentPage] = useState(1)

  const handleCellClick = useCallback((perfilId: string, cuotaId: string) => {
    // Evitamos el bug de Focus Trap entre DropdownMenu y Dialog usando un microtask (setTimeout)
    setTimeout(() => {
      setActiveCell({ perfilId, cuotaId })
    }, 50)
  }, [])

  const handleDialogOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) setActiveCell(null)
  }, [])

  // ----------------------------------------------------
  // COMPUTATIONAL PIPELINE (Memoized for max performance)
  // ----------------------------------------------------
  
  // 0. Recaudación Global (Basado en el total de inscritos, ignorando búsquedas)
  const globalMetrics = useMemo(() => {
    if (!data) return {}

    const metrics: Record<string, { expected: number, collected: number }> = {}
    const { cuotasPorMes, perfilesInscritos, pagosMap } = data
    const totalAlumnos = perfilesInscritos.length

    for (const mes of MESES_DEL_ANO) {
      const cuota = cuotasPorMes[mes]
      if (cuota) {
        let collected = 0
        for (const perfil of perfilesInscritos) {
          collected += pagosMap[`${perfil.id}-${cuota.id}`]?.monto_pagado || 0
        }
        metrics[mes] = {
          expected: totalAlumnos * cuota.monto,
          collected: collected
        }
      }
    }
    return metrics
  }, [data])
  const filteredAndPaginated = useMemo(() => {
    if (!data) return { paginatedList: [], totalList: [], totalPages: 0, safePage: 1 }
    
    let result = data.perfilesInscritos
    const { cuotasPorMes, pagosMap } = data
    const cuotasActivas = Object.values(cuotasPorMes)

    // 1. Text Search Filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(perfil => 
        perfil.nombre_completo.toLowerCase().includes(q) ||
        (perfil.dni && perfil.dni.includes(q)) ||
        (perfil.codigo_u && perfil.codigo_u.toLowerCase().includes(q))
      )
    }

    // 2. Status Filter (Mathematical evaluation)
    if (statusFilter !== 'all') {
      result = result.filter(perfil => {
        let isClean = true
        for (const cuota of cuotasActivas) {
          const pago = pagosMap[`${perfil.id}-${cuota.id}`]
          if (!pago || pago.monto_pagado < cuota.monto) {
            isClean = false
            break // Cortocircuito por optimización
          }
        }
        return statusFilter === 'aldia' ? isClean : !isClean
      })
    }

    // 3. Pagination Logic
    const totalPages = Math.max(1, Math.ceil(result.length / ROWS_PER_PAGE))
    // Safety guard for current page out of bounds when filtering
    const safePage = Math.min(currentPage, totalPages)
    
    const startIndex = (safePage - 1) * ROWS_PER_PAGE
    const paginatedList = result.slice(startIndex, startIndex + ROWS_PER_PAGE)

    return { 
      paginatedList, 
      totalList: result, 
      totalPages,
      safePage 
    }
  }, [data, searchQuery, statusFilter, currentPage])

  // Sync state if safePage corrected out of bounds
  useEffect(() => {
    if (filteredAndPaginated.safePage !== currentPage && data) {
      setCurrentPage(filteredAndPaginated.safePage)
    }
  }, [filteredAndPaginated.safePage, currentPage, data])

  // ----------------------------------------------------
  // RENDER PIPELINE
  // ----------------------------------------------------
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

  const { cuotasPorMes, pagosMap, perfilesInscritos } = data
  const { paginatedList, totalList, totalPages } = filteredAndPaginated

  return (
    <div className="relative space-y-4">
      {/* TOOLBAR */}
      <div className="flex flex-col gap-3 bg-card p-3 sm:p-4 rounded-xl border shadow-sm">
        {/* Search bar: full width always */}
        <div className="relative w-full">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nombre, código o DNI..." 
            className="pl-9 bg-background"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
          />
        </div>

        {/* Filters row: tabs full-width on mobile, inline on desktop */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <Tabs 
            value={statusFilter} 
            onValueChange={(val) => {
              setStatusFilter(val as FilterStatus)
              setCurrentPage(1)
            }} 
            className="w-full sm:flex-1"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all" className="text-xs sm:text-sm">Todos</TabsTrigger>
              <TabsTrigger value="morosos" className="text-xs sm:text-sm data-[state=active]:text-rose-600 dark:data-[state=active]:text-rose-400">Morosos</TabsTrigger>
              <TabsTrigger value="aldia" className="text-xs sm:text-sm data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400">Al Día</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="w-full sm:w-auto">
            <CreateInscripcionDialog className="w-full sm:w-auto" />
          </div>
        </div>
      </div>

      {/* MATRIX */}
      <div className="relative rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto relative w-full h-full max-h-[70vh] custom-scrollbar">
          <Table className="relative w-full border-collapse">
            <TableHeader className="sticky top-0 bg-secondary/80 z-20 backdrop-blur-md">
              <TableRow>
                {/* Celda ancla para Perfiles */}
                <TableHead className="sticky left-0 top-0 z-30 min-w-[200px] w-[200px] border-r border-border/40 bg-secondary shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                  <span className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Alumno</span>
                </TableHead>
                
                {/* Calendario Fijo 12 Meses (Densidad compacta) */}
                {MESES_DEL_ANO.map((mes) => {
                  const configCuota = cuotasPorMes[mes]
                  const shortMes = mes.slice(0, 3).toUpperCase()
                  
                  return (
                    <TableHead 
                      key={mes} 
                      className={cn(
                        "w-[64px] min-w-[64px] px-1 text-center font-medium border-r border-border/40 transition-colors",
                        configCuota ? "text-foreground bg-secondary/60" : "text-muted-foreground/50 bg-transparent"
                      )}
                    >
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        <span className="text-[10px] tracking-wider uppercase">{shortMes}</span>
                        <div className="flex gap-1 items-center opacity-70">
                          <span className="text-[10px] font-normal tabular-nums leading-none">
                            {configCuota ? `${configCuota.monto}` : '-'}
                          </span>
                          {configCuota?.fecha_vencimiento && (
                            <span className="text-[8px] font-medium bg-secondary/50 rounded-xs px-0.5" title="Día de vencimiento al mes">
                              d{configCuota.fecha_vencimiento.split('-')[2]}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableHead>
                  )
                })}
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {paginatedList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="h-32 text-center text-muted-foreground">
                    No se encontraron participantes que coincidan con la búsqueda.
                  </TableCell>
                </TableRow>
              ) : null}

              {paginatedList.map((perfil) => (
                <TableRow key={perfil.id} className="group border-b border-border/40 transition-colors hover:bg-muted/10">
                  {/* Nombre (Sticky Left) */}
                  <TableCell className="sticky left-0 z-10 border-r border-border/40 bg-card transition-colors group-hover:bg-muted/30 p-2 pl-3 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-xs leading-tight text-foreground truncate w-full" title={perfil.nombre_completo}>
                        {perfil.nombre_completo}
                      </span>
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        {perfil.codigo_u ? (
                          <span className="text-[10px] text-muted-foreground tabular-nums opacity-80" title="Código Universitario">
                            {perfil.codigo_u}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground tabular-nums opacity-80" title="DNI">
                            {perfil.dni}
                          </span>
                        )}
                        {perfil.rol !== 'Alumno' && (
                          <span className={cn("text-[9px] px-1 py-0 rounded-sm font-medium tracking-wide truncate", getRoleColor(perfil.rol).replace('bg-opacity-10', 'bg-opacity-20'))}>
                            {perfil.rol}
                          </span>
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
                        <TableCell key={mes} className="border-r border-border/40 p-0 select-none">
                          <div className="flex h-10 w-full items-center justify-center">
                            <div className="h-1 w-1 rounded-full bg-border/50"></div>
                          </div>
                        </TableCell>
                      )
                    }

                    const mapKey = `${perfil.id}-${cuota.id}`
                    const pagoAsociado = pagosMap[mapKey]
                    
                    return (
                      <TableCell key={mapKey} className="border-r border-border/40 p-0">
                        <PaymentMatrixCell
                          perfilId={perfil.id}
                          cuotaId={cuota.id}
                          pago={pagoAsociado}
                          onCellClick={handleCellClick}
                        />
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
            <TableFooter className="bg-secondary/40 sticky bottom-0 z-20 backdrop-blur-md">
              <TableRow>
                <TableCell className="sticky left-0 z-30 border-r border-border/40 bg-secondary/80 shadow-[2px_0_5px_rgba(0,0,0,0.02)] p-2 pl-3">
                  <div className="flex flex-col">
                    <span className="font-semibold text-xs text-foreground">Supervisión Mensual</span>
                    <span className="text-[9px] text-muted-foreground">Progreso de Recaudación</span>
                  </div>
                </TableCell>
                
                {MESES_DEL_ANO.map((mes) => {
                  const metric = globalMetrics[mes]
                  if (!metric) {
                    return (
                      <TableCell key={mes} className="border-r border-border/40 p-0 text-center bg-secondary/20">
                        <div className="flex h-10 w-full items-center justify-center">
                          <div className="h-1 w-1 rounded-full bg-border/50"></div>
                        </div>
                      </TableCell>
                    )
                  }
                  
                  const target = metric.expected
                  const current = metric.collected
                  const percentage = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
                  
                  return (
                    <TableCell key={mes} className="border-r border-border/40 p-1 px-1.5 align-middle bg-secondary/20">
                      <div className="flex flex-col w-full gap-1 p-0.5">
                        <div className="flex justify-between items-end leading-none">
                          <span className="text-[10px] font-bold text-foreground">S/ {current}</span>
                          <span className="text-[8px] text-muted-foreground" title={`Meta de S/ ${target}`}>/ {target}</span>
                        </div>
                        <div className="w-full h-1 bg-background/80 rounded-full overflow-hidden shadow-inner">
                          <div 
                            className={cn(
                              "h-full transition-all duration-500",
                              percentage >= 100 ? "bg-emerald-500" : "bg-amber-500"
                            )} 
                            style={{ width: `${percentage}%` }} 
                          />
                        </div>
                      </div>
                    </TableCell>
                  )
                })}
              </TableRow>
            </TableFooter>
          </Table>
        </div>

        {/* Mobile scroll hint */}
        <p className="sm:hidden text-center text-[10px] text-muted-foreground/60 py-1 italic">
          ↔ Desliza horizontalmente para ver todos los meses
        </p>

        {/* FOOTER PAGINATION */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
          <div className="text-xs text-muted-foreground hidden sm:block">
            {totalList.length > 0 ? (
              <span>
                Mostrando <span className="font-medium text-foreground">{(currentPage - 1) * ROWS_PER_PAGE + 1}</span> a <span className="font-medium text-foreground">{Math.min(currentPage * ROWS_PER_PAGE, totalList.length)}</span> de <span className="font-medium text-foreground">{totalList.length}</span> resultados
              </span>
            ) : (
              <span>Sin resultados</span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground mr-2 font-medium">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              <ChevronLeftIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Anterior</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              <span className="hidden sm:inline">Siguiente</span>
              <ChevronRightIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <CreatePaymentDialog 
          open={activeCell !== null}
          onOpenChange={handleDialogOpenChange}
          perfil={activeCell ? perfilesInscritos.find(p => p.id === activeCell.perfilId) || null : null}
          cuota={activeCell ? Object.values(cuotasPorMes).find(c => c.id === activeCell.cuotaId) || null : null}
          pagoExistente={activeCell ? pagosMap[`${activeCell.perfilId}-${activeCell.cuotaId}`] : undefined}
        />
      </div>
    </div>
  )
}
