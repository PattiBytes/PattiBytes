import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native'
import { COLORS } from '../../lib/constants'

interface Props {
  itemCount:    number
  finalTotal:   number
  totalSavings: number
  addressLabel: string | null
  disabled:     boolean
  onPress:      () => void
}

export default function CheckoutBar({ itemCount, finalTotal, totalSavings, addressLabel, disabled, onPress }: Props) {
  return (
    <View style={S.bar}>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={S.meta}>
          {itemCount} item{itemCount !== 1 ? 's' : ''}
          {addressLabel ? ` · ${addressLabel}` : ''}
        </Text>
        <Text style={S.total}>₹{finalTotal.toFixed(2)}</Text>
        {totalSavings > 0 && <Text style={S.saved}>Saved ₹{totalSavings.toFixed(0)} 🎉</Text>}
      </View>
      <TouchableOpacity style={[S.btn, disabled && { opacity: 0.5 }]} disabled={disabled} onPress={onPress} activeOpacity={0.85}>
        <Text style={S.btnTxt}>{addressLabel ? 'Proceed to Checkout →' : 'Add Address'}</Text>
      </TouchableOpacity>
    </View>
  )
}

const S = StyleSheet.create({
  bar:    { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, paddingBottom: Platform.OS === 'ios' ? 34 : 14, borderTopWidth: 1, borderTopColor: '#F3F4F6', elevation: 10 },
  meta:   { color: '#6B7280', fontSize: 12 },
  total:  { fontWeight: '900', color: '#111827', fontSize: 18 },
  saved:  { fontSize: 11, color: '#15803D' },
  btn:    { backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 13 },
  btnTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
})
