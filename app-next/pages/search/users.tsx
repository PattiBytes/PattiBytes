// app-next/pages/search/users.tsx
import { useEffect, useMemo, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { searchUsersByUsername } from '@/lib/username';
import SafeImage from '@/components/SafeImage';
import Link from 'next/link';
import styles from '@/styles/UserSearch.module.css';
import { FaSearch, FaUser } from 'react-icons/fa';

export default function UserSearchPage() {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<
    Array<{ uid: string; username: string; displayName: string; photoURL?: string; bio?: string }>
  >([]);

  const normalized = useMemo(() => q.trim(), [q]);

  useEffect(() => {
    let cancelled = false;
    if (normalized.length < 2) {
      setResults([]);
      return;
    }

    const run = setTimeout(async () => {
      try {
        setLoading(true);
        const found = await searchUsersByUsername(normalized, 20, user?.uid);
        if (cancelled) return;
        setResults(
          found.map((u) => ({
            uid: u.uid,
            username: u.username,
            displayName: u.displayName,
            photoURL: u.photoURL,
            bio: u.bio,
          }))
        );
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(run);
    };
  }, [normalized, user?.uid]);

  return (
    <AuthGuard>
      <Layout title="Search Users - PattiBytes">
        <div className={styles.page}>
          <div className={styles.searchBox}>
            <FaSearch className={styles.icon} />
            <input
              className={styles.input}
              placeholder="Search by username or name…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
            />
          </div>

          {loading && (
            <div className={styles.loading}>
              <div className={styles.spinner} />
              <p>Searching…</p>
            </div>
          )}

          {!loading && results.length === 0 && normalized.length >= 2 && (
            <div className={styles.empty}>
              <FaUser className={styles.emptyIcon} />
              <p>No users found</p>
            </div>
          )}

          <ul className={styles.list}>
            {results.map((u) => (
              <li key={u.uid} className={styles.item}>
                <Link href={`/user/${u.username}`} className={styles.link}>
                  <div className={styles.avatar}>
                    <SafeImage
                      src={u.photoURL || '/images/default-avatar.png'}
                      alt={u.displayName}
                      width={48}
                      height={48}
                      className={styles.avatarImg}
                    />
                  </div>
                  <div className={styles.meta}>
                    <div className={styles.name}>{u.displayName}</div>
                    <div className={styles.username}>@{u.username}</div>
                    {u.bio && <div className={styles.bio}>{u.bio}</div>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Layout>
    </AuthGuard>
  );
}
