import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { COLORS } from '../../lib/constants'
import { freeDeliveryProgress } from './utils'

interface Props {
  subtotal:                number
  /** app_settings.free_delivery_above */
  threshold:               number | null | undefined
  /** True when a free_delivery promo code is active */
  freeDeliveryPromoApplied?: boolean
  freeDeliveryPromoCode?:    string
}

export default function FreeDeliveryBar({
  subtotal,
  threshold,
  freeDeliveryPromoApplied = false,
  freeDeliveryPromoCode,
}: Props) {
  // If promo has already waived the fee, show locked state immediately
  if (freeDeliveryPromoApplied) {
    return (
      <View style={[S.wrap, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
        <View style={S.row}>
          <Text style={[S.label, { color: '#065F46' }]}>
            🚚 Free delivery unlocked{freeDeliveryPromoCode ? ` via ${freeDeliveryPromoCode}` : ''}!
          </Text>
          <Text style={[S.pct, { color: '#15803D' }]}>100%</Text>
        </View>
        <View style={S.track}>
          <View style={[S.fill, { width: '100%', backgroundColor: '#15803D' }]} />
        </View>
      </View>
    )
  }

  // No threshold configured → hide bar
  if (!threshold || threshold <= 0) return null

  const pct       = freeDeliveryProgress(subtotal, threshold)
  const remaining = Math.max(0, threshold - subtotal)
  const achieved  = remaining === 0

  return (
    <View style={[S.wrap, achieved && S.wrapGreen]}>
      <View style={S.row}>
        <Text style={[S.label, achieved && S.labelGreen]}>
          {achieved
            ? '🎉 Free delivery unlocked!'
            : `Add ₹${remaining.toFixed(0)} more for free delivery`}
        </Text>
        <Text style={[S.pct, achieved && { color: '#15803D' }]}>{pct}%</Text>
      </View>
      <View style={S.track}>
        <View
          style={[
            S.fill,
            {
              width:           `${pct}%` as any,
              backgroundColor: achieved ? '#15803D' : COLORS.primary,
            },
          ]}
        />
      </View>
      {!achieved && (
        <Text style={S.sub}>
          Free delivery on orders ≥ ₹{threshold.toFixed(0)}
        </Text>
      )}
    </View>
  )
}

const S = StyleSheet.create({
  wrap:       { marginHorizontal: 16, marginBottom: 10, backgroundColor: '#FFF3EE', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FED7AA' },
  wrapGreen:  { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  row:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label:      { fontSize: 12, color: '#92400E', fontWeight: '600', flex: 1 },
  labelGreen: { color: '#065F46' },
  pct:        { fontSize: 12, fontWeight: '800', color: COLORS.primary },
  track:      { height: 6, backgroundColor: '#FDE68A', borderRadius: 3, overflow: 'hidden' },
  fill:       { height: 6, borderRadius: 3 },
  sub:        { fontSize: 10, color: '#B45309', marginTop: 5 },
})
