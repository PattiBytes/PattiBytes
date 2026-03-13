/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Plus, Minus, ShoppingCart, Package, Heart, Star, Clock } from 'lucide-react';
import { type CustomProduct, getCategoryMeta } from './types';

interface Props {
  product:     CustomProduct;
  quantity:    number;
  index:       number;
  viewMode:    'grid' | 'list';
  onAdd:       (p: CustomProduct, qty: number) => void;
  onRemove:    (id: string) => void;
  onUpdateQty: (id: string, delta: number) => void;
}

function useWishlist(id: string) {
  const key = 'pbx_wishlist';
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const list: string[] = JSON.parse(localStorage.getItem(key) ?? '[]');
      setSaved(list.includes(id));
    } catch { /* ignore */ }
  }, [id]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const list: string[] = JSON.parse(localStorage.getItem(key) ?? '[]');
      const next = saved ? list.filter(x => x !== id) : [...list, id];
      localStorage.setItem(key, JSON.stringify(next));
      setSaved(!saved);
    } catch { /* ignore */ }
  };

  return { saved, toggle };
}

function StockBadge({ qty }: { qty: number | null | undefined }) {
  if (qty == null) return null;
  if (qty === 0) return (
    <span className="absolute bottom-2 left-2 text-[10px] font-black bg-red-500
                     text-white px-2 py-0.5 rounded-full shadow-sm">
      Out of Stock
    </span>
  );
  if (qty <= 5) return (
    <span className="absolute bottom-2 left-2 text-[10px] font-black bg-amber-500
                     text-white px-2 py-0.5 rounded-full shadow-sm animate-pulse">
      Only {qty} left
    </span>
  );
  return null;
}

