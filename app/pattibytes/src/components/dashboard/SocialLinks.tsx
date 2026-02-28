import React from 'react'
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native'
import type { AppSettings } from '../../types/dashboard'

const SOCIALS = [
  { key: 'instagramurl' as const, emoji: '📸', label: 'Instagram', bg: '#E1306C', light: '#FFF0F5' },
  { key: 'facebookurl'  as const, emoji: '👍', label: 'Facebook',  bg: '#1877F2', light: '#EBF3FF' },
  { key: 'youtubeurl'   as const, emoji: '▶️', label: 'YouTube',   bg: '#FF0000', light: '#FFF0F0' },
  { key: 'twitterurl'   as const, emoji: '🐦', label: 'Twitter',   bg: '#1DA1F2', light: '#E8F5FF' },
]

export default function SocialLinks({ settings }: { settings: AppSettings }) {
  const activeSocials = SOCIALS.filter(s => !!(settings as any)[s.key])
  if (!activeSocials.length && !settings.supportphone && !settings.supportemail) return null

  return (
    <View style={{ paddingHorizontal: 16, marginTop: 8, marginBottom: 16 }}>
      <Text style={S.secTitle}>Connect With Us</Text>
      {activeSocials.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          {activeSocials.map(s => (
            <TouchableOpacity
              key={s.label}
              style={[S.socialBtn, { backgroundColor: s.light, borderColor: s.bg + '33' }]}
              onPress={() => Linking.openURL((settings as any)[s.key])}
            >
              <Text style={{ fontSize: 16 }}>{s.emoji}</Text>
              <Text style={{ fontWeight: '700', color: s.bg, fontSize: 13 }}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {!!settings.supportphone && (
          <TouchableOpacity
            style={S.supportBtn}
            onPress={() => Linking.openURL(`tel:${settings.supportphone}`)}
          >
            <Text style={{ fontSize: 18 }}>📞</Text>
            <View style={{ flex: 1 }}>
              <Text style={S.supportLabel}>Call Support</Text>
              <Text style={S.supportValue} numberOfLines={1}>{settings.supportphone}</Text>
            </View>
          </TouchableOpacity>
        )}
        {!!settings.supportemail && (
          <TouchableOpacity
            style={[S.supportBtn, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}
            onPress={() => Linking.openURL(`mailto:${settings.supportemail}`)}
          >
            <Text style={{ fontSize: 18 }}>✉️</Text>
            <View style={{ flex: 1 }}>
              <Text style={S.supportLabel}>Email Support</Text>
              <Text style={[S.supportValue, { color: '#1D4ED8' }]} numberOfLines={1}>{settings.supportemail}</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const S = StyleSheet.create({
  secTitle:     { fontSize: 17, fontWeight: '900', color: '#111827', marginBottom: 12 },
  socialBtn:    { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, gap: 6, borderWidth: 1 },
  supportBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#BBF7D0' },
  supportLabel: { fontSize: 10, color: '#6B7280', fontWeight: '600' },
  supportValue: { fontSize: 13, fontWeight: '800', color: '#065F46' },
})