// pages/posts/[id].tsx
// (exactly as in the query body—no className renames—compatible with PostDetail.module.css)
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot, type Timestamp, updateDoc, increment } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import SafeImage from '@/components/SafeImage';
import Comments from '@/components/Comments';
import VideoReel from '@/components/VideoReel';
import LikeButton from '@/components/LikeButton';
import ShareButton from '@/components/ShareButton';
import Link from 'next/link';
import { FaArrowLeft, FaMapMarkerAlt } from 'react-icons/fa';
import styles from '@/styles/PostDetail.module.css';

type PostDoc = {
  authorId: string;
  authorName?: string;
  authorUsername?: string;
  authorPhoto?: string | null;
  title?: string;
  content?: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  mediaType?: 'image' | 'video' | 'text';
  location?: string;
  createdAt?: Timestamp | Date;
  counters?: { likes?: number; comments?: number; shares?: number; views?: number };
  likesCount?: number;
  commentsCount?: number;
  sharesCount?: number;
  viewsCount?: number;
  preview?: string;
};

export default function PostDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [post, setPost] = useState<(PostDoc & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentCount, setCommentCount] = useState<number | null>(null);

  const { db } = getFirebaseClient();
  const ref = useMemo(
    () => (db && typeof id === 'string' ? doc(db, 'posts', id) : null),
    [db, id]
  );

  useEffect(() => {
    if (!ref) return;
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        setPost(null);
        setLoading(false);
        return;
      }
      setPost({ id: snap.id, ...(snap.data() as PostDoc) });
      setLoading(false);
    });
    return () => unsub();
  }, [ref]);

  useEffect(() => {
    const bump = async () => {
      if (!ref || typeof id !== 'string') return;
      try {
        const key = `pv:${id}`;
        const last = Number(localStorage.getItem(key) || '0');
        const now = Date.now();
        if (now - last > 30 * 60 * 1000) {
          await updateDoc(ref, { viewsCount: increment(1) });
          localStorage.setItem(key, String(now));
        }
      } catch {
        // ignore
      }
    };
    bump();
  }, [ref, id]);

  if (loading) {
    return (
      <AuthGuard>
        <Layout title="Loading - PattiBytes">
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <p>Loading post...</p>
          </div>
        </Layout>
      </AuthGuard>
    );
  }

  if (!post || typeof id !== 'string') {
    return (
      <AuthGuard>
        <Layout title="Post Not Found - PattiBytes">
          <div className={styles.notFound}>
            <h2>Post not found</h2>
            <Link href="/dashboard">Go to Dashboard</Link>
          </div>
        </Layout>
      </AuthGuard>
    );
  }

  const created =
    post.createdAt instanceof Date
      ? post.createdAt
      : (post.createdAt as Timestamp | undefined)?.toDate?.() || new Date();

  const shareUrl =
    typeof window !== 'undefined'
      ? window.location.href
      : `${process.env.NEXT_PUBLIC_SITE_URL || ''}/posts/${id}`;

  const likes = post.counters?.likes ?? post.likesCount ?? undefined;
  const comments = commentCount ?? post.counters?.comments ?? post.commentsCount ?? undefined;
  const shares = post.counters?.shares ?? post.sharesCount ?? undefined;
  const views = post.counters?.views ?? post.viewsCount ?? undefined;

  return (
    <AuthGuard>
      <Layout title={`${post.title || 'Post'} - PattiBytes`}>
        <article className={styles.post}>
          <Link href="/dashboard" className={styles.backBtn}>
            <FaArrowLeft /> Back
          </Link>

          {post.mediaType === 'video' && post.videoUrl ? (
            <VideoReel src={post.videoUrl} poster={post.imageUrl || undefined} onShare={() => {}} />
          ) : post.imageUrl ? (
            <div className={styles.hero}>
              <SafeImage src={post.imageUrl} alt={post.title || 'Post'} width={1200} height={700} />
            </div>
          ) : null}

          <header className={styles.header}>
            <h1>{post.title}</h1>
            <div className={styles.actionsRow}>
              <LikeButton postId={id} className={styles.actionBtn} />
              <ShareButton
                url={shareUrl}
                title={post.title}
                className={styles.actionBtn}
                onShared={async () => {
                  try {
                    if (ref) await updateDoc(ref, { sharesCount: increment(1) });
                  } catch {
                    // ignore
                  }
                }}
              />
              {likes !== undefined && <span className={styles.countPill}>{likes} likes</span>}
              {comments !== undefined && <span className={styles.countPill}>{comments} comments</span>}
              {shares !== undefined && <span className={styles.countPill}>{shares} shares</span>}
              {views !== undefined && <span className={styles.countPill}>{views} views</span>}
            </div>
            {post.location && (
              <p className={styles.location}>
                <FaMapMarkerAlt /> {post.location}
              </p>
            )}
          </header>

          <div className={styles.meta}>
            <Link
              href={
                post.authorUsername
                  ? `/user/${post.authorUsername}`
                  : `/search?u=${encodeURIComponent(post.authorName || '')}`
              }
              className={styles.author}
            >
              <SafeImage
                src={post.authorPhoto || '/images/default-avatar.png'}
                alt={post.authorName || 'User'}
                width={40}
                height={40}
                className={styles.authorAvatar}
              />
              <div>
                <h4>{post.authorName || 'User'}</h4>
                {post.authorUsername ? <p>@{post.authorUsername}</p> : null}
              </div>
            </Link>
            <span className={styles.date}>{created.toLocaleString()}</span>
          </div>

          {post.content && <div className={styles.content}>{post.content}</div>}

          <div id="comments" />
          <Comments postId={id} onCountChange={setCommentCount} />
        </article>
      </Layout>
    </AuthGuard>
  );
}
