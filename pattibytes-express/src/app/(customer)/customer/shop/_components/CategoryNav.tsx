'use client';

import { PRODUCT_CATEGORIES, type CategoryId } from './types';

interface Props {
  selected: CategoryId;
  counts: Record<string, number>;
  onSelect: (id: CategoryId) => void;
}

export function CategoryNav({ selected, counts, onSelect }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
      {PRODUCT_CATEGORIES.map(cat => {
        const active = selected === cat.id;
        const count  = cat.id === 'all'
          ? Object.values(counts).reduce((a, b) => a + b, 0)
          : (counts[cat.id] || 0);

        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id as CategoryId)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full
                        border-2 text-xs font-black transition-all duration-200 hover:scale-105
                        ${active ? cat.accent + ' border-transparent shadow-md' : 'bg-white border-gray-200 text-gray-700 hover:border-primary'}`}
          >
            <span className="text-sm">{cat.emoji}</span>
            {cat.label}
            {count > 0 && (
              <span className={`ml-0.5 px-1.5 py-0 rounded-full text-[10px] font-black
                ${active ? 'bg-white/25' : 'bg-gray-100 text-gray-500'}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
