/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { locationService, type SavedAddress } from '@/services/location';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { cartService } from '@/services/cart';

import {
  MapPin,
  ShoppingBag,
  CreditCard,
  Wallet,
  ArrowLeft,
  Plus,
  Trash2,
  Check,
  Loader2,
  AlertCircle,
  Home,
  Briefcase,
  MapPinned,
  Phone,
  MessageCircle,
  Info,
  Navigation,
  LocateFixed,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { PageLoadingSpinner } from '@/components/common/LoadingSpinner';
import { deliveryFeeService } from '@/services/deliveryFee';

type CheckoutStored = {
  cart: {
    merchant_id: string;
    merchant_name?: string;
    items: any[];
    subtotal: number;
  };
  promoCode?: string | null;
  promoDiscount?: number;
};

type MerchantMini = {
  id: string;
  business_name: string | null;
  phone: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;

  gst_enabled?: boolean | null;
  gst_percentage?: number | null;
};

type LiveLocation = {
  lat: number;
  lng: number;
  accuracy?: number;
  updated_at: string;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

function normalizePhone(v: string) {
  return String(v || '').replace(/\D/g, '');
}
function isValidIndianMobile(v: string) {
  return normalizePhone(v).length === 10;
}

function formatFullAddress(a: SavedAddress) {
  const lines: string[] = [];
  if (a.address) lines.push(a.address);

  const extraBits: string[] = [];
  if ((a as any).apartment_floor) extraBits.push(`Flat/Floor: ${(a as any).apartment_floor}`);
  if ((a as any).apartmentfloor) extraBits.push(`Flat/Floor: ${(a as any).apartmentfloor}`);
  if ((a as any).landmark) extraBits.push(`Landmark: ${(a as any).landmark}`);
  if (extraBits.length) lines.push(extraBits.join(' • '));

  const cityLine = [a.city, a.state, (a as any).postalcode || (a as any).postal_code].filter(Boolean).join(', ');
  if (cityLine) lines.push(cityLine);

  return lines.join('\n');
}

export default function CheckoutPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [cartData, setCartData] = useState<CheckoutStored | null>(null);
  const [merchant, setMerchant] = useState<MerchantMini | null>(null);

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<SavedAddress | null>(null);

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('cod');

  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);

  const [deliveryFee, setDeliveryFee] = useState(0);
  const [deliveryDistance, setDeliveryDistance] = useState(0);
  const [deliveryBreakdown, setDeliveryBreakdown] = useState('');

  const [customerNotes, setCustomerNotes] = useState('');

  // Live location required
  const [shareLiveLocation, setShareLiveLocation] = useState(false);
  const [liveLocation, setLiveLocation] = useState<LiveLocation | null>(null);
  const [locChecking, setLocChecking] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const lastSentAtRef = useRef<number>(0);
  const orderIdRef = useRef<string | null>(null);

  // New Address form
  const [newAddress, setNewAddress] = useState<any>({
    label: 'Home',
    recipient_name: '',
    recipient_phone: '',
    address: '',
    apartment_floor: '',
    landmark: '',
    delivery_instructions: '',
    latitude: 0,
    longitude: 0,
    is_default: false,
    city: '',
    state: '',
    postal_code: '',
  });

  const items = cartData?.cart?.items || [];

  const computedSubtotal = useMemo(() => {
    const s = Number(cartData?.cart?.subtotal);
    if (Number.isFinite(s) && s > 0) return round2(s);

    const sum = items.reduce((acc: number, it: any) => {
      const price = Number(it?.price || 0);
      const qty = Number(it?.quantity || 0);
      const disc = Number(it?.discount_percentage || it?.discountpercentage || 0);
      const effective = disc > 0 ? price * (1 - disc / 100) : price;
      return acc + effective * qty;
    }, 0);
    return round2(sum);
  }, [cartData?.cart?.subtotal, items]);

  const promoDiscount = useMemo(() => round2(Number(cartData?.promoDiscount || 0)), [cartData?.promoDiscount]);
  const promoCode = cartData?.promoCode ?? null;

  const taxableBase = useMemo(() => Math.max(0, computedSubtotal - promoDiscount), [computedSubtotal, promoDiscount]);

  const gstEnabled = useMemo(() => !!merchant?.gst_enabled, [merchant?.gst_enabled]);
  const gstPct = useMemo(() => Number(merchant?.gst_percentage ?? 0), [merchant?.gst_percentage]);

  const tax = useMemo(() => {
    if (!gstEnabled) return 0;
    if (!Number.isFinite(gstPct) || gstPct <= 0) return 0;
    return round2(taxableBase * (gstPct / 100));
  }, [gstEnabled, gstPct, taxableBase]);

  const finalTotal = useMemo(() => round2(taxableBase + deliveryFee + tax), [taxableBase, deliveryFee, tax]);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadCheckoutData();
     
  }, [user]);

  useEffect(() => {
    return () => stopSharing();
     
  }, []);

  const loadCheckoutData = async () => {
    setLoading(true);
    try {
     const stored = sessionStorage.getItem('checkout_data');

      if (!stored) {
        toast.error('No items in cart');
        router.push('/customer/cart');
        return;
      }
      if (!stored) {
  const cart = cartService.getCart();
  if (!cart?.items?.length) {
    toast.error('No items in cart');
    router.push('/customer/cart');
    return;
  }

  const rebuilt = {
    cart,
    promoCode: null,
    promoDiscount: 0,
    // optionally set deliveryFee/distance/tax later after merchant/address loads
  };

  sessionStorage.setItem('checkout_data', JSON.stringify(rebuilt));
  setCartData(rebuilt as any);
  // continue with merchant load etc.
  return;
}


      const data = JSON.parse(stored) as CheckoutStored;
      setCartData(data);

      if (data?.cart?.merchant_id) {
        const { data: m, error } = await supabase
          .from('merchants')
          .select('id,business_name,phone,address,latitude,longitude,gst_enabled,gst_percentage')
          .eq('id', data.cart.merchant_id)
          .single();

        if (error) throw error;
        setMerchant(m as any);
      }

      const addresses = await locationService.getSavedAddresses(user!.id);
      setSavedAddresses(addresses);

      const defaultAddr = addresses.find((a: any) => a.is_default || a.isdefault) || addresses[0] || null;
      if (defaultAddr) {
        await handleAddressSelection(defaultAddr, data?.cart?.merchant_id);
      } else {
        setSelectedAddress(null);
      }

      await deliveryFeeService.loadConfig();
    } catch (e: any) {
      console.error('Failed to load checkout data:', e);
      toast.error(e?.message || 'Failed to load checkout data');
    } finally {
      setLoading(false);
    }
  };

  const computeDistanceAndFee = async (addr: SavedAddress, merchantId?: string) => {
    let m = merchant;

    if ((!m || !m.latitude || !m.longitude) && merchantId) {
      const { data: m2 } = await supabase
        .from('merchants')
        .select('id,business_name,phone,address,latitude,longitude,gst_enabled,gst_percentage')
        .eq('id', merchantId)
        .single();
      if (m2) {
        m = m2 as any;
        setMerchant(m2 as any);
      }
    }

    const mLat = Number(m?.latitude);
    const mLon = Number(m?.longitude);
    const aLat = Number((addr as any).latitude);
    const aLon = Number((addr as any).longitude);

    if (!Number.isFinite(mLat) || !Number.isFinite(mLon) || !Number.isFinite(aLat) || !Number.isFinite(aLon)) {
      setDeliveryDistance(0);
      setDeliveryFee(0);
      setDeliveryBreakdown('');
      return;
    }

    const feeData = deliveryFeeService.calculateDeliveryFeeFromMerchant(mLat, mLon, aLat, aLon);
    setDeliveryDistance(feeData.distance);
    setDeliveryFee(feeData.fee);
    setDeliveryBreakdown(feeData.breakdown);
  };

  const handleAddressSelection = async (addr: SavedAddress, merchantId?: string) => {
    setSelectedAddress(addr);
    await computeDistanceAndFee(addr, merchantId || cartData?.cart?.merchant_id);
  };

  const handleAddressSelect = (addressData: any) => {
    setNewAddress((prev: any) => ({
      ...prev,
      address: addressData.address,
      latitude: addressData.lat,
      longitude: addressData.lon,
      city: addressData.city || '',
      state: addressData.state || '',
      postal_code: addressData.postalcode || '',
    }));
  };

  const handleSaveAddress = async () => {
    if (!user) return;

    if (!newAddress.address || !newAddress.latitude || !newAddress.longitude) {
      toast.error('Please select an address');
      return;
    }
    if (!String(newAddress.landmark || '').trim() || String(newAddress.landmark).trim().length < 2) {
      toast.error('Landmark is compulsory');
      return;
    }
    if (!isValidIndianMobile(newAddress.recipient_phone)) {
      toast.error('Recipient mobile number is compulsory (10 digits)');
      return;
    }

    try {
      const saved = await locationService.saveAddress({
        userId: user.id,
        label: newAddress.label,
        address: newAddress.address,
        latitude: newAddress.latitude,
        longitude: newAddress.longitude,
        recipient_name: newAddress.recipient_name || null,
        recipient_phone: normalizePhone(newAddress.recipient_phone) || null,
        apartment_floor: newAddress.apartment_floor || null,
        landmark: String(newAddress.landmark).trim(),
        delivery_instructions: newAddress.delivery_instructions || null,
        is_default: !!newAddress.is_default,
        city: newAddress.city || null,
        state: newAddress.state || null,
        postal_code: newAddress.postal_code || null,
      } as any);

      if (saved) {
        const next = [...savedAddresses, saved];
        setSavedAddresses(next);
        await handleAddressSelection(saved, cartData?.cart?.merchant_id);
        setShowAddressModal(false);
        toast.success('Address saved & selected');
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to save address');
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    try {
      const ok = await locationService.deleteAddress(addressId);
      if (!ok) return toast.error('Failed to delete address');

      const next = savedAddresses.filter((a) => a.id !== addressId);
      setSavedAddresses(next);

      if (selectedAddress?.id === addressId) {
        setSelectedAddress(null);
        setDeliveryFee(0);
        setDeliveryDistance(0);
        setDeliveryBreakdown('');
      }

      toast.success('Address deleted');
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete address');
    }
  };

  const stopSharing = () => {
    try {
      if (watchIdRef.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    } catch {}
    watchIdRef.current = null;
    orderIdRef.current = null;
  };

  const startLiveWatch = () => {
    if (typeof window === 'undefined') return;
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported on this device/browser');
      return;
    }
    if (watchIdRef.current != null) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const now = Date.now();
        if (now - lastSentAtRef.current < 5000) return;
        lastSentAtRef.current = now;

        const payload: LiveLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          updated_at: new Date().toISOString(),
        };

        setLiveLocation(payload);

        // update DB only after order exists
        if (orderIdRef.current) {
          await supabase.from('orders').update({ customer_location: payload }).eq('id', orderIdRef.current);
        }
      },
      (err) => {
        console.error(err);
        toast.error('Unable to get live location (permission/timeout)');
        stopSharing();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const requestLiveLocationOnce = async () => {
    if (typeof window === 'undefined') return;
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported on this device/browser');
      return;
    }

    setLocChecking(true);
    try {
      await new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const payload: LiveLocation = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              updated_at: new Date().toISOString(),
            };
            setLiveLocation(payload);
            resolve();
          },
          (err) => reject(err),
          { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
        );
      });
      toast.success('Live location enabled');
    } catch (e) {
      console.error(e);
      toast.error('Could not get location. Please allow location permission.');
    } finally {
      setLocChecking(false);
    }
  };

  useEffect(() => {
    if (!shareLiveLocation) {
      stopSharing();
      return;
    }
    startLiveWatch();
     
  }, [shareLiveLocation]);

  const isSelectedAddressComplete = useMemo(() => {
    if (!selectedAddress) return false;
    const phoneOk = isValidIndianMobile((selectedAddress as any).recipient_phone || (selectedAddress as any).recipientphone || '');
    const landmarkOk = String((selectedAddress as any).landmark || '').trim().length >= 2;
    const latOk = Number.isFinite(Number((selectedAddress as any).latitude)) && Number((selectedAddress as any).latitude) !== 0;
    const lonOk = Number.isFinite(Number((selectedAddress as any).longitude)) && Number((selectedAddress as any).longitude) !== 0;
    return phoneOk && landmarkOk && latOk && lonOk;
  }, [selectedAddress]);

  const isLiveLocationReady = useMemo(() => {
    return shareLiveLocation && !!liveLocation?.lat && !!liveLocation?.lng;
  }, [shareLiveLocation, liveLocation]);

  const openMaps = (lat: number, lon: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lon}`, '_blank', 'noopener,noreferrer');
  };

  const contactWhatsApp = (phone: string, msg: string) => {
    const clean = normalizePhone(phone);
    if (!clean) return toast.error('Phone number not available');
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

  const handlePlaceOrder = async () => {
    if (!user || !cartData || !selectedAddress) {
      toast.error('Please select a delivery address');
      return;
    }

    if (!isSelectedAddressComplete) {
      toast.error('Selected address must include landmark and a 10-digit mobile number');
      return;
    }

    if (!isLiveLocationReady) {
      toast.error('Live location is compulsory. Enable it to place the order.');
      return;
    }

    if (paymentMethod === 'online') {
      toast.info('Online payment will be available soon');
      return;
    }

    setPlacing(true);
    try {
      const { data: merchantCheck, error: merchantError } = await supabase
        .from('merchants')
        .select('id,business_name,latitude,longitude')
        .eq('id', cartData.cart.merchant_id)
        .single();

      if (merchantError || !merchantCheck) throw new Error('Restaurant not found. Please clear your cart and try again.');

      await computeDistanceAndFee(selectedAddress, merchantCheck.id);

      const estimatedMinutes = 30 + Math.ceil(Math.max(0, deliveryDistance - 5));
      const estimatedDeliveryTime = new Date(Date.now() + estimatedMinutes * 60_000);

      const fullDeliveryAddress = formatFullAddress(selectedAddress);

      const orderData: any = {
        customer_id: user.id,
        merchant_id: merchantCheck.id,
        items: cartData.cart.items,

        subtotal: round2(computedSubtotal),
        discount: round2(promoDiscount),
        delivery_fee: round2(deliveryFee),
        tax: round2(tax),
        total_amount: round2(finalTotal),

        payment_method: paymentMethod,
        payment_status: 'pending',

        promo_code: promoCode || null,

        delivery_address: fullDeliveryAddress,
        delivery_latitude: Number((selectedAddress as any).latitude),
        delivery_longitude: Number((selectedAddress as any).longitude),
        delivery_distance_km: round2(deliveryDistance),

        customer_phone: normalizePhone((selectedAddress as any).recipient_phone || (selectedAddress as any).recipientphone) || null,
        special_instructions: (selectedAddress as any).delivery_instructions || (selectedAddress as any).deliveryinstructions || null,
        customer_notes: customerNotes || null,

        customer_location: liveLocation || null,

        status: 'pending',
        preparation_time: 30,
        estimated_delivery_time: estimatedDeliveryTime.toISOString(),
      };

      const { data: order, error: orderError } = await supabase.from('orders').insert(orderData).select().single();
      if (orderError) throw new Error(orderError.message || 'Failed to create order');

      sessionStorage.removeItem('checkout_data');
cartService.clearCart(); // removes pattibytes_cart and dispatches cartUpdated


      toast.success('Order placed successfully!');

      orderIdRef.current = order.id; // enable DB updates for live location now
      startLiveWatch();

      router.push(`/customer/orders/${order.id}`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to place order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  const getAddressIcon = (label: string) => {
    switch (String(label || '').toLowerCase()) {
      case 'home':
        return <Home className="w-5 h-5" />;
      case 'work':
        return <Briefcase className="w-5 h-5" />;
      default:
        return <MapPinned className="w-5 h-5" />;
    }
  };

  if (loading) return <PageLoadingSpinner />;

  if (!cartData?.cart?.items?.length) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center py-16">
            <ShoppingBag size={64} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No items in checkout</p>
            <button
              onClick={() => router.push('/customer/dashboard')}
              className="mt-4 bg-primary text-white px-6 py-2 rounded-lg hover:bg-orange-600"
            >
              Browse Restaurants
            </button>
          </div>
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
          <ArrowLeft size={20} />
          <span>Back to Cart</span>
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Checkout</h1>
        <p className="text-sm text-gray-600 mb-8">
          {merchant?.business_name ? `From ${merchant.business_name}` : 'Review and place your order'}
        </p>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left */}
          <div className="lg:col-span-2 space-y-6">
            {/* Address */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <MapPin className="text-primary" size={24} />
                  Delivery Address
                </h2>
                <button
                  onClick={() => setShowAddressModal(true)}
                  className="text-primary hover:bg-orange-50 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors font-semibold"
                >
                  <Plus size={16} />
                  Add New
                </button>
              </div>

              {savedAddresses.length ? (
                <div className="space-y-3">
                  {savedAddresses.map((address: any) => {
                    const phoneOk = isValidIndianMobile(address?.recipient_phone || address?.recipientphone || '');
                    const landmarkOk = String(address?.landmark || '').trim().length >= 2;

                    const selected = selectedAddress?.id === address.id;
                    return (
                      <div
                        key={address.id}
                        className={`relative p-4 rounded-lg border-2 transition-all cursor-pointer ${
                          selected ? 'border-primary bg-orange-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleAddressSelection(address, cartData.cart.merchant_id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-primary mt-1">{getAddressIcon(address.label)}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="font-bold text-gray-900">{address.label}</p>
                              {(address.is_default || address.isdefault) && (
                                <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full">Default</span>
                              )}
                              {(!phoneOk || !landmarkOk) && (
                                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                                  Missing required details
                                </span>
                              )}
                            </div>

                            <p className="text-sm text-gray-700 whitespace-pre-line">{formatFullAddress(address)}</p>

                            <div className="mt-2 flex items-center gap-3 text-xs text-gray-600 flex-wrap">
                              {address.recipient_name && (
                                <span className="inline-flex items-center gap-1">
                                  <Info className="w-3 h-3" />
                                  {address.recipient_name}
                                </span>
                              )}
                              {(address.recipient_phone || address.recipientphone) && (
                                <span className="inline-flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {address.recipient_phone || address.recipientphone}
                                </span>
                              )}
                              {(address.delivery_instructions || address.deliveryinstructions) && (
                                <span className="inline-flex items-center gap-1">
                                  <Navigation className="w-3 h-3" />
                                  {address.delivery_instructions || address.deliveryinstructions}
                                </span>
                              )}
                            </div>

                            <div className="mt-3 flex items-center gap-2">
                              <button
                                type="button"
                                className="text-xs font-semibold text-primary hover:underline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openMaps(Number(address.latitude), Number(address.longitude));
                                }}
                              >
                                Open in Maps
                              </button>

                              {!address.is_default && !address.isdefault && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteAddress(address.id);
                                  }}
                                  className="ml-auto p-1.5 hover:bg-red-50 text-red-600 rounded transition-colors"
                                  type="button"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </div>

                          {selected && <Check className="text-primary flex-shrink-0" size={20} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <MapPin size={48} className="mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600 mb-4">No saved addresses</p>
                  <button
                    onClick={() => setShowAddressModal(true)}
                    className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-orange-600 font-semibold"
                  >
                    Add Your First Address
                  </button>
                </div>
              )}
            </div>

            {/* Notes + Live location */}
            <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
              <div>
                <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                  <Info className="text-primary" size={22} />
                  Order notes
                </h2>
                <textarea
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  placeholder="Any request for the restaurant? (optional)"
                  className="w-full min-h-[90px] border-2 border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                />
              </div>

              <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-lg p-3">
                <input
                  type="checkbox"
                  checked={shareLiveLocation}
                  onChange={(e) => setShareLiveLocation(e.target.checked)}
                  className="mt-1 w-4 h-4"
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">Live location required</p>
                  <p className="text-xs text-gray-600">
                    You must enable live location to place the order. After order placement, it will keep updating in the order.
                  </p>

                  <div className="mt-2 flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={requestLiveLocationOnce}
                      disabled={!shareLiveLocation || locChecking}
                      className="px-3 py-2 rounded-lg bg-white border border-orange-200 hover:bg-orange-100 text-sm font-semibold disabled:opacity-60 inline-flex items-center gap-2"
                    >
                      {locChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
                      Verify location now
                    </button>
                  </div>

                  {shareLiveLocation && liveLocation && (
                    <p className="mt-2 text-xs text-gray-600">
                      Last update: {new Date(liveLocation.updated_at).toLocaleTimeString()}
                    </p>
                  )}
                  {shareLiveLocation && !liveLocation && (
                    <p className="mt-2 text-xs text-red-700">
                      Location not received yet. Tap “Verify location now” and allow permission.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Payment */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <CreditCard className="text-primary" size={24} />
                Payment Method
              </h2>

              <div className="space-y-3">
                <button
                  onClick={() => setPaymentMethod('cod')}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    paymentMethod === 'cod' ? 'border-primary bg-orange-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  type="button"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <Wallet className="text-green-600" size={24} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">Cash on Delivery</p>
                        <p className="text-sm text-gray-600">Pay when you receive your order</p>
                      </div>
                    </div>
                    {paymentMethod === 'cod' && <Check className="text-primary" size={24} />}
                  </div>
                </button>

                <button
                  onClick={() => toast.info('Online payment coming soon!')}
                  disabled
                  className="w-full text-left p-4 rounded-lg border-2 border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
                  type="button"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <CreditCard className="text-blue-600" size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Online Payment</p>
                      <p className="text-sm text-gray-600">UPI, Cards, Wallets (Coming Soon)</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Contact */}
            {merchant?.phone && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
                  <Phone className="text-primary" size={22} />
                  Restaurant contact
                </h2>
                <div className="flex gap-3 flex-wrap">
                  <a
                    className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 font-semibold text-sm inline-flex items-center gap-2"
                    href={`tel:${merchant.phone}`}
                  >
                    <Phone className="w-4 h-4" />
                    Call
                  </a>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg bg-green-100 hover:bg-green-200 text-green-800 font-semibold text-sm inline-flex items-center gap-2"
                    onClick={() =>
                      contactWhatsApp(merchant!.phone!, `Hi, I am placing an order. Merchant: ${merchant?.business_name || ''}`)
                    }
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
              <h2 className="text-xl font-bold mb-4">Order Summary</h2>

              <div className="space-y-3 mb-4 pb-4 border-b max-h-52 overflow-y-auto">
                {items.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-sm gap-3">
                    <span className="text-gray-600 flex-1">
                      {item.name} × {item.quantity}
                    </span>
                    <span className="font-semibold">
                      ₹{(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 mb-4 pb-4 border-b text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Item Total</span>
                  <span className="font-semibold">₹{computedSubtotal.toFixed(2)}</span>
                </div>

                {promoDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Promo Discount {promoCode ? `(${promoCode})` : ''}</span>
                    <span className="font-semibold">-₹{promoDiscount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery Fee</span>
                  <span className="font-semibold">₹{deliveryFee.toFixed(2)}</span>
                </div>

                <p className="text-xs text-gray-500">
                  {deliveryDistance > 0 ? `${deliveryDistance.toFixed(2)} km • ` : ''}
                  {deliveryBreakdown}
                </p>

                <div className="flex justify-between">
                  <span className="text-gray-600">
                    GST {gstEnabled && gstPct > 0 ? `(${gstPct}%)` : '(0%)'}
                  </span>
                  <span className="font-semibold">₹{tax.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-between mb-6 pt-2">
                <span className="text-lg font-bold">Total</span>
                <span className="text-2xl font-bold text-primary">₹{finalTotal.toFixed(2)}</span>
              </div>

              {!selectedAddress && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-800">Please select a delivery address to continue</p>
                  </div>
                </div>
              )}

              {selectedAddress && !isSelectedAddressComplete && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">Selected address must have a landmark and a 10-digit mobile number.</p>
                  </div>
                </div>
              )}

              {selectedAddress && (!shareLiveLocation || !liveLocation) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">Live location is required to place the order.</p>
                  </div>
                </div>
              )}

              <button
                onClick={handlePlaceOrder}
                disabled={placing || !selectedAddress || !isSelectedAddressComplete || !isLiveLocationReady}
                className="w-full bg-primary text-white py-4 rounded-xl hover:bg-orange-600 font-bold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {placing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Placing Order...
                  </>
                ) : (
                  `Place Order • ₹${finalTotal.toFixed(2)}`
                )}
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">By placing this order, you agree to our terms.</p>
            </div>
          </div>
        </div>

        {/* Address modal */}
        {showAddressModal && (
          <>
            <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowAddressModal(false)} />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-50 p-6 mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6">Add Delivery Address</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address Label</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Home', 'Work', 'Other'].map((label) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setNewAddress((p: any) => ({ ...p, label }))}
                        className={`p-3 rounded-lg border-2 font-medium transition-all ${
                          newAddress.label === label
                            ? 'border-primary bg-orange-50 text-primary'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Recipient name (optional)</label>
                    <input
                      value={newAddress.recipient_name}
                      onChange={(e) => setNewAddress((p: any) => ({ ...p, recipient_name: e.target.value }))}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                      placeholder="Name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Recipient phone (required)</label>
                    <input
                      value={newAddress.recipient_phone}
                      onChange={(e) => setNewAddress((p: any) => ({ ...p, recipient_phone: e.target.value }))}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                      placeholder="10-digit mobile number"
                      inputMode="numeric"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Flat/Floor (optional)</label>
                    <input
                      value={newAddress.apartment_floor}
                      onChange={(e) => setNewAddress((p: any) => ({ ...p, apartment_floor: e.target.value }))}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                      placeholder="E.g., 12B 2nd Floor"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Landmark (required)</label>
                    <input
                      value={newAddress.landmark}
                      onChange={(e) => setNewAddress((p: any) => ({ ...p, landmark: e.target.value }))}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                      placeholder="Near..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search & Select Address</label>
                  <AddressAutocomplete onSelect={handleAddressSelect} />
                  {newAddress.address && (
                    <div className="mt-3 bg-green-50 border-2 border-green-200 rounded-lg p-4">
                      <p className="text-sm font-semibold text-green-900 mb-1">Selected Address</p>
                      <p className="text-sm text-green-800">{newAddress.address}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery instructions (optional)</label>
                  <input
                    value={newAddress.delivery_instructions}
                    onChange={(e) => setNewAddress((p: any) => ({ ...p, delivery_instructions: e.target.value }))}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Call on arrival, Leave at gate, etc."
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="setDefault"
                    checked={!!newAddress.is_default}
                    onChange={(e) => setNewAddress((p: any) => ({ ...p, is_default: e.target.checked }))}
                    className="w-4 h-4 text-primary border-gray-300 rounded"
                  />
                  <label htmlFor="setDefault" className="text-sm text-gray-700">
                    Set as default address
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowAddressModal(false)}
                    className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-300 font-semibold"
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAddress}
                    disabled={!newAddress.address}
                    className="flex-1 bg-primary text-white px-6 py-3 rounded-xl hover:bg-orange-600 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    type="button"
                  >
                    Save & Select
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
