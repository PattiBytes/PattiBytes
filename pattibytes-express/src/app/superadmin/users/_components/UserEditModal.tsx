 
'use client';
import { Save, X, Shield, User as UserIcon } from 'lucide-react';
import type { UserWithMerchant, Role } from './types';
import UserAvatar from './UserAvatar';

interface Props {
  editing: UserWithMerchant;
  saving: boolean;
  isSuperAdmin: boolean;
  onChange: (patch: Partial<UserWithMerchant>) => void;
  onSave: () => void;
  onRevoke: () => void;
  onClose: () => void;
}

export default function UserEditModal({
  editing, saving, isSuperAdmin, onChange, onSave, onRevoke, onClose,
}: Props) {
  const field = (
    label: string,
    key: keyof UserWithMerchant,
    type = 'text',
    colSpan = false
  ) => (
    <div className={colSpan ? 'sm:col-span-2' : ''}>
      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</label>
      <input
        type={type}
        value={(editing[key] as string) || ''}
        onChange={(e) => onChange({ [key]: e.target.value })}
        className="mt-1 w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-primary"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={() => !saving && onClose()} />

      <div className="absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center p-0 sm:p-4">
        <div className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50">
            <div className="flex items-center gap-3">
              <UserAvatar user={editing} size="md" />
              <div>
                <div className="flex items-center gap-2">
                  <UserIcon size={15} className="text-gray-500" />
                  <h2 className="font-bold text-gray-900">Edit User</h2>
                </div>
                <p className="text-xs text-gray-500 truncate max-w-[200px]">{editing.email}</p>
              </div>
            </div>
            <button onClick={() => !saving && onClose()} className="p-2 rounded-lg hover:bg-gray-200">
              <X size={17} />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
            <div className="grid sm:grid-cols-2 gap-4">
              {field('Full Name', 'full_name')}
              {field('Phone', 'phone')}
              {field('Email', 'email', 'email', true)}
              {field('Address', 'address', 'text', true)}
              {field('City', 'city')}
              {field('State', 'state')}

              {/* Role */}
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Role</label>
                <select
                  value={(editing.role || 'customer') as string}
                  onChange={(e) => onChange({ role: e.target.value as Role })}
                  className="mt-1 w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-primary"
                >
                  {(['customer', 'merchant', 'driver', 'admin'] as Role[]).map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                  {isSuperAdmin && <option value="superadmin">superadmin</option>}
                </select>
              </div>

              {/* Approval status */}
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Approval Status</label>
                <select
                  value={editing.approval_status || 'pending'}
                  onChange={(e) => onChange({ approval_status: e.target.value })}
                  className="mt-1 w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-primary"
                >
                  {['pending', 'approved', 'rejected', 'revoked'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Boolean flags */}
              <div className="sm:col-span-2 grid grid-cols-3 gap-3 bg-gray-50 p-3 rounded-xl">
                {(
                  [
                    ['is_approved', 'Approved'],
                    ['is_active', 'Active'],
                    ['profile_completed', 'Profile Done'],
                    ['is_trusted', 'Trusted'],
                  ] as [keyof UserWithMerchant, string][]
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editing[key])}
                      onChange={(e) => onChange({ [key]: e.target.checked })}
                      className="w-4 h-4 accent-orange-500"
                    />
                    {label}
                  </label>
                ))}
              </div>

              {/* Merchant-specific info (read-only summary) */}
              {editing.merchant && (
                <div className="sm:col-span-2 bg-orange-50 rounded-xl p-3 border border-orange-200">
                  <p className="text-xs font-semibold text-orange-700 uppercase mb-2">Merchant Info</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-700">
                    <p>Business: <strong>{editing.merchant.business_name}</strong></p>
                    <p>Type: <strong>{editing.merchant.business_type}</strong></p>
                    <p>Rating: <strong>{editing.merchant.average_rating?.toFixed(1) ?? '—'}</strong></p>
                    <p>Orders: <strong>{editing.merchant.total_orders ?? 0}</strong></p>
                    <p>Commission: <strong>{editing.merchant.commission_rate ?? 10}%</strong></p>
                    <p>Verified: <strong>{editing.merchant.is_verified ? 'Yes' : 'No'}</strong></p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t flex flex-col sm:flex-row gap-3 sm:justify-between bg-gray-50">
            <button
              onClick={onRevoke}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5
                rounded-lg bg-yellow-600 text-white disabled:opacity-50 text-sm font-semibold"
            >
              <Shield size={16} /> Revoke Access
            </button>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2.5 rounded-lg border bg-white disabled:opacity-50 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={onSave}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5
                  rounded-lg bg-green-600 text-white disabled:opacity-50 text-sm font-semibold"
              >
                <Save size={16} />
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}