import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { COLORS } from '../../lib/constants'
import type { OrderDetail } from './types'

interface Props { order: OrderDetail; isStore: boolean }

function Row({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 9 }}>
      <Text style={{ color: '#6B7280', fontSize: 14 }}>{label}</Text>
      <Text style={{ fontWeight: '700', color: green ? '#15803D' : '#1F2937', fontSize: 14 }}>{value}</Text>
    </View>
  )
}

export default function BillSection({ order, isStore }: Props) {
  return (
    <View style={S.section}>
      <Text style={S.title}>🧾 Bill Details</Text>
      <Row label="Subtotal" value={`₹${Number(order.subtotal).toFixed(2)}`} />
      {Number(order.discount) > 0 && (
        <Row
          label={`Promo${order.promo_code ? ` (${order.promo_code})` : ''}`}
          value={`-₹${Number(order.discount).toFixed(2)}`}
          green
        />
      )}
      {Number(order.delivery_fee) > 0 && (
        <Row label="Delivery Fee" value={`₹${Number(order.delivery_fee).toFixed(2)}`} />
      )}
      {Number(order.delivery_fee) === 0 && (
        <Row label="Delivery Fee" value="FREE 🎉" green />
      )}
      {Number(order.tax) > 0 && (
        <Row label="GST / Taxes" value={`₹${Number(order.tax).toFixed(2)}`} />
      )}
      {order.quoted_amount && order.quoted_amount !== order.total_amount && (
        <Row label="Quoted Amount" value={`₹${Number(order.quoted_amount).toFixed(2)}`} />
      )}

      <View style={S.totalRow}>
        <Text style={S.totalLbl}>Total Paid</Text>
        <Text style={S.totalVal}>₹{Number(order.total_amount).toFixed(2)}</Text>
      </View>

      <Text style={S.meta}>
        {order.payment_method?.toUpperCase()} · {order.payment_status?.toUpperCase()}
        {order.delivery_distance_km
          ? `  ·  📏 ${Number(order.delivery_distance_km).toFixed(1)} km${isStore ? ' from Patti' : ''}`
          : ''}
      </Text>
    </View>
  )
}

const S = StyleSheet.create({
  section:  { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 10, borderRadius: 16, padding: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  title:    { fontSize: 15, fontWeight: '800', color: '#1F2937', marginBottom: 14 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 14, borderTopWidth: 2, borderTopColor: '#F3F4F6', marginTop: 6 },
  totalLbl: { fontSize: 17, fontWeight: '900', color: '#1F2937' },
  totalVal: { fontSize: 18, fontWeight: '900', color: COLORS.primary },
  meta:     { fontSize: 12, color: '#9CA3AF', marginTop: 8 },
})
