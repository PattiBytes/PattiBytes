import React from 'react'
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { COLORS } from '../../lib/constants'

type Props = {
  value:    string
  onChange: (v: string) => void
  onClear:  () => void
}

export default function SearchBar({ value, onChange, onClear }: Props) {
  return (
    <View style={S.row}>
      <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
      <TextInput
        style={S.input}
        placeholder="Search restaurants or dishes"
        value={value}
        onChangeText={onChange}
        placeholderTextColor="#9CA3AF"
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={onClear}>
          <Text style={{ color: '#9CA3AF', fontSize: 18, paddingHorizontal: 4 }}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const S = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', margin: 12, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, elevation: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: COLORS.text },
})
