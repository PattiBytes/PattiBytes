/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Plus, Edit2, Trash2, Loader2, Save, X, Package } from 'lucide-react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

type CustomProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  imageurl?: string | null;
  description?: string | null;
  isactive: boolean;
  createdat: string;
};

const CATEGORIES = [
  { value: 'custom', label: 'Custom Order' },
  { value: 'dairy', label: 'Dairy Products' },
  { value: 'grocery', label: 'Grocery' },
  { value: 'medicines', label: 'Medicines' },
];

export default function AdminCustomProductsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<CustomProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'custom',
    price: '',
    unit: 'pc',
    imageurl: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    const role = (user as any)?.role;
    if (!['admin', 'superadmin'].includes(role)) {
      toast.error('Access denied');
      router.push('/');
      return;
    }
    loadProducts();
  }, [user, router]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customproducts')
        .select('*')
        .order('category')
        .order('name');

      if (error) throw error;
      setProducts((data || []) as CustomProduct[]);
    } catch (e: any) {
      console.error('Load error:', e);
      toast.error(e?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Product name is required');
      return;
    }

    const price = parseFloat(formData.price);
    if (!price || price <= 0) {
      toast.error('Valid price is required');
      return;
    }

    setSubmitting(true);
    try {
      const productData = {
        name: formData.name.trim(),
        category: formData.category,
        price,
        unit: formData.unit.trim(),
        imageurl: formData.imageurl.trim() || null,
        description: formData.description.trim() || null,
        isactive: true,
        updatedat: new Date().toISOString(),
      };

      if (editingId) {
        const { error } = await supabase
          .from('customproducts')
          .update(productData)
          .eq('id', editingId);
        if (error) throw error;
        toast.success('Product updated successfully!');
      } else {
        const { error } = await supabase.from('customproducts').insert({
          ...productData,
          createdat: new Date().toISOString(),
        });
        if (error) throw error;
        toast.success('Product added successfully!');
      }

      setFormData({ name: '', category: 'custom', price: '', unit: 'pc', imageurl: '', description: '' });
      setShowForm(false);
      setEditingId(null);
      await loadProducts();
    } catch (e: any) {
      console.error('Submit error:', e);
      toast.error(e?.message || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (product: CustomProduct) => {
    setFormData({
      name: product.name,
      category: product.category,
      price: product.price.toString(),
      unit: product.unit,
      imageurl: product.imageurl || '',
      description: product.description || '',
    });
    setEditingId(product.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const { error } = await supabase.from('customproducts').delete().eq('id', id);
      if (error) throw error;
      toast.success('Product deleted');
      await loadProducts();
    } catch (e: any) {
      console.error('Delete error:', e);
      toast.error(e?.message || 'Failed to delete');
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('customproducts')
        .update({ isactive: !currentStatus, updatedat: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      toast.success(`Product ${!currentStatus ? 'activated' : 'deactivated'}`);
      await loadProducts();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update status');
    }
  };

  const cancelForm = () => {
    setFormData({ name: '', category: 'custom', price: '', unit: 'pc', imageurl: '', description: '' });
    setShowForm(false);
    setEditingId(null);
  };

  const filteredProducts = filterCategory === 'all' 
    ? products 
    : products.filter((p) => p.category === filterCategory);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <Package className="w-7 h-7 text-primary" />
              Custom Products
            </h1>
            <p className="text-sm text-gray-600">Manage products for quick orders</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-4 py-3 bg-primary text-white rounded-xl font-bold hover:shadow-lg transition-all hover:scale-105"
          >
            {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            {showForm ? 'Cancel' : 'Add Product'}
          </button>
        </div>

        {/* Category Filter */}
        <div className="mb-6 flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              filterCategory === 'all'
                ? 'bg-primary text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({products.length})
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setFilterCategory(cat.value)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                filterCategory === cat.value
                  ? 'bg-primary text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.label} ({products.filter((p) => p.category === cat.value).length})
            </button>
          ))}
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-lg border-2 border-primary/20 p-6 mb-6 animate-in slide-in-from-top duration-300"
          >
            <h3 className="text-lg font-black text-gray-900 mb-4">
              {editingId ? '✏️ Edit Product' : '➕ Add New Product'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Product Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g., Fresh Milk"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 font-semibold"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Price (₹) *</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="50.00"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Unit *</label>
                <input
                  type="text"
                  required
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g., ltr, kg, pc, pack"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-2">Image URL</label>
                <input
                  type="url"
                  value={formData.imageurl}
                  onChange={(e) => setFormData({ ...formData, imageurl: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="https://example.com/image.jpg"
                />
                {formData.imageurl && (
                  <div className="mt-2">
                    <img
                      src={formData.imageurl}
                      alt="Preview"
                      className="h-20 rounded-lg object-cover"
                      onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                    />
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                  placeholder="Product description (optional)..."
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-gradient-to-r from-primary to-pink-600 text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    {editingId ? 'Update Product' : 'Add Product'}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Products List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-12 text-center">
            <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">
              {filterCategory === 'all' 
                ? 'No products yet. Add your first product!'
                : `No products in ${CATEGORIES.find((c) => c.value === filterCategory)?.label} category`}
            </p>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:shadow-lg transition-all"
              >
                Add Product
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className={`bg-white rounded-xl shadow-md border-2 overflow-hidden transition-all hover:shadow-lg ${
                  product.isactive ? 'border-green-200' : 'border-gray-200 opacity-70'
                }`}
              >
                {product.imageurl ? (
                  <img
                    src={product.imageurl}
                    alt={product.name}
                    className="w-full h-40 object-cover"
                    onError={(e) => ((e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=No+Image')}
                  />
                ) : (
                  <div className="w-full h-40 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <Package className="w-12 h-12 text-gray-400" />
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-gray-900 flex-1 line-clamp-2">{product.name}</h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                        product.isactive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {product.isactive ? '✓ Active' : '✗ Inactive'}
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 mb-2 capitalize">
                    📦 {CATEGORIES.find((c) => c.value === product.category)?.label || product.category}
                  </p>

                  <p className="text-xl font-black text-primary mb-2">
                    ₹{product.price.toFixed(2)}
                    <span className="text-sm text-gray-600 font-semibold">/{product.unit}</span>
                  </p>

                  {product.description && (
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">{product.description}</p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleActive(product.id, product.isactive)}
                      className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all ${
                        product.isactive
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {product.isactive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleEdit(product)}
                      className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
