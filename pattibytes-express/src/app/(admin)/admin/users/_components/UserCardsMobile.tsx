'use client';
import { Phone, Calendar, Pencil, Trash2, Shield, Lock, Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { UserWithMerchant } from './types';
import { roleBadge, statusBadge } from './utils';
import UserAvatar from './UserAvatar';

interface Props {
  rows: UserWithMerchant[];
  deletingId: string | null;
  onEdit: (u: UserWithMerchant) => void;
  onRevoke: (id: string) => void;
  onDelete: (id: string) => void;
  onPermissions: (u: UserWithMerchant) => void;
  onNotify: (u: UserWithMerchant) => void;
}

export default function UserCardsMobile({
  rows, deletingId, onEdit, onRevoke, onDelete, onPermissions, onNotify,
}: Props) {
  return (
    <div className="grid gap-3 md:hidden">
      {rows.map((u) => (
        <div key={u.id} className="bg-white rounded-xl border shadow-sm p-4">

          {/* Header row */}
          <div className="flex items-start gap-3">
            <UserAvatar user={u} size="lg" />

            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 truncate">
                {u.full_name || u.merchant?.business_name || 'Unknown'}
              </p>
              <p className="text-xs text-gray-500 truncate">{u.email || '—'}</p>

              {u.phone && (
                <div className="flex items-center gap-1 mt-1 text-sm text-gray-600">
                  <Phone size={12} className="text-gray-400" />
                  <span>{u.phone}</span>
                </div>
              )}

              <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                <Calendar size={11} className="text-gray-400" />
                <span>{formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}</span>
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${roleBadge(u.role)}`}>
              {u.role || 'unknown'}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${statusBadge(u.approval_status)}`}>
              {u.approval_status || '—'}
            </span>
            {u.is_active ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">Active</span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">Inactive</span>
            )}
            {u.banned_at && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">Banned</span>
            )}
          </div>

          {/* Mini stats */}
          <div className="grid grid-cols-3 gap-2 mt-3 bg-gray-50 rounded-lg p-2 text-xs text-center">
            <div>
              <p className="font-bold text-gray-900">{u.total_orders ?? 0}</p>
              <p className="text-gray-500">Orders</p>
            </div>
            <div>
              <p className="font-bold text-gray-900">{u.completed_orders ?? 0}</p>
              <p className="text-gray-500">Done</p>
            </div>
            <div>
              <p className="font-bold text-gray-900">{u.trust_score ?? 100}</p>
              <p className="text-gray-500">Trust</p>
            </div>
          </div>

          {/* Actions — 2-col grid, Notify spans full width at bottom */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <button
              onClick={() => onEdit(u)}
              className="flex items-center justify-center gap-1.5 py-2 rounded-lg
                bg-gray-900 text-white text-xs font-semibold hover:bg-black transition-colors"
            >
              <Pencil size={13} /> Edit
            </button>
            <button
              onClick={() => onPermissions(u)}
              className="flex items-center justify-center gap-1.5 py-2 rounded-lg
                bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
            >
              <Lock size={13} /> Permissions
            </button>
            <button
              onClick={() => onRevoke(u.id)}
              className="flex items-center justify-center gap-1.5 py-2 rounded-lg
                bg-yellow-600 text-white text-xs font-semibold hover:bg-yellow-700 transition-colors"
            >
              <Shield size={13} /> Revoke
            </button>
            <button
              onClick={() => onDelete(u.id)}
              disabled={deletingId === u.id}
              className="flex items-center justify-center gap-1.5 py-2 rounded-lg
                bg-red-600 text-white text-xs font-semibold disabled:opacity-50 hover:bg-red-700 transition-colors"
            >
              <Trash2 size={13} />
              {deletingId === u.id ? 'Deleting…' : 'Delete'}
            </button>

            {/* Notify — full width spanning both columns */}
            <button
              onClick={() => onNotify(u)}
              className="col-span-2 flex items-center justify-center gap-1.5 py-2 rounded-lg
                bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition-colors"
            >
              <Bell size={13} /> Send Notification
            </button>
          </div>

        </div>
      ))}
    </div>
  );
}
