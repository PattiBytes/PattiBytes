import { useEffect, useState } from 'react';
import AdminGuard from '@/components/AdminGuard';
import Layout from '@/components/Layout';
import SafeImage from '@/components/SafeImage';
import { collection, getDocs, query, orderBy, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import { FaSearch, FaTrash, FaFileAlt } from 'react-icons/fa';
import toast from 'react-hot-toast';
import styles from '@/styles/Admin.module.css';

interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  content: string;
  imageUrl?: string;
  createdAt: Date;
  likesCount: number;
  commentsCount: number;
}

export default function PostsModeration() {
  const { db } = getFirebaseClient();
  const [posts, setPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const loadPosts = async () => {
      try {
        const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            authorId: data.authorId || '',
            authorName: data.authorName || 'Unknown',
            authorPhoto: data.authorPhoto,
            content: data.content || '',
            imageUrl: data.imageUrl,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
            likesCount: data.likesCount || 0,
            commentsCount: data.commentsCount || 0,
          };
        });
        setPosts(list);
        setFilteredPosts(list);
      } catch (e) {
        console.error('Failed to load posts:', e);
        toast.error('Failed to load posts');
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, [db]);

  useEffect(() => {
    const filtered = posts.filter(
      (p) =>
        p.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.authorName.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredPosts(filtered);
  }, [searchQuery, posts]);

  const handleDeletePost = async (post: Post) => {
    if (!confirm(`Delete post by ${post.authorName}?`)) return;

    try {
      await deleteDoc(doc(db!, 'posts', post.id));
      toast.success('Post deleted');
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
    } catch (e) {
      console.error('Failed to delete post:', e);
      toast.error('Failed to delete post');
    }
  };

  return (
    <AdminGuard>
      <Layout title="Posts Moderation - Admin">
        <div className={styles.admin}>
          <div className={styles.header}>
            <div>
              <h1><FaFileAlt /> Posts Moderation</h1>
              <p>Review and moderate user posts</p>
            </div>
          </div>

          <div className={styles.searchBox}>
            <FaSearch />
            <input
              type="text"
              placeholder="Search posts by content or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {loading ? (
            <div className={styles.loading}>Loading posts...</div>
          ) : (
            <div className={styles.postsGrid}>
              {filteredPosts.map((post) => (
                <div key={post.id} className={styles.postCard}>
                  <div className={styles.postHeader}>
                    <div className={styles.postAuthor}>
                      <SafeImage
                        src={post.authorPhoto || '/images/default-avatar.png'}
                        alt={post.authorName}
                        width={40}
                        height={40}
                      />
                      <div>
                        <h4>{post.authorName}</h4>
                        <span>{post.createdAt.toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button onClick={() => handleDeletePost(post)} className={styles.deleteBtn} title="Delete Post">
                      <FaTrash />
                    </button>
                  </div>

                  <p className={styles.postContent}>{post.content}</p>

                  {post.imageUrl && (
                    <SafeImage src={post.imageUrl} alt="Post" width={400} height={300} className={styles.postImage} />
                  )}

                  <div className={styles.postFooter}>
                    <span>{post.likesCount} likes</span>
                    <span>{post.commentsCount} comments</span>
                  </div>
                </div>
              ))}
              {filteredPosts.length === 0 && <p className={styles.noData}>No posts found</p>}
            </div>
          )}
        </div>
      </Layout>
    </AdminGuard>
  );
}
