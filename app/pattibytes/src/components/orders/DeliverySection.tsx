import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import type { OrderDetail } from './types'

interface Props { order: OrderDetail }

export default function DeliverySection({ order }: Props) {
  return (
    <View style={S.section}>
      <Text style={S.title}>📍 Delivery Address</Text>

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
      {order.recipient_name && (
        <Text style={S.recipient}>👤 {order.recipient_name}
          {order.customer_phone ? `  ·  📞 ${order.customer_phone}` : ''}
        </Text>
      )}
      <Text style={S.addr}>{order.delivery_address}</Text>

      {order.delivery_instructions && <NoteBox text={`📋 ${order.delivery_instructions}`} />}
      {order.special_instructions   && <NoteBox text={`📝 ${order.special_instructions}`} />}
      {order.customer_notes         && <NoteBox text={`💬 ${order.customer_notes}`} />}
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
  recipient: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  addr:      { fontSize: 14, color: '#4B5563', lineHeight: 22 },
  note:      { backgroundColor: '#FFF7F4', borderRadius: 10, padding: 10, marginTop: 10, borderWidth: 1, borderColor: '#FFD5C2' },
})
