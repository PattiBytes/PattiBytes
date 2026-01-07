// app-next/pages/videos/[id].tsx
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import {
  doc,
  getDoc,
  Timestamp,
} from 'firebase/firestore';

import { getFirebaseClient } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';

import VideoReel from '@/components/VideoReel';
import SafeImage from '@/components/SafeImage';
import LikeButton from '@/components/LikeButton';
import ShareButton from '@/components/ShareButton';
import PostComments from '@/components/PostComments';

import { incrementViewOnce } from '@/lib/analytics';

import {
  FaComment,
  FaInfoCircle,
  FaTimes,
} from 'react-icons/fa';
import styles from '@/styles/Dashboard.module.css';

type PostType = 'news' | 'place' | 'writing' | 'video';

interface FirestorePostDoc {
  title?: string;
  content?: string;
  preview?: string;
  type?: PostType;
  mediaType?: 'image' | 'video';
  authorId?: string;
  authorName?: string;
  authorUsername?: string;
  authorPhoto?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  location?: string | null;
  createdAt?: Timestamp;
  likesCount?: number;
  commentsCount?: number;
  sharesCount?: number;
  viewsCount?: number;
  isOfficial?: boolean;
}

interface ReelPost {
  id: string;
  title: string;
  content: string;
  preview?: string;
  type: 'video';
  mediaType: 'video';
  source: 'user';
  authorId?: string;
  authorName: string;
  authorUsername?: string;
  authorPhoto?: string;
  imageUrl?: string;
  videoUrl: string;
  location?: string;
  createdAt: Date;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  isOfficial?: boolean;
}

