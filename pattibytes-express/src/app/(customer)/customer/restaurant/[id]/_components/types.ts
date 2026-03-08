/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import type { Restaurant, MenuItem as ServiceMenuItem } from '@/services/restaurants';

export type { Restaurant };

export type MenuItem = ServiceMenuItem & {
  /**
   * Either JSON string / object:
   *   { type:"scheduled", enabled:true, slots:[{from:"09:00", to:"18:00", days:[0-6]}] }
   * or legacy plain string "HH:MM-HH:MM"
   * null / undefined = always available
   */
  dish_timing?: string | Record<string, any> | null;
};

export type SortKey = 'recommended' | 'price_low' | 'price_high';

export type TrendingItem = {
  id: string;
  name: string;
  price: number;
  image_url?: string | null;
  discount_percentage?: number | null;
  is_veg?: boolean | null;
  category?: string | null;
  totalQty: number;
};

export type OfferItem = {
  id: string;
  promoId: string;
  buyItemId: string;
  buyItemName: string;
  buyItemImage?: string | null;
  buyItemPrice: number;
  getItemId?: string;
  getItemName?: string;
  offerLabel: string;
  promoCode: string;
};

export type RecommendedRestaurant = {
  id: string;
  business_name: string;
  logo_url?: string | null;
  cuisine_types?: string[];
  average_rating?: number;
  estimated_prep_time?: number;
  distance_km?: number;
};

// ─── Live clock ──────────────────────────────────────────────────────────────
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

