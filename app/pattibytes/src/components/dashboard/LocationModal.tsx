import React, { useRef, useState } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, StyleSheet,
} from 'react-native'
import * as Location from 'expo-location'
import { COLORS } from '../../lib/constants'

type Sugg = { placeid: string; displayname: string; lat: string; lon: string; address?: any }

type Props = {
  visible:  boolean
  current:  string
  onClose:  () => void
  onPick:   (label: string, lat: number, lng: number) => void
}

export default function LocationModal({ visible, current, onClose, onPick }: Props) {
  const [query,     setQuery]     = useState('')
  const [suggs,     setSuggs]     = useState<Sugg[]>([])
  const [searching, setSearching] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const handleSearch = (q: string) => {
    setQuery(q)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (q.length < 3) { setSuggs([]); return }
    timerRef.current = setTimeout(async () => {
      const key = process.env.EXPO_PUBLIC_LOCATIONIQ_KEY
      if (!key) return
      setSearching(true)
      abortRef.current?.abort()
      abortRef.current = new AbortController()
      try {
        const res = await fetch(
          `https://us1.locationiq.com/v1/autocomplete?key=${key}&q=${encodeURIComponent(q)}&countrycodes=in&limit=7&format=json`,
          { signal: abortRef.current.signal }
        )
        const data = await res.json()
        setSuggs(Array.isArray(data) ? data : [])
      } catch { setSuggs([]) }
      finally { setSearching(false) }
    }, 500)
  }

  const detectGPS = async () => {
    setDetecting(true)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') { Alert.alert('Permission denied'); return }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      const { latitude, longitude } = pos.coords
      const key = process.env.EXPO_PUBLIC_LOCATIONIQ_KEY
      let label = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
      if (key) {
        try {
          const r = await fetch(
            `https://us1.locationiq.com/v1/reverse?key=${key}&lat=${latitude}&lon=${longitude}&format=json`
          )
          const g = await r.json()
          const city = g?.address?.city ?? g?.address?.town ?? g?.address?.village
          if (city) label = `${city}, ${g?.address?.state ?? ''}`
        } catch { /* keep coords label */ }
      }
      onPick(label, latitude, longitude)
      onClose()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setDetecting(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={S.sheet}>
          <View style={S.sheetHeader}>
            <Text style={S.sheetTitle}>Change Location</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ fontSize: 22, color: '#9CA3AF' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Current */}
          <View style={S.currentBox}>
            <Text style={{ fontSize: 18 }}>📍</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: '#6B7280', fontWeight: '600' }}>Current Location</Text>
              <Text style={{ fontWeight: '800', color: COLORS.primary, fontSize: 14 }} numberOfLines={1}>{current}</Text>
            </View>
          </View>

          {/* GPS */}
          <TouchableOpacity style={S.gpsBtn} onPress={detectGPS} disabled={detecting}>
            {detecting
              ? <ActivityIndicator size="small" color={COLORS.primary} />
              : <Text style={{ fontSize: 20 }}>🎯</Text>}
            <Text style={{ fontWeight: '700', color: '#065F46', fontSize: 14 }}>
              {detecting ? 'Detecting…' : 'Use my current location (GPS)'}
            </Text>
          </TouchableOpacity>

          {/* Search */}
          <View style={S.searchBox}>
            <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
            <TextInput
              style={{ flex: 1, paddingVertical: 12, fontSize: 14, color: COLORS.text }}
              placeholder="Search city, area"
              value={query}
              onChangeText={handleSearch}
              placeholderTextColor="#9CA3AF"
              autoFocus
            />
            {searching && <ActivityIndicator size="small" color={COLORS.primary} />}
            {query.length > 0 && !searching && (
              <TouchableOpacity onPress={() => { setQuery(''); setSuggs([]) }}>
                <Text style={{ color: '#9CA3AF', fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {suggs.map((s, i) => (
              <TouchableOpacity
                key={s.placeid ?? i}
                style={S.suggRow}
                onPress={() => { onPick(s.displayname, Number(s.lat), Number(s.lon)); onClose() }}
              >
                <Text style={{ fontSize: 16, marginTop: 1 }}>📍</Text>
                <Text style={{ flex: 1, fontSize: 13, color: COLORS.text, lineHeight: 19 }}>
                  {s.displayname}
                </Text>
              </TouchableOpacity>
            ))}
            {query.length >= 3 && !searching && suggs.length === 0 && (
              <Text style={{ textAlign: 'center', color: '#9CA3AF', paddingVertical: 20 }}>
                No results found
              </Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const S = StyleSheet.create({
  sheet:       { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle:  { fontSize: 18, fontWeight: '900', color: '#111827' },
  currentBox:  { backgroundColor: '#FFF3EE', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, borderWidth: 1.5, borderColor: '#FED7AA' },
  gpsBtn:      { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1.5, borderColor: '#BBF7D0' },
  searchBox:   { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 12, marginBottom: 8, backgroundColor: '#FAFAFA' },
  suggRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
})