import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import type { Tables } from '@/types/database.types'

export type UserProfile = Tables<'perfiles'>

export const useAuth = () => {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      
      if (error) throw error
      setProfile(data)
    } catch (error) {
      // Si hay un error real (no solo un 404), lo logeamos
      console.error('Error fetching profile:', error)
      setProfile(null)
    }
  }

  useEffect(() => {
    // 1. Obtener la sesión almacenada en LocalStorage si existe
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        fetchProfile(session.user.id)
      }
      setIsInitializing(false)
    })

    // 2. Suscribirse a cambios en tiempo real (Logins y Logouts)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
      setIsInitializing(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return { session, profile, isInitializing, refreshProfile: () => session?.user && fetchProfile(session.user.id) }
}
