/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { Copy, RefreshCcw } from 'lucide-react';

import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';

function genPassword(len = 12) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$%';
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

export default function AdminCreateDriverPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [allowed, setAllowed] = useState(false);
  const [boot, setBoot] = useState(true);

  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');

  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
  });

  const [createdPassword, setCreatedPassword] = useState<string | null>(null);

  useEffect(() => {
    async function gate() {
      if (!user?.id) {
        setAllowed(false);
        setBoot(false);
        router.push('/login');
        return;
      }
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      const role = String((data as any)?.role || '').toLowerCase();
      const ok = role === 'admin' || role === 'superadmin';
      setAllowed(ok);
      setBoot(false);
      if (!ok) router.push('/');
    }
    gate();
  }, [user?.id, router]);

  useEffect(() => {
    // when switching to auto, generate a password immediately for visibility
    if (mode === 'auto') {
      setForm((p) => ({ ...p, password: p.password?.trim() ? p.password : genPassword(12) }));
    }
  }, [mode]);

  const canSubmit = useMemo(() => {
    if (!form.email.trim()) return false;
    if (mode === 'manual' && (!form.password.trim() || form.password.trim().length < 6)) return false;
    if (mode === 'auto' && (!form.password.trim() || form.password.trim().length < 6)) return false;
    return true;
  }, [form, mode]);

  const copyText = async (t: string) => {
    try {
      await navigator.clipboard.writeText(t);
      toast.success('Copied');
    } catch {
      toast.error('Copy failed (browser blocked)');
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSaving(true);
    setCreatedPassword(null);

    try {
      const { data: sessionRes } = await supabase.auth.getSession();
      const token = sessionRes?.session?.access_token;
      if (!token) throw new Error('Session expired. Please login again.');

      const res = await fetch('/api/admin/drivers/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: form.email.trim(),
          password: mode === 'manual' ? form.password.trim() : form.password.trim(), // send generated
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Failed to create driver');

      if (data?.password) setCreatedPassword(String(data.password));

      toast.success('Driver created');
      router.push(`/admin/drivers/${data.id}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Failed to create driver');
    } finally {
      setSaving(false);
    }
  };

  if (boot) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto px-4 py-10 text-gray-600">Loading…</div>
      </DashboardLayout>
    );
  }

  if (!allowed) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto px-4 py-10 text-gray-600">Access denied.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Create driver</h1>
        <p className="text-sm text-gray-600 mb-6">
          Creates Auth user + inserts row in profiles + driver_profiles.
        </p>

        <form onSubmit={submit} className="bg-white rounded-xl shadow p-5 space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-700">Email *</label>
            <input
              className="w-full mt-1 border rounded-lg px-3 py-2"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="driver@email.com"
              type="email"
              required
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('auto')}
              className={`flex-1 px-3 py-2 rounded-lg border font-semibold ${
                mode === 'auto' ? 'bg-orange-50 border-orange-200 text-primary' : 'hover:bg-gray-50'
              }`}
            >
              Auto password
            </button>
            <button
              type="button"
              onClick={() => setMode('manual')}
              className={`flex-1 px-3 py-2 rounded-lg border font-semibold ${
                mode === 'manual' ? 'bg-orange-50 border-orange-200 text-primary' : 'hover:bg-gray-50'
              }`}
            >
              Manual password
            </button>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700">Password *</label>
            <div className="flex gap-2">
              <input
                className="flex-1 mt-1 border rounded-lg px-3 py-2"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                placeholder="Min 6 chars"
                type="text"
                readOnly={mode === 'auto'}
                required
              />
              {mode === 'auto' ? (
                <button
                  type="button"
                  className="mt-1 px-3 py-2 rounded-lg border font-semibold inline-flex items-center gap-2"
                  onClick={() => setForm((p) => ({ ...p, password: genPassword(12) }))}
                >
                  <RefreshCcw size={16} />
                  Regenerate
                </button>
              ) : null}
              <button
                type="button"
                className="mt-1 px-3 py-2 rounded-lg border font-semibold inline-flex items-center gap-2"
                onClick={() => copyText(form.password || '')}
                disabled={!form.password}
              >
                <Copy size={16} />
                Copy
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700">Full name</label>
            <input
              className="w-full mt-1 border rounded-lg px-3 py-2"
              value={form.full_name}
              onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
              placeholder="Driver name"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700">Phone</label>
            <input
              className="w-full mt-1 border rounded-lg px-3 py-2"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="10-digit mobile"
            />
          </div>

          {createdPassword ? (
            <div className="p-3 rounded-lg border bg-green-50 border-green-200 text-sm">
              Generated password: <span className="font-semibold">{createdPassword}</span>{' '}
              <button type="button" className="ml-2 underline font-semibold" onClick={() => copyText(createdPassword)}>
                Copy
              </button>
            </div>
          ) : null}

          <button
            disabled={!canSubmit || saving}
            className="w-full bg-primary text-white rounded-lg py-3 font-semibold disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create driver'}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
