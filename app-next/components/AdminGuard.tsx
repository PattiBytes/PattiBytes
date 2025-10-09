import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAdmin === false) {
      router.replace('/dashboard');
    }
  }, [isAdmin, loading, router]);

  if (loading || isAdmin === undefined) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '50vh' }}>
        <p>Checking permissions…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '50vh', padding: 16 }}>
        <h2 style={{ color: '#ef4444', marginBottom: 8 }}>Access Denied</h2>
        <p>Insufficient permissions to view this area.</p>
      </div>
    );
  }

  return <>{children}</>;
}
