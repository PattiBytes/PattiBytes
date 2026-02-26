 
import React, { useCallback, useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform, Image, RefreshControl,
} from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import { COLORS } from '../../../lib/constants'

const CATEGORIES = [
  { id: 'food',        label: 'Food Items',   emoji: '🍱', desc: 'Restaurant meals, snacks' },
  { id: 'grocery',    label: 'Grocery',      emoji: '🛒', desc: 'Vegetables, fruits, staples' },
  { id: 'dairy',      label: 'Dairy',        emoji: '🥛', desc: 'Milk, paneer, curd, butter' },
  { id: 'medicines',  label: 'Medicines',    emoji: '💊', desc: 'Prescription & OTC medicines' },
  { id: 'bakery',     label: 'Bakery',       emoji: '🎂', desc: 'Custom cakes, pastries' },
  { id: 'stationery', label: 'Stationery',   emoji: '✏️', desc: 'Books, pens, supplies' },
  { id: 'other',      label: 'Other',        emoji: '📦', desc: 'Anything else you need' },
]

const CAT_COLORS: Record<string, { bg: string; text: string }> = {
  dairy:      { bg: '#DBEAFE', text: '#1D4ED8' },
  grocery:    { bg: '#D1FAE5', text: '#065F46' },
  medicines:  { bg: '#FEE2E2', text: '#991B1B' },
  food:       { bg: '#FEF3C7', text: '#92400E' },
  bakery:     { bg: '#FCE7F3', text: '#9D174D' },
  stationery: { bg: '#EDE9FE', text: '#5B21B6' },
  other:      { bg: '#F3F4F6', text: '#374151' },
}

const PAST_STATUS_COLORS: Record<string, string> = {
  pending:    '#F59E0B',
  confirmed:  '#3B82F6',
  processing: '#8B5CF6',
  completed:  '#22C55E',
  delivered:  '#22C55E',
  cancelled:  '#EF4444',
}

type PastOrder = {
  id: string
  category: string
  description: string
  status: string
  created_at: string
  budget: number | null
}

function getCatInfo(id: string) {
  return CATEGORIES.find(c => c.id === id) ?? { emoji: '📦', label: id, desc: '' }
}
function getCatColors(cat: string) {
  return CAT_COLORS[cat] ?? { bg: '#F3F4F6', text: '#374151' }
}
function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return d }
}

