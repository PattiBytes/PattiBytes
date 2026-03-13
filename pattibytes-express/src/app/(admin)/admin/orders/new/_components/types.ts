/* eslint-disable @typescript-eslint/no-explicit-any */
export type MerchantRow = {
  id: string;
  business_name?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  gst_enabled?: boolean | null;
  gst_percentage?: number | null;
  city?: string | null;
  state?: string | null;
};

export type CustomerMini = {
  id: string;
  full_name?: string | null;
  phone?: string | null;
  email?: string | null;
  role?: string | null;
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
  category_id?: string | null;
  discount_percentage?: number | null;
};

export type CustomProductRow = {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  imageurl?: string | null;
  description?: string | null;
  isactive: boolean;
  stock_qty?: number | null;
  sort_order?: number | null;
};

export type PromoCode = {
  id: string;
  code: string;
  description?: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount?: number | null;
  max_discount_amount?: number | null;
  merchant_id?: string | null;
  is_active: boolean;
  valid_from?: string | null;
  valid_until?: string | null;
  deal_type?: string | null;
  deal_json?: any;
  auto_apply?: boolean;
};

export type OrderItemCompat = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category?: string | null;
  image_url?: string | null;
  is_veg?: boolean | null;
  merchant_id?: string | null;
  menu_item_id?: string | null;
  category_id?: string | null;
  discount_percentage?: number | null;
  appliedDiscount?: number;
  unit?: string | null;
  note?: string | null;
  is_custom_product?: boolean;
};

export type AddressSuggestion = {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    town?: string;
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
};

export type OrderType    = 'restaurant' | 'custom';
export type CustomerMode = 'existing' | 'walkin';
export type PaymentMethod  = 'cod' | 'online';
export type PaymentStatus  = 'pending' | 'paid' | 'failed';
