/* eslint-disable react-hooks/rules-of-hooks */
import React, { memo, useMemo } from 'react'
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { COLORS } from '../../lib/constants'
import {
  isDishAvailableNow,
  dishNextAvailable,
  isRestaurantOpen,
  isCustomProductAvailable,
} from '../../lib/availability'
import type { MenuResult, RestaurantResult, CustomProductResult } from '../../types/search'

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  query:                 string
  searching:             boolean
  menuResults:           MenuResult[]
  restaurantResults:     RestaurantResult[]
  customProductResults:  CustomProductResult[]
  onMenuItemPress:       (merchantId: string, itemId: string) => void
  onRestaurantPress:     (merchantId: string) => void
  onCustomProductPress:  (productId: string) => void
}

// ── Availability pill ─────────────────────────────────────────────────────────
function AvailPill({ available, hint }: { available: boolean; hint?: string | null }) {
  return (
    <View style={[AP.pill, available ? AP.pillOn : AP.pillOff]}>
      <Text style={[AP.txt, available ? AP.txtOn : AP.txtOff]}>
        {available ? '● Available' : '○ Unavailable'}
      </Text>
      {!available && !!hint && (
        <Text style={AP.hint} numberOfLines={1}>{hint}</Text>
      )}
    </View>
  )
}
const AP = StyleSheet.create({
  pill:   { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 4 },
  pillOn: { backgroundColor: '#DCFCE7' },
  pillOff:{ backgroundColor: '#FEE2E2' },
  txt:    { fontSize: 9, fontWeight: '900', letterSpacing: 0.2 },
  txtOn:  { color: '#16A34A' },
  txtOff: { color: '#DC2626' },
  hint:   { fontSize: 9, color: '#9CA3AF', marginTop: 2, maxWidth: 100 },
})

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ emoji, title, count }: { emoji: string; title: string; count: number }) {
  return (
    <View style={SH.row}>
      <Text style={SH.emoji}>{emoji}</Text>
      <Text style={SH.title}>{title}</Text>
      <View style={SH.badge}>
        <Text style={SH.badgeTxt}>{count}</Text>
      </View>
    </View>
  )
}
const SH = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, paddingHorizontal: 2 },
  emoji:    { fontSize: 14 },
  title:    { fontSize: 14, fontWeight: '900', color: '#111827', flex: 1 },
  badge:    { backgroundColor: '#FFF3EE', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: '#FED7AA' },
  badgeTxt: { fontSize: 11, fontWeight: '800', color: COLORS.primary },
})

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <View style={[C.card, { alignItems: 'center' }]}>
      <View style={{ width: 72, height: 72, borderRadius: 14, backgroundColor: '#F3F4F6', marginBottom: 8 }} />
      <View style={{ height: 10, width: 80, borderRadius: 5, backgroundColor: '#E5E7EB' }} />
      <View style={{ height: 9,  width: 50, borderRadius: 5, backgroundColor: '#F3F4F6', marginTop: 6 }} />
    </View>
  )
}

// ── Menu item card ────────────────────────────────────────────────────────────
const MenuCard = memo(function MenuCard({
  item, onPress,
}: { item: MenuResult; onPress: () => void }) {
  const available  = isDishAvailableNow(item)
  const nextHint   = available ? null : dishNextAvailable(item)
  const hasDisc    = (item.discount_percentage ?? 0) > 0
  const discPrice  = hasDisc
    ? item.price * (1 - item.discount_percentage! / 100)
    : item.price

  return (
    <Pressable
      style={({ pressed }) => [C.card, !available && C.cardDim, pressed && { opacity: 0.82 }]}
      onPress={onPress}
    >
      {/* Image */}
      <View style={C.imgBox}>
        {item.image_url
          ? <Image source={{ uri: item.image_url }} style={C.img} resizeMode="cover" />
          : <Text style={{ fontSize: 28 }}>🍽️</Text>
        }
        {!available && <View style={C.dimOverlay} />}
        {hasDisc && available && (
          <View style={C.discBadge}>
            <Text style={C.discTxt}>{item.discount_percentage}%</Text>
          </View>
        )}
        {item.is_veg !== undefined && item.is_veg !== null && (
          <View style={C.vegDot}>
            <Text style={{ fontSize: 9 }}>{item.is_veg ? '🟢' : '🔴'}</Text>
          </View>
        )}
      </View>

      {/* Name */}
      <Text style={C.name} numberOfLines={2}>{item.name}</Text>

      {/* Price */}
      <View style={C.priceRow}>
        <Text style={[C.price, !available && { color: '#9CA3AF' }]}>
          ₹{discPrice.toFixed(0)}
        </Text>
        {hasDisc && available && (
          <Text style={C.strikePrice}>₹{item.price.toFixed(0)}</Text>
        )}
      </View>

      {/* Merchant */}
      <View style={C.merchantRow}>
        <Text style={{ fontSize: 9 }}>🏪</Text>
        <Text style={C.merchantTxt} numberOfLines={1}>{item.merchant_name ?? '—'}</Text>
      </View>

      {/* Availability */}
      <AvailPill available={available} hint={nextHint} />
    </Pressable>
  )
})

