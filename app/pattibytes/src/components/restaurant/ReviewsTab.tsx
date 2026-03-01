import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, Image } from 'react-native';
import { COLORS } from '../../lib/constants';
import StarRating from '../ui/StarRating';
import { averageRating, ratingHistogram } from '../../utils/ratings';
import ReviewModal from './ReviewModal';

export default function ReviewsTab({
  merchant,
  reviews,
  reviewItemsByReviewId,
  hasDeliveredOrder,
  deliveredOrderId,
  alreadyReviewed,
  notificationEnabled,
  onToggleNotification,
  onSubmitReview,
}: {
  merchant: any;
  reviews: any[];
  reviewItemsByReviewId: Record<string, any[]>;
  hasDeliveredOrder: boolean;
  deliveredOrderId: string | null;
  alreadyReviewed: boolean;
  notificationEnabled: boolean;
  onToggleNotification: (v: boolean) => void;
  onSubmitReview: (p: { rating: number; comment?: string | null }) => Promise<{ ok: boolean }>;
}) {
  const [showModal, setShowModal] = useState(false);

  const avg = useMemo(() => {
    const fromReviews = averageRating(reviews.map((r) => Number(r.rating)));
    const m = Number(merchant?.averagerating ?? 0);
    return m > 0 ? m : fromReviews;
  }, [merchant?.averagerating, reviews]);

  const hist = useMemo(() => ratingHistogram(reviews.map((r) => Number(r.rating))), [reviews]);

  return (
    <View style={{ padding: 16, gap: 12, paddingBottom: 80 }}>
      <View style={S.ratingCard}>
        <Text style={S.big}>{avg ? avg.toFixed(1) : '0.0'}</Text>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <StarRating rating={avg} size={18} />
          <Text style={{ color: COLORS.textLight, marginTop: 6, fontWeight: '700', fontSize: 12 }}>
            Based on {Number(merchant?.totalreviews ?? reviews.length)} reviews
          </Text>
          <Text style={{ color: COLORS.textLight, marginTop: 8, fontSize: 11 }}>
            5★ {hist[5]}  •  4★ {hist[4]}  •  3★ {hist[3]}  •  2★ {hist[2]}  •  1★ {hist[1]}
          </Text>
        </View>
      </View>

      <View style={S.prefCard}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '900', color: COLORS.text }}>Review alerts</Text>
          <Text style={{ color: COLORS.textLight, fontSize: 12, marginTop: 4 }}>
            Notify me when new reviews are posted for restaurants I ordered from or favourited.
          </Text>
        </View>
        <Switch value={notificationEnabled} onValueChange={onToggleNotification} />
      </View>

      {hasDeliveredOrder && !alreadyReviewed ? (
        <Pressable style={S.reviewCta} onPress={() => setShowModal(true)}>
          <Text style={{ fontSize: 20, marginRight: 10 }}>✍️</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '900', color: COLORS.text }}>Write a review</Text>
            <Text style={{ color: COLORS.textLight, marginTop: 2, fontSize: 12 }}>Your review will show the ordered items.</Text>
          </View>
          <Text style={{ color: COLORS.primary, fontSize: 18, fontWeight: '900' }}>›</Text>
        </Pressable>
      ) : null}

      {reviews.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 30 }}>
          <Text style={{ fontSize: 44, marginBottom: 10 }}>⭐</Text>
          <Text style={{ fontWeight: '900', color: COLORS.text }}>No reviews yet</Text>
          <Text style={{ color: COLORS.textLight, marginTop: 4 }}>Be the first to share your experience.</Text>
        </View>
      ) : (
        reviews.map((r) => {
          const items = reviewItemsByReviewId?.[String(r.id)] ?? [];
          const itemsShown = items.slice(0, 3);

          return (
            <View key={r.id} style={S.reviewCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={S.avatar}>
                    <Text style={{ color: '#FFF', fontWeight: '900' }}>
                      {String(r.customername ?? 'C').slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={{ fontWeight: '900', color: COLORS.text }}>{r.customername ?? 'Customer'}</Text>
                    <Text style={{ fontSize: 11, color: COLORS.textLight }}>
                      {new Date(r.createdat).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                </View>
                <StarRating rating={Number(r.rating ?? 0)} size={14} />
              </View>

              {!!r.comment && <Text style={{ color: '#4B5563', lineHeight: 20 }}>{String(r.comment)}</Text>}

              {itemsShown.length ? (
                <View style={S.itemsBox}>
                  <Text style={S.itemsTitle}>Items ordered</Text>
                  {itemsShown.map((it: any, idx: number) => (
                    <View key={`${String(it.id ?? it.name)}-${idx}`} style={S.itemMini}>
                      {it.image_url ? (
                        <Image source={{ uri: it.image_url }} style={S.itemMiniImg} />
                      ) : (
                        <View style={[S.itemMiniImg, { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }]}>
                          <Text>🍽️</Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={S.itemMiniName} numberOfLines={1}>
                          {String(it.name ?? 'Item')}
                        </Text>
                        <Text style={S.itemMiniMeta}>
                          Qty {Number(it.quantity ?? 1)} • ₹{Number(it.price ?? 0).toFixed(0)}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 14 }}>{it.is_veg ? '🟢' : '🔴'}</Text>
                    </View>
                  ))}
                  {items.length > itemsShown.length ? (
                    <Text style={S.moreTxt}>+{items.length - itemsShown.length} more</Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })
      )}

      <ReviewModal
        visible={showModal}
        merchantName={merchant?.businessname ?? 'Restaurant'}
        onClose={() => setShowModal(false)}
        onSubmit={async (p) => {
          const res = await onSubmitReview(p);
          if (res.ok) setShowModal(false);
        }}
      />
    </View>
  );
}

const S = StyleSheet.create({
  ratingCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', elevation: 1 },
  big: { fontSize: 46, fontWeight: '900', color: COLORS.text },

  prefCard: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 1 },

  reviewCta: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF7F0', borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: '#FED7AA' },

  reviewCard: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, elevation: 1 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },

  itemsBox: { marginTop: 12, backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#F3F4F6' },
  itemsTitle: { fontWeight: '900', color: COLORS.text, marginBottom: 10 },
  itemMini: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  itemMiniImg: { width: 38, height: 38, borderRadius: 10 },
  itemMiniName: { fontWeight: '900', color: COLORS.text, fontSize: 12 },
  itemMiniMeta: { color: COLORS.textLight, fontSize: 11, fontWeight: '700', marginTop: 2 },
  moreTxt: { color: COLORS.textLight, fontSize: 11, fontWeight: '800', marginTop: 2 },
});