// ─── DishTiming schema ───────────────────────────────────────────────────────
export interface DishTimingSlot {
  from: string;   // "HH:MM"
  to:   string;   // "HH:MM"
  days: number[]; // 0=Sun … 6=Sat
}
export interface DishTimingConfig {
  type:    'scheduled' | 'always' | string;
  enabled: boolean;
  slots:   DishTimingSlot[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "09:30" → "9:30 AM" */
function fmt12FromHHMM(hhmm: string): string {
  const [hStr, mStr] = String(hhmm || '00:00').split(':');
  const h   = Number(hStr) || 0;
  const m   = String(Number(mStr) || 0).padStart(2, '0');
  const suf = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${suf}`;
}

function hhmmToMin(hhmm: string): number {
  const [h, m] = String(hhmm || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Safely parse dish_timing — handles:
 *   • null / undefined → null
 *   • JSON string → parse
 *   • plain object → use directly
 *   • legacy "HH:MM-HH:MM" string → convert to config
 */
export function parseDishTimingConfig(raw: any): DishTimingConfig | null {
  if (raw == null) return null;

  let obj: any;

  if (typeof raw === 'string') {
    const str = raw.trim();
    if (!str) return null;

    // Legacy plain format: "09:00-18:00"
    const legacy = str.match(/^(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})$/);
    if (legacy) {
      return {
        type:    'scheduled',
        enabled: true,
        slots:   [{
          from: `${legacy[1].padStart(2, '0')}:${legacy[2]}`,
          to:   `${legacy[3].padStart(2, '0')}:${legacy[4]}`,
          days: [0, 1, 2, 3, 4, 5, 6],
        }],
      };
    }

    // JSON object string
    try { obj = JSON.parse(str); } catch { return null; }
  } else if (typeof raw === 'object' && !Array.isArray(raw)) {
    obj = raw;
  } else {
    return null;
  }

  if (!obj || typeof obj !== 'object') return null;

  return {
    type:    String(obj.type ?? 'scheduled'),
    enabled: obj.enabled !== false,   // default true if key missing
    slots:   Array.isArray(obj.slots)
      ? obj.slots.map((s: any) => ({
          from: String(s?.from ?? '00:00'),
          to:   String(s?.to   ?? '23:59'),
          days: Array.isArray(s?.days)
            ? s.days.map((d: any) => Number(d))
            : [0, 1, 2, 3, 4, 5, 6],
        }))
      : [],
  };
}

/** Is item orderable right now based on dish_timing? */
export function isDishAvailableNow(raw: any, now: Date = new Date()): boolean {
  const cfg = parseDishTimingConfig(raw);
  if (!cfg)               return true;  // no config = always open
  if (!cfg.enabled)       return true;  // disabled restriction = always open
  if (cfg.type === 'always') return true;
  if (!cfg.slots.length)  return true;  // no slots = always open

  const curDay = now.getDay();
  const curMin = now.getHours() * 60 + now.getMinutes();

  return cfg.slots.some(slot => {
    if (!slot.days.includes(curDay)) return false;
    const start = hhmmToMin(slot.from);
    const end   = hhmmToMin(slot.to);
    // overnight wrap (e.g. 22:00–02:00)
    if (end < start) return curMin >= start || curMin < end;
    return curMin >= start && curMin < end;
  });
}

/** Today's availability window label, e.g. "9:00 AM – 6:00 PM", or null if always */
export function getDishTimingLabel(raw: any, now: Date = new Date()): string | null {
  const cfg = parseDishTimingConfig(raw);
  if (!cfg || !cfg.enabled || cfg.type === 'always' || !cfg.slots.length) return null;

  const curDay    = now.getDay();
  const todaySlots = cfg.slots.filter(s => s.days.includes(curDay));

  if (!todaySlots.length) return 'Not available today';
  return todaySlots
    .map(s => `${fmt12FromHHMM(s.from)} – ${fmt12FromHHMM(s.to)}`)
    .join(' · ');
}

/** Next-available human label: "Available from 9:00 AM", "Tomorrow from…", "Mon from…" */
export function getNextAvailableLabel(raw: any, now: Date = new Date()): string {
  const cfg = parseDishTimingConfig(raw);
  if (!cfg || !cfg.enabled || cfg.type === 'always' || !cfg.slots.length) return '';

  const curDay = now.getDay();
  const curMin = now.getHours() * 60 + now.getMinutes();

  for (let d = 0; d < 8; d++) {
    const checkDay = (curDay + d) % 7;
    const daySlots = cfg.slots
      .filter(s => s.days.includes(checkDay))
      .sort((a, b) => hhmmToMin(a.from) - hhmmToMin(b.from));

    for (const slot of daySlots) {
      const start = hhmmToMin(slot.from);
      if (d === 0 && start <= curMin) continue; // already passed today
      const timeLabel = fmt12FromHHMM(slot.from);
      if (d === 0) return `Available from ${timeLabel}`;
      if (d === 1) return `Tomorrow from ${timeLabel}`;
      return `${DAY_NAMES[checkDay]} from ${timeLabel}`;
    }
  }
  return 'Not available this week';
}

/** All-days schedule summary for tooltip/detail view */
export function getFullScheduleSummary(raw: any): string {
  const cfg = parseDishTimingConfig(raw);
  if (!cfg || !cfg.enabled || cfg.type === 'always' || !cfg.slots.length) return 'Always available';

  return cfg.slots
    .map(s => {
      const days = s.days.map(d => DAY_NAMES[d]).join(', ');
      return `${days}: ${fmt12FromHHMM(s.from)} – ${fmt12FromHHMM(s.to)}`;
    })
    .join(' | ');
}

// ─── Restaurant hours ────────────────────────────────────────────────────────

export function isRestaurantOpenNow(
  openingTime: any,
  closingTime: any,
  now: Date = new Date(),
): boolean {
  const o = String(openingTime ?? '').trim();
  const c = String(closingTime ?? '').trim();
  if (!o || !c) return true; // no hours = always open
  const open  = hhmmToMin(o);
  const close = hhmmToMin(c);
  const cur   = now.getHours() * 60 + now.getMinutes();
  if (close < open) return cur >= open || cur < close; // overnight
  return cur >= open && cur < close;
}

export function getRestaurantHoursLabel(openingTime: any, closingTime: any): string {
  const o = String(openingTime ?? '').trim();
  const c = String(closingTime ?? '').trim();
  if (!o || !c) return 'Open 24/7';
  return `${fmt12FromHHMM(o.substring(0, 5))} – ${fmt12FromHHMM(c.substring(0, 5))}`;
}

// ─── misc ─────────────────────────────────────────────────────────────────────
export function finalPrice(price: number, discount?: number | null): number {
  const p = Number(price || 0);
  const d = Number(discount || 0);
  return d ? p * (1 - d / 100) : p;
}

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
