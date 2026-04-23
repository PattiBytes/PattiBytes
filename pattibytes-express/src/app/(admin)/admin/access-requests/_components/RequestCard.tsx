// src/app/(admin)/admin/access-requests/_components/RequestCard.tsx
'use client';

import {
  CheckCircle, XCircle, Clock, User, Mail, Phone, MapPin,
  AlertCircle, Shield, Crown, BadgeCheck, Trash2, RotateCcw,
  Eye, AlertTriangle,
} from 'lucide-react';
import type { AccessRequestUI } from './types';
import { REQUEST_TYPE_CONFIG } from './types';

interface Props {
  request: AccessRequestUI;
  busy: boolean;
  currentUserRole: string | undefined;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onGrantAccess: (userId: string, role: string) => void;
  onRevoke: (userId: string) => void;
  onPromote: (userId: string, role: 'admin' | 'superadmin') => void;
  // account_deletion specific
  onApproveDeletion: (id: string, userId: string) => void;
  onRejectDeletion: (id: string, userId: string) => void;
  onCancelDeletion: (id: string, userId: string) => void;
  onPermanentDelete: (userId: string, requestId: string) => void;
  onViewDetails: (req: AccessRequestUI) => void;
}

const STATUS_STYLE = {
  pending:  'bg-yellow-100 text-yellow-800 border-yellow-300',
  approved: 'bg-green-100 text-green-800 border-green-300',
  rejected: 'bg-red-100 text-red-800 border-red-300',
};

const BORDER_COLOR = {
  pending:  'border-yellow-400',
  approved: 'border-green-500',
  rejected: 'border-red-500',
};

// ── Role Upgrade Actions ──────────────────────────────────────────────────────
function RoleUpgradeActions({
  request, busy, currentUserRole, onApprove, onReject,
  onGrantAccess, onRevoke, onPromote,
}: Omit<Props, 'onApproveDeletion' | 'onRejectDeletion' | 'onCancelDeletion' | 'onPermanentDelete' | 'onViewDetails'>) {
  if (request.status === 'pending') {
    return (
      <>
        <ActionBtn
          onClick={() => onApprove(request.id)}
          disabled={busy}
          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
          icon={<CheckCircle size={17} />}
          label="Approve"
          busy={busy}
        />
        <ActionBtn
          onClick={() => onReject(request.id)}
          disabled={busy}
          className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
          icon={<XCircle size={17} />}
          label="Reject"
          busy={busy}
        />
      </>
    );
  }

  return (
    <>
      <ActionBtn
        onClick={() => onGrantAccess(request.user_id, request.requested_role!)}
        disabled={busy || !request.requested_role}
        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
        icon={<BadgeCheck size={17} />}
        label="Grant Full Access"
        busy={busy}
      />
      <ActionBtn
        onClick={() => onRevoke(request.user_id)}
        disabled={busy}
        className="bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800"
        icon={<Shield size={17} />}
        label="Revoke"
        busy={busy}
      />
      <ActionBtn
        onClick={() => onPromote(request.user_id, 'admin')}
        disabled={busy}
        className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
        icon={<Crown size={17} />}
        label="→ Admin"
        busy={busy}
      />
      {currentUserRole === 'superadmin' && (
        <ActionBtn
          onClick={() => onPromote(request.user_id, 'superadmin')}
          disabled={busy}
          className="bg-gradient-to-r from-gray-800 to-black hover:from-black"
          icon={<Crown size={17} />}
          label="→ SuperAdmin"
          busy={busy}
        />
      )}
    </>
  );
}

// ── Account Deletion Actions ──────────────────────────────────────────────────
function AccountDeletionActions({
  request, busy, currentUserRole,
  onApproveDeletion, onRejectDeletion, onCancelDeletion, onPermanentDelete,
}: Pick<Props, 'request' | 'busy' | 'currentUserRole' | 'onApproveDeletion' | 'onRejectDeletion' | 'onCancelDeletion' | 'onPermanentDelete'>) {
  if (request.status === 'pending') {
    return (
      <>
        <ActionBtn
          onClick={() => onApproveDeletion(request.id, request.user_id)}
          disabled={busy}
          className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
          icon={<Trash2 size={17} />}
          label="Approve Deletion"
          busy={busy}
        />
        <ActionBtn
          onClick={() => onRejectDeletion(request.id, request.user_id)}
          disabled={busy}
          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
          icon={<RotateCcw size={17} />}
          label="Reject (Keep Account)"
          busy={busy}
        />
      </>
    );
  }

  if (request.status === 'approved') {
    return (
      <>
        <ActionBtn
          onClick={() => onCancelDeletion(request.id, request.user_id)}
          disabled={busy}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          icon={<RotateCcw size={17} />}
          label="Cancel & Restore"
          busy={busy}
        />
        {currentUserRole === 'superadmin' && (
          <ActionBtn
            onClick={() => onPermanentDelete(request.user_id, request.id)}
            disabled={busy}
            className="bg-gradient-to-r from-gray-900 to-black"
            icon={<AlertTriangle size={17} />}
            label="Permanently Delete"
            busy={busy}
          />
        )}
      </>
    );
  }

  return null;
}

