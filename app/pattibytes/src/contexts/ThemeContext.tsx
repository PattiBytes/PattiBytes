// src/contexts/ThemeContext.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Priority chain (highest wins):
//   1. DB  (supabase profiles.theme_id)  — loaded on every sign-in
//   2. AsyncStorage                      — fast cold-boot
//   3. DEFAULT_THEME_ID                  — initial render placeholder
//
// Dark mode: 'system' | 'light' | 'dark' — stored in AsyncStorage only
//   'system' → follow Appearance.getColorScheme()
//   'light' / 'dark' → override regardless of system
// ─────────────────────────────────────────────────────────────────────────────
import React, {
  createContext, useCallback, useContext,
  useEffect, useMemo, useRef, useState,
} from 'react'
import { Appearance } from 'react-native'
import AsyncStorage   from '@react-native-async-storage/async-storage'
import { supabase }   from '../lib/supabase'
import {
  DEFAULT_THEME_ID, ThemeColors, getThemeById, resolveColors,
} from '../lib/themes'
import { logDeviceSession } from '../hooks/useSessionAnalytics'


const THEME_KEY  = 'pattibytes_theme_id'
const SCHEME_KEY = 'pattibytes_color_scheme'

export type ColorScheme = 'system' | 'light' | 'dark'

function isValidThemeId(id: string | null | undefined): id is string {
  return !!id && getThemeById(id).id === id
}


interface ThemeContextValue {
  themeId:       string
  setThemeId:    (id: string) => void
  colors:        ThemeColors
  isDark:        boolean
  colorScheme:   ColorScheme
  setColorScheme:(s: ColorScheme) => void
}


const ThemeContext = createContext<ThemeContextValue>({
  themeId:       DEFAULT_THEME_ID,
  setThemeId:    () => {},
  colors:        getThemeById(DEFAULT_THEME_ID).colors,
  isDark:        false,
  colorScheme:   'system',
  setColorScheme:() => {},
})


export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId,      setThemeIdState]    = useState(DEFAULT_THEME_ID)
  const [colorScheme,  setColorSchemeState]= useState<ColorScheme>('system')
  const [systemIsDark, setSystemIsDark]    = useState(
    () => Appearance.getColorScheme() === 'dark',
  )

  // Race-condition guard: DB is authoritative once resolved
  const dbResolvedRef = useRef(false)
  const syncedUserRef = useRef<string | null>(null)


  // ── 1. Boot: AsyncStorage → theme + scheme ────────────────────────────────
  useEffect(() => {
    ;(async () => {
      const [savedTheme, savedScheme] = await Promise.all([
        AsyncStorage.getItem(THEME_KEY).catch(() => null),
        AsyncStorage.getItem(SCHEME_KEY).catch(() => null),
      ])
      if (!dbResolvedRef.current && isValidThemeId(savedTheme)) {
        setThemeIdState(savedTheme)
      }
      if (savedScheme === 'light' || savedScheme === 'dark' || savedScheme === 'system') {
        setColorSchemeState(savedScheme)
      }
    })()
  }, [])


  // ── 2. System appearance listener ────────────────────────────────────────
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme: cs }) =>
      setSystemIsDark(cs === 'dark'),
    )
    return () => sub.remove()
  }, [])


  // ── 3. setThemeId — instant → AsyncStorage → Supabase ────────────────────
  const setThemeId = useCallback(async (id: string) => {
    if (!isValidThemeId(id)) return
    setThemeIdState(id)
    AsyncStorage.setItem(THEME_KEY, id).catch(() => {})
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) return
    supabase
      .from('profiles')
      .update({ theme_id: id })
      .eq('id', user.id)
      .then(({ error }) => {
        if (error && __DEV__) console.warn('[Theme] Supabase sync error', error.message)
      })
  }, [])


  // ── 4. setColorScheme — instant → AsyncStorage (local-only preference) ───
  const setColorScheme = useCallback((scheme: ColorScheme) => {
    setColorSchemeState(scheme)
    AsyncStorage.setItem(SCHEME_KEY, scheme).catch(() => {})
  }, [])


  // ── 5. Sign-in: load authoritative theme from DB ─────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const userId = session?.user?.id
        if (!userId) {
          syncedUserRef.current = null
          dbResolvedRef.current = false
          return
        }
        if (syncedUserRef.current === userId) return
        syncedUserRef.current = userId

        const { data, error } = await supabase
          .from('profiles')
          .select('theme_id')
          .eq('id', userId)
          .single()

        // DB wins — mark resolved so AsyncStorage cannot override
        dbResolvedRef.current = true
        if (!error && isValidThemeId(data?.theme_id)) {
          setThemeIdState(data.theme_id)
          AsyncStorage.setItem(THEME_KEY, data.theme_id).catch(() => {})
        }

        logDeviceSession(userId)
      },
    )
    return () => subscription.unsubscribe()
  }, [])


  // ── Derived values ────────────────────────────────────────────────────────
  const isDark = useMemo(() => {
    if (colorScheme === 'dark')  return true
    if (colorScheme === 'light') return false
    return systemIsDark   // 'system'
  }, [colorScheme, systemIsDark])

  const colors = useMemo(
    () => resolveColors(getThemeById(themeId), isDark),
    [themeId, isDark],
  )

  const value = useMemo<ThemeContextValue>(
    () => ({ themeId, setThemeId, colors, isDark, colorScheme, setColorScheme }),
    [themeId, setThemeId, colors, isDark, colorScheme, setColorScheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}


export function useTheme():  ThemeContextValue { return useContext(ThemeContext) }
export function useColors():  ThemeColors      { return useContext(ThemeContext).colors }
