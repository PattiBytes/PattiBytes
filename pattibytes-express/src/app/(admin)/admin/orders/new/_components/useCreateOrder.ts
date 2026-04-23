/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { calculateDeliveryFeeByDistance, getRoadDistanceKmViaApi } from '@/services/location';
import appSettingsService from '@/services/appSettings';

import {
  type MerchantRow, type CustomerMini, type MenuItemRow, type CustomProductRow,
  type PromoCode, type OrderItemCompat, type AddressSuggestion,
  type OrderType, type CustomerMode, type PaymentMethod, type PaymentStatus,
} from './types';
import { nNum, round2, downloadText, generateCustomRef } from './utils';

export function useCreateOrder() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const isAdmin = useMemo(() => {
    const role = String((user as any)?.role ?? '').toLowerCase();
    return role === 'admin' || role === 'superadmin';
  }, [user]);

  const [bootLoading, setBootLoading] = useState(true);
  const [submitting,  setSubmitting]  = useState(false);

  // ── Order type ────────────────────────────────────────────────────────────
  const [orderType, setOrderType] = useState<OrderType>('restaurant');

  // ── Merchant ──────────────────────────────────────────────────────────────
  const [merchants,  setMerchants]  = useState<MerchantRow[]>([]);
  const [merchantId, setMerchantId] = useState('');
  const merchant = useMemo(
    () => merchants.find(m => m.id === merchantId) ?? null,
    [merchants, merchantId]
  );

  // ── Customer ──────────────────────────────────────────────────────────────
  const [customerMode,     setCustomerMode]     = useState<CustomerMode>('walkin');
  const [customerQuery,    setCustomerQuery]    = useState('');
  const [customerSearching,setCustomerSearching]= useState(false);
  const [customerResults,  setCustomerResults]  = useState<CustomerMini[]>([]);
  const [customerId,       setCustomerId]       = useState('');
  const selectedCustomer = useMemo(
    () => customerResults.find(c => c.id === customerId) ?? null,
    [customerResults, customerId]
  );
  const [walkinName,  setWalkinName]  = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');

  // Phone-match (walk-in mode)
  const [phoneMatchResult,  setPhoneMatchResult]  = useState<CustomerMini | null>(null);
  const [phoneMatchLoading, setPhoneMatchLoading] = useState(false);
  const [linkedCustomerId,  setLinkedCustomerId]  = useState<string | null>(null);

  // ── Delivery address ──────────────────────────────────────────────────────
  const [addressQuery,       setAddressQuery]       = useState('');
  const [addressSearching,   setAddressSearching]   = useState(false);
  const [addressOptions,     setAddressOptions]     = useState<AddressSuggestion[]>([]);
  const [showAddressDropdown,setShowAddressDropdown]= useState(false);
  const [deliveryAddress,    setDeliveryAddress]    = useState('');
  const [deliveryLat,        setDeliveryLat]        = useState<number | null>(null);
  const [deliveryLng,        setDeliveryLng]        = useState<number | null>(null);

  // ── Menu ──────────────────────────────────────────────────────────────────
  const [menuLoading,          setMenuLoading]          = useState(false);
  const [menuSearch,           setMenuSearch]           = useState('');
  const [vegOnly,              setVegOnly]              = useState(false);
  const [menuItems,            setMenuItems]            = useState<MenuItemRow[]>([]);
  const [customProducts,       setCustomProducts]       = useState<CustomProductRow[]>([]);
  const [expandedCategories,   setExpandedCategories]   = useState<Set<string>>(new Set());

  // ── Promo ─────────────────────────────────────────────────────────────────
  const [promoCodes,       setPromoCodes]       = useState<PromoCode[]>([]);
  const [selectedPromoCode,setSelectedPromoCode]= useState('');
  const [promoApplied,     setPromoApplied]     = useState(false);
  const [promoDiscount,    setPromoDiscount]    = useState(0);

  // ── Cart items ────────────────────────────────────────────────────────────
  const [items, setItems] = useState<OrderItemCompat[]>([]);

  // ── Custom order extra fields ─────────────────────────────────────────────
  const [customCategory,    setCustomCategory]    = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customImageUrl,    setCustomImageUrl]    = useState('');

  // ── Charges ───────────────────────────────────────────────────────────────
  const [deliveryDistanceKm, setDeliveryDistanceKm] = useState(0);
  const [deliveryFee,   setDeliveryFee]   = useState(0);
  const [tax,           setTax]           = useState(0);
  const [discount,      setDiscount]      = useState(0);
  const [extraCharges,  setExtraCharges]  = useState(0);
  const [autoGst,       setAutoGst]       = useState(true);

  // ── Order meta ────────────────────────────────────────────────────────────
  const [status,               setStatus]               = useState('pending');
  const [paymentMethod,        setPaymentMethod]        = useState<PaymentMethod>('cod');
  const [paymentStatus,        setPaymentStatus]        = useState<PaymentStatus>('pending');
  const [customerNotes,        setCustomerNotes]        = useState('');
  const [specialInstructions,  setSpecialInstructions]  = useState('');
  const [recipientName,        setRecipientName]        = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');

  // ── Bulk upload ───────────────────────────────────────────────────────────
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkBusy,      setBulkBusy]      = useState(false);
  const [bulkText,      setBulkText]      = useState('');

  // Refs
  const addrTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const custTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phoneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef    = useRef<HTMLInputElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);

  // ── Computed ──────────────────────────────────────────────────────────────
  const subtotal = useMemo(() => round2(
    items.reduce((sum, it) => {
      const qty  = Math.max(1, nNum(it.quantity, 1));
      const p    = nNum(it.price, 0);
      const disc = nNum(it.discount_percentage, 0);
      return sum + (disc > 0 ? p * (1 - disc / 100) : p) * qty;
    }, 0)
  ), [items]);

  const itemDiscountTotal = useMemo(() => round2(
    items.reduce((sum, it) => {
      const qty  = Math.max(1, nNum(it.quantity, 1));
      const p    = nNum(it.price, 0);
      const disc = nNum(it.discount_percentage, 0);
      return sum + (disc > 0 ? p * (disc / 100) * qty : 0);
    }, 0)
  ), [items]);

  const taxableBase = useMemo(
    () => Math.max(0, subtotal - round2(discount) - round2(promoDiscount)),
    [subtotal, discount, promoDiscount]
  );

  const totalAmount = useMemo(
    () => round2(taxableBase + round2(deliveryFee) + round2(extraCharges) + round2(tax)),
    [taxableBase, deliveryFee, extraCharges, tax]
  );

  // Auto-GST
  useEffect(() => {
    if (!autoGst || !merchant?.gst_enabled) { setTax(0); return; }
    const pct = nNum(merchant.gst_percentage, 0);
    setTax(pct > 0 ? round2((taxableBase * pct) / 100) : 0);
  }, [autoGst, merchant?.gst_enabled, merchant?.gst_percentage, taxableBase]);

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!user)    { router.replace('/login?redirect=/admin/orders/new'); return; }
    if (!isAdmin) { router.replace('/'); return; }

    (async () => {
      setBootLoading(true);
      try {
        const { data, error } = await supabase
          .from('merchants')
          .select('id,business_name,address,latitude,longitude,phone,gst_enabled,gst_percentage,city,state')
          .eq('is_active', true)
          .order('business_name');
        if (error) throw error;
        setMerchants((data as any) ?? []);
      } catch (e: any) {
        toast.error(e?.message ?? 'Failed to load merchants');
      } finally {
        setBootLoading(false);
      }
    })();
  }, [authLoading, user, isAdmin, router]);

  // ── Existing-customer search ──────────────────────────────────────────────
  useEffect(() => {
    if (customerMode !== 'existing') return;
    const q = customerQuery.trim();
    if (q.length < 2) { setCustomerResults([]); setCustomerId(''); return; }

    if (custTimer.current) clearTimeout(custTimer.current);
    setCustomerSearching(true);

    custTimer.current = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id,full_name,phone,email,role')
          .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`)
          .limit(20);
        if (error) throw error;
        setCustomerResults(((data as any[]) ?? []).filter(p => {
          const r = String(p.role ?? '').toLowerCase();
          return !r || r === 'customer' || r === 'user';
        }));
      } catch { setCustomerResults([]); }
      finally  { setCustomerSearching(false); }
    }, 400);
    return () => { if (custTimer.current) clearTimeout(custTimer.current); };
  }, [customerMode, customerQuery]);

  // ── Walk-in phone match ───────────────────────────────────────────────────
  useEffect(() => {
    if (customerMode !== 'walkin') { setPhoneMatchResult(null); return; }
    const phone = walkinPhone.trim().replace(/\D/g, '');
    if (phone.length < 10) { setPhoneMatchResult(null); setLinkedCustomerId(null); return; }

    if (phoneTimer.current) clearTimeout(phoneTimer.current);
    setPhoneMatchLoading(true);

    phoneTimer.current = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id,full_name,phone,email')
          .eq('phone', phone)
          .maybeSingle();
        setPhoneMatchResult(data as any ?? null);
      } catch { setPhoneMatchResult(null); }
      finally  { setPhoneMatchLoading(false); }
    }, 600);
    return () => { if (phoneTimer.current) clearTimeout(phoneTimer.current); };
  }, [customerMode, walkinPhone]);

  // ── Load menu + promos + custom products ──────────────────────────────────
  useEffect(() => {
    if (!merchantId) {
      setMenuItems([]); setItems([]); setPromoCodes([]); return;
    }
    (async () => {
      setMenuLoading(true);
      try {
        const [menuRes, promoRes, cpRes] = await Promise.all([
          supabase.from('menu_items')
            .select('id,merchant_id,name,description,price,category,image_url,is_available,is_veg,preparation_time,category_id,discount_percentage')
            .eq('merchant_id', merchantId).eq('is_available', true)
            .order('category').order('name'),
          supabase.from('promo_codes').select('*')
            .or(`merchant_id.eq.${merchantId},scope.eq.platform`)
            .eq('is_active', true).gte('valid_until', new Date().toISOString()),
          supabase.from('customproducts')
            .select('id,name,category,price,unit,imageurl,description,isactive,stock_qty,sort_order')
            .eq('isactive', true).order('sort_order', { nullsFirst: false }).order('name'),
        ]);
        setMenuItems((menuRes.data as any) ?? []);
        if (!promoRes.error) setPromoCodes((promoRes.data as any) ?? []);
        setCustomProducts((cpRes.data as any) ?? []);
      } catch (e: any) {
        toast.error(e?.message ?? 'Failed to load menu');
        setMenuItems([]);
      } finally { setMenuLoading(false); }
    })();
  }, [merchantId]);

  // ── Address debounce ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!addressQuery.trim() || addressQuery.length < 3) {
      setAddressOptions([]); setShowAddressDropdown(false); return;
    }
    if (addrTimer.current) clearTimeout(addrTimer.current);
    setAddressSearching(true);
    addrTimer.current = setTimeout(async () => {
      try {
        const res  = await fetch(
          `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
            q: addressQuery.trim(), format: 'json',
            addressdetails: '1', limit: '6', countrycodes: 'in',
          })}`,
          { headers: { 'User-Agent': 'PattiBytes Express App' } }
        );
        const data = await res.json();
        setAddressOptions(Array.isArray(data) ? data : []);
        setShowAddressDropdown(Array.isArray(data) && data.length > 0);
      } catch { setAddressOptions([]); setShowAddressDropdown(false); }
      finally  { setAddressSearching(false); }
    }, 400);
    return () => { if (addrTimer.current) clearTimeout(addrTimer.current); };
  }, [addressQuery]);

  // ── Grouped menus ─────────────────────────────────────────────────────────
  const menuByCategory = useMemo(() => {
    const q = menuSearch.trim().toLowerCase();
    let list = vegOnly ? menuItems.filter(m => Boolean(m.is_veg)) : menuItems;
    if (q) list = list.filter(m =>
      [m.name, m.category, m.description].some(s => String(s ?? '').toLowerCase().includes(q))
    );
    return list.reduce((acc, item) => {
      const cat = item.category || 'Uncategorized';
      (acc[cat] ??= []).push(item);
      return acc;
    }, {} as Record<string, MenuItemRow[]>);
  }, [menuItems, menuSearch, vegOnly]);

  const customProductsByCategory = useMemo(() => {
    const q = menuSearch.trim().toLowerCase();
    const list = q
      ? customProducts.filter(p =>
          [p.name, p.category, p.description].some(s => String(s ?? '').toLowerCase().includes(q))
        )
      : customProducts;
    return list.reduce((acc, p) => {
      const cat = p.category || 'General';
      (acc[cat] ??= []).push(p);
      return acc;
    }, {} as Record<string, CustomProductRow[]>);
  }, [customProducts, menuSearch]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const toggleCategory = useCallback((cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }, []);

  const addItem = useCallback((m: MenuItemRow) => {
    setItems(prev => {
      const existing = prev.find(x => (x.menu_item_id || x.id) === m.id);
      if (existing) return prev.map(x =>
        (x.menu_item_id || x.id) !== m.id ? x : { ...x, quantity: Math.min(99, nNum(x.quantity, 1) + 1) }
      );
      return [...prev, {
        id: m.id, name: m.name, price: nNum(m.price, 0), quantity: 1,
        category: m.category ?? null, image_url: m.image_url ?? null,
        is_veg: Boolean(m.is_veg), merchant_id: m.merchant_id,
        menu_item_id: m.id, category_id: m.category_id ?? null,
        discount_percentage: nNum(m.discount_percentage, 0), appliedDiscount: 0,
        is_custom_product: false,
      }];
    });
    toast.success(`${m.name} added`);
  }, []);

  const addCustomProduct = useCallback((p: CustomProductRow) => {
    setItems(prev => {
      const existing = prev.find(x => x.menu_item_id === p.id && x.is_custom_product);
      if (existing) return prev.map(x =>
        (x.menu_item_id === p.id && x.is_custom_product)
          ? { ...x, quantity: Math.min(99, nNum(x.quantity, 1) + 1) }
          : x
      );
      return [...prev, {
        id: crypto.randomUUID(), name: p.name, price: nNum(p.price, 0), quantity: 1,
        category: p.category ?? null, image_url: p.imageurl ?? null,
        is_veg: null, merchant_id: null,
        menu_item_id: p.id, category_id: null,
        discount_percentage: 0, appliedDiscount: 0,
        unit: p.unit, is_custom_product: true,
      }];
    });
    toast.success(`${p.name} added`);
  }, []);

  const changeQty = useCallback((menuItemId: string, delta: number) => {
    setItems(prev => prev.map(x => {
      if ((x.menu_item_id || x.id) !== menuItemId) return x;
      return { ...x, quantity: Math.max(1, Math.min(99, nNum(x.quantity, 1) + delta)) };
    }));
  }, []);

  const removeItem = useCallback((menuItemId: string) => {
    setItems(prev => prev.filter(x => (x.menu_item_id || x.id) !== menuItemId));
  }, []);

  const updateItemNote = useCallback((menuItemId: string, note: string) => {
    setItems(prev => prev.map(x =>
      (x.menu_item_id || x.id) !== menuItemId ? x : { ...x, note }
    ));
  }, []);

  const chooseAddress = useCallback((opt: AddressSuggestion) => {
    setDeliveryAddress(opt.display_name);
    setAddressQuery(opt.display_name);
    setAddressOptions([]);
    setShowAddressDropdown(false);
    setDeliveryLat(parseFloat(opt.lat));
    setDeliveryLng(parseFloat(opt.lon));
    toast.success('Address selected');
  }, []);

  const handleCurrentLocation = useCallback(async () => {
    setAddressSearching(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
      );
      const { latitude, longitude } = pos.coords;
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/reverse?${new URLSearchParams({
          lat: latitude.toString(), lon: longitude.toString(),
          format: 'json', addressdetails: '1',
        })}`,
        { headers: { 'User-Agent': 'PattiBytes Express App' } }
      );
      const data = await res.json();
      setDeliveryAddress(data.display_name);
      setAddressQuery(data.display_name);
      setDeliveryLat(latitude);
      setDeliveryLng(longitude);
      setShowAddressDropdown(false);
      toast.success('Current location set');
    } catch { toast.error('Failed to get current location'); }
    finally  { setAddressSearching(false); }
  }, []);

  const computeFeeFromDistance = useCallback(async () => {
    if (!merchant?.latitude || !merchant?.longitude) { toast.error('Merchant coords missing'); return; }
    if (deliveryLat == null || deliveryLng == null)   { toast.error('Select delivery address first'); return; }
    try {
      const policy = await appSettingsService.getDeliveryPolicyNow();
      const km     = await getRoadDistanceKmViaApi(
        Number(merchant.latitude), Number(merchant.longitude),
        Number(deliveryLat),       Number(deliveryLng)
      );
      setDeliveryDistanceKm(round2(km));
      const quote = calculateDeliveryFeeByDistance(km, {
        enabled: true, baseKm: policy.baseRadiusKm,
        baseFee: policy.baseFee, perKmBeyondBase: policy.perKmFeeAfterBase, rounding: 'ceil',
      } as any);
      setDeliveryFee(round2(quote.fee));
      toast.success(`${quote.distanceKm} km → ₹${quote.fee}`);
    } catch (e: any) { toast.error(e?.message ?? 'Fee computation failed'); }
  }, [merchant, deliveryLat, deliveryLng]);

  const applyPromo = useCallback(() => {
    if (!selectedPromoCode) { setPromoDiscount(0); setPromoApplied(false); return; }
    const promo = promoCodes.find(p => p.code === selectedPromoCode);
    if (!promo) { toast.error('Invalid promo code'); return; }
    if (promo.min_order_amount && subtotal < promo.min_order_amount) {
      toast.error(`Min order ₹${promo.min_order_amount}`); return;
    }
    let disc = promo.discount_type === 'percentage'
      ? (subtotal * promo.discount_value) / 100
      : promo.discount_value;
    if (promo.max_discount_amount) disc = Math.min(disc, promo.max_discount_amount);
    setPromoDiscount(round2(disc));
    setPromoApplied(true);
    toast.success(`Promo applied! −₹${round2(disc)}`);
  }, [selectedPromoCode, promoCodes, subtotal]);

  const ensureCustomerFields = useCallback(() => {
    if (customerMode === 'existing') {
      if (!customerId) throw new Error('Select an existing customer');
      return {
        customer_id: customerId,
        customer_phone: selectedCustomer?.phone ?? '',
        customer_notes: customerNotes || null,
      };
    }
    const name  = walkinName.trim();
    const phone = walkinPhone.trim();
    if (!name && !phone) throw new Error('Enter walk-in customer name or phone');
    return {
      customer_id: linkedCustomerId ?? null,
      customer_phone: phone || null,
      customer_notes: name
        ? `Walk-in: ${name}${customerNotes ? '\n' + customerNotes : ''}`
        : customerNotes || null,
    };
  }, [customerMode, customerId, selectedCustomer, walkinName, walkinPhone, linkedCustomerId, customerNotes]);

  const createOrder = useCallback(async (opts?: { openAfter?: boolean }) => {
    setSubmitting(true);
    try {
      if (!merchantId) throw new Error('Select a merchant');
      if (!items.length) throw new Error('Add at least one item');

      const cust    = ensureCustomerFields();
      const basePayload: any = {
        merchant_id:           merchantId,
        customer_id:           cust.customer_id,
        customer_phone:        cust.customer_phone,
        customer_notes:        cust.customer_notes,
        special_instructions:  specialInstructions || null,
        delivery_address:      deliveryAddress     || null,
        delivery_latitude:     deliveryLat,
        delivery_longitude:    deliveryLng,
        delivery_distance_km:  deliveryDistanceKm ? round2(deliveryDistanceKm) : null,
        items,
        subtotal:       round2(subtotal + itemDiscountTotal),
        discount:       round2(discount + itemDiscountTotal + promoDiscount),
        delivery_fee:   round2(deliveryFee),
        tax:            round2(tax),
        total_amount:   round2(totalAmount),
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        status,
        promo_code:           selectedPromoCode || null,
        recipient_name:       recipientName        || null,
        delivery_instructions:deliveryInstructions || null,
        cancelled_by: null,
      };

      if (orderType === 'custom') {
        const customRef = generateCustomRef();
        const { error: custErr } = await supabase.from('custom_orders').insert({
          customer_id:    cust.customer_id,
          merchant_id:    merchantId,
          custom_order_ref: customRef,
          category:       customCategory    || null,
          description:    customDescription || null,
          image_url:      customImageUrl    || null,
          items,
          status:         'pending',
          delivery_address: deliveryAddress || null,
          delivery_lat:   deliveryLat,
          delivery_lng:   deliveryLng,
          total_amount:   round2(totalAmount),
          delivery_fee:   round2(deliveryFee),
          payment_method: paymentMethod,
          customer_phone: cust.customer_phone,
        });
        if (custErr) throw custErr;
        basePayload.order_type          = 'custom';
        basePayload.custom_order_ref    = customRef;
        basePayload.custom_category     = customCategory    || null;
        basePayload.custom_image_url    = customImageUrl    || null;
      } else {
        basePayload.order_type = 'restaurant';
      }

      const { data, error } = await supabase.from('orders').insert(basePayload).select('id').single();
      if (error) throw error;

      toast.success('Order created! 🎉');
      const id = String((data as any).id);
      if (opts?.openAfter) window.open(`/admin/orders/${id}`, '_blank');
      router.push(`/admin/orders/${id}`);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to create order');
    } finally { setSubmitting(false); }
  }, [
    merchantId, items, ensureCustomerFields, orderType, customCategory, customDescription,
    customImageUrl, deliveryAddress, deliveryLat, deliveryLng, deliveryDistanceKm,
    subtotal, itemDiscountTotal, discount, promoDiscount, deliveryFee, tax, totalAmount,
    paymentMethod, paymentStatus, status, selectedPromoCode, specialInstructions,
    recipientName, deliveryInstructions, router,
  ]);

  // ── Bulk upload ───────────────────────────────────────────────────────────
  const processBulkData = useCallback(async (text: string, format: 'json' | 'csv') => {
    setBulkBusy(true);
    try {
      let obj: any = {};
      if (format === 'json') {
        obj = JSON.parse(text);
      } else {
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
        const rows   = (parsed.data as any[]) ?? [];
        if (!rows.length) throw new Error('CSV has no data rows');
        obj = rows[0];
      }
      if (obj.merchant_id)        setMerchantId(String(obj.merchant_id));
      if (obj.delivery_address)   setDeliveryAddress(String(obj.delivery_address));
      if (obj.delivery_latitude)  setDeliveryLat(nNum(obj.delivery_latitude));
      if (obj.delivery_longitude) setDeliveryLng(nNum(obj.delivery_longitude));
      if (obj.delivery_fee  != null) setDeliveryFee(nNum(obj.delivery_fee));
      if (obj.tax           != null) setTax(nNum(obj.tax));
      if (obj.discount      != null) setDiscount(nNum(obj.discount));
      if (obj.status)         setStatus(String(obj.status));
      if (obj.payment_method) setPaymentMethod(obj.payment_method === 'online' ? 'online' : 'cod');
      if (obj.payment_status) setPaymentStatus(String(obj.payment_status) as any);
      const cm = String(obj.customer_mode || 'walkin');
      setCustomerMode(cm === 'existing' ? 'existing' : 'walkin');
      if (obj.customer_name)  setWalkinName(String(obj.customer_name));
      if (obj.customer_phone) setWalkinPhone(String(obj.customer_phone));
      if (Array.isArray(obj.items)) {
        setItems(obj.items
          .map((x: any) => ({
            id:                  String(x.menu_item_id || x.id || ''),
            name:                String(x.name || ''),
            price:               nNum(x.price),
            quantity:            Math.max(1, nNum(x.quantity, 1)),
            category:            x.category    ?? null,
            discount_percentage: nNum(x.discount_percentage),
            merchant_id:         String(obj.merchant_id || merchantId),
            menu_item_id:        String(x.menu_item_id || x.id || ''),
            image_url:           x.image_url   ?? null,
            is_veg:              x.is_veg      ?? null,
            category_id:         x.category_id ?? null,
            appliedDiscount:     0,
            is_custom_product:   !!x.is_custom_product,
            unit:                x.unit        ?? null,
          }))
          .filter((x: any) => x.id && x.name)
        );
      }
      toast.success(`${format.toUpperCase()} loaded ✅`);
      setShowBulkModal(false);
      setBulkText('');
    } catch (e: any) { toast.error(e?.message ?? 'Failed to process data'); }
    finally { setBulkBusy(false); }
  }, [merchantId]);

  const handleBulkFile = useCallback(async (file: File | null) => {
    if (!file) return;
    const ext = file.name.toLowerCase().split('.').pop();
    if (ext === 'json') {
      await processBulkData(await file.text(), 'json');
    } else if (ext === 'csv') {
      await processBulkData(await file.text(), 'csv');
    } else if (ext === 'xlsx' || ext === 'xls') {
      const buf = await file.arrayBuffer();
      const wb  = XLSX.read(buf, { type: 'array' });
      await processBulkData(XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]), 'csv');
    } else { toast.error('Unsupported file format'); }
  }, [processBulkData]);

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) { toast.error('Clipboard empty'); return; }
      setBulkText(text);
      toast.success('Pasted ✅');
    } catch { toast.error('Clipboard access denied'); }
  }, []);

  const downloadTemplates = useCallback(() => {
    downloadText('order-template.json', JSON.stringify({
      merchant_id: 'MERCHANT_UUID', customer_mode: 'walkin',
      customer_name: 'Name', customer_phone: '9999999999',
      delivery_address: 'Full address', delivery_latitude: 31.0, delivery_longitude: 74.0,
      delivery_fee: 60, tax: 0, discount: 0,
      status: 'pending', payment_method: 'cod', payment_status: 'pending',
      items: [{ menu_item_id: 'UUID', name: 'Item', price: 100, quantity: 1, discount_percentage: 0 }],
    }, null, 2), 'application/json');
    toast.success('Template downloaded ✅');
  }, []);

  return {
    authLoading, bootLoading, submitting, isAdmin,
    orderType, setOrderType,
    merchants, merchantId, setMerchantId, merchant,
    customerMode, setCustomerMode,
    customerQuery, setCustomerQuery,
    customerSearching, customerResults,
    customerId, setCustomerId, selectedCustomer,
       walkinName, setWalkinName,
    walkinPhone, setWalkinPhone,
    phoneMatchResult, phoneMatchLoading,
    linkedCustomerId, setLinkedCustomerId,

    addressQuery, setAddressQuery,
    addressSearching, addressOptions,
    showAddressDropdown, setShowAddressDropdown,
    deliveryAddress, setDeliveryAddress,
    deliveryLat, setDeliveryLng,
    deliveryLng, setDeliveryLat,
    addressInputRef,

    menuLoading, menuSearch, setMenuSearch,
    vegOnly, setVegOnly,
    menuByCategory, customProductsByCategory,
    expandedCategories, toggleCategory,

    promoCodes, selectedPromoCode, setSelectedPromoCode,
    promoApplied, promoDiscount, applyPromo,

    items, addItem, addCustomProduct,
    changeQty, removeItem, updateItemNote,

    customCategory, setCustomCategory,
    customDescription, setCustomDescription,
    customImageUrl, setCustomImageUrl,

    deliveryDistanceKm, deliveryFee, setDeliveryFee,
    tax, setTax, discount, setDiscount,
    extraCharges, setExtraCharges,
    autoGst, setAutoGst,

    status, setStatus,
    paymentMethod, setPaymentMethod,
    paymentStatus, setPaymentStatus,
    customerNotes, setCustomerNotes,
    specialInstructions, setSpecialInstructions,
    recipientName, setRecipientName,
    deliveryInstructions, setDeliveryInstructions,

    subtotal, itemDiscountTotal, taxableBase, totalAmount,

    chooseAddress, handleCurrentLocation, computeFeeFromDistance,
    createOrder,

    showBulkModal, setShowBulkModal,
    bulkBusy, bulkText, setBulkText,
    fileInputRef,
    handleBulkFile, handlePasteFromClipboard, downloadTemplates,
    processBulkData,
  };
}


