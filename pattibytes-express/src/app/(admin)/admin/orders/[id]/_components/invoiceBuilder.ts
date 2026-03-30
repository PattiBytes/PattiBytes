import { toINR, fmtTime } from './types';
import type { OrderNormalized, ProfileMini, MerchantInfo } from './types';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://pbexpress.pattibytes.com';

const esc = (s: unknown) =>
  String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

// Only render a row if value is meaningful
const row = (label: string, value: string, attr = '') =>
  `<div class="tr"><span class="tl">${label}</span><span class="tv" ${attr}>${value}</span></div>`;

const STATUS_CSS: Record<string,string> = {
  delivered:'border-color:#16a34a;color:#15803d', completed:'border-color:#16a34a;color:#15803d',
  cancelled:'border-color:#dc2626;color:#dc2626',  pending:'border-color:#b45309;color:#b45309',
  confirmed:'border-color:#1d4ed8;color:#1d4ed8',  preparing:'border-color:#555;color:#555',
  ready:    'border-color:#7e22ce;color:#7e22ce',  on_the_way:'border-color:#0e7490;color:#0e7490',
};

export function buildInvoiceHtml(
  order    : OrderNormalized,
  customer : ProfileMini | null,
  merchant : MerchantInfo | null,
): string {
  const customerName =
    customer?.full_name ?? customer?.fullname ??
    order.recipientName ??
    (order.customerNotes?.includes('Walk-in:')
      ? order.customerNotes.replace('Walk-in:','').trim() : null)
    ?? 'Walk-in Customer';

  const merchantName = merchant?.business_name ?? merchant?.businessname ?? 'PattiBytes Express';
  const printedAt    = new Date().toLocaleString('en-IN',{
    day:'2-digit', month:'short', year:'numeric',
    hour:'2-digit', minute:'2-digit', hour12:true,
  });

  const statusKey   = (order.status ?? '').toLowerCase().replace(/\s+/g,'_');
  const statusStyle = STATUS_CSS[statusKey] ?? 'border-color:#555;color:#555';
  const scanUrl     = `${BASE_URL}/admin/orders/${encodeURIComponent(order.orderNumber)}`;

  // ── Item rows ──────────────────────────────────────────────────────────────
  let totalQty = 0;
  const rows = order.items.map((it, i) => {
    const qty   = Number(it.quantity ?? 1);
    const price = Number(it.price ?? 0);
    const disc  = Number(it.discount_percentage ?? it.discountpercentage ?? 0);
    const eff   = disc > 0 ? price * (1 - disc / 100) : price;
    const line  = eff * qty;
    const free  = !!it.is_free;
    const veg   = it.is_veg ?? it.isveg;
    const dot   = veg !== undefined
      ? `<span style="color:${veg?'#16a34a':'#dc2626'};font-size:7px;margin-right:2px">●</span>`
      : '';
    totalQty += qty;
    return `<tr class="ir">
      <td class="i-sr">${i+1}</td>
      <td class="i-nm">
        ${dot}${esc(it.name ?? 'Item')}
        ${disc>0?`<span class="dtag">${disc}%↓</span>`:''}
        ${free?`<span class="ftag">FREE</span>`:''}
        ${it.note?`<div class="inote">↳${esc(it.note)}</div>`:''}
      </td>
      <td class="i-q">${qty}</td>
      <td class="i-r">${free?'—':toINR(eff)}</td>
      <td class="i-a">${free?'—':`<b>${toINR(line)}</b>`}</td>
    </tr>`;
  }).join('');

  // ── Savings ────────────────────────────────────────────────────────────────
  const saved = (order.discount ?? 0) + order.items.reduce((a, it) => {
    const d = Number(it.discount_percentage ?? it.discountpercentage ?? 0);
    return a + (d>0 ? Number(it.price??0)*(d/100)*Number(it.quantity??1) : 0);
  }, 0);

  // ── Custom block (only when exists) ───────────────────────────────────────
  const customBlock = order.customOrderRef ? `
    <div class="dsec">
      <div class="bh">Custom Order</div>
      ${row('Ref', esc(order.customOrderRef))}
      ${order.customCategory ? row('Cat', esc(order.customCategory)) : ''}
      ${order.quotedAmount ? row('Quoted', toINR(order.quotedAmount)) : ''}
      ${order.quoteMessage ? `<div class="nrow">${esc(order.quoteMessage)}</div>` : ''}
    </div>` : '';

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>#${esc(order.orderNumber)} · PattiBytes Express</title>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/barcodes/JsBarcode.code128.min.js"></script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{
  font-family:'Courier New',Courier,monospace;
  background:#d4d4d4;color:#111;
  font-size:10px;font-weight:700;
  -webkit-print-color-adjust:exact;print-color-adjust:exact;
}
.page{display:flex;flex-direction:column;align-items:center;padding:14px 10px 32px;min-height:100vh}

