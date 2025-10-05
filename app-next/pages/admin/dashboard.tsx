import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { collection, getDocs, query, orderBy, deleteDoc, doc, limit, updateDoc, DocumentData } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import Layout from '@/components/Layout';
import AdminGuard from '@/components/AdminGuard';
import { FaUsers, FaNewspaper, FaTrash, FaEye, FaChartLine, FaBan, FaUnlock } from 'react-icons/fa';
import toast from 'react-hot-toast';
import styles from '@/styles/AdminDashboard.module.css';

interface Stats {
  totalUsers: number;
  totalPosts: number;
  totalBytes: number;
  totalChats: number;
}

interface Post {
  id: string;
  title: string;
  authorName: string;
  type: string;
  createdAt: DocumentData;
}

interface User {
  id: string;
  displayName: string;
  username: string;
  email: string;
  isBlocked?: boolean;
}

export default function AdminDashboard() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, totalPosts: 0, totalBytes: 0, totalChats: 0 });
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'posts' | 'users'>('overview');

  useEffect(() => {
    if (!user) {
      router.push('/admin/login');
      return;
    }

    if (userProfile && userProfile.role !== 'admin') {
      toast.error('Access denied. Admin privileges required.');
      router.push('/dashboard');
      return;
    }

    loadAdminData();
  }, [user, userProfile, router]);

  const loadAdminData = async () => {
    try {
      const { db } = getFirebaseClient();
      if (!db) throw new Error('Firestore not initialized');

      const usersSnap = await getDocs(collection(db, 'users'));
      const postsSnap = await getDocs(collection(db, 'posts'));
      const bytesSnap = await getDocs(collection(db, 'bytes'));
      const chatsSnap = await getDocs(collection(db, 'chats'));

      setStats({
        totalUsers: usersSnap.size,
        totalPosts: postsSnap.size,
        totalBytes: bytesSnap.size,
        totalChats: chatsSnap.size
      });

      const usersData = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as User[];
      setUsers(usersData);

      const recentPostsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(10));
      const recentPostsSnap = await getDocs(recentPostsQuery);
      setRecentPosts(recentPostsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Post[]);
    } catch (err) {
      console.error('Error loading admin data:', err);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const { db } = getFirebaseClient();
      if (!db) throw new Error('Firestore not initialized');
      await deleteDoc(doc(db, 'posts', postId));
      toast.success('Post deleted successfully');
      loadAdminData();
    } catch {
      toast.error('Failed to delete post');
    }
  };

  const handleBlockUser = async (userId: string, isBlocked: boolean) => {
    try {
      const { db } = getFirebaseClient();
      if (!db) throw new Error('Firestore not initialized');
      await updateDoc(doc(db, 'users', userId), { isBlocked: !isBlocked });
      toast.success(isBlocked ? 'User unblocked' : 'User blocked');
      loadAdminData();
    } catch {
      toast.error('Failed to update user status');
    }
  };

  if (loading) {
    return (
      <AdminGuard>
        <Layout title="Loading...">
          <div className={styles.loading}>Loading admin dashboard...</div>
        </Layout>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <Layout title="Admin Dashboard - PattiBytes">
        <div className={styles.adminDashboard}>
          <h1>Admin Dashboard</h1>
          <div className={styles.tabs}>
            <button className={activeTab === 'overview' ? styles.activeTab : ''} onClick={() => setActiveTab('overview')}>Overview</button>
            <button className={activeTab === 'posts' ? styles.activeTab : ''} onClick={() => setActiveTab('posts')}>Posts</button>
            <button className={activeTab === 'users' ? styles.activeTab : ''} onClick={() => setActiveTab('users')}>Users</button>
          </div>

          {activeTab === 'overview' && (
            <div className={styles.statsGrid}>
              <div className={styles.statCard}><FaUsers className={styles.statIcon} /><div><h3>{stats.totalUsers}</h3><p>Total Users</p></div></div>
              <div className={styles.statCard}><FaNewspaper className={styles.statIcon} /><div><h3>{stats.totalPosts}</h3><p>Total Posts</p></div></div>
              <div className={styles.statCard}><FaChartLine className={styles.statIcon} /><div><h3>{stats.totalBytes}</h3><p>Active Bytes</p></div></div>
              <div className={styles.statCard}><div className={styles.statIcon}>💬</div><div><h3>{stats.totalChats}</h3><p>Total Chats</p></div></div>
            </div>
          )}

          {activeTab === 'posts' && (
            <section className={styles.section}>
              <h2>All Posts</h2>
              <div className={styles.postsList}>
                {recentPosts.map(post => (
                  <div key={post.id} className={styles.postItem}>
                    <div className={styles.postInfo}><h3>{post.title}</h3><p>{post.authorName} • {post.type}</p></div>
                    <div className={styles.postActions}>
                      <button onClick={() => router.push(`/posts/${post.id}`)} className={styles.viewBtn}><FaEye /> View</button>
                      <button onClick={() => handleDeletePost(post.id)} className={styles.deleteBtn}><FaTrash /> Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeTab === 'users' && (
            <section className={styles.section}>
              <h2>All Users</h2>
              <div className={styles.usersList}>
                {users.map(u => (
                  <div key={u.id} className={styles.userItem}>
                    <div className={styles.userInfo}>
                      <h3>{u.displayName}</h3>
                      <p>@{u.username} • {u.email}</p>
                      {u.isBlocked && <span className={styles.blockedBadge}>BLOCKED</span>}
                    </div>
                    <div className={styles.userActions}>
                      <button onClick={() => router.push(`/user/${u.username}`)} className={styles.viewBtn}><FaEye /> View</button>
                      <button onClick={() => handleBlockUser(u.id, u.isBlocked || false)} className={u.isBlocked ? styles.unblockBtn : styles.blockBtn}>
                        {u.isBlocked ? <><FaUnlock /> Unblock</> : <><FaBan /> Block</>}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </Layout>
    </AdminGuard>
  );
}
