import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'expo-router'
import { COLORS } from '../../../lib/constants'

export default function PendingApproval() {
  const router = useRouter()

  async function logout() {
    await supabase.auth.signOut()
    router.replace('/(auth)/login' as any)
  }

  return (
    <View style={S.container}>
      <Text style={S.icon}>⏳</Text>
      <Text style={S.title}>Pending Approval</Text>
      <Text style={S.sub}>
        Your account is under review. You will be notified once an admin approves it.
      </Text>
      <TouchableOpacity style={S.btn} onPress={logout}>
        <Text style={S.btnText}>Logout</Text>
      </TouchableOpacity>
    </View>
  )
}

const S = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  icon: { fontSize: 72, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginBottom: 8, textAlign: 'center' },
  sub: { fontSize: 14, color: COLORS.textLight, textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  btn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
})
