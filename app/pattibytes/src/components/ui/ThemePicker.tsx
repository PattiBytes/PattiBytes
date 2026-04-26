// src/components/ui/ThemePicker.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Animated bottom-sheet theme picker.
// Now uses primaryBg / borderFaint / textFaint from the updated ThemeColors
// instead of the old backgroundLight / border workarounds.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useCallback, useEffect, useRef } from 'react'
import { COLORS } from '../../lib/constants'
import {
  View, Text, TouchableOpacity, Modal, Animated,
  Pressable, StyleSheet, Platform, ScrollView,
} from 'react-native'
import { THEMES, Theme, ThemeColors } from '../../lib/themes'
import { useTheme, useColors } from '../../contexts/ThemeContext'


interface Props {
  visible: boolean
  onClose: () => void
}


export default function ThemePicker({ visible, onClose }: Props) {
  const { themeId, setThemeId } = useTheme()
  const colors                  = useColors()
  const slideAnim = useRef(new Animated.Value(400)).current
  const fadeAnim  = useRef(new Animated.Value(0)).current


  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0,   duration: 300, useNativeDriver: true }),
        Animated.timing(fadeAnim,  { toValue: 1,   duration: 250, useNativeDriver: true }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 400, duration: 250, useNativeDriver: true }),
        Animated.timing(fadeAnim,  { toValue: 0,   duration: 200, useNativeDriver: true }),
      ]).start()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])


  const handleSelect = useCallback((id: string) => {
    setThemeId(id)
    setTimeout(onClose, 180)   // short delay so active state flashes before close
  }, [setThemeId, onClose])


  const s = makeStyles(colors)


  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Animated.View style={[s.backdrop, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>


      {/* Sheet */}
      <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
        {/* Drag handle */}
        <View style={s.handle} />


        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Choose Theme</Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={12}>
            <Text style={s.closeTxt}>✕</Text>
          </TouchableOpacity>
        </View>


        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.list}
          bounces={false}
        >
          {THEMES.map((theme: Theme) => {
            const active = theme.id === themeId
            return (
              <TouchableOpacity
                key={theme.id}
                style={[s.row, active && s.rowActive]}
                onPress={() => handleSelect(theme.id)}
                activeOpacity={0.7}
              >
                {/* Colour swatches — preview the palette */}
                <View style={s.swatches}>
                  <View style={[s.swatch, s.swatchLg, { backgroundColor: theme.colors.primary }]} />
                  <View style={[s.swatch, s.swatchSm, { backgroundColor: theme.colors.backgroundLight }]} />
                  <View style={[s.swatch, s.swatchSm, { backgroundColor: theme.colors.border }]} />
                </View>


                {/* Name + description — uses `label` (forward-compat) */}
                <View style={s.meta}>
                  <Text style={[s.themeName, active && s.themeNameActive]}>
                    {theme.emoji}  {theme.label}
                  </Text>
                  <Text style={s.themeDesc}>{theme.description}</Text>
                </View>


                {/* Active tick */}
                {active && (
                  <View style={[s.tick, { backgroundColor: colors.primary }]}>
                    <Text style={s.tickTxt}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </ScrollView>


        <View style={{ height: Platform.OS === 'ios' ? 24 : 16 }} />
      </Animated.View>
    </Modal>
  )
}


// makeStyles uses the 5 new tokens that themes.ts now defines properly
const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.52)',
    },
    sheet: {
      position:             'absolute',
      bottom: 0, left: 0, right: 0,
      backgroundColor:      COLORS.card,
      borderTopLeftRadius:  22,
      borderTopRightRadius: 22,
      paddingTop:           8,
      paddingHorizontal:    16,
      maxHeight:            '78%',
      shadowColor:          '#000',
      shadowOpacity:        0.18,
      shadowRadius:         20,
      shadowOffset:         { width: 0, height: -4 },
      elevation:            16,
    },
    // ← borderFaint: subtle pill — was backgroundLight (too strong)
    handle: {
      alignSelf:       'center',
      width:           40, height: 4,
      borderRadius:    2,
      backgroundColor: COLORS.borderFaint,
      marginBottom:    8,
    },
    header: {
      flexDirection:     'row',
      alignItems:        'center',
      justifyContent:    'space-between',
      paddingVertical:   12,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.borderFaint,
      marginBottom:      8,
    },
    title:   { fontSize: 17, fontWeight: '700', color: COLORS.text },
    closeBtn: {
      // ← borderFaint: softer than backgroundLight in dark mode
      backgroundColor: COLORS.backgroundOffset,
      borderRadius: 20, width: 32, height: 32,
      alignItems: 'center', justifyContent: 'center',
    },
    closeTxt:  { fontSize: 14, color: COLORS.textMuted, fontWeight: '600' },
    list:      { paddingBottom: 8 },
    row: {
      flexDirection:    'row',
      alignItems:       'center',
      paddingVertical:  12,
      paddingHorizontal: 4,
      borderRadius:     12,
      marginBottom:     4,
      gap:              12,
    },
    // ← primaryBg: proper tinted active state per theme (was backgroundLight)
    rowActive: { backgroundColor: COLORS.primaryBg },
    swatches:  { flexDirection: 'row', gap: 4, alignItems: 'center' },
    swatch:    { borderRadius: 6 },
    swatchLg:  { width: 28, height: 28 },
    swatchSm:  { width: 14, height: 14 },
    meta:      { flex: 1 },
    themeName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
    themeNameActive: { color: COLORS.primary },
    // ← textFaint: lighter meta text
    themeDesc: { fontSize: 12, color: COLORS.textFaint, marginTop: 2 },
    tick: {
      width: 24, height: 24, borderRadius: 12,
      alignItems: 'center', justifyContent: 'center',
    },
    tickTxt: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  })
