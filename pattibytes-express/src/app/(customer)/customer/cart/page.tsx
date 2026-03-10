/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter }    from 'next/navigation';
import { toast }        from 'react-toastify';
import { ShoppingCart } from 'lucide-react';

import { supabase }           from '@/lib/supabase';
import { useAuth }            from '@/contexts/AuthContext';
import { useCart }            from '@/contexts/CartContext';
import DashboardLayout        from '@/components/layouts/DashboardLayout';
import { cartService }        from '@/services/cart';
import { promoCodeService }   from '@/services/promoCodes';
import { appSettingsService } from '@/services/appSettings';
import { useCartPromo }       from '@/hooks/useCartPromo';
import {
  locationService, type SavedAddress,
  calculateDeliveryFeeByDistance, getRoadDistanceKmViaApi,
} from '@/services/location';

import { CartHeader }        from './_components/CartHeader';
import { CartItemsList }     from './_components/CartItemsList';
import { BillSummary }       from './_components/BillSummary';
import { ClearCartModal }    from './_components/ClearCartModal';
import { MobileCheckoutBar } from './_components/MobileCheckoutBar';

// ─── Constants ─────────────────────────────────────────────────────────────────
const SHOP_MERCHANT_ID = 'pattibytes-shop';
const APP_SETTINGS_ID  = 'a6ba88a3-6fe9-4652-8c5d-b25ee1a05e39';

type MerchantTaxMini = { id: string; gstenabled: boolean | null; gstpercentage: number | null };
type MerchantGeoMini = { id: string; latitude: number | null; longitude: number | null };
type HubGeo          = { lat: number; lon: number };

