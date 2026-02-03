// appSettings.service.ts
import { supabase } from '@/lib/supabase';

export async function getCustomerSearchRadiusKm(): Promise<number> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'customer_search_radius_km')
    .maybeSingle(); // <-- important

  if (error) throw error;

  const n = Number(data?.value);
  return Number.isFinite(n) && n > 0 ? n : 5;
}

export async function getBrandLinks() {
  const keys = [
    'brand_title',
    'brand_instagram_pattibytes',
    'brand_instagram_pbexpress38',
    'brand_youtube',
    'brand_website',
    'brand_facebook',
  ];

  const { data, error } = await supabase
    .from('app_settings')
    .select('key,value')
    .in('key', keys);

  if (error) throw error;

  return Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
}

// If you store a “single row config” (limit 1), also use maybeSingle()
export async function getAppConfigRow() {
  const { data, error } = await supabase
    .from('app_settings')
    .select('id,app_name,support_email,support_phone,business_address,facebook_url,instagram_url,twitter_url,youtube_url,website_url,delivery_fee,min_order_amount,tax_percentage,created_at,updated_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle(); // <-- avoids 406 when table is empty [web:273]

  if (error) throw error;

  return data ?? null;
}