export function ProductCard({
  product, quantity, index, viewMode,
  onAdd, onRemove, onUpdateQty,
}: Props) {
  const [localQty, setLocalQty] = useState(1);
  const [addPop,   setAddPop]   = useState(false);
  const meta    = getCategoryMeta(product.category, index);
  const inCart  = quantity > 0;
  const outOfStock = product.stock_qty === 0;
  const { saved, toggle } = useWishlist(product.id);

  const handleAdd = () => {
    if (outOfStock) return;
    onAdd(product, localQty);
    setLocalQty(1);
    setAddPop(true);
    setTimeout(() => setAddPop(false), 700);
  };

  if (viewMode === 'list') {
    return (
      <div className={`bg-white rounded-2xl border-2 flex items-center gap-3 p-3
                       transition-all duration-300 hover:shadow-lg
                       animate-in fade-in slide-in-from-left-2 duration-300
                       ${inCart ? 'border-primary shadow-md shadow-orange-100'
                                : 'border-gray-100 hover:border-gray-200'}
                       ${outOfStock ? 'opacity-60' : ''}`}
           style={{ animationDelay: `${index * 30}ms` }}>

        {/* Thumb */}
        <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
          {product.imageurl
            ? <Image src={product.imageurl} alt={product.name} fill
                sizes="64px" className="object-cover" />
            : <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl">{meta.emoji}</span>
              </div>
          }
          {inCart && (
            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-primary" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-black text-gray-900 text-sm truncate">{product.name}</p>
              <p className="text-[10px] text-gray-400 font-semibold">{meta.label}</p>
            </div>
            <button onClick={toggle}
              className={`p-1 rounded-lg transition-all flex-shrink-0 ${
                saved ? 'text-red-500' : 'text-gray-300 hover:text-red-400'
              }`}>
              <Heart className={`w-4 h-4 ${saved ? 'fill-red-500' : ''}`} />
            </button>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-baseline gap-1">
              <span className="font-black text-primary">₹{Number(product.price).toFixed(2)}</span>
              {product.unit && (
                <span className="text-[10px] text-gray-400">/ {product.unit}</span>
              )}
            </div>
            {inCart ? (
              <div className="flex items-center bg-gray-100 rounded-xl p-0.5">
                <button onClick={() => quantity <= 1 ? onRemove(product.id) : onUpdateQty(product.id, -1)}
                  className="w-7 h-7 flex items-center justify-center hover:bg-white rounded-lg transition active:scale-90">
                  <Minus className="w-3 h-3 text-gray-700" />
                </button>
                <span className="w-6 text-center font-black text-gray-900 text-xs">{quantity}</span>
                <button onClick={() => onUpdateQty(product.id, 1)}
                  disabled={quantity >= 20}
                  className="w-7 h-7 flex items-center justify-center hover:bg-white rounded-lg transition disabled:opacity-30 active:scale-90">
                  <Plus className="w-3 h-3 text-gray-700" />
                </button>
              </div>
            ) : (
              <button onClick={handleAdd} disabled={outOfStock}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl
                           bg-gradient-to-r from-primary to-pink-500 text-white
                           font-black text-xs hover:shadow-md transition
                           disabled:opacity-40 hover:scale-105 active:scale-95">
                <Plus className="w-3 h-3" /> Add
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div className={`bg-white rounded-2xl shadow transition-all duration-300 overflow-hidden
                     flex flex-col border-2 relative group
                     animate-in fade-in zoom-in-95 duration-300
                     ${inCart ? 'border-primary shadow-lg shadow-orange-100'
                              : 'border-gray-100 hover:shadow-xl hover:border-gray-200 hover:scale-[1.02]'}
                     ${outOfStock ? 'opacity-70' : ''}`}
         style={{ animationDelay: `${index * 40}ms` }}>

      {/* Image */}
      <div className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        {product.imageurl ? (
          <Image src={product.imageurl} alt={product.name} fill
            sizes="(max-width:640px) 50vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <span className="text-4xl">{meta.emoji}</span>
            <Package className="w-4 h-4 text-gray-300" />
          </div>
        )}

        {/* Category badge */}
        <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px]
                         font-black ${meta.bgLight} shadow-sm flex items-center gap-1`}>
          {meta.emoji} {meta.label}
        </div>

        {/* Wishlist */}
        <button onClick={toggle}
          className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center
                       justify-center shadow-sm transition-all
                       hover:scale-110 active:scale-90
                       ${saved ? 'bg-red-500' : 'bg-white/90 hover:bg-white'}`}>
          <Heart className={`w-3.5 h-3.5 ${saved ? 'fill-white text-white' : 'text-gray-400'}`} />
        </button>

        {/* In-cart indicator */}
        {inCart && (
          <div className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-primary
                           flex items-center justify-center shadow-lg
                           animate-in zoom-in duration-200">
            <ShoppingCart className="w-3 h-3 text-white" />
          </div>
        )}

        {/* Stock badge */}
        <StockBadge qty={product.stock_qty} />

        {/* Add pop animation */}
        {addPop && (
          <div className="absolute inset-0 bg-primary/10 flex items-center
                           justify-center animate-in zoom-in duration-200 pointer-events-none">
            <span className="text-3xl animate-bounce">✓</span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-black text-gray-900 text-sm leading-snug line-clamp-2 mb-1">
          {product.name}
        </h3>

        {product.description && (
          <p className="text-[11px] text-gray-500 font-medium line-clamp-2 mb-1 leading-relaxed">
            {product.description}
          </p>
        )}

        {/* Availability timing */}
        {product.available_from && product.available_to && (
          <div className="flex items-center gap-1 text-[10px] text-amber-600 font-bold mb-1">
            <Clock className="w-2.5 h-2.5" />
            {product.available_from.slice(0, 5)} – {product.available_to.slice(0, 5)}
          </div>
        )}

        <div className="flex-1" />

        {/* Price */}
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
            <div className="flex items-center bg-gray-100 rounded-xl p-0.5 shadow-inner flex-1 justify-center">
              <button
                onClick={() => { if (quantity <= 1) onRemove(product.id); else onUpdateQty(product.id, -1); }}
                className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg
                           transition active:scale-90">
                <Minus className="w-3.5 h-3.5 text-gray-700" />
              </button>
              <span className="w-8 text-center font-black text-gray-900 text-sm select-none">
                {quantity}
              </span>
              <button onClick={() => onUpdateQty(product.id, 1)} disabled={quantity >= 20}
                className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg
                           transition disabled:opacity-30 active:scale-90">
                <Plus className="w-3.5 h-3.5 text-gray-700" />
              </button>
            </div>
            <span className="text-[10px] text-primary font-black whitespace-nowrap">In cart ✓</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-100 rounded-xl p-0.5 shadow-inner">
              <button onClick={() => setLocalQty(q => Math.max(1, q - 1))} disabled={localQty <= 1}
                className="w-7 h-7 flex items-center justify-center hover:bg-white rounded-lg
                           transition disabled:opacity-30 active:scale-90">
                <Minus className="w-3 h-3 text-gray-700" />
              </button>
              <span className="w-6 text-center font-black text-gray-900 text-xs select-none">
                {localQty}
              </span>
              <button onClick={() => setLocalQty(q => Math.min(20, q + 1))} disabled={localQty >= 20}
                className="w-7 h-7 flex items-center justify-center hover:bg-white rounded-lg
                           transition disabled:opacity-30 active:scale-90">
                <Plus className="w-3 h-3 text-gray-700" />
              </button>
            </div>
            <button onClick={handleAdd} disabled={outOfStock}
              className="flex-1 bg-gradient-to-r from-primary to-pink-500 text-white
                         py-2 rounded-xl font-black text-xs flex items-center justify-center gap-1
                         hover:shadow-lg transition hover:scale-105 active:scale-95
                         disabled:opacity-40 disabled:cursor-not-allowed">
              <ShoppingCart className="w-3.5 h-3.5" />
              {outOfStock ? 'Sold Out' : 'Add'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
