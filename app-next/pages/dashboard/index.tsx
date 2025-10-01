import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';

type Post = { 
  id: string; 
  text: string; 
  timestamp: Timestamp | null;
};

export default function Dashboard() {
  const { user } = useAuth();
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    const fetchRecentPosts = async () => {
      // Type guard: ensure both user and db exist before using Firestore
      if (!db) {
        console.warn('Firestore not initialized');
        setLoading(false);
        return;
      }

      try {
        const q = query(
          collection(db, 'posts'), 
          where('uid', '==', user.uid), 
          orderBy('timestamp', 'desc'), 
          limit(5)
        );
        const snap = await getDocs(q);
        const posts = snap.docs.map(d => ({
          id: d.id,
          text: d.data().text || '',
          timestamp: d.data().timestamp || null
        }));
        setRecentPosts(posts);
      } catch (error) {
        console.error('Error fetching posts:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRecentPosts();
  }, [user]);

  return (
    <DashboardLayout>
      <div className="dashboard-home">
        <div className="welcome-section">
          <h1>ਸਤ ਸ੍ਰੀ ਅਕਾਲ! 👋</h1>
          <p>Welcome back to your PattiBytes dashboard</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📝</div>
            <div className="stat-content">
              <h3>Your Posts</h3>
              <p className="stat-number">{recentPosts.length}</p>
              <span className="stat-label">Total posts</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">📰</div>
            <div className="stat-content">
              <h3>Latest News</h3>
              <p className="stat-number">Fresh</p>
              <Link href="/dashboard/news" className="stat-link">View updates</Link>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <h3>Community</h3>
              <p className="stat-number">Active</p>
              <span className="stat-label">Join conversations</span>
            </div>
          </div>
        </div>
        
        <section className="recent-activity">
          <div className="section-header">
            <h2>Your Recent Posts</h2>
          </div>
          
          {loading ? (
            <div className="loading-posts">
              <p>Loading your posts...</p>
            </div>
          ) : !db ? (
            <div className="empty-state">
              <div className="empty-icon">⚠️</div>
              <h3>Service Unavailable</h3>
              <p>Database connection is not available. Please try again later.</p>
            </div>
          ) : recentPosts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✨</div>
              <h3>No posts yet</h3>
              <p>Start sharing your thoughts with the community!</p>
            </div>
          ) : (
            <div className="posts-preview">
              {recentPosts.map(post => (
                <div key={post.id} className="post-preview">
                  <div className="post-content">
                    <p>{post.text}</p>
                  </div>
                  <div className="post-meta">
                    <time>
                      {post.timestamp?.toDate?.()?.toLocaleDateString('pa-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) || 'Unknown date'}
                    </time>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="action-buttons">
            <Link href="/dashboard/news" className="action-card">
              <div className="action-icon">📰</div>
              <h3>News</h3>
              <p>Stay updated with latest</p>
            </Link>
            
            <Link href="/account" className="action-card">
              <div className="action-icon">👤</div>
              <h3>Profile</h3>
              <p>Manage your account</p>
            </Link>
            
            <div className="action-card" style={{ opacity: 0.6 }}>
              <div className="action-icon">📱</div>
              <h3>Timeline</h3>
              <p>Coming soon</p>
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
