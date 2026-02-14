/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

import DashboardLayout from '@/components/layouts/DashboardLayout';
import { restaurantService, type Restaurant, type MenuByCategory } from '@/services/restaurants';
import { useCart } from '@/contexts/CartContext';
import { type CartItem } from '@/services/cart';
import { getSafeImageSrc } from '@/lib/safeImage';
import { supabase } from '@/lib/supabase';

import {
  ArrowLeft,
  Clock,
  Star,
  MapPin,
  Phone,
  Mail,
  ShoppingCart,
  Plus,
  Minus,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  IndianRupee,
  Leaf,
  SlidersHorizontal,
  Image as ImageIcon,
  TrendingUp,
  Flame,
  Gift,
  Sparkles,
  ChevronRight,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Zap,
  Percent,
  Store,
} from 'lucide-react';

import { toast } from 'react-toastify';

type MenuItem = any;

type SortKey = 'recommended' | 'price_low' | 'price_high';

type TrendingItem = {
  id: string;
  name: string;
  price: number;
  image_url?: string | null;
  discount_percentage?: number | null;
  is_veg?: boolean | null;
  category?: string | null;
  totalQty: number;
};

type OfferItem = {
  id: string;
  promoId: string;
  buyItemId: string;
  buyItemName: string;
  buyItemImage?: string | null;
  buyItemPrice: number;
  getItemId?: string;
  getItemName?: string;
  offerLabel: string;
  promoCode: string;
};

type RecommendedRestaurant = {
  id: string;
  business_name: string;
  logo_url?: string | null;
  cuisine_types?: string[];
  average_rating?: number;
  estimated_prep_time?: number;
  distance_km?: number;
};

