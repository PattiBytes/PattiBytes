'use client';
import { Package, StickyNote, AlertTriangle } from 'lucide-react';
import { toINR, cx, type OrderNormalized, type OrderItem } from './types';

function VegDot({ isVeg }: { isVeg?: boolean }) {
  if (isVeg === undefined) return null;
  return (
    <span className={cx(
      'inline-flex items-center justify-center w-4 h-4 border-2 rounded-sm shrink-0',
      isVeg ? 'border-green-600' : 'border-red-600'
    )}>
      <span className={cx('w-1.5 h-1.5 rounded-full', isVeg ? 'bg-green-600' : 'bg-red-600')} />
    </span>
  );
}

function ItemRow({ item, index }: { item: OrderItem; index: number }) {
  const qty   = Number(item.quantity ?? 1);
  const price = Number(item.price ?? 0);
  const disc  = Number(item.discount_percentage ?? item.discountpercentage ?? 0);
  const effectivePrice = disc > 0 ? price * (1 - disc / 100) : price;
  const lineTotal = effectivePrice * qty;
  const isVeg = item.is_veg ?? item.isveg;
  const imageUrl = item.image_url ?? item.imageurl;

  return (
    <div className="flex gap-3 py-3 border-b last:border-0">
      {/* Thumbnail */}
      <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
        {imageUrl && imageUrl.startsWith('http') && !imageUrl.includes('google.com/search') ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <Package className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <VegDot isVeg={isVeg} />
            <p className="font-bold text-gray-900 truncate">{item.name ?? `Item ${index + 1}`}</p>
            {item.is_free && (
              <span className="shrink-0 text-[10px] font-black bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
                FREE
              </span>
            )}
            {item.is_custom_product && (
              <span className="shrink-0 text-[10px] font-bold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
                Custom
              </span>
            )}
          </div>
          <p className="font-bold text-gray-900 shrink-0">
            {item.is_free ? (
              <span className="text-green-600">Free</span>
            ) : toINR(lineTotal)}
          </p>
        </div>

        <p className="text-xs text-gray-500 mt-0.5">
          {toINR(effectivePrice)} × {qty}
          {disc > 0 && <span className="ml-1.5 text-orange-600 font-semibold">{disc}% off</span>}
          {item.category && <span className="ml-1.5 text-gray-400">· {item.category}</span>}
        </p>
        {item.note && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-2 py-1 mt-1.5">
            📝 {item.note}
          </p>
        )}
      </div>
    </div>
  );
}

interface Props { order: OrderNormalized; }

export function OrderItemsPanel({ order }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6 space-y-4">
      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
        <Package className="w-5 h-5 text-primary" />
        Order Items
        <span className="text-sm font-normal text-gray-500">({order.items.length})</span>
      </h3>

      {order.items.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">No items in this order</p>
      ) : (
        <div className="divide-y">
          {order.items.map((it, i) => <ItemRow key={it.id ?? i} item={it} index={i} />)}
        </div>
      )}

      {/* Notes & Instructions */}
      {order.customerNotes && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
          <p className="text-xs font-bold text-yellow-900 mb-1 flex items-center gap-1">
            <StickyNote className="w-3.5 h-3.5" /> Customer Notes
          </p>
          <p className="text-sm text-yellow-900 whitespace-pre-line">{order.customerNotes}</p>
        </div>
      )}

      {order.specialInstructions && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <p className="text-xs font-bold text-blue-900 mb-1">⚙ Special Instructions</p>
          <p className="text-sm text-blue-900 whitespace-pre-line">{order.specialInstructions}</p>
        </div>
      )}

      {order.deliveryInstructions && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
          <p className="text-xs font-bold text-indigo-900 mb-1">🚪 Delivery Instructions</p>
          <p className="text-sm text-indigo-900 whitespace-pre-line">{order.deliveryInstructions}</p>
        </div>
      )}

      {/* Cancellation */}
      {order.status === 'cancelled' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-xs font-bold text-red-900 mb-1 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Cancellation Info
          </p>
          <p className="text-sm text-red-900">
            Reason: <strong>{order.cancellationReason || 'Not provided'}</strong>
          </p>
          {order.cancelledBy && (
            <p className="text-xs text-red-700 mt-1">Cancelled by: {order.cancelledBy}</p>
          )}
        </div>
      )}
    </div>
  );
}
