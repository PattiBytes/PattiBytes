'use client';

import { Search, X, Leaf, SlidersHorizontal } from 'lucide-react';
import type { SortKey } from './types';
import { cx } from './types';

interface Props {
  searchQuery: string;
  onSearch: (q: string) => void;
  vegOnly: boolean;
  onVegToggle: () => void;
  sortKey: SortKey;
  onSort: (k: SortKey) => void;
}

export function MenuControls({ searchQuery, onSearch, vegOnly, onVegToggle, sortKey, onSort }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-4 mb-4 animate-in slide-in-from-top duration-500">
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearch(e.target.value)}
            placeholder="Search menu items..."
            className="w-full pl-10 pr-10 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all font-bold"
          />
          {searchQuery && (
            <button
              onClick={() => onSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-all"
              aria-label="Clear search"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex gap-2 items-center">
          {/* Veg toggle */}
          <button
            type="button"
            onClick={onVegToggle}
            className={cx(
              'px-3 py-3 rounded-xl border-2 font-black inline-flex items-center gap-2 transition-all hover:scale-105',
              vegOnly
                ? 'border-green-600 bg-green-50 text-green-700 shadow-lg'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            )}
          >
            <Leaf className="w-5 h-5" />
            Veg
          </button>

          {/* Sort */}
          <div className="px-3 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-700 font-black inline-flex items-center gap-2 hover:border-primary transition-all">
            <SlidersHorizontal className="w-5 h-5" />
            <select
              value={sortKey}
              onChange={e => onSort(e.target.value as SortKey)}
              className="bg-transparent outline-none font-black"
              aria-label="Sort menu"
            >
              <option value="recommended">Recommended</option>
              <option value="price_low">Price: Low → High</option>
              <option value="price_high">Price: High → Low</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
