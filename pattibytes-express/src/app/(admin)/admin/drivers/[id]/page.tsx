/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { Save, ShieldAlert, ExternalLink, RefreshCcw, CheckCircle } from 'lucide-react';

import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import ImageUpload from '@/components/common/ImageUpload';

type ProfileRow = any;
type DriverProfileRow = any;

type OrderRow = {
  id: string;
  order_number: number | null;
  status: string | null;
  payment_status: string | null;
  payment_method: string | null;
  total_amount: number | null;
  customer_id: string | null;
  merchant_id: string | null;
  created_at: string;
  updated_at: string | null;
};

const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'assigned',
  'picked_up',
  'delivered',
  'cancelled',
] as const;

const PAYMENT_STATUSES = ['pending', 'paid', 'failed'] as const;

function money(n: any) {
  return `₹${Number(n || 0).toFixed(2)}`;
}

function fmtTime(iso?: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(iso);
  }
}

function isCheckConstraintError(e: any) {
  const msg = String(e?.message || '').toLowerCase();
  return msg.includes('violates check constraint');
}

export default function AdminDriverEditPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const driverId = String((params as any)?.id || '');

  const [boot, setBoot] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [driver, setDriver] = useState<DriverProfileRow | null>(null);

  // Orders
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const canSave = useMemo(() => !!profile?.id && !saving, [profile?.id, saving]);

  useEffect(() => {
    async function gate() {
      if (!user?.id) {
        setAllowed(false);
        setBoot(false);
        router.push('/login');
        return;
      }

      const { data, error } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (error) {
        toast.error('Unable to verify admin access');
        setAllowed(false);
        setBoot(false);
        return;
      }

      const role = String((data as any)?.role || '').toLowerCase();
      const ok = role === 'admin' || role === 'superadmin';
      setAllowed(ok);
      setBoot(false);
      if (!ok) router.push('/');
    }

    gate();
  }, [user?.id]);

  useEffect(() => {
    if (!allowed || !driverId) return;

    loadAll();

    // Realtime: refresh orders when any order of this driver changes [web:115]
    const ch = supabase
      .channel(`admin-driver-orders-${driverId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `driver_id=eq.${driverId}` },
        () => loadOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [allowed, driverId]);

  const loadAll = async () => {
    await Promise.all([loadDriver(), loadOrders()]);
  };

  const loadDriver = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`*, driver_profiles (*)`)
        .eq('id', driverId)
        .maybeSingle();

      if (error) throw error;

      setProfile((data as any) || null);
      setDriver((data as any)?.driver_profiles || null);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to load driver');
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id,order_number,status,payment_status,payment_method,total_amount,customer_id,merchant_id,created_at,updated_at')
        .eq('driver_id', driverId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders((data as any) || []);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to load orders (check orders RLS)');
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const save = async () => {
    if (!profile?.id) return;

    setSaving(true);
    try {
      const now = new Date().toISOString();

      const { error: pErr } = await supabase
        .from('profiles')
        .update(
          {
            full_name: profile.full_name ?? null,
            phone: profile.phone ?? null,
            avatar_url: profile.avatar_url ?? null,

            approval_status: profile.approval_status ?? 'pending',
            is_approved: !!profile.is_approved,
            is_active: !!profile.is_active,

            address: profile.address ?? null,
            city: profile.city ?? null,
            state: profile.state ?? null,
            pincode: profile.pincode ?? null,
            latitude: profile.latitude ?? null,
            longitude: profile.longitude ?? null,

            cancelled_orders_count: Number(profile.cancelled_orders_count ?? 0),
            is_trusted: !!profile.is_trusted,
            trust_score: Number(profile.trust_score ?? 0),

            total_orders: Number(profile.total_orders ?? 0),
            completed_orders: Number(profile.completed_orders ?? 0),
            cancelled_orders: Number(profile.cancelled_orders ?? 0),
            last_order_date: profile.last_order_date ?? null,
            account_status: profile.account_status ?? 'active',

            updated_at: now,
          } as any
        )
        .eq('id', driverId);

      if (pErr) throw pErr;

      const dp = {
        user_id: driverId,
        vehicle_type: driver?.vehicle_type ?? null,
        vehicle_number: driver?.vehicle_number ?? null,
        license_number: driver?.license_number ?? null,
        license_expiry: driver?.license_expiry ?? null,

        is_available: !!driver?.is_available,
        is_verified: !!driver?.is_verified,

        rating: Number(driver?.rating ?? 0),
        total_deliveries: Number(driver?.total_deliveries ?? 0),
        earnings: Number(driver?.earnings ?? 0),

        aadhar_number: driver?.aadhar_number ?? null,
        aadhar_photo: driver?.aadhar_photo ?? null,
        profile_photo: driver?.profile_photo ?? null,
        vehicle_photo: driver?.vehicle_photo ?? null,
        license_photo: driver?.license_photo ?? null,

        profile_completed: !!driver?.profile_completed,
        updated_at: now,
      };

      const { error: dErr } = await supabase.from('driver_profiles').upsert(dp as any, { onConflict: 'user_id' });
      if (dErr) throw dErr;

      toast.success('Saved');
      await loadDriver();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const updateOrder = async (orderId: string, patch: any) => {
    setUpdatingOrderId(orderId);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ ...patch, updated_at: new Date().toISOString() } as any)
        .eq('id', orderId);

      if (error) throw error;

      toast.success('Order updated');
      loadOrders();
    } catch (e: any) {
      console.error(e);
      if (isCheckConstraintError(e)) {
        toast.error('DB constraint rejected this status/payment. Update the CHECK constraint to allow it.');
      } else {
        toast.error(e?.message || 'Failed to update order');
      }
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const setOrderStatus = async (o: OrderRow, nextStatus: string) => {
    // If delivered, also set paid + actual_delivery_time (same as driver page pattern)
    if (nextStatus === 'delivered') {
      await updateOrder(o.id, {
        status: 'delivered',
        payment_status: 'paid',
        actual_delivery_time: new Date().toISOString(),
      });
      return;
    }
    await updateOrder(o.id, { status: nextStatus });
  };

  if (boot) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 py-10 text-gray-600">Loading…</div>
      </DashboardLayout>
    );
  }

  if (!allowed) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 py-10">
          <div className="bg-white rounded-xl shadow p-6 flex items-start gap-3">
            <ShieldAlert className="text-red-600" />
            <div>
              <div className="font-bold text-gray-900">Access denied</div>
              <div className="text-sm text-gray-600">Admins/Superadmins only.</div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Driver</h1>
            <div className="text-sm text-gray-600">
              <Link href="/admin/drivers" className="text-primary font-semibold">
                ← Back to drivers
              </Link>
            </div>
          </div>

          <button
            onClick={save}
            disabled={!canSave}
            className="px-4 py-2 rounded-lg bg-primary text-white font-semibold disabled:opacity-50 inline-flex items-center gap-2"
          >
            <Save size={16} />
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        {loading || !profile ? (
          <div className="bg-white rounded-xl shadow p-8 text-gray-600">Loading driver…</div>
        ) : (
          <>
            {/* PROFILE (keep your existing UI exactly; trimmed here for brevity) */}
            <div className="bg-white rounded-xl shadow p-5 space-y-4">
              <div className="text-lg font-bold text-gray-900">Profile</div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-semibold text-gray-700">Email</div>
                  <div className="mt-1 text-gray-900">{profile.email || '—'}</div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Full name</label>
                  <input
                    className="w-full mt-1 border rounded-lg px-3 py-2"
                    value={profile.full_name ?? ''}
                    onChange={(e) => setProfile((p: any) => ({ ...p, full_name: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Phone</label>
                  <input
                    className="w-full mt-1 border rounded-lg px-3 py-2"
                    value={profile.phone ?? ''}
                    onChange={(e) => setProfile((p: any) => ({ ...p, phone: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Approval status</label>
                  <select
                    className="w-full mt-1 border rounded-lg px-3 py-2"
                    value={profile.approval_status ?? 'pending'}
                    onChange={(e) =>
                      setProfile((p: any) => ({
                        ...p,
                        approval_status: e.target.value,
                        is_approved: e.target.value === 'approved',
                      }))
                    }
                  >
                    <option value="pending">pending</option>
                    <option value="approved">approved</option>
                    <option value="rejected">rejected</option>
                  </select>
                </div>
              </div>
            </div>

            {/* DRIVER DOCS (your existing upload section can stay as-is) */}
            <div className="bg-white rounded-xl shadow p-5 space-y-4">
              <div className="text-lg font-bold text-gray-900">Driver profile & documents</div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2">Profile photo</div>
                  <div className="w-full h-44">
                    <ImageUpload
                      type="profile"
                      folder={`drivers/${driverId}/profile`}
                      currentImage={driver?.profile_photo || profile?.avatar_url || ''}
                      onUpload={(url) => {
                        setDriver((p: any) => ({ ...(p || {}), profile_photo: url }));
                        setProfile((p: any) => ({ ...(p || {}), avatar_url: url }));
                      }}
                      className="w-full h-full"
                    />
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2">License photo</div>
                  <div className="w-full h-44">
                    <ImageUpload
                      type="document"
                      folder={`drivers/${driverId}/documents`}
                      currentImage={driver?.license_photo || ''}
                      onUpload={(url) => setDriver((p: any) => ({ ...(p || {}), license_photo: url }))}
                      className="w-full h-full"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 text-sm">
                {driver?.license_photo ? (
                  <a className="text-primary font-semibold inline-flex items-center gap-2" target="_blank" rel="noreferrer" href={driver.license_photo}>
                    License link <ExternalLink size={14} />
                  </a>
                ) : null}
              </div>
            </div>

            {/* ORDERS */}
            <div className="bg-white rounded-xl shadow p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-lg font-bold text-gray-900">Orders</div>
                <button
                  onClick={loadOrders}
                  className="px-3 py-2 rounded-lg bg-gray-900 text-white font-semibold inline-flex items-center gap-2"
                >
                  <RefreshCcw size={16} />
                  Refresh
                </button>
              </div>

              {ordersLoading ? (
                <div className="text-gray-600">Loading orders…</div>
              ) : orders.length === 0 ? (
                <div className="text-gray-600">No orders for this driver yet.</div>
              ) : (
                <div className="space-y-3">
                  {orders.map((o) => {
                    const busy = updatingOrderId === o.id;
                    return (
                      <div key={o.id} className="border rounded-xl p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-bold text-gray-900">
                              #{o.order_number ?? o.id.slice(0, 8)}
                            </div>
                            <div className="text-xs text-gray-500">
                              Created: {fmtTime(o.created_at)} • Total: {money(o.total_amount)}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              Status: <span className="font-semibold">{o.status || '—'}</span> • Payment:{' '}
                              <span className="font-semibold">{o.payment_status || '—'}</span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              disabled={busy}
                              onClick={() => setOrderStatus(o, 'picked_up')}
                              className="px-3 py-2 rounded-lg bg-primary text-white font-semibold disabled:opacity-50"
                            >
                              Picked up
                            </button>
                            <button
                              disabled={busy}
                              onClick={() => setOrderStatus(o, 'delivered')}
                              className="px-3 py-2 rounded-lg bg-green-600 text-white font-semibold inline-flex items-center gap-2 disabled:opacity-50"
                            >
                              <CheckCircle size={16} />
                              Delivered
                            </button>
                          </div>
                        </div>

                        <div className="mt-3">
                          <label className="text-xs font-semibold text-gray-700">Set status</label>
                          <select
                            className="w-full mt-1 border rounded-lg px-3 py-2"
                            value={o.status ?? ''}
                            onChange={(e) => setOrderStatus(o, e.target.value)}
                            disabled={busy}
                          >
                            <option value="">—</option>
                            {ORDER_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>

                          <div className="mt-3">
                            <label className="text-xs font-semibold text-gray-700">Set payment status</label>
                            <select
                              className="w-full mt-1 border rounded-lg px-3 py-2"
                              value={o.payment_status ?? ''}
                              onChange={(e) => updateOrder(o.id, { payment_status: e.target.value })}
                              disabled={busy}
                            >
                              <option value="">—</option>
                              {PAYMENT_STATUSES.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="text-xs text-gray-500 mt-2">Order id: {o.id}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
