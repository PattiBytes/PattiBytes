/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { Plus, Loader2, Package, RefreshCw, Upload } from 'lucide-react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

import { useCustomProducts }   from '@/hooks/useCustomProducts';
import { ProductCard }         from '@/components/custom-products/ProductCard';
import { ProductFormModal }    from '@/components/custom-products/ProductFormModal';
import { CategoryFilter }      from '@/components/custom-products/CategoryFilter';
import { SearchSortBar }       from '@/components/custom-products/SearchSortBar';
import { ProductStats }        from '@/components/custom-products/ProductStats';
import { DeleteConfirmModal }  from '@/components/custom-products/DeleteConfirmModal';
import { BulkUploadModal }     from '@/components/custom-products/BulkUploadModal';
import { EMPTY_FORM, CATEGORIES } from '@/components/custom-products/types';
import type { CustomProduct, ProductFormData } from '@/components/custom-products/types';

export default function AdminCustomProductsPage() {
  const { user } = useAuth();
  const router   = useRouter();
  const { products, loading, load, toggleActive, remove } = useCustomProducts();

  const [showForm,         setShowForm]         = useState(false);
  const [showBulk,         setShowBulk]         = useState(false);
  const [editingProduct,   setEditingProduct]   = useState<CustomProduct | null>(null);
  const [deleteTarget,     setDeleteTarget]     = useState<CustomProduct | null>(null);
  const [filterCategory,   setFilterCategory]   = useState('all');
  const [search,           setSearch]           = useState('');
  const [sort,             setSort]             = useState('default');
  // Dynamic categories from DB (includes any custom ones set via bulk upload or form)
  const [dbCategories,     setDbCategories]     = useState<string[]>([]);

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const role = (user as any)?.role;
    if (!['admin', 'superadmin'].includes(role)) {
      toast.error('Access denied'); router.push('/'); return;
    }
    load();
    // eslint-disable-next-line react-hooks/immutability
    loadDbCategories();
  }, [user, router, load]);

  const loadDbCategories = async () => {
    try {
      // Fetch all distinct categories used in the table (picks up custom ones too)
      const { data } = await supabase.from('customproducts').select('category');
      const unique = [...new Set((data ?? []).map((r: any) => r.category))].filter(Boolean) as string[];
      setDbCategories(unique);
    } catch { /* non-critical */ }
  };

  // Merge preset + dynamic
  const allCategories = useMemo(() => {
    const extra = dbCategories.filter(c => !CATEGORIES.find(x => x.value === c));
    return [
      ...CATEGORIES,
      ...extra.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1), emoji: '🏷️' })),
    ];
  }, [dbCategories]);

  // ── Filtering / sorting ─────────────────────────────────────────────────────
  const displayed = useMemo(() => {
    let list = [...products];
    if (filterCategory !== 'all') list = list.filter(p => p.category === filterCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)
      );
    }
    switch (sort) {
      case 'name_asc':     list.sort((a,b) => a.name.localeCompare(b.name)); break;
      case 'name_desc':    list.sort((a,b) => b.name.localeCompare(a.name)); break;
      case 'price_asc':    list.sort((a,b) => a.price - b.price); break;
      case 'price_desc':   list.sort((a,b) => b.price - a.price); break;
      case 'active_first': list.sort((a,b) => (b.isactive ? 1:0) - (a.isactive ? 1:0)); break;
    }
    return list;
  }, [products, filterCategory, search, sort]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const openAdd   = () => { setEditingProduct(null); setShowForm(true); };
  const openEdit  = (p: CustomProduct) => { setEditingProduct(p); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditingProduct(null); };

  const handleSubmit = async (data: ProductFormData) => {
    const productData = {
      name:           data.name.trim(),
      category:       data.category,
      price:          parseFloat(data.price),
      unit:           data.unit.trim(),
      imageurl:       data.imageurl.trim() || null,
      description:    data.description.trim() || null,
      isactive:       true,
      available_from: data.available_from || null,
      available_to:   data.available_to   || null,
      available_days: data.available_days.length < 7 ? data.available_days : null,
      stock_qty:      data.stock_qty  ? parseInt(data.stock_qty)  : null,
      sort_order:     data.sort_order ? parseInt(data.sort_order) : null,
      updatedat:      new Date().toISOString(),
    };
    if (editingProduct) {
      const { error } = await supabase.from('customproducts').update(productData).eq('id', editingProduct.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Product updated!');
    } else {
      const { error } = await supabase.from('customproducts')
        .insert({ ...productData, createdat: new Date().toISOString() });
      if (error) { toast.error(error.message); return; }
      toast.success('Product added!');
    }
    closeForm();
    await load();
    await loadDbCategories();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await remove(deleteTarget.id);
    setDeleteTarget(null);
  };

  const formInitial: ProductFormData = editingProduct ? {
    name:           editingProduct.name,
    category:       editingProduct.category,
    price:          editingProduct.price.toString(),
    unit:           editingProduct.unit,
    imageurl:       editingProduct.imageurl    || '',
    description:    editingProduct.description || '',
    available_from: editingProduct.available_from || '',
    available_to:   editingProduct.available_to   || '',
    available_days: editingProduct.available_days ?? [0,1,2,3,4,5,6],
    stock_qty:      editingProduct.stock_qty?.toString()  ?? '',
    sort_order:     editingProduct.sort_order?.toString() ?? '',
  } : EMPTY_FORM;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <Package className="w-7 h-7 text-primary" /> Custom Products
            </h1>
            <p className="text-sm text-gray-500">
              {products.length} product{products.length !== 1 ? 's' : ''} in catalog
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { load(); loadDbCategories(); }} disabled={loading} title="Refresh"
              className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => setShowBulk(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-800 text-white
                         rounded-xl font-bold hover:shadow-lg transition-all hover:scale-105">
              <Upload className="w-4 h-4" /> Bulk Upload
            </button>
            <button onClick={openAdd}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white
                         rounded-xl font-bold hover:shadow-lg transition-all hover:scale-105 active:scale-95">
              <Plus className="w-5 h-5" /> Add Product
            </button>
          </div>
        </div>

        <ProductStats products={products} />

        {/* Category filter — uses merged preset + custom categories */}
        <CategoryFilter
          products={products}
          active={filterCategory}
          onChange={setFilterCategory}
          extraCategories={allCategories}
        />

        <SearchSortBar search={search} onSearch={setSearch} sort={sort} onSort={setSort} />

        {!loading && (
          <p className="text-xs text-gray-400 mb-4">
            Showing {displayed.length} of {products.length} product{products.length !== 1 ? 's' : ''}
            {filterCategory !== 'all' && ` in "${filterCategory}"`}
            {search && ` matching "${search}"`}
          </p>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-16 text-center">
            <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4 text-lg">
              {search ? `No results for "${search}"` : 'No products yet'}
            </p>
            {!search && (
              <div className="flex gap-3 justify-center">
                <button onClick={openAdd}
                  className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:shadow-lg transition-all">
                  Add Product
                </button>
                <button onClick={() => setShowBulk(true)}
                  className="px-6 py-3 bg-gray-800 text-white rounded-xl font-bold hover:shadow-lg transition-all">
                  Bulk Upload
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {displayed.map(product => (
              <ProductCard key={product.id} product={product}
                onEdit={() => openEdit(product)}
                onDelete={() => setDeleteTarget(product)}
                onToggle={() => toggleActive(product.id, product.isactive)} />
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <ProductFormModal initial={formInitial} isEditing={!!editingProduct}
          extraCategories={allCategories}
          onSubmit={handleSubmit} onClose={closeForm} />
      )}

      {showBulk && (
        <BulkUploadModal
          existingCategories={dbCategories}
          onClose={() => setShowBulk(false)}
          onImported={async () => { await load(); await loadDbCategories(); }}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal name={deleteTarget.name}
          onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      )}
    </DashboardLayout>
  );
}
