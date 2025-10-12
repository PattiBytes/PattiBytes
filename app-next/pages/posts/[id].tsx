// pages/posts/[id].tsx
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot, type Timestamp } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import SafeImage from '@/components/SafeImage';
import PostComments from '@/components/PostComments';
import VideoReel from '@/components/VideoReel';
import LikeButton from '@/components/LikeButton';
import ShareButton from '@/components/ShareButton';
import Link from 'next/link';
import { FaArrowLeft, FaMapMarkerAlt } from 'react-icons/fa';
import { incrementViewOnce } from '@/lib/analytics';
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
  const [error, setError] = useState<string | null>(null);

  const { db } = getFirebaseClient();
  const ref = useMemo(
    () => (db && typeof id === 'string' ? doc(db, 'posts', id) : null),
    [db, id]
  );

  // Subscribe to Firestore post
  useEffect(() => {
    if (!ref) return;
    setError(null);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setPost(null);
          setLoading(false);
          return;
        }
        setPost({ id: snap.id, ...(snap.data() as PostDoc) });
        setLoading(false);
      },
      () => {
        setError('Missing or insufficient permissions.');
        setLoading(false);
      }
    );
    return () => unsub();
  }, [ref]);

  // Views analytics (session throttled)
  useEffect(() => {
    if (typeof id === 'string' && id) incrementViewOnce(id);
  }, [id]);

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

  const likes = post.likesCount ?? undefined;
  const comments = commentCount ?? post.commentsCount ?? undefined;
  const shares = post.sharesCount ?? undefined;
  const views = post.viewsCount ?? undefined;

  return (
    <AuthGuard>
      <Layout title={`${post.title || 'Post'} - PattiBytes`}>
        <article className={styles.post}>
          <Link href="/dashboard" className={styles.backBtn}>
            <FaArrowLeft /> Back
          </Link>

          {error ? (
            <div className={styles.notFound} style={{ marginBottom: 16 }}>
              <p>{error}</p>
            </div>
          ) : null}

          {post.mediaType === 'video' && post.videoUrl ? (
            <VideoReel src={post.videoUrl} poster={post.imageUrl || undefined} />
          ) : post.imageUrl ? (
            <div className={styles.hero}>
              <SafeImage src={post.imageUrl} alt={post.title || 'Post'} width={1200} height={700} />
            </div>
          ) : null}

          <header className={styles.header}>
            <h1>{post.title}</h1>
            <div className={styles.actionsRow}>
              <LikeButton postId={id} className={styles.actionBtn} />
              <ShareButton postId={id} url={shareUrl} className={styles.actionBtn} />
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
          <PostComments postId={id} onCountChange={setCommentCount} />
        </article>
      </Layout>
    </AuthGuard>
  );
}
