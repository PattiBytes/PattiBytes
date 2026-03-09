 
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Bell, Truck, Clock, Trash2 } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { ALL_STATUSES, formatDate, getTimeDiff, type Order, type DriverRow } from './shared';

interface Props {
  orders:          Order[];
  isAdmin:         boolean;
  drivers:         DriverRow[];
  notifyingId:     string | null;
  updatingId:      string | null;
  deletingId:      string | null;
  onNotifyDrivers: (order: Order) => void;
  onUpdateStatus:  (order: Order, status: string) => void;
  onDelete:        (order: Order) => void;
}

// ✅ Defined OUTSIDE the component — no remount on every render
function DesktopRow({
  o, index, isAdmin, notifyingId, updatingId, deletingId,
  onNotifyDrivers, onUpdateStatus, onDelete, router,
}: {
  o: Order;
  index: number;
  isAdmin: boolean;
  notifyingId: string | null;
  updatingId: string | null;
  deletingId: string | null;
  onNotifyDrivers: (order: Order) => void;
  onUpdateStatus: (order: Order, status: string) => void;
  onDelete: (order: Order) => void;
  router: ReturnType<typeof useRouter>;
}) {
  const isDeleting = deletingId === o.id;
  const isUpdating = updatingId === o.id;
  const isNotifying = notifyingId === o.id;

  return (
    <tr
      className={[
        'hover:bg-orange-50 transition-all animate-fade-in',
        isDeleting ? 'opacity-50 bg-red-50' : '',
      ].join(' ')}
      style={{ animationDelay: `${index * 25}ms` }}
    >
      {/* Order */}
      <td className="px-3 py-2">
        <p className="text-sm font-bold text-gray-900">
          #{String(o.order_number ?? '').trim() || o.id.slice(0, 8)}
        </p>
        {o.order_number && (
          <p className="text-xs text-gray-500">ID: {o.id.slice(0, 8)}</p>
        )}
        {o.driver_id && (
          <p className="text-xs text-green-600 flex items-center gap-0.5 mt-0.5">
            <Truck size={10} /> Driver
          </p>
        )}
      </td>

      {/* Customer */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          {!o.customer_id && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
              Walk-in
            </span>
          )}
          <span className="text-sm">{o.customerName || 'Unknown'}</span>
        </div>
        {o.customer_phone && (
          <p className="text-xs text-gray-500">{o.customer_phone}</p>
        )}
      </td>

      {/* Restaurant */}
      <td className="px-3 py-2 text-sm">{o.merchants?.business_name || 'N/A'}</td>

      {/* Amount */}
      <td className="px-3 py-2">
        <p className="text-sm font-semibold">
          Rs.{Number(o.total_amount || 0).toFixed(2)}
        </p>
        <p className="text-xs text-gray-500">{o.payment_method?.toUpperCase()}</p>
      </td>

      {/* Status */}
      <td className="px-3 py-2">
        <StatusBadge status={o.status} />
        <p className="text-xs text-gray-400 mt-0.5">{o.payment_status}</p>
      </td>

      {/* Created */}
      <td className="px-3 py-2">
        <p className="text-xs text-gray-900">{formatDate(o.created_at).split(',')[0]}</p>
        <p className="text-xs text-gray-500">{formatDate(o.created_at).split(',')[1]}</p>
      </td>

      {/* Updated */}
      <td className="px-3 py-2">
        <p className="text-xs text-gray-900">{formatDate(o.updated_at).split(',')[0]}</p>
        {o.updated_at && (
          <p className="text-xs text-blue-600 flex items-center gap-0.5">
            <Clock size={9} /> {getTimeDiff(o.created_at, o.updated_at)}
          </p>
        )}
      </td>

      {/* Actions */}
      <td className="px-3 py-2">
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => router.push(`/admin/orders/${o.id}`)}
            disabled={isDeleting}
            className="inline-flex items-center gap-0.5 px-2 py-1 text-xs text-primary
                       font-semibold border border-primary rounded hover:bg-orange-50
                       transition-all hover:scale-105 disabled:opacity-50"
          >
            <Eye size={12} /> View
          </button>

          <button
            type="button"
            onClick={() => onNotifyDrivers(o)}
            disabled={isNotifying || isDeleting}
            className="inline-flex items-center gap-0.5 px-2 py-1 text-xs text-purple-700
                       font-semibold border border-purple-300 rounded disabled:opacity-50
                       transition-all hover:scale-105 hover:bg-purple-50"
          >
            <Bell size={12} className={isNotifying ? 'animate-bounce' : ''} />
            {isNotifying ? '...' : 'Notify'}
          </button>

          <select
            value={o.status}
            disabled={isUpdating || isDeleting}
            onChange={e => onUpdateStatus(o, e.target.value)}
            className="px-2 py-1 text-xs rounded border border-gray-300
                       hover:border-primary transition-all disabled:opacity-50 font-semibold"
          >
            {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {isAdmin && (
            <button
              type="button"
              onClick={() => onDelete(o)}
              disabled={isDeleting}
              className="inline-flex items-center gap-0.5 px-2 py-1 text-xs text-red-600
                         font-semibold border border-red-300 rounded disabled:opacity-50
                         transition-all hover:scale-105 hover:bg-red-50"
            >
              <Trash2 size={12} className={isDeleting ? 'animate-spin' : ''} />
              {isDeleting ? '...' : 'Del'}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ✅ Defined OUTSIDE the component
function MobileCard({
  o, index, isAdmin, notifyingId, updatingId, deletingId,
  onNotifyDrivers, onUpdateStatus, onDelete, router,
}: {
  o: Order;
  index: number;
  isAdmin: boolean;
  notifyingId: string | null;
  updatingId: string | null;
  deletingId: string | null;
  onNotifyDrivers: (order: Order) => void;
  onUpdateStatus: (order: Order, status: string) => void;
  onDelete: (order: Order) => void;
  router: ReturnType<typeof useRouter>;
}) {
  const isDeleting = deletingId === o.id;
  const isUpdating = updatingId === o.id;
  const isNotifying = notifyingId === o.id;

  return (
    <div
      className={[
        'p-3 hover:bg-orange-50 transition-all animate-fade-in',
        isDeleting ? 'opacity-50 bg-red-50' : '',
      ].join(' ')}
      style={{ animationDelay: `${index * 25}ms` }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5 flex-wrap">
            #{String(o.order_number ?? '').trim() || o.id.slice(0, 8)}
            {o.order_number && (
              <span className="text-xs text-gray-500 font-normal">({o.id.slice(0, 8)})</span>
            )}
            {o.driver_id && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700
                               font-semibold flex items-center gap-0.5">
                <Truck size={9} /> Driver
              </span>
            )}
          </p>
          <p className="text-xs text-gray-600 mt-0.5">
            {!o.customer_id && '[Walk-in] '}
            {o.customerName || 'Unknown'} - {o.merchants?.business_name || 'N/A'}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-primary">
            Rs.{Number(o.total_amount || 0).toFixed(2)}
          </p>
          <div className="mt-0.5"><StatusBadge status={o.status} /></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5 mb-2 text-xs">
        <div className="bg-gray-50 rounded p-1.5">
          <p className="text-gray-500 font-medium">Created</p>
          <p className="text-gray-900 font-semibold">{formatDate(o.created_at)}</p>
        </div>
        <div className="bg-blue-50 rounded p-1.5">
          <p className="text-gray-500 font-medium">Updated</p>
          <p className="text-gray-900 font-semibold">{formatDate(o.updated_at)}</p>
          {o.updated_at && (
            <p className="text-blue-600 flex items-center gap-0.5">
              <Clock size={9} /> {getTimeDiff(o.created_at, o.updated_at)}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => router.push(`/admin/orders/${o.id}`)}
          disabled={isDeleting}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg
                     bg-primary text-white font-semibold transition-all hover:scale-105
                     disabled:opacity-50"
        >
          <Eye size={12} /> View
        </button>

        <button
          type="button"
          onClick={() => onNotifyDrivers(o)}
          disabled={isNotifying || isDeleting}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg
                     bg-purple-600 text-white font-semibold disabled:opacity-50
                     transition-all hover:scale-105"
        >
          <Bell size={12} className={isNotifying ? 'animate-bounce' : ''} />
          {isNotifying ? 'Notifying...' : 'Notify Drivers'}
        </button>

        <select
          value={o.status}
          disabled={isUpdating || isDeleting}
          onChange={e => onUpdateStatus(o, e.target.value)}
          className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-300
                     disabled:opacity-50 font-semibold flex-1"
        >
          {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {isAdmin && (
          <button
            type="button"
            onClick={() => onDelete(o)}
            disabled={isDeleting}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg
                       bg-red-600 text-white font-semibold disabled:opacity-50
                       transition-all hover:scale-105"
          >
            <Trash2 size={12} className={isDeleting ? 'animate-spin' : ''} />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        )}
      </div>
    </div>
  );
}

// Main export
export function RegularOrdersSection({
  orders, isAdmin, notifyingId, updatingId, deletingId,
  onNotifyDrivers, onUpdateStatus, onDelete,
}: Props) {
  const router = useRouter();

  if (!orders.length) {
    return (
      <div className="text-center py-12 text-gray-400 animate-fade-in">
        <p className="text-sm">No orders found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden animate-fade-in">
      <div className="overflow-x-auto">
        {/* Desktop table */}
        <table className="w-full hidden lg:table text-sm">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
            <tr>
              {['Order','Customer','Restaurant','Amount','Status','Created','Updated','Actions'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {orders.map((o, i) => (
              <DesktopRow
                key={o.id}
                o={o}
                index={i}
                isAdmin={isAdmin}
                notifyingId={notifyingId}
                updatingId={updatingId}
                deletingId={deletingId}
                onNotifyDrivers={onNotifyDrivers}
                onUpdateStatus={onUpdateStatus}
                onDelete={onDelete}
                router={router}
              />
            ))}
          </tbody>
        </table>

        {/* Mobile cards */}
        <div className="lg:hidden divide-y">
          {orders.map((o, i) => (
            <MobileCard
              key={o.id}
              o={o}
              index={i}
              isAdmin={isAdmin}
              notifyingId={notifyingId}
              updatingId={updatingId}
              deletingId={deletingId}
              onNotifyDrivers={onNotifyDrivers}
              onUpdateStatus={onUpdateStatus}
              onDelete={onDelete}
              router={router}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
