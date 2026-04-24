/* eslint-disable react-hooks/exhaustive-deps */
// app/(auth)/complete-profile/index.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Keyboard,
  KeyboardAvoidingView, Platform, Animated, Image,
} from 'react-native'
import { Stack, useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import { COLORS } from '../../../lib/constants'
import { AppStatusBar } from '../../../components/ui/AppStatusBar'

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = 'customer' | 'driver' | 'merchant' | 'admin' | 'superadmin'

type ProfileDraft = {
  full_name: string
  username:  string
  phone:     string
  // Address fields
  address:   string
  city:      string
  state:     string
  pincode:   string
  // Merchant only
  logo_url:  string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Customers: 2 steps — Identity (no avatar) + Address
 * Drivers:   2 steps — Identity (with avatar) + Location
 * Merchants: 3 steps — Identity (with avatar) + Business Address + Logo
 * Admins:    1 step  — Identity only
 */
const STEPS_BY_ROLE: Record<Role, number> = {
  customer:   2,
  driver:     2,
  merchant:   3,
  admin:      1,
  superadmin: 1,
}

const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ step, total }: { step: number; total: number }) {
  const width = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(width, {
      toValue: (step / total) * 100,
      duration: 320,
      useNativeDriver: false,
    }).start()
  }, [step, total])

  return (
    <View style={pb.track}>
      <Animated.View
        style={[pb.fill, {
          width: width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
        }]}
      />
    </View>
  )
}

const pb = StyleSheet.create({
  track: { height: 4, backgroundColor: '#E5E7EB', borderRadius: 2,
           marginHorizontal: 24, marginBottom: 24 },
  fill:  { height: 4, backgroundColor: COLORS.primary, borderRadius: 2 },
})

// ── Labeled Input ─────────────────────────────────────────────────────────────

function Field({
  label, value, onChange, placeholder, keyboardType, autoCapitalize,
  maxLength, hint, error, prefix, autoFocus = false, editable = true,
}: {
  label:           string
  value:           string
  onChange:        (v: string) => void
  placeholder?:    string
  keyboardType?:   'default' | 'phone-pad' | 'email-address' | 'numeric'
  autoCapitalize?: 'none' | 'sentences' | 'words'
  maxLength?:      number
  hint?:           string
  error?:          string
  prefix?:         string
  autoFocus?:      boolean
  editable?:       boolean
}) {
  const [focused, setFocused] = useState(false)
  const anim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(anim, {
      toValue: focused ? 1 : 0, duration: 150, useNativeDriver: false,
    }).start()
  }, [focused])

  const borderColor = anim.interpolate({
    inputRange:  [0, 1],
    outputRange: [error ? '#FCA5A5' : '#E5E7EB', error ? '#DC2626' : COLORS.primary],
  })

  return (
    <View style={fi.wrap}>
      <Text style={fi.label}>{label}</Text>
      <Animated.View style={[fi.inputBox, { borderColor }]}>
        {prefix ? <Text style={fi.prefix}>{prefix}</Text> : null}
        <TextInput
          style={[fi.input, prefix ? { paddingLeft: 0 } : null]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          keyboardType={keyboardType ?? 'default'}
          autoCapitalize={autoCapitalize ?? 'sentences'}
          maxLength={maxLength}
          autoFocus={autoFocus}
          editable={editable}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </Animated.View>
      {hint && !error && <Text style={fi.hint}>{hint}</Text>}
      {error ? <Text style={fi.error}>⚠ {error}</Text> : null}
    </View>
  )
}

