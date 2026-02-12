/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';

import DashboardLayout from '@/components/layouts/DashboardLayout';
import { restaurantService, type Restaurant, type MenuByCategory } from '@/services/restaurants';
import { useCart } from '@/contexts/CartContext';
import { type CartItem } from '@/services/cart';
import { getSafeImageSrc } from '@/lib/safeImage';
import { supabase } from '@/lib/supabase';
import { promoCodeService } from '@/services/promoCodes'; // <-- or whatever your real path is

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
  Tag,
  ArrowRight,
} from 'lucide-react';

import { toast } from 'react-toastify';

type MenuItem = any;
type SortKey = 'recommended' | 'price_low' | 'price_high';

/** ---- Promo / Offers types (loose to support your existing columns) ---- */
type PromoScope = 'global' | 'merchant' | 'targets' | string;
type DealType = 'cartdiscount' | 'bxgy' | string;

type PromoCodeRow = {
  id: string;
  code: string;
  description?: string | null;

  discounttype?: string | null;
  discountvalue?: number | null;
  minorderamount?: number | null;
  maxdiscountamount?: number | null;

  usagelimit?: number | null;
  usedcount?: number | null;

  isactive?: boolean | null;

  validfrom?: string | null;
  validuntil?: string | null;

  validdays?: any[] | null; // can be [1..7] or ["1"..]
  starttime?: string | null; // "HH:MM:SS"
  endtime?: string | null;

  scope?: PromoScope | null;
  merchantid?: string | null;

  // sometimes you store targets directly in promo row (optional)
  menuitemids?: any[] | null;
  categoryids?: any[] | null;

  dealtype?: DealType | null;
  dealjson?: any | null;

  autoapply?: boolean | null;
  priority?: number | null;
};

type BxgyTargetRow = {
  id: string;
  promocodeid: string;
  side: 'buy' | 'get' | string;
  menuitemid: string | null;
  categoryid: string | null;
  createdat?: string | null;
};

type OfferUI = {
  id: string;
  code: string;
  description: string;
  dealType: DealType;
  autoApply: boolean;
  priority: number;
  label: string;
  subLabel: string;
  buyItemIds: string[];
  getItemIds: string[];
  targetItemIds: string[]; // for "targets" promos
};

function clampNum(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function dayNumberMon1Sun7(d: Date) {
  const js = d.getDay(); // Sun0..Sat6
  return js === 0 ? 7 : js;
}

function timeToMinutes(t: string) {
  const [hh, mm] = String(t || '').split(':');
  return (Number(hh || 0) * 60) + Number(mm || 0);
}

function isNowWithinTimeWindow(now: Date, start: string | null | undefined, end: string | null | undefined) {
  if (!start && !end) return true;
  const cur = now.getHours() * 60 + now.getMinutes();
  const s = timeToMinutes(String(start || '00:00'));
  const e = timeToMinutes(String(end || '23:59'));
  if (s <= e) return cur >= s && cur <= e;
  // overnight window
  return cur >= s || cur <= e;
}

function normalizeValidDays(input: any): number[] {
  if (!input) return [];
  const arr = Array.isArray(input) ? input : [];
  return arr
    .map((x) => Number(String(x).trim()))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 7);
}

function safeText(v: any, fallback = '') {
  const s = String(v ?? '').trim();
  return s || fallback;
}

function moneyINR(n: any) {
  const v = Number(n ?? 0) || 0;
  try {
    return v.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  } catch {
    return `₹${Math.round(v)}`;
  }
}

function finalPrice(price: number, discount?: number) {
  const p = Number(price || 0);
  const d = Number(discount || 0);
  if (!d) return p;
  return p * (1 - d / 100);
}

