import { useState, useCallback, useMemo } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { WalletIcon, BuildingIcon, PackageIcon, ClockIcon, Trash2Icon, PencilIcon, BanknoteIcon } from 'lucide-react'
import { useSWRConfig } from 'swr'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useExpenses, type EgresoRow } from '../api/use-expenses'
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

type CategoriaTab = 'all' | 'Productora' | 'Otros'

export function ExpensesTable() {
  const { data, isLoading, error } = useExpenses()
  const { mutate } = useSWRConfig()

  const [activeTab, setActiveTab] = useState<CategoriaTab>('all')
  const [payingEgreso, setPayingEgreso] = useState<EgresoRow | null>(null)
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
      {/* CARDS FINANCIERAS */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

      {/* TOOLBAR */}
      <div className="flex items-center justify-between">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CategoriaTab)} className="w-auto">
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="Productora" className="data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400">
              Productora (RG)
            </TabsTrigger>
            <TabsTrigger value="Otros">Otros Gastos</TabsTrigger>
          </TabsList>
        </Tabs>

        <CreateExpenseDialog />
      </div>

      {/* TABLA */}
      <div className="rounded-xl border bg-card shadow-sm">
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
              filteredEgresos.map((egreso) => (
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
                  <TableCell className="text-right font-semibold tabular-nums">
                    S/ {egreso.monto.toFixed(2)}
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
                        egreso.estado === 'Pagado'
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400"
                          : "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400"
                      )}
                    >
                      {egreso.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {egreso.estado === 'Pendiente' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                            onClick={() => setTimeout(() => setPayingEgreso(egreso), 50)}
                          >
                            <BanknoteIcon className="h-3.5 w-3.5" />
                            Pagar
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
                    </div>
                  </TableCell>
                </TableRow>
              ))
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
