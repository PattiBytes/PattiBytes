import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Image,
  ActivityIndicator,
  FlatList,
  Platform,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS } from '../../../../lib/constants';
import { supabase } from '../../../../lib/supabase';
import { useCart } from '../../../../contexts/CartContext';

type SortKey = 'recommended' | 'name' | 'price_low' | 'price_high';
type LayoutMode = 'grid' | 'list';

function str(v: any, fallback = '') {
  const s = v == null ? '' : String(v);
  return s || fallback;
}
function num(v: any, fallback = 0) {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function bool(v: any) {
  return v === true;
}

function isVegOf(x: any) {
  return bool(x?.is_veg ?? x?.isveg ?? x?.isVeg);
}
function isFeaturedOf(x: any) {
  const direct = x?.is_featured ?? x?.isfeatured ?? x?.featured ?? x?.isFeatured;
  if (direct !== undefined) return bool(direct);
  const tags = x?.tags;
  if (Array.isArray(tags)) return tags.map(String).includes('featured');
  if (typeof tags === 'string') return tags.toLowerCase().includes('featured');
  return false;
}
function isAvailableOf(x: any) {
  const v = x?.is_available ?? x?.isavailable ?? x?.isAvailable;
  return v === undefined ? true : v !== false;
}
function imageUrlOf(x: any) {
  return x?.image_url ?? x?.imageurl ?? x?.imageUrl ?? null;
}
function finalPriceOf(x: any) {
  const mrp = num(x?.price, 0);
  const dp = num(x?.discount_percentage ?? x?.discountpercentage, 0);
  return dp > 0 ? mrp * (1 - dp / 100) : mrp;
}

// Normalize DB snake_case rows -> app-friendly aliases too
function normalizeMenuItem(row: any) {
  if (!row) return row;

  const image_url = row.image_url ?? row.imageurl ?? null;
  const discount_percentage = row.discount_percentage ?? row.discountpercentage ?? 0;

  return {
    ...row,

    // aliases used across your existing screens/components
    merchantid: row.merchant_id ?? row.merchantid ?? null,
    categoryid: row.category_id ?? row.categoryid ?? null,
    imageurl: image_url,
    discountpercentage: discount_percentage,
    isveg: row.is_veg ?? row.isveg ?? null,
    isavailable: row.is_available ?? row.isavailable ?? null,
    preparationtime: row.preparation_time ?? row.preparationtime ?? null,
  };
}

function normalizeMerchant(row: any) {
  if (!row) return row;
  return {
    ...row,
    businessname: row.business_name ?? row.businessname ?? null,
    logourl: row.logo_url ?? row.logourl ?? null,
    bannerurl: row.banner_url ?? row.bannerurl ?? null,
    averagerating: row.average_rating ?? row.averagerating ?? null,
    isfeatured: row.is_featured ?? row.isfeatured ?? null,
  };
}

export default function FullMenuPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = str((params as any)?.id);

  const { addToCart, updateQuantity, cart } = useCart();

  const [loading, setLoading] = useState(true);
  const [error_text, setErrorText] = useState<string | null>(null);

  const [merchant, setMerchant] = useState<any>(null);
  const [menu_items, setMenuItems] = useState<any[]>([]);

  const [q, setQ] = useState('');
  const [veg_only, setVegOnly] = useState(false);
  const [featured_only, setFeaturedOnly] = useState(false);
  const [sort_key, setSortKey] = useState<SortKey>('recommended');
  const [layout_mode, setLayoutMode] = useState<LayoutMode>('grid');

  useEffect(() => {
    if (Platform.OS === 'android') (UIManager as any).setLayoutAnimationEnabledExperimental?.(true);
  }, []);

  const load = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setErrorText(null);

    try {
      const [{ data: m, error: mErr }, { data: items, error: iErr }] = await Promise.all([
        supabase.from('merchants').select('*').eq('id', id).maybeSingle(),
        supabase
          .from('menu_items')
          .select(
            'id,merchant_id,name,description,price,category,image_url,is_available,is_veg,preparation_time,created_at,updated_at,category_id,discount_percentage'
          )
          .eq('merchant_id', id)
          .order('category', { ascending: true })
          .order('name', { ascending: true }),
      ]);

      if (mErr) throw mErr;
      if (iErr) throw iErr;

      setMerchant(normalizeMerchant(m ?? null));
      setMenuItems(Array.isArray(items) ? items.map(normalizeMenuItem) : []);
    } catch (e: any) {
      const msg = e?.message ? String(e.message) : 'Failed to load menu';
      console.warn('FullMenu load error:', e);
      setErrorText(msg);
      setMerchant(null);
      setMenuItems([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    menu_items.forEach((x) => set.add(str(x?.category, 'Other')));
    return Array.from(set);
  }, [menu_items]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    let list = menu_items.slice();

    if (veg_only) list = list.filter((x) => isVegOf(x));
    if (featured_only) list = list.filter((x) => isFeaturedOf(x));

    if (query) {
      list = list.filter((x) => {
        const n = str(x?.name).toLowerCase();
        const d = str(x?.description).toLowerCase();
        const c = str(x?.category).toLowerCase();
        return n.includes(query) || d.includes(query) || c.includes(query);
      });
    }

    if (sort_key === 'name') list.sort((a, b) => str(a?.name).localeCompare(str(b?.name)));
    if (sort_key === 'price_low') list.sort((a, b) => finalPriceOf(a) - finalPriceOf(b));
    if (sort_key === 'price_high') list.sort((a, b) => finalPriceOf(b) - finalPriceOf(a));

    return list;
  }, [menu_items, q, veg_only, featured_only, sort_key]);

  const qtyOf = useCallback(
    (menu_item_id: string) => {
      const it = cart?.items?.find?.((x: any) => str(x?.id) === menu_item_id);
      return num(it?.quantity, 0);
    },
    [cart]
  );

  const onAdd = useCallback(
    (item: any) => {
      const available = isAvailableOf(item);
      if (!available) return;

      // IMPORTANT: use the CartItem field names your app uses (imageurl/isveg/discountpercentage/merchantid) [file:1]
      addToCart(
        {
          id: str(item?.id),
          name: str(item?.name, 'Item'),
          price: num(item?.price, 0),
          quantity: 1,
          imageurl: imageUrlOf(item),
          discountpercentage: num(item?.discount_percentage ?? item?.discountpercentage, 0),
          isveg: isVegOf(item),
          category: str(item?.category, 'Other'),
          merchantid: str(item?.merchant_id ?? item?.merchantid ?? id),
        } as any,
        str(item?.merchant_id ?? item?.merchantid ?? id),
        str(merchant?.business_name ?? merchant?.businessname ?? merchant?.businessName, 'Restaurant')
      );
    },
    [addToCart, id, merchant]
  );

  const onInc = useCallback(
    (item: any) => {
      const idd = str(item?.id);
      const current = qtyOf(idd);
      updateQuantity(idd, current + 1);
    },
    [qtyOf, updateQuantity]
  );

  const onDec = useCallback(
    (item: any) => {
      const idd = str(item?.id);
      const current = qtyOf(idd);
      updateQuantity(idd, Math.max(0, current - 1));
    },
    [qtyOf, updateQuantity]
  );

  const toggleLayout = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setLayoutMode((m) => (m === 'grid' ? 'list' : 'grid'));
  };

  const header = (
    <View style={S.headerWrap}>
      <View style={S.topRow}>
        <Pressable style={S.backBtn} onPress={() => router.back()}>
          <Text style={S.backTxt}>←</Text>
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={S.title} numberOfLines={1}>
            {str(merchant?.business_name ?? merchant?.businessname, 'Full Menu')}
          </Text>
          <Text style={S.subTitle}>
            {filtered.length} items {error_text ? '• Error' : ''}
          </Text>
        </View>

        <Pressable style={S.layoutBtn} onPress={toggleLayout}>
          <Text style={S.layoutBtnTxt}>{layout_mode === 'grid' ? 'Grid' : 'List'}</Text>
        </Pressable>
      </View>

      {!!error_text ? (
        <View style={S.errBox}>
          <Text style={S.errTxt} numberOfLines={3}>
            {error_text}
          </Text>
          <Pressable style={S.retryBtn} onPress={load}>
            <Text style={S.retryTxt}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={S.searchRow}>
        <Text style={{ fontSize: 16 }}>🔎</Text>
        <TextInput value={q} onChangeText={setQ} placeholder="Search dishes..." placeholderTextColor="#9CA3AF" style={S.searchInput} />
        {!!q && (
          <Pressable onPress={() => setQ('')}>
            <Text style={{ fontSize: 16, color: '#9CA3AF' }}>✕</Text>
          </Pressable>
        )}
      </View>

      <View style={S.filters}>
        <Pressable onPress={() => setVegOnly((v) => !v)} style={[S.chip, veg_only && S.chipActive]}>
          <Text style={[S.chipTxt, veg_only && S.chipTxtActive]}>🌿 Veg</Text>
        </Pressable>

        <Pressable onPress={() => setFeaturedOnly((v) => !v)} style={[S.chip, featured_only && S.chipActive]}>
          <Text style={[S.chipTxt, featured_only && S.chipTxtActive]}>⭐ Featured</Text>
        </Pressable>

        <Pressable
          onPress={() =>
            setSortKey((s) =>
              s === 'recommended' ? 'name' : s === 'name' ? 'price_low' : s === 'price_low' ? 'price_high' : 'recommended'
            )
          }
          style={S.chip}
        >
          <Text style={S.chipTxt}>
            ↕ {sort_key === 'recommended' ? 'Recommended' : sort_key === 'name' ? 'Name' : sort_key === 'price_low' ? 'Low→High' : 'High→Low'}
          </Text>
        </Pressable>
      </View>

      {categories.length > 0 ? (
        <View style={{ marginTop: 10 }}>
          <FlatList
            horizontal
            data={categories}
            keyExtractor={(x) => x}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12, gap: 10 }}
            renderItem={({ item }) => (
              <View style={S.catChip}>
                <Text style={S.catChipTxt}>{item}</Text>
              </View>
            )}
          />
        </View>
      ) : null}
    </View>
  );

  const renderItem = ({ item }: { item: any }) => {
    const dp = num(item?.discount_percentage ?? item?.discountpercentage, 0);
    const mrp = num(item?.price, 0);
    const price = finalPriceOf(item);
    const qty = qtyOf(str(item?.id));
    const available = isAvailableOf(item);
    const img = imageUrlOf(item);
    const is_featured = isFeaturedOf(item);

    return (
      <View style={[S.card, layout_mode === 'grid' ? S.cardGrid : S.cardList]}>
        <View style={S.cardImgWrap}>
          {img ? (
            <Image source={{ uri: img }} style={StyleSheet.absoluteFillObject} resizeMode="contain" />
          ) : (
            <View style={S.cardImgFallback}>
              <Text style={{ fontSize: 22 }}>🍽️</Text>
            </View>
          )}

          {is_featured ? (
            <View style={S.badgeFeatured}>
              <Text style={S.badgeFeaturedTxt}>FEATURED</Text>
            </View>
          ) : null}

          <View style={[S.badgeVeg, { backgroundColor: isVegOf(item) ? '#16A34A' : '#DC2626' }]} />
        </View>

        <View style={S.cardBody}>
          <Text style={S.itemName} numberOfLines={1}>
            {str(item?.name, 'Item')}
          </Text>

          <Text style={S.itemCat} numberOfLines={1}>
            {str(item?.category, 'Other')}
          </Text>

          {!!item?.description ? (
            <Text style={S.itemDesc} numberOfLines={layout_mode === 'grid' ? 2 : 3}>
              {str(item.description)}
            </Text>
          ) : null}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <Text style={S.price}>₹{price.toFixed(0)}</Text>
            {dp > 0 ? <Text style={S.mrp}>₹{mrp.toFixed(0)}</Text> : null}
            {dp > 0 ? (
              <View style={S.disc}>
                <Text style={S.discTxt}>{dp.toFixed(0)}% OFF</Text>
              </View>
            ) : null}
          </View>

          {!available ? <Text style={S.notAvail}>Not available</Text> : null}

          <View style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            {qty <= 0 ? (
              <Pressable style={[S.addBtn, !available && { opacity: 0.6 }]} onPress={() => onAdd(item)} disabled={!available}>
                <Text style={S.addBtnTxt}>{available ? 'ADD' : 'N/A'}</Text>
              </Pressable>
            ) : (
              <View style={S.qtyRow}>
                <Pressable style={S.qtyBtn} onPress={() => onDec(item)}>
                  <Text style={S.qtyBtnTxt}>−</Text>
                </Pressable>
                <Text style={S.qtyCount}>{qty}</Text>
                <Pressable style={S.qtyBtn} onPress={() => onInc(item)}>
                  <Text style={S.qtyBtnTxt}>+</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={S.loadingWrap}>
        <Stack.Screen options={{ title: 'Full Menu' }} />
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={{ marginTop: 10, color: COLORS.textLight, fontWeight: '800' }}>Loading menu...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <Stack.Screen options={{ title: 'Full Menu', headerShown: false }} />

      <FlatList
        data={filtered}
        key={layout_mode}
        numColumns={layout_mode === 'grid' ? 2 : 1}
        keyExtractor={(x) => str(x?.id)}
        renderItem={renderItem}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 12 }}
        columnWrapperStyle={layout_mode === 'grid' ? { gap: 12 } : undefined}
        ItemSeparatorComponent={layout_mode === 'list' ? () => <View style={{ height: 12 }} /> : undefined}
        ListEmptyComponent={
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Text style={{ fontSize: 40, marginBottom: 8 }}>🍽️</Text>
            <Text style={{ fontWeight: '900', color: COLORS.text }}>No items found</Text>
            <Text style={{ color: COLORS.textLight, marginTop: 4, fontWeight: '700' }}>Try clearing search/filters.</Text>
          </View>
        }
      />
    </View>
  );
}

