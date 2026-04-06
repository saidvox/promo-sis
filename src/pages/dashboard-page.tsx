import { useDashboardStats } from '@/features/payments/api/use-dashboard-stats'
import { usePayments } from '@/features/payments/api/use-payments'
import {
  Card,
  CardContent,
  CardDescription,
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
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, WalletMinimal, Users2, ArrowDownCircle } from 'lucide-react'

// Constants
const GOAL_AMOUNT = 100000 

export function DashboardPage() {
  const { data: stats, isLoading: isStatsLoading, error: statsError } = useDashboardStats()
  const { data: payments, isLoading: isPaymentsLoading, error: paymentsError } = usePayments()

  const progressPercentage = stats ? Math.min((stats.totalIncome / GOAL_AMOUNT) * 100, 100) : 0

  if (statsError || paymentsError) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center text-destructive">
          <h2 className="text-xl font-bold">Error cargando información</h2>
          <p>No se pudo conectar a la base de datos.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-6">
      {/* Stats Grid: 2 cols on mobile, 4 on large */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* RECAUDADO (Income) */}
        <Card className="relative overflow-hidden border-t-2 border-t-emerald-500 shadow-sm transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
            <CardTitle className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recaudado</CardTitle>
            <div className="p-1.5 bg-emerald-500/10 rounded-lg shrink-0">
              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {isStatsLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <div className="text-xl sm:text-3xl font-bold tabular-nums text-emerald-700">
                <span className="text-xs sm:text-lg font-medium mr-1 text-emerald-600/70">S/</span>
                {stats?.totalIncome.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </div>
            )}
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 font-medium">Ingresos históricos</p>
          </CardContent>
        </Card>

        {/* EGRESOS (Expenses) */}
        <Card className="relative overflow-hidden border-t-2 border-t-rose-500 shadow-sm transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
            <CardTitle className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Egresos</CardTitle>
            <div className="p-1.5 bg-rose-500/10 rounded-lg shrink-0">
              <ArrowDownCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-rose-600" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {isStatsLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <div className="text-xl sm:text-3xl font-bold tabular-nums text-rose-700">
                <span className="text-xs sm:text-lg font-medium mr-1 text-rose-600/70">S/</span>
                {stats?.totalExpenses.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </div>
            )}
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 font-medium">Gastos totales</p>
          </CardContent>
        </Card>

        {/* SALDO CAJA (Balance) */}
        <Card className="relative overflow-hidden border-t-2 border-t-indigo-500 shadow-sm transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
            <CardTitle className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Saldo Caja</CardTitle>
            <div className="p-1.5 bg-indigo-500/10 rounded-lg shrink-0">
              <WalletMinimal className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {isStatsLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <div className="text-xl sm:text-3xl font-bold tabular-nums text-indigo-700">
                <span className="text-xs sm:text-lg font-medium mr-1 text-indigo-600/70">S/</span>
                {stats?.balance.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </div>
            )}
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 font-medium">Liquidez actual</p>
          </CardContent>
        </Card>

        {/* ESTUDIANTES CON DEUDA (Debt) */}
        <Card className="relative overflow-hidden border-t-2 border-t-amber-500 shadow-sm transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
            <CardTitle className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Con Deuda</CardTitle>
            <div className="p-1.5 bg-amber-500/10 rounded-lg shrink-0">
              <Users2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {isStatsLoading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <div className="flex items-baseline gap-1.5">
                <div className="text-xl sm:text-3xl font-bold text-amber-700">
                  {stats?.pendingStudentsCount}
                </div>
                <span className="text-xs sm:text-sm font-medium text-amber-600/70">alumnos</span>
              </div>
            )}
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 font-medium">Con pagos pendientes</p>
          </CardContent>
        </Card>
      </div>

      {/* Bottom section: stacked on mobile, side-by-side on large */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle>Pagos Recientes</CardTitle>
            <CardDescription>
              Transacciones confirmadas durante esta semana.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            {isPaymentsLoading ? (
              <div className="space-y-4 px-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Alumno</TableHead>
                    <TableHead className="hidden md:table-cell">Cuota</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments?.slice(0, 5).map((pago) => (
                    <TableRow key={pago.id}>
                      <TableCell>
                        <div className="font-medium text-sm leading-tight">{pago.perfil?.nombre_completo}</div>
                        <div className="text-xs text-muted-foreground">{pago.perfil?.codigo_u}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{pago.config_cuotas?.mes_nombre}</TableCell>
                      <TableCell>
                        <Badge
                          variant={pago.estado === 'Pagado' ? 'default' : pago.estado === 'Pendiente' ? 'secondary' : 'destructive'}
                          className={`text-xs ${pago.estado === 'Pagado' ? "bg-primary text-primary-foreground hover:bg-primary/80" : ""}`}
                        >
                          {pago.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums text-sm">
                        S/ {pago.monto_pagado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!payments || payments.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        No se ha registrado ninguna operación financiera aún.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Progreso de la Promesa</CardTitle>
            <CardDescription>
              Hemos recolectado el {progressPercentage.toFixed(1)}% de la meta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col space-y-3">
               {isStatsLoading ? (
                 <div className="space-y-2">
                   <Skeleton className="h-4 w-full" />
                   <Skeleton className="h-8 w-full rounded-full" />
                 </div>
               ) : (
                 <>
                  <div className="flex w-full items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground/80 lowercase first-letter:uppercase">Fiesta de Gala</span>
                      <span className="text-xs text-muted-foreground">Meta: S/ {GOAL_AMOUNT.toLocaleString('es-PE')}</span>
                    </div>
                    <Badge variant="outline" className="font-bold tabular-nums bg-primary/5 text-primary border-primary/20">
                      {progressPercentage.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary/50 p-[1px]">
                    <div
                      className="h-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-1000 ease-in-out rounded-full shadow-[0_0_10px_rgba(var(--primary),0.3)]"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center italic">
                    Faltan S/ {(GOAL_AMOUNT - (stats?.totalIncome || 0)).toLocaleString('es-PE')} para alcanzar la meta.
                  </p>
                 </>
               )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