const fi = StyleSheet.create({
  wrap:     { marginBottom: 16 },
  label:    { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 5 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 12,
    backgroundColor: '#FAFAFA', paddingHorizontal: 13,
  },
  prefix: { fontSize: 15, color: '#6B7280', marginRight: 4 },
  input:  { flex: 1, paddingVertical: 13, fontSize: 15, color: '#111827' },
  hint:   { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  error:  { fontSize: 11, color: '#DC2626', marginTop: 4, fontWeight: '600' },
})

// ── Avatar Picker (drivers + merchants only) ──────────────────────────────────

function AvatarPicker({
  uri, onPick, uploading,
}: {
  uri: string | null; onPick: (uri: string) => void; uploading: boolean
}) {
  async function pick() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo access to set your avatar.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    })
    if (!result.canceled && result.assets[0]?.uri) {
      onPick(result.assets[0].uri)
    }
  }

  return (
    <TouchableOpacity style={av.wrap} onPress={pick} activeOpacity={0.8}>
      {uri ? (
        <Image source={{ uri }} style={av.img} />
      ) : (
        <View style={av.placeholder}>
          <Ionicons name="person" size={36} color="#9CA3AF" />
        </View>
      )}
      <View style={av.badge}>
        {uploading
          ? <ActivityIndicator size="small" color="#fff" />
          : <Ionicons name="camera" size={14} color="#fff" />
        }
      </View>
    </TouchableOpacity>
  )
}

