import { supabase } from '../lib/supabase';
import type { AppSettings } from '../lib/types';

let _cached: AppSettings | null = null;

export async function getAppSettings(): Promise<AppSettings | null> {
  if (_cached) return _cached;
  const { data } = await supabase.from('app_settings').select('*').limit(1).maybeSingle();
  _cached = data as AppSettings;
  return _cached;
}

export function calcDeliveryFee(settings: AppSettings, distKm: number): number {
  if (!settings.delivery_fee_enabled) return 0;
  if (distKm <= settings.base_delivery_radius_km) return settings.delivery_fee;
  const extra = (distKm - settings.base_delivery_radius_km) * settings.per_km_fee_beyond_base;
  return Math.round((settings.delivery_fee + extra) * 100) / 100;
}

export function calcGST(subtotal: number, settings: AppSettings, merchant?: { gst_enabled: boolean; gst_percentage: number | null }): number {
  if (merchant?.gst_enabled && merchant.gst_percentage) return (subtotal * merchant.gst_percentage) / 100;
  if (settings.tax_percentage) return (subtotal * settings.tax_percentage) / 100;
  return 0;
}
