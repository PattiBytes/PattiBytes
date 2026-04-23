/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState } from 'react';
import { Edit2, Trash2, User, Store, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { StarRating } from './StarRating';
import type { Review } from '../_types';

interface Props {
  review  : Review;
  role    : string;
  onEdit  (r: Review): void;
  onDelete(r: Review): void;
}

function timeAgo(iso: string | null | undefined) {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'2-digit' });
}

const RATING_COLOR = (v: number) =>
  v >= 4 ? 'text-green-600' : v >= 3 ? 'text-amber-600' : 'text-red-500';

export function ReviewCard({ review: r, role, onEdit, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);
  const canEdit   = ['admin','superadmin','merchant'].includes(role);
  const canDelete = ['admin','superadmin'].includes(role);
  const rating    = Number(r.overall_rating || r.rating || 0);

  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in
      ${rating >= 4 ? 'border-l-4 border-l-green-300' : rating <= 2 && rating > 0 ? 'border-l-4 border-l-red-300' : 'border-l-4 border-l-amber-200'}`}>

      {/* Header */}
      <div className="px-4 py-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Avatar */}
          <div className="w-9 h-9 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">
            {(r.customerName ?? 'U')[0].toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-sm text-gray-900">{r.customerName}</p>
              {r.customerPhone && (
                <span className="text-xs text-gray-400">{r.customerPhone}</span>
              )}
              {r.orderNumber && (
                <span className="text-xs bg-gray-100 text-gray-500 px-1.5 rounded font-mono">
                  #{r.orderNumber}
                </span>
              )}
            </div>

            {/* Merchant */}
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
              <Store size={10}/>{r.merchantName}
            </p>

            {/* Main star rating */}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <StarRating value={rating} size={13} />
              {r.title && (
                <p className="text-xs font-semibold text-gray-700 italic">&quot;{r.title}&quot;</p>
              )}
            </div>
          </div>
        </div>

        {/* Right: time + actions */}
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <p className="text-xs text-gray-400">{timeAgo(r.updated_at ?? r.created_at)}</p>

          <div className="flex items-center gap-1">
            {canEdit && (
              <button
                onClick={() => onEdit(r)}
                className="p-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white transition-all"
                title="Edit review"
              >
                <Edit2 size={11}/>
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => onDelete(r)}
                className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-600 hover:text-white transition-all"
                title="Delete review"
              >
                <Trash2 size={11}/>
              </button>
            )}
            <button
              onClick={() => setExpanded(x => !x)}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 transition-all"
            >
              {expanded ? <ChevronUp size={11}/> : <ChevronDown size={11}/>}
            </button>
          </div>
        </div>
      </div>

      {/* Comment preview */}
      {r.comment && (
        <div className="px-4 pb-3">
          <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-2.5 border border-gray-100 leading-relaxed line-clamp-2">
            &quot;{r.comment}&quot;
          </p>
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50 space-y-3 animate-fade-in">
          {/* Sub-ratings grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Food',     val: r.food_rating     },
              { label: 'Service',  val: r.merchant_rating },
              { label: 'Delivery', val: r.delivery_rating },
              { label: 'Driver',   val: r.driver_rating   },
            ].filter(x => x.val != null && Number(x.val) > 0).map(({ label, val }) => (
              <div key={label} className="bg-white rounded-lg p-2 border border-gray-100 text-center">
                <p className="text-xs text-gray-400 mb-1">{label}</p>
                <p className={`text-sm font-bold ${RATING_COLOR(Number(val))}`}>{Number(val).toFixed(1)}★</p>
              </div>
            ))}
          </div>

          {/* Full comment */}
          {r.comment && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Comment</p>
              <p className="text-sm text-gray-700 leading-relaxed">{r.comment}</p>
            </div>
          )}

          {/* Images */}
          {(r.images ?? []).length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {(r.images ?? []).map((img, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={img} alt={`Review image ${i+1}`}
                  className="w-16 h-16 rounded-lg object-cover border border-gray-200 cursor-pointer hover:opacity-80"
                  onClick={() => window.open(img, '_blank')}
                />
              ))}
            </div>
          )}

          {/* Item ratings */}
          {(r.item_ratings ?? []).filter((x: any) => x?.name).length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase mb-1.5">Item Ratings</p>
              <div className="space-y-1">
                {(r.item_ratings ?? []).map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-white rounded px-2 py-1 border border-gray-100">
                    <span className="text-gray-700">{item.name}</span>
                    <StarRating value={Number(item.rating || 0)} size={11} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap pt-1">
            <span><User size={9} className="inline mr-0.5"/>{r.customer_id.slice(0, 8)}</span>
            <span>Created: {new Date(r.created_at).toLocaleString('en-IN')}</span>
            {r.updated_at && r.updated_at !== r.created_at && (
              <span>Updated: {new Date(r.updated_at).toLocaleString('en-IN')}</span>
            )}
            {r.order_id && (
              <a href={`/admin/orders/${r.order_id}`}
                className="flex items-center gap-0.5 text-primary hover:underline">
                <ExternalLink size={9}/> View Order
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


