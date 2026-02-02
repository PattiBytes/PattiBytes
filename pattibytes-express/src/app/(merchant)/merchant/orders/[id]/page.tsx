 
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'react-toastify';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

import DashboardLayout from '@/components/layouts/DashboardLayout';
import { PageLoadingSpinner } from '@/components/common/LoadingSpinner';

import {
  ArrowLeft,
  MapPin,
  Clock,
  Package,
  Phone,
  CheckCircle,
  XCircle,
  Truck,
  ChefHat,
  User,
  DollarSign,
  Calendar,
  Printer,
  Download,
  Timer,
  TrendingUp,
  Bell,
  Shield,
  AlertTriangle,
  TrendingDown,
  Award,
  RefreshCw,
  Navigation,
  Save,
} from 'lucide-react';

type LiveLocation = {
  lat?: number;
  lng?: number;
  accuracy?: number;
  updated_at?: string;
  updatedAt?: string;
  updatedat?: string;
};

type DriverRow = {
  id: string;
  full_name?: string | null;
  fullname?: string | null;
  phone?: string | null;
  email?: string | null;
  is_active?: boolean | null;
  isactive?: boolean | null;
};

type ProfileMini = {
  id: string;
  full_name?: string | null;
  fullname?: string | null;
  phone?: string | null;
  email?: string | null;

  trust_score?: number | null;
  trustscore?: number | null;
  account_status?: string | null;
  accountstatus?: string | null;
};

type OrderItem = {
  id?: string;
  name?: string;
  price?: number;
  quantity?: number;
  category?: string;
  is_veg?: boolean;
  isveg?: boolean;
  image_url?: string;
  imageurl?: string;
};

type OrderNormalized = {
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

  customerPhone: string | null;
  customerNotes: string | null;
  specialInstructions: string | null;

  deliveryLatitude: number | null;
  deliveryLongitude: number | null;

  promoCode: string | null;

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

type OrdersStyle = 'snake' | 'camel';
type OrdersCols = {
  customerId: string;
  merchantId: string;
  driverId: string;
  orderNumber: string;

  deliveryFee: string;
  totalAmount: string;

  paymentMethod: string;
  paymentStatus: string;

  deliveryAddress: string;
  deliveryDistanceKm: string;

  customerPhone: string;
  customerNotes: string;
  specialInstructions: string;

  deliveryLatitude: string;
  deliveryLongitude: string;

  promoCode: string;

  createdAt: string;
  updatedAt: string;

  estimatedDeliveryTime: string;
  actualDeliveryTime: string;
  preparationTime: string;

  cancellationReason: string;
  cancelledBy: string;

  customerLocation: string;
  driverLocation: string;

  items: string;
};

const MERCHANT_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'assigned',
  'pickedup', 'delivered','cancelled'];

function safeJsonParse<T>(v: any, fallback: T): T {
  try {
    if (v == null) return fallback;
    if (typeof v === 'object') return v as T;
    if (typeof v === 'string' && v.trim().length) return JSON.parse(v) as T;
    return fallback;
  } catch {
    return fallback;
  }
}

function normalizeLocation(v: any): LiveLocation | null {
  const obj = safeJsonParse<any>(v, null);
  if (!obj || typeof obj !== 'object') return null;

  const lat = typeof obj.lat === 'number' ? obj.lat : undefined;
  const lng = typeof obj.lng === 'number' ? obj.lng : undefined;
  if (!lat || !lng) return null;

  return {
    lat,
    lng,
    accuracy: typeof obj.accuracy === 'number' ? obj.accuracy : undefined,
    updated_at: typeof obj.updated_at === 'string' ? obj.updated_at : undefined,
    updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : undefined,
    updatedat: typeof obj.updatedat === 'string' ? obj.updatedat : undefined,
  };
}

function toINR(v: any) {
  const n = Number(v ?? 0);
  try {
    return n.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  } catch {
    return `₹${n.toFixed(2)}`;
  }
}

function fmtTime(iso?: string | null) {
  if (!iso) return 'NA';
  try {
    return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return String(iso);
  }
}

function openMaps(lat?: number | null, lng?: number | null) {
  if (!lat || !lng) return;
  window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
}

function statusConfig(status: string) {
  const key = String(status || '').toLowerCase();
  const map: Record<string, { color: string; icon: any }> = {
    pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    confirmed: { color: 'bg-blue-100 text-blue-800', icon: ChefHat },
    preparing: { color: 'bg-purple-100 text-purple-800', icon: ChefHat },
    ready: { color: 'bg-orange-100 text-orange-800', icon: Package },
    assigned: { color: 'bg-indigo-100 text-indigo-800', icon: Truck },
    picked_up: { color: 'bg-indigo-100 text-indigo-800', icon: Truck },
    pickedup: { color: 'bg-indigo-100 text-indigo-800', icon: Truck },
    delivered: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
    cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle },
  };
  return map[key] ?? map.pending;
}