// ── Restaurant card ───────────────────────────────────────────────────────────
const RestaurantCard = memo(function RestaurantCard({
  item, onPress,
}: { item: RestaurantResult; onPress: () => void }) {
  const isOpen    = isRestaurantOpen(item)
  const cuisines  = (item.cuisine_types ?? []).slice(0, 2).join(' · ')
  const rating    = Number(item.average_rating ?? 0)

  return (
    <Pressable
      style={({ pressed }) => [R.card, !isOpen && R.cardDim, pressed && { opacity: 0.82 }]}
      onPress={onPress}
    >
      {/* Logo / banner */}
      <View style={R.imgBox}>
        {item.logo_url || item.banner_url
          ? <Image source={{ uri: item.logo_url ?? item.banner_url! }} style={R.img} resizeMode="cover" />
          : (
            <View style={R.logoFallback}>
              <Text style={{ fontSize: 26 }}>🏪</Text>
            </View>
          )
        }
        {!isOpen && <View style={C.dimOverlay} />}
        {item.is_verified && (
          <View style={R.verifiedBadge}>
            <Text style={{ fontSize: 9 }}>✓</Text>
          </View>
        )}
      </View>

      {/* Name */}
      <Text style={R.name} numberOfLines={2}>{item.business_name}</Text>

      {/* Cuisine */}
      {!!cuisines && (
        <Text style={R.cuisine} numberOfLines={1}>{cuisines}</Text>
      )}

      {/* Rating + delivery */}
      <View style={R.metaRow}>
        {rating > 0 && (
          <View style={R.ratingPill}>
            <Text style={{ fontSize: 9 }}>⭐</Text>
            <Text style={R.ratingTxt}>{rating.toFixed(1)}</Text>
          </View>
        )}
        {!!item.avg_delivery_time && (
          <Text style={R.deliveryTxt}>{item.avg_delivery_time}m</Text>
        )}
      </View>

      {/* Min order */}
      {!!item.min_order_amount && item.min_order_amount > 0 && (
        <Text style={R.minOrder}>Min ₹{item.min_order_amount}</Text>
      )}

      {/* Open/Closed */}
      <AvailPill
        available={isOpen}
        hint={
          !isOpen && item.opening_time
            ? `Opens ${item.opening_time.slice(0, 5)}`
            : null
        }
      />
    </Pressable>
  )
})
const R = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 10,
    width: 130,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    gap: 4,
  },
  cardDim: { opacity: 0.7 },
  imgBox: {
    width: '100%', height: 76, borderRadius: 10,
    backgroundColor: '#F3F4F6', overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4, position: 'relative',
  },
  img:         { width: '100%', height: '100%' },
  logoFallback:{ alignItems: 'center', justifyContent: 'center', flex: 1 },
  verifiedBadge: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: '#16A34A', width: 16, height: 16,
    borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },
  name:     { fontSize: 12, fontWeight: '900', color: '#111827', lineHeight: 16 },
  cuisine:  { fontSize: 10, color: '#6B7280', fontWeight: '600' },
  metaRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  ratingPill: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: '#FEF3C7', borderRadius: 6,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  ratingTxt:   { fontSize: 10, fontWeight: '900', color: '#92400E' },
  deliveryTxt: { fontSize: 10, color: '#6B7280', fontWeight: '700' },
  minOrder:    { fontSize: 10, color: '#9CA3AF', fontWeight: '600' },
})

