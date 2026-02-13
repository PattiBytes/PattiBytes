/* eslint-disable @typescript-eslint/no-explicit-any */
// appSettings.service.ts
import { supabase } from '@/lib/supabase';

export type AppSettingsRow = {
  id: string;
  app_name: string | null;
  support_email: string | null;
  support_phone: string | null;
  business_address: string | null;

  facebook_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  youtube_url: string | null;
  website_url: string | null;

  delivery_fee: number | string | null;
  min_order_amount: number | string | null;
  tax_percentage: number | string | null;

  custom_links: unknown | null;

  customer_search_radius_km: number | string | null;

  announcement: unknown | null;
  show_menu_images: boolean | string | null;

  delivery_fee_enabled: boolean | string | null;
  delivery_fee_schedule: unknown | null;
  delivery_fee_show_to_customer: boolean | string | null;

  created_at: string | null;
  updated_at: string | null;
};

function asNumber(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function asBool(v: unknown, fallback: boolean): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === 'true') return true;
    if (s === 'false') return false;
  }
  if (typeof v === 'number') return v !== 0;
  return fallback;
}

// Supabase may return json/jsonb already parsed, but sometimes you may have strings
function asJson<T = unknown>(v: unknown, fallback: T): T {
  if (v == null) return fallback;
  if (typeof v === 'string') {
    try {
      return JSON.parse(v) as T;
    } catch {
      return fallback;
    }
  }
  return v as T;
}

/**
 * Your app has one latest config row (you insert/update it).
 * maybeSingle() prevents 406 when table is empty.
 */
export async function getAppConfigRow(): Promise<AppSettingsRow | null> {
  const { data, error } = await supabase
    .from('app_settings')
    .select(
      [
        'id',
        'app_name',
        'support_email',
        'support_phone',
        'business_address',
        'facebook_url',
        'instagram_url',
        'twitter_url',
        'youtube_url',
        'website_url',
        'delivery_fee',
        'min_order_amount',
        'tax_percentage',
        'custom_links',
        'customer_search_radius_km',
        'announcement',
        'show_menu_images',
        'delivery_fee_enabled',
        'delivery_fee_schedule',
        'delivery_fee_show_to_customer',
        'created_at',
        'updated_at',
      ].join(',')
    )
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as unknown as AppSettingsRow) ?? null;
}

export async function getCustomerSearchRadiusKm(): Promise<number> {
  const row = await getAppConfigRow();
  const n = asNumber(row?.customer_search_radius_km, 25); // your DB example uses 25
  return n > 0 ? n : 25;
}

/**
 * Brand/social links are direct columns in your table.
 * (Also supports custom_links JSON array if you want to use it in UI.)
 */
export async function getBrandLinks(): Promise<{
  app_name: string;
  facebook_url: string;
  instagram_url: string;
  twitter_url: string;
  youtube_url: string;
  website_url: string;
  custom_links: any[];
}> {
  const row = await getAppConfigRow();

  return {
    app_name: String(row?.app_name ?? ''),
    facebook_url: String(row?.facebook_url ?? ''),
    instagram_url: String(row?.instagram_url ?? ''),
    twitter_url: String(row?.twitter_url ?? ''),
    youtube_url: String(row?.youtube_url ?? ''),
    website_url: String(row?.website_url ?? ''),
    custom_links: asJson<any[]>(row?.custom_links, []),
  };
}

/**
 * Used in paste.txt CartPage: appSettingsService.getDeliveryPolicyNow()
 */
export type DeliveryPolicy = {
  enabled: boolean;
  showToCustomer: boolean;
  baseFee: number; // your fee calculator expects baseFee
  schedule: any; // keep as any unless you want strict typing for weekly structure
};

export async function getDeliveryPolicyNow(): Promise<DeliveryPolicy> {
  const row = await getAppConfigRow();

  const enabled = asBool(row?.delivery_fee_enabled, true);
  const showToCustomer = asBool(row?.delivery_fee_show_to_customer, true);

  // If you want schedule-based fees later, read from delivery_fee_schedule JSON
  const schedule = asJson<any>(row?.delivery_fee_schedule, null);

  // Fallback: if schedule exists and contains ui.base_fee you can use it,
  // otherwise fall back to delivery_fee column, else 0.
  const baseFee =
    schedule && typeof schedule === 'object'
      ? asNumber((schedule as any)?.ui?.base_fee, asNumber(row?.delivery_fee, 0))
      : asNumber(row?.delivery_fee, 0);

  return { enabled, showToCustomer, baseFee, schedule };
}



export const appSettingsService = {
  getAppConfigRow,
  getCustomerSearchRadiusKm,
  getBrandLinks,
  getDeliveryPolicyNow,
};

export default appSettingsService;
