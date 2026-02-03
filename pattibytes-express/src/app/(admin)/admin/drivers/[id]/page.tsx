/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import { ArrowLeft, RefreshCcw, User, Package, MapPin, ExternalLink, Save } from 'lucide-react';

type LiveLocation = { lat: number; lng: number; accuracy?: number; updatedat: string };

type DriverDetail = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: string | null;
  approval_status: string | null;
  is_approved: boolean | null;
  profile_completed: boolean | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;

  // if you store “current location” on profiles
  latitude?: number | null;
  longitude?: number | null;

  driver_profiles: {
    vehicle_type: string | null;
    vehicle_number: string | null;
    license_number: string | null;
    license_expiry: string | null;
    profile_photo: string | null;
    vehicle_photo: string | null;
    license_photo: string | null;
    aadhar_number: string | null;
    aadhar_photo: string | null;
    rating: number | null;
    total_deliveries: number | null;
    earnings: number | null;
    is_available?: boolean | null;
    updated_at: string | null;
    created_at: string | null;
  } | null;
};

type OrderRow = {
  id: string;
  order_number: number | string;
  status: string | null;
  total_amount: number | null;
  created_at: string | null;
  delivery_address: string | null;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  driver_location: LiveLocation | null;
};

function mapsQuery(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export default function AdminDriverDetailPage() {
  const params = useParams();
  const router = useRouter();
  const driverId = String((params as any)?.id || '');

  const [tab, setTab] = useState<'profile' | 'orders' | 'location'>('profile');
  const [loading, setLoading] = useState(true);

  const [driver, setDriver] = useState<DriverDetail | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);

  const [savingToOrderId, setSavingToOrderId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!driverId) return;
    setLoading(true);
    try {
      const { data: d, error: e1 } = await supabase
        .from('profiles')
        .select(`
          id,email,full_name,phone,role,
          approval_status,is_approved,profile_completed,is_active,
          created_at,updated_at,
          latitude,longitude,
          driver_profiles (
            vehicle_type,vehicle_number,license_number,license_expiry,
            profile_photo,vehicle_photo,license_photo,
            aadhar_number,aadhar_photo,
            rating,total_deliveries,earnings,is_available,
            created_at,updated_at
          )
        `)
        .eq('id', driverId)
        .single();

      if (e1) throw e1;
      setDriver(d as any);

      const { data: o, error: e2 } = await supabase
        .from('orders')
        .select(`
          id,order_number,status,total_amount,created_at,
          delivery_address,delivery_latitude,delivery_longitude,
          driver_location
        `)
        .eq('driver_id', driverId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (e2) throw e2;
      setOrders((o as any) || []);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to load driver');
    } finally {
      setLoading(false);
    }
  };

  // Realtime refresh (optional but recommended)
  useEffect(() => {
    load();

    if (!driverId) return;
    const ch = supabase
      .channel(`admin-driver-${driverId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `driver_id=eq.${driverId}` },
        () => load()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${driverId}` },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverId]);

  const latestDriverLoc: LiveLocation | null = useMemo(() => {
    // Priority 1: location saved on profile
    const lat = Number(driver?.latitude);
    const lng = Number(driver?.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
      return { lat, lng, updatedat: driver?.updated_at || new Date().toISOString() };
    }

    // Priority 2: take latest order.driver_location
    for (const o of orders) {
      if (o?.driver_location?.lat && o?.driver_location?.lng) return o.driver_location;
    }
    return null;
  }, [driver?.latitude, driver?.longitude, driver?.updated_at, orders]);

  const saveDriverLocationToOrder = async () => {
    if (!savingToOrderId) return toast.error('Select an order first');
    if (!latestDriverLoc) return toast.error('Driver location not available');

    setSaving(true);
    try {
      const payload: LiveLocation = {
        lat: latestDriverLoc.lat,
        lng: latestDriverLoc.lng,
        accuracy: latestDriverLoc.accuracy,
        updatedat: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('orders')
        .update({ driver_location: payload })
        .eq('id', savingToOrderId);

      if (error) throw error;
      toast.success('Saved driver location into order');
      await load();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to save location');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-gray-600">Loading…</div>;
  if (!driver) return <div className="p-6 text-gray-600">Driver not found.</div>;

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => router.push('/admin/drivers')}
          className="text-sm text-gray-700 hover:text-gray-900 inline-flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <button
          type="button"
          onClick={load}
          className="px-4 py-2 rounded-lg bg-gray-900 text-white inline-flex items-center gap-2"
        >
          <RefreshCcw size={16} />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <User size={18} className="text-gray-700" />
              <h1 className="text-xl font-bold text-gray-900 truncate">
                {driver.full_name || 'Unnamed driver'}
              </h1>
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                {driver.approval_status || 'pending'}
              </span>
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {driver.email || '—'} • {driver.phone || '—'}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTab('profile')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold ${tab === 'profile' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}
            >
              Profile
            </button>
            <button
              type="button"
              onClick={() => setTab('orders')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold ${tab === 'orders' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}
            >
              Orders
            </button>
            <button
              type="button"
              onClick={() => setTab('location')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold ${tab === 'location' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}
            >
              Location
            </button>
          </div>
        </div>
      </div>

      {tab === 'profile' ? (
        <div className="bg-white rounded-2xl shadow p-4 sm:p-6 space-y-4">
          <div className="text-sm font-bold text-gray-900">Documents</div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <DocCard title="Profile photo" url={driver.driver_profiles?.profile_photo || ''} />
            <DocCard title="Vehicle photo" url={driver.driver_profiles?.vehicle_photo || ''} />
            <DocCard title="License photo" url={driver.driver_profiles?.license_photo || ''} />
            <DocCard title="Aadhar photo" url={driver.driver_profiles?.aadhar_photo || ''} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm pt-2">
            <div className="p-3 rounded-xl bg-gray-50">
              <div className="text-gray-500">Vehicle</div>
              <div className="font-semibold text-gray-900">
                {driver.driver_profiles?.vehicle_type || '—'} • {driver.driver_profiles?.vehicle_number || '—'}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-gray-50">
              <div className="text-gray-500">License</div>
              <div className="font-semibold text-gray-900">
                {driver.driver_profiles?.license_number || '—'}
              </div>
              <div className="text-gray-600 text-xs mt-1">
                Expiry: {driver.driver_profiles?.license_expiry || '—'}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-gray-50">
              <div className="text-gray-500">Stats</div>
              <div className="font-semibold text-gray-900">
                Rating: {driver.driver_profiles?.rating ?? 0} • Deliveries: {driver.driver_profiles?.total_deliveries ?? 0}
              </div>
              <div className="text-gray-600 text-xs mt-1">
                Earnings: ₹{driver.driver_profiles?.earnings ?? 0}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'orders' ? (
        <div className="bg-white rounded-2xl shadow p-4 sm:p-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <Package size={16} />
            Latest orders (last 50)
          </div>

          {orders.length === 0 ? (
            <div className="text-sm text-gray-600">No orders found for this driver.</div>
          ) : (
            <div className="space-y-2">
              {orders.map((o) => (
                <div key={o.id} className="border rounded-xl p-3 flex items-start justify-between gap-3 flex-col sm:flex-row">
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900">
                      Order #{o.order_number} • {o.status || '—'}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {o.created_at ? new Date(o.created_at).toLocaleString('en-IN') : '—'}
                      {typeof o.total_amount === 'number' ? ` • ₹${o.total_amount}` : ''}
                    </div>
                    <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {o.delivery_address || '—'}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="px-3 py-2 rounded-lg bg-gray-100 text-gray-900 text-sm font-semibold"
                    >
                      Open
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {tab === 'location' ? (
        <div className="bg-white rounded-2xl shadow p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <MapPin size={16} />
            Live location
          </div>

          {!latestDriverLoc ? (
            <div className="text-sm text-gray-600">
              Driver location not available yet. (Driver app must push it to DB.)
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3 flex-col sm:flex-row">
              <div className="text-sm text-gray-800">
                <div className="font-semibold">
                  {latestDriverLoc.lat}, {latestDriverLoc.lng}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Updated: {latestDriverLoc.updatedat ? new Date(latestDriverLoc.updatedat).toLocaleString('en-IN') : '—'}
                </div>
              </div>

              <a
                href={mapsQuery(latestDriverLoc.lat, latestDriverLoc.lng)}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 rounded-lg bg-gray-100 text-gray-900 text-sm font-semibold inline-flex items-center gap-2"
              >
                <ExternalLink size={16} />
                Open in Maps
              </a>
            </div>
          )}

          <div className="border rounded-xl p-3 bg-gray-50 space-y-3">
            <div className="text-sm font-semibold text-gray-900">
              Save current driver location into an order
            </div>

            <div className="flex gap-2 flex-col sm:flex-row">
              <select
                value={savingToOrderId}
                onChange={(e) => setSavingToOrderId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-white"
              >
                <option value="">Select order…</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    #{o.order_number} ({o.status || '—'})
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={saving || !savingToOrderId}
                onClick={saveDriverLocationToOrder}
                className="px-4 py-2 rounded-lg bg-gray-900 text-white inline-flex items-center gap-2 disabled:opacity-60"
              >
                <Save size={16} />
                Save
              </button>
            </div>

            <div className="text-xs text-gray-600">
              This writes to <code>orders.driver_location</code> using the same JSON “live location” style you already use elsewhere. [file:207]
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function isImageUrl(url?: string | null) {
  if (!url) return false;
  return /\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i.test(url);
}

function DocCard({ title, url }: { title: string; url: string }) {
  return (
    <div className="border rounded-xl p-3 bg-gray-50">
      <div className="text-sm font-semibold text-gray-900 mb-2">{title}</div>

      {!url ? (
        <div className="text-xs text-gray-500">Not uploaded</div>
      ) : isImageUrl(url) ? (
        <div className="relative w-full h-44 rounded-lg overflow-hidden bg-white border">
          <Image src={url} alt={title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
        </div>
      ) : (
        <a className="text-sm text-blue-600 underline" href={url} target="_blank" rel="noreferrer">
          Open document
        </a>
      )}

      {!!url && (
        <div className="mt-2">
          <a className="text-xs text-blue-600 underline" href={url} target="_blank" rel="noreferrer">
            View full size
          </a>
        </div>
      )}
    </div>
  );
}
