// app/(auth)/forgot-password.tsx
import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { COLORS } from '../../../lib/constants'

export default function ForgotPassword() {
  const router = useRouter()
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  async function handleReset() {
    const e = email.trim().toLowerCase()
    if (!e || !e.includes('@')) { setError('Please enter a valid email address.'); return }
    setError('')
    setLoading(true)
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(e, {
        redirectTo: 'pattibytesexpress://auth/reset-password',
      })
      if (resetError) throw resetError
      setSent(true)
    } catch (err: any) {
      setError(err?.message || 'Failed to send reset link. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <View style={S.container}>
        <View style={S.successCard}>
          <Text style={S.bigIcon}>📬</Text>
          <Text style={S.title}>Check Your Email</Text>
          <Text style={S.sub}>
            We&apos;ve sent a reset link to{'\n'}
            <Text style={{ fontWeight: '800', color: COLORS.text }}>{email}</Text>
          </Text>
          <TouchableOpacity style={S.btn} onPress={() => router.back()} activeOpacity={0.85}>
            <Text style={S.btnText}>Back to Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSent(false)} style={{ marginTop: 14 }}>
            <Text style={S.resend}>Didn&apos;t receive it? Try again</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.backgroundLight }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={S.container} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} style={S.back}>
          <Text style={S.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={S.bigIcon}>🔐</Text>
        <Text style={S.title}>Forgot Password?</Text>
        <Text style={S.sub}>Enter your email and we&apos;ll send a reset link.</Text>

        {!!error && (
          <View style={S.errorBanner}>
            <Text style={S.errorText}>⚠️  {error}</Text>
          </View>
        )}

        <Text style={S.label}>Email Address</Text>
        <TextInput
          style={[S.input, !!error && { borderColor: '#EF4444' }]}
          value={email}
          onChangeText={v => { setEmail(v); setError('') }}
          placeholder="your@email.com"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          returnKeyType="done"
          onSubmitEditing={handleReset}
          editable={!loading}
        />

        <TouchableOpacity
          style={[S.btn, loading && S.disabled]}
          onPress={handleReset} disabled={loading} activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={S.btnText}>Send Reset Link</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const S = StyleSheet.create({
  container:   { flexGrow: 1, padding: 24, justifyContent: 'center', backgroundColor: COLORS.backgroundLight },
  successCard: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 24, padding: 32,
                 shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, elevation: 5 },
  bigIcon:     { fontSize: 52, marginBottom: 16, textAlign: 'center' },
  back:        { position: 'absolute', top: 52, left: 20 },
  backText:    { color: COLORS.primary, fontWeight: '700', fontSize: 16 },
  title:       { fontSize: 26, fontWeight: '800', color: COLORS.text, marginBottom: 8, textAlign: 'center' },
  sub:         { fontSize: 14, color: COLORS.textLight, marginBottom: 24, textAlign: 'center', lineHeight: 22 },
  label:       { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    padding: 14, fontSize: 15, color: COLORS.text,
    marginBottom: 16, backgroundColor: '#fff',
  },
  errorBanner: {
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
    borderRadius: 10, padding: 12, marginBottom: 14, width: '100%',
  },
  errorText: { color: '#DC2626', fontSize: 13, fontWeight: '600' },
  btn:       { backgroundColor: COLORS.primary, borderRadius: 14, padding: 16, alignItems: 'center' },
  btnText:   { color: '#fff', fontWeight: '800', fontSize: 16 },
  disabled:  { opacity: 0.6 },
  resend:    { color: COLORS.primary, fontWeight: '700', fontSize: 14, textAlign: 'center' },
})
