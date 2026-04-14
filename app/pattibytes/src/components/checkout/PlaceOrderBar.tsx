// src/components/checkout/PlaceOrderBar.tsx
import React from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { COLORS } from '../../lib/constants'
import type { PayMethod } from './PaymentSection'

interface Props {
  finalTotal:   number
  totalSavings: number
  payMethod:    PayMethod
  hasLocation:  boolean
  placing:      boolean
  disabled:     boolean
  onPress:      () => void
}

export default function PlaceOrderBar({
  finalTotal, totalSavings, payMethod,
  hasLocation, placing, disabled, onPress,
}: Props) {
  const insets = useSafeAreaInsets()

  return (
    <View
      style={[
        S.bar,
        {
          // ✅ Respect home indicator (iOS) and gesture nav bar (Android)
          paddingBottom: Math.max(insets.bottom, 14),
        },
      ]}
    >
      <View style={S.info}>
        <Text style={S.method}>
          {payMethod === 'cod' ? '💵 Cash on Delivery' : '📲 Online'}
          {hasLocation ? '  ·  📡 Live' : ''}
        </Text>
        <Text style={S.total}>₹{finalTotal.toFixed(2)}</Text>
        {totalSavings > 0 && (
          <Text style={S.savings}>Saved ₹{totalSavings.toFixed(0)}</Text>
        )}
      </View>

      <TouchableOpacity
        style={[S.btn, (placing || disabled) && S.btnDisabled]}
        onPress={onPress}
        disabled={placing || disabled}
        activeOpacity={0.85}
      >
        {placing
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={S.btnTxt}>
              {!hasLocation
                ? '📍 Allow Location'
                : `Place Order · ₹${finalTotal.toFixed(0)}`}
            </Text>}
      </TouchableOpacity>
    </View>
  )
}

const S = StyleSheet.create({
  bar: {
    backgroundColor:  '#fff',
    flexDirection:    'row',
    alignItems:       'center',
    paddingHorizontal: 16,
    paddingTop:       14,
    // ✅ paddingBottom set dynamically above — no more Platform check
    borderTopWidth:   1,
    borderTopColor:   '#F3F4F6',
    elevation:        10,
    shadowColor:      '#000',
    shadowOpacity:    0.08,
    shadowRadius:     8,
    shadowOffset:     { width: 0, height: -2 },
  },
  info:       { flex: 1, marginRight: 12 },
  method:     { color: '#6B7280', fontSize: 11 },
  total:      { fontWeight: '900', color: '#111827', fontSize: 18, marginTop: 2 },
  savings:    { fontSize: 11, color: '#15803D', marginTop: 1 },
  btn:        { backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 14, alignItems: 'center' },
  btnDisabled:{ opacity: 0.55 },
  btnTxt:     { color: '#fff', fontWeight: '800', fontSize: 15 },
})