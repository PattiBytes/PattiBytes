import React from 'react'
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native'
import { COLORS } from '../../lib/constants'

export type PayMethod = 'cod' | 'online'

interface Props {
  payMethod:    PayMethod
  onSelect:     (m: PayMethod) => void
}

function PayCard({
  selected, emoji, label, sub, onPress, disabled,
}: {
  selected: boolean; emoji: string; label: string; sub?: string;
  onPress: () => void; disabled?: boolean
}) {
  return (
    <TouchableOpacity
      style={[S.card, selected && S.cardActive, disabled && { opacity: 0.4 }]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text style={{ fontSize: 24, marginRight: 12 }}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={S.cardLabel}>{label}</Text>
        {!!sub && <Text style={S.cardSub}>{sub}</Text>}
      </View>
      <View style={[S.radio, selected && S.radioActive]}>
        {selected && <View style={S.radioDot} />}
      </View>
    </TouchableOpacity>
  )
}

export default function PaymentSection({ payMethod, onSelect }: Props) {
  return (
    <View style={S.section}>
      <Text style={S.title}>💳 Payment Method</Text>
      <PayCard
        selected={payMethod === 'cod'}
        emoji="💵"
        label="Cash on Delivery"
        sub="Pay when your order arrives"
        onPress={() => onSelect('cod')}
      />
      <PayCard
        selected={payMethod === 'online'}
        emoji="📲"
        label="Online Payment"
        sub="UPI · Card · Net Banking — Coming Soon"
        onPress={() => Alert.alert('Coming Soon', 'Online payments will be available soon!')}
        disabled
      />
    </View>
  )
}

const S = StyleSheet.create({
  section:   { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 16, padding: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  title:     { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 12 },
  card:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 2, borderColor: 'transparent' },
  cardActive:{ borderColor: COLORS.primary, backgroundColor: '#FFF3EE' },
  cardLabel: { fontWeight: '800', color: '#111827', fontSize: 14 },
  cardSub:   { fontSize: 11, color: '#6B7280', marginTop: 2 },
  radio:     { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  radioActive:{ borderColor: COLORS.primary },
  radioDot:  { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
})
