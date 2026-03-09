'use client';

import { Store, Package } from 'lucide-react';
import { CartItemCard, type CartItem } from './CartItemCard';

interface Props {
  merchantId:    string;
  merchantName:  string;
  isShopCart:    boolean;
  items:         CartItem[];
  onAddMore:     () => void;
  onRemove:      (id: string, name: string) => void;
  onUpdateQty:   (id: string, current: number, delta: number) => void;
}

export function CartItemsList({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  merchantId, merchantName, isShopCart,
  items, onAddMore, onRemove, onUpdateQty,
}: Props) {
  return (
    <div className="space-y-4">
      {/* Source banner */}
      <div className="bg-white rounded-xl shadow-md p-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full flex items-center justify-center
                        bg-orange-100 flex-shrink-0">
          {isShopCart
            ? <Package className="w-6 h-6 text-primary" />
            : <Store className="w-6 h-6 text-primary" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-600">
            {isShopCart ? 'Ordering from shop' : 'Ordering from'}
          </p>
          <h2 className="font-bold text-gray-900 truncate">{merchantName}</h2>
          {isShopCart && (
            <p className="text-xs text-purple-600 font-semibold mt-0.5">
              🏪 PattiBytes Shop — delivered from Patti hub
            </p>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl shadow-md divide-y">
        {items.map(item => (
          <CartItemCard
            key={item.id}
            item={item}
            onRemove={onRemove}
            onUpdateQty={onUpdateQty}
          />
        ))}
      </div>

      {/* Add more */}
      {!isShopCart && (
        <button
          onClick={onAddMore}
          className="w-full bg-white border-2 border-dashed border-gray-300 rounded-xl p-4
                     hover:border-primary hover:bg-orange-50 transition-colors
                     text-primary font-semibold"
        >
          + Add more items from {merchantName}
        </button>
      )}
      {isShopCart && (
        <button
          onClick={onAddMore}
          className="w-full bg-white border-2 border-dashed border-purple-300 rounded-xl p-4
                     hover:border-purple-500 hover:bg-purple-50 transition-colors
                     text-purple-600 font-semibold"
        >
          + Add more items from Shop
        </button>
      )}
    </div>
  );
}
