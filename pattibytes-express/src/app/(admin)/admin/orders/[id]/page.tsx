/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { PageLoadingSpinner } from '@/components/common/LoadingSpinner';
import { sendNotification } from '@/utils/notifications';


import {
  detectStyle, makeCols, normalizeOrder,
  fromDatetimeLocal,
  type OrderNormalized, type ProfileMini, type MerchantInfo,
  type DriverRow, type EditFields, type ColMap,
} from './_components/types';
import { buildInvoiceHtml } from './_components/invoiceBuilder';
import type { AppSettingsRow as AppSettings } from '@/services/appSettings';
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

export default function AdminOrderDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const orderId = String((params as any)?.id || '');

  const [cols, setCols] = useState<ColMap>(makeCols('snake'));
  const [order, setOrder]       = useState<OrderNormalized | null>(null);
  const [customer, setCustomer] = useState<ProfileMini | null>(null);
  const [merchant, setMerchant] = useState<MerchantInfo | null>(null);
  const [driver, setDriver]     = useState<ProfileMini | null>(null);
  const [drivers, setDrivers]   = useState<DriverRow[]>([]);
const [customRequest, setCustomRequest] = useState<import('./_components/types').CustomOrderRequest | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [updating,  setUpdating]  = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [notifying, setNotifying] = useState(false);
const [appSettings, setAppSettings] = useState<AppSettings | null>(null);

  const isAdmin = useMemo(() => {
    const r = String((user as any)?.role || '');
    return r === 'admin' || r === 'superadmin';
  }, [user]);
// ─── Safe fetch — prevents merchants?id=eq.:1 ──────────────────────────────
async function safeFetch<T>(
  table: string,
  idField: string,
  id: string | null | undefined,
  select = '*'
): Promise<T | null> {
  if (!id || !id.trim() || id.startsWith(':')) return null;
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .eq(idField, id)
    .maybeSingle();
  if (error) { console.warn(`safeFetch(${table}):`, error.message); return null; }
  return (data as T) ?? null;
}

// ─── loadAll ───────────────────────────────────────────────────────────────
const loadAll = useCallback(async () => {
  if (!orderId) return;
  setLoading(true);
  try {
    const { data: row, error } = await supabase
      .from('orders').select('*').eq('id', orderId).single();
    if (error) throw error;

    const style = detectStyle(row);
    const c = makeCols(style);
    setCols(c);
    const o = normalizeOrder(row, c);
    setOrder(o);

    // ── custom_order_requests ─────────────────────────────────────────────
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
      } else {
        setCustomRequest(null);
      }
    } else {
      setCustomRequest(null);
    }

    // ── parallelise all nullable fetches — safeFetch guards null IDs ──────
    const [cst, mrc, drv, driverList, appSettingsRes] = await Promise.all([
  safeFetch<ProfileMini>('profiles', 'id', o.customerId),
  safeFetch<MerchantInfo>('merchants', 'id', o.merchantId),
  safeFetch<DriverRow>('profiles', 'id', o.driverId),
  supabase
    .from('profiles')
    .select('id,full_name,phone,is_active')
    .eq('role', 'driver')
    .eq('is_active', true),
  supabase
    .from('app_settings')
    .select('*')
    .limit(1)
    .maybeSingle(),
]);

setCustomer(cst);
setMerchant(mrc);
setDriver(drv);
setDrivers((driverList.data as DriverRow[]) ?? []);
setAppSettings((appSettingsRes.data as AppSettings) ?? null);
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
      : true
    );
    setDrivers(list as DriverRow[]);
  }, []);

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push(`/login?redirect=/admin/orders/${orderId}`); return; }
    if (!isAdmin) { router.push('/'); return; }

    loadAll();
    loadDrivers();

    const ch = supabase
      .channel(`admin-order-${orderId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}`,
      }, () => loadAll())
      .subscribe();

    return () => { ch.unsubscribe(); };
  }, [authLoading, user?.id, isAdmin, orderId]);


  // ── Updated updateStatus — guarantees notification fires ─────────────────────
