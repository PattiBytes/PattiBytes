/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import { Check, X, RefreshCcw, User, FileText } from 'lucide-react';

type DriverRow = {
  id: string; // profiles.id
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
    updated_at: string | null;
    created_at: string | null;
  } | null;
};

function isImageUrl(url?: string | null) {
  if (!url) return false;
  return /\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i.test(url);
}

export default function AdminDriversPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<DriverRow[]>([]);
  const [query, setQuery] = useState('');
  const [onlyPending, setOnlyPending] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      // Requires FK: driver_profiles.user_id -> profiles.id
      const { data, error } = await supabase
        .from('profiles')
        .select(
          `
          id,email,full_name,phone,role,
          approval_status,is_approved,profile_completed,is_active,
          created_at,updated_at,
          driver_profiles (
            vehicle_type,vehicle_number,license_number,license_expiry,
            profile_photo,vehicle_photo,license_photo,
            aadhar_number,aadhar_photo,
            rating,total_deliveries,earnings,created_at,updated_at
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
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (onlyPending && (r.approval_status || '').toLowerCase() !== 'pending') return false;
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
  }, [rows, query, onlyPending]);

  const setApproval = async (driverId: string, approve: boolean) => {
    try {
      const patch = approve
        ? { approval_status: 'approved', is_approved: true, updated_at: new Date().toISOString() }
        : { approval_status: 'rejected', is_approved: false, updated_at: new Date().toISOString() };

      const { error } = await supabase.from('profiles').update(patch).eq('id', driverId);
      if (error) throw error;

      toast.success(approve ? 'Driver approved' : 'Driver rejected');
      await load();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to update approval');
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-gray-600">
        Loading drivers…
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Drivers</h1>
          <p className="text-sm text-gray-600">Review documents and manage driver approvals.</p>
        </div>

        <button
          type="button"
          onClick={load}
          className="px-4 py-2 rounded-lg bg-gray-900 text-white flex items-center gap-2"
        >
          <RefreshCcw size={16} />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl shadow p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, phone, vehicle no, license no…"
          className="w-full sm:w-2/3 px-3 py-2 border rounded-lg"
        />
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={onlyPending}
            onChange={(e) => setOnlyPending(e.target.checked)}
          />
          Only pending
        </label>
      </div>

      <div className="space-y-4">
        {filtered.map((d) => {
          const dp = d.driver_profiles;
          const status = (d.approval_status || 'pending').toLowerCase();

          return (
            <div key={d.id} className="bg-white rounded-2xl shadow p-4 sm:p-6">
              <div className="flex flex-col lg:flex-row gap-4 lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <User size={18} className="text-gray-700" />
                    <h3 className="text-lg font-bold text-gray-900 truncate">
                      {d.full_name || 'Unnamed driver'}
                    </h3>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : status === 'rejected'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {status}
                    </span>
                  </div>

                  <div className="text-sm text-gray-600 mt-1">
                    {d.email || '—'} • {d.phone || '—'}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-sm">
                    <div className="p-3 rounded-xl bg-gray-50">
                      <div className="text-gray-500">Vehicle</div>
                      <div className="font-semibold text-gray-900">
                        {dp?.vehicle_type || '—'} • {dp?.vehicle_number || '—'}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50">
                      <div className="text-gray-500">License</div>
                      <div className="font-semibold text-gray-900">
                        {dp?.license_number || '—'}
                      </div>
                      <div className="text-gray-600 text-xs mt-1">
                        Expiry: {dp?.license_expiry || '—'}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50">
                      <div className="text-gray-500">Stats</div>
                      <div className="font-semibold text-gray-900">
                        Rating: {dp?.rating ?? 0} • Deliveries: {dp?.total_deliveries ?? 0}
                      </div>
                      <div className="text-gray-600 text-xs mt-1">
                        Earnings: ₹{dp?.earnings ?? 0}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setApproval(d.id, true)}
                    className="px-4 py-2 rounded-lg bg-green-600 text-white flex items-center gap-2"
                  >
                    <Check size={16} />
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setApproval(d.id, false)}
                    className="px-4 py-2 rounded-lg bg-red-600 text-white flex items-center gap-2"
                  >
                    <X size={16} />
                    Reject
                  </button>
                </div>
              </div>

              <div className="mt-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                  <FileText size={16} />
                  Documents
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <DocCard title="Profile photo" url={dp?.profile_photo || ''} />
                  <DocCard title="Vehicle photo" url={dp?.vehicle_photo || ''} />
                  <DocCard title="License photo" url={dp?.license_photo || ''} />
                  <DocCard title="Aadhar photo" url={dp?.aadhar_photo || ''} />
                </div>

                {dp?.aadhar_number ? (
                  <div className="text-xs text-gray-600 mt-3">
                    Aadhar number: {dp.aadhar_number}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-600 bg-white rounded-2xl shadow">
            No drivers found.
          </div>
        ) : null}
      </div>
    </div>
  );
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
