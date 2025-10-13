// app-next/pages/user/[username].tsx
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import SafeImage from '@/components/SafeImage';
import FollowersModal from '@/components/FollowersModal';
import FollowingModal from '@/components/FollowingModal';
import UserPostCard from '@/components/UserPostCard';
import ProfilePictureUpload from '@/components/ProfilePictureUpload';
import Link from 'next/link';
import {
  collection,
  query as fsQuery,
  where,
  orderBy,
  limit,
  getDocs,
  startAfter,
  type QueryDocumentSnapshot,
  type DocumentData,
  doc,
  Timestamp,
  onSnapshot,
} from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import { getUserByUsername, type UserProfile } from '@/lib/username';
import { isFollowing, followUser, unfollowUser } from '@/lib/follow';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaMapMarkerAlt, 
  FaGlobe, 
  FaCalendar, 
  FaUserPlus, 
  FaUserCheck, 
  FaNewspaper,
  FaMapPin,
  FaPen,
  FaEdit,
  FaLink,
  FaPaperPlane,
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import styles from '@/styles/UserProfile.module.css';

type FirestorePostDoc = {
  title?: string;
  content?: string;
  type?: 'news' | 'place' | 'writing' | string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  location?: string | null;
  createdAt?: Timestamp | Date;
  isDraft?: boolean;
  likesCount?: number;
  commentsCount?: number;
  sharesCount?: number;
  viewsCount?: number;
};

export type PostCard = {
  id: string;
  title: string;
  content: string;
  type: 'news' | 'place' | 'writing';
  imageUrl: string | null;
  videoUrl: string | null;
  location: string | null;
  createdAt: Date;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
};

type PostFilter = 'all' | 'news' | 'place' | 'writing';