// ── Shared button ─────────────────────────────────────────────────────────────
function ActionBtn({
  onClick, disabled, className, icon, label, busy,
}: { onClick: () => void; disabled: boolean; className: string; icon: React.ReactNode; label: string; busy: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${className} text-white px-4 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 text-sm transition-all`}
    >
      {busy ? (
        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white" />
      ) : icon}
      {!busy && <span>{label}</span>}
    </button>
  );
}

// ── Main Card ─────────────────────────────────────────────────────────────────
export default function RequestCard(props: Props) {
  const { request, busy, onViewDetails } = props;
  const p = request.user_profile;

  const reqType = request.request_type || 'role_upgrade';
  const typeCfg = REQUEST_TYPE_CONFIG[reqType] ?? REQUEST_TYPE_CONFIG.default;
  const borderColor = BORDER_COLOR[request.status as keyof typeof BORDER_COLOR] ?? 'border-gray-300';

  const requestedLabel =
    reqType === 'role_upgrade'
      ? request.requested_role === 'merchant'
        ? '🏪 Restaurant Owner Panel'
        : request.requested_role === 'driver'
        ? '🚗 Delivery Partner Panel'
        : `Panel: ${request.requested_role}`
      : reqType === 'account_deletion'
      ? '🗑️ Permanent Account Deletion'
      : reqType === 'panel_request'
      ? `🖥️ Panel: ${request.requested_role ?? 'Unspecified'}`
      : request.requested_role ?? 'Unknown';

  const scheduledDeletion = request.scheduled_deletion_at
    ? new Date(request.scheduled_deletion_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  return (
    <div
      className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-4 sm:p-5 border-l-4 ${borderColor}`}
    >
      {/* Top section: user info + status */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-4 flex-1">
          {/* Avatar */}
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
              reqType === 'account_deletion'
                ? 'bg-gradient-to-br from-red-400 to-red-600'
                : reqType === 'role_upgrade' && request.requested_role === 'merchant'
                ? 'bg-gradient-to-br from-orange-400 to-pink-500'
                : 'bg-gradient-to-br from-blue-400 to-purple-500'
            }`}
          >
            <User className="text-white" size={22} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-gray-900">{p.full_name}</h3>
              {p.is_trusted && (
                <span className="text-xs bg-yellow-100 text-yellow-700 font-bold px-2 py-0.5 rounded-full">
                  ⭐ Trusted
                </span>
              )}
            </div>
            <div className="flex flex-col gap-0.5 text-sm text-gray-500 mt-1.5">
              <span className="flex items-center gap-1.5 break-all">
                <Mail size={12} className="flex-shrink-0" />{p.email}
              </span>
              {p.phone && p.phone !== 'N/A' && (
                <span className="flex items-center gap-1.5">
                  <Phone size={12} className="flex-shrink-0" />{p.phone}
                </span>
              )}
              {(p.city || p.state) && (
                <span className="flex items-center gap-1.5 text-xs">
                  <MapPin size={12} className="flex-shrink-0" />
                  {[p.city, p.state].filter(Boolean).join(', ')}
                </span>
              )}
            </div>
            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 capitalize">
                {p.role}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.is_approved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {p.is_approved ? '✓ Approved' : '✗ Not Approved'}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.is_active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                {p.is_active ? '● Active' : '○ Inactive'}
              </span>
              {p.account_status && p.account_status !== 'active' && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 capitalize">
                  {p.account_status.replace(/_/g, ' ')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status badge */}
        <div className="flex flex-col items-end gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${STATUS_STYLE[request.status as keyof typeof STATUS_STYLE]}`}>
            {request.status === 'pending'  && <Clock size={13} />}
            {request.status === 'approved' && <CheckCircle size={13} />}
            {request.status === 'rejected' && <XCircle size={13} />}
            {request.status.toUpperCase()}
          </span>
          <span className="text-xs text-gray-400">
            {new Date(request.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Request type banner */}
      <div className={`${typeCfg.bg} border ${typeCfg.borderColor} rounded-xl p-3.5 mb-4`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <AlertCircle className={typeCfg.color} size={20} />
            <div>
              <p className="text-xs font-medium text-gray-500">
                {typeCfg.emoji} {typeCfg.label}
              </p>
              <p className={`text-sm font-bold ${typeCfg.color}`}>{requestedLabel}</p>
            </div>
          </div>
          {/* View details for account_deletion */}
          <button
            onClick={() => onViewDetails(request)}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 bg-white/70 px-3 py-1.5 rounded-lg border hover:border-gray-300 transition-colors"
          >
            <Eye size={13} />
            Full Details
          </button>
        </div>

        {/* Deletion-specific info inline */}
        {reqType === 'account_deletion' && scheduledDeletion && (
          <div className="mt-2 pt-2 border-t border-red-200 flex items-center gap-2">
            <Clock size={13} className="text-red-500" />
            <p className="text-xs text-red-600 font-semibold">Deletion scheduled: {scheduledDeletion}</p>
          </div>
        )}
        {request.cancellation_reason && (
          <div className="mt-2 pt-2 border-t border-current/20">
            <p className={`text-xs ${typeCfg.color}`}>
              <span className="font-bold">Reason:</span> {request.cancellation_reason}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {reqType === 'account_deletion' ? (
          <AccountDeletionActions
            request={request}
            busy={busy}
            currentUserRole={props.currentUserRole}
            onApproveDeletion={props.onApproveDeletion}
            onRejectDeletion={props.onRejectDeletion}
            onCancelDeletion={props.onCancelDeletion}
            onPermanentDelete={props.onPermanentDelete}
          />
        ) : (
          <RoleUpgradeActions
            request={request}
            busy={busy}
            currentUserRole={props.currentUserRole}
            onApprove={props.onApprove}
            onReject={props.onReject}
            onGrantAccess={props.onGrantAccess}
            onRevoke={props.onRevoke}
            onPromote={props.onPromote}
          />
        )}
      </div>
    </div>
  );
}

