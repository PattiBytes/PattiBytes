// app-next/pages/bytes/[id].tsx
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

  const currentByte = bytes[currentIndex];

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

        const currentByteData: ByteData = {
          id: snap.id,
          userId: data.userId,
          userName: data.userName || 'User',
          userPhoto:
            data.userPhoto || '/images/default-avatar.png',
          mediaUrl: data.mediaUrl,
          mediaType: data.mediaType || 'image',
          text: data.text,
          textColor: data.textColor,
          textPosition: data.textPosition,
          createdAt: (data.createdAt as Timestamp).toDate(),
          expiresAt,
          username: profile?.username,
          commentsCount: data.commentsCount || 0,
          likesCount: data.likesCount || 0,
        };

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

  // Load comments with proper bounded query
  useEffect(() => {
    if (!currentByte || !db) return;

    const loadComments = async () => {
      try {
        const q = query(
          collection(db, 'bytes', currentByte.id, 'comments'),
          orderBy('createdAt', 'desc'),
          limit(50), // Bounded list
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
        // Don't show toast, user may not have permission yet
      }
    };

    loadComments();
  }, [currentByte, db]);

  const handleNext = useCallback(() => {
    if (currentIndex < bytes.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
      setShowComments(false);
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
      await addDoc(
        collection(db, 'bytes', currentByte.id, 'comments'),
        {
          userId: user.uid,
          userName: userProfile.displayName,
          userPhoto: userProfile.photoURL || null,
          text: commentText.trim(),
          createdAt: serverTimestamp(),
        },
      );

      setCommentText('');
      toast.success('Comment added!');

      // Reload comments with bounded query
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
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setCommentLoading(false);
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

  const handleLike = () => {
    setLiked(!liked);
    toast.success(liked ? 'Removed like' : 'Liked!');
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
              }}
            >
              <div
                className={styles.progressFill}
                style={{
                  width: `${idx === currentIndex ? progress : idx < currentIndex ? 100 : 0}%`,
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
                className={`${styles.textOverlay} ${styles[`overlay_${currentByte.textPosition}`]}`}
                style={{ color: currentByte.textColor }}
              >
                {currentByte.text}
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
                className={`${styles.actionBtn} ${liked ? styles.liked : ''}`}
                title="Like"
              >
                <FaHeart />
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
                {comments.length > 0 && (
                  <span className={styles.badge}>
                    {comments.length}
                  </span>
                )}
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
                comments.map((comment) => (
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
                  </motion.div>
                ))
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
                  onChange={(e) => setCommentText(e.target.value)}
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
                  Post
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
