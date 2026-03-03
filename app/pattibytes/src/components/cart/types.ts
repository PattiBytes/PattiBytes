// ─── Re-export from services so cart components have a single import source ──
import type { SavedAddress }  from '../../services/location'
import type { PromoCode }     from '../../services/promoCodes'
export type { SavedAddress, PromoCode }

// ─── Re-export PATTI_HUB from its canonical home ─────────────────────────────
export { PATTI_HUB } from '../../services/location'

// ─── CartItem — MUST match CartContext.CartItem exactly ───────────────────────
// Note: is_veg is boolean | null | undefined (nullable in DB + CartContext)
export interface CartItem {
  id:                   string
  name:                 string
  price:                number
  quantity:             number
  image_url?:           string | null
  is_veg?:              boolean | null    // ← null allowed (matches CartContext)
  category?:            string | null
  discount_percentage?: number | null
  merchant_id?:         string
}

// ─── Cart object from CartContext ──────────────────────────────────────────────
export interface Cart {
  merchant_id:   string
  merchant_name: string
  items:         CartItem[]
  subtotal:      number
}

// ─── Order type (maps to orders.order_type column) ────────────────────────────
export type OrderType = 'restaurant' | 'store' | 'custom'

// ─── app_settings row — all columns used across cart + checkout ───────────────
export interface AppSettings {
  // Core flags
  delivery_fee_enabled:         boolean
  delivery_fee_show_to_customer:boolean

  // Distance tiers
  base_delivery_radius_km:      number    // base_delivery_radius_km column
  per_km_fee_beyond_base:       number    // per_km_fee_beyond_base column
  base_delivery_fee:            number    // base_delivery_fee column
  per_km_rate:                  number    // per_km_rate column

  // Thresholds
  free_delivery_above:          number | null   // free_delivery_above column
  min_order_amount:             number | null

  // Tax
  tax_percentage:               number

  // Hub origin (NEW columns added via SQL above)
  hub_latitude:                 number | null   // hub_latitude column
  hub_longitude:                number | null   // hub_longitude column

  // Schedule
  delivery_fee_schedule?:       DeliveryFeeSchedule | null
}

// ─── Delivery fee schedule shape ──────────────────────────────────────────────
export interface DayFee { fee: number; enabled: boolean }
export interface DeliveryFeeSchedule {
  ui?:       { show_to_customer?: boolean }
  weekly?:   Record<string, DayFee>
  overrides?:any[]
  timezone?: string
}

// ─── Merchant row (fields used in cart) ───────────────────────────────────────
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
