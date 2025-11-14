// app-next/pages/api/cms-content.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

interface NewsItem {
  id: string;
  title: string;
  date: string;
  preview: string;
  image?: string;
  author?: string;
  tags?: string[];
  body: string;
}

interface PlaceItem {
  id: string;
  title: string;
  date: string;
  preview: string;
  image?: string;
  tags?: string[];
  body: string;
}

interface CMSContent {
  news: NewsItem[];
  places: PlaceItem[];
}

type NewsFrontmatter = {
  id?: string;
  title?: string;
  date?: string;
  preview?: string;
  image?: string;
  author?: string;
  tags?: string[];
};

type PlaceFrontmatter = {
  id?: string;
  title?: string;
  date?: string;
  preview?: string;
  image?: string;
  tags?: string[];
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

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse<CMSContent>,
) {
  try {
    const newsDir = path.join(process.cwd(), '_news');
    const placesDir = path.join(process.cwd(), '_places');

    // Read news files
    let news: NewsItem[] = [];
    if (fs.existsSync(newsDir)) {
      const newsFiles = fs
        .readdirSync(newsDir)
        .filter((file) => file.endsWith('.md'));

      news = newsFiles.map((filename) => {
        const filePath = path.join(newsDir, filename);
        const fileContents = fs.readFileSync(filePath, 'utf8');
        const { data, content } = matter(fileContents);
        const fm = data as NewsFrontmatter;

        const id = fm.id || filename.replace(/\.md$/, '');
        const title = fm.title || 'Untitled';
        const date = fm.date || new Date().toISOString();
        const preview = fm.preview || '';
        const image = normalizeUploads(fm.image);
        const author = fm.author || 'Patti Bytes Desk';
        const tags = fm.tags && fm.tags.length > 0 ? fm.tags : ['news'];

        return {
          id,
          title,
          date,
          preview,
          image,
          author,
          tags,
          body: content,
        };
      });
    }

    // Read places files
    let places: PlaceItem[] = [];
    if (fs.existsSync(placesDir)) {
      const placesFiles = fs
        .readdirSync(placesDir)
        .filter((file) => file.endsWith('.md'));

      places = placesFiles.map((filename) => {
        const filePath = path.join(placesDir, filename);
        const fileContents = fs.readFileSync(filePath, 'utf8');
        const { data, content } = matter(fileContents);
        const fm = data as PlaceFrontmatter;

        const id = fm.id || filename.replace(/\.md$/, '');
        const title = fm.title || 'Untitled';
        const date = fm.date || new Date().toISOString();
        const preview = fm.preview || '';
        const image = normalizeUploads(fm.image);
        const tags = fm.tags && fm.tags.length > 0 ? fm.tags : ['places'];

        return {
          id,
          title,
          date,
          preview,
          image,
          tags,
          body: content,
        };
      });
    }

    // Sort by date (newest first)
    news.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    places.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    res.status(200).json({ news, places });
  } catch (error) {
    console.error('Error reading CMS content:', error);
    res.status(200).json({ news: [], places: [] });
  }
}
