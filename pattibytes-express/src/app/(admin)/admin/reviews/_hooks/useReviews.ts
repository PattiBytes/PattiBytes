/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useState } from 'react';
import { toast } from 'react-toastify';
import { supabase } from '@/lib/supabase';
import type { Review, ReviewFormData, MerchantOption, CustomerOption } from '../_types';

async function notifyUser(targetUserId: string, title: string, message: string, data: Record<string, unknown>) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    await fetch('/api/notify', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body   : JSON.stringify({ targetUserId, title, message, type: 'review', data }),
    });
  } catch { /* non-critical */ }
}

async function notifyMerchantFollowers(merchantId: string, merchantName: string, reviewTitle: string) {
  // Notify distinct customers who ordered from this merchant
  const { data: orders } = await supabase
    .from('orders')
    .select('customer_id')
    .eq('merchant_id', merchantId)
    .eq('status', 'delivered')
    .not('customer_id', 'is', null);

  const uniqueIds = [...new Set((orders ?? []).map((o: any) => o.customer_id as string))];

  // Also try favorites table (non-critical)
  try {
    const { data: favs } = await supabase
      .from('user_favorites')
      .select('user_id')
      .eq('merchant_id', merchantId);
    (favs ?? []).forEach((f: any) => { if (!uniqueIds.includes(f.user_id)) uniqueIds.push(f.user_id); });
  } catch { /* table may not exist */ }

  const msg = `A new review was posted for ${merchantName}: "${reviewTitle}"`;
  // Fire in batches of 5 with a small delay to avoid rate limits
  for (let i = 0; i < uniqueIds.length; i += 5) {
    await Promise.allSettled(
      uniqueIds.slice(i, i + 5).map(uid =>
        notifyUser(uid, `⭐ New Review — ${merchantName}`, msg, { merchant_id: merchantId }),
      ),
    );
  }
}

