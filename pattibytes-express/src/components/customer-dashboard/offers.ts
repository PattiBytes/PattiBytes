export type OfferBadge = {
  label: string;
  subLabel?: string;
  auto?: boolean;

  promoId?: string;
  dealType?: 'bxgy' | 'cart_discount';

  buyItemIds?: string[]; // menu_items.id
  getItemIds?: string[]; // menu_items.id

  // where to scroll first (usually buy item)
  focusItemId?: string;
};

export type PromoCodeRow = {
  id: string;
  code: string;
  description: string | null;

  scope: 'global' | 'merchant' | 'targets';
  merchant_id: string | null;

  deal_type: 'cart_discount' | 'bxgy' | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deal_json: any;

  discount_type: 'percentage' | 'fixed' | null;
  discount_value: number | null;
  min_order_amount: number | null;
  max_discount_amount: number | null;

  auto_apply: boolean | null;
  priority: number | null;

  valid_from: string | null;
  valid_until: string | null;
  valid_days: number[] | null; // 1=Mon..7=Sun

  valid_time_start?: string | null;
  valid_time_end?: string | null;
  start_time?: string | null;
  end_time?: string | null;
};

export type BxgyTargetRow = {
  id: string;
  promo_code_id: string;
  side: 'buy' | 'get';
  menu_item_id: string | null;
  category_id: string | null;
  created_at: string;
};

function dayNumberMon1Sun7(d: Date) {
  const js = d.getDay(); // Sun=0..Sat=6
  return js === 0 ? 7 : js;
}

function timeToMinutes(t: string) {
  const [hh, mm] = String(t).split(':');
  return Number(hh || 0) * 60 + Number(mm || 0);
}

function isNowWithinTimeWindow(now: Date, start?: string | null, end?: string | null) {
  if (!start && !end) return true;
  const cur = now.getHours() * 60 + now.getMinutes();
  const s = start ? timeToMinutes(start) : 0;
  const e = end ? timeToMinutes(end) : 24 * 60;
  if (s <= e) return cur >= s && cur <= e;
  return cur >= s || cur <= e; // overnight window
}

export function isPromoActiveNow(p: PromoCodeRow, now = new Date()) {
  if (p.valid_from) {
    const vf = new Date(p.valid_from);
    if (!Number.isNaN(vf.getTime()) && now < vf) return false;
  }

  if (p.valid_until) {
    const vu = new Date(p.valid_until);
    if (!Number.isNaN(vu.getTime()) && now > vu) return false;
  }

  if (Array.isArray(p.valid_days) && p.valid_days.length > 0) {
    const today = dayNumberMon1Sun7(now);
    if (!p.valid_days.includes(today)) return false;
  }

  const start = p.start_time ?? p.valid_time_start ?? null;
  const end = p.end_time ?? p.valid_time_end ?? null;
  if (!isNowWithinTimeWindow(now, start, end)) return false;

  return true;
}
