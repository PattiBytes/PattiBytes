/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter }     from 'next/navigation';
import { toast }         from 'react-toastify';
import { ArrowLeft, ShoppingBag, Tag, X, Loader2, Sparkles } from 'lucide-react';

import { supabase }            from '@/lib/supabase';
import { useAuth }             from '@/contexts/AuthContext';
import { locationService, type SavedAddress,
         calculateDeliveryFeeByDistance, getRoadDistanceKmViaApi }
                               from '@/services/location';
import { cartService }         from '@/services/cart';
import { appSettingsService }  from '@/services/appSettings';
import { sendNotification }    from '@/utils/notifications';
import DashboardLayout         from '@/components/layouts/DashboardLayout';
import { PageLoadingSpinner }  from '@/components/common/LoadingSpinner';
import { useCartPromo }        from '@/hooks/useCartPromo';

import { DeliveryAddressSection }                from './_components/DeliveryAddressSection';
import { AddAddressModal, type NewAddressForm }  from './_components/AddAddressModal';
import { OrderNotesSection }                     from './_components/OrderNotesSection';
import { PaymentMethodSection }                  from './_components/PaymentMethodSection';
import { MerchantContact }                       from './_components/MerchantContact';
import { OrderSummaryPanel }                     from './_components/OrderSummaryPanel';
import { formatFullAddress }                     from './_components/DeliveryAddressSection';

// ─── Constants ────────────────────────────────────────────────────────────────
const SHOP_MERCHANT_ID = 'pattibytes-shop';
const APP_SETTINGS_ID  = 'a6ba88a3-6fe9-4652-8c5d-b25ee1a05e39';
const HUB_LAT_FALLBACK = 31.2837165;
const HUB_LON_FALLBACK = 74.847114;

// ─── Types ─────────────────────────────────────────────────────────────────────
type CheckoutStored = {
  cart: {
    merchant_id    : string;
    merchant_name? : string;
    items          : any[];
    subtotal       : number;
  };
  deliveryFee?      : number;
  deliveryDistance? : number;
  tax?              : number;
  promoCode?        : string | null;
  promoDiscount?    : number;
  finalTotal?       : number;
  isShopCart?       : boolean;
};

type MerchantMini = {
  id              : string;
  business_name   : string | null;
  phone           : string | null;
  address         : string | null;
  latitude        : number | null;
  longitude       : number | null;
  gst_enabled?    : boolean | null;
  gst_percentage? : number | null;
  user_id?        : string | null;
};

type LiveLocation = {
  lat        : number;
  lng        : number;
  accuracy?  : number;
  updated_at : string;
};

type HubGeo = { lat: number; lon: number };

// ─── Helpers ──────────────────────────────────────────────────────────────────
const round2 = (n: number) => Math.round(n * 100) / 100;

function normalizePhone(v: string) { return String(v || '').replace(/\D/g, ''); }
function isValidPhone(v: string)   { return normalizePhone(v).length === 10; }

