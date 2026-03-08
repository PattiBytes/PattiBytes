'use client';

import Image from 'next/image';
import { ShoppingCart, Plus, Minus, Image as ImageIcon, Clock, AlertCircle, Ban, Info } from 'lucide-react';
import { useState } from 'react';
import { getSafeImageSrc } from '@/lib/safeImage';
import {
  type MenuItem, cx, finalPrice,
  isDishAvailableNow, getDishTimingLabel,
  getNextAvailableLabel, getFullScheduleSummary,
} from './types';

interface Props {
  item: MenuItem;
  quantity: number;
  now: Date;
  restaurantOpen: boolean;
  onAdd: (item: MenuItem) => void;
  onUpdateQty: (id: string, delta: number) => void;
}

export function MenuItemCard({ item, quantity, now, restaurantOpen, onAdd, onUpdateQty }: Props) {
  const [showSchedule, setShowSchedule] = useState(false);

  const discountedPrice = finalPrice(item.price, item.discount_percentage);
  const hasDiscount     = Number(item.discount_percentage || 0) > 0;
  const imgSrc          = getSafeImageSrc(item.image_url);

  // is_available=false → hard off; timing check is separate
  const itemFlagAvailable = item.is_available !== false;
  const timingAvailable   = isDishAvailableNow(item.dish_timing, now);
  const timingLabel       = getDishTimingLabel(item.dish_timing, now);
  const nextLabel         = getNextAvailableLabel(item.dish_timing, now);
  const fullSchedule      = getFullScheduleSummary(item.dish_timing);

  // item is orderable only when:  restaurant open + item flagged available + within timing window
  const canOrder = restaurantOpen && itemFlagAvailable && timingAvailable;

  // What's the reason it can't be ordered?
  const unavailableReason = !restaurantOpen
    ? 'restaurant-closed'
    : !itemFlagAvailable
    ? 'item-unavailable'
    : !timingAvailable
    ? 'timing'
    : null;

  return (
    <div
      id={`menu-item-${item.id}`}
      className={cx(
        'p-4 md:p-5 transition-all animate-in fade-in group relative',
        canOrder
          ? 'hover:bg-gradient-to-r hover:from-orange-50/50 hover:to-pink-50/50'
          : 'bg-gray-50/60'
      )}
    >
      <div className="flex gap-4">

        {/* ── Image ─────────────────────────────────────────────── */}
        <div className={cx(
          'relative w-24 h-24 md:w-28 md:h-28 rounded-2xl overflow-hidden flex-shrink-0',
          'bg-gradient-to-br from-gray-100 to-gray-200 border-2 shadow-sm transition-all',
          canOrder
            ? 'border-gray-200 group-hover:border-primary group-hover:scale-105'
            : 'border-gray-300 opacity-75'
        )}>
          {imgSrc ? (
            <Image src={imgSrc} alt={item.name} fill sizes="112px" className="object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-300">
              <ImageIcon className="w-8 h-8" />
            </div>
          )}

          {/* Discount badge */}
          {hasDiscount && canOrder && (
            <div className="absolute top-1.5 left-1.5 bg-red-500 text-white text-xs font-black
                            px-1.5 py-0.5 rounded-full shadow">
              -{item.discount_percentage}%
            </div>
          )}

          {/* Unavailable overlay */}
          {!canOrder && (
            <div className="absolute inset-0 bg-black/45 flex flex-col items-center justify-center gap-1 rounded-2xl">
              {unavailableReason === 'restaurant-closed' && (
                <>
                  <Ban className="w-5 h-5 text-red-300" />
                  <span className="text-red-200 text-[9px] font-black text-center px-1">CLOSED</span>
                </>
              )}
              {unavailableReason === 'timing' && (
                <>
                  <Clock className="w-5 h-5 text-amber-300" />
                  <span className="text-amber-200 text-[9px] font-black text-center px-1">OUT OF HOURS</span>
                </>
              )}
              {unavailableReason === 'item-unavailable' && (
                <>
                  <AlertCircle className="w-5 h-5 text-gray-300" />
                  <span className="text-gray-200 text-[9px] font-black text-center px-1">UNAVAILABLE</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Details ───────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">

          {/* Name + veg dot */}
          <div className="flex items-start gap-2 mb-1">
            {item.is_veg != null && (
              <div className={cx(
                'mt-0.5 w-4 h-4 border-2 flex-shrink-0 flex items-center justify-center rounded-sm',
                item.is_veg ? 'border-green-600' : 'border-red-600'
              )}>
                <div className={cx('w-2 h-2 rounded-full', item.is_veg ? 'bg-green-600' : 'bg-red-600')} />
              </div>
            )}
            <h3 className={cx(
              'font-black text-sm md:text-base leading-snug',
              canOrder ? 'text-gray-900' : 'text-gray-500'
            )}>
              {item.name}
            </h3>
          </div>

          {/* Description */}
          {item.description && (
            <p className="text-xs text-gray-500 line-clamp-2 mb-2 font-medium leading-relaxed">
              {item.description}
            </p>
          )}

          {/* ── Status badges ───────────────────────────────────── */}

          {/* Restaurant closed */}
          {unavailableReason === 'restaurant-closed' && (
            <div className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full mb-2
                            bg-red-50 text-red-600 border border-red-200">
              <Ban className="w-3 h-3" /> Restaurant Closed
            </div>
          )}

          {/* Item marked unavailable */}
          {unavailableReason === 'item-unavailable' && (
            <div className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full mb-2
                            bg-gray-100 text-gray-500 border border-gray-200">
              <AlertCircle className="w-3 h-3" /> Currently Unavailable
            </div>
          )}

          {/* Timing badge (dynamic — re-evaluates every 60s via `now`) */}
          {timingLabel && unavailableReason !== 'restaurant-closed' && (
            <div className="flex items-center gap-1 mb-2 flex-wrap">
              <div className={cx(
                'inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border',
                timingAvailable
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              )}>
                <Clock className="w-3 h-3 flex-shrink-0" />
                {timingAvailable ? timingLabel : nextLabel}
              </div>

              {/* Info toggle for full schedule */}
              <button
                type="button"
                onClick={() => setShowSchedule(s => !s)}
                className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-100
                           hover:bg-gray-200 transition text-gray-400 hover:text-gray-600"
                title="View full schedule"
              >
                <Info className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Full schedule tooltip */}
          {showSchedule && timingLabel && (
            <div className="mb-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs
                            text-amber-800 font-semibold leading-relaxed">
              📅 {fullSchedule}
            </div>
          )}

          {/* ── Price ───────────────────────────────────────────── */}
          <div className="flex items-baseline gap-2 mb-3">
            {hasDiscount && (
              <span className="text-xs text-gray-400 line-through">₹{item.price}</span>
            )}
            <span className={cx(
              'text-base font-black',
              canOrder
                ? 'bg-gradient-to-r from-primary to-pink-600 bg-clip-text text-transparent'
                : 'text-gray-400'
            )}>
              ₹{discountedPrice.toFixed(2)}
            </span>
            {item.preparation_time != null && item.preparation_time > 0 && (
              <span className="text-xs text-gray-400 font-semibold flex items-center gap-0.5">
                <Clock className="w-3 h-3" />{item.preparation_time}m
              </span>
            )}
          </div>

          {/* ── Cart controls ────────────────────────────────────── */}
          {canOrder ? (
            <div className="flex flex-wrap items-center gap-2">
              {/* Qty stepper */}
              <div className="flex items-center bg-gray-100 rounded-xl p-1 shadow-inner">
                <button
                  onClick={() => onUpdateQty(item.id, -1)}
                  disabled={quantity <= 1}
                  className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg
                             transition disabled:opacity-30 hover:scale-110 active:scale-95"
                  aria-label="Decrease"
                >
                  <Minus className="w-3.5 h-3.5 text-gray-700" />
                </button>
                <span className="w-9 text-center font-black text-gray-900 text-sm select-none">
                  {quantity}
                </span>
                <button
                  onClick={() => onUpdateQty(item.id, 1)}
                  disabled={quantity >= 10}
                  className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg
                             transition disabled:opacity-30 hover:scale-110 active:scale-95"
                  aria-label="Increase"
                >
                  <Plus className="w-3.5 h-3.5 text-gray-700" />
                </button>
              </div>

              <button
                onClick={() => onAdd(item)}
                className="flex-1 min-w-[100px] bg-gradient-to-r from-primary to-pink-500 text-white
                           px-4 py-2.5 rounded-xl font-black text-sm flex items-center justify-center
                           gap-1.5 hover:shadow-lg transition hover:scale-105 active:scale-95"
              >
                <ShoppingCart className="w-4 h-4" /> Add to Cart
              </button>
            </div>
          ) : (
            /* Disabled state — styled differently per reason */
            <div className={cx(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm w-fit cursor-not-allowed select-none',
              unavailableReason === 'timing'
                ? 'bg-amber-50 text-amber-500 border border-amber-200'
                : 'bg-gray-100 text-gray-400'
            )}>
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span className="line-clamp-1">
                {unavailableReason === 'timing'
                  ? nextLabel || 'Not available now'
                  : unavailableReason === 'restaurant-closed'
                  ? 'Restaurant Closed'
                  : 'Unavailable'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
