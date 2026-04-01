import type { Database } from '@/types/database.types'

type EstadoPago = Database['public']['Enums']['estado_pago']

export const getPaymentStatusColor = (estado: EstadoPago | null) => {
  switch (estado) {
    case 'Pagado':
      return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 border-transparent'
    case 'Pendiente':
      return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 border-transparent'
    case 'Rechazado':
      return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-500/25 border-transparent'
    default:
      return 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border-transparent'
  }
}
