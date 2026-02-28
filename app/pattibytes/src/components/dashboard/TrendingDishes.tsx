import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from 'react-native'
import { COLORS } from '../../lib/constants'
import type { TrendingDish } from '../../types/dashboard'

type Props = {
  dishes:  TrendingDish[]
  onPress: (merchantId: string) => void
}

export default function TrendingDishes({ dishes, onPress }: Props) {
  if (!dishes.length) return null
  return (
    <View style={{ marginBottom: 16 }}>
      <View style={S.sectionHeader}>
        <Text style={S.secTitle}>🔥 Trending Now</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
        {dishes.map(item => {
          const disc = item.discountpercentage
            ? item.price * (1 - item.discountpercentage / 100)
            : item.price
          return (
            <TouchableOpacity key={item.id} style={S.card} onPress={() => onPress(item.merchantid)}>
              <View style={S.imgBox}>
                {item.imageurl
                  ? <Image source={{ uri: item.imageurl }} style={{ width: 100, height: 100, borderRadius: 12 }} />
                  : <Text style={{ fontSize: 32 }}>🍽️</Text>}
                {!!item.discountpercentage && (
                  <View style={S.discBadge}>
                    <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>{item.discountpercentage}% OFF</Text>
                  </View>
                )}
                <View style={S.fireBadge}>
                  <Text style={{ fontSize: 8, fontWeight: '800', color: '#F97316' }}>{item.count}× 🔥</Text>
                </View>
              </View>
              <Text style={S.name} numberOfLines={1}>{item.name}</Text>
              <Text style={S.merch} numberOfLines={1}>{item.merchantname}</Text>
              <Text style={S.price}>₹{disc.toFixed(0)}</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}

const S = StyleSheet.create({
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  secTitle:      { fontSize: 17, fontWeight: '900', color: '#111827' },
  card:          { width: 135, backgroundColor: '#fff', borderRadius: 16, padding: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  imgBox:        { width: 100, height: 100, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: 8, overflow: 'hidden', position: 'relative' },
  discBadge:     { position: 'absolute', top: 6, right: 6, backgroundColor: '#EF4444', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  fireBadge:     { position: 'absolute', bottom: 6, left: 6, backgroundColor: '#FFF3EE', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  name:          { fontSize: 12, fontWeight: '700', color: '#111827' },
  merch:         { fontSize: 10, color: '#6B7280', marginTop: 2 },
  price:         { fontSize: 14, fontWeight: '800', color: COLORS.primary, marginTop: 4 },
})