// ── Custom product card ───────────────────────────────────────────────────────
const ProductCard = memo(function ProductCard({
  item, onPress,
}: { item: CustomProductResult; onPress: () => void }) {
  const available  = isCustomProductAvailable(item)
  const outOfStock = available === false && item.stock_qty === 0

  return (
    <Pressable
      style={({ pressed }) => [P.card, !available && P.cardDim, pressed && { opacity: 0.82 }]}
      onPress={onPress}
    >
      {/* Image */}
      <View style={P.imgBox}>
        {item.imageurl
          ? <Image source={{ uri: item.imageurl }} style={C.img} resizeMode="cover" />
          : <Text style={{ fontSize: 26 }}>🛒</Text>
        }
        {!available && <View style={C.dimOverlay} />}
        {!!item.unit && (
          <View style={P.unitBadge}>
            <Text style={P.unitTxt}>{item.unit}</Text>
          </View>
        )}
      </View>

      {/* Name */}
      <Text style={P.name} numberOfLines={2}>{item.name}</Text>

      {/* Price */}
      <Text style={[P.price, !available && { color: '#9CA3AF' }]}>
        ₹{Number(item.price).toFixed(0)}
      </Text>

      {/* Category */}
      {!!item.category && (
        <Text style={P.category} numberOfLines={1}>{item.category}</Text>
      )}

      {/* Availability */}
      <AvailPill
        available={available}
        hint={outOfStock ? 'Out of stock' : undefined}
      />
    </Pressable>
  )
})
const P = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 10,
    width: 120,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    gap: 3,
  },
  cardDim: { opacity: 0.7 },
  imgBox: {
    width: '100%', height: 72, borderRadius: 10,
    backgroundColor: '#F9FAFB', overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4, position: 'relative',
  },
  unitBadge: {
    position: 'absolute', bottom: 4, left: 4,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 6,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  unitTxt:  { fontSize: 9, color: '#FFF', fontWeight: '800' },
  name:     { fontSize: 12, fontWeight: '800', color: '#111827', lineHeight: 16 },
  price:    { fontSize: 13, fontWeight: '900', color: COLORS.primary },
  category: { fontSize: 10, color: '#9CA3AF', fontWeight: '600', textTransform: 'capitalize' },
})

// ── Shared card / overlay styles ──────────────────────────────────────────────
const C = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 10,
    width: 118,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  cardDim: { opacity: 0.65 },
  imgBox: {
    width: 72, height: 72, borderRadius: 12,
    backgroundColor: '#F9FAFB', overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8, alignSelf: 'center',
    position: 'relative',
  },
  img:  { width: '100%', height: '100%' },
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  discBadge: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: '#EF4444', borderRadius: 6,
    paddingHorizontal: 4, paddingVertical: 2,
  },
  discTxt:    { color: '#FFF', fontSize: 8, fontWeight: '900' },
  vegDot:     { position: 'absolute', bottom: 4, right: 4 },
  name:       { fontSize: 12, fontWeight: '700', color: '#111827', textAlign: 'center', lineHeight: 16 },
  priceRow:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, justifyContent: 'center' },
  price:      { fontSize: 13, color: COLORS.primary, fontWeight: '900' },
  strikePrice:{ fontSize: 10, color: '#9CA3AF', textDecorationLine: 'line-through' },
  merchantRow:{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  merchantTxt:{ fontSize: 10, color: '#6B7280', fontWeight: '600', flex: 1 },
})

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ query }: { query: string }) {
  return (
    <View style={E.wrap}>
      <Text style={{ fontSize: 32 }}>🔍</Text>
      <Text style={E.title}>No results for &quot;{query}&quot;</Text>
      <Text style={E.sub}>Try a different restaurant name, dish or product</Text>
    </View>
  )
}
const E = StyleSheet.create({
  wrap:  { alignItems: 'center', paddingVertical: 24, marginHorizontal: 14, gap: 4 },
  title: { fontSize: 14, fontWeight: '800', color: '#374151', marginTop: 6 },
  sub:   { fontSize: 12, color: '#9CA3AF', textAlign: 'center', lineHeight: 17 },
})

