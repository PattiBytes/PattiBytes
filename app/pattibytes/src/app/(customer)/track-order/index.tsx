import React, { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import MapView, { Marker, UrlTile } from 'react-native-maps'
import { useLocalSearchParams } from 'expo-router'
import { useOrderTracking } from '../../../hooks/useOrderTracking'

export default function TrackOrderScreen() {
  const { orderId, driverId } = useLocalSearchParams<{ orderId?: string; driverId?: string }>()
  const loc = useOrderTracking(driverId ?? null)

  const initialRegion = useMemo(
    () => ({
      latitude: loc?.lat ?? 30.901,
      longitude: loc?.lng ?? 75.8573,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    }),
    [loc?.lat, loc?.lng]
  )

  return (
    <View style={S.container}>
      <Text style={S.header}>
        Track Order{orderId ? ` #${orderId}` : ''}
      </Text>
      <MapView style={S.map} initialRegion={initialRegion}>
        <UrlTile
          urlTemplate={`https://us1.locationiq.com/v3/streets/r/{z}/{x}/{y}.png?key=${process.env.EXPO_PUBLIC_LOCATIONIQ_KEY}`}
          maximumZ={19}
        />
        {loc && (
          <Marker
            coordinate={{ latitude: loc.lat, longitude: loc.lng }}
            title="Driver"
            rotation={loc.heading ?? undefined}
          />
        )}
      </MapView>
    </View>
  )
}

const S = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 12, fontSize: 16, fontWeight: '700' },
  map: { flex: 1 },
})
