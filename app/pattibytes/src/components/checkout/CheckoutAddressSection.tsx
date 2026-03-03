import React from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { COLORS } from '../../lib/constants'
import type { SavedAddress } from '../../services/location'
import type { OrderType } from './types'

function formatAddr(a: SavedAddress) {
  return [
    a.address,
    a.apartment_floor ? `Flat/Floor: ${a.apartment_floor}` : '',
    a.landmark        ? `Near ${a.landmark}` : '',
    a.city, a.state,
  ].filter(Boolean).join(', ')
}

interface Props {
  addresses:        SavedAddress[]
  selectedAddr:     SavedAddress | null
  deliveryFee:      number
  deliveryKm:       number
  deliveryBreakdown:string
  showDeliveryFee:  boolean
  isFreeDelivery:   boolean
  orderType:        OrderType
  onChangeAddr:     () => void
  onSelectAddr:     (a: SavedAddress) => void
}

export default function CheckoutAddressSection({
  addresses, selectedAddr, deliveryFee, deliveryKm,
  deliveryBreakdown, showDeliveryFee, isFreeDelivery,
  orderType, onChangeAddr, onSelectAddr,
}: Props) {
  const router = useRouter()

  return (
    <View style={S.section}>
      <View style={S.titleRow}>
        <Text style={S.title}>📍 Delivery Address</Text>
        <TouchableOpacity
          onPress={addresses.length === 0 ? () => router.push('/(customer)/addresses' as any) : onChangeAddr}
          style={S.changeBtn}
        >
          <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 13 }}>
            {addresses.length === 0 ? 'Add' : 'Change'}
          </Text>
        </TouchableOpacity>
      </View>

      {selectedAddr ? (
        <View style={S.addrCard}>
          <View style={S.addrIcon}>
            <Text style={{ fontSize: 20 }}>
              {selectedAddr.label === 'Home' ? '🏠' : selectedAddr.label === 'Work' ? '💼' : '📌'}
            </Text>
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
              <Text style={S.recipientTxt}>
                {selectedAddr.recipient_name}
                {selectedAddr.recipient_phone ? ` · ${selectedAddr.recipient_phone}` : ''}
              </Text>
            )}
            <Text style={S.addrTxt} numberOfLines={3}>{formatAddr(selectedAddr)}</Text>
            {!!selectedAddr.delivery_instructions && (
              <View style={S.instrBox}>
                <Text style={{ fontSize: 11, color: '#92400E' }}>
                  📋 {selectedAddr.delivery_instructions}
                </Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        <TouchableOpacity style={S.addBanner} onPress={() => router.push('/(customer)/addresses' as any)}>
          <Text style={{ fontSize: 24 }}>➕</Text>
          <View style={{ marginLeft: 12 }}>
            <Text style={{ fontWeight: '700', color: COLORS.primary, fontSize: 14 }}>
              Add a delivery address
            </Text>
            <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Required to place order</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Delivery fee info box */}
      {showDeliveryFee && selectedAddr && (
        <View style={S.feeBox}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={S.feeLbl}>🚚 Delivery Fee</Text>
            <Text style={[S.feeVal, isFreeDelivery && { color: '#15803D' }]}>
              {isFreeDelivery ? 'FREE' : `₹${deliveryFee.toFixed(0)}`}
            </Text>
          </View>
          {!!deliveryBreakdown && (
            <Text style={S.feeSub}>{deliveryBreakdown}</Text>
          )}
          {deliveryKm > 0 && (
            <Text style={S.feeSub}>
              📍 {deliveryKm.toFixed(1)} km
              {orderType === 'restaurant' ? ' from restaurant' : ' from Patti'}
            </Text>
          )}
        </View>
      )}

      {/* Quick address chips */}
      {addresses.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, marginTop: 12 }}
        >
          {addresses.map(a => (
            <TouchableOpacity
              key={a.id}
              style={[S.chip, selectedAddr?.id === a.id && S.chipActive]}
              onPress={() => onSelectAddr(a)}
            >
              <Text style={{
                fontSize: 12,
                fontWeight: '700',
                color: selectedAddr?.id === a.id ? '#fff' : COLORS.text,
              }}>
                {a.label === 'Home' ? '🏠' : a.label === 'Work' ? '💼' : '📌'} {a.label}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[S.chip, { borderStyle: 'dashed', borderColor: COLORS.primary }]}
            onPress={() => router.push('/(customer)/addresses' as any)}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.primary }}>+ Add</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  )
}

const S = StyleSheet.create({
  section:     { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 16, padding: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  titleRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title:       { fontSize: 15, fontWeight: '800', color: '#111827' },
  changeBtn:   { backgroundColor: '#FFF3EE', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: `${COLORS.primary}60` },
  addrCard:    { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: `${COLORS.primary}30` },
  addrIcon:    { width: 40, height: 40, borderRadius: 10, backgroundColor: '#FFF3EE', alignItems: 'center', justifyContent: 'center' },
  addrLabel:   { fontWeight: '800', color: '#111827', fontSize: 15 },
  defaultTag:  { backgroundColor: '#FFF3EE', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: COLORS.primary },
  recipientTxt:{ fontSize: 12, color: '#6B7280', marginTop: 3 },
  addrTxt:     { fontSize: 13, color: '#4B5563', marginTop: 4, lineHeight: 20 },
  instrBox:    { backgroundColor: '#FFFBEB', borderRadius: 8, padding: 8, marginTop: 6, borderWidth: 1, borderColor: '#FDE68A' },
  addBanner:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3EE', borderRadius: 12, padding: 16, borderWidth: 1.5, borderColor: '#FED7AA' },
  feeBox:      { backgroundColor: '#EFF6FF', borderRadius: 10, padding: 10, marginTop: 10, borderWidth: 1, borderColor: '#BFDBFE' },
  feeLbl:      { fontSize: 12, color: '#0369A1', fontWeight: '700' },
  feeVal:      { fontSize: 14, color: '#0369A1', fontWeight: '900' },
  feeSub:      { fontSize: 11, color: '#6B7280', marginTop: 3 },
  chip:        { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: 'transparent' },
  chipActive:  { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
})
