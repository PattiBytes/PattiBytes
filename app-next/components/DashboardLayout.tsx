// /app-next/components/DashboardLayout.tsx
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/auth/login');
  }, [loading, user, router]);

  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return null;

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>PattiBytes</h2>
        </div>
        <nav className="sidebar-nav">
          <Link href="/dashboard" className={router.pathname === '/dashboard' ? 'active' : ''}>
            🏠 Dashboard
          </Link>
          <Link href="/dashboard/news" className={router.pathname === '/dashboard/news' ? 'active' : ''}>
            📰 News
          </Link>
          <Link href="/dashboard/timeline" className={router.pathname === '/dashboard/timeline' ? 'active' : ''}>
            📱 Timeline
          </Link>
          <Link href="/account" className={router.pathname === '/account' ? 'active' : ''}>
            👤 Profile
          </Link>
        </nav>
        <div className="sidebar-footer">
          <button onClick={() => logout()}>Logout</button>
        </div>
      </aside>
      <main className="main-content">
        <header className="main-header">
          <h1>Welcome, {user.displayName || user.email}</h1>
        </header>
        <div className="content">
          {children}
        </div>
      </main>
    </div>
  );
}
