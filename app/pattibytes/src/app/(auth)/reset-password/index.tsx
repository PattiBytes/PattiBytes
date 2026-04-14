/* eslint-disable react-hooks/exhaustive-deps */
// app/(auth)/reset-password/index.tsx
/**
 * This screen is opened via the deep link:
 *   pattibytesexpress://auth/reset-password
 *
 * Supabase appends #access_token=...&refresh_token=...&type=recovery
 * to the URL. We listen for the PASSWORD_RECOVERY auth event which Supabase
 * fires automatically when it detects those tokens — but only if Linking is
 * configured and supabase detectSessionInUrl is enabled (or we parse manually).
 *
 * Flow:
 *   1. Screen mounts → show "Verifying link…" skeleton
 *   2. onAuthStateChange fires PASSWORD_RECOVERY → unlock form
 *   3. User submits → show step progress → updateUser → success
 *   4. 30s timeout → show expiry message with link back to forgot-password
 */
import React, { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator, Alert, Animated, KeyboardAvoidingView,
  Linking, Platform, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { COLORS } from '../../../lib/constants'

// ─── Password strength ────────────────────────────────────────────────────────
function pwStrength(pw: string) {
  let s = 0
  if (pw.length >= 8) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  const levels = [
    { label: 'Too short', color: '#EF4444' },
    { label: 'Weak',      color: '#EF4444' },
    { label: 'Fair',      color: '#F59E0B' },
    { label: 'Good',      color: '#3B82F6' },
    { label: 'Strong',    color: '#10B981' },
  ]
  return { ...levels[s], score: s }
}

// ─── Session extraction from deep link URL ────────────────────────────────────
function extractTokensFromUrl(url: string): { access_token?: string; refresh_token?: string } {
  try {
    const hash = url.includes('#') ? url.split('#')[1] : ''
    const params = new URLSearchParams(hash)
    return {
      access_token:  params.get('access_token')  ?? undefined,
      refresh_token: params.get('refresh_token') ?? undefined,
    }
  } catch { return {} }
}

type VerifyState = 'checking' | 'ready' | 'expired' | 'done'

const VERIFY_TIMEOUT_MS  = 35_000   // 35s before showing "link expired" message
const UPDATE_TIMEOUT_MS  = 20_000   // 20s before update timeout warning

export default function ResetPassword() {
  const router = useRouter()

  const [verifyState, setVerifyState] = useState<VerifyState>('checking')
  const [password,    setPassword]    = useState('')
  const [confirm,     setConfirm]     = useState('')
  const [showPw,      setShowPw]      = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [step,        setStep]        = useState(0)   // 0=idle,1=saving,2=done

  const shakeAnim    = useRef(new Animated.Value(0)).current
  const progressAnim = useRef(new Animated.Value(0)).current
  const verifyTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const updateTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const strength     = pwStrength(password)

  // ── Try to restore session from deep link URL ─────────────────────────────
  async function trySetSessionFromUrl(url: string) {
    const { access_token, refresh_token } = extractTokensFromUrl(url)
    if (access_token && refresh_token) {
      try {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token })
        if (error) throw error
        clearVerifyTimer()
        setVerifyState('ready')
      } catch (e) {
        console.warn('[ResetPassword] setSession failed:', e)
      }
    }
  }

  function clearVerifyTimer() {
    if (verifyTimer.current) { clearTimeout(verifyTimer.current); verifyTimer.current = null }
  }

  // ── Mount: listen for auth event + initial URL + timeout ─────────────────
  useEffect(() => {
    let mounted = true

    // Timeout fallback: if no recovery event in 35s, mark expired
    verifyTimer.current = setTimeout(() => {
      if (mounted && verifyState === 'checking') setVerifyState('expired')
    }, VERIFY_TIMEOUT_MS)

    // 1. Check if there's already a valid session (re-opened screen)
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      if (data.session) { clearVerifyTimer(); setVerifyState('ready') }
    })

    // 2. Listen for PASSWORD_RECOVERY event from Supabase
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      if (event === 'PASSWORD_RECOVERY' && session) {
        clearVerifyTimer()
        setVerifyState('ready')
      } else if (event === 'SIGNED_OUT') {
        setVerifyState('expired')
      }
    })

    // 3. Parse tokens from the initial deep link URL
    Linking.getInitialURL().then(url => {
      if (url && mounted) trySetSessionFromUrl(url)
    })

    // 4. Listen for new URL events while screen is open
    const urlSub = Linking.addEventListener('url', ({ url }) => {
      if (mounted) trySetSessionFromUrl(url)
    })

    return () => {
      mounted = false
      clearVerifyTimer()
      sub.subscription.unsubscribe()
      urlSub.remove()
    }
  }, [])

  // ── Animate progress bar while loading ───────────────────────────────────
  useEffect(() => {
    if (loading) {
      progressAnim.setValue(0)
      Animated.timing(progressAnim, { toValue: 0.85, duration: UPDATE_TIMEOUT_MS * 0.8, useNativeDriver: false }).start()
    } else {
      if (step === 2) {
        Animated.timing(progressAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start()
      } else {
        progressAnim.setValue(0)
      }
    }
  }, [loading, step])

  function shake() {
    shakeAnim.setValue(0)
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6,   duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 60, useNativeDriver: true }),
    ]).start()
  }

  async function handleUpdate() {
    if (password.length < 8) { setError('Password must be at least 8 characters.'); shake(); return }
    if (password !== confirm) { setError('Passwords do not match.'); shake(); return }
    if (strength.score < 2)   { setError('Password is too weak. Add numbers or symbols.'); shake(); return }
    setError('')
    setLoading(true)
    setStep(1)

    // Timeout warning
    updateTimer.current = setTimeout(() => {
      Alert.alert(
        'Still working…',
        'This is taking longer than expected. Please keep the app open — your password is being saved.',
        [{ text: 'OK' }],
      )
    }, 10_000)

    const hardTimeout = setTimeout(() => {
      setLoading(false)
      setStep(0)
      setError('Update timed out. Please check your internet connection and try again.')
      shake()
    }, UPDATE_TIMEOUT_MS)

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      clearTimeout(updateTimer.current!)
      clearTimeout(hardTimeout)

      if (updateError) throw updateError

      setStep(2)
      setLoading(false)
      // Small delay so user sees 100% progress
      setTimeout(() => {
        Alert.alert(
          'Password Updated \u2705',
          'Your password has been changed successfully. Please sign in with your new password.',
          [{ text: 'Sign In', onPress: () => router.replace('/(auth)/login' as any) }],
        )
      }, 600)
    } catch (err: any) {
      clearTimeout(updateTimer.current!)
      clearTimeout(hardTimeout)
      setLoading(false)
      setStep(0)
      const msg = err?.message ?? ''
      if (msg.includes('session') || msg.includes('expired') || msg.includes('JWT')) {
        setError('Your reset session has expired. Please request a new reset link.')
        setTimeout(() => router.replace('/(auth)/forgot-password' as any), 3000)
      } else {
        setError(msg || 'Failed to update password. Please try again.')
      }
      shake()
    }
  }

  // ─── RENDER: checking ────────────────────────────────────────────────────
  if (verifyState === 'checking') {
    return (
      <View style={S.fullCenter}>
        <View style={S.verifyCard}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={S.verifyTitle}>Verifying reset link…</Text>
          <Text style={S.verifySub}>Please wait while we validate your reset link. This usually takes a few seconds.</Text>
          {/* Animated dots */}
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 16 }}>
            {[0, 1, 2].map(i => (
              <View key={i} style={[S.dot, { opacity: 0.4 + i * 0.3 }]} />
            ))}
          </View>
        </View>
      </View>
    )
  }

  // ─── RENDER: expired ─────────────────────────────────────────────────────
  if (verifyState === 'expired') {
    return (
      <View style={S.fullCenter}>
        <View style={S.verifyCard}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>{'\u23F0'}</Text>
          <Text style={S.verifyTitle}>Link Expired</Text>
          <Text style={S.verifySub}>
            This reset link has expired or is invalid. Reset links are only valid for 1 hour.
          </Text>
          <TouchableOpacity
            style={[S.btn, { marginTop: 24 }]}
            onPress={() => router.replace('/(auth)/forgot-password' as any)}
          >
            <Text style={S.btnText}>Request New Link</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // ─── RENDER: form ─────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.backgroundLight }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={S.container} keyboardShouldPersistTaps="handled">
        <Text style={S.bigIcon}>{'\uD83D\uDD11'}</Text>
        <Text style={S.title}>Set New Password</Text>
        <Text style={S.sub}>Choose a strong password you haven&apos;t used before.</Text>

        {/* Progress bar */}
        {(loading || step === 2) && (
          <View style={S.progressWrap}>
            <Animated.View style={[S.progressFill, {
              width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              backgroundColor: step === 2 ? '#10B981' : COLORS.primary,
            }]} />
          </View>
        )}

        {!!error && (
          <Animated.View style={[S.errorBanner, { transform: [{ translateX: shakeAnim }] }]}>
            <Text style={S.errorText}>{'\u26A0\uFE0F'}  {error}</Text>
          </Animated.View>
        )}

        {/* New Password */}
        <Text style={S.label}>New Password</Text>
        <View style={S.pwRow}>
          <TextInput
            style={[S.input, { flex: 1, marginBottom: 0 }]}
            value={password}
            onChangeText={v => { setPassword(v); if (error) setError('') }}
            placeholder="Min 8 characters"
            placeholderTextColor="#9CA3AF"
            secureTextEntry={!showPw}
            autoComplete="new-password"
            returnKeyType="next"
            editable={!loading}
          />
          <TouchableOpacity style={S.eyeBtn} onPress={() => setShowPw(v => !v)} disabled={loading}>
            <Text style={{ fontSize: 20 }}>{showPw ? '\uD83D\uDE48' : '\uD83D\uDC41\uFE0F'}</Text>
          </TouchableOpacity>
        </View>

        {/* Strength meter */}
        {password.length > 0 && (
          <View style={S.strengthSection}>
            <View style={S.strengthBars}>
              {[1, 2, 3, 4].map(i => (
                <View key={i} style={[S.bar, {
                  backgroundColor: i <= strength.score ? strength.color : '#E5E7EB',
                }]} />
              ))}
            </View>
            <Text style={[S.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
          </View>
        )}

        {/* Requirements */}
        {password.length > 0 && (
          <View style={S.reqSection}>
            {[
              { check: password.length >= 8,        label: 'At least 8 characters' },
              { check: /[A-Z]/.test(password),       label: 'One uppercase letter' },
              { check: /[0-9]/.test(password),       label: 'One number' },
              { check: /[^A-Za-z0-9]/.test(password),label: 'One symbol (!, @, # …)' },
            ].map(r => (
              <Text key={r.label} style={[S.reqItem, { color: r.check ? '#10B981' : '#9CA3AF' }]}>
                {r.check ? '\u2713 ' : '\u25CB '}{r.label}
              </Text>
            ))}
          </View>
        )}

        <View style={{ height: 12 }} />

        {/* Confirm Password */}
        <Text style={S.label}>Confirm Password</Text>
        <TextInput
          style={[S.input, !!confirm && password !== confirm && { borderColor: '#EF4444' }]}
          value={confirm}
          onChangeText={v => { setConfirm(v); if (error) setError('') }}
          placeholder={'\u2022'.repeat(8)}
          placeholderTextColor="#9CA3AF"
          secureTextEntry={!showPw}
          autoComplete="new-password"
          returnKeyType="done"
          onSubmitEditing={handleUpdate}
          editable={!loading}
        />

        {!!confirm && password !== confirm && (
          <Text style={{ color: '#EF4444', fontSize: 12, marginBottom: 8, marginTop: -8 }}>
            Passwords don&apos;t match
          </Text>
        )}

        <TouchableOpacity
          style={[S.btn, loading && S.disabled]}
          onPress={handleUpdate}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={S.btnText}>Updating password…</Text>
            </View>
          ) : (
            <Text style={S.btnText}>Update Password</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const S = StyleSheet.create({
  fullCenter:     { flex: 1, backgroundColor: COLORS.backgroundLight, alignItems: 'center', justifyContent: 'center', padding: 24 },
  verifyCard:     { width: '100%', backgroundColor: '#fff', borderRadius: 24, padding: 28, alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16 },
  verifyTitle:    { fontSize: 20, fontWeight: '800', color: COLORS.text, marginTop: 16, marginBottom: 8, textAlign: 'center' },
  verifySub:      { fontSize: 14, color: COLORS.textLight, textAlign: 'center', lineHeight: 22 },
  dot:            { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  container:      { flexGrow: 1, padding: 24, justifyContent: 'center', backgroundColor: COLORS.backgroundLight },
  bigIcon:        { fontSize: 52, textAlign: 'center', marginBottom: 16 },
  title:          { fontSize: 26, fontWeight: '800', color: COLORS.text, textAlign: 'center', marginBottom: 8 },
  sub:            { fontSize: 14, color: COLORS.textLight, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  label:          { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  input:          { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, padding: 14, fontSize: 15, color: COLORS.text, marginBottom: 12, backgroundColor: '#fff' },
  errorBanner:    { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 10, padding: 12, marginBottom: 14 },
  errorText:      { color: '#DC2626', fontSize: 13, fontWeight: '600' },
  pwRow:          { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  eyeBtn:         { padding: 12, marginLeft: 4 },
  strengthSection:{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  strengthBars:   { flexDirection: 'row', flex: 1, gap: 4 },
  bar:            { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel:  { fontSize: 11, fontWeight: '800', marginLeft: 8, width: 54 },
  reqSection:     { marginBottom: 4 },
  reqItem:        { fontSize: 12, fontWeight: '600', marginBottom: 3 },
  progressWrap:   { height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, marginBottom: 16, overflow: 'hidden' },
  progressFill:   { height: 4, borderRadius: 2 },
  btn:            { backgroundColor: COLORS.primary, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  btnText:        { color: '#fff', fontWeight: '800', fontSize: 16 },
  disabled:       { opacity: 0.6 },
})
