// src/components/custom-orders/types.ts
export type CustomOrderItem = {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  price?: number;
  notes?: string;
  from_catalog?: boolean;
  menu_item_id?: string;
  is_custom_product?: boolean;
};

export type CustomOrderRecord = {
  id: string;
  order_id: string | null;
  linked_order_id: string | null;   // ← alias for order_id, keeps History working
  customer_id: string;
  custom_order_ref: string;
  category: string;
  description: string;
  image_url: string | null;
  items: CustomOrderItem[] | null;
  status: string;
  quoted_amount: number | null;
  quote_message: string | null;
  delivery_address: string;
  delivery_lat: number | null;
  delivery_lng: number | null;
  total_amount: number | null;
  delivery_fee: number | null;
  payment_method: string | null;
  customer_phone: string | null;
  created_at: string;               // ← correct DB column name
  budget?: number | null;
  custom_category?: string[];       // ← optional (derived from category string)
};

export type SavedAddressLocal = {
  id: string;
  label: string;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  address: string;
  apartment_floor?: string | null;
  landmark?: string | null;
  latitude: number;
  longitude: number;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  is_default: boolean;
  delivery_instructions?: string | null;
};

export type CatalogProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  imageurl: string;
  description: string;
  isactive: boolean;
};
