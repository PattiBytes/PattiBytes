'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Plus, Minus, ShoppingCart, Package } from 'lucide-react';
import { type CustomProduct, getCategoryMeta } from './types';

interface Props {
  product: CustomProduct;
  quantity: number;         // current qty in custom cart (0 = not in cart)
  onAdd:    (p: CustomProduct, qty: number) => void;
  onRemove: (productId: string) => void;
  onUpdateQty: (productId: string, delta: number) => void;
}

export function ProductCard({ product, quantity, onAdd, onRemove, onUpdateQty }: Props) {
  const [localQty, setLocalQty] = useState(1);
  const meta = getCategoryMeta(product.category);

  const inCart = quantity > 0;

  return (
    <div className={`bg-white rounded-2xl shadow transition-all duration-300 overflow-hidden
                     flex flex-col border-2
                     ${inCart ? 'border-primary shadow-lg shadow-orange-100' : 'border-gray-100 hover:shadow-xl hover:border-gray-200'}
                     hover:scale-[1.02]`}>

      {/* Image */}
      <div className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200">
        {product.imageurl ? (
          <Image
            src={product.imageurl}
            alt={product.name}
            fill
            sizes="(max-width:640px) 50vw, 25vw"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <span className="text-3xl">{meta.emoji}</span>
            <Package className="w-4 h-4 text-gray-300" />
          </div>
        )}

        {/* Category badge */}
        <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-black
                         ${meta.accent} shadow-sm flex items-center gap-1`}>
          {meta.emoji} {meta.label}
        </div>

        {/* In-cart indicator */}
        {inCart && (
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary
                          flex items-center justify-center shadow-lg">
            <ShoppingCart className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-black text-gray-900 text-sm leading-snug line-clamp-2 mb-1">
          {product.name}
        </h3>

        {product.description && (
          <p className="text-[11px] text-gray-500 font-medium line-clamp-2 mb-2 leading-relaxed">
            {product.description}
          </p>
        )}

        <div className="flex-1" />

        {/* Price + unit */}
        <div className="flex items-baseline gap-1.5 mb-3">
          <span className="font-black text-base bg-gradient-to-r from-primary to-pink-600
                           bg-clip-text text-transparent">
            ₹{Number(product.price).toFixed(2)}
          </span>
          {product.unit && (
            <span className="text-[11px] text-gray-400 font-semibold">/ {product.unit}</span>
          )}
        </div>

        {/* Cart controls */}
        {inCart ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-100 rounded-xl p-0.5 shadow-inner">
              <button
                onClick={() => {
                  if (quantity <= 1) onRemove(product.id);
                  else onUpdateQty(product.id, -1);
                }}
                className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg
                           transition active:scale-90"
              >
                <Minus className="w-3.5 h-3.5 text-gray-700" />
              </button>
              <span className="w-7 text-center font-black text-gray-900 text-sm select-none">
                {quantity}
              </span>
              <button
                onClick={() => onUpdateQty(product.id, 1)}
                disabled={quantity >= 20}
                className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg
                           transition disabled:opacity-30 active:scale-90"
              >
                <Plus className="w-3.5 h-3.5 text-gray-700" />
              </button>
            </div>
            <span className="text-[10px] text-primary font-black flex-1 text-right">In cart ✓</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {/* Local qty stepper before adding */}
            <div className="flex items-center bg-gray-100 rounded-xl p-0.5 shadow-inner">
              <button
                onClick={() => setLocalQty(q => Math.max(1, q - 1))}
                disabled={localQty <= 1}
                className="w-7 h-7 flex items-center justify-center hover:bg-white rounded-lg
                           transition disabled:opacity-30"
              >
                <Minus className="w-3 h-3 text-gray-700" />
              </button>
              <span className="w-6 text-center font-black text-gray-900 text-xs select-none">
                {localQty}
              </span>
              <button
                onClick={() => setLocalQty(q => Math.min(20, q + 1))}
                disabled={localQty >= 20}
                className="w-7 h-7 flex items-center justify-center hover:bg-white rounded-lg
                           transition disabled:opacity-30"
              >
                <Plus className="w-3 h-3 text-gray-700" />
              </button>
            </div>
            <button
              onClick={() => { onAdd(product, localQty); setLocalQty(1); }}
              className="flex-1 bg-gradient-to-r from-primary to-pink-500 text-white
                         py-2 rounded-xl font-black text-xs flex items-center justify-center gap-1
                         hover:shadow-lg transition hover:scale-105 active:scale-95"
            >
              <ShoppingCart className="w-3.5 h-3.5" /> Add
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
