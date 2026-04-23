/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';
import { useState } from 'react';
import { Package, ChevronDown, Search, Loader2, Leaf, Drumstick, ImageOff, Plus } from 'lucide-react';
import type { MenuItemRow, CustomProductRow, OrderItemCompat } from './types';
import { nNum } from './utils';

type CatalogTab = 'menu' | 'custom';

interface Props {
  merchantId: string;
  menuLoading: boolean;
  menuSearch: string;
  setMenuSearch: (v: string) => void;
  vegOnly: boolean;
  setVegOnly: (v: boolean) => void;
  menuByCategory: Record<string, MenuItemRow[]>;
  customProductsByCategory: Record<string, CustomProductRow[]>;
  expandedCategories: Set<string>;
  toggleCategory: (cat: string) => void;
  items: OrderItemCompat[];
  addItem: (m: MenuItemRow) => void;
  addCustomProduct: (p: CustomProductRow) => void;
}

function VegDot({ isVeg }: { isVeg: boolean | null | undefined }) {
  if (isVeg === null || isVeg === undefined) return null;
  return (
    <span className={`inline-block w-3 h-3 rounded-sm border-2 flex-shrink-0 ${
      isVeg ? 'border-green-500 bg-green-500' : 'border-red-500 bg-red-500'
    }`} />
  );
}

