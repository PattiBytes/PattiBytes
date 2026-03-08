/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

import DashboardLayout from '@/components/layouts/DashboardLayout';
import { restaurantService, type MenuByCategory } from '@/services/restaurants';
import { useCart } from '@/contexts/CartContext';
import { type CartItem } from '@/services/cart';
import { getSafeImageSrc } from '@/lib/safeImage';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';

import {
  ArrowLeft, Clock, Star, MapPin, Phone, Mail,
  ShoppingCart, Plus, Minus, Search, X,
  ChevronDown, ChevronUp, IndianRupee, Leaf,
  SlidersHorizontal, Image as ImageIcon,
  TrendingUp, Flame, Gift, Sparkles, ChevronRight,
  Percent, Store, CheckCircle2,
} from 'lucide-react';

import {
  type MenuItem, type TrendingItem, type OfferItem,
  type RecommendedRestaurant, type SortKey,
  finalPrice, useNow,
  isDishAvailableNow,
  getDishTimingLabel, getNextAvailableLabel,
  isRestaurantOpenNow, getRestaurantHoursLabel,
} from './_components/types';

import { MenuSection }              from './_components/MenuSection';
import { RestaurantClosedBanner }   from './_components/RestaurantClosedBanner';

export default function RestaurantDetailPage() {
  const params       = useParams();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { addToCart, itemCount } = useCart();

  const restaurantId = String((params as any)?.id || '');
  const focusItemId  = searchParams.get('item');

  // ── live clock: updates every 60s → re-checks timing without reload ────────
  const now = useNow(60_000);

  // ── state ──────────────────────────────────────────────────────────────────
  const [restaurant,     setRestaurant]     = useState<any | null>(null);
  const [menuByCategory, setMenuByCategory] = useState<MenuByCategory>({});
  const [loading,        setLoading]        = useState(true);

  const [searchQuery,        setSearchQuery]        = useState('');
  const [vegOnly,            setVegOnly]            = useState(false);
  const [sortKey,            setSortKey]            = useState<SortKey>('recommended');
  const [quantities,         setQuantities]         = useState<Record<string, number>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const [trending,           setTrending]           = useState<TrendingItem[]>([]);
  const [trendingLoading,    setTrendingLoading]    = useState(false);
  const [offers,             setOffers]             = useState<OfferItem[]>([]);
  const [offersLoading,      setOffersLoading]      = useState(false);
  const [recommended,        setRecommended]        = useState<RecommendedRestaurant[]>([]);
  const [recommendedLoading, setRecommendedLoading] = useState(false);

  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // ── derived: is the restaurant open right now? (reactive to `now`) ─────────
  const restaurantOpen = useMemo(() => {
    if (!restaurant) return false;
    return isRestaurantOpenNow(
      restaurant.opening_time ?? (restaurant as any).openingtime,
      restaurant.closing_time ?? (restaurant as any).closingtime,
      now,
    );
  }, [restaurant, now]);

  const hoursLabel = useMemo(() => {
    if (!restaurant) return '';
    return getRestaurantHoursLabel(
      restaurant.opening_time ?? (restaurant as any).openingtime,
      restaurant.closing_time ?? (restaurant as any).closingtime,
    );
  }, [restaurant]);

  // ── loaders ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!restaurantId) return;
    loadRestaurantDetails();
    loadTrendingItems();
    loadOfferItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  useEffect(() => {
    if (restaurant) loadRecommendedRestaurants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant]);

  const loadRestaurantDetails = async () => {
    setLoading(true);
    try {
      const [r, menu] = await Promise.all([
        restaurantService.getRestaurantById(restaurantId),
        restaurantService.getMenuItemsByCategory(restaurantId),
      ]);
      if (!r) {
        toast.error('Restaurant not found');
        router.push('/customer/dashboard');
        return;
      }
      setRestaurant(r);
      setMenuByCategory(menu);

      const cats = Object.keys(menu || {});
      if (focusItemId) {
        const all: Record<string, boolean> = {};
        cats.forEach(c => (all[c] = true));
        setExpandedCategories(all);
      } else {
        setExpandedCategories(cats.length ? { [cats[0]]: true } : {});
      }
    } catch {
      toast.error('Failed to load restaurant');
    } finally {
      setLoading(false);
    }
  };

  const loadTrendingItems = async () => {
    setTrendingLoading(true);
    try {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: oiData, error } = await supabase
        .from('order_items')
        .select('menu_item_id,quantity,menu_items!inner(merchant_id)')
        .gte('created_at', since)
        .eq('menu_items.merchant_id', restaurantId)
        .limit(5000);

      if (error || !oiData?.length) { setTrending([]); return; }

      const qtyMap = new Map<string, number>();
      for (const r of oiData) {
        const id = String((r as any)?.menu_item_id || '');
        const q  = Number((r as any)?.quantity || 0);
        if (id && q > 0) qtyMap.set(id, (qtyMap.get(id) || 0) + q);
      }

      const topIds = Array.from(qtyMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([id, totalQty]) => ({ id, totalQty }));

      if (!topIds.length) { setTrending([]); return; }

      const { data: items } = await supabase
        .from('menu_items')
        .select('id,name,price,image_url,discount_percentage,is_veg,category')
        .in('id', topIds.map(x => x.id));

      const itemMap = new Map<string, any>((items || []).map((it: any) => [String(it.id), it]));

      setTrending(
        topIds
          .map(({ id, totalQty }) => {
            const it = itemMap.get(id);
            if (!it) return null;
            return {
              id, totalQty,
              name:                String(it.name || ''),
              price:               Number(it.price || 0),
              image_url:           it.image_url ?? null,
              discount_percentage: it.discount_percentage ?? null,
              is_veg:              it.is_veg ?? null,
              category:            it.category ?? null,
            };
          })
          .filter(Boolean) as TrendingItem[]
      );
    } catch { setTrending([]); }
    finally { setTrendingLoading(false); }
  };

  const loadOfferItems = async () => {
    setOffersLoading(true);
    try {
      const { data: promoRows, error } = await supabase
        .from('promo_codes')
        .select('id,code,deal_type,deal_json,valid_from,valid_until')
        .eq('is_active', true)
        .eq('scope', 'merchant')
        .eq('merchant_id', restaurantId)
        .eq('deal_type', 'bxgy')
        .limit(10);

      if (error || !promoRows?.length) { setOffers([]); return; }

      const nowMs = Date.now();
      const active = promoRows.filter((p: any) => {
        if (p.valid_from  && new Date(p.valid_from).getTime()  > nowMs) return false;
        if (p.valid_until && new Date(p.valid_until).getTime() < nowMs) return false;
        return true;
      });
      if (!active.length) { setOffers([]); return; }

      const { data: targets } = await supabase
        .from('promo_bxgy_targets')
        .select('promo_code_id,side,menu_item_id')
        .in('promo_code_id', active.map((p: any) => p.id));

      const menuItemIds = Array.from(new Set(
        (targets || []).map((t: any) => String(t.menu_item_id)).filter(Boolean)
      ));
      const menuMap = new Map<string, any>();
      if (menuItemIds.length) {
        const { data: items } = await supabase
          .from('menu_items')
          .select('id,name,image_url,price')
          .in('id', menuItemIds);
        (items ?? []).forEach((it: any) => menuMap.set(String(it.id), it));
      }

      const offerItems: OfferItem[] = [];
      for (const promo of active) {
        const ts      = (targets || []).filter((t: any) => t.promo_code_id === promo.id);
        const buyId   = ts.find((t: any) => t.side === 'buy')?.menu_item_id;
        const getId   = ts.find((t: any) => t.side === 'get')?.menu_item_id;
        const buyItem = buyId ? menuMap.get(String(buyId)) : null;
        const getItem = getId ? menuMap.get(String(getId)) : null;
        if (!buyItem) continue;

        const discType = String(promo.deal_json?.get?.discount?.type ?? 'free');
        const discVal  = Number(promo.deal_json?.get?.discount?.value ?? 0);
        const disc     = discType === 'free' ? 'FREE' : `${discVal}${discType === 'percentage' ? '%' : '₹'} OFF`;

        offerItems.push({
          id:           String(promo.id),
          promoId:      String(promo.id),
          buyItemId:    String(buyId),
          buyItemName:  String(buyItem.name || ''),
          buyItemImage: buyItem.image_url ?? null,
          buyItemPrice: Number(buyItem.price || 0),
          getItemId:    getId ? String(getId) : undefined,
          getItemName:  getItem?.name,
          offerLabel:   `Buy ${buyItem.name} → Get ${getItem?.name ?? '1 item'} ${disc}`,
          promoCode:    String(promo.code || ''),
        });
      }
      setOffers(offerItems);
    } catch { setOffers([]); }
    finally { setOffersLoading(false); }
  };

  const loadRecommendedRestaurants = async () => {
    if (!restaurant) return;
    setRecommendedLoading(true);
    try {
      const { data, error } = await supabase
        .from('merchants')
        .select('id,business_name,logo_url,cuisine_types,average_rating,estimated_prep_time,latitude,longitude')
        .eq('is_active', true)
        .neq('id', restaurantId)
        .limit(20);

      if (error || !data?.length) { setRecommended([]); return; }

      const cuisines = restaurant.cuisine_types || [];
      const pool     = cuisines.length
        ? data.filter((m: any) => (Array.isArray(m.cuisine_types) ? m.cuisine_types : []).some((c: string) => cuisines.includes(c)))
        : data;

      const toRad = (d: number) => (d * Math.PI) / 180;
      const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
        const a    = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
        return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      };

      setRecommended(
        pool
          .map((m: any) => ({
            id:               String(m.id),
            business_name:    String(m.business_name || 'Restaurant'),
            logo_url:         m.logo_url ?? null,
            cuisine_types:    Array.isArray(m.cuisine_types) ? m.cuisine_types : [],
            average_rating:   Number(m.average_rating || 0),
            estimated_prep_time: Number(m.estimated_prep_time || 30),
            distance_km:      haversine(
              Number(restaurant.latitude || 0), Number(restaurant.longitude || 0),
              Number(m.latitude || 0),          Number(m.longitude || 0)
            ),
          }))
          .sort((a: any, b: any) => a.distance_km - b.distance_km)
          .slice(0, 8)
      );
    } catch { setRecommended([]); }
    finally { setRecommendedLoading(false); }
  };

  // ── cart ───────────────────────────────────────────────────────────────────
  const handleAddToCart = (item: MenuItem) => {
    // Double-guard: block at JS level too
    if (!restaurantOpen) {
      toast.error('Restaurant is currently closed', { position: 'top-center' });
      return;
    }
    if (!isDishAvailableNow(item.dish_timing, now)) {
      const next = getNextAvailableLabel(item.dish_timing, now);
      toast.warning(`${item.name} is not available now. ${next}`, { position: 'top-center', autoClose: 3000 });
      return;
    }

    const cartItem: CartItem = {
      id:                  item.id,
      merchant_id:         restaurantId,
      name:                item.name,
      price:               item.price,
      quantity:            quantities[item.id] || 1,
      image_url:           item.image_url,
      is_veg:              item.is_veg,
      category:            item.category,
      discount_percentage: item.discount_percentage,
      category_id:         null,
      menu_item_id:        item.id,
    };

    if (!addToCart(cartItem, restaurant?.business_name || 'Restaurant')) {
      toast.error('You have items from another restaurant. Please clear your cart first.', {
        position: 'top-center', autoClose: 3000,
      });
      return;
    }
    toast.success(`${item.name} added to cart!`, { position: 'bottom-center', autoClose: 1500 });
    setQuantities(p => ({ ...p, [item.id]: 1 }));
  };

  const handleAddOfferToCart = (offer: OfferItem) => {
    if (!restaurantOpen) {
      toast.error('Restaurant is currently closed');
      return;
    }
    const cartItem: CartItem = {
      id:                  offer.buyItemId,
      merchant_id:         restaurantId,
      name:                offer.buyItemName,
      price:               offer.buyItemPrice,
      quantity:            quantities[offer.buyItemId] || 1,
      image_url:           offer.buyItemImage,
      is_veg:              null,
      category:            null,
      discount_percentage: null,
      category_id:         null,
      menu_item_id:        offer.buyItemId,
    };
    if (!addToCart(cartItem, restaurant?.business_name || 'Restaurant')) {
      toast.error('You have items from another restaurant. Please clear your cart first.');
      return;
    }
    toast.success(`Added! Offer: ${offer.offerLabel}`, { position: 'bottom-center', autoClose: 2000 });
    setQuantities(p => ({ ...p, [offer.buyItemId]: 1 }));
  };

  const updateQuantity = (id: string, delta: number) =>
    setQuantities(p => ({ ...p, [id]: Math.max(1, Math.min(10, (p[id] || 1) + delta)) }));

  const toggleCategory   = (cat: string) => setExpandedCategories(p => ({ ...p, [cat]: !p[cat] }));
  const scrollToCategory = (cat: string) => {
    categoryRefs.current[cat]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setExpandedCategories(p => ({ ...p, [cat]: true }));
  };

  // ── derived ────────────────────────────────────────────────────────────────
  const categories = useMemo(() => Object.keys(menuByCategory || {}), [menuByCategory]);

  const filteredMenu = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return Object.entries(menuByCategory || {}).reduce((acc, [cat, items]) => {
      let list = items as MenuItem[];
      // Only show is_available=true items (null counts as available)
      list = list.filter(it => it.is_available !== false);
      if (vegOnly) list = list.filter(it => it.is_veg === true);
      if (q) list = list.filter(it =>
        String(it.name        || '').toLowerCase().includes(q) ||
        String(it.description || '').toLowerCase().includes(q)
      );
      if (sortKey === 'price_low')
        list = [...list].sort((a, b) => finalPrice(a.price, a.discount_percentage) - finalPrice(b.price, b.discount_percentage));
      if (sortKey === 'price_high')
        list = [...list].sort((a, b) => finalPrice(b.price, b.discount_percentage) - finalPrice(a.price, a.discount_percentage));
      if (list.length) acc[cat] = list;
      return acc;
    }, {} as MenuByCategory);
  }, [menuByCategory, searchQuery, vegOnly, sortKey]);

  const totalShownItems = useMemo(
    () => Object.values(filteredMenu).reduce((s, items) => s + (items?.length || 0), 0),
    [filteredMenu]
  );

  // ── focus scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!focusItemId || !Object.keys(menuByCategory).length) return;
    const t = setTimeout(() => {
      const el = document.getElementById(`menu-item-${focusItemId}`);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-4', 'ring-primary', 'rounded-2xl', 'shadow-2xl');
      setTimeout(() => el.classList.remove('ring-4', 'ring-primary', 'rounded-2xl', 'shadow-2xl'), 3000);
    }, 450);
    return () => clearTimeout(t);
  }, [focusItemId, menuByCategory]);

  // ── loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 animate-pulse">
          <div className="h-72 bg-gradient-to-r from-gray-200 to-gray-300 rounded-2xl" />
          <div className="h-14 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-40 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!restaurant) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Restaurant not found</h1>
          <button
            onClick={() => router.push('/customer/dashboard')}
            className="bg-primary text-white px-6 py-3 rounded-xl hover:bg-orange-600 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const bannerSrc = getSafeImageSrc((restaurant as any).banner_url ?? (restaurant as any).bannerurl);
  const logoSrc   = getSafeImageSrc((restaurant as any).logo_url   ?? (restaurant as any).logourl);

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-pink-50">

        {/* ── Banner ──────────────────────────────────────────────────────── */}
        <div className="relative h-64 md:h-80 bg-gradient-to-br from-orange-400 to-pink-500 overflow-hidden">
          {bannerSrc ? (
            <Image src={bannerSrc} alt={restaurant.business_name} fill className="object-cover" priority />
          ) : (
            <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_20%_20%,white,transparent_35%),radial-gradient(circle_at_80%_30%,white,transparent_35%)] animate-pulse" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-black/20" />

          {/* Back */}
          <button
            onClick={() => router.back()}
            className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm p-3 rounded-full
                       hover:bg-white transition-all shadow-lg z-10 hover:scale-110 active:scale-95"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-900" />
          </button>

          {/* Cart bubble */}
          {itemCount > 0 && (
            <button
              onClick={() => router.push('/customer/cart')}
              className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-full
                         hover:bg-white transition-all shadow-lg z-10 hover:scale-110 active:scale-95"
              aria-label="Cart"
            >
              <ShoppingCart className="w-5 h-5 text-primary" />
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-black
                               w-6 h-6 rounded-full flex items-center justify-center shadow-md animate-pulse">
                {itemCount}
              </span>
            </button>
          )}

          {/* Info overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6
                          bg-gradient-to-t from-black/90 via-black/70 to-transparent">
            <div className="max-w-7xl mx-auto flex items-end gap-4">

              {/* Logo */}
              <div className="w-18 h-18 md:w-22 md:h-22 rounded-2xl overflow-hidden border-4 border-white
                              shadow-2xl bg-white flex-shrink-0 relative" style={{ width: 76, height: 76 }}>
                {logoSrc ? (
                  <Image src={logoSrc} alt="Logo" fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <ImageIcon className="w-7 h-7" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-xl md:text-3xl font-black text-white truncate drop-shadow-lg">
                    {restaurant.business_name}
                  </h1>
                  {/* Open/closed pill */}
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-black flex items-center gap-1
                    ${restaurantOpen
                      ? 'bg-green-500/90 text-white'
                      : 'bg-red-500/90 text-white'
                    }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${restaurantOpen ? 'bg-white animate-pulse' : 'bg-white'}`} />
                    {restaurantOpen ? 'Open' : 'Closed'}
                  </span>
                </div>

                {/* Cuisine chips */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {restaurant.cuisine_types?.slice(0, 4)?.map((c: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 bg-white/20 backdrop-blur-sm text-white
                                             text-xs font-bold rounded-full border border-white/30">
                      {c}
                    </span>
                  ))}
                </div>

                {/* Stats row */}
                <div className="flex flex-wrap gap-3 text-white text-xs">
                  <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm px-2 py-1 rounded-full">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span className="font-black">{restaurant.average_rating?.toFixed(1) || '4.5'}</span>
                    <span className="text-white/70">({restaurant.total_reviews || 0})</span>
                  </div>
                  <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm px-2 py-1 rounded-full">
                    <Clock className="w-3 h-3" />
                    <span className="font-bold">{restaurant.estimated_prep_time || 30}m prep</span>
                  </div>
                  <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm px-2 py-1 rounded-full">
                    <IndianRupee className="w-3 h-3" />
                    <span className="font-bold">Min ₹{restaurant.min_order_amount || 0}</span>
                  </div>
                  {hoursLabel && (
                    <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm px-2 py-1 rounded-full">
                      <Clock className="w-3 h-3" />
                      <span className="font-bold">{hoursLabel}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Desktop: full menu button */}
              <div className="hidden md:flex flex-col items-end gap-2 flex-shrink-0">
                <button
                  onClick={() => router.push(`/customer/restaurant/${restaurantId}/menu`)}
                  className="px-4 py-2 rounded-full bg-white text-gray-900 font-black
                             hover:bg-gray-100 transition shadow-lg hover:scale-105 text-sm"
                >
                  Full Menu
                </button>
                <span className="text-white/80 text-xs font-bold bg-white/10 px-2 py-0.5 rounded-full">
                  {totalShownItems} items
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Page body ────────────────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-4 py-5 pb-28 md:pb-10 space-y-5">

          {/* Restaurant closed banner — prominent */}
          {!restaurantOpen && (
            <RestaurantClosedBanner hoursLabel={hoursLabel} />
          )}

          {/* Trending */}
          {!trendingLoading && trending.length > 0 && (
            <div className="bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 rounded-3xl
                            shadow-2xl border-2 border-primary p-5 animate-in slide-in-from-left duration-700">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-orange-600
                                flex items-center justify-center shadow-lg animate-pulse">
                  <Flame className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">
                    Trending at {restaurant.business_name}
                  </h3>
                  <p className="text-xs text-gray-600 font-bold flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Most ordered · last 7 days
                  </p>
                </div>
              </div>

              <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
                {trending.map((item, idx) => {
                  const img   = String(item.image_url || '').trim();
                  const price = finalPrice(item.price, item.discount_percentage);

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        const el = document.getElementById(`menu-item-${item.id}`);
                        if (!el) return;
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        el.classList.add('ring-4', 'ring-primary', 'rounded-2xl', 'shadow-2xl');
                        setTimeout(() => el.classList.remove('ring-4', 'ring-primary', 'rounded-2xl', 'shadow-2xl'), 2500);
                      }}
                      className="min-w-[160px] max-w-[160px] text-left bg-white border-2 border-gray-200
                                 rounded-2xl shadow-md hover:shadow-xl hover:border-primary hover:scale-105
                                 transition-all duration-300 overflow-hidden flex-shrink-0 animate-in fade-in"
                      style={{ animationDelay: `${idx * 80}ms` }}
                    >
                      <div className="h-20 bg-gradient-to-br from-gray-100 to-gray-200 relative">
                        {img ? (
                          <img src={img} alt={item.name} className="w-full h-full object-cover"
                               loading="lazy" onError={e => { (e.currentTarget as any).style.display = 'none'; }} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <ImageIcon className="w-7 h-7" />
                          </div>
                        )}
                        {(item.discount_percentage ?? 0) > 0 && (
                          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md
                                          bg-red-500 text-white text-xs font-black shadow">
                            -{item.discount_percentage}%
                          </div>
                        )}
                        <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md
                                        bg-primary text-white text-xs font-black shadow flex items-center gap-0.5">
                          <Flame className="w-2.5 h-2.5" />
                          #{idx + 1}
                        </div>
                      </div>
                      <div className="p-2.5">
                        <div className="font-black text-gray-900 truncate text-sm">{item.name}</div>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-sm font-black bg-gradient-to-r from-primary to-pink-600
                                           bg-clip-text text-transparent">
                            ₹{price.toFixed(0)}
                          </span>
                          <span className="text-xs font-black text-primary flex items-center gap-0.5">
                            <TrendingUp className="w-3 h-3" />{item.totalQty}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Offers */}
          {!offersLoading && offers.length > 0 && (
            <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-3xl
                            shadow-2xl border-2 border-green-400 p-5 animate-in slide-in-from-right duration-700">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600
                                flex items-center justify-center shadow-lg animate-bounce">
                  <Gift className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">Special Offers</h3>
                  <p className="text-xs text-gray-600 font-bold flex items-center gap-1">
                    <Percent className="w-3 h-3" /> Buy items to get amazing deals!
                  </p>
                </div>
              </div>

              <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
                {offers.map((offer, idx) => {
                  const img = String(offer.buyItemImage || '').trim();
                  const qty = quantities[offer.buyItemId] || 1;

                  return (
                    <div
                      key={offer.id}
                      className="min-w-[220px] max-w-[220px] bg-white border-2 border-gray-200
                                 rounded-2xl shadow-md hover:shadow-xl hover:border-green-500 transition-all
                                 duration-300 overflow-hidden flex-shrink-0 animate-in fade-in"
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      <div className="h-24 bg-gradient-to-br from-green-100 to-emerald-100 relative">
                        {img ? (
                          <img src={img} alt={offer.buyItemName} className="w-full h-full object-cover"
                               loading="lazy" onError={e => { (e.currentTarget as any).style.display = 'none'; }} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Sparkles className="w-12 h-12 text-green-400 animate-pulse" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-red-500
                                        text-white text-xs font-black shadow animate-pulse">
                          OFFER
                        </div>
                      </div>
                      <div className="p-3">
                        <div className="font-black text-gray-900 text-sm truncate">{offer.buyItemName}</div>
                        <div className="text-xs text-green-700 font-bold mb-2 line-clamp-2">{offer.offerLabel}</div>
                        <div className="text-base font-black bg-gradient-to-r from-primary to-pink-600
                                        bg-clip-text text-transparent mb-3">
                          ₹{offer.buyItemPrice.toFixed(0)}
                        </div>

                        <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1 mb-2">
                          <button onClick={() => updateQuantity(offer.buyItemId, -1)} disabled={qty <= 1}
                            className="w-7 h-7 flex items-center justify-center hover:bg-white rounded-lg
                                       transition disabled:opacity-40">
                            <Minus className="w-3 h-3 text-gray-700" />
                          </button>
                          <span className="flex-1 text-center font-black text-gray-900 text-sm">{qty}</span>
                          <button onClick={() => updateQuantity(offer.buyItemId, 1)} disabled={qty >= 10}
                            className="w-7 h-7 flex items-center justify-center hover:bg-white rounded-lg
                                       transition disabled:opacity-40">
                            <Plus className="w-3 h-3 text-gray-700" />
                          </button>
                        </div>

                        <button
                          onClick={() => handleAddOfferToCart(offer)}
                          disabled={!restaurantOpen}
                          className="w-full px-3 py-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600
                                     text-white text-xs font-black text-center shadow-md hover:shadow-xl
                                     transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed
                                     disabled:hover:scale-100"
                        >
                          {restaurantOpen ? 'Add to Cart' : 'Restaurant Closed'}
                        </button>

                        <div className="mt-2 text-center text-xs font-bold text-gray-500">
                          CODE: {offer.promoCode}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search / filter controls */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4
                          animate-in slide-in-from-top duration-500">
            <div className="flex flex-col md:flex-row gap-3 md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search menu items…"
                  className="w-full pl-10 pr-10 py-3 border-2 border-gray-200 rounded-xl font-bold
                             focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setVegOnly(v => !v)}
                  className={`px-3 py-3 rounded-xl border-2 font-extrabold inline-flex items-center gap-2 transition-all
                    ${vegOnly ? 'border-green-600 bg-green-50 text-green-700 shadow' : 'border-gray-200 bg-white text-gray-700'}`}
                >
                  <Leaf className="w-5 h-5" /> Veg
                </button>

                <div className="px-3 py-3 rounded-xl border-2 border-gray-200 bg-white font-extrabold
                                inline-flex items-center gap-2 hover:border-primary transition-all">
                  <SlidersHorizontal className="w-5 h-5 text-gray-600" />
                  <select
                    value={sortKey}
                    onChange={e => setSortKey(e.target.value as SortKey)}
                    className="bg-transparent outline-none font-extrabold text-gray-700"
                    aria-label="Sort"
                  >
                    <option value="recommended">Recommended</option>
                    <option value="price_low">Price: Low → High</option>
                    <option value="price_high">Price: High → Low</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Category chips */}
          {categories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
              {categories.map((cat, idx) => (
                <button
                  key={cat}
                  onClick={() => scrollToCategory(cat)}
                  className="whitespace-nowrap px-4 py-2 rounded-full bg-white border-2 border-gray-200
                             shadow-sm hover:shadow-lg hover:border-primary font-black text-gray-800
                             transition-all hover:scale-105 animate-in fade-in flex-shrink-0"
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* ── Menu items ─────────────────────────────────────── */}
          <MenuSection
            filteredMenu={filteredMenu}
            expandedCategories={expandedCategories}
            quantities={quantities}
            now={now}
            restaurantOpen={restaurantOpen}
            categoryRefs={categoryRefs}
            onToggleCategory={toggleCategory}
            onAdd={handleAddToCart}
            onUpdateQty={updateQuantity}
          />

          {/* ── About / Info cards ─────────────────────────────── */}
          {restaurant.description && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-lg font-black text-gray-900 mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" /> About
              </h2>
              <p className="text-gray-700 leading-relaxed font-medium text-sm">{restaurant.description}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {restaurant.phone && (
              <div className="bg-white rounded-2xl shadow-md border border-blue-100 p-4
                              flex items-center gap-3 hover:shadow-xl hover:border-blue-300 transition">
                <div className="w-11 h-11 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 font-bold">Contact</p>
                  <p className="font-black text-gray-900 truncate">{restaurant.phone}</p>
                </div>
              </div>
            )}
            {restaurant.email && (
              <div className="bg-white rounded-2xl shadow-md border border-green-100 p-4
                              flex items-center gap-3 hover:shadow-xl hover:border-green-300 transition">
                <div className="w-11 h-11 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 font-bold">Email</p>
                  <p className="font-black text-gray-900 truncate text-sm">{restaurant.email}</p>
                </div>
              </div>
            )}
            {restaurant.address && (
              <div className="bg-white rounded-2xl shadow-md border border-orange-100 p-4
                              flex items-center gap-3 hover:shadow-xl hover:border-orange-300 transition">
                <div className="w-11 h-11 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 font-bold">Address</p>
                  <p className="font-black text-gray-900 text-sm line-clamp-2">{restaurant.address}</p>
                </div>
              </div>
            )}
          </div>

          {/* Hours card */}
          {hoursLabel && (
            <div className={`rounded-2xl border-2 p-4 flex items-center gap-3 shadow-sm
              ${restaurantOpen
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'}`}
            >
              <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0
                ${restaurantOpen ? 'bg-green-100' : 'bg-red-100'}`}>
                <Clock className={`w-5 h-5 ${restaurantOpen ? 'text-green-600' : 'text-red-500'}`} />
              </div>
              <div>
                <p className={`text-xs font-bold ${restaurantOpen ? 'text-green-700' : 'text-red-600'}`}>
                  {restaurantOpen ? 'Open Now' : 'Currently Closed'}
                </p>
                <p className={`font-black text-sm ${restaurantOpen ? 'text-green-900' : 'text-red-800'}`}>
                  Today: {hoursLabel}
                </p>
              </div>
              {restaurantOpen && <CheckCircle2 className="ml-auto w-5 h-5 text-green-500 flex-shrink-0" />}
            </div>
          )}

          {/* Recommended */}
          {!recommendedLoading && recommended.length > 0 && (
            <div className="bg-white rounded-3xl shadow-2xl border-2 border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500
                                flex items-center justify-center shadow-lg">
                  <Store className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">You May Also Like</h3>
                  <p className="text-xs text-gray-600 font-bold">Similar restaurants nearby</p>
                </div>
              </div>

              <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
                {recommended.map((rest, idx) => {
                  const logo = getSafeImageSrc(rest.logo_url);
                  return (
                    <button
                      key={rest.id}
                      onClick={() => router.push(`/customer/restaurant/${rest.id}`)}
                      className="min-w-[160px] max-w-[160px] text-left bg-white border-2 border-gray-200
                                 rounded-2xl shadow-md hover:shadow-xl hover:border-primary hover:scale-105
                                 transition-all duration-300 overflow-hidden flex-shrink-0"
                      style={{ animationDelay: `${idx * 70}ms` }}
                    >
                      <div className="h-20 bg-gradient-to-br from-gray-100 to-gray-200 relative
                                      flex items-center justify-center">
                        {logo ? (
                          <Image src={logo} alt={rest.business_name} fill className="object-cover" sizes="160px" />
                        ) : (
                          <Store className="w-10 h-10 text-gray-400" />
                        )}
                      </div>
                      <div className="p-2.5">
                        <div className="font-black text-gray-900 text-sm truncate">{rest.business_name}</div>
                        <div className="text-xs text-gray-500 truncate font-medium">
                          {rest.cuisine_types?.slice(0, 2).join(', ') || 'Restaurant'}
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-0.5 font-bold">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            {rest.average_rating?.toFixed(1) || '4.5'}
                          </div>
                          <div className="flex items-center gap-0.5 font-bold text-gray-500">
                            <Clock className="w-3 h-3" />{rest.estimated_prep_time || 30}m
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Mobile floating cart */}
        {itemCount > 0 && (
          <div className="fixed bottom-4 left-4 right-4 md:hidden z-50">
            <button
              onClick={() => router.push('/customer/cart')}
              className="w-full bg-gradient-to-r from-primary to-pink-500 text-white px-6 py-4
                         rounded-2xl font-black flex items-center justify-between shadow-2xl
                         hover:shadow-3xl hover:scale-105 transition-all"
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-6 h-6" />
                <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
              </div>
              <span className="flex items-center gap-1">View Cart <ChevronRight className="w-5 h-5" /></span>
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