export default function PublicProfilePage() {
  const router = useRouter();
  const { username } = router.query;
  const { user } = useAuth();
  const { db } = getFirebaseClient();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<PostCard[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [following, setFollowing] = useState(false);
  const [busyFollow, setBusyFollow] = useState(false);

  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);

  const [filter, setFilter] = useState<PostFilter>('all');

  const isOwnProfile = !!(user?.uid && profile?.uid && user.uid === profile.uid);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const externalWebsite = useMemo(() => {
    const v = profile?.website?.trim();
    if (!v) return undefined;
    return v.startsWith('http://') || v.startsWith('https://') ? v : `https://${v}`;
  }, [profile?.website]);

  // Real-time profile updates
  useEffect(() => {
    if (!profile?.uid || !db) return;
    const unsub = onSnapshot(
      doc(db, 'users', profile.uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<UserProfile>;
          setProfile((prev) => (prev ? { ...prev, ...data } : prev));
        }
      },
      () => {}
    );
    return () => unsub();
  }, [profile?.uid, db]);

  // Load profile and initial posts
  useEffect(() => {
    const run = async () => {
      if (!router.isReady) return;
      if (typeof username !== 'string' || !username) {
        setLoading(false);
        setError('Invalid username');
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Load user profile
        const up = await getUserByUsername(username);
        if (!up) {
          setError('User not found');
          setLoading(false);
          return;
        }

        setProfile(up);

        if (!db) {
          setError('Database connection failed');
          setLoading(false);
          return;
        }

        // Load user posts - simple query + client-side draft filter
        if (up.uid) {
          const q = fsQuery(
            collection(db, 'posts'),
            where('authorId', '==', up.uid),
            orderBy('createdAt', 'desc'),
            limit(20)
          );

          const snap = await getDocs(q);
          const items: PostCard[] = [];
          
          snap.docs.forEach((d) => {
            const raw = d.data() as FirestorePostDoc;
            if (raw.isDraft === true) return; // Skip drafts

            const created = raw.createdAt instanceof Timestamp ? raw.createdAt.toDate() : new Date();
            const t = (raw.type || 'writing').toString();
            const normalizedType: 'news' | 'place' | 'writing' =
              t === 'news' || t === 'place' ? (t as 'news' | 'place') : 'writing';

            items.push({
              id: d.id,
              title: raw.title || 'Untitled',
              content: raw.content || '',
              type: normalizedType,
              imageUrl: raw.imageUrl ?? null,
              videoUrl: raw.videoUrl ?? null,
              location: raw.location ?? null,
              createdAt: created,
              likesCount: raw.likesCount || 0,
              commentsCount: raw.commentsCount || 0,
              sharesCount: raw.sharesCount || 0,
              viewsCount: raw.viewsCount || 0,
            });
          });

          setPosts(items.slice(0, 12));
          setCursor(snap.docs[Math.min(items.length, 12) - 1] || null);
        }

        // Check following status
        if (user?.uid && up.uid && user.uid !== up.uid) {
          try {
            const f = await isFollowing(user.uid, up.uid);
            setFollowing(f);
          } catch {
            setFollowing(false);
          }
        }
      } catch {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [db, router.isReady, username, user?.uid]);

  const loadMore = useCallback(async () => {
    if (!db || !profile?.uid || !cursor || loadingMore) return;
    
    setLoadingMore(true);
    try {
      const q = fsQuery(
        collection(db, 'posts'),
        where('authorId', '==', profile.uid),
        orderBy('createdAt', 'desc'),
        startAfter(cursor),
        limit(20)
      );

      const snap = await getDocs(q);
      const more: PostCard[] = [];
      
      snap.docs.forEach((d) => {
        const raw = d.data() as FirestorePostDoc;
        if (raw.isDraft === true) return;

        const created = raw.createdAt instanceof Timestamp ? raw.createdAt.toDate() : new Date();
        const t = (raw.type || 'writing').toString();
        const normalizedType: 'news' | 'place' | 'writing' =
          t === 'news' || t === 'place' ? (t as 'news' | 'place') : 'writing';

        more.push({
          id: d.id,
          title: raw.title || 'Untitled',
          content: raw.content || '',
          type: normalizedType,
          imageUrl: raw.imageUrl ?? null,
          videoUrl: raw.videoUrl ?? null,
          location: raw.location ?? null,
          createdAt: created,
          likesCount: raw.likesCount || 0,
          commentsCount: raw.commentsCount || 0,
          sharesCount: raw.sharesCount || 0,
          viewsCount: raw.viewsCount || 0,
        });
      });

      setPosts((prev) => [...prev, ...more.slice(0, 12)]);
      setCursor(snap.docs[Math.min(more.length, 12) - 1] || null);
    } catch {
      toast.error('Failed to load more posts');
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, db, profile?.uid, loadingMore]);

  // Infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || !cursor || loadingMore) return;
    
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.2 }
    );
    
    io.observe(loadMoreRef.current);
    return () => io.disconnect();
  }, [cursor, loadMore, loadingMore]);

  const handleFollowToggle = async () => {
    if (!user?.uid || !profile?.uid || user.uid === profile.uid || busyFollow) return;
    
    setBusyFollow(true);
    try {
      if (following) {
        await unfollowUser(user.uid, profile.uid);
        setFollowing(false);
        toast.success('Unfollowed');
      } else {
        await followUser(user.uid, profile.uid);
        setFollowing(true);
        toast.success('Now following');
      }
    } catch {
      toast.error('Failed to update follow status');
    } finally {
      setBusyFollow(false);
    }
  };

  const copyProfileLink = async () => {
    try {
      if (typeof window === 'undefined') return;
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Profile link copied');
    } catch {
      toast.error('Could not copy link');
    }
  };

  const openMessage = () => {
    if (!profile?.username) return;
    router.push(`/chat?to=${encodeURIComponent(profile.username)}`);
  };

  const filteredPosts = useMemo(() => {
    if (filter === 'all') return posts;
    return posts.filter((p) => p.type === filter);
  }, [filter, posts]);

  if (loading) {
    return (
      <AuthGuard>
        <Layout title="Loading Profile - PattiBytes">
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} />
            <p>Loading profile...</p>
          </div>
        </Layout>
      </AuthGuard>
    );
  }

  if (error || !profile) {
    return (
      <AuthGuard>
        <Layout title="User Not Found - PattiBytes">
          <div className={styles.errorContainer}>
            <h1>User Not Found</h1>
            <p>{error || 'This user does not exist or has been removed.'}</p>
            <Link href="/search" className={styles.backLink}>
              ← Back to Search
            </Link>
          </div>
        </Layout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Layout title={`${profile.displayName} (@${profile.username}) - PattiBytes`}>
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
                {isOwnProfile ? (
                  <ProfilePictureUpload
                    currentUrl={profile.photoURL}
                    onUploaded={(newUrl) => {
                      setProfile((p) => (p ? { ...p, photoURL: newUrl } : p));
                      toast.success('Profile picture updated');
                    }}
                  />
                ) : (
                  <div className={styles.avatarLarge}>
                    <SafeImage 
                      src={profile.photoURL || '/images/default-avatar.png'} 
                      alt={profile.displayName} 
                      width={120} 
                      height={120} 
                    />
                  </div>
                )}
              </div>

              <div className={styles.info}>
                <div className={styles.nameBlock}>
                  <h1>{profile.displayName}</h1>
                  <div className={styles.username}>@{profile.username}</div>
                  {profile.isVerified && <div className={styles.verified}>✓</div>}
                </div>

                {profile.bio && <div className={styles.bio}>{profile.bio}</div>}

                <div className={styles.meta}>
                  {profile.location && (
                    <span className={styles.metaItem}>
                      <FaMapMarkerAlt /> {profile.location}
                    </span>
                  )}
                  {externalWebsite && (
                    <a 
                      href={externalWebsite} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className={styles.metaLink}
                    >
                      <FaGlobe /> {profile.website?.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                  {profile.createdAt && (
                    <span className={styles.metaItem}>
                      <FaCalendar /> Joined{' '}
                      {profile.createdAt instanceof Timestamp
                        ? profile.createdAt.toDate().toLocaleDateString('en-IN', {
                            month: 'short',
                            year: 'numeric',
                          })
                        : new Date().toLocaleDateString('en-IN', { 
                            month: 'short', 
                            year: 'numeric' 
                          })}
                    </span>
                  )}
                </div>

                <div className={styles.stats}>
                  <button 
                    onClick={() => setShowFollowers(true)} 
                    className={styles.statButton}
                  >
                    <strong>{profile.stats?.followersCount ?? 0}</strong>
                    <span>Followers</span>
                  </button>
                  <button 
                    onClick={() => setShowFollowing(true)} 
                    className={styles.statButton}
                  >
                    <strong>{profile.stats?.followingCount ?? 0}</strong>
                    <span>Following</span>
                  </button>
                  <div className={styles.statItem}>
                    <strong>{profile.stats?.postsCount ?? posts.length}</strong>
                    <span>Posts</span>
                  </div>
                </div>

                <div className={styles.actions}>
                  {user?.uid && user.uid !== profile.uid ? (
                    <>
                      <motion.button
                        onClick={handleFollowToggle}
                        disabled={busyFollow}
                        className={following ? styles.unfollowBtn : styles.followBtn}
                        whileTap={{ scale: 0.95 }}
                        aria-pressed={following}
                      >
                        {busyFollow ? (
                          'Loading...'
                        ) : following ? (
                          <>
                            <FaUserCheck /> Following
                          </>
                        ) : (
                          <>
                            <FaUserPlus /> Follow
                          </>
                        )}
                      </motion.button>
                      <button onClick={openMessage} className={styles.messageBtn}>
                        <FaPaperPlane /> Message
                      </button>
                      <button onClick={copyProfileLink} className={styles.copyBtn}>
                        <FaLink /> Copy Link
                      </button>
                    </>
                  ) : isOwnProfile ? (
                    <Link href="/settings" className={styles.editBtn}>
                      <FaEdit /> Edit Profile
                    </Link>
                  ) : null}
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
                {isOwnProfile && (
                  <Link href="/create" className={styles.createBtn}>
                    Create Post
                  </Link>
                )}
              </div>
            </div>

            {filteredPosts.length === 0 ? (
              <div className={styles.noPosts}>
                <FaPen className={styles.noPostsIcon} />
                <p>{isOwnProfile ? 'You have not posted anything yet' : 'No posts yet'}</p>
                {isOwnProfile && (
                  <Link href="/create" className={styles.createFirstBtn}>
                    Create your first post
                  </Link>
                )}
              </div>
            ) : (
              <>
                <div className={styles.postsGrid}>
                  <AnimatePresence>
                    {filteredPosts.map((post, index) => (
                      <UserPostCard
                        key={post.id}
                        post={post}
                        index={index}
                        isOwnProfile={isOwnProfile}
                        currentUserId={user?.uid}
                      />
                    ))}
                  </AnimatePresence>
                </div>

                {cursor && (
                  <>
                    <div className={styles.loadMore}>
                      <button 
                        onClick={loadMore} 
                        disabled={loadingMore}
                        className={styles.loadMoreBtn}
                      >
                        {loadingMore ? 'Loading...' : 'Load More Posts'}
                      </button>
                    </div>
                    <div ref={loadMoreRef} className={styles.loadMoreSentinel} />
                  </>
                )}
              </>
            )}
          </motion.section>

          {/* Modals */}
          <FollowersModal
            isOpen={showFollowers}
            onClose={() => setShowFollowers(false)}
            userId={profile.uid}
          />
          
          <FollowingModal
            isOpen={showFollowing}
            onClose={() => setShowFollowing(false)}
            userId={profile.uid}
          />
        </div>
      </Layout>
    </AuthGuard>
  );
}
