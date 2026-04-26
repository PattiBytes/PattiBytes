// src/lib/themes.ts
// ─────────────────────────────────────────────────────────────────────────────
// 7 curated themes + automatic dark-mode layer.
//
// Every token that was `undefined` is now a real value derived from the theme's
// primary palette so profileStyles / Section / InfoRow / address cards all
// repaint correctly.
//
// Both `name` and `label` are set identically — `name` keeps backward-compat
// with existing code; `label` is what ProfileTab's Appearance row reads.
// ─────────────────────────────────────────────────────────────────────────────

export interface ThemeColors {
  // ── Core accent ───────────────────────────────────────────────────────────
  primary:          string   // buttons, links, icons
  secondary:        string   // secondary accent

  // ── Tinted surfaces (active tabs, default address card, label chips) ──────
  primaryBg:        string   // soft primary-tinted surface
  primaryBorder:    string   // soft primary-tinted border

  // ── Surfaces ──────────────────────────────────────────────────────────────
  background:       string   // page background
  backgroundLight:  string   // section / card inner bg
  backgroundOffset: string   // disabled inputs, ghost buttons
  card:             string   // elevated card bg

  // ── Text ──────────────────────────────────────────────────────────────────
  text:             string   // primary body text
  textLight:        string   // labels, subtitles (#4B5563 equivalent)
  textMuted:        string   // placeholders, meta  (#9CA3AF equivalent)
  textFaint:        string   // footer copy, divider labels  (#D1D5DB equivalent)

  // ── Borders ───────────────────────────────────────────────────────────────
  border:           string   // standard border
  borderFaint:      string   // row dividers (very subtle)

  // ── Semantic (fixed across all themes) ────────────────────────────────────
  danger:           string
  warning:          string
  info:             string
  success:          string
  orange:           string
}

export interface Theme {
  id:          string
  name:        string   // backward-compat
  label:       string   // same value — used in ProfileTab Appearance row
  emoji:       string
  description: string
  colors:      ThemeColors
  dark?:       Partial<ThemeColors>
}

// ── Semantic colours never change with theme ──────────────────────────────────
const FIXED: Pick<ThemeColors, 'danger'|'warning'|'info'|'success'|'orange'> = {
  danger:  '#ef4444',
  warning: '#f59e0b',
  info:    '#3b82f6',
  success: '#22c55e',
  orange:  '#FF6B35',
}

// ── Neutral tokens shared across ALL light themes ─────────────────────────────
// (disabled bg, row dividers, ultra-faint text) — these are palette-neutral
const NEUTRAL_LIGHT = {
  backgroundOffset: '#f3f4f6',
  borderFaint:      '#f3f4f6',
  textFaint:        '#d1d5db',
}
const NEUTRAL_DARK = {
  backgroundOffset: '#1f2937',
  borderFaint:      '#1f2937',
  textFaint:        '#374151',
}


