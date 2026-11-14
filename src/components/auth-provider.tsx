import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'
import type { Tables } from '@/types/database.types'

export type UserProfile = Tables<'perfiles'>

export type AuthContextValue = {
  session: Session | null
  profile: UserProfile | null
  isInitializing: boolean
  isProfileLoading: boolean
  profileError: Error | undefined
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

async function fetchProfile([, userId]: readonly [string, string]) {
  const { data, error } = await supabase.from('perfiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  return data
}

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const { data: profileData, error: profileError, isLoading, mutate } = useSWR<UserProfile | null, Error>(
    session?.user.id ? ['auth/profile', session.user.id] as const : null,
    fetchProfile,
    { revalidateOnFocus: false, keepPreviousData: false, dedupingInterval: 60_000 }
  )
  const profile = session ? profileData ?? null : null
  const isProfileLoading = Boolean(session && isLoading && profileData === undefined)
  const refreshProfile = useCallback(async () => { await mutate() }, [mutate])

  useEffect(() => {
    let active = true
    let eventCount = 0
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      eventCount++
      if (!active) return
      setSession(nextSession)
      setIsInitializing(false)
    })
    const initialEventCount = eventCount
    void supabase.auth.getSession().then(({ data }) => {
      if (active && eventCount === initialEventCount) {
        setSession(data.session)
        setIsInitializing(false)
      }
    }).catch(() => {
      if (active && eventCount === initialEventCount) {
        setSession(null)
        setIsInitializing(false)
      }
    })
    return () => { active = false; subscription.unsubscribe() }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      isInitializing,
      isProfileLoading,
      profileError,
      refreshProfile,
    }),
    [session, profile, isInitializing, isProfileLoading, profileError, refreshProfile]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
