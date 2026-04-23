/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Order {
  review: any;
  [x: string]: any;
  delivery_address_label: any;
 
  id: string;
  order_number?: string | number | null;
  customer_id: string | null;
  merchant_id: string;
  driver_id?: string | null;
  items: any[];
  subtotal: number;
  delivery_fee: number;
  tax: number;
  total_amount: number;
  discount?: number | null;
  status: string;
  payment_method: string;
  payment_status: string;
  created_at: string;
  updated_at?: string | null;
  customer_notes?: string | null;
  customer_phone?: string | null;
  special_instructions?: string | null;
  delivery_address?: string | null;
  order_type?: string | null;           // 'restaurant' | 'custom' | 'grocery'
  custom_order_ref?: string | null;
  custom_order_status?: string | null;
  quoted_amount?: number | null;
  quote_message?: string | null;
  custom_category?: string | null;
  custom_image_url?: string | null;
  preparation_time?: number | null;
  estimated_delivery_time?: string | null;
  cancellation_reason?: string | null;
  profiles?: { full_name: string | null } | null;
  merchants?: { business_name: string | null } | null;
  customerName?: string;
}

export interface CustomOrder {
  id: string;
  order_id?: string | null;
  customer_id: string;
  custom_order_ref?: string | null;
  category?: string | null;
  description?: string | null;
  image_url?: string | null;
  items?: any[];
  status: string;
  quoted_amount?: number | null;
  quote_message?: string | null;
  admin_notes?: string | null;
  delivery_address?: string | null;
  delivery_lat?: number | null;
  delivery_lng?: number | null;
  total_amount?: number | null;
  delivery_fee?: number | null;
  payment_method?: string | null;
  customer_phone?: string | null;
  created_at: string;
  updated_at?: string | null;
  profiles?: { full_name: string | null } | null;
  customerName?: string;
}

export interface DriverRow { id: string; full_name: string | null; phone: string | null; }

export interface OrderStats {
  total: number; active: number; completed: number;
  revenue: number; customPending: number;
}


