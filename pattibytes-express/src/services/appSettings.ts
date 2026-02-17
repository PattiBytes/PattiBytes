/* eslint-disable @typescript-eslint/no-explicit-any */
// services/appSettings.ts
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
  base_delivery_radius_km: number | string | null;
  per_km_fee_beyond_base: number | string | null;
  
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
        'base_delivery_radius_km',       // ✅ Added
        'per_km_fee_beyond_base',        // ✅ Added
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
  const n = asNumber(row?.customer_search_radius_km, 25);
  return n > 0 ? n : 25;
}

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

export type DeliveryPolicy = {
  enabled: boolean;
  showToCustomer: boolean;

  // ✅ New: Base delivery area configuration
  baseRadiusKm: number;        // From base_delivery_radius_km
  perKmFeeAfterBase: number;   // From per_km_fee_beyond_base

  // Your existing rule (fixed):
  baseKm: number;              // 3 (for compatibility)
  baseFee: number;             // from delivery_fee or schedule
  perKm: number;               // 15 (for compatibility)
  rounding: 'ceil' | 'exact';  // 'ceil'

  schedule: any;
};

export async function getDeliveryPolicyNow(): Promise<DeliveryPolicy> {
  const row = await getAppConfigRow();

  const enabled = asBool(row?.delivery_fee_enabled, true);
  const showToCustomer = asBool(row?.delivery_fee_show_to_customer, true);

  const schedule = asJson<any>(row?.delivery_fee_schedule, null);

  // ✅ Get new delivery area settings
  const baseRadiusKm = asNumber(row?.base_delivery_radius_km, 5);
  const perKmFeeAfterBase = asNumber(row?.per_km_fee_beyond_base, 10);

  // Fixed rule defaults (for backward compatibility)
  const baseKm = 3;
  const perKm = 15;
  const rounding: 'ceil' | 'exact' = 'ceil';

  // baseFee from schedule.ui.base_fee first, else delivery_fee column
  const baseFee =
    schedule && typeof schedule === 'object'
      ? asNumber((schedule as any)?.ui?.base_fee, asNumber(row?.delivery_fee, 0))
      : asNumber(row?.delivery_fee, 0);

  return {
    enabled,
    showToCustomer,
    baseRadiusKm,           // ✅ Added
    perKmFeeAfterBase,      // ✅ Added
    baseKm,
    baseFee,
    perKm,
    rounding,
    schedule,
  };
}

export const appSettingsService = {
  getAppConfigRow,
  getCustomerSearchRadiusKm,
  getBrandLinks,
  getDeliveryPolicyNow,
};

export default appSettingsService;
