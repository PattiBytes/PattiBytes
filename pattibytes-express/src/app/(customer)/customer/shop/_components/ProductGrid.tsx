'use client';

import { Package } from 'lucide-react';
import type { CustomProduct } from './types';
import { ProductCard } from './ProductCard';

interface Props {
  products:    CustomProduct[];
  cartQtyMap:  Record<string, number>;   // productId → quantity in cart (0 = not in cart)
  loading:     boolean;
  onAdd:       (product: CustomProduct, qty: number) => void;
  onRemove:    (productId: string) => void;
  onUpdateQty: (productId: string, delta: number) => void;
}

export function ProductGrid({
  products, cartQtyMap, loading, onAdd, onRemove, onUpdateQty,
}: Props) {

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {[...Array(8)].map((_, i) => (
          <div key={i}
            className="rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200
                       aspect-[3/4] animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="py-20 text-center">
        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-100
                        flex items-center justify-center">
          <Package className="w-8 h-8 text-gray-400" />
        </div>
        <p className="font-black text-gray-700">No products found</p>
        <p className="text-sm text-gray-500 mt-1">Try a different category</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {products.map((p, i) => (
        <div
          key={p.id}
          className="animate-in fade-in slide-in-from-bottom duration-400"
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <ProductCard
            product={p}
            quantity={cartQtyMap[p.id] || 0}
            onAdd={onAdd}
            onRemove={onRemove}
            onUpdateQty={onUpdateQty}
          />
        </div>
      ))}
    </div>
  );
}
