import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { COLORS } from '../../../lib/constants'

export default function TrackOrderWeb() {
  const router = useRouter()
  return (
    <View style={S.wrap}>
      <Stack.Screen options={{ title: 'Track Order' }} />
      <Text style={S.emoji}>🗺️</Text>
      <Text style={S.title}>Live tracking is available on the mobile app</Text>
      <Text style={S.sub}>Download the PBExpress app to track your order in real-time.</Text>
      <TouchableOpacity style={S.btn} onPress={() => router.back()}>
        <Text style={S.btnTxt}>Go Back</Text>
      </TouchableOpacity>
    </View>
  )
}

const S = StyleSheet.create({
  wrap:   { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#F8F9FA' },
  emoji:  { fontSize: 64, marginBottom: 16 },
  title:  { fontSize: 18, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 8 },
  sub:    { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 28, lineHeight: 21 },
  btn:    { backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 },
  btnTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
})
