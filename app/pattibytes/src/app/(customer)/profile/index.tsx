import React, { useCallback, useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, Image,
} from 'react-native'
import { Stack, useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import { COLORS } from '../../../lib/constants'

type Profile = {
  id: string; full_name: string | null; email: string | null; phone: string | null
  avatar_url: string | null; role: string; account_status: string | null
  trust_score: number | null; is_trusted: boolean | null
  city: string | null; state: string | null
}
type Stats = { total: number; completed: number; cancelled: number; totalSpent: number }

// ─── Helper ────────────────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F8F9FA' }}>
      <Text style={{ fontSize: 13, color: '#9CA3AF', fontWeight: '600' }}>{label}</Text>
      <Text style={{ fontSize: 13, color: COLORS.text, fontWeight: '700', maxWidth: '60%', textAlign: 'right' }}>{value || '—'}</Text>
    </View>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  // ✅ FIX 1: Only destructure `user` — no `signOut` on AuthCtx
  const { user } = useAuth()
  const router   = useRouter()

  const [profile, setProfile]     = useState<Profile | null>(null)
  const [stats, setStats]         = useState<Stats>({ total: 0, completed: 0, cancelled: 0, totalSpent: 0 })
  const [loading, setLoading]     = useState(true)
  const [editing, setEditing]     = useState(false)
  const [saving, setSaving]       = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm]           = useState({ full_name: '', phone: '' })
  const [pwdForm, setPwdForm]     = useState({ newPwd: '', confirmPwd: '' })
  const [savingPwd, setSavingPwd] = useState(false)
  const [showPwd, setShowPwd]     = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [{ data: p }, { data: orders }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('orders').select('status,total_amount').eq('customer_id', user.id),
      ])
      if (p) {
        setProfile(p as Profile)
        setForm({ full_name: (p as any).full_name ?? '', phone: (p as any).phone ?? '' })
      }
      if (orders) {
        const completed  = orders.filter((o: any) => o.status === 'delivered').length
        const cancelled  = orders.filter((o: any) => o.status === 'cancelled').length
        const totalSpent = orders
          .filter((o: any) => o.status === 'delivered')
          .reduce((s: number, o: any) => s + Number(o.total_amount ?? 0), 0)
        setStats({ total: orders.length, completed, cancelled, totalSpent })
      }
    } catch (e) { console.warn('profile load', e) }
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    try {
      const { error } = await supabase.from('profiles').update({
        full_name:  form.full_name.trim() || null,
        phone:      form.phone.trim() || null,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id)
      if (error) throw error
      setEditing(false)
      await load()
      Alert.alert('Saved', 'Profile updated.')
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to save')
    } finally { setSaving(false) }
  }

  const handleUpdatePassword = async () => {
    if (pwdForm.newPwd.length < 6) { Alert.alert('Too Short', 'Min 6 characters.'); return }
    if (pwdForm.newPwd !== pwdForm.confirmPwd) { Alert.alert('Mismatch', 'Passwords do not match.'); return }
    setSavingPwd(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: pwdForm.newPwd })
      if (error) throw error
      setPwdForm({ newPwd: '', confirmPwd: '' })
      setShowPwd(false)
      Alert.alert('Done', 'Password updated.')
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed.')
    } finally { setSavingPwd(false) }
  }

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') { Alert.alert('Permission required'); return }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8,
    })
    if (res.canceled || !res.assets?.[0]?.uri) return
    setUploading(true)
    try {
      const uri  = res.assets[0].uri
      const ext  = uri.split('.').pop() ?? 'jpg'
      const path = `avatars/${user!.id}.${ext}`
      const blob = await fetch(uri).then(r => r.blob())
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, blob, {
        upsert: true, contentType: `image/${ext}`,
      })
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      await supabase.from('profiles')
        .update({ avatar_url: `${urlData.publicUrl}?t=${Date.now()}` })
        .eq('id', user!.id)
      await load()
    } catch (e: any) {
      Alert.alert('Upload Error', e?.message ?? 'Failed.')
    } finally { setUploading(false) }
  }

  // ✅ FIX 2: Use supabase.auth.signOut() directly — no AuthCtx.signOut needed
  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut()
          router.replace('/(auth)/login' as any)
        },
      },
    ])
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <Stack.Screen options={{ title: 'Profile' }} />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User'

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <Stack.Screen options={{ title: 'My Profile' }} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* ── Hero ── */}
        <View style={ST.hero}>
          <TouchableOpacity onPress={pickAvatar} disabled={uploading} style={{ marginBottom: 14 }}>
            {profile?.avatar_url
              ? <Image source={{ uri: profile.avatar_url }} style={ST.avatar} />
              : (
                <View style={ST.avatarPlaceholder}>
                  <Text style={{ fontSize: 38, color: '#fff' }}>
                    {displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            <View style={ST.cameraBtn}>
              {uploading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={{ color: '#fff', fontSize: 13 }}>📷</Text>}
            </View>
          </TouchableOpacity>
          <Text style={ST.heroName}>{displayName}</Text>
          <Text style={ST.heroEmail}>{user?.email}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <View style={ST.badge}>
              <Text style={ST.badgeTxt}>
                {profile?.role === 'customer' ? '🛒' : '⭐'} {(profile?.role ?? 'customer').toUpperCase()}
              </Text>
            </View>
            {profile?.is_trusted && (
              <View style={[ST.badge, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                <Text style={[ST.badgeTxt, { color: '#065F46' }]}>✅ TRUSTED</Text>
              </View>
            )}
            {profile?.account_status && profile.account_status !== 'active' && (
              <View style={[ST.badge, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <Text style={[ST.badgeTxt, { color: '#DC2626' }]}>
                  ⚠️ {profile.account_status.toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Stats ── */}
        <View style={ST.statsRow}>
          {[
            { label: 'Orders',    value: String(stats.total),                emoji: '📋' },
            { label: 'Delivered', value: String(stats.completed),            emoji: '✅' },
            { label: 'Cancelled', value: String(stats.cancelled),            emoji: '❌' },
            { label: 'Spent',     value: `₹${stats.totalSpent.toFixed(0)}`,  emoji: '💰' },
          ].map((s, i) => (
            <View key={s.label}
              style={[ST.statCard, i < 3 && { borderRightWidth: 1, borderRightColor: '#F3F4F6' }]}>
              <Text style={{ fontSize: 20, marginBottom: 4 }}>{s.emoji}</Text>
              <Text style={ST.statVal}>{s.value}</Text>
              <Text style={ST.statLbl}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Personal Info ── */}
        <View style={ST.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={ST.secTitle}>👤 Personal Info</Text>
            {!editing ? (
              <TouchableOpacity onPress={() => setEditing(true)}>
                <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Edit</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ flexDirection: 'row', gap: 14 }}>
                <TouchableOpacity onPress={() => {
                  setEditing(false)
                  setForm({ full_name: profile?.full_name ?? '', phone: profile?.phone ?? '' })
                }}>
                  <Text style={{ color: '#6B7280', fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} disabled={saving}>
                  {saving
                    ? <ActivityIndicator color={COLORS.primary} size="small" />
                    : <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Save</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {editing ? (
            <>
              <Text style={ST.fieldLbl}>Full Name</Text>
              <TextInput
                style={[ST.input, { marginBottom: 14 }]}
                value={form.full_name}
                onChangeText={v => setForm(f => ({ ...f, full_name: v }))}
                placeholder="Your full name"
                placeholderTextColor="#9CA3AF"
              />
              <Text style={ST.fieldLbl}>Phone</Text>
              <TextInput
                style={ST.input}
                value={form.phone}
                keyboardType="phone-pad"
                onChangeText={v => setForm(f => ({ ...f, phone: v }))}
                placeholder="10-digit number"
                placeholderTextColor="#9CA3AF"
                maxLength={10}
              />
            </>
          ) : (
            <>
              <InfoRow label="Full Name"   value={profile?.full_name ?? ''} />
              <InfoRow label="Email"       value={user?.email ?? ''} />
              <InfoRow label="Phone"       value={profile?.phone ?? ''} />
              <InfoRow label="City"        value={profile?.city ?? ''} />
              <InfoRow label="State"       value={profile?.state ?? ''} />
              <InfoRow label="Trust Score" value={`${profile?.trust_score ?? 0} / 100`} />
            </>
          )}
        </View>

        {/* ── Change Password ── */}
        <View style={ST.section}>
          <TouchableOpacity
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
            onPress={() => setShowPwd(v => !v)}>
            <Text style={ST.secTitle}>🔒 Change Password</Text>
            <Text style={{ color: COLORS.primary, fontWeight: '600', fontSize: 13 }}>
              {showPwd ? '▲ Hide' : '▼ Show'}
            </Text>
          </TouchableOpacity>

          {showPwd && (
            <View style={{ marginTop: 14 }}>
              <Text style={ST.fieldLbl}>New Password</Text>
              <TextInput
                style={[ST.input, { marginBottom: 12 }]}
                value={pwdForm.newPwd}
                onChangeText={v => setPwdForm(f => ({ ...f, newPwd: v }))}
                placeholder="Min 6 characters"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
              />
              <Text style={ST.fieldLbl}>Confirm Password</Text>
              <TextInput
                style={[ST.input, { marginBottom: 16 }]}
                value={pwdForm.confirmPwd}
                onChangeText={v => setPwdForm(f => ({ ...f, confirmPwd: v }))}
                placeholder="Repeat new password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
              />
              <TouchableOpacity
                style={[ST.savePwdBtn, savingPwd && { opacity: 0.6 }]}
                onPress={handleUpdatePassword}
                disabled={savingPwd}>
                {savingPwd
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={{ color: '#fff', fontWeight: '800' }}>Update Password</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Quick Links ── */}
        <View style={ST.section}>
          <Text style={[ST.secTitle, { marginBottom: 4 }]}>⚡ Quick Links</Text>
          {[
            { label: 'My Orders',       emoji: '📋', path: '/(customer)/orders'        },
            { label: 'Saved Addresses', emoji: '📍', path: '/(customer)/addresses'     },
            { label: 'Notifications',   emoji: '🔔', path: '/(customer)/notifications' },
            { label: 'Offers & Deals',  emoji: '🏷', path: '/(customer)/offers'        },
            { label: 'Custom Orders',   emoji: '✨', path: '/(customer)/custom-order'  },
          ].map(link => (
            <TouchableOpacity key={link.label} style={ST.linkRow}
              onPress={() => router.push(link.path as any)}>
              <Text style={{ fontSize: 20, marginRight: 14 }}>{link.emoji}</Text>
              <Text style={{ flex: 1, fontWeight: '600', color: COLORS.text, fontSize: 14 }}>
                {link.label}
              </Text>
              <Text style={{ color: '#D1D5DB', fontSize: 20 }}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Account ── */}
        <View style={ST.section}>
          <Text style={[ST.secTitle, { marginBottom: 4 }]}>⚙️ Account</Text>
          <TouchableOpacity
            style={[ST.linkRow, { borderBottomWidth: 0 }]}
            onPress={() => Alert.alert(
              'Delete Account',
              'Contact pbexpress38@gmail.com to delete your account.',
              [{ text: 'OK' }]
            )}>
            <Text style={{ fontSize: 20, marginRight: 14 }}>🗑</Text>
            <Text style={{ flex: 1, fontWeight: '600', color: '#EF4444', fontSize: 14 }}>Delete Account</Text>
            <Text style={{ color: '#D1D5DB', fontSize: 20 }}>›</Text>
          </TouchableOpacity>
        </View>

        <Text style={{ textAlign: 'center', fontSize: 12, color: '#D1D5DB', marginTop: 14 }}>
          PBExpress v1.0.0 · Made with ❤️ by Thrillyverse
        </Text>
      </ScrollView>

      {/* ── Sign Out Bar ── */}
      <View style={ST.bottomBar}>
        <TouchableOpacity style={ST.signOutBtn} onPress={handleSignOut}>
          <Text style={{ color: '#EF4444', fontWeight: '800', fontSize: 15 }}>🚪 Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ─── StyleSheet ────────────────────────────────────────────────────────────────
// ✅ FIX 3: All missing styles added — input, savePwdBtn, linkRow, bottomBar, signOutBtn
const ST = StyleSheet.create({
  hero: {
    backgroundColor: COLORS.primary,
    paddingTop: 40, paddingBottom: 32,
    alignItems: 'center',
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
  },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: '#fff' },
  avatarPlaceholder: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#fff',
  },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  heroName:  { fontSize: 22, fontWeight: '900', color: '#fff', marginTop: 4 },
  heroEmail: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 3 },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  badgeTxt: { fontSize: 11, fontWeight: '800', color: '#fff' },

  statsRow: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 12,
    backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statVal:  { fontSize: 16, fontWeight: '900', color: COLORS.text },
  statLbl:  { fontSize: 10, color: '#9CA3AF', fontWeight: '600', marginTop: 2 },

  section: {
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: 10,
    borderRadius: 16, padding: 16,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  secTitle:  { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 14 },
  fieldLbl:  { fontSize: 13, fontWeight: '700', color: '#4B5563', marginBottom: 6 },

  // ✅ ADDED
  input: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 14, color: COLORS.text, backgroundColor: '#FAFAFA',
  },
  // ✅ ADDED
  savePwdBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    padding: 13, alignItems: 'center',
  },
  // ✅ ADDED
  linkRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: '#F8F9FA',
  },
  // ✅ ADDED
  bottomBar: {
    backgroundColor: '#fff', padding: 16, paddingBottom: 28,
    borderTopWidth: 1, borderTopColor: '#F3F4F6', elevation: 8,
  },
  // ✅ ADDED
  signOutBtn: {
    borderWidth: 1.5, borderColor: '#FECACA', borderRadius: 14,
    padding: 14, alignItems: 'center', backgroundColor: '#FEF2F2',
  },
})
