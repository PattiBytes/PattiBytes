import { NextApiRequest, NextApiResponse } from 'next';
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CMSContent>
) {
  try {
    const newsDir = path.join(process.cwd(), '_news');
    const placesDir = path.join(process.cwd(), '_places');

    // Read news files
    let news: NewsItem[] = [];
    if (fs.existsSync(newsDir)) {
      const newsFiles = fs.readdirSync(newsDir).filter(file => file.endsWith('.md'));
      news = newsFiles.map(filename => {
        const filePath = path.join(newsDir, filename);
        const fileContents = fs.readFileSync(filePath, 'utf8');
        const { data, content } = matter(fileContents);
        
        return {
          id: data.id || filename.replace('.md', ''),
          title: data.title || 'Untitled',
          date: data.date || new Date().toISOString(),
          preview: data.preview || '',
          image: data.image,
          author: data.author || 'Patti Bytes Desk',
          tags: data.tags || ['news'],
          body: content
        };
      });
    }

    // Read places files
    let places: PlaceItem[] = [];
    if (fs.existsSync(placesDir)) {
      const placesFiles = fs.readdirSync(placesDir).filter(file => file.endsWith('.md'));
      places = placesFiles.map(filename => {
        const filePath = path.join(placesDir, filename);
        const fileContents = fs.readFileSync(filePath, 'utf8');
        const { data, content } = matter(fileContents);
        
        return {
          id: data.id || filename.replace('.md', ''),
          title: data.title || 'Untitled',
          date: data.date || new Date().toISOString(),
          preview: data.preview || '',
          image: data.image,
          tags: data.tags || ['places'],
          body: content
        };
      });
    }

    // Sort by date (newest first)
    news.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    places.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.status(200).json({ news, places });
  } catch (error) {
    console.error('Error reading CMS content:', error);
    res.status(200).json({ news: [], places: [] }); // Return empty arrays on error
  }
}
