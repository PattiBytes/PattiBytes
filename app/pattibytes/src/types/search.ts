// ── Dish-timing slot from menu_items ──────────────────────────────────────────
export interface DishTimingSlot {
  from:  string    // "09:00"
  to:    string    // "16:00"
  days:  number[]  // 0=Sun … 6=Sat
}
export interface DishTiming {
  type:    string
  enabled: boolean
  slots:   DishTimingSlot[]
}


// ── Menu item ─────────────────────────────────────────────────────────────────
export interface MenuResult {
  id:                  string
  merchant_id:         string
  name:                string
  price:               number
  category?:           string | null
  image_url?:          string | null
  is_available?: boolean
  is_veg?:             boolean | null
  discount_percentage?: number | null
  dish_timing?:        DishTiming | string | null
  // joined
  merchant_name?:      string | null
}

// ── Restaurant / merchant ─────────────────────────────────────────────────────
export interface RestaurantResult {
  id:               string
  business_name:    string
  business_type?:   string | null
  cuisine_types?:   string[] | null
  logo_url?:        string | null
  banner_url?:      string | null
  average_rating?:  number | null
  total_reviews?:   number | null
  is_active:        boolean
  is_verified?:     boolean | null
  opening_time?:    string | null   // "09:30:00"
  closing_time?:    string | null   // "22:00:00"
  avg_delivery_time?: number | null
  min_order_amount?:  number | null
  city?:            string | null
  address?:         string | null
}

// ── Custom product (customproducts table, camelCase columns) ──────────────────
export interface CustomProductResult {
  id:              string
  name:            string
  category?:       string | null
  price:           number
  unit?:           string | null
  imageurl?:       string | null
  description?:    string | null
  isactive:        boolean
  stock_qty?:      number | null
  available_from?: string | null   // "HH:MM"
  available_to?:   string | null
  available_days?: number[] | null // 0=Sun … 6=Sat
}