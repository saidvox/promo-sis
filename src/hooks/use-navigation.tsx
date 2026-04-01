import { createContext, useContext, useState, type ReactNode } from "react"

export type PageView = "dashboard" | "students" | "payments" | "expenses" | "settings"

interface NavigationContextType {
  currentPage: PageView
  navigate: (page: PageView) => void
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined)

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [currentPage, setCurrentPage] = useState<PageView>("dashboard")

  const navigate = (page: PageView) => {
    setCurrentPage(page)
  }

  return (
    <NavigationContext.Provider value={{ currentPage, navigate }}>
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  const context = useContext(NavigationContext)
  if (context === undefined) {
    throw new Error("useNavigation must be used within a NavigationProvider")
  }
  return context
}
