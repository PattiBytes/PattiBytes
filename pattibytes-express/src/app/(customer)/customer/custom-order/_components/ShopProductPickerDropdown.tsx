'use client';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useEffect, useState } from 'react';
import {
  Search, Plus, Check, ShoppingBag, ChevronDown,
  ChevronUp, Minus, X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export interface CustomProduct {
  id: string; name: string; category: string | null;
  price: number; unit: string | null; imageurl: string | null;
  description: string | null; isactive: boolean;
}
export interface SelectedProduct extends CustomProduct { qty: number; }

interface Props {
  selectedIds: Set<string>;
  selectedMap: Map<string, SelectedProduct>;
  onToggle:    (p: CustomProduct) => void;
  onUpdateQty: (id: string, qty: number) => void;
}

const CATS = ['all','dairy','grocery','bakery','beverages','snacks','other'];

function safeImg(url?: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!['http:','https:'].includes(u.protocol)) return null;
    if (u.hostname === 'www.google.com') return null;
    return url;
  } catch { return null; }
}

export function ShopProductPickerDropdown({
  selectedIds, selectedMap, onToggle, onUpdateQty,
}: Props) {
  const [products,  setProducts]  = useState<CustomProduct[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [expanded,  setExpanded]  = useState(false);
  const [loaded,    setLoaded]    = useState(false);
  const [search,    setSearch]    = useState('');
  const [cat,       setCat]       = useState('all');

  const open = async () => {
    if (!loaded) {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('customproducts')
          .select('id,name,category,price,unit,imageurl,description,isactive')
          .eq('isactive', true).order('name');
        setProducts((data || []) as CustomProduct[]);
        setLoaded(true);
      } finally { setLoading(false); }
    }
    setExpanded(p => !p);
  };

  const filtered = products.filter(p => {
    const q = search.trim().toLowerCase();
    const matchS = !q || p.name.toLowerCase().includes(q) || (p.description||'').toLowerCase().includes(q);
    const matchC = cat === 'all' || (p.category||'').toLowerCase() === cat;
    return matchS && matchC;
  });

  const selected = [...selectedMap.values()];
  const subtotal = selected.reduce((a, p) => a + p.price * p.qty, 0);

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-sm overflow-hidden">

      {/* ── Accordion header ──────────────────────────────────────────── */}
      <button type="button" onClick={open}
        className="w-full p-4 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors">
        <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
          <ShoppingBag className="w-4 h-4 text-purple-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-gray-900">Shop Products</p>
          <p className="text-xs text-gray-500 font-medium">
            {selectedIds.size > 0
              ? `${selectedIds.size} item${selectedIds.size > 1 ? 's' : ''} selected · ₹${subtotal.toFixed(2)}`
              : 'Browse & add available products'}
          </p>
        </div>
        {selectedIds.size > 0 && (
          <span className="w-6 h-6 rounded-full bg-purple-500 text-white text-xs font-black flex items-center justify-center flex-shrink-0">
            {selectedIds.size}
          </span>
        )}
        {expanded
          ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>

      {/* ── Selected pills (collapsed state) ─────────────────────────── */}
      {!expanded && selected.length > 0 && (
        <div className="px-4 pb-3 border-t border-gray-50 pt-2">
          <div className="flex flex-wrap gap-1.5">
            {selected.map(p => (
              <div key={p.id}
                className="flex items-center gap-1.5 bg-purple-50 border border-purple-200
                           rounded-full px-2.5 py-1">
                <span className="text-xs font-black text-purple-700 max-w-[80px] truncate">
                  {p.name}
                </span>
                <span className="text-xs text-purple-500 font-semibold">×{p.qty}</span>
                <button type="button"
                  onClick={e => { e.stopPropagation(); onToggle(p); }}
                  className="w-3.5 h-3.5 rounded-full bg-purple-200 hover:bg-purple-300
                             flex items-center justify-center transition">
                  <X className="w-2 h-2 text-purple-700" />
                </button>
              </div>
            ))}
          </div>
          <p className="text-right text-xs font-black text-purple-600 mt-1.5">
            Est. ₹{subtotal.toFixed(2)}
          </p>
        </div>
      )}

      {/* ── Expanded panel ────────────────────────────────────────────── */}
      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search products…"
              className="w-full pl-8 pr-3 py-2 border-2 border-gray-200 rounded-xl text-sm
                         font-semibold bg-gray-50 focus:ring-2 focus:ring-purple-300
                         focus:border-purple-400 transition" />
          </div>

          {/* Category chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-1"
               style={{ scrollbarWidth: 'none' }}>
            {CATS.map(c => (
              <button key={c} type="button" onClick={() => setCat(c)}
                className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-black capitalize
                            border transition ${
                  c === cat
                    ? 'bg-purple-500 border-purple-500 text-white'
                    : 'border-gray-200 text-gray-500 hover:border-purple-300'
                }`}>
                {c}
              </button>
            ))}
          </div>

          {/* Products grid */}
          {loading ? (
            <div className="grid grid-cols-2 gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-300">
              <ShoppingBag className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-400">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto">
              {filtered.map(p => {
                const sel  = selectedIds.has(p.id);
                const sp   = selectedMap.get(p.id);
                const img  = safeImg(p.imageurl);
                return (
                  <div key={p.id}
                    className={`rounded-xl border-2 overflow-hidden transition-all ${
                      sel
                        ? 'border-purple-400 bg-purple-50 shadow-md'
                        : 'border-gray-200 bg-white hover:border-purple-200 hover:shadow-sm'
                    }`}>
                    {/* Image */}
                    <div className="h-16 bg-gradient-to-br from-purple-100 to-pink-100 relative cursor-pointer"
                         onClick={() => onToggle(p)}>
                      {img
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={img} alt={p.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag className="w-5 h-5 text-purple-300" />
                          </div>}
                      {sel && (
                        <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                          <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-2">
                      <p className="text-xs font-black text-gray-900 line-clamp-1 leading-tight">
                        {p.name}
                      </p>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-xs font-black text-purple-600">₹{p.price}</span>
                        {p.unit && <span className="text-xs text-gray-400">{p.unit}</span>}
                      </div>
                      {sel && sp ? (
                        <div className="flex items-center mt-1.5 bg-white rounded-lg border border-purple-200 overflow-hidden">
                          <button type="button"
                            onClick={() => onUpdateQty(p.id, sp.qty - 1)}
                            className="w-7 h-6 flex items-center justify-center text-purple-600 hover:bg-purple-50 transition">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="flex-1 text-center text-xs font-black text-gray-900">
                            {sp.qty}
                          </span>
                          <button type="button"
                            onClick={() => onUpdateQty(p.id, sp.qty + 1)}
                            className="w-7 h-6 flex items-center justify-center text-purple-600 hover:bg-purple-50 transition">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => onToggle(p)}
                          className="w-full mt-1.5 py-1 rounded-lg bg-purple-50 border border-purple-100
                                     text-xs font-black text-purple-600 hover:bg-purple-100 transition
                                     flex items-center justify-center gap-1">
                          <Plus className="w-3 h-3" /> Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer subtotal */}
          {selected.length > 0 && (
            <div className="flex justify-between items-center border-t border-purple-100 pt-3">
              <span className="text-xs text-gray-500 font-semibold">
                {selected.length} item{selected.length > 1 ? 's' : ''} subtotal
              </span>
              <span className="text-sm font-black text-purple-600">
                ₹{subtotal.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

