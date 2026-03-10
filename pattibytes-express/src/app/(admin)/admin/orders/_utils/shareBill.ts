/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Order } from '../_types';

function line(label: string, value: string, width = 32) {
  const dots = '.'.repeat(Math.max(1, width - label.length - value.length));
  return `${label}${dots}${value}`;
}

/** Builds a plain-text receipt string for sharing. */
export function buildBillText(order: Order): string {
  const shortId   = String(order.order_number ?? order.id.slice(0, 8));
  const restaurant= order.merchants?.business_name ?? 'PattiBytes Express';
  const date      = new Date(order.created_at).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  const divider = '─'.repeat(32);

   
  const itemLines = (order.items ?? []).map((it: any) => {
    const qty   = Number(it?.quantity ?? 1);
    const price = Number(it?.price ?? 0);
    const name  = String(it?.name ?? 'Item').slice(0, 18);
    return `  ${name.padEnd(18)} x${qty}  ₹${(price * qty).toFixed(2)}`;
  }).join('\n');

  const lines = [
    `🧾 ORDER RECEIPT`,
    divider,
    `Order      : #${shortId}`,
    `Restaurant : ${restaurant}`,
    `Customer   : ${order.customerName ?? 'N/A'}`,
    `Date       : ${date}`,
    divider,
    itemLines || '  (no items)',
    divider,
    line('Subtotal',      `₹${Number(order.subtotal     || 0).toFixed(2)}`),
    ...(Number(order.discount)    > 0 ? [line('Discount',   `-₹${Number(order.discount   ).toFixed(2)}`)] : []),
    line('Delivery Fee',  `₹${Number(order.delivery_fee || 0).toFixed(2)}`),
    ...(Number(order.tax)         > 0 ? [line('Tax',         `₹${Number(order.tax         ).toFixed(2)}`)] : []),
    divider,
    line('TOTAL',         `₹${Number(order.total_amount || 0).toFixed(2)}`),
    divider,
    `Payment    : ${order.payment_method?.toUpperCase() ?? 'N/A'} (${order.payment_status ?? ''})`,
    `Status     : ${order.status.replace(/_/g, ' ').toUpperCase()}`,
    divider,
    `📍 ${order.delivery_address ?? 'N/A'}`,
    ``,
    `Powered by PattiBytes Express`,
    `https://pbexpress.pattibytes.com`,
  ];

  return lines.join('\n');
}

/** Share or copy the bill. Returns 'shared' | 'copied' | 'failed'. */
export async function shareOrderBill(order: Order): Promise<'shared' | 'copied' | 'failed'> {
  const text  = buildBillText(order);
  const title = `Order #${order.order_number ?? order.id.slice(0, 8)} — PattiBytes Express`;
  const url   = `${window.location.origin}/admin/orders/${order.id}`;

  // Web Share API (mobile browsers)
  if (typeof navigator !== 'undefined' && (navigator as any).share) {
    try {
      await (navigator as any).share({ title, text, url });
      return 'shared';
    } catch (e: any) {
      if (e?.name !== 'AbortError') console.warn('[share] Web Share failed:', e);
    }
  }

  // Clipboard fallback
  try {
    await navigator.clipboard.writeText(`${text}\n\n🔗 ${url}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}
