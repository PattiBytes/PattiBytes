import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import type { OrderType } from './types'

interface Props {
  orderType:       OrderType
  merchantName:    string
  customOrderTag?: string | undefined
  isMultiCart?:    boolean
  merchantCount?:  number
}

const BANNER = {
  restaurant: { emoji: '🍽️', label: 'Restaurant Order', bg: '#FEF3C7', color: '#B45309', border: '#FDE68A' },
  store:      { emoji: '📦', label: 'PBExpress Store',  bg: '#EDE9FE', color: '#5B21B6', border: '#DDD6FE' },
  custom:     { emoji: '✏️', label: 'Custom Order',     bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' },
}

// Multi-cart gets its own distinct banner style
const MULTI_BANNER = { emoji: '🛒', bg: '#FFF7ED', color: '#92400E', border: '#FED7AA' }

export default function CheckoutBanner({
  orderType, merchantName, customOrderTag, isMultiCart, merchantCount,
}: Props) {

  // ── Multi-cart banner ─────────────────────────────────────────────────────
  if (isMultiCart && merchantCount && merchantCount > 1) {
    return (
      <View style={[S.wrap, {
        backgroundColor: MULTI_BANNER.bg,
        borderColor:     MULTI_BANNER.border,
      }]}>
        <View style={S.row}>
          <Text style={{ fontSize: 24, marginRight: 12 }}>{MULTI_BANNER.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[S.label, { color: MULTI_BANNER.color }]}>
              OpenCart — {merchantCount} Restaurants
            </Text>
            <Text style={S.sub} numberOfLines={2}>{merchantName}</Text>
          </View>
          <View style={[S.badge, { backgroundColor: MULTI_BANNER.color }]}>
            <Text style={S.badgeTxt}>{merchantCount} orders</Text>
          </View>
        </View>
        <View style={[S.multiStrip, { backgroundColor: '#FFEDD5' }]}>
          <Text style={{ fontSize: 11, color: MULTI_BANNER.color, lineHeight: 16 }}>
            🚀 All {merchantCount} orders will be placed simultaneously.
            Each restaurant prepares and dispatches independently.
          </Text>
        </View>
      </View>
    )
  }

  // ── Single restaurant / store / custom banner ─────────────────────────────
  const b = BANNER[orderType]
  return (
    <View style={[S.wrap, { backgroundColor: b.bg, borderColor: b.border }]}>
      <View style={S.row}>
        <Text style={{ fontSize: 24, marginRight: 12 }}>{b.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[S.label, { color: b.color }]}>{b.label}</Text>
          {orderType === 'restaurant' && merchantName ? (
            <Text style={S.sub}>{merchantName}</Text>
          ) : null}
          {(orderType === 'store' || orderType === 'custom') && (
            <Text style={S.sub}>Items dispatched from Patti, Punjab 143416</Text>
          )}
        </View>
        {orderType === 'custom' && customOrderTag && (
          <View style={S.customTag}>
            <Text style={{ fontSize: 9, color: '#fff', fontWeight: '800', letterSpacing: 0.5 }}>
              {customOrderTag}
            </Text>
          </View>
        )}
      </View>

      {orderType === 'custom' && (
        <View style={S.customStrip}>
          <Text style={{ fontSize: 11, color: '#065F46', lineHeight: 16 }}>
            ✏️ Custom orders are handled personally by our team.
            We&apos;ll confirm availability and pricing before preparing.
          </Text>
        </View>
      )}
    </View>
  )
}

const S = StyleSheet.create({
  wrap:        { margin: 16, marginBottom: 0, borderRadius: 14, padding: 14, borderWidth: 1.5 },
  row:         { flexDirection: 'row', alignItems: 'center' },
  label:       { fontWeight: '800', fontSize: 14 },
  sub:         { fontSize: 12, color: '#6B7280', marginTop: 2 },
  badge:       { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  badgeTxt:    { fontSize: 10, color: '#fff', fontWeight: '800' },
  multiStrip:  { marginTop: 10, borderRadius: 8, padding: 8 },
  customTag:   { backgroundColor: '#065F46', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  customStrip: { marginTop: 10, backgroundColor: '#D1FAE5', borderRadius: 8, padding: 8 },
})