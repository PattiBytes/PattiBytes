// app-next/pages/bytes/[id].tsx - COMPLETE UPDATED VERSION
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  doc,
  getDoc,
  Timestamp,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  serverTimestamp,
  updateDoc,
  increment,
  deleteDoc,
  setDoc,
} from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import { getUserProfile } from '@/lib/username';
import { useAuth } from '@/context/AuthContext';
import SafeImage from '@/components/SafeImage';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaClock,
  FaChevronLeft,
  FaChevronRight,
  FaTimes,
  FaComment,
  FaShare,
  FaHeart,
  FaChartBar,
  FaTrash,
  FaStar,
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import styles from '@/styles/ByteView.module.css';

interface ByteData {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  text?: string;
  textColor?: string;
  textPosition?: 'top' | 'middle' | 'bottom';
  createdAt: Date;
  expiresAt: Date;
  username?: string;
  commentsCount?: number;
  likesCount?: number;
  viewsCount?: number;
  isOfficial?: boolean;
}

interface Comment {
  id: string;
  byteId: string;
  userId: string;
  userName: string;
  userPhoto: string;
  text: string;
  createdAt: Date;
}

export default function ByteViewPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, userProfile } = useAuth();
  const { db } = getFirebaseClient();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [bytes, setBytes] = useState<ByteData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [viewsIncremented, setViewsIncremented] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  const currentByte = bytes[currentIndex];

  // Check if user is admin
  useEffect(() => {
    if (!user || !db) return;

    const checkAdmin = async () => {
      try {
        const adminSnap = await getDoc(doc(db, 'admins', user.uid));
        setIsAdmin(adminSnap.exists());
      } catch {
        setIsAdmin(false);
      }
    };

    checkAdmin();
  }, [user, db]);

  // Check if user has liked this byte
  useEffect(() => {
    if (!currentByte || !user || !db) return;

    const checkLike = async () => {
      try {
        const likeRef = doc(
          db,
          'bytes',
          currentByte.id,
          'likes',
          user.uid,
        );
        const snap = await getDoc(likeRef);
        setLiked(snap.exists());
      } catch {
        setLiked(false);
      }
    };

    checkLike();
  }, [currentByte, user, db]);

  // Load byte and nearby bytes
  useEffect(() => {
    if (!id || !db) return;

    const load = async () => {
      try {
        const byteRef = doc(db, 'bytes', id as string);
        const snap = await getDoc(byteRef);

        if (!snap.exists()) {
          setLoading(false);
          return;
        }

        const data = snap.data();
        const expiresAt = (data.expiresAt as Timestamp).toDate();
        const now = new Date();

        if (now > expiresAt) {
          setLoading(false);
          return;
        }

        const profile = await getUserProfile(data.userId);


        const q = query(
          collection(db, 'bytes'),
          where('userId', '==', data.userId),
          orderBy('createdAt', 'desc'),
          limit(10),
        );
        const userBytesSnap = await getDocs(q);
        const userBytes: ByteData[] = userBytesSnap.docs
          .map((d) => ({
            id: d.id,
            userId: d.data().userId,
            userName: d.data().userName || 'User',
            userPhoto:
              d.data().userPhoto || '/images/default-avatar.png',
            mediaUrl: d.data().mediaUrl,
            mediaType: d.data().mediaType || 'image',
            text: d.data().text,
            textColor: d.data().textColor,
            textPosition: d.data().textPosition,
            createdAt: (
              d.data().createdAt as Timestamp
            ).toDate(),
            expiresAt: (
              d.data().expiresAt as Timestamp
            ).toDate(),
            username: profile?.username,
            commentsCount: d.data().commentsCount || 0,
            likesCount: d.data().likesCount || 0,
            viewsCount: d.data().viewsCount || 0,
            isOfficial: d.data().isOfficial || false,
          }))
          .filter((b) => b.expiresAt > now);

        setBytes(userBytes);
        const currentByteIndex = userBytes.findIndex(
          (b) => b.id === id,
        );
        if (currentByteIndex !== -1) {
          setCurrentIndex(currentByteIndex);
        }
      } catch (error) {
        console.error('Error loading byte:', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, db]);

  // Increment views on first load
  useEffect(() => {
    if (!currentByte || !db || viewsIncremented) return;

    const incrementViews = async () => {
      try {
        const byteRef = doc(db, 'bytes', currentByte.id);
        await updateDoc(byteRef, {
          viewsCount: increment(1),
        });
        setViewsIncremented(true);
      } catch (error) {
        console.error('Error incrementing views:', error);
      }
    };

    incrementViews();
  }, [currentByte, db, viewsIncremented]);

  // Load comments with proper bounded query
  useEffect(() => {
    if (!currentByte || !db) return;

    const loadComments = async () => {
      try {
        const q = query(
          collection(db, 'bytes', currentByte.id, 'comments'),
          orderBy('createdAt', 'desc'),
          limit(50),
        );
        const snap = await getDocs(q);
        const data: Comment[] = snap.docs.map((d) => ({
          id: d.id,
          byteId: currentByte.id,
          userId: d.data().userId,
          userName: d.data().userName,
          userPhoto: d.data().userPhoto,
          text: d.data().text,
          createdAt: (d.data().createdAt as Timestamp).toDate(),
        }));
        setComments(data);
      } catch (error) {
        console.error('Error loading comments:', error);
      }
    };

    loadComments();
  }, [currentByte, db]);

  const handleNext = useCallback(() => {
    if (currentIndex < bytes.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
      setShowComments(false);
      setViewsIncremented(false);
      setLiked(false);
    } else {
      router.push('/');
    }
  }, [currentIndex, bytes.length, router]);

  // Progress bar animation
  useEffect(() => {
    if (!currentByte || showComments) return;

    const videoElement = videoRef.current;
    const isVideo =
      currentByte.mediaType === 'video' && videoElement;
    const duration = isVideo ? videoElement.duration * 1000 : 5000;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + (100 / (duration / 100));
      });
    }, 100);

    return () => clearInterval(interval);
  }, [currentByte, showComments, handleNext]);

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
      setShowComments(false);
      setViewsIncremented(false);
      setLiked(false);
    }
  };

  const handleTapNext = (e: React.MouseEvent) => {
    if (showComments) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const tapX = e.clientX - rect.left;
    if (tapX > rect.width / 2) {
      handleNext();
    } else {
      handlePrev();
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !user ||
      !userProfile ||
      !currentByte ||
      !db ||
      !commentText.trim()
    )
      return;

    try {
      setCommentLoading(true);

      // Add comment
      await addDoc(
        collection(db, 'bytes', currentByte.id, 'comments'),
        {
          userId: user.uid,
          userName: userProfile.displayName || 'User',
          userPhoto: userProfile.photoURL || null,
          text: commentText.trim(),
          createdAt: serverTimestamp(),
        },
      );

      // Increment comments count
      await updateDoc(doc(db, 'bytes', currentByte.id), {
        commentsCount: increment(1),
      });

      setCommentText('');
      toast.success('Comment added!');

      // Reload comments
      const q = query(
        collection(db, 'bytes', currentByte.id, 'comments'),
        orderBy('createdAt', 'desc'),
        limit(50),
      );
      const snap = await getDocs(q);
      const data: Comment[] = snap.docs.map((d) => ({
        id: d.id,
        byteId: currentByte.id,
        userId: d.data().userId,
        userName: d.data().userName,
        userPhoto: d.data().userPhoto,
        text: d.data().text,
        createdAt: (d.data().createdAt as Timestamp).toDate(),
      }));
      setComments(data);

      // Update local state
      setBytes((prevBytes) =>
        prevBytes.map((byte) =>
          byte.id === currentByte.id
            ? {
                ...byte,
                commentsCount: (byte.commentsCount || 0) + 1,
              }
            : byte,
        ),
      );
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeleteComment = async (
    commentId: string,
    commentUserId: string,
  ) => {
    if (!currentByte || !db) return;

    // Only byte owner and comment author can delete
    const canDelete =
      commentUserId === user?.uid ||
      currentByte.userId === user?.uid ||
      isAdmin;
    if (!canDelete) {
      toast.error('You cannot delete this comment');
      return;
    }

    try {
      setDeletingCommentId(commentId);

      // Delete comment
      await deleteDoc(
        doc(db, 'bytes', currentByte.id, 'comments', commentId),
      );

      // Decrement comments count
      await updateDoc(doc(db, 'bytes', currentByte.id), {
        commentsCount: increment(-1),
      });

      // Update local state
      setComments((prev) =>
        prev.filter((c) => c.id !== commentId),
      );

      setBytes((prevBytes) =>
        prevBytes.map((byte) =>
          byte.id === currentByte.id
            ? {
                ...byte,
                commentsCount: Math.max(
                  0,
                  (byte.commentsCount || 0) - 1,
                ),
              }
            : byte,
        ),
      );

      toast.success('Comment deleted!');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleShare = async () => {
    if (!currentByte) return;

    const byteUrl = `${window.location.origin}/bytes/${currentByte.id}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${currentByte.userName}'s Byte`,
          text: 'Check out this byte on PattiBytes!',
          url: byteUrl,
        });
      } else {
        await navigator.clipboard.writeText(byteUrl);
        toast.success('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleLike = async () => {
    if (!currentByte || !db || !user) {
      toast.error('Please login to like');
      return;
    }

    try {
      setLikeLoading(true);
      const likeRef = doc(
        db,
        'bytes',
        currentByte.id,
        'likes',
        user.uid,
      );
      const likeSnap = await getDoc(likeRef);

      if (likeSnap.exists()) {
        // Unlike
        await deleteDoc(likeRef);
        await updateDoc(doc(db, 'bytes', currentByte.id), {
          likesCount: increment(-1),
        });
        setLiked(false);
        setBytes((prevBytes) =>
          prevBytes.map((byte) =>
            byte.id === currentByte.id
              ? {
                  ...byte,
                  likesCount: Math.max(0, (byte.likesCount || 0) - 1),
                }
              : byte,
          ),
        );
        toast.success('Removed like');
      } else {
        // Like
        await setDoc(likeRef, {
          userId: user.uid,
          byteId: currentByte.id,
          createdAt: serverTimestamp(),
        });
        await updateDoc(doc(db, 'bytes', currentByte.id), {
          likesCount: increment(1),
        });
        setLiked(true);
        setBytes((prevBytes) =>
          prevBytes.map((byte) =>
            byte.id === currentByte.id
              ? {
                  ...byte,
                  likesCount: (byte.likesCount || 0) + 1,
                }
              : byte,
          ),
        );
        toast.success('Liked!');
      }
    } catch (error) {
      console.error('Error liking byte:', error);
      toast.error('Failed to like byte');
    } finally {
      setLikeLoading(false);
    }
  };

  const handleDeleteByte = async () => {
    if (!currentByte || !db) return;

    const canDelete =
      currentByte.userId === user?.uid || isAdmin;
    if (!canDelete) {
      toast.error(
        'You do not have permission to delete this byte',
      );
      return;
    }

    try {
      // Delete byte and all comments/likes
      await deleteDoc(doc(db, 'bytes', currentByte.id));
      toast.success('Byte deleted!');
      router.push('/');
    } catch (error) {
      console.error('Error deleting byte:', error);
      toast.error('Failed to delete byte');
    }
  };

  const handleAnalytics = () => {
    if (currentByte?.userId === user?.uid || isAdmin) {
      router.push(`/bytes/analytics/${currentByte.id}`);
    } else {
      toast.error('You can only view analytics for your own bytes');
    }
  };

  if (loading) {
    return (
      <div className={styles.fullScreenContainer}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <p>Loading byte...</p>
        </div>
      </div>
    );
  }

  if (!currentByte || bytes.length === 0) {
    return (
      <div className={styles.fullScreenContainer}>
        <div className={styles.expiredContainer}>
          <div className={styles.expiredContent}>
            <h1>This byte has expired</h1>
            <p>Bytes disappear after 24 hours</p>
            <button
              onClick={() => router.push('/')}
              className={styles.backLink}
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const timeLeft = currentByte.expiresAt.getTime() - Date.now();
  const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutesLeft = Math.floor(
    (timeLeft % (1000 * 60 * 60)) / (1000 * 60),
  );

  return (
    <div className={styles.fullScreenContainer}>
      <motion.div
        className={styles.header}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <button
          onClick={() => router.push('/')}
          className={styles.backBtn}
          title="Back to home"
        >
          <FaTimes />
        </button>
        <div className={styles.counter}>
          {currentIndex + 1} / {bytes.length}
          {currentByte.isOfficial && (
            <span className={styles.officialTag}>
              <FaStar /> Official
            </span>
          )}
        </div>
        <div className={styles.spacer} />
      </motion.div>

      <div className={styles.viewerContainer}>
        <div className={styles.progressBars}>
          {bytes.map((_, idx) => (
            <div
              key={idx}
              className={styles.progressBar}
              onClick={() => {
                setCurrentIndex(idx);
                setProgress(0);
                setShowComments(false);
                setViewsIncremented(false);
              }}
            >
              <div
                className={styles.progressFill}
                style={{
                  width: `${
                    idx === currentIndex
                      ? progress
                      : idx < currentIndex
                        ? 100
                        : 0
                  }%`,
                }}
              />
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentByte.id}
            className={styles.mediaContainer}
            onClick={handleTapNext}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {currentByte.mediaType === 'video' ? (
              <video
                ref={videoRef}
                src={currentByte.mediaUrl}
                className={styles.media}
                autoPlay
                controls={false}
                playsInline
              />
            ) : (
              <SafeImage
                src={currentByte.mediaUrl}
                alt={currentByte.userName}
                width={600}
                height={1200}
                className={styles.media}
                priority
              />
            )}

            {currentByte.text && (
              <div
                className={`${styles.textOverlay} ${
                  styles[`overlay_${currentByte.textPosition}`]
                }`}
                style={{ color: currentByte.textColor }}
              >
                {currentByte.text}
              </div>
            )}

            {currentByte.isOfficial && (
              <div className={styles.officialBadge}>
                <FaStar /> Official Byte
              </div>
            )}

            <div className={styles.userOverlay}>
              <div className={styles.userInfoBlock}>
                <SafeImage
                  src={currentByte.userPhoto}
                  alt={currentByte.userName}
                  width={48}
                  height={48}
                  className={styles.userAvatar}
                />
                <div className={styles.userInfo}>
                  <strong>{currentByte.userName}</strong>
                  {currentByte.username && (
                    <small>@{currentByte.username}</small>
                  )}
                  <small>
                    <FaClock /> {hoursLeft}h {minutesLeft}m
                  </small>
                </div>
              </div>
            </div>

            <div className={styles.actionButtons}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleLike();
                }}
                disabled={likeLoading}
                className={`${styles.actionBtn} ${
                  liked ? styles.liked : ''
                }`}
                title="Like"
              >
                <FaHeart />
                <span>{currentByte.likesCount}</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowComments(!showComments);
                }}
                className={styles.actionBtn}
                title="Comments"
              >
                <FaComment />
                <span>{currentByte.commentsCount}</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleShare();
                }}
                className={styles.actionBtn}
                title="Share"
              >
                <FaShare />
              </button>
              {(currentByte.userId === user?.uid || isAdmin) && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAnalytics();
                    }}
                    className={styles.actionBtn}
                    title="View analytics"
                  >
                    <FaChartBar />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (
                        window.confirm(
                          'Delete this byte? This cannot be undone.',
                        )
                      ) {
                        handleDeleteByte();
                      }
                    }}
                    className={`${styles.actionBtn} ${styles.deleteBtn}`}
                    title="Delete byte"
                  >
                    <FaTrash />
                  </button>
                </>
              )}
            </div>

            {currentIndex > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                className={`${styles.navBtn} ${styles.prevBtn}`}
              >
                <FaChevronLeft />
              </button>
            )}
            {currentIndex < bytes.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className={`${styles.navBtn} ${styles.nextBtn}`}
              >
                <FaChevronRight />
              </button>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showComments && (
          <motion.div
            className={styles.commentsPanel}
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ duration: 0.3 }}
          >
            <div className={styles.commentsPanelHeader}>
              <h3>Comments ({comments.length})</h3>
              <button
                onClick={() => setShowComments(false)}
                className={styles.closeBtn}
              >
                <FaTimes />
              </button>
            </div>

            <div className={styles.commentsList}>
              {comments.length === 0 ? (
                <div className={styles.noComments}>
                  <p>No comments yet. Be the first!</p>
                </div>
              ) : (
                comments.map((comment) => {
                  const canDeleteComment =
                    comment.userId === user?.uid ||
                    currentByte.userId === user?.uid ||
                    isAdmin;

                  return (
                    <motion.div
                      key={comment.id}
                      className={styles.commentItem}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <SafeImage
                        src={comment.userPhoto}
                        alt={comment.userName}
                        width={36}
                        height={36}
                        className={styles.commentAvatar}
                      />
                      <div className={styles.commentContent}>
                        <div className={styles.commentHeader}>
                          <strong>{comment.userName}</strong>
                          <small>
                            {getTimeAgo(comment.createdAt)}
                          </small>
                        </div>
                        <p className={styles.commentText}>
                          {comment.text}
                        </p>
                      </div>
                      {canDeleteComment && (
                        <button
                          onClick={() =>
                            handleDeleteComment(
                              comment.id,
                              comment.userId,
                            )
                          }
                          disabled={
                            deletingCommentId === comment.id
                          }
                          className={styles.deleteCommentBtn}
                          title="Delete comment"
                        >
                          {deletingCommentId === comment.id ? (
                            <span>...</span>
                          ) : (
                            <FaTrash />
                          )}
                        </button>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>

            {user && userProfile && (
              <form
                onSubmit={handleAddComment}
                className={styles.commentForm}
              >
                <SafeImage
                  src={
                    userProfile.photoURL ||
                    '/images/default-avatar.png'
                  }
                  alt={userProfile.displayName}
                  width={32}
                  height={32}
                  className={styles.commentFormAvatar}
                />
                <input
                  type="text"
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) =>
                    setCommentText(e.target.value)
                  }
                  className={styles.commentInput}
                  disabled={commentLoading}
                />
                <button
                  type="submit"
                  disabled={
                    !commentText.trim() || commentLoading
                  }
                  className={styles.commentSubmitBtn}
                >
                  {commentLoading ? 'Posting...' : 'Post'}
                </button>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}
