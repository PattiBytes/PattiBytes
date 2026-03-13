'use client';

import { Package, LayoutGrid, List, ArrowUpDown } from 'lucide-react';
import type { CustomProduct, SortOption } from './types';
import { SORT_OPTIONS } from './types';
import { ProductCard } from './ProductCard';

interface Props {
  products:    CustomProduct[];
  cartQtyMap:  Record<string, number>;
  loading:     boolean;
  sort:        SortOption;
  setSort:     (s: SortOption) => void;
  viewMode:    'grid' | 'list';
  setViewMode: (v: 'grid' | 'list') => void;
  onAdd:       (p: CustomProduct, qty: number) => void;
  onRemove:    (id: string) => void;
  onUpdateQty: (id: string, delta: number) => void;
}

function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl overflow-hidden border-2 border-gray-100 animate-pulse"
          style={{ animationDelay: `${i * 50}ms` }}>
          <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200" />
          <div className="p-3 space-y-2">
            <div className="h-3 bg-gray-200 rounded-full w-3/4" />
            <div className="h-2.5 bg-gray-100 rounded-full w-1/2" />
            <div className="h-8 bg-gray-100 rounded-xl mt-3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border-2 border-gray-100 p-3 flex gap-3 animate-pulse"
          style={{ animationDelay: `${i * 50}ms` }}>
          <div className="w-16 h-16 rounded-xl bg-gray-200 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-200 rounded-full w-3/4" />
            <div className="h-2.5 bg-gray-100 rounded-full w-1/3" />
            <div className="h-7 bg-gray-100 rounded-xl w-1/2 mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProductGrid({
  products, cartQtyMap, loading, sort, setSort,
  viewMode, setViewMode, onAdd, onRemove, onUpdateQty,
}: Props) {
  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        {/* Sort */}
        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
          <select value={sort} onChange={e => setSort(e.target.value as SortOption)}
            className="text-xs font-bold text-gray-700 border-2 border-gray-200 rounded-xl
                       px-2 py-1.5 bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary
                       transition cursor-pointer">
            {SORT_OPTIONS.map(o => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {(['grid', 'list'] as const).map(v => (
            <button key={v} onClick={() => setViewMode(v)}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === v
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}>
              {v === 'grid'
                ? <LayoutGrid className="w-4 h-4" />
                : <List       className="w-4 h-4" />
              }
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        viewMode === 'grid' ? <GridSkeleton /> : <ListSkeleton />
      ) : products.length === 0 ? (
        <div className="py-20 text-center animate-in fade-in duration-300">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-100
                          flex items-center justify-center">
            <Package className="w-8 h-8 text-gray-300" />
          </div>
          <p className="font-black text-gray-700">No products found</p>
          <p className="text-sm text-gray-400 font-medium mt-1">
            Try a different category or search
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i}
              quantity={cartQtyMap[p.id] ?? 0}
              viewMode="grid"
              onAdd={onAdd} onRemove={onRemove} onUpdateQty={onUpdateQty} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i}
              quantity={cartQtyMap[p.id] ?? 0}
              viewMode="list"
              onAdd={onAdd} onRemove={onRemove} onUpdateQty={onUpdateQty} />
          ))}
        </div>
      )}
    </div>
  );
}
