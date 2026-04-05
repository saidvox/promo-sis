import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ThemeProvider } from '@/components/theme-provider'
import { useAuth } from '@/hooks/use-auth'
import { LoginPage } from '@/pages/login-page'
import { DashboardPage } from '@/pages/dashboard-page'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'

import { NavigationProvider, useNavigation } from '@/hooks/use-navigation'
import { StudentsPage } from '@/pages/students-page'
import { PaymentsPage } from '@/pages/payments-page'
import { SettingsPage } from '@/pages/settings-page'
import { ExpensesPage } from '@/pages/expenses-page'
import { SparklesIcon } from 'lucide-react'

function MainContent() {
  const { currentPage } = useNavigation()

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader title={
          currentPage === 'dashboard' ? 'Dashboard Principal' :
          currentPage === 'students' ? 'Gestión de Participantes' :
          currentPage === 'payments' ? 'Registro de Pagos' :
          currentPage === 'expenses' ? 'Control de Egresos' :
          currentPage === 'activities' ? 'Actividades de Recaudación' :
          'Configuración'
        } />
        {currentPage === 'dashboard' && <DashboardPage />}
        {currentPage === 'students' && <StudentsPage />}
        {currentPage === 'payments' && <PaymentsPage />}
        {currentPage === 'expenses' && <ExpensesPage />}
        {currentPage === 'activities' && (
          <div className="flex flex-1 items-center justify-center p-4">
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
                <SparklesIcon className="h-10 w-10 text-primary animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Próximamente</h2>
              <p className="text-muted-foreground max-w-xs mx-auto">
                Estamos preparando este módulo para gestionar actividades de recaudación adicionales (rifas, eventos, etc).
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
      <TooltipProvider>
        <Toaster position="top-center" theme="dark" />
        {!session ? (
          <LoginPage />
        ) : (
          <NavigationProvider>
            <MainContent />
          </NavigationProvider>
        )}
      </TooltipProvider>
    </ThemeProvider>
  )
}

export default App