export default function VideoWatchPage() {
  const router = useRouter();
  const { id } = router.query as { id?: string };

  useAuth();
  const { db } = getFirebaseClient();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [post, setPost] = useState<ReelPost | null>(null);

  const [showDescModal, setShowDescModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);

  useEffect(() => {
    if (!db || !id) return;

    const load = async () => {
      setLoading(true);
      try {
        const ref = doc(db, 'posts', id);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setNotFound(true);
          setPost(null);
          return;
        }

        const data = snap.data() as FirestorePostDoc;
        const isVideo =
          data.mediaType === 'video' ||
          !!data.videoUrl ||
          data.type === 'video';

        if (!isVideo || !data.videoUrl) {
          setNotFound(true);
          setPost(null);
          return;
        }

        const createdAt =
          data.createdAt instanceof Timestamp
            ? data.createdAt.toDate()
            : new Date();

        const mapped: ReelPost = {
          id,
          title: data.title || '',
          content: data.content || '',
          preview: data.preview,
          type: 'video',
          mediaType: 'video',
          source: 'user',
          authorId: data.authorId,
          authorName: data.authorName || 'Anonymous',
          authorUsername: data.authorUsername,
          authorPhoto: data.authorPhoto || '/images/default-avatar.png',
          imageUrl: data.imageUrl || undefined,
          videoUrl: data.videoUrl,
          location: data.location || undefined,
          createdAt,
          likesCount: data.likesCount || 0,
          commentsCount: data.commentsCount || 0,
          sharesCount: data.sharesCount || 0,
          viewsCount: data.viewsCount || 0,
          isOfficial: data.isOfficial || false,
        };

        setPost(mapped);
        void incrementViewOnce(id);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [db, id]);

  const shareUrl = useMemo(() => {
    if (!post) return '';
    if (typeof window === 'undefined') return `/videos/${post.id}`;
    return `${window.location.origin}/videos/${post.id}`;
  }, [post]);

  if (!id) return null;

  if (loading) {
    return (
      <AuthGuard>
        <Layout title="Loading video... - PattiBytes">
          <div className={styles.dashboard}>
            <div className={styles.loading}>
              <div className={styles.spinner} />
              <p>Loading video...</p>
            </div>
          </div>
        </Layout>
      </AuthGuard>
    );
  }

  if (notFound || !post) {
    return (
      <AuthGuard>
        <Layout title="Video not found - PattiBytes">
          <div className={styles.dashboard}>
            <div className={styles.empty}>
              <p>Video not found or has been removed.</p>
            </div>
          </div>
        </Layout>
      </AuthGuard>
    );
  }

  const short =
    (post.preview || post.content || '').slice(0, 100) || '';
  const isTruncated =
    short.length < (post.preview || post.content || '').length;

  return (
    <AuthGuard>
      <Layout title={`${post.title || 'Video'} - PattiBytes`}>
        <div className={styles.dashboard}>
          <div
            style={{
              minHeight: 'calc(100vh - 120px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px 8px 32px',
            }}
          >
            <article
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {/* Author row */}
              <div
                style={{
                  width: '100%',
                  maxWidth: 420,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                  padding: '0 4px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <SafeImage
                    src={post.authorPhoto || '/images/default-avatar.png'}
                    alt={post.authorName}
                    width={36}
                    height={36}
                    style={{ borderRadius: '999px' }}
                  />
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      {post.authorName}
                    </span>
                    {post.authorUsername && (
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--text-secondary)',
                        }}
                      >
                        @{post.authorUsername}
                      </span>
                    )}
                  </div>
                </div>

                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--text-secondary)',
                  }}
                >
                  {post.createdAt.toLocaleString()}
                </span>
              </div>

              {/* Centered video reel */}
              <VideoReel
                src={post.videoUrl}
                poster={post.imageUrl}
                autoPlay
                muted
                loop
              />

              {/* Title + snippet + actions */}
              <div
                style={{
                  width: '100%',
                  maxWidth: 420,
                  marginTop: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  padding: '0 4px',
                }}
              >
                <h1
                  style={{
                    fontSize: 18,
                    margin: 0,
                    wordBreak: 'break-word',
                  }}
                >
                  {post.title || 'Untitled video'}
                </h1>

                {short && (
                  <p
                    style={{
                      fontSize: 13,
                      margin: 0,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {short}
                    {isTruncated && '...'}
                  </p>
                )}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 4,
                    flexWrap: 'wrap',
                  }}
                >
                  <LikeButton
                    postId={post.id}
                    className={styles.actionButton}
                    showCount
                  />

                  <button
                    type="button"
                    onClick={() => setShowCommentsModal(true)}
                    className={styles.actionButton}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <FaComment />
                    <span>{post.commentsCount}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDescModal(true)}
                    className={styles.actionButton}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <FaInfoCircle />
                    Details
                  </button>

                  <ShareButton
                    postId={post.id}
                    url={shareUrl}
                    className={styles.actionButton}
                  />
                </div>
              </div>
            </article>
          </div>
        </div>

        {/* Description modal */}
{showDescModal && post && (
  <div
    className={styles.modalBackdrop}
    onClick={() => setShowDescModal(false)}
  >
    <div
      className={styles.modalPanel}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={styles.modalHeader}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <SafeImage
            src={post.authorPhoto || '/images/default-avatar.png'}
            alt={post.authorName}
            width={32}
            height={32}
            style={{ borderRadius: '999px' }}
          />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <h3 className={styles.modalTitle}>
              {post.title || 'Video details'}
            </h3>
            <span
              style={{
                fontSize: 11,
                color: 'var(--text-secondary)',
              }}
            >
              {post.authorName}
              {post.authorUsername ? ` · @${post.authorUsername}` : ''}
            </span>
          </div>
        </div>

        <button
          type="button"
          className={styles.modalClose}
          onClick={() => setShowDescModal(false)}
        >
          <FaTimes />
        </button>
      </div>

      <div
        style={{
          fontSize: 12,
          color: 'var(--text-secondary)',
          marginBottom: 6,
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 6,
        }}
      >
        <span>{post.createdAt.toLocaleString()}</span>
        {post.location && <span>{post.location}</span>}
      </div>

      <div className={styles.modalBody}>
        {post.content || 'No description.'}
      </div>
    </div>
  </div>
)}

{/* Comments modal */}
{showCommentsModal && post && (
  <div
    className={styles.modalBackdrop}
    onClick={() => setShowCommentsModal(false)}
  >
    <div
      className={`${styles.modalPanel} ${styles.modalPanelWide}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={styles.modalHeader}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <SafeImage
            src={post.authorPhoto || '/images/default-avatar.png'}
            alt={post.authorName}
            width={32}
            height={32}
            style={{ borderRadius: '999px' }}
          />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <h3 className={styles.modalTitle}>
              Comments · {post.title || 'Video'}
            </h3>
            <span
              style={{
                fontSize: 11,
                color: 'var(--text-secondary)',
              }}
            >
              {post.authorName}
              {post.authorUsername ? ` · @${post.authorUsername}` : ''}
            </span>
          </div>
        </div>

        <button
          type="button"
          className={styles.modalClose}
          onClick={() => setShowCommentsModal(false)}
        >
          <FaTimes />
        </button>
      </div>

      <div
        className={`${styles.modalBody} ${styles.modalBodyComments}`}
      >
        <div className={styles.modalCommentsInner}>
          <PostComments postId={post.id} />
        </div>
      </div>
    </div>
  </div>
)}

      </Layout>
    </AuthGuard>
  );
}
