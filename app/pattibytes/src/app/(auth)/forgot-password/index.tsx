import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { COLORS } from '../../../lib/constants'

export default function ForgotPassword() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleReset() {
    const e = email.trim().toLowerCase()
    if (!e.includes('@')) return Alert.alert('Error', 'Enter a valid email')
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(e)
      if (error) throw error
      Alert.alert('Email Sent', 'Check your inbox for reset instructions.', [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={S.container}>
      <TouchableOpacity onPress={() => router.back()} style={S.back}>
        <Text style={S.backText}>← Back</Text>
      </TouchableOpacity>
      <Text style={S.title}>Forgot Password</Text>
      <Text style={S.sub}>Enter your email and we&apos;ll send a reset link</Text>
      <TextInput
        style={S.input}
        value={email}
        onChangeText={setEmail}
        placeholder="your@email.com"
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!loading}
      />
      <TouchableOpacity style={[S.btn, loading && S.disabled]} onPress={handleReset} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={S.btnText}>Send Reset Link</Text>}
      </TouchableOpacity>
    </View>
  )
}

const S = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  back: { position: 'absolute', top: 56, left: 20 },
  backText: { color: COLORS.primary, fontWeight: '700', fontSize: 16 },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  sub: { fontSize: 14, color: COLORS.textLight, marginBottom: 24 },
  input: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, padding: 14,
    fontSize: 15, color: COLORS.text, marginBottom: 16, backgroundColor: COLORS.backgroundLight,
  },
  btn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  disabled: { opacity: 0.6 },
})
