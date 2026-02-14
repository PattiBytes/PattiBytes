/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { 
  ChevronDown, ChevronUp, Search, Loader2, MapPin, DollarSign, 
  Package, User, Store, Percent, Upload, FileText, X, Copy 
} from 'lucide-react';

import DashboardLayout from '@/components/layouts/DashboardLayout';
import { PageLoadingSpinner } from '@/components/common/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

import { calculateDeliveryFeeByDistance, getRoadDistanceKmViaApi } from '@/services/location';

import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// Types
type MerchantRow = {
  id: string;
  business_name?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  gst_enabled?: boolean | null;
  gst_percentage?: number | null;
  city?: string | null;
  state?: string | null;
};

type CustomerMini = {
  id: string;
  full_name?: string | null;
  phone?: string | null;
  email?: string | null;
  role?: string | null;
};

type MenuItemRow = {
  id: string;
  merchant_id: string;
  name: string;
  description?: string | null;
  price: number;
  category?: string | null;
  image_url?: string | null;
  is_available?: boolean | null;
  is_veg?: boolean | null;
  preparation_time?: number | null;
  category_id?: string | null;
  discount_percentage?: number | null;
};

type PromoCode = {
  id: string;
  code: string;
  description?: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount?: number | null;
  max_discount_amount?: number | null;
  merchant_id?: string | null;
  is_active: boolean;
  valid_from?: string | null;
  valid_until?: string | null;
  deal_type?: string | null;
  deal_json?: any;
  auto_apply?: boolean;
};

type OrderItemCompat = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category?: string | null;
  image_url?: string | null;
  is_veg?: boolean | null;
  merchant_id?: string | null;
  menu_item_id?: string | null;
  category_id?: string | null;
  discount_percentage?: number | null;
  appliedDiscount?: number;
};

type AddressSuggestion = {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    town?: string;
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
};

