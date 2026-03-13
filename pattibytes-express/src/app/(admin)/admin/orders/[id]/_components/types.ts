/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── constants ───────────────────────────────────────────────────────────────
export const ADMIN_STATUSES = [
  'pending', 'confirmed', 'preparing', 'ready',
  'assigned', 'picked_up', 'delivered', 'cancelled',
] as const;

export type OrderStatus = typeof ADMIN_STATUSES[number];

// ─── raw DB shapes ───────────────────────────────────────────────────────────
export type LiveLocation = {
  lat?: number; lng?: number; accuracy?: number;
  updated_at?: string; updatedAt?: string; updatedat?: string;
};

export type DriverRow = {
  id: string;
  full_name?: string | null; fullname?: string | null;
  phone?: string | null; email?: string | null;
  is_active?: boolean | null; isactive?: boolean | null;
};

export type MerchantInfo = {
  id: string;
  business_name?: string | null; businessname?: string | null;
  phone?: string | null; email?: string | null; address?: any;
  logo_url?: string | null; logourl?: string | null;
};

export type ProfileMini = {
  id: string;
  full_name?: string | null; fullname?: string | null;
  phone?: string | null; email?: string | null;
  trust_score?: number | null; trustscore?: number | null;
  account_status?: string | null; accountstatus?: string | null;
  avatar_url?: string | null; avatarurl?: string | null;
};

export type OrderItem = {
  id?: string;
  name?: string;
  price?: number;
  quantity?: number;
  category?: string;
  is_veg?: boolean; isveg?: boolean;
  image_url?: string; imageurl?: string;
   category_id: string | null;
  merchant_id?: string; merchantid?: string;
  discount_percentage?: number; discountpercentage?: number;
  is_free?: boolean;
  is_custom_product?: boolean;
  note?: string | null;
  menu_item_id?: string;
};

export type PromoCodeRow = {
  id: string;
  code: string;
  description?: string | null;
  discount_type?: string | null;
  discount_value?: number | null;
  min_order_amount?: number | null;
  max_discount_amount?: number | null;
  deal_type?: string | null;       // 'bxgy' | 'percentage' | 'flat' | null
  deal_json?: any;                 // bxgy payload
  auto_apply?: boolean | null;
  priority?: number | null;
  scope?: string | null;
  merchant_id?: string | null;
  valid_from?: string | null;
  valid_until?: string | null;
  is_active?: boolean | null;
};

export type BxgyTarget = {
  id: string;
  promo_code_id: string;
  side: 'buy' | 'get';
  menu_item_id: string;
  menu_item_name?: string;   // joined in UI
};

export type ReviewRow = {
  id: string;
  order_id: string;
  customer_id?: string | null;
  merchant_id?: string | null;
  driver_id?: string | null;
  rating?: number | null;
  overall_rating?: number | null;
  merchant_rating?: number | null;
  driver_rating?: number | null;
  food_rating?: number | null;
  delivery_rating?: number | null;
  comment?: string | null;
  title?: string | null;
  item_ratings?: any;
  images?: any;
  created_at?: string | null;
  updated_at?: string | null;
};

// ─── normalized order ─────────────────────────────────────────────────────────
export type OrderNormalized = {
  id: string;
  customerId: string;
  merchantId: string;
  driverId: string | null;
  orderNumber: number;
  status: string;

  subtotal: number;
  discount: number;
  deliveryFee: number;
  tax: number;
  totalAmount: number;

  paymentMethod: string | null;
  paymentStatus: string | null;

  deliveryAddress: string | null;
  deliveryDistanceKm: number | null;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
  deliveryAddressLabel: string | null;
  deliveryAddressId: string | null;
  recipientName: string | null;
  deliveryInstructions: string | null;

  customerPhone: string | null;
  customerNotes: string | null;
  specialInstructions: string | null;

  promoCode: string | null;
  promoId: string | null;

  orderType: string | null;         // 'restaurant' | 'custom' | null
  orderTypeLabel: string | null;    // delivery_address_label

  customOrderRef: string | null;    // custom_order_ref
  customOrderStatus: string | null; // custom_order_status
  quotedAmount: number | null;
  quoteMessage: string | null;
  platformHandled: boolean | null;
  customCategory: string | null;
  customImageUrl: string | null;

  hubOrigin: string | null;

  createdAt: string | null;
  updatedAt: string | null;
  estimatedDeliveryTime: string | null;
  actualDeliveryTime: string | null;
  preparationTime: number | null;

  cancellationReason: string | null;
  cancelledBy: string | null;

  rating: number | null;
  review: string | null;

  customerLocation: any | null;
  driverLocation: any | null;

  items: OrderItem[];
};

