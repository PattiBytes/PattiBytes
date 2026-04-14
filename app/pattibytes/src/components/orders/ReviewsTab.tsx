// src/components/orders/ReviewsTab.tsx

import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  LayoutAnimation,
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { COLORS } from '../../lib/constants'
import ReviewSection from './ReviewSection'
import type { OrderRow, ReviewData } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ReviewMeta {
  orderId: string
  data:    ReviewData | null
  loading: boolean
}

interface Props {
  userId:          string
  deliveredOrders: OrderRow[]
  onRefresh?:      () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants & helpers
// ─────────────────────────────────────────────────────────────────────────────

const STAR_LABELS: Record<number, string> = {
  5: 'Excellent!', 4: 'Good', 3: 'Okay', 2: 'Not great', 1: 'Poor',
}

function isStoreOrder(o: OrderRow)  { return o.order_type === 'store' || o.merchant_id === null }
function isCustomOrder(o: OrderRow) { return o.order_type === 'custom' }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components (defined outside parent — stable references)
// ─────────────────────────────────────────────────────────────────────────────

function SummaryBanner({
  total,
  pending,
  done,
}: {
  total:   number
  pending: number
  done:    number
}) {
  return (
    <View style={S.summaryBanner}>
      <View style={S.summaryItem}>
        <Text style={S.summaryNum}>{total}</Text>
        <Text style={S.summaryLbl}>Total</Text>
      </View>
      <View style={S.summaryDivider} />
      <View style={S.summaryItem}>
        <Text style={[S.summaryNum, { color: '#F97316' }]}>{pending}</Text>
        <Text style={S.summaryLbl}>Pending</Text>
      </View>
      <View style={S.summaryDivider} />
      <View style={S.summaryItem}>
        <Text style={[S.summaryNum, { color: '#16A34A' }]}>{done}</Text>
        <Text style={S.summaryLbl}>Reviewed</Text>
      </View>
    </View>
  )
}

function EmptyState({ filter }: { filter: 'all' | 'pending' | 'done' }) {
  if (filter === 'all') {
    return (
      <View style={S.empty}>
        <Text style={{ fontSize: 44, marginBottom: 12 }}>📦</Text>
        <Text style={S.emptyTitle}>No delivered orders yet</Text>
        <Text style={S.emptySubtitle}>
          Delivered orders will appear here for you to review.
        </Text>
      </View>
    )
  }
  return (
    <View style={S.empty}>
      <Text style={{ fontSize: 36, marginBottom: 10 }}>
        {filter === 'pending' ? '🎉' : '📝'}
      </Text>
      <Text style={[S.emptyTitle, { fontSize: 15 }]}>
        {filter === 'pending'
          ? 'All caught up! No pending reviews.'
          : 'No reviewed orders yet.'}
      </Text>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function ReviewsTab({ userId, deliveredOrders, onRefresh }: Props) {
  const router = useRouter()

  const [reviews,    setReviews]    = useState<Record<string, ReviewMeta>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter,     setFilter]     = useState<'all' | 'pending' | 'done'>('all')
  const loadedRef = useRef(false)

  // ─────────────────────────────────────────────────────────────────────────
  // Batch-load all reviews for delivered orders
  // ─────────────────────────────────────────────────────────────────────────

  const loadReviews = useCallback(async () => {
    if (!deliveredOrders.length) return

    const orderIds = deliveredOrders.map(o => o.id)

    // Seed loading state
    const init: Record<string, ReviewMeta> = {}
    orderIds.forEach(id => { init[id] = { orderId: id, data: null, loading: true } })
    setReviews(init)

    const { data } = await supabase
      .from('reviews')
      .select('*')
      .in('order_id', orderIds)
      .eq('customer_id', userId)

    const map: Record<string, ReviewData> = {}
    ;(data ?? []).forEach((r: any) => { map[r.order_id] = r as ReviewData })

    const updated: Record<string, ReviewMeta> = {}
    orderIds.forEach(id => {
      updated[id] = { orderId: id, data: map[id] ?? null, loading: false }
    })
    setReviews(updated)
  }, [deliveredOrders, userId])

  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true
      loadReviews()
    }
  }, [loadReviews])

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────

  const handleToggleExpand = (orderId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpandedId(prev => (prev === orderId ? null : orderId))
  }

  const handleReviewDone = (orderId: string, review: ReviewData) => {
    setReviews(prev => ({
      ...prev,
      [orderId]: { orderId, data: review, loading: false },
    }))
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpandedId(null)
    onRefresh?.()
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Derived counts & filtered list
  // ─────────────────────────────────────────────────────────────────────────

  const pendingCount = deliveredOrders.filter(o => !reviews[o.id]?.data).length
  const doneCount    = deliveredOrders.filter(o =>  !!reviews[o.id]?.data).length

  const filtered = deliveredOrders.filter(o => {
    const meta = reviews[o.id]
    if (filter === 'pending') return !meta?.data
    if (filter === 'done')    return !!meta?.data
    return true
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Render each order card
  // ─────────────────────────────────────────────────────────────────────────

  const renderItem = ({ item: order }: { item: OrderRow }) => {
    const meta       = reviews[order.id]
    const isLoading  = meta?.loading ?? true
    const review     = meta?.data ?? null
    const isStore    = isStoreOrder(order)
    const isCustom   = isCustomOrder(order)
    const isExpanded = expandedId === order.id
    const itemCount  = (order.items ?? []).reduce(
      (s: number, i: any) => s + (i.quantity ?? 1), 0,
    )

    return (
      <View style={[S.card, isExpanded && S.cardExpanded]}>

        {/* ── Order header (tap to expand) ──────────────────────────── */}
        <TouchableOpacity
          style={S.cardHeader}
          onPress={() => handleToggleExpand(order.id)}
          activeOpacity={0.8}
        >
          {/* Left: order meta */}
          <View style={S.orderMeta}>
            {/* Merchant icon + name */}
            <View style={S.merchantRow}>
              <Text style={{ fontSize: 18 }}>
                {isCustom ? '✏️' : isStore ? '🛍️' : '🏪'}
              </Text>
              <Text style={S.merchantName} numberOfLines={1}>
                {order.merchant_name ?? (isStore ? 'PBExpress Store' : 'Restaurant')}
              </Text>
            </View>

            {/* Order number · date · price */}
            <View style={S.metaRow}>
              <Text style={S.orderNum}>#{order.order_number}</Text>
              <Text style={S.dot}>·</Text>
              <Text style={S.dateText}>{fmtDate(order.created_at)}</Text>
              <Text style={S.dot}>·</Text>
              <Text style={S.priceText}>₹{Number(order.total_amount).toFixed(0)}</Text>
            </View>

            {/* Items preview */}
            <Text style={S.itemsPreview} numberOfLines={1}>
              {(order.items ?? []).slice(0, 3).map((i: any) => i.name).join(' · ')}
              {(order.items ?? []).length > 3
                ? ` +${(order.items ?? []).length - 3} more`
                : ''}
              {' '}· {itemCount} item{itemCount !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* Right: review status badge */}
          <View style={S.statusCol}>
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : review ? (
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <View style={S.reviewedBadge}>
                  <Text style={{ color: '#15803D', fontSize: 10, fontWeight: '800' }}>
                    ✓ REVIEWED
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 1 }}>
                  {[1, 2, 3, 4, 5].map(s => (
                    <Text
                      key={s}
                      style={{
                        fontSize: 14,
                        opacity: s <= (review.overall_rating ?? review.rating ?? 0) ? 1 : 0.2,
                      }}
                    >
                      ⭐
                    </Text>
                  ))}
                </View>
                <Text style={{ fontSize: 10, color: '#9CA3AF' }}>
                  {STAR_LABELS[review.overall_rating ?? review.rating ?? 3]}
                </Text>
              </View>
            ) : (
              <View style={S.pendingBadge}>
                <Text style={{ color: '#F97316', fontSize: 10, fontWeight: '800' }}>⭐ RATE</Text>
              </View>
            )}

            <Text style={{ color: '#9CA3AF', fontSize: 18, marginTop: 4 }}>
              {isExpanded ? '▲' : '▼'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* ── Collapsed: comment preview ────────────────────────────── */}
        {!isExpanded && review?.comment && (
          <View style={S.commentPreview}>
            <Text style={{ fontSize: 12, color: '#4B5563', lineHeight: 18 }} numberOfLines={2}>
              &quot;{review.comment}&quot;
            </Text>
          </View>
        )}

        {/* ── Collapsed: per-item rating pills ─────────────────────── */}
        {!isExpanded && review && (review.item_ratings ?? []).length > 0 && (
          <View style={S.pillRow}>
            {(review.item_ratings ?? []).slice(0, 3).map(ir => (
              <View key={ir.item_id} style={S.pill}>
                <Text
                  style={{ fontSize: 10, color: '#374151', fontWeight: '600' }}
                  numberOfLines={1}
                >
                  {ir.item_name.split(' ').slice(0, 2).join(' ')}
                </Text>
                <Text style={{ fontSize: 10, color: '#F59E0B' }}>
                  {' '}{'⭐'.repeat(ir.rating)}
                </Text>
              </View>
            ))}
            {(review.item_ratings ?? []).length > 3 && (
              <View style={S.pill}>
                <Text style={{ fontSize: 10, color: '#9CA3AF' }}>
                  +{(review.item_ratings ?? []).length - 3} more
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Collapsed: action buttons ─────────────────────────────── */}
        {!isExpanded && (
          <View style={S.cardActions}>
            <TouchableOpacity
              style={[S.actionBtn, { backgroundColor: COLORS.primary }]}
              onPress={() => handleToggleExpand(order.id)}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>
                {review ? '✏️ Edit Review' : '⭐ Write Review'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={S.actionBtnSecondary}
              onPress={() => router.push(`/(customer)/orders/${order.id}` as any)}
            >
              <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 13 }}>
                View Order →
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Expanded: full ReviewSection ──────────────────────────── */}
        {isExpanded && (
          <View style={S.reviewSectionWrap}>
            {/* Collapse handle */}
            <TouchableOpacity
              style={S.dismissBar}
              onPress={() => handleToggleExpand(order.id)}
            >
              <View style={S.dismissHandle} />
              <Text style={{ fontSize: 11, color: '#9CA3AF' }}>Tap to collapse</Text>
            </TouchableOpacity>

            <ReviewSection
              orderId={order.id}
              customerId={userId}
              merchantId={order.merchant_id}
              driverId={order.driver_id}
              orderItems={order.items ?? []}
              isStore={isStore}
              isCustom={isCustom}
              onDone={rev => handleReviewDone(order.id, rev)}
            />
          </View>
        )}
      </View>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Empty state (no delivered orders at all)
  // ─────────────────────────────────────────────────────────────────────────

  if (!deliveredOrders.length) return <EmptyState filter="all" />

  // ─────────────────────────────────────────────────────────────────────────
  // Main render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1 }}>

      {/* Summary banner */}
      <SummaryBanner
        total={deliveredOrders.length}
        pending={pendingCount}
        done={doneCount}
      />

      {/* Filter chips */}
      <View style={S.filterRow}>
        {(
          [
            { key: 'all',     label: 'All',        count: deliveredOrders.length },
            { key: 'pending', label: '⭐ Pending',  count: pendingCount },
            { key: 'done',    label: '✅ Reviewed', count: doneCount },
          ] as const
        ).map(f => (
          <TouchableOpacity
            key={f.key}
            style={[S.filterChip, filter === f.key && S.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[S.filterTxt, filter === f.key && S.filterTxtActive]}>
              {f.label}
            </Text>
            {f.count > 0 && (
              <View style={[
                S.filterBadge,
                filter === f.key && { backgroundColor: COLORS.primary },
              ]}>
                <Text style={{
                  color: filter === f.key ? '#fff' : '#6B7280',
                  fontSize: 10,
                  fontWeight: '800',
                }}>
                  {f.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Order list */}
      <FlatList
        data={filtered}
        keyExtractor={o => o.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState filter={filter} />}
      />
    </View>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const S = StyleSheet.create({

  // ── Summary banner ──────────────────────────────────────────────────────
  summaryBanner: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNum: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1F2937',
  },
  summaryLbl: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },

  // ── Filter chips ─────────────────────────────────────────────────────────
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#F8F9FA',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFF3EE',
  },
  filterTxt: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterTxtActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  filterBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },

  // ── Card ─────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  cardExpanded: {
    borderWidth: 1.5,
    borderColor: COLORS.primary + '40',
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },

  // ── Order meta ────────────────────────────────────────────────────────────
  orderMeta: {
    flex: 1,
  },
  merchantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  merchantName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F2937',
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderNum: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
  },
  dot: {
    color: '#D1D5DB',
    fontSize: 12,
  },
  dateText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  priceText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },
  itemsPreview: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 5,
  },

  // ── Status column ─────────────────────────────────────────────────────────
  statusCol: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  reviewedBadge: {
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pendingBadge: {
    backgroundColor: '#FFF7ED',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },

  // ── Comment preview & pills ───────────────────────────────────────────────
  commentPreview: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary + '40',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  pill: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  // ── Action buttons ────────────────────────────────────────────────────────
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  actionBtn: {
    flex: 2,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionBtnSecondary: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },

  // ── Expanded review wrapper ───────────────────────────────────────────────
  reviewSectionWrap: {
    marginTop: 8,
  },
  dismissBar: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  dismissHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
  },

  // ── Empty state ───────────────────────────────────────────────────────────
  empty: {
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontWeight: '800',
    fontSize: 17,
    color: '#1F2937',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },
})