'use client';

import Image from 'next/image';
import { Trash2, Plus, Minus, ShoppingCart } from 'lucide-react';

export interface CartItem {
  id:                  string;
  name:                string;
  price:               number;
  quantity:            number;
  image_url?:          string | null;
  is_veg?:             boolean | null;
  category?:           string | null;
  discount_percentage?: number | null;
  menu_item_id?:       string | null;
  category_id?:        string | null;
}

interface Props {
  item:          CartItem;
  onRemove:      (id: string, name: string) => void;
  onUpdateQty:   (id: string, current: number, delta: number) => void;
}

function getSafeImageSrc(url?: string | null) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    if (u.hostname === 'www.google.com') return null;
    return url;
  } catch { return null; }
}

export function CartItemCard({ item, onRemove, onUpdateQty }: Props) {
  const discount    = item.discount_percentage || 0;
  const itemPrice   = discount ? item.price * (1 - discount / 100) : item.price;
  const totalPrice  = itemPrice * item.quantity;
  const hasDiscount = discount > 0;
  const img         = getSafeImageSrc(item.image_url);

  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex gap-4">

        {/* Image */}
        {img ? (
          <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden
                          flex-shrink-0 bg-gray-100">
            <Image src={img} alt={item.name} fill sizes="96px" className="object-cover" />
          </div>
        ) : (
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-lg bg-gray-100
                          flex items-center justify-center flex-shrink-0">
            <ShoppingCart className="w-8 h-8 text-gray-400" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Name row */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {item.is_veg != null && (
                  <div className={`w-4 h-4 border-2 flex-shrink-0 flex items-center
                                  justify-center ${item.is_veg ? 'border-green-600' : 'border-red-600'}`}>
                    <div className={`w-2 h-2 rounded-full
                                     ${item.is_veg ? 'bg-green-600' : 'bg-red-600'}`} />
                  </div>
                )}
                <h3 className="font-bold text-gray-900 text-sm md:text-base">{item.name}</h3>
              </div>
              {item.category && (
                <p className="text-xs text-gray-500 mb-1">{item.category}</p>
              )}
            </div>
            <button
              onClick={() => onRemove(item.id, item.name)}
              className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors flex-shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Price + qty row */}
          <div className="flex items-center justify-between gap-4">
            <div>
              {hasDiscount ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-gray-400 line-through">
                    ₹{item.price.toFixed(2)}
                  </span>
                  <span className="font-bold text-gray-900">₹{itemPrice.toFixed(2)}</span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5
                                   rounded-full font-semibold">
                    {discount}% OFF
                  </span>
                </div>
              ) : (
                <span className="font-bold text-gray-900">₹{item.price.toFixed(2)}</span>
              )}
            </div>

            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => onUpdateQty(item.id, item.quantity, -1)}
                disabled={item.quantity <= 1}
                className="w-8 h-8 flex items-center justify-center hover:bg-white rounded
                           transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Minus className="w-4 h-4 text-gray-700" />
              </button>
              <span className="w-8 text-center font-bold text-gray-900">{item.quantity}</span>
              <button
                onClick={() => onUpdateQty(item.id, item.quantity, 1)}
                disabled={item.quantity >= 10}
                className="w-8 h-8 flex items-center justify-center hover:bg-white rounded
                           transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4 text-gray-700" />
              </button>
            </div>
          </div>

          <div className="mt-2 text-right">
            <p className="text-sm text-gray-600">
              Total: <span className="font-bold text-gray-900">₹{totalPrice.toFixed(2)}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
