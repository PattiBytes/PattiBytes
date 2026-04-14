// src/components/dashboard/MenuSearchResults.tsx
import React from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Image, ActivityIndicator, StyleSheet,
} from 'react-native'
import { COLORS } from '../../lib/constants'
import type { MenuResult } from '../../types/dashboard'

type Props = {
  results: MenuResult[];
  searching: boolean;
  query: string;
  onPress: (merchantId: string, itemId: string) => void;
};

export default function MenuSearchResults({ results, searching, query, onPress }: Props) {
  if (query.trim().length < 2) return null

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (searching) {
    return (
      <View style={S.wrap}>
        <Text style={S.secTitle}>Menu Results</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.list}>
          {[1, 2, 3].map(i => (
            <View key={i} style={S.skeletonCard}>
              <View style={S.skeletonImg} />
              <View style={S.skeletonLine} />
              <View style={[S.skeletonLine, { width: 40, marginTop: 4 }]} />
              <View style={[S.skeletonLine, { width: 60, marginTop: 4, backgroundColor: '#F3F4F6' }]} />
            </View>
          ))}
        </ScrollView>
      </View>
    )
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (results.length === 0) {
    return (
      <View style={S.emptyWrap}>
        <Text style={{ fontSize: 28 }}>🍽️</Text>
        <Text style={S.emptyTitle}>No results for &quot;{query}&quot;</Text>
        <Text style={S.emptySub}>Try a different dish or restaurant name</Text>
      </View>
    )
  }

  // ── Results ───────────────────────────────────────────────────────────────
  return (
    <View style={S.wrap}>
      {/* Header row */}
      <View style={S.headerRow}>
        <Text style={S.secTitle}>Menu Results</Text>
        <View style={S.countBadge}>
          <Text style={S.countTxt}>{results.length} found</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={S.list}
      >
        {results.map(item => {
          const hasDiscount = !!item.discountpercentage && item.discountpercentage > 0
          const discPrice   = hasDiscount
            ? item.price * (1 - item.discountpercentage! / 100)
            : item.price

          return (
          <TouchableOpacity
  key={item.id}
  style={S.card}
  onPress={() => onPress(item.merchantid, item.id)}
  activeOpacity={0.82}
>
              {/* Image */}
              <View style={S.imgBox}>
                {item.imageurl ? (
                  <Image
                    source={{ uri: item.imageurl }}
                    style={S.img}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={{ fontSize: 26 }}>🍽️</Text>
                )}
                {/* Discount badge on image */}
                {hasDiscount && (
                  <View style={S.discBadge}>
                    <Text style={S.discTxt}>{item.discountpercentage}% OFF</Text>
                  </View>
                )}
              </View>

              {/* Name */}
              <Text style={S.name} numberOfLines={2}>{item.name}</Text>

              {/* Price row */}
              <View style={S.priceRow}>
                <Text style={S.price}>₹{discPrice.toFixed(0)}</Text>
                {hasDiscount && (
                  <Text style={S.originalPrice}>₹{item.price.toFixed(0)}</Text>
                )}
              </View>

              {/* Restaurant name */}
              <View style={S.merchantRow}>
                <Text style={{ fontSize: 10 }}>🏪</Text>
                <Text style={S.merchant} numberOfLines={1}>{item.merchantname}</Text>
              </View>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}

const S = StyleSheet.create({
  wrap:      { marginHorizontal: 14, marginBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 2 },
  secTitle:  { fontSize: 15, fontWeight: '900', color: '#111827' },
  countBadge: { backgroundColor: '#FFF3EE', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#FED7AA' },
  countTxt:   { fontSize: 11, fontWeight: '800', color: COLORS.primary },

  list: { gap: 10, paddingBottom: 4, paddingHorizontal: 2 },

  card: {
    backgroundColor: '#fff',
    borderRadius:    16,
    padding:         10,
    alignItems:      'center',
    width:           118,
    elevation:       3,
    shadowColor:    '#000',
    shadowOpacity:  0.07,
    shadowRadius:   8,
    shadowOffset:   { width: 0, height: 2 },
  },

  imgBox: {
    width:           72,
    height:          72,
    borderRadius:    12,
    backgroundColor: '#F9FAFB',
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    8,
    overflow:        'hidden',
    position:        'relative',
  },
  img: { width: 72, height: 72, borderRadius: 12 },

  discBadge: {
    position:        'absolute',
    top:             4,
    right:           4,
    backgroundColor: '#EF4444',
    borderRadius:    6,
    paddingHorizontal: 4,
    paddingVertical:   2,
  },
  discTxt: { color: '#fff', fontSize: 8, fontWeight: '900' },

  name:  { fontSize: 12, fontWeight: '700', color: '#111827', textAlign: 'center', lineHeight: 16 },

  priceRow:      { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  price:         { fontSize: 13, color: COLORS.primary, fontWeight: '900' },
  originalPrice: { fontSize: 10, color: '#9CA3AF', fontWeight: '600', textDecorationLine: 'line-through' },

  merchantRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  merchant:    { fontSize: 10, color: '#6B7280', fontWeight: '600', flex: 1 },

  // Skeleton styles
  skeletonCard: { backgroundColor: '#fff', borderRadius: 16, padding: 10, alignItems: 'center', width: 118, elevation: 1 },
  skeletonImg:  { width: 72, height: 72, borderRadius: 12, backgroundColor: '#F3F4F6', marginBottom: 8 },
  skeletonLine: { height: 10, width: 80, borderRadius: 6, backgroundColor: '#E5E7EB' },

  // Empty state
  emptyWrap:  { alignItems: 'center', paddingVertical: 20, marginHorizontal: 14 },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: '#374151', marginTop: 8 },
  emptySub:   { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
})