import React from 'react'
import { View, Text, Image, StyleSheet } from 'react-native'
import type { OrderDetail } from './types'

const CUSTOM_STATUS_LABELS: Record<string, string> = {
  pending:    'PENDING REVIEW',
  reviewing:  'UNDER REVIEW',
  quoted:     'QUOTE RECEIVED',
  confirmed:  'CONFIRMED',
  preparing:  'BEING PREPARED',
  dispatched: 'DISPATCHED',
  delivered:  'DELIVERED',
  cancelled:  'CANCELLED',
  rejected:   'REQUEST REJECTED',
}

const CUSTOM_STATUS_EMOJIS: Record<string, string> = {
  pending:    '📝',
  reviewing:  '🔍',
  quoted:     '💬',
  confirmed:  '✅',
  preparing:  '📦',
  dispatched: '🚚',
  delivered:  '🎉',
  cancelled:  '❌',
  rejected:   '🚫',
}

export default function StatusHero({ order }: { order: OrderDetail }) {
  const isStore    = order.order_type === 'store'  || order.merchant_id === null
  const isCustom   = order.order_type === 'custom'
  const isDelivered = order.status === 'delivered'
  const isCancelled = order.status === 'cancelled'
  const isActive   = !isDelivered && !isCancelled

  // For custom orders, use custom_order_status for display
  const customStatus = isCustom
    ? ((order as any).custom_order_status ?? order.status)
    : null

  const bg =
    isCancelled || customStatus === 'rejected' ? '#EF4444'
    : isDelivered || customStatus === 'delivered' ? '#10B981'
    : isCustom    ? '#065F46'
    : isStore     ? '#5B21B6'
    : '#FF6B35'

  const emoji = isCustom
    ? (CUSTOM_STATUS_EMOJIS[customStatus ?? ''] ?? '✏️')
    : isDelivered ? '🎉'
    : isCancelled ? '❌'
    : isStore     ? '🛍️'
    : isActive    ? '🔄'
    : '📋'

  const statusLabel = isCustom
    ? (CUSTOM_STATUS_LABELS[customStatus ?? ''] ?? customStatus?.toUpperCase() ?? 'CUSTOM ORDER')
    : order.status.replace(/_/g, ' ').toUpperCase()

  // Custom order reference image
  const customImageUrl: string | null = (order as any).custom_image_url ?? null

  // Parse categories for display
  const rawCat = (order as any).custom_category ?? ''
  const cats: string[] = Array.isArray(rawCat)
    ? rawCat
    : typeof rawCat === 'string' && rawCat
      ? rawCat.split(',').map((s: string) => s.trim())
      : []

  return (
    <View style={[S.hero, { backgroundColor: bg }]}>

      {/* ── Custom order image (top of hero) ── */}
      {isCustom && customImageUrl && (
        <Image
          source={{ uri: customImageUrl }}
          style={S.heroImage}
          resizeMode="cover"
        />
      )}

      <Text style={{ fontSize: 52, marginBottom: 10 }}>{emoji}</Text>
      <Text style={S.status}>{statusLabel}</Text>
      <Text style={S.sub}>Order #{order.order_number}</Text>

      {/* ── Custom order ref chip ── */}
      {isCustom && (order as any).custom_order_ref && (
        <View style={S.refChip}>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', fontFamily: 'monospace' }}>
            {(order as any).custom_order_ref}
          </Text>
        </View>
      )}

      {/* ── Category chips ── */}
      {isCustom && cats.length > 0 && (
        <View style={S.catRow}>
          {cats.slice(0, 4).map(c => (
            <View key={c} style={S.catChip}>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </Text>
            </View>
          ))}
          {cats.length > 4 && (
            <View style={S.catChip}>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                +{cats.length - 4} more
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ── Store chip ── */}
      {(isStore || isCustom) && !(order as any).custom_order_ref && (
        <View style={S.chip}>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
            {isCustom
              ? '✏️ Custom Order · PBExpress'
              : '🛍️ PBExpress Store · Patti, Punjab'}
          </Text>
        </View>
      )}

      {/* ── Quoted amount badge ── */}
      {isCustom && customStatus === 'quoted' && (order as any).quoted_amount && (
        <View style={S.quotedChip}>
          <Text style={{ color: '#D97706', fontWeight: '800', fontSize: 12 }}>
            💰 Quoted: ₹{Number((order as any).quoted_amount).toFixed(0)}
          </Text>
        </View>
      )}

      {/* ── ETA chip ── */}
      {isActive && !isCustom && order.estimated_delivery_time && (
        <View style={S.eta}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
            🕐 ETA{' '}
            {new Date(order.estimated_delivery_time).toLocaleTimeString('en-IN', {
              hour: '2-digit', minute: '2-digit',
            })}
          </Text>
        </View>
      )}

      {/* ── Delivered at ── */}
      {isDelivered && order.actual_delivery_time && (
        <View style={S.eta}>
          <Text style={{ color: '#fff', fontSize: 12 }}>
            ✅ Delivered at{' '}
            {new Date(order.actual_delivery_time).toLocaleTimeString('en-IN', {
              hour: '2-digit', minute: '2-digit',
            })}
          </Text>
        </View>
      )}
    </View>
  )
}

const S = StyleSheet.create({
  hero:       { padding: 28, alignItems: 'center' },
  heroImage:  { width: 90, height: 90, borderRadius: 45, marginBottom: 12, borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)' },
  status:     { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 4, textAlign: 'center' },
  sub:        { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  refChip:    { marginTop: 8, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5 },
  catRow:     { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 10 },
  catChip:    { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  chip:       { marginTop: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  quotedChip: { marginTop: 8, backgroundColor: '#FEF3C7', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6 },
  eta:        { marginTop: 10, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
})
