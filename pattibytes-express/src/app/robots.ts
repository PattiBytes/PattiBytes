import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://pbexpress.pattibytes.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/customer/', '/driver/', '/merchant/', '/superadmin/', '/auth/', '/api/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
