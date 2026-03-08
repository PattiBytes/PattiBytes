'use client';

import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import type { MenuItem } from './types';
import { MenuItemCard } from './MenuItemCard';

interface Props {
  filteredMenu: Record<string, MenuItem[]>;
  expandedCategories: Record<string, boolean>;
  quantities: Record<string, number>;
  now: Date;
  restaurantOpen: boolean;
  categoryRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  onToggleCategory: (cat: string) => void;
  onAdd: (item: MenuItem) => void;
  onUpdateQty: (id: string, delta: number) => void;
}

export function MenuSection({
  filteredMenu, expandedCategories, quantities,
  now, restaurantOpen,
  categoryRefs, onToggleCategory, onAdd, onUpdateQty,
}: Props) {
  const entries = Object.entries(filteredMenu);

  if (!entries.length) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-16 text-center animate-in fade-in duration-500">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-gray-100 to-gray-200
                        flex items-center justify-center">
          <Search className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-900 text-lg font-black">No menu items found</p>
        <p className="text-gray-500 text-sm mt-1 font-medium">Try adjusting your filters or search</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map(([category, items], catIdx) => (
        <div
          key={category}
          ref={el => { categoryRefs.current[category] = el; }}
          className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden
                     animate-in slide-in-from-bottom duration-500 hover:shadow-xl transition-shadow"
          style={{ animationDelay: `${catIdx * 80}ms` }}
        >
          {/* Header */}
          <button
            onClick={() => onToggleCategory(category)}
            className="w-full px-5 py-4 flex items-center justify-between
                       hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <h2 className="text-base md:text-lg font-black text-gray-900 truncate">{category}</h2>
              <span className="px-2.5 py-0.5 bg-gradient-to-r from-primary to-pink-500
                               text-white text-xs font-black rounded-full shadow-sm">
                {items.length}
              </span>
            </div>
            {expandedCategories[category]
              ? <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
              : <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
            }
          </button>

          {/* Items */}
          {expandedCategories[category] && (
            <div className="border-t border-gray-100 divide-y divide-gray-50">
              {items.map(item => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  quantity={quantities[item.id] || 1}
                  now={now}
                  restaurantOpen={restaurantOpen}
                  onAdd={onAdd}
                  onUpdateQty={onUpdateQty}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
