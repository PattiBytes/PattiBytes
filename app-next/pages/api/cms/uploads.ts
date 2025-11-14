// app-next/pages/api/cms/uploads.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';
import { promises as fsp } from 'fs';

type UploadItem = {
  filename: string;
  url: string;
  size: number;
  ext: string;
};

type FsStats = fs.Stats;

function buildPublicUrl(relativePath: string): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '');
  const clean = relativePath.startsWith('/')
    ? relativePath
    : `/${relativePath}`;
  return `${base}${clean}`;
}

function isMediaFile(name: string): boolean {
  const ext = path.extname(name).toLowerCase();
  return [
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
    '.gif',
    '.svg',
    '.mp4',
    '.mov',
    '.webm',
  ].includes(ext);
}

async function safeStat(p: string): Promise<FsStats | null> {
  try {
    return await fsp.stat(p);
  } catch {
    return null;
  }
}

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse<UploadItem[]>,
) {
  try {
    const appCwd = process.cwd();

    const publicDir = path.join(appCwd, 'public', 'assets', 'uploads');
    const rootDir = path.join(appCwd, '..', 'assets', 'uploads');

    let sourceDir = publicDir;
    const pubStat = await safeStat(publicDir);
    if (!pubStat || !pubStat.isDirectory()) {
      const rootStat = await safeStat(rootDir);
      if (!rootStat || !rootStat.isDirectory()) {
        return res.status(200).json([]);
      }
      sourceDir = rootDir;
    }

    let files: string[] = [];
    try {
      files = await fsp.readdir(sourceDir);
    } catch {
      return res.status(200).json([]);
    }

    const uploads: UploadItem[] = [];
    for (const name of files) {
      if (!isMediaFile(name)) continue;
      const fullPath = path.join(sourceDir, name);
      const st = await safeStat(fullPath);
      if (!st || !st.isFile()) continue;

      const relative = `assets/uploads/${name}`;
      uploads.push({
        filename: name,
        url: buildPublicUrl(relative),
        size: st.size,
        ext: path.extname(name).toLowerCase(),
      });
    }

    res.status(200).json(uploads);
  } catch (err) {
    console.error('API /api/cms/uploads error:', err);
    res.status(200).json([]);
  }
}
