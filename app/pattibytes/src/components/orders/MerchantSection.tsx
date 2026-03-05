import React from 'react'
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native'
import { COLORS } from '../../lib/constants'
import { useAppSettings } from '../../hooks/useAppSettings'
import type { MerchantInfo, DriverInfo, OrderDetail } from './types'

interface Props {
  order:       OrderDetail
  merchant:    MerchantInfo | null
  driver:      DriverInfo | null
  isStore:     boolean
  isActive:    boolean
  isDelivered: boolean
}

export default function MerchantSection({
  order, merchant, driver, isStore, isActive, isDelivered,
}: Props) {
  const { settings }   = useAppSettings()
  const isCustom       = order.order_type === 'custom'
  const supportPhone   = settings?.support_phone?.replace(/\s/g, '') ?? '918400009045'
  const orderMsg       = `Hi! Help needed for order %23${order.order_number}`
  const supportWhatsApp = `https://wa.me/${supportPhone.replace('+', '')}?text=${orderMsg}`

  return (
    <View style={S.section}>
      <Text style={S.title}>
        {isCustom ? '✏️ Custom Order Team'
          : isStore ? '🛍️ Order Source'
          : '🏪 Restaurant'}
      </Text>

      {/* ── Custom order — PBExpress team card ── */}
      {isCustom && (
        <View style={S.customCard}>
          <View style={S.customIcon}>
            <Text style={{ fontSize: 24 }}>✏️</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontWeight: '800', color: '#065F46', fontSize: 15 }}>
              PBExpress Custom Team
            </Text>
            <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
              {settings?.business_address ?? 'Patti, Punjab 143416'}
            </Text>
            <Text style={{ fontSize: 11, color: '#059669', marginTop: 3, fontWeight: '600' }}>
              📦 Sourcing your items personally
            </Text>
          </View>
          <TouchableOpacity
            style={S.waBtn}
            onPress={() => Linking.openURL(supportWhatsApp)}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>
              💬 Chat
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Store card ── */}
      {isStore && !isCustom && (
        <View style={S.storeCard}>
          <Text style={{ fontSize: 28, marginRight: 14 }}>🏪</Text>
          <View style={{ flex: 1 }}>
            <Text style={S.storeName}>{settings?.app_name ?? 'PBExpress'}</Text>
            <Text style={S.storeSub}>{settings?.business_address ?? 'Patti, Punjab'}</Text>
            {(order as any).hub_origin?.label && (
              <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>
                📍 {(order as any).hub_origin.label}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={S.contactBtn}
            onPress={() => Linking.openURL(supportWhatsApp)}
          >
            <Text style={{ color: COLORS.primary, fontWeight: '700' }}>💬 Help</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Restaurant card ── */}
      {!isStore && !isCustom && merchant && (
        <>
          <Text style={S.merchantName}>{merchant.business_name}</Text>
          {merchant.address && (
            <Text style={S.merchantAddr}>{merchant.address}</Text>
          )}
          <View style={S.btnRow}>
            {merchant.phone && (
              <TouchableOpacity
                style={S.contactBtn}
                onPress={() => Linking.openURL(`tel:${merchant.phone}`)}
              >
                <Text style={{ color: COLORS.primary, fontWeight: '700' }}>📞 Call</Text>
              </TouchableOpacity>
            )}
            {merchant.phone && (
              <TouchableOpacity
                style={S.contactBtn}
                onPress={() => Linking.openURL(
                  `https://wa.me/${merchant.phone?.replace(/\D/g, '')}?text=Hi! My order is %23${order.order_number}`
                )}
              >
                <Text style={{ color: '#15803D', fontWeight: '700' }}>💬 WhatsApp</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}

      {/* ── Driver card ── */}
      {driver && (isActive || isDelivered) && (
        <View style={S.driverCard}>
          <View style={S.driverAvatar}>
            <Text style={{ fontSize: 22 }}>🛵</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={S.driverName}>{driver.full_name ?? 'Your Driver'}</Text>
            <Text style={{ fontSize: 12, color: '#6B7280' }}>Delivery Partner</Text>
          </View>
          {driver.phone && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={S.callBtn}
                onPress={() => Linking.openURL(`tel:${driver.phone}`)}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>📞</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[S.callBtn, { backgroundColor: '#15803D' }]}
                onPress={() => Linking.openURL(
                  `https://wa.me/${driver.phone?.replace(/\D/g, '')}`
                )}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>💬</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* ── Support row ── */}
      <TouchableOpacity
        style={S.supportRow}
        onPress={() => Linking.openURL(supportWhatsApp)}
      >
        <Text style={{ fontSize: 16 }}>💬</Text>
        <Text style={{ flex: 1, fontSize: 13, color: '#15803D', fontWeight: '700', marginLeft: 8 }}>
          {isCustom ? 'Questions about your custom request?' : 'Need help with this order?'}
        </Text>
        <Text style={{ fontSize: 13, color: '#9CA3AF' }}>→</Text>
      </TouchableOpacity>
    </View>
  )
}

const S = StyleSheet.create({
  section:     { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 10, borderRadius: 16, padding: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  title:       { fontSize: 15, fontWeight: '800', color: '#1F2937', marginBottom: 12 },
  customCard:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: '#A7F3D0' },
  customIcon:  { width: 48, height: 48, borderRadius: 24, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center' },
  waBtn:       { backgroundColor: '#065F46', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  storeCard:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F3FF', borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: '#DDD6FE' },
  storeName:   { fontWeight: '800', color: '#5B21B6', fontSize: 15 },
  storeSub:    { fontSize: 12, color: '#6B7280', marginTop: 2 },
  merchantName:{ fontWeight: '800', fontSize: 15, color: '#1F2937', marginBottom: 4 },
  merchantAddr:{ fontSize: 12, color: '#6B7280', lineHeight: 18, marginBottom: 10 },
  btnRow:      { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  contactBtn:  { borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  driverCard:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F9FF', borderRadius: 12, padding: 13, marginTop: 14, borderWidth: 1, borderColor: '#BAE6FD' },
  driverAvatar:{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  driverName:  { fontWeight: '800', color: '#1F2937', fontSize: 15 },
  callBtn:     { backgroundColor: COLORS.primary, borderRadius: 10, width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  supportRow:  { flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
})