const av = StyleSheet.create({
  wrap:        { alignSelf: 'center', marginBottom: 24, marginTop: 4 },
  img:         { width: 88, height: 88, borderRadius: 44,
                 borderWidth: 3, borderColor: COLORS.primary },
  placeholder: { width: 88, height: 88, borderRadius: 44,
                 backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
                 borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed' },
  badge:       { position: 'absolute', bottom: 0, right: 0,
                 backgroundColor: COLORS.primary, borderRadius: 14, padding: 6,
                 borderWidth: 2, borderColor: '#fff' },
})

// ── Step indicator chip ────────────────────────────────────────────────────────

function StepChip({ num, label, active, done }: {
  num: number; label: string; active: boolean; done: boolean
}) {
  return (
    <View style={sc.row}>
      <View style={[sc.dot,
        done   && { backgroundColor: '#16A34A' },
        active && !done && { backgroundColor: COLORS.primary },
      ]}>
        {done
          ? <Ionicons name="checkmark" size={12} color="#fff" />
          : <Text style={sc.num}>{num}</Text>
        }
      </View>
      <Text style={[sc.lbl, active && sc.lblActive]}>{label}</Text>
    </View>
  )
}

const sc = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot:       { width: 22, height: 22, borderRadius: 11, backgroundColor: '#E5E7EB',
               alignItems: 'center', justifyContent: 'center' },
  num:       { fontSize: 11, fontWeight: '800', color: '#6B7280' },
  lbl:       { fontSize: 12, color: '#9CA3AF' },
  lblActive: { color: '#111827', fontWeight: '700' },
})

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CompleteProfilePage() {
  const router  = useRouter()
  const { user, profile, refreshProfile } = useAuth()

  const role: Role  = (profile?.role as Role) ?? 'customer'
  const totalSteps   = STEPS_BY_ROLE[role]

  // Drivers and merchants get the avatar picker; customers do NOT
  const showAvatarPicker = role === 'driver' || role === 'merchant'

  const [step,      setStep]      = useState(1)
  const [saving,    setSaving]    = useState(false)
  const [avatarUri, setAvatarUri] = useState<string | null>(
    showAvatarPicker ? (profile?.avatar_url ?? null) : null,
  )
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const [draft, setDraft] = useState<ProfileDraft>({
    full_name: profile?.full_name ?? '',
    username:  (profile as any)?.username ?? '',
    phone:     profile?.phone ?? '',
    address:   (profile as any)?.address ?? '',
    city:      profile?.city ?? '',
    state:     profile?.state ?? '',
    pincode:   profile?.pincode ?? '',
    logo_url:  (profile as any)?.logo_url ?? null,
  })

  const [errors, setErrors] = useState<Partial<Record<keyof ProfileDraft | 'logo', string>>>({})
  const [checkingUsername, setCheckingUsername] = useState(false)
  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Slide animation between steps
  const slideAnim = useRef(new Animated.Value(0)).current

  function animateIn() {
    slideAnim.setValue(40)
    Animated.spring(slideAnim, {
      toValue: 0, damping: 20, stiffness: 200, useNativeDriver: true,
    }).start()
  }

  useEffect(() => { animateIn() }, [step])

  // ── Field helpers ──────────────────────────────────────────────────────────

  function set<K extends keyof ProfileDraft>(key: K, val: ProfileDraft[K]) {
    setDraft(prev => ({ ...prev, [key]: val }))
    setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  // Debounced username uniqueness check
  useEffect(() => {
    if (usernameTimer.current) clearTimeout(usernameTimer.current)
    const uname = draft.username.trim()
    if (!uname || !USERNAME_REGEX.test(uname)) return

    usernameTimer.current = setTimeout(async () => {
      setCheckingUsername(true)
      try {
        const { data } = await supabase
          .rpc('check_username_available', { p_username: uname, p_user_id: user?.id ?? '' })
        if (data === false) {
          setErrors(prev => ({ ...prev, username: 'This username is already taken.' }))
        }
      } catch {}
      finally { setCheckingUsername(false) }
    }, 600)

    return () => { if (usernameTimer.current) clearTimeout(usernameTimer.current) }
  }, [draft.username, user?.id])

  // ── Avatar upload (driver / merchant only) ────────────────────────────────

  async function handleAvatarPick(uri: string) {
    setAvatarUri(uri)
    if (!user?.id) return
    setUploadingAvatar(true)
    try {
      const ext  = uri.split('.').pop() ?? 'jpg'
      const path = `avatars/${user.id}.${ext}`
      const blob = await fetch(uri).then(r => r.blob())

      const { error: upErr } = await supabase.storage
        .from('avatars').upload(path, blob, { upsert: true, contentType: `image/${ext}` })
      if (upErr) throw upErr

      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = pub.publicUrl

      setAvatarUri(url)
      await supabase.from('profiles')
        .update({ avatar_url: url, updated_at: new Date().toISOString() })
        .eq('id', user.id)
    } catch (e: any) {
      Alert.alert('Upload failed', e.message ?? 'Could not upload photo.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  // ── Logo upload (merchant only) ───────────────────────────────────────────

  async function handleLogoPick() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') return

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.85,
    })
    if (result.canceled || !result.assets[0]?.uri || !user?.id) return

    setUploadingAvatar(true)
    try {
      const uri  = result.assets[0].uri
      const ext  = uri.split('.').pop() ?? 'png'
      const path = `logos/${user.id}.${ext}`
      const blob = await fetch(uri).then(r => r.blob())

      const { error: upErr } = await supabase.storage
        .from('avatars').upload(path, blob, { upsert: true, contentType: `image/${ext}` })
      if (upErr) throw upErr

      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
      set('logo_url', pub.publicUrl)
    } catch (e: any) {
      Alert.alert('Upload failed', e.message)
    } finally {
      setUploadingAvatar(false)
    }
  }

  // ── Validation per step ───────────────────────────────────────────────────

  function validateStep(s: number): boolean {
    const errs: typeof errors = {}

    if (s === 1) {
      if (!draft.full_name.trim() || draft.full_name.trim().length < 2)
        errs.full_name = 'Full name must be at least 2 characters.'

      if (!draft.username.trim())
        errs.username = 'Username is required.'
      else if (!USERNAME_REGEX.test(draft.username.trim()))
        errs.username = 'Only lowercase letters, numbers, underscores (3–30 chars).'

      const phone = draft.phone.trim().replace(/\D/g, '')
      if (!phone || phone.length < 10)
        errs.phone = 'Enter a valid 10-digit phone number.'
    }

    if (s === 2 && (role === 'customer' || role === 'driver')) {
      if (!draft.address.trim())  errs.address = 'Address is required.'
      if (!draft.city.trim())     errs.city    = 'City is required.'
      if (!draft.state.trim())    errs.state   = 'State is required.'
      if (!draft.pincode.trim() || draft.pincode.trim().length < 4)
        errs.pincode = 'Enter a valid pincode.'
    }

    if (s === 2 && role === 'merchant') {
      if (!draft.address.trim()) errs.address = 'Business address is required.'
      if (!draft.city.trim())    errs.city    = 'City is required.'
    }

    // Step 3 (merchant logo) is optional — no hard validation

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  function goNext() {
    Keyboard.dismiss()
    if (!validateStep(step)) return
    if (errors.username) return  // wait for async uniqueness check

    if (step < totalSteps) {
      setStep(s => s + 1)
    } else {
      void handleSave()
    }
  }

  function goBack() {
    if (step > 1) setStep(s => s - 1)
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!user?.id) return
    setSaving(true)
    try {
      const phone = draft.phone.trim().replace(/\D/g, '')
      const update: Record<string, any> = {
        full_name:         draft.full_name.trim(),
        username:          draft.username.trim().toLowerCase(),
        phone:             phone || null,
        address:           draft.address.trim() || null,
        city:              draft.city.trim() || null,
        state:             draft.state.trim() || null,
        pincode:           draft.pincode.trim() || null,
        profile_completed: true,
        updated_at:        new Date().toISOString(),
      }

      if (role === 'merchant' && draft.logo_url) {
        update.logo_url = draft.logo_url
      }

      const { error } = await supabase
        .from('profiles')
        .update(update)
        .eq('id', user.id)

      if (error) throw error

      await refreshProfile?.()

      const dest: Record<Role, string> = {
        customer:   '/(customer)/dashboard',
        driver:     '/(driver)/dashboard',
        merchant:   '/(merchant)/dashboard',
        admin:      '/(admin)/dashboard',
        superadmin: '/(admin)/dashboard',
      }
      router.replace(dest[role] as any)
    } catch (e: any) {
      Alert.alert('Save failed', e.message ?? 'Please try again.')
    } finally {
      setSaving(false)
    }
  }, [user, draft, role, router, refreshProfile])

  // ── Step labels ───────────────────────────────────────────────────────────

  const stepLabels: Record<Role, string[]> = {
    customer:   ['Your Identity', 'Your Address'],
    driver:     ['Your Identity', 'Your Location'],
    merchant:   ['Your Identity', 'Business Address', 'Business Logo'],
    admin:      ['Your Identity'],
    superadmin: ['Your Identity'],
  }

  const currentLabel = stepLabels[role][step - 1] ?? ''

  // ── Role config ───────────────────────────────────────────────────────────

  const roleConfig: Record<Role, { emoji: string; color: string; label: string }> = {
    customer:   { emoji: '🛍️', color: COLORS.primary, label: 'Customer' },
    driver:     { emoji: '🏍️', color: '#7C3AED',      label: 'Delivery Partner' },
    merchant:   { emoji: '🏪', color: '#D97706',      label: 'Merchant' },
    admin:      { emoji: '🛡️', color: '#DC2626',      label: 'Admin' },
    superadmin: { emoji: '⚡',  color: '#1D4ED8',      label: 'Super Admin' },
  }
  const rc = roleConfig[role]

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F8F9FA' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <AppStatusBar backgroundColor={rc.color} style="light" />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={[S.header, { backgroundColor: rc.color }]}>
        <View style={S.headerTop}>
          <View style={S.roleBadge}>
            <Text style={S.roleEmoji}>{rc.emoji}</Text>
            <Text style={S.roleLabel}>{rc.label}</Text>
          </View>
          <Text style={S.headerTitle}>Complete Your Profile</Text>
          <Text style={S.headerSub}>
            Step {step} of {totalSteps} — {currentLabel}
          </Text>
        </View>
      </View>

      {/* ── Progress bar ──────────────────────────────────────────────── */}
      <ProgressBar step={step} total={totalSteps} />

      {/* ── Step chips ────────────────────────────────────────────────── */}
      <View style={S.chips}>
        {stepLabels[role].map((lbl, i) => (
          <React.Fragment key={lbl}>
            <StepChip num={i + 1} label={lbl} active={step === i + 1} done={step > i + 1} />
            {i < totalSteps - 1 && <View style={S.chipLine} />}
          </React.Fragment>
        ))}
      </View>

      {/* ── Form ──────────────────────────────────────────────────────── */}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={S.scroll}
      >
        <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>

          {/* ═══ STEP 1 — Identity ═════════════════════════════════════ */}
          {step === 1 && (
            <View style={S.card}>
              <Text style={S.sectionTitle}>👤 Personal Info</Text>
              <Text style={S.sectionSub}>
                {role === 'customer'
                  ? 'Used for your orders and receipts. You can add a profile photo later from your account settings.'
                  : 'This is how you appear to customers and on receipts.'}
              </Text>

              {/* Avatar picker — drivers and merchants only */}
              {showAvatarPicker && (
                <AvatarPicker
                  uri={avatarUri}
                  onPick={handleAvatarPick}
                  uploading={uploadingAvatar}
                />
              )}

              <Field
                label="Full Name *"
                value={draft.full_name}
                onChange={v => set('full_name', v)}
                placeholder="e.g. Gurpreet Singh"
                autoCapitalize="words"
                maxLength={60}
                error={errors.full_name}
                autoFocus
              />

              <Field
                label="Username *"
                value={draft.username}
                onChange={v => set('username', v.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="e.g. gurpreet_92"
                autoCapitalize="none"
                maxLength={30}
                prefix="@"
                hint="Letters, numbers, underscores only. Used to identify your account."
                error={errors.username}
              />
              {checkingUsername && (
                <View style={S.checkingRow}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={S.checkingText}>Checking availability…</Text>
                </View>
              )}

              <Field
                label="Phone Number *"
                value={draft.phone}
                onChange={v => set('phone', v)}
                placeholder="9876543210"
                keyboardType="phone-pad"
                maxLength={12}
                prefix="+91 "
                hint="Used for order updates and delivery contact."
                error={errors.phone}
              />

              {/* Role tips */}
              {role === 'driver' && (
                <View style={[S.tipBox, { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' }]}>
                  <Text style={{ fontSize: 13, color: '#5B21B6', lineHeight: 19 }}>
                    🏍️ As a delivery partner, your name and phone are shared with customers during active deliveries.
                  </Text>
                </View>
              )}
              {role === 'merchant' && (
                <View style={[S.tipBox, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                  <Text style={{ fontSize: 13, color: '#92400E', lineHeight: 19 }}>
                    🏪 Your name appears on your merchant profile. Use your real name, not your business name.
                  </Text>
                </View>
              )}
              {role === 'customer' && (
                <View style={[S.tipBox, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                  <Text style={{ fontSize: 13, color: '#166534', lineHeight: 19 }}>
                    💡 You can add a profile photo anytime from{' '}
                    <Text style={{ fontWeight: '700' }}>Account → Edit Profile</Text> after setup.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ═══ STEP 2 — Address (customer / driver) ══════════════════ */}
          {step === 2 && (role === 'customer' || role === 'driver') && (
            <View style={S.card}>
              <Text style={S.sectionTitle}>
                {role === 'driver' ? '📍 Home Location' : '🏠 Your Address'}
              </Text>
              <Text style={S.sectionSub}>
                {role === 'driver'
                  ? 'Your home base is used to calculate delivery zones.'
                  : 'Used as your default delivery address — you can change it anytime.'}
              </Text>

              <Field
                label="Address / Street *"
                value={draft.address}
                onChange={v => set('address', v)}
                placeholder={role === 'driver' ? 'House no., Street, Area' : 'Flat / House no., Street'}
                error={errors.address}
                autoFocus
              />
              <Field
                label="City *"
                value={draft.city}
                onChange={v => set('city', v)}
                placeholder="e.g. Ludhiana"
                error={errors.city}
              />
              <View style={S.row}>
                <View style={{ flex: 1 }}>
                  <Field
                    label="State *"
                    value={draft.state}
                    onChange={v => set('state', v)}
                    placeholder="e.g. Punjab"
                    error={errors.state}
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Field
                    label="Pincode *"
                    value={draft.pincode}
                    onChange={v => set('pincode', v)}
                    placeholder="143416"
                    keyboardType="numeric"
                    maxLength={6}
                    error={errors.pincode}
                  />
                </View>
              </View>

              {role === 'driver' && (
                <View style={[S.tipBox, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                  <Text style={{ fontSize: 13, color: '#166534', lineHeight: 19 }}>
                    ✅ You can update your live location at any time during active deliveries.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ═══ STEP 2 — Business Address (merchant) ══════════════════ */}
          {step === 2 && role === 'merchant' && (
            <View style={S.card}>
              <Text style={S.sectionTitle}>🏪 Business Address</Text>
              <Text style={S.sectionSub}>
                Your restaurant / store&apos;s physical location.
              </Text>

              <Field
                label="Business Address *"
                value={draft.address}
                onChange={v => set('address', v)}
                placeholder="Shop no., Street, Area"
                error={errors.address}
                autoFocus
              />
              <Field
                label="City *"
                value={draft.city}
                onChange={v => set('city', v)}
                placeholder="e.g. Patti"
                error={errors.city}
              />
              <View style={S.row}>
                <View style={{ flex: 1 }}>
                  <Field
                    label="State *"
                    value={draft.state}
                    onChange={v => set('state', v)}
                    placeholder="Punjab"
                    error={errors.state}
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Field
                    label="Pincode *"
                    value={draft.pincode}
                    onChange={v => set('pincode', v)}
                    placeholder="143416"
                    keyboardType="numeric"
                    maxLength={6}
                    error={errors.pincode}
                  />
                </View>
              </View>
            </View>
          )}

          {/* ═══ STEP 3 — Logo (merchant only) ══════════════════════════ */}
          {step === 3 && role === 'merchant' && (
            <View style={S.card}>
              <Text style={S.sectionTitle}>🖼️ Business Logo</Text>
              <Text style={S.sectionSub}>
                Your logo appears on your restaurant page and order receipts.
                (Optional — you can add it later.)
              </Text>

              <TouchableOpacity style={S.logoPickBtn} onPress={handleLogoPick} activeOpacity={0.8}>
                {draft.logo_url ? (
                  <Image source={{ uri: draft.logo_url }}
                    style={S.logoPreview} resizeMode="cover" />
                ) : (
                  <View style={S.logoPlaceholder}>
                    <Ionicons name="image-outline" size={40} color="#9CA3AF" />
                    <Text style={S.logoPlaceholderText}>Tap to upload logo</Text>
                  </View>
                )}
              </TouchableOpacity>

              {uploadingAvatar && (
                <View style={S.uploadingRow}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={{ fontSize: 13, color: '#6B7280', marginLeft: 8 }}>
                    Uploading…
                  </Text>
                </View>
              )}

              {draft.logo_url && (
                <TouchableOpacity
                  style={S.removeLogoBtn}
                  onPress={() => set('logo_url', null)}
                >
                  <Text style={{ color: '#DC2626', fontSize: 13, fontWeight: '700' }}>
                    Remove Logo
                  </Text>
                </TouchableOpacity>
              )}

              <View style={[S.tipBox, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A', marginTop: 16 }]}>
                <Text style={{ fontSize: 13, color: '#92400E', lineHeight: 19 }}>
                  💡 Square images work best (1:1 ratio). Minimum 200×200px recommended.
                </Text>
              </View>
            </View>
          )}

          {/* ═══ Reward banner ═══════════════════════════════════════════ */}
          <View style={S.rewardCard}>
            <Text style={S.rewardEmoji}>🎉</Text>
            <View style={{ flex: 1 }}>
              <Text style={S.rewardTitle}>Complete your profile to unlock</Text>
              <Text style={S.rewardSub}>
                Order tracking · Saved addresses · Promo codes · Reviews
              </Text>
            </View>
          </View>

        </Animated.View>
      </ScrollView>

      {/* ── Action bar ────────────────────────────────────────────────── */}
      <View style={S.actionBar}>
        {step > 1 && (
          <TouchableOpacity style={S.backBtn} onPress={goBack}>
            <Ionicons name="arrow-back" size={18} color={COLORS.primary} />
            <Text style={S.backBtnText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            S.nextBtn,
            { backgroundColor: rc.color },
            (saving || checkingUsername || !!errors.username) && S.btnDisabled,
          ]}
          onPress={goNext}
          disabled={saving || checkingUsername || !!errors.username}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={S.nextBtnText}>
              {step === totalSteps ? '✓ Save Profile' : 'Continue →'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 20, paddingHorizontal: 24,
  },
  headerTop:   { alignItems: 'flex-start' },
  roleBadge:   { flexDirection: 'row', alignItems: 'center', gap: 6,
                 backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 20,
                 paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 },
  roleEmoji:   { fontSize: 14 },
  roleLabel:   { fontSize: 12, color: '#fff', fontWeight: '700' },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 3 },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.82)' },

  chips:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              paddingHorizontal: 20, marginBottom: 16, gap: 4 },
  chipLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB', maxWidth: 30 },

  scroll: { padding: 16, paddingBottom: 24 },

  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 14,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 4 },
  sectionSub:   { fontSize: 12, color: '#6B7280', marginBottom: 18, lineHeight: 18 },

  row: { flexDirection: 'row' },

  checkingRow:  { flexDirection: 'row', alignItems: 'center', gap: 6,
                  marginBottom: 8, marginTop: -8 },
  checkingText: { fontSize: 11, color: '#9CA3AF' },

  tipBox: { borderRadius: 10, padding: 12, borderWidth: 1, marginTop: 4 },

  // Merchant logo
  logoPickBtn:        { alignSelf: 'center', marginBottom: 12, borderRadius: 16, overflow: 'hidden' },
  logoPreview:        { width: 140, height: 140, borderRadius: 16,
                        borderWidth: 2, borderColor: '#E5E7EB' },
  logoPlaceholder:    { width: 140, height: 140, borderRadius: 16,
                        backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center',
                        borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed' },
  logoPlaceholderText:{ fontSize: 12, color: '#9CA3AF', marginTop: 8 },
  uploadingRow:       { flexDirection: 'row', alignItems: 'center',
                        justifyContent: 'center', marginBottom: 8 },
  removeLogoBtn:      { alignSelf: 'center', paddingVertical: 6 },

  // Reward card
  rewardCard:  { flexDirection: 'row', alignItems: 'center', gap: 12,
                 backgroundColor: '#FFF7ED', borderRadius: 14, padding: 14, marginBottom: 8,
                 borderWidth: 1, borderColor: '#FED7AA' },
  rewardEmoji: { fontSize: 28 },
  rewardTitle: { fontSize: 13, fontWeight: '800', color: '#92400E', marginBottom: 2 },
  rewardSub:   { fontSize: 11, color: '#B45309', lineHeight: 16 },

  // Action bar
  actionBar: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 16,
    paddingVertical: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 14,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F3F4F6',
    elevation: 6, shadowColor: '#000', shadowOpacity: 0.05,
    shadowRadius: 4, shadowOffset: { width: 0, height: -2 },
  },
  backBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4,
                 paddingHorizontal: 16, paddingVertical: 14,
                 borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.primary },
  backBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  nextBtn:     { flex: 1, paddingVertical: 14, borderRadius: 14,
                 alignItems: 'center', justifyContent: 'center',
                 elevation: 3, shadowColor: COLORS.primary,
                 shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  nextBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  btnDisabled: { opacity: 0.55, elevation: 0 },
})