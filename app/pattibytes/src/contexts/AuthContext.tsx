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
  user:           User | null
  profile:        Profile | null
  loading:        boolean
  pushToken:      string | null
  refreshProfile: () => Promise<void>
  signOut:        () => Promise<void>
}

const AuthContext = createContext<AuthCtx | undefined>(undefined)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,      setUser]      = useState<User | null>(null)
  const [profile,   setProfile]   = useState<Profile | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [pushToken, setPushToken] = useState<string | null>(null)

  const mounted        = useRef(true)
  const inflight       = useRef<Promise<Profile | null> | null>(null)
  const lastUid        = useRef<string | null>(null)
  const pushRegistered = useRef<Set<string>>(new Set())

  // ── Profile loader (deduped) ──────────────────────────────────────────────
  const loadProfile = useCallback(async (uid: string, force = false) => {
    if (!force && lastUid.current === uid && inflight.current) {
      return inflight.current
    }
    const p = inflight.current = getMyProfile(uid)
    const result = await p
    inflight.current = null
    if (mounted.current) setProfile(result)
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

  // ── Push registration — fire-and-forget ───────────────────────────────────
  const registerPushAsync = useCallback((uid: string) => {
    if (pushRegistered.current.has(uid)) return
    pushRegistered.current.add(uid)
    registerForPushNotifications(uid)
      .then(token => {
        if (mounted.current && token) setPushToken(token)
      })
      .catch(() => {
        pushRegistered.current.delete(uid)
      })
  }, [])

  // ── Handle sign-in ────────────────────────────────────────────────────────
  const handleSignedIn = useCallback(async (u: User) => {
    if (!mounted.current) return
    lastUid.current = u.id
    setUser(u)
    await loadProfile(u.id)
    registerPushAsync(u.id)
  }, [loadProfile, registerPushAsync])

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  useEffect(() => {
    mounted.current = true

    ;(async () => {
      try {
        const { data: { user: u } } = await supabase.auth.getUser()
        if (!mounted.current) return
        if (u) await handleSignedIn(u)
        else { setUser(null); setProfile(null) }
      } catch (e) {
        console.warn('[AuthContext] bootstrap error:', e)
      } finally {
        if (mounted.current) setLoading(false)
      }
    })()

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session) => {
        if (!mounted.current) return
        const u = session?.user ?? null

        if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
          setPushToken(null)
          inflight.current = null
          lastUid.current  = null
          pushRegistered.current.clear()
          return
        }

        if (event === 'TOKEN_REFRESHED') {
          setUser(prev => (prev?.id === u?.id ? prev : u))
          return
        }

        if (u) {
          if (lastUid.current !== u.id) {
            resetPushRegistration()
            pushRegistered.current.clear()
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

  // ── Foreground re-registration (1hr cooldown) ─────────────────────────────
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