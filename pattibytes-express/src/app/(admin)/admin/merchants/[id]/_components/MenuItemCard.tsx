 
'use client';

import { Clock, Edit2, Eye, EyeOff, Trash2 } from 'lucide-react';
import { MenuItemRow, DishTiming, DAYS } from './types';

// ── Timing badge helpers ──────────────────────────────────────────────────────

function fmt12(t: string): string {
  const [hStr, mStr] = t.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr ?? '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function slotLabel(slot: DishTiming['slots'][number]): string {
  const dayNames = slot.days.map(d => DAYS[d]).join(', ');
  return `${dayNames} · ${fmt12(slot.from)}–${fmt12(slot.to)}`;
}

function TimingBadge({ timing }: { timing: DishTiming | null }) {
  if (!timing?.enabled) return null;

  if (timing.type === 'always') {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-green-700 bg-green-50 border border-green-200 rounded-lg px-2 py-1 mt-2">
        <Clock size={11} className="shrink-0" />
        <span className="font-semibold">Always available</span>
      </div>
    );
  }

  // scheduled
  const slots = timing.slots.filter(s => s.days.length > 0);
  if (!slots.length) return null;

  return (
    <div className="mt-2 space-y-1">
      {slots.map((slot, i) => (
        <div
          key={i}
          className="flex items-start gap-1.5 text-[11px] text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1"
        >
          <Clock size={11} className="shrink-0 mt-0.5" />
          <span className="font-semibold leading-snug">{slotLabel(slot)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main card ─────────────────────────────────────────────────────────────────

interface Props {
  item:     MenuItemRow;
  onEdit:   (item: MenuItemRow) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, current: boolean) => void;
}

export function MenuItemCard({ item, onEdit, onDelete, onToggle }: Props) {
  const disc = Number(item.discount_percentage ?? 0);
  const discounted = disc > 0
    ? item.price * (1 - disc / 100)
    : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">

      {/* Image */}
      <div className="relative h-36 bg-gray-100 flex-shrink-0">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover"
            onError={e => { (e.currentTarget as HTMLImageElement).src = '/placeholder-food.png'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
        )}

        {/* Veg / non-veg dot */}
        <span
          className={`absolute top-2 left-2 w-5 h-5 rounded border-2 flex items-center justify-center bg-white
            ${item.is_veg ? 'border-green-600' : 'border-red-600'}`}
          title={item.is_veg ? 'Vegetarian' : 'Non-vegetarian'}
        >
          <span className={`w-2.5 h-2.5 rounded-full ${item.is_veg ? 'bg-green-600' : 'bg-red-600'}`} />
        </span>

        {/* Discount pill */}
        {disc > 0 && (
          <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
            {disc}% OFF
          </span>
        )}

        {/* Hidden overlay */}
        {!item.is_available && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white text-xs font-bold bg-black/60 px-2 py-1 rounded-lg">Hidden</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col flex-1 gap-1">
        <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-1">{item.name}</h3>

        {item.description && (
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{item.description}</p>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-1.5 mt-1">
          {discounted != null ? (
            <>
              <span className="text-sm font-black text-gray-900">₹{discounted.toFixed(2)}</span>
              <span className="text-xs text-gray-400 line-through">₹{item.price.toFixed(2)}</span>
            </>
          ) : (
            <span className="text-sm font-black text-gray-900">₹{item.price.toFixed(2)}</span>
          )}
          {item.preparation_time != null && item.preparation_time > 0 && (
            <span className="ml-auto text-[10px] text-gray-400 font-medium flex items-center gap-0.5">
              <Clock size={10} /> {item.preparation_time}m
            </span>
          )}
        </div>

        {/* ── Timing badge ── */}
        <TimingBadge timing={item.dish_timing ?? null} />

        {/* Actions */}
        <div className="flex gap-1.5 mt-auto pt-2">
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold transition"
          >
            <Edit2 size={12} /> Edit
          </button>

          <button
            type="button"
            onClick={() => onToggle(item.id, item.is_available)}
            title={item.is_available ? 'Hide item' : 'Show item'}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition
              ${item.is_available
                ? 'border-gray-200 bg-white hover:bg-yellow-50 hover:border-yellow-300 text-gray-600'
                : 'border-green-200 bg-green-50 hover:bg-green-100 text-green-700'
              }`}
          >
            {item.is_available ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>

          <button
            type="button"
            onClick={() => onDelete(item.id)}
            title="Delete item"
            className="px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-red-50 hover:border-red-300 text-red-500 text-xs font-semibold transition"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
