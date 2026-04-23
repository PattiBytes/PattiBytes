'use client';
import { Mail, Phone, Calendar, Trash2, Pencil, MapPin, Crown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import type { AdminProfile } from './types';

interface Props {
  admin: AdminProfile;
  currentUserId: string;
  isSuperAdmin: boolean;
  onEdit: (a: AdminProfile) => void;
  onRemove: (id: string) => void;
}

export default function AdminCard({ admin, currentUserId, isSuperAdmin, onEdit, onRemove }: Props) {
  const initial = (admin.full_name?.[0] || 'A').toUpperCase();
  const isSelf = admin.id === currentUserId;
  const isSA = admin.role === 'superadmin';

  const branchLabel = admin.city
    ? `${admin.city}${admin.state ? `, ${admin.state}` : ''}`
    : admin.username === 'global'
    ? 'All Branches'
    : null;

  return (
    <div className={`bg-white rounded-2xl shadow-sm border p-5 transition-all hover:shadow-md
      ${!admin.is_active ? 'opacity-60' : ''}`}>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 flex items-center justify-center
            bg-gradient-to-br from-orange-400 to-pink-500 text-white font-bold relative">
            {admin.avatar_url ? (
              <Image src={admin.avatar_url} alt={admin.full_name || ''} fill className="object-cover" />
            ) : initial}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-gray-900">{admin.full_name || 'Unnamed'}</h3>
              {isSelf && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">You</span>}
              {!admin.is_active && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">Inactive</span>}
            </div>
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1
              ${isSA ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
              {isSA ? (
                <span className="flex items-center gap-1"><Crown size={10} /> Super Admin</span>
              ) : 'Admin'}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        {!isSelf && (
          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={() => onEdit(admin)}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
              title="Edit"
            >
              <Pencil size={15} />
            </button>
            {(!isSA || isSuperAdmin) && (
              <button
                onClick={() => onRemove(admin.id)}
                className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                title="Remove admin"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="space-y-2 text-sm text-gray-600">
        {admin.email && (
          <div className="flex items-center gap-2">
            <Mail size={13} className="text-gray-400 shrink-0" />
            <span className="truncate">{admin.email}</span>
          </div>
        )}
        {admin.phone && (
          <div className="flex items-center gap-2">
            <Phone size={13} className="text-gray-400 shrink-0" />
            <span>{admin.phone}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Calendar size={13} className="text-gray-400 shrink-0" />
          <span>Added {formatDistanceToNow(new Date(admin.created_at), { addSuffix: true })}</span>
        </div>
        {branchLabel && (
          <div className="flex items-center gap-2">
            <MapPin size={13} className="text-orange-500 shrink-0" />
            <span className="font-semibold text-orange-700">{branchLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}

