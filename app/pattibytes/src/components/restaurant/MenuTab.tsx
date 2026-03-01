/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Image,
  LayoutAnimation,
  Platform,
  UIManager,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../../lib/constants';
import TrendingStrip from './TrendingStrip';
import RecommendedStrip from './RecommendedStrip';
import Pressable3D from '../../components/ui/Pressable3D';

type SortKey = 'recommended' | 'name' | 'price_low' | 'price_high';

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
function isAvailableOf(x: any) {
  const v = x?.is_available ?? x?.isavailable ?? x?.isAvailable;
  return v === undefined ? true : v !== false;
}
function imageUrlOf(x: any) {
  return x?.image_url ?? x?.imageurl ?? x?.imageUrl ?? null;
}
function isFeaturedOf(x: any) {
  const direct = x?.is_featured ?? x?.isfeatured ?? x?.featured ?? x?.isFeatured;
  if (direct !== undefined) return bool(direct);
  const tags = x?.tags;
  if (Array.isArray(tags)) return tags.map(String).includes('featured');
  if (typeof tags === 'string') return tags.toLowerCase().includes('featured');
  return false;
}
function merchantNameOf(m: any) {
  return str(m?.business_name ?? m?.businessname ?? m?.businessName, 'Restaurant');
}

export default function MenuTab({
  merchant,
  menuItems,
  showImages,
  trending,
  trendingLoading,
  offerByMenuItemId,
  onOpenTrendingItem,
  onAddItem,
  onInc,
  onDec,
  getQty,

  recommended,
  recommendedLoading,
}: {
  merchant: any;
  menuItems: any[];
  showImages: boolean;

  trending: any[];
  trendingLoading: boolean;

  offerByMenuItemId: Record<string, { label: string; subLabel?: string; promoCode?: string } | null>;
  onOpenTrendingItem: (t: any) => void;

  onAddItem: (item: any) => void;
  onInc: (item: any) => void;
  onDec: (item: any) => void;
  getQty: (menuItemId: string) => number;

  recommended?: any[];
  recommendedLoading?: boolean;
}) {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const [showTop, setShowTop] = useState(false);

  const [q, setQ] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>('recommended');

  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (Platform.OS === 'android') {
      (UIManager as any).setLayoutAnimationEnabledExperimental?.(true);
    }
  }, []);

  const goFullMenu = useCallback(() => {
    router.push({
      pathname: '/(customer)/restaurant/[id]/full-menu',
      params: { id: str(merchant?.id) },
    } as any);
  }, [router, merchant]);

  const clearAll = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setQ('');
    setVegOnly(false);
    setFeaturedOnly(false);
    setSort('recommended');
  };

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    let list = Array.isArray(menuItems) ? menuItems.slice() : [];

    if (vegOnly) list = list.filter((x) => isVegOf(x));
    if (featuredOnly) list = list.filter((x) => isFeaturedOf(x));

    if (query) {
      list = list.filter((x) => {
        const n = str(x?.name).toLowerCase();
        const d = str(x?.description).toLowerCase();
        const c = str(x?.category).toLowerCase();
        return n.includes(query) || d.includes(query) || c.includes(query);
      });
    }

    const priceOf = (x: any) => {
      const mrp = num(x?.price, 0);
      const dp = num(x?.discount_percentage ?? x?.discountpercentage, 0);
      return dp > 0 ? mrp * (1 - dp / 100) : mrp;
    };

    if (sort === 'name') list.sort((a, b) => str(a?.name).localeCompare(str(b?.name)));
    if (sort === 'price_low') list.sort((a, b) => priceOf(a) - priceOf(b));
    if (sort === 'price_high') list.sort((a, b) => priceOf(b) - priceOf(a));

    return list;
  }, [menuItems, q, sort, vegOnly, featuredOnly]);

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const it of filtered) {
      const cat = str(it?.category, 'Other');
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(it);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const toggleCat = (cat: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenCats((prev) => ({ ...prev, [cat]: prev[cat] === undefined ? false : !prev[cat] }));
  };

  const expandAll = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const next: Record<string, boolean> = {};
    grouped.forEach(([cat]) => (next[cat] = true));
    setOpenCats(next);
  };

  const collapseAll = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const next: Record<string, boolean> = {};
    grouped.forEach(([cat]) => (next[cat] = false));
    setOpenCats(next);
  };

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  return (
    <View style={{ flex: 1, paddingBottom: 24 }}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y ?? 0;
          setShowTop(y > 420);
        }}
        scrollEventThrottle={16}
      >
        <TrendingStrip items={trending} loading={trendingLoading} showImages={showImages} onOpen={onOpenTrendingItem} />

        <View style={S.controls}>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
            <Pressable3D style={S.fullMenuBtn} onPress={goFullMenu}>
              <Text style={S.fullMenuBtnTxt}>📋 View Full Menu</Text>
            </Pressable3D>

            <Pressable3D style={S.fullMenuBtnGhost} onPress={clearAll}>
              <Text style={S.fullMenuBtnGhostTxt}>Clear</Text>
            </Pressable3D>
          </View>

          <View style={S.searchRow}>
            <Text style={{ fontSize: 16 }}>🔎</Text>
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder={`Search in ${merchantNameOf(merchant)}...`}
              placeholderTextColor="#9CA3AF"
              style={S.searchInput}
            />
            {!!q && (
              <Pressable onPress={() => setQ('')}>
                <Text style={{ fontSize: 16, color: '#9CA3AF' }}>✕</Text>
              </Pressable>
            )}
          </View>

          <View style={S.filterRow}>
            <Pressable3D style={[S.chip, vegOnly && S.chipActive]} onPress={() => setVegOnly((v) => !v)}>
              <Text style={[S.chipTxt, vegOnly && S.chipTxtActive]}>🌿 Veg</Text>
            </Pressable3D>

            <Pressable3D style={[S.chip, featuredOnly && S.chipActive]} onPress={() => setFeaturedOnly((v) => !v)}>
              <Text style={[S.chipTxt, featuredOnly && S.chipTxtActive]}>⭐ Featured</Text>
            </Pressable3D>

            <Pressable3D
              style={S.chip}
              onPress={() =>
                setSort((s) => (s === 'recommended' ? 'name' : s === 'name' ? 'price_low' : s === 'price_low' ? 'price_high' : 'recommended'))
              }
            >
              <Text style={S.chipTxt}>
                ↕ Sort: {sort === 'recommended' ? 'Recommended' : sort === 'name' ? 'Name' : sort === 'price_low' ? 'Low→High' : 'High→Low'}
              </Text>
            </Pressable3D>

            <Pressable3D style={S.miniBtn} onPress={expandAll}>
              <Text style={S.miniBtnTxt}>Expand</Text>
            </Pressable3D>

            <Pressable3D style={S.miniBtn} onPress={collapseAll}>
              <Text style={S.miniBtnTxt}>Collapse</Text>
            </Pressable3D>
          </View>
        </View>

        {grouped.length === 0 ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ fontSize: 44, marginBottom: 8 }}>🍽️</Text>
            <Text style={{ fontWeight: '800', color: COLORS.text }}>No items found</Text>
            <Text style={{ color: COLORS.textLight, marginTop: 4 }}>Try clearing search/filters.</Text>
          </View>
        ) : (
          grouped.map(([cat, items]) => {
            const isOpen = openCats[cat] ?? true;

            return (
              <View key={cat}>
                <Pressable3D style={S.catHeader} onPress={() => toggleCat(cat)}>
                  <View style={{ flex: 1 }}>
                    <Text style={S.catTitle}>{cat}</Text>
                    <Text style={S.catCount}>{items.length} items</Text>
                  </View>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: COLORS.text }}>{isOpen ? '▾' : '▸'}</Text>
                </Pressable3D>

                {isOpen
                  ? items.map((item: any) => {
                      const qty = getQty(str(item?.id));

                      const dp = num(item?.discount_percentage ?? item?.discountpercentage, 0);
                      const mrp = num(item?.price, 0);
                      const price = dp > 0 ? mrp * (1 - dp / 100) : mrp;

                      const directOffer = offerByMenuItemId?.[str(item?.id)] ?? null;
                      const catOffer = item?.category_id ? offerByMenuItemId?.[`cat:${str(item?.category_id)}`] ?? null : null;
                      const merchantOffer = offerByMenuItemId?.['merchant:all'] ?? null;
                      const offer = directOffer ?? catOffer ?? merchantOffer;

                      const is_featured = isFeaturedOf(item);
                      const available = isAvailableOf(item);
                      const img = imageUrlOf(item);

                      return (
                        <View key={str(item?.id)} style={S.itemRow}>
                          <View style={{ flex: 1, paddingRight: 12 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                              <View style={[S.vegDot, { backgroundColor: isVegOf(item) ? '#16A34A' : '#DC2626' }]} />
                              <Text style={S.itemName}>{str(item?.name, 'Item')}</Text>
                            </View>

                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 2 }}>
                              {is_featured ? (
                                <View style={S.featuredPill}>
                                  <Text style={S.featuredTxt}>⭐ FEATURED</Text>
                                </View>
                              ) : null}

                              {!!offer?.label ? (
                                <View style={S.bestOfferPill}>
                                  <Text style={S.bestOfferTxt}>{offer.label}</Text>
                                </View>
                              ) : null}
                            </View>

                            {!!item?.description && (
                              <Text style={S.itemDesc} numberOfLines={2}>
                                {str(item.description)}
                              </Text>
                            )}

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                              <Text style={S.itemPrice}>₹{price.toFixed(0)}</Text>
                              {dp > 0 ? (
                                <>
                                  <Text style={S.mrp}>₹{mrp.toFixed(0)}</Text>
                                  <View style={S.disc}>
                                    <Text style={S.discTxt}>{dp.toFixed(0)}% OFF</Text>
                                  </View>
                                </>
                              ) : null}
                            </View>

                            {!available ? <Text style={S.notAvail}>Not available</Text> : null}
                          </View>

                          <View style={{ alignItems: 'center', gap: 8 }}>
                            {showImages ? (
                              <View style={S.imgWrap}>
                                {img ? (
                                  <Image source={{ uri: img }} style={StyleSheet.absoluteFillObject} resizeMode="contain" />
                                ) : (
                                  <View style={S.imgFallback}>
                                    <Text style={{ fontSize: 22 }}>🍔</Text>
                                  </View>
                                )}
                              </View>
                            ) : null}

                            {qty <= 0 ? (
                              <Pressable3D style={[S.addBtn, !available && { opacity: 0.6 }]} onPress={() => onAddItem(item)} disabled={!available}>
                                <Text style={S.addBtnTxt}>{available ? 'ADD' : 'N/A'}</Text>
                              </Pressable3D>
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
                      );
                    })
                  : null}
              </View>
            );
          })
        )}

        <RecommendedStrip
          current_merchant_id={str(merchant?.id)}
          recommended_merchants={recommended}
          recommended_merchants_loading={recommendedLoading}
          show_products={true}
        />
      </ScrollView>

      {showTop ? (
        <View style={S.fabWrap} pointerEvents="box-none">
          <Pressable3D style={S.fab} onPress={scrollToTop}>
            <Text style={S.fabTxt}>↑ Top</Text>
          </Pressable3D>
        </View>
      ) : null}
    </View>
  );
}

