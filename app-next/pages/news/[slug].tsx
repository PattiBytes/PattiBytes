// app-next/pages/news/[slug].tsx
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import SafeImage from '@/components/SafeImage';
import LikeButton from '@/components/LikeButton';
import ShareButton from '@/components/ShareButton';
import PostComments from '@/components/PostComments';
import CMSContent from '@/components/CMSContent';
import { FaComment } from 'react-icons/fa';
import styles from '@/styles/PostDetail.module.css';

type Item = {
  id?: string;
  slug?: string;
  title: string;
  preview?: string;
  date: string;
  author?: string;
  image?: string;
  body?: string;
};

function getCMSOrigin(): string {
  if (typeof window !== 'undefined') return window.location.origin;
  return (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '');
}

function resolveCMSImage(path?: string): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('assets/uploads') || path.startsWith('/assets/uploads')) {
    const clean = path.startsWith('/') ? path : `/${path}`;
    return `${getCMSOrigin()}${clean}`;
  }
  return path;
}

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
  const { query, asPath } = useRouter();
  const slug = typeof query.slug === 'string' ? query.slug : '';
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentsCount, setCommentsCount] = useState<number | null>(null);

  const postId = useMemo(
    () => (slug ? `cms-news-${slug}` : ''),
    [slug],
  );
  const shareUrl =
    typeof window !== 'undefined' ? window.location.href : '';

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const it = await loadItem(slug);
      setItem(it);
      setLoading(false);
    })();
  }, [slug]);

  useEffect(() => {
    if (asPath.includes('#comments')) {
      setTimeout(
        () =>
          document
            .getElementById('comments')
            ?.scrollIntoView({ behavior: 'smooth' }),
        300,
      );
    }
  }, [asPath]);

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

  const heroSrc = resolveCMSImage(item.image) || item.image;

  return (
    <AuthGuard>
      <Layout title={`${item.title} - PattiBytes`}>
        <article className={styles.post}>
          {heroSrc && (
            <div className={styles.hero}>
              <SafeImage
                src={heroSrc}
                alt={item.title}
                width={1200}
                height={700}
              />
            </div>
          )}
          <header className={styles.header}>
            <h1>{item.title}</h1>
            <div className={styles.actionsRow}>
              <LikeButton
                postId={postId}
                className={styles.actionBtn}
                showCount
              />
              <ShareButton
                postId={postId}
                url={shareUrl}
                className={styles.actionBtn}
                ariaLabel="Share"
              />
              <button
                className={styles.actionBtn}
                onClick={() =>
                  document
                    .getElementById('comments')
                    ?.scrollIntoView({ behavior: 'smooth' })
                }
                aria-label="Comments"
              >
                <FaComment /> {commentsCount ?? 0}
              </button>
            </div>
          </header>

          <div className={styles.content}>
            <CMSContent body={item.body || item.preview || ''} />
          </div>

          <div id="comments" />
          <PostComments
            postId={postId}
            postTitle={item.title}
            onCountChange={setCommentsCount}
          />
        </article>
      </Layout>
    </AuthGuard>
  );
}
