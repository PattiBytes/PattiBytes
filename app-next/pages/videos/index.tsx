// app-next/pages/videos/index.tsx
import { useEffect, useState, useCallback } from 'react';
import {
  collection,
  query as fsQuery,
  where,
  orderBy,
  limit,
  getDocs,
  startAfter,
  Timestamp,
  doc,
  getDoc,
  deleteDoc,
  type QueryDocumentSnapshot,
  type DocumentData,
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
import ConfirmModal from '@/components/ConfirmModal';

import {
  FaVideo,
  FaComment,
  FaInfoCircle,
  FaTimes,
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
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
  isDraft?: boolean;
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

export default function VideosPage() {
  const { user } = useAuth();
  const { db } = getFirebaseClient();

  const [posts, setPosts] = useState<ReelPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    postId: string;
    title: string;
  } | null>(null);

  const [lastVideoDoc, setLastVideoDoc] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  const [descModalPost, setDescModalPost] = useState<ReelPost | null>(null);
  const [commentsModalPost, setCommentsModalPost] =
    useState<ReelPost | null>(null);

  // Admin check (same as dashboard)
  useEffect(() => {
    const run = async () => {
      if (!db || !user) return;
      try {
        const snap = await getDoc(doc(db, 'admins', user.uid));
        setIsAdmin(snap.exists());
      } catch {
        setIsAdmin(false);
      }
    };
    void run();
  }, [db, user]);

  const mapDocToPost = (
    d: QueryDocumentSnapshot<DocumentData>,
  ): ReelPost | null => {
    const data = d.data() as FirestorePostDoc;
    if (data.isDraft) return null;

    const isVideo =
      data.mediaType === 'video' ||
      !!data.videoUrl ||
      data.type === 'video';

    if (!isVideo || !data.videoUrl) return null;

    const createdAt =
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate()
        : new Date();

    return {
      id: d.id,
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
  };

  const loadInitial = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      const q = fsQuery(
        collection(db, 'posts'),
        where('mediaType', '==', 'video'),
        orderBy('createdAt', 'desc'),
        limit(15),
      );

      const snap = await getDocs(q);
      if (snap.empty) {
        setPosts([]);
        setHasMore(false);
        return;
      }

      const list: ReelPost[] = [];
      snap.docs.forEach((d) => {
        const mapped = mapDocToPost(
          d as QueryDocumentSnapshot<DocumentData>,
        );
        if (mapped) list.push(mapped);
      });

      setLastVideoDoc(
        snap.docs[snap.docs.length - 1] as QueryDocumentSnapshot<DocumentData>,
      );
      setPosts(list);
      setHasMore(snap.docs.length === 15);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load videos');
    } finally {
      setLoading(false);
    }
  }, [db]);

  const loadMore = useCallback(async () => {
    if (!db || !lastVideoDoc || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const q = fsQuery(
        collection(db, 'posts'),
        where('mediaType', '==', 'video'),
        orderBy('createdAt', 'desc'),
        startAfter(lastVideoDoc),
        limit(15),
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        setHasMore(false);
        return;
      }

      const more: ReelPost[] = [];
      snap.docs.forEach((d) => {
        const mapped = mapDocToPost(
          d as QueryDocumentSnapshot<DocumentData>,
        );
        if (mapped) more.push(mapped);
      });

      setLastVideoDoc(
        snap.docs[snap.docs.length - 1] as QueryDocumentSnapshot<DocumentData>,
      );
      setPosts((prev) => [...prev, ...more]);
      setHasMore(snap.docs.length === 15);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load more videos');
    } finally {
      setLoadingMore(false);
    }
  }, [db, lastVideoDoc, loadingMore, hasMore]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const confirmDelete = (postId: string, title: string) =>
    setDeleteModal({ open: true, postId, title });

  const performDelete = async () => {
    if (!deleteModal || !db) return;
    try {
      await deleteDoc(doc(db, 'posts', deleteModal.postId));
      toast.success('Post deleted successfully');
      setPosts((prev) => prev.filter((p) => p.id !== deleteModal.postId));
      setDeleteModal(null);
    } catch {
      toast.error('Failed to delete post');
    }
  };

  const feedEmpty = !loading && posts.length === 0;

  const openDescription = (p: ReelPost) => setDescModalPost(p);
  const openComments = (p: ReelPost) => setCommentsModalPost(p);
  const closeDescription = () => setDescModalPost(null);
  const closeComments = () => setCommentsModalPost(null);

  return (
    <AuthGuard>
      <Layout title="Videos - PattiBytes">
        <div className={styles.dashboard}>
          

          {/* Vertical list of reels, one per viewport-ish */}
          <div
            style={{
              position: 'relative',
              minHeight: 'calc(100vh - 140px)',
              paddingBottom: 32,
            }}
          >
            {loading ? (
              <div className={styles.loading}>
                <div className={styles.spinner} />
                <p>Loading videos...</p>
              </div>
            ) : feedEmpty ? (
              <div className={styles.empty}>
                <FaVideo className={styles.emptyIcon} />
                <p>No video posts yet</p>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 24,
                }}
              >
                {posts.map((post) => {
                  const short =
                    (post.preview || post.content || '').slice(0, 80) || '';
                  const isTruncated =
                    short.length <
                    (post.preview || post.content || '').length;

                  const shareUrl =
                    typeof window === 'undefined'
                      ? `/videos/${post.id}`
                      : `${window.location.origin}/videos/${post.id}`;

                  return (
                    <article
                      key={post.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '8px 0',
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
                            src={
                              post.authorPhoto || '/images/default-avatar.png'
                            }
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
                            <span
                              style={{
                                fontSize: 13,
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
                          {post.createdAt.toLocaleDateString()}
                        </span>
                      </div>

                      {/* Video reel */}
                      <VideoReel
                        src={post.videoUrl}
                        poster={post.imageUrl}
                        autoPlay
                        muted
                        loop
                      />

                      {/* Under-video actions & snippet */}
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
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <h3
                            style={{
                              fontSize: 15,
                              margin: 0,
                              flex: 1,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {post.title || 'Untitled video'}
                          </h3>
                        </div>

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
                            onClick={() => openComments(post)}
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
                            onClick={() => openDescription(post)}
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

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() =>
                                confirmDelete(post.id, post.title)
                              }
                              className={styles.actionButton}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}

                {hasMore && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      marginTop: 8,
                    }}
                  >
                    <button
                      type="button"
                      onClick={loadMore}
                      disabled={loadingMore}
                      className={styles.emptyBtn}
                    >
                      {loadingMore ? 'Loading…' : 'Load more'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {deleteModal && (
          <ConfirmModal
            open={deleteModal.open}
            title="Delete this post permanently?"
            message={`This action cannot be undone. The post "${deleteModal.title}" will be permanently removed.`}
            confirmText="Delete Post"
            cancelText="Cancel"
            variant="danger"
            onConfirm={performDelete}
            onCancel={() => setDeleteModal(null)}
          />
        )}

       {/* Description modal */}
{descModalPost && (
  <div
    className={styles.modalBackdrop}
    onClick={closeDescription}
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
            src={
              descModalPost.authorPhoto || '/images/default-avatar.png'
            }
            alt={descModalPost.authorName}
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
              {descModalPost.title || 'Video details'}
            </h3>
            <span
              style={{
                fontSize: 11,
                color: 'var(--text-secondary)',
              }}
            >
              {descModalPost.authorName}
              {descModalPost.authorUsername
                ? ` · @${descModalPost.authorUsername}`
                : ''}
            </span>
          </div>
        </div>

        <button
          type="button"
          className={styles.modalClose}
          onClick={closeDescription}
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
        <span>
          {descModalPost.createdAt.toLocaleString()}
        </span>
        {descModalPost.location && (
          <span>{descModalPost.location}</span>
        )}
      </div>

      <div className={styles.modalBody}>
        {descModalPost.content || 'No description.'}
      </div>
    </div>
  </div>
)}

{/* Comments modal */}
{commentsModalPost && (
  <div
    className={styles.modalBackdrop}
    onClick={closeComments}
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
            src={
              commentsModalPost.authorPhoto ||
              '/images/default-avatar.png'
            }
            alt={commentsModalPost.authorName}
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
              Comments · {commentsModalPost.title || 'Video'}
            </h3>
            <span
              style={{
                fontSize: 11,
                color: 'var(--text-secondary)',
              }}
            >
              {commentsModalPost.authorName}
              {commentsModalPost.authorUsername
                ? ` · @${commentsModalPost.authorUsername}`
                : ''}
            </span>
          </div>
        </div>

        <button
          type="button"
          className={styles.modalClose}
          onClick={closeComments}
        >
          <FaTimes />
        </button>
      </div>

      <div
        className={`${styles.modalBody} ${styles.modalBodyComments}`}
      >
        <div className={styles.modalCommentsInner}>
          <PostComments postId={commentsModalPost.id} />
        </div>
      </div>
    </div>
  </div>
)}

      </Layout>
    </AuthGuard>
  );
}
