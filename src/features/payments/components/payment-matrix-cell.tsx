import { memo } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CheckIcon, LinkIcon, DotIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database.types'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { getPaymentStatusColor } from '../utils/get-status-color'

type PagoRow = Database['public']['Tables']['pagos']['Row']

interface PaymentMatrixCellProps {
  perfilId: string
  cuotaId: string
  pago?: PagoRow
  onCellClick: (perfilId: string, cuotaId: string) => void
}

/**
 * Celda atómica matricial. 
 * Cumple Vercel Best Practices: rerender-memo.
 * Sólo las celdas cuyos props cambien serán repintadas, protegiendo 
 * el rendimiento cuando la matriz contenga cientos de intersecciones.
 */
export const PaymentMatrixCell = memo(function PaymentMatrixCell({
  perfilId,
  cuotaId,
  pago,
  onCellClick,
}: PaymentMatrixCellProps) {

  // Caso 1: No existe pago registrado (Pendiente absoluto)
  if (!pago) {
    return (
      <button
        type="button"
        onClick={() => onCellClick(perfilId, cuotaId)}
        className="group relative flex h-full w-full items-center justify-center p-2 outline-none"
        title="Registrar pago"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-all duration-200 group-hover:scale-110 group-hover:bg-primary/20 group-hover:text-primary">
          <span className="sr-only">Pendiente</span>
        </div>
      </button>
    )
  }

  // Caso 2: El pago existe
  const isPaid = pago.estado === 'Pagado'
  const isPending = pago.estado === 'Pendiente'
  const isRejected = pago.estado === 'Rechazado'

  const cellContent = (
    <div className={cn(
      "flex h-8 w-full min-w-[3rem] items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium cursor-default",
      getPaymentStatusColor(pago.estado)
    )}>
      {isPaid && <CheckIcon className="h-3.5 w-3.5" />}
      {isPending && <DotIcon className="h-4 w-4" />}
      {isRejected && <span className="text-[10px] uppercase tracking-wider">RECHAZ.</span>}
      {isPaid && <span>S/ {pago.monto_pagado}</span>}
    </div>
  )

  // Si tiene voucher o estado especial, lo envolvemos en un tooltip descriptivo
  if (pago.url_voucher || pago.created_at) {
    return (
      <Tooltip>
        <TooltipTrigger className="flex h-full w-full items-center justify-center p-1.5 outline-none">
          {cellContent}
        </TooltipTrigger>
        <TooltipContent side="top" className="flex max-w-xs flex-col gap-1 p-3">
          <p className="font-semibold text-sm">Detalles de Transacción</p>
          {pago.created_at && (
            <p className="text-xs text-muted-foreground">
              Fecha: {format(new Date(pago.created_at), "d MMM, yyyy - HH:mm", { locale: es })}
            </p>
          )}
          <p className="text-xs text-muted-foreground">Estado: {pago.estado}</p>
          {pago.url_voucher && (
            <a 
              href={pago.url_voucher} 
              target="_blank" 
              rel="noreferrer"
              className="mt-1 flex items-center text-xs text-primary hover:underline"
            >
              <LinkIcon className="mr-1 h-3 w-3" />
              Ver comprobante adjunto
            </a>
          )}
        </TooltipContent>
      </Tooltip>
    )
  }

  // Celda renderizada si pagó pero no adjuntó ningún detalle adicional
  return (
    <div className="flex h-full w-full items-center justify-center p-1.5">
      {cellContent}
    </div>
  )
})
