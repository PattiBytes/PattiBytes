/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { Copy, Edit, LogOut, Plus, RefreshCw, Tag, Trash2 } from 'lucide-react';

import {
  promoCodeService,
  PromoCodeRow,
  PromoScope,
  DiscountType,
  MenuItemLite,
  MerchantLite,
} from '@/services/promoCodes';

const DAYS: { n: number; label: string }[] = [
  { n: 1, label: 'Mon' },
  { n: 2, label: 'Tue' },
  { n: 3, label: 'Wed' },
  { n: 4, label: 'Thu' },
  { n: 5, label: 'Fri' },
  { n: 6, label: 'Sat' },
  { n: 7, label: 'Sun' },
];

function toDateInputValue(iso: string | null | undefined) {
  if (!iso) return '';
  const s = String(iso);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : '';
}

function startOfDayIso(dateStr: string) {
  // dateStr: YYYY-MM-DD
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toISOString();
}

function endOfDayIso(dateStr: string) {
  const d = new Date(`${dateStr}T23:59:59.999`);
  return d.toISOString();
}

function formatDateOrDash(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN');
}

function formatDays(days: number[] | null) {
  if (!days || days.length === 0) return '—';
  const map = new Map(DAYS.map(d => [d.n, d.label]));
  return days.map(n => map.get(n) ?? String(n)).join(', ');
}

type Mode = 'admin' | 'merchant';

