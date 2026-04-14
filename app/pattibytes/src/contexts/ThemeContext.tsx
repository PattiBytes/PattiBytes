import React, {
  createContext, useCallback, useContext,
  useEffect, useMemo, useState,
} from 'react'
import { useColorScheme } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

const THEME_KEY = 'app_theme'

// ── Token palette ─────────────────────────────────────────────────────────────
export const LIGHT_THEME = {
  dark: false,
  bg:            '#F8F9FA',
  surface:       '#FFFFFF',
  surfaceOffset: '#F3F4F6',
  border:        '#E5E7EB',
  text:          '#111827',
  textMuted:     '#6B7280',
  textFaint:     '#9CA3AF',
  primary:       '#FF6B35',
  primaryBg:     '#FFF0EA',
  card:          '#FFFFFF',
  headerBg:      '#FF6B35',
  skeleton:      '#E5E7EB',
  skeletonShine: '#F3F4F6',
  statusBar:     'dark' as const,
}

export const DARK_THEME = {
  dark: true,
  bg:            '#0F0F0F',
  surface:       '#1A1A1A',
  surfaceOffset: '#242424',
  border:        '#2E2E2E',
  text:          '#F9FAFB',
  textMuted:     '#9CA3AF',
  textFaint:     '#4B5563',
  primary:       '#FF7A45',
  primaryBg:     '#2D1A10',
  card:          '#1A1A1A',
  headerBg:      '#1E1E1E',
  skeleton:      '#2A2A2A',
  skeletonShine: '#333333',
  statusBar:     'light' as const,
}

export type AppTheme = Omit<typeof LIGHT_THEME, 'statusBar'> & { statusBar: 'dark' | 'light' }
type ThemeMode = 'light' | 'dark' | 'system'

type ThemeCtx = {
  theme:       AppTheme
  mode:        ThemeMode
  toggleTheme: () => void
  setMode:     (m: ThemeMode) => void
}

const Ctx = createContext<ThemeCtx | undefined>(undefined)

export function useTheme() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useTheme must be used inside ThemeProvider')
  return c
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme()               // 'light' | 'dark' | null
  const [mode, setModeState] = useState<ThemeMode>('system')

  // Load persisted preference
  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY)
      .then(v => { if (v) setModeState(v as ThemeMode) })
      .catch(() => {})
  }, [])

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m)
    AsyncStorage.setItem(THEME_KEY, m).catch(() => {})
  }, [])

  const toggleTheme = useCallback(() => {
    setMode(mode === 'dark' ? 'light' : 'dark')
  }, [mode, setMode])

  const theme = useMemo<AppTheme>(() => {
    const effective = mode === 'system' ? (system ?? 'light') : mode
    return effective === 'dark' ? DARK_THEME : LIGHT_THEME
  }, [mode, system])

  return (
    <Ctx.Provider value={{ theme, mode, toggleTheme, setMode }}>
      {children}
    </Ctx.Provider>
  )
}