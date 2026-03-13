'use client';
import { ShoppingCart, Minus, Plus, Trash2, MessageSquare } from 'lucide-react';
import type { OrderItemCompat } from './types';
import { nNum } from './utils';

interface Props {
  items: OrderItemCompat[];
  changeQty: (id: string, delta: number) => void;
  removeItem: (id: string) => void;
  updateItemNote: (id: string, note: string) => void;
}

export function CartPanel({ items, changeQty, removeItem, updateItemNote }: Props) {
  if (items.length === 0) return (
    <div className="bg-white rounded-2xl border p-8 text-center text-gray-400">
      <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
      <p className="font-semibold text-sm">Cart is empty</p>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
      <div className="px-5 py-3.5 border-b bg-gray-50/60 flex items-center justify-between">
        <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
          <ShoppingCart className="w-4 h-4 text-primary" />
          Cart
        </h3>
        <span className="text-xs font-black text-primary bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
          {items.length} item{items.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="divide-y max-h-[420px] overflow-y-auto">
        {items.map(item => {
          const mid      = item.menu_item_id || item.id;
          const lineTotal = nNum(item.price) * Math.max(1, nNum(item.quantity, 1));
          return (
            <div key={mid} className="px-4 py-3 group hover:bg-gray-50/50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-gray-900 text-sm leading-tight">{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.is_custom_product && (
                          <span className="text-[10px] font-black bg-purple-100 text-purple-600 px-1.5 rounded">
                            custom
                          </span>
                        )}
                        {item.unit && (
                          <span className="text-[10px] text-gray-400 font-semibold">{item.unit}</span>
                        )}
                        {item.category && (
                          <span className="text-[10px] text-gray-400">{item.category}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-black text-gray-900 flex-shrink-0">
                      ₹{lineTotal.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-2">
                    {/* Qty stepper */}
                    <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-0.5">
                      <button
                        type="button"
                        onClick={() => changeQty(mid, -1)}
                        disabled={item.quantity <= 1}
                        className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-500
                                   hover:bg-white hover:text-orange-600 hover:shadow-sm
                                   disabled:opacity-30 transition-all"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-black text-gray-900">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => changeQty(mid, 1)}
                        className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-500
                                   hover:bg-white hover:text-orange-600 hover:shadow-sm transition-all"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="text-xs text-gray-400 font-semibold">
                      ₹{item.price} each
                    </span>

                    <button
                      type="button"
                      onClick={() => removeItem(mid)}
                      className="ml-auto p-1.5 text-gray-300 hover:text-red-500
                                 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Item note */}
                  <div className="mt-2">
                    <div className="relative">
                      <MessageSquare className="absolute left-2.5 top-2 w-3 h-3 text-gray-300" />
                      <input
                        type="text"
                        value={item.note ?? ''}
                        onChange={e => updateItemNote(mid, e.target.value)}
                        placeholder="Add note for this item…"
                        className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg border border-gray-200
                                   focus:ring-1 focus:ring-primary/30 focus:border-primary
                                   bg-white placeholder:text-gray-300 transition"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
