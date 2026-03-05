/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { Package, Truck, Loader2, Sparkles } from 'lucide-react';
import { ADMIN_STATUSES, statusMeta, cx, type OrderNormalized, type DriverRow } from './types';

// All valid custom_order_status values (must match DB constraint)
export const CUSTOM_ORDER_STATUSES = [
  'pending', 'quoted', 'accepted', 'rejected',
  'processing', 'delivered', 'reviewed', 'cancelled', 'on_hold',
] as const;

const CUSTOM_STATUS_META: Record<string, { color: string; activeColor: string; dot: string }> = {
  pending:    { color: 'border-yellow-200 hover:border-yellow-400 hover:text-yellow-700', activeColor: 'bg-yellow-100 text-yellow-800 border-yellow-300', dot: 'bg-yellow-500' },
  quoted:     { color: 'border-blue-200 hover:border-blue-400 hover:text-blue-700',       activeColor: 'bg-blue-100 text-blue-800 border-blue-300',       dot: 'bg-blue-500'   },
  accepted:   { color: 'border-green-200 hover:border-green-400 hover:text-green-700',    activeColor: 'bg-green-100 text-green-800 border-green-300',    dot: 'bg-green-500'  },
  rejected:   { color: 'border-red-200 hover:border-red-400 hover:text-red-700',          activeColor: 'bg-red-100 text-red-800 border-red-300',          dot: 'bg-red-400'    },
  processing: { color: 'border-indigo-200 hover:border-indigo-400 hover:text-indigo-700', activeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300', dot: 'bg-indigo-500' },
  delivered:  { color: 'border-gray-200 hover:border-gray-400 hover:text-gray-700',       activeColor: 'bg-gray-100 text-gray-700 border-gray-300',       dot: 'bg-gray-500'   },
  reviewed:   { color: 'border-purple-200 hover:border-purple-400 hover:text-purple-700', activeColor: 'bg-purple-100 text-purple-800 border-purple-300', dot: 'bg-purple-500' },
  cancelled:  { color: 'border-rose-200 hover:border-rose-400 hover:text-rose-700',       activeColor: 'bg-rose-100 text-rose-800 border-rose-300',       dot: 'bg-rose-400'   },
  on_hold:    { color: 'border-orange-200 hover:border-orange-400 hover:text-orange-700', activeColor: 'bg-orange-100 text-orange-700 border-orange-300', dot: 'bg-orange-400' },
};

interface Props {
  order: OrderNormalized;
  drivers: DriverRow[];
  updating: boolean;
  assigning: boolean;
  onUpdateStatus: (s: string) => void;
  onUpdateCustomStatus: (s: string) => void;
  onAssignDriver: (driverId: string) => void;
}

export function StatusControl({
  order, drivers, updating, assigning,
  onUpdateStatus, onUpdateCustomStatus, onAssignDriver,
}: Props) {
  const isCustomOrder = order.orderType === 'custom' || !!order.customOrderRef;

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6 space-y-5">

      {/* ① Regular order status */}
      <div>
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" /> Order Status
        </h3>
        <div className="flex flex-wrap gap-2">
          {ADMIN_STATUSES.map(s => {
            const isActive = order.status === s;
            const sm = statusMeta(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => onUpdateStatus(s)}
                disabled={updating || isActive}
                className={cx(
                  'px-3 py-1.5 rounded-xl text-sm font-bold border transition',
                  isActive
                    ? `${sm.color} border-current cursor-default scale-[1.02]`
                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary',
                  updating && !isActive && 'opacity-50 cursor-not-allowed'
                )}
              >
                {updating && !isActive
                  ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" />
                  : <span className={cx('inline-block w-1.5 h-1.5 rounded-full mr-1.5 -translate-y-px', sm.dot)} />}
                {s.replace(/_/g, ' ')}
              </button>
            );
          })}
        </div>
      </div>

      {/* ② Custom order status — only shown for custom orders */}
      {isCustomOrder && (
        <div className="pt-4 border-t">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-500" /> Custom Order Status
            <span className="text-xs text-gray-400 font-normal">(separate from delivery status above)</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {CUSTOM_ORDER_STATUSES.map(s => {
              const isActive = order.customOrderStatus === s;
              const meta = CUSTOM_STATUS_META[s];
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => onUpdateCustomStatus(s)}
                  disabled={updating || isActive}
                  className={cx(
                    'px-3 py-1.5 rounded-xl text-xs font-bold border transition bg-white',
                    isActive
                      ? meta.activeColor + ' cursor-default scale-[1.02]'
                      : 'text-gray-600 border-gray-200 ' + meta.color,
                    updating && !isActive && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <span className={cx('inline-block w-1.5 h-1.5 rounded-full mr-1.5 -translate-y-px', meta.dot)} />
                  {s.replace(/_/g, ' ')}
                </button>
              );
            })}
          </div>

          {/* Current custom status callout */}
          {order.customOrderStatus && (
            <p className="mt-2 text-xs text-gray-500">
              Current:{' '}
              <strong className="text-gray-700">{order.customOrderStatus.replace(/_/g, ' ')}</strong>
            </p>
          )}
        </div>
      )}

      {/* ③ Driver assignment */}
      <div className="pt-4 border-t">
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Truck className="w-5 h-5 text-blue-500" />
          {order.driverId ? 'Reassign Driver' : 'Assign Driver'}
        </h3>

        {drivers.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-3 border border-dashed">
            <p className="text-sm text-gray-500">No active drivers available at the moment</p>
          </div>
        ) : (
          <select
            onChange={e => e.target.value && onAssignDriver(e.target.value)}
            disabled={assigning}
            defaultValue=""
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm disabled:opacity-50 bg-white"
          >
            <option value="">
              {assigning ? 'Assigning…' : order.driverId ? '— Reassign to… —' : '— Select a driver —'}
            </option>
            {drivers.map((d: any) => (
              <option key={d.id} value={d.id}>
                {d.full_name ?? d.fullname ?? 'Driver'}
                {d.phone ? ` · ${d.phone}` : ''}
                {d.id === order.driverId ? ' ✓ (current)' : ''}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