export default function PromoCodesManager({ mode }: { mode: Mode }) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const isAdmin = user?.role === 'superadmin';
  const isMerchant = user?.role === 'merchant';

  const [loading, setLoading] = useState(true);
  const [promoCodes, setPromoCodes] = useState<PromoCodeRow[]>([]);

  // Admin merchant filter + merchant list
  const [merchants, setMerchants] = useState<MerchantLite[]>([]);
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>(''); // '' => all/global (admin)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const effectiveMerchantId =
    mode === 'merchant' ? (user?.id ?? '') : (selectedMerchantId || null);

  const [showModal, setShowModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCodeRow | null>(null);

  // Targets (menu items)
  const [menuQuery, setMenuQuery] = useState('');
  const [menuSuggestions, setMenuSuggestions] = useState<MenuItemLite[]>([]);
  const [selectedMenuItems, setSelectedMenuItems] = useState<MenuItemLite[]>([]);
  const searchTimer = useRef<any>(null);

  const [form, setForm] = useState({
    code: '',
    description: '',

    discount_type: 'percentage' as DiscountType,
    discount_value: '' as string | number,

    min_order_amount: '' as string | number,
    max_discount_amount: '' as string | number,

    usage_limit: '' as string | number,
    max_uses_per_user: '' as string | number,

    valid_from: '' as string, // date
    valid_until: '' as string, // date

    valid_days: [] as number[],
    start_time: '' as string, // HH:MM
    end_time: '' as string,   // HH:MM

    scope: (mode === 'merchant' ? 'merchant' : 'global') as PromoScope,
    merchant_id: '' as string, // used for admin create merchant/targets promos
  });

  useEffect(() => {
    // Guard routes
    if (mode === 'admin' && !isAdmin) return;
    if (mode === 'merchant' && !isMerchant) return;

    (async () => {
      try {
        if (mode === 'admin') {
          const ms = await promoCodeService.listMerchants();
          setMerchants(ms);
        }
      } catch (e: any) {
        console.error(e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, user?.role]);

  useEffect(() => {
    if (mode === 'admin' && !isAdmin) return;
    if (mode === 'merchant' && !isMerchant) return;
    loadPromoCodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedMerchantId, user?.id, user?.role]);

  const loadPromoCodes = async () => {
    try {
      setLoading(true);

      if (mode === 'merchant') {
        const mid = user?.id;
        if (!mid) return;
        const rows = await promoCodeService.listPromoCodes({ merchantId: mid, includeGlobal: false });
        setPromoCodes(rows);
      } else {
        // Admin:
        // - if selectedMerchantId set: show merchant + global
        // - else: show all promos
        if (selectedMerchantId) {
          const rows = await promoCodeService.listPromoCodes({ merchantId: selectedMerchantId, includeGlobal: true });
          setPromoCodes(rows);
        } else {
          const rows = await promoCodeService.listPromoCodes({ merchantId: null });
          setPromoCodes(rows);
        }
      }
    } catch (error: any) {
      console.error('Failed to load promo codes:', error);
      toast.error(error?.message || 'Failed to load promo codes');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Code copied!');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const resetForm = () => {
    setEditingPromo(null);
    setSelectedMenuItems([]);
    setMenuQuery('');
    setMenuSuggestions([]);
    setForm({
      code: '',
      description: '',
      discount_type: 'percentage',
      discount_value: '',
      min_order_amount: '',
      max_discount_amount: '',
      usage_limit: '',
      max_uses_per_user: '',
      valid_from: '',
      valid_until: '',
      valid_days: [],
      start_time: '',
      end_time: '',
      scope: (mode === 'merchant' ? 'merchant' : 'global'),
      merchant_id: '',
    });
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);

    if (mode === 'merchant') {
      setForm((p) => ({ ...p, scope: 'merchant' }));
    }
  };

  const openEdit = async (promo: PromoCodeRow) => {
    setEditingPromo(promo);
    setShowModal(true);
    setMenuQuery('');
    setMenuSuggestions([]);

    setForm({
      code: promo.code ?? '',
      description: promo.description ?? '',
      discount_type: promo.discount_type,
      discount_value: promo.discount_value ?? '',

      min_order_amount: promo.min_order_amount ?? '',
      max_discount_amount: promo.max_discount_amount ?? '',

      usage_limit: promo.usage_limit ?? '',
      max_uses_per_user: promo.max_uses_per_user ?? '',

      valid_from: toDateInputValue(promo.valid_from),
      valid_until: toDateInputValue(promo.valid_until),

      valid_days: (promo.valid_days ?? []) as number[],
      start_time: promo.start_time ? String(promo.start_time).slice(0, 5) : '',
      end_time: promo.end_time ? String(promo.end_time).slice(0, 5) : '',

      scope: promo.scope ?? (promo.merchant_id ? 'merchant' : 'global'),
      merchant_id: promo.merchant_id ?? '',
    });

    if (promo.scope === 'targets') {
      try {
        const targets = await promoCodeService.getPromoTargets(promo.id);
        const menuIds = targets.map(t => t.menu_item_id).filter(Boolean) as string[];
        if (menuIds.length > 0) {
          // fetch menu item details to show chips
          // (simple approach: query by ids)
          const { data, error } = await (await import('@/lib/supabase')).supabase
            .from('menu_items')
            .select('id,merchant_id,name,price,image_url,category_id')
            .in('id', menuIds);

          if (error) throw error;
          setSelectedMenuItems((data ?? []) as any);
        } else {
          setSelectedMenuItems([]);
        }
      } catch (e: any) {
        console.error(e);
        toast.error('Failed to load promo targets');
      }
    } else {
      setSelectedMenuItems([]);
    }
  };

  const onToggleDay = (n: number) => {
    setForm((p) => {
      const has = p.valid_days.includes(n);
      const next = has ? p.valid_days.filter(x => x !== n) : [...p.valid_days, n];
      next.sort((a, b) => a - b);
      return { ...p, valid_days: next };
    });
  };

  const handleToggleActive = async (promo: PromoCodeRow) => {
    try {
      const next = !promo.is_active;
      await promoCodeService.toggleActive(promo.id, next);
      toast.success(`Promo code ${next ? 'activated' : 'deactivated'}!`);
      loadPromoCodes();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to update');
    }
  };

  const handleDelete = async (promo: PromoCodeRow) => {
    if (!confirm(`Delete promo "${promo.code}"?`)) return;
    try {
      await promoCodeService.deletePromoCode(promo.id);
      toast.success('Deleted');
      loadPromoCodes();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to delete');
    }
  };

  // Menu item suggestions (debounced)
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);

    const q = menuQuery.trim();
    const merchantForSearch =
      mode === 'merchant'
        ? user?.id
        : (form.merchant_id || selectedMerchantId || '');

    if (!q || !merchantForSearch) {
      setMenuSuggestions([]);
      return;
    }

    searchTimer.current = setTimeout(async () => {
      try {
        const items = await promoCodeService.searchMenuItems({
          merchantId: merchantForSearch,
          query: q,
          limit: 10,
          includeUnavailable: true,
        });
        setMenuSuggestions(items);
      } catch (e) {
        console.error(e);
        setMenuSuggestions([]);
      }
    }, 250);

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
     
  }, [menuQuery, form.merchant_id, selectedMerchantId, mode, user?.id]);

  const addMenuItemTarget = (it: MenuItemLite) => {
    setSelectedMenuItems((prev) => (prev.some(x => x.id === it.id) ? prev : [...prev, it]));
    setMenuQuery('');
    setMenuSuggestions([]);
  };

  const removeMenuItemTarget = (id: string) => {
    setSelectedMenuItems((prev) => prev.filter(x => x.id !== id));
  };

  const stats = useMemo(() => {
    const active = promoCodes.filter((p) => p.is_active).length;
    return { total: promoCodes.length, active };
  }, [promoCodes]);

  const canUseGlobal = mode === 'admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const code = String(form.code || '').trim().toUpperCase();
    if (!code) return toast.error('Promo code is required');

    const discountValue = Number(form.discount_value) || 0;
    if (discountValue <= 0) return toast.error('Discount value must be > 0');

    const scope: PromoScope = form.scope;

    // Determine merchant_id to store
    let merchantIdToSave: string | null = null;

    if (scope === 'global') {
      if (!canUseGlobal) return toast.error('Only admin can create global promos');
      merchantIdToSave = null;
    } else {
      if (mode === 'merchant') {
        merchantIdToSave = user?.id ?? null;
      } else {
        merchantIdToSave = form.merchant_id ? form.merchant_id : null;
      }
      if (!merchantIdToSave) return toast.error('Please select a merchant/restaurant');
    }

    // If targets scope, must have at least 1 target
    if (scope === 'targets' && selectedMenuItems.length === 0) {
      return toast.error('Please add at least 1 menu item target');
    }

    const payload: Partial<PromoCodeRow> = {
      code,
      description: String(form.description || '').trim() || null,

      discount_type: form.discount_type,
      discount_value: discountValue,

      min_order_amount: form.min_order_amount === '' ? null : Number(form.min_order_amount) || 0,
      max_discount_amount: form.max_discount_amount === '' ? null : Number(form.max_discount_amount) || 0,

      usage_limit: form.usage_limit === '' ? null : Number(form.usage_limit) || 0,
      max_uses_per_user: form.max_uses_per_user === '' ? null : Number(form.max_uses_per_user) || 0,

      valid_from: form.valid_from ? startOfDayIso(form.valid_from) : null,
      valid_until: form.valid_until ? endOfDayIso(form.valid_until) : null,

      valid_days: form.valid_days.length > 0 ? form.valid_days : null,
      start_time: form.start_time ? `${form.start_time}:00` : null,
      end_time: form.end_time ? `${form.end_time}:00` : null,

      scope,
      merchant_id: merchantIdToSave,
      created_by: (editingPromo?.created_by ?? user?.id ?? null) as any,
      updated_at: new Date().toISOString(),
    };

    try {
      setLoading(true);

      let saved: PromoCodeRow;

      if (editingPromo) {
        saved = await promoCodeService.updatePromoCode(editingPromo.id, payload);
      } else {
        saved = await promoCodeService.createPromoCode({
          ...payload,
          created_at: new Date().toISOString(),
          is_active: true,
          used_count: 0,
        } as any);
      }

      // Save targets
      if (scope === 'targets') {
        await promoCodeService.replacePromoTargets({
          promoCodeId: saved.id,
          merchantId: merchantIdToSave,
          menuItemIds: selectedMenuItems.map(x => x.id),
        });
      } else {
        // clear any old targets if switching away from targets
        if (editingPromo) {
          await promoCodeService.replacePromoTargets({
            promoCodeId: saved.id,
            merchantId: merchantIdToSave,
            menuItemIds: [],
          });
        }
      }

      toast.success(editingPromo ? 'Promo updated!' : 'Promo created!');
      setShowModal(false);
      resetForm();
      loadPromoCodes();
    } catch (error: any) {
      console.error('Failed to save promo:', error);
      toast.error(error?.message || 'Failed to save promo');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'admin' && !isAdmin) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 py-10">
          <div className="bg-white border rounded-2xl p-6">
            <h2 className="text-xl font-bold">Access denied</h2>
            <p className="text-gray-600 mt-1">Admin only.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (mode === 'merchant' && !isMerchant) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 py-10">
          <div className="bg-white border rounded-2xl p-6">
            <h2 className="text-xl font-bold">Access denied</h2>
            <p className="text-gray-600 mt-1">Merchant only.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Promo Codes {mode === 'admin' ? '(Admin)' : '(Merchant)'}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {stats.total} total • {stats.active} active
            </p>

            {mode === 'admin' && (
              <div className="mt-3 flex gap-2 flex-wrap items-center">
                <label className="text-sm font-semibold text-gray-700">Filter merchant:</label>
                <select
                  value={selectedMerchantId}
                  onChange={(e) => setSelectedMerchantId(e.target.value)}
                  className="px-3 py-2 border rounded-xl bg-white"
                >
                  <option value="">All promos (global + all merchants)</option>
                  {merchants.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name || m.email || m.id}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={loadPromoCodes}
              className="px-3 py-2 rounded-xl border hover:bg-gray-50 font-semibold flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <button
              onClick={openCreate}
              className="px-3 py-2 rounded-xl bg-primary text-white hover:bg-orange-600 font-semibold flex items-center gap-2 shadow"
            >
              <Plus size={16} />
              Create
            </button>

            <button
              onClick={handleLogout}
              className="px-3 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 font-semibold flex items-center gap-2"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-24 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : promoCodes.length > 0 ? (
          <div className="grid gap-3">
            {promoCodes.map((promo) => (
              <div
                key={promo.id}
                className={`bg-white rounded-2xl border shadow-sm p-4 border-l-4 ${
                  promo.is_active ? 'border-green-500' : 'border-gray-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Tag className="text-primary" size={18} />
                      <h3 className="text-xl font-bold text-gray-900">{promo.code}</h3>

                      <button
                        onClick={() => copyCode(promo.code)}
                        className="text-gray-500 hover:text-primary"
                        title="Copy code"
                      >
                        <Copy size={16} />
                      </button>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          promo.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {promo.is_active ? 'Active' : 'Inactive'}
                      </span>

                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                        {promo.scope}
                      </span>

                      {promo.merchant_id ? (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                          merchant
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800">
                          global
                        </span>
                      )}
                    </div>

                    {promo.description && <p className="text-sm text-gray-600 mt-2">{promo.description}</p>}

                    <div className="grid sm:grid-cols-5 gap-3 text-sm mt-3">
                      <div>
                        <span className="text-gray-500">Discount</span>
                        <p className="font-semibold">
                          {promo.discount_type === 'percentage' ? `${promo.discount_value}%` : `₹${promo.discount_value}`}
                        </p>
                      </div>

                      <div>
                        <span className="text-gray-500">Min order</span>
                        <p className="font-semibold">₹{promo.min_order_amount ?? 0}</p>
                      </div>

                      <div>
                        <span className="text-gray-500">Usage</span>
                        <p className="font-semibold">
                          {promo.used_count ?? 0} / {promo.usage_limit ?? '—'}
                        </p>
                      </div>

                      <div>
                        <span className="text-gray-500">Valid until</span>
                        <p className="font-semibold">{formatDateOrDash(promo.valid_until)}</p>
                      </div>

                      <div>
                        <span className="text-gray-500">Days/time</span>
                        <p className="font-semibold">
                          {formatDays(promo.valid_days)} {promo.start_time && promo.end_time ? `(${String(promo.start_time).slice(0,5)}-${String(promo.end_time).slice(0,5)})` : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleActive(promo)}
                      className={`px-3 py-2 rounded-xl font-semibold ${
                        promo.is_active
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                      }`}
                    >
                      {promo.is_active ? 'Deactivate' : 'Activate'}
                    </button>

                    <button
                      onClick={() => openEdit(promo)}
                      className="px-3 py-2 bg-blue-100 text-blue-800 rounded-xl hover:bg-blue-200 font-semibold"
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>

                    <button
                      onClick={() => handleDelete(promo)}
                      className="px-3 py-2 bg-red-100 text-red-800 rounded-xl hover:bg-red-200 font-semibold"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border">
            <Tag size={56} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No promo codes yet</h3>
            <p className="text-gray-600">Create your first promo code</p>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
              <h2 className="text-xl font-bold mb-4">{editingPromo ? 'Edit Promo Code' : 'Create Promo Code'}</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Promo Code *</label>
                    <input
                      type="text"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-3 border rounded-xl uppercase"
                      placeholder="WELCOME50"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Scope *</label>
                    <select
                      value={form.scope}
                      onChange={(e) => setForm({ ...form, scope: e.target.value as PromoScope })}
                      className="w-full px-4 py-3 border rounded-xl"
                    >
                      {mode === 'admin' && <option value="global">Global (admin)</option>}
                      <option value="merchant">{mode === 'merchant' ? 'My restaurant' : 'Specific merchant'}</option>
                      <option value="targets">Specific menu items</option>
                    </select>
                  </div>

                  {mode === 'admin' && form.scope !== 'global' && (
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Merchant/Restaurant *</label>
                      <select
                        value={form.merchant_id}
                        onChange={(e) => setForm({ ...form, merchant_id: e.target.value })}
                        className="w-full px-4 py-3 border rounded-xl bg-white"
                        required
                      >
                        <option value="">Select merchant</option>
                        {merchants.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.full_name || m.email || m.id}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Discount Type *</label>
                    <select
                      value={form.discount_type}
                      onChange={(e) => setForm({ ...form, discount_type: e.target.value as DiscountType })}
                      className="w-full px-4 py-3 border rounded-xl"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (₹)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Discount Value *</label>
                    <input
                      type="number"
                      value={form.discount_value}
                      onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                      className="w-full px-4 py-3 border rounded-xl"
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Min Order Amount (₹)</label>
                    <input
                      type="number"
                      value={form.min_order_amount}
                      onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })}
                      className="w-full px-4 py-3 border rounded-xl"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Max Discount Amount (₹)</label>
                    <input
                      type="number"
                      value={form.max_discount_amount}
                      onChange={(e) => setForm({ ...form, max_discount_amount: e.target.value })}
                      className="w-full px-4 py-3 border rounded-xl"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Usage Limit (global)</label>
                    <input
                      type="number"
                      value={form.usage_limit}
                      onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
                      className="w-full px-4 py-3 border rounded-xl"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Max uses per user</label>
                    <input
                      type="number"
                      value={form.max_uses_per_user}
                      onChange={(e) => setForm({ ...form, max_uses_per_user: e.target.value })}
                      className="w-full px-4 py-3 border rounded-xl"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Valid From (optional)</label>
                    <input
                      type="date"
                      value={form.valid_from}
                      onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                      className="w-full px-4 py-3 border rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Valid Until (optional)</label>
                    <input
                      type="date"
                      value={form.valid_until}
                      onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                      className="w-full px-4 py-3 border rounded-xl"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Valid Days (optional)</label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS.map((d) => (
                        <button
                          type="button"
                          key={d.n}
                          onClick={() => onToggleDay(d.n)}
                          className={`px-3 py-2 rounded-xl border text-sm font-semibold ${
                            form.valid_days.includes(d.n) ? 'bg-primary text-white border-primary' : 'bg-white hover:bg-gray-50'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setForm(p => ({ ...p, valid_days: [] }))}
                        className="px-3 py-2 rounded-xl border text-sm font-semibold hover:bg-gray-50"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Start Time (optional)</label>
                    <input
                      type="time"
                      value={form.start_time}
                      onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                      className="w-full px-4 py-3 border rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">End Time (optional)</label>
                    <input
                      type="time"
                      value={form.end_time}
                      onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                      className="w-full px-4 py-3 border rounded-xl"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className="w-full px-4 py-3 border rounded-xl"
                      rows={3}
                    />
                  </div>

                  {form.scope === 'targets' && (
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Target menu items *</label>

                      <input
                        type="text"
                        value={menuQuery}
                        onChange={(e) => setMenuQuery(e.target.value)}
                        placeholder="Search menu items (e.g. Espresso)"
                        className="w-full px-4 py-3 border rounded-xl"
                      />

                      {menuSuggestions.length > 0 && (
                        <div className="mt-2 border rounded-xl overflow-hidden">
                          {menuSuggestions.map((it) => (
                            <button
                              type="button"
                              key={it.id}
                              onClick={() => addMenuItemTarget(it)}
                              className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between"
                            >
                              <span className="font-semibold">{it.name}</span>
                              <span className="text-sm text-gray-600">₹{it.price}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {selectedMenuItems.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {selectedMenuItems.map((it) => (
                            <span
                              key={it.id}
                              className="px-3 py-2 rounded-xl bg-gray-100 text-gray-900 text-sm font-semibold flex items-center gap-2"
                            >
                              {it.name}
                              <button
                                type="button"
                                onClick={() => removeMenuItemTarget(it.id)}
                                className="text-gray-600 hover:text-red-600"
                                title="Remove"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="flex-1 px-4 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 font-semibold"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-3 rounded-xl bg-primary text-white hover:bg-orange-600 font-semibold disabled:opacity-50"
                  >
                    {loading ? 'Saving…' : editingPromo ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
