'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Plus, Minus, Clock, Ban, AlertCircle, Info, ShoppingCart } from 'lucide-react';
import { getSafeImageSrc } from '@/lib/safeImage';
import {
  type MenuItem,
  cx,
  finalPrice,
  isDishAvailableNow,
  getDishTimingLabel,
  getNextAvailableLabel,
  getFullScheduleSummary,
} from '../../_components/types';

interface Props {
  item: MenuItem;
  quantity: number;
  now: Date;
  restaurantOpen: boolean;
  onUpdateQty: (id: string, delta: number) => void;
  onAdd: (item: MenuItem) => void;
}

export function MenuGridCard({
  item,
  quantity,
  now,
  restaurantOpen,
  onUpdateQty,
  onAdd,
}: Props) {
  const [showSchedule, setShowSchedule] = useState(false);

  const imgSrc          = getSafeImageSrc(item.image_url);
  const hasDiscount     = Number(item.discount_percentage || 0) > 0;
  const discounted      = finalPrice(item.price, item.discount_percentage);

  const itemFlagAvail   = item.is_available !== false;
  const timingAvail     = isDishAvailableNow(item.dish_timing, now);
  const timingLabel     = getDishTimingLabel(item.dish_timing, now);
  const nextLabel       = getNextAvailableLabel(item.dish_timing, now);
  const fullSchedule    = getFullScheduleSummary(item.dish_timing);

  const canOrder = restaurantOpen && itemFlagAvail && timingAvail;

  const unavailableReason = !restaurantOpen
    ? 'restaurant-closed'
    : !itemFlagAvail
    ? 'item-unavailable'
    : !timingAvail
    ? 'timing'
    : null;

  return (
    <div
      className={cx(
        'bg-white rounded-2xl shadow transition-all duration-300 overflow-hidden flex flex-col',
        canOrder
          ? 'hover:shadow-xl hover:scale-[1.02] cursor-default'
          : 'opacity-80 shadow-sm'
      )}
    >
      {/* ── Image ──────────────────────────────────────────────────────── */}
      <div className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex-shrink-0">
        {imgSrc ? (
          <Image
            src={imgSrc}
            alt={item.name}
            fill
            sizes="(max-width:640px) 50vw,(max-width:1024px) 33vw,25vw"
            className={cx('object-cover transition-all', !canOrder && 'grayscale-[30%]')}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-xs font-bold">
            No Image
          </div>
        )}

        {/* Discount ribbon */}
        {hasDiscount && canOrder && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-black
                          px-2 py-0.5 rounded-full shadow animate-pulse">
            -{item.discount_percentage}%
          </div>
        )}

        {/* Veg / non-veg dot */}
        {item.is_veg != null && (
          <div className={cx(
            'absolute top-2 right-2 w-5 h-5 border-2 bg-white rounded-sm flex items-center justify-center shadow',
            item.is_veg ? 'border-green-600' : 'border-red-600'
          )}>
            <div className={cx('w-2.5 h-2.5 rounded-full', item.is_veg ? 'bg-green-600' : 'bg-red-600')} />
          </div>
        )}

        {/* Unavailable overlay */}
        {!canOrder && (
          <div className="absolute inset-0 bg-black/45 flex flex-col items-center justify-center gap-1">
            {unavailableReason === 'restaurant-closed' && (
              <>
                <div className="w-9 h-9 rounded-full bg-red-500/80 flex items-center justify-center">
                  <Ban className="w-5 h-5 text-white" />
                </div>
                <span className="text-white text-[10px] font-black tracking-wide px-2 py-0.5
                                 bg-red-600/80 rounded-full mt-0.5">
                  CLOSED
                </span>
              </>
            )}
            {unavailableReason === 'timing' && (
              <>
                <div className="w-9 h-9 rounded-full bg-amber-500/80 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <span className="text-white text-[10px] font-black tracking-wide px-2 py-0.5
                                 bg-amber-600/80 rounded-full mt-0.5">
                  OUT OF HOURS
                </span>
              </>
            )}
            {unavailableReason === 'item-unavailable' && (
              <>
                <div className="w-9 h-9 rounded-full bg-gray-600/80 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <span className="text-white text-[10px] font-black tracking-wide px-2 py-0.5
                                 bg-gray-700/80 rounded-full mt-0.5">
                  UNAVAILABLE
                </span>
              </>
            )}
          </div>
        )}

        {/* Timing badge on image — shown when available but has a window */}
        {canOrder && timingLabel && (
          <div className="absolute bottom-2 left-2 right-2">
            <div className="bg-green-600/85 backdrop-blur-sm text-white text-[10px] font-black
                            px-2 py-0.5 rounded-full flex items-center gap-1 w-fit max-w-full truncate">
              <Clock className="w-2.5 h-2.5 flex-shrink-0" />
              <span className="truncate">{timingLabel}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="p-3 flex flex-col flex-1">

        {/* Category */}
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide truncate mb-0.5">
          {item.category || 'Other'}
        </p>

        {/* Name */}
        <h3 className={cx(
          'font-black text-sm leading-snug line-clamp-2 mb-1',
          canOrder ? 'text-gray-900' : 'text-gray-500'
        )}>
          {item.name}
        </h3>

        {/* Description */}
        {item.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-2 font-medium leading-relaxed">
            {item.description}
          </p>
        )}

        {/* ── Timing info row ─────────────────────────────────────── */}
        {timingLabel && unavailableReason !== 'restaurant-closed' && (
          <div className="mb-2 flex items-center gap-1 flex-wrap">
            <div className={cx(
              'inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border',
              timingAvail
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            )}>
              <Clock className="w-2.5 h-2.5 flex-shrink-0" />
              <span className="truncate max-w-[120px]">
                {timingAvail ? timingLabel : nextLabel}
              </span>
            </div>

            {/* Schedule info toggle */}
            <button
              type="button"
              onClick={() => setShowSchedule(s => !s)}
              title="View full schedule"
              className="w-4 h-4 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center
                         justify-center text-gray-400 hover:text-gray-600 transition flex-shrink-0"
            >
              <Info className="w-2.5 h-2.5" />
            </button>
          </div>
        )}

        {/* Schedule tooltip */}
        {showSchedule && timingLabel && (
          <div className="mb-2 px-2.5 py-2 bg-amber-50 border border-amber-200 rounded-xl
                          text-[10px] text-amber-800 font-semibold leading-relaxed">
            📅 {fullSchedule}
          </div>
        )}

        {/* Unavailable reason badge */}
        {unavailableReason === 'item-unavailable' && (
          <div className="mb-2 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5
                          rounded-full bg-gray-100 text-gray-500 border border-gray-200">
            <AlertCircle className="w-2.5 h-2.5" /> Currently Unavailable
          </div>
        )}
        {unavailableReason === 'restaurant-closed' && (
          <div className="mb-2 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5
                          rounded-full bg-red-50 text-red-600 border border-red-200">
            <Ban className="w-2.5 h-2.5" /> Restaurant Closed
          </div>
        )}

        {/* Push controls to bottom */}
        <div className="flex-1" />

        {/* ── Price ───────────────────────────────────────────────── */}
        <div className="flex items-baseline gap-1.5 mb-3">
          {hasDiscount && (
            <span className="text-xs text-gray-400 line-through">
              ₹{Number(item.price).toFixed(2)}
            </span>
          )}
          <span className={cx(
            'font-black text-base',
            canOrder
              ? 'bg-gradient-to-r from-primary to-pink-600 bg-clip-text text-transparent'
              : 'text-gray-400'
          )}>
            ₹{discounted.toFixed(2)}
          </span>
          {item.preparation_time != null && item.preparation_time > 0 && (
            <span className="ml-auto text-[10px] text-gray-400 font-semibold flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />{item.preparation_time}m
            </span>
          )}
        </div>

        {/* ── Cart controls ────────────────────────────────────────── */}
        {canOrder ? (
          <div className="flex items-center gap-2">
            {/* Qty stepper */}
            <div className="flex items-center bg-gray-100 rounded-xl p-0.5 shadow-inner">
              <button
                onClick={() => onUpdateQty(item.id, -1)}
                disabled={quantity <= 1}
                className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg
                           transition-all disabled:opacity-30 active:scale-95"
                aria-label="Decrease"
              >
                <Minus className="w-3.5 h-3.5 text-gray-700" />
              </button>
              <span className="w-7 text-center font-black text-gray-900 text-sm select-none">
                {quantity}
              </span>
              <button
                onClick={() => onUpdateQty(item.id, 1)}
                disabled={quantity >= 10}
                className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg
                           transition-all disabled:opacity-30 active:scale-95"
                aria-label="Increase"
              >
                <Plus className="w-3.5 h-3.5 text-gray-700" />
              </button>
            </div>

            {/* Add button */}
            <button
              onClick={() => onAdd(item)}
              className="flex-1 bg-gradient-to-r from-primary to-pink-500 text-white
                         py-2.5 rounded-xl font-black text-xs flex items-center justify-center
                         gap-1.5 hover:shadow-lg transition-all hover:scale-105 active:scale-95"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Add
            </button>
          </div>
        ) : (
          /* Disabled state — styled per reason */
          <div className={cx(
            'w-full py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 cursor-not-allowed select-none',
            unavailableReason === 'timing'
              ? 'bg-amber-50 text-amber-500 border border-amber-200'
              : unavailableReason === 'restaurant-closed'
              ? 'bg-red-50 text-red-400 border border-red-200'
              : 'bg-gray-100 text-gray-400 border border-gray-200'
          )}>
            {unavailableReason === 'timing'     && <Clock        className="w-3.5 h-3.5 flex-shrink-0" />}
            {unavailableReason === 'restaurant-closed' && <Ban   className="w-3.5 h-3.5 flex-shrink-0" />}
            {unavailableReason === 'item-unavailable'  && <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />}
            <span className="truncate">
              {unavailableReason === 'timing'
                ? (nextLabel || 'Not available now')
                : unavailableReason === 'restaurant-closed'
                ? 'Restaurant Closed'
                : 'Unavailable'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
