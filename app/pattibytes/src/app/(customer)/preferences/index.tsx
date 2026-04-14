import React, { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../../contexts/ThemeContext'
import { changeLanguage, SUPPORTED_LANGUAGES } from '../../../lib/i18n'

export default function PreferencesScreen() {
  const { theme, mode, setMode } = useTheme()
  const { t, i18n } = useTranslation()
  const insets = useSafeAreaInsets()
  const router = useRouter()

  const [activeLang, setActiveLang] = useState(i18n.language)

  const THEMES = [
    { key: 'light',  label: t('settings.light'),  icon: 'sunny-outline' },
    { key: 'dark',   label: t('settings.dark'),   icon: 'moon-outline' },
    { key: 'system', label: t('settings.system'), icon: 'phone-portrait-outline' },
  ] as const

  const handleLangChange = async (code: string) => {
    setActiveLang(code)
    await changeLanguage(code)
  }

  const C = theme  // shorthand

  return (
    <View style={[S.root, { backgroundColor: C.bg }]}>
      {/* Header */}
      <View style={[S.header, { backgroundColor: C.headerBg, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={S.backBtn}>
          <Ionicons name="chevron-back" size={24} color={C.dark ? C.text : '#fff'} />
        </TouchableOpacity>
        <Text style={[S.headerTitle, { color: C.dark ? C.text : '#fff' }]}>
          {t('settings.title')}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Theme ── */}
        <Text style={[S.sectionLabel, { color: C.textMuted }]}>
          {t('settings.theme')}
        </Text>
        <View style={[S.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          {THEMES.map(({ key, label, icon }, i) => (
            <TouchableOpacity
              key={key}
              style={[
                S.optionRow,
                i < THEMES.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border },
                mode === key && { backgroundColor: C.primaryBg },
              ]}
              onPress={() => setMode(key)}
              activeOpacity={0.75}
            >
              <View style={[S.iconCircle, { backgroundColor: C.surfaceOffset }]}>
                <Ionicons
                  name={icon as any}
                  size={20}
                  color={mode === key ? C.primary : C.textMuted}
                />
              </View>
              <Text style={[S.optionLabel, { color: C.text, flex: 1 }]}>{label}</Text>
              {mode === key && (
                <Ionicons name="checkmark-circle" size={22} color={C.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Language ── */}
        <Text style={[S.sectionLabel, { color: C.textMuted, marginTop: 24 }]}>
          {t('settings.language')}
        </Text>
        <View style={[S.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          {SUPPORTED_LANGUAGES.map(({ code, label, flag }, i) => (
            <TouchableOpacity
              key={code}
              style={[
                S.optionRow,
                i < SUPPORTED_LANGUAGES.length - 1 && {
                  borderBottomWidth: 1, borderBottomColor: C.border,
                },
                activeLang === code && { backgroundColor: C.primaryBg },
              ]}
              onPress={() => handleLangChange(code)}
              activeOpacity={0.75}
            >
              <Text style={{ fontSize: 24, marginRight: 12 }}>{flag}</Text>
              <Text style={[S.optionLabel, { color: C.text, flex: 1 }]}>{label}</Text>
              {activeLang === code && (
                <Ionicons name="checkmark-circle" size={22} color={C.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

const S = StyleSheet.create({
  root:        { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 12 },
  backBtn:     { padding: 8, marginRight: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  sectionLabel:{ fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 },
  card:        { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  optionRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  iconCircle:  { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  optionLabel: { fontSize: 15, fontWeight: '600' },
})