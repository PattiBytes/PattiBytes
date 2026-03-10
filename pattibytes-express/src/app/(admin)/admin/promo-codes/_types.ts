export type DiscountType  = 'percentage' | 'fixed';
export type PromoScope    = 'global' | 'merchant' | 'targets';
export type DealType      = 'cart_discount' | 'bxgy';
export type BxgyDiscType  = 'free' | 'percentage' | 'fixed';
export type BxgySelection = 'auto_cheapest' | 'customer_choice';
export type BxgySide      = 'buy' | 'get';

export interface PromoCodeRow {
  id                   : string;
  code                 : string;
  description          : string | null;
  discount_type        : DiscountType;
  discount_value       : number;
  min_order_amount     : number | null;
  max_discount_amount  : number | null;
  usage_limit          : number | null;
  used_count           : number | null;
  max_uses_per_user    : number | null;
  is_active            : boolean;
  valid_from           : string | null;
  valid_until          : string | null;
  valid_days           : number[] | null;
  start_time           : string | null;
  end_time             : string | null;
  scope                : PromoScope;
  merchant_id          : string | null;
  created_by           : string | null;
  created_at          ?: string | null;
  updated_at          ?: string | null;
  deal_type           ?: DealType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deal_json           ?: any;
  auto_apply          ?: boolean;
  priority            ?: number;
  // Secret-promo fields
  is_secret           ?: boolean;
  secret_allowed_users?: string[] | null;
  secret_note         ?: string | null;
}

export interface BxgyTargetRow {
  id             : string;
  promo_code_id  : string;
  side           : BxgySide;
  menu_item_id   : string | null;
  category_id    : string | null;
  created_at     : string;
}

export interface PromoTargetRow {
  id             : string;
  promo_code_id  : string;
  merchant_id    : string | null;
  menu_item_id   : string | null;
  category_id    : string | null;
  created_at     : string;
}

export interface MenuItemLite {
  id                  : string;
  merchant_id         : string;
  name                : string;
  description        ?: string | null;
  price               : number;
  category           ?: string | null;
  discount_percentage?: number | null;
  category_id        ?: string | null;
  is_available       ?: boolean | null;
  is_veg             ?: boolean | null;
  image_url          ?: string | null;
}

export interface MerchantLite { id: string; user_id: string; business_name: string; }
export interface CustomerLite { id: string; full_name: string | null; phone: string | null; email: string | null; expo_push_token: string | null; fcm_token: string | null; }

export type MenuPickSide = 'targets' | 'bxgy_buy' | 'bxgy_get';
export type MenuSortKey  = 'recommended' | 'price_low' | 'price_high';

export interface PromoFormState {
  code                   : string;
  description            : string;
  scope                  : PromoScope;
  merchant_id            : string;
  deal_type              : DealType;
  auto_apply             : boolean;
  priority               : number;
  discount_type          : DiscountType;
  discount_value         : string | number;
  min_order_amount       : string | number;
  max_discount_amount    : string | number;
  usage_limit            : string | number;
  max_uses_per_user      : string | number;
  valid_from             : string;
  valid_until            : string;
  valid_days             : number[];
  start_time             : string;
  end_time               : string;
  bxgy_buy_qty           : number;
  bxgy_get_qty           : number;
  bxgy_get_discount_type : BxgyDiscType;
  bxgy_get_discount_value: string | number;
  bxgy_max_sets_per_order: number;
  bxgy_selection         : BxgySelection;
  is_secret              : boolean;
  secret_allowed_users   : string[];
  secret_note            : string;
}
