import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

export type PageView = "dashboard" | "students" | "payments" | "expenses" | "activities" | "settings"

interface NavigationContextType {
  currentPage: PageView
  navigate: (page: PageView) => void
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined)
const DEFAULT_PAGE: PageView = "dashboard"
const VALID_PAGES = new Set<PageView>([
  "dashboard",
  "students",
  "payments",
  "expenses",
  "activities",
  "settings",
])

function getPageFromHash(hash: string): PageView {
  const normalizedHash = hash.replace(/^#\/?/, "").trim()
  if (normalizedHash === "") return DEFAULT_PAGE

  return VALID_PAGES.has(normalizedHash as PageView)
    ? (normalizedHash as PageView)
    : DEFAULT_PAGE
}

function getHashForPage(page: PageView) {
  return page === DEFAULT_PAGE ? "#/" : `#/${page}`
}

export function getPageHref(page: PageView) {
  return getHashForPage(page)
}

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [currentPage, setCurrentPage] = useState<PageView>(() => {
    if (typeof window === "undefined") return DEFAULT_PAGE
    return getPageFromHash(window.location.hash)
  })

  useEffect(() => {
    const syncPageFromHash = () => {
      const nextPage = getPageFromHash(window.location.hash)
      setCurrentPage(nextPage)

      const expectedHash = getHashForPage(nextPage)
      if (window.location.hash !== expectedHash) {
        window.history.replaceState(null, "", expectedHash)
      }
    }

    syncPageFromHash()
    window.addEventListener("hashchange", syncPageFromHash)
    return () => window.removeEventListener("hashchange", syncPageFromHash)
  }, [])

  const navigate = (page: PageView) => {
    const nextHash = getHashForPage(page)
    if (window.location.hash === nextHash) {
      setCurrentPage(page)
      return
    }

    window.location.hash = nextHash
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
