import React, { memo, useCallback, useMemo, useState } from 'react'
import {
  Image,
  LayoutAnimation,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native'
import { COLORS } from '../../lib/constants'
import StarRating from '../ui/StarRating'
import ReviewModal from './ReviewModal'

// ── Types matching actual DB schema ───────────────────────────────────────────
export interface ItemRatingEntry {
  item_id:   string
  item_name: string
  rating:    number
  comment?:  string | null
}

export interface ReviewRow {
  id:               string
  order_id?:        string | null
  customer_id:      string
  merchant_id?:     string | null
  driver_id?:       string | null
  // Ratings
  rating?:          number | null
  overall_rating?:  number | null
  merchant_rating?: number | null
  food_rating?:     number | null
  delivery_rating?: number | null
  driver_rating?:   number | null
  // Content
  title?:           string | null
  comment?:         string | null
  images?:          string[] | null
  item_ratings?:    ItemRatingEntry[] | string | null
  // Timestamps
  created_at:       string
  updated_at?:      string | null
  // Joined
  profiles?: {
    full_name?:       string | null
    avatar_url?:      string | null
    username?:        string | null
    trust_score?:     number | null
    is_trusted?:      boolean | null
    total_orders?:    number | null
    completed_orders?:number | null
    account_status?:  string | null
  } | null
  customer_name?: string | null
}

interface Props {
  merchant:               any
  reviews:                ReviewRow[]
  reviewItemsByReviewId?: Record<string, any[]>
  hasDeliveredOrder:      boolean
  deliveredOrderId:       string | null
  alreadyReviewed:        boolean
  notificationEnabled:    boolean
  onToggleNotification:   (v: boolean) => void
  onSubmitReview:         (p: {
    rating:            number
    comment?:          string | null
    food_rating?:      number | null
    delivery_rating?:  number | null
    driver_rating?:    number | null
  }) => Promise<{ ok: boolean }>
}

type SortKey    = 'newest' | 'oldest' | 'highest' | 'lowest'
type FilterStar = 0 | 1 | 2 | 3 | 4 | 5

// ── Helpers ───────────────────────────────────────────────────────────────────
function calcAvg(ratings: number[]): number {
  const valid = ratings.filter(r => r > 0)
  if (!valid.length) return 0
  return valid.reduce((a, b) => a + b, 0) / valid.length
}

function ratingHistogram(ratings: number[]): Record<number, number> {
  const h: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  ratings.forEach(r => {
    const s = Math.round(r)
    if (s >= 1 && s <= 5) h[s]++
  })
  return h
}

function sentimentLabel(r: number) {
  if (r >= 5) return { text: 'Excellent', emoji: '🎉', color: '#16A34A' }
  if (r >= 4) return { text: 'Good',       emoji: '😊', color: '#65A30D' }
  if (r >= 3) return { text: 'Okay',       emoji: '😐', color: '#CA8A04' }
  if (r >= 2) return { text: 'Poor',       emoji: '😕', color: '#EA580C' }
  return              { text: 'Very poor', emoji: '😢', color: '#DC2626' }
}

function timeAgo(dateStr: string): string {
  const diff   = Date.now() - new Date(dateStr).getTime()
  const mins   = Math.floor(diff / 60_000)
  const hours  = Math.floor(mins / 60)
  const days   = Math.floor(hours / 24)
  const weeks  = Math.floor(days / 7)
  const months = Math.floor(days / 30)
  if (mins  < 2)   return 'just now'
  if (mins  < 60)  return `${mins}m ago`
  if (hours < 24)  return `${hours}h ago`
  if (days  < 7)   return `${days}d ago`
  if (weeks < 5)   return `${weeks}w ago`
  if (months < 12) return `${months}mo ago`
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

/** Split comment on the embedded "---Delivery feedback---" separator */
function parseComment(raw: string | null | undefined): {
  main:     string | null
  delivery: string | null
} {
  if (!raw) return { main: null, delivery: null }
  const SEP = /\n*[-–]{2,}\s*Delivery feedback\s*[-–]{2,}\n*/i
  const parts = raw.split(SEP)
  const main     = parts[0]?.trim() || null
  const delivery = parts[1]?.trim() || null
  return { main, delivery }
}

/** Parse item_ratings which can be a JSON string or already-parsed array */
function parseItemRatings(raw: ItemRatingEntry[] | string | null | undefined): ItemRatingEntry[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  try { return JSON.parse(raw) as ItemRatingEntry[] }
  catch { return [] }
}

function overallRating(r: ReviewRow): number {
  return Number(r.overall_rating ?? r.rating ?? r.merchant_rating ?? 0)
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function StarBar({ count, total }: { count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <View style={SB.track}>
      <View style={[SB.fill, { width: `${pct}%` as any }]} />
    </View>
  )
}
const SB = StyleSheet.create({
  track: { flex: 1, height: 7, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' },
  fill:  { height: '100%', backgroundColor: '#F59E0B', borderRadius: 4 },
})

function AvatarView({ name, url, size = 44 }: { name: string; url?: string | null; size?: number }) {
  const initial = name.trim().slice(0, 1).toUpperCase() || '?'
  const hue     = ((name.charCodeAt(0) ?? 65) * 37 + (name.charCodeAt(1) ?? 65) * 17) % 360
  return url ? (
    <Image
      source={{ uri: url }}
      style={{ width: size, height: size, borderRadius: size / 2 } as any}
      resizeMode="cover"
    />
  ) : (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: `hsl(${hue},52%,44%)`,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color: '#FFF', fontWeight: '900', fontSize: size * 0.38 }}>{initial}</Text>
    </View>
  )
}

/** A single row: emoji + label + mini star dots */
function SubRatingRow({
  emoji, label, value,
}: { emoji: string; label: string; value: number }) {
  const s    = sentimentLabel(value)
  const dots = Math.round(value)
  return (
    <View style={SR.row}>
      <Text style={SR.emoji}>{emoji}</Text>
      <Text style={SR.label}>{label}</Text>
      <View style={SR.starsWrap}>
        {[1,2,3,4,5].map(i => (
          <Text key={i} style={[SR.star, { color: i <= dots ? '#F59E0B' : '#E5E7EB' }]}>★</Text>
        ))}
      </View>
      <View style={[SR.badge, { backgroundColor: s.color + '18' }]}>
        <Text style={[SR.badgeTxt, { color: s.color }]}>{value.toFixed(1)}</Text>
      </View>
    </View>
  )
}
const SR = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emoji:    { fontSize: 16, width: 22 },
  label:    { fontSize: 12, fontWeight: '700', color: '#374151', flex: 1 },
  starsWrap:{ flexDirection: 'row', gap: 2 },
  star:     { fontSize: 13 },
  badge:    { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  badgeTxt: { fontSize: 11, fontWeight: '900' },
})

/** Per-item rating card from item_ratings JSON */
const ItemRatingCard = memo(function ItemRatingCard({ entry }: { entry: ItemRatingEntry }) {
  const s    = sentimentLabel(entry.rating)
  const dots = Math.round(entry.rating)
  return (
    <View style={IC.card}>
      <View style={IC.top}>
        <Text style={IC.name} numberOfLines={1}>{entry.item_name}</Text>
        <View style={[IC.badge, { backgroundColor: s.color + '18', borderColor: s.color + '40' }]}>
          <Text style={[IC.badgeNum, { color: s.color }]}>{entry.rating}</Text>
          <Text style={[IC.badgeLbl, { color: s.color }]}>{s.emoji}</Text>
        </View>
      </View>
      <View style={IC.starsRow}>
        {[1,2,3,4,5].map(i => (
          <Text key={i} style={[IC.star, { color: i <= dots ? '#F59E0B' : '#E5E7EB' }]}>★</Text>
        ))}
      </View>
      {!!entry.comment && (
        <Text style={IC.comment}>{entry.comment}</Text>
      )}
    </View>
  )
})
const IC = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 4,
  },
  top:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  name:     { fontSize: 12, fontWeight: '800', color: '#1F2937', flex: 1 },
  badge:    { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 8, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2 },
  badgeNum: { fontSize: 12, fontWeight: '900' },
  badgeLbl: { fontSize: 12 },
  starsRow: { flexDirection: 'row', gap: 2 },
  star:     { fontSize: 12 },
  comment:  { fontSize: 11, color: '#6B7280', lineHeight: 16, marginTop: 2 },
})

