/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, Image, RefreshControl,
} from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { useCart } from '../../../contexts/CartContext'
import { COLORS } from '../../../lib/constants'

// ── Categories ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'food',        label: 'Food Items',   emoji: '🍱', desc: 'Meals, snacks' },
  { id: 'grocery',    label: 'Grocery',      emoji: '🛒', desc: 'Vegetables, fruits, staples' },
  { id: 'dairy',      label: 'Dairy',        emoji: '🥛', desc: 'Milk, paneer, curd, butter' },
  { id: 'medicines',  label: 'Medicines',    emoji: '💊', desc: 'Prescription & OTC' },
  { id: 'bakery',     label: 'Bakery',       emoji: '🎂', desc: 'Cakes, pastries, bread' },
  { id: 'stationery', label: 'Stationery',   emoji: '✏️', desc: 'Books, pens, supplies' },
  { id: 'other',      label: 'Other',        emoji: '📦', desc: 'Everything else' },
]

const CAT_COLORS: Record<string, { bg: string; text: string }> = {
  dairy:      { bg: '#DBEAFE', text: '#1D4ED8' },
  grocery:    { bg: '#D1FAE5', text: '#065F46' },
  medicines:  { bg: '#FEE2E2', text: '#991B1B' },
  food:       { bg: '#FEF3C7', text: '#92400E' },
  bakery:     { bg: '#FCE7F3', text: '#9D174D' },
  stationery: { bg: '#EDE9FE', text: '#5B21B6' },
  other:      { bg: '#F3F4F6', text: '#374151' },
}

type CustomProduct = {
  id: string
  name: string
  category: string
  price: number
  unit: string | null
  imageurl: string | null
  description: string | null
  isactive: boolean
}

function getCatInfo(id: string) {
  return CATEGORIES.find(c => c.id === id) ?? { emoji: '📦', label: id, desc: '' }
}
function getCatColors(cat: string) {
  return CAT_COLORS[cat] ?? { bg: '#F3F4F6', text: '#374151' }
}

