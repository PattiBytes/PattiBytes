/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useState } from 'react';
import { toast } from 'react-toastify';
import { supabase } from '@/lib/supabase';
import { notifyCustomOrder } from '../_utils/notifications';
import type { CustomOrder } from '../_types';

const TABLE = 'custom_order_requests'; // ✅ correct

export function useCustomOrders() {
  const [customOrders,  setCustomOrders]  = useState<CustomOrder[]>([]);
  const [loadingCustom, setLoadingCustom] = useState(false);
  const [fetchError,    setFetchError]    = useState<string | null>(null);
  const [quotingId,     setQuotingId]     = useState<string | null>(null);

 const loadCustomOrders = useCallback(async () => {
  setLoadingCustom(true);
  setFetchError(null);

  // ✅ Abort controller — cancelled on unmount or re-call
  const controller = new AbortController();

  try {
    const { data: rows, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false })
      .abortSignal(controller.signal);    // ✅ tie query to controller

    // ✅ If aborted (unmount / StrictMode) — exit silently, no toast
    if (controller.signal.aborted) return;

    console.log(`[CustomOrders] table="${TABLE}" rows=${rows?.length ?? 0} error=`, error);

    if (error) {
      setFetchError(error.message);
      throw error;
    }

    const list = rows ?? [];

    const uids = [...new Set(list.map((o: any) => o.customer_id).filter(Boolean))] as string[];
    let profileMap: Record<string, string> = {};
    if (uids.length) {
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', uids)
        .abortSignal(controller.signal);   // ✅ tie second query too

      if (controller.signal.aborted) return;
      if (pErr) console.warn('[CustomOrders] profiles fetch:', pErr.message);
      profileMap = Object.fromEntries(
        (profiles ?? []).map((p: any) => [p.id, p.full_name ?? '']),
      );
    }

    setCustomOrders(list.map((o: any) => ({
      ...o,
      image_url   : o.image_url?.startsWith('file://') ? null : (o.image_url ?? null),
      customerName: profileMap[o.customer_id]
        ?? (o.customer_phone ? `+91 ${String(o.customer_phone)}` : 'Unknown Customer'),
    })));
  } catch (e: any) {
    // ✅ AbortError = component unmounted or query was intentionally cancelled
    //    It is NOT a real failure — never show a toast for it
    if (e?.name === 'AbortError' || controller.signal.aborted) return;

    console.error('[CustomOrders] ❌', e?.message ?? e);
    toast.error(`Custom orders: ${e?.message ?? 'Failed to load'}`);
  } finally {
    if (!controller.signal.aborted) setLoadingCustom(false);
  }
}, []);

  const quoteCustomOrder = useCallback(async (
    order       : CustomOrder,
    quotedAmount: number,
    quoteMessage: string,
  ) => {
    if (!quotedAmount || quotedAmount <= 0) { toast.error('Enter a valid amount'); return; }
    setQuotingId(order.id);
    try {
      const { error } = await supabase
        .from(TABLE)
        .update({
          quoted_amount: quotedAmount,
          quote_message: quoteMessage,
          status       : 'quoted',
          updated_at   : new Date().toISOString(),
        })
        .eq('id', order.id);
      if (error) throw error;

      await notifyCustomOrder(
        order.customer_id, order.id, order.custom_order_ref,
        '💬 Quote Received',
        `Your custom request (${order.custom_order_ref ?? order.id.slice(0, 8)}) has been quoted at ₹${quotedAmount.toFixed(2)}.`,
      );

      setCustomOrders(prev => prev.map(o =>
        o.id === order.id
          ? { ...o, status: 'quoted', quoted_amount: quotedAmount, quote_message: quoteMessage }
          : o,
      ));
      toast.success('Quote sent!');
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to send quote');
    } finally {
      setQuotingId(null);
    }
  }, []);

  const updateCustomOrderStatus = useCallback(async (order: CustomOrder, newStatus: string) => {
    try {
      const { error } = await supabase
        .from(TABLE)
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', order.id);
      if (error) throw error;

      await notifyCustomOrder(
        order.customer_id, order.id, order.custom_order_ref,
        'Custom Order Update',
        `Your request is now: ${newStatus.replace(/_/g, ' ')}.`,
      );

      setCustomOrders(prev => prev.map(o =>
        o.id === order.id ? { ...o, status: newStatus } : o,
      ));
      toast.success(`Status → ${newStatus}`);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to update status');
    }
  }, []);

  return {
    customOrders, loadingCustom, fetchError, quotingId,
    loadCustomOrders, quoteCustomOrder, updateCustomOrderStatus,
  };
}
