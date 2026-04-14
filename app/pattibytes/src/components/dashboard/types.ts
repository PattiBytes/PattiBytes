// ── App Settings ──────────────────────────────────────────────────────────────
export interface AppSettings {
  app_name?: string | null
  app_logo_url?: string | null
  announcement?: any
  show_menu_images?: boolean | null
  delivery_fee?: number | null
  customer_search_radius_km?: number | null
  facebook_url?: string | null
  instagram_url?: string | null
  youtube_url?: string | null
  twitter_url?: string | null
  website_url?: string | null
  custom_links?: any
  support_phone?: string | null
  support_email?: string | null
  business_address?: string | null
}

// ── Merchant ──────────────────────────────────────────────────────────────────
export interface Merchant {
  id: string
  business_name: string
  logo_url: string | null
  banner_url: string | null
  average_rating: number | null
  total_reviews: number | null
  estimated_prep_time: number | null
  min_order_amount: number | null
  latitude: number | null
  longitude: number | null
  opening_time: string | null
  closing_time: string | null
  is_featured: boolean | null
  city: string | null
  cuisine_types: string[]
  distance_km?: number
  offer_label?: string | null
  is_open?: boolean
}

// ── Orders ────────────────────────────────────────────────────────────────────
export interface ActiveOrder {
  id: string
  order_number: number
  status: string
  total_amount: number
  merchant_name?: string
}

// ── Trending ──────────────────────────────────────────────────────────────────
export interface TrendingDish {
  id: string
  name: string
  price: number
  discount_percentage: number | null
  image_url: string | null
  is_veg?: boolean
  merchant_id: string
  merchant_name: string
  count: number
}

// ── Deals ─────────────────────────────────────────────────────────────────────
export interface GlobalDeal {
  id: string
  code: string
  description: string | null
  discount_type: string
  discount_value: number
  min_order_amount: number | null
  valid_until: string | null
  deal_type?: string
  deal_json?: any
}

// ── Menu search ───────────────────────────────────────────────────────────────
export interface MenuResult {
  id:                  string
  merchant_id:         string   
  name:                string
  price:               number
  discount_percentage?: number | null
  image_url?:          string | null
  merchant_name?:      string | null
  is_available?:       boolean
  is_veg?:             boolean | null
  category?:           string | null
  dish_timing?:        any | null
  
}

// ── Shop categories (dynamic from customproducts) ─────────────────────────────
export interface ShopCategory {
  key: string
  label: string
  emoji: string
  bg: string
  text: string
  route: string
  count: number
}