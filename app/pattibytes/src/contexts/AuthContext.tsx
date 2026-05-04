import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { getMyProfile, type Profile } from '../lib/profile'
import {
  registerForPushNotifications,
  deregisterPushToken,
  setupForegroundReregistration,
  resetPushRegistration,
} from '../lib/notificationHandler'

type AuthCtx = {
  user: User | null
  profile: Profile | null
  loading: boolean
  pushToken: string | null
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthCtx | undefined>(undefined)

const PROFILE_LOAD_TIMEOUT_MS = 8000
const SIGN_OUT_TIMEOUT_MS = 5000
const PUSH_DEREGISTER_TIMEOUT_MS = 2500
const PUSH_BOOT_DELAY_MS = 1200

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)

    promise
      .then(value => {
        clearTimeout(t)
        resolve(value)
      })
      .catch(error => {
        clearTimeout(t)
        reject(error)
      })
  })
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [pushToken, setPushToken] = useState<string | null>(null)

  const mounted = useRef(true)
  const inflight = useRef<Promise<Profile | null> | null>(null)
  const lastUid = useRef<string | null>(null)
  const pushRegistered = useRef<Set<string>>(new Set())
  const requestId = useRef(0)
  const profileRef = useRef<Profile | null>(null)
  const refreshPromiseRef = useRef<Promise<void> | null>(null)
  const signOutPromiseRef = useRef<Promise<void> | null>(null)
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    profileRef.current = profile
  }, [profile])

  const clearPushTimer = useCallback(() => {
    if (pushTimerRef.current) {
      clearTimeout(pushTimerRef.current)
      pushTimerRef.current = null
    }
  }, [])

  const clearLocalAuthState = useCallback(() => {
    requestId.current += 1
    inflight.current = null
    lastUid.current = null
    pushRegistered.current.clear()
    profileRef.current = null
    refreshPromiseRef.current = null
    clearPushTimer()
    setUser(null)
    setProfile(null)
    setPushToken(null)
    void resetPushRegistration()
  }, [clearPushTimer])

  const loadProfile = useCallback(async (uid: string, force = false) => {
    if (!uid) return null

    if (!force && profileRef.current?.id === uid) {
      return profileRef.current
    }

    if (!force && lastUid.current === uid && inflight.current) {
      return inflight.current
    }

    const rid = ++requestId.current
    const task = withTimeout(getMyProfile(uid), PROFILE_LOAD_TIMEOUT_MS, 'Profile load')

    inflight.current = task

    try {
      const result = await task

      if (!mounted.current) return result
      if (rid !== requestId.current) return result
      if (lastUid.current !== uid) return result

      profileRef.current = result
      setProfile(result)
      return result
    } catch (err) {
      if (mounted.current && rid === requestId.current && lastUid.current === uid) {
        console.warn('[AuthContext] loadProfile failed:', err)
      }
      throw err
    } finally {
      if (inflight.current === task) {
        inflight.current = null
      }
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (refreshPromiseRef.current) return refreshPromiseRef.current

    const uid = user?.id ?? lastUid.current
    if (!uid) return Promise.resolve()

    const task = (async () => {
      try {
        await loadProfile(uid, true)
      } finally {
        refreshPromiseRef.current = null
      }
    })()

    refreshPromiseRef.current = task
    return task
  }, [user?.id, loadProfile])

  const registerPushAsync = useCallback((uid: string) => {
    if (!uid) return
    if (pushRegistered.current.has(uid)) return

    pushRegistered.current.add(uid)

    registerForPushNotifications(uid)
      .then(token => {
        if (!mounted.current || !token) return
        if (lastUid.current !== uid) return
        setPushToken(token)
      })
      .catch(err => {
        console.warn('[AuthContext] push registration failed:', err)
        pushRegistered.current.delete(uid)
      })
  }, [])

  const schedulePushRegistration = useCallback(
    (uid: string, delayMs = 0) => {
      if (!uid) return
      clearPushTimer()

      pushTimerRef.current = setTimeout(() => {
        pushTimerRef.current = null
        registerPushAsync(uid)
      }, delayMs)
    },
    [clearPushTimer, registerPushAsync]
  )

  const handleSignedIn = useCallback(
    (
      u: User,
      opts?: {
        forceProfile?: boolean
        deferPush?: boolean
      }
    ) => {
      if (!mounted.current) return

      const prevUid = lastUid.current
      const idChanged = prevUid !== u.id

      lastUid.current = u.id
      setUser(prev => (prev?.id === u.id ? prev : u))

      if (idChanged) {
        requestId.current += 1
        inflight.current = null
        profileRef.current = null
        setProfile(null)
        setPushToken(null)
      }

      void loadProfile(u.id, opts?.forceProfile ?? idChanged).catch(() => {})
      schedulePushRegistration(u.id, opts?.deferPush ? PUSH_BOOT_DELAY_MS : 0)
    },
    [loadProfile, schedulePushRegistration]
  )

  const signOut = useCallback(async () => {
    if (signOutPromiseRef.current) return signOutPromiseRef.current

    const uid = user?.id ?? lastUid.current ?? null

    const task = (async () => {
      try {
        setLoading(true)

        const signOutTask = withTimeout(
          supabase.auth.signOut(),
          SIGN_OUT_TIMEOUT_MS,
          'Supabase signOut'
        ).catch(err => {
          console.warn('[AuthContext] signOut error:', err)
        })

        const deregisterTask = uid
          ? withTimeout(
              deregisterPushToken(uid),
              PUSH_DEREGISTER_TIMEOUT_MS,
              'Push deregistration'
            ).catch(err => {
              console.warn('[AuthContext] deregister push token failed:', err)
            })
          : Promise.resolve()

        await Promise.allSettled([signOutTask, deregisterTask])
      } finally {
        clearLocalAuthState()
        if (mounted.current) {
          setLoading(false)
        }
        signOutPromiseRef.current = null
      }
    })()

    signOutPromiseRef.current = task
    return task
  }, [user?.id, clearLocalAuthState])

  useEffect(() => {
    mounted.current = true

    const applySession = (
      event: AuthChangeEvent | 'BOOTSTRAP',
      session: Session | null
    ) => {
      if (!mounted.current) return

      const u = session?.user ?? null

      if (event === 'SIGNED_OUT') {
        clearLocalAuthState()
        setLoading(false)
        return
      }

      if (event === 'TOKEN_REFRESHED') {
        if (!u) return

        lastUid.current = u.id
        setUser(prev => (prev?.id === u.id ? prev : u))

        if (!profileRef.current) {
          void loadProfile(u.id, false).catch(() => {})
        }

        setLoading(false)
        return
      }

      if (!u) {
        clearLocalAuthState()
        setLoading(false)
        return
      }

      const idChanged = lastUid.current !== u.id

      if (idChanged) {
        pushRegistered.current.clear()
        void resetPushRegistration()
      }

      handleSignedIn(u, {
        forceProfile: event === 'USER_UPDATED' || idChanged,
        deferPush: event === 'BOOTSTRAP',
      })

      setLoading(false)
    }

    const { data: sub } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session) => {
        applySession(event, session)
      }
    )

    ;(async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error) throw error
        applySession('BOOTSTRAP', session)
      } catch (e) {
        console.warn('[AuthContext] bootstrap error:', e)
        if (!mounted.current) return
        setLoading(false)
      }
    })()

    return () => {
      mounted.current = false
      clearPushTimer()
      sub.subscription.unsubscribe()
    }
  }, [clearLocalAuthState, clearPushTimer, handleSignedIn, loadProfile])

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