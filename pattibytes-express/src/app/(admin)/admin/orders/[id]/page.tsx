/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

import { useAuth }   from '@/contexts/AuthContext';
import { supabase }  from '@/lib/supabase';
import DashboardLayout        from '@/components/layouts/DashboardLayout';
import { PageLoadingSpinner } from '@/components/common/LoadingSpinner';
import { sendNotification }   from '@/utils/notifications';

import {
  detectStyle, makeCols, normalizeOrder,
  fromDatetimeLocal,
  type OrderNormalized, type ProfileMini, type MerchantInfo,
  type DriverRow, type EditFields, type ColMap,
} from './_components/types';
import { buildInvoiceHtml }    from './_components/invoiceBuilder';
import type { AppSettingsRow as AppSettings } from '@/services/appSettings';

// ── Panel components — ONE import each, no duplicates ──────────────────────
import { OrderHeader }            from './_components/OrderHeader';
import { MetricsBar }             from './_components/MetricsBar';
import { StatusControl }          from './_components/StatusControl';
import { OrderItemsPanel }        from './_components/OrderItemsPanel';
import { PromoInfoPanel }         from './_components/PromoInfoPanel';
import { CustomOrderPanel }       from './_components/CustomOrderPanel';
import { FinancialPanel }         from './_components/FinancialPanel';
import { AdminEditPanel }         from './_components/AdminEditPanel';
import { CustomerPanel }          from './_components/CustomerPanel';
import { MerchantDriverPanel }    from './_components/MerchantDriverPanel';
import { LocationPanel }          from './_components/LocationPanel';
import { ReviewPanel }            from './_components/ReviewPanel';
// ── Multi-cart session components (NEW — import ONCE each) ─────────────────
import { SessionOrdersBanner }    from './_components/SessionOrdersBanner';
import { SessionFinancialCard }   from './_components/SessionFinancialCard';



// ── Types ──────────────────────────────────────────────────────────────────────
type SessionSummary = {
  id:             string;
  total_amount:   number;
  merchant_ids:   string[] | null;
  order_ids:      string[] | null;
  status:         string;
  payment_method: string | null;
  payment_status: string | null;
  merchant_bills: any[] | null;
  discount:       number;
  created_at:     string;
};

