/* eslint-disable react-hooks/exhaustive-deps */
// src/app/(auth)/login/index.tsx
import React, { useEffect, useRef, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  Image, Animated, Linking,
} from 'react-native'
import * as AppleAuthentication from 'expo-apple-authentication'
import { Stack, router } from 'expo-router'
import { supabase }             from '../../../lib/supabase'
import { signInWithGoogle }     from '../../../lib/googleAuth'
import { signInWithApple, isAppleSignInAvailable } from '../../../lib/apple'
import { AppStatusBar }         from '../../../components/ui/AppStatusBar'
import { useColors }            from '../../../contexts/ThemeContext'   // ← was COLORS

// ── Types ─────────────────────────────────────────────────────────────────────
type AppSettings = { app_name?: string; app_logo_url?: string }

// ── Helpers ───────────────────────────────────────────────────────────────────
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

async function resolveEmail(input: string): Promise<string> {
  const trimmed = input.trim()
  if (!trimmed) throw new Error('Please enter your email or username.')
  if (trimmed.includes('@')) return trimmed.toLowerCase()
  const { data: email, error } = await supabase
    .rpc('get_email_by_username', { p_username: trimmed })
  if (error) throw new Error('Could not look up username. Please try again.')
  if (!email) throw new Error(`No account found for username "${trimmed}".`)
  return String(email).toLowerCase()
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Login() {
  const colors = useColors()   // ← LIVE theme colours

  const [identifier, setIdentifier] = useState('')
  const [password,   setPassword]   = useState('')
  const [showPw,     setShowPw]     = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [gLoading,   setGLoading]   = useState(false)
  const [aLoading,   setALoading]   = useState(false)
  const [error,      setError]      = useState('')
  const [settings,   setSettings]   = useState<AppSettings>({})
  const [appleAvail, setAppleAvail] = useState(false)
  const [idFocused,  setIdFocused]  = useState(false)
  const [pwFocused,  setPwFocused]  = useState(false)

  const shakeAnim   = useRef(new Animated.Value(0)).current
  const passwordRef = useRef<any>(null)
  const heroAnim    = useRef(new Animated.Value(0)).current
  const guestAnim   = useRef(new Animated.Value(0)).current
  const cardAnim    = useRef(new Animated.Value(0)).current
  const heroY       = useRef(new Animated.Value(-12)).current
  const guestY      = useRef(new Animated.Value(12)).current
  const cardY       = useRef(new Animated.Value(18)).current
  const idBorder    = useRef(new Animated.Value(0)).current
  const pwBorder    = useRef(new Animated.Value(0)).current
  const signInScale = useRef(new Animated.Value(1)).current
  const guestScale  = useRef(new Animated.Value(1)).current

  useEffect(() => {
    fetchAppSettings().then(setSettings)
    isAppleSignInAvailable().then(setAppleAvail)
    Animated.stagger(90, [
      Animated.parallel([
        Animated.timing(heroAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(heroY,    { toValue: 0, damping: 18, stiffness: 180, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(guestAnim, { toValue: 1, duration: 340, useNativeDriver: true }),
        Animated.spring(guestY,    { toValue: 0, damping: 18, stiffness: 180, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(cardAnim, { toValue: 1, duration: 340, useNativeDriver: true }),
        Animated.spring(cardY,    { toValue: 0, damping: 18, stiffness: 170, useNativeDriver: true }),
      ]),
    ]).start()
  }, [])

  useEffect(() => {
    Animated.timing(idBorder, { toValue: idFocused ? 1 : 0, duration: 160, useNativeDriver: false }).start()
  }, [idFocused])

  useEffect(() => {
    Animated.timing(pwBorder, { toValue: pwFocused ? 1 : 0, duration: 160, useNativeDriver: false }).start()
  }, [pwFocused])

  function shake() {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 55, useNativeDriver: true }),
    ]).start()
  }

  function pressIn(anim: Animated.Value)  { Animated.spring(anim, { toValue: 0.96, useNativeDriver: true, speed: 60 }).start() }
  function pressOut(anim: Animated.Value) { Animated.spring(anim, { toValue: 1,    useNativeDriver: true, speed: 60 }).start() }

  async function handleLogin() {
    setError('')
    const id = identifier.trim()
    if (!id || !password) { setError('Please fill in all fields.'); shake(); return }
    setLoading(true)
    try {
      const email = await resolveEmail(id)
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError
    } catch (err: any) {
      const msg = String(err?.message ?? '')
      shake()
      if (/no account for/i.test(msg))                   setError(msg)
      else if (/invalid login|invalid credentials/i.test(msg)) setError('Incorrect email/username or password.')
      else if (/email not confirmed/i.test(msg))          setError('Please verify your email first.')
      else if (/too many/i.test(msg))                     setError('Too many attempts. Please wait a moment.')
      else                                                 setError(msg || 'Sign in failed. Please try again.')
    } finally { setLoading(false) }
  }

  async function handleGoogle() {
    setError(''); setGLoading(true)
    try { await signInWithGoogle() }
    catch (err: any) { if (err.message !== 'Sign in was cancelled') setError(err.message || 'Google sign-in failed.') }
    finally { setGLoading(false) }
  }

  async function handleApple() {
    setError(''); setALoading(true)
    try { await signInWithApple() }
    catch (err: any) {
      const msg = String(err?.message ?? '')
      const code = (err as any)?.code ?? ''
      if (code === 'ERR_REQUEST_CANCELED' || msg.includes('ERR_REQUEST_CANCELED') || msg.includes('Sign in was cancelled')) return
      setError(msg || 'Apple sign-in failed.')
    } finally { setALoading(false) }
  }

  const busy         = loading || gLoading || aLoading
  const appName      = settings?.app_name  || 'PattiBytes Express'
  const logoUrl      = settings?.app_logo_url || null
  const inputLabel   = identifier.includes('@') ? 'Email' : identifier.length > 0 ? 'Username' : 'Email or Username'

  // Animated border colors — re-created each render so they follow active theme
  const idBorderColor = idBorder.interpolate({ inputRange: [0, 1], outputRange: [colors.border, colors.primary] })
  const pwBorderColor = pwBorder.interpolate({ inputRange: [0, 1], outputRange: [colors.border, colors.primary] })

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.backgroundLight }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <AppStatusBar backgroundColor={colors.backgroundLight} style="dark" />
      <ScrollView
        contentContainerStyle={S.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <Animated.View style={[S.hero, { opacity: heroAnim, transform: [{ translateY: heroY }] }]}>
          {logoUrl
            ? <Image source={{ uri: logoUrl }} style={[S.logo, { borderColor: colors.primary }]} resizeMode="cover" />
            : <View style={[S.logoFallback, { backgroundColor: colors.backgroundLight, borderColor: colors.primary }]}>
                <Text style={S.logoFallbackText}>🍛</Text>
              </View>
          }
          <Text style={[S.appName, { color: colors.text }]}>{appName}</Text>
          <Text style={[S.tagline, { color: colors.textLight }]}>Fast, Fresh, Delivered</Text>
        </Animated.View>

        {/* Guest browse */}
        <Animated.View style={{ opacity: guestAnim, transform: [{ translateY: guestY }] }}>
          <Animated.View style={{ transform: [{ scale: guestScale }] }}>
            <TouchableOpacity
              style={[S.guestBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={() => router.replace('/(customer)/dashboard' as any)}
              onPressIn={() => pressIn(guestScale)}
              onPressOut={() => pressOut(guestScale)}
              disabled={busy} activeOpacity={1}
            >
              <Text style={S.guestBtnIcon}>🛍️</Text>
              <View style={{ flex: 1 }}>
                <Text style={[S.guestBtnText, { color: colors.text }]}>Browse as Guest</Text>
                <Text style={[S.guestBtnSub, { color: colors.textMuted }]}>View menu &amp; offers — no account needed</Text>
              </View>
              <Text style={[S.guestBtnArrow, { color: colors.textMuted }]}>›</Text>
            </TouchableOpacity>
          </Animated.View>

          <View style={S.orRow}>
            <View style={[S.divLine, { backgroundColor: colors.border }]} />
            <Text style={[S.orLabel, { color: colors.textMuted }]}>sign in to order</Text>
            <View style={[S.divLine, { backgroundColor: colors.border }]} />
          </View>
        </Animated.View>

        {/* Sign-in card */}
        <Animated.View
          style={[
            S.card,
            { backgroundColor: colors.card, shadowColor: colors.primary },
            { opacity: cardAnim, transform: [{ translateX: shakeAnim }, { translateY: cardY }] },
          ]}
        >
          {!!error && (
            <View style={S.errorBanner}>
              <Text style={S.errorText}>{error}</Text>
            </View>
          )}

          {/* Apple */}
          {appleAvail && (
            <View style={[S.appleWrap, busy && { opacity: 0.55 }]} pointerEvents={busy ? 'none' : 'auto'}>
              {aLoading
                ? <View style={S.appleBtnFallback}><ActivityIndicator color="#FFF" /><Text style={S.appleBtnFallbackTxt}>Signing in with Apple</Text></View>
                : <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                    cornerRadius={14} style={S.appleBtn} onPress={handleApple}
                  />
              }
            </View>
          )}

          {/* Google */}
          <TouchableOpacity
            style={[S.googleBtn, { borderColor: colors.border }, busy && S.disabled]}
            onPress={handleGoogle} disabled={busy} activeOpacity={0.8}
          >
            {gLoading
              ? <ActivityIndicator color={colors.text} />
              : <>
                  <View style={[S.gIconWrap, { borderColor: colors.border }]}>
                    <Text style={[S.gIconText, { color: colors.primary }]}>G</Text>
                  </View>
                  <Text style={[S.googleBtnText, { color: colors.text }]}>Continue with Google</Text>
                </>
            }
          </TouchableOpacity>

          {/* Divider */}
          <View style={S.divider}>
            <View style={[S.divLine, { backgroundColor: colors.border }]} />
            <Text style={[S.divLabel, { color: colors.textMuted }]}>or email / username</Text>
            <View style={[S.divLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Email / Username */}
          <Text style={[S.label, { color: colors.text }]}>{inputLabel}</Text>
          <Animated.View style={[S.inputWrap, { borderColor: idBorderColor, backgroundColor: colors.backgroundLight }]}>
            <TextInput
              style={[S.inputInner, { color: colors.text }]}
              value={identifier}
              onChangeText={v => { setIdentifier(v); setError('') }}
              onFocus={() => setIdFocused(true)}
              onBlur={() => setIdFocused(false)}
              placeholder="you@example.com or yourname"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType={identifier.includes('@') ? 'email-address' : 'default'}
              autoComplete="username"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              editable={!busy}
            />
          </Animated.View>

          {/* Password */}
          <Text style={[S.label, { color: colors.text }]}>Password</Text>
          <View style={S.pwRow}>
            <Animated.View style={[S.inputWrap, { flex: 1, borderColor: pwBorderColor, backgroundColor: colors.backgroundLight }]}>
              <TextInput
                ref={passwordRef}
                style={[S.inputInner, { color: colors.text }]}
                value={password}
                onChangeText={v => { setPassword(v); setError('') }}
                onFocus={() => setPwFocused(true)}
                onBlur={() => setPwFocused(false)}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPw}
                autoComplete="current-password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                editable={!busy}
              />
            </Animated.View>
            <TouchableOpacity style={S.eyeBtn} onPress={() => setShowPw(v => !v)} disabled={busy}>
              <Text style={S.eyeIcon}>{showPw ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>

          {/* Forgot */}
          <TouchableOpacity disabled={busy} style={S.forgotWrap} onPress={() => router.push('/(auth)/forgot-password' as any)}>
            <Text style={[S.forgotText, { color: colors.primary }]}>Forgot password?</Text>
          </TouchableOpacity>

          {/* Sign In */}
          <Animated.View style={{ transform: [{ scale: signInScale }] }}>
            <TouchableOpacity
              style={[S.signInBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }, busy && S.disabled]}
              onPress={handleLogin}
              onPressIn={() => pressIn(signInScale)}
              onPressOut={() => pressOut(signInScale)}
              disabled={busy} activeOpacity={1}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={S.signInBtnText}>Sign In</Text>
              }
            </TouchableOpacity>
          </Animated.View>

          {/* Sign up link */}
          <View style={S.signUpRow}>
            <Text style={[S.signUpLabel, { color: colors.textLight }]}>No account? </Text>
            <TouchableOpacity disabled={busy} onPress={() => router.push('/(auth)/signup' as any)}>
              <Text style={[S.signUpLink, { color: colors.primary }]}>Create one</Text>
            </TouchableOpacity>
          </View>

          <View style={[S.whyRow, { borderTopColor: colors.border }]}>
            <Text style={[S.whyText, { color: colors.textMuted }]}>Account needed only for checkout, addresses &amp; order history.</Text>
          </View>
        </Animated.View>

        {/* Footer */}
        <Text style={[S.footer, { color: colors.textMuted }]}>
          By signing in you agree to our{' '}
          <Text style={[S.footerLink, { color: colors.primary }]} onPress={() => router.push('/legal/terms-of-service' as any)}>Terms</Text>
          {' '}and{' '}
          <Text style={[S.footerLink, { color: colors.primary }]} onPress={() => router.push('/legal/privacy-policy' as any)}>Privacy Policy</Text>.
        </Text>
        <Text style={{ color: '#9CA3AF', textAlign: 'center', fontSize: 11, marginTop: 6 }}
          onPress={() => Linking.openURL('https://www.instagram.com/thrillyverse')}>
          Developed with ❤️ by Thrillyverse
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

// ── Styles — layout only, no colour values ────────────────────────────────────
const S = StyleSheet.create({
  scroll:           { flexGrow: 1, padding: 20, paddingTop: 40, justifyContent: 'center' },
  hero:             { alignItems: 'center', marginBottom: 22 },
  logo:             { width: 80, height: 80, borderRadius: 40, marginBottom: 12, borderWidth: 3 },
  logoFallback:     { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 3 },
  logoFallbackText: { fontSize: 36 },
  appName:          { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  tagline:          { fontSize: 12, marginTop: 3 },
  guestBtn:         { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 14, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  guestBtnIcon:     { fontSize: 22 },
  guestBtnText:     { fontSize: 15, fontWeight: '800' },
  guestBtnSub:      { fontSize: 11, marginTop: 1 },
  guestBtnArrow:    { fontSize: 22 },
  orRow:            { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  orLabel:          { marginHorizontal: 10, fontSize: 11, fontWeight: '600' },
  card:             { borderRadius: 24, padding: 22, elevation: 6, shadowOpacity: 0.10, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
  errorBanner:      { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 10, padding: 11, marginBottom: 14 },
  errorText:        { color: '#DC2626', fontSize: 13, fontWeight: '600' },
  appleWrap:        { marginBottom: 11 },
  appleBtn:         { width: '100%', height: 50 },
  appleBtnFallback: { height: 50, backgroundColor: '#000', borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  appleBtnFallbackTxt: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  googleBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderRadius: 14, paddingVertical: 13, marginBottom: 16, backgroundColor: '#FAFAFA', elevation: 1, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  gIconWrap:        { width: 24, height: 24, borderRadius: 5, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 10, borderWidth: 1 },
  gIconText:        { fontSize: 14, fontWeight: '900' },
  googleBtnText:    { fontSize: 14, fontWeight: '700' },
  divider:          { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  divLine:          { flex: 1, height: 1 },
  divLabel:         { marginHorizontal: 8, fontSize: 11, fontWeight: '600' },
  label:            { fontSize: 12, fontWeight: '700', marginBottom: 5 },
  inputWrap:        { borderWidth: 1.5, borderRadius: 12, marginBottom: 13 },
  inputInner:       { padding: 13, fontSize: 15 },
  pwRow:            { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  eyeBtn:           { padding: 10 },
  eyeIcon:          { fontSize: 18 },
  forgotWrap:       { alignSelf: 'flex-end', marginBottom: 18 },
  forgotText:       { fontWeight: '700', fontSize: 13 },
  signInBtn:        { borderRadius: 14, padding: 15, alignItems: 'center', elevation: 3, shadowOpacity: 0.38, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  signInBtnText:    { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.2 },
  disabled:         { opacity: 0.55 },
  signUpRow:        { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  signUpLabel:      { fontSize: 14 },
  signUpLink:       { fontWeight: '800', fontSize: 14 },
  whyRow:           { marginTop: 14, paddingTop: 12, borderTopWidth: 1 },
  whyText:          { fontSize: 11, textAlign: 'center', lineHeight: 16 },
  footer:           { textAlign: 'center', fontSize: 11, marginTop: 18, paddingHorizontal: 20, lineHeight: 16 },
  footerLink:       { fontWeight: '700' },
})
