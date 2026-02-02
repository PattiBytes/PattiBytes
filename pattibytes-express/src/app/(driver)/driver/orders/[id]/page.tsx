/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { MapPin, Phone, Store, Truck, CheckCircle, RefreshCcw, X } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { logger } from '@/lib/logger';

type Merchant = {
  id: string;
  business_name?: string | null;
  address?: string | null;
  phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type Customer = { id: string; full_name?: string | null; phone?: string | null };

type LocationPayload = {
  lat: number;
  lng: number;
  accuracy?: number;
  updated_at: string;
};

type Order = {
  id: string;
  order_number: number | null;
  status: string | null;

  customer_id: string | null;
  merchant_id: string | null;
  driver_id: string | null;

  subtotal: number | null;
  delivery_fee: number | null;
  tax: number | null;
  discount: number | null;
  total_amount: number | null;

  payment_method: string | null;
  payment_status: string | null;

  delivery_address: string | null;
  customer_phone: string | null;

  created_at: string;
  updated_at: string | null;

  customer_location: any;
  driver_location: any;

  delivery_latitude?: number | null;
  delivery_longitude?: number | null;
};

export const ORDER_STATUSES = [
  'pending','confirmed','preparing','ready','assigned','picked_up','delivered','cancelled'
] as const;

const PAYMENT_STATUSES = ['pending', 'paid', 'failed'] as const;

const BOTTOM_NAV_PX = 96;

function money(n: any) {
  return `₹${Number(n || 0).toFixed(2)}`;
}

function normalizeStatus(v: any) {
  const s = String(v ?? '').trim().toLowerCase();
  if (s === 'pickedup' || s === 'picked up' || s === 'picked-up') return 'picked_up';
  return s.replace(/\s+/g, '_');
}


function parseLocation(v: any): LocationPayload | null {
  if (!v) return null;
  if (typeof v === 'object' && typeof v.lat === 'number' && typeof v.lng === 'number') return v as LocationPayload;
  if (typeof v === 'string') {
    try {
      const o = JSON.parse(v);
      if (o && typeof o.lat === 'number' && typeof o.lng === 'number') return o as LocationPayload;
    } catch {
      return null;
    }
  }
  return null;
}

function mapsLink(lat?: number | null, lng?: number | null) {
  if (lat == null || lng == null) return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function fmtTime(iso?: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return String(iso);
  }
}

function isCheckConstraintError(e: any) {
  const msg = String(e?.message || '').toLowerCase();
  return msg.includes('violates check constraint');
}

function LocationModal({
  open,
  onClose,
  driverLoc,
  customerLoc,
  onStart,
  onStop,
  isSharing,
}: {
  open: boolean;
  onClose: () => void;
  driverLoc: LocationPayload | null;
  customerLoc: LocationPayload | null;
  onStart: () => void;
  onStop: () => void;
  isSharing: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-end sm:items-center justify-center">
      <div
        className="w-full sm:max-w-xl bg-white rounded-t-2xl sm:rounded-2xl shadow-xl"
        style={{ paddingBottom: `calc(${BOTTOM_NAV_PX}px + env(safe-area-inset-bottom))` }}
      >
        <div className="p-4 border-b flex items-center justify-between">
          <div className="font-bold text-gray-900">Live Location</div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[70vh] overflow-auto">
          <div className="border rounded-lg p-4 bg-orange-50">
            <div className="font-semibold text-orange-900">Driver location</div>
            <div className="text-sm text-gray-800 mt-1">
              {driverLoc ? (
                <>
                  <div>Lat/Lng: {driverLoc.lat}, {driverLoc.lng}</div>
                  <div>Updated: {fmtTime(driverLoc.updated_at)}</div>
                  {typeof driverLoc.accuracy === 'number' ? <div>Accuracy: {Math.round(driverLoc.accuracy)}m</div> : null}
                  <a className="inline-block mt-2 text-primary font-semibold" target="_blank" rel="noreferrer" href={mapsLink(driverLoc.lat, driverLoc.lng)!}>
                    Open in Maps →
                  </a>
                </>
              ) : (
                <div>No driver location yet.</div>
              )}
            </div>
          </div>

          <div className="border rounded-lg p-4 bg-green-50">
            <div className="font-semibold text-green-900">Customer location</div>
            <div className="text-sm text-gray-800 mt-1">
              {customerLoc ? (
                <>
                  <div>Lat/Lng: {customerLoc.lat}, {customerLoc.lng}</div>
                  <div>Updated: {fmtTime(customerLoc.updated_at)}</div>
                  <a className="inline-block mt-2 text-primary font-semibold" target="_blank" rel="noreferrer" href={mapsLink(customerLoc.lat, customerLoc.lng)!}>
                    Open in Maps →
                  </a>
                </>
              ) : (
                <div>Customer hasn’t shared location.</div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            {!isSharing ? (
              <button onClick={onStart} className="flex-1 bg-primary text-white py-3 rounded-lg font-semibold">
                Start sharing
              </button>
            ) : (
              <button onClick={onStop} className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold">
                Stop sharing
              </button>
            )}
          </div>

          <p className="text-xs text-gray-600">
            Note: customer live location appears only if the customer app updates <code>orders.customer_location</code>.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function DriverOrderDetailsPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const orderId = String((params as any)?.id || '');

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);

  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);

  const [locOpen, setLocOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const lastSentAtRef = useRef<number>(0);

  const driverLoc = useMemo(() => parseLocation(order?.driver_location), [order?.driver_location]);
  const customerLoc = useMemo(() => parseLocation(order?.customer_location), [order?.customer_location]);

  useEffect(() => {
    if (!user?.id || !orderId) return;

    load();

    const ch = supabase
      .channel(`order-${orderId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, () => load())
      .subscribe();

    return () => {
      stopSharing();
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, orderId]);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();
      if (error) throw error;

      const o = (data as any) as Order | null;
      setOrder(o);
      if (!o) return;

      if (o.driver_id && o.driver_id !== user?.id) {
        toast.error('This order is not assigned to you.');
        router.push('/driver/orders');
        return;
      }

      const [mRes, cRes] = await Promise.all([
        o.merchant_id
          ? supabase.from('merchants').select('id,business_name,address,phone,latitude,longitude').eq('id', o.merchant_id).maybeSingle()
          : Promise.resolve({ data: null } as any),
        o.customer_id
          ? supabase.from('profiles').select('id,full_name,phone').eq('id', o.customer_id).maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);

      setMerchant((mRes.data as any) || null);
      setCustomer((cRes.data as any) || null);
    } catch (e: any) {
      logger.error('Order details load failed', e);
      toast.error(e?.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const startSharing = async () => {
    if (!user?.id || !order?.id) return;

    if (!navigator.geolocation) {
      toast.error('Geolocation not supported on this device.');
      return;
    }

    setSharing(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const now = Date.now();
        if (now - lastSentAtRef.current < 5000) return; // throttle
        lastSentAtRef.current = now;

        const payload: LocationPayload = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          updated_at: new Date().toISOString(),
        };

        try {
          const { error } = await supabase
            .from('orders')
            .update({ driver_location: payload as any, updated_at: new Date().toISOString() })
            .eq('id', order.id)
            .eq('driver_id', user.id);

          if (error) throw error;
        } catch (e: any) {
          logger.error('driver_location update failed', e);
          toast.error(e?.message || 'Failed to update live location');
          stopSharing();
        }
      },
      (err) => {
        toast.error(err.message || 'Location permission denied');
        stopSharing();
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
  };

  const stopSharing = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setSharing(false);
  };

  const updateOrder = async (patch: any) => {
    if (!user?.id || !order?.id) return;

    const { error } = await supabase
      .from('orders')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', order.id)
      .eq('driver_id', user.id);

    if (error) throw error;
  };

  const markPickedUp = async () => {
    try {
      await updateOrder({ status: 'picked_up' });
      toast.success('Marked picked up');
    } catch (e: any) {
      if (isCheckConstraintError(e)) {
        toast.error('DB constraint rejected this status. Run the SQL fix for orders_status_check.');
      } else {
        toast.error(e?.message || 'Failed to mark picked up');
      }
    }
  };

  const markDelivered = async () => {
    try {
      await updateOrder({
        status: 'delivered',
        payment_status: 'paid',
        actual_delivery_time: new Date().toISOString(),
      });
      toast.success('Delivered');
    } catch (e: any) {
      if (isCheckConstraintError(e)) {
        toast.error('DB constraint rejected status/payment. Run the SQL fix for orders_status_check / orders_payment_status_check.');
      } else {
        toast.error(e?.message || 'Failed to mark delivered');
      }
    }
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 py-10">Please login.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 py-8" style={{ paddingBottom: `calc(${BOTTOM_NAV_PX}px + env(safe-area-inset-bottom))` }}>
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order Details</h1>
            <div className="text-sm text-gray-600">
              <Link href="/driver/orders" className="text-primary font-semibold">← Back</Link>
            </div>
          </div>
          <button onClick={load} className="px-4 py-2 rounded-lg bg-gray-900 text-white flex items-center gap-2">
            <RefreshCcw size={16} />
            Refresh
          </button>
        </div>

        {loading || !order ? (
          <div className="bg-white rounded-xl shadow p-10 text-gray-600">Loading…</div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow p-5 mb-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm text-gray-600">Order</div>
                  <div className="text-xl font-bold text-gray-900">
                    #{order.order_number ?? order.id.slice(0, 8)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Created: {fmtTime(order.created_at)}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Total</div>
                  <div className="text-xl font-bold text-primary">{money(order.total_amount)}</div>
                  <div className="text-xs text-gray-700 mt-1">
                    Status: {normalizeStatus(order.status) || '—'}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 mb-4">
              <div className="bg-orange-50 border rounded-xl p-4">
                <div className="font-bold text-orange-900 flex items-center gap-2">
                  <Store size={18} /> Pickup (Merchant)
                </div>
                <div className="text-sm text-gray-800 mt-2">
                  <div className="font-semibold">{merchant?.business_name || 'Merchant'}</div>
                  <div className="text-gray-700">{merchant?.address || 'Address not available'}</div>
                  {merchant?.phone ? (
                    <a className="inline-flex items-center gap-2 mt-2 text-primary font-semibold" href={`tel:${merchant.phone}`}>
                      <Phone size={16} /> {merchant.phone}
                    </a>
                  ) : null}
                  {mapsLink(merchant?.latitude, merchant?.longitude) ? (
                    <a className="block mt-2 text-primary font-semibold" target="_blank" rel="noreferrer" href={mapsLink(merchant?.latitude, merchant?.longitude)!}>
                      Open pickup in Maps →
                    </a>
                  ) : null}
                </div>
              </div>

              <div className="bg-green-50 border rounded-xl p-4">
                <div className="font-bold text-green-900 flex items-center gap-2">
                  <MapPin size={18} /> Drop (Customer)
                </div>
                <div className="text-sm text-gray-800 mt-2">
                  <div className="font-semibold">{customer?.full_name || 'Customer'}</div>
                  <div className="text-gray-700">{order.delivery_address || 'No address provided'}</div>
                  {(order.customer_phone || customer?.phone) ? (
                    <a className="inline-flex items-center gap-2 mt-2 text-primary font-semibold" href={`tel:${order.customer_phone || customer?.phone}`}>
                      <Phone size={16} /> {order.customer_phone || customer?.phone}
                    </a>
                  ) : null}
                  {mapsLink(order.delivery_latitude, order.delivery_longitude) ? (
                    <a className="block mt-2 text-primary font-semibold" target="_blank" rel="noreferrer" href={mapsLink(order.delivery_latitude, order.delivery_longitude)!}>
                      Open drop in Maps →
                    </a>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-5 mb-4">
              <div className="font-bold text-gray-900 mb-2">Live location</div>
              <div className="text-sm text-gray-700">
                Driver: {driverLoc ? `updated ${fmtTime(driverLoc.updated_at)}` : 'not sharing'}
                <br />
                Customer: {customerLoc ? `updated ${fmtTime(customerLoc.updated_at)}` : 'not shared'}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <button onClick={() => setLocOpen(true)} className="flex-1 bg-gray-900 text-white py-3 rounded-lg font-semibold">
                  Open live location
                </button>

                <Link href="/driver/orders" className="flex-1 border py-3 rounded-lg font-semibold text-center hover:bg-gray-50">
                  Back to orders
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-5">
              <div className="font-bold text-gray-900 mb-3">Actions</div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={markPickedUp} className="flex-1 bg-primary text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2">
                  <Truck size={18} />
                  Mark picked up
                </button>
                <button onClick={markDelivered} className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2">
                  <CheckCircle size={18} />
                  Mark delivered
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-3">
                Allowed statuses: {ORDER_STATUSES.join(', ')}. Allowed payment statuses: {PAYMENT_STATUSES.join(', ')}.
              </p>
            </div>

            <LocationModal
              open={locOpen}
              onClose={() => setLocOpen(false)}
              driverLoc={driverLoc}
              customerLoc={customerLoc}
              onStart={startSharing}
              onStop={stopSharing}
              isSharing={sharing}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
