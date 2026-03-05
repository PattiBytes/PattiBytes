import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import CartItemCard from './CartItemCard'
import type { CartItem, BxGyGift } from './types'

interface Props {
  items:         CartItem[]
  itemNotes:     Record<string, string>
  bxgyGifts:     BxGyGift[]
  promoDiscount: number
  onUpdateQty:   (id: string, qty: number) => void
  onRemove:      (id: string) => void
  onNoteChange:  (id: string, note: string) => void
}

export default function CartItemsList({
  items, itemNotes, bxgyGifts, promoDiscount,
  onUpdateQty, onRemove, onNoteChange,
}: Props) {
  return (
    <View style={S.section}>
      <Text style={S.title}>{items.length} Item{items.length !== 1 ? 's' : ''}</Text>

      {items.map(item => (
        <CartItemCard
          key={item.id}
          item={item}
          note={itemNotes[item.id] ?? ''}
          onUpdateQty={onUpdateQty}
          onRemove={onRemove}
          onNoteChange={onNoteChange}
        />
      ))}

      {bxgyGifts.length > 0 && (
        <View style={S.bxgy}>
          <Text style={{ fontSize: 18, marginRight: 10 }}>🎁</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '800', color: '#065F46', fontSize: 13 }}>Free items unlocked!</Text>
            {bxgyGifts.map((g, i) => (
              <Text key={i} style={{ fontSize: 12, color: '#047857', marginTop: 2 }}>
                {g.name} × {g.qty} <Text style={{ fontWeight: '700' }}>(FREE)</Text>
              </Text>
            ))}
            <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 3 }}>via {bxgyGifts[0].promoCode}</Text>
          </View>
          <Text style={{ fontWeight: '800', color: '#065F46' }}>−₹{promoDiscount.toFixed(0)}</Text>
        </View>
      )}
    </View>
  )
}

const S = StyleSheet.create({
  section: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 16, padding: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  title:   { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 12 },
  bxgy:    { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#ECFDF5', borderRadius: 12, padding: 12, marginTop: 12, borderWidth: 1.5, borderColor: '#A7F3D0' },
})
