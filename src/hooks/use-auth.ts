import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

export const useAuth = () => {
  const [session, setSession] = useState<Session | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    // 1. Obtener la sesión almacenada en LocalStorage si existe
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setIsInitializing(false)
    })

    // 2. Suscribirse a cambios en tiempo real (Logins y Logouts)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setIsInitializing(false) // Por precaución aseguramos remover el Skeleton
    })

    return () => subscription.unsubscribe()
  }, [])

  return { session, isInitializing }
}
