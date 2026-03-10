export interface Review {
  id              : string;
  order_id        : string | null;
  customer_id     : string;
  merchant_id     : string;
  driver_id       : string | null;
  merchant_rating : number | null;
  driver_rating   : number | null;
  food_rating     : number | null;
  comment         : string | null;
  images          : string[] | null;
  created_at      : string;
  rating          : number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  item_ratings    : any[];
  title           : string | null;
  overall_rating  : number | null;
  delivery_rating : number | null;
  updated_at      : string | null;
  // Enriched client-side
  customerName  ?: string;
  customerPhone ?: string;
  merchantName  ?: string;
  orderNumber   ?: string | number | null;
}

export interface ReviewFormData {
  customer_id     : string;
  merchant_id     : string;
  order_id        ?: string | null;
  rating          : number;
  overall_rating  ?: number;
  food_rating     ?: number;
  merchant_rating ?: number;
  driver_rating   ?: number;
  delivery_rating ?: number;
  comment         ?: string;
  title           ?: string;
}

export interface MerchantOption { id: string; business_name: string; }
export interface CustomerOption { id: string; full_name: string | null; phone: string | null; email: string | null; }
