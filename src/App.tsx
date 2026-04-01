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
          'Configuración'
        } />
        {currentPage === 'dashboard' && <DashboardPage />}
        {currentPage === 'students' && <StudentsPage />}
        {currentPage === 'payments' && <PaymentsPage />}
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
