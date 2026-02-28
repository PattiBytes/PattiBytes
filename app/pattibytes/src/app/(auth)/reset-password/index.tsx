// app/(auth)/reset-password.tsx
import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { COLORS } from '../../../lib/constants'

function passwordStrength(pw: string) {
  let s = 0
  if (pw.length >= 8) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  const levels = [
    { label: 'Weak',   color: '#EF4444' },
    { label: 'Weak',   color: '#EF4444' },
    { label: 'Fair',   color: '#F59E0B' },
    { label: 'Good',   color: '#3B82F6' },
    { label: 'Strong', color: '#10B981' },
  ]
  return { ...levels[s], score: s }
}

export default function ResetPassword() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const pwStrength = passwordStrength(password)

  async function handleUpdate() {
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      Alert.alert('Password Updated ✅', 'Your password has been changed. Please sign in.', [
        { text: 'Sign In', onPress: () => router.replace('/(auth)/login' as any) },
      ])
    } catch (err: any) {
      setError(err?.message || 'Failed to update password. Please request a new reset link.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.backgroundLight }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={S.container} keyboardShouldPersistTaps="handled">
        <Text style={S.bigIcon}>🔑</Text>
        <Text style={S.title}>Set New Password</Text>
        <Text style={S.sub}>Choose a strong password you haven&apos;t used before.</Text>

        {!!error && (
          <View style={S.errorBanner}>
            <Text style={S.errorText}>⚠️  {error}</Text>
          </View>
        )}

        <Text style={S.label}>New Password</Text>
        <View style={S.pwRow}>
          <TextInput
            style={[S.input, { flex: 1, marginBottom: 0 }, !!error && password.length < 6 && { borderColor: '#EF4444' }]}
            value={password}
            onChangeText={v => { setPassword(v); setError('') }}
            placeholder="Min 6 characters"
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry={!showPw}
            autoComplete="new-password"
            returnKeyType="next"
            editable={!loading}
          />
          <TouchableOpacity style={S.eyeBtn} onPress={() => setShowPw(v => !v)} disabled={loading}>
            <Text>{showPw ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>
        {password.length > 0 && (
          <View style={S.strengthRow}>
            {[1, 2, 3, 4].map(i => (
              <View
                key={i}
                style={[S.strengthBar, {
                  backgroundColor: i <= pwStrength.score ? pwStrength.color : COLORS.border,
                }]}
              />
            ))}
            <Text style={[S.strengthLabel, { color: pwStrength.color }]}>{pwStrength.label}</Text>
          </View>
        )}
        <View style={{ height: 14 }} />

        <Text style={S.label}>Confirm Password</Text>
        <TextInput
          style={[S.input, !!error && password !== confirm && { borderColor: '#EF4444' }]}
          value={confirm}
          onChangeText={v => { setConfirm(v); setError('') }}
          placeholder="••••••••"
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry={!showPw}
          autoComplete="new-password"
          returnKeyType="done"
          onSubmitEditing={handleUpdate}
          editable={!loading}
        />

        <TouchableOpacity
          style={[S.btn, loading && S.disabled]}
          onPress={handleUpdate} disabled={loading} activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={S.btnText}>Update Password</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const S = StyleSheet.create({
  container:    { flexGrow: 1, padding: 24, justifyContent: 'center', backgroundColor: COLORS.backgroundLight },
  bigIcon:      { fontSize: 52, textAlign: 'center', marginBottom: 16 },
  title:        { fontSize: 26, fontWeight: '800', color: COLORS.text, textAlign: 'center', marginBottom: 8 },
  sub:          { fontSize: 14, color: COLORS.textLight, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  label:        { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    padding: 14, fontSize: 15, color: COLORS.text,
    marginBottom: 4, backgroundColor: '#fff',
  },
  errorBanner:  {
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
    borderRadius: 10, padding: 12, marginBottom: 14,
  },
  errorText:    { color: '#DC2626', fontSize: 13, fontWeight: '600' },
  pwRow:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  eyeBtn:       { padding: 10 },
  strengthRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, marginBottom: 4 },
  strengthBar:  { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel:{ fontSize: 11, fontWeight: '700', width: 44 },
  btn:          { backgroundColor: COLORS.primary, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  btnText:      { color: '#fff', fontWeight: '800', fontSize: 16 },
  disabled:     { opacity: 0.6 },
})