// ════════════════════════════════════════════════════════════════════════════
export default function CustomOrderScreen() {
  const { cat } = useLocalSearchParams<{ cat?: string }>()
  const router  = useRouter()
  const user    = useAuth()

  // ── Tab: 'request' | 'history' ────────────────────────────────────────────
  const [tab, setTab] = useState<'request' | 'history'>('request')

  // ── Form state ────────────────────────────────────────────────────────────
  const [selectedCat,  setSelectedCat] = useState(cat ?? '')
  const [description,  setDescription] = useState('')
  const [budget,       setBudget]      = useState('')
  const [address,      setAddress]     = useState('')
  const [notes,        setNotes]       = useState('')
  const [submitting,   setSubmitting]  = useState(false)
  const [imageUris,    setImageUris]   = useState<string[]>([])

  // ── History state ─────────────────────────────────────────────────────────
  const [pastOrders,   setPastOrders]  = useState<PastOrder[]>([])
  const [loadingPast,  setLoadingPast] = useState(true)

  useEffect(() => {
    if (cat) setSelectedCat(cat)
  }, [cat])

  const loadPastOrders = useCallback(async () => {
    if (!user) return
    setLoadingPast(true)
    const { data } = await supabase
      .from('customorders')
      .select('id,category,description,status,created_at,budget')
      .eq('customerid', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setPastOrders((data ?? []) as PastOrder[])
    setLoadingPast(false)
  }, [user])

  useEffect(() => { loadPastOrders() }, [loadPastOrders])

  // ── Image picker ──────────────────────────────────────────────────────────
  const pickImage = async () => {
    if (imageUris.length >= 3) { Alert.alert('Max 3 images allowed'); return }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    })
    if (!result.canceled) setImageUris(prev => [...prev, result.assets[0].uri])
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!user)                          { Alert.alert('Login Required'); return }
    if (!selectedCat)                   { Alert.alert('Required', 'Please select a category'); return }
    if (description.trim().length < 10) { Alert.alert('Required', 'At least 10 characters needed'); return }
    if (!address.trim())                { Alert.alert('Required', 'Please enter delivery address'); return }
    setSubmitting(true)
    try {
      await supabase.from('customorders').insert({
        customerid:      user.id,
        category:        selectedCat,
        description:     description.trim(),
        budget:          budget ? parseFloat(budget) : null,
        deliveryaddress: address.trim(),
        specialnotes:    notes.trim() || null,
        status:          'pending',
        created_at:      new Date().toISOString(),
      })
      Alert.alert('Order Submitted! 🎉', 'We will confirm your custom order shortly.', [
        {
          text: 'View History',
          onPress: () => { loadPastOrders(); setTab('history') },
        },
        {
          text: 'New Order',
          onPress: () => {
            setDescription(''); setBudget(''); setNotes('')
            setSelectedCat(''); setImageUris([])
          },
        },
      ])
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setDescription(''); setBudget(''); setNotes('')
    setSelectedCat(cat ?? ''); setImageUris([])
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <Stack.Screen options={{
        title: 'Custom Order',
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800' },
        headerRight: () => (
          // ✅ Quick link back to shop
          <TouchableOpacity
            style={{ marginRight: 14 }}
            onPress={() => router.push('/(customer)/shop' as any)}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>🛍️ Shop</Text>
          </TouchableOpacity>
        ),
      }} />

      {/* ── Tab bar: 2 tabs only ─────────────────────────────────────── */}
      <View style={S.tabBar}>
        {([
          { key: 'request', label: 'New Request', emoji: '📝' },
          { key: 'history', label: 'My Requests', emoji: '📋' },
        ] as const).map(t => (
          <TouchableOpacity
            key={t.key}
            style={[S.tabItem, tab === t.key && S.tabActive]}
            onPress={() => setTab(t.key)}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 18 }}>{t.emoji}</Text>
            <Text style={[S.tabTxt, tab === t.key && S.tabTxtActive]}>{t.label}</Text>
            {tab === t.key && <View style={S.tabLine} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* ════════ TAB: REQUEST ════════════════════════════════════════════ */}
      {tab === 'request' && (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 60 }}>

            {/* Info banner */}
            <View style={S.banner}>
              <Text style={{ fontSize: 22, marginRight: 10 }}>💡</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800', color: '#92400E', fontSize: 13 }}>
                  Can&apos;t find it in the shop?
                </Text>
                <Text style={{ fontSize: 12, color: '#92400E', marginTop: 2, lineHeight: 18 }}>
                  Describe what you need and we&apos;ll source it for you!
                </Text>
              </View>
              {/* Quick link to shop */}
              <TouchableOpacity
                style={S.shopLinkBtn}
                onPress={() => router.push('/(customer)/shop' as any)}
              >
                <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 11 }}>
                  Browse Shop →
                </Text>
              </TouchableOpacity>
            </View>

            {/* Category picker */}
            <View style={S.section}>
              <Text style={S.secLabel}>What do you need?</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
                {CATEGORIES.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[S.catPill, selectedCat === c.id && S.catPillActive]}
                    onPress={() => setSelectedCat(c.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 22 }}>{c.emoji}</Text>
                    <Text style={[S.catPillLabel, selectedCat === c.id && { color: '#fff' }]}>
                      {c.label}
                    </Text>
                    <Text style={[S.catPillDesc, selectedCat === c.id && { color: 'rgba(255,255,255,0.8)' }]}>
                      {c.desc}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Description */}
            <View style={S.section}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={S.secLabel}>Describe your order</Text>
                <Text style={{
                  fontSize: 11, fontWeight: '700',
                  color: description.length >= 10 ? '#22C55E' : '#EF4444',
                }}>
                  {description.length}/500 {description.length >= 10 ? '✓' : '(min 10)'}
                </Text>
              </View>
              <TextInput
                style={[S.input, { minHeight: 110, textAlignVertical: 'top', marginTop: 8 }]}
                placeholder="Be specific – e.g. 1 kg butter chicken + 4 naan, pack properly"
                value={description}
                onChangeText={t => setDescription(t.slice(0, 500))}
                multiline
                numberOfLines={5}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Budget */}
            <View style={S.section}>
              <Text style={S.secLabel}>
                Budget{' '}
                <Text style={{ color: '#9CA3AF', fontWeight: '400' }}>(optional)</Text>
              </Text>
              <TextInput
                style={[S.input, { marginTop: 8 }]}
                placeholder="₹ Maximum you want to spend"
                value={budget}
                onChangeText={t => setBudget(t.replace(/[^0-9.]/g, ''))}
                keyboardType="numeric"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Delivery address */}
            <View style={S.section}>
              <Text style={S.secLabel}>Delivery Address</Text>
              <TextInput
                style={[S.input, { minHeight: 80, textAlignVertical: 'top', marginTop: 8 }]}
                placeholder="Full address including landmark, city, pincode"
                value={address}
                onChangeText={setAddress}
                multiline
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Notes */}
            <View style={S.section}>
              <Text style={S.secLabel}>
                Special Instructions{' '}
                <Text style={{ color: '#9CA3AF', fontWeight: '400' }}>(optional)</Text>
              </Text>
              <TextInput
                style={[S.input, { minHeight: 60, textAlignVertical: 'top', marginTop: 8 }]}
                placeholder="Any notes for the delivery person"
                value={notes}
                onChangeText={setNotes}
                multiline
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Photos */}
            <View style={S.section}>
              <Text style={S.secLabel}>
                Reference Photos{' '}
                <Text style={{ color: '#9CA3AF', fontWeight: '400' }}>(optional, max 3)</Text>
              </Text>
              <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2, marginBottom: 10 }}>
                Long-press a photo to remove it
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                {imageUris.map((uri, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onLongPress={() => setImageUris(prev => prev.filter((_, i) => i !== idx))}
                    style={S.imgThumb}
                    activeOpacity={0.8}
                  >
                    <Image source={{ uri }} style={{ width: 80, height: 80, borderRadius: 10 }} />
                    <View style={S.imgOverlay}>
                      <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700', textAlign: 'center' }}>
                        HOLD TO{'\n'}REMOVE
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
                {imageUris.length < 3 && (
                  <TouchableOpacity style={S.addImgBtn} onPress={pickImage} activeOpacity={0.7}>
                    <Text style={{ fontSize: 32, color: '#D1D5DB' }}>+</Text>
                    <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>Add photo</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Buttons row */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[S.resetBtn]}
                onPress={resetForm}
              >
                <Text style={{ color: '#6B7280', fontWeight: '700' }}>↺ Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  S.submitBtn,
                  { flex: 1 },
                  (submitting || !selectedCat || description.trim().length < 10 || !address.trim()) && { opacity: 0.45 },
                ]}
                onPress={handleSubmit}
                disabled={submitting || !selectedCat || description.trim().length < 10 || !address.trim()}
                activeOpacity={0.85}
              >
                {submitting
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={S.submitBtnTxt}>📤  Submit Custom Order</Text>
                }
              </TouchableOpacity>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* ════════ TAB: HISTORY ════════════════════════════════════════════ */}
      {tab === 'history' && (
        <ScrollView
          contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={loadingPast} onRefresh={loadPastOrders} tintColor={COLORS.primary} />
          }
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: '#111827' }}>
              My Custom Requests
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={loadPastOrders}>
                <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 13 }}>↻ Refresh</Text>
              </TouchableOpacity>
            </View>
          </View>

          {loadingPast ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 32 }} />
          ) : pastOrders.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Text style={{ fontSize: 52, marginBottom: 12 }}>📋</Text>
              <Text style={{ fontWeight: '800', fontSize: 16, color: '#111827', marginBottom: 6 }}>
                No custom requests yet
              </Text>
              <Text style={{ color: '#6B7280', marginBottom: 20, textAlign: 'center' }}>
                Describe what you need and we&apos;ll source it!
              </Text>
              <TouchableOpacity
                style={S.newBtn}
                onPress={() => setTab('request')}
              >
                <Text style={{ color: '#fff', fontWeight: '800' }}>📝  Place a Custom Request</Text>
              </TouchableOpacity>
            </View>
          ) : (
            pastOrders.map(o => {
              const info   = getCatInfo(o.category)
              const colors = getCatColors(o.category)
              const status = PAST_STATUS_COLORS[o.status] ?? '#888'
              return (
                <View key={o.id} style={S.histCard}>
                  {/* Top */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={[S.catChip, { backgroundColor: colors.bg }]}>
                      <Text style={{ fontSize: 16 }}>{info.emoji}</Text>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text, marginLeft: 5 }}>
                        {info.label}
                      </Text>
                    </View>
                    <View style={[S.statusPill, { backgroundColor: status }]}>
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>
                        {o.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {/* Description */}
                  <Text
                    style={{ fontSize: 13, color: '#374151', lineHeight: 20, marginTop: 10 }}
                    numberOfLines={3}
                  >
                    {o.description}
                  </Text>

                  {/* Budget */}
                  {o.budget ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                      <Text style={{ fontSize: 12 }}>💰</Text>
                      <Text style={{ fontSize: 12, color: COLORS.primary, fontWeight: '700', marginLeft: 4 }}>
                        Budget: ₹{o.budget}
                      </Text>
                    </View>
                  ) : null}

                  {/* Footer */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                    <View style={S.customBadge}>
                      <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>CUSTOM ORDER</Text>
                    </View>
                    <Text style={{ fontSize: 11, color: '#9CA3AF' }}>
                      🕐 {formatDate(o.created_at)}
                    </Text>
                  </View>
                </View>
              )
            })
          )}
        </ScrollView>
      )}
    </View>
  )
}

