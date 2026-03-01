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
      lastUid.current = result?.id ?? null
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
    // SIGNED_OUT event clears state below
  }, [user?.id])

  // ✅ Single source of truth for push registration
  // Called only on actual sign-in, not on every auth event
  const handleSignedIn = useCallback(async (u: User) => {
    if (!mounted.current) return
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

        // TOKEN_REFRESHED fires very frequently — only update user object
        // ✅ Do NOT re-register push here — module guard handles rotation
        if (event === 'TOKEN_REFRESHED') {
          setUser(prev => (prev?.id === u?.id ? prev : u))
          return
        }

        // SIGNED_IN, USER_UPDATED, etc.
        if (u) {
          // ✅ Only call handleSignedIn for new users (different uid)
          // For same user re-auth, just refresh token — push guard handles the rest
          if (lastUid.current !== u.id) {
            resetPushRegistration() // new user — allow fresh registration
            await handleSignedIn(u)
          } else {
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

  // 3. Re-register when app comes back to foreground (with 1hr cooldown in handler)
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
