export type OrderType = 'restaurant' | 'store' | 'custom'

export interface BxGyGift {
  menuItemId: string
  name:       string
  qty:        number
  price:      number
  promoCode?: string
}

export interface CheckoutCartItem {
  id:                  string
  menu_item_id?:       string
  name:                string
  price:               number
  quantity:            number
  discount_percentage?: number | null
  image_url?:          string | null
  category?:           string | null
  is_veg?:             boolean | null
  merchant_id?:        string
}