// ── Product Card ──────────────────────────────────────────────────────────────
function ProductCard({
  product, qty, onAdd, onRemove,
}: {
  product: CustomProduct
  qty: number
  onAdd: () => void
  onRemove: () => void
}) {
  const c = getCatColors(product.category)
  const e = getCatInfo(product.category)
  const validImg = !!product.imageurl && product.imageurl.startsWith('http')

  return (
    <View style={PC.card}>
      <View style={PC.imgWrap}>
        {validImg ? (
          <Image source={{ uri: product.imageurl! }} style={PC.img} resizeMode="cover" />
        ) : (
          <View style={[PC.img, { backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ fontSize: 36 }}>{e.emoji}</Text>
          </View>
        )}
        <View style={[PC.badge, { backgroundColor: c.bg }]}>
          <Text style={{ fontSize: 8, color: c.text, fontWeight: '800' }}>
            {product.category.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={{ flex: 1, paddingLeft: 12 }}>
        <Text style={PC.name} numberOfLines={2}>{product.name}</Text>
        {!!product.description && product.description !== 'y' && (
          <Text style={PC.desc} numberOfLines={2}>{product.description}</Text>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8 }}>
          <View>
            <Text style={PC.price}>₹{Number(product.price).toFixed(2)}</Text>
            {!!product.unit && <Text style={PC.unit}>per {product.unit}</Text>}
          </View>
          {qty === 0 ? (
            <TouchableOpacity style={PC.addBtn} onPress={onAdd} activeOpacity={0.8}>
              <Text style={PC.addBtnTxt}>+ ADD</Text>
            </TouchableOpacity>
          ) : (
            <View style={PC.stepper}>
              <TouchableOpacity style={PC.stepBtn} onPress={onRemove}>
                <Text style={PC.stepTxt}>−</Text>
              </TouchableOpacity>
              <Text style={PC.stepQty}>{qty}</Text>
              <TouchableOpacity style={PC.stepBtn} onPress={onAdd}>
                <Text style={PC.stepTxt}>+</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  )
}

const PC = StyleSheet.create({
  card:     { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 12, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  imgWrap:  { position: 'relative', flexShrink: 0 },
  img:      { width: 88, height: 88, borderRadius: 12 },
  badge:    { position: 'absolute', bottom: 0, left: 0, right: 0, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, paddingVertical: 3, alignItems: 'center' },
  name:     { fontSize: 14, fontWeight: '800', color: '#111827', lineHeight: 20 },
  desc:     { fontSize: 11, color: '#6B7280', marginTop: 3, lineHeight: 16 },
  price:    { fontSize: 16, fontWeight: '900', color: COLORS.primary },
  unit:     { fontSize: 10, color: '#9CA3AF', marginTop: 1 },
  addBtn:   { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnTxt:{ color: '#fff', fontWeight: '800', fontSize: 12 },
  stepper:  { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 10 },
  stepBtn:  { width: 32, height: 34, alignItems: 'center', justifyContent: 'center' },
  stepTxt:  { color: COLORS.primary, fontWeight: '800', fontSize: 20, lineHeight: 22 },
  stepQty:  { width: 30, textAlign: 'center', fontWeight: '800', color: '#111827', fontSize: 14 },
})

// ════════════════════════════════════════════════════════════════════════════
export default function ShopScreen() {
  // ✅ cat param passed from dashboard ShopByCategory chips
  const { cat } = useLocalSearchParams<{ cat?: string }>()
  const router  = useRouter()
  const { cart, addToCart } = useCart()

  const [products,    setProducts]   = useState<CustomProduct[]>([])
  const [loading,     setLoading]    = useState(true)
  const [refreshing,  setRefreshing] = useState(false)
  const [qtys,        setQtys]       = useState<Record<string, number>>({})
  const [search,      setSearch]     = useState('')
  // ✅ Pre-select the category passed from dashboard
  const [catFilter,   setCatFilter]  = useState(cat ?? 'all')

  // ── Load customproducts ───────────────────────────────────────────────────
  const loadProducts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('customproducts')          // ✅ correct table
        .select('id,name,category,price,unit,imageurl,description,isactive')
        .eq('isactive', true)            // ✅ boolean true
        .order('category', { ascending: true })
        .order('name',     { ascending: true })
      if (error) throw error
      setProducts((data ?? []) as CustomProduct[])
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { loadProducts() }, [loadProducts])

  // When cat param changes (e.g. back-nav), re-apply filter
  useEffect(() => {
    if (cat) setCatFilter(cat)
  }, [cat])

  // ── Unique categories from DB results ─────────────────────────────────────
  const dbCats = useMemo(() => (
    ['all', ...Array.from(new Set(products.map(p => p.category)))]
  ), [products])

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => products.filter(p => {
    const matchCat    = catFilter === 'all' || p.category === catFilter
    const q           = search.trim().toLowerCase()
    const matchSearch = !q ||
      p.name.toLowerCase().includes(q) ||
      (p.description ?? '').toLowerCase().includes(q)
    return matchCat && matchSearch
  }), [products, catFilter, search])

  // ── Grouped by category ───────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const map: Record<string, CustomProduct[]> = {}
    filtered.forEach(p => { if (!map[p.category]) map[p.category] = []; map[p.category].push(p) })
    return Object.entries(map)
  }, [filtered])

  // ── Qty helpers ───────────────────────────────────────────────────────────
  const getQty    = (id: string) => qtys[id] ?? 0
  const addQty    = (id: string) => setQtys(p => ({ ...p, [id]: (p[id] ?? 0) + 1 }))
  const removeQty = (id: string) => setQtys(p => {
    const q = (p[id] ?? 0) - 1
    if (q <= 0) { const n = { ...p }; delete n[id]; return n }
    return { ...p, [id]: q }
  })

  const selectedCount = useMemo(() => Object.values(qtys).reduce((s, q) => s + q, 0), [qtys])
  const selectedTotal = useMemo(() => Object.entries(qtys).reduce((s, [id, q]) => {
    const p = products.find(x => x.id === id)
    return s + (p ? Number(p.price) * q : 0)
  }, 0), [qtys, products])

  // ── Add to cart ───────────────────────────────────────────────────────────
  const doAddToCart = (entries: [string, number][]) => {
    entries.forEach(([id, qty]) => {
      const p = products.find(x => x.id === id)
      if (!p) return
      addToCart(
        {
          id:                 p.id,
          name:               p.name,
          price:              Number(p.price),
          quantity:           qty,
          image_url:           p.imageurl ?? null,
          category:           p.category,
          is_veg:              null,
          discount_percentage: null,
          merchant_id:         'store',
        },
        'store',
        'PBExpress Store',
      )
    })
    setQtys({})
    Alert.alert('Added to Cart! 🛒', `${entries.length} product type${entries.length !== 1 ? 's' : ''} added.`, [
      { text: 'View Cart', onPress: () => router.push('/(customer)/cart' as any) },
      { text: 'Continue Shopping' },
    ])
  }

  const handleAddToCart = () => {
    const entries = Object.entries(qtys).filter(([, q]) => q > 0)
    if (!entries.length) { Alert.alert('No items selected'); return }
    if (cart?.merchantid && cart.merchantid !== 'store' && (cart.items?.length ?? 0) > 0) {
      Alert.alert(
        'Different Store',
        `Your cart has items from "${cart.merchantname}". Clear it and add store products?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Clear & Add', style: 'destructive', onPress: () => doAddToCart(entries) },
        ]
      )
      return
    }
    doAddToCart(entries)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const activeCatInfo = getCatInfo(catFilter === 'all' ? 'other' : catFilter)

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <Stack.Screen options={{
        title: catFilter !== 'all' ? `${getCatInfo(catFilter).emoji}  ${getCatInfo(catFilter).label}` : '🛍️  Shop',
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800' },
        headerRight: () => (
          <TouchableOpacity
            style={{ marginRight: 14 }}
            onPress={() => router.push('/(customer)/custom-order' as any)}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>📝 Request</Text>
          </TouchableOpacity>
        ),
      }} />

      {/* ── Search bar ─────────────────────────────────────────────────── */}
      <View style={S.searchBar}>
        <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
        <TextInput
          style={{ flex: 1, fontSize: 14, color: '#111827', paddingVertical: 12 }}
          placeholder="Search products…"
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#9CA3AF"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} style={{ padding: 4 }}>
            <Text style={{ color: '#9CA3AF', fontSize: 18 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Category filter chips ──────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}
      >
        {dbCats.map(c => {
          const info   = c === 'all' ? { emoji: '🌟', label: 'All' } : getCatInfo(c)
          const active = catFilter === c
          const cc     = getCatColors(c)
          return (
            <TouchableOpacity
              key={c}
              style={[S.chip, active && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}
              onPress={() => setCatFilter(c)}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 14 }}>{info.emoji}</Text>
              <Text style={[S.chipTxt, active && { color: '#fff' }]}>{info.label}</Text>
              {c !== 'all' && (
                <View style={[S.chipBadge, active && { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
                  <Text style={[{ fontSize: 10, fontWeight: '800', color: '#6B7280' }, active && { color: '#fff' }]}>
                    {products.filter(p => p.category === c).length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* ── Product count ───────────────────────────────────────────────── */}
      {!loading && products.length > 0 && (
        <Text style={{ fontSize: 12, color: '#9CA3AF', paddingHorizontal: 16, paddingBottom: 4 }}>
          {filtered.length} product{filtered.length !== 1 ? 's' : ''}
          {catFilter !== 'all' ? ` in ${getCatInfo(catFilter).label}` : ''}
        </Text>
      )}

      {/* ── List ────────────────────────────────────────────────────────── */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ color: '#9CA3AF', marginTop: 12 }}>Loading products…</Text>
        </View>

      ) : products.length === 0 ? (
        // No products in DB at all
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontSize: 52, marginBottom: 12 }}>🛒</Text>
          <Text style={{ fontWeight: '800', fontSize: 16, color: '#111827', textAlign: 'center' }}>
            No products available yet
          </Text>
          <Text style={{ color: '#6B7280', marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
            Products will appear here once added to the store.{'\n'}
            You can place a custom request instead!
          </Text>
          <TouchableOpacity
            style={S.requestBtn}
            onPress={() => router.push('/(customer)/custom-order' as any)}
          >
            <Text style={{ color: '#fff', fontWeight: '800' }}>📝  Place Custom Request</Text>
          </TouchableOpacity>
        </View>

      ) : filtered.length === 0 ? (
        // No match for search/filter
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>🔍</Text>
          <Text style={{ fontWeight: '700', fontSize: 15, color: '#111827' }}>
            {search ? `No results for "${search}"` : `No products in ${getCatInfo(catFilter).label}`}
          </Text>
          <TouchableOpacity
            style={[S.requestBtn, { marginTop: 16, backgroundColor: 'transparent', borderWidth: 2, borderColor: COLORS.primary }]}
            onPress={() => { setSearch(''); setCatFilter('all') }}
          >
            <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Clear Filters</Text>
          </TouchableOpacity>
        </View>

      ) : (
        // Products grouped by category
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: selectedCount > 0 ? 110 : 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadProducts() }} tintColor={COLORS.primary} />}
        >
          {grouped.map(([category, items]) => {
            const ci = getCatInfo(category)
            const cc = getCatColors(category)
            return (
              <View key={category}>
                {/* Section header — only show when viewing "All" */}
                {catFilter === 'all' && (
                  <View style={[S.secHeader, { backgroundColor: cc.bg }]}>
                    <Text style={{ fontSize: 22 }}>{ci.emoji}</Text>
                    <Text style={[S.secHeaderTxt, { color: cc.text }]}>{ci.label}</Text>
                    <View style={[S.secCount, { backgroundColor: cc.text }]}>
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{items.length}</Text>
                    </View>
                  </View>
                )}
                {items.map(p => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    qty={getQty(p.id)}
                    onAdd={() => addQty(p.id)}
                    onRemove={() => removeQty(p.id)}
                  />
                ))}
              </View>
            )
          })}

          {/* ── Custom request nudge at bottom ── */}
          <TouchableOpacity
            style={S.customNudge}
            onPress={() => router.push('/(customer)/custom-order' as any)}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 22 }}>📝</Text>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontWeight: '800', color: '#5B21B6', fontSize: 14 }}>
                Can&apos;t find what you need?
              </Text>
              <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                Place a custom order request →
              </Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── Floating cart bar ──────────────────────────────────────────── */}
      {selectedCount > 0 && (
        <View style={S.floatBar}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11 }}>
              {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
            </Text>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 18 }}>
              ₹{selectedTotal.toFixed(2)}
            </Text>
          </View>
          <TouchableOpacity style={S.floatBtn} onPress={handleAddToCart} activeOpacity={0.85}>
            <Text style={{ color: COLORS.primary, fontWeight: '900', fontSize: 14 }}>
              🛒  Add to Cart
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const S = StyleSheet.create({
  searchBar:   { flexDirection: 'row', alignItems: 'center', margin: 12, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, elevation: 3, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  chip:        { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, backgroundColor: '#fff', borderColor: '#E5E7EB' },
  chipTxt:     { fontSize: 12, fontWeight: '700', color: '#374151' },
  chipBadge:   { backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1, marginLeft: 2 },
  secHeader:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, marginBottom: 8, marginTop: 6 },
  secHeaderTxt:{ fontSize: 14, fontWeight: '800', flex: 1 },
  secCount:    { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  floatBar:    { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, paddingBottom: 28, elevation: 12 },
  floatBtn:    { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 11 },
  requestBtn:  { marginTop: 20, backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  customNudge: { backgroundColor: '#F5F3FF', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', marginTop: 8, borderWidth: 1.5, borderColor: '#DDD6FE' },
})