// ─── custom_order_requests row ────────────────────────────────────────────────
export type CustomOrderRequest = {
  id: string;
  order_id?: string | null;
  customer_id?: string | null;
  custom_order_ref?: string | null;
  category?: string | null;
  description?: string | null;
  image_url?: string | null;           // ← THE real image field
  items?: any;
  status?: string | null;
  quoted_amount?: number | null;
  quote_message?: string | null;
  admin_notes?: string | null;
  delivery_address?: string | null;
  delivery_lat?: number | null;
  delivery_lng?: number | null;
  total_amount?: number | null;        // ← customer's stated BUDGET
  delivery_fee?: number | null;
  payment_method?: string | null;
  customer_phone?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};


// ─── edit form state ──────────────────────────────────────────────────────────
export type EditFields = {
  paymentStatus: string;
  deliveryFee: string;
  discount: string;
  estimatedDeliveryTime: string;
  actualDeliveryTime: string;
  preparationTime: string;
  customerNotes: string;
  specialInstructions: string;
  deliveryInstructions: string;
  cancellationReason: string;
  recipientName: string;
  customOrderStatus: string;
  quotedAmount: string;
  quoteMessage: string;
  platformHandled: boolean;
  
};

// ─── helpers ─────────────────────────────────────────────────────────────────
export function cx(...classes: Array<string | false | undefined | null>): string {
  return classes.filter(Boolean).join(' ');
}

export function safeJsonParse<T>(v: any, fallback: T): T {
  try {
    if (v == null) return fallback;
    if (typeof v === 'object') return v as T;
    if (typeof v === 'string' && v.trim().length) return JSON.parse(v) as T;
    return fallback;
  } catch { return fallback; }
}

export function normalizeLocation(v: any): LiveLocation | null {
  const obj = safeJsonParse<any>(v, null);
  if (!obj || typeof obj !== 'object') return null;
  const lat = typeof obj.lat === 'number' ? obj.lat : undefined;
  const lng = typeof obj.lng === 'number' ? obj.lng : undefined;
  if (!lat || !lng) return null;
  return { lat, lng, accuracy: obj.accuracy, updated_at: obj.updated_at, updatedAt: obj.updatedAt };
}

export function toINR(v: any): string {
  const n = Number(v ?? 0);
  try { return n.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }); }
  catch { return `₹${n.toFixed(2)}`; }
}

export function fmtTime(iso?: string | null): string {
  if (!iso) return 'N/A';
  try { return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }); }
  catch { return String(iso); }
}

