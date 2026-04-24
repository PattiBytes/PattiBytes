// src/components/orders/ReviewSection.tsx
import React, { useEffect, useMemo, useState } from 'react'
import {
  View, Text, TouchableOpacity, TextInput,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  StyleSheet, ActivityIndicator, Alert, ScrollView,
} from 'react-native'
import { COLORS }      from '../../lib/constants'
import { supabase }    from '../../lib/supabase'
import { STAR_LABELS } from './constants'
import type { ReviewData, ItemRating, OrderItem } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Tab = 'overall' | 'items' | 'delivery'

interface Props {
  orderId:                  string
  customerId:               string
  merchantId:               string | null
  driverId:                 string | null
  orderItems:               OrderItem[]
  isStore:                  boolean
  isCustom:                 boolean
  merchantName?:            string | null
  onDone?:                  (review: ReviewData) => void
  // ── Multi-order session context ─────────────────────────────────────────
  sessionOrderIndex?:       number
  totalMerchantsInSession?: number
  sessionId?:               string
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const REVIEW_SELECT =
  'id,order_id,customer_id,merchant_id,driver_id,' +
  'rating,overall_rating,merchant_rating,driver_rating,food_rating,delivery_rating,' +
  'comment,title,item_ratings,images,created_at,updated_at'

const DELIVERY_SEP = '\n\n---Delivery feedback---\n'
const API_BASE     = 'https://pbexpress.pattibytes.com'

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'overall',  label: 'Overall',  emoji: '🌟' },
  { key: 'items',    label: 'Items',    emoji: '🍽️' },
  { key: 'delivery', label: 'Delivery', emoji: '🚚' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Notification helper — fire and forget
// ─────────────────────────────────────────────────────────────────────────────

async function notifyReviewSubmitted(params: {
  customerId:   string
  merchantId:   string | null
  orderId:      string
  orderNumber?: string | null
  rating:       number
  isUpdate:     boolean
}): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const jwt = session?.access_token
    if (!jwt) return

    const num     = params.orderNumber ?? params.orderId.slice(0, 8)
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` }

    const merchantNotify = async () => {
      if (!params.merchantId) return
      const { data: m } = await supabase
        .from('merchants')
        .select('user_id')
        .eq('id', params.merchantId)
        .maybeSingle()
      if (!m?.user_id) return
      await fetch(`${API_BASE}/api/notify`, {
        method: 'POST', headers,
        body: JSON.stringify({
          targetUserId: m.user_id,
          title:        `New Review for Order #${num}`,
          message:      `A customer left a ${params.rating}★ review on order #${num}.`,
          type:         'review',
          data:         { orderId: params.orderId, rating: params.rating },
        }),
      })
    }

    const adminEscalate = async () => {
      if (params.rating > 2) return
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['admin', 'superadmin'])
        .eq('is_active', true)
      if (!admins?.length) return
      await Promise.allSettled(
        admins.map(({ id }) =>
          fetch(`${API_BASE}/api/notify`, {
            method: 'POST', headers,
            body: JSON.stringify({
              targetUserId: id,
              title:        `⚠️ Low Review Alert — ${params.rating}★`,
              message:      `Order #${num} received a ${params.rating}★ rating. Review may need attention.`,
              type:         'system',
              data:         { orderId: params.orderId, rating: params.rating },
            }),
          }),
        ),
      )
    }

    const merchantInAppNotify = async () => {
      if (!params.merchantId) return
      const { data: m } = await supabase
        .from('merchants')
        .select('user_id')
        .eq('id', params.merchantId)
        .maybeSingle()
      if (!m?.user_id) return
      await supabase.from('notifications').insert({
        user_id:    m.user_id,
        title:      `New ${params.rating}★ Review — Order #${num}`,
        message:    `A customer reviewed their order. Rating: ${params.rating}/5.`,
        type:       'review',
        data:       { orderId: params.orderId, rating: params.rating, merchantId: params.merchantId },
        is_read:    false,
        sent_push:  false,
        created_at: new Date().toISOString(),
      })
    }

    await Promise.allSettled([merchantNotify(), adminEscalate(), merchantInAppNotify()])
  } catch (e) {
    console.warn('[notifyReviewSubmitted]', e)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components (stable — defined outside parent to avoid re-creation)
// ─────────────────────────────────────────────────────────────────────────────

function MerchantBadge({
  merchantName, isStore, isCustom, sessionOrderIndex, totalMerchantsInSession,
}: {
  merchantName?:            string | null
  isStore:                  boolean
  isCustom:                 boolean
  sessionOrderIndex?:       number
  totalMerchantsInSession?: number
}) {
  if (!merchantName) return null
  const isMulti =
    typeof sessionOrderIndex === 'number' &&
    typeof totalMerchantsInSession === 'number' &&
    totalMerchantsInSession > 1

  return (
    <View style={S.merchantBadge}>
      <Text style={S.merchantBadgeText}>
        {isStore ? '🏪' : isCustom ? '🎁' : '🍽️'}{'  '}{merchantName}
        {isMulti ? (
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#B45309' }}>
            {'  '}({sessionOrderIndex! + 1}/{totalMerchantsInSession})
          </Text>
        ) : null}
      </Text>
    </View>
  )
}

function StarRow({
  value, onChange, size = 34, disabled = false,
}: {
  value:     number
  onChange:  (n: number) => void
  size?:     number
  disabled?: boolean
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <TouchableOpacity
          key={s}
          onPress={() => !disabled && onChange(s)}
          activeOpacity={disabled ? 1 : 0.7}
          disabled={disabled}
        >
          <Text style={{ fontSize: size, color: s <= value ? '#F59E0B' : '#D1D5DB' }}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

function BreakdownRow({
  emoji, label, rating,
}: { emoji: string; label: string; rating: number }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
      <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '600' }}>
        {emoji} {label}
      </Text>
      <View style={{ flexDirection: 'row', gap: 1 }}>
        {[1, 2, 3, 4, 5].map(s => (
          <Text key={s} style={{ fontSize: 13, color: s <= rating ? '#F59E0B' : '#D1D5DB' }}>★</Text>
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
  orderId, customerId, merchantId, driverId, orderItems,
  isStore, isCustom, merchantName, onDone,
  sessionOrderIndex, totalMerchantsInSession, sessionId,
}: Props) {

  // ── State ──────────────────────────────────────────────────────────────────
  const [existing,   setExisting]   = useState<ReviewData | null>(null)
  const [loadingRev, setLoadingRev] = useState(true)
  const [editing,    setEditing]    = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab,  setActiveTab]  = useState<Tab>('overall')

  // Overall tab
  const [overallRating,   setOverallRating]   = useState(5)
  const [merchantRating,  setMerchantRating]  = useState(5)
  const [foodRating,      setFoodRating]      = useState(5)
  const [overallComment,  setOverallComment]  = useState('')

  // Items tab
  const [itemRatings, setItemRatings] = useState<Record<string, ItemRating>>({})

  // Delivery tab
  const [driverRating,    setDriverRating]    = useState(5)
  const [deliveryRating,  setDeliveryRating]  = useState(5)
  const [deliveryComment, setDeliveryComment] = useState('')


  // ── Load existing review ──────────────────────────────────────────────────
useEffect(() => {
  let cancelled = false
  ;(async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(REVIEW_SELECT)
        .eq('order_id',    orderId)
        .eq('customer_id', customerId)
        .maybeSingle()

      if (cancelled) return
      // ── FIX: cast through unknown to silence GenericStringError mismatch ──
      const rev = (error ? null : data) as unknown as ReviewData | null

      if (rev) {
        setExisting(rev)
        setOverallRating(  rev.overall_rating  ?? rev.rating ?? 5)
        setMerchantRating( rev.merchant_rating ?? 5)
        setFoodRating(     rev.food_rating     ?? 5)
        setDriverRating(   rev.driver_rating   ?? 5)
        setDeliveryRating( rev.delivery_rating ?? 5)

        if (rev.comment) {
          const parts = rev.comment.split(DELIVERY_SEP)
          setOverallComment(  parts[0]?.trim() ?? '')
          setDeliveryComment( parts[1]?.trim() ?? '')
        }

        if (rev.item_ratings && Array.isArray(rev.item_ratings)) {
          const map: Record<string, ItemRating> = {}
          ;(rev.item_ratings as ItemRating[]).forEach(r => { map[r.item_id] = r })
          setItemRatings(map)
        }
      }
    } catch (e) {
      console.warn('[ReviewSection] load existing', e)
    } finally {
      if (!cancelled) setLoadingRev(false)
    }
  })()
  return () => { cancelled = true }
}, [orderId, customerId])

  // ── Derived ────────────────────────────────────────────────────────────────
  const isMultiSession = typeof sessionOrderIndex === 'number'
    && typeof totalMerchantsInSession === 'number'
    && totalMerchantsInSession > 1

  const reviewableItems = useMemo(
    () => orderItems.filter(i => !(i as any).is_free),
    [orderItems],
  )

  const avgItemRating = useMemo(() => {
    const rated = Object.values(itemRatings).filter(r => r.rating > 0)
    if (!rated.length) return null
    return rated.reduce((s, r) => s + r.rating, 0) / rated.length
  }, [itemRatings])

  // ── Handlers ──────────────────────────────────────────────────────────────

 const handleItemRating = (
  itemId:  string,
  field:   'rating' | 'comment',
  value:   number | string,
) => {
  // Resolve item name from orderItems for the item_name required field
  const itemName = orderItems.find(
    i => ((i as any).menu_item_id ?? i.id) === itemId
  )?.name ?? ''

  setItemRatings(prev => ({
    ...prev,
    [itemId]: {
      item_id:   itemId,
      item_name: prev[itemId]?.item_name ?? itemName,  // ← satisfies ItemRating
      rating:    prev[itemId]?.rating    ?? 0,
      comment:   prev[itemId]?.comment   ?? '',
      ...(field === 'rating'  ? { rating:  Number(value) } : {}),
      ...(field === 'comment' ? { comment: String(value) } : {}),
    } satisfies ItemRating,
  }))
}

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      // Combine overall + delivery comment
      const fullComment = [
        overallComment.trim(),
        deliveryComment.trim() ? `${DELIVERY_SEP}${deliveryComment.trim()}` : '',
      ].join('')

      const itemRatingsArr: ItemRating[] = Object.values(itemRatings).filter(r => r.rating > 0)

      // Composite rating: weighted avg
      const ratings = [overallRating, merchantRating, foodRating]
      if (driverId) ratings.push(driverRating, deliveryRating)
      const compositeRating = Math.round(
        ratings.reduce((s, r) => s + r, 0) / ratings.length,
      )

      const payload: Record<string, any> = {
        order_id:        orderId,
        customer_id:     customerId,
        merchant_id:     merchantId,
        driver_id:       driverId,
        rating:          compositeRating,
        overall_rating:  overallRating,
        merchant_rating: merchantRating,
        food_rating:     foodRating,
        driver_rating:   driverId ? driverRating  : null,
        delivery_rating: driverId ? deliveryRating : null,
        comment:         fullComment || null,
        title:           STAR_LABELS?.[overallRating] ?? null,
        item_ratings:    itemRatingsArr.length ? itemRatingsArr : null,
        updated_at:      new Date().toISOString(),
        // session context (nullable)
        session_id:      sessionId ?? null,
        session_order_index: typeof sessionOrderIndex === 'number' ? sessionOrderIndex : null,
      }

      let savedReview: ReviewData

      if (existing?.id) {
        const { data, error } = await supabase
          .from('reviews')
          .update(payload)
          .eq('id', existing.id)
          .select(REVIEW_SELECT)
          .single()
        if (error) throw error
        savedReview = data as unknown as ReviewData
      } else {
        const { data, error } = await supabase
          .from('reviews')
          .insert({ ...payload, created_at: new Date().toISOString() })
          .select(REVIEW_SELECT)
          .single()
        if (error) throw error
        savedReview = data as unknown as ReviewData

        // Update order.rating column (denormalized for quick display)
        await supabase
          .from('orders')
          .update({ rating: compositeRating, review: fullComment || null })
          .eq('id', orderId)
      }

      setExisting(savedReview)
      setEditing(false)

      // Fire notifications async
      void notifyReviewSubmitted({
        customerId,
        merchantId,
        orderId,
        orderNumber: null,
        rating:      compositeRating,
        isUpdate:    !!existing?.id,
      })

      Alert.alert(
        existing?.id ? '✅ Review Updated' : '🎉 Review Submitted',
        `Thanks for your ${compositeRating}★ review!`,
      )
      onDone?.(savedReview)
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not submit review.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Guards ────────────────────────────────────────────────────────────────
  if (loadingRev) return <ReviewSkeleton />

  const isReadOnly = !!existing && !editing

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER — Existing review (read-only summary)
  // ─────────────────────────────────────────────────────────────────────────
  if (isReadOnly) {
    return (
      <View style={S.section}>
        <MerchantBadge
          merchantName={merchantName}
          isStore={isStore}
          isCustom={isCustom}
          sessionOrderIndex={sessionOrderIndex}
          totalMerchantsInSession={totalMerchantsInSession}
        />

        <View style={S.reviewedHeader}>
          <View>
            <Text style={S.sectionTitle}>⭐ Your Review</Text>
            <Text style={S.submittedAt}>
              {existing.updated_at
                ? `Updated ${new Date(existing.updated_at).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })}`
                : 'Submitted'}
            </Text>
          </View>
          <TouchableOpacity style={S.editBtn} onPress={() => setEditing(true)}>
            <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 13 }}>✏️ Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Rating display */}
        <View style={S.ratingDisplay}>
          {[1, 2, 3, 4, 5].map(s => (
            <Text key={s} style={{
              fontSize: 28,
              color: s <= (existing.overall_rating ?? existing.rating ?? 0) ? '#F59E0B' : '#D1D5DB',
            }}>★</Text>
          ))}
          <Text style={S.ratingLabel}>
            {STAR_LABELS?.[existing.overall_rating ?? existing.rating ?? 0] ?? ''}
          </Text>
        </View>

        {/* Breakdown rows */}
        <View style={S.breakdownCard}>
          {!!existing.merchant_rating && (
            <BreakdownRow emoji="🍽️" label="Food & Restaurant" rating={existing.merchant_rating} />
          )}
          {!!existing.food_rating && (
            <BreakdownRow emoji="😋" label="Food Quality"  rating={existing.food_rating} />
          )}
          {!!existing.driver_rating && (
            <BreakdownRow emoji="🛵" label="Driver"        rating={existing.driver_rating} />
          )}
          {!!existing.delivery_rating && (
            <BreakdownRow emoji="⏱️" label="Delivery Speed" rating={existing.delivery_rating} />
          )}
        </View>

        {/* Comment */}
        {!!existing.comment && (
          <View style={S.commentCard}>
            <Text style={S.commentText}>
              &quot;{existing.comment.split(DELIVERY_SEP)[0]?.trim()}&quot;
            </Text>
          </View>
        )}

        {/* Item ratings summary */}
        {Array.isArray(existing.item_ratings) && existing.item_ratings.length > 0 && (
          <View style={S.itemRatingSummary}>
            <Text style={S.itemRatingsTitle}>Item Ratings</Text>
            {(existing.item_ratings as ItemRating[]).map(ir => {
              const item = orderItems.find(i => i.id === ir.item_id || (i as any).menu_item_id === ir.item_id)
              return (
                <View key={ir.item_id} style={S.itemRatingRow}>
                  <Text style={S.itemRatingName} numberOfLines={1}>
                    {item?.name ?? ir.item_id}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 2 }}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <Text key={s} style={{ fontSize: 11, color: s <= ir.rating ? '#F59E0B' : '#E5E7EB' }}>★</Text>
                    ))}
                  </View>
                </View>
              )
            })}
          </View>
        )}

        {/* Multi-session context */}
        {isMultiSession && (
          <View style={S.sessionNote}>
            <Text style={S.sessionNoteText}>
              ℹ️ Review {sessionOrderIndex! + 1} of {totalMerchantsInSession} for this multi-restaurant order
            </Text>
          </View>
        )}
      </View>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER — Write / Edit review
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={S.section}>
      <MerchantBadge
        merchantName={merchantName}
        isStore={isStore}
        isCustom={isCustom}
        sessionOrderIndex={sessionOrderIndex}
        totalMerchantsInSession={totalMerchantsInSession}
      />

      <Text style={S.sectionTitle}>
        {existing ? '✏️ Edit Your Review' : '⭐ Rate Your Order'}
      </Text>

      {isMultiSession && (
        <View style={S.sessionNote}>
          <Text style={S.sessionNoteText}>
            Restaurant {sessionOrderIndex! + 1} of {totalMerchantsInSession} — reviewing{' '}
            <Text style={{ fontWeight: '800' }}>{merchantName ?? 'this restaurant'}</Text>
          </Text>
        </View>
      )}

      {/* ── Tab Bar ───────────────────────────────────────────────── */}
      <View style={S.tabRow}>
        {TABS.map(t => {
          // Hide Delivery tab if no driver
          if (t.key === 'delivery' && !driverId) return null
          const isActive = activeTab === t.key
          return (
            <TouchableOpacity
              key={t.key}
              style={[S.tab, isActive && S.tabActive]}
              onPress={() => setActiveTab(t.key)}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 13 }}>{t.emoji}</Text>
              <Text style={[S.tabTxt, isActive && S.tabTxtActive]}>{t.label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* ── Overall Tab ───────────────────────────────────────────── */}
      {activeTab === 'overall' && (
        <View style={S.tabBody}>
          {/* Overall star rating */}
          <Text style={S.ratingLabel2}>Overall Experience</Text>
          <StarRow value={overallRating} onChange={setOverallRating} size={36} />
          {STAR_LABELS?.[overallRating] && (
            <Text style={S.starHint}>{STAR_LABELS[overallRating]}</Text>
          )}

          <View style={S.divider} />

          {/* Food/Merchant rating */}
          {!isCustom && (
            <>
              <Text style={S.ratingLabel2}>
                {isStore ? '🏪 Store Experience' : '🍽️ Food & Restaurant'}
              </Text>
              <StarRow value={merchantRating} onChange={setMerchantRating} size={28} />

              {!isStore && (
                <>
                  <View style={{ height: 10 }} />
                  <Text style={S.ratingLabel2}>😋 Food Quality</Text>
                  <StarRow value={foodRating} onChange={setFoodRating} size={28} />
                </>
              )}
              <View style={S.divider} />
            </>
          )}

          {/* Comment */}
          <Text style={S.ratingLabel2}>Your Comments (optional)</Text>
          <TextInput
            style={S.textArea}
            placeholder="What did you like or dislike?"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            value={overallComment}
            onChangeText={setOverallComment}
            maxLength={500}
          />
          <Text style={S.charCount}>{overallComment.length}/500</Text>
        </View>
      )}

      {/* ── Items Tab ─────────────────────────────────────────────── */}
      {activeTab === 'items' && (
        <View style={S.tabBody}>
          {reviewableItems.length === 0 ? (
            <Text style={{ color: '#9CA3AF', textAlign: 'center', paddingVertical: 20 }}>
              No items to rate.
            </Text>
          ) : (
            <>
              {avgItemRating !== null && (
                <View style={S.avgBadge}>
                  <Text style={S.avgBadgeTxt}>
                    Avg item rating: {avgItemRating.toFixed(1)}★
                  </Text>
                </View>
              )}
              {reviewableItems.map(item => {
                const itemId  = (item as any).menu_item_id ?? item.id
                const current = itemRatings[itemId]
                return (
                  <View key={itemId} style={S.itemRow}>
                    <View style={S.itemRowTop}>
                      {item.is_veg !== null && item.is_veg !== undefined && (
                        <View style={[S.vegDot,
                          { backgroundColor: item.is_veg ? '#16A34A' : '#DC2626' }]} />
                      )}
                      <Text style={S.itemName} numberOfLines={1}>{item.name}</Text>
                      <Text style={S.itemQty}>x{item.quantity}</Text>
                    </View>
                    <StarRow
                      value={current?.rating ?? 0}
                      onChange={v => handleItemRating(itemId, 'rating', v)}
                      size={24}
                    />
                    <TextInput
                      style={S.itemNote}
                      placeholder="Any feedback for this item?"
                      placeholderTextColor="#9CA3AF"
                      value={current?.comment ?? ''}
                      onChangeText={v => handleItemRating(itemId, 'comment', v)}
                      maxLength={200}
                    />
                  </View>
                )
              })}
            </>
          )}
        </View>
      )}

      {/* ── Delivery Tab ──────────────────────────────────────────── */}
      {activeTab === 'delivery' && driverId && (
        <View style={S.tabBody}>
          <Text style={S.ratingLabel2}>🛵 Driver Rating</Text>
          <StarRow value={driverRating} onChange={setDriverRating} size={32} />

          <View style={{ height: 12 }} />
          <Text style={S.ratingLabel2}>⏱️ Delivery Speed</Text>
          <StarRow value={deliveryRating} onChange={setDeliveryRating} size={32} />

          <View style={S.divider} />
          <Text style={S.ratingLabel2}>Delivery Feedback (optional)</Text>
          <TextInput
            style={S.textArea}
            placeholder="How was your delivery experience?"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            value={deliveryComment}
            onChangeText={setDeliveryComment}
            maxLength={300}
          />
          <Text style={S.charCount}>{deliveryComment.length}/300</Text>
        </View>
      )}

      {/* ── Actions ───────────────────────────────────────────────── */}
      <View style={S.actionRow}>
        {editing && (
          <TouchableOpacity
            style={S.cancelEditBtn}
            onPress={() => setEditing(false)}
            disabled={submitting}
          >
            <Text style={{ color: '#6B7280', fontWeight: '700', fontSize: 14 }}>Cancel</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[S.submitBtn, submitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={S.submitBtnTxt}>
              {existing ? '💾 Update Review' : '🚀 Submit Review'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Progress hint for multi-session */}
      {isMultiSession && !existing && (
        <Text style={S.multiHint}>
          💡 You can review each restaurant separately. Take your time!
        </Text>
      )}
    </View>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },

  // Merchant badge
  merchantBadge: {
    backgroundColor: '#FFF7ED',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  merchantBadgeText: { fontSize: 13, fontWeight: '700', color: '#92400E' },

  // Section title
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 6,
  },
  submittedAt: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },

  // Read-only header
  reviewedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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

  // Rating display (read-only)
  ratingDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  ratingLabel: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },

  // Breakdown
  breakdownCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 12,
    gap: 4,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },

  // Comment
  commentCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  commentText: {
    fontSize: 13,
    color: '#065F46',
    fontStyle: 'italic',
    lineHeight: 20,
  },

  // Item ratings summary (read-only)
  itemRatingSummary: {
    marginTop: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
  },
  itemRatingsTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#374151',
    marginBottom: 6,
  },
  itemRatingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  itemRatingName: {
    flex: 1,
    fontSize: 12,
    color: '#4B5563',
    marginRight: 8,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    padding: 3,
    marginBottom: 14,
    marginTop: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabActive: { backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  tabTxt:    { fontSize: 11, fontWeight: '600', color: '#9CA3AF' },
  tabTxtActive: { color: '#111827', fontWeight: '800' },

  // Tab body
  tabBody: { gap: 8 },

  // Rating labels
  ratingLabel2: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  starHint: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '700',
    marginTop: 4,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },

  // Text areas
  textArea: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
    minHeight: 90,
    textAlignVertical: 'top',
    backgroundColor: '#FAFAFA',
  },
  charCount: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 2,
  },

  // Item rows
  avgBadge: {
    backgroundColor: '#FFF7ED',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  avgBadgeTxt: { fontSize: 12, color: '#92400E', fontWeight: '700' },

  itemRow: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 6,
  },
  itemRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  vegDot:   { width: 8, height: 8, borderRadius: 4 },
  itemName: { flex: 1, fontSize: 13, fontWeight: '700', color: '#1F2937' },
  itemQty:  { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  itemNote: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 8,
    fontSize: 12,
    color: '#374151',
    backgroundColor: '#fff',
    marginTop: 4,
  },

  // Actions
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  cancelEditBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  submitBtn: {
    flex: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnTxt: { color: '#fff', fontWeight: '900', fontSize: 14 },

  // Session context
  sessionNote: {
    backgroundColor: '#FFF7ED',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  sessionNoteText: { fontSize: 12, color: '#92400E', fontWeight: '600' },

  multiHint: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },
})