export function useReviews() {
  const [reviews,   setReviews]   = useState<Review[]>([]);
  const [merchants, setMerchants] = useState<MerchantOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [saving,    setSaving]    = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────
  const loadReviews = useCallback(async (merchantFilter?: string) => {
    setLoading(true);
    try {
      let q = supabase.from('reviews').select('*').order('created_at', { ascending: false });
      if (merchantFilter) q = q.eq('merchant_id', merchantFilter);
      const { data, error } = await q;
      if (error) throw error;

      const rows = data ?? [];
      const cIds = [...new Set(rows.map((r: any) => r.customer_id).filter(Boolean))] as string[];
      const mIds = [...new Set(rows.map((r: any) => r.merchant_id).filter(Boolean))] as string[];

      const [{ data: profiles }, { data: merch }] = await Promise.all([
        supabase.from('profiles').select('id, full_name, phone').in('id', cIds),
        supabase.from('merchants').select('id, business_name').in('id', mIds),
      ]);

      const pMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]));
      const mMap = Object.fromEntries((merch ?? []).map((m: any) => [m.id, m.business_name]));

      setReviews(rows.map((r: any) => ({
        ...r,
        customerName : pMap[r.customer_id]?.full_name ?? 'Unknown',
        customerPhone: pMap[r.customer_id]?.phone ?? null,
        merchantName : mMap[r.merchant_id] ?? 'Unknown',
      })));
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Load dropdowns ────────────────────────────────────────────────────────
  const loadOptions = useCallback(async () => {
    const [{ data: m }, { data: c }] = await Promise.all([
      supabase.from('merchants').select('id, business_name').eq('is_active', true).order('business_name'),
      supabase.from('profiles').select('id, full_name, phone, email').eq('role', 'customer').eq('is_active', true).order('full_name').limit(200),
    ]);
    setMerchants((m ?? []).map((x: any) => ({ id: x.id, business_name: x.business_name })));
    setCustomers((c ?? []).map((x: any) => ({ id: x.id, full_name: x.full_name, phone: x.phone, email: x.email })));
  }, []);

  // ── Add review (admin on behalf of customer, or direct) ───────────────────
  const addReview = useCallback(async (form: ReviewFormData, notifyFollowers: boolean) => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        overall_rating : form.overall_rating  ?? form.rating,
        created_at     : new Date().toISOString(),
        updated_at     : new Date().toISOString(),
        item_ratings   : [],
        images         : [],
      };
      const { data, error } = await supabase.from('reviews').insert(payload).select().single();
      if (error) throw error;

      // Update merchant aggregate
      await recalcMerchantRating(form.merchant_id);

      if (notifyFollowers) {
        const mName = merchants.find(m => m.id === form.merchant_id)?.business_name ?? 'the merchant';
        await notifyMerchantFollowers(form.merchant_id, mName, form.title ?? form.comment ?? 'New review');
      }

      // Notify the customer their review was added
      await notifyUser(
        form.customer_id,
        '✅ Your Review Was Posted',
        `Your review for ${merchants.find(m => m.id === form.merchant_id)?.business_name ?? 'the merchant'} has been published.`,
        { review_id: data.id, merchant_id: form.merchant_id },
      );

      toast.success('Review added!');
      await loadReviews();
      return true;
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to add review');
      return false;
    } finally {
      setSaving(false);
    }
  }, [loadReviews, merchants]);

  // ── Update review ─────────────────────────────────────────────────────────
  const updateReview = useCallback(async (id: string, patch: Partial<ReviewFormData>, review: Review) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('reviews')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;

      await recalcMerchantRating(review.merchant_id);

      // Notify customer their review was edited
      await notifyUser(
        review.customer_id,
        '📝 Your Review Was Updated',
        `An admin updated your review for ${review.merchantName ?? 'the merchant'}.`,
        { review_id: id, merchant_id: review.merchant_id },
      );

      toast.success('Review updated!');
      setReviews(prev => prev.map(r =>
        r.id === id ? { ...r, ...patch, updated_at: new Date().toISOString() } : r,
      ));
      return true;
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to update');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  // ── Delete review ─────────────────────────────────────────────────────────
  const deleteReview = useCallback(async (review: Review) => {
    if (!window.confirm(`Delete review by ${review.customerName}? This cannot be undone.`)) return false;
    try {
      const { error } = await supabase.from('reviews').delete().eq('id', review.id);
      if (error) throw error;

      await recalcMerchantRating(review.merchant_id);
      await notifyUser(
        review.customer_id,
        '🗑 Your Review Was Removed',
        `Your review for ${review.merchantName ?? 'the merchant'} has been removed by an admin.`,
        { merchant_id: review.merchant_id },
      );

      setReviews(prev => prev.filter(r => r.id !== review.id));
      toast.success('Review deleted');
      return true;
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to delete');
      return false;
    }
  }, []);

  // ── Grant offline review access (create stub + notify customer) ───────────
  const grantReviewAccess = useCallback(async (
    customerId: string, merchantId: string, note: string,
  ) => {
    setSaving(true);
    try {
      // Insert a minimal review row so the customer can see and edit it
      const { data, error } = await supabase.from('reviews').insert({
        customer_id  : customerId,
        merchant_id  : merchantId,
        rating       : 0,
        overall_rating: 0,
        comment      : '',
        title        : '',
        item_ratings : [],
        images       : [],
        created_at   : new Date().toISOString(),
        updated_at   : new Date().toISOString(),
      }).select().single();
      if (error) throw error;

      const mName = merchants.find(m => m.id === merchantId)?.business_name ?? 'the merchant';
      await notifyUser(
        customerId,
        '⭐ You Can Now Review',
        `${note || `You have been granted access to review ${mName}. Tap to write your review!`}`,
        { review_id: data.id, merchant_id: merchantId, action: 'write_review' },
      );

      toast.success('Access granted — customer notified!');
      await loadReviews();
      return true;
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to grant access');
      return false;
    } finally {
      setSaving(false);
    }
  }, [loadReviews, merchants]);

  return {
    reviews, merchants, customers, loading, saving,
    loadReviews, loadOptions, addReview, updateReview, deleteReview, grantReviewAccess,
  };
}

// Recalculate and persist merchant's average_rating + total_reviews
async function recalcMerchantRating(merchantId: string) {
  try {
    const { data } = await supabase
      .from('reviews')
      .select('rating, overall_rating')
      .eq('merchant_id', merchantId)
      .gt('rating', 0);
    if (!data?.length) return;
    const avg = data.reduce((s: number, r: any) => s + (Number(r.overall_rating || r.rating) || 0), 0) / data.length;
    await supabase.from('merchants').update({
      average_rating: Math.round(avg * 10) / 10,
      total_reviews : data.length,
      updated_at    : new Date().toISOString(),
    }).eq('id', merchantId);
  } catch { /* non-critical */ }
}
