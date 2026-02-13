/* eslint-disable @typescript-eslint/no-explicit-any */
// pattibytes-express/src/components/customer-dashboard/offers.ts

export type DealType = 'cart_discount' | 'bxgy';
export type DiscountType = 'percentage' | 'fixed';
export type BxgyDiscountType = 'free' | 'percentage' | 'fixed';

export type OfferBadge = {
  label: string;              // short badge (top line)
  subLabel?: string;          // optional second line (can include item names)
  auto?: boolean;

  promoId?: string;
  dealType?: DealType;

  buyItemIds?: string[];      // menu_items.id
  getItemIds?: string[];      // menu_items.id

  // Names for UI (RestaurantCard can show these)
  buyItemNames?: string[];
  getItemNames?: string[];

  // where to scroll first (usually first "buy" item)
  focusItemId?: string;
  focusItemName?: string;
};

export type PromoCodeRow = {
  id: string;
  code: string;
  description: string | null;

  scope: 'global' | 'merchant' | 'targets';
  merchant_id: string | null;

  deal_type: DealType | null;
  // jsonb
   
  deal_json: any;

  discount_type: DiscountType | null;
  discount_value: number | null;
  min_order_amount: number | null;
  max_discount_amount: number | null;

  auto_apply: boolean | null;
  priority: number | null;

  is_active?: boolean | null;

  valid_from: string | null;
  valid_until: string | null;

  // NOTE: Supabase can return this as number[] OR string[] depending on how you store it
  valid_days: number[] | string[] | null; // 1=Mon..7=Sun

  valid_time_start?: string | null; // sometimes used
  valid_time_end?: string | null;
  start_time?: string | null;       // sometimes used
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

export type MenuItemNameLite = {
  id: string;
  name: string;
};

type BxgyDealJson = {
  buy?: { qty?: number };
  get?: {
    qty?: number;
    discount?: { type?: BxgyDiscountType; value?: number };
  };
  selection?: string; // "auto_cheapest" etc. [file:1]
  max_sets_per_order?: number;

  // tolerate older camelCase keys too
  maxSetsPerOrder?: number;
};

const clampNum = (v: any, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const toStr = (v: any) => String(v ?? '').trim();

function dayNumberMon1Sun7(d: Date) {
  const js = d.getDay(); // Sun=0..Sat=6
  return js === 0 ? 7 : js;
}

function timeToMinutes(t: string) {
  // supports "HH:mm" or "HH:mm:ss" [file:1]
  const s = toStr(t);
  const [hh, mm] = s.split(':');
  return clampNum(hh, 0) * 60 + clampNum(mm, 0);
}

function isNowWithinTimeWindow(now: Date, start?: string | null, end?: string | null) {
  if (!start && !end) return true;
  const cur = now.getHours() * 60 + now.getMinutes();

  const s = start ? timeToMinutes(start) : 0;
  const e = end ? timeToMinutes(end) : 24 * 60;

  // normal window
  if (s <= e) return cur >= s && cur <= e;

  // overnight window (e.g. 23:59 -> 00:02) [file:1]
  return cur >= s || cur <= e;
}

function normalizeValidDays(v: PromoCodeRow['valid_days']): number[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => clampNum(x, NaN))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 7);
}

export function isPromoActiveNow(p: PromoCodeRow, now = new Date()) {
  if (p.is_active === false) return false;

  if (p.valid_from) {
    const vf = new Date(p.valid_from);
    if (!Number.isNaN(vf.getTime()) && now < vf) return false;
  }

  if (p.valid_until) {
    const vu = new Date(p.valid_until);
    if (!Number.isNaN(vu.getTime()) && now > vu) return false;
  }

  const days = normalizeValidDays(p.valid_days);
  if (days.length > 0) {
    const today = dayNumberMon1Sun7(now);
    if (!days.includes(today)) return false;
  }

  const start = p.start_time ?? p.valid_time_start ?? null;
  const end = p.end_time ?? p.valid_time_end ?? null;
  if (!isNowWithinTimeWindow(now, start, end)) return false;

  return true;
}

/**
 * Turn promo + bxgy targets into a badge.
 * Provide `menuItemsById` if you want item names in UI.
 */
export function buildOfferBadgeFromPromo(params: {
  promo: PromoCodeRow;
  bxgyTargets?: BxgyTargetRow[] | null;
  menuItemsById?: Record<string, MenuItemNameLite> | null;
}): OfferBadge | null {
  const promo = params.promo;
  const dealType: DealType = (promo.deal_type ?? 'cart_discount') as DealType;

  // Base badge
  const badge: OfferBadge = {
    promoId: promo.id,
    dealType,
    auto: !!promo.auto_apply,
    label: toStr(promo.code) || 'OFFER',
    subLabel: toStr(promo.description) || undefined,
  };

  if (dealType !== 'bxgy') {
    // cart_discount: keep description as sublabel, no item ids
    return badge;
  }

  const deal: BxgyDealJson = (promo.deal_json || {}) as any;
  const buyQty = Math.max(1, clampNum(deal?.buy?.qty, 1));
  const getQty = Math.max(1, clampNum(deal?.get?.qty, 1));

  // Build item id lists from targets table (menu_item_id) [file:1]
  const targets = Array.isArray(params.bxgyTargets) ? params.bxgyTargets : [];
  const buyIds = Array.from(
    new Set(
      targets
        .filter((t) => t.side === 'buy' && t.menu_item_id)
        .map((t) => String(t.menu_item_id))
    )
  );
  const getIds = Array.from(
    new Set(
      targets
        .filter((t) => t.side === 'get' && t.menu_item_id)
        .map((t) => String(t.menu_item_id))
    )
  );

  badge.buyItemIds = buyIds;
  badge.getItemIds = getIds;

  // Choose focus item: first buy item, else first get item
  const focusId = buyIds[0] || getIds[0] || undefined;
  badge.focusItemId = focusId;

  // If we have names map, attach names (for RestaurantCard sublabel)
  const map = params.menuItemsById || null;
  if (map) {
    badge.buyItemNames = buyIds.map((id) => map[id]?.name).filter(Boolean) as string[];
    badge.getItemNames = getIds.map((id) => map[id]?.name).filter(Boolean) as string[];
    badge.focusItemName = focusId ? map[focusId]?.name : undefined;
  }

  // Better label/subLabel for BXGY
  badge.label = toStr(promo.code) || `BUY ${buyQty} GET ${getQty}`;
  badge.subLabel = formatOfferSubLabel(badge, { buyQty, getQty });

  return badge;
}

/**
 * SubLabel generator (shows item names if available).
 * For your example "Buy pizza get burger" it will become:
 * "Buy Pizza • Get Burger" if names are provided. [file:1]
 */
export function formatOfferSubLabel(
  offer?: OfferBadge | null,
  opts?: { buyQty?: number; getQty?: number }
) {
  if (!offer) return '';

  if (offer.dealType !== 'bxgy') {
    return offer.subLabel || '';
  }

  const buyNames = (offer.buyItemNames || []).filter(Boolean);
  const getNames = (offer.getItemNames || []).filter(Boolean);

  const buyQty = Math.max(1, clampNum(opts?.buyQty, 1));
  const getQty = Math.max(1, clampNum(opts?.getQty, 1));

  const buyText = buyNames.length ? buyNames.join(', ') : 'selected items';
  const getText = getNames.length ? getNames.join(', ') : 'selected items';

  // Keep it short for badge UI
  return `Buy ${buyQty}: ${buyText} • Get ${getQty}: ${getText}`;
}
