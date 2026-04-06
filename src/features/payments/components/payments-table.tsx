import { format } from 'date-fns'
import { es } from 'date-fns/locale/es'
import { LinkIcon } from 'lucide-react'
import { usePayments } from '@/features/payments/api/use-payments'
import { getPaymentStatusColor } from '@/features/payments/utils/get-status-color'

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

export function PaymentsTable() {
  const { data: pagos, isLoading, error } = usePayments()

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
        Error al cargar los pagos: {error.message}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[120px]">Fecha</TableHead>
              <TableHead>Alumno/DNI</TableHead>
              <TableHead>Cuota</TableHead>
              <TableHead className="text-right">Monto (S/)</TableHead>
              <TableHead className="text-center">Voucher</TableHead>
              <TableHead className="text-right">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Skeleton Loading State
              Array.from({ length: 5 }).map((_, idx) => (
                <TableRow key={idx}>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell className="text-right flex justify-end">
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell className="text-center"><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                  <TableCell className="text-right flex justify-end">
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                </TableRow>
              ))
            ) : pagos?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Aún no se ha registrado ningún pago en el sistema.
                </TableCell>
              </TableRow>
            ) : (
              pagos?.map((pago) => (
                <TableRow key={pago.id}>
                  <TableCell className="text-muted-foreground text-sm font-medium">
                    {pago.created_at ? format(new Date(pago.created_at), "d MMM, yyyy", { locale: es }) : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{pago.perfil?.nombre_completo || 'Usuario Desconocido'}</div>
                    <div className="text-xs text-muted-foreground">{pago.perfil?.dni || 'Sin DNI'}</div>
                  </TableCell>
                  <TableCell className="font-medium text-muted-foreground">
                    {pago.config_cuotas?.mes_nombre || '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {pago.monto_pagado.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center">
                    {pago.url_voucher ? (
                      <a 
                        href={pago.url_voucher} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-primary transition-colors"
                        title="Ver voucher"
                      >
                        <LinkIcon className="h-4 w-4" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground/30 text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge 
                      variant="outline"
                      className={getPaymentStatusColor(pago.estado)}
                    >
                      {pago.estado}
                    </Badge>
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
