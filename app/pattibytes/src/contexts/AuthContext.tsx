import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getMyProfile, type Profile } from '../lib/profile'

type AuthCtx = {
  user_metadata: any
  email: any
  id(arg0: string, id: any): unknown
  user: any | null
  profile: Profile | null
  loading: boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<any | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const mountedRef             = useRef(true)

  const loadProfile = useCallback(async (uid: string) => {
    const p = await getMyProfile(uid)
    if (mountedRef.current) setProfile(p)
    return p
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user?.id) await loadProfile(user.id)
  }, [user?.id, loadProfile])

  useEffect(() => {
    mountedRef.current = true

    // 1. Restore existing session on app open
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mountedRef.current) return
      const u = data.session?.user ?? null
      setUser(u)
      if (u) {
        await loadProfile(u.id)
      }
      setLoading(false)
    })

    // 2. Listen for sign-in / sign-out / token refresh
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mountedRef.current) return

      const u = session?.user ?? null
      setUser(u)

      if (u) {
        // Keep loading=false; profile update will trigger RootGuard re-run via state
        await loadProfile(u.id)
      } else {
        setProfile(null)
      }
    })

    return () => {
      mountedRef.current = false
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
