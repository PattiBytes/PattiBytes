/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter }   from 'next/navigation';
import { toast }       from 'react-toastify';
import { ShoppingCart } from 'lucide-react';

import { supabase }            from '@/lib/supabase';
import { useAuth }             from '@/contexts/AuthContext';
import { useCart }             from '@/contexts/CartContext';
import DashboardLayout         from '@/components/layouts/DashboardLayout';
import { cartService }         from '@/services/cart';
import { promoCodeService, type PromoCode } from '@/services/promoCodes';
import { appSettingsService }  from '@/services/appSettings';
import {
  locationService, type SavedAddress,
  calculateDeliveryFeeByDistance, getRoadDistanceKmViaApi,
} from '@/services/location';

import { CartHeader }        from './_components/CartHeader';
import { CartItemsList }     from './_components/CartItemsList';
import { BillSummary }       from './_components/BillSummary';
import { ClearCartModal }    from './_components/ClearCartModal';
import { MobileCheckoutBar } from './_components/MobileCheckoutBar';

// ─── Constants ────────────────────────────────────────────────────────────────
const SHOP_MERCHANT_ID  = 'pattibytes-shop';
const APP_SETTINGS_ID   = 'a6ba88a3-6fe9-4652-8c5d-b25ee1a05e39';

type MerchantTaxMini = { id: string; gstenabled: boolean | null; gstpercentage: number | null };
type MerchantGeoMini = { id: string; latitude: number | null; longitude: number | null };
type HubGeo          = { lat: number; lon: number };

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CartPage() {
  const router = useRouter();
  const { user }  = useAuth();
  const { cart, updateQuantity, removeFromCart, clearCart } = useCart();

  // Is this a shop / custom-products cart?
  const isShopCart = cart?.merchant_id === SHOP_MERCHANT_ID;

  // ── Core UI ────────────────────────────────────────────────────────────────
  const [validating,     setValidating]     = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);

  // ── Delivery ───────────────────────────────────────────────────────────────
  const [deliveryFee,       setDeliveryFee]       = useState(0);
  const [deliveryDistance,  setDeliveryDistance]  = useState(0);
  const [deliveryBreakdown, setDeliveryBreakdown] = useState('');
  const [showDeliveryFee,   setShowDeliveryFee]   = useState(true);

  // ── Geo sources ────────────────────────────────────────────────────────────
  const [merchantGeo, setMerchantGeo] = useState<MerchantGeoMini | null>(null);
  const [hubGeo,      setHubGeo]      = useState<HubGeo | null>(null);

  // ── Tax ────────────────────────────────────────────────────────────────────
  const [merchantTax, setMerchantTax] = useState<MerchantTaxMini | null>(null);

  // ── Address ────────────────────────────────────────────────────────────────
  const [defaultAddr, setDefaultAddr] = useState<SavedAddress | null>(null);

  // ── Promo ──────────────────────────────────────────────────────────────────
  const [promoCode,       setPromoCode]       = useState('');
  const [appliedPromo,    setAppliedPromo]    = useState<PromoCode | null>(null);
  const [promoDiscount,   setPromoDiscount]   = useState(0);
  const [applyingPromo,   setApplyingPromo]   = useState(false);
  const [showPromoList,   setShowPromoList]   = useState(false);
  const [availablePromos, setAvailablePromos] = useState<PromoCode[]>([]);

  // ── Auth gate ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    loadAvailablePromos();
   
  }, [user, router]);

  // ── Hub geo — fetch once when this is a shop cart ──────────────────────────
  useEffect(() => {
    if (!isShopCart) { setHubGeo(null); return; }
    (async () => {
      try {
        const { data, error } = await supabase
          .from('appsettings')
          .select('hub_latitude,hub_longitude')
          .eq('id', APP_SETTINGS_ID)
          .single();

        if (error || !data) {
          console.warn('Hub geo fetch failed, using hardcoded fallback:', error?.message);
          // Hardcoded fallback from your appsettings row
          setHubGeo({ lat: 31.2837165, lon: 74.847114 });
          return;
        }

        const lat = Number((data as any).hub_latitude);
        const lon = Number((data as any).hub_longitude);

        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          setHubGeo({ lat, lon });
        } else {
          setHubGeo({ lat: 31.2837165, lon: 74.847114 });
        }
      } catch {
        setHubGeo({ lat: 31.2837165, lon: 74.847114 });
      }
    })();
  }, [isShopCart]);

  // ── Merchant geo — only for restaurant carts ──────────────────────────────
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

  // ── Merchant GST — shop has no GST ────────────────────────────────────────
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

  // ── Default delivery address ───────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const a = await locationService.getDefaultAddress(user.id);
        setDefaultAddr(a);
      } catch { setDefaultAddr(null); }
    })();
  }, [user?.id]);

  // ── Delivery fee calculation ───────────────────────────────────────────────
  const loadDeliveryFee = useCallback(async () => {
    try {
      const policy = await appSettingsService.getDeliveryPolicyNow();
      setShowDeliveryFee(policy.showToCustomer);

      if (!policy.enabled) {
        setDeliveryFee(0);
        setDeliveryDistance(0);
        setDeliveryBreakdown('Delivery disabled');
        return;
      }

      if (!defaultAddr) {
        setDeliveryFee(0);
        setDeliveryDistance(0);
        setDeliveryBreakdown('No default address set');
        return;
      }

      // Origin: hub for shop cart, merchant for restaurant cart
      const originLat = isShopCart ? hubGeo?.lat  : Number(merchantGeo?.latitude);
      const originLon = isShopCart ? hubGeo?.lon  : Number(merchantGeo?.longitude);
      const destLat   = Number(defaultAddr.latitude);
      const destLon   = Number(defaultAddr.longitude);

      if (
        !Number.isFinite(originLat) || !Number.isFinite(originLon) ||
        !Number.isFinite(destLat)   || !Number.isFinite(destLon)
      ) {
        setDeliveryFee(0);
        setDeliveryDistance(0);
        setDeliveryBreakdown(
          isShopCart ? 'Patti hub location unavailable' : 'Merchant/customer location missing'
        );
        return;
      }

      // Try road distance API; fall back to straight-line haversine
      let roadKm: number;
      let usingHaversine = false;
      try {
        roadKm = await getRoadDistanceKmViaApi(
          originLat!, originLon!, destLat, destLon
        );
      } catch (apiErr) {
        console.warn('Road distance API failed, falling back to haversine:', apiErr);
        roadKm = locationService.calculateDistance(
          originLat!, originLon!, destLat, destLon
        );
        usingHaversine = true;
      }

      const quote = calculateDeliveryFeeByDistance(roadKm, {
        enabled:         policy.enabled,
        baseFee:         policy.baseFee,
        baseKm:          policy.baseRadiusKm,
        perKmBeyondBase: policy.perKmFeeAfterBase,
        rounding:        'ceil',
      });

      setDeliveryFee(quote.fee);
      setDeliveryDistance(quote.distanceKm);

      const prefix = isShopCart ? 'From Patti hub' : 'Road distance';
      const suffix = usingHaversine ? ' (est.)' : '';
      setDeliveryBreakdown(`${prefix}${suffix}: ${quote.breakdown}`);

    } catch (e: any) {
      setDeliveryFee(0);
      setDeliveryDistance(0);
      setDeliveryBreakdown(e?.message ?? 'Delivery fee calc failed');
    }
  }, [defaultAddr, merchantGeo, hubGeo, isShopCart]);

  // Trigger delivery fee when all required data is ready
  useEffect(() => {
    if (!user?.id || !cart?.merchant_id || !defaultAddr) return;
    // For shop: wait for hubGeo; for restaurant: wait for merchantGeo
    if (isShopCart  && !hubGeo)      return;
    if (!isShopCart && !merchantGeo) return;
    loadDeliveryFee();
  }, [
    user?.id, cart?.merchant_id, cart?.subtotal,
    merchantGeo, hubGeo, defaultAddr, isShopCart, loadDeliveryFee,
  ]);

  // ── Promos ─────────────────────────────────────────────────────────────────
  const loadAvailablePromos = async () => {
    try {
      const promos = await promoCodeService.getActivePromoCodes();
      setAvailablePromos(promos);
    } catch (e) { console.error('Failed to load promo codes:', e); }
  };

  const handleApplyPromo = async (code?: string, opts?: { silent?: boolean }) => {
    const codeToApply = (code || promoCode).trim();
    if (!codeToApply || !cart || !user) return;

    setApplyingPromo(true);
    try {
      const result = await promoCodeService.validatePromoCode(
        codeToApply, cart.subtotal, user.id,
        {
          merchantId: cart.merchant_id,
          cartItems: cart.items.map(i => ({
            menu_item_id: i.menu_item_id ?? i.id,
            merchant_id:  cart.merchant_id,
            category_id:  i.category_id ?? null,
            qty:          i.quantity,
            unit_price:   i.price,
          })),
        }
      );

      if (result.valid && result.promoCode) {
        setAppliedPromo(result.promoCode);
        setPromoDiscount(result.discount);
        setPromoCode('');
        setShowPromoList(false);
        if (!opts?.silent) toast.success(result.message);
      } else {
        setAppliedPromo(null);
        setPromoDiscount(0);
        if (!opts?.silent) toast.error(result.message);
      }
    } catch (e) {
      console.error('Promo error:', e);
      if (!opts?.silent) toast.error('Failed to apply promo code');
    } finally {
      setApplyingPromo(false);
    }
  };

  // Silent re-validate when subtotal changes
  useEffect(() => {
    if (!appliedPromo?.code || !cart?.subtotal || !user?.id) return;
    handleApplyPromo(appliedPromo.code, { silent: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart?.subtotal, user?.id]);

  // ── Cart handlers ──────────────────────────────────────────────────────────
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
    setAppliedPromo(null);
    setPromoDiscount(0);
    toast.success('Cart cleared');
  };

  // ── Totals ─────────────────────────────────────────────────────────────────
  const taxableBase = useMemo(() =>
    Math.max(0, (cart?.subtotal ?? 0) - promoDiscount)
  , [cart?.subtotal, promoDiscount]);

  const gstEnabled = !!merchantTax?.gstenabled;
  const gstPct     = Number(merchantTax?.gstpercentage ?? 0);

  const tax = useMemo(() => {
    if (!gstEnabled || !Number.isFinite(gstPct) || gstPct <= 0) return 0;
    return taxableBase * (gstPct / 100);
  }, [gstEnabled, gstPct, taxableBase]);

  const finalTotal = useMemo(() =>
    taxableBase + deliveryFee + tax
  , [taxableBase, deliveryFee, tax]);

  const itemDiscountSavings = useMemo(() =>
    cart?.items.reduce((acc, item) => {
      if (!item.discount_percentage) return acc;
      return acc + (item.price * item.discount_percentage / 100) * item.quantity;
    }, 0) ?? 0
  , [cart?.items]);

  const totalSavings = itemDiscountSavings + promoDiscount;

  // ── Checkout — separate validation for shop vs restaurant ──────────────────
  const handleCheckout = async () => {
    if (!cart || cart.items.length === 0) return;
    setValidating(true);
    try {

      if (isShopCart) {
        // ── Shop cart: validate against customproducts, NOT menuitems ─────────
        const productIds = cart.items.map(i => i.menu_item_id ?? i.id).filter(Boolean);
        const { data: products, error: prodErr } = await supabase
          .from('customproducts')
          .select('id, name, isactive')
          .in('id', productIds);

        if (prodErr) throw new Error('Failed to validate cart items');

        const unavailable = cart.items.filter(item => {
          const pid = item.menu_item_id ?? item.id;
          const found = products?.find((p: any) => p.id === pid);
          return !found || !found.isactive;
        });

        if (unavailable.length > 0) {
          const names = unavailable.map(i => i.name).join(', ');
          toast.error(
            `${names} ${unavailable.length > 1 ? 'are' : 'is'} no longer available. Please remove from cart.`,
            { autoClose: 4000 }
          );
          return;
        }
      } else {
        // ── Restaurant cart: use existing cartService validation ──────────────
        const validation = await cartService.validateCart();
        if (!validation.valid) {
          toast.error(validation.message || 'Cart validation failed');
          return;
        }
      }

      // Save checkout data and navigate
      sessionStorage.setItem('checkout_data', JSON.stringify({
        cart,
        deliveryFee,
        deliveryDistance,
        tax,
        promoCode:     appliedPromo?.code,
        promoDiscount,
        finalTotal,
        isShopCart,   // ← carry through so checkout page knows
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
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center
                              justify-center mx-auto mb-6">
                <ShoppingCart className="w-12 h-12 text-gray-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
              <p className="text-gray-600 mb-8">
                Add items from restaurants or the shop to get started
              </p>
              <div className="flex gap-3 justify-center flex-wrap">
                <button
                  onClick={() => router.push('/customer/dashboard')}
                  className="bg-primary text-white px-8 py-3 rounded-xl
                             hover:bg-orange-600 font-semibold transition-colors"
                >
                  Browse Restaurants
                </button>
                <button
                  onClick={() => router.push('/customer/shop')}
                  className="bg-purple-500 text-white px-8 py-3 rounded-xl
                             hover:bg-purple-600 font-semibold transition-colors"
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
                      : `/customer/restaurant/${cart.merchant_id}`
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
                promoCode={promoCode}
                appliedPromo={appliedPromo}
                applyingPromo={applyingPromo}
                showPromoList={showPromoList}
                availablePromos={availablePromos}
                onPromoCodeChange={setPromoCode}
                onApplyPromo={handleApplyPromo}
                onRemovePromo={() => {
                  setAppliedPromo(null);
                  setPromoDiscount(0);
                  toast.info('Promo code removed');
                }}
                onTogglePromoList={() => setShowPromoList(p => !p)}
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