function blankForm(): NewAddressForm {
  return {
    label: 'Home', recipient_name: '', recipient_phone: '',
    address: '', apartment_floor: '', landmark: '',
    delivery_instructions: '', latitude: 0, longitude: 0,
    is_default: false, city: '', state: '', postal_code: '',
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const { user } = useAuth();
  const router   = useRouter();

  const [cartData,        setCartData]        = useState<CheckoutStored | null>(null);
  const [merchant,        setMerchant]        = useState<MerchantMini | null>(null);
  const [hubGeo,          setHubGeo]          = useState<HubGeo>({ lat: HUB_LAT_FALLBACK, lon: HUB_LON_FALLBACK });

  const [savedAddresses,  setSavedAddresses]  = useState<SavedAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<SavedAddress | null>(null);

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [newAddressForm,   setNewAddressForm]   = useState<NewAddressForm>(blankForm());

  const [paymentMethod,  setPaymentMethod]  = useState<'cod' | 'online'>('cod');
  const [customerNotes,  setCustomerNotes]  = useState('');

  const [loading,  setLoading]  = useState(true);
  const [placing,  setPlacing]  = useState(false);

  const [deliveryFee,        setDeliveryFee]        = useState(0);
  const [deliveryDistance,   setDeliveryDistance]   = useState(0);
  const [deliveryBreakdown,  setDeliveryBreakdown]  = useState('');
  const [showDeliveryFeeRow, setShowDeliveryFeeRow] = useState(true);

  // ── Promo code input state (manual entry) ─────────────────────────────────
  const [promoInput,     setPromoInput]     = useState('');
  const [showPromoInput, setShowPromoInput] = useState(false);

  // Live location
  const [shareLiveLocation, setShareLiveLocation] = useState(false);
  const [liveLocation,      setLiveLocation]      = useState<LiveLocation | null>(null);
  const [locChecking,       setLocChecking]       = useState(false);
  const watchIdRef  = useRef<number | null>(null);
  const lastSentRef = useRef<number>(0);
  const orderIdRef  = useRef<string | null>(null);
  const policyRef   = useRef<any>(null);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const isShopCart = useMemo(
    () => cartData?.cart?.merchant_id === SHOP_MERCHANT_ID || cartData?.isShopCart === true,
    [cartData],
  );

  const items = cartData?.cart?.items || [];

  const computedSubtotal = useMemo(() => {
    const s = Number(cartData?.cart?.subtotal);
    if (Number.isFinite(s) && s > 0) return round2(s);
    return round2(
      items.reduce((acc: number, it: any) => {
        const p    = Number(it?.price || 0);
        const q    = Number(it?.quantity || 0);
        const disc = Number(it?.discount_percentage || 0);
        return acc + (disc > 0 ? p * (1 - disc / 100) : p) * q;
      }, 0),
    );
  }, [cartData?.cart?.subtotal, items]);

  // ── useCartPromo hook ──────────────────────────────────────────────────────
  // Skip promo for shop cart (no BXGY/auto-promos for shop orders)
  const merchantIdForPromo = isShopCart ? '' : (cartData?.cart?.merchant_id ?? '');

  const promo = useCartPromo({
    merchantId  : merchantIdForPromo,
    userId      : user?.id ?? '',
    orderAmount : computedSubtotal,
    cartItems   : items,           // hook normalises internally
  });

  // ── Final totals derived from live promo state ─────────────────────────────
  const promoDiscount = round2(isShopCart ? 0 : promo.discount);
  const promoCode     = isShopCart ? null : (promo.promoCode?.code ?? null);
  const taxableBase   = useMemo(() => Math.max(0, computedSubtotal - promoDiscount), [computedSubtotal, promoDiscount]);

  const gstEnabled = useMemo(() => !isShopCart && !!merchant?.gst_enabled,  [isShopCart, merchant?.gst_enabled]);
  const gstPct     = useMemo(() => Number(merchant?.gst_percentage ?? 0),   [merchant?.gst_percentage]);

  const tax = useMemo(() => {
    if (!gstEnabled || !Number.isFinite(gstPct) || gstPct <= 0) return 0;
    return round2(taxableBase * (gstPct / 100));
  }, [gstEnabled, gstPct, taxableBase]);

  const finalTotal = useMemo(
    () => round2(taxableBase + deliveryFee + tax),
    [taxableBase, deliveryFee, tax],
  );

  const isSelectedAddressComplete = useMemo(() => {
    if (!selectedAddress) return false;
    const a          = selectedAddress as any;
    const phoneOk    = isValidPhone(a.recipient_phone || a.recipientphone || '');
    const landmarkOk = String(a.landmark || '').trim().length >= 2;
    const latOk      = Number.isFinite(Number(a.latitude))  && Number(a.latitude)  !== 0;
    const lonOk      = Number.isFinite(Number(a.longitude)) && Number(a.longitude) !== 0;
    return phoneOk && landmarkOk && latOk && lonOk;
  }, [selectedAddress]);

  const isLiveReady = useMemo(
    () => shareLiveLocation && !!liveLocation?.lat && !!liveLocation?.lng,
    [shareLiveLocation, liveLocation],
  );

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    loadCheckoutData();
  }, [user]);

  useEffect(() => () => stopSharing(), []);

  useEffect(() => {
    if (!shareLiveLocation) { stopSharing(); return; }
    startLiveWatch();
  }, [shareLiveLocation]);

  // ── Data loading ─────────────────────────────────────────────────────────────
  const loadCheckoutData = async () => {
    setLoading(true);
    try {
      loadHubGeo();

      const stored = sessionStorage.getItem('checkout_data');
      let checkout: CheckoutStored;

      if (!stored) {
        const cart = cartService.getCart();
        if (!cart?.items?.length) {
          toast.error('No items in cart');
          router.push('/customer/cart');
          return;
        }
        checkout = { cart: cart as any, promoCode: null, promoDiscount: 0 };
        sessionStorage.setItem('checkout_data', JSON.stringify(checkout));
      } else {
        checkout = JSON.parse(stored);
      }

      setCartData(checkout);

      const policy = await appSettingsService.getDeliveryPolicyNow();
      policyRef.current = policy;
      setShowDeliveryFeeRow(!!policy.showToCustomer);

      const isShop = checkout.cart.merchant_id === SHOP_MERCHANT_ID || checkout.isShopCart;

      let freshMerchant: MerchantMini | null = null;
      if (!isShop) {
        const { data: m, error } = await supabase
          .from('merchants')
          .select('id,business_name,phone,address,latitude,longitude,gst_enabled,gst_percentage,user_id')
          .eq('id', checkout.cart.merchant_id)
          .maybeSingle();

        if (error) throw error;
        if (!m) throw new Error('Merchant not found');

        freshMerchant = m as MerchantMini;
        setMerchant(freshMerchant);
      }

      const addresses = await locationService.getSavedAddresses(user!.id);
      setSavedAddresses(addresses);

      const defaultAddr =
        (addresses as any[]).find((a) => a?.isdefault || a?.is_default) ||
        addresses[0] || null;

      if (defaultAddr) {
        await handleAddressSelect(defaultAddr, checkout.cart.merchant_id, isShop, freshMerchant);
      }
    } catch (e: any) {
      console.error('Checkout load error:', e);
      toast.error(e?.message || 'Failed to load checkout');
    } finally {
      setLoading(false);
    }
  };

  const loadHubGeo = async () => {
    try {
      const { data, error } = await supabase
        .from('appsettings')
        .select('hub_latitude,hub_longitude')
        .eq('id', APP_SETTINGS_ID)
        .single();

      if (error || !data) return;
      const lat = Number((data as any).hub_latitude);
      const lon = Number((data as any).hub_longitude);
      if (Number.isFinite(lat) && Number.isFinite(lon)) setHubGeo({ lat, lon });
    } catch { /* keep fallback */ }
  };

  // ── Delivery fee ─────────────────────────────────────────────────────────────
  const computeDeliveryFee = async (
    addr             : SavedAddress,
    isShop           : boolean,
    merchantOverride?: MerchantMini | null,
  ) => {
    const policy = policyRef.current ?? await appSettingsService.getDeliveryPolicyNow();
    policyRef.current = policy;
    setShowDeliveryFeeRow(!!policy.showToCustomer);

    if (!policy.enabled) {
      setDeliveryFee(0); setDeliveryDistance(0);
      setDeliveryBreakdown('Delivery fee disabled'); return;
    }

    const merchantSrc = merchantOverride ?? merchant;
    const originLat   = isShop ? hubGeo.lat : Number(merchantSrc?.latitude);
    const originLon   = isShop ? hubGeo.lon : Number(merchantSrc?.longitude);
    const destLat     = Number((addr as any).latitude);
    const destLon     = Number((addr as any).longitude);

    if (
      ![originLat, originLon, destLat, destLon].every(Number.isFinite) ||
      (!isShop && (originLat === 0 || originLon === 0))
    ) {
      setDeliveryFee(0); setDeliveryDistance(0);
      setDeliveryBreakdown(isShop ? 'Hub location unavailable' : 'Merchant location missing');
      return;
    }

    let distanceKm: number;
    let label: string;

    try {
      distanceKm = await getRoadDistanceKmViaApi(originLat, originLon, destLat, destLon);
      label      = isShop ? 'From Patti hub' : 'Road distance';
    } catch {
      distanceKm = locationService.calculateDistance(originLat, originLon, destLat, destLon);
      label      = isShop ? 'From Patti hub (est.)' : 'Aerial distance (est.)';
    }

    const quote = calculateDeliveryFeeByDistance(distanceKm, {
      enabled        : policy.enabled,
      baseFee        : policy.baseFee,
      baseKm         : policy.baseRadiusKm,
      perKmBeyondBase: policy.perKmFeeAfterBase,
      rounding       : 'ceil',
    });

    setDeliveryFee(quote.fee);
    setDeliveryDistance(quote.distanceKm);
    setDeliveryBreakdown(`${label}: ${quote.breakdown}`);
  };

  const handleAddressSelect = async (
    addr             : SavedAddress,
    _merchantId?     : string,
    isShop?          : boolean,
    merchantOverride?: MerchantMini | null,
  ) => {
    setSelectedAddress(addr);
    const shop = isShop ?? isShopCart;
    await computeDeliveryFee(addr, shop, merchantOverride);
  };

  // ── Address management ────────────────────────────────────────────────────────
  const handleSaveAddress = async () => {
    if (!user) return;
    const f = newAddressForm;

    if (!f.address || !f.latitude || !f.longitude) {
      toast.error('Please select an address from the search'); return;
    }
    if (!String(f.landmark || '').trim() || f.landmark.trim().length < 2) {
      toast.error('Landmark is required'); return;
    }
    if (!isValidPhone(f.recipient_phone)) {
      toast.error('Recipient phone must be a 10-digit mobile number'); return;
    }

    try {
      const saved = await locationService.saveAddress({
        user_id              : user.id,
        label                : f.label,
        address              : f.address,
        latitude             : f.latitude,
        longitude            : f.longitude,
        recipient_name       : f.recipient_name        || null,
        recipient_phone      : normalizePhone(f.recipient_phone) || null,
        apartment_floor      : f.apartment_floor       || null,
        landmark             : f.landmark.trim(),
        delivery_instructions: f.delivery_instructions || null,
        is_default           : f.is_default,
        city                 : f.city        || null,
        state                : f.state       || null,
        postal_code          : f.postal_code || null,
      } as any);

      if (saved) {
        setSavedAddresses((prev) => [...prev, saved]);
        await handleAddressSelect(saved);
        setShowAddressModal(false);
        setNewAddressForm(blankForm());
        toast.success('Address saved and selected');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save address');
    }
  };

  const handleDeleteAddress = async (id: string) => {
    const ok = await locationService.deleteAddress(id);
    if (!ok) { toast.error('Failed to delete address'); return; }
    setSavedAddresses((prev) => prev.filter((a) => a.id !== id));
    if (selectedAddress?.id === id) {
      setSelectedAddress(null);
      setDeliveryFee(0); setDeliveryDistance(0); setDeliveryBreakdown('');
    }
    toast.success('Address deleted');
  };

  // ── Live location ─────────────────────────────────────────────────────────────
  const stopSharing = () => {
    try {
      if (watchIdRef.current != null) navigator.geolocation?.clearWatch(watchIdRef.current);
    } catch {}
    watchIdRef.current = null;
    orderIdRef.current = null;
  };

  const startLiveWatch = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) return;
    if (watchIdRef.current != null) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const now = Date.now();
        if (now - lastSentRef.current < 5000) return;
        lastSentRef.current = now;
        const payload: LiveLocation = {
          lat       : pos.coords.latitude,
          lng       : pos.coords.longitude,
          accuracy  : pos.coords.accuracy,
          updated_at: new Date().toISOString(),
        };
        setLiveLocation(payload);
        if (orderIdRef.current) {
          await supabase
            .from('orders')
            .update({ customer_location: payload })
            .eq('id', orderIdRef.current);
        }
      },
      (err) => {
        console.error(err);
        toast.error('Unable to get live location');
        stopSharing();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const requestLiveLocationOnce = async () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    setLocChecking(true);
    try {
      await new Promise<void>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setLiveLocation({
              lat       : pos.coords.latitude,
              lng       : pos.coords.longitude,
              accuracy  : pos.coords.accuracy,
              updated_at: new Date().toISOString(),
            });
            resolve();
          },
          reject,
          { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
        ),
      );
      toast.success('Live location enabled ✓');
    } catch {
      toast.error('Could not get location. Allow location permission.');
    } finally {
      setLocChecking(false);
    }
  };

  // ── Promo handlers ────────────────────────────────────────────────────────────
  const handleApplyPromoCode = async () => {
    if (!promoInput.trim()) { toast.error('Enter a promo code'); return; }
    const result = await promo.applyManualCode(promoInput.trim());
    if (result.valid) {
      toast.success(result.message);
      setShowPromoInput(false);
    } else {
      toast.error(result.message);
    }
  };

  const handleRemovePromo = () => {
    promo.removePromo();
    setPromoInput('');
    setShowPromoInput(false);
    toast.info('Promo removed');
  };

  // ── Place order ────────────────────────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    if (!user || !cartData || !selectedAddress) {
      toast.error('Please select a delivery address'); return;
    }
    if (!isSelectedAddressComplete) {
      toast.error('Address must include landmark and a 10-digit mobile number'); return;
    }
    if (!isLiveReady) {
      toast.error('Live location is required. Enable it first.'); return;
    }
    if (paymentMethod === 'online') {
      toast.info('Online payment coming soon'); return;
    }

    setPlacing(true);
    try {
      // Re-compute delivery fee with latest data
      await computeDeliveryFee(selectedAddress, isShopCart);

      const estimatedMinutes      = 30 + Math.ceil(Math.max(0, deliveryDistance - 5));
      const estimatedDeliveryTime = new Date(Date.now() + estimatedMinutes * 60_000);
      const addr                  = selectedAddress as any;

      const orderData: any = {
  customer_id  : user.id,
  merchant_id  : isShopCart ? null : cartData.cart.merchant_id,
  order_type   : isShopCart ? 'custom' : 'restaurant',
  hub_origin   : isShopCart ? APP_SETTINGS_ID : null,

  items        : cartData.cart.items,
  subtotal     : round2(computedSubtotal),
  discount     : round2(promoDiscount),      // ✅ schema column is `discount`
  delivery_fee : round2(deliveryFee),
  tax          : round2(tax),
  total_amount : round2(finalTotal),

  payment_method: paymentMethod,
  payment_status: 'pending',
  status        : 'pending',

  // ✅ Only schema-valid promo columns: promo_code (text) + promo_id (uuid)
  promo_code   : promoCode || null,
  promo_id     : promo.promoCode?.id || null,
  // ❌ REMOVED: promo_discount — column does not exist in orders schema

  delivery_address      : formatFullAddress(selectedAddress),
  delivery_latitude     : Number(addr.latitude),
  delivery_longitude    : Number(addr.longitude),
  delivery_distance_km  : round2(deliveryDistance),
  delivery_address_label: addr.label || null,

  recipient_name       : addr.recipient_name || addr.recipientname || null,
  customer_phone       : normalizePhone(addr.recipient_phone || addr.recipientphone) || null,
  special_instructions : addr.delivery_instructions || addr.deliveryinstructions || null,
  customer_notes       : customerNotes || null,
  delivery_instructions: addr.delivery_instructions || addr.deliveryinstructions || null,

  customer_location       : liveLocation || null,
  preparation_time        : 30,
  estimated_delivery_time : estimatedDeliveryTime.toISOString(),
};


      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw new Error(orderError.message || 'Failed to create order');

      // ✅ Record promo usage AFTER order is successfully created
      if (promo.promoCode && promo.discount > 0) {
        await promo.recordUsage(order.id);
      }

      // Clear cart + session
      sessionStorage.removeItem('checkout_data');
      cartService.clearCart();

      const orderNum  = (order as any).order_number ?? (order as any).id?.slice(0, 8) ?? '';
      const notifMeta = { order_id: order.id, order_number: orderNum, status: 'pending' };

      // Notifications
      sendNotification(
        user.id,
        '🎉 Order Placed!',
        `Your order #${orderNum} has been placed. ${promoCode ? `Promo ${promoCode} applied — you saved ₹${promoDiscount}!` : ''}`,
        'new_order', notifMeta,
      ).catch(console.error);

      supabase.from('profiles').select('id')
        .eq('role', 'superadmin').eq('is_active', true)
        .then(({ data: admins }) => {
          admins?.forEach(({ id }) =>
            sendNotification(
              id,
              `[ADMIN] 🛒 New ${isShopCart ? 'Shop' : 'Restaurant'} Order #${orderNum}`,
              `Total: ₹${round2(finalTotal)}${promoDiscount > 0 ? ` (promo -₹${promoDiscount})` : ''}`,
              'new_order', { ...notifMeta, forwarded_from: user.id },
            ).catch(console.error),
          );
        });

      if (!isShopCart && merchant?.user_id) {
        sendNotification(
          merchant.user_id,
          `🛒 New Order #${orderNum}`,
          `New order received. Total ₹${round2(finalTotal)}`,
          'new_order', notifMeta,
        ).catch(console.error);
      }

      toast.success('Order placed successfully! 🎉');

      orderIdRef.current = order.id;
      startLiveWatch();
      router.push(`/customer/orders/${order.id}`);
    } catch (e: any) {
      console.error('Place order error:', e);
      toast.error(e?.message || 'Failed to place order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────────
  if (loading) return <PageLoadingSpinner />;

  if (!cartData?.cart?.items?.length) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 py-8 text-center py-16">
          <ShoppingBag size={64} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-4">No items in checkout</p>
          <button
            onClick={() => router.push('/customer/dashboard')}
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-orange-600"
          >
            Browse Restaurants
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32 md:pb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft size={20} /> Back to Cart
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-1">Checkout</h1>
        <p className="text-sm text-gray-600 mb-8">
          {isShopCart
            ? '🏪 PattiBytes Shop — delivered from Patti hub'
            : merchant?.business_name
              ? `From ${merchant.business_name}`
              : 'Review and place your order'}
        </p>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* ── Left column ───────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            <DeliveryAddressSection
              addresses={savedAddresses}
              selectedId={selectedAddress?.id ?? null}
              onSelect={(addr) => handleAddressSelect(addr)}
              onDelete={handleDeleteAddress}
              onAddNew={() => { setNewAddressForm(blankForm()); setShowAddressModal(true); }}
            />

            {/* ── Promo Code Section ───────────────────────────────── */}
            {!isShopCart && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag size={16} className="text-primary" />
                    <p className="text-sm font-bold text-gray-800">Promo / Offer</p>
                  </div>

                  {/* Auto-apply loading badge */}
                  {promo.loading && !promo.applied && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                      <Loader2 size={12} className="animate-spin" />
                      Looking for offers…
                    </span>
                  )}
                </div>

                {/* ── Applied promo chip (auto BXGY or manual or auto cart) ── */}
                {promo.applied && promo.promoCode && (
                  <div className={`flex items-start justify-between rounded-xl px-3 py-2.5 border ${
                    promo.isBxgy
                      ? 'bg-purple-50 border-purple-200'
                      : 'bg-green-50 border-green-200'
                  }`}>
                    <div className="flex items-start gap-2">
                      <Sparkles
                        size={14}
                        className={`mt-0.5 flex-shrink-0 ${promo.isBxgy ? 'text-purple-500' : 'text-green-500'}`}
                      />
                      <div>
                        <p className={`text-xs font-bold ${promo.isBxgy ? 'text-purple-700' : 'text-green-700'}`}>
                          {promo.isBxgy ? '🎁' : '🏷'} {promo.promoCode.code}
                          {promo.promoCode.auto_apply && (
                            <span className="ml-1.5 text-[10px] bg-white/70 px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide">
                              Auto
                            </span>
                          )}
                        </p>
                        <p className={`text-xs mt-0.5 ${promo.isBxgy ? 'text-purple-500' : 'text-green-600'}`}>
                          {promo.message}
                        </p>
                        {promo.promoCode.description && (
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {promo.promoCode.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={handleRemovePromo}
                      className="ml-3 p-1 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                      title="Remove promo"
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}

                {/* ── Savings highlight ── */}
                {promo.discount > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-green-600 font-semibold">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
                    You save ₹{promo.discount.toFixed(2)} on this order!
                  </div>
                )}

                {/* ── Manual code input toggle ── */}
                {!promo.applied && (
                  <>
                    {!showPromoInput ? (
                      <button
                        onClick={() => setShowPromoInput(true)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 font-semibold hover:border-primary hover:text-primary transition-all"
                      >
                        <Tag size={13} />
                        Have a promo code? Enter here
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          value={promoInput}
                          onChange={(e) => setPromoInput(e.target.value.toUpperCase().replace(/\s/g, ''))}
                          onKeyDown={(e) => e.key === 'Enter' && handleApplyPromoCode()}
                          placeholder="e.g. FLAT30"
                          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary font-mono tracking-widest uppercase"
                          autoFocus
                        />
                        <button
                          onClick={handleApplyPromoCode}
                          disabled={promo.loading || !promoInput.trim()}
                          className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-orange-600 disabled:opacity-50 transition-all min-w-[70px] flex items-center justify-center"
                        >
                          {promo.loading
                            ? <Loader2 size={14} className="animate-spin" />
                            : 'Apply'}
                        </button>
                        <button
                          onClick={() => { setShowPromoInput(false); setPromoInput(''); }}
                          className="p-2 border border-gray-200 rounded-xl hover:bg-gray-100 text-gray-400"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* ── Replace with another code link (when already applied) ── */}
                {promo.applied && (
                  <button
                    onClick={() => { handleRemovePromo(); setShowPromoInput(true); }}
                    className="text-xs text-primary font-semibold hover:underline"
                  >
                    Use a different code
                  </button>
                )}
              </div>
            )}

            <OrderNotesSection
              notes={customerNotes}
              onNotesChange={setCustomerNotes}
              shareLiveLocation={shareLiveLocation}
              onToggleLive={setShareLiveLocation}
              liveLocation={liveLocation}
              locChecking={locChecking}
              onVerifyLocation={requestLiveLocationOnce}
              isShopCart={isShopCart}
            />

            <PaymentMethodSection
              selected={paymentMethod}
              onChange={setPaymentMethod}
            />

            {!isShopCart && (
              <MerchantContact
                phone={merchant?.phone}
                businessName={merchant?.business_name}
              />
            )}
          </div>

          {/* ── Right column ──────────────────────────────────────────── */}
          <div className="lg:col-span-1">
           <OrderSummaryPanel
  items={items}
  subtotal={computedSubtotal}
  promoDiscount={promoDiscount}
  promoCode={promoCode}
  deliveryFee={deliveryFee}
  deliveryDistance={deliveryDistance}
  deliveryBreakdown={deliveryBreakdown}
  showDeliveryFee={showDeliveryFeeRow}
  tax={tax}
  gstEnabled={gstEnabled}
  gstPct={gstPct}
  finalTotal={finalTotal}
  isShopCart={isShopCart}
  hasAddress={!!selectedAddress}
  addressComplete={isSelectedAddressComplete}
  liveReady={isLiveReady}
  placing={placing}
  onPlaceOrder={handlePlaceOrder}
  bxgyFreeItems={promo.freeItems}    
  promoMessage={promo.message}      
  isBxgyPromo={promo.isBxgy}        
/>

          </div>
        </div>
      </div>

      {showAddressModal && (
        <AddAddressModal
          form={newAddressForm}
          onChange={(patch) => setNewAddressForm((prev) => ({ ...prev, ...patch }))}
          onSave={handleSaveAddress}
          onClose={() => setShowAddressModal(false)}
        />
      )}
    </DashboardLayout>
  );
}
