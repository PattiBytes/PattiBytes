// src/app/(admin)/admin/access-requests/_components/UserDetailModal.tsx
'use client';

import {
  X, User, Mail, Phone, MapPin, ShieldCheck, ShieldX,
  ShoppingBag, CheckCircle, XCircle, Star, Calendar,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Clock, Trash2, AlertTriangle, Hash,
} from 'lucide-react';
import type { AccessRequestUI } from './types';

interface Props {
  request: AccessRequestUI | null;
  onClose: () => void;
}

function StatCard({
  icon, label, value, color = 'text-gray-700',
}: { icon: React.ReactNode; label: string; value: React.ReactNode; color?: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-gray-400">{icon}<span className="text-xs">{label}</span></div>
      <p className={`text-lg font-bold ${color}`}>{value ?? '—'}</p>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="text-gray-400 mt-0.5 flex-shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-sm font-semibold text-gray-800 break-all">{value}</p>
      </div>
    </div>
  );
}

function AccountStatusBadge({ status }: { status: string | null }) {
  const map: Record<string, { color: string; bg: string; label: string }> = {
    active:            { color: 'text-green-700',  bg: 'bg-green-100',  label: 'Active' },
    banned:            { color: 'text-red-700',    bg: 'bg-red-100',    label: 'Banned' },
    deletion_scheduled:{ color: 'text-orange-700', bg: 'bg-orange-100', label: 'Deletion Scheduled' },
    deletion_approved: { color: 'text-red-700',    bg: 'bg-red-100',    label: 'Deletion Approved' },
    deleted:           { color: 'text-gray-700',   bg: 'bg-gray-100',   label: 'Deleted' },
  };
  const cfg = map[status ?? 'active'] ?? map.active;
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

export default function UserDetailModal({ request, onClose }: Props) {
  if (!request) return null;

  const p = request.user_profile;
  const isDeleteRequest = request.request_type === 'account_deletion';
  const memberSince = p.created_at
    ? new Date(p.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;
  const lastOrder = p.last_order_date
    ? new Date(p.last_order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;
  const scheduledDeletion = request.scheduled_deletion_at
    ? new Date(request.scheduled_deletion_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;
  const trustScore = p.trust_score ?? 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div
          className={`p-5 rounded-t-2xl flex items-start justify-between ${
            isDeleteRequest ? 'bg-red-600' : 'bg-gradient-to-r from-orange-500 to-pink-500'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
              <User size={28} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{p.full_name}</h2>
              <p className="text-white/80 text-sm">{p.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-semibold capitalize">
                  {p.role}
                </span>
                <AccountStatusBadge status={p.account_status} />
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Deletion Warning Banner */}
          {isDeleteRequest && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
              <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-bold text-red-700 text-sm">Account Deletion Request</p>
                <p className="text-red-600 text-xs mt-0.5">
                  This user has requested permanent deletion of their account and all associated data.
                </p>
                {scheduledDeletion && (
                  <p className="text-red-700 text-xs font-semibold mt-1">
                    ⏰ Scheduled for: {scheduledDeletion}
                  </p>
                )}
                {request.cancellation_reason && (
                  <p className="text-red-600 text-xs mt-1">
                    <span className="font-bold">Reason:</span> {request.cancellation_reason}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Order Stats */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              Order Statistics
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <StatCard
                icon={<ShoppingBag size={14} />}
                label="Total Orders"
                value={p.total_orders ?? 0}
                color="text-blue-600"
              />
              <StatCard
                icon={<CheckCircle size={14} />}
                label="Completed"
                value={p.completed_orders ?? 0}
                color="text-green-600"
              />
              <StatCard
                icon={<XCircle size={14} />}
                label="Cancelled"
                value={p.cancelled_orders ?? p.cancelled_orders_count ?? 0}
                color="text-red-500"
              />
              <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-gray-400">
                  <Star size={14} /><span className="text-xs">Trust</span>
                </div>
                <div className="flex items-center gap-1">
                  <p className={`text-lg font-bold ${trustScore >= 70 ? 'text-green-600' : trustScore >= 40 ? 'text-yellow-600' : 'text-red-500'}`}>
                    {trustScore}
                  </p>
                  <span className="text-xs text-gray-400">/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                  <div
                    className={`h-1.5 rounded-full ${trustScore >= 70 ? 'bg-green-500' : trustScore >= 40 ? 'bg-yellow-400' : 'bg-red-400'}`}
                    style={{ width: `${trustScore}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contact & Location */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Contact & Location
            </h3>
            <div className="bg-white border border-gray-100 rounded-xl px-4 py-1">
              <InfoRow icon={<Mail size={14} />} label="Email" value={p.email} />
              <InfoRow icon={<Phone size={14} />} label="Phone" value={p.phone} />
              <InfoRow icon={<Hash size={14} />} label="Username" value={p.username} />
              <InfoRow
                icon={<MapPin size={14} />}
                label="Address"
                value={[p.address, p.city, p.state, p.pincode].filter(Boolean).join(', ') || null}
              />
            </div>
          </div>

          {/* Account Timeline */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Account Timeline
            </h3>
            <div className="bg-white border border-gray-100 rounded-xl px-4 py-1">
              <InfoRow icon={<Calendar size={14} />} label="Member Since" value={memberSince} />
              <InfoRow icon={<Clock size={14} />} label="Last Order" value={lastOrder} />
            </div>
          </div>

          {/* Status Badges */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Account Status
            </h3>
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ${p.is_approved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {p.is_approved ? <ShieldCheck size={12} /> : <ShieldX size={12} />}
                {p.is_approved ? 'Approved' : 'Not Approved'}
              </span>
              <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ${p.is_active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                {p.is_active ? '● Active' : '○ Inactive'}
              </span>
              {p.is_trusted && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">
                  <Star size={12} /> Trusted User
                </span>
              )}
            </div>
          </div>

          {/* Ban info (if any) */}
          {p.ban_reason && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-xs font-bold text-red-700 mb-1 flex items-center gap-1">
                <ShieldX size={13} /> Ban Record
              </p>
              <p className="text-xs text-red-600">{p.ban_reason}</p>
              {p.banned_at && (
                <p className="text-xs text-red-400 mt-1">
                  Banned: {new Date(p.banned_at).toLocaleDateString('en-IN')}
                </p>
              )}
            </div>
          )}

          {/* Request Notes */}
          {request.notes && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-xs font-bold text-yellow-700 mb-1">Admin Notes</p>
              <p className="text-xs text-yellow-800">{request.notes}</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t">
          <button
            onClick={onClose}
            className="w-full text-sm font-bold text-gray-700 py-3 rounded-xl border hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

