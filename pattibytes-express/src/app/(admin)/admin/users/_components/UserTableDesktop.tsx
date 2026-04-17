'use client';
import { Mail, Phone, Calendar, Pencil, Trash2, Shield, Lock, Bell } from 'lucide-react';
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

export default function UserTableDesktop({
  rows, deletingId, onEdit, onRevoke, onDelete, onPermissions, onNotify,
}: Props) {
  return (
    <div className="hidden md:block bg-white rounded-xl shadow border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['User', 'Contact', 'Role / Status', 'Stats', 'Joined', 'Actions'].map((h) => (
                <th
                  key={h}
                  className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {rows.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">

                {/* User */}
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar user={u} size="md" />
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate max-w-[160px]">
                        {u.full_name || u.merchant?.business_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-400 truncate max-w-[160px]">{u.id}</p>
                    </div>
                  </div>
                </td>

                {/* Contact */}
                <td className="px-5 py-3">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-gray-700">
                      <Mail size={12} className="text-gray-400 shrink-0" />
                      <span className="truncate max-w-[180px]">{u.email || '—'}</span>
                    </div>
                    {u.phone && (
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <Phone size={12} className="text-gray-400 shrink-0" />
                        <span>{u.phone}</span>
                      </div>
                    )}
                  </div>
                </td>

                {/* Role + Status */}
                <td className="px-5 py-3">
                  <div className="flex flex-col gap-1">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${roleBadge(u.role)}`}>
                      {u.role || 'unknown'}
                    </span>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${statusBadge(u.approval_status)}`}>
                      {u.approval_status || '—'}
                    </span>
                    {u.banned_at && (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                        Banned
                      </span>
                    )}
                  </div>
                </td>

                {/* Stats */}
                <td className="px-5 py-3 text-xs text-gray-600 space-y-0.5">
                  <p>Orders: <strong>{u.total_orders ?? 0}</strong></p>
                  <p>Completed: <strong>{u.completed_orders ?? 0}</strong></p>
                  <p>Trust: <strong>{u.trust_score ?? 100}</strong></p>
                  {u.merchant && (
                    <p className="text-orange-600">
                      Rating: <strong>{u.merchant.average_rating?.toFixed(1) ?? '—'}</strong>
                    </p>
                  )}
                </td>

                {/* Joined */}
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Calendar size={12} className="text-gray-400 shrink-0" />
                    <span className="whitespace-nowrap">
                      {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </td>

                {/* Actions */}
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => onEdit(u)}
                      title="Edit user"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg
                        bg-gray-900 text-white hover:bg-black text-xs"
                    >
                      <Pencil size={13} /> Edit
                    </button>
                    <button
                      onClick={() => onPermissions(u)}
                      title="Manage permissions"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg
                        bg-indigo-600 text-white hover:bg-indigo-700 text-xs"
                    >
                      <Lock size={13} /> Perms
                    </button>
                    <button
                      onClick={() => onNotify(u)}
                      title="Send push notification"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg
                        bg-violet-600 text-white hover:bg-violet-700 text-xs"
                    >
                      <Bell size={13} /> Notify
                    </button>
                    <button
                      onClick={() => onRevoke(u.id)}
                      title="Revoke access"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg
                        bg-yellow-600 text-white hover:bg-yellow-700 text-xs"
                    >
                      <Shield size={13} /> Revoke
                    </button>
                    <button
                      onClick={() => onDelete(u.id)}
                      disabled={deletingId === u.id}
                      title="Delete profile"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg
                        bg-red-600 text-white hover:bg-red-700 text-xs disabled:opacity-50"
                    >
                      <Trash2 size={13} />
                      {deletingId === u.id ? '…' : 'Delete'}
                    </button>
                  </div>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}