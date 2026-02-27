// src/contexts/AuthContext.tsx
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getMyProfile, type Profile } from '../lib/profile'
import type { User } from '@supabase/supabase-js'

type AuthCtx = {
  user: User | null
  profile: Profile | null
  loading: boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthCtx | undefined>(undefined)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const mounted = useRef(true)

  const loadProfile = useCallback(async (uid: string) => {
    const p = await getMyProfile(uid)
    if (mounted.current) setProfile(p)
    return p
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return
    await loadProfile(user.id)
  }, [user?.id, loadProfile])

  useEffect(() => {
    mounted.current = true

    ;(async () => {
      const { data } = await supabase.auth.getSession()
      const u = data.session?.user ?? null
      if (!mounted.current) return
      setUser(u)
      if (u) await loadProfile(u.id)
      setLoading(false)
    })()

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null
      if (!mounted.current) return
      setUser(u)
      if (u) await loadProfile(u.id)
      else setProfile(null)
    })

    return () => {
      mounted.current = false
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}
