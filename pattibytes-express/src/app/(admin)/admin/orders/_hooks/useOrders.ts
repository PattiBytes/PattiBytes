/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { supabase } from '@/lib/supabase';
import { resolveCustomerName } from '../_utils/formatters';
import { notifyStatusChange, notifyDriver } from '../_utils/notifications';
import { loadAvailableDriversStrict, upsertDriverAssignments } from '../_utils/drivers';
import { exportOrdersToCSV } from '../_utils/exportCSV';
import type { Order, OrderStats, DriverRow } from '../_types';

const ACTIVE = ['pending','confirmed','preparing','ready','assigned','picked_up'];

export function useOrders() {
  const [orders,           setOrders]           = useState<Order[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [refreshing,       setRefreshing]       = useState(false);
  const [drivers,          setDrivers]          = useState<DriverRow[]>([]);
  const [updatingOrderId,  setUpdatingOrderId]  = useState<string | null>(null);
  const [deletingOrderId,  setDeletingOrderId]  = useState<string | null>(null);
  const [notifyingOrderId, setNotifyingOrderId] = useState<string | null>(null);
  const [lastRefreshed,    setLastRefreshed]    = useState<Date | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, order_number, customer_id, merchant_id, driver_id,
          items, subtotal, delivery_fee, tax, total_amount, discount,
          status, payment_method, payment_status,
          created_at, updated_at, customer_notes, customer_phone,
          special_instructions, delivery_address, order_type,
          custom_order_ref, custom_order_status,
          quoted_amount, quote_message, custom_category, custom_image_url,
          preparation_time, estimated_delivery_time, cancellation_reason,
          profiles:customer_id (full_name),
          merchants:merchant_id (business_name)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;

      setOrders((data ?? []).map((o: any) => ({
        ...o, customerName: resolveCustomerName(o),
      })));
      setLastRefreshed(new Date());
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load orders');
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  const stats = useMemo<OrderStats>(() => ({
    total        : orders.length,
    active       : orders.filter(o => ACTIVE.includes(o.status)).length,
    completed    : orders.filter(o => o.status === 'delivered').length,
    revenue      : orders.reduce((s, o) => s + (Number(o.total_amount) || 0), 0),
    customPending: 0, // filled from custom orders hook in page.tsx
  }), [orders]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOrders();
    toast.success('Refreshed');
  }, [loadOrders]);

  const updateOrderStatus = useCallback(async (order: Order, newStatus: string) => {
    if (order.status === newStatus) return;
    setUpdatingOrderId(order.id);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', order.id);
      if (error) throw error;

      // Optimistic UI update
      setOrders(prev => prev.map(o =>
        o.id === order.id ? { ...o, status: newStatus, updated_at: new Date().toISOString() } : o,
      ));

      // Uses /api/notify route → DB insert + OneSignal push + admin fan-out
      void notifyStatusChange(order.customer_id, order.id, order.order_number, newStatus);
      toast.success(`Status → ${newStatus.replace(/_/g, ' ')}`);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update status');
    } finally {
      setUpdatingOrderId(null);
    }
  }, []);

  const notifyAllDrivers = useCallback(async (order: Order) => {
    setNotifyingOrderId(order.id);
    try {
      let list = drivers;
      if (!list.length) { list = await loadAvailableDriversStrict(); setDrivers(list); }
      if (!list.length) { toast.warning('No available drivers found'); return; }

      await upsertDriverAssignments(order.id, list.map(d => d.id));

      let ok = 0;
      // Fire all in parallel — each call goes through /api/notify
      const results = await Promise.allSettled(
        list.map(d => notifyDriver(d.id, order.id, order.merchant_id, Number(order.total_amount))),
      );
      results.forEach(r => { if (r.status === 'fulfilled' && r.value) ok++; });
      toast.success(`Notified ${ok} / ${list.length} driver(s)`);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to notify drivers');
    } finally {
      setNotifyingOrderId(null);
    }
  }, [drivers]);

  const deleteOrder = useCallback(async (order: Order, isAdmin: boolean) => {
    if (!isAdmin) { toast.error('Admins only'); return; }
    if (!window.confirm(
      `⚠️ Permanently delete Order #${order.order_number ?? order.id.slice(0, 8)}\n` +
      `Customer: ${order.customerName}  ·  ₹${Number(order.total_amount).toFixed(2)}\n\n` +
      `This cannot be undone.`,
    )) return;

    setDeletingOrderId(order.id);
    try {
      if (order.driver_id || ACTIVE.includes(order.status))
        await supabase.from('driver_assignments').delete().eq('order_id', order.id);

      try {
        await supabase.from('notifications').delete().or(`data->>order_id.eq.${order.id}`);
      } catch { /* non-critical */ }

      const { error } = await supabase.from('orders').delete().eq('id', order.id);
      if (error) throw error;

      // Notify via /api/notify (includes admin fan-out)
      if (order.customer_id)
        void notifyStatusChange(order.customer_id, order.id, order.order_number, 'deleted by admin');

      setOrders(prev => prev.filter(o => o.id !== order.id));
      toast.success('Order deleted');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete');
    } finally {
      setDeletingOrderId(null);
    }
  }, []);

  return {
    orders, loading, refreshing, stats, lastRefreshed,
    updatingOrderId, deletingOrderId, notifyingOrderId,
    loadOrders, handleRefresh,
    updateOrderStatus, notifyAllDrivers, deleteOrder,
    exportToCSV: () => exportOrdersToCSV(orders),
  };
}
