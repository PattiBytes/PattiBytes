import type { MenuItem } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Shared Tailwind class constants (used by every field component)
// ─────────────────────────────────────────────────────────────────────────────
export const IC =
  'w-full px-4 py-2 border border-gray-300 rounded-xl text-sm ' +
  'focus:ring-2 focus:ring-primary focus:border-transparent transition';
export const LC = 'block text-sm font-medium text-gray-700 mb-1.5';

// ─────────────────────────────────────────────────────────────────────────────
// Timing — NEW
// ─────────────────────────────────────────────────────────────────────────────
export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export type Day = (typeof DAYS)[number];

export interface TimingSlot {
  /** 0 = Sun … 6 = Sat */
  days: number[];
  /** "HH:MM" 24-hr */
  from: string;
  /** "HH:MM" 24-hr */
  to: string;
}

export interface DishTiming {
  /** Whether timing restrictions are active at all */
  enabled: boolean;
  /** "always" = no slot filter; "scheduled" = honour slots array */
  type: 'always' | 'scheduled';
  slots: TimingSlot[];
}

export const DEFAULT_TIMING: DishTiming = {
  enabled: false,
  type: 'always',
  slots: [{ days: [1, 2, 3, 4, 5, 6, 0], from: '09:00', to: '22:00' }],
};

// ─────────────────────────────────────────────────────────────────────────────
// Modal props
// ─────────────────────────────────────────────────────────────────────────────
export interface MenuItemModalProps {
  item:                  MenuItem | null;
  merchantId:            string;
  onClose:               () => void;
  onSuccess:             () => void;
  availableCategories?:  string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Form state — single source of truth for the modal form
// ─────────────────────────────────────────────────────────────────────────────
export interface FormState {
  name:                string;
  description:         string;
  price:               number;
  category:            string;
  custom_category:     string;
  image_url:           string;
  is_available:        boolean;
  is_veg:              boolean;
  preparation_time:    number;
  discount_percentage: number;
  category_id:         string | null;
  /** Persisted as `dish_timing` jsonb column in menu_items */
  timing:              DishTiming;
}

