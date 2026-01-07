// pages/notifications/index.tsx
import { useEffect, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getFirebaseClient } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type?: string;
  createdAt?: Date;
  postId?: string;
};

export default function NotificationsIndex() {
  const { user } = useAuth();
  const { db } = getFirebaseClient();

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !user) return;

    setLoading(true);

    const colRef = collection(db, 'notifications');
    const q = query(
      colRef,
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(50),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: NotificationItem[] = snap.docs.map((d) => {
          const data = d.data() as {
            title?: string;
            body?: string;
            message?: string;
            type?: string;
            createdAt?: Timestamp;
            postId?: string;
          };

          return {
            id: d.id,
            title: data.title || 'Notification',
            message: data.body || data.message || '',
            type: data.type,
            createdAt:
              data.createdAt instanceof Timestamp
                ? data.createdAt.toDate()
                : undefined,
            postId: data.postId,
          };
        });

        setItems(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Notifications snapshot error:', err);
        setItems([]);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [db, user]);

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
              {items.map((n) => (
                <li
                  key={n.id}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    marginBottom: 12,
                    background: 'var(--card-bg)',
                  }}
                >
                  <Link
                    href={
                      n.postId
                        ? `/posts/${n.postId}`
                        : `/notifications/${n.id}`
                    }
                    style={{
                      display: 'block',
                      padding: '12px 14px',
                      textDecoration: 'none',
                      color: 'var(--text)',
                    }}
                  >
                    <strong>{n.title}</strong>
                    <div
                      style={{
                        color: 'var(--text-secondary)',
                        marginTop: 4,
                        lineHeight: 1.6,
                      }}
                    >
                      {n.message}
                    </div>
                    {n.createdAt && (
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 12,
                          color: 'var(--text-muted)',
                        }}
                      >
                        {n.createdAt.toLocaleString()}
                      </div>
                    )}
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
