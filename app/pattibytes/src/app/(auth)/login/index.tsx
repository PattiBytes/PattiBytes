import React, { useEffect, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Image,
} from 'react-native'
import { Link } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { signInWithGoogle } from '../../../lib/googleAuth'
import { COLORS } from '../../../lib/constants'

type AppSettings = {
  app_name?: string
  app_logo_url?: string
}

async function fetchAppSettings(): Promise<AppSettings> {
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('app_name,app_logo_url')
      .limit(1)
      .maybeSingle()
    return (data as AppSettings) ?? {}
  } catch {
    return {}
  }
}

export default function Login() {
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [loading, setLoading]     = useState(false)
  const [gLoading, setGLoading]   = useState(false)
  const [error, setError]         = useState('')
  const [settings, setSettings]   = useState<AppSettings>({})

  useEffect(() => {
    fetchAppSettings().then(setSettings)
  }, [])

  // ── Email / Password sign-in ───────────────────────────────────────────
  async function handleLogin() {
    setError('')
    const e = email.trim().toLowerCase()
    const p = password.trim()

    if (!e || !p) { setError('Please fill in all fields.'); return }
    if (!e.includes('@')) { setError('Enter a valid email address.'); return }

    setLoading(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: e,
        password: p,
      })
      if (signInError) throw signInError
      // _layout.tsx RootGuard handles navigation once user + profile are loaded
    } catch (err: any) {
      const msg: string = err?.message ?? ''
      if (/invalid login|invalid credentials|email.*not confirmed/i.test(msg)) {
        setError('Incorrect email or password. Please try again.')
      } else if (/too many/i.test(msg)) {
        setError('Too many attempts. Please wait a moment and try again.')
      } else if (/email not confirmed/i.test(msg)) {
        setError('Please verify your email address first.')
      } else {
        setError(msg || 'Sign in failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Google sign-in ─────────────────────────────────────────────────────
  async function handleGoogle() {
    setError('')
    setGLoading(true)
    try {
      await signInWithGoogle()
      // _layout.tsx RootGuard handles navigation
    } catch (err: any) {
      const msg: string = err?.message ?? ''
      if (msg === 'Sign in was cancelled') return  // user dismissed — silent
      setError(msg || 'Google sign-in failed. Please try again.')
    } finally {
      setGLoading(false)
    }
  }

  const busy     = loading || gLoading
  const appName  = settings?.app_name  || 'PattiBytes Express'
  const logoUrl  = settings?.app_logo_url || null

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.backgroundLight }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={S.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ─────────────────────────────────────────────── */}
        <View style={S.hero}>
          {logoUrl ? (
            <Image
              source={{ uri: logoUrl }}
              style={S.logo}
              resizeMode="cover"
            />
          ) : (
            <View style={S.logoFallback}>
              <Text style={S.logoFallbackText}>🍕</Text>
            </View>
          )}
          <Text style={S.appName}>{appName}</Text>
          <Text style={S.tagline}>Fast, Fresh, Delivered</Text>
        </View>

        {/* ── Card ─────────────────────────────────────────────── */}
        <View style={S.card}>
          <Text style={S.cardTitle}>Welcome Back 👋</Text>

          {/* Error Banner */}
          {!!error && (
            <View style={S.errorBanner}>
              <Text style={S.errorText}>⚠️  {error}</Text>
            </View>
          )}

          {/* Google Button */}
          <TouchableOpacity
            style={[S.googleBtn, busy && S.disabled]}
            onPress={handleGoogle}
            disabled={busy}
            activeOpacity={0.8}
          >
            {gLoading ? (
              <ActivityIndicator color={COLORS.text} />
            ) : (
              <>
                <View style={S.gIconWrap}>
                  <Text style={S.gIconText}>G</Text>
                </View>
                <Text style={S.googleBtnText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={S.divider}>
            <View style={S.divLine} />
            <Text style={S.divLabel}>or sign in with email</Text>
            <View style={S.divLine} />
          </View>

          {/* Email */}
          <Text style={S.label}>Email Address</Text>
          <TextInput
            style={S.input}
            value={email}
            onChangeText={(v) => { setEmail(v); setError('') }}
            placeholder="you@example.com"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            returnKeyType="next"
            editable={!busy}
          />

          {/* Password */}
          <Text style={S.label}>Password</Text>
          <View style={S.pwRow}>
            <TextInput
              style={[S.input, S.pwInput]}
              value={password}
              onChangeText={(v) => { setPassword(v); setError('') }}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry={!showPw}
              autoComplete="password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              editable={!busy}
            />
            <TouchableOpacity
              style={S.eyeBtn}
              onPress={() => setShowPw(!showPw)}
              disabled={busy}
            >
              <Text style={S.eyeIcon}>{showPw ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          {/* Forgot Password */}
          <Link href={'/(auth)/forgot-password' as any} asChild>
            <TouchableOpacity disabled={busy} style={S.forgotWrap}>
              <Text style={S.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </Link>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[S.signInBtn, busy && S.disabled]}
            onPress={handleLogin}
            disabled={busy}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={S.signInBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Sign Up Link */}
          <View style={S.signUpRow}>
            <Text style={S.signUpLabel}>Don&apos;t have an account? </Text>
            <Link href={'/(auth)/signup' as any} asChild>
              <TouchableOpacity disabled={busy}>
                <Text style={S.signUpLink}>Create one</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>

        <Text style={S.footer}>
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const S = StyleSheet.create({
  scroll: { flexGrow: 1, padding: 20, justifyContent: 'center' },

  // Hero
  hero: { alignItems: 'center', marginBottom: 28 },
  logo: {
    width: 96, height: 96, borderRadius: 48,
    marginBottom: 14,
    borderWidth: 3, borderColor: COLORS.primary,
  },
  logoFallback: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#FFF3EE', alignItems: 'center', justifyContent: 'center',
    marginBottom: 14, borderWidth: 3, borderColor: COLORS.primary,
  },
  logoFallbackText: { fontSize: 44 },
  appName: {
    fontSize: 26, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5,
  },
  tagline: { fontSize: 13, color: COLORS.textLight, marginTop: 4 },

  // Card
  card: {
    backgroundColor: '#fff', borderRadius: 24, padding: 24,
    elevation: 6, shadowColor: COLORS.primary,
    shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
  },
  cardTitle: {
    fontSize: 22, fontWeight: '800', color: COLORS.text,
    marginBottom: 18, textAlign: 'center',
  },

  // Error
  errorBanner: {
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
    borderRadius: 10, padding: 12, marginBottom: 14,
  },
  errorText: { color: '#DC2626', fontSize: 13, fontWeight: '600' },

  // Google Button
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14,
    paddingVertical: 14, marginBottom: 18, backgroundColor: '#FAFAFA',
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  gIconWrap: {
    width: 26, height: 26, borderRadius: 6,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    marginRight: 10, borderWidth: 1, borderColor: '#E5E7EB',
  },
  gIconText: { fontSize: 15, fontWeight: '900', color: COLORS.primary },
  googleBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.text },

  // Divider
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  divLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  divLabel: {
    marginHorizontal: 10, color: COLORS.textMuted,
    fontSize: 11, fontWeight: '600',
  },

  // Inputs
  label: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    padding: 14, fontSize: 15, color: COLORS.text,
    marginBottom: 14, backgroundColor: COLORS.backgroundLight,
  },
  pwRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  pwInput: { flex: 1, marginBottom: 0 },
  eyeBtn: { padding: 10 },
  eyeIcon: { fontSize: 18 },

  // Forgot
  forgotWrap: { alignSelf: 'flex-end', marginBottom: 20 },
  forgotText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },

  // Sign In
  signInBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14,
    padding: 16, alignItems: 'center',
    elevation: 3, shadowColor: COLORS.primary,
    shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  signInBtnText: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.3 },
  disabled: { opacity: 0.55 },

  // Sign Up
  signUpRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 18 },
  signUpLabel: { color: COLORS.textLight, fontSize: 14 },
  signUpLink: { color: COLORS.primary, fontWeight: '800', fontSize: 14 },

  // Footer
  footer: {
    textAlign: 'center', color: COLORS.textMuted,
    fontSize: 11, marginTop: 20, paddingHorizontal: 20, lineHeight: 16,
  },
})
