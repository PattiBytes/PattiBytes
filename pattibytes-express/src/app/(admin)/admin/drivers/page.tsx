/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import {
  Check,
  X,
  RefreshCcw,
  ExternalLink,
  PlusCircle,
  ShieldAlert,
  BadgeCheck,
  Ban,
  Search,
} from 'lucide-react';

import DashboardLayout from '@/components/layouts/DashboardLayout';
import BottomNav from '@/components/navigation/BottomNav';
import { useAuth } from '@/contexts/AuthContext';

type DriverProfilesRow = {
  vehicle_type: string | null;
  vehicle_number: string | null;
  license_number: string | null;
  license_expiry: string | null;

  is_available: boolean | null;
  is_verified: boolean | null;

  profile_photo: string | null;
  vehicle_photo: string | null;
  license_photo: string | null;
  aadhar_number: string | null;
  aadhar_photo: string | null;

  rating: number | null;
  total_deliveries: number | null;
  earnings: number | null;

  profile_completed: boolean | null;

  updated_at: string | null;
  created_at: string | null;
};

type DriverRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: string | null;

  avatar_url: string | null;

  approval_status: string | null;
  is_approved: boolean | null;
  profile_completed: boolean | null;
  is_active: boolean | null;

  cancelled_orders_count: number | null;
  is_trusted: boolean | null;
  trust_score: number | null;

  total_orders: number | null;
  completed_orders: number | null;
  cancelled_orders: number | null;
  last_order_date: string | null;

  account_status: string | null;

  created_at: string | null;
  updated_at: string | null;

  driver_profiles: DriverProfilesRow | null;
};

function isImageUrl(url?: string | null) {
  if (!url) return false;
  return /\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i.test(url);
}

const BOTTOM_NAV_PX = 96;

function normalizeStatus(v: any) {
  return String(v || '').trim().toLowerCase();
}

