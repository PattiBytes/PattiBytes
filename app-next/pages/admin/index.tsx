import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { isAdmin } from '@/lib/admin';
import { collection, getDocs, query, orderBy, limit, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import Layout from '@/components/Layout';
import { motion } from 'framer-motion';
import { FaUsers, FaNewspaper, FaTrash, FaShieldAlt } from 'react-icons/fa';
import styles from '@/styles/Admin.module.css';

interface Stats {
  totalUsers: number;
  totalPosts: number;
}

interface RecentPost {
  id: string;
  title: string;
  authorName: string;
  createdAt: Date;
  type: string;
}

export default function AdminPanel() {
  const { user } = useAuth();
  const router = useRouter();
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, totalPosts: 0 });
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);

  const loadStats = async () => {
    const { db } = getFirebaseClient();
    if (!db) throw new Error('Firestore not initialized');

    const usersSnapshot = await getDocs(collection(db, 'users'));
    const postsSnapshot = await getDocs(collection(db, 'posts'));

    setStats({ totalUsers: usersSnapshot.size, totalPosts: postsSnapshot.size });
  };

  const loadRecentPosts = async () => {
    const { db } = getFirebaseClient();
    if (!db) throw new Error('Firestore not initialized');

    const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(10));
    const snapshot = await getDocs(postsQuery);
    const posts = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        title: data.title || 'Untitled',
        authorName: data.authorName || 'Unknown',
        type: data.type || 'post',
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date()
      };
    }) as RecentPost[];
    setRecentPosts(posts);
  };

  const checkAdminStatus = useCallback(async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    if (!isAdmin(user.uid)) {
      router.push('/dashboard');
      return;
    }
    setIsAdminUser(true);
    await loadStats();
    await loadRecentPosts();
    setLoading(false);
  }, [user, router]);

  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

  const handleDeletePost = async (postId: string) => {
    const { db } = getFirebaseClient();
    if (!db) throw new Error('Firestore not initialized');
    if (!confirm('Are you sure?')) return;
    
    try {
      await deleteDoc(doc(db, 'posts', postId));
      await loadRecentPosts();
      await loadStats();
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post');
    }
  };

  if (loading) {
    return (
      <Layout title="Admin Panel">
        <div className={styles.loading}>Loading...</div>
      </Layout>
    );
  }

  if (!isAdminUser) return null;

  return (
    <Layout title="Admin Panel">
      <div className={styles.adminPanel}>
        <div className={styles.header}>
          <h1><FaShieldAlt /> Admin Panel</h1>
          <p>Manage PattiBytes</p>
        </div>

        <div className={styles.statsGrid}>
          <motion.div className={styles.statCard} whileHover={{ scale: 1.02 }}>
            <FaUsers />
            <h3>{stats.totalUsers}</h3>
            <p>Users</p>
          </motion.div>
          <motion.div className={styles.statCard} whileHover={{ scale: 1.02 }}>
            <FaNewspaper />
            <h3>{stats.totalPosts}</h3>
            <p>Posts</p>
          </motion.div>
        </div>

        <div className={styles.section}>
          <h2>Recent Posts</h2>
          <div className={styles.tableWrapper}>
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentPosts.map(post => (
                  <tr key={post.id}>
                    <td>{post.title}</td>
                    <td>{post.authorName}</td>
                    <td>{post.createdAt.toLocaleDateString()}</td>
                    <td>
                      <button 
                        onClick={() => handleDeletePost(post.id)}
                        className={styles.deleteBtn}
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
