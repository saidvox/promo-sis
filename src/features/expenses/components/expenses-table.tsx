import { useState, useCallback, useMemo } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { WalletIcon, BuildingIcon, PackageIcon, ClockIcon, Trash2Icon, PencilIcon, BanknoteIcon } from 'lucide-react'
import { useSWRConfig } from 'swr'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useExpenses, type EgresoRow, type EgresoWithAbonos } from '../api/use-expenses'
import { CreateExpenseDialog } from './create-expense-dialog'
import { PayExpenseDialog } from './pay-expense-dialog'
import { EditExpenseDialog } from './edit-expense-dialog'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { HistoryIcon } from 'lucide-react'

type CategoriaTab = 'all' | 'Productora' | 'Otros'

export function ExpensesTable() {
  const { data, isLoading, error } = useExpenses()
  const { mutate } = useSWRConfig()

  const [activeTab, setActiveTab] = useState<CategoriaTab>('all')
  const [payingEgreso, setPayingEgreso] = useState<EgresoWithAbonos | null>(null)
  const [editingEgreso, setEditingEgreso] = useState<EgresoRow | null>(null)

  const handleDelete = useCallback(async (egreso: EgresoRow) => {
    if (egreso.estado === 'Pagado') {
      toast.error('No puedes eliminar un egreso ya pagado.')
      return
    }
    const confirmed = window.confirm(`¿Eliminar el egreso "${egreso.concepto}"?`)
    if (!confirmed) return

    try {
      const { error } = await supabase.from('egresos').delete().eq('id', egreso.id)
      if (error) throw error
      toast.success('Egreso eliminado')
      mutate('api/expenses')
      mutate('api/dashboard-stats')
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar')
    }
  }, [mutate])

  const filteredEgresos = useMemo(() => {
    if (!data) return []
    if (activeTab === 'all') return data.egresos
    return data.egresos.filter(e => e.categoria === activeTab)
  }, [data, activeTab])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-destructive">
        <p className="font-semibold text-lg">Error al cargar egresos</p>
        <p className="text-sm opacity-80">{error.message}</p>
      </div>
    )
  }

  const stats = data?.stats

  return (
    <div className="space-y-6">
      {/* CARDS FINANCIERAS: 2 cols mobile, 4 cols large */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Disponible</CardTitle>
            <WalletIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-28" />
            ) : (
              <div className={cn("text-2xl font-bold", (stats?.saldoDisponible ?? 0) >= 0 ? "text-emerald-500" : "text-rose-500")}>
                S/ {stats?.saldoDisponible.toFixed(2)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Ingresos - Egresos pagados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagado a Productora</CardTitle>
            <BuildingIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-28" />
            ) : (
              <div className="text-2xl font-bold text-blue-500">
                S/ {stats?.totalPagadoProductora.toFixed(2)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">RG Productions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Otros Gastos</CardTitle>
            <PackageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-28" />
            ) : (
              <div className="text-2xl font-bold">
                S/ {stats?.totalPagadoOtros.toFixed(2)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Materiales, imprenta, etc.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comprometido</CardTitle>
            <ClockIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-28" />
            ) : (
              <div className="text-2xl font-bold text-amber-500">
                S/ {stats?.totalComprometido.toFixed(2)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Pendientes de ejecutar</p>
          </CardContent>
        </Card>
      </div>

      {/* TOOLBAR: stacked on mobile, row on desktop */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CategoriaTab)} className="w-full sm:w-auto">
          <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:grid-cols-none sm:flex">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="Productora" className="data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400">
              <span className="hidden sm:inline">Productora (RG)</span>
              <span className="sm:hidden">RG</span>
            </TabsTrigger>
            <TabsTrigger value="Otros">
              <span className="hidden sm:inline">Otros Gastos</span>
              <span className="sm:hidden">Otros</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <CreateExpenseDialog className="w-full sm:w-auto" />
      </div>

      {/* MOBILE CARD VIEW */}
      <div className="block sm:hidden space-y-2">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))
        ) : filteredEgresos.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
            No hay egresos registrados en esta categoría.
          </div>
        ) : (
          filteredEgresos.map((egreso) => {
            const totalAbonado = egreso.abonos_egresos.reduce((acc, a) => acc + a.monto_abono, 0)
            const porcentaje = Math.min(Math.round((totalAbonado / egreso.monto) * 100), 100)
            const isFullyPaid = egreso.estado === 'Pagado' || totalAbonado >= egreso.monto

            return (
              <div key={egreso.id} className="rounded-xl border bg-card p-4 space-y-3 shadow-sm">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-semibold text-sm leading-tight">{egreso.concepto}</p>
                    {egreso.descripcion && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{egreso.descripcion}</p>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "shrink-0 text-xs",
                      isFullyPaid
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400"
                        : totalAbonado > 0
                        ? "bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400"
                        : "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400"
                    )}
                  >
                    {isFullyPaid ? 'Pagado' : totalAbonado > 0 ? 'Parcial' : 'Pendiente'}
                  </Badge>
                </div>

                {/* Amount + Progress */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {isFullyPaid ? 'Liquidado' : `S/ ${totalAbonado.toFixed(0)} de S/ ${egreso.monto.toFixed(0)}`}
                    </span>
                    <span className="font-bold text-sm tabular-nums">S/ {egreso.monto.toFixed(2)}</span>
                  </div>
                  <Progress value={porcentaje} className="h-1.5" />
                </div>

                {/* Actions */}
                {!isFullyPaid && (
                  <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 flex-1"
                      onClick={() => setTimeout(() => setPayingEgreso(egreso), 50)}
                    >
                      <BanknoteIcon className="h-3.5 w-3.5" />
                      Abonar
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-muted"
                      onClick={() => setTimeout(() => setEditingEgreso(egreso), 50)}
                    >
                      <PencilIcon className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleDelete(egreso)}
                    >
                      <Trash2Icon className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
                {isFullyPaid && (
                  <p className="text-xs text-muted-foreground italic pt-1 border-t border-border/40">Gasto finalizado</p>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* DESKTOP TABLE VIEW */}
      <div className="hidden sm:block rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Concepto</TableHead>
              <TableHead className="w-[120px]">Categoría</TableHead>
              <TableHead className="w-[120px] text-right">Monto</TableHead>
              <TableHead className="w-[130px]">Fecha Prog.</TableHead>
              <TableHead className="w-[100px] text-center">Estado</TableHead>
              <TableHead className="w-[140px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredEgresos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  No hay egresos registrados en esta categoría.
                </TableCell>
              </TableRow>
            ) : (
              filteredEgresos.map((egreso) => {
                const totalAbonado = egreso.abonos_egresos.reduce((acc, a) => acc + a.monto_abono, 0)
                const porcentaje = Math.min(Math.round((totalAbonado / egreso.monto) * 100), 100)
                const isFullyPaid = egreso.estado === 'Pagado' || totalAbonado >= egreso.monto

                return (
                  <TableRow key={egreso.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{egreso.concepto}</span>
                        {egreso.descripcion && (
                          <span className="text-xs text-muted-foreground line-clamp-1">{egreso.descripcion}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          egreso.categoria === 'Productora' 
                            ? "bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400" 
                            : "bg-muted text-muted-foreground border-border/50"
                        )}
                      >
                        {egreso.categoria === 'Productora' ? 'RG Prod.' : 'Otros'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-1.5">
                        <div className="flex items-center gap-2">
                          {totalAbonado > 0 && (
                            <Popover>
                              <PopoverTrigger>
                                <Button variant="ghost" size="icon" className="h-4 w-4 text-muted-foreground hover:text-primary">
                                  <HistoryIcon className="h-3 w-3" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-60 p-3" align="end">
                                <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-foreground">
                                  <HistoryIcon className="h-3.5 w-3.5" />
                                  Historial de Abonos
                                </h4>
                                <div className="space-y-2">
                                  {(egreso.abonos_egresos ?? []).sort((a,b) => new Date(b.fecha_pago).getTime() - new Date(a.fecha_pago).getTime()).map((abono) => (
                                    <div key={abono.id} className="flex justify-between items-center text-[10px] border-b border-border/40 pb-1 last:border-0 last:pb-0">
                                      <span className="text-muted-foreground">
                                        {format(new Date(abono.fecha_pago), 'dd/MM/yy HH:mm')}
                                      </span>
                                      <span className="font-medium text-emerald-600">
                                        + S/ {abono.monto_abono.toFixed(2)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                          )}
                          <span className="font-semibold tabular-nums">
                            S/ {egreso.monto.toFixed(2)}
                          </span>
                        </div>
                        
                        <div className="w-24 space-y-1">
                          <Progress value={porcentaje} className="h-1" />
                          <div className={cn(
                            "text-[10px] tabular-nums whitespace-nowrap",
                            isFullyPaid ? "text-emerald-500 font-medium" : "text-muted-foreground"
                          )}>
                            {isFullyPaid ? 'Liquidado' : `Abonado: S/ ${totalAbonado.toFixed(0)}`}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {egreso.fecha_programada
                        ? format(new Date(egreso.fecha_programada + 'T00:00:00'), 'd MMM yyyy', { locale: es })
                        : '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={cn(
                          isFullyPaid
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400"
                            : totalAbonado > 0
                            ? "bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400"
                            : "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400"
                        )}
                      >
                        {isFullyPaid ? 'Pagado' : totalAbonado > 0 ? 'Parcial' : 'Pendiente'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!isFullyPaid && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                              onClick={() => setTimeout(() => setPayingEgreso(egreso), 50)}
                            >
                              <BanknoteIcon className="h-3.5 w-3.5" />
                              Abonar
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-muted"
                              onClick={() => setTimeout(() => setEditingEgreso(egreso), 50)}
                            >
                              <PencilIcon className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => handleDelete(egreso)}
                            >
                              <Trash2Icon className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        {isFullyPaid && (
                          <span className="text-[10px] text-muted-foreground italic px-2">
                            Gasto finalizado
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Diálogos */}
      <PayExpenseDialog
        open={payingEgreso !== null}
        onOpenChange={(isOpen) => { if (!isOpen) setPayingEgreso(null) }}
        egreso={payingEgreso}
        saldoDisponible={stats?.saldoDisponible ?? 0}
      />

      <EditExpenseDialog
        open={editingEgreso !== null}
        onOpenChange={(isOpen) => { if (!isOpen) setEditingEgreso(null) }}
        egreso={editingEgreso}
      />
    </div>
  )
}
