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
import { DollarSign, Activity, CreditCard, Users } from 'lucide-react'

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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
            <CardTitle className="text-xs sm:text-sm font-medium leading-tight">Recaudado</CardTitle>
            <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {isStatsLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <div className="text-lg sm:text-2xl font-bold tabular-nums">
                S/ {stats?.totalIncome.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1 hidden sm:block">Ingresos históricos confirmados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
            <CardTitle className="text-xs sm:text-sm font-medium leading-tight">Egresos</CardTitle>
            <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {isStatsLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <div className="text-lg sm:text-2xl font-bold tabular-nums">
                S/ {stats?.totalExpenses.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1 hidden sm:block">Gastos registrados totales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
            <CardTitle className="text-xs sm:text-sm font-medium leading-tight">Saldo Caja</CardTitle>
            <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {isStatsLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <div className="text-lg sm:text-2xl font-bold tabular-nums">
                S/ {stats?.balance.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1 hidden sm:block">Liquidez directa actual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
            <CardTitle className="text-xs sm:text-sm font-medium leading-tight">Con Deuda</CardTitle>
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {isStatsLoading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <div className="text-lg sm:text-2xl font-bold">
                {stats?.pendingStudentsCount}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1 hidden sm:block">Con al menos un mes activo sin completar</p>
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
          <CardContent className="space-y-8">
            <div className="flex flex-col space-y-2">
               {isStatsLoading ? (
                 <Skeleton className="h-4 w-full" />
               ) : (
                 <>
                  <div className="flex w-full items-center justify-between">
                    <span className="text-sm font-medium">Fiesta de Gala S/ {GOAL_AMOUNT.toLocaleString('es-PE')}</span>
                    <span className="text-sm font-medium text-muted-foreground">{progressPercentage.toFixed(1)}%</span>
                  </div>
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full bg-primary transition-all duration-500 ease-in-out"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                 </>
               )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