export function MenuCatalog({
  merchantId, menuLoading, menuSearch, setMenuSearch,
  vegOnly, setVegOnly, menuByCategory, customProductsByCategory,
  expandedCategories, toggleCategory, items, addItem, addCustomProduct,
}: Props) {
  const [tab, setTab] = useState<CatalogTab>('menu');

  if (!merchantId) return (
    <div className="bg-white rounded-2xl border p-8 text-center text-gray-400">
      <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
      <p className="font-semibold">Select a merchant to browse menu</p>
    </div>
  );

  const menuCats   = Object.keys(menuByCategory);
  const customCats = Object.keys(customProductsByCategory);
  const totalMenuItems   = menuCats.reduce((s, c) => s + menuByCategory[c].length, 0);
  const totalCustomItems = customCats.reduce((s, c) => s + customProductsByCategory[c].length, 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b">
        {([
          { id: 'menu',   label: 'Menu Items',       count: totalMenuItems   },
          { id: 'custom', label: 'Custom Products',  count: totalCustomItems },
        ] as { id: CatalogTab; label: string; count: number }[]).map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 py-3.5 text-sm font-bold flex items-center justify-center gap-2
                        transition-all border-b-2 ${
              tab === t.id
                ? 'border-primary text-primary bg-orange-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Package className="w-4 h-4" />
            {t.label}
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
              tab === t.id ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      <div className="p-4 space-y-3">
        {/* Search + veg toggle */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input
              value={menuSearch}
              onChange={e => setMenuSearch(e.target.value)}
              placeholder={`Search ${tab === 'menu' ? 'menu items' : 'custom products'}…`}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border-2 border-gray-200
                         focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
            />
          </div>
          {tab === 'menu' && (
            <label className="flex items-center gap-1.5 px-3 rounded-xl border-2 border-gray-200
                               cursor-pointer hover:bg-green-50 hover:border-green-300 transition-all">
              <input type="checkbox" checked={vegOnly}
                onChange={e => setVegOnly(e.target.checked)} className="rounded w-3.5 h-3.5" />
              <Leaf className="w-3.5 h-3.5 text-green-500" />
              <span className="text-xs font-bold text-gray-600">Veg</span>
            </label>
          )}
        </div>

        {menuLoading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-semibold">Loading…</span>
          </div>
        ) : tab === 'menu' ? (
          menuCats.length === 0 ? (
            <p className="text-center py-10 text-gray-400 text-sm font-semibold">No items found</p>
          ) : (
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {menuCats.map(cat => {
                const catItems = menuByCategory[cat];
                const isOpen   = expandedCategories.has(cat);
                return (
                  <div key={cat} className="border rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className="w-full flex items-center justify-between px-4 py-2.5
                                 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <span className="font-bold text-gray-800 text-sm">{cat}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black bg-primary/10 text-primary
                                         px-2 py-0.5 rounded-full">
                          {catItems.length}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                          isOpen ? 'rotate-180' : ''
                        }`} />
                      </div>
                    </button>

                    {isOpen && (
                      <div className="divide-y">
                        {catItems.map(m => {
                          const inCart = items.find(x => (x.menu_item_id || x.id) === m.id);
                          return (
                            <div key={m.id}
                              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                              {/* Image */}
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                {m.image_url
                                  ? <img src={m.image_url} alt={m.name} className="w-full h-full object-cover" /> // eslint-disable-line
                                  : <div className="w-full h-full flex items-center justify-center">
                                      <ImageOff className="w-4 h-4 text-gray-300" />
                                    </div>
                                }
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <VegDot isVeg={m.is_veg} />
                                  <p className="font-semibold text-gray-900 text-sm truncate">{m.name}</p>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs font-bold text-primary">₹{m.price}</span>
                                  {(m.discount_percentage ?? 0) > 0 && (
                                    <span className="text-[10px] font-black text-green-600 bg-green-50 px-1.5 rounded">
                                      {m.discount_percentage}% off
                                    </span>
                                  )}
                                </div>
                              </div>

                              {inCart ? (
                                <span className="text-[10px] font-black text-orange-500
                                                 bg-orange-50 px-2 py-1 rounded-lg border border-orange-200">
                                  ×{inCart.quantity} in cart
                                </span>
                              ) : null}

                              <button
                                type="button"
                                onClick={() => addItem(m)}
                                className="w-8 h-8 rounded-xl bg-primary text-white flex items-center
                                           justify-center hover:bg-orange-600 hover:scale-110
                                           active:scale-95 transition-all flex-shrink-0"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* Custom products tab */
          customCats.length === 0 ? (
            <p className="text-center py-10 text-gray-400 text-sm font-semibold">No custom products found</p>
          ) : (
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {customCats.map(cat => {
                const catItems = customProductsByCategory[cat];
                const isOpen   = expandedCategories.has(`cp_${cat}`);
                return (
                  <div key={cat} className="border rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleCategory(`cp_${cat}`)}
                      className="w-full flex items-center justify-between px-4 py-2.5
                                 bg-purple-50 hover:bg-purple-100 transition-colors"
                    >
                      <span className="font-bold text-purple-800 text-sm capitalize">{cat}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black bg-purple-200 text-purple-700 px-2 py-0.5 rounded-full">
                          {catItems.length}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-purple-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    {isOpen && (
                      <div className="divide-y">
                        {catItems.map(p => {
                          const inCart = items.find(x => x.menu_item_id === p.id && x.is_custom_product);
                          return (
                            <div key={p.id}
                              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                {p.imageurl
                                  ? <img src={p.imageurl} alt={p.name} className="w-full h-full object-cover" /> // eslint-disable-line
                                  : <div className="w-full h-full flex items-center justify-center">
                                      <ImageOff className="w-4 h-4 text-gray-300" />
                                    </div>
                                }
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 text-sm truncate">{p.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs font-bold text-primary">₹{p.price}</span>
                                  <span className="text-[10px] text-gray-400 font-semibold">{p.unit}</span>
                                  {p.stock_qty != null && (
                                    <span className={`text-[10px] font-black px-1.5 rounded ${
                                      p.stock_qty > 0
                                        ? 'bg-green-50 text-green-600'
                                        : 'bg-red-50 text-red-500'
                                    }`}>
                                      {p.stock_qty > 0 ? `${p.stock_qty} left` : 'Out of stock'}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {inCart && (
                                <span className="text-[10px] font-black text-purple-500 bg-purple-50 px-2 py-1 rounded-lg border border-purple-200">
                                  ×{inCart.quantity}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => addCustomProduct(p)}
                                disabled={p.stock_qty === 0}
                                className="w-8 h-8 rounded-xl bg-purple-500 text-white flex items-center
                                           justify-center hover:bg-purple-600 hover:scale-110
                                           active:scale-95 disabled:opacity-40 transition-all flex-shrink-0"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}


