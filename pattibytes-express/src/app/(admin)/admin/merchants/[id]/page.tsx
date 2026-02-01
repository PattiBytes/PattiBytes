/* eslint-disable react-hooks/exhaustive-deps */
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
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import BulkMenuUpload from '@/components/merchant/BulkMenuUpload';
import ImageUpload from '@/components/common/ImageUpload';
import AddressAutocomplete from '@/components/AddressAutocomplete';

type MerchantRow = {
  id: string;
  business_name: string;
  description?: string | null;
  phone?: string | null;
  email?: string | null;

  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;

  latitude?: number | null;
  longitude?: number | null;

  cuisine_types?: any;
  logo_url?: string | null;
  banner_url?: string | null;

  is_active?: boolean | null;
  is_verified?: boolean | null;

  delivery_radius_km?: number | null;
  min_order_amount?: number | null;
  estimated_prep_time?: number | null;

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
  is_veg?: boolean | null;
  is_available?: boolean | null;
  image_url?: string | null;
  discount_percentage?: number | null;
  preparation_time?: number | null;
  created_at?: string;
};

type OrderRow = {
  id: string;
  status?: string | null;
  paymentmethod?: string | null;
  paymentstatus?: string | null;
  totalamount?: number | null;
  deliveryaddress?: string | null;
  createdat?: string | null;

  payment_method?: string | null;
  payment_status?: string | null;
  total_amount?: number | null;
  delivery_address?: string | null;
  created_at?: string | null;

  items?: any;
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
  return text
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function money(n: any) {
  const v = Number(n || 0);
  try {
    return v.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  } catch {
    return `₹${Math.round(v)}`;
  }
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

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [showBulkUpload, setShowBulkUpload] = useState(false);

  const [editingItem, setEditingItem] = useState<MenuItemRow | null>(null);
  const [itemDraft, setItemDraft] = useState<Partial<MenuItemRow>>({});
  const [savingItem, setSavingItem] = useState(false);

  const [showLocationModal, setShowLocationModal] = useState(false);

  const isAdmin = useMemo(() => user?.role === 'admin' || user?.role === 'superadmin', [user?.role]);

  useEffect(() => {
    if (loading) return;
    if (!isAdmin) {
      const redirectTo = pathname || '/admin';
      router.replace(`/login?redirect=${encodeURIComponent(redirectTo)}`);
    }
  }, [loading, isAdmin, pathname, router]);

  useEffect(() => {
    if (!merchantId) return;
    if (!loading && isAdmin) loadAll();
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
      setMenu((data || []) as MenuItemRow[]);
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
    setOrders((data || []) as OrderRow[]);
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
        description: merchantForm.description || null,
        phone: merchantForm.phone || null,
        email: merchantForm.email || null,

        address: merchantForm.address || null,
        city: merchantForm.city || null,
        state: merchantForm.state || null,
        postal_code: merchantForm.postal_code || null,

        latitude: merchantForm.latitude ?? null,
        longitude: merchantForm.longitude ?? null,

        cuisine_types: Array.isArray(merchantForm.cuisine_types)
          ? merchantForm.cuisine_types
          : cuisineTextToArray(parseCuisineToText(merchantForm.cuisine_types)),

        logo_url: merchantForm.logo_url || null,
        banner_url: merchantForm.banner_url || null,

        is_active: !!merchantForm.is_active,
        is_verified: !!merchantForm.is_verified,

        delivery_radius_km: merchantForm.delivery_radius_km ?? null,
        min_order_amount: merchantForm.min_order_amount ?? null,
        estimated_prep_time: merchantForm.estimated_prep_time ?? null,
      };

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

  const openNewItem = () => {
    setEditingItem(null);
    setItemDraft({
      name: '',
      description: '',
      price: 0,
      category: 'Main Course',
      is_veg: false,
      is_available: true,
    });
  };

  const openEditItem = (item: MenuItemRow) => {
    setEditingItem(item);
    setItemDraft({ ...item });
  };

  const saveMenuItem = async () => {
    if (!merchantId) return;
    const name = String(itemDraft.name || '').trim();
    const price = Number(itemDraft.price || 0);

    if (!name) return toast.error('Name is required');
    if (!Number.isFinite(price) || price <= 0) return toast.error('Price must be > 0');

    setSavingItem(true);
    try {
      if (editingItem?.id) {
        const { error } = await supabase
          .from('menu_items')
          .update({
            name,
            description: itemDraft.description || null,
            price,
            category: itemDraft.category || 'Main Course',
            is_veg: !!itemDraft.is_veg,
            is_available: itemDraft.is_available !== false,
            image_url: itemDraft.image_url || null,
            discount_percentage: itemDraft.discount_percentage ?? null,
            preparation_time: itemDraft.preparation_time ?? null,
          })
          .eq('id', editingItem.id);

        if (error) throw error;
        toast.success('Menu item updated');
      } else {
        const { error } = await supabase.from('menu_items').insert({
          merchant_id: merchantId,
          name,
          description: itemDraft.description || null,
          price,
          category: itemDraft.category || 'Main Course',
          is_veg: !!itemDraft.is_veg,
          is_available: itemDraft.is_available !== false,
          image_url: itemDraft.image_url || null,
          discount_percentage: itemDraft.discount_percentage ?? null,
          preparation_time: itemDraft.preparation_time ?? null,
        });

        if (error) throw error;
        toast.success('Menu item created');
      }

      setEditingItem(null);
      setItemDraft({});
      await loadMenu();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save item');
    } finally {
      setSavingItem(false);
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

  if (loading || !isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-gray-100"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
              Admin • Merchant {merchant?.business_name ? `• ${merchant.business_name}` : ''}
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 truncate">{merchantId}</p>
          </div>
        </div>

        <div className="sm:ml-auto flex gap-2">
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
            className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {savingMerchant ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow p-2 flex gap-2 mb-5">
        <button
          type="button"
          onClick={() => setTab('profile')}
          className={`flex-1 px-3 sm:px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 ${
            tab === 'profile' ? 'bg-orange-50 text-primary' : 'hover:bg-gray-50 text-gray-700'
          }`}
        >
          <Store className="w-4 h-4" />
          Profile
        </button>

        <button
          type="button"
          onClick={() => setTab('menu')}
          className={`flex-1 px-3 sm:px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 ${
            tab === 'menu' ? 'bg-orange-50 text-primary' : 'hover:bg-gray-50 text-gray-700'
          }`}
        >
          <UtensilsCrossed className="w-4 h-4" />
          Menu
        </button>

        <button
          type="button"
          onClick={() => setTab('orders')}
          className={`flex-1 px-3 sm:px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 ${
            tab === 'orders' ? 'bg-orange-50 text-primary' : 'hover:bg-gray-50 text-gray-700'
          }`}
        >
          <Package className="w-4 h-4" />
          Orders
        </button>
      </div>

      {/* PROFILE */}
      {tab === 'profile' && (
        <div className="bg-white rounded-xl shadow p-4 sm:p-6">
          {loadingMerchant || !merchantForm ? (
            <div className="py-10 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
            </div>
          ) : (
            <>
              {/* Uploads */}
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Logo</label>
                  <div className="mt-2 h-32">
                    <ImageUpload
                      type="profile"
                      folder={`merchants/${merchantId}/logo`}
                      currentImage={merchantForm.logo_url || ''}
                      onUpload={(url) => setMerchantForm({ ...merchantForm, logo_url: url })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Banner</label>
                  <div className="mt-2 h-32">
                    <ImageUpload
                      type="banner"
                      folder={`merchants/${merchantId}/banner`}
                      currentImage={merchantForm.banner_url || ''}
                      onUpload={(url) => setMerchantForm({ ...merchantForm, banner_url: url })}
                    />
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Business name</label>
                  <input
                    className="mt-2 w-full border rounded-lg px-3 py-2"
                    value={merchantForm.business_name || ''}
                    onChange={(e) => setMerchantForm({ ...merchantForm, business_name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Phone</label>
                  <input
                    className="mt-2 w-full border rounded-lg px-3 py-2"
                    value={merchantForm.phone || ''}
                    onChange={(e) => setMerchantForm({ ...merchantForm, phone: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Email</label>
                  <input
                    className="mt-2 w-full border rounded-lg px-3 py-2"
                    value={merchantForm.email || ''}
                    onChange={(e) => setMerchantForm({ ...merchantForm, email: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Cuisine types (comma separated)</label>
                  <input
                    className="mt-2 w-full border rounded-lg px-3 py-2"
                    value={parseCuisineToText(merchantForm.cuisine_types)}
                    onChange={(e) => setMerchantForm({ ...merchantForm, cuisine_types: e.target.value })}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-gray-700">Description</label>
                  <textarea
                    className="mt-2 w-full border rounded-lg px-3 py-2 min-h-[90px]"
                    value={merchantForm.description || ''}
                    onChange={(e) => setMerchantForm({ ...merchantForm, description: e.target.value })}
                  />
                </div>

                <div className="md:col-span-2 flex items-end justify-between gap-3">
                  <div className="flex-1">
                    <label className="text-sm font-semibold text-gray-700">Address</label>
                    <input
                      className="mt-2 w-full border rounded-lg px-3 py-2"
                      value={merchantForm.address || ''}
                      onChange={(e) => setMerchantForm({ ...merchantForm, address: e.target.value })}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowLocationModal(true)}
                    className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 font-semibold flex items-center gap-2"
                  >
                    <MapPin className="w-4 h-4" />
                    Update location
                  </button>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">City</label>
                  <input
                    className="mt-2 w-full border rounded-lg px-3 py-2"
                    value={merchantForm.city || ''}
                    onChange={(e) => setMerchantForm({ ...merchantForm, city: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">State</label>
                  <input
                    className="mt-2 w-full border rounded-lg px-3 py-2"
                    value={merchantForm.state || ''}
                    onChange={(e) => setMerchantForm({ ...merchantForm, state: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Postal code</label>
                  <input
                    className="mt-2 w-full border rounded-lg px-3 py-2"
                    value={merchantForm.postal_code || ''}
                    onChange={(e) => setMerchantForm({ ...merchantForm, postal_code: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Estimated prep time (min)</label>
                  <input
                    type="number"
                    className="mt-2 w-full border rounded-lg px-3 py-2"
                    value={merchantForm.estimated_prep_time ?? 30}
                    onChange={(e) => setMerchantForm({ ...merchantForm, estimated_prep_time: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Min order amount</label>
                  <input
                    type="number"
                    className="mt-2 w-full border rounded-lg px-3 py-2"
                    value={merchantForm.min_order_amount ?? 0}
                    onChange={(e) => setMerchantForm({ ...merchantForm, min_order_amount: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Delivery radius (km)</label>
                  <input
                    type="number"
                    className="mt-2 w-full border rounded-lg px-3 py-2"
                    value={merchantForm.delivery_radius_km ?? 0}
                    onChange={(e) => setMerchantForm({ ...merchantForm, delivery_radius_km: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Latitude</label>
                  <input
                    type="number"
                    className="mt-2 w-full border rounded-lg px-3 py-2"
                    value={merchantForm.latitude ?? 0}
                    onChange={(e) => setMerchantForm({ ...merchantForm, latitude: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Longitude</label>
                  <input
                    type="number"
                    className="mt-2 w-full border rounded-lg px-3 py-2"
                    value={merchantForm.longitude ?? 0}
                    onChange={(e) => setMerchantForm({ ...merchantForm, longitude: Number(e.target.value) })}
                  />
                </div>

                <div className="md:col-span-2 flex flex-wrap gap-4 pt-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <input
                      type="checkbox"
                      checked={!!merchantForm.is_active}
                      onChange={(e) => setMerchantForm({ ...merchantForm, is_active: e.target.checked })}
                    />
                    Active
                  </label>

                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <input
                      type="checkbox"
                      checked={!!merchantForm.is_verified}
                      onChange={(e) => setMerchantForm({ ...merchantForm, is_verified: e.target.checked })}
                    />
                    Verified
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
                          setMerchantForm({
                            ...merchantForm,
                            address: loc.address,
                            latitude: loc.lat,
                            longitude: loc.lon,
                          });
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
        <div className="bg-white rounded-xl shadow p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Menu</h2>
              <p className="text-sm text-gray-600">{menu.length} items</p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowBulkUpload(true)}
                className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 font-semibold"
              >
                Bulk upload
              </button>

              <button
                type="button"
                onClick={openNewItem}
                className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-orange-600 font-semibold flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add item
              </button>
            </div>
          </div>

          {loadingMenu ? (
            <div className="py-10 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
            </div>
          ) : menu.length === 0 ? (
            <div className="py-10 text-center text-gray-600">No items yet. Add or bulk upload.</div>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Category</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Price</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Available</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Veg</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {menu.map((m) => (
                    <tr key={m.id} className="border-t">
                      <td className="px-4 py-3 font-semibold">{m.name}</td>
                      <td className="px-4 py-3">{m.category || '—'}</td>
                      <td className="px-4 py-3 text-right">{money(m.price)}</td>
                      <td className="px-4 py-3 text-center">{m.is_available ? 'Yes' : 'No'}</td>
                      <td className="px-4 py-3 text-center">{m.is_veg ? 'Yes' : 'No'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            type="button"
                            onClick={() => openEditItem(m)}
                            className="p-2 rounded-lg hover:bg-gray-100"
                            aria-label="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteMenuItem(m.id)}
                            className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                            aria-label="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {(editingItem || Object.keys(itemDraft).length > 0) && (
            <>
              <div
                className="fixed inset-0 bg-black/50 z-50"
                onClick={() => {
                  setEditingItem(null);
                  setItemDraft({});
                }}
              />
              <div className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-2xl bg-white rounded-xl shadow-2xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  {editingItem ? 'Edit menu item' : 'Add menu item'}
                </h3>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-gray-700">Name</label>
                    <input
                      className="mt-2 w-full border rounded-lg px-3 py-2"
                      value={String(itemDraft.name || '')}
                      onChange={(e) => setItemDraft({ ...itemDraft, name: e.target.value })}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-gray-700">Description</label>
                    <textarea
                      className="mt-2 w-full border rounded-lg px-3 py-2 min-h-[80px]"
                      value={String(itemDraft.description || '')}
                      onChange={(e) => setItemDraft({ ...itemDraft, description: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700">Price</label>
                    <input
                      type="number"
                      className="mt-2 w-full border rounded-lg px-3 py-2"
                      value={Number(itemDraft.price || 0)}
                      onChange={(e) => setItemDraft({ ...itemDraft, price: Number(e.target.value) })}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700">Category</label>
                    <input
                      className="mt-2 w-full border rounded-lg px-3 py-2"
                      value={String(itemDraft.category || '')}
                      onChange={(e) => setItemDraft({ ...itemDraft, category: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700">Image URL</label>
                    <input
                      className="mt-2 w-full border rounded-lg px-3 py-2"
                      value={String(itemDraft.image_url || '')}
                      onChange={(e) => setItemDraft({ ...itemDraft, image_url: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700">Discount %</label>
                    <input
                      type="number"
                      className="mt-2 w-full border rounded-lg px-3 py-2"
                      value={Number(itemDraft.discount_percentage || 0)}
                      onChange={(e) => setItemDraft({ ...itemDraft, discount_percentage: Number(e.target.value) })}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700">Prep time (min)</label>
                    <input
                      type="number"
                      className="mt-2 w-full border rounded-lg px-3 py-2"
                      value={Number(itemDraft.preparation_time || 0)}
                      onChange={(e) => setItemDraft({ ...itemDraft, preparation_time: Number(e.target.value) })}
                    />
                  </div>

                  <div className="flex items-center gap-4 pt-6">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <input
                        type="checkbox"
                        checked={itemDraft.is_available !== false}
                        onChange={(e) => setItemDraft({ ...itemDraft, is_available: e.target.checked })}
                      />
                      Available
                    </label>

                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <input
                        type="checkbox"
                        checked={!!itemDraft.is_veg}
                        onChange={(e) => setItemDraft({ ...itemDraft, is_veg: e.target.checked })}
                      />
                      Veg
                    </label>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingItem(null);
                      setItemDraft({});
                    }}
                    className="flex-1 px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveMenuItem}
                    disabled={savingItem}
                    className="flex-1 px-4 py-3 rounded-lg bg-primary text-white hover:bg-orange-600 font-semibold disabled:opacity-50"
                  >
                    {savingItem ? 'Saving…' : 'Save item'}
                  </button>
                </div>
              </div>
            </>
          )}

          {showBulkUpload && merchantId && (
            <BulkMenuUpload merchantId={merchantId} onClose={() => setShowBulkUpload(false)} onSuccess={() => loadMenu()} />
          )}
        </div>
      )}

      {/* ORDERS */}
      {tab === 'orders' && (
        <div className="bg-white rounded-xl shadow p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Orders</h2>
              <p className="text-sm text-gray-600">Latest 50 orders for this merchant</p>
            </div>

            <button
              type="button"
              onClick={loadOrders}
              className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 font-semibold"
            >
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
const paymentMethod = o.payment_method || '—';
const paymentStatus = o.payment_status || '—';
const address = o.delivery_address || '—';
const created = o.created_at || '';


                return (
                  <div key={o.id} className="border rounded-xl p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 truncate">Order #{String(o.id).slice(0, 8)}</p>
                        <p className="text-xs text-gray-500 mt-1">{created ? `Created: ${created}` : 'Created: —'}</p>
                        <p className="text-sm text-gray-700 mt-2 line-clamp-2">Address: {address}</p>
                      </div>

                      <div className="text-right">
                        <p className="font-bold text-primary">{money(total)}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          {paymentMethod} • {paymentStatus}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-600">Status</label>
                        <select
                          className="mt-1 w-full border rounded-lg px-3 py-2"
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
                          className="mt-1 w-full border rounded-lg px-3 py-2"
                          value={String(paymentStatus)}
                          onChange={(e) => updateOrder(o.id, { paymentstatus: e.target.value })}
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
                            className="flex-1 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => updateOrder(o.id, { status: 'delivered' })}
                            className="flex-1 px-3 py-2 rounded-lg bg-green-50 text-green-700 font-semibold hover:bg-green-100"
                          >
                            Delivered
                          </button>
                        </div>
                      </div>
                    </div>

                    {Array.isArray(o.items) && o.items.length > 0 && (
                      <div className="mt-4 bg-gray-50 rounded-lg p-3">
                        <p className="text-xs font-semibold text-gray-700 mb-2">Items</p>
                        <div className="text-sm text-gray-700 space-y-1">
                          {o.items.slice(0, 8).map((it: any, idx: number) => (
                            <div key={idx} className="flex justify-between gap-3">
                              <span className="truncate">
                                {it?.name || 'Item'} × {it?.quantity ?? 1}
                              </span>
                              <span className="font-semibold">{money((it?.price ?? 0) * (it?.quantity ?? 1))}</span>
                            </div>
                          ))}
                          {o.items.length > 8 && <p className="text-xs text-gray-500">+ more…</p>}
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
  );
}
