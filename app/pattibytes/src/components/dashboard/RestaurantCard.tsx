import React from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native'
import { COLORS } from '../../lib/constants'
import { openTimeLabel } from '../../hooks/useDashboardData'
import type { Merchant } from '../../types/dashboard'

type Props = {
  restaurant: Merchant
  onPress:    (r: Merchant) => void
}

export default function RestaurantCard({ restaurant: r, onPress }: Props) {
  return (
    <TouchableOpacity
      style={[S.card, !r.isopen && S.cardClosed]}
      onPress={() => onPress(r)}
      activeOpacity={r.isopen ? 0.8 : 0.6}
    >
      {/* Logo */}
      <View style={S.logoWrap}>
        {r.logourl
          ? <Image source={{ uri: r.logourl }} style={S.logo} resizeMode="cover" />
          : <Text style={{ fontSize: 28 }}>🏪</Text>}
        {r.isfeatured && r.isopen && (
          <View style={S.featuredBadge}><Text style={{ color: '#fff', fontSize: 8, fontWeight: '900' }}>TOP</Text></View>
        )}
        {!r.isopen && (
          <View style={S.closedOverlay}><Text style={{ color: '#fff', fontSize: 9, fontWeight: '900' }}>CLOSED</Text></View>
        )}
      </View>

      {/* Info */}
      <View style={{ flex: 1 }}>
        <Text style={[S.name, !r.isopen && { color: '#9CA3AF' }]} numberOfLines={1}>{r.businessname}</Text>
        {r.cuisinetypes?.length > 0 && (
          <Text style={S.cuisine} numberOfLines={1}>{r.cuisinetypes.join(' • ')}</Text>
        )}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 5, flexWrap: 'wrap' }}>
          {(r.averagerating ?? 0) > 0 && (
            <Text style={S.star}>⭐ {Number(r.averagerating).toFixed(1)}{(r.totalreviews ?? 0) > 0 ? ` (${r.totalreviews})` : ''}</Text>
          )}
          {!!r.estimatedpreptime && (
            <Text style={S.meta}>🕐 {r.estimatedpreptime} min</Text>
          )}
          {r.distancekm !== undefined && r.distancekm < 999 && (
            <Text style={S.meta}>📍 {r.distancekm.toFixed(1)} km</Text>
          )}
        </View>
        {!r.isopen && (
          <Text style={{ fontSize: 11, color: '#EF4444', fontWeight: '700', marginTop: 3 }}>
            {openTimeLabel(r) || 'Currently closed'}
          </Text>
        )}
        {!!r.minorderamount && (
          <Text style={S.minOrder}>Min ₹{r.minorderamount}</Text>
        )}
        {!!r.offerlabel && r.isopen && (
          <View style={S.offerTag}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{r.offerlabel}</Text>
          </View>
        )}
      </View>
      <Text style={{ fontSize: 20, color: r.isopen ? '#9CA3AF' : '#D1D5DB' }}>›</Text>
    </TouchableOpacity>
  )
}

const S = StyleSheet.create({
  card:          { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  cardClosed:    { opacity: 0.65 },
  logoWrap:      { width: 68, height: 68, borderRadius: 12, backgroundColor: '#FFF3EE', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', flexShrink: 0 },
  logo:          { width: 68, height: 68, borderRadius: 12 },
  featuredBadge: { position: 'absolute', top: -2, right: -2, backgroundColor: '#F59E0B', borderRadius: 5, paddingHorizontal: 4, paddingVertical: 2 },
  closedOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 3, alignItems: 'center', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  name:          { fontSize: 15, fontWeight: '800', color: '#111827' },
  cuisine:       { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  star:          { fontSize: 12, color: '#F59E0B', fontWeight: '600' },
  meta:          { fontSize: 12, color: '#6B7280' },
  minOrder:      { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  offerTag:      { backgroundColor: COLORS.primary, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, marginTop: 5, alignSelf: 'flex-start' },
})