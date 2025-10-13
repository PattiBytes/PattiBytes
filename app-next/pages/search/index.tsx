// app-next/pages/search/index.tsx
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import SafeImage from '@/components/SafeImage';
import Link from 'next/link';
import {
  collection,
  query as fsQuery,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import { searchUsersByUsername, getUserByUsername, type UserProfile } from '@/lib/username';
import { fetchCMSNews, fetchCMSPlaces } from '@/lib/netlifyCms';
import { useAuth } from '@/context/AuthContext';
import {
  FaSearch, FaUser, FaNewspaper, FaMapMarkerAlt, FaPen, FaStar, FaFire, FaCrown, FaBolt
} from 'react-icons/fa';
import styles from '@/styles/Search.module.css';

type SearchTab = 'all' | 'users' | 'posts' | 'news' | 'places';

interface SearchResult {
  id: string;
  type: 'user' | 'post' | 'news' | 'place';
  title: string;
  subtitle?: string;
  imageUrl?: string;
  url: string;
  createdAt?: Date;
}

interface PostResult {
  id: string;
  title: string;
  authorName?: string;
  imageUrl?: string | null;
  createdAt: Date;
  viewsCount?: number;
  url: string;
}

const TRENDING_SEARCHES = [
  'Punjab news', 'Amritsar places', 'Sikh culture', 'Punjabi writers',
  'Chandigarh', 'Golden Temple', 'Punjabi food', 'Bhangra music'
];

const FEATURED_USERNAMES = ['pattibytes', 'punjabnews', 'heritage_punjab', 'punjab_tourism', 'sikh_stories'];

export default function SearchPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { db } = getFirebaseClient();

  const [tab, setTab] = useState<SearchTab>('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);

  // Suggestions state (no-query view)
  const [suggestedProfiles, setSuggestedProfiles] = useState<UserProfile[]>([]);
  const [adminProfiles, setAdminProfiles] = useState<UserProfile[]>([]);
  const [mostViewedPosts, setMostViewedPosts] = useState<PostResult[]>([]);
  const [latestPosts, setLatestPosts] = useState<PostResult[]>([]);
  const [contentFeed, setContentFeed] = useState<SearchResult[]>([]);

  const normalized = useMemo(() => query.trim(), [query]);

  // Hydrate from URL
  useEffect(() => {
    const q = router.query.q;
    if (typeof q === 'string') setQuery(q);
    const t = router.query.tab;
    if (t === 'all' || t === 'users' || t === 'posts' || t === 'news' || t === 'places') setTab(t);
  }, [router.query]);

  // Load suggestions when no query
  useEffect(() => {
    let cancelled = false;
    if (!db) return;
    if (normalized.length > 0) return;

    const loadSuggestions = async () => {
      try {
        // Featured profiles by username
        const featured = await Promise.all(
          FEATURED_USERNAMES.map(async (uname) => (await getUserByUsername(uname)) as UserProfile | null)
        );
        if (!cancelled) setSuggestedProfiles(featured.filter((u): u is UserProfile => !!u));

        // Admin profiles
        const adminQ = fsQuery(
          collection(db, 'users'),
          where('role', '==', 'admin'),
          orderBy('displayNameLower'),
          limit(8)
        );
        const adminSnap = await getDocs(adminQ);
        const admins: UserProfile[] = adminSnap.docs.map((d) => ({
          uid: d.id,
          ...(d.data() as Omit<UserProfile, 'uid'>),
        })) as UserProfile[];
        if (!cancelled) setAdminProfiles(admins);

        // Most viewed posts
        const mostViewedQ = fsQuery(
          collection(db, 'posts'),
          orderBy('viewsCount', 'desc'),
          limit(12)
        );
        const mvSnap = await getDocs(mostViewedQ);
        const mv: PostResult[] = mvSnap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          const createdAt =
            data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
          return {
            id: d.id,
            title: String(data.title || 'Untitled'),
            authorName: typeof data.authorName === 'string' ? data.authorName : 'Anonymous',
            imageUrl: (data.imageUrl as string | null | undefined) ?? null,
            createdAt,
            viewsCount: typeof data.viewsCount === 'number' ? data.viewsCount : 0,
            url: `/posts/${d.id}`,
          };
        });
        if (!cancelled) setMostViewedPosts(mv);

        // Latest posts
        const latestQ = fsQuery(
          collection(db, 'posts'),
          orderBy('createdAt', 'desc'),
          limit(12)
        );
        const latestSnap = await getDocs(latestQ);
        const lp: PostResult[] = latestSnap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          const createdAt =
            data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
          return {
            id: d.id,
            title: String(data.title || 'Untitled'),
            authorName: typeof data.authorName === 'string' ? data.authorName : 'Anonymous',
            imageUrl: (data.imageUrl as string | null | undefined) ?? null,
            createdAt,
            url: `/posts/${d.id}`,
          };
        });
        if (!cancelled) setLatestPosts(lp);

        // Mixed content feed (latest posts + CMS picks)
        const [news, places] = await Promise.all([fetchCMSNews(), fetchCMSPlaces()]);
        const cmsNews = (news || []).slice(0, 6).map((n) => ({
          id: n.slug || n.id || '',
          type: 'news' as const,
          title: n.title,
          subtitle: n.author || 'PattiBytes',
          imageUrl: n.image,
          url: `/news/${n.slug || n.id}`,
          createdAt: new Date(n.date),
        }));
        const cmsPlaces = (places || []).slice(0, 6).map((p) => ({
          id: p.slug || p.id || '',
          type: 'place' as const,
          title: p.title,
          subtitle: p.location || 'Punjab',
          imageUrl: p.image,
          url: `/places/${p.slug || p.id}`,
          createdAt: new Date(p.date),
        }));
        const latestAsResults: SearchResult[] = lp.slice(0, 8).map((p) => ({
          id: p.id,
          type: 'post',
          title: p.title,
          subtitle: p.authorName || 'Anonymous',
          imageUrl: p.imageUrl || undefined,
          url: p.url,
          createdAt: p.createdAt,
        }));
        const feed = [...latestAsResults, ...cmsNews, ...cmsPlaces].slice(0, 18);
        if (!cancelled) setContentFeed(feed);
      } catch {
        if (!cancelled) {
          setSuggestedProfiles([]);
          setAdminProfiles([]);
          setMostViewedPosts([]);
          setLatestPosts([]);
          setContentFeed([]);
        }
      }
    };

    loadSuggestions();
    return () => { cancelled = true; };
  }, [db, normalized]);

  // Query search (users, posts, news, places) with debounce
  useEffect(() => {
    let cancelled = false;
    if (normalized.length < 2) {
      setResults([]);
      return;
    }
    const searchAll = async () => {
      try {
        setLoading(true);
        const allResults: SearchResult[] = [];

        // Users
        if (tab === 'all' || tab === 'users') {
          const users = await searchUsersByUsername(normalized, 10, user?.uid);
          allResults.push(
            ...users.map((u: UserProfile) => ({
              id: u.uid,
              type: 'user' as const,
              title: u.displayName,
              subtitle: `@${u.username}`,
              imageUrl: u.photoURL,
              url: `/user/${u.username}`,
            }))
          );
        }

        // Posts
        if ((tab === 'all' || tab === 'posts') && db) {
          const q = fsQuery(
            collection(db, 'posts'),
            where('title', '>=', normalized),
            where('title', '<=', normalized + '\uf8ff'),
            orderBy('title'),
            limit(15)
          );
          const snapshot = await getDocs(q);
          snapshot.docs.forEach((docSnap) => {
            const data = docSnap.data() as Record<string, unknown>;
            if (data.isDraft === true) return;
            allResults.push({
              id: docSnap.id,
              type: 'post',
              title: String(data.title || 'Untitled'),
              subtitle: typeof data.authorName === 'string' ? data.authorName : 'Anonymous',
              imageUrl: (data.imageUrl as string | null | undefined) || undefined,
              url: `/posts/${docSnap.id}`,
              createdAt:
                data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
            });
          });
        }

        // CMS news
        if (tab === 'all' || tab === 'news') {
          try {
            const news = await fetchCMSNews();
            const filtered = news
              .filter((n) => n.title.toLowerCase().includes(normalized.toLowerCase()))
              .slice(0, 10);
            allResults.push(
              ...filtered.map((n) => ({
                id: n.slug || n.id || '',
                type: 'news' as const,
                title: n.title,
                subtitle: n.author || 'PattiBytes',
                imageUrl: n.image,
                url: `/news/${n.slug || n.id}`,
                createdAt: new Date(n.date),
              }))
            );
          } catch {}
        }

        // CMS places
        if (tab === 'all' || tab === 'places') {
          try {
            const places = await fetchCMSPlaces();
            const filtered = places
              .filter(
                (p) =>
                  p.title.toLowerCase().includes(normalized.toLowerCase()) ||
                  (p.location && p.location.toLowerCase().includes(normalized.toLowerCase()))
              )
              .slice(0, 10);
            allResults.push(
              ...filtered.map((p) => ({
                id: p.slug || p.id || '',
                type: 'place' as const,
                title: p.title,
                subtitle: p.location || 'Punjab',
                imageUrl: p.image,
                url: `/places/${p.slug || p.id}`,
                createdAt: new Date(p.date),
              }))
            );
          } catch {}
        }

        if (!cancelled) setResults(allResults);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const t = setTimeout(searchAll, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [normalized, tab, user?.uid, db]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push({ pathname: '/search', query: { q: query, tab } });
  };

  const handleTrendingClick = (term: string) => {
    setQuery(term);
    router.push({ pathname: '/search', query: { q: term, tab: 'all' } });
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'user': return <FaUser />;
      case 'post': return <FaPen />;
      case 'news': return <FaNewspaper />;
      case 'place': return <FaMapMarkerAlt />;
      default: return <FaSearch />;
    }
  };

  return (
    <AuthGuard>
      <Layout title="Search - PattiBytes">
        <div className={styles.page}>
          <form onSubmit={handleSearch} className={styles.searchBox}>
            <FaSearch className={styles.icon} />
            <input
              className={styles.input}
              placeholder="Search users, posts, news, places…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </form>

          <div className={styles.tabs}>
            <button className={`${styles.tab} ${tab === 'all' ? styles.activeTab : ''}`} onClick={() => setTab('all')}>All</button>
            <button className={`${styles.tab} ${tab === 'users' ? styles.activeTab : ''}`} onClick={() => setTab('users')}><FaUser /> Users</button>
            <button className={`${styles.tab} ${tab === 'posts' ? styles.activeTab : ''}`} onClick={() => setTab('posts')}><FaPen /> Posts</button>
            <button className={`${styles.tab} ${tab === 'news' ? styles.activeTab : ''}`} onClick={() => setTab('news')}><FaNewspaper /> News</button>
            <button className={`${styles.tab} ${tab === 'places' ? styles.activeTab : ''}`} onClick={() => setTab('places')}><FaMapMarkerAlt /> Places</button>
          </div>

          {/* No-query suggestions */}
          {normalized.length === 0 && (
            <div className={styles.suggestions}>
              <div className={styles.section}>
                <div className={styles.sectionHeader}><FaStar /> Suggested Profiles</div>
                <div className={styles.userGrid}>
                  {suggestedProfiles.map((p) => (
                    <Link key={p.uid} href={`/user/${p.username}`} className={styles.userCard}>
                      <div className={styles.avatar}>
                        <SafeImage
                          src={p.photoURL || '/images/default-avatar.png'}
                          alt={p.displayName}
                          width={56}
                          height={56}
                        />
                      </div>
                      <div className={styles.userMeta}>
                        <strong>{p.displayName}</strong>
                        <span>@{p.username}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionHeader}><FaCrown /> Admins</div>
                <div className={styles.userGrid}>
                  {adminProfiles.map((p) => (
                    <Link key={p.uid} href={`/user/${p.username}`} className={styles.userCard}>
                      <div className={styles.avatar}>
                        <SafeImage
                          src={p.photoURL || '/images/default-avatar.png'}
                          alt={p.displayName}
                          width={56}
                          height={56}
                        />
                      </div>
                      <div className={styles.userMeta}>
                        <strong>{p.displayName}</strong>
                        <span>@{p.username}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionHeader}><FaBolt /> Most Viewed</div>
                <div className={styles.postGrid}>
                  {mostViewedPosts.map((p) => (
                    <Link key={p.id} href={p.url} className={styles.postCard}>
                      <div className={styles.postThumb}>
                        {p.imageUrl ? (
                          <SafeImage src={p.imageUrl} alt={p.title} width={300} height={170} />
                        ) : (
                          <div className={styles.postFallback} />
                        )}
                      </div>
                      <div className={styles.postMeta}>
                        <div className={styles.postTitle}>{p.title}</div>
                        <div className={styles.postSub}>
                          {p.authorName || 'Anonymous'} • {p.viewsCount ?? 0} views
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionHeader}><FaPen /> Latest Posts</div>
                <div className={styles.postGrid}>
                  {latestPosts.map((p) => (
                    <Link key={p.id} href={p.url} className={styles.postCard}>
                      <div className={styles.postThumb}>
                        {p.imageUrl ? (
                          <SafeImage src={p.imageUrl} alt={p.title} width={300} height={170} />
                        ) : (
                          <div className={styles.postFallback} />
                        )}
                      </div>
                      <div className={styles.postMeta}>
                        <div className={styles.postTitle}>{p.title}</div>
                        <div className={styles.postSub}>
                          {p.authorName || 'Anonymous'} • {p.createdAt.toLocaleDateString()}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionHeader}><FaFire /> Content Feed</div>
                <div className={styles.resultGrid}>
                  {contentFeed.map((r) => (
                    <Link key={`${r.type}-${r.id}`} href={r.url} className={styles.resultCard}>
                      <div className={styles.resultThumb}>
                        {r.imageUrl ? (
                          <SafeImage src={r.imageUrl} alt={r.title} width={120} height={120} />
                        ) : (
                          <div className={styles.resultFallback} />
                        )}
                      </div>
                      <div className={styles.resultMeta}>
                        <div className={styles.resultTitle}>{r.title}</div>
                        <div className={styles.resultSub}>
                          {r.subtitle}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className={styles.trendingSection}>
                <h3><FaFire /> Trending Searches</h3>
                <div className={styles.trendingGrid}>
                  {TRENDING_SEARCHES.map((term) => (
                    <button key={term} onClick={() => handleTrendingClick(term)} className={styles.trendingItem}>
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Query results */}
          {loading && (
            <div className={styles.loading}>
              <div className={styles.spinner} />
              <p>Searching…</p>
            </div>
          )}

          {!loading && normalized.length >= 2 && results.length === 0 && (
            <div className={styles.empty}>
              <FaSearch className={styles.emptyIcon} />
              <p>No results found for &quot;{normalized}&quot;</p>
            </div>
          )}

          {results.length > 0 && (
            <ul className={styles.list}>
              {results.map((result) => (
                <li key={`${result.type}-${result.id}`} className={styles.item}>
                  <Link href={result.url} className={styles.link}>
                    <div className={styles.resultIcon}>
                      {result.imageUrl ? (
                        <SafeImage
                          src={result.imageUrl}
                          alt={result.title}
                          width={48}
                          height={48}
                          className={styles.resultImage}
                        />
                      ) : (
                        <div className={styles.fallbackIcon}>
                          {getResultIcon(result.type)}
                        </div>
                      )}
                    </div>
                    <div className={styles.meta}>
                      <div className={styles.title}>{result.title}</div>
                      <div className={styles.subtitle}>
                        {getResultIcon(result.type)} {result.subtitle}
                      </div>
                      {result.createdAt && (
                        <div className={styles.date}>
                          {result.createdAt.toLocaleDateString()}
                        </div>
                      )}
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
