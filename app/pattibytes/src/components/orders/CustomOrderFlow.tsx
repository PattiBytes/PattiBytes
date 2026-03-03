import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import type { OrderDetail } from './types'

const CUSTOM_STEPS = [
  { key: 'pending',    emoji: '📝', label: 'Received'  },
  { key: 'reviewing',  emoji: '🔍', label: 'Reviewing' },
  { key: 'quoted',     emoji: '💬', label: 'Quoted'    },
  { key: 'confirmed',  emoji: '✅', label: 'Confirmed' },
  { key: 'preparing',  emoji: '📦', label: 'Packing'   },
  { key: 'dispatched', emoji: '🚚', label: 'Dispatched'},
  { key: 'delivered',  emoji: '🎉', label: 'Delivered' },
]

interface Props {
  order:          OrderDetail
  onAcceptQuote?: () => void
}

export default function CustomOrderFlow({ order, onAcceptQuote }: Props) {
  if (!order.custom_order_ref) return null

  const currentIdx = CUSTOM_STEPS.findIndex(s => s.key === (order.custom_order_status ?? order.status))

  return (
    <View style={S.wrap}>
      <View style={S.header}>
        <Text style={{ fontSize: 20, marginRight: 10 }}>✏️</Text>
        <View style={{ flex: 1 }}>
          <Text style={S.title}>Custom Order Request</Text>
          <Text style={S.ref}>{order.custom_order_ref}</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 6, paddingVertical: 8 }}>
        {CUSTOM_STEPS.map((step, idx) => {
          const done    = currentIdx >= idx
          const current = currentIdx === idx
          return (
            <View key={step.key} style={{ alignItems: 'center', width: 70 }}>
              <View style={[S.dot, done && S.dotDone, current && S.dotCurrent]}>
                <Text style={{ fontSize: 16 }}>{step.emoji}</Text>
              </View>
              <Text style={[S.stepLbl, done && { color: '#065F46', fontWeight: '700' }]}
                    numberOfLines={1}>
                {step.label}
              </Text>
            </View>
          )
        })}
      </ScrollView>

      {(order.custom_order_status ?? order.status) === 'quoted' && order.quoted_amount && (
        <View style={S.quoteCard}>
          <Text style={S.quoteTitle}>💬 Quote from PBExpress Team</Text>
          {order.quote_message && (
            <Text style={S.quoteMsg}>{order.quote_message}</Text>
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <Text style={S.quoteAmt}>₹{Number(order.quoted_amount).toFixed(2)}</Text>
            {onAcceptQuote && (
              <TouchableOpacity style={S.acceptBtn} onPress={onAcceptQuote}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>Accept Quote ✓</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {(order.custom_order_status ?? order.status) === 'rejected' && (
        <View style={S.rejectedCard}>
          <Text style={{ fontWeight: '800', color: '#991B1B' }}>❌ Request could not be fulfilled</Text>
          {order.quote_message && (
            <Text style={{ fontSize: 12, color: '#7F1D1D', marginTop: 4 }}>{order.quote_message}</Text>
          )}
        </View>
      )}

      <Text style={S.info}>
        Our team reviews every custom request personally. You&apos;ll be notified when the status changes.
      </Text>
    </View>
  )
}

const S = StyleSheet.create({
  wrap:       { backgroundColor: '#F0FDF4', marginHorizontal: 16, marginTop: 10, borderRadius: 16, padding: 16, borderWidth: 1.5, borderColor: '#A7F3D0' },
  header:     { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  title:      { fontWeight: '800', color: '#065F46', fontSize: 14 },
  ref:        { fontSize: 11, color: '#059669', fontFamily: 'monospace', marginTop: 1 },
  dot:        { width: 40, height: 40, borderRadius: 20, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center' },
  dotDone:    { backgroundColor: '#6EE7B7' },
  dotCurrent: { backgroundColor: '#10B981', borderWidth: 2.5, borderColor: '#fff' },
  stepLbl:    { fontSize: 9, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },
  quoteCard:  { backgroundColor: '#FFFBEB', borderRadius: 12, padding: 12, marginTop: 10, borderWidth: 1.5, borderColor: '#FDE68A' },
  quoteTitle: { fontWeight: '800', color: '#92400E', fontSize: 13 },
  quoteMsg:   { fontSize: 12, color: '#78350F', marginTop: 4, lineHeight: 18 },
  quoteAmt:   { fontSize: 22, fontWeight: '900', color: '#D97706' },
  acceptBtn:  { backgroundColor: '#D97706', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 },
  rejectedCard:{ backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginTop: 10, borderWidth: 1.5, borderColor: '#FECACA' },
  info:       { fontSize: 11, color: '#6EE7B7', marginTop: 12, textAlign: 'center', lineHeight: 16 },
})
