// src/components/ui/Themed.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Drop-in themed wrappers for every common RN primitive.
// Import these instead of bare View/Text/TouchableOpacity in any screen.
//
//   import { ThemedView, ThemedText, ThemedCard, ThemedButton,
//            ThemedInput, ThemedBadge, ThemedDivider } from '../components/ui/Themed'
//
// All props pass through to the underlying RN component so you never lose
// flexibility — just swap View → ThemedView and get instant theming for free.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react'
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet,
  ViewProps, TextProps, TouchableOpacityProps, TextInputProps,
  ActivityIndicator,
} from 'react-native'
import { useColors } from '../../contexts/ThemeContext'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { ThemeColors } from '../../lib/themes'


// ── ThemedView ────────────────────────────────────────────────────────────────
// A View whose background defaults to colors.background.
// Pass variant="card" for elevated card look, "offset" for disabled-input bg.
interface ThemedViewProps extends ViewProps {
  variant?: 'default' | 'card' | 'light' | 'offset'
}
export function ThemedView({ variant = 'default', style, ...props }: ThemedViewProps) {
  const c = useColors()
  const bg = variant === 'card'   ? c.card
           : variant === 'light'  ? c.backgroundLight
           : variant === 'offset' ? c.backgroundOffset
           : c.background
  return <View style={[{ backgroundColor: bg }, style]} {...props} />
}


// ── ThemedText ────────────────────────────────────────────────────────────────
// A Text whose color defaults to colors.text.
// variant: body | muted | faint | light | primary | danger | success | warning
interface ThemedTextProps extends TextProps {
  variant?: 'body' | 'muted' | 'faint' | 'light' | 'primary' | 'danger' | 'success' | 'warning'
}
export function ThemedText({ variant = 'body', style, ...props }: ThemedTextProps) {
  const c = useColors()
  const color = variant === 'muted'   ? c.textMuted
              : variant === 'faint'   ? c.textFaint
              : variant === 'light'   ? c.textLight
              : variant === 'primary' ? c.primary
              : variant === 'danger'  ? c.danger
              : variant === 'success' ? c.success
              : variant === 'warning' ? c.warning
              : c.text
  return <Text style={[{ color }, style]} {...props} />
}


// ── ThemedCard ────────────────────────────────────────────────────────────────
// An elevated card with card background, themed border, and shadow.
interface ThemedCardProps extends ViewProps {
  noBorder?: boolean
  shadow?:   boolean
}
export function ThemedCard({ noBorder, shadow = true, style, ...props }: ThemedCardProps) {
  const c = useColors()
  return (
    <View
      style={[
        {
          backgroundColor: c.card,
          borderRadius:    14,
          borderWidth:     noBorder ? 0 : 1,
          borderColor:     c.border,
          ...(shadow ? {
            shadowColor:   '#000',
            shadowOpacity: 0.07,
            shadowRadius:  8,
            shadowOffset:  { width: 0, height: 2 },
            elevation:     3,
          } : {}),
        },
        style,
      ]}
      {...props}
    />
  )
}


// ── ThemedButton ──────────────────────────────────────────────────────────────
// A fully themed button. variant: primary | secondary | ghost | danger
interface ThemedButtonProps extends TouchableOpacityProps {
  label:     string
  variant?:  'primary' | 'secondary' | 'ghost' | 'danger'
  loading?:  boolean
  size?:     'sm' | 'md' | 'lg'
}
export function ThemedButton({
  label, variant = 'primary', loading, size = 'md', style, ...props
}: ThemedButtonProps) {
  const c = useColors()

  const bg = variant === 'secondary' ? c.backgroundLight
           : variant === 'ghost'     ? 'transparent'
           : variant === 'danger'    ? c.danger
           : c.primary

  const textColor = variant === 'ghost'     ? c.primary
                  : variant === 'secondary' ? c.primary
                  : '#ffffff'

  const borderColor = variant === 'ghost' ? c.primary
                    : variant === 'secondary' ? c.border
                    : 'transparent'

  const py = size === 'sm' ? 8 : size === 'lg' ? 18 : 13
  const px = size === 'sm' ? 14 : size === 'lg' ? 24 : 18
  const fs = size === 'sm' ? 13 : size === 'lg' ? 17 : 15

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      style={[
        {
          backgroundColor: bg,
          borderRadius:    12,
          paddingVertical: py,
          paddingHorizontal: px,
          alignItems:      'center',
          justifyContent:  'center',
          flexDirection:   'row',
          gap:             8,
          borderWidth:     1,
          borderColor,
          opacity:         props.disabled ? 0.55 : 1,
        },
        style,
      ]}
      {...props}
    >
      {loading
        ? <ActivityIndicator color={textColor} size="small" />
        : <Text style={{ color: textColor, fontWeight: '700', fontSize: fs }}>{label}</Text>
      }
    </TouchableOpacity>
  )
}


// ── ThemedInput ───────────────────────────────────────────────────────────────
// A TextInput that follows the active theme for bg, text, border, and placeholder.
interface ThemedInputProps extends TextInputProps {
  disabled?: boolean
}
export function ThemedInput({ disabled, style, ...props }: ThemedInputProps) {
  const c = useColors()
  return (
    <TextInput
      style={[
        {
          backgroundColor: disabled ? c.backgroundOffset : c.backgroundLight,
          color:           disabled ? c.textMuted : c.text,
          borderWidth:     1.5,
          borderColor:     c.border,
          borderRadius:    10,
          paddingHorizontal: 14,
          paddingVertical:  12,
          fontSize:        15,
          opacity:         disabled ? 0.7 : 1,
        },
        style,
      ]}
      placeholderTextColor={c.textMuted}
      editable={!disabled}
      {...props}
    />
  )
}


// ── ThemedBadge ───────────────────────────────────────────────────────────────
// A pill badge. variant matches semantic token names.
interface ThemedBadgeProps {
  label:    string
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'muted'
}
export function ThemedBadge({ label, variant = 'primary' }: ThemedBadgeProps) {
  const c = useColors()
  const bg = variant === 'success' ? c.success
           : variant === 'warning' ? c.warning
           : variant === 'danger'  ? c.danger
           : variant === 'info'    ? c.info
           : variant === 'muted'   ? c.backgroundOffset
           : c.primaryBg

  const color = variant === 'muted' ? c.textMuted : '#fff'

  return (
    <View style={{ backgroundColor: bg, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' }}>
      <Text style={{ color, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  )
}


// ── ThemedDivider ─────────────────────────────────────────────────────────────
export function ThemedDivider({ style }: ViewProps) {
  const c = useColors()
  return (
    <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: c.borderFaint, marginVertical: 4 }, style]} />
  )
}


// ── ThemedScreenWrapper ───────────────────────────────────────────────────────
// Wraps an entire screen in a themed background. Use as the outermost View.
export function ThemedScreen({ style, ...props }: ViewProps) {
  const c = useColors()
  return (
    <View style={[{ flex: 1, backgroundColor: c.background }, style]} {...props} />
  )
}


// ── ThemedSectionHeader ───────────────────────────────────────────────────────
// Small uppercase section label (used above card groups in settings/lists).
export function ThemedSectionHeader({ style, ...props }: TextProps) {
  const c = useColors()
  return (
    <Text
      style={[{
        fontSize:      11,
        fontWeight:    '700',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        color:         c.textMuted,
        paddingHorizontal: 4,
        marginBottom:  6,
        marginTop:     16,
      }, style]}
      {...props}
    />
  )
}
