import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator, Animated, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../../lib/constants';
import { supabase } from '../../lib/supabase';

function str(v: any, fallback = '') {
  const s = v == null ? '' : String(v);
  return s || fallback;
}
function num(v: any, fallback = 0) {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

type MerchantRow = any;
type ProductRow = any;

function merchant_name_of(r: MerchantRow) {
  return str(r?.business_name ?? r?.businessname ?? r?.businessName, 'Restaurant');
}
function merchant_logo_of(r: MerchantRow) {
  return r?.logo_url ?? r?.logourl ?? r?.logoUrl ?? null;
}
function merchant_rating_of(r: MerchantRow) {
  return num(r?.average_rating ?? r?.averagerating ?? r?.rating, 0);
}
function merchant_featured_of(r: MerchantRow) {
  const v = r?.is_featured ?? r?.isfeatured ?? r?.isFeatured;
  return v === true;
}

function product_name_of(p: ProductRow) {
  return str(p?.name, 'Product');
}
function product_img_of(p: ProductRow) {
  return p?.imageurl ?? p?.image_url ?? p?.imageUrl ?? null;
}
function product_price_of(p: ProductRow) {
  return num(p?.price, 0);
}
function product_unit_of(p: ProductRow) {
  return str(p?.unit, '');
}

function parseTimeToMinutes(t: any): number | null {
  if (t == null) return null;
  const raw = String(t).trim();
  if (!raw) return null;

  // formats supported:
  // "09:30", "09:30:00", "093000", "93000"
  if (raw.includes(':')) {
    const parts = raw.split(':').map((x) => Number(x));
    const hh = parts[0];
    const mm = parts[1] ?? 0;
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    return hh * 60 + mm;
  }

  const digits = raw.replace(/\D/g, '');
  if (digits.length === 6) {
    const hh = Number(digits.slice(0, 2));
    const mm = Number(digits.slice(2, 4));
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    return hh * 60 + mm;
  }
  if (digits.length === 4) {
    const hh = Number(digits.slice(0, 2));
    const mm = Number(digits.slice(2, 4));
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    return hh * 60 + mm;
  }

  return null;
}

function isOpenNow(row: any): boolean {
  const opening = row?.opening_time ?? row?.openingtime ?? null;
  const closing = row?.closing_time ?? row?.closingtime ?? null;

  const openM = parseTimeToMinutes(opening);
  const closeM = parseTimeToMinutes(closing);

  // If schedule not provided, don’t block (assume open)
  if (openM == null || closeM == null) return true;

  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();

  // overnight support: e.g. 18:00 -> 02:00
  let close = closeM;
  if (close <= openM) close += 1440;

  const curAdj = cur < openM ? cur + 1440 : cur;
  return curAdj >= openM && curAdj <= close;
}

function openLabel(row: any): string {
  const opening = row?.opening_time ?? row?.openingtime ?? null;
  const mins = parseTimeToMinutes(opening);
  if (mins == null) return '';
  const hh24 = Math.floor(mins / 60);
  const mm = mins % 60;
  const ampm = hh24 >= 12 ? 'PM' : 'AM';
  const hh12 = hh24 % 12 || 12;
  return `Opens ${hh12}:${String(mm).padStart(2, '0')} ${ampm}`;
}

function Card3D({
  disabled,
  onPress,
  children,
}: {
  disabled?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
}) {
  const a = useRef(new Animated.Value(0)).current;

  const scale = a.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] });
  const rotateX = a.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '6deg'] });
  const rotateY = a.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-6deg'] });

  const pressIn = () => {
    Animated.spring(a, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start();
  };
  const pressOut = () => {
    Animated.spring(a, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 7 }).start();
  };

  return (
    <Pressable
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
      onPressIn={disabled ? undefined : pressIn}
      onPressOut={disabled ? undefined : pressOut}
      style={({ pressed }) => [{ opacity: disabled ? 0.55 : 1 }, pressed && !disabled && { opacity: 0.98 }]}
    >
      <Animated.View
        style={[
          {
            transform: [{ perspective: 900 }, { scale }, { rotateX }, { rotateY }],
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

export default function RecommendedStrip({
  current_merchant_id,
  recommended_merchants,
  recommended_merchants_loading,
  recommended_products,
  recommended_products_loading,

  show_products = true,
  merchants_limit = 20,
  products_limit = 20,
}: {
  current_merchant_id?: string | null;

  recommended_merchants?: any[];
  recommended_merchants_loading?: boolean;

  recommended_products?: any[];
  recommended_products_loading?: boolean;

  show_products?: boolean;
  merchants_limit?: number;
  products_limit?: number;
}) {
  const router = useRouter();

  const [m_loading, set_m_loading] = useState(false);
  const [m_error, set_m_error] = useState<string | null>(null);
  const [m_items, set_m_items] = useState<any[]>([]);

  const [p_loading, set_p_loading] = useState(false);
  const [p_error, set_p_error] = useState<string | null>(null);
  const [p_items, set_p_items] = useState<any[]>([]);

  const effective_merchants_loading = Boolean(recommended_merchants_loading) || m_loading;
  const effective_products_loading = Boolean(recommended_products_loading) || p_loading;

  const effective_merchants = useMemo(() => {
    const passed = Array.isArray(recommended_merchants) ? recommended_merchants : [];
    return passed.length ? passed : m_items;
  }, [recommended_merchants, m_items]);

  const effective_products = useMemo(() => {
    const passed = Array.isArray(recommended_products) ? recommended_products : [];
    return passed.length ? passed : p_items;
  }, [recommended_products, p_items]);

  const load_merchants = useCallback(async () => {
    if ((recommended_merchants?.length ?? 0) > 0) return;

    set_m_loading(true);
    set_m_error(null);

    const exclude_id = str(current_merchant_id ?? '');

    const try_snake = async () => {
      let q = supabase
        .from('merchants')
        .select(
          'id,business_name,logo_url,average_rating,total_orders,created_at,is_active,is_featured,opening_time,closing_time,city,state'
        )
        .eq('is_active', true);

      if (exclude_id) q = q.neq('id', exclude_id);

      const res = await q
        .order('is_featured', { ascending: false })
        .order('average_rating', { ascending: false })
        .order('total_orders', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(merchants_limit);

      if (res.error) throw res.error;
      return res.data ?? [];
    };

    const try_legacy = async () => {
      let q = supabase
        .from('merchants')
        .select('id,businessname,logourl,averagerating,totalorders,createdat,isactive,isfeatured,openingtime,closingtime,city,state')
        .eq('isactive', true);

      if (exclude_id) q = q.neq('id', exclude_id);

      const res = await q
        .order('isfeatured', { ascending: false })
        .order('averagerating', { ascending: false })
        .order('totalorders', { ascending: false })
        .order('createdat', { ascending: false })
        .limit(merchants_limit);

      if (res.error) throw res.error;
      return res.data ?? [];
    };

    try {
      const data = await try_snake();
      set_m_items(Array.isArray(data) ? data : []);
    } catch (e1: any) {
      try {
        const data2 = await try_legacy();
        set_m_items(Array.isArray(data2) ? data2 : []);
      } catch (e2: any) {
        set_m_items([]);
        set_m_error(String(e2?.message ?? e1?.message ?? 'Failed to load recommended restaurants'));
      }
    } finally {
      set_m_loading(false);
    }
  }, [recommended_merchants, current_merchant_id, merchants_limit]);

  const load_products = useCallback(async () => {
    if (!show_products) return;
    if ((recommended_products?.length ?? 0) > 0) return;

    set_p_loading(true);
    set_p_error(null);

    const try_snake = async () => {
      const res = await supabase
        .from('customproducts')
        .select('id,name,category,price,unit,imageurl,description,isactive,createdat,updatedat')
        .eq('isactive', true)
        .order('updatedat', { ascending: false })
        .limit(products_limit);

      if (res.error) throw res.error;
      return res.data ?? [];
    };

    const try_alt = async () => {
      const res = await supabase
        .from('customproducts')
        .select('id,name,category,price,unit,image_url,description,is_active,created_at,updated_at')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(products_limit);

      if (res.error) throw res.error;
      return res.data ?? [];
    };

    try {
      const data = await try_snake();
      set_p_items(Array.isArray(data) ? data : []);
    } catch (e1: any) {
      try {
        const data2 = await try_alt();
        set_p_items(Array.isArray(data2) ? data2 : []);
      } catch (e2: any) {
        set_p_items([]);
        set_p_error(String(e2?.message ?? e1?.message ?? 'Failed to load recommended products'));
      }
    } finally {
      set_p_loading(false);
    }
  }, [show_products, recommended_products, products_limit]);

  useEffect(() => {
    load_merchants();
  }, [load_merchants]);

  useEffect(() => {
    load_products();
  }, [load_products]);

  const merchants_to_show = useMemo(() => {
    const list = Array.isArray(effective_merchants) ? effective_merchants.slice() : [];

    // Sort: open first, then featured, then rating
    list.sort((a, b) => {
      const ao = Number(isOpenNow(a));
      const bo = Number(isOpenNow(b));
      if (ao !== bo) return bo - ao;

      const af = Number(merchant_featured_of(a));
      const bf = Number(merchant_featured_of(b));
      if (af !== bf) return bf - af;

      return merchant_rating_of(b) - merchant_rating_of(a);
    });

    return list;
  }, [effective_merchants]);

  const products_to_show = useMemo(() => (Array.isArray(effective_products) ? effective_products : []), [effective_products]);

  return (
    <View style={{ paddingTop: 18, paddingBottom: 10 }}>
      <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
        <Text style={S.title}>More restaurants near you</Text>
      </View>

      {effective_merchants_loading ? (
        <View style={{ paddingVertical: 14 }}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : merchants_to_show.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
          {merchants_to_show.map((r: any) => {
            const id = str(r?.id);
            const name = merchant_name_of(r);
            const logo = merchant_logo_of(r);
            const rating = merchant_rating_of(r);
            const featured = merchant_featured_of(r);

            const open = isOpenNow(r);
            const sub = open ? (rating > 0 ? `⭐ ${rating.toFixed(1)}` : ' ') : openLabel(r) || 'Closed';

            return (
              <Card3D
                key={id}
                disabled={!open}
                onPress={() => {
                  if (!open) return; // double safety: closed ones should not open
                  router.push({ pathname: '/(customer)/restaurant/[id]', params: { id } } as any);
                }}
              >
                <View style={[S.card, !open && { backgroundColor: '#F9FAFB' }]}>
                  <View style={S.logoWrap}>
                    {logo ? (
                      <Image source={{ uri: String(logo) }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                    ) : (
                      <Text style={{ fontSize: 24 }}>🏪</Text>
                    )}
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {featured ? <View style={S.badgeStar}><Text style={S.badgeStarTxt}>FEATURED</Text></View> : null}
                    {!open ? <View style={S.badgeClosed}><Text style={S.badgeClosedTxt}>CLOSED</Text></View> : null}
                  </View>

                  <Text style={S.name} numberOfLines={1}>
                    {name}
                  </Text>

                  <Text style={S.meta} numberOfLines={1}>
                    {sub}
                  </Text>
                </View>
              </Card3D>
            );
          })}
        </ScrollView>
      ) : (
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={S.emptyTxt}>{m_error ? `Restaurants: ${m_error}` : 'No restaurants found.'}</Text>
        </View>
      )}

      {show_products ? (
        <>
          <View style={{ paddingHorizontal: 16, marginTop: 18, marginBottom: 10 }}>
            <Text style={S.title}>Recommended products</Text>
          </View>

          {effective_products_loading ? (
            <View style={{ paddingVertical: 14 }}>
              <ActivityIndicator color={COLORS.primary} />
            </View>
          ) : products_to_show.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
              {products_to_show.map((p: any) => {
                const id = str(p?.id);
                const name = product_name_of(p);
                const img = product_img_of(p);
                const price = product_price_of(p);
                const unit = product_unit_of(p);

                return (
                  <View key={id} style={S.card}>
                    <View style={S.logoWrap}>
                      {img ? (
                        <Image source={{ uri: String(img) }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                      ) : (
                        <Text style={{ fontSize: 22 }}>🛒</Text>
                      )}
                    </View>

                    <Text style={S.name} numberOfLines={1}>
                      {name}
                    </Text>

                    <Text style={S.meta} numberOfLines={1}>
                      ₹{price.toFixed(2)} {unit ? `• ${unit}` : ''}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          ) : (
            <View style={{ paddingHorizontal: 16 }}>
              <Text style={S.emptyTxt}>{p_error ? `Products: ${p_error}` : 'No products found.'}</Text>
            </View>
          )}
        </>
      ) : null}
    </View>
  );
}

const S = StyleSheet.create({
  title: { fontSize: 14, fontWeight: '900', color: COLORS.text },

  card: {
    width: 170,
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 12,
    elevation: Platform.OS === 'android' ? 6 : 0,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },

  logoWrap: {
    width: '100%',
    height: 86,
    borderRadius: 16,
    backgroundColor: '#FFF3EE',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 10,
  },

  name: { fontSize: 13, fontWeight: '900', color: COLORS.text, textAlign: 'left', marginTop: 8 },
  meta: { fontSize: 11, color: COLORS.textLight, marginTop: 4, fontWeight: '800' },

  badgeStar: {
    backgroundColor: '#FEF3C7',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: '#FCD34D',
    marginTop: 2,
  },
  badgeStarTxt: { fontSize: 10, fontWeight: '900', color: '#92400E' },

  badgeClosed: {
    backgroundColor: '#FEE2E2',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    marginTop: 2,
  },
  badgeClosedTxt: { fontSize: 10, fontWeight: '900', color: '#991B1B' },

  emptyTxt: { fontSize: 12, color: COLORS.textLight, fontWeight: '700', paddingBottom: 6 },
});
