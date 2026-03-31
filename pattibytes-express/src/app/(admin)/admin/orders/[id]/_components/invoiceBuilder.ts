/* eslint-disable @typescript-eslint/no-explicit-any */
import { toINR, fmtTime } from './types';
import type { OrderNormalized, ProfileMini, MerchantInfo } from './types';

// ─── App Settings Type ────────────────────────────────────────────────────────

export type AppSettings = {
  id?: string;
  app_name?: string;
  support_email?: string;
  support_phone?: string;
  business_address?: string;
  facebook_url?: string;
  instagram_url?: string;
  twitter_url?: string;
  youtube_url?: string;
  website_url?: string;
  delivery_fee?: number | string;
  min_order_amount?: number | string;
  tax_percentage?: number | string;
  created_at?: string;
  updated_at?: string;
  custom_links?: unknown;
  customer_search_radius_km?: number | string;
  announcement?: unknown;
  show_menu_images?: boolean;
  delivery_fee_enabled?: boolean;
  delivery_fee_schedule?: unknown;
  delivery_fee_show_to_customer?: boolean;
  base_delivery_radius_km?: number | string;
  per_km_fee_beyond_base?: number | string;
  app_logo_url?: string;
  base_delivery_fee?: number | string;
  per_km_rate?: number | string;
  free_delivery_above?: number | string;
  hub_latitude?: number | string;
  hub_longitude?: number | string;
  admin_preferences?: unknown;
  free_delivery_enabled?: boolean;
};

