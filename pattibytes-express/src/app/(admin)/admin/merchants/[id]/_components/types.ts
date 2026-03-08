/* eslint-disable @typescript-eslint/no-explicit-any */

export type TabType = 'profile' | 'menu' | 'orders';

export const ORDER_STATUSES = [
  'pending', 'confirmed', 'preparing', 'on_the_way', 'delivered', 'cancelled',
] as const;

export type MerchantRow = {
  id: string;
  user_id: string | null;
  business_name: string;
  business_type: string | null;
  cuisine_types: any;
  description?: string | null;
  logo_url?: string | null;
  banner_url?: string | null;
  phone?: string | null;
  email?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_active?: boolean | null;
  is_verified?: boolean | null;
  is_featured?: boolean | null;
  delivery_radius_km?: number | null;
  min_order_amount?: number | null;
  estimated_prep_time?: number | null;
  commission_rate?: number | null;
  address?: any;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  gst_enabled?: boolean | null;
  gst_percentage?: number | null;
  opening_time?: string | null;
  closing_time?: string | null;
  created_at?: string;
  updated_at?: string;
};

// ─── Timing types (shared between modal & card) ───────────────────────────────
export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export interface TimingSlot {
  days: number[];   // 0=Sun … 6=Sat
  from: string;     // "HH:MM"
  to:   string;
}

export interface DishTiming {
  enabled: boolean;
  type:    'always' | 'scheduled';
  slots:   TimingSlot[];
}

export const DEFAULT_TIMING: DishTiming = {
  enabled: false,
  type:    'always',
  slots:   [{ days: [1, 2, 3, 4, 5], from: '09:00', to: '22:00' }],
};


export type MenuItemRow = {
  id: string;
  merchant_id: string;
  name: string;
  description?: string | null;
  price: number;
  category?: string | null;
  image_url?: string | null;
  is_available?: boolean | null;
  is_veg?: boolean | null;
  preparation_time?: number | null;
  discount_percentage?: number | null;
   dish_timing:         DishTiming | null; 
  category_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type OrderRow = {
  id: string;
  status?: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  total_amount?: number | null;
  delivery_address?: any;
  items?: any;
  created_at?: string | null;
};

export type CategoryInfo = {
  name: string;
  count: number;
};


export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

export function money(n: any) {
  const v = Number(n ?? 0);
  try {
    return v.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  } catch {
    return `₹${Math.round(v)}`;
  }
}

export function parseCuisineToText(v: any): string {
  if (!v) return '';
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'string') {
    try { const j = JSON.parse(v); if (Array.isArray(j)) return j.join(', '); } catch {}
    return v.trim();
  }
  return '';
}

export function cuisineTextToArray(text: string): string[] {
  return (text || '').split(',').map(x => x.trim()).filter(Boolean);
}

export function safeAddrText(a: any): string {
  if (!a) return '';
  if (typeof a === 'string') return a;
  if (typeof a === 'object') return a.address || a.formatted_address || '';
  return String(a);
}

export function formatTimeDisplay(time: string): string {
  if (!time) return '';
  try {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${period}`;
  } catch { return time; }
}

export function isOvernightShift(open: string, close: string): boolean {
  if (!open || !close) return false;
  try {
    const [oh] = open.split(':').map(Number);
    const [ch] = close.split(':').map(Number);
    return ch < oh;
  } catch { return false; }
}

// ─── Draft category helpers (localStorage) ───────────────────────────────────
const DRAFT_KEY = (merchantId: string) => `draft_cats_${merchantId}`;

export function getDraftCategories(merchantId: string): string[] {
  try {
    const raw = localStorage.getItem(DRAFT_KEY(merchantId));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}

export function saveDraftCategory(merchantId: string, cat: string): void {
  try {
    const existing = getDraftCategories(merchantId);
    if (!existing.includes(cat)) {
      localStorage.setItem(DRAFT_KEY(merchantId), JSON.stringify([...existing, cat]));
    }
  } catch { /* ignore */ }
}

export function removeDraftCategory(merchantId: string, cat: string): void {
  try {
    const updated = getDraftCategories(merchantId).filter(c => c !== cat);
    localStorage.setItem(DRAFT_KEY(merchantId), JSON.stringify(updated));
  } catch { /* ignore */ }
}

// Shared Tailwind class helpers
export const IC = 'w-full px-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition';
export const LC = 'block text-sm font-medium text-gray-700 mb-1.5';


export function setDraftCategories(merchantId: string, cats: string[]) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(`draft_cats_${merchantId}`, JSON.stringify(cats)); } catch {}
}
