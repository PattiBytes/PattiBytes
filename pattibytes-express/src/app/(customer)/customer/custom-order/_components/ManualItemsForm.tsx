'use client';

import { Plus, Trash2, Hash } from 'lucide-react';

export interface ManualItem {
  id:          string;
  name:        string;
  quantity:    number;
  unit:        string;
  description: string;
}

const UNITS = ['kg', 'g', 'litre', 'ml', 'dozen', 'piece', 'pack', 'box', 'bottle', 'other'];

interface Props {
  items:      ManualItem[];
  onChange:   (items: ManualItem[]) => void;
}

function makeId() { return Math.random().toString(36).slice(2, 9); }
function blank(): ManualItem {
  return { id: makeId(), name: '', quantity: 1, unit: 'piece', description: '' };
}

export function ManualItemsForm({ items, onChange }: Props) {
  const update = (id: string, patch: Partial<ManualItem>) =>
    onChange(items.map(it => it.id === id ? { ...it, ...patch } : it));

  const remove = (id: string) => onChange(items.filter(it => it.id !== id));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-gray-700 flex items-center gap-2">
          <Hash className="w-4 h-4 text-primary" />
          Custom items
          <span className="text-xs font-medium text-gray-400">(not in shop)</span>
        </h3>
        <button
          type="button"
          onClick={() => onChange([...items, blank()])}
          disabled={items.length >= 10}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black
                     bg-gradient-to-r from-primary to-pink-500 text-white shadow
                     hover:scale-105 transition disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" /> Add Item
        </button>
      </div>

      {items.length === 0 ? (
        <button
          type="button"
          onClick={() => onChange([blank()])}
          className="w-full border-2 border-dashed border-gray-200 rounded-2xl
                     py-6 text-sm font-semibold text-gray-400 hover:border-primary
                     hover:text-primary transition"
        >
          + Add a custom item
        </button>
      ) : items.map((item, idx) => (
        <div key={item.id}
          className="bg-white rounded-2xl border-2 border-gray-100 p-4 space-y-3
                     shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-gray-400 uppercase tracking-wide">
              Item {idx + 1}
            </span>
            <button
              type="button"
              onClick={() => remove(item.id)}
              className="w-7 h-7 rounded-full bg-red-50 border border-red-100 flex
                         items-center justify-center text-red-400 hover:bg-red-100 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs font-black text-gray-700 mb-1 block">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              value={item.name}
              onChange={e => update(item.id, { name: e.target.value })}
              placeholder="e.g. Fresh Paneer, Organic Honey…"
              maxLength={100}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl
                         text-sm font-semibold bg-gray-50 focus:ring-2
                         focus:ring-primary focus:border-primary transition"
            />
          </div>

          {/* Qty + Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-gray-700 mb-1 block">Quantity</label>
              <input
                type="number" min={1} max={999}
                value={item.quantity}
                onChange={e => update(item.id, {
                  quantity: Math.max(1, Math.min(999, Number(e.target.value) || 1)),
                })}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl
                           text-sm font-semibold bg-gray-50 focus:ring-2
                           focus:ring-primary focus:border-primary transition"
              />
            </div>
            <div>
              <label className="text-xs font-black text-gray-700 mb-1 block">Unit</label>
              <select
                value={item.unit}
                onChange={e => update(item.id, { unit: e.target.value })}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl
                           text-sm font-semibold bg-gray-50 focus:ring-2
                           focus:ring-primary focus:border-primary transition"
              >
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-black text-gray-700 mb-1 block">
              Description
              <span className="font-medium text-gray-400 ml-1">(optional)</span>
            </label>
            <textarea
              value={item.description}
              onChange={e => update(item.id, { description: e.target.value })}
              placeholder="Brand, size, colour, packaging…"
              rows={2} maxLength={300}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl
                         text-sm font-semibold bg-gray-50 resize-none focus:ring-2
                         focus:ring-primary focus:border-primary transition"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

