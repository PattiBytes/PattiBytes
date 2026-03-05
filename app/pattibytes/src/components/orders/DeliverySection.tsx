import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import type { OrderDetail } from './types'

interface Props { order: OrderDetail }

export default function DeliverySection({ order }: Props) {
  const isCustom = order.order_type === 'custom'
  const isStore  = order.order_type === 'store' || order.merchant_id === null

  return (
    <View style={S.section}>
      <Text style={S.title}>📍 Delivery Address</Text>

      {/* ── Hub origin (custom/store orders) ── */}
      {(isCustom || isStore) && (
        <View style={S.hubRow}>
          <Text style={{ fontSize: 14 }}>🏪</Text>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#5B21B6' }}>
              Dispatched from Patti Hub
            </Text>
            <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>
              {(order as any).hub_origin?.label ?? 'Patti, Punjab 143416'}
            </Text>
          </View>
          {order.delivery_distance_km && (
            <View style={S.distBadge}>
              <Text style={{ fontSize: 10, color: '#5B21B6', fontWeight: '800' }}>
                📏 {Number(order.delivery_distance_km).toFixed(1)} km
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ── Address label ── */}
      {order.delivery_address_label && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Text style={{ fontSize: 18 }}>
            {order.delivery_address_label === 'Home' ? '🏠'
              : order.delivery_address_label === 'Work' ? '🏢' : '📍'}
          </Text>
          <Text style={{ fontWeight: '800', color: '#1F2937', fontSize: 15 }}>
            {order.delivery_address_label}
          </Text>
        </View>
      )}

      {/* ── Recipient ── */}
      {order.recipient_name && (
        <Text style={S.recipient}>
          👤 {order.recipient_name}
          {order.customer_phone ? `  ·  📞 ${order.customer_phone}` : ''}
        </Text>
      )}

      <Text style={S.addr}>{order.delivery_address}</Text>

      {/* ── Notes ── */}
      {order.delivery_instructions && (
        <NoteBox text={`📋 ${order.delivery_instructions}`} />
      )}
      {order.special_instructions && (
        <NoteBox text={`📝 ${order.special_instructions}`} />
      )}
      {order.customer_notes && (
        <NoteBox text={`💬 ${order.customer_notes}`} />
      )}

      {/* ── Custom order category note ── */}
      {isCustom && (() => {
        const rawCat = (order as any).custom_category ?? ''
        const cats: string[] = Array.isArray(rawCat)
          ? rawCat
          : typeof rawCat === 'string' && rawCat
            ? rawCat.split(',').map((s: string) => s.trim())
            : []
        return cats.length > 0 ? (
          <View style={S.catNote}>
            <Text style={{ fontSize: 11, color: '#065F46', fontWeight: '700' }}>
              🛒 Categories: {cats.join(', ')}
            </Text>
          </View>
        ) : null
      })()}
    </View>
  )
}

function NoteBox({ text }: { text: string }) {
  return (
    <View style={S.note}>
      <Text style={{ fontSize: 13, color: '#92400E', lineHeight: 18 }}>{text}</Text>
    </View>
  )
}

const S = StyleSheet.create({
  section:   { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 10, borderRadius: 16, padding: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  title:     { fontSize: 15, fontWeight: '800', color: '#1F2937', marginBottom: 12 },
  hubRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F3FF', borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#DDD6FE' },
  distBadge: { backgroundColor: '#EDE9FE', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  recipient: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  addr:      { fontSize: 14, color: '#4B5563', lineHeight: 22 },
  note:      { backgroundColor: '#FFF7F4', borderRadius: 10, padding: 10, marginTop: 10, borderWidth: 1, borderColor: '#FFD5C2' },
  catNote:   { backgroundColor: '#F0FDF4', borderRadius: 8, padding: 8, marginTop: 8, borderWidth: 1, borderColor: '#A7F3D0' },
})