function isPromoActiveNow(p: PromoCodeRow, now = new Date()) {
  if (p?.isactive === false) return false;

  // usage limit
  if (p?.usagelimit != null && p?.usedcount != null) {
    if (Number(p.usedcount) >= Number(p.usagelimit)) return false;
  }

  // valid from/until
  if (p?.validfrom) {
    const vf = new Date(p.validfrom);
    if (!Number.isNaN(vf.getTime()) && now < vf) return false;
  }
  if (p?.validuntil) {
    const vu = new Date(p.validuntil);
    if (!Number.isNaN(vu.getTime()) && now > vu) return false;
  }

  // valid days (Mon=1..Sun=7)
  const days = normalizeValidDays(p?.validdays);
  if (days.length > 0) {
    const today = dayNumberMon1Sun7(now);
    if (!days.includes(today)) return false;
  }

  // valid time window
  if (!isNowWithinTimeWindow(now, p?.starttime, p?.endtime)) return false;

  return true;
}

export default function RestaurantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToCart, itemCount } = useCart();

  const restaurantId = String((params as any)?.id || '');

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuByCategory, setMenuByCategory] = useState<MenuByCategory>({});
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('recommended');

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Offers state
  const [offersLoading, setOffersLoading] = useState(false);
  const [offers, setOffers] = useState<OfferUI[]>([]);
  const offersReqId = useRef(0);

  useEffect(() => {
    if (!restaurantId) return;
    loadRestaurantDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  // Refresh offers periodically (fix “sometimes shown sometimes not” around time windows)
  useEffect(() => {
    if (!restaurantId) return;
    const id = window.setInterval(() => {
      loadOffers();
    }, 60_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) return;
    // load offers once menu is available so we can show item names (and also show offers even if menu is empty)
    loadOffers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, Object.keys(menuByCategory || {}).length]);

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
      if (categories.length > 0) setExpandedCategories({ [categories[0]]: true });
    } catch (error) {
      console.error('Failed to load restaurant details:', error);
      toast.error('Failed to load restaurant details');
    } finally {
      setLoading(false);
    }
  };

  const allMenuItems = useMemo(() => {
    const out: MenuItem[] = [];
    Object.values(menuByCategory || {}).forEach((items) => {
      (items || []).forEach((it: any) => out.push(it));
    });
    return out;
  }, [menuByCategory]);

  const menuItemMap = useMemo(() => {
    const m = new Map<string, MenuItem>();
    allMenuItems.forEach((it: any) => {
      if (it?.id) m.set(String(it.id), it);
    });
    return m;
  }, [allMenuItems]);
