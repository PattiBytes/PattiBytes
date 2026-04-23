export type CustomProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  imageurl?: string | null;
  description?: string | null;
  isactive: boolean;
  createdat: string;
  updatedat?: string | null;
  available_from?: string | null;   // "HH:MM" 24-hr
  available_to?: string | null;     // "HH:MM" 24-hr
  available_days?: number[] | null; // 0=Sun … 6=Sat
  sort_order?: number | null;
  stock_qty?: number | null;
};

export type ProductFormData = {
  name: string;
  category: string;
  price: string;
  unit: string;
  imageurl: string;
  description: string;
  available_from: string;
  available_to: string;
  available_days: number[];
  stock_qty: string;
  sort_order: string;
};

export const EMPTY_FORM: ProductFormData = {
  name: '', category: 'custom', price: '', unit: 'pc',
  imageurl: '', description: '', available_from: '', available_to: '',
  available_days: [0,1,2,3,4,5,6], stock_qty: '', sort_order: '',
};

export const CATEGORIES = [
  { value: 'custom',    label: 'Custom Order',   emoji: '🛍️' },
  { value: 'dairy',     label: 'Dairy Products', emoji: '🥛' },
  { value: 'grocery',   label: 'Grocery',        emoji: '🛒' },
  { value: 'medicines', label: 'Medicines',      emoji: '💊' },
];

export const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
export const UNITS = ['pc','kg','g','ltr','ml','pack','dozen','box','pair','set'];

