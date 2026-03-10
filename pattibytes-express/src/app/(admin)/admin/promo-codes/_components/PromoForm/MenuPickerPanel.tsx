'use client';
import { useEffect, useRef } from 'react';
import { Search, X, Leaf, SlidersHorizontal, Check } from 'lucide-react';
import type { MenuPickSide, MenuSortKey, MenuItemLite } from '../../_types';

interface Props {
  open       : boolean;
  side       : MenuPickSide;
  search     : string;
  vegOnly    : boolean;
  sortKey    : MenuSortKey;
  visible    : number;
  loading    : boolean;
  error      : string;
  gridItems  : MenuItemLite[];
  totalFiltered: number;
  isSelected (id: string): boolean;
  onToggle   (it: MenuItemLite): void;
  onClose    (): void;
  setSearch  (v: string): void;
  setVegOnly (v: boolean): void;
  setSortKey (v: MenuSortKey): void;
  setVisible (v: number): void;
}

const SIDE_LABEL: Record<MenuPickSide, string> = {
  targets : '🎯 Discount Targets',
  bxgy_buy: '🛒 Buy Items',
  bxgy_get: '🎁 Get Items',
};

export function MenuPickerPanel({
  open, side, search, vegOnly, sortKey, visible, loading, error,
  gridItems, totalFiltered, isSelected, onToggle, onClose,
  setSearch, setVegOnly, setSortKey, setVisible,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  if (!open) return null;

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 space-y-3 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-gray-800">
          Menu Picker — <span className="text-primary">{SIDE_LABEL[side]}</span>
        </p>
        <button type="button" onClick={onClose}
          className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-500">
          <X size={13}/>
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[140px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input ref={inputRef} value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search item name, category…"
            className="w-full pl-7 pr-8 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary bg-white"/>
          {search && (
            <button type="button" onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
              <X size={11}/>
            </button>
          )}
        </div>

        <button type="button" onClick={() => setVegOnly(!vegOnly)}
          className={`px-2.5 py-2 rounded-lg border text-xs font-bold flex items-center gap-1 transition-all ${
            vegOnly ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-600 border-gray-200 hover:border-green-500'
          }`}>
          <Leaf size={11}/> Veg
        </button>

        <div className="flex items-center gap-1 px-2.5 py-2 border border-gray-200 rounded-lg bg-white">
          <SlidersHorizontal size={11} className="text-gray-400"/>
          <select value={sortKey} onChange={e => setSortKey(e.target.value as MenuSortKey)}
            className="text-xs bg-transparent outline-none text-gray-700 font-semibold">
            <option value="recommended">Recommended</option>
            <option value="price_low">Price: Low → High</option>
            <option value="price_high">Price: High → Low</option>
          </select>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        {loading ? 'Loading…' : error ? `⚠ ${error}` : `${gridItems.length} / ${totalFiltered} items`}
      </p>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse"/>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 max-h-72 overflow-y-auto pr-0.5">
          {gridItems.map(it => {
            const sel = isSelected(it.id);
            return (
              <button key={it.id} type="button" onClick={() => onToggle(it)}
                className={`text-left px-2.5 py-2 rounded-lg border text-xs transition-all ${
                  sel
                    ? 'bg-primary/10 border-primary text-primary font-bold'
                    : 'bg-white border-gray-200 hover:border-primary hover:bg-primary/5 text-gray-700'
                }`}>
                <div className="flex items-start justify-between gap-1">
                  <span className="line-clamp-2 font-semibold leading-tight">{it.name}</span>
                  {sel && <Check size={11} className="text-primary flex-shrink-0 mt-0.5"/>}
                </div>
                <p className="text-gray-500 mt-0.5">₹{it.price}</p>
                {it.is_veg && <span className="text-green-600 text-xs">🌿</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Load more */}
      {gridItems.length < totalFiltered && (
        <button type="button" onClick={() => setVisible(visible + 48)}
          className="w-full py-2 text-xs font-bold text-primary hover:bg-primary/5 rounded-lg border border-primary/30 transition-all">
          Load more ({totalFiltered - gridItems.length} remaining)
        </button>
      )}
    </div>
  );
}
