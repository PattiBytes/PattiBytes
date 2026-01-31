'use client';

import { Filter } from 'lucide-react';

const cuisineFilters = [
  'all',
  'punjabi',
  'chinese',
  'italian',
  'south indian',
  'cafe',
  'desserts',
  'fast food',
  'beverages',
  'north indian',
];

export default function CuisineFilters({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-md p-4">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="w-4 h-4 text-gray-700" />
        <h3 className="font-bold text-sm text-gray-900">Filter by cuisine</h3>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {cuisineFilters.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => onSelect(f)}
            className={`flex-shrink-0 px-4 py-2 rounded-2xl font-semibold text-sm transition-all ${
              selected === f
                ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>
    </div>
  );
}
