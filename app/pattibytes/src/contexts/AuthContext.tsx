// src/contexts/AuthContext.tsx
import React, {
  createContext, useCallback, useContext,
  useEffect, useRef, useState,
} from 'react'
import type { AuthChangeEvent, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { getMyProfile, type Profile } from '../lib/profile'
import {
  registerForPushNotifications,
  deregisterPushToken,
  setupForegroundReregistration,
  resetPushRegistration,
} from '../lib/notificationHandler'

type AuthCtx = {
  [x: string]: any
  user: User | null
  profile: Profile | null
  loading: boolean
  pushToken: string | null
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthCtx | undefined>(undefined)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]           = useState<User | null>(null)
  const [profile, setProfile]     = useState<Profile | null>(null)
  const [loading, setLoading]     = useState(true)
  const [pushToken, setPushToken] = useState<string | null>(null)

  const mounted  = useRef(true)
  const inflight = useRef<Promise<Profile | null> | null>(null)
  const lastUid  = useRef<string | null>(null)

  const loadProfile = useCallback(async (uid: string, force = false) => {
    if (!force && lastUid.current === uid && inflight.current) {
      return inflight.current
    }
    const p = inflight.current = getMyProfile(uid)
    const result = await p
    inflight.current = null
    if (mounted.current) {
      setProfile(result)
      // ✅ lastUid is already set in handleSignedIn — don't overwrite here
    }
    return result
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return
    await loadProfile(user.id, true)
  }, [user?.id, loadProfile])

  const signOut = useCallback(async () => {
    if (user?.id) await deregisterPushToken(user.id)
    await supabase.auth.signOut()
  }, [user?.id])

  const handleSignedIn = useCallback(async (u: User) => {
    if (!mounted.current) return

    // ✅ Set lastUid IMMEDIATELY (synchronously) before any await
    // This is the fix — prevents onAuthStateChange SIGNED_IN from
    // racing with getSession() and calling handleSignedIn twice
    lastUid.current = u.id

    setUser(u)
    await loadProfile(u.id)
    const token = await registerForPushNotifications(u.id)
    if (mounted.current && token) setPushToken(token)
  }, [loadProfile])

  useEffect(() => {
    mounted.current = true

    // 1. Hydrate existing session on app start
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      const u = data.session?.user ?? null
      if (!mounted.current) return
      if (u) await handleSignedIn(u)
      else { setUser(null); setProfile(null) }
      setLoading(false)
    })()

    // 2. Auth state changes
    const { data: sub } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session) => {
        if (!mounted.current) return
        const u = session?.user ?? null

        if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
          setPushToken(null)
          inflight.current = null
          lastUid.current = null
          return
        }

        // TOKEN_REFRESHED fires frequently — only update user object, skip everything else
        if (event === 'TOKEN_REFRESHED') {
          setUser(prev => (prev?.id === u?.id ? prev : u))
          return
        }

        if (u) {
          // ✅ lastUid.current is now set synchronously in handleSignedIn
          // so this check correctly prevents the race condition
          if (lastUid.current !== u.id) {
            resetPushRegistration() // different user — allow fresh registration
            await handleSignedIn(u)
          } else {
            // Same user already being handled — just update user object
            setUser(u)
          }
        } else {
          setUser(null)
          setProfile(null)
          setPushToken(null)
        }
      }
    )

    return () => {
      mounted.current = false
      sub.subscription.unsubscribe()
    }
  }, [handleSignedIn])

  // 3. Re-register when app comes back to foreground (1hr cooldown in handler)
  useEffect(() => {
    if (!user?.id) return
    const cleanup = setupForegroundReregistration(user.id)
    return cleanup
  }, [user?.id])

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, pushToken, refreshProfile, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}
