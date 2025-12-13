// app-next/lib/netlifyCms.ts
export interface CMSNewsItem {
  id: string;
  slug: string;
  title: string;
  preview: string;
  date: string;
  author?: string;
  image?: string;
  tags: string[];
  body?: string;
  url: string;
  send_notification?: boolean;
  push_message?: string;
}

export interface CMSPlaceItem {
  description: string | undefined;
  id: string;
  slug: string;
  title: string;
  preview: string;
  date: string;
  image?: string;
  location?: string;
  tags: string[];
  body?: string;
  url: string;
  send_notification?: boolean;
  push_message?: string;
}

export interface CMSNotification {
  id: string;
  title: string;
  message: string;
  target_url?: string;
  image?: string;
  audience: 'all' | 'segment' | 'specific';
  segment_tag?: string;
  specific_subscribers?: Array<{ subscriber: string }>;
  send_now: boolean;
  schedule_datetime?: string;
  author?: string;
  preview?: string;
  body?: string;
}

function originBase(): string {
  if (typeof window !== 'undefined') return window.location.origin;
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://www.pattibytes.com';
}

function normalizeCmsImage(src?: string): string | undefined {
  if (!src) return undefined;
  // Ensure /assets/uploads/ resolves under site origin
  if (src.startsWith('/assets/uploads/')) {
    return `${originBase()}${src}`;
  }
  // Already absolute or relative to CDN/site
  return src;
}

export async function fetchCMSNews(): Promise<CMSNewsItem[]> {
  const base = originBase();
  // Prefer API route (indexes markdown in /_news); fallback to static JSON if present
  const endpoints = [`${base}/api/cms/news`, `${base}/news/index.json`];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      const data = await res.json();
      const items = Array.isArray(data) ? data : (data.items || []);
      return (items as Record<string, unknown>[]).map((item, idx) => ({
        id: (item.id as string) || (item.slug as string) || `news-${idx}`,
        slug: (item.slug as string) || (item.id as string) || `news-${idx}`,
        title: item.title as string,
        preview: (item.preview as string) || '',
        date: item.date as string,
        author: item.author as string | undefined,
        image: normalizeCmsImage(item.image as string | undefined),
        tags: (item.tags as string[]) || [],
        body: item.body as string | undefined,
        url: (item.url as string) || `${base}/news/${(item.slug as string) || item.id}`,
        send_notification: item.send_notification as boolean | undefined,
        push_message: item.push_message as string | undefined,
      }));
    } catch {}
  }
  return [];
}

export async function fetchCMSPlaces(): Promise<CMSPlaceItem[]> {
  const base = originBase();
  const endpoints = [`${base}/api/cms/places`, `${base}/places/index.json`];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      const data = await res.json();
      const items = Array.isArray(data) ? data : (data.items || []);
     
      return (items as Record<string, unknown>[]).map((item, idx) => ({
        id: (item.id as string) || (item.slug as string) || `place-${idx}`,
        slug: (item.slug as string) || (item.id as string) || `place-${idx}`,
        title: item.title as string,
        preview: (item.preview as string) || '',
        date: item.date as string,
        image: normalizeCmsImage(item.image as string | undefined),
        location: item.location as string | undefined,
         description: (item.description as string | undefined) || (item.body as string | undefined),
        tags: (item.tags as string[]) || [],
        body: item.body as string | undefined,
        url: (item.url as string) || `${base}/places/${(item.slug as string) || item.id}`,
        send_notification: item.send_notification as boolean | undefined,
        push_message: item.push_message as string | undefined,
      }));
    } catch {}
  }
  return [];
}

export async function fetchCMSNotifications(): Promise<CMSNotification[]> {
  const base = originBase();
  const endpoints = [`${base}/api/cms/notifications`, `${base}/notifications/index.json`];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      const data = await res.json();
      const items = Array.isArray(data) ? data : (data.items || []);
      return (items as Record<string, unknown>[]).map((item, idx) => ({
        id: (item.id as string) || `notif-${idx}`,
        title: item.title as string,
        message: item.message as string,
        target_url: item.target_url as string | undefined,
        image: normalizeCmsImage(item.image as string | undefined),
        audience: (item.audience as 'all' | 'segment' | 'specific') || 'all',
        segment_tag: item.segment_tag as string | undefined,
        specific_subscribers: item.specific_subscribers as Array<{ subscriber: string }> | undefined,
        send_now: (item.send_now as boolean) || false,
        schedule_datetime: item.schedule_datetime as string | undefined,
        author: item.author as string | undefined,
        preview: item.preview as string | undefined,
        body: item.body as string | undefined,
      }));
    } catch {}
  }
  return [];
}
