// app/(auth)/signup.tsx
import React, { useCallback, useRef, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native'
import { Link, useRouter } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { signInWithGoogle } from '../../../lib/googleAuth'
import { COLORS } from '../../../lib/constants'

type FieldErrors = Record<string, string>

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

// module-level timer so it survives re-renders without useRef
let uTimer: ReturnType<typeof setTimeout>

export default function Signup() {
  const router = useRouter()

  const [fullName, setFullName]   = useState('')
  const [username, setUsername]   = useState('')
  const [email, setEmail]         = useState('')
  const [phone, setPhone]         = useState('')
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [showCf, setShowCf]       = useState(false)
  const [terms, setTerms]         = useState(false)
  const [loading, setLoading]     = useState(false)
  const [gLoading, setGLoading]   = useState(false)
  const [fieldErrors, setFE]      = useState<FieldErrors>({})
  const [globalError, setGE]      = useState('')
  const [unStatus, setUnStatus]   = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')

  const emailRef   = useRef<TextInput>(null)
  const phoneRef   = useRef<TextInput>(null)
  const pwRef      = useRef<TextInput>(null)
  const confirmRef = useRef<TextInput>(null)

  const pwStrength = passwordStrength(password)

  function clearFE(field: string) {
    setFE(p => { const n = { ...p }; delete n[field]; return n })
    setGE('')
  }

  const handleUsernameChange = useCallback((val: string) => {
    // Only allow lowercase letters, numbers, dots, underscores
    const cleaned = val.toLowerCase().replace(/[^a-z0-9_.]/g, '')
    setUsername(cleaned)
    clearFE('username')
    setUnStatus('idle')
    if (cleaned.length >= 3) {
      setUnStatus('checking')
      clearTimeout(uTimer)
      uTimer = setTimeout(async () => {
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .ilike('username', cleaned)
          .maybeSingle()
        setUnStatus(data ? 'taken' : 'available')
      }, 500)
    }
  }, [])

  function validate(): boolean {
    const e: FieldErrors = {}
    if (!fullName.trim())                          e.fullName = 'Full name is required.'
    if (username.length > 0 && username.length < 3) e.username = 'Minimum 3 characters.'
    if (unStatus === 'taken')                       e.username = 'Username already taken.'
    if (!email.trim() || !email.includes('@'))      e.email    = 'Enter a valid email address.'
    if (!password)                                   e.password = 'Password is required.'
    if (password.length < 6)                         e.password = 'Minimum 6 characters.'
    if (password !== confirm)                        e.confirm  = 'Passwords do not match.'
    if (!terms)                                      e.terms    = 'Please accept the terms.'
    setFE(e)
    return Object.keys(e).length === 0
  }

  async function handleSignup() {
    setGE('')
    if (!validate()) return

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim() || null,
          },
        },
      })
      if (error) throw error
      if (!data.user?.id) throw new Error('Signup failed — no user returned.')

      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: data.user.email,
        full_name: fullName.trim(),
        username: username.trim() || null,
        phone: phone.trim() || null,
        role: 'customer',
        approval_status: 'approved',
        is_active: true,
        profile_completed: true,
      })

      router.replace('/(auth)/verify-email' as any)
    } catch (err: any) {
      const msg: string = err?.message ?? ''
      if (/already registered/i.test(msg)) {
        setGE('This email is already registered. Please sign in instead.')
      } else if (/rate limit/i.test(msg)) {
        setGE('Too many attempts. Please wait a few minutes.')
      } else {
        setGE(msg || 'Could not create account. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setGLoading(true)
    try {
      await signInWithGoogle()
    } catch (err: any) {
      if (err.message !== 'Sign in was cancelled') setGE(err.message || 'Google sign-in failed.')
    } finally {
      setGLoading(false)
    }
  }

  const busy = loading || gLoading

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
        <Text style={S.title}>Create Account</Text>
        <Text style={S.sub}>Join PattiBytes Express today</Text>

        {!!globalError && (
          <View style={S.errorBanner}>
            <Text style={S.errorText}>⚠️  {globalError}</Text>
          </View>
        )}

        {/* Google */}
        <TouchableOpacity
          style={[S.googleBtn, busy && S.disabled]}
          onPress={handleGoogle} disabled={busy} activeOpacity={0.8}
        >
          {gLoading ? <ActivityIndicator color={COLORS.text} /> : (
            <>
              <View style={S.gIconWrap}><Text style={S.gIconText}>G</Text></View>
              <Text style={S.googleBtnText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={S.divider}>
          <View style={S.divLine} />
          <Text style={S.divLabel}>OR</Text>
          <View style={S.divLine} />
        </View>

        {/* Full Name */}
        <Text style={S.label}>Full Name <Text style={S.req}>*</Text></Text>
        <TextInput
          style={[S.input, !!fieldErrors.fullName && S.inputError]}
          value={fullName}
          onChangeText={v => { setFullName(v); clearFE('fullName') }}
          placeholder="John Doe"
          autoCapitalize="words"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
          editable={!busy}
        />
        {!!fieldErrors.fullName && <Text style={S.fieldErr}>{fieldErrors.fullName}</Text>}

        {/* Username */}
        <Text style={S.label}>Username <Text style={S.opt}>(optional, used for login)</Text></Text>
        <View style={S.rowWrap}>
          <TextInput
            style={[S.input, { flex: 1, marginBottom: 0 }, !!fieldErrors.username && S.inputError]}
            value={username}
            onChangeText={handleUsernameChange}
            placeholder="johndoe_123"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            editable={!busy}
          />
          <View style={S.statusIcon}>
            {unStatus === 'checking'  && <ActivityIndicator size="small" color={COLORS.primary} />}
            {unStatus === 'available' && <Text style={{ color: '#10B981', fontSize: 18 }}>✓</Text>}
            {unStatus === 'taken'     && <Text style={{ color: '#EF4444', fontSize: 18 }}>✗</Text>}
          </View>
        </View>
        {!!fieldErrors.username && <Text style={S.fieldErr}>{fieldErrors.username}</Text>}
        {unStatus === 'available' && !fieldErrors.username && (
          <Text style={[S.fieldErr, { color: '#10B981' }]}>Username available!</Text>
        )}
        <View style={{ height: 14 }} />

        {/* Email */}
        <Text style={S.label}>Email Address <Text style={S.req}>*</Text></Text>
        <TextInput
          ref={emailRef}
          style={[S.input, !!fieldErrors.email && S.inputError]}
          value={email}
          onChangeText={v => { setEmail(v); clearFE('email') }}
          placeholder="your@email.com"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          returnKeyType="next"
          onSubmitEditing={() => phoneRef.current?.focus()}
          editable={!busy}
        />
        {!!fieldErrors.email && <Text style={S.fieldErr}>{fieldErrors.email}</Text>}

        {/* Phone */}
        <Text style={S.label}>Phone <Text style={S.opt}>(optional)</Text></Text>
        <TextInput
          ref={phoneRef}
          style={S.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="9876543210"
          keyboardType="phone-pad"
          returnKeyType="next"
          onSubmitEditing={() => pwRef.current?.focus()}
          editable={!busy}
        />

        {/* Password */}
        <Text style={S.label}>Password <Text style={S.req}>*</Text></Text>
        <View style={S.rowWrap}>
          <TextInput
            ref={pwRef}
            style={[S.input, { flex: 1, marginBottom: 0 }, !!fieldErrors.password && S.inputError]}
            value={password}
            onChangeText={v => { setPassword(v); clearFE('password') }}
            placeholder="Min 6 characters"
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry={!showPw}
            autoComplete="new-password"
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
            editable={!busy}
          />
          <TouchableOpacity style={S.eyeBtn} onPress={() => setShowPw(v => !v)} disabled={busy}>
            <Text style={S.eyeIcon}>{showPw ? '🙈' : '👁️'}</Text>
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
        {!!fieldErrors.password && <Text style={S.fieldErr}>{fieldErrors.password}</Text>}
        <View style={{ height: 14 }} />

        {/* Confirm Password */}
        <Text style={S.label}>Confirm Password <Text style={S.req}>*</Text></Text>
        <View style={S.rowWrap}>
          <TextInput
            ref={confirmRef}
            style={[S.input, { flex: 1, marginBottom: 0 }, !!fieldErrors.confirm && S.inputError]}
            value={confirm}
            onChangeText={v => { setConfirm(v); clearFE('confirm') }}
            placeholder="••••••••"
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry={!showCf}
            autoComplete="new-password"
            returnKeyType="done"
            onSubmitEditing={handleSignup}
            editable={!busy}
          />
          <TouchableOpacity style={S.eyeBtn} onPress={() => setShowCf(v => !v)} disabled={busy}>
            <Text style={S.eyeIcon}>{showCf ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>
        {!!fieldErrors.confirm && <Text style={S.fieldErr}>{fieldErrors.confirm}</Text>}
        <View style={{ height: 14 }} />

        {/* Terms */}
        <TouchableOpacity
          style={S.checkRow}
          onPress={() => { setTerms(v => !v); clearFE('terms') }}
          disabled={busy}
        >
          <View style={[S.checkbox, terms && S.checked]}>
            {terms && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>✓</Text>}
          </View>
          <Text style={S.checkText}>
            I accept the <Text style={S.link}>Terms & Conditions</Text>
            {' '}and <Text style={S.link}>Privacy Policy</Text>
          </Text>
        </TouchableOpacity>
        {!!fieldErrors.terms && <Text style={[S.fieldErr, { marginBottom: 12 }]}>{fieldErrors.terms}</Text>}

        {/* Submit */}
        <TouchableOpacity
          style={[S.btn, busy && S.disabled]}
          onPress={handleSignup} disabled={busy} activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={S.btnText}>Create Account</Text>
          }
        </TouchableOpacity>

        <View style={S.footer}>
          <Text style={{ color: COLORS.textLight, fontSize: 14 }}>Already have an account? </Text>
          <Link href={'/(auth)/login' as any} asChild>
            <TouchableOpacity disabled={busy}>
              <Text style={S.link}>Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const S = StyleSheet.create({
  scroll: { flexGrow: 1, padding: 20, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text, textAlign: 'center', marginBottom: 6 },
  sub:   { fontSize: 14, color: COLORS.textLight, textAlign: 'center', marginBottom: 24 },

  errorBanner: {
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
    borderRadius: 10, padding: 12, marginBottom: 14,
  },
  errorText: { color: '#DC2626', fontSize: 13, fontWeight: '600' },

  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 14,
    paddingVertical: 14, marginBottom: 18, backgroundColor: '#FAFAFA',
  },
  gIconWrap: {
    width: 26, height: 26, borderRadius: 6, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10, borderWidth: 1, borderColor: '#E5E7EB',
  },
  gIconText:     { fontSize: 15, fontWeight: '900', color: COLORS.primary },
  googleBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.text },

  divider:  { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  divLine:  { flex: 1, height: 1, backgroundColor: COLORS.border },
  divLabel: { marginHorizontal: 12, color: COLORS.textLight, fontSize: 12 },

  label: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  req:   { color: '#EF4444' },
  opt:   { color: COLORS.textMuted, fontWeight: '500' },

  input: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    padding: 14, fontSize: 15, color: COLORS.text,
    marginBottom: 4, backgroundColor: COLORS.backgroundLight,
  },
  inputError: { borderColor: '#EF4444' },
  fieldErr:   { color: '#DC2626', fontSize: 12, fontWeight: '600', marginBottom: 8 },

  rowWrap:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  statusIcon: { width: 28, alignItems: 'center' },
  eyeBtn:     { padding: 10 },
  eyeIcon:    { fontSize: 18 },

  strengthRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, marginBottom: 4 },
  strengthBar:  { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 11, fontWeight: '700', width: 44 },

  checkRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 10 },
  checkbox: {
    width: 22, height: 22, borderWidth: 2, borderColor: COLORS.border,
    borderRadius: 6, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  checked:   { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkText: { flex: 1, fontSize: 14, color: COLORS.text, lineHeight: 20 },

  btn:     { backgroundColor: COLORS.primary, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  disabled: { opacity: 0.55 },

  link:   { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
})
