// app-next/pages/profile/index.tsx - COMPLETE WITH ACCURATE POST COUNTING
import { useAuth } from '@/context/AuthContext';
import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  getCountFromServer,
  type DocumentData,
  type Timestamp,
} from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import SafeImage from '@/components/SafeImage';
import ProfilePictureUpload from '@/components/ProfilePictureUpload';
import FollowersModal from '@/components/FollowersModal';
import FollowingModal from '@/components/FollowingModal';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  FaEdit,
  FaCog,
  FaMapMarkerAlt,
  FaGlobe,
  FaCalendar,
  FaNewspaper,
  FaMapPin,
  FaPen,
  FaCheckCircle,
  FaShieldAlt,
  FaSpinner,
  FaLink,
  FaHeart,
  FaComment,
  FaVideo,
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import styles from '@/styles/UserProfile.module.css';

interface Post {
  id: string;
  title: string;
  preview?: string;
  type: 'news' | 'place' | 'writing' | 'video';
  imageUrl?: string;
  createdAt: Date;
  likesCount: number;
  commentsCount: number;
}

export default function MyProfile() {
  const { user, userProfile } = useAuth();
  const { db } = getFirebaseClient();

  const [posts, setPosts] = useState<Post[]>([]);
  const [filter, setFilter] = useState<'all' | 'news' | 'place' | 'writing'>('all');
  const [loading, setLoading] = useState(true);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [stats, setStats] = useState({ posts: 0, followers: 0, following: 0 });
  const [loadingPostCount, setLoadingPostCount] = useState(true);
const getPostHref = (post: Post) => {
    return post.type === 'video' ? `/videos/${post.id}` : `/posts/${post.id}`;
  };
  // Load accurate post count
  useEffect(() => {
    const loadPostCount = async () => {
      if (!db || !user?.uid) return;

      try {
        setLoadingPostCount(true);
        const q = query(
          collection(db, 'posts'),
          where('authorId', '==', user.uid),
          where('isDraft', '==', false)
        );

        const snapshot = await getCountFromServer(q);
        const count = snapshot.data().count;

        setStats((prev) => ({ ...prev, posts: count }));
      } catch (error) {
        console.error('Error loading post count:', error);
        // Fallback to current posts length
        setStats((prev) => ({ ...prev, posts: posts.length }));
      } finally {
        setLoadingPostCount(false);
      }
    };

    loadPostCount();
  }, [db, user?.uid, posts.length]);

  // Load posts (bounded + ordered)
  useEffect(() => {
    if (!db || !user) return;

    const q = query(
      collection(db, 'posts'),
      where('authorId', '==', user.uid),
      where('isDraft', '==', false),
      orderBy('createdAt', 'desc'),
      limit(30)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => {
        const p = d.data() as DocumentData;
        return {
          id: d.id,
          title: p.title || 'Untitled',
          preview: p.preview || p.content?.substring(0, 150),
          type: (p.type as Post['type']) || 'writing',
          imageUrl: p.imageUrl,
          createdAt:
            p.createdAt && typeof p.createdAt.toDate === 'function'
              ? (p.createdAt as Timestamp).toDate()
              : new Date(),
          likesCount: p.likesCount || 0,
          commentsCount: p.commentsCount || 0,
        };
      });
      setPosts(data);
      setLoading(false);
    });

    return () => unsub();
  }, [db, user]);

  // Live follower stats
  useEffect(() => {
    if (!db || !user) return;

    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (!snap.exists()) return;
      const u = snap.data() as DocumentData;
      setStats((prev) => ({
        ...prev,
        followers: u.stats?.followersCount ?? 0,
        following: u.stats?.followingCount ?? 0,
      }));
    });

    return () => unsub();
  }, [db, user]);

  const filtered = useMemo(
    () => (filter === 'all' ? posts : posts.filter((p) => p.type === filter)),
    [posts, filter]
  );

  const copyProfileLink = async () => {
    if (!userProfile?.username) return;
    try {
      const url = `${window.location.origin}/user/${userProfile.username}`;
      await navigator.clipboard.writeText(url);
      toast.success('Profile link copied to clipboard!');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const externalWebsite = useMemo(() => {
    const v = userProfile?.website?.trim();
    if (!v) return undefined;
    return v.startsWith('http://') || v.startsWith('https://') ? v : `https://${v}`;
  }, [userProfile?.website]);

  if (loading) {
    return (
      <AuthGuard>
        <Layout title="My Profile - PattiBytes">
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} />
            <p>Loading profile...</p>
          </div>
        </Layout>
      </AuthGuard>
    );
  }

  if (!userProfile) return null;

  return (
    <AuthGuard>
      <Layout title={`${userProfile.displayName} - PattiBytes`}>
        <div className={styles.container}>
          {/* Profile Header */}
          <motion.header
            className={styles.header}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className={styles.coverPhoto}>
              <div className={styles.coverGradient} />
            </div>

            <div className={styles.profileRow}>
              <div className={styles.avatarSection}>
                <ProfilePictureUpload
                  currentUrl={userProfile.photoURL}
                  onUploaded={() => toast.success('Profile picture updated! ✅')}
                />
              </div>

              <div className={styles.info}>
                <div className={styles.nameBlock}>
                  <h1>{userProfile.displayName}</h1>
                  <div className={styles.username}>@{userProfile.username}</div>
                  {userProfile.isVerified && (
                    <div className={styles.verified} title="Verified Account">
                      <FaCheckCircle />
                    </div>
                  )}
                  {userProfile.role === 'admin' && (
                    <div className={styles.adminBadge}>
                      <FaShieldAlt /> Admin
                    </div>
                  )}
                </div>

                {userProfile.bio && <div className={styles.bio}>{userProfile.bio}</div>}

                <div className={styles.meta}>
                  {userProfile.location && (
                    <span className={styles.metaItem}>
                      <FaMapMarkerAlt /> {userProfile.location}
                    </span>
                  )}
                  {externalWebsite && (
                    <a
                      href={externalWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.metaLink}
                    >
                      <FaGlobe /> {userProfile.website?.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                  {userProfile.createdAt && (
                    <span className={styles.metaItem}>
                      <FaCalendar /> Joined{' '}
                      {(userProfile.createdAt as Timestamp).toDate
                        ? (userProfile.createdAt as Timestamp).toDate().toLocaleDateString('en-IN', {
                            month: 'short',
                            year: 'numeric',
                          })
                        : new Date().toLocaleDateString('en-IN', {
                            month: 'short',
                            year: 'numeric',
                          })}
                    </span>
                  )}
                </div>

                <div className={styles.stats}>
                  <button
                    onClick={() => setShowFollowers(true)}
                    className={styles.statButton}
                    type="button"
                  >
                    <strong>{stats.followers}</strong>
                    <span>Followers</span>
                  </button>
                  <button
                    onClick={() => setShowFollowing(true)}
                    className={styles.statButton}
                    type="button"
                  >
                    <strong>{stats.following}</strong>
                    <span>Following</span>
                  </button>
                  <div className={styles.statItem}>
                    <strong>
                      {loadingPostCount ? (
                        <FaSpinner className={styles.spinIcon} />
                      ) : (
                        stats.posts
                      )}
                    </strong>
                    <span>Posts</span>
                  </div>
                </div>

                <div className={styles.actions}>
                  <Link href="/settings" className={styles.editBtn}>
                    <FaEdit /> Edit Profile
                  </Link>
                  <Link href="/settings" className={styles.settingsBtn}>
                    <FaCog /> Settings
                  </Link>
                  <button onClick={copyProfileLink} className={styles.copyBtn} type="button">
                    <FaLink /> Copy Link
                  </button>
                </div>
              </div>
            </div>
          </motion.header>

          {/* Posts Section */}
          <motion.section
            className={styles.postsSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            
            <div className={styles.postsHeader}>
              <h2>
                Posts {!loadingPostCount && stats.posts > 0 && `(${stats.posts})`}
              </h2>
              <div className={styles.postsFilters}>
                <button
                  onClick={() => setFilter('all')}
                  className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
                  type="button"
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('news')}
                  className={`${styles.filterBtn} ${filter === 'news' ? styles.active : ''}`}
                  type="button"
                >
                  <FaNewspaper /> News
                </button>
                <button
                  onClick={() => setFilter('place')}
                  className={`${styles.filterBtn} ${filter === 'place' ? styles.active : ''}`}
                  type="button"
                >
                  <FaMapPin /> Places
                </button>
                <button
                  onClick={() => setFilter('writing')}
                  className={`${styles.filterBtn} ${filter === 'writing' ? styles.active : ''}`}
                  type="button"
                >
                  <FaPen /> Writings
                </button>
                <Link href="/create" className={styles.createBtn}>
                  Create Post
                </Link>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className={styles.noPosts}>
                <FaPen className={styles.noPostsIcon} />
                <p>You have not posted anything yet</p>
                <Link href="/create" className={styles.createFirstBtn}>
                  Create your first post
                </Link>
              </div>
            ) : (
             <div className={styles.postsGrid}>
  {filtered.map((post, index) => (
    <motion.div
      key={post.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Link href={getPostHref(post)} className={styles.postCard}>
        {post.imageUrl && (
          <div className={styles.postImage}>
            <SafeImage
              src={post.imageUrl}
              alt={post.title}
              width={300}
              height={200}
              className={styles.image}
            />
          </div>
        )}
        <div className={styles.postContent}>
          <div className={styles.postTypeBadge}>
            {post.type === 'news' && <FaNewspaper />}
            {post.type === 'place' && <FaMapPin />}
            {post.type === 'writing' && <FaPen />}
            {post.type === 'video' && <FaVideo />} {/* optional */}
            <span>{post.type}</span>
          </div>
          <h3>{post.title}</h3>
          {post.preview && (
            <p className={styles.postPreview}>{post.preview}</p>
          )}
          <div className={styles.postMeta}>
            <span className={styles.postStats}>
              <FaHeart /> {post.likesCount}
            </span>
            <span className={styles.postStats}>
              <FaComment /> {post.commentsCount}
            </span>
            <span className={styles.postDate}>
              {post.createdAt.toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  ))}
</div>

            )}
          </motion.section>

          {/* Modals */}
          <FollowersModal
            isOpen={showFollowers}
            onClose={() => setShowFollowers(false)}
            userId={user!.uid}
          />
          <FollowingModal
            isOpen={showFollowing}
            onClose={() => setShowFollowing(false)}
            userId={user!.uid}
          />
        </div>
      </Layout>
    </AuthGuard>
  );
}
