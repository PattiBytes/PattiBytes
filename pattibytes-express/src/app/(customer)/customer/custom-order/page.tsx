/* eslint-disable react-hooks/exhaustive-deps */
 
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter }  from 'next/navigation';
import { toast }      from 'react-toastify';
import {
  ArrowLeft, ClipboardList, Send, FileText,
  ShoppingBag, ListChecks, MessageSquare, Sparkles,
  MapPin, CreditCard, Wallet, Check, ChevronDown, ChevronUp,
  LocateFixed, Loader2, Info, Phone, Home, Briefcase,
  MapPinned, Tag, AlertCircle,
} from 'lucide-react';

import AppShell               from '@/components/common/AppShell';
import { supabase }           from '@/lib/supabase';
import { useAuth }            from '@/contexts/AuthContext';
import {
  locationService, type SavedAddress,
  calculateDeliveryFeeByDistance, getRoadDistanceKmViaApi,
} from '@/services/location';
import { appSettingsService } from '@/services/appSettings';

import {
  ShopProductPickerDropdown,
  type CustomProduct,
  type SelectedProduct,
} from './_components/ShopProductPickerDropdown';
import { ManualItemsForm, type ManualItem } from './_components/ManualItemsForm';
import { MyCustomOrders }                   from './_components/MyCustomOrders';

// ─── Constants ────────────────────────────────────────────────────────────────
const PATTI_HUB = { lat: 31.2837165, lon: 74.847114 };

const ALL_CATEGORIES = [
  'dairy', 'grocery', 'bakery', 'beverages', 'snacks',
  'electronics', 'clothing', 'medicines', 'stationery', 'other',
];

