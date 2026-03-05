import React from 'react'
import { View, Text, TextInput, StyleSheet } from 'react-native'
import type { OrderType } from './types'

interface Props {
  specialInst:         string
  notes:               string
  orderType:           OrderType
  onSpecialInstChange: (v: string) => void
  onNotesChange:       (v: string) => void
}

export default function NotesSection({
  specialInst, notes, orderType, onSpecialInstChange, onNotesChange,
}: Props) {
  return (
    <View style={S.section}>
      <Text style={S.title}>📝 Notes</Text>

      <Text style={S.lbl}>
        {orderType === 'custom'
          ? 'Describe your custom request or special requirements'
          : orderType === 'store'
          ? 'Special packing instructions or requests'
          : 'Special instructions for the restaurant'}
      </Text>
      <TextInput
        style={[S.input, { minHeight: 72, textAlignVertical: 'top' }]}
        value={specialInst}
        onChangeText={onSpecialInstChange}
        placeholder={
          orderType === 'custom'
            ? 'e.g. Need 2kg wheat flour, organic if possible…'
            : 'e.g. No onions in burger, extra sauce on the side…'
        }
        placeholderTextColor="#9CA3AF"
        multiline
        numberOfLines={3}
      />

      <Text style={[S.lbl, { marginTop: 10 }]}>Note for delivery partner (optional)</Text>
      <TextInput
        style={S.input}
        value={notes}
        onChangeText={onNotesChange}
        placeholder="e.g. Call when you arrive, leave at gate…"
        placeholderTextColor="#9CA3AF"
        multiline
        numberOfLines={2}
      />
    </View>
  )
}

const S = StyleSheet.create({
  section: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 16, padding: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  title:   { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 12 },
  lbl:     { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input:   { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: '#111827', backgroundColor: '#FAFAFA' },
})
