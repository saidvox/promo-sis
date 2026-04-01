import { PaymentsMatrix } from '@/features/payments/components/payments-matrix'
import { CreateInscripcionDialog } from '@/features/payments/components/create-inscripcion-dialog'

export function PaymentsPage() {
  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Sábana de Control Financiero</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Visualiza y administra instantáneamente el flujo de caja. 
            Solo alumnos inscritos aparecerán en la matriz.
          </p>
        </div>
        
        {/* Portal Principal de Inscripción */}
        <div className="flex items-center gap-2">
          <CreateInscripcionDialog />
        </div>
      </div>

      <div className="w-full">
        {/* Renderizado de Matriz Pura (Sin Pestañas) */}
        <PaymentsMatrix />
      </div>
    </div>
  )
}
