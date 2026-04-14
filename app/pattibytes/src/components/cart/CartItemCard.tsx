import React, { useState } from 'react'
import { View, Text, TouchableOpacity, Image, TextInput, StyleSheet } from 'react-native'
import { COLORS } from '../../lib/constants'
import type { CartItem } from './types'   // ← from our local types, not CartContext

interface Props {
  item:         CartItem
  note:         string
  onUpdateQty:  (id: string, qty: number) => void
  onRemove:     (id: string) => void
  onNoteChange: (id: string, note: string) => void
}

export default function CartItemCard({ item, note, onUpdateQty, onRemove, onNoteChange }: Props) {
  const [showNote, setShowNote] = useState(!!note)

  const hasDisc        = (item.discount_percentage ?? 0) > 0
  const effectivePrice = hasDisc ? item.price * (1 - item.discount_percentage! / 100) : item.price
  const lineTotal      = effectivePrice * item.quantity

  return (
    <View style={S.wrap}>
      {/* Thumbnail */}
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={S.img} resizeMode="cover" />
      ) : (
        <View style={[S.img, S.imgFallback]}><Text style={{ fontSize: 22 }}>🍽️</Text></View>
      )}

      <View style={{ flex: 1 }}>
        {/* Name row */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 5 }}>
          <View style={[S.vegDot, { backgroundColor: item.is_veg ? '#16A34A' : '#DC2626' }]} />
          <Text style={S.name}>{item.name}</Text>
          <TouchableOpacity onPress={() => onRemove(item.id)} style={{ paddingLeft: 8 }}>
            <Text style={{ color: '#EF4444', fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        </View>

        {!!item.category && <Text style={S.cat}>{item.category}</Text>}

        {/* Price */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <Text style={S.price}>₹{effectivePrice.toFixed(0)}</Text>
          {hasDisc && (
            <>
              <Text style={S.strike}>₹{item.price.toFixed(0)}</Text>
              <View style={S.discBadge}>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>
                  {item.discount_percentage!.toFixed(0)}% OFF
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Qty stepper + line total */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
        <View style={S.qtyRow}>
  <TouchableOpacity
    style={S.qtyBtn}
    onPress={() => onUpdateQty(item.id, item.quantity - 1)}
  >
    <Text style={S.qtyTxt}>−</Text>
  </TouchableOpacity>

  <TextInput
    style={S.qtyInput}
    keyboardType="number-pad"
    value={String(item.quantity)}
    onChangeText={t => {
      const next = Math.max(0, Number(t.replace(/[^0-9]/g, '')) || 0);
      onUpdateQty(item.id, next);
    }}
    maxLength={3}
  />

  <TouchableOpacity
    style={S.qtyBtn}
    onPress={() => onUpdateQty(item.id, item.quantity + 1)}
  >
    <Text style={S.qtyTxt}>+</Text>
  </TouchableOpacity>
</View>
          <Text style={S.lineTotal}>₹{lineTotal.toFixed(0)}</Text>
        </View>

        {/* Per-item note */}
        <TouchableOpacity onPress={() => setShowNote(v => !v)} style={{ marginTop: 6 }}>
          <Text style={{ fontSize: 11, color: COLORS.primary, fontWeight: '600' }}>
            {showNote ? '✕ Remove note' : '📝 Add note for this item'}
          </Text>
        </TouchableOpacity>
        {showNote && (
          <TextInput
            style={S.noteInput}
            placeholder="E.g. Extra spicy, no onions…"
            placeholderTextColor="#9CA3AF"
            value={note}
            onChangeText={t => onNoteChange(item.id, t)}
            maxLength={120}
          />
        )}
      </View>
    </View>
  )
}

const S = StyleSheet.create({
  wrap:       { flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  img:        { width: 70, height: 65, borderRadius: 10, flexShrink: 0 },
  imgFallback:{ backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  vegDot:     { width: 10, height: 10, borderRadius: 2, marginTop: 4, flexShrink: 0 },
  name:       { fontWeight: '800', fontSize: 14, color: '#111827', flex: 1 },
  cat:        { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  price:      { fontWeight: '800', color: COLORS.primary, fontSize: 14 },
  strike:     { textDecorationLine: 'line-through', color: '#9CA3AF', fontSize: 12 },
  discBadge:  { backgroundColor: '#EF4444', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  qtyInput: {
  width: 32,
  textAlign: 'center',
  fontWeight: '800',
  color: '#111827',
  fontSize: 14,
},
  qtyRow:     { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 8 },
  qtyBtn:     { width: 30, height: 32, alignItems: 'center', justifyContent: 'center' },
  qtyTxt:     { color: COLORS.primary, fontWeight: '800', fontSize: 18 },
  qty:        { width: 28, textAlign: 'center', fontWeight: '800', color: '#111827', fontSize: 14 },
  lineTotal:  { fontWeight: '800', color: '#111827', fontSize: 14 },
  noteInput:  { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 12, color: '#111827', marginTop: 6, backgroundColor: '#F9FAFB' },
})
