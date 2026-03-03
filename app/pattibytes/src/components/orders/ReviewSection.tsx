import React, { useEffect, useState } from 'react'
import {
  View, Text, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native'
import { COLORS } from '../../lib/constants'
import { supabase } from '../../lib/supabase'
import { STAR_LABELS } from './constants'
import type { ReviewData, ItemRating, OrderItem } from './types'

type Tab = 'overall' | 'items' | 'delivery'

interface Props {
  orderId:    string
  customerId: string
  merchantId: string | null
  driverId:   string | null
  orderItems: OrderItem[]
  isStore:    boolean
  isCustom:   boolean
  onDone?:    (review: ReviewData) => void
}

// ── StarRow ───────────────────────────────────────────────────────────────────
function StarRow({ value, onChange, size = 34 }: {
  value: number; onChange: (n: number) => void; size?: number
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

// ── Tab config (stable, outside component) ────────────────────────────────────
const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'overall',  label: 'Overall',  emoji: '🌟' },
  { key: 'items',    label: 'Items',    emoji: '🍽️' },
  { key: 'delivery', label: 'Delivery', emoji: '🚚' },
]

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ReviewSection({
  orderId, customerId, merchantId, driverId, orderItems, isStore, isCustom, onDone,
}: Props) {
  const [existing,      setExisting]      = useState<ReviewData | null>(null)
  const [loadingRev,    setLoadingRev]    = useState(true)
  const [editing,       setEditing]       = useState(false)
  const [activeTab,     setActiveTab]     = useState<Tab>('overall')
  const [submitting,    setSubmitting]    = useState(false)

  // Overall
  const [overallRating, setOverallRating] = useState(5)
  const [title,         setTitle]         = useState('')
  const [comment,       setComment]       = useState('')

  // Items
  const [itemRatings,   setItemRatings]   = useState<Record<string, ItemRating>>({})

  // Delivery
  const [foodRating,     setFoodRating]     = useState(5)
  const [driverRating,   setDriverRating]   = useState(5)
  const [deliveryRating, setDeliveryRating] = useState(5)
  const [deliveryNote,   setDeliveryNote]   = useState('')

  // Reviewable = paid, non-free items only
  const reviewableItems = orderItems.filter(i => !i.is_free && (i.price ?? 0) > 0)

  // ── Load existing review ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoadingRev(true)
      const { data } = await supabase
        .from('reviews')
        .select('*')
        .eq('order_id', orderId)
        .eq('customer_id', customerId)
        .maybeSingle()

      if (cancelled) return

      if (data) {
        const rev = data as ReviewData
        setExisting(rev)
        setOverallRating(rev.overall_rating ?? rev.rating ?? 5)
        setTitle(rev.title ?? '')
        setComment(rev.comment ?? '')
        setFoodRating(rev.food_rating ?? 5)
        setDriverRating(rev.driver_rating ?? 5)
        setDeliveryRating(rev.delivery_rating ?? 5)
        setDeliveryNote('')
        const irMap: Record<string, ItemRating> = {}
        ;(rev.item_ratings ?? []).forEach(ir => { irMap[ir.item_id] = ir })
        setItemRatings(irMap)
      } else {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, customerId])

  const setItemRating = (itemId: string, itemName: string, rating: number) =>
    setItemRatings(prev => ({ ...prev, [itemId]: { ...prev[itemId], item_id: itemId, item_name: itemName, rating } }))

  const setItemComment = (itemId: string, itemName: string, note: string) =>
    setItemRatings(prev => ({ ...prev, [itemId]: { ...prev[itemId], item_id: itemId, item_name: itemName, comment: note } }))

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (overallRating < 1) return
    setSubmitting(true)
    try {
      const itemRatingsArr = Object.values(itemRatings)
      const payload = {
        order_id:        orderId,
        customer_id:     customerId,
        merchant_id:     merchantId,
        driver_id:       driverId,
        rating:          overallRating,
        overall_rating:  overallRating,
        food_rating:     isStore || isCustom ? null : foodRating,
        merchant_rating: merchantId ? overallRating : null,
        driver_rating:   driverId ? driverRating : null,
        delivery_rating: deliveryRating,
        comment:         comment.trim() || null,
        title:           title.trim() || null,
        item_ratings:    itemRatingsArr.length > 0 ? itemRatingsArr : [],
        updated_at:      new Date().toISOString(),
        ...(existing ? {} : { created_at: new Date().toISOString() }),
      }

      const { data, error } = await supabase
        .from('reviews')
        .upsert(payload, { onConflict: 'order_id,customer_id' })
        .select()
        .single()

      if (error) throw error

      // Sync rating back to orders table
      await supabase
        .from('orders')
        .update({ rating: overallRating, review: comment.trim() || null })
        .eq('id', orderId)

      setExisting(data as ReviewData)
      setEditing(false)
      Alert.alert(
        '🙏 Thank You!',
        existing ? 'Your review has been updated!' : 'Your review has been submitted!'
      )
      onDone?.(data as ReviewData)
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingRev) return null

  // ── Submitted (read) view ───────────────────────────────────────────────
  if (existing && !editing) {
    const displayRating = existing.overall_rating ?? existing.rating ?? 0
    return (
      <View style={S.section}>
        <View style={S.reviewedHeader}>
          <View style={{ flex: 1 }}>
            <Text style={S.sectionTitle}>⭐ Your Review</Text>
            {existing.title ? <Text style={S.reviewTitle}>{existing.title}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 2, marginTop: 6 }}>
              {[1, 2, 3, 4, 5].map(s => (
                <Text key={s} style={{
                  fontSize: 22,
                  color: s <= displayRating ? '#F59E0B' : '#D1D5DB',
                }}>★</Text>
              ))}
            </View>
            <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
              {STAR_LABELS[displayRating]}
            </Text>
          </View>
          <TouchableOpacity style={S.editBtn} onPress={() => setEditing(true)}>
            <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 13 }}>✏️ Edit</Text>
          </TouchableOpacity>
        </View>

        {existing.comment ? (
          <View style={S.commentBubble}>
            <Text style={{ fontSize: 13, color: '#374151', lineHeight: 20 }}>
              {existing.comment}
            </Text>
          </View>
        ) : null}

        {/* Per-item ratings */}
        {(existing.item_ratings ?? []).length > 0 && (
          <View style={S.itemRatingsWrap}>
            <Text style={S.subHead}>🍽️ Item Ratings</Text>
            {(existing.item_ratings ?? []).map(ir => (
              <View key={ir.item_id} style={S.irRow}>
                <Text style={S.irName} numberOfLines={1}>{ir.item_name}</Text>
                <View style={{ flexDirection: 'row', gap: 1 }}>
                  {[1, 2, 3, 4, 5].map(s => (
                    <Text key={s} style={{ fontSize: 13, color: s <= ir.rating ? '#F59E0B' : '#D1D5DB' }}>★</Text>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Breakdown */}
        <View style={S.breakdown}>
          {!isStore && !isCustom && existing.food_rating ? (
            <BreakdownRow emoji="🍔" label="Food" rating={existing.food_rating} />
          ) : null}
          {existing.driver_rating && driverId ? (
            <BreakdownRow emoji="🛵" label="Driver" rating={existing.driver_rating} />
          ) : null}
          {existing.delivery_rating ? (
            <BreakdownRow emoji="🚚" label="Delivery" rating={existing.delivery_rating} />
          ) : null}
        </View>

        <Text style={S.reviewDate}>
          Reviewed {new Date(existing.updated_at ?? existing.created_at).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
          })}
        </Text>
      </View>
    )
  }

  // ── Form view ───────────────────────────────────────────────────────────
  return (
    <View style={S.section}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
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

      {/* ── Tab: Overall ── */}
      {activeTab === 'overall' && (
        <View style={{ gap: 0 }}>
          <Text style={S.subHead}>Overall Experience</Text>
          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <StarRow value={overallRating} onChange={setOverallRating} size={42} />
            <Text style={{ marginTop: 8, fontWeight: '900', color: '#1F2937', fontSize: 17 }}>
              {STAR_LABELS[overallRating]}
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
              isStore   ? 'How was the product quality and packaging?' :
              isCustom  ? 'How was your custom order experience?' :
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

      {/* ── Tab: Items ── */}
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
          ) : reviewableItems.map(item => {
            const ir = itemRatings[item.id] ?? { item_id: item.id, item_name: item.name, rating: 5 }
            return (
              <View key={item.id} style={S.itemRatingCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={{ fontWeight: '700', color: '#1F2937', fontSize: 13 }} numberOfLines={2}>
                      {item.name}
                    </Text>
                    {item.category ? (
                      <Text style={{ fontSize: 10, color: '#9CA3AF' }}>{item.category}</Text>
                    ) : null}
                  </View>
                  <Text style={{ fontSize: 13, color: '#6B7280' }}>×{item.quantity}</Text>
                </View>
                <StarRow value={ir.rating} onChange={r => setItemRating(item.id, item.name, r)} size={28} />
                <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                  {STAR_LABELS[ir.rating]}
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
          })}
        </View>
      )}

      {/* ── Tab: Delivery ── */}
      {activeTab === 'delivery' && (
        <View>
          {!isStore && !isCustom && (
            <View style={S.ratingGroup}>
              <Text style={S.groupLbl}>🍔 Food Quality</Text>
              <StarRow value={foodRating} onChange={setFoodRating} size={30} />
              <Text style={S.ratingHint}>{STAR_LABELS[foodRating]}</Text>
            </View>
          )}
          <View style={S.ratingGroup}>
            <Text style={S.groupLbl}>🚚 Delivery Speed</Text>
            <StarRow value={deliveryRating} onChange={setDeliveryRating} size={30} />
            <Text style={S.ratingHint}>{STAR_LABELS[deliveryRating]}</Text>
          </View>
          {driverId && (
            <View style={S.ratingGroup}>
              <Text style={S.groupLbl}>🛵 Driver Behaviour</Text>
              <StarRow value={driverRating} onChange={setDriverRating} size={30} />
              <Text style={S.ratingHint}>{STAR_LABELS[driverRating]}</Text>
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

      {/* Submit */}
      <TouchableOpacity
        style={[S.submitBtn, submitting && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={submitting}
        activeOpacity={0.85}
      >
        {submitting
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>
              {existing ? '✅ Update Review' : '⭐ Submit Review'}
            </Text>
        }
      </TouchableOpacity>
    </View>
  )
}

// ── Breakdown row sub-component ───────────────────────────────────────────────
function BreakdownRow({ emoji, label, rating }: { emoji: string; label: string; rating: number }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '600' }}>{emoji} {label}</Text>
      <View style={{ flexDirection: 'row', gap: 1 }}>
        {[1, 2, 3, 4, 5].map(s => (
          <Text key={s} style={{ fontSize: 13, color: s <= rating ? '#F59E0B' : '#D1D5DB' }}>★</Text>
        ))}
      </View>
    </View>
  )
}

const S = StyleSheet.create({
  section:        { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 10, borderRadius: 16, padding: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  sectionTitle:   { fontSize: 15, fontWeight: '800', color: '#1F2937' },
  reviewedHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  reviewTitle:    { fontSize: 14, fontWeight: '700', color: '#1F2937', marginTop: 8 },
  editBtn:        { borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  commentBubble:  { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: COLORS.primary + '40' },
  itemRatingsWrap:{ borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12, marginTop: 8 },
  subHead:        { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 10 },
  irRow:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  irName:         { flex: 1, fontSize: 13, color: '#4B5563', paddingRight: 10 },
  breakdown:      { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12, marginTop: 10, gap: 8 },
  reviewDate:     { fontSize: 11, color: '#D1D5DB', marginTop: 10, textAlign: 'right' },
  tabRow:         { flexDirection: 'row', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 4, marginBottom: 14 },
  tab:            { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10, flexDirection: 'row', justifyContent: 'center', gap: 4 },
  tabActive:      { backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  tabLbl:         { fontSize: 11, fontWeight: '600', color: '#9CA3AF' },
  tabLblActive:   { color: COLORS.primary, fontWeight: '800' },
  itemRatingCard: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#F3F4F6' },
  emptyItems:     { alignItems: 'center', padding: 24 },
  ratingGroup:    { marginBottom: 16 },
  groupLbl:       { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
  ratingHint:     { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  input:          { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#1F2937', minHeight: 46 },
  charCount:      { fontSize: 10, color: '#D1D5DB', textAlign: 'right', marginTop: 4 },
  submitBtn:      { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
})
