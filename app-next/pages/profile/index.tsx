// app-next/pages/profile/index.tsx
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

  // Posts (bounded + ordered to satisfy rules)
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
          preview: p.preview,
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

  // Live stats
  useEffect(() => {
    if (!db || !user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (!snap.exists()) return;
      const u = snap.data() as DocumentData;
      setStats({
        posts: u.stats?.postsCount ?? posts.length,
        followers: u.stats?.followersCount ?? 0,
        following: u.stats?.followingCount ?? 0,
      });
    });
    return () => unsub();
  }, [db, user, posts.length]);

  const filtered = useMemo(
    () => (filter === 'all' ? posts : posts.filter((p) => p.type === filter)),
    [posts, filter]
  );

  const copyProfileLink = async () => {
    if (!userProfile?.username) return;
    const url = `${window.location.origin}/user/${userProfile.username}`;
    await navigator.clipboard.writeText(url);
    toast.success('Profile link copied!');
  };

  if (loading) {
    return (
      <AuthGuard>
        <Layout title="My Profile">
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
          <motion.header className={styles.header} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className={styles.coverPhoto}>
              <div className={styles.coverGradient} />
            </div>

            <div className={styles.profileRow}>
              <div className={styles.avatarSection}>
                <ProfilePictureUpload
                  currentUrl={userProfile.photoURL}
                  onUploaded={() => toast.success('Profile picture updated!')}
                />
              </div>

              <div className={styles.info}>
                <div className={styles.nameBlock}>
                  <h1>{userProfile.displayName}</h1>
                  <div className={styles.username}>@{userProfile.username}</div>
                  {userProfile.isVerified && (
                    <div className={styles.verified} title="Verified">
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
                  {userProfile.website && (
                    <a href={userProfile.website} target="_blank" rel="noopener noreferrer" className={styles.metaLink}>
                      <FaGlobe /> {userProfile.website.replace(/^https?:\/\//, '')}
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
                        : new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>

                <div className={styles.stats}>
                  <button onClick={() => setShowFollowers(true)} className={styles.statButton}>
                    <strong>{stats.followers}</strong>
                    <span>Followers</span>
                  </button>
                  <button onClick={() => setShowFollowing(true)} className={styles.statButton}>
                    <strong>{stats.following}</strong>
                    <span>Following</span>
                  </button>
                  <div className={styles.statItem}>
                    <strong>{stats.posts}</strong>
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
                  <button onClick={copyProfileLink} className={styles.copyBtn}>
                    Copy Link
                  </button>
                </div>
              </div>
            </div>
          </motion.header>

          <motion.section className={styles.postsSection} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className={styles.postsHeader}>
              <h2>Posts</h2>
              <div className={styles.postsFilters}>
                <button
                  onClick={() => setFilter('all')}
                  className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('news')}
                  className={`${styles.filterBtn} ${filter === 'news' ? styles.active : ''}`}
                >
                  <FaNewspaper /> News
                </button>
                <button
                  onClick={() => setFilter('place')}
                  className={`${styles.filterBtn} ${filter === 'place' ? styles.active : ''}`}
                >
                  <FaMapPin /> Places
                </button>
                <button
                  onClick={() => setFilter('writing')}
                  className={`${styles.filterBtn} ${filter === 'writing' ? styles.active : ''}`}
                >
                  <FaPen /> Writings
                </button>
              </div>
              <Link href="/create" className={styles.createBtn}>
                Create Post
              </Link>
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
                {filtered.map((post) => (
                  <Link href={`/posts/${post.id}`} key={post.id} className={styles.postCard}>
                    {post.imageUrl && (
                      <div className={styles.postImage}>
                        <SafeImage src={post.imageUrl} alt={post.title} width={300} height={200} className={styles.image} />
                      </div>
                    )}
                    <div className={styles.postContent}>
                      <h3>{post.title}</h3>
                      {post.preview && <p>{post.preview}</p>}
                      <div className={styles.postMeta}>
                        <span className={styles.postType}>{post.type}</span>
                        <span className={styles.postStats}>
                          {post.likesCount} likes · {post.commentsCount} comments
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </motion.section>

          <FollowersModal isOpen={showFollowers} onClose={() => setShowFollowers(false)} userId={user!.uid} />
          <FollowingModal isOpen={showFollowing} onClose={() => setShowFollowing(false)} userId={user!.uid} />
        </div>
      </Layout>
    </AuthGuard>
  );
}
