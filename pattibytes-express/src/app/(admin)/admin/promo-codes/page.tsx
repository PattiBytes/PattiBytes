/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Plus, Tag, Edit, Trash2, Copy, LogOut } from 'lucide-react';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';

interface PromoCode {
  id: string;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_discount_amount: number;
  usage_limit: number;
  usage_count: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
}

export default function PromoCodesPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: '' as string | number,
    min_order_amount: '' as string | number,
    max_discount_amount: '' as string | number,
    usage_limit: 100,
    valid_until: '',
  });

  useEffect(() => {
    loadPromoCodes();
  }, []);

  const loadPromoCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPromoCodes(data || []);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const promoData = {
        code: formData.code.toUpperCase(),
        description: formData.description,
        discount_type: formData.discount_type,
        discount_value: Number(formData.discount_value) || 0,
        min_order_amount: Number(formData.min_order_amount) || 0,
        max_discount_amount: Number(formData.max_discount_amount) || 0,
        usage_limit: formData.usage_limit,
        valid_until: formData.valid_until,
        created_by: user?.id,
        is_active: true,
      };

      if (editingPromo) {
        const { error } = await supabase
          .from('promo_codes')
          .update(promoData)
          .eq('id', editingPromo.id);

        if (error) throw error;
        toast.success('Promo code updated!');
      } else {
        const { error } = await supabase
          .from('promo_codes')
          .insert([promoData]);

        if (error) throw error;
        toast.success('Promo code created!');
      }

      setShowModal(false);
      setEditingPromo(null);
      resetForm();
      loadPromoCodes();
    } catch (error: any) {
      console.error('Failed to save promo code:', error);
      toast.error(error.message || 'Failed to save promo code');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promo code?')) return;

    try {
      const { error } = await supabase
        .from('promo_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Promo code deleted!');
      loadPromoCodes();
    } catch (error: any) {
      console.error('Failed to delete promo code:', error);
      toast.error(error.message || 'Failed to delete promo code');
    }
  };

  const handleToggleActive = async (promo: PromoCode) => {
    try {
      const { error } = await supabase
        .from('promo_codes')
        .update({ is_active: !promo.is_active })
        .eq('id', promo.id);

      if (error) throw error;
      toast.success(`Promo code ${promo.is_active ? 'deactivated' : 'activated'}!`);
      loadPromoCodes();
    } catch (error: any) {
      console.error('Failed to toggle promo code:', error);
      toast.error(error.message || 'Failed to update promo code');
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard!');
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
      valid_until: '',
    });
  };

  const openEditModal = (promo: PromoCode) => {
    setEditingPromo(promo);
    setFormData({
      code: promo.code,
      description: promo.description,
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      min_order_amount: promo.min_order_amount,
      max_discount_amount: promo.max_discount_amount,
      usage_limit: promo.usage_limit,
      valid_until: promo.valid_until?.split('T')[0] || '',
    });
    setShowModal(true);
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Promo Codes</h1>
            <p className="text-gray-600 mt-1">Create and manage discount codes</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                resetForm();
                setEditingPromo(null);
                setShowModal(true);
              }}
              className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-orange-600 font-medium flex items-center gap-2"
            >
              <Plus size={20} />
              Create Promo Code
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 font-medium flex items-center gap-2"
            >
              <LogOut size={20} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Promo Codes List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-32 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : promoCodes.length > 0 ? (
          <div className="grid gap-4">
            {promoCodes.map((promo) => (
              <div
                key={promo.id}
                className={`bg-white rounded-lg shadow p-6 border-l-4 ${
                  promo.is_active ? 'border-green-500' : 'border-gray-400'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <Tag className="text-primary" size={24} />
                        <h3 className="text-2xl font-bold text-gray-900">{promo.code}</h3>
                      </div>
                      <button
                        onClick={() => copyCode(promo.code)}
                        className="text-gray-500 hover:text-primary"
                        title="Copy code"
                      >
                        <Copy size={18} />
                      </button>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          promo.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {promo.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <p className="text-gray-600 mb-3">{promo.description}</p>

                    <div className="grid md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Discount:</span>
                        <p className="font-semibold">
                          {promo.discount_type === 'percentage'
                            ? `${promo.discount_value}%`
                            : `₹${promo.discount_value}`}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Min Order:</span>
                        <p className="font-semibold">₹{promo.min_order_amount}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Usage:</span>
                        <p className="font-semibold">
                          {promo.usage_count} / {promo.usage_limit}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Valid Until:</span>
                        <p className="font-semibold">
                          {new Date(promo.valid_until).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleToggleActive(promo)}
                      className={`px-4 py-2 rounded-lg font-medium ${
                        promo.is_active
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                      }`}
                    >
                      {promo.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => openEditModal(promo)}
                      className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 font-medium"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(promo.id)}
                      className="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 font-medium"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg">
            <Tag size={64} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No promo codes yet</h3>
            <p className="text-gray-600">Create your first promo code to boost sales</p>
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8">
              <h2 className="text-2xl font-bold mb-6">
                {editingPromo ? 'Edit Promo Code' : 'Create Promo Code'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Promo Code *
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value.toUpperCase() })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent uppercase"
                      placeholder="SAVE50"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Discount Type *
                    </label>
                    <select
                      value={formData.discount_type}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          discount_type: e.target.value as 'percentage' | 'fixed',
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (₹)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Discount Value *
                    </label>
                    <input
                      type="number"
                      value={formData.discount_value}
                      onChange={(e) =>
                        setFormData({ ...formData, discount_value: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder={formData.discount_type === 'percentage' ? '10' : '50'}
                      required
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Min Order Amount (₹)
                    </label>
                    <input
                      type="number"
                      value={formData.min_order_amount}
                      onChange={(e) =>
                        setFormData({ ...formData, min_order_amount: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="0"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Discount Amount (₹)
                    </label>
                    <input
                      type="number"
                      value={formData.max_discount_amount}
                      onChange={(e) =>
                        setFormData({ ...formData, max_discount_amount: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="100"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Usage Limit *
                    </label>
                    <input
                      type="number"
                      value={formData.usage_limit}
                      onChange={(e) =>
                        setFormData({ ...formData, usage_limit: parseInt(e.target.value) || 0 })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="100"
                      required
                      min="1"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Valid Until *
                    </label>
                    <input
                      type="date"
                      value={formData.valid_until}
                      onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      rows={3}
                      placeholder="Get 50% off on your first order"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingPromo(null);
                      resetForm();
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-primary text-white px-6 py-3 rounded-lg hover:bg-orange-600 font-medium disabled:opacity-50"
                  >
                    {loading
                      ? 'Saving...'
                      : editingPromo
                      ? 'Update Promo Code'
                      : 'Create Promo Code'}
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
