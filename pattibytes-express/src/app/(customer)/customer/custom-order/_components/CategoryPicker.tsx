'use client';

import { ORDER_CATEGORIES, type OrderCategoryId } from './types';

interface Props {
  value: OrderCategoryId | '';
  onChange: (id: OrderCategoryId) => void;
}

export function CategoryPicker({ value, onChange }: Props) {
  return (
    <div>
      <p className="text-sm font-black text-gray-900 mb-3">
        What category? <span className="text-red-500">*</span>
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {ORDER_CATEGORIES.map(cat => {
          const active = value === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onChange(cat.id)}
              className={`flex flex-col items-start gap-1 p-3 rounded-2xl border-2 text-left
                          transition-all hover:scale-[1.02]
                          ${active
                            ? 'border-primary bg-orange-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-gray-300'}`}
            >
              <span className="text-2xl">{cat.emoji}</span>
              <span className={`text-xs font-black ${active ? 'text-primary' : 'text-gray-800'}`}>
                {cat.label}
              </span>
              <span className="text-[10px] text-gray-500 font-medium leading-tight">
                {cat.desc}
              </span>
              {active && (
                <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center
                                mt-0.5 self-end">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

