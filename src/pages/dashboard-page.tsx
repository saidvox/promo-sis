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
            {isStatsLoading ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-8 w-44" />
                  </div>
                  <Skeleton className="h-8 w-16 rounded-full" />
                </div>
                <Skeleton className="h-16 w-full rounded-3xl" />
                <div className="flex justify-between gap-3">
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-24" />
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/70">
                      Fiesta de Gala
                    </p>
                    <div className="mt-2 flex items-end gap-2">
                      <span className="text-sm font-medium text-primary/70">S/</span>
                      <span className="truncate text-3xl font-bold tracking-tight text-foreground tabular-nums sm:text-4xl">
                        {(stats?.totalIncome || 0).toLocaleString('es-PE', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      de S/ {GOAL_AMOUNT.toLocaleString('es-PE')} proyectados
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="rounded-full border-primary/20 bg-primary/10 px-2.5 py-1 font-bold tabular-nums text-primary"
                  >
                    {progressPercentage.toFixed(1)}%
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    <span>Ritmo de avance</span>
                    <span className="tabular-nums normal-case tracking-normal">
                      {progressPercentage.toFixed(1)}% completado
                    </span>
                  </div>
                  <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-muted/30 px-2 py-2.5">
                    <div className="relative h-8 rounded-2xl bg-background/80 ring-1 ring-white/5">
                      <div className="absolute inset-y-0 left-0 w-full rounded-2xl bg-[linear-gradient(90deg,transparent_0%,transparent_24.5%,rgba(255,255,255,0.08)_24.5%,rgba(255,255,255,0.08)_25.5%,transparent_25.5%,transparent_49.5%,rgba(255,255,255,0.08)_49.5%,rgba(255,255,255,0.08)_50.5%,transparent_50.5%,transparent_74.5%,rgba(255,255,255,0.08)_74.5%,rgba(255,255,255,0.08)_75.5%,transparent_75.5%)]" />
                      <div
                        className="relative h-full rounded-2xl bg-linear-to-r from-emerald-500 via-teal-400 to-primary transition-all duration-1000 ease-out"
                        style={{ width: `${Math.max(progressPercentage, 6)}%` }}
                      >
                        <div className="absolute inset-y-1 right-1 w-8 rounded-full bg-white/35 blur-md" />
                        <div className="absolute right-1 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border border-white/50 bg-white/80 shadow-[0_0_16px_rgba(255,255,255,0.45)]" />
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between px-1 text-[10px] font-medium text-muted-foreground">
                      <span>0%</span>
                      <span>25%</span>
                      <span>50%</span>
                      <span>75%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    Recaudado: <span className="font-semibold text-foreground tabular-nums">S/ {(stats?.totalIncome || 0).toLocaleString('es-PE', { maximumFractionDigits: 0 })}</span>
                  </span>
                  <span>
                    Falta: <span className="font-semibold text-foreground tabular-nums">S/ {(GOAL_AMOUNT - (stats?.totalIncome || 0)).toLocaleString('es-PE', { maximumFractionDigits: 0 })}</span>
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