function trustBadge(trustScore: number, accountStatus: string) {
  if (accountStatus === 'flagged' || trustScore <= 2.0) {
    return { icon: AlertTriangle, color: 'bg-red-100 text-red-800 border-red-200', text: 'High Risk' };
  }
  if (accountStatus === 'warning' || trustScore <= 3.5) {
    return { icon: TrendingDown, color: 'bg-yellow-100 text-yellow-800 border-yellow-200', text: 'Caution' };
  }
  if (trustScore >= 4.5) {
    return { icon: Award, color: 'bg-green-100 text-green-800 border-green-200', text: 'Trusted' };
  }
  return { icon: Shield, color: 'bg-blue-100 text-blue-800 border-blue-200', text: 'Verified' };
}

function toDatetimeLocalValue(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(v: string) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function detectOrdersStyle(orderRow: any): OrdersStyle {
  if (orderRow && typeof orderRow === 'object') {
    if ('updated_at' in orderRow || 'created_at' in orderRow || 'customer_id' in orderRow) return 'snake';
    if ('updatedat' in orderRow || 'createdat' in orderRow || 'customerid' in orderRow) return 'camel';
  }
  return 'snake';
}

function colsFor(style: OrdersStyle): OrdersCols {
  if (style === 'camel') {
    return {
      customerId: 'customerid',
      merchantId: 'merchantid',
      driverId: 'driverid',
      orderNumber: 'ordernumber',

      deliveryFee: 'deliveryfee',
      totalAmount: 'totalamount',

      paymentMethod: 'paymentmethod',
      paymentStatus: 'paymentstatus',

      deliveryAddress: 'deliveryaddress',
      deliveryDistanceKm: 'deliverydistancekm',

      customerPhone: 'customerphone',
      customerNotes: 'customernotes',
      specialInstructions: 'specialinstructions',

      deliveryLatitude: 'deliverylatitude',
      deliveryLongitude: 'deliverylongitude',

      promoCode: 'promocode',

      createdAt: 'createdat',
      updatedAt: 'updatedat',

      estimatedDeliveryTime: 'estimateddeliverytime',
      actualDeliveryTime: 'actualdeliverytime',
      preparationTime: 'preparationtime',

      cancellationReason: 'cancellationreason',
      cancelledBy: 'cancelledby',

      customerLocation: 'customerlocation',
      driverLocation: 'driverlocation',

      items: 'items',
    };
  }

  return {
    customerId: 'customer_id',
    merchantId: 'merchant_id',
    driverId: 'driver_id',
    orderNumber: 'order_number',

    deliveryFee: 'delivery_fee',
    totalAmount: 'total_amount',

    paymentMethod: 'payment_method',
    paymentStatus: 'payment_status',

    deliveryAddress: 'delivery_address',
    deliveryDistanceKm: 'delivery_distance_km',

    customerPhone: 'customer_phone',
    customerNotes: 'customer_notes',
    specialInstructions: 'special_instructions',

    deliveryLatitude: 'delivery_latitude',
    deliveryLongitude: 'delivery_longitude',

    promoCode: 'promo_code',

    createdAt: 'created_at',
    updatedAt: 'updated_at',

    estimatedDeliveryTime: 'estimated_delivery_time',
    actualDeliveryTime: 'actual_delivery_time',
    preparationTime: 'preparation_time',

    cancellationReason: 'cancellation_reason',
    cancelledBy: 'cancelled_by',

    customerLocation: 'customer_location',
    driverLocation: 'driver_location',

    items: 'items',
  };
}

function nStr(v: any): string {
  if (v == null) return '';
  return String(v);
}
function nNum(v: any): number {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
}

function normalizeOrder(orderRow: any, cols: OrdersCols): OrderNormalized {
  const itemsRaw = orderRow?.[cols.items];
  const items = safeJsonParse<OrderItem[]>(itemsRaw, []);
  const safeItems = Array.isArray(items) ? items : [];

  return {
    id: nStr(orderRow?.id),

    customerId: nStr(orderRow?.[cols.customerId]),
    merchantId: nStr(orderRow?.[cols.merchantId]),
    driverId: orderRow?.[cols.driverId] ? nStr(orderRow?.[cols.driverId]) : null,

    orderNumber: nNum(orderRow?.[cols.orderNumber]),
    status: nStr(orderRow?.status || 'pending'),

    subtotal: nNum(orderRow?.subtotal),
    discount: nNum(orderRow?.discount),
    deliveryFee: nNum(orderRow?.[cols.deliveryFee]),
    tax: nNum(orderRow?.tax),
    totalAmount: nNum(orderRow?.[cols.totalAmount]),

    paymentMethod: orderRow?.[cols.paymentMethod] ? nStr(orderRow?.[cols.paymentMethod]) : null,
    paymentStatus: orderRow?.[cols.paymentStatus] ? nStr(orderRow?.[cols.paymentStatus]) : null,

    deliveryAddress: orderRow?.[cols.deliveryAddress] ? nStr(orderRow?.[cols.deliveryAddress]) : null,
    deliveryDistanceKm: orderRow?.[cols.deliveryDistanceKm] == null ? null : nNum(orderRow?.[cols.deliveryDistanceKm]),

    customerPhone: orderRow?.[cols.customerPhone] ? nStr(orderRow?.[cols.customerPhone]) : null,
    customerNotes: orderRow?.[cols.customerNotes] ? nStr(orderRow?.[cols.customerNotes]) : null,
    specialInstructions: orderRow?.[cols.specialInstructions] ? nStr(orderRow?.[cols.specialInstructions]) : null,

    deliveryLatitude: orderRow?.[cols.deliveryLatitude] == null ? null : Number(orderRow?.[cols.deliveryLatitude]),
    deliveryLongitude: orderRow?.[cols.deliveryLongitude] == null ? null : Number(orderRow?.[cols.deliveryLongitude]),

    promoCode: orderRow?.[cols.promoCode] ? nStr(orderRow?.[cols.promoCode]) : null,

    createdAt: orderRow?.[cols.createdAt] ? nStr(orderRow?.[cols.createdAt]) : null,
    updatedAt: orderRow?.[cols.updatedAt] ? nStr(orderRow?.[cols.updatedAt]) : null,

    estimatedDeliveryTime: orderRow?.[cols.estimatedDeliveryTime] ? nStr(orderRow?.[cols.estimatedDeliveryTime]) : null,
    actualDeliveryTime: orderRow?.[cols.actualDeliveryTime] ? nStr(orderRow?.[cols.actualDeliveryTime]) : null,
    preparationTime: orderRow?.[cols.preparationTime] == null ? null : nNum(orderRow?.[cols.preparationTime]),

    cancellationReason: orderRow?.[cols.cancellationReason] ? nStr(orderRow?.[cols.cancellationReason]) : null,
    cancelledBy: orderRow?.[cols.cancelledBy] ? nStr(orderRow?.[cols.cancelledBy]) : null,

    rating: orderRow?.rating == null ? null : Number(orderRow?.rating),
    review: orderRow?.review ? nStr(orderRow?.review) : null,

    customerLocation: orderRow?.[cols.customerLocation] ?? null,
    driverLocation: orderRow?.[cols.driverLocation] ?? null,

    items: safeItems,
  };
}

function buildInvoiceHtml(order: OrderNormalized, customer: ProfileMini | null) {
  const customerName = customer?.full_name ?? customer?.fullname ?? 'NA';

  const rows = order.items
    .map((it, idx) => {
      const qty = Number(it.quantity ?? 1);
      const price = Number(it.price ?? 0);
      const line = price * qty;
      return `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #eee;">${idx + 1}</td>
          <td style="padding:10px;border-bottom:1px solid #eee;">
            <div style="font-weight:700">${(it.name ?? 'Item').toString()}</div>
            <div style="color:#666;font-size:12px;">${toINR(price)} × ${qty}</div>
          </td>
          <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;font-weight:700;">${toINR(line)}</td>
        </tr>
      `;
    })
    .join('');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Invoice - Order ${order.orderNumber}</title>
  <style>
    body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;margin:0;background:#f6f7fb;color:#111}
    .wrap{max-width:900px;margin:0 auto;padding:20px}
    .card{background:#fff;border-radius:16px;padding:18px;box-shadow:0 6px 18px rgba(0,0,0,.08)}
    h1{font-size:20px;margin:0}
    .muted{color:#666;font-size:12px;margin-top:6px}
    table{width:100%;border-collapse:collapse;margin-top:10px}
    .totals{margin-top:14px;border-top:1px solid #eee;padding-top:12px}
    .totals div{display:flex;justify-content:space-between;margin:6px 0}
    .total{font-size:18px;font-weight:800}
    @media print{
      body{background:#fff}
      .wrap{padding:0}
      .card{box-shadow:none}
      .no-print{display:none !important}
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="no-print" style="display:flex;justify-content:flex-end;gap:10px;margin-bottom:10px;">
        <button onclick="window.print()" style="padding:10px 14px;border-radius:12px;border:1px solid #ddd;background:#111;color:#fff;cursor:pointer">Print</button>
      </div>

      <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;">
        <div>
          <h1>PattiBytes Express - Invoice</h1>
          <div class="muted">Order #${order.orderNumber} • ${order.id}</div>
          <div class="muted">Created: ${fmtTime(order.createdAt)} • Updated: ${fmtTime(order.updatedAt)}</div>
          <div class="muted">Status: ${order.status}</div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:700">Payment</div>
          <div class="muted">Method: ${(order.paymentMethod ?? 'NA').toString().toUpperCase()}</div>
          <div class="muted">Status: ${(order.paymentStatus ?? 'NA').toString().toUpperCase()}</div>
          ${order.promoCode ? `<div class="muted">Promo: ${order.promoCode}</div>` : ''}
        </div>
      </div>

      <div style="margin-top:14px;">
        <div style="font-weight:800;margin-bottom:6px;">Customer</div>
        <div class="muted">Name: ${customerName}</div>
        <div class="muted">Phone: ${order.customerPhone ?? customer?.phone ?? 'NA'}</div>
      </div>

      <div style="margin-top:14px;">
        <div style="font-weight:800;margin-bottom:6px;">Delivery</div>
        <div class="muted" style="white-space:pre-line">${order.deliveryAddress ?? 'NA'}</div>
        <div class="muted">Distance: ${order.deliveryDistanceKm ?? 'NA'} km</div>
        <div class="muted">Coords: ${order.deliveryLatitude ?? 'NA'}, ${order.deliveryLongitude ?? 'NA'}</div>
      </div>

      <div style="margin-top:14px;">
        <div style="font-weight:800;margin-bottom:6px;">Items</div>
        <table>
          <thead>
            <tr>
              <th style="text-align:left;padding:10px;border-bottom:1px solid #eee;color:#666;font-size:12px;">#</th>
              <th style="text-align:left;padding:10px;border-bottom:1px solid #eee;color:#666;font-size:12px;">Item</th>
              <th style="text-align:right;padding:10px;border-bottom:1px solid #eee;color:#666;font-size:12px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rows || `<tr><td colspan="3" style="padding:12px;color:#666;">No items</td></tr>`}
          </tbody>
        </table>

        <div class="totals">
          <div><span class="muted">Subtotal</span><span style="font-weight:700">${toINR(order.subtotal)}</span></div>
          ${order.discount > 0 ? `<div><span class="muted">Discount</span><span style="font-weight:700;color:#0a7;">-${toINR(order.discount)}</span></div>` : ''}
          <div><span class="muted">Delivery fee</span><span style="font-weight:700">${toINR(order.deliveryFee)}</span></div>
          <div><span class="muted">Tax</span><span style="font-weight:700">${toINR(order.tax)}</span></div>
          <div class="total"><span>Total</span><span>${toINR(order.totalAmount)}</span></div>
        </div>
      </div>

      <div style="margin-top:14px;border-top:1px solid #eee;padding-top:12px;">
        <div class="muted">Estimated delivery: ${fmtTime(order.estimatedDeliveryTime)}</div>
        <div class="muted">Actual delivery: ${fmtTime(order.actualDeliveryTime)}</div>
        <div class="muted">Preparation time: ${order.preparationTime ?? 'NA'} min</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export default function MerchantOrderDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const orderId = String((params as any)?.id || '');

  const [style, setStyle] = useState<OrdersStyle>('snake');
  const cols = useMemo(() => colsFor(style), [style]);

  const [order, setOrder] = useState<OrderNormalized | null>(null);
  const [customer, setCustomer] = useState<ProfileMini | null>(null);

  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [notifying, setNotifying] = useState(false);

  const [editPaymentStatus, setEditPaymentStatus] = useState<string>('pending');
  const [editEstimated, setEditEstimated] = useState<string>('');
  const [editActual, setEditActual] = useState<string>('');
  const [editPrep, setEditPrep] = useState<string>('');

  const isMerchant = useMemo(() => String((user as any)?.role || '') === 'merchant', [user]);

  const customerLoc = useMemo(() => normalizeLocation(order?.customerLocation), [order?.customerLocation]);
  const driverLoc = useMemo(() => normalizeLocation(order?.driverLocation), [order?.driverLocation]);

  const metrics = useMemo(() => {
    if (!order?.createdAt) return null;
    const created = new Date(order.createdAt).getTime();
    const now = Date.now();
    const elapsedMinutes = Math.max(0, Math.floor((now - created) / 60000));

    const est = order.estimatedDeliveryTime ? new Date(order.estimatedDeliveryTime).getTime() : null;
    const act = order.actualDeliveryTime ? new Date(order.actualDeliveryTime).getTime() : null;

    const estimatedMinutes = est ? Math.max(0, Math.floor((est - created) / 60000)) : null;
    const actualMinutes = act ? Math.max(0, Math.floor((act - created) / 60000)) : null;

    return { elapsedMinutes, estimatedMinutes, actualMinutes };
  }, [order?.createdAt, order?.estimatedDeliveryTime, order?.actualDeliveryTime]);

  const sendNotification = async (userId: string, title: string, message: string, type: string, data?: any) => {
    try {
      const { error } = await supabase.from('notifications').insert({
        userid: userId,
        title,
        message,
        type,
        data: data ?? null,
        isread: false,
      });
      if (error) throw error;
      return true;
    } catch (e) {
      console.error('Notification error', e);
      return false;
    }
  };

  const resolveMerchantId = async (): Promise<string | null> => {
    const a = await supabase.from('merchants').select('id').eq('userid', user!.id).maybeSingle();
    if (!a.error && a.data?.id) return String((a.data as any).id);

    const b = await supabase.from('merchants').select('id').eq('user_id', user!.id).maybeSingle();
    if (!b.error && b.data?.id) return String((b.data as any).id);

    return null;
  };

  const loadAvailableDrivers = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('role', 'driver');
      if (error) throw error;

      const list = (data ?? []) as any[];
      const filtered = list.filter((d) => {
        if (typeof d.is_active === 'boolean') return d.is_active;
        if (typeof d.isactive === 'boolean') return d.isactive;
        return true;
      });

      setDrivers(filtered as any);
    } catch (e) {
      console.error('Failed to load drivers', e);
    }
  };

  const loadAll = async () => {
    if (!orderId || !user) return;
    setLoading(true);

    try {
      const merchantId = await resolveMerchantId();
      if (!merchantId) {
        toast.error('Merchant account not found');
        router.push('/merchant/orders');
        return;
      }

      // fetch order (RLS should protect; we also verify ownership)
      const { data: orderRow, error } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();
      if (error) throw error;
      if (!orderRow) {
        toast.error('Order not found');
        router.push('/merchant/orders');
        return;
      }

      const detected = detectOrdersStyle(orderRow);
      setStyle(detected);

      const c = colsFor(detected);
      const o = normalizeOrder(orderRow, c);

      if (String(o.merchantId) !== String(merchantId)) {
        toast.error('Order not found (or not yours)');
        router.push('/merchant/orders');
        return;
      }

      setOrder(o);

      setEditPaymentStatus(String(o.paymentStatus || 'pending'));
      setEditEstimated(toDatetimeLocalValue(o.estimatedDeliveryTime));
      setEditActual(toDatetimeLocalValue(o.actualDeliveryTime));
      setEditPrep(o.preparationTime == null ? '' : String(o.preparationTime));

      const cst = await supabase.from('profiles').select('*').eq('id', o.customerId).maybeSingle();
      setCustomer((cst.data as any) ?? null);
    } catch (e: any) {
      console.error('Failed to load order', e);
      toast.error(e?.message || 'Failed to load order');
      router.push('/merchant/orders');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!order) return;
    if (!MERCHANT_STATUSES.includes(newStatus)) {
      toast.error('Invalid status for merchant');
      return;
    }

    setUpdating(true);
    try {
      const nowIso = new Date().toISOString();

      const patch: any = {
        status: newStatus,
        [cols.updatedAt]: nowIso,
      };

      if (newStatus === 'cancelled') {
        const reason = window.prompt('Cancellation reason (optional):', order.cancellationReason ?? '') ?? '';
        patch[cols.cancellationReason] = reason.trim() || null;
        patch[cols.cancelledBy] = (user as any)?.role ?? 'merchant';
      }

      const { error } = await supabase.from('orders').update(patch).eq('id', order.id);
      if (error) throw error;

      await sendNotification(
        order.customerId,
        'Order Status Updated',
        `Your order #${order.orderNumber} is now ${newStatus.replaceAll('_', ' ')}`,
        'order',
        { orderid: order.id, ordernumber: order.orderNumber, status: newStatus }
      );

      if (newStatus === 'ready' && !order.driverId) {
        await notifyDrivers();
      }

      toast.success('Status updated');
      await loadAll();
    } catch (e: any) {
      console.error('Update status failed', e);
      toast.error(e?.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const saveExtraFields = async () => {
    if (!order) return;

    setUpdating(true);
    try {
      const nowIso = new Date().toISOString();

      const estIso = fromDatetimeLocalValue(editEstimated);
      const actIso = fromDatetimeLocalValue(editActual);
      const prep = editPrep.trim() === '' ? null : Number(editPrep);

      if (prep != null && !Number.isFinite(prep)) {
        toast.error('Preparation time must be a number');
        return;
      }

      const patch: any = {
        [cols.updatedAt]: nowIso,
        [cols.paymentStatus]: editPaymentStatus || null,
        [cols.estimatedDeliveryTime]: estIso,
        [cols.actualDeliveryTime]: actIso,
        [cols.preparationTime]: prep,
      };

      const { error } = await supabase.from('orders').update(patch).eq('id', order.id);
      if (error) throw error;

      toast.success('Order timings/payment updated');
      await loadAll();
    } catch (e: any) {
      console.error('Save fields failed', e);
      toast.error(e?.message || 'Failed to update fields');
    } finally {
      setUpdating(false);
    }
  };

  const notifyDrivers = async () => {
    if (!order) return;
    if (!drivers.length) {
      toast.warning('No available drivers');
      return;
    }

    setNotifying(true);
    try {
      const nowIso = new Date().toISOString();

      for (const d of drivers) {
        const { error } = await supabase.from('driverassignments').insert({
          orderid: order.id,
          driverid: d.id,
          status: 'pending',
          assignedat: nowIso,
        });

        const code = (error as any)?.code;
        if (error && code !== '23505') {
          console.warn('driverassignments insert error', error);
        }
      }

      let ok = 0;
      for (const d of drivers) {
        const sent = await sendNotification(
          d.id,
          'New Delivery Request',
          `Order #${order.orderNumber} is ready for pickup.`,
          'delivery',
          {
            orderid: order.id,
            ordernumber: order.orderNumber,
            merchantid: order.merchantId,
            deliveryaddress: order.deliveryAddress,
            totalamount: order.totalAmount,
            deliverylatitude: order.deliveryLatitude,
            deliverylongitude: order.deliveryLongitude,
          }
        );
        if (sent) ok += 1;
      }

      toast.success(`Notified ${ok} drivers`);
    } catch (e) {
      console.error('Notify drivers failed', e);
      toast.error('Failed to notify drivers');
    } finally {
      setNotifying(false);
    }
  };

  const assignDriver = async (driverId: string) => {
    if (!order || !driverId) return;

    setAssigning(true);
    try {
      const nowIso = new Date().toISOString();

      const patch: any = {
        [cols.driverId]: driverId,
        [cols.updatedAt]: nowIso,
      };
      if (order.status === 'ready') patch.status = 'assigned';

      const { error } = await supabase.from('orders').update(patch).eq('id', order.id);
      if (error) throw error;

      await supabase
        .from('driverassignments')
        .update({ status: 'accepted', respondedat: nowIso })
        .eq('orderid', order.id)
        .eq('driverid', driverId);

      await sendNotification(
        driverId,
        'Order Assigned',
        `You have been assigned to deliver order #${order.orderNumber}.`,
        'delivery',
        { orderid: order.id, ordernumber: order.orderNumber }
      );

      await sendNotification(
        order.customerId,
        'Driver Assigned',
        `A delivery partner has been assigned to your order #${order.orderNumber}.`,
        'order',
        { orderid: order.id, ordernumber: order.orderNumber, driverid: driverId }
      );

      toast.success('Driver assigned');
      await loadAll();
    } catch (e: any) {
      console.error('Assign driver failed', e);
      toast.error(e?.message || 'Failed to assign driver');
    } finally {
      setAssigning(false);
    }
  };

  const downloadInvoiceHtml = () => {
    if (!order) return;

    const html = buildInvoiceHtml(order, customer);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-order-${order.orderNumber}.html`;
    a.click();

    URL.revokeObjectURL(url);
  };

  const printInvoice = () => {
    if (!order) return;

    const html = buildInvoiceHtml(order, customer);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const w = window.open(url, '_blank');
    if (!w) {
      toast.error('Popup blocked. Allow popups to print invoice.');
      return;
    }

    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(`/merchant/orders/${orderId}`)}`);
      return;
    }
    if (!isMerchant) {
      router.push('/');
      return;
    }

    loadAll();
    loadAvailableDrivers();

    const ch = supabase
      .channel(`merchant-order-${orderId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, () => {
        loadAll();
      })
      .subscribe();

    return () => {
      ch.unsubscribe();
    };
  }, [authLoading, user?.id, isMerchant, orderId]);

  if (authLoading || loading) return <PageLoadingSpinner />;

  if (!order) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 py-10">
          <p className="text-center text-gray-600">Order not found</p>
        </div>
      </DashboardLayout>
    );
  }

  const sc = statusConfig(order.status);
  const StatusIcon = sc.icon;

  const ts = Number(customer?.trust_score ?? customer?.trustscore ?? 5);
  const as = String(customer?.account_status ?? customer?.accountstatus ?? 'active');
  const badge = trustBadge(ts, as);
  const TrustIcon = badge.icon;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <button
            onClick={() => router.push('/merchant/orders')}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={18} />
            Back to Orders
          </button>

          <div className="flex flex-wrap gap-2">
            {order.status === 'ready' && !order.driverId && (
              <button
                onClick={notifyDrivers}
                disabled={notifying || !drivers.length}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
              >
                <Bell size={16} />
                {notifying ? 'Notifying...' : `Notify (${drivers.length})`}
              </button>
            )}

            <button
              onClick={loadAll}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white hover:bg-orange-600"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <button
              onClick={downloadInvoiceHtml}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700"
            >
              <Download size={16} />
              Download Invoice
            </button>

            <button
              onClick={printInvoice}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-700 text-white hover:bg-gray-800"
            >
              <Printer size={16} />
              Print Invoice
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-2xl shadow p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Order #{order.orderNumber}</h1>
                  <p className="text-sm text-gray-600 mt-1">
                    <Calendar className="inline w-4 h-4 mr-1" />
                    Created: {fmtTime(order.createdAt)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Updated: {fmtTime(order.updatedAt)}</p>
                </div>

                <div className={`px-4 py-2 rounded-xl inline-flex items-center gap-2 ${sc.color}`}>
                  <StatusIcon size={18} />
                  <span className="font-bold capitalize">{order.status.replaceAll('_', ' ')}</span>
                </div>
              </div>

              {metrics && (
                <div className="grid grid-cols-3 gap-3 mt-4 p-3 sm:p-4 bg-gray-50 rounded-xl">
                  <div className="text-center">
                    <Timer className="w-5 h-5 mx-auto text-blue-600 mb-1" />
                    <p className="text-xs text-gray-600">Elapsed</p>
                    <p className="text-lg font-bold text-gray-900">{metrics.elapsedMinutes}m</p>
                  </div>
                  <div className="text-center">
                    <TrendingUp className="w-5 h-5 mx-auto text-orange-600 mb-1" />
                    <p className="text-xs text-gray-600">Estimated</p>
                    <p className="text-lg font-bold text-gray-900">{metrics.estimatedMinutes ?? 'NA'}</p>
                  </div>
                  <div className="text-center">
                    <CheckCircle className="w-5 h-5 mx-auto text-green-600 mb-1" />
                    <p className="text-xs text-gray-600">Actual</p>
                    <p className="text-lg font-bold text-gray-900">{metrics.actualMinutes ?? 'NA'}</p>
                  </div>
                </div>
              )}

              <div className="mt-5 pt-4 border-t">
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <Package size={18} />
                  Update Status
                </h3>

                <div className="flex flex-wrap gap-2">
                  {MERCHANT_STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => updateStatus(s)}
                      disabled={updating || order.status === s}
                      className={`px-4 py-2 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        order.status === s ? 'bg-gray-200 text-gray-700' : 'bg-primary text-white hover:bg-orange-600'
                      }`}
                    >
                      {s.replaceAll('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {!order.driverId && (
                <div className="mt-5 bg-blue-50 border border-blue-200 rounded-2xl p-4 sm:p-6">
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <Truck className="text-blue-600" size={18} />
                    Assign Driver (Merchant)
                  </h3>

                  <select
                    onChange={(e) => assignDriver(e.target.value)}
                    disabled={assigning}
                    defaultValue=""
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary disabled:opacity-50"
                  >
                    <option value="">Select a driver…</option>
                    {drivers.map((d: any) => (
                      <option key={d.id} value={d.id}>
                        {d.full_name ?? d.fullname ?? 'Driver'} {d.phone ? `- ${d.phone}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow p-4 sm:p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <MapPin className="text-primary" size={18} />
                Locations
              </h3>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="border rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-600 mb-1">Customer live location</p>
                  {customerLoc ? (
                    <>
                      <p className="text-sm font-semibold text-gray-900">
                        {customerLoc.lat?.toFixed(6)}, {customerLoc.lng?.toFixed(6)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Updated: {fmtTime(customerLoc.updated_at ?? customerLoc.updatedAt ?? customerLoc.updatedat)}
                      </p>
                      <button
                        type="button"
                        onClick={() => openMaps(customerLoc.lat, customerLoc.lng)}
                        className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                      >
                        <Navigation className="w-4 h-4" />
                        Open in Maps
                      </button>
                    </>
                  ) : (
                    <p className="text-sm text-gray-600">Not available</p>
                  )}
                </div>

                <div className="border rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-600 mb-1">Driver live location</p>
                  {driverLoc ? (
                    <>
                      <p className="text-sm font-semibold text-gray-900">
                        {driverLoc.lat?.toFixed(6)}, {driverLoc.lng?.toFixed(6)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Updated: {fmtTime(driverLoc.updated_at ?? driverLoc.updatedAt ?? driverLoc.updatedat)}
                      </p>
                      <button
                        type="button"
                        onClick={() => openMaps(driverLoc.lat, driverLoc.lng)}
                        className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                      >
                        <Navigation className="w-4 h-4" />
                        Open in Maps
                      </button>
                    </>
                  ) : (
                    <p className="text-sm text-gray-600">Not available</p>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <p className="text-xs font-semibold text-gray-600 mb-1">Delivery point</p>
                {order.deliveryLatitude && order.deliveryLongitude ? (
                  <button
                    type="button"
                    onClick={() => openMaps(order.deliveryLatitude, order.deliveryLongitude)}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                  >
                    <Navigation className="w-4 h-4" />
                    {order.deliveryLatitude.toFixed(6)}, {order.deliveryLongitude.toFixed(6)}
                  </button>
                ) : (
                  <p className="text-sm text-gray-600">Not available</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-4 sm:p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Package className="text-primary" size={18} />
                Order Items <span className="text-sm text-gray-500">({order.items.length})</span>
              </h3>

              <div className="space-y-3">
                {order.items.map((it, idx) => {
                  const qty = Number(it.quantity ?? 1);
                  const price = Number(it.price ?? 0);
                  return (
                    <div key={`${it.id ?? idx}`} className="flex justify-between gap-3 py-3 border-b last:border-0">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{it.name ?? 'Item'}</p>
                        <p className="text-sm text-gray-600">
                          {toINR(price)} × {qty}
                        </p>
                      </div>
                      <p className="font-bold text-gray-900">{toINR(price * qty)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-5">
            <div className="bg-white rounded-2xl shadow p-4 sm:p-6 lg:sticky lg:top-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <DollarSign className="text-primary" size={18} />
                Order Summary
              </h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold">{toINR(order.subtotal)}</span>
                </div>

                {order.discount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Discount</span>
                    <span className="font-semibold">-{toINR(order.discount)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery fee</span>
                  <span className="font-semibold">{toINR(order.deliveryFee)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Tax</span>
                  <span className="font-semibold">{toINR(order.tax)}</span>
                </div>

                <div className="pt-3 border-t flex justify-between items-end">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-primary">{toINR(order.totalAmount)}</span>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t">
                <h4 className="font-bold mb-3 flex items-center gap-2">
                  <Save size={16} />
                  Update payment & timings
                </h4>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Payment status</label>
                    <select
                      value={editPaymentStatus}
                      onChange={(e) => setEditPaymentStatus(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300"
                    >
                      <option value="pending">PENDING</option>
                      <option value="paid">PAID</option>
                      <option value="failed">FAILED</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Estimated delivery time</label>
                    <input
                      type="datetime-local"
                      value={editEstimated}
                      onChange={(e) => setEditEstimated(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Actual delivery time</label>
                    <input
                      type="datetime-local"
                      value={editActual}
                      onChange={(e) => setEditActual(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Preparation time (minutes)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={editPrep}
                      onChange={(e) => setEditPrep(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300"
                      placeholder="e.g. 30"
                    />
                  </div>

                  <button
                    onClick={saveExtraFields}
                    disabled={updating}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-white hover:bg-orange-600 disabled:opacity-50"
                  >
                    <Save size={16} />
                    {updating ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-4 sm:p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <User className="text-primary" size={18} />
                Customer
              </h3>

              <div className="flex items-center justify-between gap-2 mb-3">
                <p className="font-semibold text-gray-900 truncate">{customer?.full_name ?? customer?.fullname ?? 'NA'}</p>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${badge.color}`}>
                  <TrustIcon size={14} />
                  <span className="text-xs font-bold">{badge.text}</span>
                </div>
              </div>

              {(customer?.phone || order.customerPhone) && (
                <a
                  href={`tel:${order.customerPhone ?? customer?.phone}`}
                  className="text-sm text-primary hover:underline inline-flex items-center gap-2"
                >
                  <Phone size={16} className="text-gray-600" />
                  {order.customerPhone ?? customer?.phone}
                </a>
              )}

              <div className="mt-4 pt-4 border-t">
                <p className="text-xs font-semibold text-gray-600 mb-1">Delivery address</p>
                <p className="text-sm text-gray-800 whitespace-pre-line">{order.deliveryAddress ?? 'NA'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
