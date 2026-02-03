/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Plus, Search, Trash2, Upload, Package, RefreshCw, Pencil, EyeOff, Eye } from 'lucide-react';
import { toast } from 'react-toastify';
import BulkMenuUpload from '@/components/merchant/BulkMenuUpload';
import MenuItemModal from '@/components/merchant/MenuItemModal';
import { MenuItem } from '@/types';

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(' ');
}

function moneyINR(n: any) {
  const v = Number(n ?? 0) || 0;
  try {
    return v.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  } catch {
    return `₹${Math.round(v)}`;
  }
}

export default function MerchantMenuPage() {
  const { user } = useAuth();

  const [merchantId, setMerchantId] = useState<string>('');

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'hidden'>('all');
  const [vegFilter, setVegFilter] = useState<'all' | 'veg' | 'nonveg'>('all');

  const [showBulkUpload, setShowBulkUpload] = useState(false);

  // Use MenuItemModal like admin merchant id page
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  const reloadTimer = useRef<any>(null);

  // If your MenuItemModal props differ, casting to any prevents TS blocking compilation.
  const MenuItemModalAny: any = MenuItemModal;

  useEffect(() => {
    if (user) loadMerchantId();
  }, [user]);

  useEffect(() => {
    if (merchantId) loadMenuItems({ silent: false });
  }, [merchantId]);

  // Realtime refresh menu when menu_items changes (bulk upload / edits from another panel)
  useEffect(() => {
    if (!merchantId) return;

    const scheduleReload = () => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      reloadTimer.current = setTimeout(() => {
        loadMenuItems({ silent: true });
      }, 350);
    };

    const channel = supabase
      .channel(`merchant-menu-items-${merchantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, (payload: any) => {
        const newRow = payload?.new as any;
        const oldRow = payload?.old as any;

        const affectedMerchantId = String(newRow?.merchant_id || oldRow?.merchant_id || '');
        if (affectedMerchantId === merchantId) scheduleReload();
      })
      .subscribe();

    return () => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      supabase.removeChannel(channel);
    };
  }, [merchantId]);

  const loadMerchantId = async () => {
    try {
      const { data, error } = await supabase
        .from('merchants')
        .select('id')
        .eq('user_id', user!.id) // user_id as per your code
        .maybeSingle();

      if (error) throw error;
      if (!data?.id) throw new Error('Merchant not found for this user');

      setMerchantId(String(data.id));
    } catch (error: any) {
      console.error('Error loading merchant ID:', error);
      toast.error(error?.message || 'Failed to load merchant data');
      setMerchantId('');
    }
  };

  const loadMenuItems = async ({ silent }: { silent: boolean }) => {
    if (!merchantId) return;

    try {
      if (!silent) setLoading(true);

      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setMenuItems((data as MenuItem[]) || []);
    } catch (error: any) {
      console.error('Error loading menu items:', error);
      toast.error(error?.message || 'Failed to load menu items');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const item of menuItems) set.add(String(item.category || 'Main Course'));
    return ['all', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return menuItems.filter((item: any) => {
      const cat = String(item.category || 'Main Course');
      const name = String(item.name || '');
      const desc = String(item.description || '');
      const isAvail = !!item.is_available;
      const isVeg = !!item.is_veg;

      const byQ = !q || name.toLowerCase().includes(q) || desc.toLowerCase().includes(q) || cat.toLowerCase().includes(q);
      const byCat = categoryFilter === 'all' ? true : cat === categoryFilter;

      const byAvail =
        availabilityFilter === 'all' ? true : availabilityFilter === 'available' ? isAvail : !isAvail;

      const byVeg =
        vegFilter === 'all' ? true : vegFilter === 'veg' ? isVeg : !isVeg;

      return byQ && byCat && byAvail && byVeg;
    });
  }, [menuItems, searchQuery, categoryFilter, availabilityFilter, vegFilter]);

  const groupedItems = useMemo(() => {
    const acc: Record<string, MenuItem[]> = {};
    for (const item of filteredItems) {
      const cat = String((item as any).category || 'Main Course');
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
    }
    return acc;
  }, [filteredItems]);

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const { error } = await supabase.from('menu_items').delete().eq('id', itemId);
      if (error) throw error;

      toast.success('Menu item deleted');
      await loadMenuItems({ silent: true });
    } catch (error: any) {
      console.error('Error deleting menu item:', error);
      toast.error(error?.message || 'Failed to delete menu item');
    }
  };

  const toggleAvailability = async (item: MenuItem) => {
    try {
      const current = !!(item as any).is_available;

      const { error } = await supabase
        .from('menu_items')
        .update({ is_available: !current })
        .eq('id', (item as any).id);

      if (error) throw error;

      toast.success(!current ? 'Item enabled' : 'Item hidden');
      await loadMenuItems({ silent: true });
    } catch (error: any) {
      console.error('Error toggling availability:', error);
      toast.error(error?.message || 'Failed to update availability');
    }
  };

  const openAddItem = () => {
    setSelectedItem(null);
    setMenuModalOpen(true);
  };

  const openEditItem = (item: MenuItem) => {
    setSelectedItem(item);
    setMenuModalOpen(true);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setAvailabilityFilter('all');
    setVegFilter('all');
  };

  return (
    <DashboardLayout>
      <div
        className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-5 w-full overflow-x-hidden"
        style={{ paddingBottom: `calc(92px + env(safe-area-inset-bottom))` }}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Menu</h1>
            <p className="text-sm text-gray-600 mt-1">
              {menuItems.length} items • {Object.keys(groupedItems).length} categories
            </p>
          </div>

          <div className="flex gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => loadMenuItems({ silent: false })}
              className="px-3 py-2 rounded-xl border hover:bg-gray-50 font-semibold flex items-center gap-2"
              title="Refresh"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => setShowBulkUpload(true)}
              disabled={!merchantId}
              className="px-3 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-semibold flex items-center gap-2 disabled:opacity-50"
            >
              <Upload size={16} />
              Bulk upload
            </button>

            <button
              type="button"
              onClick={openAddItem}
              disabled={!merchantId}
              className="px-3 py-2 rounded-xl bg-primary text-white hover:bg-orange-600 font-semibold flex items-center gap-2 shadow disabled:opacity-50"
            >
              <Plus size={16} />
              Add item
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border shadow-sm p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, description, category…"
                className="w-full border rounded-xl pl-9 pr-3 py-3"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full border rounded-xl px-3 py-3"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === 'all' ? 'All categories' : c}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={clearFilters}
              className="w-full border rounded-xl px-3 py-3 hover:bg-gray-50 font-semibold"
            >
              Clear filters
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {([
              { k: 'all', label: 'All' },
              { k: 'available', label: 'Available' },
              { k: 'hidden', label: 'Hidden' },
            ] as const).map((x) => (
              <button
                key={x.k}
                type="button"
                onClick={() => setAvailabilityFilter(x.k)}
                className={cx(
                  'px-3 py-2 rounded-xl border text-sm font-semibold',
                  availabilityFilter === x.k ? 'bg-primary text-white border-primary' : 'hover:bg-gray-50'
                )}
              >
                {x.label}
              </button>
            ))}

            {([
              { k: 'all', label: 'All' },
              { k: 'veg', label: 'Veg' },
              { k: 'nonveg', label: 'Non-veg' },
            ] as const).map((x) => (
              <button
                key={x.k}
                type="button"
                onClick={() => setVegFilter(x.k)}
                className={cx(
                  'px-3 py-2 rounded-xl border text-sm font-semibold',
                  vegFilter === x.k ? 'bg-green-600 text-white border-green-600' : 'hover:bg-gray-50'
                )}
              >
                {x.label}
              </button>
            ))}
          </div>

          <div className="mt-3 text-sm text-gray-600">
            Showing <span className="font-semibold">{filteredItems.length}</span> of{' '}
            <span className="font-semibold">{menuItems.length}</span> items
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-64 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border">
            <Package size={56} className="mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {searchQuery || categoryFilter !== 'all' || availabilityFilter !== 'all' || vegFilter !== 'all'
                ? 'No items found'
                : 'No menu items'}
            </h2>
            <p className="text-gray-600 mb-6">
              {searchQuery ? 'Try a different search term.' : 'Add items to start selling.'}
            </p>
            {!searchQuery && (
              <button
                onClick={openAddItem}
                className="bg-primary text-white px-6 py-3 rounded-xl hover:bg-orange-600 font-semibold inline-flex items-center gap-2"
              >
                <Plus size={18} />
                Add your first item
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedItems).map(([category, items]) => (
              <div key={category}>
                <div className="flex items-end justify-between gap-3 mb-3">
                  <h2 className="text-lg font-bold text-gray-900">{category}</h2>
                  <div className="text-sm text-gray-600">{items.length} items</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {items.map((item: any) => (
                    <div
                      key={item.id}
                      className={cx(
                        'bg-white rounded-2xl border shadow-sm overflow-hidden',
                        !item.is_available && 'opacity-70'
                      )}
                    >
                      <div className="relative h-40 bg-gray-100">
                        {item.image_url ? (
                          // Use <img> to avoid next/image domain config issues
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package size={40} className="text-gray-400" />
                          </div>
                        )}

                        {!item.is_available && (
                          <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                            <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                              Hidden
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-bold text-gray-900 truncate">{item.name}</h3>
                            <p className="text-xs text-gray-600 mt-1 truncate">
                              {item.is_veg ? 'Veg' : 'Non-veg'} • {item.is_available ? 'Available' : 'Hidden'}
                            </p>
                          </div>

                          <span
                            className={cx(
                              'text-xs px-2 py-1 rounded-full font-semibold shrink-0',
                              item.is_veg ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            )}
                          >
                            {item.is_veg ? 'Veg' : 'Non-veg'}
                          </span>
                        </div>

                        {item.description && (
                          <p className="text-sm text-gray-700 mt-3 line-clamp-2">{item.description}</p>
                        )}

                        <div className="mt-3 flex items-center justify-between">
                          <div className="text-lg font-bold text-primary">{moneyINR(item.price)}</div>
                          <button
                            type="button"
                            onClick={() => toggleAvailability(item)}
                            className={cx(
                              'px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-2',
                              item.is_available
                                ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                                : 'bg-green-50 text-green-700 hover:bg-green-100'
                            )}
                            title={item.is_available ? 'Hide item' : 'Enable item'}
                          >
                            {item.is_available ? <EyeOff size={16} /> : <Eye size={16} />}
                            {item.is_available ? 'Hide' : 'Enable'}
                          </button>
                        </div>

                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => openEditItem(item)}
                            className="flex-1 px-3 py-2 rounded-xl border hover:bg-gray-50 font-semibold flex items-center justify-center gap-2"
                          >
                            <Pencil size={16} />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="px-3 py-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 font-semibold"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal: add/edit item */}
        {menuModalOpen && merchantId && (
          <MenuItemModalAny
            open={menuModalOpen}
            merchantId={merchantId}
            item={selectedItem}
            onClose={() => {
              setMenuModalOpen(false);
              setSelectedItem(null);
            }}
            onSaved={() => {
              setMenuModalOpen(false);
              setSelectedItem(null);
              loadMenuItems({ silent: true });
            }}
          />
        )}

        {/* Bulk upload */}
        {showBulkUpload && merchantId && (
          <BulkMenuUpload
            merchantId={merchantId}
            onClose={() => setShowBulkUpload(false)}
            onSuccess={() => loadMenuItems({ silent: true })}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
