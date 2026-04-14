/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import { Lock, X, Save, Ban, ShieldCheck, Bell, ShoppingBag, Truck, Star } from 'lucide-react';
import type { UserWithMerchant } from './types';
import UserAvatar from './UserAvatar';

interface Props {
  target: UserWithMerchant;
  adminId: string;
  onClose: () => void;
  onSaved: () => void;
}

interface PermState {
  is_active: boolean;
  is_approved: boolean;
  is_trusted: boolean;
  account_status: string;
  notif_order_updates: boolean;
  notif_promos: boolean;
  notif_system: boolean;
  ban_reason: string;
  ban_expires_at: string;
  isBanning: boolean;
}

function Toggle({
  label, icon: Icon, checked, onChange, disabled, desc,
}: {
  label: string;
  icon: any;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  desc?: string;
}) {
  return (
    <div className={`flex items-start justify-between p-3 rounded-xl border
      ${disabled ? 'opacity-50' : 'hover:bg-gray-50'} transition-colors`}>
      <div className="flex items-start gap-2.5">
        <Icon size={17} className="text-gray-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-gray-800">{label}</p>
          {desc && <p className="text-xs text-gray-500">{desc}</p>}
        </div>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors
          ${checked ? 'bg-green-500' : 'bg-gray-300'}`}
      >
        <span
          className={`inline-block h-5 w-5 mt-0.5 rounded-full bg-white shadow transition-transform
            ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
        />
      </button>
    </div>
  );
}

export default function PermissionsModal({ target, adminId, onClose, onSaved }: Props) {
  const prefs = target.notification_prefs ?? {};

  const [state, setState] = useState<PermState>({
    is_active:            Boolean(target.is_active ?? true),
    is_approved:          Boolean(target.is_approved),
    is_trusted:           Boolean(target.is_trusted ?? true),
    account_status:       target.account_status || 'active',
    notif_order_updates:  prefs.order_updates ?? true,
    notif_promos:         prefs.promos ?? true,
    notif_system:         prefs.system ?? true,
    ban_reason:           '',
    ban_expires_at:       '',
    isBanning:            false,
  });

  const [saving, setSaving] = useState(false);

  const set = (patch: Partial<PermState>) => setState((s) => ({ ...s, ...patch }));

  const handleSave = async () => {
    try {
      setSaving(true);

      const banPayload = state.isBanning
        ? {
            banned_at: new Date().toISOString(),
            banned_by: adminId,
            ban_reason: state.ban_reason || null,
            ban_expires_at: state.ban_expires_at || null,
            is_active: false,
            account_status: 'banned',
          }
        : {
            banned_at: null,
            banned_by: null,
            ban_reason: null,
            ban_expires_at: null,
          };

      const { error } = await supabase
        .from('profiles')
        .update({
          is_active:       state.is_active,
          is_approved:     state.is_approved,
          is_trusted:      state.is_trusted,
          account_status:  state.isBanning ? 'banned' : state.account_status,
          notification_prefs: {
            order_updates: state.notif_order_updates,
            promos:        state.notif_promos,
            system:        state.notif_system,
          },
          ...banPayload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', target.id);

      if (error) throw error;

      toast.success('✅ Permissions saved');
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const isBanned = Boolean(target.banned_at);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={() => !saving && onClose()} />

      <div className="absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center p-0 sm:p-4">
        <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b bg-indigo-50">
            <div className="flex items-center gap-3">
              <UserAvatar user={target} size="md" />
              <div>
                <div className="flex items-center gap-2">
                  <Lock size={15} className="text-indigo-600" />
                  <h2 className="font-bold text-gray-900">Permissions</h2>
                </div>
                <p className="text-xs text-gray-500 truncate max-w-[200px]">
                  {target.full_name || target.email}
                </p>
              </div>
            </div>
            <button onClick={() => !saving && onClose()} className="p-2 rounded-lg hover:bg-indigo-100">
              <X size={17} />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-5 max-h-[65vh] overflow-y-auto">

            {/* Current ban badge */}
            {isBanned && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800">
                <strong>⚠️ Currently Banned</strong>
                {target.ban_reason && <p className="mt-1">Reason: {target.ban_reason}</p>}
                {target.ban_expires_at && (
                  <p>Expires: {new Date(target.ban_expires_at).toLocaleDateString()}</p>
                )}
              </div>
            )}

            {/* Account access */}
            <section>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                Account Access
              </p>
              <div className="space-y-2">
                <Toggle
                  label="Account Active"
                  icon={ShieldCheck}
                  checked={state.is_active}
                  onChange={(v) => set({ is_active: v })}
                  desc="Disabling prevents login"
                />
                <Toggle
                  label="Approved"
                  icon={ShieldCheck}
                  checked={state.is_approved}
                  onChange={(v) => set({ is_approved: v })}
                  desc="Required for merchant / driver to operate"
                />
                <Toggle
                  label="Trusted User"
                  icon={Star}
                  checked={state.is_trusted}
                  onChange={(v) => set({ is_trusted: v })}
                  desc="Skips extra fraud checks"
                />
              </div>
            </section>

            {/* Capabilities */}
            <section>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                Capabilities
              </p>
              <div className="space-y-2">
                <Toggle
                  label="Can Place Orders"
                  icon={ShoppingBag}
                  checked={state.is_active && state.is_approved}
                  onChange={(v) => set({ is_active: v, is_approved: v })}
                  desc="Requires active + approved"
                />
                <Toggle
                  label="Can Deliver"
                  icon={Truck}
                  checked={state.is_approved}
                  onChange={(v) => set({ is_approved: v })}
                  desc="Drivers — requires approved"
                />
              </div>
            </section>

            {/* Notifications */}
            <section>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                Notifications
              </p>
              <div className="space-y-2">
                <Toggle
                  label="Order Updates"
                  icon={Bell}
                  checked={state.notif_order_updates}
                  onChange={(v) => set({ notif_order_updates: v })}
                />
                <Toggle
                  label="Promotions"
                  icon={Bell}
                  checked={state.notif_promos}
                  onChange={(v) => set({ notif_promos: v })}
                />
                <Toggle
                  label="System Alerts"
                  icon={Bell}
                  checked={state.notif_system}
                  onChange={(v) => set({ notif_system: v })}
                />
              </div>
            </section>

            {/* Ban section */}
            <section>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                Ban / Unban
              </p>
              <Toggle
                label={isBanned ? 'Unban this user' : 'Ban this user'}
                icon={Ban}
                checked={state.isBanning}
                onChange={(v) => set({ isBanning: v })}
                desc={isBanned ? 'Remove the existing ban' : 'Blocks all access immediately'}
              />

              {state.isBanning && !isBanned && (
                <div className="mt-3 space-y-3 bg-red-50 rounded-xl p-3 border border-red-200">
                  <div>
                    <label className="text-xs font-semibold text-red-700">Reason</label>
                    <input
                      value={state.ban_reason}
                      onChange={(e) => set({ ban_reason: e.target.value })}
                      placeholder="e.g. Fraudulent activity"
                      className="mt-1 w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-red-700">Expires At (optional)</label>
                    <input
                      type="datetime-local"
                      value={state.ban_expires_at}
                      onChange={(e) => set({ ban_expires_at: e.target.value })}
                      className="mt-1 w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400"
                    />
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t flex gap-3 justify-end bg-gray-50">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-lg border bg-white text-sm disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg
                bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50"
            >
              <Save size={15} />
              {saving ? 'Saving…' : 'Apply Permissions'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}