// Utility functions
function nNum(v: any, fallback = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

function round2(v: any) {
  const x = nNum(v, 0);
  return Math.round(x * 100) / 100;
}

function toINR(v: any) {
  const n = nNum(v, 0);
  try {
    return n.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  } catch {
    return '₹' + round2(n);
  }
}

function downloadText(filename: string, content: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export default function AdminCreateOrderPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const isAdmin = useMemo(() => {
    const role = String((user as any)?.role || '').toLowerCase();
    return role === 'admin' || role === 'superadmin';
  }, [user]);

  const [bootLoading, setBootLoading] = useState(true);

  // Merchant
  const [merchants, setMerchants] = useState<MerchantRow[]>([]);
  const [merchantId, setMerchantId] = useState('');
  const merchant = useMemo(() => merchants.find((m) => m.id === merchantId) || null, [merchants, merchantId]);

  // Customer modes
  const [customerMode, setCustomerMode] = useState<'existing' | 'walkin'>('walkin');

  // Existing customer search
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerSearching, setCustomerSearching] = useState(false);
  const [customerResults, setCustomerResults] = useState<CustomerMini[]>([]);
  const [customerId, setCustomerId] = useState('');
  const selectedCustomer = useMemo(
    () => customerResults.find((c) => c.id === customerId) || null,
    [customerResults, customerId]
  );

  // Walk-in
  const [walkinName, setWalkinName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');

  // Delivery address (OpenStreetMap)
  const [addressQuery, setAddressQuery] = useState('');
  const [addressSearching, setAddressSearching] = useState(false);
  const [addressOptions, setAddressOptions] = useState<AddressSuggestion[]>([]);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryLat, setDeliveryLat] = useState<number | null>(null);
  const [deliveryLng, setDeliveryLng] = useState<number | null>(null);

  const addrTimer = useRef<any>(null);
  const custTimer = useRef<any>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);

  // Menu
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuSearch, setMenuSearch] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItemRow[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Promo codes
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [selectedPromoCode, setSelectedPromoCode] = useState<string>('');
  const [promoApplied, setPromoApplied] = useState(false);

  // Order items
  const [items, setItems] = useState<OrderItemCompat[]>([]);

  // Charges
  const [deliveryDistanceKm, setDeliveryDistanceKm] = useState<number>(0);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [tax, setTax] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [promoDiscount, setPromoDiscount] = useState<number>(0);
  const [extraCharges, setExtraCharges] = useState<number>(0);

  // Auto GST
  const [autoGst, setAutoGst] = useState(true);

  // Order fields
  const [status, setStatus] = useState('pending');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('cod');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'failed'>('pending');
  const [customerNotes, setCustomerNotes] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Bulk upload modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Computed totals
  const subtotal = useMemo(() => {
    return round2(
      items.reduce((sum, it) => {
        const qty = Math.max(1, nNum(it.quantity, 1));
        const price = nNum(it.price, 0);
        const discPct = nNum(it.discount_percentage, 0);
        const effective = discPct > 0 ? price * (1 - discPct / 100) : price;
        return sum + effective * qty;
      }, 0)
    );
  }, [items]);

  const itemDiscountTotal = useMemo(() => {
    return round2(
      items.reduce((sum, it) => {
        const qty = Math.max(1, nNum(it.quantity, 1));
        const price = nNum(it.price, 0);
        const discPct = nNum(it.discount_percentage, 0);
        if (discPct > 0) {
          const discAmount = price * (discPct / 100);
          return sum + discAmount * qty;
        }
        return sum;
      }, 0)
    );
  }, [items]);

  const taxableBase = useMemo(() => {
    return Math.max(0, subtotal - round2(discount) - round2(promoDiscount));
  }, [subtotal, discount, promoDiscount]);

  // Auto-calculate GST
  useEffect(() => {
    if (!autoGst || !merchant?.gst_enabled) {
      setTax(0);
      return;
    }

    const gstPct = nNum(merchant.gst_percentage, 0);
    if (gstPct > 0) {
      setTax(round2((taxableBase * gstPct) / 100));
    } else {
      setTax(0);
    }
  }, [autoGst, merchant?.gst_enabled, merchant?.gst_percentage, taxableBase]);

  const totalAmount = useMemo(() => {
    return round2(taxableBase + round2(deliveryFee) + round2(extraCharges) + round2(tax));
  }, [taxableBase, deliveryFee, extraCharges, tax]);

  // Bootstrap merchants
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login?redirect=' + encodeURIComponent('/admin/orders/new'));
      return;
    }
    if (!isAdmin) {
      router.replace('/');
      return;
    }

    (async () => {
      setBootLoading(true);
      try {
        const { data, error } = await supabase
          .from('merchants')
          .select('id,business_name,address,latitude,longitude,phone,gst_enabled,gst_percentage,city,state')
          .eq('is_active', true)
          .order('business_name', { ascending: true });

        if (error) throw error;
        setMerchants((data as any) ?? []);
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message ?? 'Failed to load merchants');
      } finally {
        setBootLoading(false);
      }
    })();
  }, [authLoading, user, isAdmin, router]);

  // Debounced customer search
  useEffect(() => {
    if (customerMode !== 'existing') return;

    const q = customerQuery.trim();
    if (q.length < 2) {
      setCustomerResults([]);
      setCustomerId('');
      return;
    }

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

        const list = ((data as any[]) ?? []).filter((p) => {
          const r = String(p.role ?? '').toLowerCase();
          return r === '' || r === 'customer' || r === 'user';
        });

        setCustomerResults(list);
      } catch (e) {
        console.error(e);
        setCustomerResults([]);
      } finally {
        setCustomerSearching(false);
      }
    }, 400);

    return () => {
      if (custTimer.current) clearTimeout(custTimer.current);
    };
  }, [customerMode, customerQuery]);

  // Load menu items for selected merchant
  useEffect(() => {
    if (!merchantId) {
      setMenuItems([]);
      setItems([]);
      setPromoCodes([]);
      return;
    }

    (async () => {
      setMenuLoading(true);
      try {
        // Load menu items
        const { data: menuData, error: menuError } = await supabase
          .from('menu_items')
          .select('id,merchant_id,name,description,price,category,image_url,is_available,is_veg,preparation_time,category_id,discount_percentage')
          .eq('merchant_id', merchantId)
          .eq('is_available', true)
          .order('category', { ascending: true })
          .order('name', { ascending: true });

        if (menuError) throw menuError;
        setMenuItems((menuData as any) ?? []);

        // Load promo codes for merchant
        const { data: promoData, error: promoError } = await supabase
          .from('promo_codes')
          .select('*')
          .or(`merchant_id.eq.${merchantId},scope.eq.platform`)
          .eq('is_active', true)
          .gte('valid_until', new Date().toISOString());

        if (!promoError) {
          setPromoCodes((promoData as any) ?? []);
        }
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message ?? 'Failed to load menu items');
        setMenuItems([]);
      } finally {
        setMenuLoading(false);
      }
    })();
  }, [merchantId]);

  // Group menu by category
  const menuByCategory = useMemo(() => {
    const q = menuSearch.trim().toLowerCase();
    let list = menuItems;

    if (vegOnly) list = list.filter((m) => Boolean(m.is_veg));
    if (q) {
      list = list.filter((m) => {
        const name = String(m.name ?? '').toLowerCase();
        const cat = String(m.category ?? '').toLowerCase();
        const desc = String(m.description ?? '').toLowerCase();
        return name.includes(q) || cat.includes(q) || desc.includes(q);
      });
    }

    const grouped = list.reduce((acc, item) => {
      const cat = item.category || 'Uncategorized';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {} as Record<string, MenuItemRow[]>);

    return grouped;
  }, [menuItems, menuSearch, vegOnly]);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const addItem = (m: MenuItemRow) => {
    setItems((prev) => {
      const existing = prev.find((x) => (x.menu_item_id || x.id) === m.id);
      if (existing) {
        return prev.map((x) => {
          const mid = x.menu_item_id || x.id;
          if (mid !== m.id) return x;
          return { ...x, quantity: Math.min(99, nNum(x.quantity, 1) + 1) };
        });
      }

      const row: OrderItemCompat = {
        id: m.id,
        name: m.name,
        price: nNum(m.price, 0),
        quantity: 1,
        category: m.category ?? null,
        image_url: m.image_url ?? null,
        is_veg: Boolean(m.is_veg),
        merchant_id: m.merchant_id,
        menu_item_id: m.id,
        category_id: m.category_id ?? null,
        discount_percentage: nNum(m.discount_percentage, 0),
        appliedDiscount: 0,
      };

      return [...prev, row];
    });
    toast.success(`${m.name} added to cart`);
  };

  const changeQty = (menuItemId: string, delta: number) => {
    setItems((prev) =>
      prev.map((x) => {
        const mid = x.menu_item_id || x.id;
        if (mid !== menuItemId) return x;
        const next = Math.max(1, Math.min(99, nNum(x.quantity, 1) + delta));
        return { ...x, quantity: next };
      })
    );
  };

  const removeItem = (menuItemId: string) => {
    setItems((prev) => prev.filter((x) => (x.menu_item_id || x.id) !== menuItemId));
  };

  // OpenStreetMap address search (debounced)
  useEffect(() => {
    if (!addressQuery.trim() || addressQuery.length < 3) {
      setAddressOptions([]);
      setShowAddressDropdown(false);
      return;
    }

    if (addrTimer.current) clearTimeout(addrTimer.current);
    setAddressSearching(true);

    addrTimer.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
            q: addressQuery.trim(),
            format: 'json',
            addressdetails: '1',
            limit: '6',
            countrycodes: 'in',
          })}`,
          { headers: { 'User-Agent': 'PattiBytes Express App' } }
        );

        const data = await response.json();
        setAddressOptions(Array.isArray(data) ? data : []);
        setShowAddressDropdown(Array.isArray(data) && data.length > 0);
      } catch (e: any) {
        console.error(e);
        setAddressOptions([]);
        setShowAddressDropdown(false);
      } finally {
        setAddressSearching(false);
      }
    }, 400);

    return () => {
      if (addrTimer.current) clearTimeout(addrTimer.current);
    };
  }, [addressQuery]);

  const chooseAddress = (opt: AddressSuggestion) => {
    const display = opt.display_name;
    const lat = parseFloat(opt.lat);
    const lon = parseFloat(opt.lon);

    setDeliveryAddress(display);
    setAddressQuery(display);
    setAddressOptions([]);
    setShowAddressDropdown(false);
    setDeliveryLat(lat);
    setDeliveryLng(lon);
    toast.success('Address selected');
  };

  const handleCurrentLocation = async () => {
    setAddressSearching(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?${new URLSearchParams({
          lat: latitude.toString(),
          lon: longitude.toString(),
          format: 'json',
          addressdetails: '1',
        })}`,
        { headers: { 'User-Agent': 'PattiBytes Express App' } }
      );

      const data = await response.json();

      setDeliveryAddress(data.display_name);
      setAddressQuery(data.display_name);
      setDeliveryLat(latitude);
      setDeliveryLng(longitude);
      setShowAddressDropdown(false);
      toast.success('Current location set');
    } catch (error) {
      console.error('Failed to get current location', error);
      toast.error('Failed to get current location');
    } finally {
      setAddressSearching(false);
    }
  };

  const computeFeeFromDistance = async () => {
    if (!merchant?.latitude || !merchant?.longitude) {
      toast.error('Merchant coordinates missing');
      return;
    }
    if (deliveryLat == null || deliveryLng == null) {
      toast.error('Select delivery address first');
      return;
    }

    try {
      const km = await getRoadDistanceKmViaApi(
        Number(merchant.latitude),
        Number(merchant.longitude),
        Number(deliveryLat),
        Number(deliveryLng)
      );

      setDeliveryDistanceKm(round2(km));

      const quote = calculateDeliveryFeeByDistance(km, {
        enabled: true,
        baseKm: 3,
        baseFee: 50,
        perKmBeyondBase: 15,
        rounding: 'ceil' as any,
      });

      setDeliveryFee(round2(quote.fee));
      toast.success(`Distance: ${quote.distanceKm} km, Fee: ${toINR(quote.fee)}`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? 'Distance/fee computation failed');
    }
  };

  // Apply promo code
  const applyPromo = () => {
    if (!selectedPromoCode) {
      setPromoDiscount(0);
      setPromoApplied(false);
      return;
    }

    const promo = promoCodes.find((p) => p.code === selectedPromoCode);
    if (!promo) {
      toast.error('Invalid promo code');
      return;
    }

    // Check minimum order
    if (promo.min_order_amount && subtotal < promo.min_order_amount) {
      toast.error(`Minimum order amount is ${toINR(promo.min_order_amount)}`);
      return;
    }

    // Calculate discount
    let discAmount = 0;
    if (promo.discount_type === 'percentage') {
      discAmount = (subtotal * promo.discount_value) / 100;
      if (promo.max_discount_amount) {
        discAmount = Math.min(discAmount, promo.max_discount_amount);
      }
    } else {
      discAmount = promo.discount_value;
    }

    setPromoDiscount(round2(discAmount));
    setPromoApplied(true);
    toast.success(`Promo code applied! Discount: ${toINR(discAmount)}`);
  };

  const ensureCustomerFields = () => {
    if (customerMode === 'existing') {
      if (!customerId) throw new Error('Select an existing customer');
      return {
        customer_id: customerId,
        customer_phone: selectedCustomer?.phone ?? '',
        customer_notes: customerNotes || null,
      };
    }

    // Walk-in mode - set to null (nullable column required)
    const name = walkinName.trim();
    const phone = walkinPhone.trim();
    if (!name && !phone) throw new Error('Enter walk-in customer name or phone');

    return {
      customer_id: null, // Must be nullable in DB
      customer_phone: phone || null,
      customer_notes: name ? `[Walk-in] ${name}${customerNotes ? '\n' + customerNotes : ''}` : (customerNotes || null),
    };
  };

  const createOrder = async (opts?: { openAfter?: boolean }) => {
    try {
      if (!merchantId) throw new Error('Select a merchant');
      if (!items.length) throw new Error('Add at least one item');

      const cust = ensureCustomerFields();

      const payload: any = {
        merchant_id: merchantId,
        customer_id: cust.customer_id,
        customer_phone: cust.customer_phone,
        customer_notes: cust.customer_notes,
        special_instructions: specialInstructions || null,

        delivery_address: deliveryAddress || null,
        delivery_latitude: deliveryLat ?? null,
        delivery_longitude: deliveryLng ?? null,
        delivery_distance_km: deliveryDistanceKm ? round2(deliveryDistanceKm) : null,

        items, // JSON array
        subtotal: round2(subtotal + itemDiscountTotal), // Original subtotal before item discounts
        discount: round2(discount + itemDiscountTotal + promoDiscount), // Total discount
        delivery_fee: round2(deliveryFee),
        tax: round2(tax),
        total_amount: round2(totalAmount),

        payment_method: paymentMethod,
        payment_status: paymentStatus,
        status,

        promo_code: selectedPromoCode || null,
        cancelled_by: null,
      };

      const { data, error } = await supabase.from('orders').insert(payload).select('id').single();
      if (error) throw error;

      toast.success('Order created successfully! 🎉');
      const id = String((data as any)?.id);

      if (opts?.openAfter) window.open(`/admin/orders/${id}`, '_blank');
      router.push(`/admin/orders/${id}`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? 'Failed to create order');
    }
  };

  // Bulk upload handlers
  const downloadTemplates = () => {
    const jsonTemplate = JSON.stringify(
      {
        merchant_id: 'MERCHANT_UUID_HERE',
        customer_mode: 'walkin',
        customer_name: 'Walk-in Customer Name',
        customer_phone: '9999999999',
        delivery_address: 'Full delivery address',
        delivery_latitude: 31.0,
        delivery_longitude: 74.0,
        delivery_fee: 60,
        tax: 0,
        discount: 0,
        status: 'pending',
        payment_method: 'cod',
        payment_status: 'pending',
        items: [
          { menu_item_id: 'MENU_ITEM_UUID', name: 'Espresso (R)', price: 170, quantity: 2, discount_percentage: 0 },
        ],
      },
      null,
      2
    );

    const csvTemplate = [
      'merchant_id,customer_name,customer_phone,delivery_address,delivery_latitude,delivery_longitude,delivery_fee,tax,discount,status,payment_method,payment_status,item_menu_item_id,item_name,item_price,item_quantity,item_discount_percentage',
      'MERCHANT_UUID,Walk-in,9999999999,"Full address",31.0,74.0,60,0,0,pending,cod,pending,MENU_ITEM_UUID,Espresso (R),170,2,0',
    ].join('\n');

    downloadText('order-template.json', jsonTemplate, 'application/json');
    downloadText('order-template.csv', csvTemplate, 'text/csv');
    toast.success('Templates downloaded ✅');
  };

  const processBulkData = async (text: string, format: 'json' | 'csv' | 'xlsx') => {
    setBulkBusy(true);
    try {
      let obj: any = {};

      if (format === 'json') {
        obj = JSON.parse(text);
      } else if (format === 'csv') {
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
        const rows = (parsed.data as any[]) ?? [];
        if (!rows.length) throw new Error('CSV has no data rows');
        obj = rows[0]; // Use first row for now
      }

      // Populate form fields
      if (obj.merchant_id) setMerchantId(String(obj.merchant_id));
      if (obj.delivery_address) setDeliveryAddress(String(obj.delivery_address));
      if (obj.delivery_latitude) setDeliveryLat(nNum(obj.delivery_latitude, 0));
      if (obj.delivery_longitude) setDeliveryLng(nNum(obj.delivery_longitude, 0));
      if (obj.delivery_fee != null) setDeliveryFee(nNum(obj.delivery_fee, 0));
      if (obj.tax != null) setTax(nNum(obj.tax, 0));
      if (obj.discount != null) setDiscount(nNum(obj.discount, 0));
      if (obj.status) setStatus(String(obj.status));
      if (obj.payment_method) setPaymentMethod(String(obj.payment_method) === 'online' ? 'online' : 'cod');
      if (obj.payment_status) setPaymentStatus(String(obj.payment_status) as any);

      const cm = String(obj.customer_mode || 'walkin');
      setCustomerMode(cm === 'existing' ? 'existing' : 'walkin');
      if (obj.customer_name) setWalkinName(String(obj.customer_name));
      if (obj.customer_phone) setWalkinPhone(String(obj.customer_phone));

      if (Array.isArray(obj.items)) {
        const mapped: OrderItemCompat[] = obj.items.map((x: any) => ({
          id: String(x.menu_item_id || x.id || ''),
          name: String(x.name || ''),
          price: nNum(x.price, 0),
          quantity: Math.max(1, nNum(x.quantity, 1)),
          category: x.category ?? null,
          discount_percentage: nNum(x.discount_percentage, 0),
          merchant_id: String(obj.merchant_id || merchantId),
          menu_item_id: String(x.menu_item_id || x.id || ''),
          image_url: x.image_url ?? null,
          is_veg: x.is_veg ?? null,
          category_id: x.category_id ?? null,
          appliedDiscount: 0,
        }));
        setItems(mapped.filter((x) => x.id && x.name));
      }

      toast.success(`${format.toUpperCase()} data loaded ✅`);
      setShowBulkModal(false);
      setBulkText('');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? 'Failed to process bulk data');
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkFile = async (file: File | null) => {
    if (!file) return;

    const ext = file.name.toLowerCase().split('.').pop();

    if (ext === 'json') {
      const text = await file.text();
      await processBulkData(text, 'json');
    } else if (ext === 'csv') {
      const text = await file.text();
      await processBulkData(text, 'csv');
    } else if (ext === 'xlsx' || ext === 'xls') {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      await processBulkData(csv, 'csv');
    } else {
      toast.error('Unsupported file format');
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        toast.error('Clipboard is empty');
        return;
      }
      setBulkText(text);
      toast.success('Pasted from clipboard');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      toast.error('Failed to read clipboard');
    }
  };

  if (authLoading || bootLoading) return <PageLoadingSpinner />;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <span className="text-4xl">📝</span>
              Create Order
            </h1>
            <p className="text-sm text-gray-600 mt-1">Manual order creation with bulk upload support</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowBulkModal(true)} type="button" className="px-4 py-2 rounded-xl border-2 border-primary bg-white text-primary font-semibold hover:bg-orange-50 transition-all duration-200 flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Bulk Upload
            </button>
            <button onClick={() => createOrder({ openAfter: true })} type="button" className="px-4 py-2 rounded-xl bg-gray-900 text-white font-semibold hover:bg-gray-800 transition-all duration-200">
              Create & Open
            </button>
            <button onClick={() => createOrder()} type="button" className="px-5 py-2 rounded-xl bg-gradient-to-r from-primary to-orange-600 text-white font-bold hover:shadow-xl transition-all duration-200">
              Create Order
            </button>
          </div>
        </div>

        {/* Merchant */}
        <div className="bg-gradient-to-br from-white to-orange-50 rounded-2xl shadow-lg p-6 space-y-4 border border-orange-100">
          <h2 className="font-bold text-gray-900 flex items-center gap-2 text-lg">
            <Store className="w-5 h-5 text-primary" />
            Merchant Selection
          </h2>
          <select value={merchantId} onChange={(e) => setMerchantId(e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-primary focus:border-primary bg-white font-medium">
            <option value="">🔍 Select merchant...</option>
            {merchants.map((m) => (
              <option key={m.id} value={m.id}>
                {m.business_name || m.id.slice(0, 8)} {m.city ? `• ${m.city}` : ''} {m.gst_enabled ? '• GST' : ''}
              </option>
            ))}
          </select>
          {merchant?.address && (
            <div className="flex items-start gap-2 p-3 bg-white rounded-lg border">
              <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
              <p className="text-sm text-gray-700">{merchant.address}</p>
            </div>
          )}
          {merchant?.gst_enabled && (
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
              <Percent className="w-4 h-4 text-green-600" />
              <p className="text-sm font-semibold text-green-800">
                GST Enabled: {merchant.gst_percentage}%
              </p>
            </div>
          )}
        </div>

        {/* Customer */}
        <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-lg p-6 space-y-4 border border-blue-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="font-bold text-gray-900 flex items-center gap-2 text-lg">
              <User className="w-5 h-5 text-blue-600" />
              Customer
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setCustomerMode('existing');
                  setWalkinName('');
                  setWalkinPhone('');
                }}
                className={`px-4 py-2 rounded-xl border-2 font-semibold transition-all ${
                  customerMode === 'existing'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-blue-50'
                }`}
              >
                Existing
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomerMode('walkin');
                  setCustomerId('');
                  setCustomerQuery('');
                }}
                className={`px-4 py-2 rounded-xl border-2 font-semibold transition-all ${
                  customerMode === 'walkin'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-blue-50'
                }`}
              >
                Walk-in
              </button>
            </div>
          </div>

          {customerMode === 'existing' ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input value={customerQuery} onChange={(e) => setCustomerQuery(e.target.value)} placeholder="Search customer by name, phone, or email..." className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" />
                {customerSearching && <Loader2 className="absolute right-3 top-3 w-5 h-5 animate-spin text-blue-500" />}
              </div>
              {customerResults.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {customerResults.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCustomerId(c.id)}
                      className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                        customerId === c.id
                          ? 'bg-blue-50 border-blue-500'
                          : 'bg-white border-gray-200 hover:bg-blue-50'
                      }`}
                    >
                      <p className="font-semibold text-gray-900">{c.full_name || 'Unknown'}</p>
                      <p className="text-sm text-gray-600">{c.phone || 'No phone'} • {c.email || 'No email'}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input value={walkinName} onChange={(e) => setWalkinName(e.target.value)} placeholder="Customer name" className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" />
              <input value={walkinPhone} onChange={(e) => setWalkinPhone(e.target.value)} placeholder="Customer phone" className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" maxLength={10} />
            </div>
          )}
        </div>

        {/* Delivery Address (OpenStreetMap) */}
        <div className="bg-gradient-to-br from-white to-green-50 rounded-2xl shadow-lg p-6 space-y-4 border border-green-100">
          <h2 className="font-bold text-gray-900 flex items-center gap-2 text-lg">
            <MapPin className="w-5 h-5 text-green-600" />
            Delivery Address
          </h2>

          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              ref={addressInputRef}
              value={addressQuery}
              onChange={(e) => setAddressQuery(e.target.value)}
              placeholder="Search address..."
              className="w-full pl-10 pr-20 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {addressSearching && <Loader2 className="w-5 h-5 animate-spin text-green-500" />}
              <button
                type="button"
                onClick={handleCurrentLocation}
                disabled={addressSearching}
                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
                title="Use current location"
              >
                <MapPin className="w-5 h-5" />
              </button>
            </div>
          </div>

          {showAddressDropdown && addressOptions.length > 0 && !addressSearching && (
            <div className="border-2 border-green-200 rounded-xl shadow-xl max-h-64 overflow-y-auto bg-white">
              {addressOptions.map((opt, i) => (
                <button
                  key={`${opt.lat}-${opt.lon}-${i}`}
                  type="button"
                  onClick={() => chooseAddress(opt)}
                  className="w-full text-left p-4 hover:bg-green-50 border-b last:border-b-0 flex items-start gap-3"
                >
                  <MapPin className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{opt.address?.road || opt.address?.suburb || 'Unknown'}</p>
                    <p className="text-xs text-gray-600 truncate">{opt.display_name}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          <textarea value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder="Delivery address (auto-filled)" className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white min-h-[80px]" />

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={computeFeeFromDistance} disabled={!merchant || deliveryLat == null} className="px-5 py-2.5 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-50 transition-all flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Compute Fee
            </button>
            {deliveryLat != null && (
              <span className="px-3 py-1.5 bg-green-100 text-green-800 rounded-full font-semibold text-sm">
                ✓ Coords Set
              </span>
            )}
            {deliveryDistanceKm > 0 && (
              <span className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full font-semibold text-sm">
                📏 {deliveryDistanceKm.toFixed(2)} km
              </span>
            )}
          </div>
        </div>

        {/* Menu - Expandable by Category */}
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4 border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="font-bold text-gray-900 flex items-center gap-2 text-lg">
              <Package className="w-5 h-5 text-primary" />
              Menu Items {menuLoading && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
            </h2>
            <label className="text-sm text-gray-700 flex items-center gap-2 font-semibold cursor-pointer">
              <input type="checkbox" checked={vegOnly} onChange={(e) => setVegOnly(e.target.checked)} className="rounded w-4 h-4" />
              🌱 Veg Only
            </label>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input value={menuSearch} onChange={(e) => setMenuSearch(e.target.value)} placeholder="Search menu items..." className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-primary focus:border-primary" disabled={!merchantId} />
          </div>

          {!merchantId ? (
            <div className="text-center py-12 text-gray-500">
              <Store className="w-16 h-16 mx-auto mb-3 text-gray-300" />
              <p className="font-semibold">Select a merchant first</p>
            </div>
          ) : menuLoading ? (
            <div className="text-center py-12 text-gray-500">
              <Loader2 className="w-16 h-16 mx-auto mb-3 animate-spin text-primary" />
              <p className="font-semibold">Loading menu...</p>
            </div>
          ) : Object.keys(menuByCategory).length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-16 h-16 mx-auto mb-3 text-gray-300" />
              <p className="font-semibold">No menu items found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(menuByCategory).map(([category, items]) => (
                <div key={category} className="border-2 border-gray-200 rounded-xl overflow-hidden hover:border-primary transition-colors">
                  <button
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white hover:from-orange-50 hover:to-orange-100 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{items[0]?.is_veg ? '🌱' : '🍖'}</span>
                      <div className="text-left">
                        <h3 className="font-bold text-gray-900 text-lg">{category}</h3>
                        <p className="text-sm text-gray-600">{items.length} items</p>
                      </div>
                    </div>
                    {expandedCategories.has(category) ? (
                      <ChevronUp className="w-6 h-6 text-gray-600" />
                    ) : (
                      <ChevronDown className="w-6 h-6 text-gray-600" />
                    )}
                  </button>

                  {expandedCategories.has(category) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4 bg-gray-50">
                      {items.map((m) => (
                        <div key={m.id} className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-primary transition-all">
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-gray-900 truncate flex items-center gap-2">
                                {m.is_veg && <span className="text-green-600">🌱</span>}
                                {m.name}
                              </p>
                              {m.description && (
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{m.description}</p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <p className="text-lg font-bold text-gray-900">{toINR(m.price)}</p>
                                {nNum(m.discount_percentage, 0) > 0 && (
                                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                                    {m.discount_percentage}% OFF
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <button type="button" onClick={() => addItem(m)} className="w-full px-3 py-2 rounded-lg bg-gradient-to-r from-primary to-orange-600 text-white font-bold hover:shadow-lg transition-all">
                            + Add
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Items + Charges Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Selected Items */}
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4 border">
            <h2 className="font-bold text-gray-900 flex items-center gap-2 text-lg">
              <Package className="w-5 h-5 text-primary" />
              Cart ({items.length})
            </h2>
            {items.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Package className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                <p className="font-semibold">No items selected</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {items.map((it) => {
                  const mid = it.menu_item_id || it.id;
                  const itemPrice = nNum(it.price, 0);
                  const itemDisc = nNum(it.discount_percentage, 0);
                  const effectivePrice = itemDisc > 0 ? itemPrice * (1 - itemDisc / 100) : itemPrice;
                  const lineTotal = effectivePrice * it.quantity;

                  return (
                    <div key={mid} className="border-2 border-gray-200 rounded-xl p-4 hover:border-primary hover:shadow-md transition-all">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-gray-900 flex items-center gap-2">
                            {it.is_veg && <span className="text-green-600 text-sm">🌱</span>}
                            {it.name}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {toINR(itemPrice)} × {it.quantity} = {toINR(lineTotal)}
                          </p>
                          {itemDisc > 0 && (
                            <div className="flex items-center gap-2 mt-1">
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                                {itemDisc}% OFF
                              </span>
                              <span className="text-xs text-gray-500 line-through">{toINR(itemPrice * it.quantity)}</span>
                            </div>
                          )}
                        </div>
                        <button onClick={() => removeItem(mid)} type="button" className="text-red-600 font-bold hover:text-red-700 text-xl">
                          ✕
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => changeQty(mid, -1)} type="button" className="flex-1 px-3 py-2 rounded-lg border-2 border-gray-300 font-bold hover:bg-gray-100 transition-all">
                          −
                        </button>
                        <span className="px-4 py-2 border-2 border-gray-300 rounded-lg font-bold bg-gray-50 text-center min-w-[60px]">{it.quantity}</span>
                        <button onClick={() => changeQty(mid, +1)} type="button" className="flex-1 px-3 py-2 rounded-lg border-2 border-gray-300 font-bold hover:bg-gray-100 transition-all">
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Charges & Totals */}
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4 border">
            <h2 className="font-bold text-gray-900 flex items-center gap-2 text-lg">
              <DollarSign className="w-5 h-5 text-primary" />
              Charges & Details
            </h2>

            {/* Promo Code */}
            {promoCodes.length > 0 && (
              <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 space-y-3">
                <h3 className="font-bold text-purple-900 flex items-center gap-2">
                  <Percent className="w-4 h-4" />
                  Apply Promo Code
                </h3>
                <select value={selectedPromoCode} onChange={(e) => setSelectedPromoCode(e.target.value)} className="w-full px-3 py-2 rounded-lg border-2 border-purple-200 focus:ring-2 focus:ring-purple-500 bg-white">
                  <option value="">Select promo code...</option>
                  {promoCodes.map((p) => (
                    <option key={p.id} value={p.code}>
                      {p.code} - {p.description || 'No description'}
                    </option>
                  ))}
                </select>
                <button onClick={applyPromo} type="button" disabled={!selectedPromoCode} className="w-full px-4 py-2 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-700 disabled:opacity-50 transition-all">
                  Apply Promo
                </button>
                {promoApplied && (
                  <p className="text-sm text-green-700 font-semibold">
                    ✓ Promo applied! Discount: {toINR(promoDiscount)}
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1 block">Delivery Fee</label>
                <input type="number" step="0.01" value={deliveryFee} onChange={(e) => setDeliveryFee(nNum(e.target.value, 0))} className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-primary" placeholder="0.00" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1 block">Manual Discount</label>
                <input type="number" step="0.01" value={discount} onChange={(e) => setDiscount(nNum(e.target.value, 0))} className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-primary" placeholder="0.00" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1 block flex items-center gap-2">
                  Tax (GST)
                  {merchant?.gst_enabled && (
                    <input type="checkbox" checked={autoGst} onChange={(e) => setAutoGst(e.target.checked)} className="rounded" />
                  )}
                </label>
                <input type="number" step="0.01" value={tax} onChange={(e) => setTax(nNum(e.target.value, 0))} disabled={autoGst && merchant?.gst_enabled} className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-primary disabled:bg-gray-100" placeholder="0.00" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1 block">Other Charges</label>
                <input type="number" step="0.01" value={extraCharges} onChange={(e) => setExtraCharges(nNum(e.target.value, 0))} className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-primary" placeholder="0.00" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1 block">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-primary">
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="preparing">Preparing</option>
                  <option value="ready">Ready</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1 block">Payment Method</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value === 'online' ? 'online' : 'cod')} className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-primary">
                  <option value="cod">COD</option>
                  <option value="online">Online</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1 block">Payment Status</label>
                <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as any)} className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-primary">
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Customer Notes</label>
              <textarea value={customerNotes} onChange={(e) => setCustomerNotes(e.target.value)} placeholder="Customer notes..." className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-primary min-h-[60px]" />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Special Instructions</label>
              <textarea value={specialInstructions} onChange={(e) => setSpecialInstructions(e.target.value)} placeholder="Special instructions..." className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:ring-2 focus:ring-primary min-h-[60px]" />
            </div>

            {/* Totals */}
            <div className="pt-4 border-t-2 border-gray-200 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-bold text-gray-900">{toINR(subtotal + itemDiscountTotal)}</span>
              </div>
              {itemDiscountTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Item Discounts</span>
                  <span className="font-bold text-green-600">-{toINR(itemDiscountTotal)}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Manual Discount</span>
                  <span className="font-bold text-green-600">-{toINR(discount)}</span>
                </div>
              )}
              {promoDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Promo Discount</span>
                  <span className="font-bold text-purple-600">-{toINR(promoDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Delivery Fee</span>
                <span className="font-bold text-gray-900">{toINR(deliveryFee)}</span>
              </div>
              {tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax (GST) {autoGst && merchant?.gst_enabled && `${merchant.gst_percentage}%`}</span>
                  <span className="font-bold text-gray-900">{toINR(tax)}</span>
                </div>
              )}
              {extraCharges > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Other Charges</span>
                  <span className="font-bold text-gray-900">{toINR(extraCharges)}</span>
                </div>
              )}
              <div className="flex justify-between pt-3 border-t-2 border-primary text-xl">
                <span className="font-black text-gray-900">TOTAL</span>
                <span className="font-black text-primary">{toINR(totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Upload Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Upload className="w-6 h-6 text-primary" />
                Bulk Upload Order
              </h2>
              <button onClick={() => setShowBulkModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Download Templates */}
              <div className="flex gap-2">
                <button onClick={downloadTemplates} className="flex-1 px-4 py-2 rounded-xl border-2 border-primary text-primary font-semibold hover:bg-orange-50 transition-all flex items-center justify-center gap-2">
                  <FileText className="w-4 h-4" />
                  Download Templates
                </button>
                <button onClick={handlePasteFromClipboard} className="flex-1 px-4 py-2 rounded-xl border-2 border-gray-300 font-semibold hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
                  <Copy className="w-4 h-4" />
                  Paste from Clipboard
                </button>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Upload File (JSON, CSV, XLSX)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.csv,.xlsx,.xls"
                  onChange={(e) => handleBulkFile(e.target.files?.[0] ?? null)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              {/* Text Area */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Or Paste JSON/CSV Here</label>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder="Paste your JSON or CSV data here..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary min-h-[200px] font-mono text-sm"
                />
              </div>

              {/* Process Button */}
              <button
                onClick={() => {
                  if (!bulkText.trim()) {
                    toast.error('Please paste data or upload a file');
                    return;
                  }
                  const format = bulkText.trim().startsWith('{') || bulkText.trim().startsWith('[') ? 'json' : 'csv';
                  processBulkData(bulkText, format);
                }}
                disabled={bulkBusy || !bulkText.trim()}
                className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-orange-600 text-white font-bold hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {bulkBusy ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Process Data
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
