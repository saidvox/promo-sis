import { memo } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale/es'
import { LinkIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database.types'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

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

  // Event handler común para abrir el modal (insertar o añadir fondos)
  const handleClick = () => onCellClick(perfilId, cuotaId)

  // Caso 1: No existe pago registrado (Pendiente absoluto)
  if (!pago) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="group flex h-10 w-full items-center justify-center outline-none transition-colors hover:bg-muted/50 cursor-pointer"
        title="Registrar nuevo abono"
      >
        <div className="h-2 w-2 rounded-full bg-rose-500/80 shadow-[0_0_8px_rgba(244,63,94,0.4)] transition-all duration-200 group-hover:scale-150 group-hover:bg-rose-600"></div>
      </button>
    )
  }

  // Caso 2: El pago existe
  const isPaid = pago.estado === 'Pagado'
  const isPending = pago.estado === 'Pendiente'
  const isRejected = pago.estado === 'Rechazado'

  // Si está completo (Verde), Si está incompleto (Naranja), Si está rechazado (Rojo oscuro)
  const cellContent = (
    <button
      type="button"
      onClick={isPaid ? undefined : handleClick}
      className={cn(
        "group flex h-6 min-w-[36px] px-1 items-center justify-center rounded text-[10px] font-medium transition-colors outline-none",
        isPaid ? "bg-emerald-500/10 text-emerald-600 cursor-default" : "cursor-pointer hover:bg-amber-500/20 active:scale-95",
        isPending && "bg-amber-500/15 text-amber-600 shadow-[0_0_6px_rgba(245,158,11,0.2)]",
        isRejected && "bg-rose-500/10 text-rose-600"
      )}
      title={isPaid ? "Pago completado" : "Abono parcial - Clic para completar"}
    >
      {isPaid && <span>{pago.monto_pagado}</span>}
      {isPending && <span className="tabular-nums">S/ {pago.monto_pagado}</span>}
      {isRejected && <span className="font-bold">Rechazado</span>}
    </button>
  )

  // Si tiene voucher o estado especial, lo envolvemos en un tooltip descriptivo
  if (pago.url_voucher || pago.created_at) {
    return (
      <Tooltip>
        <TooltipTrigger render={
          <div className="flex h-10 w-full items-center justify-center p-1.5 focus:outline-none">
            {cellContent}
          </div>
        } />
        <TooltipContent side="top" className="flex max-w-xs flex-col gap-1 p-3 z-50">
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

  // Celda renderizada si pagó pero no adjuntó ningún comprobante adicional
  return (
    <div className="flex h-10 w-full items-center justify-center p-1">
      {cellContent}
    </div>
  )
})