// ─── Page ───────────────────────────────────────────────────────────────────────
export default function CartPage() {
  const router              = useRouter();
  const { user }            = useAuth();
  const { cart, updateQuantity, removeFromCart, clearCart } = useCart();

  const isShopCart = cart?.merchant_id === SHOP_MERCHANT_ID;

  // ── Core UI ──────────────────────────────────────────────────────────────────
  const [validating,     setValidating]     = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);

  // ── Delivery ─────────────────────────────────────────────────────────────────
  const [deliveryFee,       setDeliveryFee]       = useState(0);
  const [deliveryDistance,  setDeliveryDistance]  = useState(0);
  const [deliveryBreakdown, setDeliveryBreakdown] = useState('');
  const [showDeliveryFee,   setShowDeliveryFee]   = useState(true);

  // ── Geo sources ───────────────────────────────────────────────────────────────
  const [merchantGeo, setMerchantGeo] = useState<MerchantGeoMini | null>(null);
  const [hubGeo,      setHubGeo]      = useState<HubGeo | null>(null);

  // ── Tax ───────────────────────────────────────────────────────────────────────
  const [merchantTax, setMerchantTax] = useState<MerchantTaxMini | null>(null);

  // ── Address ───────────────────────────────────────────────────────────────────
  const [defaultAddr, setDefaultAddr] = useState<SavedAddress | null>(null);

  // ── Promo UI state (manual input + list toggle) ────────────────────────────
  const [promoInput,     setPromoInput]     = useState('');
  const [showPromoList,  setShowPromoList]  = useState(false);
  const [availablePromos, setAvailablePromos] = useState<any[]>([]);

  // ── useCartPromo — handles BXGY auto-apply + manual codes ─────────────────
  // Skip for shop carts (no promos apply to shop/custom product orders)
  const promo = useCartPromo({
    merchantId  : isShopCart ? '' : (cart?.merchant_id ?? ''),
    userId      : user?.id ?? '',
    orderAmount : cart?.subtotal ?? 0,
    cartItems   : cart?.items    ?? [],   // normalised inside hook
  });

  // ── Auth gate ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (!isShopCart) loadAvailablePromos();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router, isShopCart]);

  // ── Hub geo (shop carts) ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isShopCart) { setHubGeo(null); return; }
    (async () => {
      try {
        const { data, error } = await supabase
          .from('appsettings')
          .select('hub_latitude,hub_longitude')
          .eq('id', APP_SETTINGS_ID)
          .single();

        if (error || !data) { setHubGeo({ lat: 31.2837165, lon: 74.847114 }); return; }

        const lat = Number((data as any).hub_latitude);
        const lon = Number((data as any).hub_longitude);
        setHubGeo(
          Number.isFinite(lat) && Number.isFinite(lon)
            ? { lat, lon }
            : { lat: 31.2837165, lon: 74.847114 },
        );
      } catch {
        setHubGeo({ lat: 31.2837165, lon: 74.847114 });
      }
    })();
  }, [isShopCart]);

  // ── Merchant geo (restaurant carts) ───────────────────────────────────────────
  useEffect(() => {
    if (isShopCart || !cart?.merchant_id) { setMerchantGeo(null); return; }
    (async () => {
      const { data, error } = await supabase
        .from('merchants')
        .select('id, latitude, longitude')
        .eq('id', cart.merchant_id)
        .maybeSingle();
      if (error) { setMerchantGeo(null); return; }
      setMerchantGeo((data as MerchantGeoMini) ?? null);
    })();
  }, [cart?.merchant_id, isShopCart]);

  // ── Merchant GST ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isShopCart || !cart?.merchant_id) { setMerchantTax(null); return; }
    (async () => {
      const { data, error } = await supabase
        .from('merchants')
        .select('id, gstenabled:gst_enabled, gstpercentage:gst_percentage')
        .eq('id', cart.merchant_id)
        .maybeSingle();
      if (error) { setMerchantTax(null); return; }
      setMerchantTax((data as MerchantTaxMini) ?? null);
    })();
  }, [cart?.merchant_id, isShopCart]);

  // ── Default delivery address ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const a = await locationService.getDefaultAddress(user.id);
        setDefaultAddr(a);
      } catch { setDefaultAddr(null); }
    })();
  }, [user?.id]);

  // ── Delivery fee calculation ──────────────────────────────────────────────────
  const loadDeliveryFee = useCallback(async () => {
    try {
      const policy = await appSettingsService.getDeliveryPolicyNow();
      setShowDeliveryFee(policy.showToCustomer);

      if (!policy.enabled) {
        setDeliveryFee(0); setDeliveryDistance(0);
        setDeliveryBreakdown('Delivery disabled'); return;
      }
      if (!defaultAddr) {
        setDeliveryFee(0); setDeliveryDistance(0);
        setDeliveryBreakdown('No default address set'); return;
      }

      const originLat = isShopCart ? hubGeo?.lat  : Number(merchantGeo?.latitude);
      const originLon = isShopCart ? hubGeo?.lon  : Number(merchantGeo?.longitude);
      const destLat   = Number(defaultAddr.latitude);
      const destLon   = Number(defaultAddr.longitude);

      if (
        !Number.isFinite(originLat) || !Number.isFinite(originLon) ||
        !Number.isFinite(destLat)   || !Number.isFinite(destLon)
      ) {
        setDeliveryFee(0); setDeliveryDistance(0);
        setDeliveryBreakdown(
          isShopCart ? 'Patti hub location unavailable' : 'Merchant/customer location missing',
        ); return;
      }

      let roadKm: number;
      let usingHaversine = false;
      try {
        roadKm = await getRoadDistanceKmViaApi(originLat!, originLon!, destLat, destLon);
      } catch {
        roadKm         = locationService.calculateDistance(originLat!, originLon!, destLat, destLon);
        usingHaversine = true;
      }

      const quote = calculateDeliveryFeeByDistance(roadKm, {
        enabled        : policy.enabled,
        baseFee        : policy.baseFee,
        baseKm         : policy.baseRadiusKm,
        perKmBeyondBase: policy.perKmFeeAfterBase,
        rounding       : 'ceil',
      });

      setDeliveryFee(quote.fee);
      setDeliveryDistance(quote.distanceKm);
      const prefix = isShopCart ? 'From Patti hub' : 'Road distance';
      const suffix = usingHaversine ? ' (est.)' : '';
      setDeliveryBreakdown(`${prefix}${suffix}: ${quote.breakdown}`);
    } catch (e: any) {
      setDeliveryFee(0); setDeliveryDistance(0);
      setDeliveryBreakdown(e?.message ?? 'Delivery fee calc failed');
    }
  }, [defaultAddr, merchantGeo, hubGeo, isShopCart]);

  useEffect(() => {
    if (!user?.id || !cart?.merchant_id || !defaultAddr) return;
    if (isShopCart  && !hubGeo)      return;
    if (!isShopCart && !merchantGeo) return;
    loadDeliveryFee();
  }, [
    user?.id, cart?.merchant_id, cart?.subtotal,
    merchantGeo, hubGeo, defaultAddr, isShopCart, loadDeliveryFee,
  ]);

  // ── Available promos list (for promo picker UI) ────────────────────────────
  const loadAvailablePromos = async () => {
    try {
      const promos = await promoCodeService.getActivePromoCodes({
        merchantId: cart?.merchant_id ?? null,
      });
      // Only show cart_discount promos in picker (BXGY shows as auto-chip from hook)
      setAvailablePromos(
        promos.filter((p) => (p.deal_type ?? 'cart_discount') !== 'bxgy'),
      );
    } catch (e) { console.error('Failed to load promo codes:', e); }
  };

  // ── Promo handlers ─────────────────────────────────────────────────────────
  // Manual code apply (delegates to useCartPromo hook which handles normalisation)
  const handleApplyPromo = async (code?: string) => {
    const codeToApply = (code || promoInput).trim().toUpperCase();
    if (!codeToApply) { toast.error('Enter a promo code'); return; }

    const result = await promo.applyManualCode(codeToApply);

    if (result.valid) {
      setPromoInput('');
      setShowPromoList(false);
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const handleRemovePromo = () => {
    promo.removePromo();
    setPromoInput('');
    setShowPromoList(false);
    toast.info('Promo removed');
  };

  // ── Cart item handlers ─────────────────────────────────────────────────────
  const handleUpdateQuantity = (id: string, current: number, delta: number) => {
    const next = current + delta;
    if (next < 1 || next > 10) return;
    updateQuantity(id, next);
  };

  const handleRemoveItem = (id: string, name: string) => {
    removeFromCart(id);
    toast.success(`${name} removed from cart`);
  };

  const handleClearCart = () => {
    clearCart();
    setShowClearModal(false);
    promo.removePromo();
    setPromoInput('');
    toast.success('Cart cleared');
  };

  // ── Derived totals ─────────────────────────────────────────────────────────
  // promoDiscount comes from live hook (0 for shop carts)
  const promoDiscount = isShopCart ? 0 : promo.discount;
  const appliedPromo  = isShopCart ? null : promo.promoCode;

  const taxableBase = useMemo(
    () => Math.max(0, (cart?.subtotal ?? 0) - promoDiscount),
    [cart?.subtotal, promoDiscount],
  );

  const gstEnabled = !isShopCart && !!merchantTax?.gstenabled;
  const gstPct     = Number(merchantTax?.gstpercentage ?? 0);

  const tax = useMemo(() => {
    if (!gstEnabled || !Number.isFinite(gstPct) || gstPct <= 0) return 0;
    return taxableBase * (gstPct / 100);
  }, [gstEnabled, gstPct, taxableBase]);

  const finalTotal = useMemo(
    () => taxableBase + deliveryFee + tax,
    [taxableBase, deliveryFee, tax],
  );

  const itemDiscountSavings = useMemo(
    () =>
      cart?.items.reduce((acc, item) => {
        if (!item.discount_percentage) return acc;
        return acc + (item.price * item.discount_percentage / 100) * item.quantity;
      }, 0) ?? 0,
    [cart?.items],
  );

  const totalSavings = itemDiscountSavings + promoDiscount;

  // ── Checkout ───────────────────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (!cart || cart.items.length === 0) return;
    setValidating(true);
    try {
      if (isShopCart) {
        // Validate against customproducts table
        const productIds = cart.items.map((i) => i.menu_item_id ?? i.id).filter(Boolean);
        const { data: products, error: prodErr } = await supabase
          .from('customproducts')
          .select('id, name, isactive')
          .in('id', productIds);

        if (prodErr) throw new Error('Failed to validate cart items');

        const unavailable = cart.items.filter((item) => {
          const pid   = item.menu_item_id ?? item.id;
          const found = products?.find((p: any) => p.id === pid);
          return !found || !found.isactive;
        });

        if (unavailable.length > 0) {
          const names = unavailable.map((i) => i.name).join(', ');
          toast.error(
            `${names} ${unavailable.length > 1 ? 'are' : 'is'} no longer available. Remove from cart.`,
            { autoClose: 4000 },
          );
          return;
        }
      } else {
        const validation = await cartService.validateCart();
        if (!validation.valid) {
          toast.error(validation.message || 'Cart validation failed');
          return;
        }
      }

      // ✅ Save checkout data — promo intentionally NOT saved here.
      // The checkout page runs its own useCartPromo instance which re-applies
      // the best offer fresh. We only carry over display/fee data.
      sessionStorage.setItem('checkout_data', JSON.stringify({
        cart,
        deliveryFee,
        deliveryDistance,
        tax,
        // Pass promo snapshot for display continuity before checkout hook fires
        promoCode    : appliedPromo?.code    ?? null,
        promoCodeId  : appliedPromo?.id      ?? null,
        promoDiscount: promoDiscount,
        finalTotal,
        isShopCart,
      }));

      router.push('/customer/checkout');
    } catch (e: any) {
      console.error('Checkout error:', e);
      toast.error(e?.message || 'Failed to proceed to checkout');
    } finally {
      setValidating(false);
    }
  };

  // ── Empty cart ─────────────────────────────────────────────────────────────
  if (!cart || cart.items.length === 0) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-2xl"
              >
                ←
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Your Cart</h1>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-16 text-center">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShoppingCart className="w-12 h-12 text-gray-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
              <p className="text-gray-600 mb-8">
                Add items from restaurants or the shop to get started
              </p>
              <div className="flex gap-3 justify-center flex-wrap">
                <button
                  onClick={() => router.push('/customer/dashboard')}
                  className="bg-primary text-white px-8 py-3 rounded-xl hover:bg-orange-600 font-semibold transition-colors"
                >
                  Browse Restaurants
                </button>
                <button
                  onClick={() => router.push('/customer/shop')}
                  className="bg-purple-500 text-white px-8 py-3 rounded-xl hover:bg-purple-600 font-semibold transition-colors"
                >
                  Visit Shop 🏪
                </button>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 pb-32 md:pb-8">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <CartHeader
            itemCount={cart.items.length}
            onBack={() => router.back()}
            onClearCart={() => setShowClearModal(true)}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Items */}
            <div className="lg:col-span-2">
              <CartItemsList
                merchantId={cart.merchant_id}
                merchantName={cart.merchant_name}
                isShopCart={isShopCart}
                items={cart.items as any}
                onAddMore={() =>
                  router.push(
                    isShopCart
                      ? '/customer/shop'
                      : `/customer/restaurant/${cart.merchant_id}`,
                  )
                }
                onRemove={handleRemoveItem}
                onUpdateQty={handleUpdateQuantity}
              />
            </div>

            {/* Bill */}
            <div className="lg:col-span-1">
              <BillSummary
                subtotal={cart.subtotal}
                promoDiscount={promoDiscount}
                deliveryFee={deliveryFee}
                deliveryBreakdown={deliveryBreakdown}
                showDeliveryFee={showDeliveryFee}
                tax={tax}
                gstEnabled={gstEnabled}
                gstPct={gstPct}
                finalTotal={finalTotal}
                totalSavings={totalSavings}
                validating={validating}
                // ✅ Pass hook state — includes BXGY auto-applied offers
                promoCode={promoInput}
                appliedPromo={appliedPromo}
                applyingPromo={promo.loading}
                 bxgyFreeItems={promo.freeItems}
                promoMessage={promo.message}
                isBxgyPromo={promo.isBxgy}
                showPromoList={showPromoList}
                availablePromos={availablePromos}
                onPromoCodeChange={(v) => setPromoInput(v.toUpperCase().replace(/\s/g, ''))}
                onApplyPromo={handleApplyPromo}
                onRemovePromo={handleRemovePromo}
                onTogglePromoList={() => setShowPromoList((p) => !p)}
                onCheckout={handleCheckout}
              />
            </div>
          </div>
        </div>

        <MobileCheckoutBar
          finalTotal={finalTotal}
          totalSavings={totalSavings}
          validating={validating}
          onCheckout={handleCheckout}
        />
      </div>

      {showClearModal && (
        <ClearCartModal
          onConfirm={handleClearCart}
          onCancel={() => setShowClearModal(false)}
        />
      )}
    </DashboardLayout>
  );
}
