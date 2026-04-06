import { QuotasConfigView } from '@/features/settings/components/quotas-config-view'

export function SettingsPage() {
  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 md:p-8 pt-4 sm:pt-6">


      <QuotasConfigView />
    </div>
  )
}