// ─────────────────────────────────────────────────────────────────────────────
// 1. Forest Green — DEFAULT
// ─────────────────────────────────────────────────────────────────────────────
const forestGreen: Theme = {
  id: 'forest-green', name: 'Forest Green', label: 'Forest Green',
  emoji: '🌿', description: 'Fresh & natural',
  colors: {
    ...FIXED,
    ...NEUTRAL_LIGHT,
    primary:         '#15803d',
    secondary:       '#0d9488',
    primaryBg:       '#f0fdf4',   // green-50
    primaryBorder:   '#86efac',   // green-300
    background:      '#ffffff',
    backgroundLight: '#f0fdf4',
    card:            '#ffffff',
    text:            '#14241a',
    textLight:       '#4b7a5e',
    textMuted:       '#86a894',
    border:          '#bbf7d0',
  },
  dark: {
    ...NEUTRAL_DARK,
    primary:         '#22c55e',
    primaryBg:       '#052e16',
    primaryBorder:   '#166534',
    background:      '#0d1f14',
    backgroundLight: '#132018',
    card:            '#1a2e1e',
    text:            '#d1fae5',
    textLight:       '#6ee7a7',
    textMuted:       '#4a7a5a',
    border:          '#1e4d2c',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Saffron Orange — original PattiBytes
// ─────────────────────────────────────────────────────────────────────────────
const saffronOrange: Theme = {
  id: 'saffron-orange', name: 'Saffron Orange', label: 'Saffron Orange',
  emoji: '🍊', description: 'Original warm vibe',
  colors: {
    ...FIXED,
    ...NEUTRAL_LIGHT,
    primary:         '#FF6B35',
    secondary:       '#4CAF50',
    primaryBg:       '#fff7ed',   // orange-50
    primaryBorder:   '#fed7aa',   // orange-200
    background:      '#ffffff',
    backgroundLight: '#fff7ed',
    card:            '#ffffff',
    text:            '#1A1A1A',
    textLight:       '#78350f',
    textMuted:       '#a16207',
    border:          '#fde68a',
  },
  dark: {
    ...NEUTRAL_DARK,
    primary:         '#fb923c',
    primaryBg:       '#431407',
    primaryBorder:   '#7c2d12',
    background:      '#1a0f05',
    backgroundLight: '#2a1808',
    card:            '#301f0e',
    text:            '#fde8d0',
    textLight:       '#fb923c',
    textMuted:       '#78400e',
    border:          '#7c2d12',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Royal Blue
// ─────────────────────────────────────────────────────────────────────────────
const royalBlue: Theme = {
  id: 'royal-blue', name: 'Royal Blue', label: 'Royal Blue',
  emoji: '💙', description: 'Clean & trustworthy',
  colors: {
    ...FIXED,
    ...NEUTRAL_LIGHT,
    primary:         '#1d4ed8',
    secondary:       '#7c3aed',
    primaryBg:       '#eff6ff',   // blue-50
    primaryBorder:   '#bfdbfe',   // blue-200
    background:      '#ffffff',
    backgroundLight: '#eff6ff',
    card:            '#ffffff',
    text:            '#0f172a',
    textLight:       '#3b5998',
    textMuted:       '#7e8faf',
    border:          '#bfdbfe',
  },
  dark: {
    ...NEUTRAL_DARK,
    primary:         '#60a5fa',
    primaryBg:       '#1e3a5f',
    primaryBorder:   '#1e3a8a',
    background:      '#070e1f',
    backgroundLight: '#0f1d38',
    card:            '#152444',
    text:            '#dbeafe',
    textLight:       '#93c5fd',
    textMuted:       '#3b5998',
    border:          '#1e3a8a',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Midnight Purple
// ─────────────────────────────────────────────────────────────────────────────
const midnightPurple: Theme = {
  id: 'midnight-purple', name: 'Midnight Purple', label: 'Midnight Purple',
  emoji: '🔮', description: 'Bold & premium',
  colors: {
    ...FIXED,
    ...NEUTRAL_LIGHT,
    primary:         '#7c3aed',
    secondary:       '#db2777',
    primaryBg:       '#f5f3ff',   // violet-50
    primaryBorder:   '#ddd6fe',   // violet-200
    background:      '#ffffff',
    backgroundLight: '#f5f3ff',
    card:            '#ffffff',
    text:            '#13042a',
    textLight:       '#5b21b6',
    textMuted:       '#8b7aaa',
    border:          '#ddd6fe',
  },
  dark: {
    ...NEUTRAL_DARK,
    primary:         '#a78bfa',
    primaryBg:       '#2e1065',
    primaryBorder:   '#4c1d95',
    background:      '#0d0718',
    backgroundLight: '#180e2e',
    card:            '#22103e',
    text:            '#ede9fe',
    textLight:       '#c4b5fd',
    textMuted:       '#6d28d9',
    border:          '#4c1d95',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Rose Gold
// ─────────────────────────────────────────────────────────────────────────────
const roseGold: Theme = {
  id: 'rose-gold', name: 'Rose Gold', label: 'Rose Gold',
  emoji: '🌸', description: 'Elegant & chic',
  colors: {
    ...FIXED,
    ...NEUTRAL_LIGHT,
    primary:         '#be185d',
    secondary:       '#9d4edd',
    primaryBg:       '#fdf2f8',   // pink-50
    primaryBorder:   '#fbcfe8',   // pink-200
    background:      '#ffffff',
    backgroundLight: '#fdf2f8',
    card:            '#ffffff',
    text:            '#1a0711',
    textLight:       '#9d174d',
    textMuted:       '#a87090',
    border:          '#fbcfe8',
  },
  dark: {
    ...NEUTRAL_DARK,
    primary:         '#f472b6',
    primaryBg:       '#500724',
    primaryBorder:   '#831843',
    background:      '#1a0710',
    backgroundLight: '#280f1c',
    card:            '#3a1428',
    text:            '#fce7f3',
    textLight:       '#f9a8d4',
    textMuted:       '#831843',
    border:          '#831843',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Deep Teal
// ─────────────────────────────────────────────────────────────────────────────
const deepTeal: Theme = {
  id: 'deep-teal', name: 'Deep Teal', label: 'Deep Teal',
  emoji: '🌊', description: 'Ocean & calm',
  colors: {
    ...FIXED,
    ...NEUTRAL_LIGHT,
    primary:         '#0d9488',
    secondary:       '#2563eb',
    primaryBg:       '#f0fdfa',   // teal-50
    primaryBorder:   '#99f6e4',   // teal-200
    background:      '#ffffff',
    backgroundLight: '#f0fdfa',
    card:            '#ffffff',
    text:            '#042f2e',
    textLight:       '#0f766e',
    textMuted:       '#6ba8a2',
    border:          '#99f6e4',
  },
  dark: {
    ...NEUTRAL_DARK,
    primary:         '#2dd4bf',
    primaryBg:       '#042f2e',
    primaryBorder:   '#134e4a',
    background:      '#021a18',
    backgroundLight: '#082826',
    card:            '#0e3a38',
    text:            '#ccfbf1',
    textLight:       '#2dd4bf',
    textMuted:       '#0f766e',
    border:          '#134e4a',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Crimson Red
// ─────────────────────────────────────────────────────────────────────────────
const crimsonRed: Theme = {
  id: 'crimson-red', name: 'Crimson Red', label: 'Crimson Red',
  emoji: '🔴', description: 'Bold & energetic',
  colors: {
    ...FIXED,
    ...NEUTRAL_LIGHT,
    primary:         '#dc2626',
    secondary:       '#ea580c',
    primaryBg:       '#fef2f2',   // red-50
    primaryBorder:   '#fecaca',   // red-200
    background:      '#ffffff',
    backgroundLight: '#fef2f2',
    card:            '#ffffff',
    text:            '#1c0606',
    textLight:       '#991b1b',
    textMuted:       '#b07878',
    border:          '#fecaca',
  },
  dark: {
    ...NEUTRAL_DARK,
    primary:         '#f87171',
    primaryBg:       '#450a0a',
    primaryBorder:   '#7f1d1d',
    background:      '#1a0606',
    backgroundLight: '#2c0c0c',
    card:            '#3d1010',
    text:            '#fee2e2',
    textLight:       '#f87171',
    textMuted:       '#991b1b',
    border:          '#7f1d1d',
  },
}


// ─────────────────────────────────────────────────────────────────────────────
// Registry
// ─────────────────────────────────────────────────────────────────────────────
export const THEMES: Theme[] = [
  forestGreen,
  saffronOrange,
  royalBlue,
  midnightPurple,
  roseGold,
  deepTeal,
  crimsonRed,
]

export const DEFAULT_THEME_ID = 'forest-green'

export function getThemeById(id: string): Theme {
  return THEMES.find(t => t.id === id) ?? forestGreen
}

// Merges dark partial over base colors when system is in dark mode.
// Called inside ThemeContext on every [themeId, isDark] change.
export function resolveColors(theme: Theme, isDark: boolean): ThemeColors {
  if (!isDark || !theme.dark) return theme.colors
  return { ...theme.colors, ...theme.dark } as ThemeColors
}
