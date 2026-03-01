/* eslint-disable import/no-duplicates */
// components/MapView/index.tsx  ← must be .tsx NOT .ts
import {
  MapView as MLMapView,
  Camera,
  PointAnnotation,
  ShapeSource,
  LineLayer,
  UserLocation,
  Callout,
} from '@maplibre/maplibre-react-native'
import MapLibreGL from '@maplibre/maplibre-react-native'
import React, { useId } from 'react'
import { View } from 'react-native'
import type { Feature, LineString } from 'geojson'

MapLibreGL.setAccessToken(null)

// ─── Types (same shape as react-native-maps so order screen is unchanged) ─────
export type Region = {
  latitude: number
  longitude: number
  latitudeDelta: number
  longitudeDelta: number
}
export type LatLng = { latitude: number; longitude: number }
export const PROVIDER_GOOGLE = undefined // kept for prop compatibility

// ─── MapView ──────────────────────────────────────────────────────────────────
export default function MapView({
  style,
  initialRegion,
  region,
  children,
  showsUserLocation,
}: {
  style?: any
  initialRegion?: Region
  region?: Region
  children?: React.ReactNode
  showsUserLocation?: boolean
  provider?: any
}) {
  const center = region ?? initialRegion
  const centerCoord: [number, number] = center
    ? [center.longitude, center.latitude]
    : [75.64, 30.23] // fallback: Patti, Punjab

  return (
    <MLMapView
      style={style ?? { flex: 1 }}
     mapStyle="https://tiles.openfreemap.org/styles/liberty"
    >
      <Camera
        centerCoordinate={centerCoord}
        zoomLevel={13}
        animationMode="flyTo"
        animationDuration={400}
      />
      {showsUserLocation && <UserLocation visible />}
      {children}
    </MLMapView>
  )
}

// ─── Marker ───────────────────────────────────────────────────────────────────
export function Marker({
  coordinate,
  title,
  pinColor,
}: {
  coordinate: LatLng
  title?: string
  pinColor?: string
}) {
  const id = useId()
  return (
    <PointAnnotation
      id={id}
      coordinate={[coordinate.longitude, coordinate.latitude]}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: pinColor ?? '#FF6B35',
          borderWidth: 2.5,
          borderColor: '#fff',
          elevation: 4,
        }}
      />
      {title ? <Callout title={title} /> : <View />}
    </PointAnnotation>
  )
}

// ─── Polyline ─────────────────────────────────────────────────────────────────
export function Polyline({
  coordinates,
  strokeColor,
  strokeWidth,
   lineDashPattern,
}: {
  coordinates: LatLng[]
  strokeColor?: string
  strokeWidth?: number
  lineDashPattern?: number[]
}) {
  const id = useId()
  const shape: Feature<LineString> = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: coordinates.map((c) => [c.longitude, c.latitude]),
    },
    properties: {},
  }
  return (
    <ShapeSource id={`src-${id}`} shape={shape}>
      <LineLayer
        id={`line-${id}`}
        style={{
          lineColor: strokeColor ?? '#FF6B35',
          lineWidth: strokeWidth ?? 3,
          lineDasharray: [2, 1],
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
    </ShapeSource>
  )
}

export function Circle() { return null }