const CATEGORY_EMOJIS: Record<string, string> = {
  dairy: '🥛', grocery: '🛒', bakery: '🍞', beverages: '🧃',
  snacks: '🍿', electronics: '🔌', clothing: '👕',
  medicines: '💊', stationery: '✏️', other: '📦',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeRef() {
  return `PBX-CUST-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}
const round2 = (n: number) => Math.round(n * 100) / 100;
function normalizePhone(v: string) { return String(v || '').replace(/\D/g, ''); }

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatAddress(a: SavedAddress): string {
  const lines: string[] = [];
  if (a.address) lines.push(a.address);
  const extra: string[] = [];
  if ((a as any).apartmentfloor)   extra.push(`Flat/Floor: ${(a as any).apartmentfloor}`);
  if ((a as any).apartment_floor)  extra.push(`Flat/Floor: ${(a as any).apartment_floor}`);
  if ((a as any).landmark)         extra.push(`Landmark: ${(a as any).landmark}`);
  if (extra.length) lines.push(extra.join(' • '));
  const city = [
    a.city, a.state,
    (a as any).postalcode || (a as any).postal_code,
  ].filter(Boolean).join(', ');
  if (city) lines.push(city);
  return lines.join('\n');
}

function AddrIcon({ label }: { label: string }) {
  switch (String(label || '').toLowerCase()) {
    case 'home': return <Home className="w-4 h-4" />;
    case 'work': return <Briefcase className="w-4 h-4" />;
    default:     return <MapPinned className="w-4 h-4" />;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────
type LiveLocation = { lat: number; lng: number; accuracy?: number; updated_at: string };
type Tab = 'new' | 'history';

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CustomOrderPage() {
  const router   = useRouter();
  const { user } = useAuth();

  const [tab, setTab] = useState<Tab>('new');

  // items
  const [selectedMap, setSelectedMap] = useState<Map<string, SelectedProduct>>(new Map());
  const [manualItems, setManualItems] = useState<ManualItem[]>([]);

  // form meta
  const [categories, setCategories] = useState<string[]>([]);
  const [notes,      setNotes]      = useState('');

  // address
  const [savedAddresses,  setSavedAddresses]  = useState<SavedAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<SavedAddress | null>(null);
  const [showAddrPicker,  setShowAddrPicker]  = useState(false);
  const [addrLoading,     setAddrLoading]     = useState(false);

  // delivery
  const [deliveryFee,       setDeliveryFee]       = useState(0);
  const [deliveryKm,        setDeliveryKm]        = useState(0);
  const [deliveryBreakdown, setDeliveryBreakdown] = useState('');
  const [deliveryLoading,   setDeliveryLoading]   = useState(false);
  const policyRef = useRef<any>(null);

  // payment
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('cod');

  // live location
  const [shareLive,    setShareLive]    = useState(false);
  const [liveLocation, setLiveLocation] = useState<LiveLocation | null>(null);
  const [locChecking,  setLocChecking]  = useState(false);
  const watchIdRef  = useRef<number | null>(null);
  const lastSentRef = useRef<number>(0);

  // submit
  const [submitting,   setSubmitting]   = useState(false);
  const [submitted,    setSubmitted]    = useState(false);
  const [submittedRef, setSubmittedRef] = useState('');

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    loadData();
  }, [user]);

  useEffect(() => () => stopSharing(), []);

  useEffect(() => {
    if (!shareLive) { stopSharing(); return; }
    startWatch();
  }, [shareLive]);

  const loadData = async () => {
    if (!user) return;
    appSettingsService.getDeliveryPolicyNow()
      .then(p => { policyRef.current = p; })
      .catch(() => {});

    setAddrLoading(true);
    try {
      const addrs = await locationService.getSavedAddresses(user.id);
      setSavedAddresses(addrs);
      const def =
        addrs.find(a => (a as any).isdefault || (a as any).is_default) ||
        addrs[0] ||
        null;
      if (def) {
        setSelectedAddress(def);
        computeFee(def);
      }
    } catch {
      toast.error('Failed to load saved addresses');
    } finally {
      setAddrLoading(false);
    }
  };

  // ── Delivery fee ───────────────────────────────────────────────────────────
  const computeFee = useCallback(async (addr: SavedAddress) => {
    const destLat = Number((addr as any).latitude);
    const destLon = Number((addr as any).longitude);
    if (!Number.isFinite(destLat) || destLat === 0) {
      setDeliveryFee(0);
      setDeliveryKm(0);
      setDeliveryBreakdown('Address coordinates missing');
      return;
    }

    const policy = policyRef.current || {
      enabled: true, baseFee: 35, baseRadiusKm: 3, perKmFeeAfterBase: 15,
    };

    setDeliveryLoading(true);
    try {
      let km: number;
      let label: string;
      try {
        km    = await getRoadDistanceKmViaApi(PATTI_HUB.lat, PATTI_HUB.lon, destLat, destLon);
        label = 'Road';
      } catch {
        km    = haversineKm(PATTI_HUB.lat, PATTI_HUB.lon, destLat, destLon);
        label = 'Aerial est.';
      }
      const q = calculateDeliveryFeeByDistance(km, {
        enabled:        policy.enabled,
        baseFee:        policy.baseFee,
        baseKm:         policy.baseRadiusKm,
        perKmBeyondBase: policy.perKmFeeAfterBase,
        rounding:       'ceil',
      });
      setDeliveryFee(q.fee);
      setDeliveryKm(round2(km));
      setDeliveryBreakdown(`${label}: ${q.breakdown}`);
    } catch {
      setDeliveryFee(35);
      setDeliveryKm(0);
      setDeliveryBreakdown('Using default fee');
    } finally {
      setDeliveryLoading(false);
    }
  }, []);

  const selectAddress = (addr: SavedAddress) => {
    setSelectedAddress(addr);
    setShowAddrPicker(false);
    computeFee(addr);
  };

  // ── Live location ──────────────────────────────────────────────────────────
  const stopSharing = () => {
    try {
      if (watchIdRef.current != null) navigator.geolocation?.clearWatch(watchIdRef.current);
    } catch { /* noop */ }
    watchIdRef.current = null;
  };

  const startWatch = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) return;
    if (watchIdRef.current != null) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => {
        const now = Date.now();
        if (now - lastSentRef.current < 5000) return;
        lastSentRef.current = now;
        setLiveLocation({
          lat: pos.coords.latitude, lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy, updated_at: new Date().toISOString(),
        });
      },
      err => { console.error(err); toast.error('Live location failed'); stopSharing(); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const verifyLocation = async () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    setLocChecking(true);
    try {
      await new Promise<void>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(
          pos => {
            setLiveLocation({
              lat: pos.coords.latitude, lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy, updated_at: new Date().toISOString(),
            });
            resolve();
          },
          reject,
          { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
        )
      );
      toast.success('Live location enabled ✓');
    } catch {
      toast.error('Allow location permission and try again.');
    } finally {
      setLocChecking(false);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const selectedIds  = useMemo(() => new Set(selectedMap.keys()), [selectedMap]);
  const shopSubtotal = useMemo(
    () => [...selectedMap.values()].reduce((a, p) => a + p.price * p.qty, 0),
    [selectedMap]
  );
  const totalItems = useMemo(
    () => selectedMap.size + manualItems.filter(it => it.name.trim()).length,
    [selectedMap, manualItems]
  );
  const estTotal   = useMemo(() => round2(shopSubtotal + deliveryFee), [shopSubtotal, deliveryFee]);
  const isLiveReady = useMemo(
    () => shareLive && !!liveLocation?.lat && !!liveLocation?.lng,
    [shareLive, liveLocation]
  );
  const canSubmit = totalItems > 0 && !!selectedAddress && isLiveReady && !submitting;
  const hasManual = manualItems.some(it => it.name.trim());

  // ── Category toggle ────────────────────────────────────────────────────────
  const toggleCat = (c: string) =>
    setCategories(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  // ── Product helpers ────────────────────────────────────────────────────────
  const toggleProduct = (p: CustomProduct) => {
    setSelectedMap(prev => {
      const next = new Map(prev);
      if (next.has(p.id)) next.delete(p.id);
      else next.set(p.id, { ...p, qty: 1 });
      return next;
    });
  };

  const updateQty = (id: string, qty: number) => {
    setSelectedMap(prev => {
      const next = new Map(prev);
      const p = next.get(id);
      if (!p) return prev;
      if (qty < 1) { next.delete(id); return next; }
      next.set(id, { ...p, qty: Math.min(qty, 99) });
      return next;
    });
  };

  // ── Build items for DB ─────────────────────────────────────────────────────
  const buildItems = () => [
    ...[...selectedMap.values()].map(p => ({
      id: p.id, name: p.name, note: null, price: p.price,
      is_veg: null, is_free: false, category: p.category,
      quantity: p.qty, image_url: p.imageurl, unit: p.unit,
      merchant_id: null, menu_item_id: p.id,
      is_custom_product: true, discount_percentage: 0,
    })),
    ...manualItems.filter(it => it.name.trim()).map(it => ({
      id: it.id, name: it.name.trim(), note: it.description.trim() || null,
      price: 0, is_veg: null, is_free: false, category: null,
      quantity: it.quantity, image_url: null, unit: it.unit,
      merchant_id: null, menu_item_id: it.id,
      is_custom_product: false, discount_percentage: 0,
    })),
  ];

  // ── Submit ─────────────────────────────────────────────────────────────────
// ── Submit ─────────────────────────────────────────────────────────────────
const handleSubmit = async () => {
  if (!user)            { router.push('/login'); return; }
  const allItems = buildItems();
  if (!allItems.length) { toast.error('Add at least one item'); return; }
  if (!selectedAddress) { toast.error('Please select a delivery address'); return; }
  if (!isLiveReady)     { toast.error('Enable & verify live location first'); return; }
  if (paymentMethod === 'online') { toast.info('Online payment coming soon!'); return; }

  setSubmitting(true);
  try {
    const ref      = makeRef();
    const a        = selectedAddress as any;
    const now      = new Date().toISOString();
    const phone    = normalizePhone(a.recipient_phone || a.recipientphone || '') || null;
    const addrStr  = formatAddress(selectedAddress);
    const destLat  = Number(a.latitude)  || null;
    const destLng  = Number(a.longitude) || null;
    const category = categories.length ? categories.join(', ') : 'custom';

    // ── Step 1: Insert into `orders` (returns the new row id) ──────────────
    const { data: orderRow, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_id:           user.id,
        merchant_id:           null,          // no restaurant for custom orders
        driver_id:             null,
        status:                'pending',
        order_type:            'custom',
        subtotal:              shopSubtotal,
        delivery_fee:          deliveryFee,
        tax:                   0,
        discount:              0,
        total_amount:          estTotal > 0 ? estTotal : null,
        payment_method:        paymentMethod,
        payment_status:        'pending',
        delivery_address:      addrStr,
        delivery_latitude:     destLat,
        delivery_longitude:    destLng,
        delivery_address_id:   a.id   || null,
        delivery_address_label: a.label || null,
        recipient_name:        a.recipient_name || a.recipientname || null,
        delivery_instructions: notes.trim() || null,
        customer_notes:        notes.trim() || null,
        customer_phone:        phone,
        customer_location:     liveLocation
          ? {
              lat:        liveLocation.lat,
              lng:        liveLocation.lng,
              accuracy:   liveLocation.accuracy ?? null,
              updated_at: liveLocation.updated_at,
            }
          : null,
        items:                 allItems,
        delivery_distance_km:  deliveryKm || null,
        hub_origin:            JSON.stringify(PATTI_HUB),
        // custom-order specific columns
        custom_order_ref:      ref,
        custom_order_status:   'pending',
        custom_category:       category,
        custom_image_url:      null,
        quoted_amount:         null,
        quote_message:         null,
        platform_handled:      false,
        created_at:            now,
        updated_at:            now,
      })
      .select('id')
      .single();

    if (orderError) throw orderError;

    // ── Step 2: Insert into `custom_order_requests` linked to the order ────
    const { error: cusError } = await supabase
      .from('custom_order_requests')
      .insert({
        order_id:         orderRow.id,   // cross-link to orders table
        customer_id:      user.id,
        custom_order_ref: ref,
        category:         category,
        description:      notes.trim() || null,
        image_url:        null,
        items:            allItems,
        status:           'pending',
        delivery_address: addrStr,
        delivery_lat:     destLat,
        delivery_lng:     destLng,
        total_amount:     estTotal > 0 ? estTotal : null,
        delivery_fee:     deliveryFee   || null,
        payment_method:   paymentMethod,
        customer_phone:   phone,
        created_at:       now,
        updated_at:       now,
      });

    if (cusError) throw cusError;

    setSubmittedRef(ref);
    setSubmitted(true);
    toast.success('Custom order submitted!');
  } catch (e: any) {
    toast.error(e?.message || 'Failed to submit order');
  } finally {
    setSubmitting(false);
  }
};


  // ── Reset form ─────────────────────────────────────────────────────────────
  const resetForm = () => {
    setSelectedMap(new Map());
    setManualItems([]);
    setNotes('');
    setCategories([]);
    setSubmitted(false);
  };

  // ══════════════════════════════════════════════════════════════════════════
  // SUCCESS SCREEN
  // ══════════════════════════════════════════════════════════════════════════
  if (submitted) {
    return (
      <AppShell title="Custom Order">
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50
                        flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-md text-center">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full
                            bg-gradient-to-br from-purple-500 to-pink-500
                            flex items-center justify-center shadow-2xl">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 mb-2">Submitted! 🎉</h1>
            <p className="text-gray-600 font-semibold mb-2">Your reference number:</p>
            <div className="inline-block bg-white border-2 border-purple-300 rounded-2xl
                            px-6 py-3 mb-6 shadow-xl">
              <span className="text-xl font-black text-purple-600 tracking-widest">
                {submittedRef}
              </span>
            </div>
            <p className="text-sm text-gray-500 font-medium mb-8 leading-6">
              Our team will review your request and send you a quote.
              Check <strong>My Requests</strong> for updates.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => { setTab('history'); setSubmitted(false); }}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white
                           py-4 rounded-2xl font-black shadow-lg hover:shadow-xl
                           hover:scale-[1.02] transition-all"
              >
                View My Requests
              </button>
              <button
                onClick={resetForm}
                className="w-full bg-white border-2 border-gray-200 text-gray-800
                           py-4 rounded-2xl font-black hover:bg-gray-50 transition"
              >
                Make Another Request
              </button>
              <button
                onClick={() => router.push('/customer/dashboard')}
                className="w-full text-sm text-gray-400 font-semibold hover:text-gray-600 py-2"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <AppShell title="Custom Order">
      <div className="bg-gradient-to-br from-purple-50 via-white to-pink-50 min-h-screen">

        {/* ── Header (NOT fixed — scrolls with page) ─────────────────────── */}
        <div className="bg-white border-b border-gray-100 shadow-sm">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center
                         hover:bg-gray-200 transition active:scale-95"
            >
              <ArrowLeft className="w-5 h-5 text-gray-800" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-black text-gray-900">Custom Order</h1>
              <p className="text-xs text-gray-500 font-medium">
                Request anything · not in the shop? We&apos;ll get it
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500
                            flex items-center justify-center shadow">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
          </div>

          {/* Tab bar */}
          <div className="max-w-2xl mx-auto px-4 flex gap-1 border-t border-gray-50">
            {([
              { key: 'new',     Icon: ShoppingBag, label: 'New Request' },
              { key: 'history', Icon: ListChecks,  label: 'My Requests' },
            ] as { key: Tab; Icon: React.ElementType; label: string }[]).map(({ key, Icon, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-black
                            border-b-2 transition-colors ${
                  tab === key
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-400 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
        {/* ── END header ─────────────────────────────────────────────────── */}

        {/* ── HISTORY TAB ────────────────────────────────────────────────── */}
        {tab === 'history' && (
          <div className="max-w-2xl mx-auto px-4 py-6 pb-16">
            <MyCustomOrders />
          </div>
        )}

        {/* ── NEW REQUEST TAB ─────────────────────────────────────────────── */}
        {tab === 'new' && (
          <div
            className="max-w-2xl mx-auto px-4 py-5 space-y-4"
            style={{ paddingBottom: '180px' }}
          >
            {/* How it works */}
            <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-4
                            flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-purple-900 text-sm">How it works</p>
                <p className="text-xs text-purple-700 font-medium mt-0.5 leading-5">
                  Pick from shop or describe items → We quote →
                  You confirm → We deliver from Patti hub 🚴
                </p>
              </div>
            </div>

            {/* ── Categories ─────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-4 h-4 text-purple-500" />
                <h2 className="text-sm font-black text-gray-900">Categories</h2>
                <span className="text-xs text-gray-400 font-medium">(select all that apply)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {ALL_CATEGORIES.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCat(c)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs
                                font-black capitalize border-2 transition-all active:scale-95 ${
                      categories.includes(c)
                        ? 'bg-purple-500 border-purple-500 text-white shadow-sm'
                        : 'border-gray-200 text-gray-600 hover:border-purple-300 hover:bg-purple-50'
                    }`}
                  >
                    <span>{CATEGORY_EMOJIS[c] ?? '📦'}</span>
                    {c}
                    {categories.includes(c) && <Check className="w-3 h-3 ml-0.5" />}
                  </button>
                ))}
              </div>
              {categories.length > 0 && (
                <p className="mt-2 text-xs text-purple-600 font-semibold">
                  Selected: {categories.join(', ')}
                </p>
              )}
            </div>

            {/* ── Shop product picker ─────────────────────────────────────── */}
            <ShopProductPickerDropdown
              selectedIds={selectedIds}
              selectedMap={selectedMap}
              onToggle={toggleProduct}
              onUpdateQty={updateQty}
            />

            {/* ── Manual items ────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-4">
              <ManualItemsForm items={manualItems} onChange={setManualItems} />
            </div>

            {/* ── Notes ──────────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-4">
              <label className="text-sm font-black text-gray-800 mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                Additional Notes
                <span className="text-xs font-medium text-gray-400 ml-1">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Brand preference, delivery timing, special instructions…"
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm
                           font-semibold bg-gray-50 resize-none focus:ring-2
                           focus:ring-primary focus:border-primary transition"
              />
              <p className="text-right text-xs text-gray-400 mt-1 font-medium">
                {notes.length}/500
              </p>
            </div>

            {/* ── Delivery address ────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-black text-gray-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Delivery Address
                </h2>
                {savedAddresses.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setShowAddrPicker(p => !p)}
                    className="text-xs font-black text-purple-600 hover:text-purple-800
                               flex items-center gap-1 transition"
                  >
                    Change
                    {showAddrPicker
                      ? <ChevronUp className="w-3.5 h-3.5" />
                      : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              {addrLoading ? (
                <div className="flex items-center gap-2 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                  <span className="text-sm text-gray-400 font-medium">Loading addresses…</span>
                </div>
              ) : selectedAddress ? (
                <>
                  {/* Selected card */}
                  <div className="flex items-start gap-3 p-3 bg-orange-50 border-2
                                  border-primary rounded-xl">
                    <div className="text-primary mt-0.5">
                      <AddrIcon label={(selectedAddress as any).label ?? ''} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <p className="text-sm font-black text-gray-900">
                          {(selectedAddress as any).label}
                        </p>
                        {((selectedAddress as any).isdefault || (selectedAddress as any).is_default) && (
                          <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 font-medium whitespace-pre-line">
                        {formatAddress(selectedAddress)}
                      </p>
                      {((selectedAddress as any).recipient_phone || (selectedAddress as any).recipientphone) && (
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {(selectedAddress as any).recipient_phone ||
                           (selectedAddress as any).recipientphone}
                        </p>
                      )}
                    </div>
                    <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  </div>

                  {/* Distance + fee chips */}
                  {deliveryLoading ? (
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Calculating delivery fee…
                    </div>
                  ) : deliveryKm > 0 ? (
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-xs bg-blue-50
                                       border border-blue-200 text-blue-700 font-semibold
                                       px-2.5 py-1 rounded-full">
                        📍 {deliveryKm.toFixed(1)} km from hub
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs bg-green-50
                                       border border-green-200 text-green-700 font-semibold
                                       px-2.5 py-1 rounded-full">
                        🚴 ₹{deliveryFee.toFixed(2)} delivery
                      </span>
                    </div>
                  ) : null}

                  {/* Breakdown */}
                  {deliveryBreakdown ? (
                    <p className="mt-1 text-xs text-gray-400 font-medium flex items-center gap-1">
                      <Info className="w-3 h-3 flex-shrink-0" />
                      {deliveryBreakdown}
                    </p>
                  ) : null}
                </>
              ) : (
                <div className="text-center py-6 bg-gray-50 rounded-xl border-2 border-dashed
                                border-gray-200">
                  <MapPin className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500 font-medium">No saved addresses found</p>
                  <button
                    type="button"
                    onClick={() => router.push('/customer/addresses')}
                    className="mt-2 text-xs font-black text-primary hover:underline"
                  >
                    Add an address →
                  </button>
                </div>
              )}

              {/* Address picker list */}
              {showAddrPicker && savedAddresses.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-wide mb-2">
                    Choose address
                  </p>
                  {savedAddresses.map(addr => {
                    const a = addr as any;
                    const isSel = selectedAddress?.id === addr.id;
                    return (
                      <button
                        key={addr.id}
                        type="button"
                        onClick={() => selectAddress(addr)}
                        className={`w-full text-left p-3 rounded-xl border-2 transition-all
                                    flex items-start gap-3 ${
                          isSel
                            ? 'border-primary bg-orange-50'
                            : 'border-gray-200 hover:border-purple-200 hover:bg-purple-50'
                        }`}
                      >
                        <div className={isSel ? 'text-primary' : 'text-gray-400'}>
                          <AddrIcon label={a.label ?? ''} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-gray-900">{a.label}</p>
                          <p className="text-xs text-gray-500 font-medium truncate">
                            {a.address}
                          </p>
                        </div>
                        {isSel && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Live location ────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-4">
              <h2 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2">
                <LocateFixed className="w-4 h-4 text-green-500" />
                Live Location
                <span className="text-red-500 text-xs font-black ml-1">* required</span>
              </h2>

              <div className={`rounded-xl border-2 p-3 transition-all ${
                isLiveReady
                  ? 'bg-green-50 border-green-300'
                  : 'bg-orange-50 border-orange-200'
              }`}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={shareLive}
                    onChange={e => setShareLive(e.target.checked)}
                    className="mt-1 w-4 h-4 accent-purple-500"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-black text-gray-900">Share live location</p>
                    <p className="text-xs text-gray-600 font-medium mt-0.5 leading-4">
                      Required to place the order. Helps the delivery agent find you accurately.
                    </p>

                    {shareLive && (
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={verifyLocation}
                          disabled={locChecking}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                                     bg-white border border-orange-200 hover:bg-orange-50
                                     text-xs font-black transition disabled:opacity-60"
                        >
                          {locChecking
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <LocateFixed className="w-3.5 h-3.5" />}
                          {locChecking ? 'Getting location…' : 'Verify now'}
                        </button>

                        {isLiveReady ? (
                          <span className="text-xs font-black text-green-700 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            Active ·{' '}
                            {new Date(liveLocation!.updated_at).toLocaleTimeString('en-IN', {
                              hour: '2-digit', minute: '2-digit', second: '2-digit',
                            })}
                          </span>
                        ) : (
                          <span className="text-xs text-red-600 font-semibold flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Not verified yet
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Payment method ───────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-4">
              <h2 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-500" />
                Payment Method
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {/* COD */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cod')}
                  className={`p-3 rounded-xl border-2 transition-all text-left ${
                    paymentMethod === 'cod'
                      ? 'border-green-500 bg-green-50 shadow-sm'
                      : 'border-gray-200 hover:border-green-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-green-600" />
                    </div>
                    {paymentMethod === 'cod' && (
                      <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-black text-gray-900">Cash on Delivery</p>
                  <p className="text-xs text-gray-500 font-medium">Pay on receipt</p>
                </button>

                {/* Online — disabled */}
                <button
                  type="button"
                  onClick={() => toast.info('Online payment coming soon!')}
                  className="p-3 rounded-xl border-2 border-gray-200 bg-gray-50
                             opacity-60 cursor-not-allowed text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center
                                  justify-center mb-1.5">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-xs font-black text-gray-900">Online Payment</p>
                  <p className="text-xs text-blue-500 font-semibold">Coming soon</p>
                </button>
              </div>
            </div>

            {/* ── Order preview + estimate ─────────────────────────────────── */}
            {totalItems > 0 && (
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2
                              border-purple-200 rounded-2xl p-4 space-y-3">
                <h3 className="text-sm font-black text-purple-900 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Order Preview &amp; Estimate
                </h3>

                <ul className="space-y-1.5">
                  {[...selectedMap.values()].map(p => (
                    <li key={p.id}
                      className="flex items-center gap-2 text-xs text-purple-800 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                      <span className="flex-1">{p.qty} {p.unit ?? 'pc'} — {p.name}</span>
                      <span className="text-purple-600 font-black">
                        ₹{(p.price * p.qty).toFixed(2)}
                      </span>
                    </li>
                  ))}
                  {manualItems.filter(it => it.name.trim()).map(it => (
                    <li key={it.id}
                      className="flex items-center gap-2 text-xs text-pink-700 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-pink-400 flex-shrink-0" />
                      <span className="flex-1">{it.quantity} {it.unit} — {it.name.trim()}</span>
                      <span className="text-gray-400 text-xs italic">custom</span>
                    </li>
                  ))}
                </ul>

                <div className="bg-white/70 rounded-xl p-3 space-y-1.5 border border-purple-100">
                  <div className="flex justify-between text-xs font-semibold text-gray-700">
                    <span>Shop items</span>
                    <span>₹{shopSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold text-gray-700">
                    <span className="flex items-center gap-1">
                      Delivery fee
                      {deliveryLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                    </span>
                    <span>{deliveryLoading ? '…' : `₹${deliveryFee.toFixed(2)}`}</span>
                  </div>
                  {hasManual && (
                    <div className="flex justify-between text-xs text-gray-500 font-medium">
                      <span>Custom items price</span>
                      <span className="italic">TBD on quote</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black text-gray-900
                                  pt-1.5 border-t border-purple-100">
                    <span>Estimated Total</span>
                    <span className="text-purple-700">
                      {deliveryLoading ? '…' : `₹${estTotal.toFixed(2)}`}
                      {hasManual ? '+' : ''}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-purple-500 font-medium">
                  * Final price confirmed after admin review. Custom items priced separately.
                </p>
              </div>
            )}

            {/* ── Validation banners ───────────────────────────────────────── */}
            {totalItems > 0 && !selectedAddress && (
              <div className="flex items-start gap-2 bg-red-50 border-2 border-red-200
                              rounded-xl p-3">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-red-700">
                  Please select a delivery address to continue.
                </p>
              </div>
            )}
            {totalItems > 0 && !!selectedAddress && !isLiveReady && (
              <div className="flex items-start gap-2 bg-red-50 border-2 border-red-200
                              rounded-xl p-3">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-red-700">
                  Live location must be enabled and verified before submitting.
                </p>
              </div>
            )}

          </div>
          // ← THIS WAS THE CRASH — replaced below with JSX comment
        )}
        {/* END new request tab */}

        {/* ── Sticky submit bar — new tab only ─────────────────────────────── */}
        {tab === 'new' && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md
                          border-t border-gray-100 shadow-2xl"
               style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <div className="max-w-2xl mx-auto px-4 py-3">

              {totalItems > 0 && (
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs text-gray-500 font-semibold">
                    {totalItems} item{totalItems > 1 ? 's' : ''}
                    {selectedAddress
                      ? ` · ${deliveryKm > 0 ? `${deliveryKm.toFixed(1)} km` : 'address selected'}`
                      : ' · no address'}
                  </span>
                  <span className="text-sm font-black text-purple-600">
                    {deliveryLoading
                      ? 'Calculating…'
                      : estTotal > 0
                        ? `Est. ₹${estTotal.toFixed(2)}${hasManual ? '+' : ''}`
                        : ''}
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white
                           py-4 rounded-2xl font-black shadow-xl hover:shadow-2xl
                           hover:scale-[1.01] transition-all disabled:opacity-50
                           disabled:cursor-not-allowed disabled:scale-100
                           flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit Request
                    {totalItems > 0 && (
                      <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-black">
                        {totalItems} item{totalItems > 1 ? 's' : ''}
                      </span>
                    )}
                  </>
                )}
              </button>

              {!canSubmit && totalItems > 0 && (
                <p className="text-center text-xs text-gray-400 font-medium mt-1.5">
                  {!selectedAddress
                    ? '⚠️ Select a delivery address'
                    : !isLiveReady
                      ? '⚠️ Enable & verify live location'
                      : ''}
                </p>
              )}

              <p className="text-center text-xs text-gray-400 font-medium mt-1.5">
                We&apos;ll send you a quote before processing payment
              </p>
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}

