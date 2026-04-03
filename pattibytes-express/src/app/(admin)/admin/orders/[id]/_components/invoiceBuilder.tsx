 
import { AppSettingsRow } from '@/services/appSettings';
import { toINR, fmtTime } from './types';
import type { OrderNormalized, ProfileMini, MerchantInfo } from './types';

export function buildInvoiceHtml(
// eslint-disable-next-line @typescript-eslint/no-unused-vars
order: OrderNormalized, customer: ProfileMini | null, merchant: MerchantInfo | null, appSettings: AppSettingsRow,
): string {
  const customerName =
    customer?.full_name ?? customer?.fullname ??
    (order.recipientName) ??
    (order.customerNotes?.includes('Walk-in:')
      ? order.customerNotes.replace('Walk-in:', '').trim()
      : null) ?? 'Walk-in Customer';

  const merchantName =
    merchant?.business_name ?? merchant?.businessname ?? 'PattiBytes Express';

  const rows = order.items.map((it, i) => {
    const qty = Number(it.quantity ?? 1);
    const price = Number(it.price ?? 0);
    const disc = Number(it.discount_percentage ?? it.discountpercentage ?? 0);
    const effectivePrice = disc > 0 ? price * (1 - disc / 100) : price;
    const line = effectivePrice * qty;
    const vegDot = it.is_veg ?? it.isveg;
    const freeTag = it.is_free ? `<span style="color:#0a7a3f;font-weight:900">[FREE]</span>` : '';
    return `
      <tr>
        <td class="td num">${i + 1}</td>
        <td class="td">
          <div class="item-name">${vegDot !== undefined ? (vegDot ? '🟢 ' : '🔴 ') : ''}${it.name ?? 'Item'} ${freeTag}</div>
          <div class="item-meta">${toINR(effectivePrice)} × ${qty}${disc > 0 ? ` <span style="color:#b45309">(${disc}% off)</span>` : ''}</div>
          ${it.note ? `<div class="item-meta" style="color:#777">Note: ${it.note}</div>` : ''}
        </td>
        <td class="td amt">${it.is_free ? '<span style="color:#0a7a3f">FREE</span>' : toINR(line)}</td>
      </tr>`;
  }).join('');

  const customSection = order.customOrderRef ? `
    <div class="sec">
      <div class="sec-title">Custom Order</div>
      <div class="kv">Ref: <b>${order.customOrderRef}</b></div>
      <div class="kv">Category: <b>${order.customCategory ?? 'N/A'}</b></div>
      <div class="kv">Status: <b>${order.customOrderStatus ?? 'N/A'}</b></div>
      ${order.quotedAmount ? `<div class="kv">Quoted: <b>${toINR(order.quotedAmount)}</b></div>` : ''}
      ${order.quoteMessage ? `<div class="kv">Quote note: <b>${order.quoteMessage}</b></div>` : ''}
    </div>` : '';

  return `<!doctype html>
<html><head>
  <meta charset="utf-8"/>
  <title>Invoice — Order #${order.orderNumber}</title>
  <style>
    *{box-sizing:border-box}
    body{margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;
      color:#000;background:#fff;font-size:12px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .wrap{max-width:760px;margin:0 auto;padding:12px}
    .card{border:1px solid #000;border-radius:10px;padding:12px}
    .no-print{display:flex;justify-content:flex-end;margin-bottom:10px}
    .btn{padding:10px 14px;border-radius:10px;border:1px solid #000;background:#111;color:#fff;font-weight:900;cursor:pointer}
    .top{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;border-bottom:2px solid #000;padding-bottom:10px}
    .brand{font-size:16px;font-weight:900}.title{margin-top:3px;font-size:13px;font-weight:900}
    .meta{margin-top:6px;color:#222;font-weight:800;line-height:1.35}.right{text-align:right}
    .sec{margin-top:10px}.sec-title{font-size:11px;font-weight:900;letter-spacing:.6px;text-transform:uppercase;margin-bottom:4px}
    .kv{color:#222;font-weight:800;line-height:1.35}.kv b{color:#000}
    table{width:100%;border-collapse:collapse;margin-top:8px;border:1px solid #000}
    thead th{text-align:left;padding:7px;font-size:11px;font-weight:900;border-bottom:2px solid #000;background:#f2f2f2}
    .td{padding:7px;border-bottom:1px solid #000;vertical-align:top;font-weight:800}
    .num{width:36px}.amt{text-align:right;width:120px}
    .item-name{font-weight:900}.item-meta{margin-top:2px;color:#444;font-weight:800;font-size:11px}
    .totals{margin-top:10px;border-top:2px solid #000;padding-top:8px}
    .row{display:flex;justify-content:space-between;gap:12px;margin:4px 0;font-weight:900}
    .label{color:#444}.value{color:#000}.green{color:#0a7a3f}
    .grand{margin-top:8px;padding-top:8px;border-top:2px solid #000;display:flex;justify-content:space-between;font-weight:900;font-size:14px}
    .promo-badge{display:inline-block;background:#fef3c7;color:#92400e;border:1px solid #fbbf24;border-radius:6px;padding:2px 8px;font-weight:900;font-size:11px;margin-top:4px}
    .footer{margin-top:12px;padding-top:10px;border-top:1px solid #000;text-align:center;color:#444;font-weight:900;font-size:11px}
    @media print{.no-print{display:none!important}.wrap{padding:0;max-width:100%}.card{border-radius:0}}
  </style>
</head><body><div class="wrap"><div class="card">
  <div class="no-print"><button class="btn" onclick="window.print()">Print</button></div>
  <h1 style="margin:0 0 8px;font-size:18px">PattiBytes Express</h1>
  <div class="top">
    <div>
      <div class="brand">${merchantName}</div>
      <div class="title">Invoice — Order #${order.orderNumber}</div>
      ${order.orderType ? `<div class="meta">Type: ${order.orderType.toUpperCase()}</div>` : ''}
      <div class="meta">Created: ${fmtTime(order.createdAt)}</div>
      <div class="meta">Status: ${order.status.toUpperCase()}</div>
    </div>
    <div class="right">
      <div style="font-weight:900">Payment</div>
      <div class="meta">Method: ${(order.paymentMethod ?? 'N/A').toUpperCase()}</div>
      <div class="meta">Status: ${(order.paymentStatus ?? 'N/A').toUpperCase()}</div>
      ${order.promoCode ? `<div class="promo-badge">🏷 ${order.promoCode}</div>` : ''}
    </div>
  </div>
  <div class="sec">
    <div class="sec-title">Customer</div>
    <div class="kv"><b>${customerName}</b></div>
    ${order.recipientName && order.recipientName !== customerName
      ? `<div class="kv">Recipient: <b>${order.recipientName}</b></div>` : ''}
    <div class="kv">Phone: <b>${order.customerPhone ?? customer?.phone ?? 'N/A'}</b></div>
  </div>
  <div class="sec">
    <div class="sec-title">Delivery Address</div>
    ${order.deliveryAddressLabel ? `<div class="kv"><b>${order.deliveryAddressLabel}</b></div>` : ''}
    <div class="kv" style="white-space:pre-line"><b>${order.deliveryAddress ?? 'N/A'}</b></div>
    ${order.deliveryInstructions ? `<div class="kv">Instructions: <b>${order.deliveryInstructions}</b></div>` : ''}
    ${order.deliveryDistanceKm != null ? `<div class="kv">Distance: <b>${Number(order.deliveryDistanceKm).toFixed(2)} km</b></div>` : ''}
  </div>
  ${customSection}
  <div class="sec">
    <div class="sec-title">Order Items</div>
    <table>
      <thead><tr><th style="width:36px">#</th><th>Item</th><th style="text-align:right;width:120px">Amount</th></tr></thead>
      <tbody>${rows || `<tr><td class="td" colspan="3" style="text-align:center">No items</td></tr>`}</tbody>
    </table>
    <div class="totals">
      <div class="row"><span class="label">Subtotal</span><span class="value">${toINR(order.subtotal)}</span></div>
      ${order.discount > 0 ? `<div class="row"><span class="label">Discount</span><span class="value green">-${toINR(order.discount)}</span></div>` : ''}
      ${order.promoCode ? `<div class="row"><span class="label">Promo (${order.promoCode})</span><span class="value green">Applied</span></div>` : ''}
      <div class="row"><span class="label">Delivery fee</span><span class="value">${toINR(order.deliveryFee)}</span></div>
      <div class="row"><span class="label">Tax (GST)</span><span class="value">${toINR(order.tax)}</span></div>
      <div class="grand"><span>TOTAL</span><span>${toINR(order.totalAmount)}</span></div>
    </div>
  </div>
  ${order.customerNotes ? `<div class="sec"><div class="sec-title">Customer Notes</div><div class="kv">${order.customerNotes}</div></div>` : ''}
  ${order.specialInstructions ? `<div class="sec"><div class="sec-title">Special Instructions</div><div class="kv">${order.specialInstructions}</div></div>` : ''}
  <div class="footer">
    <div>Thank you for your business!</div>
    <div>${merchantName} • PB Express • pattibytes.com</div>
  </div>
</div></div></body></html>`;
}