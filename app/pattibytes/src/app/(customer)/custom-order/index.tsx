import React, { useCallback, useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import { COLORS } from '../../../lib/constants'

const CATEGORIES = [
  { id: 'food',       label: 'Food Items',   emoji: '🍔', desc: 'Restaurant meals, snacks' },
  { id: 'grocery',    label: 'Grocery',      emoji: '🛒', desc: 'Vegetables, fruits, staples' },
  { id: 'dairy',      label: 'Dairy',        emoji: '🥛', desc: 'Milk, paneer, curd, butter' },
  { id: 'medicines',  label: 'Medicines',    emoji: '💊', desc: 'Prescription & OTC medicines' },
  { id: 'bakery',     label: 'Bakery',       emoji: '🎂', desc: 'Custom cakes, pastries' },
  { id: 'stationery', label: 'Stationery',   emoji: '📚', desc: 'Books, pens, school supplies' },
  { id: 'other',      label: 'Other',        emoji: '✨', desc: 'Anything else you need' },
]

const PAST_STATUS_COLORS: Record<string, string> = {
  pending:    '#F59E0B',
  confirmed:  '#3B82F6',
  processing: '#8B5CF6',
  completed:  '#22C55E',
  delivered:  '#22C55E',
  cancelled:  '#EF4444',
}

type PastOrder = {
  id: string; category: string; description: string
  status: string; created_at: string; budget: number | null
}

export default function CustomOrderScreen() {
  const { cat } = useLocalSearchParams<{ cat?: string }>()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const router   = useRouter()
  const { user } = useAuth()

  const [selectedCat,  setSelectedCat]  = useState(cat ?? '')
  const [description,  setDescription]  = useState('')
  const [budget,       setBudget]        = useState('')
  const [address,      setAddress]       = useState('')
  const [notes,        setNotes]         = useState('')
  const [submitting,   setSubmitting]    = useState(false)
  const [pastOrders,   setPastOrders]    = useState<PastOrder[]>([])
  const [loadingPast,  setLoadingPast]   = useState(true)
  const [imageUris,    setImageUris]     = useState<string[]>([])
  const [step,         setStep]          = useState<'form' | 'history'>('form')

  useEffect(() => { if (cat) setSelectedCat(cat) }, [cat])

  const loadPastOrders = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('custom_orders')
      .select('id,category,description,status,created_at,budget')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setPastOrders((data ?? []) as PastOrder[])
    setLoadingPast(false)
  }, [user])

  useEffect(() => { loadPastOrders() }, [loadPastOrders])

  const pickImage = async () => {
    if (imageUris.length >= 3) { Alert.alert('Max 3 images allowed'); return }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    })
    if (!result.canceled) setImageUris(prev => [...prev, result.assets[0].uri])
  }

  const handleSubmit = async () => {
    if (!user) return
    if (!selectedCat)                     { Alert.alert('Required', 'Please select a category'); return }
    if (description.trim().length < 10)   { Alert.alert('Required', 'Please describe in at least 10 characters'); return }
    if (!address.trim())                  { Alert.alert('Required', 'Please enter your delivery address'); return }

    setSubmitting(true)
    try {
      await supabase.from('custom_orders').insert({
        customer_id:      user.id,
        category:         selectedCat,
        description:      description.trim(),
        budget:           budget ? parseFloat(budget) : null,
        delivery_address: address.trim(),
        special_notes:    notes.trim() || null,
        status:           'pending',
        created_at:       new Date().toISOString(),
      })
      Alert.alert('✅ Order Submitted!', 'We will confirm your custom order shortly.', [
        { text: 'View History', onPress: () => { loadPastOrders(); setStep('history') } },
        {
          text: 'New Order', onPress: () => {
            setDescription(''); setBudget(''); setNotes(''); setSelectedCat(''); setImageUris([])
          },
        },
      ])
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <Stack.Screen options={{
        title: 'Custom Order ✨',
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800' },
        headerRight: () => (
          <TouchableOpacity onPress={() => setStep(step === 'form' ? 'history' : 'form')} style={{ marginRight: 14 }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
              {step === 'form' ? '📋 History' : '✏️ New Order'}
            </Text>
          </TouchableOpacity>
        ),
      }} />

      {/* ── HISTORY TAB ─────────────────────────────────────────── */}
      {step === 'history' ? (
        <ScrollView contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: 40 }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: COLORS.text, marginBottom: 4 }}>
            📋 Your Custom Orders
          </Text>
          {loadingPast ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 32 }} />
          ) : pastOrders.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>✨</Text>
              <Text style={{ fontWeight: '700', fontSize: 16, color: COLORS.text }}>No custom orders yet</Text>
              <TouchableOpacity style={S.newBtn} onPress={() => setStep('form')}>
                <Text style={{ color: '#fff', fontWeight: '800' }}>Place Your First Custom Order</Text>
              </TouchableOpacity>
            </View>
          ) : (
            pastOrders.map(o => (
              <View key={o.id} style={S.pastCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', fontSize: 14, color: COLORS.text }}>
                      {CATEGORIES.find(c => c.id === o.category)?.emoji ?? '✨'}{' '}
                      {CATEGORIES.find(c => c.id === o.category)?.label ?? o.category}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4, lineHeight: 18 }} numberOfLines={2}>
                      {o.description}
                    </Text>
                    {o.budget ? (
                      <Text style={{ fontSize: 12, color: COLORS.primary, fontWeight: '600', marginTop: 3 }}>
                        Budget: ₹{o.budget}
                      </Text>
                    ) : null}
                  </View>
                  <View style={[S.statusPill, { backgroundColor: PAST_STATUS_COLORS[o.status] ?? '#888' }]}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>
                      {o.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>
                  {new Date(o.created_at).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      ) : (

        /* ── FORM TAB ───────────────────────────────────────────── */
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 60 }}>

            {/* Category */}
            <View style={S.section}>
              <Text style={S.secLabel}>What do you need? *</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
                {CATEGORIES.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[S.catChip, selectedCat === c.id && S.catChipActive]}
                    onPress={() => setSelectedCat(c.id)}
                  >
                    <Text style={{ fontSize: 20 }}>{c.emoji}</Text>
                    <Text style={[S.catChipLabel, selectedCat === c.id && { color: '#fff' }]}>{c.label}</Text>
                    <Text style={[S.catChipDesc, selectedCat === c.id && { color: 'rgba(255,255,255,0.8)' }]}>
                      {c.desc}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Description */}
            <View style={S.section}>
              <Text style={S.secLabel}>Describe your order *</Text>
              <TextInput
                style={[S.input, { minHeight: 100, textAlignVertical: 'top' }]}
                placeholder="Be specific — e.g. '1 kg butter chicken + 4 naan from Patti'"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                placeholderTextColor="#9CA3AF"
              />
              <Text style={{ fontSize: 11, color: description.length < 10 ? '#EF4444' : '#9CA3AF', marginTop: 4 }}>
                {description.length} chars {description.length < 10 ? '(min 10)' : '✓'}
              </Text>
            </View>

            {/* Budget */}
            <View style={S.section}>
              <Text style={S.secLabel}>Budget (optional)</Text>
              <TextInput
                style={S.input}
                placeholder="₹ Maximum amount you want to spend"
                value={budget}
                onChangeText={t => setBudget(t.replace(/[^0-9.]/g, ''))}
                keyboardType="numeric"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Address */}
            <View style={S.section}>
              <Text style={S.secLabel}>Delivery Address *</Text>
              <TextInput
                style={[S.input, { minHeight: 72, textAlignVertical: 'top' }]}
                placeholder="Full address including landmark…"
                value={address}
                onChangeText={setAddress}
                multiline
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Special instructions */}
            <View style={S.section}>
              <Text style={S.secLabel}>Special Instructions (optional)</Text>
              <TextInput
                style={[S.input, { minHeight: 60, textAlignVertical: 'top' }]}
                placeholder="Any special notes for the delivery person…"
                value={notes}
                onChangeText={setNotes}
                multiline
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Photos */}
            <View style={S.section}>
              <Text style={S.secLabel}>Attach Photos (optional, max 3)</Text>
              <Text style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 8 }}>Long press on a photo to remove it</Text>
              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                {imageUris.map((uri, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={S.imgThumb}
                    onLongPress={() => setImageUris(prev => prev.filter((_, i) => i !== idx))}
                  >
                    <Text style={{ fontSize: 24 }}>🖼️</Text>
                    <Text style={{ fontSize: 9, color: '#6B7280', marginTop: 2 }}>Hold to remove</Text>
                  </TouchableOpacity>
                ))}
                {imageUris.length < 3 && (
                  <TouchableOpacity style={S.addImgBtn} onPress={pickImage}>
                    <Text style={{ fontSize: 28, color: COLORS.textLight }}>+</Text>
                    <Text style={{ fontSize: 10, color: COLORS.textLight, marginTop: 2 }}>Add photo</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[
                S.submitBtn,
                (submitting || !selectedCat || description.trim().length < 10 || !address.trim()) && { opacity: 0.5 },
              ]}
              onPress={handleSubmit}
              disabled={submitting || !selectedCat || description.trim().length < 10 || !address.trim()}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={S.submitBtnTxt}>🚀 Submit Custom Order</Text>
              }
            </TouchableOpacity>

          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  )
}

const S = StyleSheet.create({
  section:       { backgroundColor: '#fff', borderRadius: 14, padding: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  secLabel:      { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  input:         { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, padding: 13, fontSize: 14, color: COLORS.text },
  catChip:       { width: '47%', borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 12, backgroundColor: '#F9FAFB' },
  catChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catChipLabel:  { fontSize: 13, fontWeight: '700', color: COLORS.text, marginTop: 6 },
  catChipDesc:   { fontSize: 10, color: '#6B7280', marginTop: 2 },
  // ── History styles ──
  pastCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  statusPill:    { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start' },
  // ── Photo styles ──
  imgThumb: {
    width: 80, height: 80, borderRadius: 12, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  addImgBtn: {
    width: 80, height: 80, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed',
    borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
  },
  // ── Buttons ──
  newBtn:       { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 20 },
  submitBtn:    { backgroundColor: COLORS.primary, borderRadius: 14, padding: 16, alignItems: 'center' },
  submitBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
})
