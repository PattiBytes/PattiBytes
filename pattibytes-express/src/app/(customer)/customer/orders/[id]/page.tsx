/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
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
  Download,
  MessageCircle,
  AlertTriangle,
  Store,
  Calendar,
  Navigation,
  Loader2,
  Share2,
  Copy,
  ExternalLink,
  LocateFixed,
} from 'lucide-react';
import { PageLoadingSpinner } from '@/components/common/LoadingSpinner';
import { toast } from 'react-toastify';
import Image from 'next/image';

type LiveLocation = {
  lat: number;
  lng: number;
  accuracy?: number;
  updated_at: string;
};

type MerchantInfo = {
  business_name: string;
  logo_url?: string;
  phone?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
};

type ProfileMini = {
  full_name: string;
  phone?: string;
  email?: string;
};

type OrderDetail = {
  ordernumber: any;
  id: string;
  order_number: number;
  customer_id: string;
  merchant_id: string;
  driver_id?: string | null;

  items: any[];
  subtotal: number;
  discount: number;
  delivery_fee: number;
  tax: number;
  total_amount: number;

  status: string;
  payment_method: string;
  payment_status: string;

  delivery_address: string;
  delivery_latitude?: number | null;
  delivery_longitude?: number | null;
  delivery_distance_km?: number | null;

  promo_code?: string | null;
  created_at: string;
  estimated_delivery_time?: string | null;
  actual_delivery_time?: string | null;
  preparation_time?: number | null;

  cancellation_reason?: string | null;
  cancelled_by?: string | null;

  customer_phone?: string | null;
  special_instructions?: string | null;
  customer_notes?: string | null;

  customer_location?: LiveLocation | null;
  driver_location?: LiveLocation | null;

  merchants?: MerchantInfo | null;
  driver?: ProfileMini | null;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const round2 = (n: number) => Math.round(n * 100) / 100;

const money = (n: any) => `₹${Number(n || 0).toFixed(2)}`;

function safeStr(v: any) {
  return String(v ?? '').trim();
}

function openInNewTab(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

function mapsQuery(lat: number, lon: number) {
  return `https://www.google.com/maps?q=${lat},${lon}`;
}

function mapsDirections(originLat: number, originLon: number, destLat: number, destLon: number) {
  return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLon}&destination=${destLat},${destLon}`;
}

function normalizePhone(v: string) {
  return String(v || '').replace(/\D/g, '');
}

export default function CustomerOrderDetailPage() {
const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();

  const orderId = String((params as any)?.id || '');

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const [customerProfile, setCustomerProfile] = useState<any>(null);
  

  // Live location sharing
  const [shareLiveLocation, setShareLiveLocation] = useState(false);
  const [myLive, setMyLive] = useState<LiveLocation | null>(null);
  const [locChecking, setLocChecking] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const lastSentAtRef = useRef<number>(0);

 useEffect(() => {
  if (authLoading) return;

  if (!user) {
    router.replace('/login');
    return;
  }

  if (!orderId) return;

    loadOrder();
    loadCustomerProfile();

    const subscription = supabase
      .channel(`customer-order-${orderId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, () => loadOrder())
      .subscribe();

    return () => {
      subscription.unsubscribe();
      stopSharing();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, orderId, router]);

  const loadCustomerProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('cancelled_orders_count, is_trusted, trust_score')
      .eq('id', user.id)
      .single();
    setCustomerProfile(data);
  };

  const loadOrder = async () => {
    if (!user || !orderId) return;

    try {
      setLoading(true);

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .eq('customer_id', user.id)
        .single();

      if (orderError) throw orderError;

      const { data: merchantInfo } = await supabase
        .from('merchants')
        .select('business_name, logo_url, phone, address, latitude, longitude')
        .eq('id', orderData.merchant_id)
        .single();

      let driverInfo: any = null;
      if (orderData.driver_id) {
        const { data } = await supabase.from('profiles').select('full_name, phone').eq('id', orderData.driver_id).single();
        driverInfo = data;
      }

      setOrder({
        ...orderData,
        merchants: merchantInfo || null,
        driver: driverInfo || null,
      });
    } catch (error) {
      console.error('Failed to load order:', error);
      toast.error('Failed to load order details');
      router.push('/customer/orders');
    } finally {
      setLoading(false);
    }
  };

  const statusKey = useMemo(() => safeStr(order?.status).toLowerCase(), [order?.status]);

  const canCancelOrder = useMemo(() => {
    if (!order) return false;
    return ['pending', 'confirmed'].includes(statusKey);
  }, [order, statusKey]);

  const canShareLocation = useMemo(() => {
    if (!order) return false;
    return !['delivered', 'cancelled'].includes(statusKey);
  }, [order, statusKey]);

  const getStatusConfig = (status: string) => {
    const s = String(status || '').toLowerCase();
    const configs: any = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Order Placed' },
      confirmed: { color: 'bg-blue-100 text-blue-800', icon: ChefHat, label: 'Confirmed' },
      preparing: { color: 'bg-purple-100 text-purple-800', icon: ChefHat, label: 'Preparing' },
      ready: { color: 'bg-orange-100 text-orange-800', icon: Package, label: 'Ready for Pickup' },
      assigned: { color: 'bg-indigo-100 text-indigo-800', icon: Truck, label: 'Driver Assigned' },
      picked_up: { color: 'bg-indigo-100 text-indigo-800', icon: Truck, label: 'Out for Delivery' },
      on_the_way: { color: 'bg-indigo-100 text-indigo-800', icon: Truck, label: 'Out for Delivery' },
      delivered: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Delivered' },
      cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Cancelled' },
    };
    return configs[s] || configs.pending;
  };

  const statusTimeline = useMemo(() => {
    // timeline steps (simple, compatible with your existing statuses)
    const steps = [
      { key: 'pending', label: 'Placed', icon: Clock },
      { key: 'confirmed', label: 'Confirmed', icon: ChefHat },
      { key: 'preparing', label: 'Preparing', icon: ChefHat },
      { key: 'ready', label: 'Ready', icon: Package },
      { key: 'assigned', label: 'Driver assigned', icon: Truck },
      { key: 'picked_up', label: 'Out for delivery', icon: Truck },
      { key: 'delivered', label: 'Delivered', icon: CheckCircle },
    ];

    const mapToIndex = (s: string) => {
      const k = safeStr(s).toLowerCase();
      const aliases: Record<string, string> = { on_the_way: 'picked_up' };
      const finalKey = aliases[k] || k;
      const idx = steps.findIndex((x) => x.key === finalKey);
      return idx >= 0 ? idx : 0;
    };

    const idx = mapToIndex(statusKey);
    return { steps, activeIndex: idx };
  }, [statusKey]);

  const openMaps = (lat: number, lon: number) => openInNewTab(mapsQuery(lat, lon));

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch (e) {
      console.error(e);
      toast.error('Copy failed (permission blocked)');
    }
  };

  const shareOrder = async () => {
    if (!order) return;
    const url = window.location.href;
    const title = `Order #${order.order_number}`;
    const text = `My order #${order.order_number} (${safeStr(order.status).toUpperCase()})`;

    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title, text, url });
        return;
      }
    } catch (e) {
      console.error(e);
    }

    await copyToClipboard(url, 'Order link');
  };

  const contactViaWhatsApp = (phone: string, name: string, extraMessage?: string) => {
    const clean = normalizePhone(phone);
    if (!clean) {
      toast.error('Phone number not available');
      return;
    }
    const base = `Hi ${name}, I have a query regarding my order #${order?.order_number}.`;
    const message = extraMessage ? `${base}\n${extraMessage}` : base;
    openInNewTab(`https://wa.me/${clean}?text=${encodeURIComponent(message)}`);
  };

   
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const buildInvoiceHtml = (o: OrderDetail) => {
    const merchantName = o.merchants?.business_name || 'Restaurant';
    const invoiceNo = `#${o.order_number}`;
    const created = new Date(o.created_at).toLocaleString();
    const eta = o.estimated_delivery_time ? new Date(o.estimated_delivery_time).toLocaleString() : '';
    const paidMethod = safeStr(o.payment_method).toUpperCase();
    const paidStatus = safeStr(o.payment_status).toUpperCase();
    const orderStatus = safeStr(o.status).toUpperCase();

    const itemsRows = (o.items || [])
      .map((it: any, idx: number) => {
        const name = safeStr(it?.name) || `Item ${idx + 1}`;
        const qty = Number(it?.quantity || 0);
        const price = Number(it?.price || 0);
        const line = price * qty;
        return `
          <tr>
            <td style="padding:10px;border-bottom:1px solid #eee;">
              <div style="font-weight:600;color:#111;">${name}</div>
              <div style="font-size:12px;color:#666;">₹${price.toFixed(2)} × ${qty}</div>
            </td>
            <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">₹${line.toFixed(2)}</td>
          </tr>
        `;
      })
      .join('');

    const logoHtml = o.merchants?.logo_url
      ? `<img src="${o.merchants.logo_url}" alt="Logo" style="width:52px;height:52px;border-radius:10px;object-fit:cover;border:1px solid #eee;" />`
      : `<div style="width:52px;height:52px;border-radius:10px;background:#f3f4f6;border:1px solid #eee;display:flex;align-items:center;justify-content:center;color:#6b7280;font-weight:700;">PB</div>`;

    const css = `
      <style>
        * { box-sizing: border-box; }
        body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; margin:0; color:#111; background:#fff; }
        .page { padding: 24px; max-width: 820px; margin: 0 auto; }
        .top { display:flex; justify-content:space-between; gap: 16px; align-items:flex-start; }
        .brand { display:flex; gap: 12px; align-items:center; }
        .title { font-size: 20px; font-weight: 800; margin:0; }
        .muted { color:#6b7280; font-size: 12px; margin-top:4px; }
        .pill { display:inline-block; padding: 6px 10px; border-radius:999px; background:#f3f4f6; font-weight:700; font-size:12px; }
        .grid { display:grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 18px; }
        .card { border: 1px solid #eee; border-radius: 12px; padding: 12px; }
        .card h3 { margin:0 0 6px 0; font-size: 12px; color:#6b7280; font-weight:700; text-transform:uppercase; letter-spacing:.04em; }
        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
        table { width:100%; border-collapse:collapse; margin-top: 12px; }
        .totals { margin-top: 12px; }
        .row { display:flex; justify-content:space-between; padding: 6px 0; font-size: 14px; }
        .row strong { font-size: 16px; }
        .hr { height: 1px; background:#eee; margin: 12px 0; }
        .actions { display:none; margin-top: 12px; gap: 10px; }
        .btn { border: 1px solid #eee; padding: 10px 12px; border-radius: 10px; background:#f9fafb; font-weight:700; cursor:pointer; }
        @media screen {
          .actions { display:flex; }
        }
        @media print {
          .actions { display:none !important; }
          a { text-decoration:none; color:inherit; }
        }
      </style>
    `;

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <title>Invoice ${invoiceNo}</title>
          ${css}
        </head>
        <body>
          <div class="page">
            <div class="top">
              <div class="brand">
                ${logoHtml}
                <div>
                  <p class="title">${merchantName}</p>
                  <div class="muted">Invoice for Order <span class="mono">${invoiceNo}</span></div>
                  <div class="muted">Placed: ${created}${eta ? ` • ETA: ${eta}` : ''}</div>
                </div>
              </div>
              <div style="text-align:right;">
                <div class="pill">${orderStatus}</div>
                <div class="muted" style="margin-top:8px;">Payment: ${paidMethod} • ${paidStatus}</div>
              </div>
            </div>

            <div class="grid">
              <div class="card">
                <h3>Delivery address</h3>
                <div style="white-space:pre-line;font-size:14px;">${safeStr(o.delivery_address) || '-'}</div>
                <div class="muted" style="margin-top:8px;">Phone: ${safeStr(o.customer_phone) || 'N/A'}</div>
              </div>
              <div class="card">
                <h3>Order info</h3>
                <div style="font-size:14px;">Order ID: <span class="mono">${o.id}</span></div>
                <div style="font-size:14px;margin-top:6px;">Invoice No: <span class="mono">${invoiceNo}</span></div>
                ${o.promo_code ? `<div class="muted" style="margin-top:8px;">Promo: ${safeStr(o.promo_code)}</div>` : ''}
              </div>
            </div>

            <div class="card" style="margin-top:12px;">
              <h3>Items</h3>
              <table>
                <tbody>
                  ${itemsRows || `<tr><td style="padding:10px;">No items</td><td></td></tr>`}
                </tbody>
              </table>

              <div class="hr"></div>

              <div class="totals">
                <div class="row"><span>Subtotal</span><span>${money(o.subtotal)}</span></div>
                ${Number(o.discount || 0) > 0 ? `<div class="row" style="color:#065f46;"><span>Discount</span><span>-${money(o.discount)}</span></div>` : ''}
                <div class="row"><span>Delivery fee</span><span>${money(o.delivery_fee)}</span></div>
                <div class="row"><span>GST</span><span>${money(o.tax)}</span></div>
                <div class="hr"></div>
                <div class="row"><strong>Total</strong><strong>${money(o.total_amount)}</strong></div>
              </div>
            </div>

            <div class="actions">
              <button class="btn" onclick="window.print()">Print / Save as PDF</button>
              <button class="btn" onclick="window.close()">Close</button>
            </div>

            <div class="muted" style="margin-top:12px;">
              Tip: In the print dialog, choose “Save as PDF” to download a proper bill.
            </div>
          </div>
        </body>
      </html>
    `;

    return html;
  };

 // inside CustomerOrderDetailPage

const downloadInvoice = async () => {
  if (!order) return;

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const res = await fetch(`/api/orders/${order.id}/invoice`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('Invoice API failed:', res.status, text); // you already have this pattern
    throw new Error(`Failed to download invoice (${res.status})`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `invoice-${order.order_number}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};





  const stopSharing = () => {
    try {
      if (watchIdRef.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    } catch {}
    watchIdRef.current = null;
  };

  const requestLiveOnce = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }
    if (!order) return;

    setLocChecking(true);
    try {
      await new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const payload: LiveLocation = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              updated_at: new Date().toISOString(),
            };

            setMyLive(payload);
            await supabase.from('orders').update({ customer_location: payload }).eq('id', order.id);
            resolve();
          },
          (err) => reject(err),
          { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
        );
      });

      toast.success('Location updated');
    } catch (e) {
      console.error(e);
      toast.error('Unable to get location (permission/timeout)');
    } finally {
      setLocChecking(false);
    }
  };

  const startSharing = () => {
    if (!order) return;
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      setShareLiveLocation(false);
      return;
    }

    stopSharing();
    toast.info('Sharing your live location…');

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const now = Date.now();
        if (now - lastSentAtRef.current < 5000) return; // throttle
        lastSentAtRef.current = now;

        const payload: LiveLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          updated_at: new Date().toISOString(),
        };

        setMyLive(payload);

        await supabase.from('orders').update({ customer_location: payload }).eq('id', order.id);
      },
      (err) => {
        console.error(err);
        toast.error('Unable to share live location (permission/timeout)');
        setShareLiveLocation(false);
        stopSharing();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (!shareLiveLocation) {
      stopSharing();
      return;
    }
    if (!canShareLocation) {
      toast.info('Live location sharing is disabled for delivered/cancelled orders.');
      setShareLiveLocation(false);
      return;
    }
    startSharing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareLiveLocation, canShareLocation]);

  const handleCancelOrder = async () => {
    if (!order) return;
    if (!cancelReason.trim()) {
      toast.error('Please provide a cancellation reason');
      return;
    }

    setCancelling(true);
    try {
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: 'cancelled', cancellation_reason: cancelReason, cancelled_by: 'customer' })
        .eq('id', order.id);

      if (orderError) throw orderError;

      // Optional: record cancellations table (if you created it)
      try {
        await supabase.from('order_cancellations').insert([{ order_id: order.id, customer_id: user!.id, reason: cancelReason }]);
      } catch {}

      toast.success('Order cancelled');
      setShowCancelModal(false);
      setCancelReason('');
      await loadOrder();
      await loadCustomerProfile();
    } catch (e) {
      console.error('Cancel error:', e);
      toast.error('Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <PageLoadingSpinner />;

  if (!order) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <p className="text-center text-gray-600">Order not found</p>
        </div>
      </DashboardLayout>
    );
  }

  const statusConfig = getStatusConfig(order.status);
  const StatusIcon = statusConfig.icon;

  const driverLoc = (order.driver_location as any) || null;
  const customerLoc = (order.customer_location as any) || null;

  const deliveryCoordsOk = order.delivery_latitude != null && order.delivery_longitude != null;
  const merchantCoordsOk = order.merchants?.latitude != null && order.merchants?.longitude != null;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32 md:pb-8">
        <button
          onClick={() => router.push('/customer/orders')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back to Orders</span>
        </button>

        {/* Trust Warning */}
        {customerProfile && customerProfile.is_trusted === false && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-red-900 mb-1">Account Status: Untrusted</h3>
                <p className="text-sm text-red-800">
                  You have cancelled {customerProfile.cancelled_orders_count} orders. Multiple cancellations may affect
                  your ability to place future orders.
                </p>
                <p className="text-xs text-red-700 mt-2">Trust Score: {customerProfile.trust_score}/100</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  {order.merchants?.logo_url ? (
                    <Image
                      src={order.merchants.logo_url}
                      alt={order.merchants.business_name}
                      width={52}
                      height={52}
                      className="rounded-lg"
                    />
                  ) : (
                    <div className="w-[52px] h-[52px] rounded-lg bg-gray-100 flex items-center justify-center">
                      <Store className="w-6 h-6 text-gray-500" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{order.merchants?.business_name || 'Restaurant'}</h2>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm text-gray-600">Order #{order.order_number}</p>
                      <button
                        className="text-xs font-semibold text-gray-600 hover:text-gray-900 inline-flex items-center gap-1"
                        onClick={() => copyToClipboard(String(order.order_number), 'Order number')}
                        type="button"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copy number
                      </button>
                      <button
                        className="text-xs font-semibold text-gray-600 hover:text-gray-900 inline-flex items-center gap-1"
                        onClick={() => copyToClipboard(String(order.id), 'Order ID')}
                        type="button"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copy ID
                      </button>
                    </div>
                  </div>
                </div>

                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${statusConfig.color}`}>
                  <StatusIcon className="w-4 h-4" />
                  {statusConfig.label}
                </span>
              </div>

              <div className="grid md:grid-cols-2 gap-3 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span>Placed: {new Date(order.created_at).toLocaleString()}</span>
                </div>
                {order.estimated_delivery_time && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span>ETA: {new Date(order.estimated_delivery_time).toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div className="mt-5 rounded-xl border border-gray-200 p-4">
                <p className="text-sm font-bold text-gray-900 mb-3">Order progress</p>
                <div className="grid sm:grid-cols-3 gap-3">
                  {statusTimeline.steps.map((s, idx) => {
                    const Icon = s.icon;
                    const done = idx <= statusTimeline.activeIndex && statusKey !== 'cancelled';
                    const active = idx === statusTimeline.activeIndex && statusKey !== 'cancelled';
                    return (
                      <div
                        key={s.key}
                        className={`rounded-lg border p-3 flex items-center gap-3 ${
                          done ? 'border-green-200 bg-green-50' : active ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            done ? 'bg-green-100 text-green-700' : active ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{s.label}</p>
                          <p className="text-xs text-gray-600">{done ? 'Done' : active ? 'In progress' : 'Pending'}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {statusKey === 'cancelled' && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm font-semibold text-red-800">Cancelled</p>
                    <p className="text-xs text-red-700 mt-1">
                      {order.cancellation_reason ? `Reason: ${order.cancellation_reason}` : 'No reason provided.'}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-2 flex-wrap">
                <button
                  onClick={downloadInvoice}
                  className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 font-semibold text-sm inline-flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Invoice (Print / PDF)
                </button>

                <button
                  onClick={shareOrder}
                  className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 font-semibold text-sm inline-flex items-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>

                {canCancelOrder && (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="px-4 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-sm"
                  >
                    Cancel order
                  </button>
                )}
              </div>
            </div>

            {/* Delivery section */}
            <div className="bg-white rounded-xl shadow-md p-6 space-y-3">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <MapPin className="text-primary" size={20} />
                Delivery details
              </h3>

              <div className="text-sm text-gray-800 whitespace-pre-line">{order.delivery_address}</div>

              <div className="flex gap-3 flex-wrap">
                {deliveryCoordsOk && (
                  <button
                    className="text-sm font-semibold text-primary hover:underline inline-flex items-center gap-1"
                    onClick={() => openMaps(Number(order.delivery_latitude), Number(order.delivery_longitude))}
                    type="button"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open delivery location in Maps
                  </button>
                )}

                {merchantCoordsOk && deliveryCoordsOk && (
                  <button
                    className="text-sm font-semibold text-primary hover:underline inline-flex items-center gap-1"
                    onClick={() =>
                      openInNewTab(
                        mapsDirections(
                          Number(order.merchants!.latitude),
                          Number(order.merchants!.longitude),
                          Number(order.delivery_latitude),
                          Number(order.delivery_longitude)
                        )
                      )
                    }
                    type="button"
                  >
                    <Navigation className="w-4 h-4" />
                    Directions (Restaurant → Delivery)
                  </button>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-3 pt-2">
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs text-gray-500 mb-1">Customer phone</p>
                  <p className="font-semibold text-gray-900">{order.customer_phone || 'N/A'}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs text-gray-500 mb-1">Instructions</p>
                  <p className="font-semibold text-gray-900">{order.special_instructions || 'None'}</p>
                </div>
              </div>

              {order.customer_notes && (
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="text-xs text-gray-500 mb-1">Notes for restaurant</p>
                  <p className="text-sm text-gray-900">{order.customer_notes}</p>
                </div>
              )}
            </div>

            {/* Driver live location */}
            <div className="bg-white rounded-xl shadow-md p-6 space-y-3">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Truck className="text-primary" size={20} />
                Delivery tracking
              </h3>

              {order.driver ? (
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">Driver: {order.driver.full_name}</p>
                    <p className="text-sm text-gray-600">{order.driver.phone || 'Phone not available'}</p>
                    <div className="mt-2 flex gap-2 flex-wrap">
                      {order.driver.phone && (
                        <>
                          <a
                            className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 font-semibold text-sm inline-flex items-center gap-2"
                            href={`tel:${order.driver.phone}`}
                          >
                            <Phone className="w-4 h-4" />
                            Call
                          </a>

                          <button
                            className="px-4 py-2 rounded-lg bg-green-100 hover:bg-green-200 text-green-800 font-semibold text-sm inline-flex items-center gap-2"
                            onClick={() => {
                              const loc = myLive || customerLoc;
                              const locLine =
                                loc?.lat && loc?.lng ? `My live location: ${mapsQuery(Number(loc.lat), Number(loc.lng))}` : '';
                              contactViaWhatsApp(order.driver!.phone!, order.driver!.full_name, locLine);
                            }}
                            type="button"
                          >
                            <MessageCircle className="w-4 h-4" />
                            WhatsApp
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {driverLoc?.lat && driverLoc?.lng ? (
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Driver location updated</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {driverLoc.updated_at ? new Date(driverLoc.updated_at).toLocaleTimeString() : ''}
                      </p>
                      <button
                        className="mt-2 text-sm font-semibold text-primary hover:underline inline-flex items-center gap-1"
                        onClick={() => openMaps(Number(driverLoc.lat), Number(driverLoc.lng))}
                        type="button"
                      >
                        <Navigation className="w-4 h-4" />
                        Open driver in Maps
                      </button>

                      {deliveryCoordsOk && (
                        <button
                          className="mt-2 block text-sm font-semibold text-primary hover:underline"
                          onClick={() =>
                            openInNewTab(
                              mapsDirections(
                                Number(driverLoc.lat),
                                Number(driverLoc.lng),
                                Number(order.delivery_latitude),
                                Number(order.delivery_longitude)
                              )
                            )
                          }
                          type="button"
                        >
                          Directions (Driver → Delivery)
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">Driver location not available yet.</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-600">Driver not assigned yet.</p>
              )}

              {/* Customer share live location toggle */}
              <div className="mt-2 bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={shareLiveLocation}
                    onChange={(e) => setShareLiveLocation(e.target.checked)}
                    className="mt-1 w-4 h-4"
                    disabled={!canShareLocation}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 inline-flex items-center gap-2">
                      <Share2 className="w-4 h-4" />
                      Share my live location
                    </p>
                    <p className="text-xs text-gray-600">
                      This updates <code>orders.customer_location</code> so admin/restaurant/driver can locate you.
                    </p>

                    <div className="mt-2 flex gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={requestLiveOnce}
                        disabled={!canShareLocation || locChecking}
                        className="px-3 py-2 rounded-lg bg-white border border-orange-200 hover:bg-orange-100 text-sm font-semibold disabled:opacity-60 inline-flex items-center gap-2"
                      >
                        {locChecking ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Updating…
                          </>
                        ) : (
                          <>
                            <LocateFixed className="w-4 h-4" />
                            Update once now
                          </>
                        )}
                      </button>

                      {(myLive || customerLoc)?.lat && (myLive || customerLoc)?.lng && (
                        <button
                          type="button"
                          onClick={() => openMaps(Number((myLive || customerLoc).lat), Number((myLive || customerLoc).lng))}
                          className="px-3 py-2 rounded-lg bg-white border border-orange-200 hover:bg-orange-100 text-sm font-semibold inline-flex items-center gap-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Open my location
                        </button>
                      )}
                    </div>

                    {shareLiveLocation && (myLive || customerLoc) && (
                      <p className="mt-2 text-xs text-gray-600">
                        Last update:{' '}
                        {new Date(String((myLive || customerLoc)?.updated_at || new Date().toISOString())).toLocaleTimeString()}
                      </p>
                    )}

                    {!canShareLocation && (
                      <p className="mt-2 text-xs text-gray-700">
                        Location sharing is disabled for delivered/cancelled orders.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-bold mb-3">Items</h3>
              <div className="space-y-3">
                {(order.items || []).map((it: any, idx: number) => (
                  <div key={it.id ?? `${it.name}-${idx}`} className="flex items-center justify-between text-sm">
                    <div className="flex-1 pr-3">
                      <p className="font-semibold text-gray-900">{it.name}</p>
                      <p className="text-xs text-gray-600">
                        ₹{Number(it.price || 0).toFixed(2)} × {it.quantity}
                      </p>
                    </div>
                    <p className="font-bold text-gray-900">
                      ₹{(Number(it.price || 0) * Number(it.quantity || 0)).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column: totals + restaurant contact */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold mb-4">Payment summary</h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold">₹{Number(order.subtotal || 0).toFixed(2)}</span>
                </div>

                {Number(order.discount || 0) > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Discount {order.promo_code ? `(${order.promo_code})` : ''}</span>
                    <span className="font-semibold">-₹{Number(order.discount || 0).toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery fee</span>
                  <span className="font-semibold">₹{Number(order.delivery_fee || 0).toFixed(2)}</span>
                </div>

                {order.delivery_distance_km != null && (
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Distance</span>
                    <span className="font-semibold">{Number(order.delivery_distance_km || 0).toFixed(2)} km</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-gray-600">GST (5%)</span>
                  <span className="font-semibold">₹{Number(order.tax || 0).toFixed(2)}</span>
                </div>

                <div className="border-t pt-3 flex justify-between">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-bold text-primary text-lg">₹{Number(order.total_amount || 0).toFixed(2)}</span>
                </div>

                <div className="pt-2 text-xs text-gray-600">
                  Method: <span className="font-semibold">{String(order.payment_method || '').toUpperCase()}</span>
                  <br />
                  Status: <span className="font-semibold">{String(order.payment_status || '').toUpperCase()}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                <Store className="w-5 h-5 text-primary" />
                Restaurant
              </h3>

              <p className="font-semibold text-gray-900">{order.merchants?.business_name || 'Restaurant'}</p>
              {order.merchants?.address && <p className="text-sm text-gray-600 mt-1">{order.merchants.address}</p>}

              <div className="mt-3 flex gap-2 flex-wrap">
                {merchantCoordsOk && (
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 font-semibold text-sm inline-flex items-center gap-2"
                    onClick={() => openMaps(Number(order.merchants!.latitude), Number(order.merchants!.longitude))}
                  >
                    <MapPin className="w-4 h-4" />
                    Open in Maps
                  </button>
                )}
              </div>

              <div className="mt-4 flex gap-2 flex-wrap">
                {order.merchants?.phone && (
                  <>
                    <a
                      className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 font-semibold text-sm inline-flex items-center gap-2"
                      href={`tel:${order.merchants.phone}`}
                    >
                      <Phone className="w-4 h-4" />
                      Call
                    </a>
                    <button
                      className="px-4 py-2 rounded-lg bg-green-100 hover:bg-green-200 text-green-800 font-semibold text-sm inline-flex items-center gap-2"
                      onClick={() => contactViaWhatsApp(order.merchants!.phone!, order.merchants!.business_name)}
                      type="button"
                    >
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Cancel modal */}
        {showCancelModal && (
          <>
            <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowCancelModal(false)} />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 p-6 mx-4">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Cancel this order?</h2>
              <p className="text-sm text-gray-600 mb-4">
                Please tell us why you are cancelling (this is shared with support/admin).
              </p>

              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason..."
                className="w-full min-h-[90px] border-2 border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary text-sm"
              />

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-semibold"
                >
                  Close
                </button>

                <button
                  onClick={handleCancelOrder}
                  disabled={cancelling}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {cancelling ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    'Cancel order'
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