// ── ReviewCard ─────────────────────────────────────────────────────────────────
interface ReviewCardProps {
  review:     ReviewRow
  isExpanded: boolean
  onToggle:   () => void
}

const ReviewCard = memo(function ReviewCard({ review: r, isExpanded, onToggle }: ReviewCardProps) {
  const name       = r.profiles?.full_name ?? r.customer_name ?? 'Customer'
  const avatarUrl  = r.profiles?.avatar_url ?? null
  const isTrusted  = r.profiles?.is_trusted === true
  const username   = r.profiles?.username ?? null
  const totalOrders= Number(r.profiles?.total_orders ?? 0)
  const trustScore = Number(r.profiles?.trust_score ?? 0)

  const overall  = overallRating(r)
  const sentiment= sentimentLabel(overall)

  const { main: mainComment, delivery: deliveryComment } = parseComment(r.comment)
  const itemRatings = parseItemRatings(r.item_ratings)

  // Sub-ratings — only render if value > 0
  const subRatings = [
    r.merchant_rating  ? { emoji: '🏪', label: 'Restaurant', value: r.merchant_rating  } : null,
    r.food_rating      ? { emoji: '🍔', label: 'Food',        value: r.food_rating      } : null,
    r.delivery_rating  ? { emoji: '🚚', label: 'Delivery',    value: r.delivery_rating  } : null,
    r.driver_rating    ? { emoji: '🛵', label: 'Driver',      value: r.driver_rating    } : null,
  ].filter(Boolean) as { emoji: string; label: string; value: number }[]

  const hasExtra = subRatings.length > 0 || itemRatings.length > 0 || !!deliveryComment

  return (
    <View style={S.reviewCard}>

      {/* ── Header ── */}
      <View style={S.cardHeader}>
        <AvatarView name={name} url={avatarUrl} size={46} />

        <View style={{ flex: 1 }}>
          <View style={S.nameRow}>
            <Text style={S.customerName} numberOfLines={1}>{name}</Text>
            {isTrusted && (
              <View style={S.trustedBadge}>
                <Text style={S.trustedTxt}>✓ Trusted</Text>
              </View>
            )}
          </View>
          {username ? <Text style={S.usernameTxt}>@{username}</Text> : null}
          <View style={S.metaRow}>
            {totalOrders > 0 && <Text style={S.metaChip}>{totalOrders} orders</Text>}
            {trustScore  > 0 && <Text style={S.metaChip}>Trust {trustScore.toFixed(0)}</Text>}
            <Text style={S.metaChip}>{timeAgo(r.created_at)}</Text>
          </View>
        </View>

        {/* Overall badge */}
        <View style={[S.overallBadge, { backgroundColor: sentiment.color + '18', borderColor: sentiment.color + '35' }]}>
          <Text style={[S.overallNum, { color: sentiment.color }]}>{overall.toFixed(1)}</Text>
          <Text style={{ fontSize: 16, lineHeight: 20 }}>{sentiment.emoji}</Text>
          <StarRating rating={overall} size={11} />
        </View>
      </View>

      {/* ── Title ── */}
      {!!r.title && (
        <Text style={S.reviewTitle}>{r.title}</Text>
      )}

      {/* ── Main comment ── */}
      {!!mainComment && (
        <View style={S.commentCard}>
          <View style={S.commentTopRow}>
            <View style={S.commentDot} />
            <Text style={S.commentLabel}>Review</Text>
          </View>
          <Text style={S.commentText}>{mainComment}</Text>
        </View>
      )}

      {/* ── Delivery comment (parsed from separator) ── */}
      {!!deliveryComment && (
        <View style={[S.commentCard, S.deliveryCard]}>
          <View style={S.commentTopRow}>
            <Text style={{ fontSize: 13 }}>🚚</Text>
            <Text style={[S.commentLabel, { color: '#1D4ED8' }]}>Delivery feedback</Text>
          </View>
          <Text style={[S.commentText, { color: '#1E40AF' }]}>{deliveryComment}</Text>
        </View>
      )}

      {/* ── Expandable extra info ── */}
      {hasExtra && (
        <>
          {isExpanded && (
            <View style={S.expandSection}>

              {/* Sub-ratings */}
              {subRatings.length > 0 && (
                <View style={S.subBlock}>
                  <Text style={S.subBlockTitle}>⭐ Ratings breakdown</Text>
                  <View style={S.subBlockInner}>
                    {subRatings.map(sr => (
                      <SubRatingRow key={sr.label} {...sr} />
                    ))}
                  </View>
                </View>
              )}

              {/* Item ratings */}
              {itemRatings.length > 0 && (
                <View style={S.subBlock}>
                  <Text style={S.subBlockTitle}>🍽️ Item ratings</Text>
                  <View style={S.itemRatingsGrid}>
                    {itemRatings.map((entry, i) => (
                      <ItemRatingCard key={entry.item_id ?? i} entry={entry} />
                    ))}
                  </View>
                </View>
              )}

            </View>
          )}

          <Pressable style={S.expandBtn} onPress={onToggle}>
            <View style={S.expandBtnInner}>
              <Text style={S.expandBtnTxt}>
                {isExpanded ? '▲ Less details' : '▼ More details'}
              </Text>
              {!isExpanded && subRatings.length > 0 && (
                <View style={S.expandHintRow}>
                  {subRatings.slice(0, 3).map(sr => (
                    <Text key={sr.label} style={S.expandHintChip}>
                      {sr.emoji} {sr.value.toFixed(1)}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          </Pressable>
        </>
      )}
    </View>
  )
})

// ── Sort options ──────────────────────────────────────────────────────────────
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'newest',  label: 'Newest'  },
  { key: 'oldest',  label: 'Oldest'  },
  { key: 'highest', label: 'Highest' },
  { key: 'lowest',  label: 'Lowest'  },
]

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ReviewsTab({
  merchant,
  reviews,
  hasDeliveredOrder,
  alreadyReviewed,
  notificationEnabled,
  onToggleNotification,
  onSubmitReview,
}: Props) {
  const [showModal,   setShowModal]   = useState(false)
  const [sortKey,     setSortKey]     = useState<SortKey>('newest')
  const [filterStar,  setFilterStar]  = useState<FilterStar>(0)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const toggleExpand = useCallback((id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpandedIds(prev => {
      const next = new Set(prev)
      // eslint-disable-next-line no-unused-expressions
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const ratings = useMemo(
    () => reviews.map(overallRating).filter(v => v > 0),
    [reviews],
  )
  const avg        = useMemo(() => {
    const live = calcAvg(ratings)
    if (live > 0) return live
    return Number(merchant?.average_rating ?? 0)
  }, [ratings, merchant?.average_rating])

  const hist       = useMemo(() => ratingHistogram(ratings), [ratings])
  const totalCount = Number(merchant?.total_reviews ?? reviews.length)
  const avgS       = sentimentLabel(avg)

  const displayedReviews = useMemo(() => {
    let list = [...reviews]
    if (filterStar > 0) {
      list = list.filter(r => Math.round(overallRating(r)) === filterStar)
    }
    list.sort((a, b) => {
      const ra = overallRating(a), rb = overallRating(b)
      if (sortKey === 'newest')  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sortKey === 'oldest')  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      if (sortKey === 'highest') return rb - ra
      if (sortKey === 'lowest')  return ra - rb
      return 0
    })
    return list
  }, [reviews, filterStar, sortKey])

  return (
    <View style={S.container}>

      {/* ── Rating hero ────────────────────────────────────────────── */}
      <View style={S.ratingCard}>
        <View style={S.bigCol}>
          <Text style={S.bigNum}>{avg > 0 ? avg.toFixed(1) : '—'}</Text>
          <StarRating rating={avg} size={18} />
          <View style={[S.avgBadge, { backgroundColor: avgS.color + '18' }]}>
            <Text style={[S.avgBadgeTxt, { color: avgS.color }]}>{avgS.emoji} {avgS.text}</Text>
          </View>
          <Text style={S.totalTxt}>{totalCount} review{totalCount !== 1 ? 's' : ''}</Text>
        </View>

        <View style={S.histDivider} />

        <View style={S.histCol}>
          {[5, 4, 3, 2, 1].map(star => (
            <Pressable
              key={star}
              style={[S.histRow, filterStar === star && S.histRowActive]}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
                setFilterStar(prev => (prev === star ? 0 : star as FilterStar))
              }}
            >
              <Text style={S.histLbl}>{star}★</Text>
              <StarBar count={hist[star]} total={reviews.length} />
              <Text style={S.histCount}>{hist[star]}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* ── Notification pref ──────────────────────────────────────── */}
      <View style={S.prefCard}>
        <View style={{ flex: 1 }}>
          <Text style={S.prefTitle}>🔔 Review alerts</Text>
          <Text style={S.prefSub}>
            Notify me when new reviews arrive for restaurants I&apos;ve ordered from.
          </Text>
        </View>
        <Switch
          value={notificationEnabled}
          onValueChange={onToggleNotification}
          trackColor={{ false: '#E5E7EB', true: COLORS.primary }}
          thumbColor="#fff"
        />
      </View>

      {/* ── Write review CTA ───────────────────────────────────────── */}
      {hasDeliveredOrder && !alreadyReviewed && (
        <Pressable
          style={({ pressed }) => [S.reviewCta, pressed && { opacity: 0.85 }]}
          onPress={() => setShowModal(true)}
        >
          <View style={S.ctaIcon}>
            <Text style={{ fontSize: 22 }}>✍️</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={S.ctaTitle}>Share your experience</Text>
            <Text style={S.ctaSub}>Your honest review helps other customers.</Text>
          </View>
          <View style={S.ctaArrow}>
            <Text style={S.ctaArrowTxt}>›</Text>
          </View>
        </Pressable>
      )}

      {alreadyReviewed && (
        <View style={S.alreadyBox}>
          <Text style={{ fontSize: 20 }}>✅</Text>
          <View style={{ flex: 1 }}>
            <Text style={S.alreadyTitle}>Review submitted</Text>
            <Text style={S.alreadySub}>Thanks for sharing your experience.</Text>
          </View>
        </View>
      )}

      {/* ── Sort / filter bar ──────────────────────────────────────── */}
      {reviews.length > 0 && (
        <View style={S.sortBar}>
          <View style={S.sortChips}>
            {filterStar > 0 && (
              <Pressable
                style={S.activeFilterPill}
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
                  setFilterStar(0)
                }}
              >
                <Text style={S.activeFilterTxt}>{filterStar}★ ✕</Text>
              </Pressable>
            )}
            {SORT_OPTIONS.map(o => (
              <Pressable
                key={o.key}
                style={[S.sortChip, sortKey === o.key && S.sortChipOn]}
                onPress={() => setSortKey(o.key)}
              >
                <Text style={[S.sortChipTxt, sortKey === o.key && S.sortChipOnTxt]}>
                  {o.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={S.countTxt}>{displayedReviews.length}/{totalCount}</Text>
        </View>
      )}

      {/* ── Divider heading ────────────────────────────────────────── */}
      {reviews.length > 0 && (
        <View style={S.sectionHead}>
          <View style={S.sectionLine} />
          <Text style={S.sectionTxt}>Customer reviews</Text>
          <View style={S.sectionLine} />
        </View>
      )}

      {/* ── List ───────────────────────────────────────────────────── */}
      {displayedReviews.length === 0 ? (
        <View style={S.emptyWrap}>
          <Text style={{ fontSize: 44, marginBottom: 10 }}>
            {reviews.length === 0 ? '⭐' : '🔍'}
          </Text>
          <Text style={S.emptyTitle}>
            {reviews.length === 0 ? 'No reviews yet' : 'No matching reviews'}
          </Text>
          <Text style={S.emptySub}>
            {reviews.length === 0
              ? 'Be the first to share your experience!'
              : 'Try a different filter.'}
          </Text>
          {filterStar > 0 && (
            <Pressable
              style={S.clearBtn}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
                setFilterStar(0)
              }}
            >
              <Text style={S.clearBtnTxt}>Clear filter</Text>
            </Pressable>
          )}
        </View>
      ) : (
        displayedReviews.map(r => (
          <ReviewCard
            key={r.id}
            review={r}
            isExpanded={expandedIds.has(r.id)}
            onToggle={() => toggleExpand(r.id)}
          />
        ))
      )}

      <ReviewModal
        visible={showModal}
        merchantName={merchant?.business_name ?? merchant?.businessname ?? 'Restaurant'}
        onClose={() => setShowModal(false)}
        onSubmit={async p => {
          const res = await onSubmitReview(p)
          if (res.ok) setShowModal(false)
        }}
      />
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  container: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 80, gap: 12 },

  // Rating card
  ratingCard: {
    backgroundColor: '#FFF', borderRadius: 18, padding: 18,
    flexDirection: 'row', elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  bigCol:    { alignItems: 'center', justifyContent: 'center', minWidth: 88, paddingRight: 12 },
  bigNum:    { fontSize: 48, fontWeight: '900', color: '#1F2937', lineHeight: 54 },
  avgBadge:  { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginTop: 6 },
  avgBadgeTxt:{ fontSize: 11, fontWeight: '800' },
  totalTxt:  { fontSize: 11, color: '#9CA3AF', marginTop: 6, fontWeight: '600' },
  histDivider:{ width: 1, backgroundColor: '#F3F4F6', marginVertical: 4 },
  histCol:   { flex: 1, gap: 6, justifyContent: 'center', paddingLeft: 12 },
  histRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 6, paddingHorizontal: 4, paddingVertical: 2 },
  histRowActive:{ backgroundColor: '#FEF3C7' },
  histLbl:   { fontSize: 11, color: '#6B7280', width: 22, fontWeight: '700' },
  histCount: { fontSize: 11, color: '#9CA3AF', width: 20, textAlign: 'right', fontWeight: '700' },

  // Pref
  prefCard: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 1,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  prefTitle: { fontWeight: '900', color: '#1F2937', fontSize: 14 },
  prefSub:   { color: '#9CA3AF', fontSize: 12, marginTop: 3, lineHeight: 17 },

  // CTA
  reviewCta: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF7F0', borderRadius: 16, padding: 14,
    borderWidth: 1.5, borderColor: '#FED7AA', gap: 12,
  },
  ctaIcon: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center', elevation: 1,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
  },
  ctaTitle: { fontWeight: '900', color: '#1F2937', fontSize: 14 },
  ctaSub:   { color: '#9CA3AF', marginTop: 2, fontSize: 12 },
  ctaArrow: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  ctaArrowTxt: { color: '#FFF', fontSize: 20, fontWeight: '900', marginTop: -2 },

  // Already
  alreadyBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4',
    borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#A7F3D0', gap: 12,
  },
  alreadyTitle: { fontWeight: '900', color: '#15803D', fontSize: 13 },
  alreadySub:   { color: '#4ADE80', fontSize: 11, marginTop: 2 },

  // Sort bar
  sortBar:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sortChips:  { flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1 },
  activeFilterPill: {
    backgroundColor: '#FEF3C7', borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: '#FCD34D',
  },
  activeFilterTxt: { fontSize: 11, fontWeight: '800', color: '#92400E' },
  sortChip: {
    backgroundColor: '#F3F4F6', borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: 'transparent',
  },
  sortChipOn:    { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  sortChipTxt:   { fontSize: 11, fontWeight: '800', color: '#374151' },
  sortChipOnTxt: { color: '#FFF' },
  countTxt:      { fontSize: 11, color: '#9CA3AF', fontWeight: '700' },

  // Section head
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionLine: { flex: 1, height: 1, backgroundColor: '#F3F4F6' },
  sectionTxt:  { fontSize: 11, fontWeight: '900', color: '#9CA3AF', letterSpacing: 0.5 },

  // Review card
  reviewCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 14, gap: 10,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 6, shadowOffset: { width: 0, height: 1 },
  },
  cardHeader:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  nameRow:       { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  customerName:  { fontWeight: '900', color: '#1F2937', fontSize: 14, flexShrink: 1 },
  trustedBadge:  {
    backgroundColor: '#EFF6FF', borderRadius: 999,
    paddingHorizontal: 7, paddingVertical: 2,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  trustedTxt:    { fontSize: 10, fontWeight: '800', color: '#1D4ED8' },
  usernameTxt:   { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  metaRow:       { flexDirection: 'row', gap: 4, marginTop: 4, flexWrap: 'wrap' },
  metaChip:      {
    backgroundColor: '#F3F4F6', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
    fontSize: 10, fontWeight: '700', color: '#6B7280',
  },
  overallBadge: {
    alignItems: 'center', borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 6, gap: 3, minWidth: 60,
  },
  overallNum:    { fontSize: 20, fontWeight: '900', lineHeight: 24 },

  reviewTitle: { fontSize: 15, fontWeight: '900', color: '#1F2937', lineHeight: 20 },

  // Comment cards — no quotes, distinct by type
  commentCard: {
    backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#F3F4F6', gap: 6,
  },
  deliveryCard: {
    backgroundColor: '#EFF6FF', borderColor: '#BFDBFE',
  },
  commentTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  commentDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  commentLabel:  { fontSize: 11, fontWeight: '800', color: COLORS.primary, letterSpacing: 0.3 },
  commentText:   { fontSize: 13, color: '#374151', lineHeight: 20 },

  // Expand section
  expandSection: { gap: 10 },
  subBlock: {
    backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#F3F4F6', gap: 8,
  },
  subBlockTitle: { fontSize: 12, fontWeight: '900', color: '#374151' },
  subBlockInner: { gap: 8 },
  itemRatingsGrid:{ gap: 8 },

  // Expand button
  expandBtn:      { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10 },
  expandBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  expandBtnTxt:   { fontSize: 12, fontWeight: '800', color: COLORS.primary },
  expandHintRow:  { flexDirection: 'row', gap: 6 },
  expandHintChip: { fontSize: 11, color: '#6B7280', fontWeight: '700' },

  // Empty
  emptyWrap:  { alignItems: 'center', paddingVertical: 36, gap: 4 },
  emptyTitle: { fontWeight: '900', color: '#1F2937', fontSize: 16 },
  emptySub:   { color: '#9CA3AF', marginTop: 4, fontSize: 13, textAlign: 'center' },
  clearBtn:   {
    marginTop: 14, backgroundColor: COLORS.primary,
    borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10,
  },
  clearBtnTxt:{ color: '#FFF', fontWeight: '900', fontSize: 13 },
})