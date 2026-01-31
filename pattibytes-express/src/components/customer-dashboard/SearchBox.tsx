'use client';

import { Search, X, Store, IndianRupee } from 'lucide-react';
import type { MenuItem, Merchant, SearchResult } from './types';
import { formatCurrencyINR, parseCuisineList } from './utils';

export default function SearchBox({
  query,
  setQuery,
  restaurants,
  menuItems,
  onOpen,
}: {
  query: string;
  setQuery: (v: string) => void;
  restaurants: Merchant[];
  menuItems: MenuItem[];
  onOpen: (res: SearchResult) => void;
}) {
  const q = query.trim().toLowerCase();

  const results: SearchResult[] = !q
    ? []
    : [
        ...restaurants
          .filter((r) => {
            const name = String(r.business_name || '').toLowerCase();
            const cuisines = parseCuisineList(r.cuisine_types).join(' ').toLowerCase();
            return name.includes(q) || cuisines.includes(q);
          })
          .slice(0, 10)
          .map((restaurant) => ({ type: 'restaurant', restaurant } as const)),
        ...menuItems
          .filter((m) => {
            const n = String(m.name || '').toLowerCase();
            const d = String(m.description || '').toLowerCase();
            const c = String(m.category || '').toLowerCase();
            return n.includes(q) || d.includes(q) || c.includes(q);
          })
          .slice(0, 10)
          .map((menu) => {
            const restaurantName =
              restaurants.find((r) => r.id === menu.merchant_id)?.business_name || 'Restaurant';
            return { type: 'menu', menu, restaurantName } as const;
          }),
      ].slice(0, 15);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 md:p-5 mt-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search restaurants or dishes…"
          className="w-full pl-10 pr-10 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all bg-white"
        />
        {!!query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl hover:bg-gray-100"
            aria-label="Clear search"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        )}

        {results.length > 0 && (
          <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-2xl shadow-2xl max-h-96 overflow-y-auto">
            {results.map((res, idx) => (
              <button
                key={idx}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onOpen(res)}
                className="w-full text-left px-4 py-3 hover:bg-orange-50 border-b last:border-b-0 flex items-start gap-3 transition-colors"
              >
                {res.type === 'restaurant' ? (
                  <Store className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                ) : (
                  <IndianRupee className="text-green-600 w-5 h-5 mt-0.5 flex-shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  {res.type === 'restaurant' ? (
                    <>
                      <p className="font-semibold text-gray-900 text-sm truncate">{res.restaurant.business_name}</p>
                      <p className="text-xs text-gray-600 truncate">Open restaurant</p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-gray-900 text-sm truncate">{res.menu.name}</p>
                      <p className="text-xs text-gray-600 truncate">
                        {formatCurrencyINR(res.menu.price)} • {res.restaurantName}
                      </p>
                    </>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
