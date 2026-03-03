import React from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Platform } from 'react-native'
import { COLORS } from '../../lib/constants'
import type { PayMethod } from './PaymentSection'

interface Props {
  finalTotal:    number
  totalSavings:  number
  payMethod:     PayMethod
  hasLocation:   boolean
  placing:       boolean
  disabled:      boolean
  onPress:       () => void
}

export default function PlaceOrderBar({
  finalTotal, totalSavings, payMethod,
  hasLocation, placing, disabled, onPress,
}: Props) {
  return (
    <View style={S.bar}>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={{ color: '#6B7280', fontSize: 11 }}>
          {payMethod === 'cod' ? '💵 Cash on Delivery' : '📲 Online'}
          {hasLocation ? '  ·  📡 Live' : ''}
        </Text>
        <Text style={{ fontWeight: '900', color: '#111827', fontSize: 18 }}>
          ₹{finalTotal.toFixed(2)}
        </Text>
        {totalSavings > 0 && (
          <Text style={{ fontSize: 11, color: '#15803D' }}>
            Saved ₹{totalSavings.toFixed(0)}
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={[S.btn, (placing || disabled) && { opacity: 0.55 }]}
        onPress={onPress}
        disabled={placing || disabled}
        activeOpacity={0.85}
      >
        {placing
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={S.btnTxt}>
              {!hasLocation ? '📍 Allow Location' : `Place Order · ₹${finalTotal.toFixed(0)}`}
            </Text>}
      </TouchableOpacity>
    </View>
  )
}

const S = StyleSheet.create({
  bar:    { backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, paddingBottom: Platform.OS === 'ios' ? 34 : 14, borderTopWidth: 1, borderTopColor: '#F3F4F6', elevation: 10 },
  btn:    { backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 14, alignItems: 'center' },
  btnTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
})
