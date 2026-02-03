/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Plus, Tag, Edit, Trash2, Copy, LogOut, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';

interface PromoCodeRow {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  usage_limit: number | null;
  used_count: number | null;
  is_active: boolean | null;
  valid_from: string | null;
  valid_until: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

function toDateInputValue(iso: string | null | undefined) {
  if (!iso) return '';
  // iso like "2026-01-31 07:26:13.695786+00" OR real ISO
  // safest: take first 10 chars if it begins with YYYY-MM-DD
  const s = String(iso);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : '';
}

function formatDateOrDash(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN');
}

export default function PromoCodesPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [promoCodes, setPromoCodes] = useState<PromoCodeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCodeRow | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: '' as string | number,
    min_order_amount: '' as string | number,
    max_discount_amount: '' as string | number,
    usage_limit: 100 as number,
    valid_from: '' as string, // optional
    valid_until: '' as string, // optional
  });

  useEffect(() => {
    loadPromoCodes();
  }, []);

  const loadPromoCodes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('promo_codes').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setPromoCodes((data as PromoCodeRow[]) || []);
    } catch (error) {
      console.error('Failed to load promo codes:', error);
      toast.error('Failed to load promo codes');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      discount_type: 'percentage',
      discount_value: '',
      min_order_amount: '',
      max_discount_amount: '',
      usage_limit: 100,
      valid_from: '',
      valid_until: '',
    });
  };

  const openCreate = () => {
    resetForm();
    setEditingPromo(null);
    setShowModal(true);
  };

  const openEditModal = (promo: PromoCodeRow) => {
    setEditingPromo(promo);
    setFormData({
      code: promo.code || '',
      description: promo.description || '',
      discount_type: promo.discount_type,
      discount_value: promo.discount_value ?? '',
      min_order_amount: promo.min_order_amount ?? '',
      max_discount_amount: promo.max_discount_amount ?? '',
      usage_limit: promo.usage_limit ?? 100,
      valid_from: toDateInputValue(promo.valid_from),
      valid_until: toDateInputValue(promo.valid_until),
    });
    setShowModal(true);
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Code copied to clipboard!');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleToggleActive = async (promo: PromoCodeRow) => {
    try {
      const next = !(promo.is_active ?? true);
      const { error } = await supabase.from('promo_codes').update({ is_active: next }).eq('id', promo.id);
      if (error) throw error;
      toast.success(`Promo code ${next ? 'activated' : 'deactivated'}!`);
      loadPromoCodes();
    } catch (error: any) {
      console.error('Failed to toggle promo code:', error);
      toast.error(error?.message || 'Failed to update promo code');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promo code?')) return;

    try {
      const { error } = await supabase.from('promo_codes').delete().eq('id', id);
      if (error) throw error;
      toast.success('Promo code deleted!');
      loadPromoCodes();
    } catch (error: any) {
      console.error('Failed to delete promo code:', error);
      toast.error(error?.message || 'Failed to delete promo code');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const code = String(formData.code || '').trim().toUpperCase();
    if (!code) return toast.error('Promo code is required');

    const discount_value = Number(formData.discount_value) || 0;
    if (discount_value <= 0) return toast.error('Discount value must be greater than 0');

    const payload: any = {
      code,
      description: String(formData.description || '').trim() || null,
      discount_type: formData.discount_type,
      discount_value,
      min_order_amount: formData.min_order_amount === '' ? null : Number(formData.min_order_amount) || 0,
      max_discount_amount: formData.max_discount_amount === '' ? null : Number(formData.max_discount_amount) || 0,
      usage_limit: Number(formData.usage_limit) || 0,
      // DB can store null for open-ended validity
      valid_from: formData.valid_from ? new Date(formData.valid_from).toISOString() : null,
      valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    try {
      setLoading(true);

      if (editingPromo) {
        // Do NOT override used_count automatically
        const { error } = await supabase.from('promo_codes').update(payload).eq('id', editingPromo.id);
        if (error) throw error;
        toast.success('Promo code updated!');
      } else {
        const insertPayload = {
          ...payload,
          created_at: new Date().toISOString(),
          created_by: user?.id ?? null,
          is_active: true,
          used_count: 0,
        };

        const { error } = await supabase.from('promo_codes').insert([insertPayload]);
        if (error) throw error;
        toast.success('Promo code created!');
      }

      setShowModal(false);
      setEditingPromo(null);
      resetForm();
      loadPromoCodes();
    } catch (error: any) {
      console.error('Failed to save promo code:', error);
      toast.error(error?.message || 'Failed to save promo code');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const active = promoCodes.filter((p) => p.is_active).length;
    return { total: promoCodes.length, active };
  }, [promoCodes]);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Promo Codes</h1>
            <p className="text-sm text-gray-600 mt-1">
              {stats.total} total • {stats.active} active
            </p>
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
                    </div>

                    {promo.description && <p className="text-sm text-gray-600 mt-2">{promo.description}</p>}

                    <div className="grid sm:grid-cols-4 gap-3 text-sm mt-3">
                      <div>
                        <span className="text-gray-500">Discount</span>
                        <p className="font-semibold">
                          {promo.discount_type === 'percentage'
                            ? `${promo.discount_value}%`
                            : `₹${promo.discount_value}`}
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
                      onClick={() => openEditModal(promo)}
                      className="px-3 py-2 bg-blue-100 text-blue-800 rounded-xl hover:bg-blue-200 font-semibold"
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>

                    <button
                      onClick={() => handleDelete(promo.id)}
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
            <p className="text-gray-600">Create your first promo code to boost sales</p>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
              <h2 className="text-xl font-bold mb-4">{editingPromo ? 'Edit Promo Code' : 'Create Promo Code'}</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Promo Code *</label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-3 border rounded-xl uppercase"
                      placeholder="WELCOME50"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Discount Type *</label>
                    <select
                      value={formData.discount_type}
                      onChange={(e) =>
                        setFormData({ ...formData, discount_type: e.target.value as 'percentage' | 'fixed' })
                      }
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
                      value={formData.discount_value}
                      onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                      className="w-full px-4 py-3 border rounded-xl"
                      required
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Usage Limit</label>
                    <input
                      type="number"
                      value={formData.usage_limit}
                      onChange={(e) => setFormData({ ...formData, usage_limit: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 border rounded-xl"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Min Order Amount (₹)</label>
                    <input
                      type="number"
                      value={formData.min_order_amount}
                      onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })}
                      className="w-full px-4 py-3 border rounded-xl"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Max Discount Amount (₹)</label>
                    <input
                      type="number"
                      value={formData.max_discount_amount}
                      onChange={(e) => setFormData({ ...formData, max_discount_amount: e.target.value })}
                      className="w-full px-4 py-3 border rounded-xl"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Valid From (optional)</label>
                    <input
                      type="date"
                      value={formData.valid_from}
                      onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                      className="w-full px-4 py-3 border rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Valid Until (optional)</label>
                    <input
                      type="date"
                      value={formData.valid_until}
                      onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                      className="w-full px-4 py-3 border rounded-xl"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-3 border rounded-xl"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingPromo(null);
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
