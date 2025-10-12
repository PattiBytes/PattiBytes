// pages/news/[slug].tsx
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import SafeImage from '@/components/SafeImage';
import LikeButton from '@/components/LikeButton';
import ShareButton from '@/components/ShareButton';
import PostComments from '@/components/PostComments';
import CMSContent from '@/components/CMSContent';
import styles from '@/styles/PostDetail.module.css';

type Item = { id?: string; slug?: string; title: string; preview?: string; date: string; author?: string; image?: string; body?: string };

async function loadItem(slug: string): Promise<Item | null> {
  try {
    const res = await fetch('/api/cms/news', { cache: 'no-store' });
    if (!res.ok) return null;
    const items = (await res.json()) as Item[];
    return items.find((i) => i.slug === slug || i.id === slug) || null;
  } catch {
    return null;
  }
}

export default function NewsDetail() {
  const { query } = useRouter();
  const slug = typeof query.slug === 'string' ? query.slug : '';
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentsCount, setCommentsCount] = useState<number | null>(null);

  const postId = useMemo(() => (slug ? `cms-news-${slug}` : ''), [slug]);
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const it = await loadItem(slug);
      setItem(it);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return (
      <AuthGuard>
        <Layout title="Loading - PattiBytes">
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <p>Loading article...</p>
          </div>
        </Layout>
      </AuthGuard>
    );
  }

  if (!item) {
    return (
      <AuthGuard>
        <Layout title="Not Found - PattiBytes">
          <div className={styles.notFound}>
            <h2>Content not found</h2>
          </div>
        </Layout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Layout title={`${item.title} - PattiBytes`}>
        <article className={styles.post}>
          {item.image && (
            <div className={styles.hero}>
              <SafeImage src={item.image} alt={item.title} width={1200} height={700} />
            </div>
          )}
          <header className={styles.header}>
            <h1>{item.title}</h1>
            <div className={styles.actionsRow}>
              <LikeButton postId={postId} className={styles.actionBtn} />
              <ShareButton postId={postId} url={shareUrl} className={styles.actionBtn} />
              {commentsCount != null && <span className={styles.countPill}>{commentsCount} comments</span>}
            </div>
          </header>

          <div className={styles.content}>
            <CMSContent body={item.body || item.preview || ''} />
          </div>

          <div id="comments" />
          <PostComments postId={postId} onCountChange={setCommentsCount} />
        </article>
      </Layout>
    </AuthGuard>
  );
}
