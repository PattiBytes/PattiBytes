// pages/news/[slug].tsx
import { useRouter } from 'next/router';
import Link from 'next/link';
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

function getSiteOrigin(): string {
  // Works both server + client (server uses env, client uses window)
  if (typeof window !== 'undefined') return window.location.origin;
  return (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '');
}

function resolveCMSImage(path?: string): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  // Netlify CMS uploads path
  if (path.startsWith('assets/uploads') || path.startsWith('/assets/uploads')) {
    const clean = path.startsWith('/') ? path : `/${path}`;
    const origin = getSiteOrigin();
    return origin ? `${origin}${clean}` : clean;
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
  const router = useRouter();

  const slug = useMemo(() => {
    const s = router.query.slug;
    return typeof s === 'string' ? s : '';
  }, [router.query.slug]);

  const from = useMemo(() => {
    const f = router.query.from;
    // Default to search page so slug pages always have a stable “Back”
    return typeof f === 'string' && f.trim() ? f : '/search';
  }, [router.query.from]);

  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentsCount, setCommentsCount] = useState<number | null>(null);

  // Keep consistent with your CMS id scheme used by LikeButton/PostComments
  const postId = useMemo(() => (slug ? `cms-news-${slug}` : ''), [slug]);

  const shareUrl = useMemo(() => {
    // Avoid touching window directly; build from origin + asPath (works SSR too)
    const origin = getSiteOrigin();
    if (!origin) return '';
    const cleanPath = (router.asPath || '').split('#')[0];
    return `${origin}${cleanPath}`;
  }, [router.asPath]);

  useEffect(() => {
    if (!router.isReady) return;
    if (!slug) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      const it = await loadItem(slug);

      if (!cancelled) {
        setItem(it);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router.isReady, slug]);

  useEffect(() => {
    if (!router.isReady) return;
    if (!router.asPath.includes('#comments')) return;

    const t = window.setTimeout(() => {
      document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth' });
    }, 250);

    return () => window.clearTimeout(t);
  }, [router.isReady, router.asPath]);

  const Back = (
    <div className={styles.backRow}>
      <Link href={from} className={styles.backBtn}>
        ← Back
      </Link>
    </div>
  );

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
            {Back}
          </div>
        </Layout>
      </AuthGuard>
    );
  }

  const heroSrc = resolveCMSImage(item.image);

  return (
    <AuthGuard>
      <Layout title={`${item.title} - PattiBytes`}>
        <article className={styles.post}>
          {Back}

          {heroSrc && (
            <div className={styles.hero}>
              <SafeImage src={heroSrc} alt={item.title} width={1200} height={700} />
            </div>
          )}

          <header className={styles.header}>
            <h1>{item.title}</h1>

            <div className={styles.actionsRow}>
              <LikeButton postId={postId} className={styles.actionBtn} showCount />

              <ShareButton
                postId={postId}
                url={shareUrl}
                className={styles.actionBtn}
                ariaLabel="Share"
              />

              <button
                className={styles.actionBtn}
                onClick={() => document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth' })}
                aria-label="Comments"
                type="button"
              >
                <FaComment /> {commentsCount ?? 0}
              </button>
            </div>

            <p className={styles.metaLine}>
              {item.author ? `by ${item.author} • ` : ''}
              {item.date}
            </p>
          </header>

          <div className={styles.content}>
            <CMSContent body={item.body || item.preview || ''} />
          </div>

          <div id="comments" />
          <PostComments postId={postId} postTitle={item.title} onCountChange={setCommentsCount} />
        </article>
      </Layout>
    </AuthGuard>
  );
}
