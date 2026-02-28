// app/(auth)/login.tsx
import React, { useEffect, useRef, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Image, Animated,
} from 'react-native'
import { Link } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { signInWithGoogle } from '../../../lib/googleAuth'
import { COLORS } from '../../../lib/constants'

type AppSettings = { app_name?: string; app_logo_url?: string }

async function fetchAppSettings(): Promise<AppSettings> {
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('app_name,app_logo_url')
      .limit(1)
      .maybeSingle()
    return (data as AppSettings) ?? {}
  } catch { return {} }
}

/**
 * Accepts email or username.
 * If no "@" present, looks up the email from profiles.username (case-insensitive).
 */
async function resolveEmail(input: string): Promise<string> {
  const trimmed = input.trim()
  if (trimmed.includes('@')) return trimmed.toLowerCase()

  const { data, error } = await supabase
    .from('profiles')
    .select('email')
    .ilike('username', trimmed)
    .maybeSingle()

  if (error || !data?.email) {
    throw new Error('No account found with that username.')
  }
  return data.email as string
}

export default function Login() {
  const [identifier, setIdentifier] = useState('') // email or username
  const [password, setPassword]     = useState('')
  const [showPw, setShowPw]         = useState(false)
  const [loading, setLoading]       = useState(false)
  const [gLoading, setGLoading]     = useState(false)
  const [error, setError]           = useState('')
  const [settings, setSettings]     = useState<AppSettings>({})

  const shakeAnim   = useRef(new Animated.Value(0)).current
  const passwordRef = useRef<TextInput>(null)

  useEffect(() => { fetchAppSettings().then(setSettings) }, [])

  function shake() {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8,   duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 55, useNativeDriver: true }),
    ]).start()
  }

  async function handleLogin() {
    setError('')
    const id = identifier.trim()
    const pw = password

    if (!id || !pw) {
      setError('Please fill in all fields.')
      shake()
      return
    }

    setLoading(true)
    try {
      const email = await resolveEmail(id)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: pw,
      })
      if (signInError) throw signInError
      // Navigation handled by _layout.tsx RootGuard / AuthContext
    } catch (err: any) {
      const msg: string = err?.message ?? ''
      shake()
      if (/No account found/i.test(msg)) {
        setError(msg)
      } else if (/invalid login|invalid credentials/i.test(msg)) {
        setError('Incorrect email/username or password.')
      } else if (/email not confirmed/i.test(msg)) {
        setError('Please verify your email first. Check your inbox.')
      } else if (/too many/i.test(msg)) {
        setError('Too many attempts. Please wait a moment.')
      } else {
        setError(msg || 'Sign in failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError('')
    setGLoading(true)
    try {
      await signInWithGoogle()
    } catch (err: any) {
      const msg: string = err?.message ?? ''
      if (msg === 'Sign in was cancelled') return // silent
      setError(msg || 'Google sign-in failed. Please try again.')
    } finally {
      setGLoading(false)
    }
  }

  const busy    = loading || gLoading
  const appName = settings?.app_name || 'PattiBytes Express'
  const logoUrl = settings?.app_logo_url || null
  // Dynamic label: show what we think they're typing
  const inputLabel = identifier.includes('@')
    ? 'Email Address'
    : identifier.length > 0 ? 'Username' : 'Email or Username'

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
        {/* ── Hero ── */}
        <View style={S.hero}>
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={S.logo} resizeMode="cover" />
          ) : (
            <View style={S.logoFallback}>
              <Text style={S.logoFallbackText}>🍕</Text>
            </View>
          )}
          <Text style={S.appName}>{appName}</Text>
          <Text style={S.tagline}>Fast, Fresh, Delivered</Text>
        </View>

        {/* ── Card ── */}
        <Animated.View style={[S.card, { transform: [{ translateX: shakeAnim }] }]}>
          <Text style={S.cardTitle}>Welcome Back 👋</Text>

          {!!error && (
            <View style={S.errorBanner}>
              <Text style={S.errorText}>⚠️  {error}</Text>
            </View>
          )}

          {/* Google */}
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
            <Text style={S.divLabel}>or sign in with email / username</Text>
            <View style={S.divLine} />
          </View>

          {/* Identifier */}
          <Text style={S.label}>{inputLabel}</Text>
          <TextInput
            style={S.input}
            value={identifier}
            onChangeText={(v) => { setIdentifier(v); setError('') }}
            placeholder="you@example.com  or  yourname"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
            keyboardType={identifier.includes('@') ? 'email-address' : 'default'}
            autoComplete="username"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            editable={!busy}
          />

          {/* Password */}
          <Text style={S.label}>Password</Text>
          <View style={S.pwRow}>
            <TextInput
              ref={passwordRef}
              style={[S.input, S.pwInput]}
              value={password}
              onChangeText={(v) => { setPassword(v); setError('') }}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry={!showPw}
              autoComplete="current-password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              editable={!busy}
            />
            <TouchableOpacity
              style={S.eyeBtn}
              onPress={() => setShowPw(v => !v)}
              disabled={busy}
            >
              <Text style={S.eyeIcon}>{showPw ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          {/* Forgot */}
          <Link href={'/(auth)/forgot-password' as any} asChild>
            <TouchableOpacity disabled={busy} style={S.forgotWrap}>
              <Text style={S.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </Link>

          {/* Sign In */}
          <TouchableOpacity
            style={[S.signInBtn, busy && S.disabled]}
            onPress={handleLogin}
            disabled={busy}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={S.signInBtnText}>Sign In</Text>
            }
          </TouchableOpacity>

          {/* Sign Up */}
          <View style={S.signUpRow}>
            <Text style={S.signUpLabel}>Don&apos;t have an account? </Text>
            <Link href={'/(auth)/signup' as any} asChild>
              <TouchableOpacity disabled={busy}>
                <Text style={S.signUpLink}>Create one</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </Animated.View>

        <Text style={S.footer}>
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const S = StyleSheet.create({
  scroll: { flexGrow: 1, padding: 20, justifyContent: 'center' },

  hero: { alignItems: 'center', marginBottom: 28 },
  logo: { width: 96, height: 96, borderRadius: 48, marginBottom: 14, borderWidth: 3, borderColor: COLORS.primary },
  logoFallback: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#FFF3EE', alignItems: 'center', justifyContent: 'center',
    marginBottom: 14, borderWidth: 3, borderColor: COLORS.primary,
  },
  logoFallbackText: { fontSize: 44 },
  appName: { fontSize: 26, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  tagline: { fontSize: 13, color: COLORS.textLight, marginTop: 4 },

  card: {
    backgroundColor: '#fff', borderRadius: 24, padding: 24,
    elevation: 6, shadowColor: COLORS.primary,
    shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 18, textAlign: 'center' },

  errorBanner: {
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
    borderRadius: 10, padding: 12, marginBottom: 14,
  },
  errorText: { color: '#DC2626', fontSize: 13, fontWeight: '600' },

  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14,
    paddingVertical: 14, marginBottom: 18, backgroundColor: '#FAFAFA',
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  gIconWrap: {
    width: 26, height: 26, borderRadius: 6, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10, borderWidth: 1, borderColor: '#E5E7EB',
  },
  gIconText: { fontSize: 15, fontWeight: '900', color: COLORS.primary },
  googleBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.text },

  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  divLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  divLabel: { marginHorizontal: 8, color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },

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

  forgotWrap: { alignSelf: 'flex-end', marginBottom: 20 },
  forgotText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },

  signInBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14, padding: 16, alignItems: 'center',
    elevation: 3, shadowColor: COLORS.primary,
    shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  signInBtnText: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.3 },
  disabled: { opacity: 0.55 },

  signUpRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 18 },
  signUpLabel: { color: COLORS.textLight, fontSize: 14 },
  signUpLink: { color: COLORS.primary, fontWeight: '800', fontSize: 14 },

  footer: {
    textAlign: 'center', color: COLORS.textMuted,
    fontSize: 11, marginTop: 20, paddingHorizontal: 20, lineHeight: 16,
  },
})
