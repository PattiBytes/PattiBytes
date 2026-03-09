'use client';

import { useState } from 'react';
import { Plus, Trash2, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { type CustomOrderItem, makeItemId } from './types';

interface Props {
  items: CustomOrderItem[];
  onChange: (items: CustomOrderItem[]) => void;
}

export function ItemsEditor({ items, onChange }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const addItem = () => {
    const newItem: CustomOrderItem = {
      id:                makeItemId(),
      name:              '',
      quantity:          1,
      note:              '',
      price:             0,
      is_custom_product: true,
      menu_item_id:      makeItemId(),
      category:          '',
      image_url:         null,
    };
    onChange([...items, newItem]);
    setExpandedId(newItem.id);
  };

  const updateItem = (id: string, patch: Partial<CustomOrderItem>) => {
    onChange(items.map(it => it.id === id ? { ...it, ...patch } : it));
  };

  const removeItem = (id: string) => {
    onChange(items.filter(it => it.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-black text-gray-900">
          Items list
          <span className="ml-1.5 text-xs text-gray-400 font-semibold">(optional but helpful)</span>
        </p>
        <button
          type="button"
          onClick={addItem}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary text-white
                     text-xs font-black hover:bg-orange-600 transition hover:scale-105 active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" /> Add Item
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 py-8 text-center">
          <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-500 font-semibold">No items yet</p>
          <p className="text-xs text-gray-400 mt-0.5">Add items or just describe in the note above</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => {
            const open = expandedId === item.id;
            const valid = item.name.trim().length > 0;

            return (
              <div key={item.id}
                   className={`rounded-2xl border-2 transition-all
                     ${valid ? 'border-gray-200 bg-white' : 'border-amber-200 bg-amber-50'}`}>

                {/* Item row header */}
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-black
                                   flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </span>

                  <input
                    value={item.name}
                    onChange={e => updateItem(item.id, { name: e.target.value })}
                    placeholder="Item name *"
                    className="flex-1 min-w-0 bg-transparent font-bold text-sm text-gray-900
                               placeholder-gray-400 outline-none"
                  />

                  {/* Qty stepper */}
                  <div className="flex items-center bg-gray-100 rounded-xl p-0.5 flex-shrink-0">
                    <button type="button"
                      onClick={() => updateItem(item.id, { quantity: Math.max(1, item.quantity - 1) })}
                      className="w-6 h-6 flex items-center justify-center hover:bg-white rounded-lg transition">
                      <span className="text-gray-700 text-sm font-black leading-none">−</span>
                    </button>
                    <span className="w-6 text-center font-black text-gray-900 text-xs">{item.quantity}</span>
                    <button type="button"
                      onClick={() => updateItem(item.id, { quantity: Math.min(50, item.quantity + 1) })}
                      className="w-6 h-6 flex items-center justify-center hover:bg-white rounded-lg transition">
                      <span className="text-gray-700 text-sm font-black leading-none">+</span>
                    </button>
                  </div>

                  <button type="button" onClick={() => setExpandedId(open ? null : item.id)}
                    className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
                    {open ? <ChevronUp className="w-3.5 h-3.5 text-gray-600" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-600" />}
                  </button>

                  <button type="button" onClick={() => removeItem(item.id)}
                    className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100 transition">
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>

                {/* Expanded: note + est. price */}
                {open && (
                  <div className="border-t border-gray-100 px-3 pb-3 pt-2.5 space-y-2
                                  animate-in slide-in-from-top duration-200">
                    <div>
                      <label className="text-[11px] text-gray-500 font-bold mb-1 block">
                        Note / brand / variant
                      </label>
                      <input
                        value={item.note}
                        onChange={e => updateItem(item.id, { note: e.target.value })}
                        placeholder="e.g. Amul brand, 500ml pack…"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl
                                   text-sm font-medium text-gray-900 placeholder-gray-400
                                   focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-500 font-bold mb-1 block">
                        Estimated price (₹) — optional
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={item.price || ''}
                        onChange={e => updateItem(item.id, { price: Number(e.target.value) || 0 })}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl
                                   text-sm font-medium text-gray-900 placeholder-gray-400
                                   focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