// ── Safe fetch helper ──────────────────────────────────────────────────────────
async function safeFetch<T>(
  table: string,
  idField: string,
  id: string | null | undefined,
  select = '*',
): Promise<T | null> {
  if (!id || !id.trim() || id.startsWith(':')) return null;
  const { data, error } = await supabase
    .from(table).select(select).eq(idField, id).maybeSingle();
  if (error) { console.warn(`safeFetch(${table}):`, error.message); return null; }
  return (data as T) ?? null;
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function AdminOrderDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router   = useRouter();
  const params   = useParams();
  const orderId  = String((params as any)?.id || '');

  const [cols,          setCols]          = useState<ColMap>(makeCols('snake'));
  const [order,         setOrder]         = useState<OrderNormalized | null>(null);
  const [customer,      setCustomer]      = useState<ProfileMini | null>(null);
  const [merchant,      setMerchant]      = useState<MerchantInfo | null>(null);
  const [driver,        setDriver]        = useState<ProfileMini | null>(null);
  const [drivers,       setDrivers]       = useState<DriverRow[]>([]);
  const [customRequest, setCustomRequest] = useState<
    import('./_components/types').CustomOrderRequest | null
  >(null);
  const [session,       setSession]       = useState<SessionSummary | null>(null);  // ← NEW
  const [sessionOrders, setSessionOrders] = useState<any[]>([]);                    // ← NEW
  const [loading,       setLoading]       = useState(true);
  const [updating,      setUpdating]      = useState(false);
  const [assigning,     setAssigning]     = useState(false);
  const [notifying,     setNotifying]     = useState(false);
  const [appSettings,   setAppSettings]   = useState<AppSettings | null>(null);

  const isAdmin = useMemo(() => {
    const r = String((user as any)?.role || '');
    return r === 'admin' || r === 'superadmin';
  }, [user]);

  // ── loadAll ──────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const { data: row, error } = await supabase
        .from('orders').select('*').eq('id', orderId).single();
      if (error) throw error;

      const style = detectStyle(row);
      const c     = makeCols(style);
      setCols(c);
      const o = normalizeOrder(row, c);
      setOrder(o);

      // custom_order_requests
      if (o.customOrderRef || o.orderType === 'custom') {
        const filters: string[] = [];
        if (o.customOrderRef) filters.push(`custom_order_ref.eq.${o.customOrderRef}`);
        if (o.id)             filters.push(`order_id.eq.${o.id}`);
        if (filters.length) {
          const { data: crData } = await supabase
            .from('custom_order_requests')
            .select('*')
            .or(filters.join(','))
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          setCustomRequest((crData as any) ?? null);
        } else { setCustomRequest(null); }
      } else { setCustomRequest(null); }

      // ── NEW: load session if this is a multi-cart order ────────────────
      const cartSessionId = (row as any).cart_session_id ?? null;

      const [cst, mrc, drv, driverList, appSettingsRes, sessionRes] = await Promise.all([
        safeFetch<ProfileMini>('profiles',  'id', o.customerId),
        safeFetch<MerchantInfo>('merchants', 'id', o.merchantId),
        safeFetch<DriverRow>('profiles',    'id', o.driverId),
        supabase.from('profiles')
          .select('id,full_name,phone,is_active')
          .eq('role', 'driver').eq('is_active', true),
        supabase.from('app_settings').select('*').limit(1).maybeSingle(),
        // ── NEW: session fetch ──────────────────────────────────────────
        cartSessionId
          ? supabase
              .from('multi_cart_sessions')
              .select('id,total_amount,merchant_ids,order_ids,status,payment_method,payment_status,merchant_bills,discount,created_at')
              .eq('id', cartSessionId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      setCustomer(cst);
      setMerchant(mrc);
      setDriver(drv);
      setDrivers((driverList.data as DriverRow[]) ?? []);
      setAppSettings((appSettingsRes.data as AppSettings) ?? null);

      const sess = sessionRes.data as SessionSummary | null;
      setSession(sess);

      // ── NEW: load sibling orders in session ────────────────────────────
      if (sess?.order_ids?.length) {
        const siblings = (sess.order_ids ?? []).filter(id => id !== orderId);
        if (siblings.length) {
          const { data: siblingRows } = await supabase
            .from('orders')
            .select('id,order_number,status,total_amount,merchant_id,order_type')
            .in('id', siblings)
            .order('session_order_index', { ascending: true });

          // Enrich with merchant names
          const mids = [...new Set(
            (siblingRows ?? []).map((s: any) => s.merchant_id).filter(Boolean),
          )];
          const mNames: Record<string, string> = {};
          if (mids.length) {
            const { data: ms } = await supabase
              .from('merchants').select('id,business_name').in('id', mids);
            (ms ?? []).forEach((m: any) => { mNames[m.id] = m.business_name; });
          }
          setSessionOrders(
            (siblingRows ?? []).map((s: any) => ({
              ...s,
              merchant_name: mNames[s.merchant_id] ?? 'Restaurant',
            })),
          );
        } else {
          setSessionOrders([]);
        }
      } else {
        setSessionOrders([]);
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load order');
      router.push('/admin/orders');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  const loadDrivers = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'driver');
    const list = ((data ?? []) as any[]).filter(d =>
      typeof d.is_active === 'boolean' ? d.is_active
      : typeof d.isactive === 'boolean' ? d.isactive
      : true,
    );
    setDrivers(list as DriverRow[]);
  }, []);

  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push(`/login?redirect=/admin/orders/${orderId}`); return; }
    if (!isAdmin) { router.push('/'); return; }

    loadAll();
    loadDrivers();

    const ch = supabase
      .channel(`admin-order-${orderId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public',
        table: 'orders', filter: `id=eq.${orderId}`,
      }, () => loadAll())
      .subscribe();

    return () => { ch.unsubscribe(); };
  }, [authLoading, user?.id, isAdmin, orderId]);

  // ── updateStatus ───────────────────────────────────────────────────────────
  const updateStatus = async (newStatus: string) => {
    if (!order) return;
    setUpdating(true);
    try {
      const now   = new Date().toISOString();
      const patch: any = { status: newStatus, [cols.updatedAt]: now };

      if (newStatus === 'cancelled') {
        const reason = window.prompt('Cancellation reason (optional):') ?? '';
        patch[cols.cancellationReason] = reason.trim() || null;
        patch[cols.cancelledBy]        = (user as any)?.role ?? 'admin';
      }
      if (newStatus === 'delivered') {
        patch[cols.actualDeliveryTime] = now;
        patch[cols.paymentStatus]      = 'paid';
      }

      const { error } = await supabase.from('orders').update(patch).eq('id', order.id);
      if (error) throw error;

      // ── Notify customer ──────────────────────────────────────────────
      const notifyId = order.customerId ?? customRequest?.customer_id;
      if (notifyId) {
        const label = order.orderType === 'custom'
          ? `Custom order #${order.customOrderRef ?? order.orderNumber}`
          : `Order #${order.orderNumber}`;
        await sendNotification(
          notifyId,
          'Order Status Updated',
          `${label} is now ${newStatus.replace(/_/g, ' ')}.`,
          'order',
          {
            order_id:         order.id,
            order_number:     order.orderNumber,
            status:           newStatus,
            custom_order_ref: order.customOrderRef ?? undefined,
          },
        );
      }

      // Notify drivers when ready & unassigned
      if (newStatus === 'ready' && !order.driverId) await notifyDrivers(order);

      // ── NEW: sync session status when all orders deliver/cancel ──────
      if (session?.id && (newStatus === 'delivered' || newStatus === 'cancelled')) {
        void syncSessionStatus(session.id, order.id, newStatus);
      }

      toast.success(`Status → ${newStatus.replace(/_/g, ' ')}`);
      await loadAll();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  // ── NEW: sync multi_cart_sessions.status ──────────────────────────────────
  const syncSessionStatus = async (
    sessionId: string,
    updatedOrderId: string,
    updatedStatus: string,
  ) => {
    try {
      // Re-fetch all session order statuses
      const { data: allOrders } = await supabase
        .from('orders')
        .select('id,status')
        .eq('cart_session_id', sessionId);

      if (!allOrders?.length) return;

      const statuses = allOrders.map((o: any) =>
        o.id === updatedOrderId ? updatedStatus : o.status,
      );

      let newSessionStatus: string;
      if (statuses.every(s => s === 'delivered'))          newSessionStatus = 'completed';
      else if (statuses.every(s => s === 'cancelled'))     newSessionStatus = 'cancelled';
      else if (statuses.some(s => s === 'delivered'))      newSessionStatus = 'partial';
      else                                                  newSessionStatus = 'pending';

      await supabase
        .from('multi_cart_sessions')
        .update({ status: newSessionStatus, updated_at: new Date().toISOString() })
        .eq('id', sessionId);
    } catch (e) {
      console.warn('syncSessionStatus:', e);
    }
  };

  // ── saveEditFields ─────────────────────────────────────────────────────────
const saveEditFields = async (fields: EditFields & {
  items?: any[];
  _computedSubtotal?: number;
  _computedTotal?: number;
}) => {
  if (!order) return;
  setUpdating(true);
  try {
    const now = new Date().toISOString();

    const prepNum        = fields.preparationTime.trim() === '' ? null : Number(fields.preparationTime);
    const deliveryFeeNum = fields.deliveryFee.trim() === ''     ? order.deliveryFee  : Number(fields.deliveryFee);
    const discountNum    = fields.discount.trim() === ''        ? order.discount     : Number(fields.discount);
    const quotedNum      = fields.quotedAmount.trim() === ''    ? null               : Number(fields.quotedAmount);

    if (prepNum != null && !Number.isFinite(prepNum)) {
      toast.error('Prep time must be a valid number'); return;
    }

    // ── Recalculate subtotal from edited items ──────────────────────────
    const updatedItems = fields.items ?? null;

    const newSubtotal = updatedItems
      ? updatedItems.reduce((s: number, it: any) => {
          const disc = (it.discount_percentage ?? 0) > 0
            ? it.price * (1 - it.discount_percentage / 100)
            : it.price;
          return s + disc * it.quantity;
        }, 0)
      : order.subtotal;

    const newTotal = fields._computedTotal
      ?? Math.max(0, Math.round((newSubtotal - discountNum + deliveryFeeNum + order.tax) * 100) / 100);

    const patch: any = {
      [cols.updatedAt]:             now,
      [cols.paymentStatus]:         fields.paymentStatus || null,
      [cols.deliveryFee]:           deliveryFeeNum,
      discount:                     discountNum,
      subtotal:                     Math.round(newSubtotal * 100) / 100,  // ← NEW
      [cols.totalAmount]:           newTotal,
      [cols.estimatedDeliveryTime]: fromDatetimeLocal(fields.estimatedDeliveryTime),
      [cols.actualDeliveryTime]:    fromDatetimeLocal(fields.actualDeliveryTime),
      [cols.preparationTime]:       prepNum,
      [cols.customerNotes]:         fields.customerNotes.trim()        || null,
      [cols.specialInstructions]:   fields.specialInstructions.trim()  || null,
      [cols.deliveryInstructions]:  fields.deliveryInstructions.trim() || null,
      [cols.cancellationReason]:    fields.cancellationReason.trim()   || null,
      [cols.recipientName]:         fields.recipientName.trim()        || null,
      [cols.quoteMessage]:          fields.quoteMessage.trim()         || null,
    };

    // ── ✅ FIX: Write items to DB ──────────────────────────────────────
    if (updatedItems) {
      // Normalize items so they match the existing DB shape exactly
      patch.items = updatedItems.map((it: any) => ({
        id:                  it.id,
        name:                it.name,
        price:               Number(it.price) || 0,
        quantity:            Number(it.quantity) || 1,
        is_veg:              it.is_veg ?? false,
        is_free:             it.is_free ?? false,
        category:            it.category ?? null,
        image_url:           it.image_url ?? null,
        menu_item_id:        it.menu_item_id ?? it.id,
        merchant_id:         it.merchant_id ?? order.merchantId ?? null,
        discount_percentage: Number(it.discount_percentage) || 0,
        category_id:         it.category_id ?? null,
        note:                it.note ?? null,
        is_custom_product:   it.is_custom_product ?? false,
      }));
    }

    // ── Custom order fields ──────────────────────────────────────────────
    if (order.orderType === 'custom' || order.customOrderRef) {
      patch[cols.quotedAmount]    = quotedNum;
      patch[cols.platformHandled] = fields.platformHandled;

      const customStatus = fields.customOrderStatus?.trim();
      if (customStatus) {
        const VALID_CUSTOM_STATUSES = [
          'pending', 'quoted', 'accepted', 'rejected',
          'processing', 'delivered', 'reviewed', 'cancelled', 'on_hold',
        ];
        if (VALID_CUSTOM_STATUSES.includes(customStatus)) {
          patch[cols.customOrderStatus] = customStatus;
        } else {
          toast.error(`Invalid custom status: "${customStatus}"`);
          setUpdating(false);
          return;
        }
      }
    }

    const { error } = await supabase.from('orders').update(patch).eq('id', order.id);
    if (error) throw error;

    // ── Notify customer if quote message changed ────────────────────────
    if (
      order.customerId &&
      fields.quoteMessage.trim() &&
      fields.quoteMessage.trim() !== (order.quoteMessage ?? '')
    ) {
      await sendNotification(
        order.customerId,
        'Quote Ready — Custom Order',
        `Your custom order #${order.customOrderRef ?? order.orderNumber} has a new quote. Tap to view.`,
        'order',
        { order_id: order.id, type: 'quote' },
      );
    }

    // ── Sync session merchant_bills if fee/discount/items changed ───────
    if (session?.id && session.merchant_bills?.length) {
      const updatedBills = session.merchant_bills.map((b: any) =>
        b.merchant_id === order.merchantId
          ? {
              ...b,
              subtotal:     Math.round(newSubtotal * 100) / 100,  // ← sync subtotal too
              delivery_fee: deliveryFeeNum,
              discount:     discountNum,
              total:        Math.max(0, newSubtotal - discountNum + deliveryFeeNum + (b.tax ?? 0)),
            }
          : b,
      );
      const newGrandTotal = updatedBills.reduce((s: number, b: any) => s + b.total, 0);
      await supabase
        .from('multi_cart_sessions')
        .update({
          merchant_bills: updatedBills,
          total_amount:   newGrandTotal,
          updated_at:     now,
        })
        .eq('id', session.id);
    }

    toast.success('Order updated!');
    await loadAll();
  } catch (e: any) {
    const msg = e?.message ?? 'Failed to save';
    toast.error(msg.includes('violates check constraint') ? `DB constraint: ${msg}` : msg);
    console.error('saveEditFields:', e);
  } finally {
    setUpdating(false);
  }
};

  // ── updateCustomStatus ─────────────────────────────────────────────────────
  const updateCustomStatus = async (newCustomStatus: string) => {
    if (!order) return;
    setUpdating(true);
    try {
      const patch: any = {
        [cols.customOrderStatus]: newCustomStatus,
        [cols.updatedAt]:         new Date().toISOString(),
      };
      const { error } = await supabase.from('orders').update(patch).eq('id', order.id);
      if (error) throw error;

      if (customRequest?.id) {
        await supabase
          .from('custom_order_requests')
          .update({ status: newCustomStatus, updated_at: new Date().toISOString() })
          .eq('id', customRequest.id);
      }

      const notifyId = order.customerId ?? customRequest?.customer_id;
      if (notifyId) {
        const statusMessages: Record<string, string> = {
          quoted:     `Your custom order #${order.customOrderRef} has been quoted. Check the details!`,
          accepted:   `Great news! Your custom order #${order.customOrderRef} has been accepted.`,
          rejected:   `Your custom order #${order.customOrderRef} could not be fulfilled.`,
          processing: `Your custom order #${order.customOrderRef} is now being processed.`,
          delivered:  `Your custom order #${order.customOrderRef} has been delivered!`,
          reviewed:   `Your custom order #${order.customOrderRef} has been reviewed.`,
          on_hold:    `Your custom order #${order.customOrderRef} is temporarily on hold.`,
          cancelled:  `Your custom order #${order.customOrderRef} has been cancelled.`,
        };
        await sendNotification(
          notifyId,
          'Custom Order Update',
          statusMessages[newCustomStatus]
            ?? `Custom order status: ${newCustomStatus.replace(/_/g, ' ')}.`,
          'order',
          {
            order_id:         order.id,
            custom_status:    newCustomStatus,
            custom_order_ref: order.customOrderRef ?? undefined,
          },
        );
      }

      toast.success(`Custom status → ${newCustomStatus.replace(/_/g, ' ')}`);
      await loadAll();
    } catch (e: any) {
      const msg = e?.message ?? '';
      toast.error(
        msg.includes('violates check constraint')
          ? `Run SQL migration to add "${newCustomStatus}" to constraint`
          : msg || 'Failed to update',
      );
    } finally {
      setUpdating(false);
    }
  };

  // ── notifyDrivers ──────────────────────────────────────────────────────────
  const notifyDrivers = async (o: OrderNormalized = order!) => {
    if (!o || !drivers.length) { toast.warning('No drivers available'); return; }
    setNotifying(true);
    try {
      const now = new Date().toISOString();
      for (const d of drivers) {
        const { error: insErr } = await supabase.from('driverassignments').insert({
          orderid: o.id, driverid: d.id, status: 'pending', assignedat: now,
        });
        if (insErr && (insErr as any).code !== '23505') {
          console.warn('driverassignments insert:', insErr);
        }
      }

      let notified = 0;
      for (const d of drivers) {
        const sent = await sendNotification(
          d.id,
          'New Delivery Request',
          `Order #${o.orderNumber} is ready for pickup.`,
          'delivery',
          {
            order_id:          o.id,       order_number:      o.orderNumber,
            merchant_id:       o.merchantId, delivery_address:  o.deliveryAddress,
            total_amount:      o.totalAmount,
            delivery_latitude: o.deliveryLatitude,
            delivery_longitude:o.deliveryLongitude,
          },
        );
        if (sent) notified++;
      }
      toast.success(`Notified ${notified} driver${notified !== 1 ? 's' : ''}`);
    } catch (e) {
      console.error('notifyDrivers failed', e);
      toast.error('Failed to notify drivers');
    } finally {
      setNotifying(false);
    }
  };

  // ── assignDriver ───────────────────────────────────────────────────────────
  const assignDriver = async (driverId: string) => {
    if (!order || !driverId) return;
    setAssigning(true);
    try {
      const now   = new Date().toISOString();
      const patch: any = { [cols.driverId]: driverId, [cols.updatedAt]: now };
      if (order.status === 'ready') patch.status = 'assigned';

      const { error } = await supabase.from('orders').update(patch).eq('id', order.id);
      if (error) throw error;

      await supabase
        .from('driver_assignments')
        .update({ status: 'accepted', responded_at: now })
        .eq('order_id', order.id)
        .eq('driver_id', driverId);

      await sendNotification(
        driverId,
        'Order Assigned to You',
        `You are assigned to deliver order #${order.orderNumber}.`,
        'delivery',
        { order_id: order.id, order_number: order.orderNumber },
      );

      if (order.customerId) {
        await sendNotification(
          order.customerId,
          'Driver Assigned',
          `A delivery partner is on the way for order #${order.orderNumber}.`,
          'order',
          { order_id: order.id, order_number: order.orderNumber, driver_id: driverId },
        );
      }

      toast.success('Driver assigned!');
      await loadAll();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to assign driver');
    } finally {
      setAssigning(false);
    }
  };

  // ── Invoice helpers ────────────────────────────────────────────────────────
  const getInvoiceHtml = () =>
    order ? buildInvoiceHtml(order, customer, merchant, appSettings) : '';

  const printInvoice = () => {
    const html = getInvoiceHtml();
    if (!html) return;
    const w = window.open('', '_blank', 'width=1060,height=820,scrollbars=yes,resizable=yes');
    if (!w) { toast.error('Popup blocked — please allow popups.'); return; }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  const downloadInvoice = () => {
    const html = getInvoiceHtml();
    if (!html || !order) return;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `invoice-order-${order.orderNumber}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const emailCustomer = () => {
    const email = customer?.email;
    if (!email) { toast.error('Customer email not available'); return; }
    const sub  = encodeURIComponent(`Order Update — #${order?.orderNumber ?? ''}`);
    const body = encodeURIComponent(
      `Hello,\n\nYour order #${order?.orderNumber} is currently: ${order?.status}.\n\nThanks,\nPattiBytes Express`,
    );
    window.location.href = `mailto:${email}?subject=${sub}&body=${body}`;
  };

  // ── Render guards ──────────────────────────────────────────────────────────
  if (authLoading || loading) return <PageLoadingSpinner />;

  if (!order) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 py-16 text-center text-gray-500">
          Order not found.
        </div>
      </DashboardLayout>
    );
  }

  const isCustomOrder   = order.orderType === 'custom' || !!order.customOrderRef;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isPartOfSession = !!session;

  // ── Layout ─────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8">

        {/* ① Header */}
        <OrderHeader
          order={order}
          driverCount={drivers.length}
          notifying={notifying}
          onBack={() => router.push('/admin/orders')}
          onRefresh={loadAll}
          onEmail={emailCustomer}
          onDownload={downloadInvoice}
          onPrint={printInvoice}
          onNotifyDrivers={() => notifyDrivers()}
        />

        {/* ── NEW: Multi-cart session banner ──────────────────────────────── */}
       {session && (
  <SessionOrdersBanner
    session={session}
    currentOrderId={orderId}
    siblingOrders={sessionOrders}   // loaded in loadAll()
  />
)}

        {/* ② Metrics bar */}
        <MetricsBar
          createdAt={order.createdAt}
          estimatedDeliveryTime={order.estimatedDeliveryTime}
          actualDeliveryTime={order.actualDeliveryTime}
          preparationTime={order.preparationTime}
        />

        {/* ③ Main grid */}
        <div className="grid lg:grid-cols-3 gap-5">

          {/* ── LEFT COLUMN ───────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            <StatusControl
              order={order}
              drivers={drivers}
              updating={updating}
              assigning={assigning}
              onUpdateStatus={updateStatus}
              onUpdateCustomStatus={updateCustomStatus}
              onAssignDriver={assignDriver}
            />

            <OrderItemsPanel order={order} />

            {isCustomOrder && (
              <CustomOrderPanel order={order} customRequest={customRequest} />
            )}

            {(order.promoCode || order.promoId) && (
              <PromoInfoPanel
                promoCode={order.promoCode}
                promoId={order.promoId}
                discount={order.discount}
              />
            )}

            {isAdmin && (
              <AdminEditPanel
                order={order}
                saving={updating}
               onSave={saveEditFields as any} 
              />
            )}
          </div>

          {/* ── RIGHT COLUMN ──────────────────────────────────────────── */}
          <div className="space-y-5">


{session && (
  <SessionFinancialCard
    session={session}
    currentOrderId={orderId}
  />
)}

            <FinancialPanel order={order} customRequest={customRequest} />

            {/* ── NEW: Session grand total card ────────────────────────── */}
          
            <CustomerPanel order={order} customer={customer} />

            <MerchantDriverPanel
              order={order} merchant={merchant} driver={driver}
            />

            <LocationPanel order={order} />

            <ReviewPanel
              orderId={order.id}
              orderRating={order.rating}
              orderReview={order.review}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// ── SessionFinancialCard ────────────────────────────────────────────────────
