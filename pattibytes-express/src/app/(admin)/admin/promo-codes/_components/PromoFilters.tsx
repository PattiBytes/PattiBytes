'use client';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Search, X, SlidersHorizontal } from 'lucide-react';
import type { MerchantLite } from '../_types';

interface Props {
  query          : string;
  setQuery       (v: string): void;
  showInactive   : boolean;
  setShowInactive(v: boolean): void;
  typeFilter     : string;
  setTypeFilter  (v: string): void;
  merchantFilter : string;
  setMerchFilter (v: string): void;
  merchants      : MerchantLite[];
  isAdmin        : boolean;
}

export function PromoFilters({
  query, setQuery, showInactive, setShowInactive,
  typeFilter, setTypeFilter, merchantFilter, setMerchFilter,
  merchants, isAdmin,
}: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-4 space-y-2">
      <div className="flex gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[160px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search code, description…"
            className="w-full pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary bg-white"/>
          {query && (
            <button onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
              <X size={13}/>
            </button>
          )}
        </div>

        {/* Type filter */}
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-1 focus:ring-primary">
          <option value="all">All Types</option>
          <option value="cart_discount">Cart Discount</option>
          <option value="bxgy">BXGY / BOGO</option>
          <option value="secret">Secret Only</option>
          <option value="auto">Auto-apply</option>
        </select>

        {/* Merchant filter (admin only) */}
        {isAdmin && (
          <select value={merchantFilter} onChange={e => setMerchFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-1 focus:ring-primary max-w-[180px] truncate">
            <option value="">All Merchants</option>
            {merchants.map(m => <option key={m.id} value={m.id}>{m.business_name}</option>)}
          </select>
        )}

        {/* Show inactive */}
        <label className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-50">
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)}
            className="w-3.5 h-3.5 accent-primary"/>
          Show inactive
        </label>
      </div>
    </div>
  );
}


