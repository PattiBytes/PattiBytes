import { supabase } from '../lib/supabase';

export interface ReviewSubmission {
  order_id: string;
  merchant_id: string;
  customer_id: string;
  rating: number;        // 1–5
  review: string;
}

export async function submitOrderReview(data: ReviewSubmission): Promise<{ error: string | null }> {
  try {
    // 1. Update order row
    const { error: oErr } = await supabase
      .from('orders')
      .update({ rating: data.rating, review: data.review.trim() || null })
      .eq('id', data.order_id)
      .eq('customer_id', data.customer_id);
    if (oErr) throw oErr;

    // 2. Insert into reviews table if it exists
    await supabase.from('reviews').insert({
      order_id: data.order_id,
      merchant_id: data.merchant_id,
      customer_id: data.customer_id,
      rating: data.rating,
      review: data.review.trim() || null,
      created_at: new Date().toISOString(),
    });

    // 3. Recompute merchant average_rating
    const { data: rows } = await supabase
      .from('orders')
      .select('rating')
      .eq('merchant_id', data.merchant_id)
      .eq('status', 'delivered')
      .not('rating', 'is', null);

    if (rows?.length) {
      const avg = rows.reduce((s: number, r: any) => s + r.rating, 0) / rows.length;
      await supabase.from('merchants').update({
        average_rating: Math.round(avg * 10) / 10,
        total_reviews: rows.length,
      }).eq('id', data.merchant_id);
    }
    return { error: null };
  } catch (e: any) {
    return { error: e.message ?? 'Failed to submit review' };
  }
}
