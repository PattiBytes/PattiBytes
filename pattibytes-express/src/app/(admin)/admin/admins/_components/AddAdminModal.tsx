/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { X, User, Mail, Phone, Lock, Eye, EyeOff, MapPin, Shield, Crown, Info } from 'lucide-react';
import { BRANCHES, type AdminRole } from './types';

import { sendNotification } from '@/services/notifications';

interface Props {
  currentUserId: string;
  isSuperAdmin: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface FormState {
  full_name: string;
  email: string;
  password: string;
  confirm_password: string;
  phone: string;
  role: AdminRole;
  branch_code: string;
  custom_city: string;
  custom_state: string;
  notify_welcome: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function AddAdminModal({ currentUserId, isSuperAdmin, onClose, onCreated }: Props) {
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState<FormState>({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    phone: '',
    role: 'admin',
    branch_code: 'patti',
    custom_city: '',
    custom_state: 'Punjab',
    notify_welcome: true,
  });

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const selectedBranch = BRANCHES.find((b) => b.code === form.branch_code);
  const isCustom = form.branch_code === 'custom';
  const isGlobal = form.branch_code === 'global';

  const city  = isCustom ? form.custom_city  : (selectedBranch?.city  ?? '');
  const state = isCustom ? form.custom_state : (selectedBranch?.state ?? '');

  const pwsMatch = !form.confirm_password || form.password === form.confirm_password;
  const canSubmit = form.full_name && form.email && form.password.length >= 8 && pwsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (form.password !== form.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      setLoading(true);

      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          password: form.password,
          full_name: form.full_name.trim(),
          phone: form.phone.trim() || null,
          role: form.role,
          city: city || null,
          state: state || null,
          username: isGlobal ? 'global' : (form.branch_code !== 'custom' ? form.branch_code : null),
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to create admin');

      // Send welcome notification
      if (form.notify_welcome && result.userId) {
        await sendNotification(
          result.userId,
          `Welcome, ${form.full_name}! 👋`,
          `You have been added as ${form.role === 'superadmin' ? 'Super Admin' : 'Admin'} on PattiBytes Express${city ? ` for the ${city} branch` : ''}.`,
          'system',
          { role: form.role, branch: form.branch_code }
        );
      }

      toast.success(`✅ ${form.role === 'superadmin' ? 'Super Admin' : 'Admin'} created successfully!`);
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create admin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={() => !loading && onClose()} />
      <div className="absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center p-0 sm:p-4">
        <div className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-primary" />
              <h2 className="font-bold text-gray-900">Add New Admin</h2>
            </div>
            <button onClick={() => !loading && onClose()} className="p-2 rounded-lg hover:bg-gray-200">
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit}>
            <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">

              {/* Identity */}
              <section>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Identity</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1 block">Full Name *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 text-gray-400" size={15} />
                      <input
                        type="text" value={form.full_name} required
                        onChange={(e) => set({ full_name: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1 block">Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 text-gray-400" size={15} />
                      <input
                        type="tel" value={form.phone}
                        onChange={(e) => set({ phone: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm font-semibold text-gray-700 mb-1 block">Email *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 text-gray-400" size={15} />
                      <input
                        type="email" value={form.email} required
                        onChange={(e) => set({ email: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Credentials */}
              <section>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Credentials</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1 block">Password * (min 8)</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 text-gray-400" size={15} />
                      <input
                        type={showPw ? 'text' : 'password'} value={form.password}
                        onChange={(e) => set({ password: e.target.value })}
                        minLength={8} required
                        className="w-full pl-9 pr-9 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary"
                      />
                      <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2.5 top-2.5 text-gray-400">
                        {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    {form.password && (
                      <div className="flex gap-1 mt-1.5">
                        {[4, 6, 8, 12].map((l) => (
                          <div key={l} className={`h-1 flex-1 rounded-full ${form.password.length >= l ? 'bg-primary' : 'bg-gray-200'}`} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1 block">Confirm Password *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 text-gray-400" size={15} />
                      <input
                        type={showConfirm ? 'text' : 'password'} value={form.confirm_password}
                        onChange={(e) => set({ confirm_password: e.target.value })}
                        required
                        className={`w-full pl-9 pr-9 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary ${!pwsMatch ? 'border-red-400' : ''}`}
                      />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-2.5 top-2.5 text-gray-400">
                        {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    {!pwsMatch && <p className="text-xs text-red-500 mt-1">Passwords don&apos;t match</p>}
                  </div>
                </div>
              </section>

              {/* Role */}
              <section>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Role & Access Level</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => set({ role: 'admin' })}
                    className={`p-3 rounded-xl border-2 text-left transition-all
                      ${form.role === 'admin' ? 'border-primary bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <Shield size={18} className={form.role === 'admin' ? 'text-primary mb-1' : 'text-gray-400 mb-1'} />
                    <p className="font-semibold text-sm">Admin</p>
                    <p className="text-xs text-gray-500 mt-0.5">Manages their assigned branch</p>
                  </button>
                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => set({ role: 'superadmin' })}
                      className={`p-3 rounded-xl border-2 text-left transition-all
                        ${form.role === 'superadmin' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <Crown size={18} className={form.role === 'superadmin' ? 'text-yellow-600 mb-1' : 'text-gray-400 mb-1'} />
                      <p className="font-semibold text-sm">Super Admin</p>
                      <p className="text-xs text-gray-500 mt-0.5">Full access to all branches</p>
                    </button>
                  )}
                </div>
              </section>

              {/* Branch assignment */}
              <section>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Branch / Area Assignment</p>
                <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3 mb-3 text-xs text-blue-800">
                  <Info size={13} className="shrink-0 mt-0.5" />
                  <p>Assign an admin to a specific branch city. As PattiBytes Express expands, admins will only see data for their assigned area.</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">Branch</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 text-gray-400" size={15} />
                    <select
                      value={form.branch_code}
                      onChange={(e) => set({ branch_code: e.target.value })}
                      className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary"
                    >
                      {BRANCHES.map((b) => (
                        <option key={b.code} value={b.code}>{b.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {isCustom && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-1 block">City</label>
                      <input
                        type="text" value={form.custom_city}
                        onChange={(e) => set({ custom_city: e.target.value })}
                        placeholder="e.g. Pathankot"
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-1 block">State</label>
                      <input
                        type="text" value={form.custom_state}
                        onChange={(e) => set({ custom_state: e.target.value })}
                        placeholder="Punjab"
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                )}
                {city && !isCustom && (
                  <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                    <MapPin size={11} className="text-primary" /> Will be assigned to <strong>{city}, {state}</strong>
                  </p>
                )}
              </section>

              {/* Options */}
              <section>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.notify_welcome}
                    onChange={(e) => set({ notify_welcome: e.target.checked })}
                    className="w-4 h-4 accent-orange-500"
                  />
                  Send welcome notification to new admin
                </label>
              </section>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t bg-gray-50 flex gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl border bg-white text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !canSubmit}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm disabled:opacity-50"
              >
                {loading ? (
                  <><span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> Creating…</>
                ) : (
                  <><Shield size={15} /> Create {form.role === 'superadmin' ? 'Super Admin' : 'Admin'}</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}