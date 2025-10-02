import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { isAdmin } from '@/lib/admin';
import { collection, getDocs, query, orderBy, limit, deleteDoc, doc } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import Layout from '@/components/Layout';
import { motion } from 'framer-motion';
import { FaUsers, FaNewspaper, FaChartLine, FaTrash, FaEdit, FaShieldAlt } from 'react-icons/fa';
import styles from '@/styles/Admin.module.css';

interface Stats {
  totalUsers: number;
  totalPosts: number;
  totalNews: number;
  totalPlaces: number;
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
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalPosts: 0,
    totalNews: 0,
    totalPlaces: 0
  });
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);

  const loadStats = async () => {
    try {
      const { db } = getFirebaseClient();
      
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const postsSnapshot = await getDocs(collection(db, 'posts'));
      
      setStats({
        totalUsers: usersSnapshot.size,
        totalPosts: postsSnapshot.size,
        totalNews: 0,
        totalPlaces: 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadRecentPosts = async () => {
    try {
      const { db } = getFirebaseClient();
      
      const postsQuery = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      
      const snapshot = await getDocs(postsQuery);
      const posts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as RecentPost[];
      
      setRecentPosts(posts);
    } catch (error) {
      console.error('Error loading recent posts:', error);
    }
  };

  const checkAdmin = useCallback(async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    const adminStatus = await isAdmin(user.uid);
    if (!adminStatus) {
      router.push('/dashboard');
      return;
    }

    setIsAdminUser(true);
    await loadStats();
    await loadRecentPosts();
    setLoading(false);
  }, [user, router]);

  useEffect(() => {
    checkAdmin();
  }, [checkAdmin]);

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const { db } = getFirebaseClient();
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
      <Layout title="Admin Panel - PattiBytes">
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading admin panel...</p>
        </div>
      </Layout>
    );
  }

  if (!isAdminUser) {
    return null;
  }

  return (
    <Layout title="Admin Panel - PattiBytes">
      <div className={styles.adminPanel}>
        <div className={styles.header}>
          <h1>
            <FaShieldAlt /> Admin Panel
          </h1>
          <p>Manage PattiBytes content and users</p>
        </div>

        <div className={styles.statsGrid}>
          <motion.div 
            className={styles.statCard}
            whileHover={{ scale: 1.05 }}
          >
            <div className={styles.statIcon}>
              <FaUsers />
            </div>
            <div className={styles.statInfo}>
              <h3>{stats.totalUsers}</h3>
              <p>Total Users</p>
            </div>
          </motion.div>

          <motion.div 
            className={styles.statCard}
            whileHover={{ scale: 1.05 }}
          >
            <div className={styles.statIcon}>
              <FaNewspaper />
            </div>
            <div className={styles.statInfo}>
              <h3>{stats.totalPosts}</h3>
              <p>User Posts</p>
            </div>
          </motion.div>

          <motion.div 
            className={styles.statCard}
            whileHover={{ scale: 1.05 }}
          >
            <div className={styles.statIcon}>
              <FaChartLine />
            </div>
            <div className={styles.statInfo}>
              <h3>{stats.totalNews}</h3>
              <p>News Articles</p>
            </div>
          </motion.div>

          <motion.div 
            className={styles.statCard}
            whileHover={{ scale: 1.05 }}
          >
            <div className={styles.statIcon}>
              <FaChartLine />
            </div>
            <div className={styles.statInfo}>
              <h3>{stats.totalPlaces}</h3>
              <p>Places</p>
            </div>
          </motion.div>
        </div>

        <div className={styles.section}>
          <h2>Recent Posts</h2>
          <div className={styles.postsTable}>
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentPosts.map(post => (
                  <tr key={post.id}>
                    <td>{post.title}</td>
                    <td>{post.authorName}</td>
                    <td>
                      <span className={styles.typeBadge}>{post.type}</span>
                    </td>
                    <td>{post.createdAt.toLocaleDateString()}</td>
                    <td>
                      <div className={styles.actions}>
                        <button className={styles.editBtn}>
                          <FaEdit />
                        </button>
                        <button 
                          className={styles.deleteBtn}
                          onClick={() => handleDeletePost(post.id)}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.quickActions}>
          <button 
            className={styles.actionBtn}
            onClick={() => window.open('/admin', '_blank')}
          >
            Open Netlify CMS
          </button>
          <button 
            className={styles.actionBtn}
            onClick={() => router.push('/admin/users')}
          >
            Manage Users
          </button>
          <button 
            className={styles.actionBtn}
            onClick={() => router.push('/admin/analytics')}
          >
            View Analytics
          </button>
        </div>
      </div>
    </Layout>
  );
}
