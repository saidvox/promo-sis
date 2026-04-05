import { QuotasConfigView } from '@/features/settings/components/quotas-config-view'

export function SettingsPage() {
  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 md:p-8 pt-4 sm:pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Ajustes Generales</h2>
          <p className="text-sm text-muted-foreground">Configuración maestra para contabilidad, permisos y preferencias de la promoción.</p>
        </div>
      </div>

      <QuotasConfigView />
    </div>
  )
}
