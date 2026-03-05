import React, { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
// ✅ Import from your shim — NOT from 'react-native-maps'
import MapView, { Marker } from '../../../components/MapView'
import { useLocalSearchParams } from 'expo-router'
import { useOrderTracking } from '../../../hooks/useOrderTracking'

export default function TrackOrderScreen() {
  const { orderId, driverId } = useLocalSearchParams<{ orderId?: string; driverId?: string }>()
  const loc = useOrderTracking(driverId ?? null)

  const initialRegion = useMemo(
    () => ({
      latitude:      loc?.lat ?? 30.901,
      longitude:     loc?.lng ?? 75.8573,
      latitudeDelta:  0.05,
      longitudeDelta: 0.05,
    }),
    [loc?.lat, loc?.lng],
  )

  return (
    <View style={S.container}>
      <Text style={S.header}>
        Track Order{orderId ? ` #${orderId}` : ''}
      </Text>

      <MapView style={S.map} initialRegion={initialRegion}>
        {loc && (
          <Marker
            coordinate={{ latitude: loc.lat, longitude: loc.lng }}
            title="Driver"
          />
        )}
        {/* UrlTile removed — MapLibre shim uses OpenFreeMap tiles built-in */}
      </MapView>
    </View>
  )
}

const S = StyleSheet.create({
  container: { flex: 1 },
  header:    { padding: 12, fontSize: 16, fontWeight: '700' },
  map:       { flex: 1 },
})
