import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { COLORS } from '../../lib/constants'
import type { OrderDetail } from './types'

interface Props { order: OrderDetail; isStore: boolean }

function Row({ label, value, green, orange, muted }: {
  label: string; value: string
  green?: boolean; orange?: boolean; muted?: boolean
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 9 }}>
      <Text style={{ color: muted ? '#9CA3AF' : '#6B7280', fontSize: 14 }}>{label}</Text>
      <Text style={{
        fontWeight: '700', fontSize: 14,
        color: green ? '#15803D' : orange ? '#D97706' : '#1F2937',
      }}>{value}</Text>
    </View>
  )
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: '#F3F4F6', marginVertical: 6 }} />
}

export default function BillSection({ order, isStore }: Props) {
  const isCustom       = order.order_type === 'custom'
  const subtotal       = Number(order.subtotal       ?? 0)
  const deliveryFee    = Number(order.delivery_fee   ?? 0)
  const discount       = Number(order.discount       ?? 0)
  const tax            = Number(order.tax            ?? 0)
  const totalAmount    = Number(order.total_amount   ?? 0)
  const quotedAmount   = order.quoted_amount ? Number(order.quoted_amount) : null

  const customStatus   = (order as any).custom_order_status ?? order.status
  const isPending      = isCustom && ['pending', 'reviewing'].includes(customStatus)
  const isQuoted       = isCustom && customStatus === 'quoted'

  return (
    <View style={S.section}>
      <Text style={S.title}>🧾 Bill Details</Text>

      {/* ── Custom order pending quote state ── */}
      {isPending && (
        <View style={S.pendingBanner}>
          <Text style={{ fontSize: 15 }}>⏳</Text>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={{ fontWeight: '800', color: '#92400E', fontSize: 13 }}>
              Awaiting quote from our team
            </Text>
            <Text style={{ fontSize: 12, color: '#B45309', marginTop: 2 }}>
              Final amount will be confirmed after review
            </Text>
          </View>
        </View>
      )}

      {/* ── Quoted amount banner ── */}
      {isQuoted && quotedAmount !== null && (
        <View style={S.quotedBanner}>
          <Text style={{ fontSize: 16 }}>💬</Text>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={{ fontWeight: '800', color: '#1D4ED8', fontSize: 13 }}>
              Quote received: ₹{quotedAmount.toFixed(2)}
            </Text>
            {(order as any).quote_message ? (
              <Text style={{ fontSize: 12, color: '#1E40AF', marginTop: 2 }} numberOfLines={2}>
                {(order as any).quote_message}
              </Text>
            ) : null}
          </View>
        </View>
      )}

      {/* ── Line items ── */}
      {subtotal > 0 && (
        <Row label="Subtotal" value={`₹${subtotal.toFixed(2)}`} />
      )}
      {isCustom && subtotal === 0 && !isPending && (
        <Row label="Items" value="As per quote" muted />
      )}

      {discount > 0 && (
        <Row
          label={`Promo${order.promo_code ? ` (${order.promo_code})` : ''}`}
          value={`-₹${discount.toFixed(2)}`}
          green
        />
      )}

      {/* Delivery fee with distance */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 9 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#6B7280', fontSize: 14 }}>
            Delivery Fee
            {isCustom ? ' 🚚 (Patti → You)' : isStore ? ' 🚚' : ''}
          </Text>
          {order.delivery_distance_km && (
            <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>
              📏 {Number(order.delivery_distance_km).toFixed(1)} km
              {isCustom || isStore ? ' from Patti hub' : ''}
            </Text>
          )}
        </View>
        <Text style={{
          fontWeight: '700', fontSize: 14,
          color: deliveryFee === 0 ? '#15803D' : '#1F2937',
        }}>
          {deliveryFee === 0 ? 'FREE 🎉' : `₹${deliveryFee.toFixed(2)}`}
        </Text>
      </View>

      {tax > 0 && (
        <Row label="GST / Taxes" value={`₹${tax.toFixed(2)}`} />
      )}

      {/* Show quoted vs total if they differ */}
      {quotedAmount !== null && quotedAmount !== totalAmount && totalAmount > 0 && (
        <>
          <Divider />
          <Row label="Quoted Amount" value={`₹${quotedAmount.toFixed(2)}`} orange />
        </>
      )}

      {/* ── Total ── */}
      <View style={S.totalRow}>
        <View>
          <Text style={S.totalLbl}>
            {isPending ? 'Estimated Total' : 'Total'}
          </Text>
          {isPending && (
            <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>
              Subject to final quote
            </Text>
          )}
        </View>
        <Text style={[S.totalVal, isPending && { color: '#D97706' }]}>
          {totalAmount > 0
            ? `₹${totalAmount.toFixed(2)}`
            : isPending ? 'TBD' : '₹0.00'}
        </Text>
      </View>

      {/* ── Meta ── */}
      <Text style={S.meta}>
        {order.payment_method?.toUpperCase() ?? 'COD'}
        {' · '}
        {order.payment_status?.toUpperCase() ?? 'PENDING'}
        {order.delivery_distance_km
          ? `  ·  📏 ${Number(order.delivery_distance_km).toFixed(1)} km`
          : ''}
        {isCustom || isStore ? ' from Patti' : ''}
      </Text>

      {/* Custom ref */}
      {isCustom && (order as any).custom_order_ref && (
        <Text style={S.refTxt}>Ref: {(order as any).custom_order_ref}</Text>
      )}
    </View>
  )
}

const S = StyleSheet.create({
  section:      { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 10, borderRadius: 16, padding: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  title:        { fontSize: 15, fontWeight: '800', color: '#1F2937', marginBottom: 14 },
  pendingBanner:{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#FDE68A' },
  quotedBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#BFDBFE' },
  totalRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 14, borderTopWidth: 2, borderTopColor: '#F3F4F6', marginTop: 6 },
  totalLbl:     { fontSize: 17, fontWeight: '900', color: '#1F2937' },
  totalVal:     { fontSize: 18, fontWeight: '900', color: COLORS.primary },
  meta:         { fontSize: 12, color: '#9CA3AF', marginTop: 8 },
  refTxt:       { fontSize: 11, color: '#9CA3AF', marginTop: 4, fontFamily: 'monospace' },
})
