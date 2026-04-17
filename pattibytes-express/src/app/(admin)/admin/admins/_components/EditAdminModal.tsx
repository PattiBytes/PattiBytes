/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import { X, Save, User, Phone, MapPin, Shield, Crown } from 'lucide-react';
import { BRANCHES, type AdminProfile, type AdminRole } from './types';

interface Props {
  admin: AdminProfile;
  isSuperAdmin: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditAdminModal({ admin, isSuperAdmin, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false);

  const inferBranchCode = () => {
    if (admin.username === 'global') return 'global';
    if (!admin.city) return 'patti';
    const found = BRANCHES.find((b) => b.city.toLowerCase() === admin.city?.toLowerCase());
    return found?.code ?? 'custom';
  };

  const [form, setForm] = useState({
    full_name: admin.full_name || '',
    phone: admin.phone || '',
    role: admin.role as AdminRole,
    branch_code: inferBranchCode(),
    custom_city: admin.city || '',
    custom_state: admin.state || 'Punjab',
    is_active: admin.is_active ?? true,
  });

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const isCustom = form.branch_code === 'custom';
  const selectedBranch = BRANCHES.find((b) => b.code === form.branch_code);
  const city  = isCustom ? form.custom_city  : (selectedBranch?.city  ?? '');
  const state = isCustom ? form.custom_state : (selectedBranch?.state ?? '');

  const handleSave = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: form.full_name,
          phone: form.phone || null,
          role: form.role,
          city: city || null,
          state: state || null,
          username: form.branch_code === 'global' ? 'global' : (form.branch_code !== 'custom' ? form.branch_code : null),
          is_active: form.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', admin.id);

      if (error) throw error;
      toast.success('✅ Admin updated');
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={() => !saving && onClose()} />
      <div className="absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center p-0 sm:p-4">
        <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden">

          <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-primary" />
              <h2 className="font-bold text-gray-900">Edit Admin — {admin.full_name}</h2>
            </div>
            <button onClick={() => !saving && onClose()} className="p-2 rounded-lg hover:bg-gray-200">
              <X size={16} />
            </button>
          </div>

          <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
            {/* Name */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 text-gray-400" size={14} />
                <input
                  type="text" value={form.full_name}
                  onChange={(e) => set({ full_name: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 text-gray-400" size={14} />
                <input
                  type="tel" value={form.phone}
                  onChange={(e) => set({ phone: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Role (superadmin only) */}
            {isSuperAdmin && (
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['admin', 'superadmin'] as AdminRole[]).map((r) => (
                    <button
                      key={r} type="button"
                      onClick={() => set({ role: r })}
                      className={`p-2.5 rounded-xl border-2 text-sm font-semibold flex items-center gap-2 transition-all
                        ${form.role === r ? 'border-primary bg-orange-50 text-gray-900' : 'border-gray-200 text-gray-500'}`}
                    >
                      {r === 'superadmin' ? <Crown size={14} className="text-yellow-500" /> : <Shield size={14} className="text-blue-500" />}
                      {r === 'superadmin' ? 'Super Admin' : 'Admin'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Branch */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Branch / Area</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 text-gray-400" size={14} />
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">City</label>
                  <input
                    type="text" value={form.custom_city}
                    onChange={(e) => set({ custom_city: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">State</label>
                  <input
                    type="text" value={form.custom_state}
                    onChange={(e) => set({ custom_state: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            )}

            {/* Active toggle */}
            <label className="flex items-center gap-2.5 text-sm cursor-pointer bg-gray-50 rounded-xl p-3">
              <input
                type="checkbox" checked={form.is_active}
                onChange={(e) => set({ is_active: e.target.checked })}
                className="w-4 h-4 accent-orange-500"
              />
              <span>
                <strong>Account Active</strong>
                <span className="text-gray-500 ml-1">— deactivated admins cannot log in</span>
              </span>
            </label>
          </div>

          <div className="px-5 py-4 border-t bg-gray-50 flex gap-3 justify-end">
            <button onClick={onClose} disabled={saving} className="px-4 py-2.5 rounded-xl border bg-white text-sm disabled:opacity-50">
              Cancel
            </button>
            <button
              onClick={handleSave} disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 text-white font-semibold text-sm disabled:opacity-50"
            >
              <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}