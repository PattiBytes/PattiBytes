// src/components/orders/CustomOrderCard.tsx
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { COLORS } from '../../lib/constants'
import { STATUS_COLORS, STATUS_LABELS } from './constants'
import type { OrderRow } from './types'

const CAT_COLORS: Record<string, { bg: string; text: string }> = {
  dairy:      { bg: '#DBEAFE', text: '#1D4ED8' },
  grocery:    { bg: '#D1FAE5', text: '#065F46' },
  medicines:  { bg: '#FEE2E2', text: '#991B1B' },
  food:       { bg: '#FEF3C7', text: '#92400E' },
  bakery:     { bg: '#FCE7F3', text: '#9D174D' },
  stationery: { bg: '#EDE9FE', text: '#5B21B6' },
  other:      { bg: '#F3F4F6', text: '#374151' },
}

const CAT_EMOJI: Record<string, string> = {
  dairy: '🥛', grocery: '🛒', medicines: '💊',
  food: '🍱', bakery: '🎂', stationery: '✏️', other: '📦',
}

const CUSTOM_STATUS_COLORS: Record<string, string> = {
  pending:    '#F59E0B',
  quoted:     '#3B82F6',
  confirmed:  '#2563EB',
  processing: '#8B5CF6',
  completed:  '#22C55E',
  delivered:  '#22C55E',
  cancelled:  '#EF4444',
  rejected:   '#EF4444',
}

const CUSTOM_STATUS_LABELS: Record<string, string> = {
  pending:    'PENDING REVIEW',
  quoted:     '💬 QUOTED',
  confirmed:  '✅ CONFIRMED',
  processing: '⚙️ PROCESSING',
  completed:  '✅ DONE',
  delivered:  '📦 DELIVERED',
  cancelled:  '❌ CANCELLED',
  rejected:   '🚫 REJECTED',
}

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (d < 1) return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
}

type Props = {
  item:    OrderRow
  onPress: () => void
}