type CustomLink = {
  id?: string;
  url?: string;
  title?: string;
  enabled?: boolean;
  logo_url?: string;
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function clean(v: unknown): string {
  return String(v ?? '').trim();
}

function upper(v: unknown): string {
  return clean(v).toUpperCase();
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function hasValue(v: unknown): boolean {
  return !!clean(v);
}

function firstNonEmpty(...vals: unknown[]): string {
  for (const v of vals) {
    const s = clean(v);
    if (s) return s;
  }
  return '';
}

function parseCustomLinks(raw: unknown): CustomLink[] {
  if (Array.isArray(raw)) return raw as CustomLink[];
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getStatusClass(status: unknown): string {
  const s = clean(status).toLowerCase();
  if (s === 'delivered' || s === 'completed') return 'badge-green';
  if (s === 'cancelled' || s === 'failed') return 'badge-red';
  if (['preparing', 'confirmed', 'ontheway', 'pickedup', 'assigned', 'ready'].includes(s))
    return 'badge-blue';
  return 'badge-amber';
}

function getPayClass(status: unknown): string {
  const s = clean(status).toLowerCase();
  if (s === 'paid') return 'badge-green';
  if (s === 'failed' || s === 'refunded') return 'badge-red';
  return 'badge-amber';
}

// ─── Main Builder ─────────────────────────────────────────────────────────────

export function buildInvoiceHtml(
  order: OrderNormalized,
  customer: ProfileMini | null,
  merchant: MerchantInfo | null,
  appSettings?: AppSettings | null,
): string {
  // ── App Settings ──────────────────────────────────────
  const appName    = firstNonEmpty(appSettings?.app_name, 'PattiBytes Express&#174;');
  const appLogoUrl = clean(appSettings?.app_logo_url ?? '');
  const websiteUrl = firstNonEmpty(appSettings?.website_url, 'https://www.pattibytes.com');
  const supportEmail = clean(appSettings?.support_email ?? '');
  const supportPhone = clean(appSettings?.support_phone ?? '');

  // App-level GST — only used if explicitly set and > 0
  const appTaxPct  = num(appSettings?.tax_percentage ?? 0);
  const hasAppTax  = appTaxPct > 0;
  const taxLabel   = hasAppTax ? `Tax (GST ${appTaxPct}%)` : '';

  // Social links
  const fbUrl    = clean(appSettings?.facebook_url  ?? '');
  const igUrl    = clean(appSettings?.instagram_url ?? '');
  const ytUrl    = clean(appSettings?.youtube_url   ?? '');
  const twUrl    = clean(appSettings?.twitter_url   ?? '');
  const customLinks: CustomLink[] = parseCustomLinks(appSettings?.custom_links ?? [])
    .filter(l => l.enabled !== false && hasValue(l.url));

  // ── Order fields ──────────────────────────────────────
  const merchantName = firstNonEmpty(
    (merchant as any)?.business_name,
    (merchant as any)?.businessname,
    appName,
    'PattiBytes Express',
  );

  const merchantPhone   = firstNonEmpty((merchant as any)?.phone, (merchant as any)?.contactphone);
  const merchantAddress = firstNonEmpty((merchant as any)?.address, (merchant as any)?.businessaddress);
  const merchantGstin   = firstNonEmpty((merchant as any)?.gst_number, (merchant as any)?.gstnumber, (merchant as any)?.gstin);

  const customerName =
    firstNonEmpty(
      (customer as any)?.full_name,
      (customer as any)?.fullname,
      order.recipientName,
    ) ||
    (clean(order.customerNotes).toLowerCase().startsWith('walk-in:')
      ? clean(order.customerNotes).replace(/^walk-in:/i, '').trim()
      : '') ||
    'Walk-in Customer';

  const phone          = firstNonEmpty(order.customerPhone, (customer as any)?.phone, 'N/A');
  const orderNo        = esc(order.orderNumber ?? 'N/A');
  const orderStatus    = clean(order.status || 'Pending');
  const paymentStatus  = clean(order.paymentStatus || 'N/A');
  const paymentMethod  = clean(order.paymentMethod || 'N/A');
  const orderType      = clean(order.orderType || 'N/A');
  const isPickup       = orderType.toLowerCase() === 'pickup';

  const items: any[]   = Array.isArray(order.items) ? order.items : [];
  const totalQty       = items.reduce((s, it) => s + num(it.quantity ?? 1, 1), 0);

  const originalTotal  = items.reduce((s, it) =>
    s + num(it.price ?? 0) * num(it.quantity ?? 1, 1), 0);
  const subtotalCalc   = items.reduce((s, it) => {
    const qty   = num(it.quantity ?? 1, 1);
    const price = num(it.price ?? 0);
    const disc  = num(it.discount_percentage ?? it.discountpercentage ?? 0);
    const eff   = disc > 0 ? price * (1 - disc / 100) : price;
    return s + (it.is_free ? 0 : eff * qty);
  }, 0);
  const totalSavings   = Math.max(0, originalTotal - subtotalCalc) + num(order.discount);
  const hasSavings     = totalSavings > 0.001;

  // ── JS-safe strings ───────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const jsOrderNo    = JSON.stringify(clean(order.orderNumber ?? 'N/A'));
  const jsCustNotes  = JSON.stringify(clean(order.customerNotes ?? ''));
  const jsSpecial    = JSON.stringify(clean(order.specialInstructions ?? ''));
  const jsStatus     = JSON.stringify(orderStatus);

  // ── Item rows ─────────────────────────────────────────
  const itemRows = items.map((it: any, i: number) => {
    const qty   = num(it.quantity ?? 1, 1);
    const price = num(it.price ?? 0);
    const disc  = num(it.discount_percentage ?? it.discountpercentage ?? 0);
    const eff   = disc > 0 ? price * (1 - disc / 100) : price;
    const line  = it.is_free ? 0 : eff * qty;
    const veg   = it.is_veg ?? it.isveg;
    const icon  = veg !== undefined ? (veg ? '&#129001; ' : '&#128308; ') : '';

    return `
      <tr>
        <td class="td c">${i + 1}</td>
        <td class="td">
          <span class="iname">${icon}${esc(it.name ?? 'Item')}</span>
          ${it.is_free ? '<span class="pill pill-green">FREE</span>' : ''}
          ${disc > 0 ? `<span class="pill pill-amber">${disc}% off</span>` : ''}
          ${hasValue(it.note) ? `<div class="sub itm-note">&#128203; ${esc(it.note)}</div>` : ''}
        </td>
        <td class="td c">${qty}</td>
        <td class="td r">${it.is_free ? '—' : esc(toINR(eff))}</td>
        <td class="td r b">${it.is_free ? '<span class="fv">FREE</span>' : esc(toINR(line))}</td>
      </tr>`;
  }).join('');

  // ── Custom order block ────────────────────────────────
  const customBlock = order.customOrderRef ? `
    <div class="row2" id="blk-custom">
      <div class="panel">
        <div class="ph">Custom Order</div>
        <table class="ktbl">
          <tr><td>Reference</td><td><b>${esc(order.customOrderRef)}</b></td></tr>
          ${order.customCategory ? `<tr><td>Category</td><td><b>${esc(order.customCategory)}</b></td></tr>` : ''}
          <tr><td>Status</td><td><b>${esc(order.customOrderStatus ?? 'N/A')}</b></td></tr>
          ${order.quotedAmount ? `<tr><td>Quoted</td><td><b>${esc(toINR(order.quotedAmount))}</b></td></tr>` : ''}
          ${order.quoteMessage ? `<tr><td>Note</td><td><b>${esc(order.quoteMessage)}</b></td></tr>` : ''}
        </table>
      </div>
    </div>` : '';

  // ── Social chips (footer) ─────────────────────────────
  const socialChips = [
    igUrl  ? `<a class="chip" href="${esc(igUrl)}"  target="_blank" rel="noopener noreferrer">Instagram</a>` : '',
    fbUrl  ? `<a class="chip" href="${esc(fbUrl)}"  target="_blank" rel="noopener noreferrer">Facebook</a>`  : '',
    ytUrl  ? `<a class="chip" href="${esc(ytUrl)}"  target="_blank" rel="noopener noreferrer">YouTube</a>`   : '',
    twUrl  ? `<a class="chip" href="${esc(twUrl)}"  target="_blank" rel="noopener noreferrer">Twitter</a>`   : '',
    ...customLinks.map(l =>
      `<a class="chip" href="${esc(l.url!)}" target="_blank" rel="noopener noreferrer">
        ${l.logo_url ? `<img src="${esc(l.logo_url)}" class="chip-logo" alt="" />` : ''}
        ${esc(l.title || 'Link')}
      </a>`
    ),
  ].filter(Boolean).join('');

  // ── Logo HTML for hero ────────────────────────────────
  const logoHtml = appLogoUrl
    ? `<img src="${esc(appLogoUrl)}" class="app-logo" alt="${esc(appName)} logo" />`
    : `<div class="app-icon">&#8377;</div>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Invoice #${orderNo} — ${esc(merchantName)}</title>
  <style>
    :root{
      --ink:#0f172a;--muted:#64748b;--line:#e2e8f0;
      --soft:#f8fafc;--card:#ffffff;--bg:#f1f5f9;
      --brand:#f97316;
      --ok:#16a34a;--ok-bg:#f0fdf4;--ok-b:#bbf7d0;
      --warn:#d97706;--warn-bg:#fffbeb;--warn-b:#fde68a;
      --err:#dc2626;--err-bg:#fef2f2;--err-b:#fecaca;
      --info:#2563eb;--info-bg:#eff6ff;--info-b:#bfdbfe;
    }
    *{box-sizing:border-box;margin:0;padding:0}
    body{
      font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
      font-size:11.5px;color:var(--ink);background:var(--bg);
      -webkit-print-color-adjust:exact;print-color-adjust:exact;
    }

    /* ── Toolbar ─────────────────────────────────────────── */
    #toolbar{
      position:sticky;top:0;z-index:200;
      background:#0f172a;
      box-shadow:0 2px 12px rgba(0,0,0,.4);
      font-size:11px;font-weight:700;
    }
    .tb-row{
      display:flex;align-items:center;gap:8px;flex-wrap:wrap;
      padding:7px 14px;border-bottom:1px solid #1e293b;
    }
    .tb-row:last-child{border-bottom:none}
    .tl{font-size:12.5px;font-weight:950;color:#fb923c;white-space:nowrap;flex:none}
    .sep{height:18px;width:1px;background:#334155;flex:none}
    .tbtn{
      padding:5px 11px;border-radius:7px;
      font-size:11px;font-weight:900;cursor:pointer;border:none;outline:none;
      transition:opacity .12s,background .12s;flex:none;
    }
    .tbtn:hover{opacity:.85}
    .tbtn.primary{background:#f97316;color:#fff}
    .tbtn.ghost{background:#1e293b;color:#e2e8f0;border:1px solid #334155}
    .tbtn.success{background:#16a34a;color:#fff}
    .tbtn.sm{padding:4px 8px;font-size:10.5px}
    .toggle-wrap{
      display:flex;align-items:center;gap:5px;cursor:pointer;
      user-select:none;color:#cbd5e1;white-space:nowrap;
    }
    .toggle-wrap input[type=checkbox]{
      appearance:none;-webkit-appearance:none;
      width:15px;height:15px;border-radius:4px;
      border:1.5px solid #475569;background:#1e293b;cursor:pointer;flex:none;
    }
    .toggle-wrap input[type=checkbox]:checked{
      background:#f97316;border-color:#f97316;
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'%3E%3Cpath d='M1.5 5l2.5 2.5 4.5-4.5' stroke='%23fff' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
      background-repeat:no-repeat;background-position:center;background-size:9px;
    }
    .tb-sel{
      background:#1e293b;color:#f8fafc;border:1px solid #334155;
      border-radius:7px;padding:4px 8px;font-size:11px;font-weight:800;
      cursor:pointer;outline:none;
    }
    .spacer{flex:1}
    .tb-tag{background:#1e293b;color:#94a3b8;font-size:10px;font-weight:800;padding:3px 8px;border-radius:999px;border:1px solid #334155;white-space:nowrap}

    /* ── Overlay panels ──────────────────────────────────── */
    .panel-overlay{
      display:none;position:fixed;inset:0;z-index:300;
      background:rgba(0,0,0,.5);align-items:center;justify-content:center;
    }
    .panel-overlay.open{display:flex}
    .edit-panel{
      background:#fff;border-radius:16px;padding:20px;
      width:min(480px,92vw);max-height:80vh;overflow-y:auto;
      box-shadow:0 20px 60px rgba(0,0,0,.3);
    }
    .ep-title{font-size:14px;font-weight:950;margin-bottom:14px;color:var(--ink);display:flex;justify-content:space-between;align-items:center}
    .ep-close{cursor:pointer;color:var(--muted);font-size:18px;line-height:1}
    .ep-label{font-size:11px;font-weight:900;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px;margin-top:12px}
    .ep-label:first-of-type{margin-top:0}
    .ep-input,.ep-textarea,.ep-select{
      width:100%;border:1.5px solid var(--line);border-radius:8px;
      padding:8px 10px;font-size:12px;font-weight:800;color:var(--ink);
      font-family:inherit;outline:none;transition:border-color .12s;
    }
    .ep-input:focus,.ep-textarea:focus,.ep-select:focus{border-color:var(--brand)}
    .ep-textarea{resize:vertical;min-height:70px;line-height:1.5}
    .ep-row{display:flex;gap:8px;margin-top:14px}
    .ep-hint{font-size:10px;color:var(--muted);margin-top:4px}

    /* ── Layout modes ────────────────────────────────────── */
    body.layout-receipt .wrap{max-width:380px}
    body.layout-receipt .info-grid{grid-template-columns:1fr}
    body.layout-receipt .stats{grid-template-columns:repeat(2,1fr)}
    body.layout-receipt .itbl thead th:nth-child(4),
    body.layout-receipt .td.r:nth-child(4){display:none}
    body.layout-a4 .wrap{max-width:680px}
    body.layout-compact .hero{padding:9px 12px 8px}
    body.layout-compact .body{padding:7px 10px}
    body.layout-compact .td{padding:5px 8px}
    body.layout-compact .stat{padding:7px 10px}
    body.layout-compact .sv{font-size:12px}

    /* ── Sheet ───────────────────────────────────────────── */
    .wrap{max-width:800px;margin:14px auto;padding:0 10px 24px}
    .sheet{background:var(--card);border:1.5px solid #cbd5e1;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.06)}

    /* ── Hero ────────────────────────────────────────────── */
    .hero{
      background:linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#334155 100%);
      padding:13px 15px 11px;color:#f8fafc;
    }
    .hero-inner{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap}
    .hero-left{display:flex;align-items:flex-start;gap:10px;min-width:0}
    .app-icon{
      width:44px;height:44px;border-radius:11px;flex:none;
      background:linear-gradient(135deg,#fb923c,#f97316);
      display:flex;align-items:center;justify-content:center;
      font-size:20px;border:2px solid rgba(255,255,255,.15);
    }
    .app-logo{
      width:44px;height:44px;border-radius:11px;flex:none;
      object-fit:cover;border:2px solid rgba(255,255,255,.15);
      background:#fff;
    }
    .app-nm{font-size:14px;font-weight:950;letter-spacing:-.2px}
    .merch-nm{font-size:10.5px;color:#94a3b8;font-weight:700;margin-top:1px}
    .inv-label{font-size:9.5px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:#fb923c;margin-top:5px}
    .inv-no{font-size:16px;font-weight:950;margin-top:1px}
    .hero-right{text-align:right;flex:none}
    .hero-meta{font-size:10px;font-weight:700;color:#94a3b8;line-height:1.6}
    .copy-label{
      display:inline-block;margin-top:4px;font-size:9.5px;font-weight:900;
      padding:2px 8px;border-radius:999px;
      background:rgba(249,115,22,.15);color:#fb923c;border:1px solid rgba(249,115,22,.35);
    }
    .badge-row{display:flex;gap:5px;flex-wrap:wrap;margin-top:9px;align-items:center}
    .badge{
      display:inline-flex;align-items:center;gap:3px;
      padding:3px 8px;border-radius:999px;
      font-size:9.5px;font-weight:900;border:1.5px solid transparent;
    }
    .badge::before{content:'';width:5px;height:5px;border-radius:50%;flex:none}
    .badge-green{background:var(--ok-bg);color:var(--ok);border-color:var(--ok-b)}
    .badge-green::before{background:var(--ok)}
    .badge-red{background:var(--err-bg);color:var(--err);border-color:var(--err-b)}
    .badge-red::before{background:var(--err)}
    .badge-blue{background:var(--info-bg);color:var(--info);border-color:var(--info-b)}
    .badge-blue::before{background:var(--info)}
    .badge-amber{background:var(--warn-bg);color:var(--warn);border-color:var(--warn-b)}
    .badge-amber::before{background:var(--warn)}
    .promo-badge{
      display:inline-flex;align-items:center;gap:3px;padding:3px 8px;border-radius:999px;
      background:#fef3c7;color:#92400e;border:1.5px solid #fde68a;font-size:9.5px;font-weight:900;
    }

    /* ── Stats ───────────────────────────────────────────── */
    .stats{display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1.5px solid var(--line)}
    .stats.cols3{grid-template-columns:repeat(3,1fr)}
    .stat{padding:9px 12px;border-right:1.5px solid var(--line)}
    .stat:last-child{border-right:none}
    .sk{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:3px}
    .sv{font-size:13.5px;font-weight:950;color:var(--ink)}
    .sv.green{color:var(--ok)}

    /* ── Body ────────────────────────────────────────────── */
    .body{padding:12px 13px}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px}
    .panel{border:1.5px solid var(--line);border-radius:11px;padding:9px 11px;background:#fcfcfd}
    .ph{font-size:9px;font-weight:950;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);margin-bottom:6px}
    .ktbl{width:100%;border-collapse:collapse}
    .ktbl td{padding:2px 0;font-size:11px;font-weight:800;color:var(--ink);line-height:1.45;vertical-align:top}
    .ktbl td:first-child{color:var(--muted);width:42%;font-weight:700;padding-right:6px}
    .ktbl b{color:var(--ink);font-weight:900}
    .row2{margin-top:8px}

    /* ── Items ───────────────────────────────────────────── */
    .itbl-wrap{border:1.5px solid var(--line);border-radius:11px;overflow:hidden}
    .itbl{width:100%;border-collapse:collapse}
    .itbl thead th{
      background:#0f172a;color:#f8fafc;padding:7px 9px;
      font-size:9.5px;font-weight:900;text-align:left;
      text-transform:uppercase;letter-spacing:.05em;
    }
    .td{padding:7px 9px;border-top:1px solid #f1f5f9;font-size:11px;font-weight:800;color:var(--ink);vertical-align:top}
    .c{text-align:center;width:30px}
    .r{text-align:right}
    .b{font-weight:950}
    .iname{font-weight:900}
    .sub{font-size:9.5px;color:var(--muted);margin-top:2px;font-weight:700}
    .itm-note{color:#475467}
    .pill{display:inline-block;margin-left:4px;padding:1px 5px;border-radius:999px;font-size:9px;font-weight:900}
    .pill-green{background:var(--ok-bg);color:var(--ok);border:1px solid var(--ok-b)}
    .pill-amber{background:var(--warn-bg);color:var(--warn);border:1px solid var(--warn-b)}
    .fv{color:var(--ok);font-weight:950}

    /* ── Totals ──────────────────────────────────────────── */
    .totals-wrap{display:flex;justify-content:flex-end;margin-top:8px}
    .totals{width:min(100%,285px);border:1.5px solid var(--line);border-radius:11px;overflow:hidden;background:#fff}
    .trow{display:flex;justify-content:space-between;gap:6px;padding:5px 11px;font-size:11px;font-weight:800;border-top:1px solid #f1f5f9}
    .trow:first-child{border-top:none}
    .trow .lbl{color:var(--muted);font-weight:700}
    .trow .val{color:var(--ink)}
    .trow.green .val{color:var(--ok)}
    .trow.bold{border-top:1.5px solid #cbd5e1}
    .trow.bold .lbl,.trow.bold .val{font-weight:950;font-size:12.5px;color:var(--ink)}

    /* ── Notes ───────────────────────────────────────────── */
    .notes-wrap{margin-top:8px}
    .nv{font-size:11px;font-weight:800;color:var(--ink);line-height:1.5;white-space:pre-wrap}
    .merch-block{background:#fffbeb;border:1.5px dashed #fde68a;border-radius:11px;padding:9px 11px}
    .merch-block .ph{color:#92400e}
    .merch-internal{border-top:1.5px dashed var(--line);margin-top:10px;padding-top:10px}

    /* ── Footer ──────────────────────────────────────────── */
    .footer{
      background:#f8fafc;border-top:1.5px solid var(--line);
      padding:9px 13px;display:flex;justify-content:space-between;
      align-items:flex-start;gap:8px;flex-wrap:wrap;
    }
    .footer-l{font-size:9.5px;font-weight:800;color:var(--muted);line-height:1.6}
    .footer-r{text-align:right;font-size:9.5px;font-weight:800;color:var(--muted);line-height:1.6}
    .dev{margin-top:2px;font-size:9.5px;font-weight:900;color:var(--ink)}
    .dev a{color:var(--brand);text-decoration:none}
    .chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:5px;justify-content:flex-end}
    .chip{
      display:inline-flex;align-items:center;gap:4px;
      border:1px solid var(--line);border-radius:999px;padding:3px 8px;
      color:var(--muted);text-decoration:none;background:#fff;
      font-weight:900;font-size:9.5px;transition:border-color .1s;
    }
    .chip:hover{border-color:var(--brand);color:var(--brand)}
    .chip-logo{width:13px;height:13px;border-radius:50%;object-fit:cover}

    /* ── Print ───────────────────────────────────────────── */
    @media print{
      body{background:#fff}
      #toolbar,.panel-overlay{display:none!important}
      .wrap{margin:0;padding:0;max-width:100%}
      .sheet{border-radius:0;border:none;box-shadow:none}
      .hidden{display:none!important}
      .chips a{color:var(--muted)!important}
    }
    .hidden{display:none!important}
    @media(max-width:560px){
      .info-grid{grid-template-columns:1fr}
      .stats{grid-template-columns:repeat(2,1fr)}
      .stats .stat:nth-child(2){border-right:none}
      .hero-right{display:none}
    }
  </style>
</head>
<body class="layout-default">

<!-- ══════════════════════════════════════════════════════ -->
<!--  TOOLBAR                                               -->
<!-- ══════════════════════════════════════════════════════ -->
<div id="toolbar">

  <!-- Row 1 -->
  <div class="tb-row">
    <div class="tl">&#128203; Invoice Controls</div>
    <div class="sep"></div>
    <label class="toggle-wrap" style="color:#94a3b8;gap:6px">Copy:
      <select class="tb-sel" id="copy-select" onchange="setCopy(this.value)">
        <option value="Customer">Customer Copy</option>
        <option value="Merchant">Merchant Copy</option>
        <option value="Internal">Internal Record</option>
      </select>
    </label>
    <label class="toggle-wrap" style="color:#94a3b8;gap:6px">Layout:
      <select class="tb-sel" id="layout-select" onchange="setLayout(this.value)">
        <option value="default">Default</option>
        <option value="compact">Compact</option>
        <option value="receipt">Receipt (80mm)</option>
        <option value="a4">Narrow A4</option>
      </select>
    </label>
    <div class="spacer"></div>
    <div class="tb-tag" id="gen-stamp"></div>
    <button class="tbtn ghost sm" onclick="resetAll()">&#8635; Reset</button>
    <button class="tbtn primary" onclick="window.print()">&#128424; Print</button>
  </div>

  <!-- Row 2 -->
  <div class="tb-row">
    <span style="color:#64748b;font-size:10px;font-weight:900;white-space:nowrap">SHOW/HIDE:</span>
    <div class="sep"></div>
    <label class="toggle-wrap"><input type="checkbox" checked id="tgl-stats"    onchange="toggleBlock('stats-bar',this)"/> Stats</label>
    <label class="toggle-wrap"><input type="checkbox" checked id="tgl-customer" onchange="toggleBlock('blk-customer',this)"/> Customer</label>
    ${!isPickup ? `<label class="toggle-wrap"><input type="checkbox" checked id="tgl-delivery" onchange="toggleBlock('blk-delivery',this)"/> Delivery</label>` : ''}
    ${order.customOrderRef ? `<label class="toggle-wrap"><input type="checkbox" checked id="tgl-custom" onchange="toggleBlock('blk-custom',this)"/> Custom Order</label>` : ''}
    <label class="toggle-wrap"><input type="checkbox" checked id="tgl-items"    onchange="toggleBlock('blk-items',this)"/> Items</label>
    <label class="toggle-wrap"><input type="checkbox" checked id="tgl-totals"   onchange="toggleBlock('blk-totals',this)"/> Totals</label>
    <label class="toggle-wrap"><input type="checkbox" checked id="tgl-notes"    onchange="toggleBlock('blk-notes',this)"/> Notes</label>
    <label class="toggle-wrap"><input type="checkbox"       id="tgl-merch"    onchange="toggleMerchant(this)"/> Merchant Fields</label>
    <div class="spacer"></div>
    <button class="tbtn ghost sm" onclick="openEditNotes()">&#9998; Edit Notes</button>
    <button class="tbtn ghost sm" onclick="openEditStatus()">&#9881; Edit Status</button>
  </div>

</div>

<!-- ══════════════════════════════════════════════════════ -->
<!--  FLOATING PANELS                                       -->
<!-- ══════════════════════════════════════════════════════ -->

<!-- Edit Notes -->
<div class="panel-overlay" id="overlay-notes">
  <div class="edit-panel">
    <div class="ep-title">&#9998; Edit Notes for Print <span class="ep-close" onclick="closeOverlay('overlay-notes')">&#10005;</span></div>
    <div class="ep-label">Customer Notes</div>
    <textarea class="ep-textarea" id="ep-cust-notes" rows="3" placeholder="Add or edit customer notes…"></textarea>
    <div class="ep-label">Special Instructions</div>
    <textarea class="ep-textarea" id="ep-special" rows="3" placeholder="Add special instructions…"></textarea>
    <div class="ep-label">Internal Note <span style="font-weight:700;text-transform:none;letter-spacing:0;font-size:10px;color:#94a3b8">(Merchant / Internal copy only)</span></div>
    <textarea class="ep-textarea" id="ep-internal" rows="2" placeholder="Not shown on customer copy…"></textarea>
    <div class="ep-hint">Changes apply to print preview only. Original data is not modified.</div>
    <div class="ep-row">
      <button class="tbtn ghost" style="flex:1;background:#f1f5f9;color:#0f172a" onclick="closeOverlay('overlay-notes')">Cancel</button>
      <button class="tbtn success" style="flex:1" onclick="applyNotes()">&#10003; Apply</button>
    </div>
  </div>
</div>

<!-- Edit Status -->
<div class="panel-overlay" id="overlay-status">
  <div class="edit-panel">
    <div class="ep-title">&#9881; Override Status for Print <span class="ep-close" onclick="closeOverlay('overlay-status')">&#10005;</span></div>
    <div class="ep-label">Order Status</div>
    <select class="ep-select" id="ep-order-status">
      <option value="">— Keep original —</option>
      <option value="Pending">Pending</option>
      <option value="Confirmed">Confirmed</option>
      <option value="Preparing">Preparing</option>
      <option value="Ready">Ready</option>
      <option value="Assigned">Driver Assigned</option>
      <option value="Pickedup">Out for Delivery</option>
      <option value="Delivered">Delivered</option>
      <option value="Cancelled">Cancelled</option>
    </select>
    <div class="ep-label">Payment Status</div>
    <select class="ep-select" id="ep-pay-status">
      <option value="">— Keep original —</option>
      <option value="Paid">Paid</option>
      <option value="Pending">Pending</option>
      <option value="Failed">Failed</option>
      <option value="Refunded">Refunded</option>
    </select>
    <div class="ep-label">Payment Method</div>
    <select class="ep-select" id="ep-pay-method">
      <option value="">— Keep original —</option>
      <option value="Cash">Cash</option>
      <option value="UPI">UPI</option>
      <option value="Card">Card</option>
      <option value="Online">Online</option>
      <option value="Wallet">Wallet</option>
    </select>
    <div class="ep-hint">Affects print output only. Database is not modified.</div>
    <div class="ep-row">
      <button class="tbtn ghost" style="flex:1;background:#f1f5f9;color:#0f172a" onclick="closeOverlay('overlay-status')">Cancel</button>
      <button class="tbtn success" style="flex:1" onclick="applyStatus()">&#10003; Apply</button>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════ -->
<!--  INVOICE SHEET                                         -->
<!-- ══════════════════════════════════════════════════════ -->
<div class="wrap">
<div class="sheet">

  <!-- Hero -->
  <div class="hero">
    <div class="hero-inner">
      <div class="hero-left">
        ${logoHtml}
        <div>
          <div class="app-nm">${appName}</div>
          <div class="merch-nm">${esc(merchantName)}</div>
          <div class="inv-label">Tax Invoice</div>
          <div class="inv-no">Order #${orderNo}</div>
        </div>
      </div>
      <div class="hero-right">
        <div class="hero-meta">Created: ${esc(fmtTime(order.createdAt))}</div>
        <div class="hero-meta" id="hr-method">Method: ${esc(upper(paymentMethod))}</div>
        <div class="hero-meta">Type: ${esc(upper(orderType))}</div>
        <div class="copy-label" id="copy-display">Customer Copy</div>
      </div>
    </div>
    <div class="badge-row">
      <span class="badge ${getStatusClass(orderStatus)}" id="status-badge-live">${esc(upper(orderStatus))}</span>
      <span class="badge ${getPayClass(paymentStatus)}" id="pay-badge-live">${esc(upper(paymentStatus))}</span>
      ${order.orderType ? `<span class="badge badge-blue">${esc(upper(orderType))}</span>` : ''}
      ${order.promoCode ? `<span class="promo-badge">&#127991; ${esc(order.promoCode)}</span>` : ''}
    </div>
  </div>

  <!-- Stats -->
  <div class="stats ${hasSavings ? '' : 'cols3'}" id="stats-bar">
    <div class="stat"><div class="sk">Items</div><div class="sv">${items.length}</div></div>
    <div class="stat"><div class="sk">Quantity</div><div class="sv">${totalQty}</div></div>
    ${hasSavings ? `<div class="stat"><div class="sk">Savings</div><div class="sv green">${esc(toINR(totalSavings))}</div></div>` : ''}
    <div class="stat"><div class="sk">Total</div><div class="sv">${esc(toINR(order.totalAmount))}</div></div>
  </div>

  <!-- Body -->
  <div class="body">

    <!-- Customer + Invoice Info -->
    <div class="info-grid" id="blk-customer">
      <div class="panel">
        <div class="ph">Bill To</div>
        <table class="ktbl">
          <tr><td>Name</td><td><b>${esc(customerName)}</b></td></tr>
          ${order.recipientName && clean(order.recipientName) !== customerName
            ? `<tr><td>Recipient</td><td><b>${esc(order.recipientName)}</b></td></tr>` : ''}
          <tr><td>Phone</td><td><b>${esc(phone)}</b></td></tr>
        </table>
      </div>
      <div class="panel">
        <div class="ph">Invoice Details</div>
        <table class="ktbl">
          <tr><td>Invoice #</td><td><b>#${orderNo}</b></td></tr>
          <tr><td>Order Status</td><td><b id="info-order-status">${esc(upper(orderStatus))}</b></td></tr>
          <tr><td>Payment</td><td><b id="info-pay-method">${esc(upper(paymentMethod))}</b></td></tr>
          <tr><td>Pay Status</td><td><b id="info-pay-status">${esc(upper(paymentStatus))}</b></td></tr>
        </table>
      </div>
    </div>

    <!-- Delivery -->
    ${!isPickup ? `
      <div class="row2" id="blk-delivery">
        <div class="panel">
          <div class="ph">Delivery Address</div>
          <table class="ktbl">
            ${order.deliveryAddressLabel ? `<tr><td>Label</td><td><b>${esc(order.deliveryAddressLabel)}</b></td></tr>` : ''}
            ${order.deliveryAddress ? `<tr><td>Address</td><td><b style="white-space:pre-line">${esc(order.deliveryAddress)}</b></td></tr>` : ''}
            ${order.deliveryInstructions ? `<tr><td>Note</td><td><b>${esc(order.deliveryInstructions)}</b></td></tr>` : ''}
            ${order.deliveryDistanceKm != null ? `<tr><td>Distance</td><td><b>${num(order.deliveryDistanceKm).toFixed(2)} km</b></td></tr>` : ''}
          </table>
        </div>
      </div>` : ''}

    ${customBlock}

    <!-- Items -->
    <div class="row2" id="blk-items">
      <div class="itbl-wrap">
        <table class="itbl">
          <thead>
            <tr>
              <th class="c">#</th>
              <th>Item</th>
              <th class="c">Qty</th>
              <th style="text-align:right">Rate</th>
              <th style="text-align:right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows || `<tr><td class="td c" colspan="5">No items</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Totals -->
    <div id="blk-totals">
      <div class="totals-wrap">
        <div class="totals">
          <div class="trow"><span class="lbl">Subtotal</span><span class="val">${esc(toINR(order.subtotal))}</span></div>
          ${num(order.discount) > 0 ? `<div class="trow green"><span class="lbl">Discount</span><span class="val">&#8722;${esc(toINR(order.discount))}</span></div>` : ''}
          ${order.promoCode ? `<div class="trow green"><span class="lbl">Promo (${esc(order.promoCode)})</span><span class="val">Applied</span></div>` : ''}
          <div class="trow"><span class="lbl">Delivery Fee</span><span class="val">${esc(toINR(order.deliveryFee))}</span></div>
          ${hasAppTax ? `<div class="trow"><span class="lbl">${esc(taxLabel)}</span><span class="val">${esc(toINR(order.tax))}</span></div>` : ''}
          <div class="trow bold"><span class="lbl">Grand Total</span><span class="val">${esc(toINR(order.totalAmount))}</span></div>
        </div>
      </div>
    </div>

    <!-- Notes -->
    <div class="notes-wrap" id="blk-notes">
      <div id="print-cust-notes-wrap" class="${clean(order.customerNotes) ? '' : 'hidden'}">
        <div class="row2">
          <div class="panel">
            <div class="ph">Customer Notes</div>
            <div class="nv" id="print-cust-notes">${esc(clean(order.customerNotes))}</div>
          </div>
        </div>
      </div>
      <div id="print-special-wrap" class="${clean(order.specialInstructions) ? '' : 'hidden'}">
        <div class="row2">
          <div class="panel">
            <div class="ph">Special Instructions</div>
            <div class="nv" id="print-special">${esc(clean(order.specialInstructions))}</div>
          </div>
        </div>
      </div>
      <div id="print-internal-wrap" class="hidden">
        <div class="row2">
          <div class="panel merch-block">
            <div class="ph">&#128274; Internal Note</div>
            <div class="nv" id="print-internal"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Merchant Fields -->
    <div class="merch-internal hidden" id="blk-merchant">
      <div class="ph" style="color:#92400e;margin-bottom:8px">&#128274; Merchant Record</div>
      <div class="info-grid">
        <div class="panel merch-block">
          <div class="ph">Merchant Info</div>
          <table class="ktbl">
            <tr><td>Business</td><td><b>${esc(merchantName)}</b></td></tr>
            ${hasValue(merchantPhone)   ? `<tr><td>Phone</td><td><b>${esc(merchantPhone)}</b></td></tr>` : ''}
            ${hasValue(merchantGstin)   ? `<tr><td>GSTIN</td><td><b>${esc(merchantGstin)}</b></td></tr>` : ''}
            ${hasValue(merchantAddress) ? `<tr><td>Address</td><td><b style="white-space:pre-line">${esc(merchantAddress)}</b></td></tr>` : ''}
          </table>
        </div>
        <div class="panel merch-block">
          <div class="ph">Financial Summary</div>
          <table class="ktbl">
            <tr><td>Subtotal</td><td><b>${esc(toINR(order.subtotal))}</b></td></tr>
            ${num(order.discount) > 0 ? `<tr><td>Discount</td><td><b>${esc(toINR(order.discount))}</b></td></tr>` : ''}
            <tr><td>Delivery</td><td><b>${esc(toINR(order.deliveryFee))}</b></td></tr>
            ${hasAppTax ? `<tr><td>${esc(taxLabel)}</td><td><b>${esc(toINR(order.tax))}</b></td></tr>` : ''}
            <tr><td>Grand Total</td><td><b>${esc(toINR(order.totalAmount))}</b></td></tr>
          </table>
        </div>
      </div>
      <div class="row2">
        <div class="panel merch-block">
          <div class="ph">Order IDs</div>
          <table class="ktbl">
            <tr><td>Order ID</td><td><b style="font-size:10px;word-break:break-all">${esc((order as any).id ?? 'N/A')}</b></td></tr>
            <tr><td>Customer ID</td><td><b style="font-size:10px;word-break:break-all">${esc((order as any).customerId ?? (order as any).customer_id ?? 'N/A')}</b></td></tr>
            <tr><td>Merchant ID</td><td><b style="font-size:10px;word-break:break-all">${esc((order as any).merchantId ?? (order as any).merchant_id ?? 'N/A')}</b></td></tr>
            ${(order as any).driverId ?? (order as any).driver_id
              ? `<tr><td>Driver ID</td><td><b style="font-size:10px;word-break:break-all">${esc((order as any).driverId ?? (order as any).driver_id)}</b></td></tr>`
              : ''}
          </table>
        </div>
      </div>
    </div>

  </div><!-- /body -->

  <!-- Footer -->
  <div class="footer">
    <div class="footer-l">
      ${hasValue(supportPhone) ? `<div>&#128222; ${esc(supportPhone)}</div>` : ''}
      ${hasValue(supportEmail) ? `<div>&#9993;&#65039; ${esc(supportEmail)}</div>` : ''}
      <div>&#127760; <a href="${esc(websiteUrl)}" target="_blank" rel="noopener noreferrer" style="color:inherit">${esc(websiteUrl.replace(/^https?:\/\//, ''))}</a></div>
      <div>Thank you for your business!</div>
    </div>
    <div class="footer-r">
      <div>Generated: <span id="gen-time-footer"></span></div>
      <div class="dev">Developed with &#10084;&#65039; by
        <a href="https://www.instagram.com/thrillyverse" target="_blank" rel="noopener noreferrer">Thrillyverse</a>
      </div>
      ${socialChips ? `<div class="chips">${socialChips}</div>` : ''}
    </div>
  </div>

</div><!-- /sheet -->
</div><!-- /wrap -->

<script>
(function(){
  const ORIG_ORDER_STATUS = ${jsStatus};
  const ORIG_CUST_NOTES   = ${jsCustNotes};
  const ORIG_SPECIAL      = ${jsSpecial};

  const STATUS_CLASS = {
    delivered:'badge-green',completed:'badge-green',
    cancelled:'badge-red',failed:'badge-red',
    preparing:'badge-blue',confirmed:'badge-blue',
    ontheway:'badge-blue',pickedup:'badge-blue',
    assigned:'badge-blue',ready:'badge-blue',
  };
  const PAY_CLASS = {paid:'badge-green',failed:'badge-red',refunded:'badge-red'};
  const ALL_BADGE = ['badge-green','badge-red','badge-blue','badge-amber'];

  // Timestamp
  const ts = new Date().toLocaleString('en-IN',{
    day:'2-digit',month:'short',year:'numeric',
    hour:'2-digit',minute:'2-digit',hour12:true,
  });
  const stampEl   = document.getElementById('gen-stamp');
  const footerTs  = document.getElementById('gen-time-footer');
  if (stampEl)   stampEl.textContent  = ts;
  if (footerTs)  footerTs.textContent = ts;

  // Prefill note panels
  const epC = document.getElementById('ep-cust-notes');
  const epS = document.getElementById('ep-special');
  if (epC) epC.value = ORIG_CUST_NOTES;
  if (epS) epS.value = ORIG_SPECIAL;

  // ── Overlays ───────────────────────────────────────────
  window.openEditNotes  = () => open('overlay-notes');
  window.openEditStatus = () => open('overlay-status');
  function open(id){ const e=document.getElementById(id); if(e) e.classList.add('open'); }
  window.closeOverlay   = id => { const e=document.getElementById(id); if(e) e.classList.remove('open'); };

  // ── Apply Notes ────────────────────────────────────────
  window.applyNotes = function(){
    const cust     = document.getElementById('ep-cust-notes')?.value ?? '';
    const special  = document.getElementById('ep-special')?.value    ?? '';
    const internal = document.getElementById('ep-internal')?.value   ?? '';
    setBlock('print-cust-notes','print-cust-notes-wrap',cust);
    setBlock('print-special',   'print-special-wrap',   special);
    setBlock('print-internal',  'print-internal-wrap',  internal);
    closeOverlay('overlay-notes');
  };
  function setBlock(tid,wid,val){
    const t=document.getElementById(tid), w=document.getElementById(wid);
    if(t) t.textContent=val;
    if(w) w.classList.toggle('hidden',!val.trim());
  }

  // ── Apply Status ───────────────────────────────────────
  window.applyStatus = function(){
    const ov = document.getElementById('ep-order-status')?.value?.trim() ?? '';
    const pv = document.getElementById('ep-pay-status')?.value?.trim()   ?? '';
    const mv = document.getElementById('ep-pay-method')?.value?.trim()   ?? '';
    if(ov){ setBadge('status-badge-live',ov.toUpperCase(), STATUS_CLASS[ov.toLowerCase()]??'badge-amber'); setCell('info-order-status',ov.toUpperCase()); }
    if(pv){ setBadge('pay-badge-live',   pv.toUpperCase(), PAY_CLASS[pv.toLowerCase()]??'badge-amber');    setCell('info-pay-status',   pv.toUpperCase()); }
    if(mv){ setCell('info-pay-method',mv.toUpperCase()); const hr=document.getElementById('hr-method'); if(hr) hr.textContent='Method: '+mv.toUpperCase(); }
    closeOverlay('overlay-status');
  };
  function setBadge(id,txt,cls){
    const e=document.getElementById(id); if(!e) return;
    ALL_BADGE.forEach(c=>e.classList.remove(c)); e.classList.add(cls); e.textContent=txt;
  }
  function setCell(id,txt){ const e=document.getElementById(id); if(e) e.textContent=txt; }

  // ── Copy ───────────────────────────────────────────────
  window.setCopy = function(val){
    const el=document.getElementById('copy-display');
    if(el) el.textContent=val+' Copy';
    const isMI = val==='Merchant'||val==='Internal';
    const tM=document.getElementById('tgl-merch'), bM=document.getElementById('blk-merchant');
    if(tM&&bM){ tM.checked=isMI; bM.classList.toggle('hidden',!isMI); }
    const iW=document.getElementById('print-internal-wrap');
    const eI=document.getElementById('ep-internal');
    if(iW) iW.classList.toggle('hidden', val!=='Internal'||!(eI?.value?.trim()));
  };

  // ── Block toggles ──────────────────────────────────────
  window.toggleBlock    = (id,cb)=>{ const e=document.getElementById(id); if(e) e.classList.toggle('hidden',!cb.checked); };
  window.toggleMerchant = cb    => toggleBlock('blk-merchant',cb);

  // ── Layout ─────────────────────────────────────────────
  window.setLayout = val => { document.body.className='layout-'+val; };

  // ── Reset ──────────────────────────────────────────────
  window.resetAll = function(){
    ['tgl-stats','tgl-customer','tgl-delivery','tgl-custom','tgl-items','tgl-totals','tgl-notes']
      .forEach(id=>{ const cb=document.getElementById(id); if(cb){ cb.checked=true; cb.dispatchEvent(new Event('change')); } });
    const tM=document.getElementById('tgl-merch');
    if(tM){ tM.checked=false; tM.dispatchEvent(new Event('change')); }
    const sel=document.getElementById('copy-select');   if(sel){ sel.value='Customer';  setCopy('Customer'); }
    const lay=document.getElementById('layout-select'); if(lay){ lay.value='default';   setLayout('default'); }
    const ec=document.getElementById('ep-cust-notes'),  es=document.getElementById('ep-special'), ei=document.getElementById('ep-internal');
    if(ec) ec.value=ORIG_CUST_NOTES; if(es) es.value=ORIG_SPECIAL; if(ei) ei.value='';
    setBlock('print-cust-notes','print-cust-notes-wrap',ORIG_CUST_NOTES);
    setBlock('print-special',   'print-special-wrap',   ORIG_SPECIAL);
    setBlock('print-internal',  'print-internal-wrap',  '');
    setBadge('status-badge-live',ORIG_ORDER_STATUS.toUpperCase(),STATUS_CLASS[ORIG_ORDER_STATUS.toLowerCase()]??'badge-amber');
    setCell('info-order-status',ORIG_ORDER_STATUS.toUpperCase());
    ['ep-order-status','ep-pay-status','ep-pay-method'].forEach(id=>{ const e=document.getElementById(id); if(e) e.value=''; });
  };
})();
</script>
</body>
</html>`;
}