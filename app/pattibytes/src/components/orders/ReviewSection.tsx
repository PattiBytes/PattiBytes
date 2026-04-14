// src/components/orders/ReviewSection.tsx

import React, { useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { COLORS } from '../../lib/constants'
import { supabase } from '../../lib/supabase'
import { STAR_LABELS } from './constants'
import type { ReviewData, ItemRating, OrderItem } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Tab = 'overall' | 'items' | 'delivery'

interface Props {
  orderId:       string
  customerId:    string
  merchantId:    string | null
  driverId:      string | null
  orderItems:    OrderItem[]
  isStore:       boolean
  isCustom:      boolean
  merchantName?: string | null
  onDone?:       (review: ReviewData) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

// Matches exact columns in the `reviews` table
const REVIEW_SELECT =
  'id,order_id,customer_id,merchant_id,driver_id,' +
  'rating,overall_rating,merchant_rating,driver_rating,food_rating,delivery_rating,' +
  'comment,title,item_ratings,images,created_at,updated_at'

const DELIVERY_SEP = '\n\n---Delivery feedback---\n'

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'overall',  label: 'Overall',  emoji: '🌟' },
  { key: 'items',    label: 'Items',    emoji: '🍽️' },
  { key: 'delivery', label: 'Delivery', emoji: '🚚' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components (defined outside parent — stable reference, no remount)
// ─────────────────────────────────────────────────────────────────────────────

function MerchantBadge({
  merchantName,
  isStore,
  isCustom,
}: {
  merchantName?: string | null
  isStore:       boolean
  isCustom:      boolean
}) {
  if (!merchantName) return null
  return (
    <View style={S.merchantBadge}>
      <Text style={S.merchantBadgeText}>
        {isStore ? '🏪' : isCustom ? '🎁' : '🍽️'}{'  '}{merchantName}
      </Text>
    </View>
  )
}

function StarRow({
  value,
  onChange,
  size = 34,
}: {
  value:    number
  onChange: (n: number) => void
  size?:    number
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <TouchableOpacity key={s} onPress={() => onChange(s)} activeOpacity={0.7}>
          <Text style={{ fontSize: size, color: s <= value ? '#F59E0B' : '#D1D5DB' }}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

function BreakdownRow({
  emoji,
  label,
  rating,
}: {
  emoji:  string
  label:  string
  rating: number
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '600' }}>
        {emoji} {label}
      </Text>
      <View style={{ flexDirection: 'row', gap: 1 }}>
        {[1, 2, 3, 4, 5].map(s => (
          <Text key={s} style={{ fontSize: 13, color: s <= rating ? '#F59E0B' : '#D1D5DB' }}>
            ★
          </Text>
        ))}
      </View>
    </View>
  )
}

function ReviewSkeleton() {
  return (
    <View style={[S.section, { gap: 12 }]}>
      <View style={{ height: 32, backgroundColor: '#F3F4F6', borderRadius: 8, width: '40%' }} />
      <View style={{ height: 18, backgroundColor: '#F3F4F6', borderRadius: 8, width: '70%' }} />
      <View style={{ height: 18, backgroundColor: '#F3F4F6', borderRadius: 8, width: '55%' }} />
    </View>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function ReviewSection({
  orderId,
  customerId,
  merchantId,
  driverId,
  orderItems,
  isStore,
  isCustom,
  merchantName,
  onDone,
}: Props) {

  // ── State: review lifecycle ───────────────────────────────────────────────
  const [existing,   setExisting]   = useState<ReviewData | null>(null)
  const [loadingRev, setLoadingRev] = useState(true)
  const [editing,    setEditing]    = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab,  setActiveTab]  = useState<Tab>('overall')

  // ── State: overall tab ────────────────────────────────────────────────────
  const [overallRating, setOverallRating] = useState(5)
  const [title,         setTitle]         = useState('')
  const [comment,       setComment]       = useState('')

  // ── State: items tab ──────────────────────────────────────────────────────
  const [itemRatings, setItemRatings] = useState<Record<string, ItemRating>>({})

  // ── State: delivery tab ───────────────────────────────────────────────────
  const [foodRating,     setFoodRating]     = useState(5)
  const [driverRating,   setDriverRating]   = useState(5)
  const [deliveryRating, setDeliveryRating] = useState(5)
  const [deliveryNote,   setDeliveryNote]   = useState('')

  // ── Derived: reviewable items (stable reference for useEffect deps) ────────
  const reviewableItems = useMemo(
    () => orderItems.filter(i => !i.is_free && (i.price ?? 0) > 0),
    [orderItems],
  )

  // ─────────────────────────────────────────────────────────────────────────
  // Load existing review
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoadingRev(true)
      const { data } = await supabase
        .from('reviews')
        .select(REVIEW_SELECT)
        .eq('order_id', orderId)
        .eq('customer_id', customerId)
        .maybeSingle()

      if (cancelled) return

      if (data) {
        const rev = data as unknown as ReviewData
        setExisting(rev)
        setOverallRating(rev.overall_rating ?? rev.rating ?? 5)
        setTitle(rev.title ?? '')

        // Split stored delivery note back out of the comment field
        const rawComment = rev.comment ?? ''
        const sepIdx     = rawComment.indexOf(DELIVERY_SEP)
        if (sepIdx !== -1) {
          setComment(rawComment.slice(0, sepIdx))
          setDeliveryNote(rawComment.slice(sepIdx + DELIVERY_SEP.length))
        } else {
          setComment(rawComment)
          setDeliveryNote('')
        }

        setFoodRating(rev.food_rating ?? 5)
        setDriverRating(rev.driver_rating ?? 5)
        setDeliveryRating(rev.delivery_rating ?? 5)

        const irMap: Record<string, ItemRating> = {}
        ;(rev.item_ratings ?? []).forEach(ir => { irMap[ir.item_id] = ir })
        setItemRatings(irMap)
      } else {
        // Pre-seed item ratings at 5
        const irMap: Record<string, ItemRating> = {}
        reviewableItems.forEach(i => {
          irMap[i.id] = { item_id: i.id, item_name: i.name, rating: 5 }
        })
        setItemRatings(irMap)
      }

      setLoadingRev(false)
    }

    load()
    return () => { cancelled = true }
  }, [orderId, customerId, reviewableItems])

  // ─────────────────────────────────────────────────────────────────────────
  // Item rating helpers
  // ─────────────────────────────────────────────────────────────────────────

  const setItemRating = (itemId: string, itemName: string, rating: number) =>
    setItemRatings(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], item_id: itemId, item_name: itemName, rating },
    }))

  const setItemComment = (itemId: string, itemName: string, note: string) =>
    setItemRatings(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], item_id: itemId, item_name: itemName, comment: note },
    }))

  // ─────────────────────────────────────────────────────────────────────────
  // Submit
  // ─────────────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (overallRating < 1) return
    setSubmitting(true)

    const now            = new Date().toISOString()
    const itemRatingsArr = Object.values(itemRatings)
    const finalComment   =
      [comment.trim(), deliveryNote.trim()].filter(Boolean).join(DELIVERY_SEP) || null

    const payload: Record<string, any> = {
      order_id:        orderId,
      customer_id:     customerId,
      merchant_id:     merchantId,
      driver_id:       driverId,
      rating:          overallRating,
      overall_rating:  overallRating,
      food_rating:     isStore || isCustom ? null : foodRating,
      merchant_rating: merchantId ? overallRating : null,
      driver_rating:   driverId  ? driverRating  : null,
      delivery_rating: deliveryRating,
      comment:         finalComment,
      title:           title.trim() || null,
      item_ratings:    itemRatingsArr.length > 0 ? itemRatingsArr : [],
      updated_at:      now,
      ...(existing ? {} : { created_at: now }),
    }

    const showErr = (step: string, err: any) => {
      console.error(`[reviews.${step}]`, JSON.stringify(err, null, 2))
      Alert.alert(
        `Submit failed: ${step}`,
        [
          err?.message ?? 'Unknown error',
          `code: ${err?.code ?? '—'}`,
          `details: ${err?.details ?? '—'}`,
          `hint: ${err?.hint ?? '—'}`,
        ].join('\n'),
      )
    }

    try {
      // 1. Upsert review
      const r1 = await supabase
        .from('reviews')
        .upsert(payload, { onConflict: 'order_id,customer_id' })
        .select(REVIEW_SELECT)
        .single()

      if (r1.error) { showErr('upsert', r1.error); return }

      // 2. Sync rating + review text back to the order row
      const r2 = await supabase
        .from('orders')
        .update({ rating: overallRating, review: comment.trim() || null })
        .eq('id', orderId)
        .eq('customer_id', customerId)   // satisfies RLS USING clause

      if (r2.error) { showErr('orders.update', r2.error); return }

      setExisting(r1.data as unknown as ReviewData)
      setEditing(false)
      Alert.alert(
        '🙏 Thank You!',
        existing ? 'Your review has been updated!' : 'Your review has been submitted!',
      )
      onDone?.(r1.data as unknown as ReviewData)
    } catch (e: any) {
      console.error('[handleSubmit.catch]', e)
      Alert.alert('Error', e?.message ?? 'Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Loading state
  // ─────────────────────────────────────────────────────────────────────────

  if (loadingRev) return <ReviewSkeleton />

  // ─────────────────────────────────────────────────────────────────────────
  // Read-only (submitted) view
  // ─────────────────────────────────────────────────────────────────────────

  if (existing && !editing) {
    const displayRating = existing.overall_rating ?? existing.rating ?? 0

    return (
      <View style={S.section}>
        <MerchantBadge merchantName={merchantName} isStore={isStore} isCustom={isCustom} />

        {/* Header row */}
        <View style={S.reviewedHeader}>
          <View style={{ flex: 1 }}>
            <Text style={S.sectionTitle}>⭐ Your Review</Text>
            {existing.title ? (
              <Text style={S.reviewTitle}>{existing.title}</Text>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 2, marginTop: 6 }}>
              {[1, 2, 3, 4, 5].map(s => (
                <Text
                  key={s}
                  style={{ fontSize: 22, color: s <= displayRating ? '#F59E0B' : '#D1D5DB' }}
                >
                  ★
                </Text>
              ))}
            </View>
            <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
              {STAR_LABELS[displayRating] ?? ''}
            </Text>
          </View>

          <TouchableOpacity style={S.editBtn} onPress={() => setEditing(true)}>
            <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 13 }}>✏️ Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Comment bubble */}
      {(() => {
  const raw      = existing.comment ?? ''
  const sepIdx   = raw.indexOf(DELIVERY_SEP)
  const mainText = sepIdx !== -1 ? raw.slice(0, sepIdx).trim()           : raw.trim()
  const dlvText  = sepIdx !== -1 ? raw.slice(sepIdx + DELIVERY_SEP.length).trim() : null

  return (
    <>
      {/* Main comment */}
      {mainText ? (
        <View style={S.commentBubble}>
          <Text style={{ fontSize: 13, color: '#374151', lineHeight: 20 }}>
            {mainText}
          </Text>
        </View>
      ) : null}

      {/* Delivery feedback — only shown if it was saved */}
      {dlvText ? (
        <View style={S.deliveryFeedbackWrap}>
          {/* Divider with label */}
          <View style={S.dividerRow}>
            <View style={S.dividerLine} />
            <Text style={S.dividerLabel}>🚚 Delivery Feedback</Text>
            <View style={S.dividerLine} />
          </View>

          <View style={S.deliveryFeedbackBubble}>
            <Text style={{ fontSize: 13, color: '#92400E', lineHeight: 20 }}>
              {dlvText}
            </Text>
          </View>
        </View>
      ) : null}
    </>
  )
})()}

        {/* Per-item ratings */}
        {(existing.item_ratings ?? []).length > 0 && (
          <View style={S.itemRatingsWrap}>
            <Text style={S.subHead}>🍽️ Item Ratings</Text>
            {(existing.item_ratings ?? []).map(ir => (
              <View key={ir.item_id} style={S.irRow}>
                <Text style={S.irName} numberOfLines={1}>{ir.item_name}</Text>
                <View style={{ flexDirection: 'row', gap: 1 }}>
                  {[1, 2, 3, 4, 5].map(s => (
                    <Text
                      key={s}
                      style={{ fontSize: 13, color: s <= ir.rating ? '#F59E0B' : '#D1D5DB' }}
                    >
                      ★
                    </Text>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Sub-rating breakdown */}
        <View style={S.breakdown}>
          {!isStore && !isCustom && existing.food_rating ? (
            <BreakdownRow emoji="🍔" label="Food" rating={existing.food_rating} />
          ) : null}
          {driverId && existing.driver_rating ? (
            <BreakdownRow emoji="🛵" label="Driver" rating={existing.driver_rating} />
          ) : null}
          {existing.delivery_rating ? (
            <BreakdownRow emoji="🚚" label="Delivery" rating={existing.delivery_rating} />
          ) : null}
        </View>

        <Text style={S.reviewDate}>
          Reviewed{' '}
          {new Date(existing.updated_at ?? existing.created_at).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
          })}
        </Text>
      </View>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Form (write) view
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <View style={S.section}>
      <MerchantBadge merchantName={merchantName} isStore={isStore} isCustom={isCustom} />

      {/* Title row */}
      <View style={S.formTitleRow}>
        <Text style={S.sectionTitle}>
          {existing ? '✏️ Edit Your Review' : '⭐ Rate Your Experience'}
        </Text>
        {editing && (
          <TouchableOpacity onPress={() => setEditing(false)}>
            <Text style={{ color: '#9CA3AF', fontSize: 13 }}>✕ Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tab bar */}
      <View style={S.tabRow}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[S.tab, activeTab === t.key && S.tabActive]}
            onPress={() => setActiveTab(t.key)}
          >
            <Text style={{ fontSize: 13 }}>{t.emoji}</Text>
            <Text style={[S.tabLbl, activeTab === t.key && S.tabLblActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Overall tab ────────────────────────────────────────────────── */}
      {activeTab === 'overall' && (
        <View style={{ gap: 0 }}>
          <Text style={S.subHead}>Overall Experience</Text>

          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <StarRow value={overallRating} onChange={setOverallRating} size={42} />
            <Text style={{ marginTop: 8, fontWeight: '900', color: '#1F2937', fontSize: 17 }}>
              {STAR_LABELS[overallRating] ?? ''}
            </Text>
          </View>

          <TextInput
            style={S.input}
            placeholder="Give your review a title (optional)"
            value={title}
            onChangeText={setTitle}
            placeholderTextColor="#9CA3AF"
            maxLength={80}
          />

          <TextInput
            style={[S.input, { minHeight: 90, marginTop: 10 }]}
            multiline
            numberOfLines={4}
            placeholder={
              isStore  ? 'How was the product quality and packaging?' :
              isCustom ? 'How was your custom order experience?' :
              'Share your experience — food quality, service, etc.'
            }
            value={comment}
            onChangeText={setComment}
            placeholderTextColor="#9CA3AF"
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={S.charCount}>{comment.length}/500</Text>
        </View>
      )}

      {/* ── Items tab ──────────────────────────────────────────────────── */}
      {activeTab === 'items' && (
        <View>
          <Text style={S.subHead}>Rate Individual Items</Text>

          {reviewableItems.length === 0 ? (
            <View style={S.emptyItems}>
              <Text style={{ fontSize: 28, marginBottom: 8 }}>🍽️</Text>
              <Text style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center' }}>
                No reviewable items in this order.
              </Text>
            </View>
          ) : (
            reviewableItems.map(item => {
              const ir = itemRatings[item.id] ?? {
                item_id: item.id, item_name: item.name, rating: 5,
              }
              return (
                <View key={item.id} style={S.itemRatingCard}>
                  {/* Item header */}
                  <View style={S.itemCardHead}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={S.itemCardName} numberOfLines={2}>{item.name}</Text>
                      {item.category ? (
                        <Text style={{ fontSize: 10, color: '#9CA3AF' }}>{item.category}</Text>
                      ) : null}
                    </View>
                    <Text style={{ fontSize: 13, color: '#6B7280' }}>×{item.quantity}</Text>
                  </View>

                  <StarRow
                    value={ir.rating}
                    onChange={r => setItemRating(item.id, item.name, r)}
                    size={28}
                  />
                  <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                    {STAR_LABELS[ir.rating] ?? ''}
                  </Text>

                  <TextInput
                    style={[S.input, { marginTop: 8, fontSize: 12, paddingVertical: 8, minHeight: 0 }]}
                    placeholder="Quick note about this item (optional)"
                    value={ir.comment ?? ''}
                    onChangeText={t => setItemComment(item.id, item.name, t)}
                    placeholderTextColor="#9CA3AF"
                    maxLength={150}
                  />
                </View>
              )
            })
          )}
        </View>
      )}

      {/* ── Delivery tab ───────────────────────────────────────────────── */}
      {activeTab === 'delivery' && (
        <View>
          {!isStore && !isCustom && (
            <View style={S.ratingGroup}>
              <Text style={S.groupLbl}>🍔 Food Quality</Text>
              <StarRow value={foodRating} onChange={setFoodRating} size={30} />
              <Text style={S.ratingHint}>{STAR_LABELS[foodRating] ?? ''}</Text>
            </View>
          )}

          <View style={S.ratingGroup}>
            <Text style={S.groupLbl}>🚚 Delivery Speed</Text>
            <StarRow value={deliveryRating} onChange={setDeliveryRating} size={30} />
            <Text style={S.ratingHint}>{STAR_LABELS[deliveryRating] ?? ''}</Text>
          </View>

          {driverId && (
            <View style={S.ratingGroup}>
              <Text style={S.groupLbl}>🛵 Driver Behaviour</Text>
              <StarRow value={driverRating} onChange={setDriverRating} size={30} />
              <Text style={S.ratingHint}>{STAR_LABELS[driverRating] ?? ''}</Text>
            </View>
          )}

          <TextInput
            style={[S.input, { minHeight: 70, marginTop: 6 }]}
            multiline
            placeholder="Any feedback about delivery? (optional)"
            value={deliveryNote}
            onChangeText={setDeliveryNote}
            placeholderTextColor="#9CA3AF"
            textAlignVertical="top"
            maxLength={250}
          />
        </View>
      )}

      {/* Submit button */}
      <TouchableOpacity
        style={[S.submitBtn, submitting && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={submitting}
        activeOpacity={0.85}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>
            {existing ? '✅ Update Review' : '⭐ Submit Review'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  // ── Layout ────────────────────────────────────────────────────────────────
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 16,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },

  // ── Merchant badge ────────────────────────────────────────────────────────
  merchantBadge: {
    backgroundColor: '#FFF3EE',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 12,
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
  },
  merchantBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },

  // ── Delivery feedback (read view) ─────────────────────────────────────────
deliveryFeedbackWrap: {
  marginTop: 10,
},
dividerRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  marginBottom: 8,
},
dividerLine: {
  flex: 1,
  height: 1,
  backgroundColor: '#FED7AA',
},
dividerLabel: {
  fontSize: 11,
  fontWeight: '700',
  color: '#92400E',
  paddingHorizontal: 4,
},
deliveryFeedbackBubble: {
  backgroundColor: '#FFF7ED',
  borderRadius: 12,
  padding: 12,
  borderLeftWidth: 3,
  borderLeftColor: '#F97316',
},

  // ── Typography ────────────────────────────────────────────────────────────
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F2937',
  },
  subHead: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
  },
  reviewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 8,
  },
  reviewDate: {
    fontSize: 11,
    color: '#D1D5DB',
    marginTop: 10,
    textAlign: 'right',
  },
  charCount: {
    fontSize: 10,
    color: '#D1D5DB',
    textAlign: 'right',
    marginTop: 4,
  },

  // ── Read view ─────────────────────────────────────────────────────────────
  reviewedHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  editBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  commentBubble: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary + '40',
  },
  itemRatingsWrap: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
    marginTop: 8,
  },
  irRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  irName: {
    flex: 1,
    fontSize: 13,
    color: '#4B5563',
    paddingRight: 10,
  },
  breakdown: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
    marginTop: 10,
    gap: 8,
  },

  // ── Form view ─────────────────────────────────────────────────────────────
  formTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },

  // ── Tabs ──────────────────────────────────────────────────────────────────
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  tabActive: {
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  tabLbl: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  tabLblActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },

  // ── Items tab ─────────────────────────────────────────────────────────────
  itemRatingCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  itemCardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemCardName: {
    fontWeight: '700',
    color: '#1F2937',
    fontSize: 13,
  },
  emptyItems: {
    alignItems: 'center',
    padding: 24,
  },

  // ── Delivery tab ──────────────────────────────────────────────────────────
  ratingGroup: {
    marginBottom: 16,
  },
  groupLbl: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  ratingHint: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },

  // ── Input + submit ────────────────────────────────────────────────────────
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#1F2937',
    minHeight: 46,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
})