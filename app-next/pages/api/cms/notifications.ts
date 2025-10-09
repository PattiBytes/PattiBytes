import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import matter from 'gray-matter';

type Notif = {
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
};

function normalizeUploads(src?: string): string | undefined {
  if (!src) return undefined;
  if (src.startsWith('/assets/uploads/')) {
    const base = process.env.NEXT_PUBLIC_SITE_URL || '';
    return `${base}${src}`;
  }
  return src;
}

async function safeReadDir(dir: string): Promise<string[]> {
  try {
    return await fs.readdir(dir);
  } catch {
    return [];
  }
}

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const baseDir = process.cwd();
    const appDir = path.join(baseDir, '_notifications');
    const rootDir = path.join(baseDir, '..', '_notifications');

    const preferredDir = (await safeReadDir(appDir)).length ? appDir : rootDir;
    const files = await safeReadDir(preferredDir);

    const items: Notif[] = [];
    for (const file of files) {
      if (!file.endsWith('.md') && !file.endsWith('.mdx')) continue;
      const full = path.join(preferredDir, file);
      const raw = await fs.readFile(full, 'utf8');
      const parsed = matter(raw);

      const fm = parsed.data as Record<string, unknown>;
      const id = (fm.id as string) || file.replace(/\.mdx?$/, '');

      items.push({
        id,
        title: (fm.title as string) || id,
        message: (fm.message as string) || '',
        target_url: fm.target_url as string | undefined,
        image: normalizeUploads(fm.image as string | undefined),
        audience: ((fm.audience as 'all' | 'segment' | 'specific') || 'all'),
        segment_tag: fm.segment_tag as string | undefined,
        specific_subscribers: fm.specific_subscribers as Array<{ subscriber: string }> | undefined,
        send_now: (fm.send_now as boolean) ?? true,
        schedule_datetime: fm.schedule_datetime as string | undefined,
        author: fm.author as string | undefined,
        preview: fm.preview as string | undefined,
        body: parsed.content || ''
      });
    }

    res.status(200).json(items);
  } catch (err) {
    console.error('API /api/cms/notifications error:', err);
    res.status(200).json([]);
  }
}
