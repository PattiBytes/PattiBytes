import { useEffect, useState, useCallback } from 'react';
import { collection, query, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import SafeImage from '@/components/SafeImage';
import { motion } from 'framer-motion';
import { FaMapMarkerAlt, FaNewspaper, FaHeart, FaComment, FaShare, FaPen, FaPlus } from 'react-icons/fa';
import Link from 'next/link';
import styles from '@/styles/Dashboard.module.css';

interface Post {
  id: string;
  title: string;
  content: string;
  preview?: string;
  type: 'news' | 'place' | 'writing';
  source: 'cms' | 'user';
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
}

export default function Dashboard() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'news' | 'places' | 'writings'>('all');

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      const { db } = getFirebaseClient();
      if (!db) throw new Error('Firestore not initialized');
      
      const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(20));
      const snapshot = await getDocs(postsQuery);
      
      const userPosts = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          source: 'user' as const,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date()
        };
      }) as Post[];

      const filteredPosts = filter === 'all' 
        ? userPosts 
        : userPosts.filter(post => {
            if (filter === 'news') return post.type === 'news';
            if (filter === 'places') return post.type === 'place';
            if (filter === 'writings') return post.type === 'writing';
            return true;
          });

      setPosts(filteredPosts);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

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
          <div className={styles.header}>
            <h1>Feed</h1>
            <Link href="/create" className={styles.createBtn}>
              <FaPlus /> Create Post
            </Link>
          </div>

          <div className={styles.filterTabs}>
            <button
              className={`${styles.tab} ${filter === 'all' ? styles.activeTab : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              className={`${styles.tab} ${filter === 'news' ? styles.activeTab : ''}`}
              onClick={() => setFilter('news')}
            >
              <FaNewspaper /> News
            </button>
            <button
              className={`${styles.tab} ${filter === 'places' ? styles.activeTab : ''}`}
              onClick={() => setFilter('places')}
            >
              <FaMapMarkerAlt /> Places
            </button>
            <button
              className={`${styles.tab} ${filter === 'writings' ? styles.activeTab : ''}`}
              onClick={() => setFilter('writings')}
            >
              <FaPen /> Writings
            </button>
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
                <Link href="/create" className={styles.emptyBtn}>
                  Create First Post
                </Link>
              </div>
            ) : (
              posts.map((post, index) => (
                <motion.article
                  key={post.id}
                  className={styles.postCard}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className={styles.postHeader}>
                    {post.source === 'user' && post.authorUsername ? (
                      <Link href={`/user/${post.authorUsername}`} className={styles.author}>
                        <SafeImage
                          src={post.authorPhoto}
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
                        <div className={styles.authorAvatarPlaceholder}>
                          {post.authorName.charAt(0).toUpperCase()}
                        </div>
                        <div className={styles.authorInfo}>
                          <h4>{post.authorName}</h4>
                          <p className={styles.cmsLabel}>Official</p>
                        </div>
                      </div>
                    )}

                    <div className={styles.postType}>
                      {getPostIcon(post.type)}
                      <span>{post.type}</span>
                    </div>
                  </div>

                  {post.imageUrl && (
                    <div className={styles.postImage}>
                      <SafeImage
                        src={post.imageUrl}
                        alt={post.title}
                        width={600}
                        height={400}
                        className={styles.image}
                      />
                    </div>
                  )}

                  <div className={styles.postContent}>
                    <h2>{post.title}</h2>
                    {post.location && (
                      <p className={styles.location}>
                        <FaMapMarkerAlt /> {post.location}
                      </p>
                    )}
                    <p>{post.preview || post.content.substring(0, 200)}...</p>
                    <Link href={`/${post.type}/${post.id}`} className={styles.readMore}>
                      Read More →
                    </Link>
                  </div>

                  <div className={styles.postActions}>
                    <button className={styles.actionButton}>
                      <FaHeart />
                      <span>{post.likesCount || 0}</span>
                    </button>
                    <button className={styles.actionButton}>
                      <FaComment />
                      <span>{post.commentsCount || 0}</span>
                    </button>
                    <button className={styles.actionButton}>
                      <FaShare />
                      <span>{post.sharesCount || 0}</span>
                    </button>
                  </div>

                  <div className={styles.postFooter}>
                    <span>{post.createdAt.toLocaleDateString()}</span>
                    {post.source === 'cms' && (
                      <span className={styles.officialBadge}>Official</span>
                    )}
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
