import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Linking, Platform } from 'react-native'
import Constants from 'expo-constants'
import * as Device from 'expo-device'

// ── Detect environments where MapLibre native module won't work ───────────────
const isExpoGo =
  Constants.appOwnership === 'expo' ||
  (Constants as any).executionEnvironment === 'storeClient'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const isSimulator = !Device.isDevice

// MapLibre requires a real device + custom dev build (EAS build)
const canUseMapLibre = !isExpoGo && Device.isDevice

export { canUseMapLibre }
// ── Types re-exported so callers don't need to import maplibre directly ───────
export type Region = {
  latitude:        number
  longitude:       number
  latitudeDelta:   number
  longitudeDelta:  number
}

export type LatLng = {
  latitude:  number
  longitude: number
}

// ── Lazy-load MapLibre ONLY when safe ─────────────────────────────────────────
let NativeMapView:    any = null
let NativeMarker:     any = null
let NativePolyline:   any = null
let PROVIDER_GOOGLE_VAL: any = null

if (canUseMapLibre) {
  try {
    // Use commonjs to avoid dual-bundle duplicate registration
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ML = require('@maplibre/maplibre-react-native')
    NativeMapView     = ML.MapView      ?? ML.default?.MapView
    NativeMarker      = ML.PointAnnotation ?? ML.MarkerView ?? ML.default?.PointAnnotation
    NativePolyline    = ML.LineLayer    ?? ML.default?.LineLayer
    PROVIDER_GOOGLE_VAL = 'mapbox'      // maplibre uses mapbox-style provider string
  } catch (e) {
    console.warn('[MapView] MapLibre failed to load:', e)
  }
}

// Export PROVIDER_GOOGLE as a constant (callers pass it to MapView)
export const PROVIDER_GOOGLE = PROVIDER_GOOGLE_VAL

// ── Fallback Static Map ───────────────────────────────────────────────────────
interface FallbackProps {
  style?:       any
  latitude?:    number
  longitude?:   number
  label?:       string
}

function StaticMapFallback({ style, latitude, longitude, label }: FallbackProps) {
  const hasCoords = typeof latitude === 'number' && typeof longitude === 'number'
  const mapsUrl   = hasCoords
    ? `https://www.google.com/maps?q=${latitude},${longitude}`
    : 'https://maps.google.com'

  return (
    <View style={[S.fallback, style]}>
      <Text style={S.fallbackEmoji}>🗺️</Text>
      {hasCoords ? (
        <>
          <Text style={S.fallbackLabel}>{label ?? 'Delivery Location'}</Text>
          <Text style={S.fallbackCoords}>
            {latitude?.toFixed(5)}, {longitude?.toFixed(5)}
          </Text>
          <TouchableOpacity
            style={S.fallbackBtn}
            onPress={() => Linking.openURL(mapsUrl)}
            activeOpacity={0.8}
          >
            <Text style={S.fallbackBtnTxt}>📍 Open in Google Maps</Text>
          </TouchableOpacity>
        </>
      ) : (
        <Text style={S.fallbackLabel}>Map unavailable</Text>
      )}
      {isExpoGo && (
        <Text style={S.fallbackNote}>
          Live map requires a custom build (EAS). Tap above to open in Maps.
        </Text>
      )}
    </View>
  )
}

// ── MapView wrapper ───────────────────────────────────────────────────────────
interface MapViewProps {
  style?:          any
  provider?:       any
  initialRegion?:  Region
  region?:         Region
  showsUserLocation?: boolean
  children?:       React.ReactNode
  // pass-through for the fallback
  fallbackLatitude?:  number
  fallbackLongitude?: number
  fallbackLabel?:     string
}

function MapViewWrapper({
  style,
  initialRegion,
  region,
  showsUserLocation,
  children,
  fallbackLatitude,
  fallbackLongitude,
  fallbackLabel,
  ...rest
}: MapViewProps) {
  if (!canUseMapLibre || !NativeMapView) {
    // Derive coords from region for the fallback
    const lat = fallbackLatitude ?? region?.latitude ?? initialRegion?.latitude
    const lng = fallbackLongitude ?? region?.longitude ?? initialRegion?.longitude
    return (
      <StaticMapFallback
        style={style}
        latitude={lat}
        longitude={lng}
        label={fallbackLabel}
      />
    )
  }

  // Real MapLibre render
  const activeRegion = region ?? initialRegion
  return (
    <NativeMapView
      style={style ?? { width: '100%', height: 240 }}
      styleURL="https://demotiles.maplibre.org/style.json"
      centerCoordinate={
        activeRegion
          ? [activeRegion.longitude, activeRegion.latitude]
          : undefined
      }
      zoomLevel={13}
      showUserLocation={showsUserLocation}
      {...rest}
    >
      {children}
    </NativeMapView>
  )
}

// ── Marker wrapper ────────────────────────────────────────────────────────────
interface MarkerProps {
  coordinate: LatLng
  title?:     string
  pinColor?:  string
  children?:  React.ReactNode
}

function MarkerWrapper({ coordinate, title, pinColor, children }: MarkerProps) {
  if (!canUseMapLibre || !NativeMarker) return null
  return (
    <NativeMarker
      id={`marker-${coordinate.latitude}-${coordinate.longitude}`}
      coordinate={[coordinate.longitude, coordinate.latitude]}
    >
      {children ?? (
        <View style={[S.pin, { backgroundColor: pinColor ?? '#FF6B35' }]}>
          <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>
            {title ? title.slice(0, 1) : '📍'}
          </Text>
        </View>
      )}
    </NativeMarker>
  )
}

// ── Polyline wrapper ──────────────────────────────────────────────────────────
interface PolylineProps {
  coordinates:     LatLng[]
  strokeColor?:    string
  strokeWidth?:    number
  lineDashPattern?:number[]
}

function PolylineWrapper({ coordinates, strokeColor, strokeWidth }: PolylineProps) {
  if (!canUseMapLibre || !NativePolyline || coordinates.length < 2) return null

  const geojson = {
    type: 'Feature' as const,
    geometry: {
      type: 'LineString' as const,
      coordinates: coordinates.map(c => [c.longitude, c.latitude]),
    },
    properties: {},
  }

  return (
    <NativePolyline
      id="route-line"
      style={{
        lineColor:   strokeColor ?? '#FF6B35',
        lineWidth:   strokeWidth ?? 3,
        lineDasharray: [2, 1],
      }}
      geoJSON={geojson}
    />
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  fallback: {
    backgroundColor: '#F0F9FF',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    minHeight: 180,
  },
  fallbackEmoji:  { fontSize: 42, marginBottom: 10 },
  fallbackLabel:  { fontWeight: '800', fontSize: 15, color: '#0369A1', marginBottom: 4, textAlign: 'center' },
  fallbackCoords: { fontSize: 11, color: '#6B7280', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginBottom: 14 },
  fallbackBtn:    { backgroundColor: '#0369A1', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 },
  fallbackBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  fallbackNote:   { fontSize: 10, color: '#9CA3AF', textAlign: 'center', marginTop: 12, lineHeight: 15, maxWidth: 260 },
  pin:            { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
})

// ── Exports matching the existing import contract ─────────────────────────────
export default MapViewWrapper
export const Marker   = MarkerWrapper
export const Polyline = PolylineWrapper