const S = StyleSheet.create({
  loadingWrap: { flex: 1, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },

  headerWrap: { paddingTop: 14, paddingBottom: 14 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4, marginBottom: 10 },
  backBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', elevation: 2 },
  backTxt: { fontSize: 18, fontWeight: '900', color: COLORS.text },
  title: { fontSize: 16, fontWeight: '900', color: COLORS.text },
  subTitle: { fontSize: 12, color: COLORS.textLight, fontWeight: '800', marginTop: 2 },
  layoutBtn: { backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  layoutBtnTxt: { color: '#FFF', fontWeight: '900', fontSize: 12 },

  errBox: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1.5,
    borderColor: '#FECDD3',
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  errTxt: { flex: 1, color: '#9F1239', fontWeight: '800', fontSize: 12 },
  retryBtn: { backgroundColor: '#9F1239', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  retryTxt: { color: '#FFF', fontWeight: '900', fontSize: 12 },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, elevation: 2 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text, fontWeight: '700' },

  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  chip: { backgroundColor: '#F3F4F6', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5, borderColor: 'transparent' },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipTxt: { fontWeight: '900', color: '#374151', fontSize: 12 },
  chipTxtActive: { color: '#FFF' },

  catChip: { backgroundColor: '#FFF', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5, borderColor: '#E5E7EB' },
  catChipTxt: { fontWeight: '900', color: COLORS.text, fontSize: 12 },

  card: { backgroundColor: '#FFF', borderRadius: 18, overflow: 'hidden', elevation: 2, borderWidth: 1, borderColor: '#F3F4F6' },
  cardGrid: { flex: 1, marginTop: 12 },
  cardList: { marginTop: 12 },

  cardImgWrap: { height: 120, backgroundColor: '#F3F4F6', overflow: 'hidden' },
  cardImgFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  badgeVeg: { position: 'absolute', top: 10, right: 10, width: 10, height: 10, borderRadius: 2 },
  badgeFeatured: { position: 'absolute', top: 10, left: 10, backgroundColor: '#FEF3C7', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1.5, borderColor: '#FCD34D' },
  badgeFeaturedTxt: { fontSize: 10, fontWeight: '900', color: '#92400E' },

  cardBody: { padding: 12 },
  itemName: { fontSize: 13, fontWeight: '900', color: COLORS.text },
  itemCat: { marginTop: 2, fontSize: 11, fontWeight: '800', color: COLORS.textLight },
  itemDesc: { marginTop: 6, fontSize: 11, fontWeight: '700', color: '#6B7280', lineHeight: 16 },

  price: { fontSize: 14, fontWeight: '900', color: COLORS.primary },
  mrp: { fontSize: 11, color: '#9CA3AF', textDecorationLine: 'line-through', fontWeight: '800' },
  disc: { backgroundColor: '#EF4444', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  discTxt: { color: '#FFF', fontSize: 10, fontWeight: '900' },

  notAvail: { marginTop: 8, color: '#EF4444', fontWeight: '900', fontSize: 12 },

  addBtn: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 2, borderColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  addBtnTxt: { color: COLORS.primary, fontWeight: '900', fontSize: 12 },

  qtyRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, borderRadius: 12, overflow: 'hidden' },
  qtyBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  qtyBtnTxt: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  qtyCount: { minWidth: 36, textAlign: 'center', color: '#FFF', fontWeight: '900' },
});
