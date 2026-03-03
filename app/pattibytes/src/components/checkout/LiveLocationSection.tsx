import React from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import { COLORS } from '../../lib/constants'

interface Props {
  liveLocation:  { lat: number; lng: number } | null
  locLoading:    boolean
  locRequired:   boolean
  onDetect:      () => void
}

export default function LiveLocationSection({
  liveLocation, locLoading, locRequired, onDetect,
}: Props) {
  return (
    <View style={S.section}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        <Text style={[S.title, { flex: 1, marginBottom: 0 }]}>📡 Live Location</Text>
        <View style={S.reqBadge}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: '#92400E' }}>REQUIRED</Text>
        </View>
      </View>
      <Text style={S.hint}>
        Your live location is shared with the driver so they can find you easily.
      </Text>

      <TouchableOpacity
        style={[S.btn, !!liveLocation && S.btnActive]}
        onPress={onDetect}
        disabled={locLoading}
        activeOpacity={0.8}
      >
        {locLoading
          ? <ActivityIndicator color={COLORS.primary} size="small" />
          : <Text style={{ fontSize: 20 }}>{liveLocation ? '✅' : '📍'}</Text>}
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[S.btnLabel, !!liveLocation && { color: '#065F46' }]}>
            {locLoading ? 'Detecting…'
              : liveLocation ? 'Location shared'
              : 'Share my current location'}
          </Text>
          {liveLocation && (
            <Text style={S.coords}>
              {liveLocation.lat.toFixed(5)}, {liveLocation.lng.toFixed(5)}
            </Text>
          )}
        </View>
        {liveLocation && (
          <TouchableOpacity onPress={onDetect} style={{ padding: 4 }}>
            <Text style={{ fontSize: 11, color: COLORS.primary, fontWeight: '700' }}>Refresh</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {locRequired && !liveLocation && (
        <View style={S.warning}>
          <Text style={{ fontSize: 12, color: '#991B1B', fontWeight: '600' }}>
            ⚠️ Location is required to place the order. Tap above to allow.
          </Text>
        </View>
      )}
    </View>
  )
}

const S = StyleSheet.create({
  section:  { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 16, padding: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  title:    { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 12 },
  reqBadge: { backgroundColor: '#FEF3C7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  hint:     { fontSize: 12, color: '#6B7280', marginBottom: 12 },
  btn:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3EE', borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: '#FED7AA' },
  btnActive:{ backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  btnLabel: { fontWeight: '700', color: COLORS.primary, fontSize: 14 },
  coords:   { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  warning:  { backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10, marginTop: 10, borderWidth: 1, borderColor: '#FECACA' },
})
