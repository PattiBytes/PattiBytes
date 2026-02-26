import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

type Region = {
  latitude: number
  longitude: number
  latitudeDelta: number
  longitudeDelta: number
}

export function MapView({
  style,
  children,
}: {
  style?: any
  children?: React.ReactNode
  provider?: any
  region?: Region
  initialRegion?: Region
  showsUserLocation?: boolean
  showsMyLocationButton?: boolean
}) {
  return (
    <View style={[S.container, style]}>
      <Text style={S.icon}>🗺️</Text>
      <Text style={S.title}>Map Preview</Text>
      <Text style={S.sub}>Full map available on mobile app</Text>
      {children}
    </View>
  )
}

export function Marker(_: any) { return null }
export function Polyline(_: any) { return null }
export function Circle(_: any) { return null }
export const PROVIDER_GOOGLE = 'google'

export type LatLng = { latitude: number; longitude: number }

const S = StyleSheet.create({
  container: {
    backgroundColor: '#E5E7EB', alignItems: 'center',
    justifyContent: 'center', minHeight: 220, borderRadius: 16,
  },
  icon: { fontSize: 44, marginBottom: 10 },
  title: { fontSize: 16, fontWeight: '800', color: '#374151' },
  sub: { fontSize: 12, color: '#6B7280', marginTop: 4 },
})
