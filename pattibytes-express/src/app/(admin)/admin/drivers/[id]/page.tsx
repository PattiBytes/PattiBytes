/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import {
  Save,
  ShieldAlert,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ExternalLink,
  RefreshCcw,
  CheckCircle,
  User,
  FileText,
  Package,
  MapPin,
  Phone,
  Mail,
  Calendar,
  TrendingUp,
  Award,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Truck,
  CreditCard,
  Eye,
  Shield,
  Activity,
} from 'lucide-react';

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

// Enhanced Status Badge Component
function StatusBadge({ status }: { status: string | null }) {
  const s = String(status || '').toLowerCase();

  const configs: Record<string, { bg: string; text: string; border: string; icon?: any }> = {
    pending: { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-200', icon: Clock },
    approved: { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200', icon: CheckCircle2 },
    rejected: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200', icon: XCircle },
    confirmed: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200', icon: CheckCircle },
    preparing: { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200', icon: Activity },
    ready: { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200', icon: Package },
    assigned: { bg: 'bg-cyan-50', text: 'text-cyan-800', border: 'border-cyan-200', icon: User },
    picked_up: { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200', icon: Truck },
    delivered: { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200', icon: CheckCircle },
    cancelled: { bg: 'bg-gray-50', text: 'text-gray-800', border: 'border-gray-200', icon: XCircle },
    paid: { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200', icon: CheckCircle },
    failed: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200', icon: XCircle },
  };

  const config = configs[s] || { bg: 'bg-gray-50', text: 'text-gray-800', border: 'border-gray-200' };
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}
    >
      {Icon && <Icon size={12} />}
      {status || '—'}
    </span>
  );
}

// Quick Stat Card Component
function StatCard({ icon: Icon, label, value, color = 'primary' }: any) {
  const configs: Record<string, { bg: string; text: string; iconBg: string }> = {
    primary: { bg: 'bg-gradient-to-br from-orange-50 to-orange-100', text: 'text-primary', iconBg: 'bg-primary/10' },
    green: { bg: 'bg-gradient-to-br from-green-50 to-green-100', text: 'text-green-600', iconBg: 'bg-green-600/10' },
    blue: { bg: 'bg-gradient-to-br from-blue-50 to-blue-100', text: 'text-blue-600', iconBg: 'bg-blue-600/10' },
    purple: { bg: 'bg-gradient-to-br from-purple-50 to-purple-100', text: 'text-purple-600', iconBg: 'bg-purple-600/10' },
  };

  const config = configs[color] || configs.primary;

  return (
    <div className={`${config.bg} rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1`}>
      <div className={`w-12 h-12 rounded-xl ${config.iconBg} flex items-center justify-center mb-3`}>
        <Icon size={24} className={config.text} />
      </div>
      <div className={`text-3xl font-bold ${config.text} mb-1`}>{value}</div>
      <div className="text-sm text-gray-600 font-medium">{label}</div>
    </div>
  );
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

  const [ordersLoading, setOrdersLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const canSave = useMemo(() => !!profile?.id && !saving, [profile?.id, saving]);

  // Calculate order stats BEFORE any conditional returns
  const orderStats = useMemo(() => {
    const delivered = orders.filter((o) => o.status === 'delivered').length;
    const pending = orders.filter((o) => o.status === 'pending' || o.status === 'assigned').length;
    const totalEarnings = orders
      .filter((o) => o.payment_status === 'paid')
      .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    return { delivered, pending, totalEarnings, total: orders.length };
  }, [orders]);

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
  }, [user?.id, router]);

  useEffect(() => {
    if (!allowed || !driverId) return;

    loadAll();

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
        .select(
          'id,order_number,status,payment_status,payment_method,total_amount,customer_id,merchant_id,created_at,updated_at'
        )
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

      toast.success('✅ Changes saved successfully');
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

  const quickApprove = async () => {
    if (!profile?.id) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();

      await supabase
        .from('profiles')
        .update({
          approval_status: 'approved',
          is_approved: true,
          is_active: true,
          updated_at: now,
        } as any)
        .eq('id', driverId);

      await supabase
        .from('driver_profiles')
        .update({
          is_verified: true,
          updated_at: now,
        } as any)
        .eq('user_id', driverId);

      toast.success('🎉 Driver approved, verified & activated');
      await loadDriver();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to approve');
    } finally {
      setSaving(false);
    }
  };

  if (boot) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-gray-200 rounded-lg w-1/3"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!allowed) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-200 rounded-2xl shadow-lg p-8 flex items-start gap-4">
            <div className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="text-white" size={28} />
            </div>
            <div>
              <div className="font-bold text-red-900 text-2xl mb-2">Access Denied</div>
              <div className="text-red-700">This page is restricted to Admins and Superadmins only.</div>
              <Link
                href="/admin/dashboard"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
              >
                ← Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 py-6 lg:py-8 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-gradient-to-r from-gray-50 to-white p-6 rounded-2xl border border-gray-200">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-orange-600 rounded-xl flex items-center justify-center">
                <User className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Driver Profile</h1>
                <div className="flex items-center gap-2 mt-1">
                  {profile?.is_approved ? (
                    <span className="text-green-600 font-semibold text-sm flex items-center gap-1">
                      <CheckCircle2 size={16} />
                      Approved
                    </span>
                  ) : (
                    <span className="text-yellow-600 font-semibold text-sm flex items-center gap-1">
                      <AlertCircle size={16} />
                      Pending Approval
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Link
                href="/admin/drivers"
                className="text-primary font-semibold hover:underline inline-flex items-center gap-1"
              >
                ← Back to drivers
              </Link>
              <span className="text-gray-400">•</span>
              <span className="text-gray-600 font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                ID: {driverId.slice(0, 8)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {profile?.approval_status !== 'approved' && (
              <button
                onClick={quickApprove}
                disabled={saving}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold hover:from-green-700 hover:to-green-800 disabled:opacity-50 inline-flex items-center gap-2 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Shield size={18} />
                Quick Approve
              </button>
            )}

            <button
              onClick={save}
              disabled={!canSave}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-primary to-orange-600 text-white font-semibold hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 inline-flex items-center gap-2 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Save size={18} />
              {saving ? 'Saving…' : 'Save Changes'}
            </button>

            <button
              onClick={loadAll}
              className="px-5 py-3 rounded-xl bg-gray-900 text-white font-semibold hover:bg-gray-800 inline-flex items-center gap-2 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <RefreshCcw size={18} className={loading || ordersLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {loading || !profile ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-16 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <div className="text-gray-600 font-medium">Loading driver profile…</div>
          </div>
        ) : (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={Package} label="Total Orders" value={orderStats.total} color="primary" />
              <StatCard icon={CheckCircle} label="Delivered" value={orderStats.delivered} color="green" />
              <StatCard icon={Clock} label="Pending" value={orderStats.pending} color="blue" />
              <StatCard icon={TrendingUp} label="Total Earnings" value={money(orderStats.totalEarnings)} color="green" />
            </div>

            {/* Profile Section */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 border-b border-blue-700">
                <div className="flex items-center gap-3 text-white">
                  <User size={22} />
                  <h2 className="text-xl font-bold">Personal Information</h2>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="md:col-span-1">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                      <Mail size={16} className="text-primary" />
                      Email Address
                    </label>
                    <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-300 rounded-xl text-gray-900 font-medium flex items-center gap-2">
                      <Mail size={16} className="text-gray-500" />
                      {profile.email || '—'}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                      <User size={16} className="text-primary" />
                      Full Name
                    </label>
                    <input
                      className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                      value={profile.full_name ?? ''}
                      onChange={(e) => setProfile((p: any) => ({ ...p, full_name: e.target.value }))}
                      placeholder="Enter full name"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                      <Phone size={16} className="text-primary" />
                      Phone Number
                    </label>
                    <input
                      className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                      value={profile.phone ?? ''}
                      onChange={(e) => setProfile((p: any) => ({ ...p, phone: e.target.value }))}
                      placeholder="10-digit mobile"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">Approval Status</label>
                    <select
                      className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary transition-all font-semibold"
                      value={profile.approval_status ?? 'pending'}
                      onChange={(e) =>
                        setProfile((p: any) => ({
                          ...p,
                          approval_status: e.target.value,
                          is_approved: e.target.value === 'approved',
                        }))
                      }
                    >
                      <option value="pending">⏳ Pending</option>
                      <option value="approved">✅ Approved</option>
                      <option value="rejected">❌ Rejected</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                      <Award size={16} className="text-primary" />
                      Trust Score
                    </label>
                    <input
                      className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                      type="number"
                      min="0"
                      max="100"
                      value={Number(profile.trust_score ?? 0)}
                      onChange={(e) => setProfile((p: any) => ({ ...p, trust_score: Number(e.target.value) }))}
                    />
                  </div>

                  <div className="flex items-end">
                    <label className="flex items-center gap-3 border-2 border-gray-300 rounded-xl px-4 py-3 cursor-pointer hover:bg-gray-50 transition-all w-full group">
                      <input
                        type="checkbox"
                        checked={!!profile.is_active}
                        onChange={(e) => setProfile((p: any) => ({ ...p, is_active: e.target.checked }))}
                        className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
                      />
                      <span className="font-semibold text-gray-700 group-hover:text-primary transition-colors">
                        Active
                      </span>
                    </label>
                  </div>

                  <div className="flex items-end">
                    <label className="flex items-center gap-3 border-2 border-gray-300 rounded-xl px-4 py-3 cursor-pointer hover:bg-gray-50 transition-all w-full group">
                      <input
                        type="checkbox"
                        checked={!!profile.is_trusted}
                        onChange={(e) => setProfile((p: any) => ({ ...p, is_trusted: e.target.checked }))}
                        className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
                      />
                      <span className="font-semibold text-gray-700 group-hover:text-primary transition-colors">
                        Trusted
                      </span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                      <MapPin size={16} className="text-primary" />
                      Address
                    </label>
                    <input
                      className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                      value={profile.address ?? ''}
                      onChange={(e) => setProfile((p: any) => ({ ...p, address: e.target.value }))}
                      placeholder="Full address"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-2 block">City</label>
                      <input
                        className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        value={profile.city ?? ''}
                        onChange={(e) => setProfile((p: any) => ({ ...p, city: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-2 block">State</label>
                      <input
                        className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        value={profile.state ?? ''}
                        onChange={(e) => setProfile((p: any) => ({ ...p, state: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-2 block">Pincode</label>
                      <input
                        className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        value={profile.pincode ?? ''}
                        onChange={(e) => setProfile((p: any) => ({ ...p, pincode: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Driver Details & Documents */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4 border-b border-purple-700">
                <div className="flex items-center gap-3 text-white">
                  <Truck size={22} />
                  <h2 className="text-xl font-bold">Driver & Vehicle Details</h2>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">Vehicle Type</label>
                    <select
                      className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary transition-all font-semibold"
                      value={driver?.vehicle_type ?? ''}
                      onChange={(e) => setDriver((p: any) => ({ ...(p || {}), vehicle_type: e.target.value }))}
                    >
                      <option value="">Select...</option>
                      <option value="bike">🏍️ Bike</option>
                      <option value="car">🚗 Car</option>
                      <option value="van">🚐 Van</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">Vehicle Number</label>
                    <input
                      className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 uppercase focus:ring-2 focus:ring-primary focus:border-primary transition-all font-mono font-bold"
                      value={driver?.vehicle_number ?? ''}
                      onChange={(e) =>
                        setDriver((p: any) => ({ ...(p || {}), vehicle_number: e.target.value.toUpperCase() }))
                      }
                      placeholder="PB02AB1234"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">License Number</label>
                    <input
                      className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 uppercase focus:ring-2 focus:ring-primary focus:border-primary transition-all font-mono font-bold"
                      value={driver?.license_number ?? ''}
                      onChange={(e) =>
                        setDriver((p: any) => ({ ...(p || {}), license_number: e.target.value.toUpperCase() }))
                      }
                      placeholder="DL1234567890"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                      <Calendar size={16} className="text-primary" />
                      License Expiry
                    </label>
                    <input
                      className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                      type="date"
                      value={(driver?.license_expiry ?? '').slice(0, 10)}
                      onChange={(e) => setDriver((p: any) => ({ ...(p || {}), license_expiry: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">Aadhaar Number</label>
                    <input
                      className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary transition-all font-mono"
                      value={driver?.aadhar_number ?? ''}
                      onChange={(e) => setDriver((p: any) => ({ ...(p || {}), aadhar_number: e.target.value }))}
                      placeholder="1234 5678 9012"
                      maxLength={12}
                    />
                  </div>

                  <div className="flex items-end">
                    <label className="flex items-center gap-3 border-2 border-gray-300 rounded-xl px-4 py-3 cursor-pointer hover:bg-gray-50 transition-all w-full group">
                      <input
                        type="checkbox"
                        checked={!!driver?.is_available}
                        onChange={(e) => setDriver((p: any) => ({ ...(p || {}), is_available: e.target.checked }))}
                        className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-600"
                      />
                      <span className="font-semibold text-gray-700 group-hover:text-primary transition-colors">
                        Available
                      </span>
                    </label>
                  </div>

                  <div className="flex items-end">
                    <label className="flex items-center gap-3 border-2 border-gray-300 rounded-xl px-4 py-3 cursor-pointer hover:bg-gray-50 transition-all w-full group">
                      <input
                        type="checkbox"
                        checked={!!driver?.is_verified}
                        onChange={(e) => setDriver((p: any) => ({ ...(p || {}), is_verified: e.target.checked }))}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-600"
                      />
                      <span className="font-semibold text-gray-700 group-hover:text-primary transition-colors">
                        Verified
                      </span>
                    </label>
                  </div>

                  <div className="flex items-end">
                    <label className="flex items-center gap-3 border-2 border-gray-300 rounded-xl px-4 py-3 cursor-pointer hover:bg-gray-50 transition-all w-full group">
                      <input
                        type="checkbox"
                        checked={!!driver?.profile_completed}
                        onChange={(e) =>
                          setDriver((p: any) => ({ ...(p || {}), profile_completed: e.target.checked }))
                        }
                        className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-600"
                      />
                      <span className="font-semibold text-gray-700 group-hover:text-primary transition-colors">
                        Profile Complete
                      </span>
                    </label>
                  </div>
                </div>

                <div className="border-t-2 border-dashed border-gray-300 pt-6">
                  <h3 className="font-bold text-gray-900 mb-5 flex items-center gap-2 text-lg">
                    <FileText size={20} className="text-primary" />
                    Document Uploads
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {[
                      {
                        label: 'Profile Photo',
                        type: 'profile',
                        folder: `drivers/${driverId}/profile`,
                        current: driver?.profile_photo || profile?.avatar_url || '',
                        onUpload: (url: string) => {
                          setDriver((p: any) => ({ ...(p || {}), profile_photo: url }));
                          setProfile((p: any) => ({ ...(p || {}), avatar_url: url }));
                        },
                        link: driver?.profile_photo,
                      },
                      {
                        label: 'Vehicle Photo',
                        type: 'document',
                        folder: `drivers/${driverId}/documents`,
                        current: driver?.vehicle_photo || '',
                        onUpload: (url: string) => setDriver((p: any) => ({ ...(p || {}), vehicle_photo: url })),
                        link: driver?.vehicle_photo,
                      },
                      {
                        label: 'License Photo',
                        type: 'document',
                        folder: `drivers/${driverId}/documents`,
                        current: driver?.license_photo || '',
                        onUpload: (url: string) => setDriver((p: any) => ({ ...(p || {}), license_photo: url })),
                        link: driver?.license_photo,
                      },
                      {
                        label: 'Aadhaar Photo',
                        type: 'document',
                        folder: `drivers/${driverId}/documents`,
                        current: driver?.aadhar_photo || '',
                        onUpload: (url: string) => setDriver((p: any) => ({ ...(p || {}), aadhar_photo: url })),
                        link: driver?.aadhar_photo,
                      },
                    ].map((doc) => (
                      <div key={doc.label}>
                        <div className="text-sm font-semibold text-gray-700 mb-2">{doc.label}</div>
                        <div className="relative group">
                          <div className="w-full h-48 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 hover:border-primary transition-all">
                            <ImageUpload
                              type={doc.type as any}
                              folder={doc.folder}
                              currentImage={doc.current}
                              onUpload={doc.onUpload}
                              className="w-full h-full"
                            />
                          </div>
                          {doc.link && (
                            <a
                              href={doc.link}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 text-xs text-primary font-semibold inline-flex items-center gap-1 hover:underline"
                            >
                              <Eye size={12} />
                              View full size
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Orders Section */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4 border-b border-green-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-white">
                    <Package size={22} />
                    <h2 className="text-xl font-bold">Order History ({orders.length})</h2>
                  </div>
                  <button
                    onClick={loadOrders}
                    disabled={ordersLoading}
                    className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-semibold inline-flex items-center gap-2 transition-all backdrop-blur-sm disabled:opacity-50"
                  >
                    <RefreshCcw size={16} className={ordersLoading ? 'animate-spin' : ''} />
                    Refresh
                  </button>
                </div>
              </div>

              <div className="p-6">
                {ordersLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                    <div className="text-gray-600 font-medium">Loading orders…</div>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Package size={40} className="text-gray-400" />
                    </div>
                    <div className="text-gray-900 font-bold text-lg mb-2">No Orders Yet</div>
                    <div className="text-gray-500">Orders will appear here once assigned to this driver</div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((o) => {
                      const busy = updatingOrderId === o.id;
                      return (
                        <div
                          key={o.id}
                          className="border-2 border-gray-200 rounded-2xl p-6 hover:shadow-xl transition-all bg-gradient-to-r from-white to-gray-50 hover:border-primary"
                        >
                          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center gap-3 flex-wrap">
                                <div className="text-2xl font-bold text-gray-900">
                                  #{o.order_number ?? o.id.slice(0, 8)}
                                </div>
                                <StatusBadge status={o.status} />
                                <StatusBadge status={o.payment_status} />
                              </div>

                              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg">
                                  <Clock size={14} />
                                  <span className="font-medium">{fmtTime(o.created_at)}</span>
                                </div>
                                <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg">
                                  <CreditCard size={14} />
                                  <span className="font-medium uppercase">{o.payment_method || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-2 bg-green-100 px-3 py-1.5 rounded-lg text-green-700">
                                  <TrendingUp size={14} />
                                  <span className="font-bold">{money(o.total_amount)}</span>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <button
                                  disabled={busy}
                                  onClick={() => setOrderStatus(o, 'picked_up')}
                                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-orange-700 text-white font-semibold hover:from-orange-700 hover:to-orange-800 disabled:opacity-50 inline-flex items-center gap-2 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                                >
                                  <Truck size={16} />
                                  Picked Up
                                </button>
                                <button
                                  disabled={busy}
                                  onClick={() => setOrderStatus(o, 'delivered')}
                                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold hover:from-green-700 hover:to-green-800 disabled:opacity-50 inline-flex items-center gap-2 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                                >
                                  <CheckCircle size={16} />
                                  Delivered
                                </button>
                                <button
                                  disabled={busy}
                                  onClick={() => setOrderStatus(o, 'cancelled')}
                                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold hover:from-red-700 hover:to-red-800 disabled:opacity-50 inline-flex items-center gap-2 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                                >
                                  <XCircle size={16} />
                                  Cancel
                                </button>
                              </div>
                            </div>

                            <div className="lg:w-80 space-y-3">
                              <div>
                                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2 block">
                                  Order Status
                                </label>
                                <select
                                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all font-semibold"
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
                              </div>

                              <div>
                                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2 block">
                                  Payment Status
                                </label>
                                <select
                                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all font-semibold"
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
                          </div>

                          <div className="text-xs text-gray-400 mt-4 pt-4 border-t border-gray-200 font-mono">
                            Order ID: {o.id}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
