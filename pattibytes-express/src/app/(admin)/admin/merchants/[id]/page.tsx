 
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import {
  ArrowLeft,
  Save,
  RefreshCw,
  Store,
  UtensilsCrossed,
  Package,
  Plus,
  Trash2,
  Pencil,
  Loader2,
  MapPin,
  X,
  Link as LinkIcon,
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import BulkMenuUpload from '@/components/merchant/BulkMenuUpload';
import MenuItemModal from '@/components/merchant/MenuItemModal';
import ImageUpload from '@/components/common/ImageUpload';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { MenuItem } from '@/types';

type MerchantRow = {
  id: string;
  user_id: string | null;
  business_name: string;
  business_type: string | null;
  cuisine_types: any;

  description?: string | null;
  logo_url?: string | null;
  banner_url?: string | null;

  phone?: string | null;
  email?: string | null;

  latitude?: number | null;
  longitude?: number | null;

  is_active?: boolean | null;
  is_verified?: boolean | null;
  is_featured?: boolean | null;

  delivery_radius_km?: number | null;
  min_order_amount?: number | null;
  estimated_prep_time?: number | null;
  commission_rate?: number | null;

  address?: any;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;

  gst_enabled?: boolean | null;
  gst_percentage?: number | null;

  opening_time?: string | null;
  closing_time?: string | null;

  created_at?: string;
  updated_at?: string;
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
  discount_percentage?: number | null;
  category_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

type OrderRow = {
  id: string;
  status?: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  total_amount?: number | null;
  delivery_address?: any;
  items?: any;
  created_at?: string | null;
};

const ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'on_the_way', 'delivered', 'cancelled'] as const;

function parseCuisineToText(v: any) {
  if (!v) return '';
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'string') {
    const s = v.trim();
    try {
      const j = JSON.parse(s);
      if (Array.isArray(j)) return j.join(', ');
    } catch {}
    return s;
  }
  return '';
}

