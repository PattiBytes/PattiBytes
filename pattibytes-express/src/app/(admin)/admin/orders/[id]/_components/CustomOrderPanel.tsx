'use client';
import { useState } from 'react';
import { Sparkles, ExternalLink, ZoomIn, X, ImageOff, AlertTriangle } from 'lucide-react';
import { cx, type OrderNormalized } from './types';
import type { CustomOrderRequest } from './types';

// ─── helpers ─────────────────────────────────────────────────────────────────
function parseCategory(raw: string | null | undefined): string {
  if (!raw) return 'N/A';
  const t = raw.trim();
  if (t.startsWith('[')) {
    try {
      const a = JSON.parse(t);
      if (Array.isArray(a)) return a.map(String).filter(Boolean).join(', ');
    } catch { /* */ }
  }
  if (t.startsWith('{')) {
    try { const o = JSON.parse(t); return o.name ?? o.category ?? t; } catch { /* */ }
  }
  return t;
}

function isWeb(url: string | null | undefined): boolean {
  return !!url && (url.startsWith('http://') || url.startsWith('https://'));
}

const CUSTOM_STATUS_META: Record<string, { color: string; emoji: string }> = {
  pending:    { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', emoji: '⏳' },
  quoted:     { color: 'bg-blue-100 text-blue-800 border-blue-200',       emoji: '💬' },
  accepted:   { color: 'bg-green-100 text-green-800 border-green-200',    emoji: '✅' },
  rejected:   { color: 'bg-red-100 text-red-800 border-red-200',          emoji: '❌' },
  processing: { color: 'bg-indigo-100 text-indigo-800 border-indigo-200', emoji: '🔄' },
  delivered:  { color: 'bg-gray-100 text-gray-700 border-gray-200',       emoji: '📦' },
  reviewed:   { color: 'bg-purple-100 text-purple-800 border-purple-200', emoji: '⭐' },
  cancelled:  { color: 'bg-rose-100 text-rose-800 border-rose-200',       emoji: '🚫' },
  on_hold:    { color: 'bg-orange-100 text-orange-700 border-orange-200', emoji: '⏸' },
};

// ─── Image component with zoom ────────────────────────────────────────────────
function CustomImage({ url, label = 'Reference Image' }: { url: string; label?: string }) {
  const [zoomed, setZoomed] = useState(false);
  const [errored, setErrored] = useState(false);

  if (!isWeb(url)) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-amber-800">Mobile Local Image</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Image was captured on the customer&apos;s device and cannot be viewed on web.
          </p>
          <p className="text-[10px] text-amber-500 font-mono mt-1 break-all">{url}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={cx('relative group rounded-xl overflow-hidden border bg-gray-50',
          errored ? '' : 'cursor-zoom-in')}
        onClick={() => !errored && setZoomed(true)}
      >
        {/* Thumbnail */}
        {!errored ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={label}
              className="w-full max-h-56 object-contain transition group-hover:opacity-90"
              onError={() => setErrored(true)}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition rounded-xl flex items-center justify-center pointer-events-none">
              <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition drop-shadow-lg" />
            </div>
          </>
        ) : (
          <div className="w-full h-28 flex flex-col items-center justify-center gap-1 text-gray-400">
            <ImageOff className="w-7 h-7" />
            <p className="text-xs">Image failed to load</p>
          </div>
        )}

        {/* External link — always visible */}
        <a
          href={url} target="_blank" rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm p-1.5 rounded-lg shadow hover:bg-white transition"
        >
          <ExternalLink className="w-3.5 h-3.5 text-gray-600" />
        </a>
      </div>

      {!errored && (
        <p className="text-[10px] text-gray-400 mt-1 text-center">Tap to enlarge</p>
      )}

      {/* Zoom modal */}
      {zoomed && (
        <div
          className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center p-4"
          onClick={() => setZoomed(false)}
        >
          <button
            type="button"
            onClick={() => setZoomed(false)}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/25 text-white p-2.5 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div
            className="max-w-5xl max-h-[85vh] flex items-center justify-center"
            onClick={e => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`${label} (full size)`}
              className="max-w-full max-h-[82vh] object-contain rounded-xl shadow-2xl"
            />
          </div>

          <div className="absolute bottom-5 flex gap-3">
            <a
              href={url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
              onClick={e => e.stopPropagation()}
            >
              <ExternalLink className="w-4 h-4" /> Open original
            </a>
            <button
              type="button"
              onClick={() => setZoomed(false)}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
            >
              <X className="w-4 h-4" /> Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────
interface Props {
  order: OrderNormalized;
  customRequest?: CustomOrderRequest | null;   // ← row from custom_order_requests
}

export function CustomOrderPanel({ order, customRequest }: Props) {
  if (!order.customOrderRef && !order.customCategory && !customRequest) return null;

  const sm = order.customOrderStatus
    ? (CUSTOM_STATUS_META[order.customOrderStatus] ?? {
        color: 'bg-gray-100 text-gray-700 border-gray-200', emoji: '📋',
      })
    : null;

  const categoryDisplay = parseCategory(
    customRequest?.category ?? order.customCategory
  );

  // Image priority: custom_order_requests.image_url > orders.custom_image_url
  const imageUrl = customRequest?.image_url ?? order.customImageUrl;

  return (
    <div className="bg-gradient-to-br from-violet-50 to-pink-50 border border-violet-200 rounded-2xl p-4 sm:p-6 space-y-4">
      <h3 className="font-bold text-gray-900 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-violet-500" /> Custom Order Details
      </h3>

      {/* Meta grid */}
      <div className="grid sm:grid-cols-2 gap-3">
        {(order.customOrderRef ?? customRequest?.custom_order_ref) && (
          <div className="bg-white rounded-xl border p-3">
            <p className="text-xs font-semibold text-gray-500">Reference ID</p>
            <p className="font-black text-gray-900 font-mono tracking-wider mt-0.5 text-sm">
              {order.customOrderRef ?? customRequest?.custom_order_ref}
            </p>
          </div>
        )}

        {categoryDisplay && categoryDisplay !== 'N/A' && (
          <div className="bg-white rounded-xl border p-3">
            <p className="text-xs font-semibold text-gray-500">Category</p>
            <p className="font-bold text-gray-900 mt-0.5 capitalize">{categoryDisplay}</p>
          </div>
        )}

        {order.customOrderStatus && sm && (
          <div className="bg-white rounded-xl border p-3">
            <p className="text-xs font-semibold text-gray-500">Custom Status</p>
            <span className={cx(
              'inline-flex items-center gap-1.5 mt-1 text-xs font-bold px-2.5 py-1 rounded-full border',
              sm.color
            )}>
              {sm.emoji} {order.customOrderStatus.replace(/_/g, ' ')}
            </span>
          </div>
        )}

        {order.quotedAmount != null && (
          <div className="bg-white rounded-xl border p-3">
            <p className="text-xs font-semibold text-gray-500">Admin Quoted</p>
            <p className="font-black text-violet-700 text-lg mt-0.5">
              {/* toINR is imported from types */}
              ₹{Number(order.quotedAmount).toFixed(2)}
            </p>
          </div>
        )}

        {order.platformHandled != null && (
          <div className="bg-white rounded-xl border p-3">
            <p className="text-xs font-semibold text-gray-500">Platform Handled</p>
            <p className={cx('font-bold mt-0.5', order.platformHandled ? 'text-green-700' : 'text-gray-400')}>
              {order.platformHandled ? '✓ Yes' : '✗ No'}
            </p>
          </div>
        )}

        {order.hubOrigin && (
          <div className="bg-white rounded-xl border p-3">
            <p className="text-xs font-semibold text-gray-500">Hub Origin</p>
            <p className="font-bold text-gray-900 mt-0.5">{order.hubOrigin}</p>
          </div>
        )}
      </div>

      {/* Customer description (from custom_order_requests) */}
      {customRequest?.description && (
        <div className="bg-white rounded-xl border p-3">
          <p className="text-xs font-semibold text-gray-500 mb-1.5">📝 Customer Description</p>
          <p className="text-sm text-gray-800 whitespace-pre-line">{customRequest.description}</p>
        </div>
      )}

      {/* Quote message */}
      {order.quoteMessage && (
        <div className="bg-white rounded-xl border p-3">
          <p className="text-xs font-semibold text-gray-500 mb-1.5">💬 Quote Message</p>
          <p className="text-sm text-gray-800 whitespace-pre-line">{order.quoteMessage}</p>
        </div>
      )}

      {/* Admin notes (from custom_order_requests) */}
      {customRequest?.admin_notes && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
          <p className="text-xs font-bold text-amber-800 mb-1.5">🗒 Admin Notes</p>
          <p className="text-sm text-amber-900 whitespace-pre-line">{customRequest.admin_notes}</p>
        </div>
      )}

      {/* Reference image — with proper priority fallback */}
      {imageUrl && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
            📷 Reference Image
            {isWeb(imageUrl) && (
              <span className="text-[10px] text-gray-400 font-normal">click to enlarge</span>
            )}
          </p>
          <CustomImage url={imageUrl} label="Custom order reference" />
        </div>
      )}
    </div>
  );
}
