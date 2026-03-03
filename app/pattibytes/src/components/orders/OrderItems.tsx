import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { COLORS } from '../../lib/constants'
import type { OrderItem } from './types'

interface Props {
  items:   OrderItem[]
  isStore: boolean
}

export default function OrderItems({ items, isStore }: Props) {
  return (
    <View style={S.section}>
      <Text style={S.title}>
        {isStore ? '🛍️ Ordered Products' : '🛒 Items'} ({items.length})
      </Text>
      {items.map((item, i) => {
        const isFree = item.is_free || item.price === 0
        const disc   = (item.discount_percentage ?? 0) > 0
          ? item.price * (item.discount_percentage! / 100) : 0
        const effective = (item.price - disc) * item.quantity

        return (
          <View key={item.id ?? i} style={[S.row, isFree && S.rowFree]}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {item.is_veg != null && (
                  <View style={[S.vegDot, { backgroundColor: item.is_veg ? '#16A34A' : '#DC2626' }]} />
                )}
                <Text style={[S.name, isFree && { color: '#065F46' }]} numberOfLines={2}>
                  {item.name}
                </Text>
              </View>
              {item.category && (
                <Text style={S.category}>{item.category}</Text>
              )}
              {(item.discount_percentage ?? 0) > 0 && !isFree && (
                <Text style={S.discTxt}>
                  ₹{item.price.toFixed(0)} → {item.discount_percentage}% off
                </Text>
              )}
              {item.note && (
                <View style={S.noteBox}>
                  <Text style={{ fontSize: 11, color: '#92400E' }}>📝 {item.note}</Text>
                </View>
              )}
              {isFree && (
                <View style={S.freeBadge}>
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>🎁 FREE</Text>
                </View>
              )}
            </View>
            <Text style={S.qty}>×{item.quantity}</Text>
            <Text style={[S.price, isFree && { color: '#065F46' }]}>
              {isFree ? 'FREE' : `₹${effective.toFixed(0)}`}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

const S = StyleSheet.create({
  section:  { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 10, borderRadius: 16, padding: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  title:    { fontSize: 15, fontWeight: '800', color: '#1F2937', marginBottom: 12 },
  row:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  rowFree:  { backgroundColor: '#F0FDF4', borderRadius: 8, paddingHorizontal: 8, marginBottom: 2 },
  vegDot:   { width: 10, height: 10, borderRadius: 2, borderWidth: 1.5, borderColor: '#fff' },
  name:     { fontWeight: '700', fontSize: 14, color: '#1F2937', flex: 1 },
  category: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  discTxt:  { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  noteBox:  { backgroundColor: '#FFFBEB', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginTop: 4, borderWidth: 1, borderColor: '#FDE68A' },
  freeBadge:{ alignSelf: 'flex-start', backgroundColor: '#16A34A', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
  qty:      { color: '#6B7280', marginHorizontal: 12, fontSize: 13 },
  price:    { fontWeight: '800', color: '#1F2937', fontSize: 14 },
})
