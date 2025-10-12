// app-next/pages/dashboard/index.tsx
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  collection,
  query as fsQuery,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  startAfter,
  getDocs,
  type QueryDocumentSnapshot,
  type DocumentData,
  doc,
  getDoc,
} from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import BytesStories from '@/components/BytesStories';
import SafeImage from '@/components/SafeImage';
import VideoReel from '@/components/VideoReel';
import ShareButton from '@/components/ShareButton';
import LikeButton from '@/components/LikeButton';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaMapMarkerAlt,
  FaNewspaper,
  FaPen,
  FaVideo,
  FaTimes,
  FaBell,
  FaChevronDown,
  FaEye,
  FaComment,
  FaTrash,
} from 'react-icons/fa';
import { Toaster, toast } from 'react-hot-toast';
import styles from '@/styles/Dashboard.module.css';
import { fetchCMSNews, fetchCMSPlaces, fetchCMSNotifications } from '@/lib/netlifyCms';

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

interface Post {
  id: string;
  title: string;
  content: string;
  preview?: string;
  type: PostType;
  source: 'user' | 'cms';
  authorId?: string;
  authorName: string;
  authorUsername?: string;
  authorPhoto?: string;
  imageUrl?: string;
  videoUrl?: string;
  mediaType?: 'image' | 'video';
  location?: string;
  createdAt: Date;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount?: number;
  url?: string;
  slug?: string;
  isOfficial?: boolean;
}

interface CMSNewsItem {
  id?: string;
  slug?: string;
  title: string;
  preview?: string;
  author?: string;
  image?: string;
  date: string;
  url: string;
}
interface CMSPlaceItem {
  id?: string;
  slug?: string;
  title: string;
  preview?: string;
  image?: string;
  location?: string;
  date: string;
  url: string;
}
interface CMSNotificationItem {
  id: string;
  title: string;
  message: string;
  target_url?: string;
  image?: string;
}

const CMS_CACHE_KEY = 'cms_feed_v1';
const CMS_CACHE_TTL = 5 * 60 * 1000;

type CMSCacheShape = {
  ts: number;
  news: CMSNewsItem[];
  places: CMSPlaceItem[];
  notifs: CMSNotificationItem[];
};

