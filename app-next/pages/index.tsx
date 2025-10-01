import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Link from 'next/link';
import { useInstall } from '@/components/InstallPromptProvider';

export default function Home() {
  const { user, loading } = useAuth();
  const { canInstall, promptInstall } = useInstall();
  const router = useRouter();

  useEffect(() => {
    // Auto-redirect logged-in users to dashboard
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <h1>PattiBytes</h1>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect to dashboard
  }

  return (
    <main className="landing-page">
      <div className="landing-container">
        <header className="landing-header">
          <div className="logo-section">
            <h1 className="app-title">
              <span className="punjabi-text">ਪੱਟੀ ਬਾਈਟਸ</span>
              <span className="english-text">PattiBytes</span>
            </h1>
            <p className="app-subtitle">Latest Patti news, places, and community services</p>
          </div>
          
          {canInstall && (
            <div className="install-section">
              <button onClick={promptInstall} className="install-btn">
                📱 Install App
              </button>
            </div>
          )}
        </header>

        <div className="features-section">
          <div className="feature-card">
            <div className="feature-icon">📰</div>
            <h3>Latest News</h3>
            <p>Stay updated with the latest news from Patti and surrounding areas</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">🗺️</div>
            <h3>Local Places</h3>
            <p>Discover famous places and hidden gems in Patti</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">👥</div>
            <h3>Community</h3>
            <p>Connect with the local community and share your thoughts</p>
          </div>
        </div>

        <div className="auth-actions">
          <Link href="/auth/login" className="btn-primary">
            Sign In
          </Link>
          <Link href="/auth/register" className="btn-secondary">
            Create Account
          </Link>
        </div>

        <div className="website-link">
          <p>
            Want to browse without signing in? 
            <a href="https://www.pattibytes.com" target="_blank" rel="noopener">
              Visit our main website
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