const updateStatus = async (newStatus: string) => {
  if (!order) return;
  setUpdating(true);
  try {
    const now = new Date().toISOString();
    const patch: any = { status: newStatus, [cols.updatedAt]: now };

    if (newStatus === 'cancelled') {
      const reason = window.prompt('Cancellation reason (optional):') ?? '';
      patch[cols.cancellationReason] = reason.trim() || null;
      patch[cols.cancelledBy] = (user as any)?.role ?? 'admin';
    }
    if (newStatus === 'delivered') {
      patch[cols.actualDeliveryTime] = now;
      patch[cols.paymentStatus] = 'paid';
    }

    const { error } = await supabase.from('orders').update(patch).eq('id', order.id);
    if (error) throw error;
    

          // ── Notify customer ────────────────────────────────────────────────────
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
          order_id: order.id,
          order_number: order.orderNumber,
          status: newStatus,
          custom_order_ref: order.customOrderRef ?? undefined,
        }
      );
    }

    // Notify drivers if order is ready and unassigned
    if (newStatus === 'ready' && !order.driverId) {
      await notifyDrivers(order);
    }

    toast.success(`Status → ${newStatus.replace(/_/g, ' ')}`);
    await loadAll();
  } catch (e: any) {
    toast.error(e?.message || 'Failed to update status');
  } finally {
    setUpdating(false);
  }
};

 // ── saveEditFields — fixed constraint handling ────────────────────────────
const saveEditFields = async (fields: EditFields) => {
  if (!order) return;
  setUpdating(true);
  try {
    const now = new Date().toISOString();

    const prepNum       = fields.preparationTime.trim() === '' ? null : Number(fields.preparationTime);
    const deliveryFeeNum = fields.deliveryFee.trim() === ''    ? order.deliveryFee : Number(fields.deliveryFee);
    const discountNum   = fields.discount.trim() === ''        ? order.discount    : Number(fields.discount);
    const quotedNum     = fields.quotedAmount.trim() === ''    ? null : Number(fields.quotedAmount);

    if (prepNum != null && !Number.isFinite(prepNum)) {
      toast.error('Prep time must be a valid number'); return;
    }

    // Recalculate total
    const newTotal = Math.max(0, order.subtotal - discountNum + deliveryFeeNum + order.tax);

    const patch: any = {
      [cols.updatedAt]:             now,
      [cols.paymentStatus]:         fields.paymentStatus || null,
      [cols.deliveryFee]:           deliveryFeeNum,
      discount:                     discountNum,
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

    // ⚠ ONLY write custom_order_status if it's a valid non-empty value
    // to avoid violating the orders_custom_order_status_check constraint
    if (order.orderType === 'custom' || order.customOrderRef) {
      patch[cols.quotedAmount]    = quotedNum;
      patch[cols.platformHandled] = fields.platformHandled;

      const customStatus = fields.customOrderStatus.trim();
      if (customStatus) {
        // Guard: only write if it's in our known-valid list
        const VALID_CUSTOM_STATUSES = [
          'pending', 'quoted', 'accepted', 'rejected',
          'processing', 'delivered', 'reviewed', 'cancelled', 'on_hold',
        ];
        if (VALID_CUSTOM_STATUSES.includes(customStatus)) {
          patch[cols.customOrderStatus] = customStatus;
        } else {
          toast.error(`Invalid custom status: "${customStatus}" — not in allowed list`);
          setUpdating(false);
          return;
        }
      }
      // If empty string → don't include in patch (leave DB value unchanged)
    }

    const { error } = await supabase.from('orders').update(patch).eq('id', order.id);
    if (error) throw error;

    // Notify customer if new quote message was set
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
        { order_id: order.id, type: 'quote' }
      );
    }

    toast.success('Order updated!');
    await loadAll();
  } catch (e: any) {
    // Surface the exact Postgres constraint name in the toast for easier debugging
    const msg = e?.message ?? 'Failed to save';
    const isConstraint = msg.includes('violates check constraint');
    toast.error(isConstraint ? `DB constraint error: ${msg}` : msg);
    console.error('saveEditFields:', e);
  } finally {
    setUpdating(false);
  }
};

