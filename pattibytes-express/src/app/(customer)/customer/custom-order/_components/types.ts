export const ORDER_CATEGORIES = [
  { id: 'dairy',     label: 'Dairy',        emoji: '🥛', desc: 'Milk, curd, paneer…'    },
  { id: 'grocery',   label: 'Grocery',      emoji: '🛒', desc: 'Rice, atta, pulses…'    },
  { id: 'bakery',    label: 'Bakery',        emoji: '🍞', desc: 'Bread, cakes, pastries' },
  { id: 'fruits',    label: 'Fruits & Veg',  emoji: '🍎', desc: 'Fresh produce'          },
  { id: 'beverages', label: 'Beverages',     emoji: '🥤', desc: 'Juices, soft drinks…'   },
  { id: 'meat',      label: 'Meat & Fish',   emoji: '🥩', desc: 'Non-veg items'          },
  { id: 'pharmacy',  label: 'Pharmacy',      emoji: '💊', desc: 'Medicines, health'      },
  { id: 'other',     label: 'Other',         emoji: '📦', desc: 'Anything else'          },
] as const;

export type OrderCategoryId = typeof ORDER_CATEGORIES[number]['id'];

export interface CustomOrderItem {
  id: string;          // uuid
  name: string;
  quantity: number;
  note: string;
  price: number;       // customer's estimated price (0 = unknown)
  is_custom_product: boolean;
  menu_item_id: string;
  category: string;
  image_url: string | null;
}

export interface CustomOrderForm {
  category:        OrderCategoryId | '';
  description:     string;
  imageUrl:        string | null;      // cloudinary URL after upload
  items:           CustomOrderItem[];
  deliveryAddress: string;
  deliveryLat:     number;
  deliveryLng:     number;
  paymentMethod:   'cod' | 'online';
  customerPhone:   string;
}

export function generateOrderRef(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const rand  = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `PBX-CUST-${rand}`;
}

export function makeItemId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
