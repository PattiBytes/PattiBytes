'use client';

import { Pencil, Trash2, Eye, EyeOff, Clock } from 'lucide-react';
import { MenuItemRow, money } from './types';

interface Props {
  item: MenuItemRow;
  onEdit: (item: MenuItemRow) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, current: boolean) => void;
}

export function MenuItemCard({ item, onEdit, onDelete, onToggle }: Props) {
  const disc   = Number(item.discount_percentage ?? 0);
  const hasDisc = disc > 0;
  const finalPrice = hasDisc ? item.price * (1 - disc / 100) : item.price;

  return (
    <div className={`rounded-2xl border overflow-hidden hover:shadow-md transition-all bg-white flex flex-col group ${!item.is_available ? 'opacity-60' : ''}`}>
      {/* Image */}
      <div className="relative h-36 bg-gray-100 shrink-0">
        {item.image_url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-4xl text-gray-200">🍽️</div>
        }

        {/* Top badges */}
        <div className="absolute top-2 left-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${item.is_veg ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
            {item.is_veg ? '🌿 Veg' : '🍖 Non‑veg'}
          </span>
        </div>
        {hasDisc && (
          <div className="absolute top-2 right-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-orange-500 text-white">{disc}% OFF</span>
          </div>
        )}
        {!item.is_available && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <span className="bg-black/70 text-white text-xs font-bold px-3 py-1 rounded-full">Unavailable</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-bold text-gray-900 truncate text-sm">{item.name}</p>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{item.category || 'Uncategorized'}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-primary">{money(finalPrice)}</p>
            {hasDisc && <p className="text-xs text-gray-400 line-through">{money(item.price)}</p>}
          </div>
        </div>

        {item.description && (
          <p className="text-xs text-gray-600 mt-1.5 line-clamp-2 flex-1">{item.description}</p>
        )}

        {item.preparation_time != null && (
          <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-400">
            <Clock className="w-3 h-3" />
            {item.preparation_time} min
          </div>
        )}

        {/* Actions */}
        <div className="mt-3 flex gap-1.5">
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="flex-1 px-2 py-1.5 rounded-xl border hover:bg-blue-50 hover:border-blue-200 text-gray-700 hover:text-blue-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
          >
            <Pencil className="w-3 h-3" /> Edit
          </button>
          <button
            type="button"
            onClick={() => onToggle(item.id, !!item.is_available)}
            className={`px-2.5 py-1.5 rounded-xl border font-semibold text-xs flex items-center justify-center gap-1 transition ${
              item.is_available
                ? 'hover:bg-amber-50 hover:border-amber-200 text-amber-600'
                : 'hover:bg-green-50 hover:border-green-200 text-green-600'
            }`}
            title={item.is_available ? 'Hide item' : 'Show item'}
          >
            {item.is_available ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </button>
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            className="px-2.5 py-1.5 rounded-xl border hover:bg-red-50 hover:border-red-200 text-red-400 hover:text-red-600 font-semibold text-xs flex items-center justify-center transition"
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
