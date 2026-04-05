import { PaymentsMatrix } from '@/features/payments/components/payments-matrix'

export function PaymentsPage() {
  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="w-full">
        {/* Renderizado de Matriz Pura (Sin Pestañas) */}
        <PaymentsMatrix />
      </div>
    </div>
  )
}
