/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useEffect, useState } from 'react';
import { Star, MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { fmtTime, cx, type ReviewRow } from './types';

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={cx('w-4 h-4', i < Math.round(value) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-100')}
        />
      ))}
      <span className="text-xs text-gray-500 ml-1 font-semibold">{Number(value).toFixed(1)}</span>
    </span>
  );
}

function RatingRow({ label, value }: { label: string; value?: number | null }) {
  if (value == null) return null;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-600">{label}</span>
      <StarRating value={Number(value)} />
    </div>
  );
}

interface Props {
  orderId: string;
  orderRating: number | null;
  orderReview: string | null;
}

export function ReviewPanel({ orderId, orderRating, orderReview }: Props) {
  const [review, setReview] = useState<ReviewRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('reviews')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle();
      setReview((data as ReviewRow) ?? null);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const hasReview = review || orderRating != null || orderReview;
  if (!hasReview && !loading) return null;

  const overall = review?.overall_rating ?? review?.rating ?? orderRating;
  const comment = review?.comment ?? orderReview;
  const itemRatings = review?.item_ratings
    ? (Array.isArray(review.item_ratings) ? review.item_ratings
       : typeof review.item_ratings === 'string' ? JSON.parse(review.item_ratings) : [])
    : [];

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6">
      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Star className="w-5 h-5 text-amber-400 fill-amber-400" /> Customer Review
      </h3>

      {loading ? (
        <p className="text-sm text-gray-400">Loading review…</p>
      ) : !hasReview ? null : (
        <div className="space-y-4">
          {/* Overall rating */}
          {overall != null && (
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 text-center">
              <p className="text-4xl font-black text-amber-600">{Number(overall).toFixed(1)}</p>
              <StarRating value={Number(overall)} />
              <p className="text-xs text-gray-500 mt-1">Overall Rating</p>
            </div>
          )}

          {/* Sub-ratings */}
          <div className="space-y-2">
            <RatingRow label="🍽 Food"     value={review?.food_rating} />
            <RatingRow label="🛍 Merchant" value={review?.merchant_rating} />
            <RatingRow label="🚴 Driver"   value={review?.driver_rating} />
            <RatingRow label="🚚 Delivery" value={review?.delivery_rating} />
          </div>

          {/* Comment */}
          {comment && (
            <div className="bg-gray-50 rounded-xl p-3 border">
              <p className="flex items-center gap-1 text-xs font-bold text-gray-500 mb-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> Review
              </p>
              <p className="text-sm text-gray-800 whitespace-pre-line">{comment}</p>
            </div>
          )}

          {/* Item ratings */}
          {itemRatings.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2">Per-Item Ratings</p>
              <div className="space-y-1.5">
                {itemRatings.map((ir: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-gray-700 truncate max-w-[60%]">
                      {ir.name ?? ir.item_name ?? `Item ${i + 1}`}
                    </span>
                    <StarRating value={Number(ir.rating ?? ir.value ?? 0)} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {review?.created_at && (
            <p className="text-xs text-gray-400">Reviewed {fmtTime(review.created_at)}</p>
          )}
        </div>
      )}
    </div>
  );
}
