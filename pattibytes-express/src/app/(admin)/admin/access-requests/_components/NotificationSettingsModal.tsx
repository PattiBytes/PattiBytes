// src/app/(admin)/admin/access-requests/_components/NotificationSettingsModal.tsx
'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, Volume2, VolumeX, X, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import type { AccessRequestNotifPrefs } from './types';
import { DEFAULT_NOTIF_PREFS } from './types';

interface Props {
  open: boolean;
  onClose: () => void;
  prefs: AccessRequestNotifPrefs;
  onPrefsChange: (p: AccessRequestNotifPrefs) => void;
}

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
  icon?: React.ReactNode;
}

function ToggleRow({ label, description, checked, disabled, onChange, icon }: ToggleRowProps) {
  return (
    <div
      className={`flex items-start justify-between gap-4 py-3 ${disabled ? 'opacity-40' : ''}`}
    >
      <div className="flex items-start gap-3">
        {icon && <span className="mt-0.5 text-gray-500">{icon}</span>}
        <div>
          <p className="text-sm font-semibold text-gray-900">{label}</p>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>
      <button
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-gray-200'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

export default function NotificationSettingsModal({ open, onClose, prefs, onPrefsChange }: Props) {
  const [local, setLocal] = useState<AccessRequestNotifPrefs>(prefs);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocal(prefs);
  }, [prefs, open]);

  const set = (key: keyof AccessRequestNotifPrefs, val: boolean) =>
    setLocal((p) => ({ ...p, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      // Load current admin_preferences to deep-merge
      const { data: settings, error: loadErr } = await supabase
        .from('app_settings')
        .select('id, admin_preferences')
        .limit(1)
        .maybeSingle();

      if (loadErr) throw loadErr;

      const existing = (settings?.admin_preferences as Record<string, unknown>) ?? {};
      const merged = { ...existing, access_request_notifications: local };

      const { error } = await supabase
        .from('app_settings')
        .update({ admin_preferences: merged, updated_at: new Date().toISOString() })
        .eq('id', settings!.id);

      if (error) throw error;

      onPrefsChange(local);
      toast.success('✅ Notification settings saved');
      onClose();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => setLocal(DEFAULT_NOTIF_PREFS);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center">
              <Bell size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Notification Settings</h2>
              <p className="text-xs text-gray-500">Control alerts for access requests</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Toggles */}
        <div className="p-5 divide-y divide-gray-100">
          <ToggleRow
            label="Enable Notifications"
            description="Master switch for all access request alerts"
            checked={local.enabled}
            onChange={(v) => set('enabled', v)}
            icon={local.enabled ? <Bell size={16} /> : <BellOff size={16} />}
          />
          <ToggleRow
            label="Role Upgrade Requests 🔑"
            description="Alert when a merchant or driver role upgrade is submitted"
            checked={local.role_upgrade}
            disabled={!local.enabled}
            onChange={(v) => set('role_upgrade', v)}
          />
          <ToggleRow
            label="Account Deletion Requests 🗑️"
            description="Alert when a user requests to delete their account"
            checked={local.account_deletion}
            disabled={!local.enabled}
            onChange={(v) => set('account_deletion', v)}
          />
          <ToggleRow
            label="Panel Access Requests 🖥️"
            description="Alert when a user requests panel or admin access"
            checked={local.panel_request}
            disabled={!local.enabled}
            onChange={(v) => set('panel_request', v)}
          />
          <ToggleRow
            label="Sound Alert"
            description="Play a sound when a new pending request arrives"
            checked={local.sound}
            disabled={!local.enabled}
            onChange={(v) => set('sound', v)}
            icon={local.sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-5 border-t bg-gray-50 rounded-b-2xl">
          <button
            onClick={handleReset}
            className="text-sm text-gray-500 hover:text-gray-700 font-medium px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Reset defaults
          </button>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="text-sm font-medium text-gray-600 px-4 py-2 rounded-lg border hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-primary text-white text-sm font-bold px-5 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Save size={15} />
            )}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

