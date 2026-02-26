import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native'
import { Link } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { signInWithGoogle } from '../../../lib/googleAuth'
import { COLORS } from '../../../lib/constants'

export default function Signup() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [terms, setTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [gLoading, setGLoading] = useState(false)

  async function handleSignup() {
    if (!fullName.trim() || !email.trim() || !password)
      return Alert.alert('Error', 'Please fill required fields')
    if (password.length < 6)
      return Alert.alert('Error', 'Password must be at least 6 characters')
    if (password !== confirm)
      return Alert.alert('Error', 'Passwords do not match')
    if (!terms)
      return Alert.alert('Error', 'Please accept the terms and conditions')

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { full_name: fullName.trim(), phone: phone.trim() } },
      })
      if (error) throw error
      if (data.user?.id) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email: data.user.email,
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          role: 'customer',
          approval_status: 'approved',
          is_active: true,
        })
      }
      Alert.alert('Success!', 'Account created. Please check your email to verify.')
    } catch (err: any) {
      Alert.alert('Signup Failed', err.message || 'Could not create account')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setGLoading(true)
    try { await signInWithGoogle() }
    catch (err: any) {
      if (err.message !== 'Sign in was cancelled') Alert.alert('Error', err.message)
    }
    finally { setGLoading(false) }
  }

  const busy = loading || gLoading

  return (
    <ScrollView contentContainerStyle={S.scroll} keyboardShouldPersistTaps="handled">
      <Text style={S.title}>Create Account</Text>
      <Text style={S.sub}>Join Pattibytes Express today</Text>

      <TouchableOpacity style={[S.googleBtn, busy && S.disabled]} onPress={handleGoogle} disabled={busy}>
        {gLoading
          ? <ActivityIndicator />
          : <><Text style={S.googleG}>G</Text><Text style={S.googleText}>Continue with Google</Text></>
        }
      </TouchableOpacity>

      <View style={S.divider}><View style={S.line}/><Text style={S.or}>OR</Text><View style={S.line}/></View>

      <Text style={S.label}>Full Name *</Text>
      <TextInput style={S.input} value={fullName} onChangeText={setFullName} placeholder="John Doe" autoCapitalize="words" editable={!busy} />

      <Text style={S.label}>Email *</Text>
      <TextInput style={S.input} value={email} onChangeText={setEmail} placeholder="your@email.com" autoCapitalize="none" keyboardType="email-address" editable={!busy} />

      <Text style={S.label}>Phone (Optional)</Text>
      <TextInput style={S.input} value={phone} onChangeText={setPhone} placeholder="9876543210" keyboardType="phone-pad" editable={!busy} />

      <Text style={S.label}>Password *</Text>
      <TextInput style={S.input} value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry editable={!busy} />

      <Text style={S.label}>Confirm Password *</Text>
      <TextInput style={S.input} value={confirm} onChangeText={setConfirm} placeholder="••••••••" secureTextEntry editable={!busy} />

      <TouchableOpacity style={S.checkRow} onPress={() => setTerms(!terms)} disabled={busy}>
        <View style={[S.checkbox, terms && S.checked]}>
          {terms && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}
        </View>
        <Text style={S.checkText}>I accept the <Text style={S.link}>Terms & Conditions</Text></Text>
      </TouchableOpacity>

      <TouchableOpacity style={[S.btn, busy && S.disabled]} onPress={handleSignup} disabled={busy}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={S.btnText}>Create Account</Text>}
      </TouchableOpacity>

      <View style={S.footer}>
        <Text style={{ color: COLORS.textLight, fontSize: 14 }}>Already have an account? </Text>
        <Link href={'/(auth)/login' as any} asChild>
          <TouchableOpacity disabled={busy}><Text style={S.link}>Sign In</Text></TouchableOpacity>
        </Link>
      </View>
    </ScrollView>
  )
}

const S = StyleSheet.create({
  scroll: { flexGrow: 1, padding: 20, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text, textAlign: 'center', marginBottom: 6 },
  sub: { fontSize: 14, color: COLORS.textLight, textAlign: 'center', marginBottom: 24 },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, padding: 14, marginBottom: 16,
  },
  googleG: { fontSize: 18, fontWeight: '800', color: COLORS.primary, marginRight: 10 },
  googleText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  line: { flex: 1, height: 1, backgroundColor: COLORS.border },
  or: { marginHorizontal: 12, color: COLORS.textLight, fontSize: 12 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, padding: 14,
    fontSize: 15, color: COLORS.text, marginBottom: 14, backgroundColor: COLORS.backgroundLight,
  },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  checkbox: {
    width: 22, height: 22, borderWidth: 2, borderColor: COLORS.border,
    borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  checked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkText: { fontSize: 14, color: COLORS.text, flex: 1 },
  btn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  disabled: { opacity: 0.6 },
  link: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
})
