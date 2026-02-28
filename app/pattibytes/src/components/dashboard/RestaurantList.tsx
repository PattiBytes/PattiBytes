import React from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, StyleSheet,
} from 'react-native'
import { COLORS } from '../../lib/constants'
import RestaurantCard from './RestaurantCard'
import type { Merchant } from '../../types/dashboard'

type Props = {
  restaurants:     Merchant[]
  loading:         boolean
  activeTab:       'all' | 'open' | 'featured'
  cuisineFilter:   string | null
  allCuisines:     string[]
  onTabChange:     (t: 'all' | 'open' | 'featured') => void
  onCuisineChange: (c: string | null) => void
  onPress:         (r: Merchant) => void
}

export default function RestaurantList({
  restaurants, loading, activeTab, cuisineFilter,
  allCuisines, onTabChange, onCuisineChange, onPress,
}: Props) {
  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
      <View style={S.sectionHeader}>
        <Text style={S.secTitle}>
          Restaurants{restaurants.length > 0 ? ` (${restaurants.length})` : ''}
        </Text>
      </View>

      {/* Status tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 10 }}>
        {(['all', 'open', 'featured'] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[S.chip, activeTab === t && S.chipActive]}
            onPress={() => onTabChange(t)}
          >
            <Text style={[S.chipTxt, activeTab === t && { color: '#fff' }]}>
              {t === 'all' ? 'All' : t === 'open' ? 'Open Now' : 'Featured'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Cuisine chips */}
      {allCuisines.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
          <TouchableOpacity
            style={[S.chip, !cuisineFilter && { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' }]}
            onPress={() => onCuisineChange(null)}
          >
            <Text style={[S.chipTxt, !cuisineFilter && { color: '#6B7280' }]}>All Cuisines</Text>
          </TouchableOpacity>
          {allCuisines.map(c => (
            <TouchableOpacity
              key={c}
              style={[S.chip, cuisineFilter === c && S.chipActive]}
              onPress={() => onCuisineChange(cuisineFilter === c ? null : c)}
            >
              <Text style={[S.chipTxt, cuisineFilter === c && { color: '#fff' }]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* List */}
      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 40 }} />
      ) : restaurants.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
          <Text style={{ fontSize: 52, marginBottom: 12 }}>🔍</Text>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>No restaurants found</Text>
          {cuisineFilter && (
            <TouchableOpacity onPress={() => onCuisineChange(null)} style={{ marginTop: 12 }}>
              <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Clear cuisine filter</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        restaurants.map(r => <RestaurantCard key={r.id} restaurant={r} onPress={onPress} />)
      )}
    </View>
  )
}

const S = StyleSheet.create({
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  secTitle:      { fontSize: 17, fontWeight: '900', color: '#111827' },
  chip:          { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E5E7EB' },
  chipActive:    { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipTxt:       { fontSize: 12, fontWeight: '700', color: '#111827' },
})