/* eslint-disable @typescript-eslint/ban-ts-comment */
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
import toast from 'react-hot-toast';

import { useLongPress } from '@/hooks/useLongPress';
import ActionSheet, { SheetAction } from '@/components/ActionSheet';

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
    return typeof f === 'string' && f.trim() ? f : '/search';
  }, [router.query.from]);

  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentsCount, setCommentsCount] = useState<number | null>(null);

  const postId = useMemo(() => (slug ? `cms-news-${slug}` : ''), [slug]);

  const shareUrl = useMemo(() => {
    const origin = getSiteOrigin();
    if (!origin) return '';
    const cleanPath = (router.asPath || '').split('#')[0];
    return `${origin}${cleanPath}`;
  }, [router.asPath]);

  // Long-press sheet (hero/title)
  const [sheetOpen, setSheetOpen] = useState(false);
  const { pressed, handlers } = useLongPress(
    () => {
      if (navigator.vibrate) navigator.vibrate(10);
      setSheetOpen(true);
    },
    { ms: 420 }
  );

  const sheetActions: SheetAction[] = useMemo(
    () => [
      {
        label: 'Copy link',
        onPress: async () => {
          if (!shareUrl) return;
          await navigator.clipboard.writeText(shareUrl);
          toast.success('Link copied');
        },
      },
      {
        label: 'Share',
        onPress: async () => {
          if (!shareUrl) return;
          // @ts-ignore
          if (navigator.share) await navigator.share({ title: item?.title || 'News', url: shareUrl });
          else {
            await navigator.clipboard.writeText(shareUrl);
            toast.success('Link copied');
          }
        },
      },
    ],
    [shareUrl, item?.title]
  );

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
            <div className={styles.hero} {...handlers} data-pressed={pressed ? 'true' : 'false'}>
              <SafeImage src={heroSrc} alt={item.title} width={1200} height={700} />
            </div>
          )}

          <header className={styles.header}>
            <h1 {...handlers} data-pressed={pressed ? 'true' : 'false'}>
              {item.title}
            </h1>

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

          <ActionSheet
            open={sheetOpen}
            title={item.title}
            actions={sheetActions}
            onClose={() => setSheetOpen(false)}
          />
        </article>
      </Layout>
    </AuthGuard>
  );
}
