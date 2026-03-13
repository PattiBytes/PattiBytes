// ── Category meta (icon/emoji/colour lookup for known slugs) ─────────────────
export const CATEGORY_META: Record<string, {
  emoji: string;
  accent: string;          // active pill class
  bgLight: string;         // card badge
  label: string;
}> = {
  all:         { emoji: '🏪', accent: 'bg-gray-900 text-white',       bgLight: 'bg-gray-100 text-gray-700',      label: 'All'          },
  dairy:       { emoji: '🥛', accent: 'bg-blue-500 text-white',       bgLight: 'bg-blue-50 text-blue-700',       label: 'Dairy'        },
  grocery:     { emoji: '🛒', accent: 'bg-green-500 text-white',      bgLight: 'bg-green-50 text-green-700',     label: 'Grocery'      },
  bakery:      { emoji: '🍞', accent: 'bg-amber-500 text-white',      bgLight: 'bg-amber-50 text-amber-700',     label: 'Bakery'       },
  fruits:      { emoji: '🍎', accent: 'bg-red-500 text-white',        bgLight: 'bg-red-50 text-red-700',         label: 'Fruits & Veg' },
  vegetables:  { emoji: '🥦', accent: 'bg-lime-600 text-white',       bgLight: 'bg-lime-50 text-lime-700',       label: 'Vegetables'   },
  beverages:   { emoji: '🥤', accent: 'bg-cyan-500 text-white',       bgLight: 'bg-cyan-50 text-cyan-700',       label: 'Beverages'    },
  meat:        { emoji: '🥩', accent: 'bg-rose-500 text-white',       bgLight: 'bg-rose-50 text-rose-700',       label: 'Meat'         },
  medicines:   { emoji: '💊', accent: 'bg-emerald-500 text-white',    bgLight: 'bg-emerald-50 text-emerald-700', label: 'Medicines'    },
  pharmacy:    { emoji: '💊', accent: 'bg-emerald-500 text-white',    bgLight: 'bg-emerald-50 text-emerald-700', label: 'Pharmacy'     },
  clothing:    { emoji: '👕', accent: 'bg-pink-500 text-white',       bgLight: 'bg-pink-50 text-pink-700',       label: 'Clothing'     },
  electronics: { emoji: '⚡', accent: 'bg-indigo-500 text-white',     bgLight: 'bg-indigo-50 text-indigo-700',   label: 'Electronics'  },
  stationery:  { emoji: '📒', accent: 'bg-sky-500 text-white',        bgLight: 'bg-sky-50 text-sky-700',         label: 'Stationery'   },
  seafood:     { emoji: '🐟', accent: 'bg-teal-500 text-white',       bgLight: 'bg-teal-50 text-teal-700',       label: 'Seafood'      },
  household:   { emoji: '🏠', accent: 'bg-slate-500 text-white',      bgLight: 'bg-slate-50 text-slate-700',     label: 'Household'    },
  snacks:      { emoji: '🍿', accent: 'bg-yellow-500 text-white',     bgLight: 'bg-yellow-50 text-yellow-700',   label: 'Snacks'       },
  sweets:      { emoji: '🍬', accent: 'bg-fuchsia-500 text-white',    bgLight: 'bg-fuchsia-50 text-fuchsia-700', label: 'Sweets'       },
  spices:      { emoji: '🌶️', accent: 'bg-orange-600 text-white',    bgLight: 'bg-orange-50 text-orange-700',   label: 'Spices'       },
  oils:        { emoji: '🫙', accent: 'bg-yellow-600 text-white',     bgLight: 'bg-yellow-50 text-yellow-700',   label: 'Oils'         },
  flowers:     { emoji: '🌸', accent: 'bg-rose-400 text-white',       bgLight: 'bg-rose-50 text-rose-700',       label: 'Flowers'      },
  baby:        { emoji: '🍼', accent: 'bg-yellow-400 text-white',     bgLight: 'bg-yellow-50 text-yellow-700',   label: 'Baby'         },
  other:       { emoji: '📦', accent: 'bg-purple-500 text-white',     bgLight: 'bg-purple-50 text-purple-700',   label: 'Other'        },
};

const FALLBACK_ACCENTS = [
  'bg-violet-500 text-white', 'bg-teal-500 text-white',
  'bg-sky-500 text-white',    'bg-fuchsia-500 text-white',
  'bg-lime-500 text-white',   'bg-orange-500 text-white',
];

export function getCategoryMeta(id: string, fallbackIdx = 0) {
  return CATEGORY_META[id] ?? {
    emoji:   '📦',
    accent:  FALLBACK_ACCENTS[fallbackIdx % FALLBACK_ACCENTS.length],
    bgLight: 'bg-gray-50 text-gray-700',
    label:   id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
  };
}

// ── Dynamic category (from DB) ────────────────────────────────────────────────
export type DynamicCategory = {
  id:     string;
  label:  string;
  emoji:  string;
  accent: string;
  count:  number;
};

// ── Product ───────────────────────────────────────────────────────────────────
export interface CustomProduct {
  id:             string;
  name:           string;
  category:       string;
  price:          number;
  unit?:          string | null;
  imageurl?:      string | null;
  description?:   string | null;
  isactive:       boolean;
  createdat:      string;
  stock_qty?:     number | null;
  sort_order?:    number | null;
  available_from?: string | null;
  available_to?:   string | null;
}

// ── Sort ──────────────────────────────────────────────────────────────────────
export type SortOption = 'default' | 'price_asc' | 'price_desc' | 'name_asc' | 'newest';

export const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: 'default',    label: 'Default'       },
  { id: 'price_asc',  label: 'Price: Low→High' },
  { id: 'price_desc', label: 'Price: High→Low' },
  { id: 'name_asc',   label: 'Name: A→Z'     },
  { id: 'newest',     label: 'Newest first'  },
];
