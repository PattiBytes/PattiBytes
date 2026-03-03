import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Switch,
  Image,
} from 'react-native';
import { COLORS } from '../../lib/constants';
import StarRating from '../ui/StarRating';
import ReviewModal from './ReviewModal';

// ── Helpers ───────────────────────────────────────────────────────────────────
function calcAvg(ratings: number[]): number {
  const valid = ratings.filter(r => r > 0);
  if (!valid.length) return 0;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function ratingHistogram(ratings: number[]): Record<number, number> {
  const h: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratings.forEach(r => {
    const s = Math.round(r);
    if (s >= 1 && s <= 5) h[s]++;
  });
  return h;
}

function StarBar({ count, total }: { count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <View style={{ flex: 1, height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden' }}>
      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: '#F59E0B', borderRadius: 3 }} />
    </View>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ReviewRow {
  id: string;
  customer_id: string;
  rating: number | null;            // nullable — matches DB + hook type
  comment?: string | null;
  created_at: string;
  item_ratings?: any[];
  overall_rating?: number | null;
  food_rating?: number | null;
  driver_rating?: number | null;
  delivery_rating?: number | null;
  profiles?: { full_name: string | null; avatar_url?: string | null } | null;
  customer_name?: string | null;    // legacy flat fallback
}

interface Props {
  merchant:               any;
  reviews:                ReviewRow[];
  reviewItemsByReviewId?: Record<string, any[]>;
  hasDeliveredOrder:      boolean;
  deliveredOrderId:       string | null;
  alreadyReviewed:        boolean;
  notificationEnabled:    boolean;
  onToggleNotification:   (v: boolean) => void;
  onSubmitReview:         (p: { rating: number; comment?: string | null }) => Promise<{ ok: boolean }>;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ReviewsTab({
  merchant,
  reviews,
  reviewItemsByReviewId = {},
  hasDeliveredOrder,
  alreadyReviewed,
  notificationEnabled,
  onToggleNotification,
  onSubmitReview,
}: Props) {
  const [showModal, setShowModal] = useState(false);

  const liveAvg = useMemo(() => {
    const ratings = reviews
      .map(r => Number(r.overall_rating ?? r.rating ?? 0))
      .filter(v => v > 0);
    return calcAvg(ratings);
  }, [reviews]);

  const avg = useMemo(() => {
    if (reviews.length > 0) return liveAvg;
    const m = Number(merchant?.average_rating ?? 0);
    return m > 0 ? m : liveAvg;
  }, [liveAvg, merchant?.average_rating, reviews.length]);

  const hist = useMemo(
    () => ratingHistogram(reviews.map(r => Number(r.overall_rating ?? r.rating ?? 0))),
    [reviews],
  );

  const totalCount = Number(merchant?.total_reviews ?? reviews.length);

  return (
    <View style={S.container}>

      {/* ── Rating Hero ── */}
      <View style={S.ratingCard}>
        <View style={S.bigNumCol}>
          <Text style={S.big}>{avg > 0 ? avg.toFixed(1) : '—'}</Text>
          <StarRating rating={avg} size={16} />
          <Text style={S.totalTxt}>{totalCount} review{totalCount !== 1 ? 's' : ''}</Text>
        </View>
        <View style={S.histCol}>
          {[5, 4, 3, 2, 1].map(star => (
            <View key={star} style={S.histRow}>
              <Text style={S.histLbl}>{star}★</Text>
              <StarBar count={hist[star]} total={reviews.length} />
              <Text style={S.histCount}>{hist[star]}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Notification Preference ── */}
      <View style={S.prefCard}>
        <View style={{ flex: 1 }}>
          <Text style={S.prefTitle}>🔔 Review alerts</Text>
          <Text style={S.prefSub}>
            Notify me when new reviews are posted for restaurants I&lsquo;ve ordered from.
          </Text>
        </View>
        <Switch
          value={notificationEnabled}
          onValueChange={onToggleNotification}
          trackColor={{ false: '#E5E7EB', true: COLORS.primary }}
          thumbColor="#fff"
        />
      </View>

      {/* ── Write Review CTA ── */}
      {hasDeliveredOrder && !alreadyReviewed && (
        <Pressable style={S.reviewCta} onPress={() => setShowModal(true)}>
          <Text style={{ fontSize: 22, marginRight: 10 }}>✍️</Text>
          <View style={{ flex: 1 }}>
            <Text style={S.ctaTitle}>Write a review</Text>
            <Text style={S.ctaSub}>Share your experience with others.</Text>
          </View>
          <Text style={{ color: COLORS.primary, fontSize: 20, fontWeight: '900' }}>›</Text>
        </Pressable>
      )}

      {alreadyReviewed && (
        <View style={S.alreadyBox}>
          <Text style={{ fontSize: 18 }}>✅</Text>
          <Text style={{ color: '#15803D', fontWeight: '700', marginLeft: 8, fontSize: 13 }}>
            You&apos;ve already reviewed this restaurant
          </Text>
        </View>
      )}

      {/* ── Reviews List ── */}
      {reviews.length === 0 ? (
        <View style={S.emptyWrap}>
          <Text style={{ fontSize: 44, marginBottom: 10 }}>⭐</Text>
          <Text style={S.emptyTitle}>No reviews yet</Text>
          <Text style={S.emptySub}>Be the first to share your experience!</Text>
        </View>
      ) : (
        reviews.map(r => {
          const customerName = r.profiles?.full_name ?? r.customer_name ?? 'Customer';
          const avatarUrl    = r.profiles?.avatar_url ?? null;
          const initial      = customerName.slice(0, 1).toUpperCase();
          const rating       = Number(r.overall_rating ?? r.rating ?? 0);
          const items        = reviewItemsByReviewId?.[String(r.id)] ?? [];
          const shownItems   = items.slice(0, 3);
          const dateStr      = new Date(r.created_at).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
          });

          return (
            <View key={r.id} style={S.reviewCard}>
              {/* Header */}
              <View style={S.reviewHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={S.avatar} />
                  ) : (
                    <View style={S.avatar}>
                      <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 15 }}>{initial}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={S.customerName} numberOfLines={1}>{customerName}</Text>
                    <Text style={S.reviewDate}>{dateStr}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <StarRating rating={rating} size={13} />
                  <Text style={{ fontSize: 11, color: '#9CA3AF' }}>
                    {rating >= 5 ? 'Excellent' : rating >= 4 ? 'Good' : rating >= 3 ? 'Okay' : rating >= 2 ? 'Poor' : 'Very poor'}
                  </Text>
                </View>
              </View>

              {/* Comment */}
              {!!r.comment && (
                <View style={S.commentBubble}>
                  <Text style={{ color: '#374151', lineHeight: 20, fontSize: 13 }}>
                    &quot;{r.comment}&quot;
                  </Text>
                </View>
              )}

              {/* Breakdown pills */}
              {(r.food_rating || r.delivery_rating || r.driver_rating) ? (
                <View style={S.pillRow}>
                  {r.food_rating     ? <BreakPill emoji="🍔" label="Food"     val={r.food_rating} />     : null}
                  {r.delivery_rating ? <BreakPill emoji="🚚" label="Delivery" val={r.delivery_rating} /> : null}
                  {r.driver_rating   ? <BreakPill emoji="🛵" label="Driver"   val={r.driver_rating} />   : null}
                </View>
              ) : null}

              {/* Items ordered */}
              {shownItems.length > 0 && (
                <View style={S.itemsBox}>
                  <Text style={S.itemsTitle}>🍽️ Items ordered</Text>
                  {shownItems.map((it: any, idx: number) => (
                    <View key={`${String(it.id ?? it.name)}-${idx}`} style={S.itemMini}>
                      {it.image_url ? (
                        <Image source={{ uri: it.image_url }} style={S.itemMiniImg} />
                      ) : (
                        <View style={[S.itemMiniImg, S.itemMiniImgFallback]}>
                          <Text style={{ fontSize: 16 }}>🍽️</Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={S.itemMiniName} numberOfLines={1}>
                          {String(it.name ?? 'Item')}
                        </Text>
                        <Text style={S.itemMiniMeta}>
                          Qty {Number(it.quantity ?? 1)} · ₹{Number(it.price ?? 0).toFixed(0)}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 13 }}>{it.is_veg ? '🟢' : '🔴'}</Text>
                    </View>
                  ))}
                  {items.length > shownItems.length && (
                    <Text style={S.moreTxt}>+{items.length - shownItems.length} more items</Text>
                  )}
                </View>
              )}
            </View>
          );
        })
      )}

      {/* ── Review Modal ── */}
      <ReviewModal
        visible={showModal}
        merchantName={merchant?.business_name ?? 'Restaurant'}
        onClose={() => setShowModal(false)}
        onSubmit={async (p) => {
          const res = await onSubmitReview(p);
          if (res.ok) setShowModal(false);
        }}
      />
    </View>
  );
}

// ── Breakdown pill ────────────────────────────────────────────────────────────
function BreakPill({ emoji, label, val }: { emoji: string; label: string; val: number }) {
  return (
    <View style={S.pill}>
      <Text style={{ fontSize: 11 }}>{emoji}</Text>
      <Text style={{ fontSize: 11, color: '#374151', fontWeight: '700' }}>{label}</Text>
      <Text style={{ fontSize: 11, color: '#F59E0B', fontWeight: '800' }}>
        {'★'.repeat(Math.round(val))}
      </Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  container:           { padding: 16, gap: 12, paddingBottom: 80 },

  ratingCard:          { backgroundColor: '#FFF', borderRadius: 16, padding: 20, flexDirection: 'row', gap: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  bigNumCol:           { alignItems: 'center', justifyContent: 'center', minWidth: 80 },
  big:                 { fontSize: 44, fontWeight: '900', color: '#1F2937' },
  totalTxt:            { fontSize: 11, color: '#9CA3AF', marginTop: 6, fontWeight: '600' },
  histCol:             { flex: 1, gap: 5, justifyContent: 'center' },
  histRow:             { flexDirection: 'row', alignItems: 'center', gap: 6 },
  histLbl:             { fontSize: 11, color: '#6B7280', width: 22, fontWeight: '700' },
  histCount:           { fontSize: 11, color: '#9CA3AF', width: 18, textAlign: 'right' },

  prefCard:            { backgroundColor: '#FFF', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 1 },
  prefTitle:           { fontWeight: '900', color: '#1F2937', fontSize: 14 },
  prefSub:             { color: '#9CA3AF', fontSize: 12, marginTop: 3 },

  reviewCta:           { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF7F0', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#FED7AA' },
  ctaTitle:            { fontWeight: '900', color: '#1F2937', fontSize: 14 },
  ctaSub:              { color: '#9CA3AF', marginTop: 2, fontSize: 12 },
  alreadyBox:          { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#A7F3D0' },

  reviewCard:          { backgroundColor: '#FFF', borderRadius: 14, padding: 14, elevation: 1, gap: 10 },
  reviewHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  avatar:              { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  customerName:        { fontWeight: '800', color: '#1F2937', fontSize: 13 },
  reviewDate:          { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  commentBubble:       { backgroundColor: '#F9FAFB', borderRadius: 10, padding: 10, borderLeftWidth: 3, borderLeftColor: COLORS.primary + '40' },
  pillRow:             { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill:                { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },

  itemsBox:            { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#F3F4F6', gap: 8 },
  itemsTitle:          { fontWeight: '900', color: '#1F2937', fontSize: 12, marginBottom: 2 },
  itemMini:            { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemMiniImg:         { width: 40, height: 40, borderRadius: 10 },
  itemMiniImgFallback: { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  itemMiniName:        { fontWeight: '800', color: '#1F2937', fontSize: 12 },
  itemMiniMeta:        { color: '#9CA3AF', fontSize: 11, fontWeight: '600', marginTop: 2 },
  moreTxt:             { color: '#9CA3AF', fontSize: 11, fontWeight: '700' },

  emptyWrap:           { alignItems: 'center', paddingVertical: 30 },
  emptyTitle:          { fontWeight: '900', color: '#1F2937', fontSize: 16 },
  emptySub:            { color: '#9CA3AF', marginTop: 4, fontSize: 13 },
});
