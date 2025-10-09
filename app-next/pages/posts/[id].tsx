import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import Layout from '@/components/Layout';
import AuthGuard from '@/components/AuthGuard';
import SafeImage from '@/components/SafeImage';
import VideoReel from '@/components/VideoReel';
import Comments from '@/components/Comments';
import { FaArrowLeft, FaMapMarkerAlt, FaShare } from 'react-icons/fa';
import Link from 'next/link';
import styles from '@/styles/PostDetail.module.css';

interface PostDoc {
  title?: string;
  content?: string;
  preview?: string;
  authorId?: string;
  authorName?: string;
  authorUsername?: string;
  authorPhoto?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  mediaType?: 'image' | 'video';
  location?: string | null;
  createdAt?: { toDate?: () => Date };
}

export default function PostDetail() {
  const router = useRouter();
  const { id } = router.query as { id?: string };
  const [post, setPost] = useState<(PostDoc & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { db } = getFirebaseClient();
    if (!db || !id) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'posts', id));
        if (snap.exists()) {
          const data = snap.data() as PostDoc;
          setPost({ id: snap.id, ...data });
          await updateDoc(doc(db, 'posts', id), { viewsCount: increment(1) });
        } else {
          setPost(null);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const share = async () => {
    if (!id) return;
    const url = `${window.location.origin}/posts/${id}`;
    const nav =
      typeof window !== 'undefined'
        ? (window.navigator as Navigator & {
            share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
            clipboard?: Clipboard;
          })
        : undefined;

    try {
      if (nav?.share) {
        await nav.share({ title: post?.title || 'PattiBytes', text: post?.preview || '', url });
      } else if (nav?.clipboard?.writeText) {
        await nav.clipboard.writeText(url);
        alert('Link copied!');
      }
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <Layout title="Loading...">
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <p>Loading post...</p>
          </div>
        </Layout>
      </AuthGuard>
    );
  }

  if (!post || !id) {
    return (
      <AuthGuard>
        <Layout title="Post Not Found">
          <div className={styles.notFound}>
            <h2>Post not found</h2>
            <Link href="/dashboard">Go to Dashboard</Link>
          </div>
        </Layout>
      </AuthGuard>
    );
  }

  const created = post.createdAt?.toDate?.() || new Date();

  return (
    <AuthGuard>
      <Layout title={`${post.title || 'Post'} - PattiBytes`}>
        <article className={styles.post}>
          <Link href="/dashboard" className={styles.backBtn}>
            <FaArrowLeft /> Back
          </Link>

          {post.mediaType === 'video' && post.videoUrl ? (
            <VideoReel src={post.videoUrl} poster={post.imageUrl || undefined} onShare={share} />
          ) : post.imageUrl ? (
            <div className={styles.hero}>
              <SafeImage src={post.imageUrl} alt={post.title || 'Post'} width={1200} height={700} />
            </div>
          ) : null}

          <header className={styles.header}>
            <h1>{post.title}</h1>
            {post.location && (
              <p className={styles.location}>
                <FaMapMarkerAlt /> {post.location}
              </p>
            )}
            <button className={styles.shareBtn} onClick={share}>
              <FaShare /> Share
            </button>
          </header>

          <div className={styles.meta}>
            <div className={styles.author}>
              <SafeImage
                src={post.authorPhoto || '/images/default-avatar.png'}
                alt={post.authorName || 'User'}
                width={40}
                height={40}
              />
              <div>
                <h4>{post.authorName || 'User'}</h4>
                {post.authorUsername ? <p>@{post.authorUsername}</p> : null}
              </div>
            </div>
            <span className={styles.date}>{created.toLocaleString()}</span>
          </div>

          <div className={styles.content}>{post.content}</div>

          <Comments postId={id} />
        </article>
      </Layout>
    </AuthGuard>
  );
}