const S = StyleSheet.create({
  controls: {
    padding: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginTop: 10,
    borderRadius: 16,
    marginHorizontal: 12,
    elevation: 2,
  },

  fullMenuBtn: { flex: 1, backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  fullMenuBtnTxt: { color: '#FFF', fontWeight: '900', fontSize: 12 },

  fullMenuBtnGhost: { width: 90, backgroundColor: '#FFF', borderRadius: 14, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#E5E7EB' },
  fullMenuBtnGhostTxt: { color: COLORS.text, fontWeight: '900', fontSize: 12 },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FAFAFA', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1.5, borderColor: '#EEF2F7' },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text, fontWeight: '700' },

  filterRow: { flexDirection: 'row', gap: 10, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' },
  chip: { backgroundColor: '#F3F4F6', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5, borderColor: 'transparent' },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipTxt: { fontWeight: '900', color: '#374151', fontSize: 12 },
  chipTxtActive: { color: '#FFF' },

  miniBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#FFF' },
  miniBtnTxt: { fontWeight: '900', color: COLORS.text, fontSize: 11 },

  catHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    marginTop: 12,
    marginHorizontal: 12,
    borderRadius: 14,
  },
  catTitle: { fontSize: 14, fontWeight: '900', color: COLORS.text },
  catCount: { fontSize: 12, color: COLORS.textLight, fontWeight: '800', marginTop: 2 },

  itemRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', marginHorizontal: 12, borderRadius: 14, marginTop: 10 },
  vegDot: { width: 10, height: 10, borderRadius: 2, marginTop: 4 },
  itemName: { fontSize: 14, fontWeight: '900', color: COLORS.text, flex: 1 },
  itemDesc: { fontSize: 12, color: '#6B7280', marginTop: 6, lineHeight: 18 },

  featuredPill: { alignSelf: 'flex-start', backgroundColor: '#FEF3C7', borderWidth: 1.5, borderColor: '#FCD34D', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  featuredTxt: { color: '#92400E', fontWeight: '900', fontSize: 11 },

  bestOfferPill: { alignSelf: 'flex-start', backgroundColor: '#ECFDF5', borderWidth: 1.5, borderColor: '#A7F3D0', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  bestOfferTxt: { color: '#065F46', fontWeight: '900', fontSize: 11 },

  itemPrice: { fontSize: 15, fontWeight: '900', color: COLORS.primary },
  mrp: { fontSize: 12, color: '#9CA3AF', textDecorationLine: 'line-through', fontWeight: '800' },
  disc: { backgroundColor: '#EF4444', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  discTxt: { color: '#FFF', fontSize: 10, fontWeight: '900' },

  notAvail: { marginTop: 8, color: '#EF4444', fontWeight: '900', fontSize: 12 },

  imgWrap: { width: 88, height: 88, borderRadius: 12, overflow: 'hidden', backgroundColor: '#F3F4F6' },
  imgFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  addBtn: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 2, borderColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 9 },
  addBtnTxt: { color: COLORS.primary, fontWeight: '900', fontSize: 12 },

  qtyRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, borderRadius: 12, overflow: 'hidden' },
  qtyBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  qtyBtnTxt: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  qtyCount: { minWidth: 34, textAlign: 'center', color: '#FFF', fontWeight: '900' },

  fabWrap: { position: 'absolute', right: 14, bottom: 18 },
  fab: { backgroundColor: COLORS.primary, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 12 },
  fabTxt: { color: '#FFF', fontWeight: '900' },
});
