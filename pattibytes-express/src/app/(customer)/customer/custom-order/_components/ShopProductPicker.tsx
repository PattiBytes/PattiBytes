'use client';

import { useEffect, useState } from 'react';
import { Search, Plus, Check, ShoppingBag } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export interface CustomProduct {
  id:          string;
  name:        string;
  category:    string | null;
  price:       number;
  unit:        string | null;
  imageurl:    string | null;
  description: string | null;
  isactive:    boolean;
}

interface Props {
  selectedIds: Set<string>;
  onToggle:    (p: CustomProduct) => void;
}

const CATEGORIES = ['all', 'dairy', 'grocery', 'bakery', 'beverages', 'snacks', 'other'];

function getSafeImg(url?: string | null) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    if (u.hostname === 'www.google.com') return null;
    return url;
  } catch { return null; }
}

export function ShopProductPicker({ selectedIds, onToggle }: Props) {
  const [products,  setProducts]  = useState<CustomProduct[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [category,  setCategory]  = useState('all');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('customproducts')
          .select('id,name,category,price,unit,imageurl,description,isactive')
          .eq('isactive', true)
          .order('name');
        if (!error) setProducts((data as CustomProduct[]) || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = products.filter(p => {
    const matchSearch = !search.trim() ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'all' || (p.category || '').toLowerCase() === category;
    return matchSearch && matchCat;
  });

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="text-center py-8 text-gray-400">
        <ShoppingBag className="w-8 h-8 mx-auto mb-2" />
        <p className="text-sm font-medium">No shop products available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search products…"
          className="w-full pl-9 pr-3 py-2.5 border-2 border-gray-200 rounded-xl
                     text-sm font-semibold focus:ring-2 focus:ring-purple-300
                     focus:border-purple-400 bg-gray-50 transition"
        />
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-black capitalize
                        transition border-2 ${
              category === cat
                ? 'bg-purple-500 border-purple-500 text-white'
                : 'border-gray-200 text-gray-600 hover:border-purple-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Products grid */}
      <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="col-span-2 text-center text-xs text-gray-400 py-4 font-medium">
            No products match your search
          </p>
        ) : filtered.map(p => {
          const selected = selectedIds.has(p.id);
          const img      = getSafeImg(p.imageurl);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onToggle(p)}
              className={`relative text-left rounded-2xl border-2 overflow-hidden
                          transition-all active:scale-95 ${
                selected
                  ? 'border-purple-500 bg-purple-50 shadow-lg'
                  : 'border-gray-200 bg-white hover:border-purple-300 hover:shadow-md'
              }`}
            >
              {/* Image */}
              <div className="h-20 bg-gradient-to-br from-purple-100 to-pink-100 relative">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt={p.name}
                    className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag className="w-6 h-6 text-purple-300" />
                  </div>
                )}
                {selected && (
                  <div className="absolute inset-0 bg-purple-500/20 flex items-center
                                  justify-center">
                    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center
                                    justify-center shadow-lg">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-2">
                <p className="text-xs font-black text-gray-900 leading-tight line-clamp-2">
                  {p.name}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs font-black text-purple-600">₹{p.price}</span>
                  {p.unit && (
                    <span className="text-xs text-gray-400 font-medium">{p.unit}</span>
                  )}
                </div>
              </div>

              {/* Add badge */}
              <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex
                              items-center justify-center transition-all ${
                selected
                  ? 'bg-purple-500 text-white'
                  : 'bg-white border-2 border-gray-200 text-gray-400'
              }`}>
                {selected
                  ? <Check className="w-3 h-3" />
                  : <Plus className="w-3 h-3" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

