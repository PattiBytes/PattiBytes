 
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal }   from 'react-dom';
import {
  Bell, ChevronDown, ChevronRight, Clock, Eye,
  Package, Trash2, Truck, MapPin, Phone, Star,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  StatusBadge, OrderTypeBadge, CategoryTags, formatDate,
} from '../_utils/formatters';
import { ShareBillButton } from './ShareBillButton';
import type { Order } from '../_types';

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/* ── Constants ───────────────────────────────────────────────────────────── */
const ALL_STATUSES = [
  'pending','confirmed','preparing','ready',
  'assigned','picked_up','delivered','cancelled',
];

const ROW_ACCENT: Record<string, string> = {
  pending  : 'border-l-yellow-400',
  confirmed: 'border-l-blue-400',
  preparing: 'border-l-purple-400',
  ready    : 'border-l-orange-400',
  assigned : 'border-l-indigo-400',
  picked_up: 'border-l-indigo-500',
  delivered: 'border-l-green-400',
  cancelled: 'border-l-gray-300',
};

const ROW_BG: Record<string, string> = {
  delivered: 'bg-green-50/20',
  cancelled: 'bg-gray-50/40',
  pending  : 'bg-yellow-50/10',
};

/* ── Portal status dropdown — escapes overflow:hidden on table ───────────── */
function PortalStatusDropdown({
  anchorRef, open, currentStatus, onSelect, onClose,
}: {
  anchorRef   : React.RefObject<HTMLButtonElement>;
  open        : boolean;
  currentStatus: string;
  onSelect    (s: string): void;
  onClose     (): void;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX });
  }, [open, anchorRef]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose, anchorRef]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      style={{ position: 'absolute', top: pos.top, left: pos.left, zIndex: 9999 }}
      className="bg-white rounded-xl shadow-2xl border border-gray-100 py-1 min-w-[155px] animate-fade-in"
      // Prevent table click closing this
      onMouseDown={e => e.stopPropagation()}
    >
      {ALL_STATUSES.map(s => (
        <button key={s} type="button"
          onClick={() => { onSelect(s); onClose(); }}
          className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors
            ${s === currentStatus
              ? 'font-bold text-primary bg-orange-50'
              : 'text-gray-700 hover:bg-orange-50/60'
            }`}
        >
          {s === currentStatus && (
            <span className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />
          )}
          <span className={s === currentStatus ? '' : 'ml-3.5'}>
            {s.replace(/_/g, ' ')}
          </span>
        </button>
      ))}
    </div>,
    document.body,
  );
}

/* ── Inline status picker — uses portal to escape overflow:hidden ─────────── */
function InlineStatusPicker({ order, disabled, onChange }: {
  order: Order; disabled: boolean; onChange(s: string): void;
}) {
  const [open, setOpen]   = useState(false);
  const btnRef            = useRef<HTMLButtonElement>(null);
  const close             = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-0.5 disabled:opacity-50 hover:opacity-75 transition-opacity"
      >
        <StatusBadge status={order.status} />
        <ChevronDown
          size={10}
          className="text-gray-400 transition-transform flex-shrink-0"
          style={{ transform: open ? 'rotate(180deg)' : '' }}
        />
      </button>

      <PortalStatusDropdown
        anchorRef={btnRef}
        open={open}
        currentStatus={order.status}
        onSelect={onChange}
        onClose={close}
      />
    </>
  );
}

/* ── Order ID cell ───────────────────────────────────────────────────────── */
function OrderIdCell({ o }: { o: Order }) {
  const num  = String(o.order_number ?? '').trim();
  const uuid = o.id.slice(0, 8);
  return (
    <div>
      <p className="font-bold text-gray-900 flex items-center gap-1 flex-wrap leading-tight">
        {num ? (
          <>
            <span className="text-primary text-sm">#{num}</span>
            <span className="text-gray-300 font-normal text-xs">·</span>
            <code className="text-gray-400 text-xs font-mono">{uuid}</code>
          </>
        ) : (
          <code className="text-gray-700 text-xs font-mono">{uuid}</code>
        )}
      </p>
      <div className="flex gap-0.5 mt-0.5 flex-wrap">
        <OrderTypeBadge type={o.order_type} />
        {o.driver_id && (
          <span className="bg-green-100 text-green-700 px-1 rounded text-xs font-semibold flex items-center gap-0.5">
            <Truck size={8}/> Driver
          </span>
        )}
        {o.custom_order_ref && (
          <span className="bg-violet-100 text-violet-700 px-1 rounded text-xs font-semibold">Custom</span>
        )}
      </div>
    </div>
  );
}

/* ── Action buttons ──────────────────────────────────────────────────────── */
function Actions({ o, p }: { o: Order; p: TableProps }) {
  const router = useRouter();
  const busy   = p.deletingOrderId === o.id;
  const btn    = 'inline-flex items-center gap-0.5 px-2 py-1 text-xs rounded font-semibold transition-all disabled:opacity-40';

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <button
        onClick={() => router.push(`/admin/orders/${o.id}`)}
        disabled={busy}
        className={`${btn} border border-primary/40 text-primary hover:bg-primary hover:text-white`}
      >
        <Eye size={11}/> View
      </button>

      <ShareBillButton order={o} variant="icon" size="xs" />

      {/* Review link — only if order has a rating */}
      {(o.rating || o.review) && (
        <button
          onClick={() => router.push(`/admin/reviews?order=${o.id}`)}
          className={`${btn} border border-amber-200 text-amber-600 hover:bg-amber-500 hover:text-white`}
          title={`Rating: ${o.rating ?? '?'} ⭐`}
        >
          <Star size={11} className="fill-amber-400 text-amber-400" />
          {o.rating ?? '·'}
        </button>
      )}

      <button
        onClick={() => p.onNotify(o)}
        disabled={p.notifyingOrderId === o.id || busy}
        className={`${btn} border border-purple-200 text-purple-700 hover:bg-purple-600 hover:text-white`}
      >
        <Bell size={11} className={p.notifyingOrderId === o.id ? 'animate-bounce' : ''} />
        {p.notifyingOrderId === o.id ? '…' : 'Notify'}
      </button>

      {p.isAdmin && (
        <button
          onClick={() => p.onDelete(o)}
          disabled={busy}
          className={`${btn} border border-red-200 text-red-500 hover:bg-red-600 hover:text-white`}
        >
          <Trash2 size={11} className={busy ? 'animate-spin' : ''} />
          {busy ? '…' : 'Del'}
        </button>
      )}
    </div>
  );
}

/* ── Table props ─────────────────────────────────────────────────────────── */
interface TableProps {
  orders          : Order[];
  isAdmin         : boolean;
  updatingOrderId : string | null;
  deletingOrderId : string | null;
  notifyingOrderId: string | null;
  onNotify       (o: Order): void;
  onStatusChange (o: Order, s: string): void;
  onDelete       (o: Order): void;
}

/* ── Main export ─────────────────────────────────────────────────────────── */
export function OrdersTable(props: TableProps) {
  if (!props.orders.length)
    return (
      <div className="bg-white rounded-xl border border-gray-100 text-center py-16 animate-fade-in">
        <Package size={32} className="mx-auto text-gray-200 mb-2 animate-bounce"/>
        <p className="text-sm font-semibold text-gray-400">No orders match your filters</p>
      </div>
    );

  return (
    <div className="bg-white rounded-xl border border-gray-100 animate-fade-in shadow-sm">
      {/* Desktop — ⚠️ NO overflow-hidden here — portal needs to escape */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-xs" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-gray-100/60 border-b border-gray-100 sticky top-0 z-10">
              {['Order # · ID','Customer','Restaurant','Items','Amount','Status','Time','Actions']
                .map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-400 text-[10px] uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {props.orders.map((o, i) => <DesktopRow key={o.id} o={o} i={i} {...props} />)}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="lg:hidden divide-y divide-gray-50">
        {props.orders.map((o, i) => <MobileCard key={o.id} o={o} i={i} {...props} />)}
      </div>
    </div>
  );
}

/* ── Desktop row ─────────────────────────────────────────────────────────── */
function DesktopRow({ o, i, ...p }: { o: Order; i: number } & TableProps) {
  const busy   = p.deletingOrderId === o.id;
  const accent = ROW_ACCENT[o.status] ?? 'border-l-gray-200';
  const rowBg  = ROW_BG[o.status]    ?? '';

  return (
    <tr
      className={`group transition-colors border-l-[3px] border-b border-gray-50
        ${accent} ${rowBg} ${busy ? 'opacity-40 bg-red-50' : 'hover:bg-orange-50/20'}
        animate-fade-in`}
      style={{ animationDelay: `${Math.min(i * 10, 200)}ms` }}
    >
      {/* Order # */}
      <td className="px-3 py-2.5 align-top"><OrderIdCell o={o} /></td>

      {/* Customer */}
      <td className="px-3 py-2.5 align-top">
        <div className="flex items-center gap-1">
          {!o.customer_id && <span>🚶</span>}
          <span className="truncate max-w-[100px] font-medium text-gray-800 text-xs">{o.customerName}</span>
        </div>
        {o.customer_phone && (
          <p className="text-gray-400 flex items-center gap-0.5 mt-0.5 text-xs">
            <Phone size={8}/>{o.customer_phone}
          </p>
        )}
      </td>

      {/* Restaurant */}
      <td className="px-3 py-2.5 align-top max-w-[110px]">
        <p className="truncate text-gray-700 font-medium text-xs">{o.merchants?.business_name ?? 'N/A'}</p>
        {o.delivery_address_label && (
          <p className="text-gray-400 truncate flex items-center gap-0.5 text-xs">
            <MapPin size={8}/>{o.delivery_address_label}
          </p>
        )}
      </td>

      {/* Items */}
      <td className="px-3 py-2.5 align-top">
        <CategoryTags items={o.items} />
        {!o.items?.length && <span className="text-gray-200">—</span>}
      </td>

      {/* Amount */}
      <td className="px-3 py-2.5 align-top whitespace-nowrap">
        <p className="font-bold text-gray-900 text-xs">₹{Number(o.total_amount || 0).toFixed(2)}</p>
        {Number(o.discount) > 0 && (
          <p className="text-green-600 text-xs">-₹{Number(o.discount).toFixed(2)}</p>
        )}
      </td>

      {/* Status — dropdown uses portal, never clipped */}
      <td className="px-3 py-2.5 align-top">
        <InlineStatusPicker
          order={o}
          disabled={p.updatingOrderId === o.id || busy}
          onChange={s => p.onStatusChange(o, s)}
        />
        {o.cancellation_reason && (
          <p className="text-red-400 text-xs mt-0.5 truncate max-w-[90px]" title={o.cancellation_reason}>
            ⚠ {o.cancellation_reason.slice(0, 18)}
          </p>
        )}
      </td>

      {/* Time — "X ago" from NOW */}
      <td className="px-3 py-2.5 align-top whitespace-nowrap">
        <p className="text-gray-500 text-xs">{formatDate(o.created_at)}</p>
        <p className="text-blue-400 flex items-center gap-0.5 text-xs mt-0.5">
          <Clock size={9}/> {timeAgo(o.updated_at ?? o.created_at)}
        </p>
      </td>

      {/* Actions */}
      <td className="px-3 py-2.5 align-top">
        <Actions o={o} p={{ ...p, orders: [], isAdmin: p.isAdmin }} />
      </td>
    </tr>
  );
}

/* ── Mobile card ─────────────────────────────────────────────────────────── */
function MobileCard({ o, i, ...p }: { o: Order; i: number } & TableProps) {
  const [expanded, setExpanded] = useState(false);
  const busy   = p.deletingOrderId === o.id;
  const accent = ROW_ACCENT[o.status] ?? 'border-l-gray-200';

  return (
    <div
      className={`border-l-4 ${accent} animate-fade-in transition-colors
        ${busy ? 'opacity-40 bg-red-50' : 'hover:bg-gray-50/40'}`}
      style={{ animationDelay: `${Math.min(i * 10, 200)}ms` }}
    >
      {/* ✅ div + role="button" instead of <button> — avoids nested button violation */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(x => !x)}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setExpanded(x => !x)}
        className="w-full px-3 py-2.5 flex items-start justify-between gap-2 text-left cursor-pointer select-none"
      >
        <div className="min-w-0 flex-1">
          {/* Order # + UUID */}
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            {String(o.order_number ?? '').trim() ? (
              <>
                <span className="font-bold text-sm text-primary">#{o.order_number}</span>
                <code className="text-xs text-gray-400 font-mono">{o.id.slice(0, 8)}</code>
              </>
            ) : (
              <code className="font-bold text-sm text-gray-700 font-mono">{o.id.slice(0, 8)}</code>
            )}
            <OrderTypeBadge type={o.order_type} />
            {o.driver_id && (
              <span className="text-xs bg-green-100 text-green-700 px-1 rounded font-semibold flex items-center gap-0.5">
                <Truck size={8}/>Driver
              </span>
            )}
          </div>

          <p className="text-xs text-gray-500 truncate">
            {!o.customer_id && '🚶 '}{o.customerName}
            {o.merchants?.business_name && (
              <span className="text-gray-300"> · {o.merchants.business_name}</span>
            )}
          </p>
          <CategoryTags items={o.items} />
        </div>

        {/* Right side: amount + status + chevron */}
        <div className="flex-shrink-0 flex flex-col items-end gap-1">
          <p className="font-bold text-primary text-sm">₹{Number(o.total_amount || 0).toFixed(2)}</p>

          {/* ✅ stopPropagation so status click doesn't toggle card expand */}
          <div
            role="presentation"
            onClick={e => e.stopPropagation()}
            onKeyDown={e => e.stopPropagation()}
          >
            <InlineStatusPicker
              order={o}
              disabled={p.updatingOrderId === o.id || busy}
              onChange={s => p.onStatusChange(o, s)}
            />
          </div>

          <p className="text-blue-400 flex items-center gap-0.5 text-xs">
            <Clock size={9}/>{timeAgo(o.updated_at ?? o.created_at)}
          </p>
          <ChevronRight
            size={13}
            className="text-gray-300 transition-transform"
            style={{ transform: expanded ? 'rotate(90deg)' : '' }}
          />
        </div>
      </div>

      {/* Expanded body — all action buttons are fine here, outside the div[role=button] */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-gray-100 pt-2 animate-fade-in">
          {/* Full ID */}
          <div className="bg-gray-50 rounded-lg px-2.5 py-1.5 text-xs">
            <span className="text-gray-400 font-semibold">ID: </span>
            <code className="text-gray-600 break-all select-all">{o.id}</code>
            {o.order_number && (
              <span className="ml-1.5 text-gray-400">· #{o.order_number}</span>
            )}
          </div>

          {/* Time grid */}
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-gray-400 mb-0.5">Created</p>
              <p className="font-semibold text-gray-800">{formatDate(o.created_at)}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-2">
              <p className="text-gray-400 mb-0.5">Last update</p>
              <p className="font-semibold text-gray-800">{timeAgo(o.updated_at ?? o.created_at)}</p>
              <p className="text-blue-400 text-xs">{formatDate(o.updated_at)}</p>
            </div>
          </div>

          {/* Discount */}
          {Number(o.discount) > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-green-600 font-semibold bg-green-50 rounded px-2 py-1">
              🏷 Discount: -₹{Number(o.discount).toFixed(2)}
            </div>
          )}

          {/* Address */}
          {o.delivery_address && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded p-2 flex gap-1">
              <MapPin size={10} className="text-gray-400 flex-shrink-0 mt-0.5"/>
              <span>{o.delivery_address.split('\n')[0]}</span>
            </p>
          )}

          {/* Special instructions */}
          {o.special_instructions && (
            <p className="text-xs bg-yellow-50 rounded p-2 text-yellow-800 border border-yellow-100">
              📝 {o.special_instructions}
            </p>
          )}

          {/* Cancellation */}
          {o.cancellation_reason && (
            <p className="text-xs bg-red-50 rounded p-2 text-red-700 border border-red-100">
              ⚠ {o.cancellation_reason}
            </p>
          )}

          {/* Review indicator */}
          {(o.rating || o.review) && (
            <div className="flex items-center gap-1.5 text-xs bg-amber-50 rounded p-2 border border-amber-100">
              <Star size={11} className="fill-amber-400 text-amber-400 flex-shrink-0"/>
              <span className="text-amber-700 font-semibold">Rated {o.rating ?? '?'}/5</span>
              {o.review && (
                <span className="text-amber-600 truncate">&quot;{String(o.review).slice(0, 40)}&quot;</span>
              )}
            </div>
          )}

          {/* ✅ All action buttons are safe here — outside the div[role=button] */}
          <Actions o={o} p={{ ...p, orders: [], isAdmin: p.isAdmin }} />
        </div>
      )}
    </div>
  );
}


