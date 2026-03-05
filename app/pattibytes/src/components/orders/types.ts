export type OrderItem = {
  id:                   string
  menu_item_id?:        string | null
  name:                 string
  price:                number
  quantity:             number
  discount_percentage?: number | null
  image_url?:           string | null
  category?:            string | null
  is_veg?:              boolean | null
  is_free?:             boolean
  note?:                string | null
}

export type OrderRow = {
  id:                   string
  order_number:         number
  status:               string
  order_type:           string | null
  total_amount:         number
  subtotal:             number
  discount:             number
  delivery_fee:         number
  items:                OrderItem[]
  created_at:           string
  merchant_id:          string | null
  driver_id:            string | null
  payment_method:       string
  payment_status:       string
  rating:               number | null
  review:               string | null
  promo_code:           string | null
  delivery_distance_km: number | null
  custom_order_ref?:    string | null
  custom_order_status?: string | null
  merchant_name?:       string
}

export type OrderDetail = OrderRow & {
  tax:                       number
  promo_id:                  string | null
  delivery_address:          string
  delivery_address_label:    string | null
  customer_notes:            string | null
  special_instructions:      string | null
  delivery_instructions:     string | null
  updated_at:                string
  estimated_delivery_time:   string | null
  actual_delivery_time:      string | null
  preparation_time:          number | null        // ✅ was missing
  cancellation_reason:       string | null
  cancelled_by:              string | null
  customer_phone:            string | null
  recipient_name:            string | null
  delivery_latitude:         number | null
  delivery_longitude:        number | null
  deliverylatitude?:         number | null
  deliverylongitude?:        number | null
  customer_location:         any
  driver_location:           any
  hub_origin:                { lat: number; lng: number; label: string } | null
  huborigin?:                { lat?: number | null; lng?: number | null; label?: string | null } | null
  quoted_amount?:            number | null
  quote_message?:            string | null
  platform_handled?:         boolean
  custom_category?:          string | null        // ✅ was missing
  custom_image_url?:         string | null        // ✅ was missing (add proactively)
}


export type MerchantInfo = {
  id:            string
  business_name: string
  logo_url:      string | null
  phone:         string | null
  address:       string | null
  latitude:      number | null
  longitude:     number | null
}

export type DriverInfo = {
  id:         string
  full_name:  string | null
  phone:      string | null
  avatar_url?: string | null
}

export type ItemRating = {
  item_id:   string
  item_name: string
  rating:    number
  comment?:  string | null
}

export type ReviewData = {
  id:               string
  order_id:         string
  customer_id:      string
  merchant_id:      string | null
  driver_id:        string | null
  rating:           number | null
  overall_rating:   number | null
  food_rating:      number | null
  merchant_rating:  number | null
  driver_rating:    number | null
  delivery_rating:  number | null
  comment:          string | null
  title:            string | null
  images:           string[] | null
  item_ratings:     ItemRating[] | null
  created_at:       string
  updated_at?:      string | null
}

export type LatLng = { latitude: number; longitude: number }
