/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert, Modal,
  KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native'
import { Stack, useRouter } from 'expo-router'
import * as Location from 'expo-location'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import { COLORS } from '../../../lib/constants'

// ─── Types ─────────────────────────────────────────────────────────────────────
type SavedAddress = {
  id: string
  customer_id: string
  label: string
  recipient_name: string | null
  recipient_phone: string | null
  address: string
  apartment_floor: string | null
  landmark: string | null
  latitude: number
  longitude: number
  city: string | null
  state: string | null
  postal_code: string | null
  is_default: boolean
  delivery_instructions: string | null
  created_at: string | null
  updated_at: string | null
}

type Suggestion = {
  place_id: string
  display_name: string
  display_address?: string
  lat: string
  lon: string
  address?: {
    city?: string; town?: string; village?: string
    state?: string; postcode?: string
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────
const LABELS = [
  { key: 'Home',  emoji: '🏠' },
  { key: 'Work',  emoji: '🏢' },
  { key: 'Other', emoji: '📍' },
]

const EMPTY_FORM = {
  label:                 'Home',
  recipient_name:        '',
  recipient_phone:       '',
  address:               '',
  apartment_floor:       '',
  landmark:              '',
  delivery_instructions: '',
  city:                  '',
  state:                 '',
  postal_code:           '',
  latitude:              0,
  longitude:             0,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatFullAddress(a: SavedAddress): string {
  const parts: string[] = [a.address]
  if (a.apartment_floor) parts.push(`Flat/Floor: ${a.apartment_floor}`)
  if (a.landmark)        parts.push(`Landmark: ${a.landmark}`)
  if (a.city)            parts.push(a.city + (a.state ? `, ${a.state}` : ''))
  if (a.postal_code)     parts.push(a.postal_code)
  return parts.filter(Boolean).join('\n')
}

function labelEmoji(label: string): string {
  return LABELS.find(l => l.key === label)?.emoji ?? '📍'
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AddressesPage() {
  const { user } = useAuth()
  const router   = useRouter()

  const [addresses,  setAddresses]  = useState<SavedAddress[]>([])
  const [loading,    setLoading]    = useState(true)
  const [showModal,  setShowModal]  = useState(false)
  const [editing,    setEditing]    = useState<SavedAddress | null>(null)
  const [form,       setForm]       = useState({ ...EMPTY_FORM })
  const [saving,     setSaving]     = useState(false)
  const [detecting,  setDetecting]  = useState(false)

  // LocationIQ autocomplete
  const [addrSearch,   setAddrSearch]   = useState('')
  const [suggestions,  setSuggestions]  = useState<Suggestion[]>([])
  const [showSugg,     setShowSugg]     = useState(false)
  const [searching,    setSearching]    = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef    = useRef<AbortController | null>(null)

  // ── Load addresses ──────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('saved_addresses')
        .select('*')
        .eq('customer_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at',  { ascending: false })
      if (error) throw error
      setAddresses((data ?? []) as SavedAddress[])
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to load addresses')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])

  // ── Open modal ──────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditing(null)
    setForm({ ...EMPTY_FORM })
    setAddrSearch('')
    setSuggestions([])
    setShowModal(true)
  }

  const openEdit = (a: SavedAddress) => {
    setEditing(a)
    setForm({
      label:                 a.label,
      recipient_name:        a.recipient_name  ?? '',
      recipient_phone:       a.recipient_phone ?? '',
      address:               a.address,
      apartment_floor:       a.apartment_floor       ?? '',
      landmark:              a.landmark              ?? '',
      delivery_instructions: a.delivery_instructions ?? '',
      city:                  a.city        ?? '',
      state:                 a.state       ?? '',
      postal_code:           a.postal_code ?? '',
      latitude:              a.latitude,
      longitude:             a.longitude,
    })
    setAddrSearch(a.address)
    setSuggestions([])
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditing(null)
    setSuggestions([])
    setShowSugg(false)
    setAddrSearch('')
  }

  // ── Set field ───────────────────────────────────────────────────────────
  const set = <K extends keyof typeof EMPTY_FORM>(key: K, value: string | number) => {
    setForm(f => ({ ...f, [key]: value }))
  }

  // ── LocationIQ autocomplete ─────────────────────────────────────────────
  const handleAddrSearch = (q: string) => {
    setAddrSearch(q)
    set('address', q)
    setSuggestions([])

    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (q.length < 4) { setShowSugg(false); return }

    searchTimer.current = setTimeout(async () => {
      const key = process.env.EXPO_PUBLIC_LOCATIONIQ_KEY
      if (!key) return
      setSearching(true)
      abortRef.current?.abort()
      abortRef.current = new AbortController()
      try {
        const res = await fetch(
          `https://us1.locationiq.com/v1/autocomplete?key=${key}&q=${encodeURIComponent(q)}&countrycodes=in&limit=6&format=json`,
          { signal: abortRef.current.signal }
        )
        const data = await res.json()
        setSuggestions(Array.isArray(data) ? data : [])
        setShowSugg(Array.isArray(data) && data.length > 0)
      } catch {
        setSuggestions([])
      } finally {
        setSearching(false)
      }
    }, 500)
  }

  const pickSuggestion = (s: Suggestion) => {
    const addr = s.display_name ?? s.display_address ?? addrSearch
    const city  = s.address?.city  ?? s.address?.town ?? s.address?.village ?? form.city
    const state = s.address?.state ?? form.state
    const postal = s.address?.postcode ?? form.postal_code
    setForm(f => ({
      ...f,
      address:    addr,
      latitude:   Number(s.lat) || 0,
      longitude:  Number(s.lon) || 0,
      city:       city,
      state:      state,
      postal_code: postal,
    }))
    setAddrSearch(addr)
    setSuggestions([])
    setShowSugg(false)
    Keyboard.dismiss()
  }

  // ── GPS detect current location ─────────────────────────────────────────
  const detectLocation = async () => {
    setDetecting(true)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required.')
        return
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
      const { latitude, longitude } = pos.coords
      set('latitude',  latitude)
      set('longitude', longitude)

      // Reverse geocode via LocationIQ
      const key = process.env.EXPO_PUBLIC_LOCATIONIQ_KEY
      if (key) {
        try {
          const r = await fetch(
            `https://us1.locationiq.com/v1/reverse?key=${key}&lat=${latitude}&lon=${longitude}&format=json`
          )
          const g = await r.json()
          const addr   = g.display_name ?? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
          const city   = g.address?.city ?? g.address?.town ?? g.address?.village ?? ''
          const state  = g.address?.state ?? ''
          const postal = g.address?.postcode ?? ''
          setForm(f => ({
            ...f,
            address:    addr,
            latitude,
            longitude,
            city,
            state,
            postal_code: postal,
          }))
          setAddrSearch(addr)
        } catch {
          setForm(f => ({ ...f, latitude, longitude }))
        }
      } else {
        setForm(f => ({ ...f, latitude, longitude }))
      }
      setSuggestions([])
      setShowSugg(false)
    } catch (e: any) {
      Alert.alert('Location Error', e.message ?? 'Could not get location')
    } finally {
      setDetecting(false)
    }
  }

  // ── Save ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user) return
    if (!form.address.trim()) {
      Alert.alert('Required', 'Please enter or detect an address.')
      return
    }
    if (form.latitude === 0 && form.longitude === 0) {
      Alert.alert('Required', 'Please detect your location or pick from suggestions so we have your coordinates.')
      return
    }
    setSaving(true)
    try {
      const row = {
        customer_id:           user.id,
        label:                 form.label,
        recipient_name:        form.recipient_name.trim()        || null,
        recipient_phone:       form.recipient_phone.trim()       || null,
        address:               form.address.trim(),
        apartment_floor:       form.apartment_floor.trim()       || null,
        landmark:              form.landmark.trim()              || null,
        delivery_instructions: form.delivery_instructions.trim() || null,
        city:                  form.city.trim()                  || null,
        state:                 form.state.trim()                 || null,
        postal_code:           form.postal_code.trim()           || null,
        latitude:              form.latitude,
        longitude:             form.longitude,
        is_default:            addresses.length === 0 && !editing,
        updated_at:            new Date().toISOString(),
      }

      if (editing) {
        const { error } = await supabase
          .from('saved_addresses')
          .update(row)
          .eq('id', editing.id)
        if (error) throw error
      } else {
        // If new default, clear old defaults first
        if (row.is_default) {
          await supabase.from('saved_addresses')
            .update({ is_default: false })
            .eq('customer_id', user.id)
        }
        const { error } = await supabase
          .from('saved_addresses')
          .insert({ ...row, created_at: new Date().toISOString() })
        if (error) throw error
      }

      closeModal()
      await load()
      Alert.alert('✅ Saved!', `Address ${editing ? 'updated' : 'added'} successfully.`)
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to save address')
    } finally {
      setSaving(false)
    }
  }

  // ── Set default ─────────────────────────────────────────────────────────
  const handleSetDefault = async (a: SavedAddress) => {
    if (!user || a.is_default) return
    try {
      await supabase.from('saved_addresses')
        .update({ is_default: false }).eq('customer_id', user.id)
      await supabase.from('saved_addresses')
        .update({ is_default: true }).eq('id', a.id)
      await load()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────
  const handleDelete = (a: SavedAddress) => {
    Alert.alert(
      'Delete Address',
      `Remove "${a.label}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await supabase.from('saved_addresses').delete().eq('id', a.id)
              await load()
            } catch (e: any) {
              Alert.alert('Error', e.message)
            }
          },
        },
      ]
    )
  }

  // ── Render address card ─────────────────────────────────────────────────
  const renderCard = (a: SavedAddress) => (
    <View key={a.id} style={[S.card, a.is_default && S.cardDefault]}>
      {/* Header */}
      <View style={S.cardHeader}>
        <Text style={{ fontSize: 26, marginRight: 10 }}>{labelEmoji(a.label)}</Text>
        <View style={{ flex: 1 }}>
          <Text style={S.cardLabel}>{a.label}</Text>
          {a.is_default && (
            <Text style={S.defaultTag}>✓ Default address</Text>
          )}
        </View>
        <TouchableOpacity onPress={() => openEdit(a)} style={S.editBtn}>
          <Text style={{ fontSize: 18 }}>✏️</Text>
        </TouchableOpacity>
      </View>

      {/* Recipient */}
      {!!a.recipient_name && (
        <Text style={S.recipientTxt}>
          {a.recipient_name}
          {a.recipient_phone ? `  ·  ${a.recipient_phone}` : ''}
        </Text>
      )}

      {/* Full address */}
      <Text style={S.addrTxt}>{formatFullAddress(a)}</Text>

      {/* Delivery instructions */}
      {!!a.delivery_instructions && (
        <View style={S.instrBox}>
          <Text style={{ fontSize: 13 }}>📋</Text>
          <Text style={S.instrTxt}>{a.delivery_instructions}</Text>
        </View>
      )}

      {/* Coordinates pill */}
      {a.latitude !== 0 && a.longitude !== 0 && (
        <Text style={S.coordPill}>
          {`📍 ${a.latitude.toFixed(4)}, ${a.longitude.toFixed(4)}`}
        </Text>
      )}

      {/* Actions */}
      <View style={S.actions}>
        {!a.is_default && (
          <TouchableOpacity
            style={[S.actionBtn, { borderColor: COLORS.primary, borderWidth: 1.5 }]}
            onPress={() => handleSetDefault(a)}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.primary }}>
              Set Default
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[S.actionBtn, { borderColor: '#EF4444', borderWidth: 1.5 }]}
          onPress={() => handleDelete(a)}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#EF4444' }}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  // ── Render modal form ───────────────────────────────────────────────────
  const renderForm = () => (
    <Modal
      visible={showModal}
      transparent
      animationType="slide"
      onRequestClose={closeModal}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={S.modalOverlay}>
          <View style={S.modalSheet}>

            {/* Modal header */}
            <View style={S.modalHeader}>
              <Text style={S.modalTitle}>
                {editing ? 'Edit Address' : 'Add New Address'}
              </Text>
              <TouchableOpacity onPress={closeModal} style={{ padding: 4 }}>
                <Text style={{ fontSize: 22, color: '#6B7280' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              {/* ── Label picker ─────────────────────────────── */}
              <Text style={S.fieldLabel}>Address Label</Text>
              <View style={S.labelRow}>
                {LABELS.map(l => (
                  <TouchableOpacity
                    key={l.key}
                    style={[S.labelBtn, form.label === l.key && S.labelBtnActive]}
                    onPress={() => set('label', l.key)}
                  >
                    <Text style={{ fontSize: 20, marginBottom: 3 }}>{l.emoji}</Text>
                    <Text style={{
                      fontSize: 12, fontWeight: '700',
                      color: form.label === l.key ? '#fff' : COLORS.text,
                    }}>
                      {l.key}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* ── Recipient ────────────────────────────────── */}
              <Text style={S.fieldLabel}>Recipient Name (optional)</Text>
              <TextInput
                style={S.input}
                placeholder="e.g. Kunwardeep Singh"
                value={form.recipient_name}
                onChangeText={v => set('recipient_name', v)}
                placeholderTextColor="#9CA3AF"
              />

              <Text style={S.fieldLabel}>Recipient Phone (optional)</Text>
              <TextInput
                style={S.input}
                placeholder="e.g. 9855780617"
                value={form.recipient_phone}
                onChangeText={v => set('recipient_phone', v)}
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                maxLength={10}
              />

              {/* ── Address search ───────────────────────────── */}
              <Text style={S.fieldLabel}>Address *</Text>
              <View style={{ position: 'relative', marginBottom: 4 }}>
                <View style={S.addrSearchRow}>
                  <TextInput
                    style={[S.input, { flex: 1, marginBottom: 0 }]}
                    placeholder="Search address…"
                    value={addrSearch}
                    onChangeText={handleAddrSearch}
                    placeholderTextColor="#9CA3AF"
                    autoCorrect={false}
                  />
                  {searching && (
                    <ActivityIndicator
                      size="small"
                      color={COLORS.primary}
                      style={{ marginLeft: 10 }}
                    />
                  )}
                </View>

                {/* Suggestions dropdown */}
                {showSugg && suggestions.length > 0 && (
                  <View style={S.suggBox}>
                    {suggestions.map((s, i) => (
                      <TouchableOpacity
                        key={s.place_id ?? i}
                        style={[
                          S.suggItem,
                          i < suggestions.length - 1 && {
                            borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
                          },
                        ]}
                        onPress={() => pickSuggestion(s)}
                      >
                        <Text style={{ fontSize: 14, marginRight: 8 }}>📍</Text>
                        <Text style={{ flex: 1, fontSize: 13, color: COLORS.text, lineHeight: 18 }}>
                          {s.display_name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Detect GPS button */}
              <TouchableOpacity
                style={[
                  S.detectBtn,
                  (form.latitude !== 0 || detecting) && { borderColor: '#10B981' },
                ]}
                onPress={detectLocation}
                disabled={detecting}
              >
                {detecting
                  ? <ActivityIndicator size="small" color={COLORS.primary} />
                  : <Text style={{ fontSize: 18, marginRight: 8 }}>
                      {form.latitude !== 0 ? '✅' : '📡'}
                    </Text>
                }
                <Text style={{
                  fontWeight: '700',
                  color: form.latitude !== 0 ? '#065F46' : COLORS.primary,
                  fontSize: 14,
                }}>
                  {detecting
                    ? 'Detecting location…'
                    : form.latitude !== 0
                      ? `Location set (${form.latitude.toFixed(4)}, ${form.longitude.toFixed(4)})`
                      : 'Use my current location (GPS)'
                  }
                </Text>
              </TouchableOpacity>

              {/* ── Apartment / Floor ────────────────────────── */}
              <Text style={[S.fieldLabel, { marginTop: 12 }]}>
                Apartment / Floor (optional)
              </Text>
              <TextInput
                style={S.input}
                placeholder="e.g. Flat 4B, 2nd Floor"
                value={form.apartment_floor}
                onChangeText={v => set('apartment_floor', v)}
                placeholderTextColor="#9CA3AF"
              />

              {/* ── Landmark ─────────────────────────────────── */}
              <Text style={S.fieldLabel}>Landmark (optional)</Text>
              <TextInput
                style={S.input}
                placeholder="e.g. Near Waddi Mandi"
                value={form.landmark}
                onChangeText={v => set('landmark', v)}
                placeholderTextColor="#9CA3AF"
              />

              {/* ── Delivery Instructions ────────────────────── */}
              <Text style={S.fieldLabel}>Delivery Instructions (optional)</Text>
              <TextInput
                style={[S.input, { minHeight: 72, textAlignVertical: 'top' }]}
                placeholder="e.g. Call when you arrive, leave at door…"
                value={form.delivery_instructions}
                onChangeText={v => set('delivery_instructions', v)}
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
              />

              {/* ── City / State / PIN ───────────────────────── */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={S.fieldLabel}>City</Text>
                  <TextInput
                    style={S.input}
                    placeholder="Patti"
                    value={form.city}
                    onChangeText={v => set('city', v)}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={S.fieldLabel}>State</Text>
                  <TextInput
                    style={S.input}
                    placeholder="Punjab"
                    value={form.state}
                    onChangeText={v => set('state', v)}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <Text style={S.fieldLabel}>Postal Code</Text>
              <TextInput
                style={S.input}
                placeholder="143416"
                value={form.postal_code}
                onChangeText={v => set('postal_code', v)}
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                maxLength={6}
              />

              {/* ── Save Button ──────────────────────────────── */}
              <TouchableOpacity
                style={[S.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
                      {editing ? '✅ Update Address' : '✅ Save Address'}
                    </Text>
                }
              </TouchableOpacity>

            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )

  // ── Main render ─────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <Stack.Screen options={{
        title: 'My Addresses',
        headerRight: () => (
          <TouchableOpacity onPress={openAdd} style={{ marginRight: 14 }}>
            <Text style={{ color: COLORS.primary, fontWeight: '800', fontSize: 24 }}>+</Text>
          </TouchableOpacity>
        ),
      }} />

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ marginTop: 12, color: '#6B7280' }}>Loading addresses…</Text>
        </View>
      ) : addresses.length === 0 ? (
        <View style={S.emptyState}>
          <Text style={{ fontSize: 72, marginBottom: 16 }}>🗺️</Text>
          <Text style={S.emptyTitle}>No saved addresses</Text>
          <Text style={S.emptySub}>Add an address to speed up checkout</Text>
          <TouchableOpacity style={S.addBtn} onPress={openAdd}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
              + Add Address
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        >
          <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 14 }}>
            {`${addresses.length} saved address${addresses.length !== 1 ? 'es' : ''}`}
          </Text>

          {addresses.map(a => renderCard(a))}
        </ScrollView>
      )}

      {/* FAB — add address */}
      {addresses.length > 0 && (
        <TouchableOpacity style={S.fab} onPress={openAdd}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
            + Add New Address
          </Text>
        </TouchableOpacity>
      )}

      {/* Form modal */}
      {renderForm()}
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  // ── Cards
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardDefault: {
    borderColor: COLORS.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardLabel: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
  },
  defaultTag: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  editBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FFF3EE',
  },
  recipientTxt: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  addrTxt: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 6,
  },
  instrBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 6,
  },
  instrTxt: {
    fontSize: 12,
    color: '#92400E',
    flex: 1,
    lineHeight: 18,
  },
  coordPill: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 10,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
  },

  // ── Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 28,
    textAlign: 'center',
  },
  addBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },

  // ── FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    elevation: 8,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },

  // ── Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 22,
    paddingBottom: 10,
    maxHeight: '95%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.text,
  },

  // ── Form
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: '#FAFAFA',
    marginBottom: 10,
  },

  // ── Label picker
  labelRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  labelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  labelBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  // ── Address search
  addrSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    marginTop: 4,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    zIndex: 100,
  },
  suggItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
  },

  // ── Detect button
  detectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3EE',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    marginBottom: 4,
  },

  // ── Save button
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 18,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
})
