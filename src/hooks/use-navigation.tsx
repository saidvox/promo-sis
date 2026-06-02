import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

export type PageView = "dashboard" | "students" | "payments" | "expenses" | "activities" | "settings" | "audit"

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
  "audit",
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

export function NavigationProvider({ children }: { readonly children: ReactNode }) {
  const [currentPage, setCurrentPage] = useState<PageView>(() => {
    if (typeof window === "undefined") return DEFAULT_PAGE
    return getPageFromHash(globalThis.location.hash)
  })

  useEffect(() => {
    const syncPageFromHash = () => {
      const nextPage = getPageFromHash(globalThis.location.hash)
      setCurrentPage(nextPage)

      const expectedHash = getHashForPage(nextPage)
      if (globalThis.location.hash !== expectedHash) {
        globalThis.history.replaceState(null, "", expectedHash)
      }
    }

    syncPageFromHash()
    globalThis.addEventListener("hashchange", syncPageFromHash)
    return () => globalThis.removeEventListener("hashchange", syncPageFromHash)
  }, [])

  const navigate = useCallback((page: PageView) => {
    const nextHash = getHashForPage(page)
    if (globalThis.location.hash === nextHash) {
      setCurrentPage(page)
      return
    }

    globalThis.location.hash = nextHash
  }, [])
  const value = useMemo(() => ({ currentPage, navigate }), [currentPage, navigate])

  return (
    <NavigationContext.Provider value={value}>
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