// ── updateCustomStatus — quick one-click custom status change ─────────────
const updateCustomStatus = async (newCustomStatus: string) => {
  if (!order) return;
  setUpdating(true);
  try {
    const patch: any = {
      [cols.customOrderStatus]: newCustomStatus,
      [cols.updatedAt]: new Date().toISOString(),
    };
    const { error } = await supabase.from('orders').update(patch).eq('id', order.id);
    if (error) throw error;

    // Also sync status back to custom_order_requests table
    if (customRequest?.id) {
      await supabase
        .from('custom_order_requests')
        .update({ status: newCustomStatus, updated_at: new Date().toISOString() })
        .eq('id', customRequest.id);
    }

    // Notify customer
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
          ?? `Your custom order status updated to: ${newCustomStatus.replace(/_/g, ' ')}.`,
        'order',
        {
          order_id: order.id,
          custom_status: newCustomStatus,
          custom_order_ref: order.customOrderRef ?? undefined,
        }
      );
    }

    toast.success(`Custom status → ${newCustomStatus.replace(/_/g, ' ')}`);
    await loadAll();
  } catch (e: any) {
    const msg = e?.message ?? '';
    toast.error(
      msg.includes('violates check constraint')
        ? `Run the SQL migration to add "${newCustomStatus}" to DB constraint`
        : msg || 'Failed to update'
    );
  } finally {
    setUpdating(false);
  }
};

  const notifyDrivers = async (o: OrderNormalized = order!) => {
    if (!o || !drivers.length) { toast.warning('No drivers available'); return; }
    setNotifying(true);
    try {
      const now = new Date().toISOString();
      for (const d of drivers) {
        // Best-effort insert into driverassignments (ignore duplicate)
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
            order_id: o.id, order_number: o.orderNumber,
            merchant_id: o.merchantId,
            delivery_address: o.deliveryAddress,
            total_amount: o.totalAmount,
            delivery_latitude: o.deliveryLatitude,
            delivery_longitude: o.deliveryLongitude,
          }
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

  const assignDriver = async (driverId: string) => {
    if (!order || !driverId) return;
    setAssigning(true);
    try {
      const now = new Date().toISOString();
      const patch: any = { [cols.driverId]: driverId, [cols.updatedAt]: now };
      if (order.status === 'ready') patch.status = 'assigned';

      const { error } = await supabase.from('orders').update(patch).eq('id', order.id);
      if (error) throw error;

      // Update driver_assignments table (snake_case table)
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
        { order_id: order.id, order_number: order.orderNumber }
      );

      if (order.customerId) {
        await sendNotification(
          order.customerId,
          'Driver Assigned',
          `A delivery partner is on the way for order #${order.orderNumber}.`,
          'order',
          { order_id: order.id, order_number: order.orderNumber, driver_id: driverId }
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

  // ── Invoice helpers ───────────────────────────────────────────────────────
  const getInvoiceHtml = () =>
  order ? buildInvoiceHtml(order, customer, merchant, appSettings) : '';

  const printInvoice = () => {
  const html = getInvoiceHtml();
  if (!html) return;
  const w = window.open(
    '',
    '_blank',
    'width=1060,height=820,scrollbars=yes,resizable=yes',
  );
  if (!w) {
    toast.error('Popup blocked — please allow popups for this site.');
    return;
  }
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
      `Hello,\n\nYour order #${order?.orderNumber} is currently: ${order?.status}.\n\nThanks,\nPattiBytes Express`
    );
    window.location.href = `mailto:${email}?subject=${sub}&body=${body}`;
  };

  // ── Render guards ─────────────────────────────────────────────────────────
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

  const isCustomOrder = order.orderType === 'custom' || !!order.customOrderRef;

  // ── Layout ────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8">

        {/* ① Header — breadcrumb, title, actions */}
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

        {/* ② Metrics bar */}
        <MetricsBar
          createdAt={order.createdAt}
          estimatedDeliveryTime={order.estimatedDeliveryTime}
          actualDeliveryTime={order.actualDeliveryTime}
          preparationTime={order.preparationTime}
        />

        {/* ③ Main grid: 2/3 left + 1/3 right */}
        <div className="grid lg:grid-cols-3 gap-5">

          {/* ── LEFT COLUMN ─────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Status control + driver assignment */}
            <StatusControl
               order={order}
               drivers={drivers}
               updating={updating}
               assigning={assigning}
               onUpdateStatus={updateStatus}
               onUpdateCustomStatus={updateCustomStatus}   // ← new
               onAssignDriver={assignDriver}
              />


            {/* Order items */}
            <OrderItemsPanel order={order} />

            {/* Custom order block (only if custom) */}
           {isCustomOrder && (
  <CustomOrderPanel
    order={order}
    customRequest={customRequest}    
  />
)}

            {/* Promo / BxGy block (only if promo applied) */}
            {(order.promoCode || order.promoId) && (
              <PromoInfoPanel
                promoCode={order.promoCode}
                promoId={order.promoId}
                discount={order.discount}
              />
            )}

            {/* Admin-only edit panel */}
            {isAdmin && (
              <AdminEditPanel
                order={order}
                saving={updating}
                onSave={saveEditFields}
              />
            )}
          </div>

          {/* ── RIGHT COLUMN ─────────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Bill summary */}
           <FinancialPanel
  order={order}
  customRequest={customRequest}     
/>

            {/* Customer + delivery address */}
            <CustomerPanel order={order} customer={customer} />

            {/* Merchant + driver info */}
            <MerchantDriverPanel
              order={order}
              merchant={merchant}
              driver={driver}
            />

            {/* Live locations */}
            <LocationPanel order={order} />

            {/* Review */}
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
