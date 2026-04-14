// app/(auth)/forgot-password/index.tsx
import React, { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator, Animated, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { COLORS } from '../../../lib/constants'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const COOLDOWN_S = 60          // resend cooldown in seconds
const REQUEST_TIMEOUT_MS = 15_000

export default function ForgotPassword() {
  const router  = useRouter()
  const [email,     setEmail]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [sent,      setSent]      = useState(false)
  const [error,     setError]     = useState('')
  const [cooldown,  setCooldown]  = useState(0)   // seconds remaining

  // Animated shake for error
  const shakeAnim = useRef(new Animated.Value(0)).current
  // Animated fade-in for success card
  const fadeAnim  = useRef(new Animated.Value(0)).current

  // Countdown timer after send
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  // Fade in success card
  useEffect(() => {
    if (!sent) return
    Animated.spring(fadeAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }).start()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sent])

  function shake() {
    shakeAnim.setValue(0)
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6,   duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 60, useNativeDriver: true }),
    ]).start()
  }

  async function handleReset() {
    const e = email.trim().toLowerCase()
    if (!EMAIL_RE.test(e)) {
      setError('Please enter a valid email address.')
      shake()
      return
    }
    if (cooldown > 0) return   // prevent spam

    setError('')
    setLoading(true)

    // Timeout guard — Supabase can hang on slow connections
    const timeout = setTimeout(() => {
      setLoading(false)
      setError('Request timed out. Please check your connection and try again.')
      shake()
    }, REQUEST_TIMEOUT_MS)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(e, {
        redirectTo: 'pattibytesexpress://auth/reset-password',
      })
      clearTimeout(timeout)
      if (resetError) throw resetError
      setSent(true)
      setCooldown(COOLDOWN_S)
    } catch (err: any) {
      clearTimeout(timeout)
      setError(err?.message || 'Failed to send reset link. Please try again.')
      shake()
    } finally {
      setLoading(false)
    }
  }

  // ── Success state ─────────────────────────────────────────────────────────
  if (sent) {
    return (
      <View style={S.fullCenter}>
        <Animated.View style={[S.successCard, { opacity: fadeAnim, transform: [{ scale: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }]}>
          <Text style={S.bigIcon}>{'\uD83D\uDCEC'}</Text>
          <Text style={S.title}>Check Your Email</Text>
          <Text style={S.sub}>
            {'We\'ve sent a reset link to\n'}
            <Text style={{ fontWeight: '800', color: COLORS.text }}>{email.trim().toLowerCase()}</Text>
            {'\n\nDon\'t see it? Check your spam folder.'}
          </Text>

          {/* Progress steps */}
          <View style={S.stepsRow}>
            <View style={[S.step, S.stepDone]}><Text style={S.stepNum}>{'\u2713'}</Text></View>
            <View style={S.stepLine} />
            <View style={[S.step, S.stepActive]}><Text style={[S.stepNum, { color: COLORS.primary }]}>2</Text></View>
            <View style={S.stepLine} />
            <View style={S.step}><Text style={S.stepNum}>3</Text></View>
          </View>
          <View style={S.stepsLabelRow}>
            <Text style={S.stepLabel}>Email sent</Text>
            <Text style={[S.stepLabel, { color: COLORS.primary }]}>Click link</Text>
            <Text style={S.stepLabel}>New password</Text>
          </View>

          <TouchableOpacity
            style={S.btn}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Text style={S.btnText}>Back to Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => { setSent(false); fadeAnim.setValue(0) }}
            disabled={cooldown > 0}
            style={{ marginTop: 14 }}
          >
            <Text style={[S.resend, cooldown > 0 && { opacity: 0.4 }]}>
              {cooldown > 0
                ? `Resend in ${cooldown}s`
                : "Didn't receive it? Try again"}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    )
  }

  // ── Form state ────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.backgroundLight }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={S.container} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} style={S.back}>
          <Text style={S.backText}>{'\u2190'} Back</Text>
        </TouchableOpacity>

        <Text style={S.bigIcon}>{'\uD83D\uDD10'}</Text>
        <Text style={S.title}>Forgot Password?</Text>
        <Text style={S.sub}>Enter your email and we&apos;ll send you a secure reset link.</Text>

        {!!error && (
          <Animated.View
            style={[S.errorBanner, { transform: [{ translateX: shakeAnim }] }]}
          >
            <Text style={S.errorText}>{'\u26A0\uFE0F'}  {error}</Text>
          </Animated.View>
        )}

        <Text style={S.label}>Email Address</Text>
        <TextInput
          style={[S.input, !!error && { borderColor: '#EF4444' }]}
          value={email}
          onChangeText={v => { setEmail(v); if (error) setError('') }}
          placeholder="your@email.com"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          returnKeyType="send"
          onSubmitEditing={handleReset}
          editable={!loading}
        />

        {/* Loading progress bar */}
        {loading && (
          <View style={S.progressBar}>
            <Animated.View style={S.progressFill} />
          </View>
        )}

        <TouchableOpacity
          style={[S.btn, (loading || cooldown > 0) && S.disabled]}
          onPress={handleReset}
          disabled={loading || cooldown > 0}
          activeOpacity={0.85}
        >
          {loading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={S.btnText}>Sending...</Text>
            </View>
          ) : (
            <Text style={S.btnText}>Send Reset Link</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(auth)/register' as any)} style={{ marginTop: 20 }}>
          <Text style={{ textAlign: 'center', color: COLORS.textLight, fontSize: 13 }}>
            Don&apos;t have an account?{' '}
            <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const S = StyleSheet.create({
  fullCenter:      { flex: 1, backgroundColor: COLORS.backgroundLight, alignItems: 'center', justifyContent: 'center', padding: 24 },
  container:       { flexGrow: 1, padding: 24, justifyContent: 'center', backgroundColor: COLORS.backgroundLight },
  successCard:     {
    width: '100%', backgroundColor: '#fff', borderRadius: 24, padding: 28,
    alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 20, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  bigIcon:         { fontSize: 52, marginBottom: 16, textAlign: 'center' },
  back:            { position: 'absolute', top: 52, left: 20 },
  backText:        { color: COLORS.primary, fontWeight: '700', fontSize: 16 },
  title:           { fontSize: 26, fontWeight: '800', color: COLORS.text, marginBottom: 8, textAlign: 'center' },
  sub:             { fontSize: 14, color: COLORS.textLight, marginBottom: 24, textAlign: 'center', lineHeight: 22 },
  label:           { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  input:           {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    padding: 14, fontSize: 15, color: COLORS.text, marginBottom: 16, backgroundColor: '#fff',
  },
  errorBanner:     {
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
    borderRadius: 10, padding: 12, marginBottom: 14, width: '100%',
  },
  errorText:       { color: '#DC2626', fontSize: 13, fontWeight: '600' },
  progressBar:     { height: 3, backgroundColor: '#E5E7EB', borderRadius: 2, marginBottom: 12, overflow: 'hidden' },
  progressFill:    { height: 3, width: '70%', backgroundColor: COLORS.primary, borderRadius: 2 },
  btn:             { backgroundColor: COLORS.primary, borderRadius: 14, padding: 16, alignItems: 'center', width: '100%' },
  btnText:         { color: '#fff', fontWeight: '800', fontSize: 16 },
  disabled:        { opacity: 0.55 },
  resend:          { color: COLORS.primary, fontWeight: '700', fontSize: 14, textAlign: 'center' },
  // Steps
  stepsRow:        { flexDirection: 'row', alignItems: 'center', marginVertical: 20, width: '80%' },
  step:            { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#E5E7EB' },
  stepDone:        { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  stepActive:      { borderColor: COLORS.primary, backgroundColor: '#EFF6FF' },
  stepNum:         { fontSize: 12, fontWeight: '800', color: '#9CA3AF' },
  stepLine:        { flex: 1, height: 2, backgroundColor: '#E5E7EB' },
  stepsLabelRow:   { flexDirection: 'row', justifyContent: 'space-between', width: '90%', marginBottom: 20 },
  stepLabel:       { fontSize: 11, color: '#9CA3AF', fontWeight: '600', textAlign: 'center', flex: 1 },
})
