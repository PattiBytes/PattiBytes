import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import type { OrderDetail } from './types'

interface Props { order: OrderDetail }

export default function StatusHero({ order }: Props) {
  const isStore    = order.order_type === 'store' || order.merchant_id === null
  const isCustom   = order.order_type === 'custom'
  const isDelivered = order.status === 'delivered'
  const isCancelled = order.status === 'cancelled'
  const isActive   = !isDelivered && !isCancelled

  const bg = isCancelled ? '#EF4444'
           : isDelivered ? '#10B981'
           : isCustom    ? '#065F46'
           : isStore     ? '#5B21B6'
           : '#FF6B35'

  const emoji = isDelivered ? '🎉' : isCancelled ? '❌' : isCustom ? '✏️' : isStore ? '🛍️' : isActive ? '🔄' : '📋'

  return (
    <View style={[S.hero, { backgroundColor: bg }]}>
      <Text style={{ fontSize: 52, marginBottom: 10 }}>{emoji}</Text>
      <Text style={S.status}>{order.status.replace(/_/g, ' ').toUpperCase()}</Text>
      <Text style={S.sub}>Order #{order.order_number}</Text>

      {order.custom_order_ref && (
        <View style={S.refChip}>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', fontFamily: 'monospace' }}>
            {order.custom_order_ref}
          </Text>
        </View>
      )}
      {(isStore || isCustom) && !order.custom_order_ref && (
        <View style={S.chip}>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
            {isCustom ? '✏️ Custom Order · PBExpress' : '🛍️ PBExpress Store · Patti, Punjab'}
          </Text>
        </View>
      )}
      {isActive && order.estimated_delivery_time && (
        <View style={S.eta}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
            🕐 ETA {new Date(order.estimated_delivery_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      )}
      {isDelivered && order.actual_delivery_time && (
        <View style={S.eta}>
          <Text style={{ color: '#fff', fontSize: 12 }}>
            ✅ Delivered at {new Date(order.actual_delivery_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      )}
    </View>
  )
}

const S = StyleSheet.create({
  hero:   { padding: 30, alignItems: 'center' },
  status: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 4 },
  sub:    { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  chip:   { marginTop: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  refChip:{ marginTop: 8, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5 },
  eta:    { marginTop: 10, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
})