function getCMSCache(): CMSCacheShape | null {
  try {
    const raw = sessionStorage.getItem(CMS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CMSCacheShape;
    if (!parsed?.ts) return null;
    if (Date.now() - parsed.ts > CMS_CACHE_TTL) return null;
    return parsed;
  } catch {
    return null;
  }
}
function setCMSCache(data: Omit<CMSCacheShape, 'ts'>) {
  try {
    const payload: CMSCacheShape = { ts: Date.now(), ...data };
    sessionStorage.setItem(CMS_CACHE_KEY, JSON.stringify(payload));
  } catch {}
}

export default function Dashboard() {
  const { user } = useAuth();
  const { db } = getFirebaseClient();

  const [posts, setPosts] = useState<Post[]>([]);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [cmsPosts, setCmsPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<'all' | 'news' | 'places' | 'writings' | 'user-content' | 'video'>('all');
  const [urgentNotification, setUrgentNotification] = useState<CMSNotificationItem | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const lastDoc = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const observer = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const cmsLoaded = useRef(false);

  // Admin check
  useEffect(() => {
    const check = async () => {
      if (!user || !db) return;
      try {
        const snap = await getDoc(doc(db, 'admins', user.uid));
        setIsAdmin(snap.exists());
      } catch {
        setIsAdmin(false);
      }
    };
    check();
  }, [db, user]);

  const filterFn = useCallback((items: Post[]) => {
    switch (filter) {
      case 'all': return items;
      case 'user-content': return items.filter((p) => p.source === 'user');
      case 'news': return items.filter((p) => p.type === 'news');
      case 'places': return items.filter((p) => p.type === 'place');
      case 'writings': return items.filter((p) => p.type === 'writing');
      case 'video': return items.filter((p) => p.mediaType === 'video' || p.type === 'video');
      default: return items;
    }
  }, [filter]);

  const buildFeed = useCallback((uPosts: Post[], cPosts: Post[]) => {
    const merged = [...uPosts, ...cPosts].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    setPosts(filterFn(merged));
  }, [filterFn]);

  // CMS loader (with cache) as a stable callback
  const loadCMS = useCallback(async () => {
    if (cmsLoaded.current) return;
    cmsLoaded.current = true;

    const applyNotifsOnce = (notifs: CMSNotificationItem[]) => {
      if (!notifs.length) return;
      const nid = notifs[0].id;
      const seenKey = `notification_seen_${nid}`;
      if (!localStorage.getItem(seenKey)) {
        setUrgentNotification(notifs[0]);
        setShowNotification(true);
        localStorage.setItem(seenKey, 'true');
        setTimeout(() => setShowNotification(false), 3000);
      }
    };

    const cached = getCMSCache();
    if (cached) {
      const officialNews: Post[] = cached.news.map((n) => ({
        id: `cms-news-${n.id || n.slug}`,
        title: n.title,
        content: n.preview || '',
        preview: n.preview,
        type: 'news',
        source: 'cms',
        authorName: n.author || 'PattiBytes Desk',
        authorPhoto: '/images/default-avatar.png',
        imageUrl: n.image,
        createdAt: new Date(n.date),
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        url: n.url,
        slug: n.slug || n.id,
        isOfficial: true,
      }));
      const officialPlaces: Post[] = cached.places.map((p) => ({
        id: `cms-place-${p.id || p.slug}`,
        title: p.title,
        content: p.preview || '',
        preview: p.preview,
        type: 'place',
        source: 'cms',
        authorName: 'PattiBytes',
        authorPhoto: '/images/default-avatar.png',
        imageUrl: p.image,
        location: p.location || 'Punjab',
        createdAt: new Date(p.date),
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        url: p.url,
        slug: p.slug || p.id,
        isOfficial: true,
      }));
      const cPosts = [...officialNews, ...officialPlaces];
      setCmsPosts(cPosts);
      buildFeed(userPosts, cPosts);
      applyNotifsOnce(cached.notifs);
      return;
    }

    try {
      const [news, places, notifs] = await Promise.all([fetchCMSNews(), fetchCMSPlaces(), fetchCMSNotifications()]);
      setCMSCache({ news, places, notifs });

      const officialNews: Post[] = news.map((n) => ({
        id: `cms-news-${n.id || n.slug}`,
        title: n.title,
        content: n.preview || '',
        preview: n.preview,
        type: 'news',
        source: 'cms',
        authorName: n.author || 'PattiBytes Desk',
        authorPhoto: '/images/default-avatar.png',
        imageUrl: n.image,
        createdAt: new Date(n.date),
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        url: n.url,
        slug: n.slug || n.id,
        isOfficial: true,
      }));
      const officialPlaces: Post[] = places.map((p) => ({
        id: `cms-place-${p.id || p.slug}`,
        title: p.title,
        content: p.preview || '',
        preview: p.preview,
        type: 'place',
        source: 'cms',
        authorName: 'PattiBytes',
        authorPhoto: '/images/default-avatar.png',
        imageUrl: p.image,
        location: p.location || 'Punjab',
        createdAt: new Date(p.date),
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        url: p.url,
        slug: p.slug || p.id,
        isOfficial: true,
      }));
      const cPosts = [...officialNews, ...officialPlaces];
      setCmsPosts(cPosts);
      buildFeed(userPosts, cPosts);
      applyNotifsOnce(notifs);
    } catch {
      // Silent CMS failure
    }
  }, [buildFeed, userPosts]);

  // Realtime user posts
  useEffect(() => {
    if (!db) return;
    setLoading(true);
    setErr(null);
    const q = fsQuery(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(20));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const uPosts: Post[] = snap.docs.map((d) => {
          const data = d.data() as FirestorePostDoc;
          const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
          return {
            id: d.id,
            title: data.title || '',
            content: data.content || '',
            preview: data.preview,
            type: (data.type || data.mediaType || 'writing') as PostType,
            mediaType: data.mediaType || (data.videoUrl ? 'video' : 'image'),
            source: 'user',
            authorId: data.authorId,
            authorName: data.authorName || 'Anonymous',
            authorUsername: data.authorUsername,
            authorPhoto: data.authorPhoto || '/images/default-avatar.png',
            imageUrl: data.imageUrl || undefined,
            videoUrl: data.videoUrl || undefined,
            location: data.location || undefined,
            createdAt,
            likesCount: data.likesCount || 0,
            commentsCount: data.commentsCount || 0,
            sharesCount: data.sharesCount || 0,
            viewsCount: data.viewsCount || 0,
            isOfficial: data.isOfficial || false,
          };
        });
        if (snap.docs.length > 0) {
          lastDoc.current = snap.docs[snap.docs.length - 1] as QueryDocumentSnapshot<DocumentData>;
        }
        setUserPosts(uPosts);
        buildFeed(uPosts, cmsPosts);
        setLoading(false);
        setHasMore(snap.docs.length >= 20);
      },
      () => {
        setLoading(false);
        setErr('Unable to load posts. Check permissions.');
      }
    );
    return () => unsub();
  }, [db, buildFeed, cmsPosts]);

  // Load CMS once
  useEffect(() => { loadCMS(); }, [loadCMS]);

  // Rebuild on filter
  useEffect(() => { buildFeed(userPosts, cmsPosts); }, [filter, userPosts, cmsPosts, buildFeed]);

  const loadMore = useCallback(async () => {
    if (!db || !lastDoc.current || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const q = fsQuery(collection(db, 'posts'), orderBy('createdAt', 'desc'), startAfter(lastDoc.current), limit(20));
      const snap = await getDocs(q);
      if (snap.empty) {
        setHasMore(false);
        return;
      }
      const morePosts: Post[] = snap.docs.map((d) => {
        const data = d.data() as FirestorePostDoc;
        const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
        return {
          id: d.id,
          title: data.title || '',
          content: data.content || '',
          preview: data.preview,
          type: (data.type || data.mediaType || 'writing') as PostType,
          mediaType: data.mediaType || (data.videoUrl ? 'video' : 'image'),
          source: 'user',
          authorId: data.authorId,
          authorName: data.authorName || 'Anonymous',
          authorUsername: data.authorUsername,
          authorPhoto: data.authorPhoto || '/images/default-avatar.png',
          imageUrl: data.imageUrl || undefined,
          videoUrl: data.videoUrl || undefined,
          location: data.location || undefined,
          createdAt,
          likesCount: data.likesCount || 0,
          commentsCount: data.commentsCount || 0,
          sharesCount: data.sharesCount || 0,
          viewsCount: data.viewsCount || 0,
          isOfficial: data.isOfficial || false,
        };
      });
      lastDoc.current = snap.docs[snap.docs.length - 1] as QueryDocumentSnapshot<DocumentData>;
      setUserPosts((prev) => [...prev, ...morePosts]);
      setHasMore(snap.docs.length >= 20);
    } finally {
      setLoadingMore(false);
    }
  }, [db, hasMore, loadingMore]);

  useEffect(() => {
    if (loading || loadingMore || !hasMore) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore();
    }, { threshold: 0.5 });
    observer.current = io;
    const el = loadMoreRef.current;
    if (el) io.observe(el);
    return () => io.disconnect();
  }, [loading, loadingMore, hasMore, loadMore]);

  const handleRefresh = async () => {
    setRefreshing(true);
    cmsLoaded.current = false;
    await loadCMS();
    setTimeout(() => setRefreshing(false), 800);
  };

  const getPostIcon = (type: string) => {
    switch (type) {
      case 'news': return <FaNewspaper />;
      case 'place': return <FaMapMarkerAlt />;
      case 'writing': return <FaPen />;
      case 'video': return <FaVideo />;
      default: return null;
    }
  };

  const feedEmpty = !loading && posts.length === 0;

  return (
    <AuthGuard>
      <Layout title="Dashboard - PattiBytes">
        <Toaster position="top-center" />
        <div className={styles.dashboard}>
          <AnimatePresence>
            {urgentNotification && showNotification && (
              <motion.div
                className={styles.compactNotif}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <FaBell />
                <span className={styles.notifTitle}>{urgentNotification.title}</span>
                <span className={styles.notifMessage}>{urgentNotification.message}</span>
                {urgentNotification.target_url && (
                  <a href={urgentNotification.target_url} target="_blank" rel="noopener noreferrer">
                    View
                  </a>
                )}
                <button onClick={() => setShowNotification(false)} aria-label="Close">
                  <FaTimes />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <BytesStories />

          <div className={styles.header}>
            <motion.button className={styles.refreshBtn} onClick={handleRefresh} disabled={refreshing} whileTap={{ scale: 0.95 }}>
              <FaChevronDown className={refreshing ? styles.spinning : ''} />
            </motion.button>
            <div aria-hidden="true" />
          </div>

          <div className={styles.filterTabs}>
            <button className={`${styles.tab} ${filter === 'all' ? styles.activeTab : ''}`} onClick={() => setFilter('all')}>All</button>
            <button className={`${styles.tab} ${filter === 'news' ? styles.activeTab : ''}`} onClick={() => setFilter('news')}><FaNewspaper /> News</button>
            <button className={`${styles.tab} ${filter === 'places' ? styles.activeTab : ''}`} onClick={() => setFilter('places')}><FaMapMarkerAlt /> Places</button>
            <button className={`${styles.tab} ${filter === 'writings' ? styles.activeTab : ''}`} onClick={() => setFilter('writings')}><FaPen /> Writings</button>
            <button className={`${styles.tab} ${filter === 'user-content' ? styles.activeTab : ''}`} onClick={() => setFilter('user-content')}><FaVideo /> User Content</button>
            <button className={`${styles.tab} ${filter === 'video' ? styles.activeTab : ''}`} onClick={() => setFilter('video')}><FaVideo /> Videos</button>
          </div>

          <div className={styles.feed}>
            {loading ? (
              <div className={styles.loading}>
                <div className={styles.spinner} />
                <p>Loading posts...</p>
              </div>
            ) : feedEmpty ? (
              <div className={styles.empty}>
                <FaPen className={styles.emptyIcon} />
                <p>No posts yet</p>
                <Link href="/create" className={styles.emptyBtn}>Create First Post</Link>
              </div>
            ) : (
              <>
                {posts.map((post, index) => {
                  const isUserPost = post.source === 'user' && !post.id.startsWith('cms-');
                  const shareUrl = post.url || `${typeof window !== 'undefined' ? window.location.origin : ''}/posts/${post.id}`;

                  const readMoreHref =
                    post.source === 'cms'
                      ? post.type === 'news'
                        ? `/news/${post.slug || post.id.replace('cms-news-', '')}`
                        : post.type === 'place'
                        ? `/places/${post.slug || post.id.replace('cms-place-', '')}`
                        : `/posts/${post.id}`
                      : `/posts/${post.id}`;

                  return (
                    <motion.article
                      key={post.id}
                      className={styles.postCard}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.01 }}
                    >
                      <div className={styles.postHeader}>
                        {post.source === 'user' && post.authorUsername ? (
                          <Link href={`/user/${post.authorUsername}`} className={styles.author}>
                            <SafeImage
                              src={post.authorPhoto || '/images/default-avatar.png'}
                              alt={post.authorName}
                              width={40}
                              height={40}
                              className={styles.authorAvatar}
                            />
                            <div className={styles.authorInfo}>
                              <h4>{post.authorName}</h4>
                              <p>@{post.authorUsername}</p>
                            </div>
                          </Link>
                        ) : (
                          <div className={styles.author}>
                            <div className={styles.authorAvatarPlaceholder}>{post.authorName.charAt(0).toUpperCase()}</div>
                            <div className={styles.authorInfo}>
                              <h4>{post.authorName}</h4>
                              <p className={styles.cmsLabel}>Official</p>
                            </div>
                          </div>
                        )}
                        <div className={styles.postMeta}>
                          <div className={styles.postType}>
                            {getPostIcon(post.type)}
                            <span>{post.type}</span>
                          </div>
                          {post.viewsCount !== undefined && (
                            <div className={styles.views}><FaEye /> {post.viewsCount}</div>
                          )}
                        </div>
                      </div>

                      {post.mediaType === 'video' && post.videoUrl ? (
                        <VideoReel src={post.videoUrl} poster={post.imageUrl} />
                      ) : post.imageUrl ? (
                        <div className={styles.postImage}>
                          <SafeImage src={post.imageUrl} alt={post.title} width={600} height={400} className="image" />
                        </div>
                      ) : null}

                      <div className={styles.postContent}>
                        {post.title && <h3>{post.title}</h3>}
                        {post.location && (
                          <p className={styles.location}><FaMapMarkerAlt /> {post.location}</p>
                        )}
                        {(post.preview || post.content) && (
                          <p>{(post.preview || post.content).toString().substring(0, 220)}...</p>
                        )}
                        <Link href={readMoreHref} className={styles.readMore}>Read More →</Link>
                      </div>

                      <div className={styles.postActions}>
                        {isUserPost ? (
                          <LikeButton postId={post.id} className={styles.actionButton} />
                        ) : (
                          <button className={styles.actionButton} disabled aria-label="Like">
                            <span>❤</span>
                            <span>{post.likesCount || 0}</span>
                          </button>
                        )}
                        <Link href={`/posts/${post.id}#comments`} className={styles.actionButton} aria-label="Comments">
                          <FaComment />
                          <span>{post.commentsCount || 0}</span>
                        </Link>
                        <ShareButton postId={post.id} url={shareUrl} className={styles.actionButton} />
                        {isUserPost && (user?.uid === post.authorId || isAdmin) ? (
                          <button
                            className={styles.actionButton}
                            onClick={async () => {
                              if (!confirm('Delete this post permanently?')) return;
                              try {
                                if (!db) throw new Error('Firestore not initialized');
                                const { deleteDoc } = await import('firebase/firestore');
                                await deleteDoc(doc(db, 'posts', post.id));
                                toast.success('Post deleted');
                              } catch {
                                toast.error('Failed to delete post');
                              }
                            }}
                            aria-label="Delete"
                            title="Delete post"
                          >
                            <FaTrash />
                          </button>
                        ) : null}
                      </div>

                      <div className={styles.postFooter}>
                        <span>{post.createdAt.toLocaleDateString()}</span>
                        {(post.isOfficial || post.source === 'cms') && <span className={styles.officialBadge}>Official</span>}
                      </div>
                    </motion.article>
                  );
                })}

                {hasMore && (
                  <div ref={loadMoreRef} className={styles.loadMore}>
                    {loadingMore && (
                      <>
                        <div className={styles.spinner} />
                        <p>Loading more...</p>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {err ? (
            <div className={styles.loading} style={{ paddingTop: 8 }}>
              <p style={{ color: '#ef4444' }}>{err}</p>
            </div>
          ) : null}
        </div>
      </Layout>
    </AuthGuard>
  );
}
