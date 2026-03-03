import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { COLORS } from '../../lib/constants'
import { STATUS_COLORS, STATUS_LABELS, TRACKABLE_STATUSES } from './constants'
import type { OrderRow } from './types'

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (d < 1) return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
}

interface Props {
  order:    OrderRow
  onPress:  () => void
  onTrack?: () => void
  onRate?:  () => void
}

export default function OrderCard({ order, onPress, onTrack, onRate }: Props) {
  const isStore    = order.order_type === 'store' || order.merchant_id === null
  const isCustom   = order.order_type === 'custom'
  const canTrack   = TRACKABLE_STATUSES.includes(order.status) && !!order.driver_id
  const needsReview= order.status === 'delivered' && !order.rating
  const itemCount  = (order.items ?? []).reduce((s, i) => s + (i.quantity ?? 1), 0)

  const accentColor = isCustom ? '#065F46' : isStore ? '#5B21B6' : COLORS.primary

  return (
    <TouchableOpacity
      style={[S.card, isStore && { borderLeftColor: '#7C3AED', borderLeftWidth: 3 },
                       isCustom && { borderLeftColor: '#065F46', borderLeftWidth: 3 }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* ── Header ── */}
      <View style={S.header}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            <Text style={S.orderNum}>#{order.order_number}</Text>
            {isStore && (
              <View style={[S.chip, { backgroundColor: '#EDE9FE' }]}>
                <Text style={{ color: '#5B21B6', fontSize: 9, fontWeight: '800' }}>STORE</Text>
              </View>
            )}
            {isCustom && (
              <View style={[S.chip, { backgroundColor: '#D1FAE5' }]}>
                <Text style={{ color: '#065F46', fontSize: 9, fontWeight: '800' }}>CUSTOM</Text>
              </View>
            )}
            {canTrack && (
              <View style={[S.chip, { backgroundColor: '#16A34A' }]}>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>● LIVE</Text>
              </View>
            )}
          </View>
          <Text style={S.time}>{timeAgo(order.created_at)}</Text>
          {order.custom_order_ref && (
            <Text style={{ fontSize: 10, color: accentColor, fontFamily: 'monospace', marginTop: 1 }}>
              {order.custom_order_ref}
            </Text>
          )}
        </View>
        <View style={[S.statusBadge, { backgroundColor: STATUS_COLORS[order.status] ?? '#888' }]}>
          <Text style={S.statusTxt}>
            {STATUS_LABELS[order.status] ?? order.status.replace(/_/g, ' ').toUpperCase()}
          </Text>
        </View>
      </View>

      {/* ── Source ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <Text style={{ fontSize: 15 }}>{isCustom ? '✏️' : isStore ? '🛍️' : '🏪'}</Text>
        <Text style={S.merchant} numberOfLines={1}>{order.merchant_name}</Text>
      </View>

      {/* ── Items preview ── */}
      <Text style={S.preview} numberOfLines={1}>
        {(order.items ?? []).slice(0, 3).map(i => i.name).join(' · ')}
        {(order.items ?? []).length > 3 ? ` +${(order.items ?? []).length - 3} more` : ''}
      </Text>

      {/* ── Totals ── */}
      <View style={S.totals}>
        <Text style={S.metaTxt}>
          {itemCount} item{itemCount !== 1 ? 's' : ''}
          {order.delivery_distance_km
            ? `  ·  📏 ${Number(order.delivery_distance_km).toFixed(1)} km`
            : ''}
        </Text>
        <Text style={S.total}>₹{Number(order.total_amount).toFixed(2)}</Text>
      </View>
      {Number(order.discount) > 0 && (
        <Text style={S.saved}>🎉 Saved ₹{Number(order.discount).toFixed(2)}</Text>
      )}

      {/* ── Footer ── */}
      <View style={S.footer}>
        <Text style={S.payTxt}>
          {order.payment_method?.toUpperCase()} · {order.payment_status?.toUpperCase()}
          {order.promo_code ? `  🏷️ ${order.promo_code}` : ''}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {canTrack && onTrack && (
            <TouchableOpacity style={S.trackBtn} onPress={onTrack} activeOpacity={0.8}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 11 }}>🗺️ Track</Text>
            </TouchableOpacity>
          )}
          {needsReview && onRate && (
            <TouchableOpacity style={S.rateBtn} onPress={onRate} activeOpacity={0.8}>
              <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 11 }}>⭐ Rate</Text>
            </TouchableOpacity>
          )}
          {order.status === 'delivered' && order.rating ? (
            <Text style={{ fontSize: 13 }}>{'⭐'.repeat(order.rating)}</Text>
          ) : null}
          <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 13 }}>View →</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const S = StyleSheet.create({
  card:       { backgroundColor: '#fff', borderRadius: 16, padding: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  orderNum:   { fontSize: 16, fontWeight: '800', color: '#1F2937' },
  time:       { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  chip:       { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  statusBadge:{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  statusTxt:  { color: '#fff', fontSize: 10, fontWeight: '800' },
  merchant:   { fontSize: 14, color: '#4B5563', fontWeight: '700', flex: 1 },
  preview:    { fontSize: 11, color: '#9CA3AF', marginBottom: 8 },
  totals:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaTxt:    { fontSize: 12, color: '#9CA3AF' },
  total:      { fontSize: 16, fontWeight: '900', color: COLORS.primary },
  saved:      { fontSize: 12, color: '#16A34A', fontWeight: '600', marginTop: 2 },
  footer:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F9FAFB' },
  payTxt:     { fontSize: 11, color: '#9CA3AF', flex: 1 },
  trackBtn:   { backgroundColor: '#16A34A', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  rateBtn:    { backgroundColor: '#FFF7F0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#FED7AA' },
})
