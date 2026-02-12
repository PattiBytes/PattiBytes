/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { cartService } from '@/services/cart';
import { deliveryFeeService } from '@/services/deliveryFee';
import { promoCodeService, type PromoCode } from '@/services/promoCodes';
import { locationService } from '@/services/location';

import DashboardLayout from '@/components/layouts/DashboardLayout';

import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  Store,
  AlertCircle,
  Loader2,
  Tag,
  IndianRupee,
  MapPin,
  X,
  Check,
} from 'lucide-react';
import { toast } from 'react-toastify';

type MerchantTaxMini = {
  id: string;
  gstenabled: boolean | null;
  gstpercentage: number | null;
};

type MerchantGeoMini = {
  id: string;
  latitude: number | null;
  longitude: number | null;
};

type OfferLine = {
  menuItemId: string;
  name: string;
  qty: number;
  label?: string; // e.g. "FREE"
};

type AutoAppliedOffer = {
  promo: PromoCode | null;
  discount: number; // money saved
  lines: OfferLine[]; // virtual free items (₹0 in summary)
  message?: string;
};

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(v: any) {
  return typeof v === 'string' && uuidRegex.test(v);
}

function clampNum(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function calculateDiscountedUnitPrice(price: number, discountPct?: number | null) {
  const p = clampNum(price, 0);
  const d = clampNum(discountPct ?? 0, 0);
  if (d <= 0) return p;
  return p * (1 - d / 100);
}

function cartItemMenuItemId(item: any): string {
  return String(item?.menu_item_id ?? item?.menuitemid ?? item?.id ?? '').trim();
}

function cartItemCategoryId(item: any): string | null {
  const v = item?.category_id ?? item?.categoryid ?? null;
  return v ? String(v) : null;
}

export default function CartPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { cart, updateQuantity, removeFromCart, clearCart } = useCart();

  // Normalize merchant id/name across mixed shapes (merchant_id vs merchantid)
  const merchantId: string | null =
    (cart as any)?.merchant_id ?? (cart as any)?.merchantid ?? (cart as any)?.merchantId ?? null;

  const merchantName: string =
    (cart as any)?.merchant_name ??
    (cart as any)?.merchantname ??
    (cart as any)?.merchantName ??
    'Restaurant';

  const [validating, setValidating] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);

  const [deliveryFee, setDeliveryFee] = useState(0);
  const [deliveryDistance, setDeliveryDistance] = useState(0);
  const [deliveryBreakdown, setDeliveryBreakdown] = useState('');
  const [showDeliveryFee, setShowDeliveryFee] = useState(true);

  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [showPromoList, setShowPromoList] = useState(false);
  const [availablePromos, setAvailablePromos] = useState<PromoCode[]>([]);

  const [merchantGeo, setMerchantGeo] = useState<MerchantGeoMini | null>(null);
  const [merchantTax, setMerchantTax] = useState<MerchantTaxMini | null>(null);

  // Auto-applied offer (best)
  const [autoApplied, setAutoApplied] = useState<AutoAppliedOffer>({
    promo: null,
    discount: 0,
    lines: [],
    message: '',
  });

  // ---------- Merchant geo ----------
  useEffect(() => {
    async function loadMerchantGeo() {
      if (!merchantId) {
        setMerchantGeo(null);
        return;
      }

      const { data, error } = await supabase
        .from('merchants')
        .select('id, latitude, longitude')
        .eq('id', merchantId)
        .maybeSingle();

      if (error) {
        console.error('Failed to load merchant geo:', error);
        setMerchantGeo(null);
        return;
      }

      setMerchantGeo((data as MerchantGeoMini) ?? null);
    }

    loadMerchantGeo();
  }, [merchantId]);

  // ---------- Merchant GST ----------
  useEffect(() => {
    async function loadMerchantTax() {
      if (!merchantId) {
        setMerchantTax(null);
        return;
      }

      const { data, error } = await supabase
        .from('merchants')
        .select('id, gstenabled:gst_enabled, gstpercentage:gst_percentage')
        .eq('id', merchantId)
        .maybeSingle();

      if (error) {
        console.error('Failed to load merchant tax config:', error);
        setMerchantTax(null);
        return;
      }

      setMerchantTax((data as MerchantTaxMini) ?? null);
    }

    loadMerchantTax();
  }, [merchantId]);

  // ---------- Loads ----------
  const loadAvailablePromos = async () => {
  try {
    if (!merchantId) return setAvailablePromos([]);
    const promos = await promoCodeService.getActivePromoCodes({ merchantId });
    setAvailablePromos(promos);
  } catch (error) {
    console.error('Failed to load promo codes', error);
  }
};


  const loadDeliveryFee = async () => {
    try {
      if (!user?.id) return;

      await deliveryFeeService.loadConfig();

      const addresses = await locationService.getSavedAddresses(user.id);
      const addr = addresses?.find((a) => a.isdefault) ?? addresses?.[0] ?? null;

      if (!addr?.latitude || !addr?.longitude) {
        setDeliveryFee(0);
        setDeliveryDistance(0);
        setDeliveryBreakdown('No delivery address found');
        setShowDeliveryFee(true);
        return;
      }

      const mLat = Number(merchantGeo?.latitude);
      const mLon = Number(merchantGeo?.longitude);
      const aLat = Number(addr.latitude);
      const aLon = Number(addr.longitude);

      if (![mLat, mLon, aLat, aLon].every(Number.isFinite)) {
        setDeliveryFee(0);
        setDeliveryDistance(0);
        setDeliveryBreakdown('Merchant location missing');
        setShowDeliveryFee(true);
        return;
      }

      const quote = await deliveryFeeService.quoteFromCoords({
        merchantLat: mLat,
        merchantLon: mLon,
        customerLat: aLat,
        customerLon: aLon,
      });

      setDeliveryFee(quote.fee);
      setDeliveryDistance(quote.distanceKm);
      setDeliveryBreakdown(quote.breakdown);
      setShowDeliveryFee(quote.showToCustomer);
    } catch (error: any) {
      console.error('Failed to calculate delivery fee:', error);
      setDeliveryFee(0);
      setDeliveryDistance(0);
      setDeliveryBreakdown(error?.message || 'Delivery fee failed');
      setShowDeliveryFee(true);
    }
  };

  // Auth gate + initial loads
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadAvailablePromos();
    // delivery fee loads in geo watcher below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router, merchantId]);

  // Recalculate delivery fee when merchant geo is ready
  useEffect(() => {
    if (!user?.id) return;
    if (!merchantId) return;
    if (!merchantGeo?.latitude || !merchantGeo?.longitude) return;

    loadDeliveryFee();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, merchantId, merchantGeo?.latitude, merchantGeo?.longitude]);

  // ---------- Promo apply/remove (manual coupons only) ----------
  const cartItemsForPromo = useMemo(() => {
    return (cart?.items ?? []).map((i: any) => ({
      menu_item_id: i.menu_item_id ?? i.menuitemid ?? i.id,
      merchant_id: merchantId,
      category_id: i.category_id ?? i.categoryid ?? null,
      qty: i.quantity,
      unit_price: i.price,
    }));
  }, [cart?.items, merchantId]);

  const handleApplyPromo = async (code?: string, opts?: { silent?: boolean }) => {
    const codeToApply = (code || promoCode).trim();
    if (!codeToApply || !cart || !user?.id || !merchantId) return;

    setApplyingPromo(true);
    try {
      const result = await promoCodeService.validatePromoCode(codeToApply, cart.subtotal, user.id, {
        merchantId,
        cartItems: cartItemsForPromo as any,
      });

      if (result.valid && result.promoCode) {
        setAppliedPromo(result.promoCode as any);
        setPromoDiscount(result.discount);
        setPromoCode('');
        setShowPromoList(false);
        // Manual promo overrides auto offer
        setAutoApplied({ promo: null, discount: 0, lines: [], message: '' });
        if (!opts?.silent) toast.success(result.message);
      } else {
        setAppliedPromo(null);
        setPromoDiscount(0);
        if (!opts?.silent) toast.error(result.message);
      }
    } catch (error) {
      console.error('Promo code error:', error);
      if (!opts?.silent) toast.error('Failed to apply promo code');
    } finally {
      setApplyingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoDiscount(0);
    toast.info('Promo code removed');
  };

  // Revalidate applied promo if subtotal changes
  useEffect(() => {
    if (!appliedPromo?.code || !cart?.subtotal || !user?.id) return;
    handleApplyPromo(appliedPromo.code, { silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart?.subtotal, user?.id]);

  // ---------- Auto-apply best offer (BXGY + auto coupons) ----------
  useEffect(() => {
    if (!user?.id || !merchantId || !cart?.subtotal) {
      setAutoApplied({ promo: null, discount: 0, lines: [], message: '' });
      return;
    }
    if (appliedPromo?.code) return;

    let cancelled = false;

    async function computeBestAuto() {
      try {
        const promos = await promoCodeService.getActivePromoCodes({ merchantId });
        const autos = (promos || []).filter((p: any) => !!p.auto_apply);

        let best: AutoAppliedOffer = { promo: null, discount: 0, lines: [], message: '' };

        for (const p of autos as any[]) {
          const dealType = String(p?.deal_type ?? 'cart_discount');

          // Auto coupon-like
          if (dealType !== 'bxgy') {
            const v = await promoCodeService.validatePromoCode(
              p.code,
              cart.subtotal,
              user.id,
              { merchantId, cartItems: cartItemsForPromo as any }
            );
            if (v.valid && v.discount > best.discount) {
              best = { promo: p, discount: v.discount, lines: [], message: v.message };
            }
            continue;
          }

          // BXGY auto-offer: compute “virtual free lines” even if user didn’t add the free item
          const deal = p?.deal_json || {};
          const buyQty = Math.max(1, clampNum(deal?.buy?.qty, 1));
          const getQty = Math.max(1, clampNum(deal?.get?.qty, 1));
          const maxSets = Math.max(1, clampNum(deal?.max_sets_per_order, 1));

          const disc = deal?.get?.discount || { type: 'free', value: 100 };
          const discType = String(disc?.type || 'free'); // free | percentage | fixed
          const discValue = clampNum(disc?.value, 100);

          const bxgyTargets = await promoCodeService.getBxgyTargets(p.id);
          const buyTargets = (bxgyTargets || []).filter((t: any) => t.side === 'buy');
          const getTargets = (bxgyTargets || []).filter((t: any) => t.side === 'get');

          if (buyTargets.length === 0 || getTargets.length === 0) continue;

          const buyMenu = new Set(
            buyTargets
              .map((t: any) => t.menu_item_id)
              .filter((x: any) => isUuid(x))
              .map(String)
          );
          const buyCat = new Set(
            buyTargets
              .map((t: any) => t.category_id)
              .filter((x: any) => !!x)
              .map(String)
          );

          const getMenuIds = Array.from(
            new Set(
              getTargets
                .map((t: any) => t.menu_item_id)
                .filter((x: any) => isUuid(x))
                .map(String)
            )
          );

          // Count how many “buy” items are in cart
          const buyCount = (cart?.items ?? []).reduce((acc: number, it: any) => {
            const mid = cartItemMenuItemId(it);
            const cid = cartItemCategoryId(it);
            const hit =
              (buyMenu.size > 0 && buyMenu.has(mid)) ||
              (buyCat.size > 0 && !!cid && buyCat.has(cid));
            return acc + (hit ? clampNum(it.quantity, 0) : 0);
          }, 0);

          const possibleSets = Math.min(Math.floor(buyCount / buyQty), maxSets);
          if (possibleSets <= 0) continue;

          // Pick “get” item: cheapest among configured get menu items (repeat if needed)
          if (getMenuIds.length === 0) continue;

          const getItems = await promoCodeService.getMenuItemsByIds(getMenuIds);
          if (!Array.isArray(getItems) || getItems.length === 0) continue;

          const sortedByPrice = [...getItems].sort((a: any, b: any) => {
            const ap = calculateDiscountedUnitPrice(a.price, a.discount_percentage);
            const bp = calculateDiscountedUnitPrice(b.price, b.discount_percentage);
            return ap - bp;
          });

          const chosen = sortedByPrice[0];
          const chosenUnit = calculateDiscountedUnitPrice(chosen.price, chosen.discount_percentage);

          const totalFreeQty = possibleSets * getQty;

          let discount = 0;
          for (let i = 0; i < totalFreeQty; i++) {
            if (discType === 'free') discount += chosenUnit;
            else if (discType === 'percentage') discount += (chosenUnit * discValue) / 100;
            else discount += Math.min(chosenUnit, discValue); // fixed off
          }
          discount = Math.max(0, Math.round(discount * 100) / 100);

          const lines: OfferLine[] = [
            {
              menuItemId: String(chosen.id),
              name: String(chosen.name || 'Free item'),
              qty: totalFreeQty,
              label: discType === 'free' ? 'FREE' : 'OFFER',
            },
          ];

          if (discount > best.discount) {
            best = {
              promo: p,
              discount,
              lines,
              message: `Offer applied! You saved ₹${discount.toFixed(2)}`,
            };
          }
        }

        if (cancelled) return;
        setAutoApplied(best);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        if (cancelled) return;
        setAutoApplied({ promo: null, discount: 0, lines: [], message: '' });
      }
    }

    computeBestAuto();

    return () => {
      cancelled = true;
    };
  }, [
    user?.id,
    merchantId,
    cart?.subtotal,
    appliedPromo?.code,
    cartItemsForPromo,
    cart?.items,
  ]);

  // ---------- Cart actions ----------
  const handleUpdateQuantity = (itemId: string, currentQuantity: number, delta: number) => {
    const newQuantity = currentQuantity + delta;
    if (newQuantity < 1 || newQuantity > 10) return;
    updateQuantity(itemId, newQuantity);
  };

  const handleRemoveItem = (itemId: string, itemName: string) => {
    removeFromCart(itemId);
    toast.success(`${itemName} removed from cart`);
  };

  const handleClearCart = () => {
    clearCart();
    setShowClearModal(false);
    setAppliedPromo(null);
    setPromoDiscount(0);
    setAutoApplied({ promo: null, discount: 0, lines: [], message: '' });
    toast.success('Cart cleared');
  };

  const calculateItemPrice = (price: number, discount?: number) => {
    if (!discount) return price;
    return price * (1 - discount / 100);
  };

  // ---------- Effective discount (manual promo wins) ----------
  const effectiveDiscount = appliedPromo?.code ? promoDiscount : autoApplied.discount;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const effectiveCode = appliedPromo?.code ? appliedPromo.code : autoApplied.promo?.code || null;

  // ---------- Totals ----------
  const taxableBase = useMemo(() => {
    const subtotal = cart?.subtotal ?? 0;
    return Math.max(0, subtotal - effectiveDiscount);
  }, [cart?.subtotal, effectiveDiscount]);

  const gstEnabled = !!merchantTax?.gstenabled;
  const gstPct = Number(merchantTax?.gstpercentage ?? 0);

  const tax = useMemo(() => {
    if (!gstEnabled) return 0;
    if (!Number.isFinite(gstPct) || gstPct <= 0) return 0;
    return taxableBase * (gstPct / 100);
  }, [gstEnabled, gstPct, taxableBase]);

  const finalTotal = useMemo(() => {
    return taxableBase + deliveryFee + tax;
  }, [taxableBase, deliveryFee, tax]);

 const handleCheckout = async () => {
  if (!cart || cart.items.length === 0) return;
  setValidating(true);

  try {
    const validation = await cartService.validateCart();
    if (!validation.valid) {
      toast.error(validation.message || 'Cart validation failed');
      return;
    }

    const checkoutPayload = {
      cart: {
        merchant_id: merchantId,
        merchant_name: merchantName,
        items: cart.items,
        subtotal: cart.subtotal,
      },
      promoCode: appliedPromo?.code ?? null,
      promoDiscount,
    };

    sessionStorage.setItem('checkoutdata', JSON.stringify(checkoutPayload));
    router.push('/customer/checkout');
  } catch (error) {
    console.error('Checkout error', error);
    toast.error('Failed to proceed to checkout');
  } finally {
    setValidating(false);
  }
};


  // ---------- Empty cart ----------
  if (!cart || cart.items.length === 0) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Your Cart</h1>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-16 text-center">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShoppingCart className="w-12 h-12 text-gray-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
              <p className="text-gray-600 mb-8">Add items from restaurants to get started</p>
              <button
                onClick={() => router.push('/customer/dashboard')}
                className="bg-primary text-white px-8 py-3 rounded-xl hover:bg-orange-600 font-semibold transition-colors"
              >
                Browse Restaurants
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const itemDiscountSavings = cart.items.reduce((total: number, item: any) => {
    if (item.discount_percentage) {
      const savings = ((item.price * item.discount_percentage) / 100) * item.quantity;
      return total + savings;
    }
    return total;
  }, 0);

  const totalSavings = itemDiscountSavings + effectiveDiscount;

  const showAutoAppliedBanner =
    !appliedPromo?.code && autoApplied?.promo?.code && autoApplied.discount > 0;

  // Only show “click to apply” list for non-BXGY deals (BXGY is auto)
  const couponLikePromos = (availablePromos || []).filter((p: any) => String(p?.deal_type ?? 'cart_discount') !== 'bxgy');

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 pb-32 md:pb-8">
        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Your Cart</h1>
                <p className="text-sm text-gray-600">{cart.items.length} items</p>
              </div>
            </div>

            <button
              onClick={() => setShowClearModal(true)}
              className="text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Clear Cart</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {/* Restaurant Info */}
              <div className="bg-white rounded-xl shadow-md p-4 flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Store className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Ordering from</p>
                  <h2 className="font-bold text-gray-900">{merchantName}</h2>
                </div>
              </div>

              {/* Cart Items List (NO IMAGES) */}
              <div className="bg-white rounded-xl shadow-md divide-y">
                {cart.items.map((item: any) => {
                  const itemPrice = calculateItemPrice(item.price, item.discount_percentage);
                  const totalItemPrice = itemPrice * item.quantity;
                  const hasDiscount = item.discount_percentage && item.discount_percentage > 0;

                  return (
                    <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {item.is_veg !== undefined && (
                                  <div
                                    className={`w-4 h-4 border-2 ${
                                      item.is_veg ? 'border-green-600' : 'border-red-600'
                                    } flex items-center justify-center flex-shrink-0`}
                                  >
                                    <div
                                      className={`w-2 h-2 rounded-full ${
                                        item.is_veg ? 'bg-green-600' : 'bg-red-600'
                                      }`}
                                    />
                                  </div>
                                )}
                                <h3 className="font-bold text-gray-900 text-sm md:text-base truncate">
                                  {item.name}
                                </h3>
                              </div>
                              {item.category && <p className="text-xs text-gray-500 mb-1">{item.category}</p>}
                            </div>

                            <button
                              onClick={() => handleRemoveItem(item.id, item.name)}
                              className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors flex-shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="flex items-center justify-between gap-4">
                            <div>
                              {hasDiscount ? (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm text-gray-400 line-through">₹{item.price.toFixed(2)}</span>
                                  <span className="font-bold text-gray-900">₹{itemPrice.toFixed(2)}</span>
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                                    {item.discount_percentage}% OFF
                                  </span>
                                </div>
                              ) : (
                                <span className="font-bold text-gray-900">₹{item.price.toFixed(2)}</span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                              <button
                                onClick={() => handleUpdateQuantity(item.id, item.quantity, -1)}
                                disabled={item.quantity <= 1}
                                className="w-8 h-8 flex items-center justify-center hover:bg-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Minus className="w-4 h-4 text-gray-700" />
                              </button>
                              <span className="w-8 text-center font-bold text-gray-900">{item.quantity}</span>
                              <button
                                onClick={() => handleUpdateQuantity(item.id, item.quantity, 1)}
                                disabled={item.quantity >= 10}
                                className="w-8 h-8 flex items-center justify-center hover:bg-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Plus className="w-4 h-4 text-gray-700" />
                              </button>
                            </div>
                          </div>

                          <div className="mt-2 text-right">
                            <p className="text-sm text-gray-600">
                              Total:{' '}
                              <span className="font-bold text-gray-900">₹{totalItemPrice.toFixed(2)}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => merchantId && router.push(`/customer/restaurant/${merchantId}`)}
                className="w-full bg-white border-2 border-dashed border-gray-300 rounded-xl p-4 hover:border-primary hover:bg-orange-50 transition-colors text-primary font-semibold"
                disabled={!merchantId}
              >
                + Add more items from {merchantName}
              </button>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6 space-y-4">
                <h2 className="text-xl font-bold text-gray-900">Bill Summary</h2>

                {/* Offers / Promo Section */}
                <div className="border-b pb-4 space-y-3">
                  {appliedPromo ? (
                    <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Check className="w-5 h-5 text-green-600" />
                          <div>
                            <p className="font-bold text-green-700">{appliedPromo.code}</p>
                            <p className="text-xs text-green-600">Saved ₹{promoDiscount.toFixed(2)}</p>
                          </div>
                        </div>
                        <button onClick={handleRemovePromo} className="p-1 hover:bg-green-100 rounded transition-colors">
                          <X className="w-4 h-4 text-green-700" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {showAutoAppliedBanner && (
                        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2 min-w-0">
                              <Tag className="w-4 h-4 text-green-700 mt-0.5 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-green-800 truncate">
                                  Offer applied: {autoApplied.promo?.code}
                                </p>
                                <p className="text-xs text-green-700">
                                  Saved ₹{autoApplied.discount.toFixed(2)}
                                </p>
                              </div>
                            </div>
                            <span className="text-[11px] bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-semibold">
                              AUTO
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Manual promo input (coupons only) */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                          placeholder="Enter promo code"
                          className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                          disabled={applyingPromo}
                        />
                        <button
                          onClick={() => handleApplyPromo()}
                          disabled={!promoCode.trim() || applyingPromo}
                          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-orange-600 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {applyingPromo ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                        </button>
                      </div>

                      {couponLikePromos.length > 0 && (
                        <button
                          onClick={() => setShowPromoList(!showPromoList)}
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          <Tag className="w-3 h-3" />
                          View available coupons ({couponLikePromos.length})
                        </button>
                      )}

                      {showPromoList && couponLikePromos.length > 0 && (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {couponLikePromos.map((promo: any) => (
                            <button
                              key={promo.id}
                              onClick={() => handleApplyPromo(promo.code)}
                              className="w-full text-left p-3 border-2 border-gray-200 rounded-lg hover:border-primary transition-colors"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-primary">{promo.code}</span>
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                  {promo.discount_type === 'percentage'
                                    ? `${promo.discount_value}% OFF`
                                    : `₹${promo.discount_value} OFF`}
                                </span>
                              </div>
                              {promo.description && <p className="text-xs text-gray-600">{promo.description}</p>}
                              <p className="text-xs text-gray-500 mt-1">Min order: ₹{promo.min_order_amount}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Price Breakdown */}
                <div className="space-y-3 pb-4 border-b">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Item Total</span>
                    <span className="font-semibold text-gray-900">₹{cart.subtotal.toFixed(2)}</span>
                  </div>

                  {/* Virtual BXGY free items in summary (₹0 + OFFER tag) */}
                  {!appliedPromo?.code && (autoApplied.lines?.length ?? 0) > 0 && (
                    <div className="space-y-2">
                      {autoApplied.lines.map((l) => (
                        <div key={l.menuItemId} className="flex items-start justify-between text-sm gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-800 truncate">
                                {l.name} × {l.qty}
                              </span>
                              <span className="text-[11px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">
                                OFFER
                              </span>
                              <span className="text-[11px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                                {l.label || 'FREE'}
                              </span>
                            </div>
                          </div>
                          <span className="font-semibold text-gray-900">₹0.00</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {effectiveDiscount > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-green-600">
                        {appliedPromo?.code ? 'Promo Discount' : 'Offer Discount'}
                      </span>
                      <span className="font-semibold text-green-600">-₹{effectiveDiscount.toFixed(2)}</span>
                    </div>
                  )}

                  {showDeliveryFee && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-gray-600" />
                          <span className="text-gray-600">Delivery Fee</span>
                        </div>
                        <span className="font-semibold text-gray-900">₹{deliveryFee.toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-gray-500 pl-4">
                        {deliveryDistance > 0 ? `${deliveryDistance.toFixed(2)} km • ` : ''}
                        {deliveryBreakdown}
                      </p>
                    </>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {gstEnabled && gstPct > 0 ? `GST (${gstPct}%)` : 'Taxes & Fees'}
                    </span>
                    <span className="font-semibold text-gray-900">₹{tax.toFixed(2)}</span>
                  </div>
                </div>

                {/* Total */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <IndianRupee className="w-5 h-5 text-primary" />
                      <span className="text-2xl font-bold text-primary">{finalTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Total Savings */}
                {totalSavings > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-green-700">
                      <Tag className="w-4 h-4" />
                      <span className="text-sm font-semibold">Total Savings: ₹{totalSavings.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleCheckout}
                  disabled={validating}
                  className="w-full bg-primary text-white py-4 rounded-xl hover:bg-orange-600 font-bold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {validating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    'Proceed to Checkout'
                  )}
                </button>

                <div className="flex items-start gap-2 text-xs text-gray-600">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>Review your order carefully. Prices and availability are subject to change.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Bottom Bar (Mobile) */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 lg:hidden z-40">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Total Amount</p>
              <p className="text-xl font-bold text-primary">₹{finalTotal.toFixed(2)}</p>
              {totalSavings > 0 && <p className="text-xs text-green-600">Saved ₹{totalSavings.toFixed(2)}</p>}
            </div>
            <button
              onClick={handleCheckout}
              disabled={validating}
              className="bg-primary text-white px-6 py-3 rounded-xl hover:bg-orange-600 font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {validating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Validating...
                </>
              ) : (
                'Checkout'
              )}
            </button>
          </div>
        </div>

        {/* Clear Cart Modal */}
        {showClearModal && (
          <>
            <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowClearModal(false)} />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 p-6 mx-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Clear Cart?</h2>
                <p className="text-gray-600">Are you sure you want to remove all items from your cart?</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowClearModal(false)}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearCart}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold transition-colors"
                >
                  Clear Cart
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
