// src/hooks/useThemedStyles.ts
// ─────────────────────────────────────────────────────────────────────────────
// Drop-in replacement for StyleSheet.create() that re-computes whenever the
// active theme or dark-mode setting changes.
//
// Usage in ANY screen / component:
//   const styles = useThemedStyles(c => ({
//     container: { flex: 1, backgroundColor: c.background },
//     title:     { fontSize: 20, fontWeight: '700', color: c.text },
//     card:      { backgroundColor: c.card, borderRadius: 12, padding: 16 },
//   }))
//
// That's it. styles repaints automatically when the user changes theme.
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo }    from 'react'
import { StyleSheet } from 'react-native'
import { useColors }  from '../contexts/ThemeContext'
import type { ThemeColors } from '../lib/themes'


export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (colors: ThemeColors) => T,
): T {
  const colors = useColors()
  // useMemo so StyleSheet.create() only runs when colors identity changes
  // (ThemeContext only creates a new colors object when theme or dark mode changes)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => StyleSheet.create(factory(colors)), [colors])
}