export default function AdminDriversPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [bootLoading, setBootLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<DriverRow[]>([]);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    async function gate() {
      if (!user?.id) {
        setAllowed(false);
        setBootLoading(false);
        router.push('/login');
        return;
      }

      const { data, error } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (error) {
        console.error('Admin gate failed', error);
        toast.error('Unable to verify admin access');
        setAllowed(false);
        setBootLoading(false);
        return;
      }

      const role = String((data as any)?.role || '').toLowerCase();
      const ok = role === 'admin' || role === 'superadmin';
      setAllowed(ok);
      setBootLoading(false);
      if (!ok) router.push('/');
    }

    gate();
  }, [user?.id, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(
          `
          id,email,full_name,phone,role,avatar_url,
          approval_status,is_approved,profile_completed,is_active,
          cancelled_orders_count,is_trusted,trust_score,
          total_orders,completed_orders,cancelled_orders,last_order_date,
          account_status,
          created_at,updated_at,
          driver_profiles (
            vehicle_type,vehicle_number,license_number,license_expiry,
            is_available,is_verified,
            profile_photo,vehicle_photo,license_photo,aadhar_number,aadhar_photo,
            rating,total_deliveries,earnings,profile_completed,
            created_at,updated_at
          )
        `
        )
        .eq('role', 'driver')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRows((data as any) || []);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to load drivers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!allowed) return;

    load();

    const ch1 = supabase
      .channel('admin-drivers-profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload: any) => {
        if (String(payload?.new?.role || '') === 'driver') load();
      })
      .subscribe();

    const ch2 = supabase
      .channel('admin-drivers-driver_profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_profiles' }, () => load())
      .subscribe();

    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  }, [allowed, load]);

  const stats = useMemo(() => {
    const s = { all: rows.length, pending: 0, approved: 0, rejected: 0 };
    for (const r of rows) {
      const st = normalizeStatus(r.approval_status);
      if (st === 'pending') s.pending++;
      else if (st === 'approved') s.approved++;
      else if (st === 'rejected') s.rejected++;
    }
    return s;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return rows.filter((r) => {
      const st = normalizeStatus(r.approval_status);
      if (tab !== 'all' && st !== tab) return false;

      if (!q) return true;

      const hay = [
        r.full_name,
        r.email,
        r.phone,
        r.driver_profiles?.vehicle_number,
        r.driver_profiles?.license_number,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return hay.includes(q);
    });
  }, [rows, query, tab]);

  const setApproval = async (driverId: string, next: 'approved' | 'rejected' | 'pending') => {
    setSavingId(driverId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          approval_status: next,
          is_approved: next === 'approved',
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', driverId);

      if (error) throw error;
      toast.success(`Driver ${next}`);
      load();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to update approval');
    } finally {
      setSavingId(null);
    }
  };

  const toggleActive = async (driverId: string, nextActive: boolean) => {
    setSavingId(driverId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: nextActive, updated_at: new Date().toISOString() } as any)
        .eq('id', driverId);

      if (error) throw error;
      toast.success(nextActive ? 'Driver activated' : 'Driver deactivated');
      load();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to update active status');
    } finally {
      setSavingId(null);
    }
  };

  const toggleVerified = async (driverId: string, nextVerified: boolean) => {
    setSavingId(driverId);
    try {
      const { error } = await supabase
        .from('driver_profiles')
        .update({ is_verified: nextVerified, updated_at: new Date().toISOString() } as any)
        .eq('user_id', driverId);

      if (error) throw error;
      toast.success(nextVerified ? 'Marked verified' : 'Marked unverified');
      load();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to update verification');
    } finally {
      setSavingId(null);
    }
  };

  if (bootLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto px-4 py-10 text-gray-600">Loading…</div>
      </DashboardLayout>
    );
  }

  if (!allowed) {
    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto px-4 py-10">
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
      <div
        className="max-w-6xl mx-auto px-4 py-6"
        style={{ paddingBottom: `calc(${BOTTOM_NAV_PX}px + env(safe-area-inset-bottom))` }}
      >
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Drivers</h1>
            <div className="text-sm text-gray-600">Approvals, verification, documents, activity.</div>
          </div>

          <div className="flex gap-2">
            <Link
              href="/admin/drivers/new"
              className="px-4 py-2 rounded-lg bg-primary text-white font-semibold inline-flex items-center gap-2"
            >
              <PlusCircle size={16} />
              New driver
            </Link>

            <button
              onClick={load}
              className="px-4 py-2 rounded-lg bg-gray-900 text-white font-semibold inline-flex items-center gap-2"
            >
              <RefreshCcw size={16} />
              Refresh
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow p-3 mb-4 flex flex-wrap gap-2">
          {(
            [
              ['all', `All (${stats.all})`],
              ['pending', `Pending (${stats.pending})`],
              ['approved', `Approved (${stats.approved})`],
              ['rejected', `Rejected (${stats.rejected})`],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-3 py-2 rounded-lg text-sm font-semibold border ${
                tab === k ? 'bg-orange-50 border-orange-200 text-primary' : 'hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow p-4 mb-4 flex gap-2 items-center">
          <Search className="text-gray-400" size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, phone, email, vehicle, license…"
            className="flex-1 px-2 py-1 outline-none"
          />
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow p-8 text-gray-600">Loading drivers…</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-gray-600">No drivers found.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => {
              const busy = savingId === r.id;
              const st = normalizeStatus(r.approval_status);
              const pending = st === 'pending';
              const avatar = r.avatar_url || r.driver_profiles?.profile_photo || null;

              return (
                <div key={r.id} className="bg-white rounded-xl shadow p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-full bg-gray-100 overflow-hidden flex-shrink-0 relative">
                      {isImageUrl(avatar) ? (
                        <Image
                          src={avatar!}
                          alt="avatar"
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      ) : null}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-bold text-gray-900 truncate">{r.full_name || '—'}</div>

                        <div className="text-xs px-2 py-0.5 rounded-full border">
                          {r.approval_status || '—'}
                        </div>

                        {!r.is_active ? (
                          <div className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                            Inactive
                          </div>
                        ) : null}

                        {r.driver_profiles?.is_verified ? (
                          <div className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 inline-flex items-center gap-1">
                            <BadgeCheck size={14} />
                            Verified
                          </div>
                        ) : null}
                      </div>

                      <div className="text-sm text-gray-600 mt-1">
                        {r.email || '—'} • {r.phone || '—'}
                      </div>

                      <div className="text-xs text-gray-500 mt-2 flex flex-wrap gap-4">
                        <span>Vehicle: {r.driver_profiles?.vehicle_number || '—'}</span>
                        <span>License: {r.driver_profiles?.license_number || '—'}</span>
                        <span>Completed: {r.profile_completed ? 'Yes' : 'No'}</span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link
                          href={`/admin/drivers/${r.id}`}
                          className="px-3 py-2 rounded-lg border hover:bg-gray-50 font-semibold text-sm"
                        >
                          View / Edit
                        </Link>

                        {r.driver_profiles?.license_photo ? (
                          <a
                            href={r.driver_profiles.license_photo}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-2 rounded-lg border hover:bg-gray-50 font-semibold text-sm inline-flex items-center gap-2"
                          >
                            License <ExternalLink size={14} />
                          </a>
                        ) : null}

                        {r.driver_profiles?.vehicle_photo ? (
                          <a
                            href={r.driver_profiles.vehicle_photo}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-2 rounded-lg border hover:bg-gray-50 font-semibold text-sm inline-flex items-center gap-2"
                          >
                            Vehicle <ExternalLink size={14} />
                          </a>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 w-[190px]">
                      {pending ? (
                        <>
                          <button
                            disabled={busy}
                            onClick={() => setApproval(r.id, 'approved')}
                            className="w-full px-3 py-2 rounded-lg bg-green-600 text-white font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            <Check size={16} /> Approve
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => setApproval(r.id, 'rejected')}
                            className="w-full px-3 py-2 rounded-lg bg-red-600 text-white font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            <X size={16} /> Reject
                          </button>
                        </>
                      ) : (
                        <button
                          disabled={busy}
                          onClick={() => setApproval(r.id, 'pending')}
                          className="w-full px-3 py-2 rounded-lg border font-semibold disabled:opacity-50"
                        >
                          Set pending
                        </button>
                      )}

                      <button
                        disabled={busy}
                        onClick={() => toggleActive(r.id, !r.is_active)}
                        className="w-full px-3 py-2 rounded-lg border font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2"
                      >
                        {r.is_active ? <Ban size={16} /> : <Check size={16} />}
                        {r.is_active ? 'Deactivate' : 'Activate'}
                      </button>

                      <button
                        disabled={busy}
                        onClick={() => toggleVerified(r.id, !(r.driver_profiles?.is_verified ?? false))}
                        className="w-full px-3 py-2 rounded-lg border font-semibold disabled:opacity-50"
                      >
                        {r.driver_profiles?.is_verified ? 'Unverify' : 'Verify'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav role={''} />
    </DashboardLayout>
  );
}