/* Toolbar */
.toolbar{display:flex;align-items:center;gap:6px;margin-bottom:10px;width:100%;max-width:300px}
.tb-info{flex:1;font-size:8.5px;font-weight:700;color:#666;letter-spacing:.4px;text-transform:uppercase}
.btn{padding:5px 13px;border-radius:3px;border:1.5px solid #111;background:#fff;
  font-family:inherit;font-size:9.5px;font-weight:900;cursor:pointer;letter-spacing:.3px;transition:opacity .15s}
.btn:hover{opacity:.7}
.btn-p{background:#111;color:#fff}
/* Size toggle */
.szrow{display:flex;gap:5px;margin-bottom:10px;width:100%;max-width:300px}
.sz{flex:1;padding:3px 0;font-size:8.5px;font-weight:900;border:1.5px solid #bbb;
  background:#fff;border-radius:3px;cursor:pointer;font-family:inherit;letter-spacing:.3px;
  color:#777;text-align:center;transition:all .15s}
.sz.on{border-color:#111;color:#111;background:#f0f0f0}

/* Receipt */
.receipt{
  width:100%;max-width:300px;background:#fff;
  box-shadow:0 2px 10px rgba(0,0,0,.2),0 0 0 1px rgba(0,0,0,.08);
  border-radius:3px;overflow:hidden;transition:max-width .2s ease;
}
.receipt.wide{max-width:560px}
.receipt::before,.receipt::after{
  content:'';display:block;height:7px;background-color:#fff;
  background-image:radial-gradient(circle,#d4d4d4 3.5px,transparent 3.5px);
  background-size:8px 8px;background-position:0 -3px;
}
.receipt::after{background-position:0 3px}

.inner{padding:0 12px 12px}

/* Brand */
.bhead{text-align:center;padding:12px 12px 9px;border-bottom:1px dashed #bbb}
.blogo{font-size:15px;font-weight:900;letter-spacing:2px;text-transform:uppercase}
.bsub{font-size:7.5px;color:#777;margin-top:1px;letter-spacing:.6px;font-weight:700}
.bcontact{font-size:8px;color:#555;margin-top:4px;line-height:1.8;font-weight:700}

/* Title strip */
.btitle{
  display:flex;align-items:center;justify-content:space-between;
  padding:7px 12px;border-bottom:1px dashed #bbb;gap:8px;
}
.btitle-t{font-size:11px;font-weight:900;letter-spacing:2px;text-transform:uppercase}
.btitle-n{font-size:8.5px;color:#555;font-weight:700;text-align:right;line-height:1.5}

/* Section blocks */
.mblock{padding:5px 0;border-bottom:1px dashed #ccc}
.bh{
  font-size:7.5px;font-weight:900;letter-spacing:1.5px;
  text-transform:uppercase;color:#aaa;margin:7px 0 3px;
}
.tr{display:flex;justify-content:space-between;gap:4px;padding:1px 0;font-size:9.5px}
.tl{color:#666;flex-shrink:0;font-weight:700}
.tv{color:#111;font-weight:900;text-align:right;word-break:break-word}
.sp{
  display:inline-block;font-size:7.5px;font-weight:900;letter-spacing:.8px;
  padding:1px 5px;border:1.5px solid #111;border-radius:2px;text-transform:uppercase;
}

/* Compact 2-col info grid */
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 8px}
.info-grid .tr{font-size:9px}

/* Items */
.itable{width:100%;border-collapse:collapse;margin-top:4px}
.itable thead th{
  font-size:7.5px;font-weight:900;letter-spacing:.8px;text-transform:uppercase;
  color:#888;padding:3px 2px;border-top:1px solid #ccc;border-bottom:1px solid #ccc;
}
.i-sr{width:14px;text-align:left}
.i-nm{text-align:left;padding-left:2px!important}
.i-q{width:18px;text-align:center}
.i-r{width:46px;text-align:right}
.i-a{width:46px;text-align:right}
.ir td{padding:3.5px 2px;font-size:9.5px;font-weight:700;border-bottom:1px dotted #eee;vertical-align:top}
.ir:last-child td{border-bottom:none}
.ir td:last-child{font-weight:900}
.inote{font-size:8px;color:#aaa;font-style:italic;margin-top:1px;font-weight:700}
.dtag,.ftag{
  display:inline-block;font-size:7px;font-weight:900;
  padding:0 3px;border-radius:2px;margin-left:3px;vertical-align:middle;
}
.dtag{border:1px solid #bbb;color:#666}
.ftag{border:1px solid #16a34a;color:#15803d}

/* Items footer */
.ifooter{
  display:flex;justify-content:space-between;
  font-size:8px;font-weight:700;color:#aaa;
  margin-top:2px;padding-top:2px;border-top:1px dotted #eee;
}

/* Totals */
.totblk{margin-top:6px;border-top:1px dashed #ccc;padding-top:5px}
.trow{display:flex;justify-content:space-between;padding:1px 0;font-size:9.5px}
.trow-l{color:#555;font-weight:700}
.trow-v{font-weight:900;color:#111}
.trow-g{font-weight:900;color:#15803d}          /* green: savings/free */
.trow-d{font-weight:900;color:#dc2626}           /* red: cancelled etc */
.grand{
  display:flex;justify-content:space-between;align-items:center;
  margin-top:5px;padding:5px 0;
  border-top:2px solid #111;border-bottom:2px solid #111;
}
.grand-l{font-size:12px;font-weight:900;letter-spacing:.6px;text-transform:uppercase}
.grand-v{font-size:14px;font-weight:900}
.saved-row{
  font-size:8.5px;text-align:center;padding:3px 0 1px;
  color:#15803d;font-weight:900;letter-spacing:.2px;
}

/* Misc */
.dsec{border-top:1px dashed #ccc;padding-top:5px;margin-top:6px}
.nrow{font-size:8.5px;color:#666;font-style:italic;margin-top:3px;
  padding-top:3px;border-top:1px dotted #eee;font-weight:700}
.sep{border:none;border-top:1px dashed #ccc;margin:7px 0}

/* ── Barcode — compact ── */
.bc-wrap{margin-top:10px;text-align:center}
.bc-num{font-size:7px;color:#bbb;letter-spacing:2.5px;margin-top:2px;font-weight:700}
.bc-hint{font-size:6.5px;color:#ccc;letter-spacing:.3px;font-weight:700;margin-top:1px}

/* Thank you */
.tblock{text-align:center;padding:9px 0 5px;border-top:1px dashed #ccc;margin-top:3px}
.tmain{font-size:10px;font-weight:900;letter-spacing:.3px}
.tsub{font-size:7.5px;color:#999;margin-top:2px;line-height:1.6;font-weight:700}
.tdev{font-size:7.5px;color:#ccc;margin-top:6px;font-weight:700}
.tdev a{color:#bbb;text-decoration:none;font-weight:900}

/* ══════════════════════════
   PRINT — 80mm thermal
   ══════════════════════════ */
@media print{
  body{background:#fff;font-size:9px}
  .toolbar,.szrow{display:none!important}
  .page{padding:0;background:#fff;align-items:flex-start}
  .receipt{
    box-shadow:none;border-radius:0;
    max-width:72mm !important;width:72mm;
  }
  .receipt::before,.receipt::after{display:none}
  .bhead{padding:6px 10px 5px}
  .blogo{font-size:13px}
  .bcontact,.bsub{font-size:7px}
  .inner{padding:0 10px 10px}
  .btitle{padding:5px 10px}
  .btitle-t{font-size:10px}
  .btitle-n{font-size:8px}
  .bh{font-size:7px;margin:5px 0 2px}
  .tr{font-size:8.5px}
  .itable thead th{font-size:7px;padding:2px}
  .ir td{font-size:9px;padding:2.5px 2px}
  .trow{font-size:9px}
  .grand-l{font-size:11px}
  .grand-v{font-size:12px}
  tr,div{page-break-inside:avoid}
}
</style>
</head>
<body>
<div class="page">

<!-- Toolbar (screen only) -->
<div class="toolbar">
  <span class="tb-info">#${esc(order.orderNumber)}</span>
  <button class="btn" onclick="window.close()">✕</button>
  <button class="btn btn-p" onclick="window.print()">⎙ Print</button>
</div>
<div class="szrow">
  <button class="sz on" id="sz-r" onclick="setSize(0)">📄 80mm</button>
  <button class="sz"    id="sz-w" onclick="setSize(1)">🖨 Wide</button>
</div>
<script>
function setSize(w){
  document.querySelector('.receipt').classList.toggle('wide',!!w);
  ['sz-r','sz-w'].forEach(function(id,i){
    document.getElementById(id).classList.toggle('on',i===w);
  });
}
</script>

<div class="receipt">

  <!-- Brand -->
  <div class="bhead">
    <div class="blogo">PattiBytes Express®</div>
    <div class="bsub">ਪੱਟੀ ਦੀ ਲੋੜ, ਹਾਢੇ ਕੋਲ ਤੋੜ</div>
    <div class="bcontact">pbexpress.pattibytes.com · +91 82788 82799<br>Patti, Tarn Taran, Punjab 143416</div>
  </div>

  <!-- Title + order number side by side -->
  <div class="btitle">
    <div class="btitle-t">Tax Invoice</div>
    <div class="btitle-n">
      #${esc(order.orderNumber)}<br>
      ${fmtTime(order.createdAt)}
    </div>
  </div>

  <div class="inner">

    <!-- ── Order + Payment in compact grid ── -->
    <div class="mblock">
      <div class="bh">Order</div>
      <div class="info-grid">
        ${row('Merchant', esc(merchantName))}
        ${row('Type',     esc(order.orderType?.toUpperCase() ?? 'N/A'))}
        ${row('Status',   `<span class="sp" style="${statusStyle}">${esc((order.status??'N/A').toUpperCase())}</span>`)}
        ${row('Payment',  esc((order.paymentMethod??'N/A').toUpperCase()))}
        ${row('Pay',      esc((order.paymentStatus??'N/A').toUpperCase()))}
        ${order.promoCode ? row('Promo', `🏷${esc(order.promoCode)}`) : ''}
      </div>
      <div class="tr" style="margin-top:2px;font-size:8.5px">
        <span class="tl">Printed</span>
        <span class="tv">${esc(printedAt)}</span>
      </div>
    </div>

    <!-- ── Customer (only non-empty fields) ── -->
    <div class="mblock">
      <div class="bh">Customer</div>
      ${row('Name',  esc(customerName))}
      ${order.recipientName && order.recipientName !== customerName
        ? row('Recipient', esc(order.recipientName)) : ''}
      ${(order.customerPhone ?? customer?.phone)
        ? row('Phone', esc(order.customerPhone ?? customer?.phone ?? '')) : ''}
    </div>

    <!-- ── Delivery (condensed) ── -->
    <div class="mblock">
      <div class="bh">Delivery</div>
      ${order.deliveryAddressLabel
        ? `<div style="font-size:9px;font-weight:900;color:#333;margin-bottom:2px">${esc(order.deliveryAddressLabel)}</div>` : ''}
      <div style="font-size:9px;font-weight:700;color:#444;white-space:pre-line;line-height:1.45">
        ${esc(order.deliveryAddress ?? 'N/A')}
      </div>
      ${order.deliveryDistanceKm != null
        ? `<div style="font-size:8px;font-weight:700;color:#aaa;margin-top:2px">📏 ${Number(order.deliveryDistanceKm).toFixed(1)} km</div>` : ''}
      ${order.deliveryInstructions
        ? `<div style="font-size:8px;font-weight:700;color:#aaa;font-style:italic;margin-top:1px">↳ ${esc(order.deliveryInstructions)}</div>` : ''}
    </div>

    ${customBlock}

    <!-- ── Items ── -->
    <div class="bh" style="margin-top:7px">Items</div>
    <table class="itable">
      <thead><tr>
        <th class="i-sr">#</th>
        <th class="i-nm">Item</th>
        <th class="i-q">Qty</th>
        <th class="i-r">Rate</th>
        <th class="i-a">Amt</th>
      </tr></thead>
      <tbody>
        ${rows || `<tr><td colspan="5" style="text-align:center;padding:8px;color:#ccc;font-size:9px">No items</td></tr>`}
      </tbody>
    </table>
    <div class="ifooter">
      <span>${order.items.length} line(s)</span>
      <span>${totalQty} unit(s)</span>
    </div>

    <!-- ── Totals ── -->
    <div class="totblk">
      <div class="trow">
        <span class="trow-l">Subtotal</span>
        <span class="trow-v">${toINR(order.subtotal)}</span>
      </div>
      ${order.discount > 0 ? `
      <div class="trow">
        <span class="trow-l">Discount</span>
        <span class="trow-g">− ${toINR(order.discount)}</span>
      </div>` : ''}
      ${order.promoCode ? `
      <div class="trow">
        <span class="trow-l">Promo (${esc(order.promoCode)})</span>
        <span class="trow-g">Applied</span>
      </div>` : ''}
      <div class="trow">
        <span class="trow-l">Delivery</span>
        <span class="${order.deliveryFee===0?'trow-g':'trow-v'}">${order.deliveryFee===0?'FREE':toINR(order.deliveryFee)}</span>
      </div>
      ${order.tax > 0 ? `
      <div class="trow">
        <span class="trow-l">GST/Tax</span>
        <span class="trow-v">${toINR(order.tax)}</span>
      </div>` : ''}
      <div class="grand">
        <span class="grand-l">Total</span>
        <span class="grand-v">${toINR(order.totalAmount)}</span>
      </div>
      ${saved > 0 ? `<div class="saved-row">✦ You saved ${toINR(saved)}</div>` : ''}
    </div>

    <!-- ── Notes (collapsed unless present) ── -->
    ${order.customerNotes ? `
    <div class="dsec">
      <div class="bh">Note</div>
      <div style="font-size:9px;color:#555;font-style:italic;line-height:1.5;font-weight:700">${esc(order.customerNotes)}</div>
    </div>` : ''}
    ${order.specialInstructions ? `
    <div class="dsec">
      <div class="bh">⚠ Special</div>
      <div style="font-size:9px;color:#555;font-style:italic;line-height:1.5;font-weight:700">${esc(order.specialInstructions)}</div>
    </div>` : ''}

    <!-- ── Compact scannable barcode ── -->
    <div class="bc-wrap">
      <svg id="inv-bc"></svg>
      <div class="bc-num">${esc(order.orderNumber)}</div>
      <div class="bc-hint">scan to open order</div>
    </div>
    <script>
    (function(){
      var el=document.getElementById('inv-bc');
      if(!el||typeof JsBarcode==='undefined')return;
      JsBarcode(el,'${scanUrl}',{
        format:'CODE128',
        width:1.1,       /* narrower bars */
        height:28,       /* shorter height */
        displayValue:false,
        margin:2,
        background:'#ffffff',
        lineColor:'#111111',
      });
    })();
    </script>

    <!-- Thank you -->
    <div class="tblock">
      <div class="tmain">Thank you!</div>
      <div class="tsub">Computer-generated · No signature required</div>
      <hr class="sep"/>
      <div class="tdev">
        Made with ❤️ by
        <a href="https://www.instagram.com/thrillyverse" target="_blank" rel="noreferrer">Thrillyverse</a>
      </div>
    </div>

  </div>
</div><!-- /receipt -->
</div><!-- /page -->
</body></html>`;
}