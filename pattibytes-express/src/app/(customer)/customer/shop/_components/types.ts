// ── Category definitions ──────────────────────────────────────────────────────
export const PRODUCT_CATEGORIES = [
  { id: 'all',       label: 'All',          emoji: '🏪', accent: 'bg-gray-800    text-white', light: 'bg-gray-100   border-gray-300   text-gray-700'     },
  { id: 'dairy',     label: 'Dairy',        emoji: '🥛', accent: 'bg-blue-500    text-white', light: 'bg-blue-50    border-blue-200   text-blue-700'     },
  { id: 'grocery',   label: 'Grocery',      emoji: '🛒', accent: 'bg-green-500   text-white', light: 'bg-green-50   border-green-200  text-green-700'    },
  { id: 'bakery',    label: 'Bakery',       emoji: '🍞', accent: 'bg-amber-500   text-white', light: 'bg-amber-50   border-amber-200  text-amber-700'    },
  { id: 'fruits',    label: 'Fruits & Veg', emoji: '🍎', accent: 'bg-red-500     text-white', light: 'bg-red-50     border-red-200    text-red-700'      },
  { id: 'beverages', label: 'Beverages',    emoji: '🥤', accent: 'bg-cyan-500    text-white', light: 'bg-cyan-50    border-cyan-200   text-cyan-700'     },
  { id: 'meat',      label: 'Meat',         emoji: '🥩', accent: 'bg-rose-500    text-white', light: 'bg-rose-50    border-rose-200   text-rose-700'     },
  { id: 'pharmacy',  label: 'Pharmacy',     emoji: '💊', accent: 'bg-emerald-500 text-white', light: 'bg-emerald-50 border-emerald-200 text-emerald-700'  },
  { id: 'other',     label: 'Other',        emoji: '📦', accent: 'bg-purple-500  text-white', light: 'bg-purple-50  border-purple-200 text-purple-700'   },
] as const;

export type CategoryId = typeof PRODUCT_CATEGORIES[number]['id'];

export interface CustomProduct {
  id:           string;
  name:         string;
  category:     string;
  price:        number;
  unit?:        string | null;
  imageurl?:    string | null;
  description?: string | null;
  isactive:     boolean;
  createdat:    string;
}

export function getCategoryMeta(id: string) {
  return (
    PRODUCT_CATEGORIES.find(c => c.id === id) ??
    PRODUCT_CATEGORIES[PRODUCT_CATEGORIES.length - 1]
  );
}
