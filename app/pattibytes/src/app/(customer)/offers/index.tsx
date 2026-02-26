/* eslint-disable import/no-duplicates */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl, Clipboard,
  Platform, ToastAndroid,
} from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import { useCart } from '../../../contexts/CartContext'
import { COLORS } from '../../../lib/constants'

// ─── TextInput import fix (used in search bar above) ─────────────────────────
import { TextInput } from 'react-native'

// ─── Types ────────────────────────────────────────────────────────────────────
type PromoCode = {
  id: string
  code: string
  description: string | null
  discount_type: 'percentage' | 'flat'
  discount_value: number
  min_order_amount: number | null
  max_discount_amount: number | null
  scope: 'global' | 'merchant'
  merchant_id: string | null
  merchant_name?: string | null
  deal_type: string | null
  deal_json: any
  valid_from: string | null
  valid_until: string | null
  is_active: boolean
  usage_limit: number | null
  used_count: number | null
  auto_apply: boolean | null
}

type FilterTab = 'all' | 'percentage' | 'flat' | 'bxgy' | 'global' | 'merchant'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeLeft(dateStr: string | null): string | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - Date.now()
  if (diff <= 0) return 'Expired'
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (d > 0) return `${d}d ${h}h left`
  if (h > 0) return `${h}h ${m}m left`
  return `${m}m left`
}

function dealLabel(p: PromoCode): string {
  if (p.deal_type === 'bxgy') {
    const buy = p.deal_json?.buy?.qty ?? 1
    const get = p.deal_json?.get?.qty ?? 1
    return `Buy ${buy} Get ${get} FREE`
  }
  return p.discount_type === 'percentage'
    ? `${p.discount_value}% OFF`
    : `₹${p.discount_value} OFF`
}

function dealBg(p: PromoCode): string {
  if (p.deal_type === 'bxgy') return '#7C3AED'
  if (p.discount_type === 'percentage') return COLORS.primary
  return '#059669'
}

function dealEmoji(p: PromoCode): string {
  if (p.deal_type === 'bxgy') return '🎁'
  if (p.discount_type === 'percentage') return '🏷️'
  return '💰'
}

function promoIsExpired(p: PromoCode): boolean {
  if (!p.valid_until) return false
  return new Date(p.valid_until).getTime() < Date.now()
}

function promoIsNotStarted(p: PromoCode): boolean {
  if (!p.valid_from) return false
  return new Date(p.valid_from).getTime() > Date.now()
}