export default function CustomOrderCard({ item, onPress }: Props) {
  const rawCat = (item as any).custom_category ?? ''
  const cats: string[] = Array.isArray(rawCat)
    ? rawCat
    : typeof rawCat === 'string' && rawCat
      ? rawCat.split(',').map((s: string) => s.trim())
      : []
  const primaryCat = cats[0] ?? 'other'
  const catEmoji   = CAT_EMOJI[primaryCat] ?? '📦'

  const customStatus = (item as any).custom_order_status ?? item.status
  const statusColor  = CUSTOM_STATUS_COLORS[customStatus] ?? STATUS_COLORS[item.status] ?? '#888'
  const statusLabel  = CUSTOM_STATUS_LABELS[customStatus] ?? STATUS_LABELS[item.status] ?? item.status.toUpperCase()

  const isQuoted   = customStatus === 'quoted'
  const quotedAmt  = (item as any).quoted_amount
  const quoteMsg   = (item as any).quote_message

  const itemNames  = (item.items ?? []).slice(0, 2).map((i: any) => i.name).join(', ')
  const extraItems = (item.items ?? []).length - 2

  // ── Fee & total ────────────────────────────────────────────────────────────
  const deliveryFee = Number(item.delivery_fee ?? 0)
  const totalAmt    = Number(item.total_amount ?? 0)
  const distKm      = item.delivery_distance_km
    ? Number(item.delivery_distance_km).toFixed(1)
    : null

  return (
    <TouchableOpacity style={S.card} onPress={onPress} activeOpacity={0.85}>

      {/* ── Left accent bar ── */}
      <View style={S.accentBar} />

      <View style={{ flex: 1 }}>
        {/* ── Header row ── */}
        <View style={S.headerRow}>
          <View style={{ flex: 1 }}>
            <View style={S.chipRow}>
              <Text style={S.orderNum}>#{item.order_number}</Text>
              <View style={S.customChip}>
                <Text style={{ color: '#065F46', fontSize: 9, fontWeight: '800' }}>✏️ CUSTOM</Text>
              </View>
              {isQuoted && (
                <View style={S.quoteChip}>
                  <Text style={{ color: '#1D4ED8', fontSize: 9, fontWeight: '800' }}>💬 QUOTED</Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <Text style={S.refTxt}>Ref: {(item as any).custom_order_ref ?? '—'}</Text>
              <Text style={S.timeTxt}>{timeAgo(item.created_at)}</Text>
            </View>
          </View>

          <View style={[S.statusPill, { backgroundColor: statusColor }]}>
            <Text style={S.statusTxt}>{statusLabel}</Text>
          </View>
        </View>

        {/* ── Category chips ── */}
        {cats.length > 0 && (
          <View style={S.catRow}>
            {cats.slice(0, 4).map(c => (
              <View
                key={c}
                style={[S.catChip, { backgroundColor: (CAT_COLORS[c] ?? CAT_COLORS.other).bg }]}
              >
                <Text style={{ fontSize: 11 }}>{CAT_EMOJI[c] ?? '📦'}</Text>
                <Text style={[S.catTxt, { color: (CAT_COLORS[c] ?? CAT_COLORS.other).text }]}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </Text>
              </View>
            ))}
            {cats.length > 4 && (
              <Text style={S.moreCatsTxt}>+{cats.length - 4} more</Text>
            )}
          </View>
        )}

        {/* ── Description ── */}
        <Text style={S.descTxt} numberOfLines={2}>
          {itemNames
            ? `${catEmoji} ${itemNames}${extraItems > 0 ? ` +${extraItems} more` : ''}`
            : `${catEmoji} Custom ${primaryCat} request`}
        </Text>

        {/* ── Delivery fee row ── */}
        <View style={S.feeRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 12 }}>🚚</Text>
            <Text style={S.feeTxt}>
              {deliveryFee > 0 ? `₹${deliveryFee}` : '₹35 (est.)'}
            </Text>
            {distKm && (
              <Text style={S.distTxt}>· {distKm} km</Text>
            )}
          </View>
          {totalAmt > 0 && (
            <Text style={S.totalTxt}>Total ₹{totalAmt.toFixed(0)}</Text>
          )}
        </View>

        {/* ── Quote banner ── */}
        {isQuoted && quotedAmt ? (
          <View style={S.quoteBanner}>
            <View style={{ flex: 1 }}>
              <Text style={S.quoteTitle}>💰 Quote received — ₹{Number(quotedAmt).toFixed(2)}</Text>
              {quoteMsg ? (
                <Text style={S.quoteSub} numberOfLines={2}>{quoteMsg}</Text>
              ) : null}
            </View>
            <View style={S.acceptBtn}>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>Tap to review →</Text>
            </View>
          </View>
        ) : null}

        {/* ── Footer ── */}
        <View style={S.footer}>
          <Text style={S.payTxt}>
            {item.payment_method?.toUpperCase() ?? 'COD'}
            {' · '}
            {item.payment_status?.toUpperCase() ?? 'PENDING'}
          </Text>
          <Text style={S.viewTxt}>View details →</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const S = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 16, flexDirection: 'row',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, overflow: 'hidden',
  },
  accentBar:   { width: 4, backgroundColor: '#065F46', borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
  headerRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 12, paddingBottom: 6 },
  chipRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  orderNum:    { fontSize: 15, fontWeight: '800', color: '#1F2937' },
  refTxt:      { fontSize: 10, color: '#9CA3AF', fontWeight: '600' },
  timeTxt:     { fontSize: 10, color: '#D1D5DB' },
  customChip:  { backgroundColor: '#D1FAE5', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  quoteChip:   { backgroundColor: '#DBEAFE', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  statusPill:  { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, margin: 12, marginLeft: 8 },
  statusTxt:   { color: '#fff', fontSize: 9, fontWeight: '800' },
  catRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 12, marginBottom: 6 },
  catChip:     { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  catTxt:      { fontSize: 10, fontWeight: '700' },
  moreCatsTxt: { fontSize: 10, color: '#9CA3AF', alignSelf: 'center' },
  descTxt:     { fontSize: 12, color: '#6B7280', lineHeight: 18, paddingHorizontal: 12, marginBottom: 8 },

  // ── Delivery fee row ──
  feeRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#F0FDF4', marginHorizontal: 12, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, marginBottom: 8,
  },
  feeTxt:   { fontSize: 12, fontWeight: '800', color: '#065F46' },
  distTxt:  { fontSize: 11, color: '#6B7280' },
  totalTxt: { fontSize: 13, fontWeight: '900', color: COLORS.primary },

  quoteBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF',
    marginHorizontal: 12, borderRadius: 10, padding: 10, marginBottom: 8,
    borderWidth: 1, borderColor: '#BFDBFE', gap: 8,
  },
  quoteTitle: { fontSize: 12, fontWeight: '800', color: '#1D4ED8' },
  quoteSub:   { fontSize: 11, color: '#374151', marginTop: 2 },
  acceptBtn:  { backgroundColor: '#2563EB', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  footer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 12, paddingBottom: 12, paddingTop: 4,
    borderTopWidth: 1, borderTopColor: '#F9FAFB',
  },
  payTxt:  { fontSize: 11, color: '#9CA3AF' },
  viewTxt: { fontSize: 12, color: COLORS.primary, fontWeight: '700' },
})
