import { useEffect, useState, useCallback } from 'react';
import { collection, query, orderBy, limit, getDocs, Timestamp, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import BytesStories from '@/components/BytesStories';
import SafeImage from '@/components/SafeImage';
import { motion, AnimatePresence } from 'framer-motion';
import { FaMapMarkerAlt, FaNewspaper, FaHeart, FaComment, FaShare, FaPen, FaPlus, FaTimes, FaBell, FaVideo } from 'react-icons/fa';
import Link from 'next/link';
import toast from 'react-hot-toast';
import styles from '@/styles/Dashboard.module.css';

interface Post {
  id: string;
  title: string;
  content: string;
  preview?: string;
  type: 'news' | 'place' | 'writing';
  source: 'user' | 'cms';
  authorId?: string;
  authorName: string;
  authorUsername?: string;
  authorPhoto?: string;
  imageUrl?: string;
  location?: string;
  createdAt: Date;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  likes?: string[];
  url?: string;
}

interface CMSItem {
  id?: string;
  slug?: string;
  title: string;
  preview?: string;
  date: string;
  author?: string;
  image?: string;
  url?: string;
  location?: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  target_url?: string;
  image?: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'news' | 'places' | 'writings' | 'user-content'>('all');
  const [urgentNotification, setUrgentNotification] = useState<Notification | null>(null);
  const [showNotification, setShowNotification] = useState(true);

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      const { db } = getFirebaseClient();
      if (!db) throw new Error('Firestore not initialized');
      
      const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(100));
      const snapshot = await getDocs(postsQuery);
      
      const userPosts = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: data.title || '',
          content: data.content || '',
          preview: data.preview,
          type: data.type || 'writing',
          source: 'user' as const,
          authorId: data.authorId,
          authorName: data.authorName || 'Anonymous',
          authorUsername: data.authorUsername,
          authorPhoto: data.authorPhoto || '/images/default-avatar.png',
          imageUrl: data.imageUrl,
          location: data.location,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
          likesCount: data.likesCount || 0,
          commentsCount: data.commentsCount || 0,
          sharesCount: data.sharesCount || 0,
          likes: data.likes || []
        };
      }) as Post[];

      let cmsNews: Post[] = [];
      let cmsPlaces: Post[] = [];

      try {
        const ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.pattibytes.com';
        
        const newsRes = await fetch(`${ORIGIN}/news/index.json`, { cache: 'no-store' });
        if (newsRes.ok) {
          const newsData = await newsRes.json();
          const newsItems: CMSItem[] = Array.isArray(newsData) ? newsData : (newsData.items || []);
          
          cmsNews = newsItems.map((item) => ({
            id: `cms-news-${item.id || item.slug}`,
            title: item.title,
            content: item.preview || '',
            preview: item.preview,
            type: 'news' as const,
            source: 'cms' as const,
            authorName: item.author || 'PattiBytes Desk',
            imageUrl: item.image,
            createdAt: new Date(item.date),
            likesCount: 0,
            commentsCount: 0,
            sharesCount: 0,
            url: item.url || `/news/${item.id || item.slug}`
          }));
        }

        const placesRes = await fetch(`${ORIGIN}/places/index.json`, { cache: 'no-store' });
        if (placesRes.ok) {
          const placesData = await placesRes.json();
          const placesItems: CMSItem[] = Array.isArray(placesData) ? placesData : (placesData.items || []);
          
          cmsPlaces = placesItems.map((item) => ({
            id: `cms-place-${item.id || item.slug}`,
            title: item.title,
            content: item.preview || '',
            preview: item.preview,
            type: 'place' as const,
            source: 'cms' as const,
            authorName: 'PattiBytes',
            imageUrl: item.image,
            location: item.location || 'Patti, Punjab',
            createdAt: new Date(item.date),
            likesCount: 0,
            commentsCount: 0,
            sharesCount: 0,
            url: item.url || `/place/${item.id || item.slug}`
          }));
        }

        const notifRes = await fetch(`${ORIGIN}/notifications/index.json`, { cache: 'no-store' });
        if (notifRes.ok) {
          const notifData = await notifRes.json();
          const notifications = Array.isArray(notifData) ? notifData : (notifData.items || []);
          if (notifications.length > 0) {
            setUrgentNotification(notifications[0]);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch CMS content:', err);
      }

      const allPosts = [...userPosts, ...cmsNews, ...cmsPlaces];
      allPosts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const filteredPosts = filter === 'all' 
        ? allPosts 
        : filter === 'user-content'
        ? userPosts
        : allPosts.filter(post => {
            if (filter === 'news') return post.type === 'news';
            if (filter === 'places') return post.type === 'place';
            if (filter === 'writings') return post.type === 'writing';
            return true;
          });

      setPosts(filteredPosts.slice(0, 100));
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleLike = async (postId: string, currentLikes: string[] = []) => {
    if (!user) {
      toast.error('Please login to like posts');
      return;
    }

    try {
      const { db } = getFirebaseClient();
      if (!db) throw new Error('Firestore not initialized');

      const postRef = doc(db, 'posts', postId);
      const isLiked = currentLikes.includes(user.uid);

      if (isLiked) {
        await updateDoc(postRef, {
          likes: arrayRemove(user.uid),
          likesCount: Math.max(0, currentLikes.length - 1)
        });
      } else {
        await updateDoc(postRef, {
          likes: arrayUnion(user.uid),
          likesCount: currentLikes.length + 1
        });
      }

      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          const newLikes = isLiked 
            ? currentLikes.filter(id => id !== user.uid)
            : [...currentLikes, user.uid];
          return {
            ...p,
            likes: newLikes,
            likesCount: newLikes.length
          };
        }
        return p;
      }));

      toast.success(isLiked ? 'Unliked' : 'Liked!');
    } catch (error) {
      console.error('Like error:', error);
      toast.error('Failed to update like');
    }
  };

  const handleShare = async (post: Post) => {
    const shareUrl = post.url || `${window.location.origin}/posts/${post.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.preview || post.content.substring(0, 100),
          url: shareUrl
        });
        
        if (post.source === 'user') {
          const { db } = getFirebaseClient();
          if (db) {
            await updateDoc(doc(db, 'posts', post.id), {
              sharesCount: post.sharesCount + 1
            });
          }
        }
      } catch (error) {
        console.error('Share error:', error);
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard!');
    }
  };

  const getPostIcon = (type: string) => {
    switch (type) {
      case 'news': return <FaNewspaper />;
      case 'place': return <FaMapMarkerAlt />;
      case 'writing': return <FaPen />;
      default: return null;
    }
  };

  return (
    <AuthGuard>
      <Layout title="Dashboard - PattiBytes">
        <div className={styles.dashboard}>
          <AnimatePresence>
            {urgentNotification && showNotification && (
              <motion.div
                className={styles.urgentBanner}
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
              >
                <FaBell className={styles.bellIcon} />
                <div className={styles.bannerContent}>
                  <h4>{urgentNotification.title}</h4>
                  <p>{urgentNotification.message}</p>
                  {urgentNotification.target_url && (
                    <a href={urgentNotification.target_url} target="_blank" rel="noopener noreferrer">
                      View Details →
                    </a>
                  )}
                </div>
                <button onClick={() => setShowNotification(false)} className={styles.closeBanner}>
                  <FaTimes />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <BytesStories />

          <div className={styles.header}>
            <h2>Community Feed</h2>
            <Link href="/create" className={styles.createBtn}>
              <FaPlus /> Create
            </Link>
          </div>

          <div className={styles.filterTabs}>
            <button className={`${styles.tab} ${filter === 'all' ? styles.activeTab : ''}`} onClick={() => setFilter('all')}>All</button>
            <button className={`${styles.tab} ${filter === 'news' ? styles.activeTab : ''}`} onClick={() => setFilter('news')}><FaNewspaper /> News</button>
            <button className={`${styles.tab} ${filter === 'places' ? styles.activeTab : ''}`} onClick={() => setFilter('places')}><FaMapMarkerAlt /> Places</button>
            <button className={`${styles.tab} ${filter === 'writings' ? styles.activeTab : ''}`} onClick={() => setFilter('writings')}><FaPen /> Writings</button>
            <button className={`${styles.tab} ${filter === 'user-content' ? styles.activeTab : ''}`} onClick={() => setFilter('user-content')}><FaVideo /> User Content</button>
          </div>

          <div className={styles.feed}>
            {loading ? (
              <div className={styles.loading}>
                <div className={styles.spinner} />
                <p>Loading posts...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className={styles.empty}>
                <FaPen className={styles.emptyIcon} />
                <p>No posts yet</p>
                <Link href="/create" className={styles.emptyBtn}>Create First Post</Link>
              </div>
            ) : (
              posts.map((post, index) => (
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
                        <SafeImage src={post.authorPhoto || '/images/default-avatar.png'} alt={post.authorName} width={40} height={40} className={styles.authorAvatar} />
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
                    <div className={styles.postType}>{getPostIcon(post.type)}<span>{post.type}</span></div>
                  </div>

                  {post.imageUrl && (
                    <div className={styles.postImage}>
                      <SafeImage src={post.imageUrl} alt={post.title} width={600} height={400} className={styles.image} />
                    </div>
                  )}

                  <div className={styles.postContent}>
                    <h3>{post.title}</h3>
                    {post.location && <p className={styles.location}><FaMapMarkerAlt /> {post.location}</p>}
                    <p>{post.preview || post.content.substring(0, 200)}...</p>
                    <Link href={post.url || `/posts/${post.id}`} className={styles.readMore} {...(post.source === 'cms' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                      Read More →
                    </Link>
                  </div>

                  <div className={styles.postActions}>
                    <button 
                      className={`${styles.actionButton} ${post.likes?.includes(user?.uid || '') ? styles.liked : ''}`}
                      onClick={() => handleLike(post.id, post.likes)}
                      disabled={post.source === 'cms'}
                    >
                      <FaHeart />
                      <span>{post.likesCount || 0}</span>
                    </button>
                    <Link href={`/posts/${post.id}#comments`} className={styles.actionButton}>
                      <FaComment />
                      <span>{post.commentsCount || 0}</span>
                    </Link>
                    <button className={styles.actionButton} onClick={() => handleShare(post)}>
                      <FaShare />
                      <span>{post.sharesCount || 0}</span>
                    </button>
                  </div>

                  <div className={styles.postFooter}>
                    <span>{post.createdAt.toLocaleDateString()}</span>
                    {post.source === 'cms' && <span className={styles.officialBadge}>Official</span>}
                  </div>
                </motion.article>
              ))
            )}
          </div>
        </div>
      </Layout>
    </AuthGuard>
  );
}
