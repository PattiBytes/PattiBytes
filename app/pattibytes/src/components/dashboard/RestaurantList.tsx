import React from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Image, ActivityIndicator, Alert,
} from 'react-native'
import { Merchant } from './types'
import { openTimeLabel } from './helpers'
import { useDashboardStyles } from './styles'
import { COLORS } from '../../lib/constants'

type Props = {
  restaurants: Merchant[]
  loading: boolean
  activeTab: 'all' | 'open' | 'featured'
  cuisineFilter: string | null
  allCuisines: string[]
  onTabChange: (t: 'all' | 'open' | 'featured') => void
  onCuisineChange: (c: string | null) => void
  onRestaurantPress: (r: Merchant) => void
}

export function RestaurantList({
  restaurants, loading, activeTab, cuisineFilter,
  allCuisines, onTabChange, onCuisineChange, onRestaurantPress,
}: Props) {
  const S = useDashboardStyles()
  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
      {/* Section header */}
      <View style={[S.sectionHeader, { marginBottom: 10 }]}>
        <Text style={S.secTitle}>
          {`🍽️ Restaurants${restaurants.length > 0 ? ` (${restaurants.length})` : ''}`}
        </Text>
      </View>

      {/* Status filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 10 }}>
        {(['all', 'open', 'featured'] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[S.filterChip, activeTab === t && S.filterChipActive]}
            onPress={() => onTabChange(t)}
          >
            <Text style={[S.filterChipTxt, activeTab === t && { color: '#fff' }]}>
              {t === 'all' ? 'All' : t === 'open' ? '🟢 Open Now' : '⭐ Featured'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Cuisine filter chips */}
      {allCuisines.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
          <TouchableOpacity
            style={[S.filterChip, !cuisineFilter && { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' }]}
            onPress={() => onCuisineChange(null)}
          >
            <Text style={[S.filterChipTxt, !cuisineFilter && { color: '#6B7280' }]}>All Cuisines</Text>
          </TouchableOpacity>
          {allCuisines.map(c => (
            <TouchableOpacity
              key={c}
              style={[S.filterChip, cuisineFilter === c && S.filterChipActive]}
              onPress={() => onCuisineChange(cuisineFilter === c ? null : c)}
            >
              <Text style={[S.filterChipTxt, cuisineFilter === c && { color: '#fff' }]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Restaurant cards */}
      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 40 }} />
      ) : restaurants.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
          <Text style={{ fontSize: 52, marginBottom: 12 }}>🍽️</Text>
          <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.text }}>No restaurants found</Text>
          {cuisineFilter && (
            <TouchableOpacity onPress={() => onCuisineChange(null)} style={{ marginTop: 12 }}>
              <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Clear cuisine filter</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        restaurants.map(r => (
          <TouchableOpacity
            key={r.id}
            style={[S.restCard, !r.is_open && S.restCardClosed]}
            onPress={() => onRestaurantPress(r)}
            activeOpacity={r.is_open ? 0.8 : 0.6}
          >
            {/* Logo */}
            <View style={S.restLogo}>
              {r.logo_url
                ? <Image source={{ uri: r.logo_url }} style={{ width: 68, height: 68, borderRadius: 12 }} resizeMode="cover" />
                : <Text style={{ fontSize: 28 }}>🍴</Text>
              }
              {r.is_featured && r.is_open && (
                <View style={S.featuredBadge}>
                  <Text style={{ color: '#fff', fontSize: 8, fontWeight: '900' }}>⭐TOP</Text>
                </View>
              )}
              {!r.is_open && (
                <View style={S.closedOverlay}>
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900' }}>CLOSED</Text>
                </View>
              )}
            </View>

            {/* Info */}
            <View style={{ flex: 1 }}>
              <Text style={[S.restName, !r.is_open && { color: '#9CA3AF' }]} numberOfLines={1}>
                {r.business_name}
              </Text>
              {r.cuisine_types?.length > 0 && (
                <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }} numberOfLines={1}>
                  {r.cuisine_types.join(' · ')}
                </Text>
              )}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 5, flexWrap: 'wrap' }}>
                {(r.average_rating ?? 0) > 0 && (
                  <Text style={S.star}>{`⭐ ${Number(r.average_rating).toFixed(1)} (${r.total_reviews ?? 0})`}</Text>
                )}
                {!!r.estimated_prep_time && (
                  <Text style={S.metaText}>{`🕐 ${r.estimated_prep_time} min`}</Text>
                )}
                {r.distance_km !== undefined && r.distance_km < 999 && (
                  <Text style={S.metaText}>{`📍 ${r.distance_km.toFixed(1)} km`}</Text>
                )}
              </View>
              {!r.is_open ? (
                <Text style={{ fontSize: 11, color: '#EF4444', fontWeight: '700', marginTop: 3 }}>
                  {openTimeLabel(r) || 'Currently closed'}
                </Text>
              ) : (
                !!r.min_order_amount && (
                  <Text style={S.minOrder}>{`Min ₹${r.min_order_amount}`}</Text>
                )
              )}
              {!!r.offer_label && r.is_open && (
                <View style={S.offerTag}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{`🏷️ ${r.offer_label}`}</Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 20, color: r.is_open ? '#9CA3AF' : '#D1D5DB' }}>›</Text>
          </TouchableOpacity>
        ))
      )}
    </View>
  )
}