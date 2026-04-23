/* eslint-disable @next/next/no-img-element */
import { Edit2, Trash2, Clock, Package } from 'lucide-react';
import { CATEGORIES, DAY_LABELS } from './types';
import type { CustomProduct } from './types';

interface Props {
  product: CustomProduct;
  onEdit: () => void; onDelete: () => void; onToggle: () => void;
}

export function ProductCard({ product, onEdit, onDelete, onToggle }: Props) {
  const cat       = CATEGORIES.find(c => c.value === product.category);
  const hasTiming = product.available_from && product.available_to;
  const hasPartialDays = product.available_days && product.available_days.length < 7;

  return (
    <div className={`bg-white rounded-2xl shadow-md border-2 overflow-hidden transition-all
        duration-300 hover:shadow-xl hover:-translate-y-1 group
        ${product.isactive ? 'border-green-200 hover:border-green-400' : 'border-gray-200 opacity-70'}`}>

      {/* Image */}
      <div className="relative w-full h-44 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
        {product.imageurl
          ? <img src={product.imageurl} alt={product.name}
               className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
               onError={e => { (e.target as HTMLImageElement).src =
                 'https://via.placeholder.com/300x200?text=No+Image'; }} />
          : <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-400">
              <span className="text-5xl">{cat?.emoji || '📦'}</span>
              <Package className="w-5 h-5 opacity-40" />
            </div>
        }
        {/* Stock badge */}
        {product.stock_qty != null && (
          <span className={`absolute top-2 left-2 text-xs font-bold px-2 py-1 rounded-full shadow
            ${product.stock_qty > 10 ? 'bg-green-500 text-white'
              : product.stock_qty > 0 ? 'bg-yellow-400 text-gray-900'
              : 'bg-red-500 text-white'}`}>
            {product.stock_qty > 0 ? `Stock: ${product.stock_qty}` : 'Out of stock'}
          </span>
        )}
        {/* Active badge */}
        <span className={`absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded-full shadow
          ${product.isactive ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'}`}>
          {product.isactive ? '✓ Active' : '✗ Off'}
        </span>
      </div>

      {/* Body */}
      <div className="p-4">
        <h3 className="font-bold text-gray-900 line-clamp-2 leading-tight">{product.name}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{cat?.emoji} {cat?.label || product.category}</p>

        <p className="text-xl font-black text-primary mt-2">
          ₹{product.price.toFixed(2)}
          <span className="text-sm text-gray-500 font-semibold"> / {product.unit}</span>
        </p>

        {product.description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{product.description}</p>
        )}

        {/* Timing chip */}
        {hasTiming && (
          <div className="flex items-center gap-1 mt-2 text-xs text-blue-700 bg-blue-50 rounded-lg px-2 py-1">
            <Clock className="w-3 h-3" />
            <span>{product.available_from} – {product.available_to}</span>
            {hasPartialDays && (
              <span className="ml-1 text-gray-500">
                ({product.available_days!.map(d => DAY_LABELS[d]).join(', ')})
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          <button onClick={onToggle}
            className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all ${
              product.isactive
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
            {product.isactive ? 'Deactivate' : 'Activate'}
          </button>
          <button onClick={onEdit}
            className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all" title="Edit">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={onDelete}
            className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

