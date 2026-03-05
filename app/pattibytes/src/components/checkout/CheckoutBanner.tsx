import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import type { OrderType } from './types'

interface Props {
  orderType:       OrderType
  merchantName?:   string
  customOrderTag?: string   // e.g. "PBX-CUST-0042" — only for custom orders
}

const BANNER = {
  restaurant: { emoji: '🍽️', label: 'Restaurant Order',    bg: '#FEF3C7', color: '#B45309', border: '#FDE68A' },
  store:      { emoji: '📦', label: 'PBExpress Store',     bg: '#EDE9FE', color: '#5B21B6', border: '#DDD6FE' },
  custom:     { emoji: '✏️', label: 'Custom Order',        bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' },
}

export default function CheckoutBanner({ orderType, merchantName, customOrderTag }: Props) {
  const b = BANNER[orderType]
  return (
    <View style={[S.wrap, { backgroundColor: b.bg, borderColor: b.border }]}>
      <View style={S.row}>
        <Text style={{ fontSize: 24, marginRight: 12 }}>{b.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[S.label, { color: b.color }]}>{b.label}</Text>
          {orderType === 'restaurant' && merchantName && (
            <Text style={S.sub}>{merchantName}</Text>
          )}
          {(orderType === 'store' || orderType === 'custom') && (
            <Text style={S.sub}>Items dispatched from Patti, Punjab 143416</Text>
          )}
        </View>
        {/* Custom order unique tag */}
        {orderType === 'custom' && customOrderTag && (
          <View style={S.customTag}>
            <Text style={{ fontSize: 9, color: '#fff', fontWeight: '800', letterSpacing: 0.5 }}>
              {customOrderTag}
            </Text>
          </View>
        )}
      </View>

      {/* Custom order info strip */}
      {orderType === 'custom' && (
        <View style={S.customStrip}>
          <Text style={{ fontSize: 11, color: '#065F46', lineHeight: 16 }}>
            ✏️ Custom orders are handled personally by our team.
            We&apos;ll confirm availability and pricing before preparing.
          </Text>
        </View>
      )}
    </View>
  )
}

const S = StyleSheet.create({
  wrap:       { margin: 16, marginBottom: 0, borderRadius: 14, padding: 14, borderWidth: 1.5 },
  row:        { flexDirection: 'row', alignItems: 'center' },
  label:      { fontWeight: '800', fontSize: 14 },
  sub:        { fontSize: 12, color: '#6B7280', marginTop: 2 },
  customTag:  { backgroundColor: '#065F46', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  customStrip:{ marginTop: 10, backgroundColor: '#D1FAE5', borderRadius: 8, padding: 8 },
})