export function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDatetimeLocal(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function nStr(v: any): string { return v == null ? '' : String(v); }
export function nNum(v: any): number { const x = Number(v ?? 0); return Number.isFinite(x) ? x : 0; }
export function nNumNull(v: any): number | null {
  if (v == null || v === '') return null;
  const x = Number(v); return Number.isFinite(x) ? x : null;
}

// ─── column name detection (snake vs camel Supabase) ─────────────────────────
export type ColStyle = 'snake' | 'camel';

export type ColMap = {
  customerId: string; merchantId: string; driverId: string; orderNumber: string;
  deliveryFee: string; totalAmount: string; paymentMethod: string; paymentStatus: string;
  deliveryAddress: string; deliveryDistanceKm: string; customerPhone: string;
  customerNotes: string; specialInstructions: string; deliveryLatitude: string;
  deliveryLongitude: string; promoCode: string; promoId: string;
  createdAt: string; updatedAt: string; estimatedDeliveryTime: string;
  actualDeliveryTime: string; preparationTime: string; cancellationReason: string;
  cancelledBy: string; customerLocation: string; driverLocation: string;
  items: string; orderType: string; deliveryAddressLabel: string;
  deliveryAddressId: string; recipientName: string; deliveryInstructions: string;
  hubOrigin: string; customOrderRef: string; customOrderStatus: string;
  quotedAmount: string; quoteMessage: string; platformHandled: string;
  customCategory: string; customImageUrl: string;
};

export function detectStyle(row: any): ColStyle {
  if (!row || typeof row !== 'object') return 'snake';
  if ('customer_id' in row || 'created_at' in row) return 'snake';
  if ('customerid' in row || 'createdat' in row) return 'camel';
  return 'snake';
}

export function makeCols(style: ColStyle): ColMap {
  const s = style === 'snake';
  return {
    customerId:            s ? 'customer_id'             : 'customerid',
    merchantId:            s ? 'merchant_id'             : 'merchantid',
    driverId:              s ? 'driver_id'               : 'driverid',
    orderNumber:           s ? 'order_number'            : 'ordernumber',
    deliveryFee:           s ? 'delivery_fee'            : 'deliveryfee',
    totalAmount:           s ? 'total_amount'            : 'totalamount',
    paymentMethod:         s ? 'payment_method'          : 'paymentmethod',
    paymentStatus:         s ? 'payment_status'          : 'paymentstatus',
    deliveryAddress:       s ? 'delivery_address'        : 'deliveryaddress',
    deliveryDistanceKm:    s ? 'delivery_distance_km'    : 'deliverydistancekm',
    customerPhone:         s ? 'customer_phone'          : 'customerphone',
    customerNotes:         s ? 'customer_notes'          : 'customernotes',
    specialInstructions:   s ? 'special_instructions'    : 'specialinstructions',
    deliveryLatitude:      s ? 'delivery_latitude'       : 'deliverylatitude',
    deliveryLongitude:     s ? 'delivery_longitude'      : 'deliverylongitude',
    promoCode:             s ? 'promo_code'              : 'promocode',
    promoId:               s ? 'promo_id'                : 'promoid',
    createdAt:             s ? 'created_at'              : 'createdat',
    updatedAt:             s ? 'updated_at'              : 'updatedat',
    estimatedDeliveryTime: s ? 'estimated_delivery_time' : 'estimateddeliverytime',
    actualDeliveryTime:    s ? 'actual_delivery_time'    : 'actualdeliverytime',
    preparationTime:       s ? 'preparation_time'        : 'preparationtime',
    cancellationReason:    s ? 'cancellation_reason'     : 'cancellationreason',
    cancelledBy:           s ? 'cancelled_by'            : 'cancelledby',
    customerLocation:      s ? 'customer_location'       : 'customerlocation',
    driverLocation:        s ? 'driver_location'         : 'driverlocation',
    items:                 'items',
    orderType:             s ? 'order_type'              : 'ordertype',
    deliveryAddressLabel:  s ? 'delivery_address_label'  : 'deliveryaddresslabel',
    deliveryAddressId:     s ? 'delivery_address_id'     : 'deliveryaddressid',
    recipientName:         s ? 'recipient_name'          : 'recipientname',
    deliveryInstructions:  s ? 'delivery_instructions'   : 'deliveryinstructions',
    hubOrigin:             s ? 'hub_origin'              : 'huborigin',
    customOrderRef:        s ? 'custom_order_ref'        : 'customorderref',
    customOrderStatus:     s ? 'custom_order_status'     : 'customorderstatus',
    quotedAmount:          s ? 'quoted_amount'           : 'quotedamount',
    quoteMessage:          s ? 'quote_message'           : 'quotemessage',
    platformHandled:       s ? 'platform_handled'        : 'platformhandled',
    customCategory:        s ? 'custom_category'         : 'customcategory',
    customImageUrl:        s ? 'custom_image_url'        : 'customimageurl',
  };
}

export function normalizeOrder(row: any, cols: ColMap): OrderNormalized {
  const items = safeJsonParse<OrderItem[]>(row?.[cols.items], []);
  return {
    id:                   nStr(row?.id),
    customerId:           nStr(row?.[cols.customerId]),
    merchantId:           nStr(row?.[cols.merchantId]),
    driverId:             row?.[cols.driverId] ? nStr(row?.[cols.driverId]) : null,
    orderNumber:          nNum(row?.[cols.orderNumber]),
    status:               nStr(row?.status || 'pending'),
    subtotal:             nNum(row?.subtotal),
    discount:             nNum(row?.discount),
    deliveryFee:          nNum(row?.[cols.deliveryFee]),
    tax:                  nNum(row?.tax),
    totalAmount:          nNum(row?.[cols.totalAmount]),
    paymentMethod:        row?.[cols.paymentMethod] ? nStr(row[cols.paymentMethod]) : null,
    paymentStatus:        row?.[cols.paymentStatus] ? nStr(row[cols.paymentStatus]) : null,
    deliveryAddress:      row?.[cols.deliveryAddress] ? nStr(row[cols.deliveryAddress]) : null,
    deliveryDistanceKm:   nNumNull(row?.[cols.deliveryDistanceKm]),
    deliveryLatitude:     nNumNull(row?.[cols.deliveryLatitude]),
    deliveryLongitude:    nNumNull(row?.[cols.deliveryLongitude]),
    deliveryAddressLabel: row?.[cols.deliveryAddressLabel] ? nStr(row[cols.deliveryAddressLabel]) : null,
    deliveryAddressId:    row?.[cols.deliveryAddressId] ? nStr(row[cols.deliveryAddressId]) : null,
    recipientName:        row?.[cols.recipientName] ? nStr(row[cols.recipientName]) : null,
    deliveryInstructions: row?.[cols.deliveryInstructions] ? nStr(row[cols.deliveryInstructions]) : null,
    customerPhone:        row?.[cols.customerPhone] ? nStr(row[cols.customerPhone]) : null,
    customerNotes:        row?.[cols.customerNotes] ? nStr(row[cols.customerNotes]) : null,
    specialInstructions:  row?.[cols.specialInstructions] ? nStr(row[cols.specialInstructions]) : null,
    promoCode:            row?.[cols.promoCode] ? nStr(row[cols.promoCode]) : null,
    promoId:              row?.[cols.promoId] ? nStr(row[cols.promoId]) : null,
    orderType:            row?.[cols.orderType] ? nStr(row[cols.orderType]) : null,
    orderTypeLabel:       row?.[cols.deliveryAddressLabel] ? nStr(row[cols.deliveryAddressLabel]) : null,
    customOrderRef:       row?.[cols.customOrderRef] ? nStr(row[cols.customOrderRef]) : null,
    customOrderStatus:    row?.[cols.customOrderStatus] ? nStr(row[cols.customOrderStatus]) : null,
    quotedAmount:         nNumNull(row?.[cols.quotedAmount]),
    quoteMessage:         row?.[cols.quoteMessage] ? nStr(row[cols.quoteMessage]) : null,
    platformHandled:      row?.[cols.platformHandled] == null ? null : !!row[cols.platformHandled],
    customCategory:       row?.[cols.customCategory] ? nStr(row[cols.customCategory]) : null,
    customImageUrl:       row?.[cols.customImageUrl] ? nStr(row[cols.customImageUrl]) : null,
    hubOrigin:            row?.[cols.hubOrigin] ? nStr(row[cols.hubOrigin]) : null,
    createdAt:            row?.[cols.createdAt] ? nStr(row[cols.createdAt]) : null,
    updatedAt:            row?.[cols.updatedAt] ? nStr(row[cols.updatedAt]) : null,
    estimatedDeliveryTime: row?.[cols.estimatedDeliveryTime] ? nStr(row[cols.estimatedDeliveryTime]) : null,
    actualDeliveryTime:   row?.[cols.actualDeliveryTime] ? nStr(row[cols.actualDeliveryTime]) : null,
    preparationTime:      nNumNull(row?.[cols.preparationTime]),
    cancellationReason:   row?.[cols.cancellationReason] ? nStr(row[cols.cancellationReason]) : null,
    cancelledBy:          row?.[cols.cancelledBy] ? nStr(row[cols.cancelledBy]) : null,
    rating:               row?.rating == null ? null : Number(row.rating),
    review:               row?.review ? nStr(row.review) : null,
    customerLocation:     row?.[cols.customerLocation] ?? null,
    driverLocation:       row?.[cols.driverLocation] ?? null,
    items:                Array.isArray(items) ? items : [],
  };
}

// ─── status visual ────────────────────────────────────────────────────────────
import {
  Clock, ChefHat, Package, Truck, CheckCircle, XCircle,
} from 'lucide-react';

export function statusMeta(status: string) {
  const key = String(status || '').toLowerCase().replace(/\s+/g, '_');
  const map: Record<string, { color: string; dot: string; icon: any }> = {
    pending:    { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', dot: 'bg-yellow-500',  icon: Clock       },
    confirmed:  { color: 'bg-blue-100 text-blue-800 border-blue-200',       dot: 'bg-blue-500',    icon: ChefHat     },
    preparing:  { color: 'bg-purple-100 text-purple-800 border-purple-200', dot: 'bg-purple-500',  icon: ChefHat     },
    ready:      { color: 'bg-orange-100 text-orange-800 border-orange-200', dot: 'bg-orange-500',  icon: Package     },
    assigned:   { color: 'bg-indigo-100 text-indigo-800 border-indigo-200', dot: 'bg-indigo-500',  icon: Truck       },
    picked_up:  { color: 'bg-indigo-100 text-indigo-800 border-indigo-200', dot: 'bg-indigo-500',  icon: Truck       },
    delivered:  { color: 'bg-green-100 text-green-800 border-green-200',    dot: 'bg-green-500',   icon: CheckCircle },
    cancelled:  { color: 'bg-red-100 text-red-800 border-red-200',          dot: 'bg-red-400',     icon: XCircle     },
  };
  return map[key] ?? map.pending;
}


// ─── trust badge ──────────────────────────────────────────────────────────────
import { AlertTriangle, TrendingDown, Award, Shield } from 'lucide-react';

export function trustMeta(trustScore: number, accountStatus: string) {
  if (accountStatus === 'flagged' || trustScore <= 2.0)
    return { icon: AlertTriangle, color: 'bg-red-100 text-red-800 border-red-200',       text: 'High Risk' };
  if (accountStatus === 'warning' || trustScore <= 3.5)
    return { icon: TrendingDown,  color: 'bg-yellow-100 text-yellow-800 border-yellow-200', text: 'Caution' };
  if (trustScore >= 4.5)
    return { icon: Award,         color: 'bg-green-100 text-green-800 border-green-200',  text: 'Trusted'  };
  return   { icon: Shield,        color: 'bg-blue-100 text-blue-800 border-blue-200',     text: 'Verified' };
}

