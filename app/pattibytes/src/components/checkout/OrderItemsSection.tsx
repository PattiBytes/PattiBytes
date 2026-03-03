import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { COLORS } from '../../lib/constants'
import type { CheckoutCartItem, BxGyGift } from './types'

interface Props {
  items:          CheckoutCartItem[]
  itemNotes:      Record<string, string>
  bxgyGifts:      BxGyGift[]
  appliedPromo?:  { code: string; deal_type?: string | null } | null
  onNoteChange:   (itemId: string, note: string) => void
}

function effPrice(item: CheckoutCartItem) {
  const d = item.discount_percentage ?? 0
  return d > 0 ? item.price * (1 - d / 100) : item.price
}

export default function OrderItemsSection({
  items, itemNotes, bxgyGifts, appliedPromo, onNoteChange,
}: Props) {
  const [expandedNote, setExpandedNote] = useState<string | null>(null)

  return (
    <View style={S.section}>
      <Text style={S.title}>🛍️ Order Items ({items.length})</Text>

      {items.map((item, idx) => {
        const ep        = effPrice(item)
        const hasDisc   = (item.discount_percentage ?? 0) > 0
        const noteValue = itemNotes[item.id] ?? ''
        const noteOpen  = expandedNote === item.id

        return (
          <View key={item.id ?? idx} style={S.itemRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {item.is_veg != null && (
                  <View style={[S.vegDot, { borderColor: item.is_veg ? '#16A34A' : '#DC2626' }]}>
                    <View style={[S.vegInner, { backgroundColor: item.is_veg ? '#16A34A' : '#DC2626' }]} />
                  </View>
                )}
                <Text style={S.itemName}>{item.name}</Text>
              </View>

              {!!item.category && (
                <Text style={S.itemCat}>{item.category}</Text>
              )}

              {hasDisc && (
                <Text style={S.discTxt}>
                  ₹{item.price.toFixed(0)} → ₹{ep.toFixed(0)}
                  {' '}({item.discount_percentage}% off)
                </Text>
              )}

              {/* Per-item note */}
              <TouchableOpacity
                onPress={() => setExpandedNote(noteOpen ? null : item.id)}
                style={S.noteToggle}
              >
                <Text style={{ fontSize: 11, color: COLORS.primary, fontWeight: '600' }}>
                  {noteOpen ? '▲ Hide note' : noteValue ? `📝 ${noteValue}` : '+ Add note for this item'}
                </Text>
              </TouchableOpacity>
              {noteOpen && (
                <TextInput
                  style={S.noteInput}
                  value={noteValue}
                  onChangeText={t => onNoteChange(item.id, t)}
                  placeholder="e.g. No onions, extra spicy…"
                  placeholderTextColor="#9CA3AF"
                  maxLength={120}
                  multiline
                />
              )}
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <Text style={S.qty}>× {item.quantity}</Text>
              <Text style={S.price}>₹{(ep * item.quantity).toFixed(0)}</Text>
            </View>
          </View>
        )
      })}

      {/* BxGy free gifts */}
      {bxgyGifts.length > 0 && (
        <View style={S.freeBox}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 18, marginRight: 6 }}>🎁</Text>
            <Text style={S.freeTitle}>Free Items Applied</Text>
            {appliedPromo && (
              <View style={S.promoTag}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#065F46' }}>
                  {appliedPromo.code}
                </Text>
              </View>
            )}
          </View>

          {bxgyGifts.map((g, i) => (
            <View key={i} style={S.freeRow}>
              <View style={{ flex: 1 }}>
                <Text style={S.freeName}>{g.name}</Text>
                <Text style={{ fontSize: 11, color: '#6B7280' }}>Original ₹{g.price.toFixed(0)}</Text>
              </View>
              <Text style={S.freeQty}>× {g.qty}</Text>
              <View style={S.freeBadge}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>FREE</Text>
              </View>
            </View>
          ))}

          <View style={S.freeTotalRow}>
            <Text style={S.freeTotalLbl}>Free items value</Text>
            <Text style={S.freeTotalVal}>
              ₹{bxgyGifts.reduce((s, g) => s + g.price * g.qty, 0).toFixed(0)}
            </Text>
          </View>
        </View>
      )}
    </View>
  )
}

const S = StyleSheet.create({
  section:      { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 16, padding: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  title:        { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 12 },
  itemRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  vegDot:       { width: 14, height: 14, borderRadius: 2, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  vegInner:     { width: 6, height: 6, borderRadius: 3 },
  itemName:     { fontWeight: '700', color: '#111827', fontSize: 13, flex: 1 },
  itemCat:      { fontSize: 10, color: '#9CA3AF', marginTop: 1 },
  discTxt:      { fontSize: 11, color: '#059669', marginTop: 2 },
  noteToggle:   { marginTop: 6, paddingVertical: 2 },
  noteInput:    { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, color: '#111827', backgroundColor: '#FAFAFA', marginTop: 6, minHeight: 44 },
  qty:          { fontSize: 13, color: '#6B7280' },
  price:        { fontWeight: '700', color: '#111827', fontSize: 13, marginTop: 2 },
  // BxGy
  freeBox:      { backgroundColor: '#ECFDF5', borderRadius: 12, padding: 12, marginTop: 10, borderWidth: 1.5, borderColor: '#A7F3D0' },
  freeTitle:    { fontWeight: '800', color: '#065F46', fontSize: 13, flex: 1 },
  promoTag:     { backgroundColor: '#D1FAE5', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 6 },
  freeRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#D1FAE5' },
  freeName:     { fontWeight: '700', color: '#047857', fontSize: 13 },
  freeQty:      { color: '#6B7280', marginHorizontal: 8 },
  freeBadge:    { backgroundColor: '#16A34A', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  freeTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#A7F3D0' },
  freeTotalLbl: { color: '#065F46', fontWeight: '700', fontSize: 13 },
  freeTotalVal: { color: '#065F46', fontWeight: '800', fontSize: 13 },
})