// ── Horizontal section wrapper ─────────────────────────────────────────────────
function Section({ children }: { children: React.ReactNode }) {
  return (
    <View style={SEC.wrap}>{children}</View>
  )
}
const SEC = StyleSheet.create({
  wrap: { marginBottom: 10 },
})

// ── Main component ─────────────────────────────────────────────────────────────
export default function SearchResults({
  query,
  searching,
  menuResults,
  restaurantResults,
  customProductResults,
  onMenuItemPress,
  onRestaurantPress,
  onCustomProductPress,
}: Props) {
  if (query.trim().length < 2) return null

  const totalResults = useMemo(
    () => menuResults.length + restaurantResults.length + customProductResults.length,
    [menuResults, restaurantResults, customProductResults],
  )

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (searching) {
    return (
      <View style={WRAP.outer}>
        <View style={WRAP.skeletonHeader}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={WRAP.searchingTxt}>Searching for &quot;{query}&quot;…</Text>
        </View>
        {/* Skeleton rows */}
        {[0, 1].map(section => (
          <View key={section} style={{ marginHorizontal: 14, marginBottom: 14 }}>
            <View style={{ height: 14, width: 120, borderRadius: 6, backgroundColor: '#E5E7EB', marginBottom: 12 }} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
            </ScrollView>
          </View>
        ))}
      </View>
    )
  }

  // ── No results ───────────────────────────────────────────────────────────────
  if (totalResults === 0) {
    return (
      <View style={WRAP.outer}>
        <EmptyState query={query} />
      </View>
    )
  }

  // ── Results ──────────────────────────────────────────────────────────────────
  return (
    <View style={WRAP.outer}>
      {/* Results count bar */}
      <View style={WRAP.countBar}>
        <Text style={WRAP.countTxt}>
          {totalResults} result{totalResults !== 1 ? 's' : ''} for
        </Text>
        <View style={WRAP.queryChip}>
          <Text style={WRAP.queryTxt} numberOfLines={1}>&quot;{query}&quot;</Text>
        </View>
      </View>

      {/* ── Restaurants ── */}
      {restaurantResults.length > 0 && (
        <Section>
          <View style={{ marginHorizontal: 14 }}>
            <SectionHeader emoji="🏪" title="Restaurants" count={restaurantResults.length} />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={WRAP.list}
          >
            {restaurantResults.map(item => (
              <RestaurantCard
                key={item.id}
                item={item}
                onPress={() => onRestaurantPress(item.id)}
              />
            ))}
          </ScrollView>
        </Section>
      )}

      {/* ── Menu Items ── */}
      {menuResults.length > 0 && (
        <Section>
          <View style={{ marginHorizontal: 14 }}>
            <SectionHeader emoji="🍽️" title="Menu Items" count={menuResults.length} />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={WRAP.list}
          >
            {menuResults.map(item => (
              <MenuCard
                key={item.id}
                item={item}
                onPress={() => onMenuItemPress(item.merchant_id, item.id)}
              />
            ))}
          </ScrollView>
        </Section>
      )}

      {/* ── Custom Products ── */}
      {customProductResults.length > 0 && (
        <Section>
          <View style={{ marginHorizontal: 14 }}>
            <SectionHeader emoji="🛒" title="Products" count={customProductResults.length} />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={WRAP.list}
          >
            {customProductResults.map(item => (
              <ProductCard
                key={item.id}
                item={item}
                onPress={() => onCustomProductPress(item.id)}
              />
            ))}
          </ScrollView>
        </Section>
      )}
    </View>
  )
}

const WRAP = StyleSheet.create({
  outer: { marginBottom: 8 },
  skeletonHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 14, marginBottom: 14,
  },
  searchingTxt: { fontSize: 13, color: '#9CA3AF', fontWeight: '600' },
  countBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 14, marginBottom: 12,
  },
  countTxt:   { fontSize: 12, color: '#6B7280', fontWeight: '700' },
  queryChip:  {
    backgroundColor: COLORS.primary + '15', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    maxWidth: 180,
  },
  queryTxt: { fontSize: 12, fontWeight: '800', color: COLORS.primary },
  list: { gap: 10, paddingHorizontal: 14, paddingBottom: 4 },
})