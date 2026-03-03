import React from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { COLORS } from '../../lib/constants'
import { formatAddr, getAddrEmoji } from './utils'
import type { SavedAddress } from './types'

interface Props {
  addresses:         SavedAddress[]
  selectedAddr:      SavedAddress | null
  deliveryBreakdown: string
  showDeliveryFee:   boolean
  onChangeAddr:      () => void
  onSelectAddr:      (a: SavedAddress) => void
}

export default function DeliveryAddressSection({
  addresses, selectedAddr, deliveryBreakdown, showDeliveryFee, onChangeAddr, onSelectAddr,
}: Props) {
  const router = useRouter()

  return (
    <View style={S.section}>
      <View style={S.header}>
        <Text style={S.title}>Delivery Address</Text>
        <TouchableOpacity
          style={S.changeBtn}
          onPress={() => addresses.length > 0 ? onChangeAddr() : router.push('/(customer)/addresses' as any)}
        >
          <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 12 }}>
            {addresses.length === 0 ? '+ Add' : addresses.length > 1 ? '⇄ Change' : '✎ Edit'}
          </Text>
        </TouchableOpacity>
      </View>

      {selectedAddr ? (
        <>
          <View style={S.card}>
            <View style={S.icon}>
              <Text style={{ fontSize: 20 }}>{getAddrEmoji(selectedAddr.label)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={S.addrLabel}>{selectedAddr.label}</Text>
                {selectedAddr.is_default && (
                  <View style={S.defaultTag}>
                    <Text style={{ color: COLORS.primary, fontSize: 9, fontWeight: '800' }}>DEFAULT</Text>
                  </View>
                )}
              </View>
              {!!selectedAddr.recipient_name && (
                <Text style={S.meta}>
                  👤 {selectedAddr.recipient_name}
                  {selectedAddr.recipient_phone ? ` · 📞 ${selectedAddr.recipient_phone}` : ''}
                </Text>
              )}
              <Text style={S.addrText}>{formatAddr(selectedAddr)}</Text>
              {!!selectedAddr.delivery_instructions && (
                <View style={S.instrBox}>
                  <Text style={{ fontSize: 12, color: '#92400E' }}>📋 {selectedAddr.delivery_instructions}</Text>
                </View>
              )}
            </View>
          </View>

          {showDeliveryFee && !!deliveryBreakdown && (
            <View style={S.feeBox}>
              <Text style={{ fontSize: 11, color: '#0369A1' }}>📦 {deliveryBreakdown}</Text>
            </View>
          )}

          {addresses.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 12 }}>
              {addresses.map(a => (
                <TouchableOpacity
                  key={a.id}
                  style={[S.chip, selectedAddr.id === a.id && S.chipActive]}
                  onPress={() => onSelectAddr(a)}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: selectedAddr.id === a.id ? '#fff' : '#111827' }}>
                    {getAddrEmoji(a.label)} {a.label}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[S.chip, { borderStyle: 'dashed', borderColor: COLORS.primary }]}
                onPress={() => router.push('/(customer)/addresses' as any)}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.primary }}>＋ Add</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </>
      ) : (
        <TouchableOpacity style={S.addBanner} onPress={() => router.push('/(customer)/addresses' as any)} activeOpacity={0.8}>
          <Text style={{ fontSize: 28 }}>📍</Text>
          <View style={{ marginLeft: 14 }}>
            <Text style={{ fontWeight: '800', color: COLORS.primary, fontSize: 14 }}>Add delivery address</Text>
            <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Required to place the order</Text>
          </View>
          <Text style={{ color: COLORS.primary, marginLeft: 'auto', fontSize: 18 }}>›</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const S = StyleSheet.create({
  section:    { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 16, padding: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title:      { fontSize: 15, fontWeight: '800', color: '#111827' },
  changeBtn:  { backgroundColor: '#FFF3EE', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  card:       { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: COLORS.primary + '30' },
  icon:       { width: 40, height: 40, borderRadius: 10, backgroundColor: '#FFF3EE', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  addrLabel:  { fontWeight: '800', color: '#111827', fontSize: 15 },
  defaultTag: { backgroundColor: '#FFF3EE', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: COLORS.primary },
  meta:       { fontSize: 12, color: '#6B7280', marginTop: 2 },
  addrText:   { fontSize: 13, color: '#4B5563', marginTop: 4, lineHeight: 20 },
  instrBox:   { backgroundColor: '#FFFBEB', borderRadius: 8, padding: 8, marginTop: 6, borderWidth: 1, borderColor: '#FDE68A' },
  feeBox:     { backgroundColor: '#EFF6FF', borderRadius: 10, padding: 10, marginTop: 10, borderWidth: 1, borderColor: '#BFDBFE' },
  chip:       { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: 'transparent' },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  addBanner:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3EE', borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: '#FED7AA' },
})