const formatErr = (err: any) => {
  if (!err) return { message: 'Unknown error', raw: err };
  if (err instanceof Error) return { message: err.message, stack: err.stack };
  return {
    message: err?.message ?? String(err),
    code: err?.code,
    details: err?.details,
    hint: err?.hint,
    status: err?.status,
    raw: err,
  };
};

  const loadOffers = async () => {
    if (!restaurantId) return;

    const reqId = ++offersReqId.current;
    setOffersLoading(true);

    try {
      // 1) Fetch active promos for this merchant + global (merchantid is null)
      // NOTE: Using column names used in your existing promo service snippets: promocodes.merchantid, isactive, etc. [file:1]
      const { data: promoRows, error: promoErr } = await supabase
        .from('promo_codes')
.select('id,code,description,discount_type,discount_value,min_order_amount,max_discount_amount,usage_limit,used_count,is_active,valid_from,valid_until,valid_days,start_time,end_time,scope,merchant_id,deal_type,deal_json,auto_apply,priority')
.eq('is_active', true)
.or(`merchant_id.eq.${restaurantId},merchant_id.is.null`)


      if (promoErr) throw promoErr;

      const promos: PromoCodeRow[] = (promoRows as any[]) || [];
      const now = new Date();

      // 2) Client-side filter for date/day/time (more reliable, incl. overnight time windows) [file:1]
      const activePromos = promos.filter((p) => isPromoActiveNow(p, now));

      // 3) For BXGY offers, fetch targets (buy/get items)
      const bxgyIds = activePromos
        .filter((p) => String(p.dealtype || '').toLowerCase() === 'bxgy')
        .map((p) => p.id);

      let bxgyTargetsByPromo = new Map<string, BxgyTargetRow[]>();
      if (bxgyIds.length > 0) {
        const { data: targetRows, error: tErr } = await supabase
         .from('promo_bxgy_targets')
.select('id,promo_code_id,side,menu_item_id,category_id,created_at')
.in('promo_code_id', bxgyIds)


        if (tErr) throw tErr;

        const rows: BxgyTargetRow[] = (targetRows as any[]) || [];
        bxgyTargetsByPromo = rows.reduce((acc, r) => {
          const k = String(r.promocodeid);
          const prev = acc.get(k) || [];
          prev.push(r);
          acc.set(k, prev);
          return acc;
        }, new Map<string, BxgyTargetRow[]>());
      }

      const toOfferUI = (p: PromoCodeRow): OfferUI => {
        const dealType = String(p.dealtype || 'cartdiscount').toLowerCase() as DealType;
        const autoApply = !!p.autoapply || dealType === 'bxgy';
        const priority = clampNum(p.priority, 0);

        const code = safeText(p.code, 'OFFER');
        const description = safeText(p.description, '');

        const buyItemIds: string[] = [];
        const getItemIds: string[] = [];
        const targetItemIds: string[] = [];

        if (dealType === 'bxgy') {
          const targets = bxgyTargetsByPromo.get(String(p.id)) || [];
          targets.forEach((t) => {
            const side = String(t.side || '').toLowerCase();
            const mid = t.menuitemid ? String(t.menuitemid) : '';
            if (!mid) return;
            if (side === 'buy') buyItemIds.push(mid);
            if (side === 'get') getItemIds.push(mid);
          });
        } else if (String(p.scope || '').toLowerCase() === 'targets') {
          // optional: if you store menu targets directly in promo row
          const raw = Array.isArray(p.menuitemids) ? p.menuitemids : [];
          raw.forEach((x) => {
            const id = safeText(x);
            if (id) targetItemIds.push(id);
          });
        }

        // labels
        let label = '';
        let subLabel = '';

        if (dealType === 'bxgy') {
          const buyQty = Math.max(1, clampNum(p?.dealjson?.buy?.qty, 1));
          const getQty = Math.max(1, clampNum(p?.dealjson?.get?.qty, 1));
          const discType = safeText(p?.dealjson?.get?.discount?.type, 'free');
          label = `Buy ${buyQty} Get ${getQty} ${discType === 'free' ? 'Free' : 'Off'}`;

          const buyName = buyItemIds[0] ? safeText(menuItemMap.get(buyItemIds[0])?.name, '') : '';
          const getName = getItemIds[0] ? safeText(menuItemMap.get(getItemIds[0])?.name, '') : '';
          subLabel = [buyName ? `Buy: ${buyName}` : '', getName ? `Get: ${getName}` : ''].filter(Boolean).join(' • ');
          if (!subLabel) subLabel = 'Auto-applies when eligible items are in your cart';
        } else {
          const dtype = safeText(p.discounttype, '').toLowerCase();
          const dval = clampNum(p.discountvalue, 0);

          if (dtype === 'percentage') label = `${dval}% OFF`;
          else if (dtype === 'fixed') label = `${moneyINR(dval)} OFF`;
          else label = 'Special offer';

          const min = p.minorderamount != null ? clampNum(p.minorderamount, 0) : 0;
          const max = p.maxdiscountamount != null ? clampNum(p.maxdiscountamount, 0) : 0;

          const parts: string[] = [];
          if (min > 0) parts.push(`Min ${moneyINR(min)}`);
          if (max > 0 && dtype === 'percentage') parts.push(`Max ${moneyINR(max)}`);
          parts.push(`Code: ${code}`);

          subLabel = parts.join(' • ');
        }

        return {
          id: String(p.id),
          code,
          description,
          dealType,
          autoApply,
          priority,
          label,
          subLabel,
          buyItemIds,
          getItemIds,
          targetItemIds,
        };
      };

      const ui = activePromos
        .map(toOfferUI)
        .sort((a, b) => (b.priority - a.priority) || (a.autoApply === b.autoApply ? 0 : a.autoApply ? -1 : 1));

      if (reqId !== offersReqId.current) return;
      setOffers(ui);
   } catch (e: any) {
  console.error('Failed to load offers:', formatErr(e));
  if (reqId === offersReqId.current) setOffers([]);
}
 finally {
      if (reqId === offersReqId.current) setOffersLoading(false);
    }
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
      category_id: item.category_id ?? null,
      menu_item_id: item.id, // helpful for item-targeted offers
    };

    const success = addToCart(cartItem, restaurant?.business_name || 'Restaurant');
    if (!success) {
      toast.error('You have items from another restaurant. Please clear your cart first.', {
        position: 'top-center',
        autoClose: 3000,
      });
      return;
    }

    toast.success(`${item.name} added to cart!`, { position: 'bottom-center', autoClose: 1600 });
    setQuantities((prev) => ({ ...prev, [item.id]: 1 }));
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

  const scrollToItem = (itemId: string) => {
    // Find item category and scroll to that category container (simple + reliable)
    const entries = Object.entries(menuByCategory || {});
    for (const [cat, items] of entries) {
      if ((items || []).some((it: any) => String(it?.id) === String(itemId))) {
        scrollToCategory(cat);
        // after expand, best-effort scroll to item by querySelector
        window.setTimeout(() => {
          const el = document.querySelector(`[data-menu-item-id="${String(itemId)}"]`);
          if (el) (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 200);
        return;
      }
    }
  };

  const handleUseOffer = async (o: OfferUI) => {
    // BXGY is auto; best UX is to take user to eligible items (buy/get) or cart
    if (o.dealType === 'bxgy') {
      const focusId = o.buyItemIds[0] || o.getItemIds[0];
      if (focusId) {
        toast.info('Showing items for this offer', { autoClose: 1200 });
        scrollToItem(focusId);
        return;
      }
      router.push('/customer/cart');
      return;
    }

    // Coupon-like offer: store in sessionStorage for cart page to read (optional),
    // and also copy to clipboard.
    try {
      sessionStorage.setItem('promoCodePrefill', o.code);
    } catch {}

    try {
      await navigator.clipboard.writeText(o.code);
      toast.success(`Copied code: ${o.code}`, { autoClose: 1500 });
    } catch {
      toast.info(`Code: ${o.code}`, { autoClose: 2000 });
    }

    router.push('/customer/cart');
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
            String(it.name || '').toLowerCase().includes(q) ||
            String(it.description || '').toLowerCase().includes(q)
        );
      }

      if (sortKey === 'price_low') {
        list = [...list].sort((a, b) => finalPrice(a.price, a.discount_percentage) - finalPrice(b.price, b.discount_percentage));
      } else if (sortKey === 'price_high') {
        list = [...list].sort((a, b) => finalPrice(b.price, b.discount_percentage) - finalPrice(a.price, a.discount_percentage));
      }

      if (list.length > 0) (acc as any)[category] = list;
      return acc;
    }, {} as MenuByCategory);

    return out;
  }, [menuByCategory, searchQuery, vegOnly, sortKey]);

  const totalShownItems = useMemo(() => {
    return Object.values(filteredMenu).reduce((sum, items) => sum + (items?.length || 0), 0);
  }, [filteredMenu]);

  // quick lookups to show “Offer” tag on items
  const offerTagsByItemId = useMemo(() => {
    const map = new Map<string, OfferUI[]>();

    offers.forEach((o) => {
      const ids = new Set<string>([...o.buyItemIds, ...o.getItemIds, ...o.targetItemIds].filter(Boolean));
      ids.forEach((id) => {
        const prev = map.get(id) || [];
        prev.push(o);
        map.set(id, prev);
      });
    });

    return map;
  }, [offers]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-64 bg-gray-200 rounded-2xl" />
            <div className="h-32 bg-gray-200 rounded-xl" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 rounded-xl" />
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
            className="bg-primary text-white px-6 py-3 rounded-xl hover:bg-orange-600"
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
      <div className="min-h-screen bg-gray-50">
        {/* Header Banner */}
        <div className="relative h-64 md:h-80 bg-gradient-to-br from-orange-400 to-pink-500">
          {bannerSrc ? (
            <Image src={bannerSrc} alt={restaurant.business_name} fill className="object-cover" priority />
          ) : (
            <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_20%_20%,white,transparent_35%),radial-gradient(circle_at_80%_30%,white,transparent_35%),radial-gradient(circle_at_50%_80%,white,transparent_40%)]" />
          )}

          <div className="absolute inset-0 bg-black/40" />

          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm p-2 rounded-full hover:bg-white transition-all shadow-lg z-10"
            aria-label="Go back"
          >
            <ArrowLeft className="w-6 h-6 text-gray-900" />
          </button>

          {/* Cart Button */}
          {itemCount > 0 && (
            <button
              onClick={() => router.push('/customer/cart')}
              className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-full hover:bg-white transition-all shadow-lg z-10"
              aria-label="Open cart"
            >
              <ShoppingCart className="w-6 h-6 text-primary" />
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                {itemCount}
              </span>
            </button>
          )}

          {/* Restaurant Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6 bg-gradient-to-t from-black/80 to-transparent">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-white flex-shrink-0">
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

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h1 className="text-2xl md:text-4xl font-extrabold text-white mb-1 truncate">
                        {restaurant.business_name}
                      </h1>

                      <div className="flex flex-wrap gap-2 mb-3">
                        {restaurant.cuisine_types?.slice(0, 6)?.map((cuisine, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold rounded-full"
                          >
                            {cuisine}
                          </span>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-4 text-white text-sm">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-bold">{restaurant.average_rating?.toFixed(1) || '4.5'}</span>
                          <span className="text-white/80">({restaurant.total_reviews || 0})</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{restaurant.estimated_prep_time || 30} mins</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <IndianRupee className="w-4 h-4" />
                          <span>Min ₹{restaurant.min_order_amount || 0}</span>
                        </div>
                      </div>
                    </div>

                    <div className="hidden md:flex flex-col gap-2 items-end">
                      <button
                        onClick={() => router.push(`/customer/restaurant/${restaurantId}/menu`)}
                        className="px-4 py-2 rounded-full bg-white text-gray-900 font-extrabold hover:bg-gray-100 transition shadow"
                      >
                        View full menu
                      </button>
                      <div className="text-white/80 text-xs font-semibold">{totalShownItems} items shown</div>
                    </div>
                  </div>

                  {/* Mobile actions */}
                  <div className="mt-3 md:hidden flex gap-2">
                    <button
                      onClick={() => router.push(`/customer/restaurant/${restaurantId}/menu`)}
                      className="flex-1 px-4 py-2 rounded-xl bg-white text-gray-900 font-extrabold hover:bg-gray-100 transition shadow"
                    >
                      View full menu
                    </button>
                    {itemCount > 0 && (
                      <button
                        onClick={() => router.push('/customer/cart')}
                        className="px-4 py-2 rounded-xl bg-primary text-white font-extrabold hover:bg-orange-600 transition shadow"
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
        <div className="max-w-7xl mx-auto px-4 py-6 pb-28 md:pb-8">
          {/* Restaurant Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {restaurant.phone && (
              <div className="bg-white rounded-2xl shadow p-4 flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Phone className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-600">Contact</p>
                  <p className="font-semibold text-gray-900 truncate">{restaurant.phone}</p>
                </div>
              </div>
            )}

            {restaurant.email && (
              <div className="bg-white rounded-2xl shadow p-4 flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-600">Email</p>
                  <p className="font-semibold text-gray-900 truncate">{restaurant.email}</p>
                </div>
              </div>
            )}

            {restaurant.address && (
              <div className="bg-white rounded-2xl shadow p-4 flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-600">Address</p>
                  <p className="font-semibold text-gray-900 line-clamp-2 text-sm">{restaurant.address}</p>
                </div>
              </div>
            )}
          </div>

          {/* OFFERS */}
          <div className="bg-white rounded-2xl shadow p-5 md:p-6 mb-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-extrabold text-gray-900">Offers</h2>
                {offersLoading ? (
                  <span className="text-xs font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-600">Loading…</span>
                ) : offers.length > 0 ? (
                  <span className="text-xs font-bold px-2 py-1 rounded-full bg-primary/10 text-primary">
                    {offers.length} available
                  </span>
                ) : (
                  <span className="text-xs font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-600">No offers</span>
                )}
              </div>

              <button
                type="button"
                onClick={() => router.push('/customer/cart')}
                className="text-sm font-extrabold text-primary hover:underline inline-flex items-center gap-1"
              >
                Cart <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {offers.length > 0 && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {offers.slice(0, 6).map((o) => (
                  <div key={o.id} className="border rounded-2xl p-4 hover:bg-gray-50 transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-extrabold">
                            {o.label}
                          </span>
                          {o.autoApply ? (
                            <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-extrabold">
                              Auto
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-extrabold">
                              Code
                            </span>
                          )}
                        </div>

                        <p className="mt-2 text-sm font-bold text-gray-900 truncate">{o.subLabel}</p>
                        {o.description && <p className="mt-1 text-xs text-gray-600 line-clamp-2">{o.description}</p>}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleUseOffer(o)}
                        className="shrink-0 px-4 py-2 rounded-xl bg-primary text-white font-extrabold hover:bg-orange-600"
                      >
                        {o.dealType === 'bxgy' ? 'View' : 'Use'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {offers.length > 6 && (
              <div className="mt-3 text-xs text-gray-500 font-semibold">
                Showing top 6 offers (priority-based).
              </div>
            )}
          </div>

          {/* Description */}
          {restaurant.description && (
            <div className="bg-white rounded-2xl shadow p-6 mb-6">
              <h2 className="text-lg font-extrabold text-gray-900 mb-2">About</h2>
              <p className="text-gray-700 leading-relaxed">{restaurant.description}</p>
            </div>
          )}

          {/* Controls row */}
          <div className="bg-white rounded-2xl shadow p-4 mb-4">
            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search menu items..."
                  className="w-full pl-10 pr-10 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                  className={`px-3 py-3 rounded-xl border-2 font-bold inline-flex items-center gap-2 transition ${
                    vegOnly ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Leaf className="w-5 h-5" />
                  Veg
                </button>

                <div className="relative">
                  <div className="px-3 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-700 font-bold inline-flex items-center gap-2">
                    <SlidersHorizontal className="w-5 h-5" />
                    <select
                      value={sortKey}
                      onChange={(e) => setSortKey(e.target.value as SortKey)}
                      className="bg-transparent outline-none"
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

          {/* Category chips */}
          {categories.length > 0 && (
            <div className="mb-4">
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => scrollToCategory(cat)}
                    className="whitespace-nowrap px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm hover:shadow font-bold text-gray-800"
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
              <div className="bg-white rounded-2xl shadow p-16 text-center">
                <p className="text-gray-600 text-lg font-semibold">No menu items found</p>
              </div>
            ) : (
              Object.entries(filteredMenu).map(([category, items]) => (
                <div
                  key={category}
                  ref={(el) => {
                    categoryRefs.current[category] = el;
                  }}
                  className="bg-white rounded-2xl shadow overflow-hidden"
                >
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full px-5 md:px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <h2 className="text-lg md:text-xl font-extrabold text-gray-900 truncate">{category}</h2>
                      <span className="px-3 py-1 bg-primary/10 text-primary text-xs md:text-sm font-extrabold rounded-full">
                        {items.length} items
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
                      {(items as MenuItem[]).map((item) => {
                        const itemQuantity = quantities[item.id] || 1;
                        const discountedPrice = finalPrice(item.price, item.discount_percentage);
                        const hasDiscount = Number(item.discount_percentage || 0) > 0;
                        const itemImgSrc = getSafeImageSrc(item.image_url);

                        const offerTags = offerTagsByItemId.get(String(item.id)) || [];

                        return (
                          <div
                            key={item.id}
                            data-menu-item-id={String(item.id)}
                            className="p-4 md:p-6 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex gap-4">
                              {/* Item Image */}
                              <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-200">
                                {itemImgSrc ? (
                                  <Image
                                    src={itemImgSrc}
                                    alt={item.name}
                                    fill
                                    sizes="128px"
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                    <ImageIcon className="w-7 h-7" />
                                  </div>
                                )}

                                {hasDiscount && (
                                  <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-extrabold px-2 py-1 rounded-full">
                                    {item.discount_percentage}% OFF
                                  </div>
                                )}
                              </div>

                              {/* Item Details */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
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

                                      <h3 className="font-extrabold text-gray-900 text-base md:text-lg truncate">
                                        {item.name}
                                      </h3>

                                      {offerTags.slice(0, 2).map((o) => (
                                        <span
                                          key={o.id}
                                          className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-extrabold"
                                          title={o.subLabel}
                                        >
                                          Offer
                                        </span>
                                      ))}
                                    </div>

                                    {item.description && (
                                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">{item.description}</p>
                                    )}

                                    <div className="flex items-center gap-2">
                                      {hasDiscount && (
                                        <span className="text-sm text-gray-400 line-through">₹{item.price}</span>
                                      )}
                                      <span className="text-lg font-extrabold text-gray-900">
                                        ₹{discountedPrice.toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Quantity & Add to Cart */}
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-4">
                                  <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1 w-fit">
                                    <button
                                      onClick={() => updateQuantity(item.id, -1)}
                                      className="w-9 h-9 flex items-center justify-center hover:bg-white rounded-lg transition-colors disabled:opacity-40"
                                      disabled={itemQuantity <= 1}
                                      aria-label="Decrease quantity"
                                    >
                                      <Minus className="w-4 h-4 text-gray-700" />
                                    </button>
                                    <span className="w-10 text-center font-extrabold text-gray-900">
                                      {itemQuantity}
                                    </span>
                                    <button
                                      onClick={() => updateQuantity(item.id, 1)}
                                      className="w-9 h-9 flex items-center justify-center hover:bg-white rounded-lg transition-colors disabled:opacity-40"
                                      disabled={itemQuantity >= 10}
                                      aria-label="Increase quantity"
                                    >
                                      <Plus className="w-4 h-4 text-gray-700" />
                                    </button>
                                  </div>

                                  <button
                                    onClick={() => handleAddToCart(item)}
                                    className="sm:flex-1 bg-primary text-white px-6 py-3 rounded-xl hover:bg-orange-600 font-extrabold flex items-center justify-center gap-2 transition-colors"
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
        </div>

        {/* Floating Cart Button (Mobile) */}
        {itemCount > 0 && (
          <div className="fixed bottom-4 left-4 right-4 md:hidden z-50">
            <button
              onClick={() => router.push('/customer/cart')}
              className="w-full bg-primary text-white px-6 py-4 rounded-2xl hover:bg-orange-600 font-extrabold flex items-center justify-between shadow-2xl"
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-6 h-6" />
                <span>
                  {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </span>
              </div>
              <span>View Cart →</span>
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
function formatErr(e: any): any {
  throw new Error('Function not implemented.');
}

