// app-next/pages/notifications/[slug].tsx
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import SafeImage from '@/components/SafeImage';
import Link from 'next/link';

type CMSNotification = {
  id: string;
  title: string;
  message: string;
  target_url?: string;
  image?: string;
};

function getCMSOrigin(): string {
  if (typeof window !== 'undefined') return window.location.origin;
  return (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '');
}

function resolveCMSImage(path?: string): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('assets/uploads') || path.startsWith('/assets/uploads')) {
    const clean = path.startsWith('/') ? path : `/${path}`;
    return `${getCMSOrigin()}${clean}`;
  }
  return path;
}

export default function NotificationDetail() {
  const { query } = useRouter();
  const slug = typeof query.slug === 'string' ? query.slug : '';
  const [item, setItem] = useState<CMSNotification | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/cms/notifications', {
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('Failed to load notifications');
        const list = (await res.json()) as CMSNotification[];
        const found = list.find((n) => n.id === slug);
        setItem(found || null);
      } catch {
        setItem(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const heroSrc = resolveCMSImage(item?.image) || item?.image;

  return (
    <AuthGuard>
      <Layout
        title={item ? `${item.title} - Notification` : 'Notification'}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <div
              style={{
                width: 48,
                height: 48,
                margin: '0 auto 12px',
                border: '4px solid var(--border)',
                borderTopColor: '#667eea',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <p>Loading notification…</p>
          </div>
        ) : !item ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <h2>Notification not found</h2>
            <Link href="/notifications">Back to notifications</Link>
          </div>
        ) : (
          <article
            style={{
              maxWidth: 800,
              margin: '0 auto',
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            {heroSrc && (
              <div style={{ width: '100%', overflow: 'hidden' }}>
                <SafeImage
                  src={heroSrc}
                  alt={item.title}
                  width={1200}
                  height={600}
                />
              </div>
            )}
            <div style={{ padding: '1.25rem 1rem 1.5rem' }}>
              <h1 style={{ marginBottom: 8 }}>{item.title}</h1>
              <p
                style={{
                  color: 'var(--text-secondary)',
                  lineHeight: 1.7,
                }}
              >
                {item.message}
              </p>
              <div
                style={{
                  marginTop: 16,
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                <Link
                  href="/notifications"
                  style={{
                    textDecoration: 'none',
                    padding: '0.6rem 1rem',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                  }}
                >
                  ← Back
                </Link>
                {item.target_url && (
                  <a
                    href={item.target_url}
                    rel="noopener noreferrer"
                    style={{
                      textDecoration: 'none',
                      padding: '0.6rem 1rem',
                      borderRadius: 10,
                      background:
                        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      fontWeight: 700,
                    }}
                  >
                    Open link →
                  </a>
                )}
              </div>
            </div>
          </article>
        )}
      </Layout>
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </AuthGuard>
  );
}
