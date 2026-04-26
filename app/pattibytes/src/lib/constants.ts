// src/lib/constants.ts
// ─────────────────────────────────────────────────────────────────────────────
// COLORS is kept for backward-compat only — it is the Forest Green palette
// frozen at module load (cannot reflect theme changes at runtime).
//
// ⚠️  Do NOT use COLORS in component render logic or StyleSheet.create() calls.
//
//     Use `useColors()` from ThemeContext instead:
//       const colors = useColors()           // ← live, re-renders on theme change
//       const styles = useThemedStyles(c => ({...}))  // ← themed StyleSheet
//
//     COLORS is safe for:
//       • Non-component constants (STATUS_COLORS, STATUS_EMOJI)
//       • Default prop values
//       • One-off non-React utilities (e.g. a helper function that picks a color)
// ─────────────────────────────────────────────────────────────────────────────
import { getThemeById, DEFAULT_THEME_ID } from './themes'

export const COLORS = getThemeById(DEFAULT_THEME_ID).colors


export const APP_NAME    = 'Pattibytes Express'
export const DEVELOPER   = 'Thrillyverse'
export const APP_VERSION = '1.0.0'


export const ACTIVE_ORDER_STATUSES = [
  'pending','confirmed','preparing','ready',
  'assigned','pickedup','on_the_way','outfordelivery',
] as const


// These are intentionally static — they are data-semantic, not theme-semantic.
// Order status colours are the same regardless of which app theme is active.
export const STATUS_COLORS: Record<string, string> = {
  pending:        '#F59E0B',
  confirmed:      '#3B82F6',
  preparing:      '#8B5CF6',
  ready:          '#10B981',
  assigned:       '#06B6D4',
  pickedup:       '#F97316',
  on_the_way:     '#F97316',
  outfordelivery: '#84CC16',
  delivered:      '#22C55E',
  cancelled:      '#EF4444',
  rejected:       '#EF4444',
}

export const STATUS_EMOJI: Record<string, string> = {
  pending:        '🕐',
  confirmed:      '✅',
  preparing:      '👨\u200d🍳',
  ready:          '📦',
  assigned:       '🛵',
  pickedup:       '🛵',
  on_the_way:     '🚀',
  outfordelivery: '🏃',
  delivered:      '🎉',
  cancelled:      '❌',
  rejected:       '❌',
}
