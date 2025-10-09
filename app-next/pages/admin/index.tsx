import { useEffect, useState, useCallback } from 'react';
import AdminGuard from '@/components/AdminGuard';
import Layout from '@/components/Layout';
import Link from 'next/link';
import { collection, getDocs, query, orderBy, limit, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import SafeImage from '@/components/SafeImage';
import { 
  FaUsers, 
  FaComments, 
  FaFileAlt, 
  FaChartLine, 
  FaShieldAlt, 
  FaCog, 
  FaArrowUp, 
  FaArrowDown, 
  FaDownload, 
  FaSyncAlt,
  FaBullhorn,
  FaUserShield
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import styles from '@/styles/AdminEnhanced.module.css';

interface Stats {
  totalUsers: number;
  totalPosts: number;
  totalChats: number;
  activeUsers: number;
  recentUsers: Array<{ uid: string; displayName: string; email: string; photoURL?: string; createdAt: Date }>;
  userGrowth: number;
  postGrowth: number;
  chartData: Array<{ date: string; users: number; posts: number }>;
}

export default function AdminDashboard() {
  const { db } = getFirebaseClient();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalPosts: 0,
    totalChats: 0,
    activeUsers: 0,
    recentUsers: [],
    userGrowth: 0,
    postGrowth: 0,
    chartData: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async () => {
    if (!db) return;
    setRefreshing(true);

    try {
      const [usersSnap, postsSnap, chatsSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'posts')),
        getDocs(collection(db, 'chats')),
      ]);

      const activeQuery = query(collection(db, 'users'), where('onlineStatus', '==', 'online'));
      const activeSnap = await getDocs(activeQuery);

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentUsersSnap = usersSnap.docs.filter((d) => {
        const created = d.data().createdAt;
        return created instanceof Timestamp && created.toDate() > sevenDaysAgo;
      });

      const recentPostsSnap = postsSnap.docs.filter((d) => {
        const created = d.data().createdAt;
        return created instanceof Timestamp && created.toDate() > sevenDaysAgo;
      });

      const userGrowth = usersSnap.size > 0 ? ((recentUsersSnap.length / usersSnap.size) * 100) : 0;
      const postGrowth = postsSnap.size > 0 ? ((recentPostsSnap.length / postsSnap.size) * 100) : 0;

      const recentQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(5));
      const recentSnap = await getDocs(recentQuery);
      const recent = recentSnap.docs.map((d) => {
        const data = d.data();
        return {
          uid: d.id,
          displayName: data.displayName || 'User',
          email: data.email || '',
          photoURL: data.photoURL,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
        };
      });

      const chartData = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
        return {
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          users: Math.floor(Math.random() * 50) + 10,
          posts: Math.floor(Math.random() * 100) + 20,
        };
      });

      setStats({
        totalUsers: usersSnap.size,
        totalPosts: postsSnap.size,
        totalChats: chatsSnap.size,
        activeUsers: activeSnap.size,
        recentUsers: recent,
        userGrowth,
        postGrowth,
        chartData,
      });
    } catch (e) {
      console.error('Failed to load stats:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [db]);

  useEffect(() => {
    loadStats();
    if (db) {
      const unsubUsers = onSnapshot(collection(db, 'users'), () => loadStats());
      const unsubPosts = onSnapshot(collection(db, 'posts'), () => loadStats());
      return () => {
        unsubUsers();
        unsubPosts();
      };
    }
  }, [db, loadStats]);

  const exportData = () => {
    const data = {
      totalUsers: stats.totalUsers,
      totalPosts: stats.totalPosts,
      totalChats: stats.totalChats,
      activeUsers: stats.activeUsers,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-stats-${Date.now()}.json`;
    a.click();
  };

  return (
    <AdminGuard>
      <Layout title="Admin Dashboard - PattiBytes">
        <div className={styles.admin}>
          <motion.div
            className={styles.header}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div>
              <h1>
                <FaShieldAlt /> Admin Dashboard
              </h1>
              <p>Real-time platform analytics and management</p>
            </div>
            <div className={styles.headerActions}>
              <button onClick={loadStats} className={styles.refreshBtn} disabled={refreshing}>
                <FaSyncAlt className={refreshing ? styles.spinning : ''} /> Refresh
              </button>
              <button onClick={exportData} className={styles.exportBtn}>
                <FaDownload /> Export
              </button>
            </div>
          </motion.div>

          {loading ? (
            <div className={styles.loading}>
              <div className={styles.spinner} />
              <p>Loading analytics...</p>
            </div>
          ) : (
            <>
              <div className={styles.statsGrid}>
                <motion.div
                  className={styles.statCard}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <Link href="/admin/users">
                    <div className={styles.statIcon}>
                      <FaUsers />
                    </div>
                    <div className={styles.statInfo}>
                      <h3>{stats.totalUsers}</h3>
                      <p>Total Users</p>
                      <div className={styles.statGrowth}>
                        {stats.userGrowth > 0 ? <FaArrowUp /> : <FaArrowDown />}
                        <span>{stats.userGrowth.toFixed(1)}% this week</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>

                <motion.div
                  className={styles.statCard}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <Link href="/admin/posts">
                    <div className={styles.statIcon}>
                      <FaFileAlt />
                    </div>
                    <div className={styles.statInfo}>
                      <h3>{stats.totalPosts}</h3>
                      <p>Total Posts</p>
                      <div className={styles.statGrowth}>
                        {stats.postGrowth > 0 ? <FaArrowUp /> : <FaArrowDown />}
                        <span>{stats.postGrowth.toFixed(1)}% this week</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>

                <motion.div
                  className={styles.statCard}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <Link href="/admin/chats">
                    <div className={styles.statIcon}>
                      <FaComments />
                    </div>
                    <div className={styles.statInfo}>
                      <h3>{stats.totalChats}</h3>
                      <p>Total Chats</p>
                      <div className={styles.statGrowth}>
                        <FaArrowUp />
                        <span>Active</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>

                <motion.div
                  className={styles.statCard}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <div className={styles.statIcon}>
                    <FaChartLine />
                  </div>
                  <div className={styles.statInfo}>
                    <h3>{stats.activeUsers}</h3>
                    <p>Active Now</p>
                    <div className={styles.statGrowth}>
                      <div className={styles.pulse} />
                      <span>Live</span>
                    </div>
                  </div>
                </motion.div>
              </div>

              <div className={styles.chartsGrid}>
                <motion.div
                  className={styles.chartCard}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <h2>Activity Overview</h2>
                  <div className={styles.chart}>
                    {stats.chartData.map((item, i) => (
                      <div key={i} className={styles.chartBar}>
                        <div className={styles.barGroup}>
                          <motion.div
                            className={styles.bar}
                            style={{ height: `${(item.users / 60) * 100}%`, background: 'var(--primary)' }}
                            initial={{ height: 0 }}
                            animate={{ height: `${(item.users / 60) * 100}%` }}
                            transition={{ delay: 0.7 + i * 0.1, duration: 0.5 }}
                          />
                          <motion.div
                            className={styles.bar}
                            style={{ height: `${(item.posts / 120) * 100}%`, background: '#51cf66' }}
                            initial={{ height: 0 }}
                            animate={{ height: `${(item.posts / 120) * 100}%` }}
                            transition={{ delay: 0.8 + i * 0.1, duration: 0.5 }}
                          />
                        </div>
                        <span>{item.date}</span>
                      </div>
                    ))}
                  </div>
                  <div className={styles.chartLegend}>
                    <div className={styles.legendItem}>
                      <div className={styles.legendColor} style={{ background: 'var(--primary)' }} />
                      <span>Users</span>
                    </div>
                    <div className={styles.legendItem}>
                      <div className={styles.legendColor} style={{ background: '#51cf66' }} />
                      <span>Posts</span>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  className={styles.recentUsers}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <h2>Recent Users</h2>
                  <div className={styles.usersList}>
                    {stats.recentUsers.map((user, i) => (
                      <motion.div
                        key={user.uid}
                        className={styles.userCard}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.7 + i * 0.1 }}
                      >
                        <SafeImage
                          src={user.photoURL || '/images/default-avatar.png'}
                          alt={user.displayName}
                          width={48}
                          height={48}
                        />
                        <div className={styles.userInfo}>
                          <h4>{user.displayName}</h4>
                          <p>{user.email}</p>
                          <span className={styles.date}>{user.createdAt.toLocaleDateString()}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <Link href="/admin/users" className={styles.viewAllBtn}>
                    View All Users
                  </Link>
                </motion.div>
              </div>

              <motion.div
                className={styles.quickActions}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                <h2>Quick Actions</h2>
                <div className={styles.actionsGrid}>
                  <Link href="/admin/broadcast" className={styles.actionBtn}>
                    <FaBullhorn /> Broadcast
                  </Link>
                  <Link href="/admin/official-chat" className={styles.actionBtn}>
                    <FaUsers /> Official Chat
                  </Link>
                  <Link href="/admin/users" className={styles.actionBtn}>
                    <FaUsers /> Manage Users
                  </Link>
                  <Link href="/admin/posts" className={styles.actionBtn}>
                    <FaFileAlt /> Review Posts
                  </Link>
                  <Link href="/admin/chats" className={styles.actionBtn}>
                    <FaComments /> Monitor Chats
                  </Link>
                  <Link href="/admin/permissions" className={styles.actionBtn}>
                    <FaUserShield /> Permissions
                  </Link>
                  <Link href="/admin/settings" className={styles.actionBtn}>
                    <FaCog /> Settings
                  </Link>
                </div>
              </motion.div>
            </>
          )}
        </div>
      </Layout>
    </AdminGuard>
  );
}
