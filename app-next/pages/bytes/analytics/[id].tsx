// app-next/pages/bytes/analytics/[id].tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  doc,
  getDoc,
  Timestamp,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import SafeImage from '@/components/SafeImage';
import { motion } from 'framer-motion';
import {
  FaArrowLeft,
  FaHeart,
  FaComment,
  FaChartLine,
  FaClock,
  FaEye,
  FaStar,
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import styles from '@/styles/BytesAnalytics.module.css';

interface ByteData {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  text?: string;
  createdAt: Date;
  expiresAt: Date;
  likesCount: number;
  commentsCount: number;
  viewsCount?: number;
  isOfficial?: boolean;
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  text: string;
  createdAt: Date;
}

export default function ByteAnalyticsPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const { db } = getFirebaseClient();

  const [byte, setByte] = useState<ByteData | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOfficial, setIsOfficial] = useState(false);
  const [updatingOfficial, setUpdatingOfficial] = useState(false);

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

  // Load byte data
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

        // Check if user owns this byte or is admin
        if (data.userId !== user?.uid && !isAdmin) {
          router.push('/');
          return;
        }

        const byteData: ByteData = {
          id: snap.id,
          userId: data.userId,
          userName: data.userName || 'User',
          userPhoto:
            data.userPhoto || '/images/default-avatar.png',
          mediaUrl: data.mediaUrl,
          mediaType: data.mediaType || 'image',
          text: data.text,
          createdAt:
            data.createdAt instanceof Timestamp
              ? data.createdAt.toDate()
              : new Date(),
          expiresAt:
            data.expiresAt instanceof Timestamp
              ? data.expiresAt.toDate()
              : new Date(),
          likesCount: data.likesCount || 0,
          commentsCount: data.commentsCount || 0,
          viewsCount: data.viewsCount || 0,
          isOfficial: data.isOfficial || false,
        };

        setByte(byteData);
        setIsOfficial(byteData.isOfficial || false);

        // Load comments
        const commentsRef = collection(
          db,
          'bytes',
          id as string,
          'comments',
        );
        const commentsQuery = query(
          commentsRef,
          orderBy('createdAt', 'desc'),
          limit(100),
        );
        const commentsSnap = await getDocs(commentsQuery);
        const commentsData: Comment[] = commentsSnap.docs.map(
          (d) => ({
            id: d.id,
            userId: d.data().userId,
            userName: d.data().userName,
            userPhoto: d.data().userPhoto,
            text: d.data().text,
            createdAt:
              d.data().createdAt instanceof Timestamp
                ? d.data().createdAt.toDate()
                : new Date(),
          }),
        );
        setComments(commentsData);
      } catch (error) {
        console.error('Error loading byte:', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, db, user?.uid, router, isAdmin]);

  // Update time left countdown
  useEffect(() => {
    if (!byte) return;

    const updateTimeLeft = () => {
      const now = new Date();
      const diff = byte.expiresAt.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor(
        (diff % (1000 * 60 * 60)) / (1000 * 60),
      );
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [byte]);

  const handleToggleOfficial = async () => {
    if (!byte || !db || !isAdmin) return;

    try {
      setUpdatingOfficial(true);
      const newOfficial = !isOfficial;

      await updateDoc(doc(db, 'bytes', byte.id), {
        isOfficial: newOfficial,
      });

      setIsOfficial(newOfficial);
      toast.success(
        newOfficial
          ? 'Byte marked as official!'
          : 'Official status removed!',
      );
    } catch (error) {
      console.error('Error updating official status:', error);
      toast.error('Failed to update official status');
    } finally {
      setUpdatingOfficial(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <Layout title="Loading - PattiBytes">
          <div className={styles.container}>
            <div className={styles.loading}>
              <div className={styles.spinner} />
              <p>Loading analytics...</p>
            </div>
          </div>
        </Layout>
      </AuthGuard>
    );
  }

  if (!byte) {
    return (
      <AuthGuard>
        <Layout title="Byte Not Found - PattiBytes">
          <div className={styles.container}>
            <div className={styles.notFound}>
              <h2>Byte not found</h2>
              <button onClick={() => router.back()}>Go Back</button>
            </div>
          </div>
        </Layout>
      </AuthGuard>
    );
  }

  const engagementRate =
    byte.viewsCount && byte.viewsCount > 0
      ? (
          ((byte.likesCount + byte.commentsCount) /
            byte.viewsCount) *
          100
        ).toFixed(1)
      : '0';

  return (
    <AuthGuard>
      <Layout title={`${byte.userName}'s Byte Analytics - PattiBytes`}>
        <div className={styles.container}>
          {/* Header */}
          <motion.div
            className={styles.header}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <button
              onClick={() => router.back()}
              className={styles.backBtn}
            >
              <FaArrowLeft /> Back
            </button>
            <h1>Byte Analytics</h1>
            {isAdmin && (
              <button
                onClick={handleToggleOfficial}
                disabled={updatingOfficial}
                className={`${styles.officialBtn} ${
                  isOfficial ? styles.active : ''
                }`}
                title={
                  isOfficial
                    ? 'Remove official status'
                    : 'Mark as official'
                }
              >
                <FaStar />{' '}
                {updatingOfficial
                  ? 'Updating...'
                  : isOfficial
                    ? 'Official'
                    : 'Mark Official'}
              </button>
            )}
            {!isAdmin && <div className={styles.spacer} />}
          </motion.div>

          <div className={styles.content}>
            {/* Byte Preview */}
            <motion.div
              className={styles.previewSection}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div
                className={`${styles.bytePreview} ${
                  isOfficial ? styles.official : ''
                }`}
              >
                {isOfficial && (
                  <div className={styles.officialBadge}>
                    <FaStar /> Official
                  </div>
                )}
                {byte.mediaType === 'video' ? (
                  <video
                    src={byte.mediaUrl}
                    className={styles.media}
                    controls
                  />
                ) : (
                  <SafeImage
                    src={byte.mediaUrl}
                    alt="Byte"
                    width={300}
                    height={400}
                    className={styles.media}
                  />
                )}
              </div>

              <div className={styles.byteInfo}>
                <div className={styles.userBlock}>
                  <SafeImage
                    src={byte.userPhoto}
                    alt={byte.userName}
                    width={48}
                    height={48}
                    className={styles.avatar}
                  />
                  <div>
                    <h3>{byte.userName}</h3>
                    <small>
                      {byte.createdAt.toLocaleString('en-IN')}
                    </small>
                  </div>
                </div>

                {byte.text && (
                  <div className={styles.caption}>
                    <p>{byte.text}</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Analytics Grid */}
            <motion.div
              className={styles.statsGrid}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <FaHeart />
                </div>
                <div className={styles.statContent}>
                  <h4>Total Likes</h4>
                  <p className={styles.statValue}>
                    {byte.likesCount}
                  </p>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <FaComment />
                </div>
                <div className={styles.statContent}>
                  <h4>Total Comments</h4>
                  <p className={styles.statValue}>
                    {byte.commentsCount}
                  </p>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <FaEye />
                </div>
                <div className={styles.statContent}>
                  <h4>Views</h4>
                  <p className={styles.statValue}>
                    {byte.viewsCount || 0}
                  </p>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <FaChartLine />
                </div>
                <div className={styles.statContent}>
                  <h4>Engagement</h4>
                  <p className={styles.statValue}>{engagementRate}%</p>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <FaClock />
                </div>
                <div className={styles.statContent}>
                  <h4>Time Left</h4>
                  <p className={styles.statValue}>{timeLeft}</p>
                </div>
              </div>
            </motion.div>

            {/* Comments Section */}
            <motion.div
              className={styles.commentsSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2>Comments ({comments.length})</h2>

              {comments.length === 0 ? (
                <div className={styles.noComments}>
                  <p>No comments yet</p>
                </div>
              ) : (
                <div className={styles.commentsList}>
                  {comments.map((comment, idx) => (
                    <motion.div
                      key={comment.id}
                      className={styles.commentItem}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <SafeImage
                        src={comment.userPhoto}
                        alt={comment.userName}
                        width={40}
                        height={40}
                        className={styles.commentAvatar}
                      />
                      <div className={styles.commentContent}>
                        <div className={styles.commentHeader}>
                          <strong>{comment.userName}</strong>
                          <small>
                            {getTimeAgo(comment.createdAt)}
                          </small>
                        </div>
                        <p>{comment.text}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </Layout>
    </AuthGuard>
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
