import { useEffect } from 'react'
import { SparklesIcon } from 'lucide-react'
import { SWRConfig } from 'swr'
import { AuthProvider } from '@/components/auth-provider'
import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { ThemeProvider } from '@/components/theme-provider'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useAuth } from '@/hooks/use-auth'
import { NavigationProvider, useNavigation } from '@/hooks/use-navigation'
import { DashboardPage } from '@/pages/dashboard-page'
import { ExpensesPage } from '@/pages/expenses-page'
import { LoginPage } from '@/pages/login-page'
import { PaymentsPage } from '@/pages/payments-page'
import { SettingsPage } from '@/pages/settings-page'
import { StudentsPage } from '@/pages/students-page'

const PAGE_TITLES = {
  dashboard: 'Dashboard Principal',
  students: 'Gestion de Participantes',
  payments: 'Registro de Pagos',
  expenses: 'Control de Egresos',
  activities: 'Actividades de Recaudacion',
  settings: 'Configuracion',
} as const

const swrViewConfig = {
  revalidateOnFocus: false,
  revalidateIfStale: false,
  keepPreviousData: true,
  dedupingInterval: 30_000,
  focusThrottleInterval: 30_000,
}

function MainContent() {
  const { currentPage } = useNavigation()

  useEffect(() => {
    document.title = `${PAGE_TITLES[currentPage]} | Promocion Sistemas`
  }, [currentPage])

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader title={PAGE_TITLES[currentPage]} />
        {currentPage === 'dashboard' && <DashboardPage />}
        {currentPage === 'students' && <StudentsPage />}
        {currentPage === 'payments' && <PaymentsPage />}
        {currentPage === 'expenses' && <ExpensesPage />}
        {currentPage === 'activities' && (
          <div className="flex flex-1 items-center justify-center p-4">
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
                <SparklesIcon className="h-10 w-10 animate-pulse text-primary" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Proximamente</h2>
              <p className="mx-auto max-w-xs text-muted-foreground">
                Estamos preparando este modulo para gestionar actividades de
                recaudacion adicionales (rifas, eventos, etc).
              </p>
            </div>
          </div>
        )}
        {currentPage === 'settings' && <SettingsPage />}
      </SidebarInset>
    </SidebarProvider>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

function AppContent() {
  const { session, isInitializing } = useAuth()

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse space-y-4 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-muted" />
          <p className="font-medium tracking-tight text-muted-foreground">
            Cargando entorno...
          </p>
        </div>
      </div>
    )
  }

  return (
    <ThemeProvider defaultTheme="dark" storageKey="promo-ui-theme">
      <SWRConfig value={swrViewConfig}>
        <TooltipProvider>
          <Toaster position="top-center" />
          {!session ? (
            <LoginPage />
          ) : (
            <NavigationProvider>
              <MainContent />
            </NavigationProvider>
          )}
        </TooltipProvider>
      </SWRConfig>
    </ThemeProvider>
  )
}

export default App
