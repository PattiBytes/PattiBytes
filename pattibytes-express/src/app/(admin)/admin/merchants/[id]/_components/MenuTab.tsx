/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { Plus, RefreshCw, Search, SlidersHorizontal, UtensilsCrossed, LayoutGrid, List } from 'lucide-react';
import { MenuItemRow, CategoryInfo, getDraftCategories } from './types';
import { MenuItemCard } from './MenuItemCard';
import { CategoryManager } from './CategoryManager';
import BulkMenuUpload from '@/components/merchant/BulkMenuUpload';
import MenuItemModal from '@/components/merchant/MenuItemModal';
import { MenuItem } from '@/types';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';

interface Props {
  merchantId: string;
  menu: MenuItemRow[];
  loading: boolean;
  onRefresh: () => void;
}

type VegFilter = 'all' | 'veg' | 'nonveg';
type AvailFilter = 'all' | 'available' | 'hidden';

export function MenuTab({ merchantId, menu, loading, onRefresh }: Props) {
  const [search, setSearch]           = useState('');
  const [catFilter, setCatFilter]     = useState('all');
  const [vegFilter, setVegFilter]     = useState<VegFilter>('all');
  const [availFilter, setAvailFilter] = useState<AvailFilter>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode]       = useState<'grid' | 'list'>('grid');
  const [showBulk, setShowBulk]       = useState(false);
  const [modalOpen, setModalOpen]     = useState(false);
  const [editItem, setEditItem]       = useState<MenuItem | null>(null);
  const [draftCats, setDraftCats]     = useState<string[]>([]);

  useEffect(() => { setDraftCats(getDraftCategories(merchantId)); }, [merchantId, modalOpen]);

  // Build CategoryInfo list
  const categoriesInfo = useMemo<CategoryInfo[]>(() => {
    const map = new Map<string, number>();
    menu.forEach(m => {
      const k = m.category || 'Uncategorized';
      map.set(k, (map.get(k) || 0) + 1);
    });
    draftCats.forEach(d => { if (!map.has(d)) map.set(d, 0); });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [menu, draftCats]);

  const availableCategoriesForModal = useMemo(() =>
    categoriesInfo.map(c => c.name), [categoriesInfo]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return menu.filter(m => {
      const byCat  = catFilter === 'all'   || (m.category || 'Uncategorized') === catFilter;
      const byVeg  = vegFilter === 'all'   || (vegFilter === 'veg' ? m.is_veg : !m.is_veg);
      const byAvail = availFilter === 'all' || (availFilter === 'available' ? m.is_available : !m.is_available);
      const byQ    = !q || m.name.toLowerCase().includes(q) || (m.description || '').toLowerCase().includes(q);
      return byCat && byVeg && byAvail && byQ;
    });
  }, [menu, search, catFilter, vegFilter, availFilter]);

  const stats = useMemo(() => ({
    total:      menu.length,
    available:  menu.filter(m => m.is_available).length,
    veg:        menu.filter(m => m.is_veg).length,
    discounted: menu.filter(m => Number(m.discount_percentage) > 0).length,
  }), [menu]);

  const deleteItem = useCallback(async (id: string) => {
    if (!confirm('Delete this menu item?')) return;
    try {
      const { error } = await supabase.from('menu_items').delete().eq('id', id);
      if (error) throw error;
      toast.success('Item deleted');
      onRefresh();
    } catch (e: any) { toast.error(e?.message || 'Delete failed'); }
  }, [onRefresh]);

  const toggleAvail = useCallback(async (id: string, current: boolean) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_available: !current, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      toast.success(current ? 'Item hidden' : 'Item now visible');
      onRefresh();
    } catch (e: any) { toast.error(e?.message || 'Update failed'); }
  }, [onRefresh]);

  const openEdit = (item: MenuItemRow) => {
    setEditItem(item as unknown as MenuItem);
    setModalOpen(true);
  };

  const openAdd = () => {
    setEditItem(null);
    setModalOpen(true);
  };

  const groupedByCategory = useMemo(() => {
    if (catFilter !== 'all') return null;
    const map = new Map<string, MenuItemRow[]>();
    filtered.forEach(m => {
      const k = m.category || 'Uncategorized';
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(m);
    });
    return map;
  }, [filtered, catFilter]);

  const CARD_GRID = viewMode === 'grid'
    ? 'grid md:grid-cols-2 xl:grid-cols-3 gap-4'
    : 'grid gap-3';

  return (
    <div className="space-y-4">
      {/* Stats strip */}
      {!loading && menu.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total',      value: stats.total,      bg: 'bg-blue-50',   text: 'text-blue-700'    },
            { label: 'Available',  value: stats.available,  bg: 'bg-green-50',  text: 'text-green-700'   },
            { label: 'Veg',        value: stats.veg,        bg: 'bg-emerald-50', text: 'text-emerald-700' },
            { label: 'Discounted', value: stats.discounted, bg: 'bg-orange-50', text: 'text-orange-700'  },
          ].map(({ label, value, bg, text }) => (
            <div key={label} className={`${bg} rounded-2xl p-3 text-center border border-white shadow-sm`}>
              <p className={`text-2xl font-black ${text}`}>{value}</p>
              <p className="text-xs text-gray-500 font-medium mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Category Manager */}
      <CategoryManager
        merchantId={merchantId}
        categories={categoriesInfo}
        onCategoriesChanged={() => { onRefresh(); setDraftCats(getDraftCategories(merchantId)); }}
      />

      {/* Menu Panel */}
      <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-primary" /> Menu Items
            </h2>
            {!loading && (
              <p className="text-sm text-gray-400 mt-0.5">
                {filtered.length} of {menu.length} item{menu.length !== 1 ? 's' : ''} shown
              </p>
            )}
          </div>

          <div className="flex gap-2 flex-wrap items-center">
            {/* View mode */}
            <div className="flex border rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-2 transition ${viewMode === 'grid' ? 'bg-primary text-white' : 'hover:bg-gray-50 text-gray-500'}`}
                title="Grid"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-2 transition ${viewMode === 'list' ? 'bg-primary text-white' : 'hover:bg-gray-50 text-gray-500'}`}
                title="List"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(f => !f)}
              className={`px-3 py-2 rounded-xl border text-sm font-semibold flex items-center gap-2 transition ${showFilters ? 'bg-primary/10 border-primary/30 text-primary' : 'hover:bg-gray-50 text-gray-600'}`}
            >
              <SlidersHorizontal className="w-4 h-4" /> Filters
            </button>
            <button
              type="button"
              onClick={() => setShowBulk(true)}
              className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-semibold transition"
            >
              Bulk Upload
            </button>
            <button
              type="button"
              onClick={onRefresh}
              className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-gray-500" />
            </button>
            <button
              type="button"
              onClick={openAdd}
              className="px-4 py-2 rounded-xl bg-primary text-white hover:bg-orange-600 text-sm font-semibold flex items-center gap-2 shadow transition"
            >
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full border rounded-xl pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
            placeholder="Search by name or description…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Advanced filters panel */}
        {showFilters && (
          <div className="grid sm:grid-cols-3 gap-3 p-3 bg-gray-50 rounded-xl border mb-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Category</label>
              <select
                className="w-full border rounded-xl px-3 py-2 text-sm bg-white"
                value={catFilter}
                onChange={e => setCatFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categoriesInfo.map(c => (
                  <option key={c.name} value={c.name}>{c.name} ({c.count})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Diet</label>
              <div className="flex gap-1.5">
                {(['all', 'veg', 'nonveg'] as VegFilter[]).map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVegFilter(v)}
                    className={`flex-1 py-2 rounded-xl border text-xs font-semibold transition ${vegFilter === v ? 'bg-primary text-white border-primary' : 'hover:bg-gray-100'}`}
                  >
                    {v === 'all' ? 'All' : v === 'veg' ? '🌿 Veg' : '🍖 Non-veg'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Availability</label>
              <div className="flex gap-1.5">
                {(['all', 'available', 'hidden'] as AvailFilter[]).map(a => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAvailFilter(a)}
                    className={`flex-1 py-2 rounded-xl border text-xs font-semibold transition ${availFilter === a ? 'bg-primary text-white border-primary' : 'hover:bg-gray-100'}`}
                  >
                    {a === 'all' ? 'All' : a === 'available' ? '👁 Live' : '🚫 Hidden'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Category chips (compact mode) */}
        {!showFilters && categoriesInfo.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-4">
            {[{ name: 'all', count: menu.length }, ...categoriesInfo].map(({ name, count }) => (
              <button
                key={name}
                type="button"
                onClick={() => setCatFilter(name)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
                  catFilter === name
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {name === 'all' ? 'All' : name}
                <span className={`ml-1 text-[10px] ${catFilter === name ? 'opacity-80' : 'text-gray-400'}`}>
                  ({count})
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Items */}
        {loading ? (
          /* Skeleton grid */
          <div className={CARD_GRID}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border overflow-hidden animate-pulse">
                <div className="h-36 bg-gray-100" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-8 bg-gray-100 rounded-xl mt-3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-center">
            <div className="text-5xl">🍽️</div>
            <p className="text-lg font-bold text-gray-900">
              {menu.length === 0 ? 'No items yet' : 'No items match'}
            </p>
            <p className="text-sm text-gray-400">
              {menu.length === 0 ? 'Click "Add Item" to get started' : 'Try adjusting filters'}
            </p>
            {menu.length === 0 && (
              <button
                type="button"
                onClick={openAdd}
                className="mt-2 px-5 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-orange-600 transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add First Item
              </button>
            )}
          </div>
        ) : groupedByCategory ? (
          /* Grouped view */
          <div className="space-y-8">
            {Array.from(groupedByCategory.entries()).map(([cat, items]) => (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-extrabold text-gray-700 uppercase tracking-wide">{cat}</h3>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">{items.length}</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
                <div className={CARD_GRID}>
                  {items.map(item => (
                    <MenuItemCard
                      key={item.id} item={item}
                      onEdit={openEdit} onDelete={deleteItem} onToggle={toggleAvail}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Flat filtered view */
          <div className={CARD_GRID}>
            {filtered.map(item => (
              <MenuItemCard
                key={item.id} item={item}
                onEdit={openEdit} onDelete={deleteItem} onToggle={toggleAvail}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showBulk && (
        <BulkMenuUpload merchantId={merchantId} onClose={() => setShowBulk(false)} onSuccess={onRefresh} />
      )}
      {modalOpen && (
        <MenuItemModal
          item={editItem}
          merchantId={merchantId}
          availableCategories={availableCategoriesForModal}
          onClose={() => { setModalOpen(false); setEditItem(null); }}
          onSuccess={() => { onRefresh(); setDraftCats(getDraftCategories(merchantId)); }}
        />
      )}
    </div>
  );
}