const S = StyleSheet.create({
  tabBar:       { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', elevation: 3 },
  tabItem:      { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 2, position: 'relative' },
  tabActive:    {},
  tabTxt:       { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },
  tabTxtActive: { color: COLORS.primary, fontWeight: '800' },
  tabLine:      { position: 'absolute', bottom: 0, left: '15%', right: '15%', height: 3, backgroundColor: COLORS.primary, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  banner:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#FDE68A' },
  shopLinkBtn:  { backgroundColor: '#FFF3EE', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1.5, borderColor: COLORS.primary },
  section:      { backgroundColor: '#fff', borderRadius: 14, padding: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  secLabel:     { fontSize: 13, fontWeight: '800', color: '#111827' },
  input:        { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#111827' },
  catPill:      { width: '47%', borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 12, backgroundColor: '#F9FAFB' },
  catPillActive:{ backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catPillLabel: { fontSize: 13, fontWeight: '800', color: '#111827', marginTop: 6 },
  catPillDesc:  { fontSize: 10, color: '#6B7280', marginTop: 2 },
  imgThumb:     { width: 80, height: 80, borderRadius: 10, overflow: 'hidden' },
  imgOverlay:   { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', padding: 4, alignItems: 'center' },
  addImgBtn:    { width: 80, height: 80, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  resetBtn:     { borderWidth: 2, borderColor: '#E5E7EB', borderRadius: 14, paddingHorizontal: 20, paddingVertical: 14, alignItems: 'center' },
  submitBtn:    { backgroundColor: COLORS.primary, borderRadius: 14, padding: 17, alignItems: 'center' },
  submitBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  histCard:     { backgroundColor: '#fff', borderRadius: 16, padding: 14, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 1 } },
  catChip:      { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  statusPill:   { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  customBadge:  { backgroundColor: '#6366F1', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  newBtn:       { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
})
