// ─── Re-export from services so cart components have a single import source ──
import type { SavedAddress }  from '../../services/location'
import type { PromoCode }     from '../../services/promoCodes'
export type { SavedAddress, PromoCode }

// ─── Re-export PATTI_HUB from its canonical home ─────────────────────────────
export { PATTI_HUB } from '../../services/location'

// ─── CartItem — MUST match CartContext.CartItem exactly ───────────────────────
export interface CartItem {
  id:                   string
  name:                 string
  price:                number
  quantity:             number
  image_url?:           string | null
  is_veg?:              boolean | null
  category?:            string | null
  discount_percentage?: number | null
  merchant_id?:         string
}

// ─── Cart object from CartContext ─────────────────────────────────────────────
export interface Cart {
  merchant_id:   string
  merchant_name: string
  items:         CartItem[]
  subtotal:      number
}

// ─── Order type (maps to orders.order_type column) ───────────────────────────
export type OrderType = 'restaurant' | 'store' | 'custom'

// ─── Delivery fee schedule shape ─────────────────────────────────────────────
export interface DayFee { fee: number; enabled: boolean }
export interface DeliveryFeeSchedule {
  ui?:        { show_to_customer?: boolean }
  weekly?:    Record<string, DayFee>
  overrides?: any[]
  timezone?:  string
}

// ─── app_settings row ────────────────────────────────────────────────────────
export interface AppSettings {
  // ── Delivery fee ────────────────────────────────────────────────────────
  delivery_fee_enabled:           boolean
  delivery_fee_show_to_customer:  boolean
  base_delivery_radius_km:        number
  per_km_fee_beyond_base:         number
  base_delivery_fee:              number
  per_km_rate:                    number
  free_delivery_above:            number | null
  min_order_amount:               number | null
  tax_percentage:                 number
  hub_latitude:                   number
  hub_longitude:                  number
  delivery_fee_schedule:          DeliveryFeeSchedule | null

  // ── App identity ─────────────────────────────────────────────────────────
  app_name:                       string
  support_phone:                  string | null   // ✅ was `any`
  support_email:                  string | null   // ✅ added
  business_address:               string | null   // ✅ was `string`, now nullable
  app_logo_url:                   string | null   // ✅ added

  // ── Social ───────────────────────────────────────────────────────────────
  facebook_url:                   string | null
  instagram_url:                  string | null
  twitter_url:                    string | null
  youtube_url:                    string | null
  website_url:                    string | null
  custom_links:                   any[] | null

  // ── Discovery ────────────────────────────────────────────────────────────
  customer_search_radius_km:      number | null

  // ── Announcement ─────────────────────────────────────────────────────────
  announcement: {                                 // ✅ added
    type:         string
    title:        string
    message:      string
    enabled:      boolean
    start_at:     string | null
    end_at:       string | null
    link_url:     string | null
    image_url:    string | null
    dismiss_key:  string | null
    dismissible:  boolean
  } | null

  // ── Display ───────────────────────────────────────────────────────────────
  show_menu_images:               boolean
}

// ─── Merchant row (fields used in cart) ──────────────────────────────────────
export interface MerchantGeo {
  latitude:              number | null
  longitude:             number | null
  gst_enabled:           boolean
  gst_percentage:        number | null
  min_order_amount?:     number | null
  estimated_prep_time?:  number | null
  phone?:                string | null
}

// ─── Buy-X-Get-Y free gift line ───────────────────────────────────────────────
export interface BxGyGift {
  menuItemId: string
  name:       string
  qty:        number
  price:      number
  promoCode:  string
}
