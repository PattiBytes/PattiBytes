'use client';
import { ArrowLeft, RefreshCw, Mail, Download, Printer, Bell } from 'lucide-react';
import { OrderNormalized, statusMeta, fmtTime, cx } from './types';

interface Props {
  order: OrderNormalized;
  driverCount: number;
  notifying: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onEmail: () => void;
  onDownload: () => void;
  onPrint: () => void;
  onNotifyDrivers: () => void;
}

export function OrderHeader({
  order, driverCount, notifying,
  onBack, onRefresh, onEmail, onDownload, onPrint, onNotifyDrivers,
}: Props) {
  const sm = statusMeta(order.status);
  const StatusIcon = sm.icon;
  const isCustom = order.orderType === 'custom' || !!order.customOrderRef;

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-5 mb-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Left: back + title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button" onClick={onBack}
            className="p-2 rounded-xl hover:bg-gray-100 transition shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900">
                Order #{order.orderNumber}
              </h1>
              {/* Order type pill */}
              {isCustom && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 border border-violet-200">
                  ✦ Custom
                </span>
              )}
              {order.orderType && order.orderType !== 'custom' && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 capitalize">
                  {order.orderType}
                </span>
              )}
              {/* Status badge */}
              <span className={cx('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold border', sm.color)}>
                <span className={cx('w-2 h-2 rounded-full', sm.dot)} />
                <StatusIcon className="w-3.5 h-3.5" />
                {order.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Created {fmtTime(order.createdAt)}
              {order.updatedAt && order.updatedAt !== order.createdAt
                ? ` · Updated ${fmtTime(order.updatedAt)}` : ''}
            </p>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex flex-wrap gap-2 shrink-0">
          {order.status === 'ready' && !order.driverId && (
            <button
              type="button" onClick={onNotifyDrivers}
              disabled={notifying || driverCount === 0}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 text-sm font-semibold transition"
            >
              <Bell className="w-4 h-4" />
              {notifying ? 'Notifying…' : `Notify Drivers (${driverCount})`}
            </button>
          )}
          <button type="button" onClick={onRefresh} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button type="button" onClick={onEmail} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-sm font-semibold transition">
            <Mail className="w-4 h-4" /> Email
          </button>
          <button type="button" onClick={onDownload} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 text-sm font-semibold transition">
            <Download className="w-4 h-4" /> Download
          </button>
          <button type="button" onClick={onPrint} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-700 text-white hover:bg-gray-800 text-sm font-semibold transition">
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>
    </div>
  );
}
