import React from 'react'
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { COLORS } from '../../lib/constants'

interface Props {
  search:         string
  onChangeSearch: (v: string) => void
  loading?:       boolean
  onFocus?:       () => void   
  onBlur?:        () => void   
}

export function SearchBar({ search, onChangeSearch, loading, onFocus, onBlur }: Props) {
  return (
    <View style={S.row}>
      <Text style={S.icon}>🔍</Text>
      <TextInput
        style={S.input}
        placeholder="Search restaurants, dishes or products…"
        value={search}
        onChangeText={onChangeSearch}
        placeholderTextColor="#9CA3AF"
        onFocus={onFocus}
        onBlur={onBlur}
        returnKeyType="search"
        clearButtonMode="never"
      />
      {loading && search.trim().length >= 2 && (
        <View style={S.loadDot} />
      )}
      {search.length > 0 && (
        <TouchableOpacity onPress={() => onChangeSearch('')} hitSlop={10}>
          <View style={S.clearBtn}>
            <Text style={S.clearTxt}>✕</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  )
}

const S = StyleSheet.create({
  row: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: '#F3F4F6',
    borderRadius:    14,
    paddingHorizontal: 12,
    paddingVertical:   10,
    marginHorizontal:  14,
    marginBottom:       8,
    gap:               8,
  },
  icon:  { fontSize: 15, lineHeight: 20 },
  input: { flex: 1, fontSize: 14, color: '#111827', fontWeight: '600', paddingVertical: 0 },
  loadDot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: COLORS.primary, opacity: 0.7,
  },
  clearBtn: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center',
  },
  clearTxt: { fontSize: 10, color: '#6B7280', fontWeight: '900' },
})