// app-next/pages/api/cms/places.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import matter from 'gray-matter';

type Item = {
  id: string;
  slug: string;
  title: string;
  preview: string;
  date: string;
  image?: string;
  location?: string;
  tags?: string[];
  body?: string;
  url: string;
  send_notification?: boolean;
  push_message?: string;
};

function normalizeUploads(src?: string): string | undefined {
  if (!src) return undefined;

  if (src.startsWith('assets/uploads') || src.startsWith('/assets/uploads')) {
    const base = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '');
    const clean = src.startsWith('/') ? src : `/${src}`;
    return `${base}${clean}`;
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

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const baseDir = process.cwd();
    const appDir = path.join(baseDir, '_places');
    const rootDir = path.join(baseDir, '..', '_places');

    const preferredDir = (await safeReadDir(appDir)).length ? appDir : rootDir;
    const files = await safeReadDir(preferredDir);

    const items: Item[] = [];
    for (const file of files) {
      if (!file.endsWith('.md') && !file.endsWith('.mdx')) continue;
      const full = path.join(preferredDir, file);
      const raw = await fs.readFile(full, 'utf8');
      const parsed = matter(raw);

      const fm = parsed.data as Record<string, unknown>;
      const id = (fm.id as string) || file.replace(/\.mdx?$/, '');
      const slug = (fm.slug as string) || id;
      const url = `/places/${id}`;

      items.push({
        id,
        slug,
        title: (fm.title as string) || id,
        preview: (fm.preview as string) || '',
        date: (fm.date as string) || new Date().toISOString(),
        image: normalizeUploads(fm.image as string | undefined),
        location: fm.location as string | undefined,
        tags: (fm.tags as string[]) || ['places'],
        body: parsed.content || '',
        url,
        send_notification: (fm.send_notification as boolean) ?? false,
        push_message: fm.push_message as string | undefined,
      });
    }

    items.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    res.status(200).json(items);
  } catch (err) {
    console.error('API /api/cms/places error:', err);
    res.status(200).json([]);
  }
}