// ─── PromoCard ────────────────────────────────────────────────────────────────
function PromoCard({
  promo, onCopy, onApply, canApply,
}: {
  promo: PromoCode
  onCopy: (code: string) => void
  onApply: (promo: PromoCode) => void
  canApply: boolean
}) {
  const expired     = promoIsExpired(promo)
  const notStarted  = promoIsNotStarted(promo)
  const unavailable = expired || notStarted
  const label       = dealLabel(promo)
  const bg          = dealBg(promo)
  const emoji       = dealEmoji(promo)
  const tl          = timeLeft(promo.valid_until)
  const usageLeft   = (promo.usage_limit ?? 0) > 0
    ? promo.usage_limit! - (promo.used_count ?? 0) : null

  return (
    <View style={[S.promoCard, unavailable && { opacity: 0.55 }]}>
      {/* Left accent stripe */}
      <View style={[S.promoStripe, { backgroundColor: bg }]}>
        <Text style={{ fontSize: 24 }}>{emoji}</Text>
      </View>

      <View style={{ flex: 1, padding: 14 }}>
        {/* Top row: label + scope badge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={[S.promoValueLabel, { color: bg }]}>{label}</Text>
          <View style={[S.scopeBadge, { backgroundColor: promo.scope === 'global' ? '#EFF6FF' : '#FFF3EE' }]}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: promo.scope === 'global' ? '#1D4ED8' : COLORS.primary }}>
              {promo.scope === 'global' ? '🌍 Global' : `🏪 ${promo.merchant_name ?? 'Restaurant'}`}
            </Text>
          </View>
        </View>

        {/* Code */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <View style={S.codeBox}>
            <Text style={S.codeText}>{promo.code}</Text>
          </View>
          <TouchableOpacity
            style={[S.copyBtn, unavailable && { opacity: 0.5 }]}
            onPress={() => !unavailable && onCopy(promo.code)}
            disabled={unavailable}>
            <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 12 }}>
              📋 Copy
            </Text>
          </TouchableOpacity>
        </View>

        {/* Description */}
        {!!promo.description && (
          <Text style={{ fontSize: 13, color: '#4B5563', marginBottom: 6, lineHeight: 18 }}>
            {promo.description}
          </Text>
        )}

        {/* BxGy details */}
        {promo.deal_type === 'bxgy' && promo.deal_json && (
          <View style={{ backgroundColor: '#F5F3FF', borderRadius: 8, padding: 8, marginBottom: 6 }}>
            <Text style={{ fontSize: 12, color: '#5B21B6', fontWeight: '700' }}>
              {`🎁 Buy ${promo.deal_json?.buy?.qty ?? 1} items → Get ${promo.deal_json?.get?.qty ?? 1} item FREE`}
            </Text>
            {(promo.deal_json?.max_sets_per_order ?? 0) > 0 && (
              <Text style={{ fontSize: 11, color: '#7C3AED', marginTop: 2 }}>
                {`Max ${promo.deal_json.max_sets_per_order} free sets per order`}
              </Text>
            )}
          </View>
        )}

        {/* Meta info row */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          {!!promo.min_order_amount && (
            <View style={S.metaBadge}>
              <Text style={S.metaBadgeTxt}>{`Min ₹${promo.min_order_amount}`}</Text>
            </View>
          )}
          {!!promo.max_discount_amount && (
            <View style={S.metaBadge}>
              <Text style={S.metaBadgeTxt}>{`Max ₹${promo.max_discount_amount} off`}</Text>
            </View>
          )}
          {usageLeft !== null && usageLeft <= 20 && (
            <View style={[S.metaBadge, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
              <Text style={[S.metaBadgeTxt, { color: '#DC2626' }]}>
                {`Only ${usageLeft} left!`}
              </Text>
            </View>
          )}
        </View>

        {/* Validity */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 11, color: expired ? '#EF4444' : notStarted ? '#F59E0B' : '#9CA3AF' }}>
            {expired
              ? '❌ Expired'
              : notStarted
                ? `⏳ Starts ${new Date(promo.valid_from!).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`
                : tl
                  ? `⏱️ ${tl}`
                  : '✅ No expiry'
            }
          </Text>

          {/* Apply to cart */}
          {canApply && !unavailable && (
            <TouchableOpacity
              style={[S.applyBtn, { backgroundColor: bg }]}
              onPress={() => onApply(promo)}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>
                Apply to Cart →
              </Text>
            </TouchableOpacity>
          )}
          {!canApply && !unavailable && (
            <Text style={{ fontSize: 11, color: '#9CA3AF' }}>Add items to apply</Text>
          )}
        </View>
      </View>
    </View>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function OffersPage() {
  const router    = useRouter()
  const { user }  = useAuth()
  const { cart }  = useCart()

  const [promos,     setPromos]     = useState<PromoCode[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter,     setFilter]     = useState<FilterTab>('all')
  const [search,     setSearch]     = useState('')

  const hasCart = (cart?.items?.length ?? 0) > 0

  // ── Load all active promos ──────────────────────────────────────────────
  const loadPromos = useCallback(async () => {
    try {
      const now = new Date().toISOString()

      // Get global promos
      const { data: global } = await supabase.from('promo_codes')
        .select('*')
        .eq('is_active', true)
        .eq('scope', 'global')
        .or(`valid_until.is.null,valid_until.gte.${now}`)
        .order('priority', { ascending: false })
        .limit(30)

      // Get merchant promos (fetch all then filter by cart merchant or show all)
      const { data: merchant } = await supabase.from('promo_codes')
        .select('*')
        .eq('is_active', true)
        .eq('scope', 'merchant')
        .or(`valid_until.is.null,valid_until.gte.${now}`)
        .order('priority', { ascending: false })
        .limit(50)

      // Get merchant names
      const allMerchantIds = [...new Set((merchant ?? []).map((p: any) => p.merchant_id).filter(Boolean))]
      let merchantNameMap = new Map<string, string>()
      if (allMerchantIds.length) {
        const { data: merchants } = await supabase.from('merchants')
          .select('id,business_name').in('id', allMerchantIds)
        merchantNameMap = new Map((merchants ?? []).map((m: any) => [m.id, m.business_name]))
      }

      const withNames: PromoCode[] = [
        ...(global ?? []),
        ...(merchant ?? []).map((p: any) => ({
          ...p,
          merchant_name: merchantNameMap.get(p.merchant_id) ?? null,
        })),
      ] as PromoCode[]

      setPromos(withNames)
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to load offers')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { loadPromos() }, [loadPromos])

  const onRefresh = () => { setRefreshing(true); loadPromos() }

  // ── Filter & search ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = promos
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.code.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q) ||
        (p.merchant_name ?? '').toLowerCase().includes(q)
      )
    }
    switch (filter) {
      case 'percentage': return list.filter(p => p.discount_type === 'percentage' && p.deal_type !== 'bxgy')
      case 'flat':       return list.filter(p => p.discount_type === 'flat'       && p.deal_type !== 'bxgy')
      case 'bxgy':       return list.filter(p => p.deal_type === 'bxgy')
      case 'global':     return list.filter(p => p.scope === 'global')
      case 'merchant':   return list.filter(p => p.scope === 'merchant')
      default:           return list
    }
  }, [promos, filter, search])

  // Separate active from expired
  const activePromos  = filtered.filter(p => !promoIsExpired(p) && !promoIsNotStarted(p))
  const expiredPromos = filtered.filter(p => promoIsExpired(p) || promoIsNotStarted(p))

  // ── Copy code ──────────────────────────────────────────────────────────
  const handleCopy = (code: string) => {
    Clipboard.setString(code)
    if (Platform.OS === 'android') {
      ToastAndroid.show(`Code "${code}" copied!`, ToastAndroid.SHORT)
    } else {
      Alert.alert('Copied!', `Code "${code}" copied to clipboard.`)
    }
  }

  // ── Apply to cart ──────────────────────────────────────────────────────
  const handleApply = (promo: PromoCode) => {
    if (!hasCart) {
      Alert.alert('Empty Cart', 'Add items to your cart first, then apply this offer.')
      return
    }
    // Navigate to cart with promo pre-filled
    router.push({
      pathname: '/(customer)/cart' as any,
      params: { prefill_promo: promo.code },
    })
  }

  // ── Counts per tab ─────────────────────────────────────────────────────
  const counts = useMemo(() => ({
    all:        promos.filter(p => !promoIsExpired(p)).length,
    percentage: promos.filter(p => p.discount_type === 'percentage' && p.deal_type !== 'bxgy' && !promoIsExpired(p)).length,
    flat:       promos.filter(p => p.discount_type === 'flat' && p.deal_type !== 'bxgy' && !promoIsExpired(p)).length,
    bxgy:       promos.filter(p => p.deal_type === 'bxgy' && !promoIsExpired(p)).length,
    global:     promos.filter(p => p.scope === 'global' && !promoIsExpired(p)).length,
    merchant:   promos.filter(p => p.scope === 'merchant' && !promoIsExpired(p)).length,
  }), [promos])

  const TABS: { key: FilterTab; label: string; emoji: string }[] = [
    { key: 'all',        label: 'All',         emoji: '🏷️' },
    { key: 'bxgy',       label: 'BxGy',        emoji: '🎁' },
    { key: 'percentage', label: '% Off',        emoji: '📉' },
    { key: 'flat',       label: 'Flat Off',     emoji: '💰' },
    { key: 'global',     label: 'Global',       emoji: '🌍' },
    { key: 'merchant',   label: 'Restaurant',   emoji: '🏪' },
  ]

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <View style={S.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
            <Text style={{ fontSize: 22, color: '#fff' }}>‹</Text>
          </TouchableOpacity>
          <View>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900' }}>
              🏷️ Offers & Deals
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 1 }}>
              {`${counts.all} active offer${counts.all !== 1 ? 's' : ''} available`}
            </Text>
          </View>
        </View>

        {/* Search bar */}
        <View style={S.searchBar}>
          <Text style={{ fontSize: 15, marginRight: 8 }}>🔍</Text>
          <TextInput
            style={{ flex: 1, color: COLORS.text, fontSize: 14, paddingVertical: 0 }}
            placeholder="Search offers or code…"
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#9CA3AF"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={{ color: '#9CA3AF', fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
          {TABS.map(t => {
            const cnt = counts[t.key]
            return (
              <TouchableOpacity key={t.key}
                style={[S.tab, filter === t.key && S.tabActive]}
                onPress={() => setFilter(t.key)}>
                <Text style={{ fontSize: 14, marginRight: 4 }}>{t.emoji}</Text>
                <Text style={[S.tabTxt, filter === t.key && { color: COLORS.primary }]}>
                  {t.label}
                </Text>
                {cnt > 0 && (
                  <View style={[S.tabBadge, filter === t.key && { backgroundColor: COLORS.primary }]}>
                    <Text style={[S.tabBadgeTxt, filter === t.key && { color: '#fff' }]}>
                      {`${cnt}`}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ marginTop: 12, color: '#6B7280' }}>Loading offers…</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
        >
          {/* Cart banner */}
          {hasCart && (
            <View style={S.cartBanner}>
              <Text style={{ fontSize: 18, marginRight: 10 }}>🛒</Text>
              <Text style={{ flex: 1, fontSize: 13, color: '#065F46', fontWeight: '600' }}>
                {`You have items from ${cart!.merchant_name} in your cart. Tap "Apply to Cart" to use a promo!`}
              </Text>
            </View>
          )}

          {/* Active promos */}
          {activePromos.length > 0 ? (
            <>
              {activePromos.map(p => (
                <PromoCard
                  key={p.id}
                  promo={p}
                  onCopy={handleCopy}
                  onApply={handleApply}
                  canApply={hasCart}
                />
              ))}
            </>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Text style={{ fontSize: 64, marginBottom: 16 }}>🏷️</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 8 }}>
                No offers found
              </Text>
              <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center' }}>
                {search ? 'Try a different search term' : 'Check back soon for new deals!'}
              </Text>
              {search.length > 0 && (
                <TouchableOpacity onPress={() => { setSearch(''); setFilter('all') }}
                  style={{ marginTop: 16 }}>
                  <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Clear Search</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Expired / upcoming */}
          {expiredPromos.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#9CA3AF', marginBottom: 12, paddingHorizontal: 2 }}>
                ⏰ Expired / Upcoming
              </Text>
              {expiredPromos.map(p => (
                <PromoCard
                  key={p.id}
                  promo={p}
                  onCopy={handleCopy}
                  onApply={handleApply}
                  canApply={false}
                />
              ))}
            </View>
          )}

          {/* How to use section */}
          <View style={S.howToBox}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 14 }}>
              💡 How to use promo codes
            </Text>
            {[
              { step: '1', txt: 'Browse and copy a promo code above' },
              { step: '2', txt: 'Add items to your cart from any restaurant' },
              { step: '3', txt: 'On the Cart page, paste the code in "Promo Code" field' },
              { step: '4', txt: 'Tap Apply and enjoy your discount!' },
            ].map(s => (
              <View key={s.step} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                <View style={S.stepDot}>
                  <Text style={{ color: COLORS.primary, fontWeight: '900', fontSize: 13 }}>
                    {s.step}
                  </Text>
                </View>
                <Text style={{ flex: 1, fontSize: 13, color: '#4B5563', lineHeight: 19 }}>
                  {s.txt}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Bottom nav */}
      <View style={S.bottomNav}>
        {[
          { icon: '🏠', label: 'Home',   route: '/(customer)/dashboard' },
          { icon: '📦', label: 'Orders', route: '/(customer)/orders'    },
          { icon: '🛒', label: 'Cart',   route: '/(customer)/cart'      },
          { icon: '🏷️', label: 'Offers', route: '/(customer)/offers', active: true },
          { icon: '👤', label: 'Profile',route: '/(customer)/profile'   },
        ].map(n => (
          <TouchableOpacity key={n.label} style={{ flex: 1, alignItems: 'center' }}
            onPress={() => router.push(n.route as any)}>
            <Text style={{ fontSize: 22 }}>{n.icon}</Text>
            <Text style={{ fontSize: 10, color: n.active ? COLORS.primary : '#9CA3AF', fontWeight: '700', marginTop: 3 }}>
              {n.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
// ─── Styles ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  tabActive: {
    backgroundColor: '#fff',
  },
  tabTxt: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  tabBadge: {
    marginLeft: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeTxt: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
  },
  cartBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
  },
  promoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  promoStripe: {
    width: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoValueLabel: {
    fontSize: 16,
    fontWeight: '900',
  },
  scopeBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  codeBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
  },
  codeText: {
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 2,
    color: COLORS.text,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF3EE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: '#FED7AA',
  },
  metaBadge: {
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  metaBadgeTxt: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '600',
  },
  applyBtn: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  howToBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFF3EE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    flexShrink: 0,
  },
  bottomNav: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
  },
})
