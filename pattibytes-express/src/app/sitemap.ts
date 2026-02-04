import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://pbexpress.pattibytes.com';

// IMPORTANT:
// For Google SEO, prefer a PUBLIC route like "/restaurants/[id-or-slug]".
// If you keep "/customer/restaurant/[id]" (auth wall), Google usually won't index it.
const RESTAURANT_SEO_PATH = process.env.NEXT_PUBLIC_RESTAURANT_SEO_PATH || '/restaurants';

type MerchantRow = {
  id: string;
  updated_at?: string | null;
  is_active?: boolean | null;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Always include your public static URLs
  const staticUrls: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${SITE_URL}/qr`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.3,
    },
  ];

  // Dynamic restaurant URLs from Supabase (keep it safe + small)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If env vars aren't set, return only static URLs (still valid)
  if (!supabaseUrl || !supabaseKey) return staticUrls;

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from('merchants')
    .select('id,updated_at,is_active')
    .eq('is_active', true)
    .limit(5000);

  if (error || !data?.length) return staticUrls;

  const restaurants = (data as MerchantRow[])
    .filter((m) => !!m?.id)
    .map((m) => ({
      url: `${SITE_URL}${RESTAURANT_SEO_PATH}/${m.id}`,
      lastModified: m.updated_at ? new Date(m.updated_at) : now,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    }));

  return [...staticUrls, ...restaurants];
}