export default function RestaurantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const { addToCart, itemCount } = useCart();

  const restaurantId = String((params as any)?.id || '');
  const focusItemId = searchParams.get('item');

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuByCategory, setMenuByCategory] = useState<MenuByCategory>({});
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('recommended');

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // NEW: Trending items
  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);

  // NEW: Offer items
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);

  // NEW: Recommended restaurants
  const [recommended, setRecommended] = useState<RecommendedRestaurant[]>([]);
  const [recommendedLoading, setRecommendedLoading] = useState(false);

  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!restaurantId) return;
    loadRestaurantDetails();
    loadTrendingItems();
    loadOfferItems();
    loadRecommendedRestaurants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  const loadRestaurantDetails = async () => {
    setLoading(true);
    try {
      const [restaurantData, menu] = await Promise.all([
        restaurantService.getRestaurantById(restaurantId),
        restaurantService.getMenuItemsByCategory(restaurantId),
      ]);

      if (!restaurantData) {
        toast.error('Restaurant not found');
        router.push('/customer/dashboard');
        return;
      }

      setRestaurant(restaurantData);
      setMenuByCategory(menu);

      const categories = Object.keys(menu || {});

      if (focusItemId) {
        const next: Record<string, boolean> = {};
        categories.forEach((c) => (next[c] = true));
        setExpandedCategories(next);
      } else if (categories.length > 0) {
        setExpandedCategories({ [categories[0]]: true });
      }
    } catch (error) {
      console.error('Failed to load restaurant details:', error);
      toast.error('Failed to load restaurant details');
    } finally {
      setLoading(false);
    }
  };

  // NEW: Load trending items for this restaurant
  const loadTrendingItems = async () => {
    setTrendingLoading(true);
    try {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const oiRes = await supabase
        .from('order_items')
        .select('menu_item_id,quantity,created_at,menu_items!inner(merchant_id)')
        .gte('created_at', since)
        .eq('menu_items.merchant_id', restaurantId)
        .limit(5000);

      if (oiRes.error) throw oiRes.error;

      const qtyByItem = new Map<string, number>();
      for (const r of oiRes.data || []) {
        const menuItemId = String((r as any)?.menu_item_id || '');
        const q = Number((r as any)?.quantity || 0);
        if (!menuItemId || !Number.isFinite(q) || q <= 0) continue;
        qtyByItem.set(menuItemId, (qtyByItem.get(menuItemId) || 0) + q);
      }

      const top = Array.from(qtyByItem.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([menu_item_id, totalQty]) => ({ menu_item_id, totalQty }));

      const topItemIds = top.map((x) => x.menu_item_id);
      if (!topItemIds.length) {
        setTrending([]);
        return;
      }

      const itemsRes = await supabase
        .from('menu_items')
        .select('id,name,price,image_url,discount_percentage,is_veg,category')
        .in('id', topItemIds)
        .limit(100);

      if (itemsRes.error) throw itemsRes.error;

      const itemMap = new Map<string, any>();
      (itemsRes.data || []).forEach((it: any) => itemMap.set(String(it.id), it));

      const merged: TrendingItem[] = top
        .map((t) => {
          const it = itemMap.get(String(t.menu_item_id));
          if (!it) return null;

          return {
            id: String(it.id),
            name: String(it.name || ''),
            price: Number(it.price || 0),
            image_url: it.image_url ?? null,
            discount_percentage: it.discount_percentage ?? null,
            is_veg: it.is_veg ?? null,
            category: it.category ?? null,
            totalQty: Number(t.totalQty || 0),
          };
        })
        .filter(Boolean) as TrendingItem[];

      setTrending(merged);
    } catch (e) {
      console.error('Failed to load trending:', e);
      setTrending([]);
    } finally {
      setTrendingLoading(false);
    }
  };

  // NEW: Load BXGY offer items
  const loadOfferItems = async () => {
    setOffersLoading(true);
    try {
      const { data: promoRows, error: promoErr } = await supabase
        .from('promo_codes')
        .select(
          'id,code,deal_type,deal_json,is_active,valid_from,valid_until,valid_days,valid_time_start,valid_time_end,start_time,end_time'
        )
        .eq('is_active', true)
        .eq('scope', 'merchant')
        .eq('merchant_id', restaurantId)
        .eq('deal_type', 'bxgy')
        .limit(10);

      if (promoErr) throw promoErr;

      const now = new Date();
      const activePromos = (promoRows ?? []).filter((p: any) => {
        // Simple active check
        if (p.valid_from && new Date(p.valid_from) > now) return false;
        if (p.valid_until && new Date(p.valid_until) < now) return false;
        return true;
      });

      if (!activePromos.length) {
        setOffers([]);
        return;
      }

      const promoIds = activePromos.map((p: any) => p.id);

      const { data: targets } = await supabase
        .from('promo_bxgy_targets')
        .select('id,promo_code_id,side,menu_item_id')
        .in('promo_code_id', promoIds);

      const menuItemIds = Array.from(
        new Set((targets || []).map((t: any) => t.menu_item_id).filter(Boolean).map(String))
      );

      const menuItemsMap = new Map<string, any>();
      if (menuItemIds.length) {
        const { data: items } = await supabase
          .from('menu_items')
          .select('id,name,image_url,price')
          .in('id', menuItemIds)
          .limit(500);

        (items ?? []).forEach((it: any) => menuItemsMap.set(String(it.id), it));
      }

      const offerItems: OfferItem[] = [];

      for (const promo of activePromos) {
        const ts = (targets || []).filter((t: any) => t.promo_code_id === promo.id);
        const buyTargets = ts.filter((t: any) => t.side === 'buy');
        const getTargets = ts.filter((t: any) => t.side === 'get');

        const buyItemId = buyTargets[0]?.menu_item_id;
        const getItemId = getTargets[0]?.menu_item_id;

        const buyItem = buyItemId ? menuItemsMap.get(String(buyItemId)) : null;
        const getItem = getItemId ? menuItemsMap.get(String(getItemId)) : null;

        if (!buyItem) continue;

        const discType = String(promo.deal_json?.get?.discount?.type ?? 'free');
        const discVal = Number(promo.deal_json?.get?.discount?.value ?? 0);
        const disc = discType === 'free' ? 'FREE' : discType === 'percentage' ? `${discVal}% OFF` : `₹${discVal} OFF`;

        offerItems.push({
          id: String(promo.id),
          promoId: String(promo.id),
          buyItemId: String(buyItemId),
          buyItemName: String(buyItem.name || ''),
          buyItemImage: buyItem.image_url ?? null,
          buyItemPrice: Number(buyItem.price || 0),
          getItemId: getItemId ? String(getItemId) : undefined,
          getItemName: getItem?.name || undefined,
          offerLabel: `Buy ${buyItem.name} Get ${getItem?.name || '1'} ${disc}`,
          promoCode: String(promo.code || ''),
        });
      }

      setOffers(offerItems);
    } catch (e) {
      console.error('Failed to load offers:', e);
      setOffers([]);
    } finally {
      setOffersLoading(false);
    }
  };

  // NEW: Load recommended restaurants (same cuisine, nearby)
  const loadRecommendedRestaurants = async () => {
    if (!restaurant) return;

    setRecommendedLoading(true);
    try {
      const cuisines = restaurant.cuisine_types || [];
      if (!cuisines.length) {
        setRecommended([]);
        return;
      }

      const { data, error } = await supabase
        .from('merchants')
        .select('id,business_name,logo_url,cuisine_types,average_rating,estimated_prep_time,latitude,longitude')
        .eq('is_active', true)
        .neq('id', restaurantId)
        .limit(20);

      if (error) throw error;

      // Filter by similar cuisine
      const similar = (data || []).filter((m: any) => {
        const mCuisines = Array.isArray(m.cuisine_types) ? m.cuisine_types : [];
        return mCuisines.some((c: string) => cuisines.includes(c));
      });

      // Add distance if we have restaurant coords
      const withDistance = similar.map((m: any) => {
        const lat = Number(m.latitude || 0);
        const lon = Number(m.longitude || 0);
        const restLat = Number(restaurant.latitude || 0);
        const restLon = Number(restaurant.longitude || 0);

        let distance = 0;
        if (lat && lon && restLat && restLon) {
          const toRad = (deg: number) => (deg * Math.PI) / 180;
          const R = 6371;
          const dLat = toRad(lat - restLat);
          const dLon = toRad(lon - restLon);
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(restLat)) * Math.cos(toRad(lat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          distance = R * c;
        }

        return {
          id: String(m.id),
          business_name: String(m.business_name || 'Restaurant'),
          logo_url: m.logo_url ?? null,
          cuisine_types: Array.isArray(m.cuisine_types) ? m.cuisine_types : [],
          average_rating: Number(m.average_rating || 0),
          estimated_prep_time: Number(m.estimated_prep_time || 30),
          distance_km: distance,
        };
      });

      // Sort by distance, take top 8
      const sorted = withDistance.sort((a, b) => a.distance_km - b.distance_km).slice(0, 8);

      setRecommended(sorted);
    } catch (e) {
      console.error('Failed to load recommended:', e);
      setRecommended([]);
    } finally {
      setRecommendedLoading(false);
    }
  };

  const finalPrice = (price: number, discount?: number) => {
    const p = Number(price || 0);
    const d = Number(discount || 0);
    if (!d) return p;
    return p * (1 - d / 100);
  };

  const handleAddToCart = (item: MenuItem) => {
    const quantity = quantities[item.id] || 1;

    const cartItem: CartItem = {
      id: item.id,
      merchant_id: restaurantId,
      name: item.name,
      price: item.price,
      quantity,
      image_url: item.image_url,
      is_veg: item.is_veg,
      category: item.category,
      discount_percentage: item.discount_percentage,
      category_id: null,
      menu_item_id: String(item.id),
    };

    const success = addToCart(cartItem, restaurant?.business_name || 'Restaurant');
    if (!success) {
      toast.error('You have items from another restaurant. Please clear your cart first.', {
        position: 'top-center',
        autoClose: 3000,
      });
      return;
    }

    toast.success(`${item.name} added to cart!`, {
      position: 'bottom-center',
      autoClose: 1600,
    });

    setQuantities((prev) => ({ ...prev, [item.id]: 1 }));
  };

  // NEW: Add offer item to cart
  const handleAddOfferToCart = (offer: OfferItem) => {
    const qty = quantities[offer.buyItemId] || 1;

    const cartItem: CartItem = {
      id: offer.buyItemId,
      merchant_id: restaurantId,
      name: offer.buyItemName,
      price: offer.buyItemPrice,
      quantity: qty,
      image_url: offer.buyItemImage,
      is_veg: null,
      category: null,
      discount_percentage: null,
      category_id: null,
      menu_item_id: offer.buyItemId,
    };

    const success = addToCart(cartItem, restaurant?.business_name || 'Restaurant');
    if (!success) {
      toast.error('You have items from another restaurant. Please clear your cart first.');
      return;
    }

    toast.success(`${offer.buyItemName} added! Offer applied: ${offer.offerLabel}`, {
      position: 'bottom-center',
      autoClose: 2000,
    });

    setQuantities((prev) => ({ ...prev, [offer.buyItemId]: 1 }));
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[itemId] || 1;
      const newValue = Math.max(1, Math.min(10, current + delta));
      return { ...prev, [itemId]: newValue };
    });
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const scrollToCategory = (category: string) => {
    const el = categoryRefs.current[category];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setExpandedCategories((prev) => ({ ...prev, [category]: true }));
  };

  const categories = useMemo(() => Object.keys(menuByCategory || {}), [menuByCategory]);

  const filteredMenu = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const out = Object.entries(menuByCategory || {}).reduce((acc, [category, items]) => {
      let list = (items || []) as MenuItem[];

      if (vegOnly) list = list.filter((it) => it.is_veg === true);

      if (q) {
        list = list.filter(
          (it) =>
            String(it.name || '').toLowerCase().includes(q) || String(it.description || '').toLowerCase().includes(q)
        );
      }

      if (sortKey === 'price_low') {
        list = [...list].sort(
          (a, b) => finalPrice(a.price, a.discount_percentage) - finalPrice(b.price, b.discount_percentage)
        );
      } else if (sortKey === 'price_high') {
        list = [...list].sort(
          (a, b) => finalPrice(b.price, b.discount_percentage) - finalPrice(a.price, a.discount_percentage)
        );
      }

      if (list.length > 0) acc[category] = list;
      return acc;
    }, {} as MenuByCategory);

    return out;
  }, [menuByCategory, searchQuery, vegOnly, sortKey]);

  const totalShownItems = useMemo(() => {
    return Object.values(filteredMenu).reduce((sum, items) => sum + (items?.length || 0), 0);
  }, [filteredMenu]);

  useEffect(() => {
    if (!focusItemId) return;
    if (!menuByCategory || Object.keys(menuByCategory).length === 0) return;

    const t = window.setTimeout(() => {
      const el = document.getElementById(`menu-item-${focusItemId}`);
      if (!el) return;

      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-4', 'ring-primary', 'rounded-2xl', 'shadow-2xl');

      window.setTimeout(() => {
        el.classList.remove('ring-4', 'ring-primary', 'rounded-2xl', 'shadow-2xl');
      }, 3000);
    }, 400);

    return () => window.clearTimeout(t);
  }, [focusItemId, menuByCategory]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-64 bg-gradient-to-r from-gray-200 to-gray-300 rounded-2xl" />
            <div className="h-32 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!restaurant) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Restaurant not found</h1>
          <button
            onClick={() => router.push('/customer/dashboard')}
            className="bg-primary text-white px-6 py-3 rounded-xl hover:bg-orange-600 transition-all hover:scale-105"
          >
            Back to Dashboard
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const bannerSrc = getSafeImageSrc((restaurant as any).banner_url);
  const logoSrc = getSafeImageSrc((restaurant as any).logo_url);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-pink-50">
        {/* Header Banner (ENHANCED) */}
        <div className="relative h-64 md:h-80 bg-gradient-to-br from-orange-400 to-pink-500 overflow-hidden">
          {bannerSrc ? (
            <Image src={bannerSrc} alt={restaurant.business_name} fill className="object-cover" priority />
          ) : (
            <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_20%_20%,white,transparent_35%),radial-gradient(circle_at_80%_30%,white,transparent_35%),radial-gradient(circle_at_50%_80%,white,transparent_40%)] animate-pulse" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/20" />

          {/* Back Button (ENHANCED) */}
          <button
            onClick={() => router.back()}
            className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm p-3 rounded-full hover:bg-white transition-all shadow-lg z-10 hover:scale-110 active:scale-95"
            aria-label="Go back"
          >
            <ArrowLeft className="w-6 h-6 text-gray-900" />
          </button>

          {/* Cart Button (ENHANCED) */}
          {itemCount > 0 && (
            <button
              onClick={() => router.push('/customer/cart')}
              className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-full hover:bg-white transition-all shadow-lg z-10 hover:scale-110 active:scale-95 animate-bounce"
              aria-label="Open cart"
            >
              <ShoppingCart className="w-6 h-6 text-primary" />
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-black w-7 h-7 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                {itemCount}
              </span>
            </button>
          )}

          {/* Restaurant Info Overlay (ENHANCED) */}
          <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6 bg-gradient-to-t from-black/90 via-black/70 to-transparent">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden border-4 border-white shadow-2xl bg-white flex-shrink-0 animate-in zoom-in duration-500">
                  {logoSrc ? (
                    <Image
                      src={logoSrc}
                      alt={`${restaurant.business_name} logo`}
                      width={96}
                      height={96}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 animate-in slide-in-from-bottom duration-700">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h1 className="text-2xl md:text-4xl font-black text-white mb-2 truncate drop-shadow-lg">
                        {restaurant.business_name}
                      </h1>

                      <div className="flex flex-wrap gap-2 mb-3">
                        {restaurant.cuisine_types?.slice(0, 6)?.map((cuisine: string, index: number) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-bold rounded-full border border-white/30 hover:bg-white/30 transition-all"
                          >
                            {cuisine}
                          </span>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-4 text-white text-sm">
                        <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-black">{restaurant.average_rating?.toFixed(1) || '4.5'}</span>
                          <span className="text-white/80">({restaurant.total_reviews || 0})</span>
                        </div>
                        <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full">
                          <Clock className="w-4 h-4" />
                          <span className="font-bold">{restaurant.estimated_prep_time || 30} mins</span>
                        </div>
                        <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full">
                          <IndianRupee className="w-4 h-4" />
                          <span className="font-bold">Min ₹{restaurant.min_order_amount || 0}</span>
                        </div>
                      </div>
                    </div>

                    <div className="hidden md:flex flex-col gap-2 items-end">
                      <button
                        onClick={() => router.push(`/customer/restaurant/${restaurantId}/menu`)}
                        className="px-5 py-2 rounded-full bg-white text-gray-900 font-black hover:bg-gray-100 transition-all shadow-lg hover:scale-105"
                      >
                        View full menu
                      </button>
                      <div className="text-white/90 text-xs font-bold bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full">
                        {totalShownItems} items
                      </div>
                    </div>
                  </div>

                  {/* Mobile actions */}
                  <div className="mt-3 md:hidden flex gap-2">
                    <button
                      onClick={() => router.push(`/customer/restaurant/${restaurantId}/menu`)}
                      className="flex-1 px-4 py-2 rounded-xl bg-white text-gray-900 font-black hover:bg-gray-100 transition-all shadow-lg"
                    >
                      View full menu
                    </button>
                    {itemCount > 0 && (
                      <button
                        onClick={() => router.push('/customer/cart')}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-pink-500 text-white font-black hover:shadow-xl transition-all"
                      >
                        Cart ({itemCount})
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-6 pb-28 md:pb-8 space-y-6">
        

          {/* Controls row (ENHANCED) */}
          <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-4 mb-4 animate-in slide-in-from-top duration-500">
            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search menu items..."
                  className="w-full pl-10 pr-10 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all font-bold"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 hover:scale-110 transition-all"
                    aria-label="Clear search"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="flex gap-2 items-center">
                <button
                  type="button"
                  onClick={() => setVegOnly((v) => !v)}
                  className={`px-3 py-3 rounded-xl border-2 font-black inline-flex items-center gap-2 transition-all hover:scale-105 ${
                    vegOnly
                      ? 'border-green-600 bg-green-50 text-green-700 shadow-lg'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Leaf className="w-5 h-5" />
                  Veg
                </button>

                <div className="relative">
                  <div className="px-3 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-700 font-black inline-flex items-center gap-2 hover:border-primary transition-all">
                    <SlidersHorizontal className="w-5 h-5" />
                    <select
                      value={sortKey}
                      onChange={(e) => setSortKey(e.target.value as SortKey)}
                      className="bg-transparent outline-none font-black"
                      aria-label="Sort menu"
                    >
                      <option value="recommended">Recommended</option>
                      <option value="price_low">Price: Low → High</option>
                      <option value="price_high">Price: High → Low</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Category chips (ENHANCED) */}
          {categories.length > 0 && (
            <div className="mb-4 animate-in slide-in-from-bottom duration-500">
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                {categories.map((cat, idx) => (
                  <button
                    key={cat}
                    onClick={() => scrollToCategory(cat)}
                    className="whitespace-nowrap px-4 py-2 rounded-full bg-white border-2 border-gray-200 shadow-sm hover:shadow-lg hover:border-primary font-black text-gray-800 transition-all hover:scale-105 animate-in fade-in"
                    style={{animationDelay: `${idx * 50}ms`}}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Menu Items by Category */}
          <div className="space-y-4">
            {Object.keys(filteredMenu).length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-16 text-center animate-in fade-in duration-500">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <Search className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-gray-900 text-lg font-black">No menu items found</p>
                <p className="text-gray-600 text-sm mt-2">Try adjusting your filters or search query</p>
              </div>
            ) : (
              Object.entries(filteredMenu).map(([category, items], catIdx) => (
                <div
                  key={category}
                  ref={(el) => {
                    categoryRefs.current[category] = el;
                  }}
                  className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden animate-in slide-in-from-bottom duration-500 hover:shadow-2xl transition-all"
                  style={{animationDelay: `${catIdx * 100}ms`}}
                >
                  {/* Category Header (ENHANCED) */}
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full px-5 md:px-6 py-4 flex items-center justify-between hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <h2 className="text-lg md:text-xl font-black text-gray-900 truncate">{category}</h2>
                      <span className="px-3 py-1 bg-gradient-to-r from-primary to-pink-500 text-white text-xs md:text-sm font-black rounded-full shadow-md">
                        {items.length}
                      </span>
                    </div>
                    {expandedCategories[category] ? (
                      <ChevronUp className="w-6 h-6 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-6 h-6 text-gray-400" />
                    )}
                  </button>

                  {/* Category Items */}
                  {expandedCategories[category] && (
                    <div className="border-t divide-y">
                      {(items as MenuItem[]).map((item, itemIdx) => {
                        const itemQuantity = quantities[item.id] || 1;
                        const discountedPrice = finalPrice(item.price, item.discount_percentage);
                        const hasDiscount = Number(item.discount_percentage || 0) > 0;

                        const itemImgSrc = getSafeImageSrc(item.image_url);

                        return (
                          <div
                            key={item.id}
                            id={`menu-item-${item.id}`}
                            className="p-4 md:p-6 hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 transition-all animate-in fade-in"
                            style={{animationDelay: `${itemIdx * 50}ms`}}
                          >
                            <div className="flex gap-4">
                              {/* Item Image (ENHANCED) */}
                              <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-gray-200 hover:border-primary transition-all hover:scale-105 shadow-md">
                                {itemImgSrc ? (
                                  <Image src={itemImgSrc} alt={item.name} fill sizes="128px" className="object-cover" />
                                ) : (
                                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                    <ImageIcon className="w-7 h-7" />
                                  </div>
                                )}

                                {hasDiscount && (
                                  <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-black px-2 py-1 rounded-full shadow-lg animate-pulse">
                                    {item.discount_percentage}% OFF
                                  </div>
                                )}
                              </div>

                              {/* Item Details (ENHANCED) */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      {item.is_veg !== undefined && (
                                        <div
                                          className={`w-5 h-5 border-2 ${
                                            item.is_veg ? 'border-green-600' : 'border-red-600'
                                          } flex items-center justify-center rounded-sm`}
                                        >
                                          <div
                                            className={`w-2.5 h-2.5 rounded-full ${
                                              item.is_veg ? 'bg-green-600' : 'bg-red-600'
                                            }`}
                                          />
                                        </div>
                                      )}
                                      <h3 className="font-black text-gray-900 text-base md:text-lg truncate">
                                        {item.name}
                                      </h3>
                                    </div>

                                    {item.description && (
                                      <p className="text-sm text-gray-600 line-clamp-2 mb-2 font-semibold">
                                        {item.description}
                                      </p>
                                    )}

                                    <div className="flex items-center gap-2">
                                      {hasDiscount && (
                                        <span className="text-sm text-gray-400 line-through">₹{item.price}</span>
                                      )}
                                      <span className="text-lg font-black bg-gradient-to-r from-primary to-pink-600 bg-clip-text text-transparent">
                                        ₹{discountedPrice.toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Quantity & Add to Cart (ENHANCED) */}
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-4">
                                  <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1 w-fit shadow-inner">
                                    <button
                                      onClick={() => updateQuantity(item.id, -1)}
                                      className="w-9 h-9 flex items-center justify-center hover:bg-white rounded-lg transition-all disabled:opacity-40 hover:scale-110"
                                      disabled={itemQuantity <= 1}
                                      aria-label="Decrease quantity"
                                    >
                                      <Minus className="w-4 h-4 text-gray-700" />
                                    </button>
                                    <span className="w-10 text-center font-black text-gray-900">{itemQuantity}</span>
                                    <button
                                      onClick={() => updateQuantity(item.id, 1)}
                                      className="w-9 h-9 flex items-center justify-center hover:bg-white rounded-lg transition-all disabled:opacity-40 hover:scale-110"
                                      disabled={itemQuantity >= 10}
                                      aria-label="Increase quantity"
                                    >
                                      <Plus className="w-4 h-4 text-gray-700" />
                                    </button>
                                  </div>

                                  <button
                                    onClick={() => handleAddToCart(item)}
                                    className="sm:flex-1 bg-gradient-to-r from-primary to-pink-500 text-white px-6 py-3 rounded-xl hover:shadow-xl font-black flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"
                                  >
                                    <ShoppingCart className="w-5 h-5" />
                                    Add to Cart
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* NEW: SPECIAL OFFERS SECTION */}
          {!offersLoading && offers.length > 0 && (
            <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-3xl shadow-2xl border-2 border-green-400 p-5 animate-in slide-in-from-right duration-700">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="min-w-0">
                  <h3 className="text-lg font-black text-gray-900 truncate inline-flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg animate-bounce">
                      <Gift className="w-5 h-5 text-white" />
                    </div>
                    Special Offers
                  </h3>
                  <p className="text-xs text-gray-700 leading-4 mt-1 font-bold flex items-center gap-1">
                    <Percent className="w-3 h-3" />
                    Buy items to get amazing deals!
                  </p>
                </div>
              </div>

              <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
                {offers.map((offer, index) => {
                  const img = String(offer.buyItemImage || '').trim();
                  const qty = quantities[offer.buyItemId] || 1;

                  return (
                    <div
                      key={offer.id}
                      className="min-w-[220px] max-w-[220px] text-left bg-white border-2 border-gray-200 rounded-2xl shadow-lg hover:shadow-2xl hover:border-green-500 transition-all duration-300 overflow-hidden animate-in fade-in slide-in-from-bottom"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="h-28 bg-gradient-to-br from-green-100 via-emerald-100 to-teal-100 relative">
                        {img ? (
                          <img
                            src={img}
                            alt={offer.buyItemName}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Sparkles className="w-12 h-12 text-green-500 animate-pulse" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-red-500 text-white text-xs font-black shadow-lg animate-pulse">
                          OFFER
                        </div>
                      </div>

                      <div className="p-3">
                        <div className="font-black text-gray-900 text-sm truncate mb-1">{offer.buyItemName}</div>
                        <div className="text-xs text-green-700 font-bold mb-2">{offer.offerLabel}</div>
                        <div className="text-base font-black bg-gradient-to-r from-primary to-pink-600 bg-clip-text text-transparent mb-3">
                          ₹{offer.buyItemPrice.toFixed(0)}
                        </div>

                        {/* Quantity selector */}
                        <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1 mb-3">
                          <button
                            onClick={() => updateQuantity(offer.buyItemId, -1)}
                            className="w-7 h-7 flex items-center justify-center hover:bg-white rounded-lg transition-all disabled:opacity-40"
                            disabled={qty <= 1}
                          >
                            <Minus className="w-3 h-3 text-gray-700" />
                          </button>
                          <span className="flex-1 text-center font-black text-gray-900 text-sm">{qty}</span>
                          <button
                            onClick={() => updateQuantity(offer.buyItemId, 1)}
                            className="w-7 h-7 flex items-center justify-center hover:bg-white rounded-lg transition-all disabled:opacity-40"
                            disabled={qty >= 10}
                          >
                            <Plus className="w-3 h-3 text-gray-700" />
                          </button>
                        </div>

                        <button
                          onClick={() => handleAddOfferToCart(offer)}
                          className="w-full px-3 py-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-black text-center shadow-md hover:shadow-xl transition-all hover:scale-105"
                        >
                          Add to Cart
                        </button>

                        <div className="mt-2 text-center text-xs font-bold text-gray-600">
                          CODE: {offer.promoCode}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

  {/* NEW: TRENDING ITEMS (if available) */}
          {!trendingLoading && trending.length > 0 && (
            <div className="bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 rounded-3xl shadow-2xl border-2 border-primary p-5 animate-in slide-in-from-left duration-700">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="min-w-0">
                  <h3 className="text-lg font-black text-gray-900 truncate inline-flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center shadow-lg animate-pulse">
                      <Flame className="w-5 h-5 text-white" />
                    </div>
                    Trending at {restaurant.business_name}
                  </h3>
                  <p className="text-xs text-gray-700 leading-4 mt-1 font-bold flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Most ordered in last 7 days
                  </p>
                </div>
              </div>

              <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
                {trending.map((item, index) => {
                  const img = String(item.image_url || '').trim();
                  const price = finalPrice(item.price, item.discount_percentage);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        const el = document.getElementById(`menu-item-${item.id}`);
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          el.classList.add('ring-4', 'ring-primary', 'rounded-2xl', 'shadow-2xl');
                          setTimeout(() => {
                            el.classList.remove('ring-4', 'ring-primary', 'rounded-2xl', 'shadow-2xl');
                          }, 2500);
                        }
                      }}
                      className="min-w-[180px] max-w-[180px] text-left bg-white border-2 border-gray-200 rounded-2xl shadow-lg hover:shadow-2xl hover:border-primary hover:scale-105 transition-all duration-300 overflow-hidden animate-in fade-in slide-in-from-bottom"
                      style={{ animationDelay: `${index * 80}ms` }}
                    >
                      <div className="h-24 bg-gradient-to-br from-gray-100 to-gray-200 relative">
                        {img ? (
                          <img
                            src={img}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <ImageIcon className="w-7 h-7" />
                          </div>
                        )}
                        {item.discount_percentage && item.discount_percentage > 0 && (
                          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-red-500 text-white text-xs font-black shadow-lg">
                            {item.discount_percentage}% OFF
                          </div>
                        )}
                        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-primary text-white text-xs font-black shadow-lg flex items-center gap-1">
                          <Flame className="w-3 h-3" />#{index + 1}
                        </div>
                      </div>

                      <div className="p-3">
                        <div className="font-black text-gray-900 truncate text-sm">{item.name}</div>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="text-base font-black bg-gradient-to-r from-primary to-pink-600 bg-clip-text text-transparent">
                            ₹{price.toFixed(0)}
                          </div>
                          <div className="text-xs font-black text-primary flex items-center gap-0.5">
                            <TrendingUp className="w-3 h-3" />
                            {item.totalQty}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

            {/* Description */}
          {restaurant.description && (
            <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 p-6 animate-in fade-in duration-500">
              <h2 className="text-lg font-black text-gray-900 mb-2 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                About
              </h2>
              <p className="text-gray-700 leading-relaxed font-semibold">{restaurant.description}</p>
            </div>
          )}

          {/* Restaurant Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {restaurant.phone && (
              <div className="bg-white rounded-2xl shadow-lg border-2 border-blue-100 p-4 flex items-center gap-3 hover:shadow-xl hover:border-blue-300 transition-all hover:scale-105 animate-in fade-in duration-500">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <Phone className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-600 font-bold">Contact</p>
                  <p className="font-black text-gray-900 truncate">{restaurant.phone}</p>
                </div>
              </div>
            )}

            {restaurant.email && (
              <div className="bg-white rounded-2xl shadow-lg border-2 border-green-100 p-4 flex items-center gap-3 hover:shadow-xl hover:border-green-300 transition-all hover:scale-105 animate-in fade-in duration-500" style={{animationDelay: '100ms'}}>
                <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-600 font-bold">Email</p>
                  <p className="font-black text-gray-900 truncate">{restaurant.email}</p>
                </div>
              </div>
            )}

            {restaurant.address && (
              <div className="bg-white rounded-2xl shadow-lg border-2 border-orange-100 p-4 flex items-center gap-3 hover:shadow-xl hover:border-orange-300 transition-all hover:scale-105 animate-in fade-in duration-500" style={{animationDelay: '200ms'}}>
                <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-600 font-bold">Address</p>
                  <p className="font-black text-gray-900 line-clamp-2 text-sm">{restaurant.address}</p>
                </div>
              </div>
            )}
          </div>

        

          {/* NEW: RECOMMENDED RESTAURANTS */}
          {!recommendedLoading && recommended.length > 0 && (
            <div className="bg-white rounded-3xl shadow-2xl border-2 border-gray-200 p-5 animate-in slide-in-from-bottom duration-700">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="min-w-0">
                  <h3 className="text-lg font-black text-gray-900 truncate inline-flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                      <Store className="w-5 h-5 text-white" />
                    </div>
                    You May Also Like
                  </h3>
                  <p className="text-xs text-gray-700 leading-4 mt-1 font-bold">Similar restaurants near you</p>
                </div>
              </div>

              <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
                {recommended.map((rest, index) => {
                  const logoImg = getSafeImageSrc(rest.logo_url);

                  return (
                    <button
                      key={rest.id}
                      type="button"
                      onClick={() => router.push(`/customer/restaurant/${rest.id}`)}
                      className="min-w-[160px] max-w-[160px] text-left bg-white border-2 border-gray-200 rounded-2xl shadow-lg hover:shadow-2xl hover:border-primary hover:scale-105 transition-all duration-300 overflow-hidden animate-in fade-in slide-in-from-bottom"
                      style={{ animationDelay: `${index * 80}ms` }}
                    >
                      <div className="h-20 bg-gradient-to-br from-gray-100 to-gray-200 relative flex items-center justify-center">
                        {logoImg ? (
                          <img
                            src={logoImg}
                            alt={rest.business_name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
                          />
                        ) : (
                          <Store className="w-10 h-10 text-gray-400" />
                        )}
                      </div>

                      <div className="p-3">
                        <div className="font-black text-gray-900 text-sm truncate mb-1">{rest.business_name}</div>
                        <div className="text-xs text-gray-600 truncate font-semibold mb-2">
                          {rest.cuisine_types?.slice(0, 2).join(', ') || 'Restaurant'}
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1 font-bold">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            {rest.average_rating?.toFixed(1) || '4.5'}
                          </div>
                          <div className="flex items-center gap-1 font-bold text-gray-600">
                            <Clock className="w-3 h-3" />
                            {rest.estimated_prep_time || 30}m
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

        {/* Floating Cart Button (Mobile) (ENHANCED) */}
        {itemCount > 0 && (
          <div className="fixed bottom-4 left-4 right-4 md:hidden z-50 animate-in slide-in-from-bottom duration-500">
            <button
              onClick={() => router.push('/customer/cart')}
              className="w-full bg-gradient-to-r from-primary to-pink-500 text-white px-6 py-4 rounded-2xl hover:shadow-2xl font-black flex items-center justify-between shadow-2xl hover:scale-105 transition-all"
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-6 h-6" />
                <span>
                  {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </span>
              </div>
              <span className="flex items-center gap-1">
                View Cart <ChevronRight className="w-5 h-5" />
              </span>
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
