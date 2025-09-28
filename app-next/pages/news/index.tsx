// /app-next/pages/news/index.tsx
import type { GetStaticProps } from 'next';
type Article = { id:string; slug:string; title:string; preview?:string; date:string; author?:string; image?:string; url?:string };

export const getStaticProps: GetStaticProps = async () => {
  const ORIGIN = process.env.SITE_ORIGIN || 'https://www.pattibytes.com';
  const r = await fetch(`${ORIGIN}/news/index.json`, { next: { revalidate: 60 } });
  const j = await r.json();
  const items: Article[] = Array.isArray(j) ? j : (j.items || []);
  return { props: { items }, revalidate: 60 };
};
export default function News({ items }:{items:Article[]}) { /* render cards */ return <ul>{items.map(a=> <li key={a.id}>{a.title}</li>)}</ul>; }