function cuisineTextToArray(text: string): string[] {
  return (text || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function money(n: any) {
  const v = Number(n ?? 0);
  try {
    return v.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  } catch {
    return `₹${Math.round(v)}`;
  }
}

function safeAddrText(a: any) {
  if (!a) return '';
  if (typeof a === 'string') return a;
  if (typeof a === 'object') return a.address || a.formatted_address || '';
  return String(a);
}

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(' ');
}

export default function AdminMerchantPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ id: string }>();
  const merchantId = params?.id;

  const [tab, setTab] = useState<'profile' | 'menu' | 'orders'>('profile');

  const [merchant, setMerchant] = useState<MerchantRow | null>(null);
  const [merchantForm, setMerchantForm] = useState<MerchantRow | null>(null);
  const [savingMerchant, setSavingMerchant] = useState(false);
  const [loadingMerchant, setLoadingMerchant] = useState(true);

  const [menu, setMenu] = useState<MenuItemRow[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [menuSearch, setMenuSearch] = useState('');
  const [menuCategory, setMenuCategory] = useState('all');

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [showBulkUpload, setShowBulkUpload] = useState(false);

  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  const [showLocationModal, setShowLocationModal] = useState(false);

  const isAdmin = useMemo(() => user?.role === 'admin' || user?.role === 'superadmin', [user?.role]);

  useEffect(() => {
    if (loading) return;
    if (!isAdmin) {
      const redirectTo = pathname || '/admin/merchants';
      router.replace(`/login?redirect=${encodeURIComponent(redirectTo)}`);
    }
  }, [loading, isAdmin, pathname, router]);

  useEffect(() => {
    if (!merchantId) return;
    if (!loading && isAdmin) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchantId, loading, isAdmin]);

  const loadAll = async () => {
    await Promise.all([loadMerchant(), loadMenu(), loadOrders()]);
  };

  const loadMerchant = async () => {
    if (!merchantId) return;
    setLoadingMerchant(true);
    try {
      const { data, error } = await supabase.from('merchants').select('*').eq('id', merchantId).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Merchant not found');
      setMerchant(data as MerchantRow);
      setMerchantForm(data as MerchantRow);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load merchant');
      setMerchant(null);
      setMerchantForm(null);
    } finally {
      setLoadingMerchant(false);
    }
  };

  const loadMenu = async () => {
    if (!merchantId) return;
    setLoadingMenu(true);
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setMenu((data as MenuItemRow[]) || []);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load menu');
      setMenu([]);
    } finally {
      setLoadingMenu(false);
    }
  };

  const loadOrders = async () => {
    if (!merchantId) return;
    setLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id,status,payment_method,payment_status,total_amount,delivery_address,items,created_at')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setOrders((data as OrderRow[]) || []);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load orders');
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  const saveMerchant = async () => {
    if (!merchantForm || !merchantId) return;
    setSavingMerchant(true);

    try {
      const payload: Partial<MerchantRow> = {
        business_name: merchantForm.business_name,
        business_type: merchantForm.business_type || 'restaurant',
        cuisine_types: Array.isArray(merchantForm.cuisine_types)
          ? merchantForm.cuisine_types
          : cuisineTextToArray(parseCuisineToText(merchantForm.cuisine_types)),
        description: merchantForm.description ?? null,
        phone: merchantForm.phone ?? null,
        email: merchantForm.email ?? null,
        address: merchantForm.address ?? null,
        city: merchantForm.city ?? null,
        state: merchantForm.state ?? null,
        postal_code: merchantForm.postal_code ?? null,
        latitude: merchantForm.latitude ?? null,
        longitude: merchantForm.longitude ?? null,
        logo_url: merchantForm.logo_url ?? null,
        banner_url: merchantForm.banner_url ?? null,
        is_active: !!merchantForm.is_active,
        is_verified: !!merchantForm.is_verified,
        is_featured: !!merchantForm.is_featured,
        delivery_radius_km: merchantForm.delivery_radius_km ?? null,
        min_order_amount: merchantForm.min_order_amount ?? null,
        estimated_prep_time: merchantForm.estimated_prep_time ?? null,
        commission_rate: merchantForm.commission_rate ?? null,
        gst_enabled: !!merchantForm.gst_enabled,
        gst_percentage: merchantForm.gst_percentage ?? 0,
        opening_time: merchantForm.opening_time ?? null,
        closing_time: merchantForm.closing_time ?? null,
        updated_at: new Date().toISOString(),
      };

      if (payload.gst_enabled && (payload.gst_percentage ?? 0) < 0) {
        toast.error('GST must be >= 0');
        setSavingMerchant(false);
        return;
      }

      const { error } = await supabase.from('merchants').update(payload).eq('id', merchantId);
      if (error) throw error;

      toast.success('Merchant updated');
      await loadMerchant();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update merchant');
    } finally {
      setSavingMerchant(false);
    }
  };

  const deleteMenuItem = async (id: string) => {
    if (!confirm('Delete this menu item?')) return;
    try {
      const { error } = await supabase.from('menu_items').delete().eq('id', id);
      if (error) throw error;
      toast.success('Deleted');
      await loadMenu();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete');
    }
  };

  const updateOrder = async (orderId: string, patch: any) => {
    try {
      const { error } = await supabase.from('orders').update(patch).eq('id', orderId);
      if (error) throw error;
      toast.success('Order updated');
      await loadOrders();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update order');
    }
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    menu.forEach((m) => set.add(String(m.category || 'Main Course')));
    return ['all', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [menu]);

  const filteredMenu = useMemo(() => {
    const q = menuSearch.trim().toLowerCase();
    return menu.filter((m) => {
      const byCat = menuCategory === 'all' ? true : String(m.category || '') === menuCategory;
      const byQ =
        !q ||
        String(m.name || '').toLowerCase().includes(q) ||
        String(m.description || '').toLowerCase().includes(q);
      return byCat && byQ;
    });
  }, [menu, menuSearch, menuCategory]);

  if (loading || !isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden" style={{ paddingBottom: `calc(96px + env(safe-area-inset-bottom))` }}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-5 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-gray-100 shrink-0"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
                {merchant?.business_name ? `Merchant: ${merchant.business_name}` : 'Merchant'}
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 truncate">{merchantId}</p>
            </div>
          </div>

          <div className="lg:ml-auto flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={loadAll}
              className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>

            <button
              type="button"
              onClick={saveMerchant}
              disabled={savingMerchant || !merchantForm}
              className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2 shadow"
            >
              <Save className="w-4 h-4" />
              {savingMerchant ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border p-2 flex gap-2 mb-5 w-full max-w-full overflow-x-hidden">
          <button
            type="button"
            onClick={() => setTab('profile')}
            className={cx(
              'flex-1 px-3 sm:px-4 py-2 rounded-xl font-semibold flex items-center justify-center gap-2 min-w-0 transition',
              tab === 'profile' ? 'bg-orange-50 text-primary' : 'hover:bg-gray-50 text-gray-700'
            )}
          >
            <Store className="w-4 h-4 shrink-0" />
            <span className="truncate">Profile</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('menu')}
            className={cx(
              'flex-1 px-3 sm:px-4 py-2 rounded-xl font-semibold flex items-center justify-center gap-2 min-w-0 transition',
              tab === 'menu' ? 'bg-orange-50 text-primary' : 'hover:bg-gray-50 text-gray-700'
            )}
          >
            <UtensilsCrossed className="w-4 h-4 shrink-0" />
            <span className="truncate">Menu</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('orders')}
            className={cx(
              'flex-1 px-3 sm:px-4 py-2 rounded-xl font-semibold flex items-center justify-center gap-2 min-w-0 transition',
              tab === 'orders' ? 'bg-orange-50 text-primary' : 'hover:bg-gray-50 text-gray-700'
            )}
          >
            <Package className="w-4 h-4 shrink-0" />
            <span className="truncate">Orders</span>
          </button>
        </div>

        {/* PROFILE */}
        {tab === 'profile' && (
          <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6 w-full max-w-full overflow-x-hidden">
            {loadingMerchant || !merchantForm ? (
              <div className="py-10 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
              </div>
            ) : (
              <>
                <div className="grid lg:grid-cols-2 gap-4 mb-6">
                  <div className="rounded-2xl border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-gray-900">Logo</p>
                        <p className="text-xs text-gray-600">Upload or paste a URL</p>
                      </div>
                    </div>
                    <div className="mt-3 h-32">
                      <ImageUpload
                        type="profile"
                        folder={`merchants/${merchantId}/logo`}
                        currentImage={merchantForm.logo_url || ''}
                        onUpload={(url: string) => setMerchantForm((p) => ({ ...(p as any), logo_url: url }))}
                      />
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <LinkIcon className="w-4 h-4 text-gray-500" />
                      <input
                        className="w-full border rounded-xl px-3 py-2 text-sm"
                        placeholder="https://..."
                        value={merchantForm.logo_url || ''}
                        onChange={(e) => setMerchantForm((p) => ({ ...(p as any), logo_url: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border p-4">
                    <div>
                      <p className="text-sm font-bold text-gray-900">Banner</p>
                      <p className="text-xs text-gray-600">Upload or paste a URL</p>
                    </div>
                    <div className="mt-3 h-32">
                      <ImageUpload
                        type="banner"
                        folder={`merchants/${merchantId}/banner`}
                        currentImage={merchantForm.banner_url || ''}
                        onUpload={(url: string) => setMerchantForm((p) => ({ ...(p as any), banner_url: url }))}
                      />
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <LinkIcon className="w-4 h-4 text-gray-500" />
                      <input
                        className="w-full border rounded-xl px-3 py-2 text-sm"
                        placeholder="https://..."
                        value={merchantForm.banner_url || ''}
                        onChange={(e) => setMerchantForm((p) => ({ ...(p as any), banner_url: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-5">
                  <div className="min-w-0">
                    <label className="text-sm font-semibold text-gray-700">Business name</label>
                    <input
                      className="mt-2 w-full border rounded-xl px-3 py-2"
                      value={merchantForm.business_name || ''}
                      onChange={(e) => setMerchantForm((p) => ({ ...(p as any), business_name: e.target.value }))}
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="text-sm font-semibold text-gray-700">Business type</label>
                    <input
                      className="mt-2 w-full border rounded-xl px-3 py-2"
                      value={merchantForm.business_type || ''}
                      onChange={(e) => setMerchantForm((p) => ({ ...(p as any), business_type: e.target.value }))}
                      placeholder="restaurant, cafe"
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="text-sm font-semibold text-gray-700">Phone</label>
                    <input
                      className="mt-2 w-full border rounded-xl px-3 py-2"
                      value={merchantForm.phone || ''}
                      onChange={(e) => setMerchantForm((p) => ({ ...(p as any), phone: e.target.value }))}
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="text-sm font-semibold text-gray-700">Email</label>
                    <input
                      className="mt-2 w-full border rounded-xl px-3 py-2"
                      value={merchantForm.email || ''}
                      onChange={(e) => setMerchantForm((p) => ({ ...(p as any), email: e.target.value }))}
                    />
                  </div>

                  <div className="min-w-0 lg:col-span-2">
                    <label className="text-sm font-semibold text-gray-700">Cuisine types (comma separated)</label>
                    <input
                      className="mt-2 w-full border rounded-xl px-3 py-2"
                      value={parseCuisineToText(merchantForm.cuisine_types)}
                      onChange={(e) => setMerchantForm((p) => ({ ...(p as any), cuisine_types: e.target.value }))}
                      placeholder="North Indian, Chinese"
                    />
                  </div>

                  <div className="min-w-0 lg:col-span-2">
                    <label className="text-sm font-semibold text-gray-700">Description</label>
                    <textarea
                      className="mt-2 w-full border rounded-xl px-3 py-2 min-h-[100px]"
                      value={merchantForm.description || ''}
                      onChange={(e) => setMerchantForm((p) => ({ ...(p as any), description: e.target.value }))}
                    />
                  </div>

                  <div className="min-w-0 lg:col-span-2 flex items-end justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <label className="text-sm font-semibold text-gray-700">Address</label>
                      <input
                        className="mt-2 w-full border rounded-xl px-3 py-2"
                        value={safeAddrText(merchantForm.address)}
                        onChange={(e) => setMerchantForm((p) => ({ ...(p as any), address: e.target.value }))}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowLocationModal(true)}
                      className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 font-semibold flex items-center gap-2 shrink-0"
                    >
                      <MapPin className="w-4 h-4" />
                      Update
                    </button>
                  </div>

                  <div className="min-w-0">
                    <label className="text-sm font-semibold text-gray-700">City</label>
                    <input
                      className="mt-2 w-full border rounded-xl px-3 py-2"
                      value={merchantForm.city || ''}
                      onChange={(e) => setMerchantForm((p) => ({ ...(p as any), city: e.target.value }))}
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="text-sm font-semibold text-gray-700">State</label>
                    <input
                      className="mt-2 w-full border rounded-xl px-3 py-2"
                      value={merchantForm.state || ''}
                      onChange={(e) => setMerchantForm((p) => ({ ...(p as any), state: e.target.value }))}
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="text-sm font-semibold text-gray-700">Postal code</label>
                    <input
                      className="mt-2 w-full border rounded-xl px-3 py-2"
                      value={merchantForm.postal_code || ''}
                      onChange={(e) => setMerchantForm((p) => ({ ...(p as any), postal_code: e.target.value }))}
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="text-sm font-semibold text-gray-700">Delivery radius (km)</label>
                    <input
                      type="number"
                      className="mt-2 w-full border rounded-xl px-3 py-2"
                      value={Number(merchantForm.delivery_radius_km ?? 0)}
                      onChange={(e) => setMerchantForm((p) => ({ ...(p as any), delivery_radius_km: Number(e.target.value) }))}
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="text-sm font-semibold text-gray-700">Min order amount</label>
                    <input
                      type="number"
                      className="mt-2 w-full border rounded-xl px-3 py-2"
                      value={Number(merchantForm.min_order_amount ?? 0)}
                      onChange={(e) => setMerchantForm((p) => ({ ...(p as any), min_order_amount: Number(e.target.value) }))}
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="text-sm font-semibold text-gray-700">Prep time (min)</label>
                    <input
                      type="number"
                      className="mt-2 w-full border rounded-xl px-3 py-2"
                      value={Number(merchantForm.estimated_prep_time ?? 30)}
                      onChange={(e) => setMerchantForm((p) => ({ ...(p as any), estimated_prep_time: Number(e.target.value) }))}
                    />
                  </div>

                  {/* GST */}
                  <div className="lg:col-span-2 rounded-2xl border p-4 bg-gradient-to-br from-white to-blue-50">
                    <p className="text-sm font-bold text-gray-900">GST Settings</p>
                    <p className="text-xs text-gray-600 mt-1">Enable GST and set percentage (example 5)</p>

                    <div className="mt-3 flex flex-col sm:flex-row gap-3 sm:items-center">
                      <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <input
                          type="checkbox"
                          checked={!!merchantForm.gst_enabled}
                          onChange={(e) => setMerchantForm((p) => ({ ...(p as any), gst_enabled: e.target.checked }))}
                        />
                        GST enabled
                      </label>

                      <div className="flex items-center gap-2 sm:ml-auto">
                        <span className="text-sm font-semibold text-gray-700">GST %</span>
                        <input
                          type="number"
                          min={0}
                          step={0.5}
                          className="w-28 border rounded-xl px-3 py-2"
                          value={Number(merchantForm.gst_percentage ?? 0)}
                          onChange={(e) => setMerchantForm((p) => ({ ...(p as any), gst_percentage: Number(e.target.value) }))}
                          disabled={!merchantForm.gst_enabled}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-2 flex flex-wrap gap-4 pt-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <input
                        type="checkbox"
                        checked={!!merchantForm.is_active}
                        onChange={(e) => setMerchantForm((p) => ({ ...(p as any), is_active: e.target.checked }))}
                      />
                      Active
                    </label>

                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <input
                        type="checkbox"
                        checked={!!merchantForm.is_verified}
                        onChange={(e) => setMerchantForm((p) => ({ ...(p as any), is_verified: e.target.checked }))}
                      />
                      Verified
                    </label>

                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <input
                        type="checkbox"
                        checked={!!merchantForm.is_featured}
                        onChange={(e) => setMerchantForm((p) => ({ ...(p as any), is_featured: e.target.checked }))}
                      />
                      Featured
                    </label>
                  </div>
                </div>

                {/* Location modal */}
                {showLocationModal && (
                  <>
                    <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowLocationModal(false)} />
                    <div className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden">
                      <div className="p-4 border-b flex items-center justify-between">
                        <h3 className="font-bold text-gray-900">Update merchant location</h3>
                        <button
                          type="button"
                          className="p-2 rounded-lg hover:bg-gray-100"
                          onClick={() => setShowLocationModal(false)}
                          aria-label="Close"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="p-4">
                        <p className="text-sm text-gray-600 mb-3">Search and select the correct address.</p>
                        <AddressAutocomplete
                          onSelect={(loc: any) => {
                            setMerchantForm((p) => ({
                              ...(p as any),
                              address: loc.address,
                              latitude: loc.lat,
                              longitude: loc.lon,
                            }));
                            toast.success('Location selected');
                            setShowLocationModal(false);
                          }}
                        />
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* MENU */}
        {tab === 'menu' && (
          <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6 w-full max-w-full overflow-x-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-gray-900">Menu</h2>
                <p className="text-sm text-gray-600">
                  {loadingMenu ? 'Loading…' : `${filteredMenu.length}/${menu.length} items`}
                </p>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowBulkUpload(true)}
                  className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 font-semibold"
                >
                  Bulk upload
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedItem(null);
                    setMenuModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-primary text-white hover:bg-orange-600 font-semibold flex items-center gap-2 shadow"
                >
                  <Plus className="w-4 h-4" />
                  Add item
                </button>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3 mb-4">
              <input
                className="w-full border rounded-xl px-3 py-2"
                placeholder="Search by name/description"
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
              />
              <select
                className="w-full border rounded-xl px-3 py-2"
                value={menuCategory}
                onChange={(e) => setMenuCategory(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === 'all' ? 'All categories' : c}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={loadMenu}
                className="w-full border rounded-xl px-3 py-2 hover:bg-gray-50 font-semibold flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh menu
              </button>
            </div>

            {loadingMenu ? (
              <div className="py-10 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
              </div>
            ) : filteredMenu.length === 0 ? (
              <div className="py-10 text-center text-gray-600">No items found.</div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredMenu.map((m) => (
                  <div key={m.id} className="border rounded-2xl p-4 hover:shadow-sm transition bg-white">
                    <div className="flex items-start gap-3">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                        {m.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.image_url} alt={m.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">No image</div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-gray-900 truncate">{m.name}</p>
                        <p className="text-xs text-gray-600 truncate">
                          {m.category || 'Main Course'} • {m.is_veg ? 'Veg' : 'Non-veg'} • {m.is_available ? 'Available' : 'Hidden'}
                        </p>
                        <p className="text-sm font-bold text-primary mt-1">{money(m.price)}</p>
                      </div>
                    </div>

                    {m.description && <p className="text-sm text-gray-700 mt-3 line-clamp-2">{m.description}</p>}

                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedItem(m as any);
                          setMenuModalOpen(true);
                        }}
                        className="flex-1 px-3 py-2 rounded-xl border hover:bg-gray-50 font-semibold flex items-center justify-center gap-2"
                      >
                        <Pencil className="w-4 h-4" />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteMenuItem(m.id)}
                        className="flex-1 px-3 py-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 font-semibold flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showBulkUpload && merchantId && (
              <BulkMenuUpload
                merchantId={merchantId}
                onClose={() => setShowBulkUpload(false)}
                onSuccess={loadMenu}
              />
            )}

            {menuModalOpen && merchantId && (
              <MenuItemModal
                item={selectedItem}
                merchantId={merchantId}
                onClose={() => {
                  setMenuModalOpen(false);
                  setSelectedItem(null);
                }}
                onSuccess={loadMenu}
              />
            )}
          </div>
        )}

        {/* ORDERS */}
        {tab === 'orders' && (
          <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6 w-full max-w-full overflow-x-hidden">
            <div className="flex items-center justify-between gap-3 mb-4 min-w-0">
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-gray-900">Orders</h2>
                <p className="text-sm text-gray-600">Latest 50 orders</p>
              </div>

              <button
                type="button"
                onClick={loadOrders}
                className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 font-semibold shrink-0"
              >
                <RefreshCw className="w-4 h-4 inline-block mr-2" />
                Refresh
              </button>
            </div>

            {loadingOrders ? (
              <div className="py-10 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
              </div>
            ) : orders.length === 0 ? (
              <div className="py-10 text-center text-gray-600">No orders found.</div>
            ) : (
              <div className="space-y-4">
                {orders.map((o) => {
                  const total = o.total_amount ?? 0;
                  const created = o.created_at ? new Date(o.created_at).toLocaleString() : '—';
                  const address = typeof o.delivery_address === 'string' ? o.delivery_address : o.delivery_address?.address;

                  return (
                    <div key={o.id} className="border rounded-2xl p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 truncate">Order {String(o.id).slice(0, 8)}</p>
                          <p className="text-xs text-gray-500 mt-1">Created: {created}</p>
                          <p className="text-sm text-gray-700 mt-2 line-clamp-2">Address: {address || '—'}</p>
                        </div>

                        <div className="text-right">
                          <p className="font-bold text-primary">{money(total)}</p>
                          <p className="text-xs text-gray-600 mt-1">
                            {o.payment_method || '—'} • {o.payment_status || '—'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-600">Status</label>
                          <select
                            className="mt-1 w-full border rounded-xl px-3 py-2"
                            value={String(o.status || 'pending')}
                            onChange={(e) => updateOrder(o.id, { status: e.target.value })}
                          >
                            {ORDER_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-600">Payment status</label>
                          <select
                            className="mt-1 w-full border rounded-xl px-3 py-2"
                            value={String(o.payment_status || 'pending')}
                            onChange={(e) => updateOrder(o.id, { payment_status: e.target.value })}
                          >
                            <option value="pending">pending</option>
                            <option value="paid">paid</option>
                            <option value="failed">failed</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-600">Quick actions</label>
                          <div className="mt-1 flex gap-2">
                            <button
                              type="button"
                              onClick={() => updateOrder(o.id, { status: 'confirmed' })}
                              className="flex-1 px-3 py-2 rounded-xl bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => updateOrder(o.id, { status: 'delivered' })}
                              className="flex-1 px-3 py-2 rounded-xl bg-green-50 text-green-700 font-semibold hover:bg-green-100"
                            >
                              Delivered
                            </button>
                          </div>
                        </div>
                      </div>

                      {Array.isArray(o.items) && o.items.length > 0 && (
                        <div className="mt-4 bg-gray-50 rounded-xl p-3">
                          <p className="text-xs font-semibold text-gray-700 mb-2">Items</p>
                          <div className="text-sm text-gray-700 space-y-1">
                            {o.items.slice(0, 8).map((it: any, idx: number) => (
                              <div key={idx} className="flex justify-between gap-3">
                                <span className="truncate min-w-0">
                                  {it?.name || 'Item'} × {it?.quantity ?? 1}
                                </span>
                                <span className="font-semibold shrink-0">{money((it?.price ?? 0) * (it?.quantity ?? 1))}</span>
                              </div>
                            ))}
                            {o.items.length > 8 && <p className="text-xs text-gray-500">…and more</p>}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
