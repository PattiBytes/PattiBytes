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
} from "../lib/notificationHandler";

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

  const mounted = useRef(true)
  // Prevent concurrent profile fetches for same user
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

  /** Full sign-out: removes push token then calls supabase */
  const signOut = useCallback(async () => {
    if (user?.id) await deregisterPushToken(user.id)
    await supabase.auth.signOut()
    // onAuthStateChange SIGNED_OUT will clear state
  }, [user?.id])

  /** Called whenever a real user signs in or session restores */
  const handleSignedIn = useCallback(async (u: User) => {
    if (!mounted.current) return
    setUser(u)
    await loadProfile(u.id)
    // Register push after profile is loaded
    const token = await registerForPushNotifications(u.id)
    if (mounted.current && token) setPushToken(token)
  }, [loadProfile])

  useEffect(() => {
    mounted.current = true

    // 1. Hydrate existing session
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      const u = data.session?.user ?? null
      if (!mounted.current) return
      if (u) await handleSignedIn(u)
      else { setUser(null); setProfile(null) }
      setLoading(false)
    })()

    // 2. Listen to auth state changes
    const { data: sub } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session) => {
        if (!mounted.current) return
        const u = session?.user ?? null

        if (event === 'SIGNED_OUT') {
          setUser(null); setProfile(null); setPushToken(null)
          inflight.current = null; lastUid.current = null
          return
        }
        // TOKEN_REFRESHED fires frequently — only update user obj, skip profile re-fetch
        if (event === 'TOKEN_REFRESHED') {
          setUser(prev => (prev?.id === u?.id ? prev : u))
          return
        }
        if (u) {
          const profileChanged = lastUid.current !== u.id
          await handleSignedIn(u)
          if (!profileChanged) {
            // Still re-register push in case token rotated
            const token = await registerForPushNotifications(u.id)
            if (mounted.current && token) setPushToken(token)
          }
        } else {
          setUser(null); setProfile(null); setPushToken(null)
        }
      }
    )

    return () => {
      mounted.current = false
      sub.subscription.unsubscribe()
    }
  }, [handleSignedIn])

  // 3. Re-register push token when app comes back to foreground
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
