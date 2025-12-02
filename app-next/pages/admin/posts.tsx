// app-next/pages/admin/posts.tsx - FIXED & COMPLETE
import { useEffect, useState, useCallback } from 'react';
import AdminGuard from '@/components/AdminGuard';
import Layout from '@/components/Layout';
import SafeImage from '@/components/SafeImage';
import {
  collection,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  doc,
  Timestamp,
  limit,
} from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import {
  FaSearch,
  FaTrash,
  FaFileAlt,
  FaEye,
  FaHeart,
  FaComment,
  FaSyncAlt,
  FaFilter,
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '@/styles/AdminPosts.module.css';
import Link from 'next/link';

interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  title: string;
  content: string;
  imageUrl?: string;
  type?: 'writing' | 'news' | 'place' | 'video';
  createdAt: Date;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  isDraft?: boolean;
  isOfficial?: boolean;
}

type PostFilter = 'all' | 'recent' | 'popular' | 'drafts' | 'official';
type PostSort = 'recent' | 'popular';

export default function PostsModeration() {
  const { db } = getFirebaseClient();
  const [posts, setPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<PostFilter>('all');
  const [sortBy, setSortBy] = useState<PostSort>('recent');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const loadPosts = useCallback(async () => {
    if (!db) return;
    try {
      const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(500));
      const snap = await getDocs(q);
      const list: Post[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          authorId: data.authorId || '',
          authorName: data.authorName || 'Unknown',
          authorPhoto: data.authorPhoto,
          title: data.title || 'Untitled',
          content: data.content || '',
          imageUrl: data.imageUrl,
          type: (data.type as Post['type']) || 'writing',
          createdAt:
            data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
          viewsCount: data.viewsCount || 0,
          likesCount: data.likesCount || 0,
          commentsCount: data.commentsCount || 0,
          isDraft: data.isDraft || false,
          isOfficial: data.isOfficial || false,
        };
      });
      setPosts(list);
      applyFilters(list, searchQuery, filter, sortBy);
    } catch {
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [db, filter, searchQuery, sortBy]);

  const applyFilters = (
    postList: Post[],
    search: string,
    filterType: PostFilter,
    sort: PostSort
  ) => {
    let filtered = postList;

    if (filterType === 'popular') {
      filtered = filtered.sort((a, b) => b.viewsCount - a.viewsCount).slice(0, 50);
    } else if (filterType === 'recent') {
      // Already sorted by recent
    } else if (filterType === 'drafts') {
      filtered = filtered.filter((p) => p.isDraft);
    } else if (filterType === 'official') {
      filtered = filtered.filter((p) => p.isOfficial);
    }

    if (search.trim()) {
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(search.toLowerCase()) ||
          p.content.toLowerCase().includes(search.toLowerCase()) ||
          p.authorName.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (sort === 'popular') {
      filtered.sort((a, b) => b.viewsCount - a.viewsCount);
    }

    setFilteredPosts(filtered);
  };

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    applyFilters(posts, searchQuery, filter, sortBy);
  }, [searchQuery, filter, sortBy, posts]);

  const handleDeletePost = async (post: Post) => {
    if (!window.confirm(`Delete post by ${post.authorName}?\n\n"${post.title}"`)) return;

    try {
      if (!db) return;
      await deleteDoc(doc(db, 'posts', post.id));
      toast.success('Post deleted successfully');
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
    } catch {
      toast.error('Failed to delete post');
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = {
        exportDate: new Date().toISOString(),
        totalPosts: filteredPosts.length,
        posts: filteredPosts.map((p) => ({
          id: p.id,
          title: p.title,
          author: p.authorName,
          type: p.type,
          status: p.isDraft ? 'draft' : 'published',
          views: p.viewsCount,
          engagement: p.likesCount + p.commentsCount,
          createdDate: p.createdAt.toISOString(),
        })),
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `posts-export-${Date.now()}.json`;
      a.click();
      toast.success('Posts exported successfully');
    } catch {
      toast.error('Failed to export posts');
    } finally {
      setExporting(false);
    }
  };

  const getPostTypeColor = (type?: string) => {
    const colors: Record<string, string> = {
      writing: '#667eea',
      news: '#51cf66',
      place: '#ff922b',
      video: '#f06595',
    };
    return colors[type || 'writing'] || '#667eea';
  };

  return (
    <AdminGuard>
      <Layout title="Posts Moderation - Admin">
        <div className={styles.container}>
          {/* Header */}
          <motion.div
            className={styles.header}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div>
              <h1>
                <FaFileAlt /> Posts Moderation
              </h1>
              <p>Review, manage, and moderate all user posts</p>
            </div>
            <div className={styles.headerActions}>
              <button onClick={loadPosts} className={styles.refreshBtn} title="Refresh">
                <FaSyncAlt />
              </button>
              <button onClick={handleExport} disabled={exporting} className={styles.exportBtn}>
                Export
              </button>
            </div>
          </motion.div>

          {/* Controls */}
          <motion.div
            className={styles.controls}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className={styles.searchBox}>
              <FaSearch />
              <input
                type="text"
                placeholder="Search by title, content, or author..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className={styles.filterGroup}>
              <FaFilter />
              <select value={filter} onChange={(e) => setFilter(e.target.value as PostFilter)}>
                <option value="all">All Posts ({posts.length})</option>
                <option value="recent">Most Recent</option>
                <option value="popular">Most Popular</option>
                <option value="drafts">Drafts ({posts.filter((p) => p.isDraft).length})</option>
                <option value="official">Official ({posts.filter((p) => p.isOfficial).length})</option>
              </select>
            </div>

            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as PostSort)}>
              <option value="recent">Sort: Recent</option>
              <option value="popular">Sort: Popular</option>
            </select>
          </motion.div>

          {/* Posts Grid */}
          {loading ? (
            <div className={styles.loading}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1 }}
              >
                <FaSyncAlt />
              </motion.div>
              <p>Loading posts...</p>
            </div>
          ) : (
            <motion.div
              className={styles.postsGrid}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <AnimatePresence>
                {filteredPosts.map((post, idx) => (
                  <motion.div
                    key={post.id}
                    className={styles.postCard}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ translateY: -5, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
                  >
                    <div className={styles.postImage}>
                      {post.imageUrl ? (
                        <SafeImage
                          src={post.imageUrl}
                          alt={post.title}
                          width={400}
                          height={250}
                        />
                      ) : (
                        <div className={styles.imagePlaceholder}>
                          <FaFileAlt />
                        </div>
                      )}
                      <div className={styles.badges}>
                        {post.isDraft && <span className={styles.draftBadge}>Draft</span>}
                        {post.isOfficial && <span className={styles.officialBadge}>Official</span>}
                        <span
                          className={styles.typeBadge}
                          style={{ background: getPostTypeColor(post.type) }}
                        >
                          {post.type || 'post'}
                        </span>
                      </div>
                    </div>

                    <div className={styles.postContent}>
                      <div className={styles.author}>
                        <SafeImage
                          src={post.authorPhoto || '/images/default-avatar.png'}
                          alt={post.authorName}
                          width={36}
                          height={36}
                        />
                        <div>
                          <div className={styles.authorName}>{post.authorName}</div>
                          <div className={styles.authorDate}>
                            {post.createdAt.toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <h3 className={styles.title}>{post.title}</h3>
                      <p className={styles.description}>{post.content.substring(0, 100)}...</p>

                      <div className={styles.stats}>
                        <span>
                          <FaEye /> {post.viewsCount}
                        </span>
                        <span>
                          <FaHeart /> {post.likesCount}
                        </span>
                        <span>
                          <FaComment /> {post.commentsCount}
                        </span>
                      </div>

                      <div className={styles.actions}>
                        <Link href={`/posts/${post.id}`} className={styles.viewBtn}>
                          View
                        </Link>
                        <button
                          onClick={() => handleDeletePost(post)}
                          className={styles.deleteBtn}
                          title="Delete Post"
                        >
                          <FaTrash /> Delete
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}

          {filteredPosts.length === 0 && !loading && (
            <div className={styles.emptyState}>
              <FaFileAlt />
              <h3>No posts found</h3>
              <p>Try adjusting your filters or search query</p>
            </div>
          )}
        </div>
      </Layout>
    </AdminGuard>
  );
}
