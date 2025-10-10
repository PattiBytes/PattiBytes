// pages/notifications/index.tsx
import { useEffect, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import Link from 'next/link';

type CMSNotification = { id: string; title: string; message: string };

export default function NotificationsIndex() {
  const [items, setItems] = useState<CMSNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/cms/notifications', { cache: 'no-store' });
        if (res.ok) setItems(await res.json());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <AuthGuard>
      <Layout title="Notifications - PattiBytes">
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 8px' }}>
          <h1 style={{ margin: '12px 0 16px' }}>Notifications</h1>
          {loading ? (
            <p>Loading…</p>
          ) : items.length === 0 ? (
            <p>No notifications</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {items.map(n => (
                <li key={n.id} style={{
                  border: '1px solid var(--border)', borderRadius: 12, marginBottom: 12,
                  background: 'var(--card-bg)'
                }}>
                  <Link href={`/notifications/${n.id}`} style={{ display: 'block', padding: '12px 14px', textDecoration: 'none', color: 'var(--text)' }}>
                    <strong>{n.title}</strong>
                    <div style={{ color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.6 }}>
                      {n.message}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Layout>
    </AuthGuard>
  );
}
