import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Animated,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useAuth } from '../../../contexts/AuthContext'
import { supabase } from '../../../lib/supabase'
import { COLORS } from '../../../lib/constants'
import { appCache, TTL } from '../../../lib/appCache'
import { ScreenLoader } from '../../../components/ui/ScreenLoader'
import type { PromoCode } from '../../../services/promoCodes'


// ─── Safe clipboard ───────────────────────────────────────────────────────────
let Clipboard: { setStringAsync?: (s: string) => Promise<void> } = {}
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Clipboard = require('expo-clipboard')
} catch {}


// ─── Helpers ─────────────────────────────────────────────────────────────────
const DAYS_MAP: Record<string, string> = {
  '1': 'Mon', '2': 'Tue', '3': 'Wed', '4': 'Thu',
  '5': 'Fri', '6': 'Sat', '7': 'Sun',
}

function formatDays(raw: any): string | null {
  if (raw == null) return null
  try {
    const days: string[] = Array.isArray(raw) ? raw : JSON.parse(String(raw))
    if (!Array.isArray(days) || !days.length) return null
    return days.map((d: string) => DAYS_MAP[d] ?? d).join(', ')
  } catch { return null }
}

function formatTime(t: string | null | undefined): string | null {
  if (!t) return null
  const parts = String(t).split(':').map(Number)
  const h = parts[0]
  const m = parts[1] ?? 0
  if (!Number.isFinite(h)) return null
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hh   = h % 12 || 12
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`
}

function formatExpiry(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  const now      = new Date()
  const daysLeft = Math.ceil((d.getTime() - now.getTime()) / 86_400_000)
  if (daysLeft <= 0) return 'Expired'
  if (daysLeft <= 3) return `Ends in ${daysLeft}d`
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function parseDealJson(raw: any): any {
  if (!raw) return {}
  if (typeof raw === 'string') { try { return JSON.parse(raw) } catch {} }
  return raw
}


// ─── Types ────────────────────────────────────────────────────────────────────
type Category = 'all' | 'bxgy' | 'percentage' | 'flat' | 'free_delivery' | 'merchant'

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'all',           label: 'All Offers'    },
  { id: 'bxgy',          label: 'Buy & Get'     },
  { id: 'percentage',    label: '% Off'          },
  { id: 'flat',          label: 'Flat Off'       },
  { id: 'free_delivery', label: 'Free Delivery'  },
  { id: 'merchant',      label: 'Restaurant'    },
]

const SELECT_COLS = [
  'id', 'code', 'description', 'discount_type', 'discount_value',
  'min_order_amount', 'max_discount_amount', 'usage_limit', 'used_count',
  'is_active', 'valid_from', 'valid_until', 'valid_days',
  'start_time', 'end_time', 'scope', 'merchant_id',
  'deal_type', 'deal_json', 'auto_apply', 'priority',
  'is_secret', 'secret_allowed_users',
].join(',')

const CACHE_KEY = 'offers_promos'


// ─── Data loader — two-step query (no join → no schema-cache WARN) ────────────
//
//  WHY: Supabase's `!inner()` join syntax requires the FK relationship to be
//  declared in the schema cache. If it isn't (e.g. the FK was added after the
//  last schema reload, or the relationship is on a view), every query prints:
//
//    WARN [OffersScreen] join query failed, retrying without join: Could not
//    find a relationship between 'promo_codes' and 'merchants'
//
//  FIX: Never attempt the join. Instead:
//    1. Fetch all active promo_codes (fast — indexed on is_active + valid_until)
//    2. Collect unique merchant_ids from merchant-scoped rows
//    3. Batch-fetch business_name for those IDs in one extra query
//    4. Map names back onto promos
//
//  Total = 2 Supabase round-trips instead of 1 failed + 1 fallback = 2.
//
async function loadOffersPromos(
  userId:    string | null,
  skipCache: boolean = false,
): Promise<(PromoCode & { merchant_name: string | null })[]> {

  // ── Cache hit ──────────────────────────────────────────────────────────────
  if (!skipCache) {
    const cached = appCache.get<(PromoCode & { merchant_name: string | null })[]>(CACHE_KEY)
    if (cached) return cached
  }

  const nowIso = new Date().toISOString()

  // ── Step 1: Fetch promo_codes — no join at all ─────────────────────────────
  const { data: plain, error } = await supabase
    .from('promo_codes')
    .select(SELECT_COLS)
    .eq('is_active', true)
    .or(`valid_from.is.null,valid_from.lte.${nowIso}`)
    .or(`valid_until.is.null,valid_until.gte.${nowIso}`)
    .order('priority',     { ascending: false })
    .order('valid_until',  { ascending: true  })
    .limit(100)

  if (error) throw error

  const rows = (plain ?? []) as any[]

  // ── Step 2: Batch-load merchant names for merchant-scoped promos ───────────
  const merchantIds = [
    ...new Set(
      rows
        .filter(p => p.scope === 'merchant' && p.merchant_id)
        .map(p => p.merchant_id as string),
    ),
  ]

  let merchantMap = new Map<string, string>()

  if (merchantIds.length) {
    const { data: merchants } = await supabase
      .from('merchants')
      .select('id, business_name')
      .in('id', merchantIds)

    merchantMap = new Map(
      (merchants ?? []).map((m: any) => [m.id as string, m.business_name as string]),
    )
  }

  // ── Step 3: Filter secret promos + normalise shape ─────────────────────────
  const result = rows
    .filter(p => {
      if (!p.is_secret) return true
      const allowed: string[] = Array.isArray(p.secret_allowed_users)
        ? p.secret_allowed_users
        : []
      return userId ? allowed.includes(userId) : false
    })
    .map(p => ({
      ...p,
      deal_json:     parseDealJson(p.deal_json),
      merchant_name: p.merchant_id
        ? (merchantMap.get(p.merchant_id) ?? null)
        : null,
    })) as (PromoCode & { merchant_name: string | null })[]

  appCache.set(CACHE_KEY, result, TTL.OFFERS)
  return result
}


// ─── PromoCard ────────────────────────────────────────────────────────────────
interface CardProps {
  promo:             PromoCode & { merchant_name?: string | null }
  copiedCode:        string | null
  onCopy:            (code: string) => void
  onGoToRestaurant?: (merchantId: string) => void
}

const PromoCard = React.memo(function PromoCard({
  promo, copiedCode, onCopy, onGoToRestaurant,
}: CardProps) {
  const [expanded, setExpanded] = useState(false)
  const anim = useRef(new Animated.Value(0)).current

  function toggle() {
    Animated.spring(anim, {
      toValue:         expanded ? 0 : 1,
      useNativeDriver: false,
      tension:         80,
      friction:        8,
    }).start()
    setExpanded(p => !p)
  }

  const deal           = parseDealJson(promo.deal_json)
  const isBxgy         = promo.deal_type === 'bxgy'
  const isFreeDelivery = promo.deal_type === 'free_delivery' || promo.discount_type === 'free_delivery'
  const isPercentage   = promo.discount_type === 'percentage' && !isBxgy
  const isFlat         = promo.discount_type === 'flat'

  const headerBg = isBxgy
    ? '#4F46E5'
    : isFreeDelivery ? '#0369A1'
    : isPercentage   ? COLORS.primary
    : '#D97706'

  const headerEmoji = isBxgy ? '🎁'
    : isFreeDelivery ? '🛵'
    : isPercentage   ? '💸'
    : '🪙'

  const badgeLabel = isBxgy
    ? `Buy ${deal?.buy?.qty ?? 1} Get ${deal?.get?.qty ?? 1} FREE`
    : isFreeDelivery ? 'FREE DELIVERY'
    : isPercentage   ? `${promo.discount_value}% OFF`
    : isFlat         ? `₹${promo.discount_value} OFF`
    : `₹${promo.discount_value} OFF`

  const daysStr   = formatDays(promo.valid_days)
  const startStr  = formatTime(promo.start_time)
  const endStr    = formatTime(promo.end_time)
  const expiry    = formatExpiry(promo.valid_until)
  const isExpired = expiry === 'Expired'
  const isCopied  = copiedCode === promo.code

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={toggle}
      style={[C.card, isExpired && { opacity: 0.55 }]}
    >
      {/* Coloured header */}
      <View style={[C.cardHeader, { backgroundColor: headerBg }]}>
        <View style={{ flex: 1 }}>
          <Text style={C.badgeLabel}>{badgeLabel}</Text>
          {!!promo.description && (
            <Text style={C.cardDesc} numberOfLines={expanded ? 4 : 2}>
              {promo.description}
            </Text>
          )}
        </View>
        <Text style={C.cardEmoji}>{headerEmoji}</Text>
      </View>

      {/* Code + Copy */}
      <View style={C.codeRow}>
        <View style={C.codePill}>
          <Text style={C.codeText}>{promo.code}</Text>
        </View>
        <TouchableOpacity
          style={[C.copyBtn, isCopied && C.copyBtnActive]}
          onPress={() => onCopy(promo.code)}
          hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
        >
          <Text style={[C.copyTxt, isCopied && C.copyTxtActive]}>
            {isCopied ? '✓ Copied' : 'Copy'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Meta pills */}
      <View style={C.metaRow}>
        {!!promo.min_order_amount && (
          <View style={C.pill}>
            <Text style={C.pillTxt}>Min ₹{promo.min_order_amount}</Text>
          </View>
        )}
        {!!promo.max_discount_amount && (
          <View style={C.pill}>
            <Text style={C.pillTxt}>Upto ₹{promo.max_discount_amount}</Text>
          </View>
        )}
        {!!expiry && (
          <View style={[C.pill, isExpired ? C.pillRed : C.pillOrange]}>
            <Text style={[C.pillTxt, isExpired ? { color: '#B91C1C' } : { color: '#92400E' }]}>
              {expiry}
            </Text>
          </View>
        )}
        {!!(promo as any).merchant_name && promo.scope === 'merchant' && (
          <View style={[C.pill, C.pillPrimary]}>
            <Text style={[C.pillTxt, { color: COLORS.primary }]}>
              🍽️ {(promo as any).merchant_name}
            </Text>
          </View>
        )}
      </View>

      {/* Expand chevron */}
      <View style={C.chevronRow}>
        <Text style={C.chevronTxt}>{expanded ? '▲ Less' : '▼ More details'}</Text>
      </View>

      {/* Expandable section */}
      {expanded && (
        <View style={C.details}>
          {!!daysStr && (
            <View style={C.detailItem}>
              <Text style={C.detailLabel}>Valid days</Text>
              <Text style={C.detailValue}>{daysStr}</Text>
            </View>
          )}
          {startStr && endStr && (
            <View style={C.detailItem}>
              <Text style={C.detailLabel}>Valid time</Text>
              <Text style={C.detailValue}>{startStr} – {endStr}</Text>
            </View>
          )}
          {isBxgy && deal?.selection && (
            <View style={C.detailItem}>
              <Text style={C.detailLabel}>Selection</Text>
              <Text style={C.detailValue}>
                {deal.selection === 'auto_cheapest'
                  ? 'Cheapest items get free automatically'
                  : 'You choose which items are free'}
              </Text>
            </View>
          )}
          {isBxgy && deal?.max_sets_per_order && (
            <View style={C.detailItem}>
              <Text style={C.detailLabel}>Max sets</Text>
              <Text style={C.detailValue}>{deal.max_sets_per_order} per order</Text>
            </View>
          )}
          {promo.scope === 'merchant' && promo.merchant_id && onGoToRestaurant && (
            <TouchableOpacity
              style={C.goBtn}
              onPress={() => onGoToRestaurant(promo.merchant_id!)}
            >
              <Text style={C.goBtnTxt}>Go to Restaurant →</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  )
})


// ─── Screen ───────────────────────────────────────────────────────────────────
export default function OffersScreen() {
  const insets   = useSafeAreaInsets()
  const router   = useRouter()
  const { user } = useAuth()

  const [promos,     setPromos]     = useState<(PromoCode & { merchant_name?: string | null })[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [category,   setCategory]   = useState<Category>('all')
  const [search,     setSearch]     = useState('')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [error,      setError]      = useState<string | null>(null)

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true)
    setError(null)
    try {
      const data = await loadOffersPromos(user?.id ?? null, isRefresh)
      setPromos(data as any)
    } catch (e: any) {
      console.warn('[OffersScreen]', e?.message)
      setError('Could not load offers. Pull down to retry.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.id])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    let list = promos
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(p =>
        p.code.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q) ||
        ((p as any).merchant_name ?? '').toLowerCase().includes(q),
      )
    }
    if (category !== 'all') {
      list = list.filter(p => {
        if (category === 'bxgy')          return p.deal_type === 'bxgy'
        if (category === 'free_delivery') return p.deal_type === 'free_delivery' || p.discount_type === 'free_delivery'
        if (category === 'merchant')      return p.scope === 'merchant'
        if (category === 'percentage')    return p.discount_type === 'percentage' && p.deal_type !== 'bxgy'
        if (category === 'flat')          return p.discount_type === 'flat'
        return true
      })
    }
    return list
  }, [promos, category, search])

  async function handleCopy(code: string) {
    try {
      if (Clipboard.setStringAsync) await Clipboard.setStringAsync(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(c => (c === code ? null : c)), 2500)
    } catch {
      Alert.alert('Promo Code', `Code: ${code}`)
    }
  }

  function handleGoToRestaurant(merchantId: string) {
    router.push(`/(customer)/restaurant/${merchantId}` as any)
  }

  // Count per category for badge labels
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: promos.length }
    for (const p of promos) {
      if (p.deal_type === 'bxgy')                                   c.bxgy          = (c.bxgy          ?? 0) + 1
      else if (p.deal_type === 'free_delivery' || p.discount_type === 'free_delivery')
                                                                    c.free_delivery = (c.free_delivery ?? 0) + 1
      else if (p.discount_type === 'percentage')                    c.percentage    = (c.percentage    ?? 0) + 1
      else if (p.discount_type === 'flat')                          c.flat          = (c.flat          ?? 0) + 1
      if (p.scope === 'merchant')                                   c.merchant      = (c.merchant      ?? 0) + 1
    }
    return c
  }, [promos])

  // ── Skeleton on initial load ──────────────────────────────────────────────
  if (loading) {
    return <ScreenLoader variant="offers" />
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <View style={[S.root, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={S.header}>
        <Text style={S.headerTitle}>🏷️ Offers & Deals</Text>
        {promos.length > 0 && (
          <Text style={S.headerSub}>
            {promos.length} offer{promos.length !== 1 ? 's' : ''} available
          </Text>
        )}
      </View>

      {/* Search */}
      <View style={S.searchWrap}>
        <Text style={S.searchIcon}>🔍</Text>
        <TextInput
          style={S.searchInput}
          placeholder="Search offers or restaurants..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {search.length > 0 && Platform.OS !== 'ios' && (
          <TouchableOpacity
            onPress={() => setSearch('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={{ color: '#9CA3AF', fontSize: 16, paddingRight: 8 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={S.tabsContent}
        style={S.tabsScroll}
      >
        {CATEGORIES.map(cat => {
          const count  = counts[cat.id] ?? 0
          const active = category === cat.id
          return (
            <TouchableOpacity
              key={cat.id}
              style={[S.tab, active && S.tabActive]}
              onPress={() => setCategory(cat.id)}
            >
              <Text style={[S.tabTxt, active && S.tabTxtActive]}>
                {cat.label}{count > 0 ? ` (${count})` : ''}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* Error banner */}
      {!!error && (
        <TouchableOpacity style={S.errorBanner} onPress={() => load()}>
          <Text style={S.errorTxt}>{error} Tap to retry.</Text>
        </TouchableOpacity>
      )}

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <PromoCard
            promo={item as any}
            copiedCode={copiedCode}
            onCopy={handleCopy}
            onGoToRestaurant={handleGoToRestaurant}
          />
        )}
        contentContainerStyle={S.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true) }}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        ListHeaderComponent={
          copiedCode ? (
            <View style={S.toast}>
              <Text style={S.toastTxt}>✅ {copiedCode} copied to clipboard!</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={S.empty}>
            <Text style={S.emptyEmoji}>🎉</Text>
            <Text style={S.emptyTitle}>
              {search ? 'No matching offers' : 'No offers right now'}
            </Text>
            <Text style={S.emptySub}>
              {search
                ? 'Try a different search term or clear filters.'
                : 'Check back soon — new deals are added regularly!'}
            </Text>
            {search.length > 0 && (
              <TouchableOpacity
                style={S.clearSearchBtn}
                onPress={() => { setSearch(''); setCategory('all') }}
              >
                <Text style={S.clearSearchTxt}>Clear filters</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}


// ─── Screen styles ────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root:          { flex: 1, backgroundColor: '#F3F4F6' },
  header:        { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  headerTitle:   { fontSize: 22, fontWeight: '900', color: '#111827' },
  headerSub:     { fontSize: 13, color: '#6B7280', marginTop: 2 },
  searchWrap:    {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 10, marginTop: 6,
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E5E7EB',
    paddingHorizontal: 12,
  },
  searchIcon:    { fontSize: 15, marginRight: 8 },
  searchInput:   { flex: 1, paddingVertical: 11, fontSize: 14, color: '#111827' },
  tabsScroll:    { flexGrow: 0, marginBottom: 10 },
  tabsContent:   { paddingHorizontal: 16, paddingRight: 24 },
  tab:           {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 999, marginRight: 8,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  tabActive:     { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabTxt:        { fontSize: 12, fontWeight: '600', color: '#374151' },
  tabTxtActive:  { color: '#fff' },
  toast:         {
    backgroundColor: '#D1FAE5', borderRadius: 10, padding: 10,
    marginBottom: 12, borderWidth: 1, borderColor: '#A7F3D0',
  },
  toastTxt:      { textAlign: 'center', fontWeight: '700', color: '#065F46', fontSize: 13 },
  errorBanner:   { marginHorizontal: 16, marginBottom: 8, backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12 },
  errorTxt:      { color: '#991B1B', fontWeight: '600', fontSize: 13, textAlign: 'center' },
  listContent:   { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 100 },
  empty:         { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyEmoji:    { fontSize: 52, marginBottom: 14 },
  emptyTitle:    { fontSize: 18, fontWeight: '800', color: '#374151', marginBottom: 8 },
  emptySub:      { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
  clearSearchBtn:{ marginTop: 16, backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  clearSearchTxt:{ color: '#fff', fontWeight: '700', fontSize: 14 },
})

// ─── Card styles ──────────────────────────────────────────────────────────────
const C = StyleSheet.create({
  card:          {
    backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  cardHeader:    { padding: 14, flexDirection: 'row', alignItems: 'flex-start' },
  badgeLabel:    { color: '#fff', fontWeight: '900', fontSize: 17 },
  cardDesc:      { color: 'rgba(255,255,255,0.88)', fontSize: 12, marginTop: 4, lineHeight: 18 },
  cardEmoji:     { fontSize: 30, marginLeft: 8 },
  codeRow:       {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  codePill:      {
    flex: 1, backgroundColor: '#F9FAFB', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  codeText:      { fontWeight: '900', fontSize: 15, color: '#111827', letterSpacing: 1.2 },
  copyBtn:       {
    paddingHorizontal: 14, paddingVertical: 7,
    marginLeft: 8, borderRadius: 10,
    borderWidth: 1.5, borderColor: COLORS.primary,
  },
  copyBtnActive: { backgroundColor: COLORS.primary },
  copyTxt:       { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  copyTxtActive: { color: '#fff' },
  metaRow:       { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, paddingVertical: 8 },
  pill:          {
    backgroundColor: '#F3F4F6', borderRadius: 999,
    paddingHorizontal: 9, paddingVertical: 4,
    marginRight: 6, marginBottom: 4,
  },
  pillOrange:    { backgroundColor: '#FEF3C7' },
  pillRed:       { backgroundColor: '#FEE2E2' },
  pillPrimary:   { backgroundColor: '#ECFDF5' },
  pillTxt:       { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  chevronRow:    { paddingHorizontal: 14, paddingBottom: 12, alignItems: 'flex-start' },
  chevronTxt:    { fontSize: 11, color: COLORS.primary, fontWeight: '700' },
  details:       {
    paddingHorizontal: 14, paddingBottom: 14,
    borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12,
  },
  detailItem:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  detailLabel:   { fontSize: 12, color: '#9CA3AF', fontWeight: '600', flex: 1 },
  detailValue:   { fontSize: 12, color: '#374151', fontWeight: '600', flex: 2, textAlign: 'right' },
  goBtn:         { marginTop: 10, backgroundColor: COLORS.primary, borderRadius: 10, padding: 11, alignItems: 'center' },
  goBtnTxt:      { color: '#fff', fontWeight: '800', fontSize: 14 },
})