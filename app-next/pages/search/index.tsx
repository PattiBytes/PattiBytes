import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { getUserByUsername, type UserProfile } from '@/lib/username';
import { fetchCMSNews, fetchCMSPlaces } from '@/lib/netlifyCms';
import {
  FaSearch,
  FaUser,
  FaNewspaper,
  FaMapMarkerAlt,
  FaPen,
  FaStar,
  FaFire,
  FaCrown,
  FaBolt,
  FaVideo,
  FaSpinner,
  FaTimes,
  FaGlobe,
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import styles from '@/styles/Search.module.css';


type SearchTab = 'all' | 'users' | 'posts' | 'news' | 'places' | 'videos';
type ResultType = 'user' | 'post' | 'news' | 'place' | 'video';
type SortBy = 'relevance' | 'recent' | 'popular';

interface SearchResult {
  id: string;
  type: ResultType;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  url: string; // keep as pathname only
  createdAt?: Date;
  score?: number;
  metadata?: {
    viewsCount?: number;
    authorName?: string;
    location?: string;
    language?: 'en' | 'pa' | 'mixed';
  };
}

interface PostResult {
  id: string;
  title: string;
  authorName?: string;
  imageUrl?: string | null;
  createdAt: Date;
  viewsCount?: number;
  type?: string;
  url: string;
}

const BILINGUAL_DICTIONARY: Record<string, string> = {
  patti: 'ਪੱਟੀ',
  bytes: 'ਬਾਈਟਸ',
  punjab: 'ਪੰਜਾਬ',
  punjabi: 'ਪੰਜਾਬੀ',
  amritsar: 'ਅੰਮ੍ਰਿਤਸਰ',
  chandigarh: 'ਚੰਡੀਗੜ੍ਹ',
  sikh: 'ਸਿੱਖ',
  temple: 'ਮੰਦਰ',
  gurudwara: 'ਗੁਰਦੁਆਰਾ',
  langar: 'ਲੰਗਰ',
  food: 'ਖਾਣਾ',
  bhangra: 'ਭੰਗੜਾ',
  music: 'ਸੰਗੀਤ',
  culture: 'ਸੰਸਕ੍ਰਿਤੀ',
  news: 'ਖ਼ਬਰਾਂ',
  story: 'ਕਹਾਣੀ',
  writer: 'ਲੇਖਕ',
  post: 'ਪੋਸਟ',
  video: 'ਵੀਡੀਓ',
  place: 'ਜਗ੍ਹਾ',
  golden: 'ਸੋਨ੍ਹਾ',
  tourism: 'ਸੈਰ-ਸਪਾਟਾ',
  heritage: 'ਵਿਰਾਸਤ',
};

const TRENDING_SEARCHES = [
  'Punjab news',
  'Amritsar places',
  'Sikh culture',
  'Punjabi writers',
  'Chandigarh',
  'Golden Temple',
  'Punjabi food',
  'Bhangra music',
  'Punjab tourism',
  'Gurudwara',
] as const;

const FEATURED_USERNAMES = [
  'pattibytes',
  'punjabnews',
  'heritagepunjab',
  'punjabtourism',
  'sikhstories',
] as const;

function getSearchVariants(searchTerm: string): string[] {
  const term = searchTerm.toLowerCase();
  const variants: string[] = [term];

  const translation = BILINGUAL_DICTIONARY[term];
  if (translation) variants.push(translation);

  const reverseTranslation = BILINGUAL_DICTIONARY[searchTerm];
  if (reverseTranslation) variants.push(reverseTranslation);

  return [...new Set(variants)];
}

function calculateRelevance(searchTerm: string, target: string): number {
  const searchLower = searchTerm.toLowerCase();
  const textLower = target.toLowerCase();
  if (!textLower || !searchLower) return 0;

  if (textLower === searchLower) return 100;
  if (textLower.startsWith(searchLower)) return 90;
  if (textLower.includes(searchLower)) return 70;

  let matches = 0;
  let searchIndex = 0;
  for (let i = 0; i < textLower.length && searchIndex < searchLower.length; i++) {
    if (textLower[i] === searchLower[searchIndex]) {
      matches++;
      searchIndex++;
    }
  }

  const ratio = matches / searchLower.length;
  return ratio > 0.6 ? Math.floor(ratio * 50) : 0;
}

function scoreResult(searchTerm: string, fields: Array<string | undefined>): number {
  let maxScore = 0;
  const variants = getSearchVariants(searchTerm);

  variants.forEach((variant) => {
    fields.forEach((field) => {
      if (!field) return;
      const score = calculateRelevance(variant, field);
      if (score > maxScore) maxScore = score;
    });
  });

  return maxScore;
}

function containsPunjabi(text: string): boolean {
  return /[\u0A00-\u0A7F]/.test(text);
}

function getLanguageFromContent(text: string): 'en' | 'pa' | 'mixed' {
  const hasPunjabi = containsPunjabi(text);
  const hasEnglish = /[a-zA-Z]/.test(text);
  if (hasPunjabi && hasEnglish) return 'mixed';
  if (hasPunjabi) return 'pa';
  return 'en';
}

function sortResults(results: SearchResult[], sortBy: SortBy): SearchResult[] {
  const sorted = [...results];
  switch (sortBy) {
    case 'relevance':
      return sorted.sort((a, b) => (b.score || 0) - (a.score || 0));
    case 'recent':
      return sorted.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
    case 'popular':
      return sorted.sort((a, b) => (b.metadata?.viewsCount || 0) - (a.metadata?.viewsCount || 0));
    default:
      return sorted;
  }
}

export default function SearchPage(): React.ReactElement {
  const router = useRouter();
  const { db } = getFirebaseClient();
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const [tab, setTab] = useState<SearchTab>('all');
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('relevance');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);

  const [suggestedProfiles, setSuggestedProfiles] = useState<UserProfile[]>([]);
  const [adminProfiles, setAdminProfiles] = useState<UserProfile[]>([]);
  const [mostViewedPosts, setMostViewedPosts] = useState<PostResult[]>([]);
  const [latestPosts, setLatestPosts] = useState<PostResult[]>([]);
  const [contentFeed, setContentFeed] = useState<SearchResult[]>([]);

  const normalized = useMemo(() => query.trim(), [query]);
  const fromPath = useMemo(() => router.asPath, [router.asPath]);

  const hrefWithFrom = useCallback(
    (pathname: string) => ({ pathname, query: { from: fromPath } }),
    [fromPath],
  );

  // URL hydration
  useEffect(() => {
    if (!router.isReady) return;

    const q = router.query.q as string | undefined;
    if (q) setQuery(q);

    const t = router.query.tab as string | undefined;
    const allowedTabs: SearchTab[] = ['all', 'users', 'posts', 'news', 'places', 'videos'];
    if (t && allowedTabs.includes(t as SearchTab)) setTab(t as SearchTab);
  }, [router.isReady, router.query]);

  // Suggestions (when empty query)
  useEffect(() => {
    let cancelled = false;
    if (!db) return;
    if (normalized.length > 0) return;

    const loadSuggestions = async () => {
      try {
        // 1) Featured profiles (usernames collection is public-ish; your code already uses it)
        const featured = await Promise.all(
          FEATURED_USERNAMES.map(async (uname) => {
            try {
              return await getUserByUsername(uname);
            } catch {
              return null;
            }
          }),
        );
        if (!cancelled) setSuggestedProfiles(featured.filter((u): u is UserProfile => !!u));

        // 2) Admin profiles
        // NOTE: This may fail if rules forbid reading users list for non-admin users.
        try {
          const adminQ = fsQuery(
            collection(db, 'users'),
            where('role', '==', 'admin'),
            orderBy('displayNameLower'),
            limit(8),
          );
          const adminSnap = await getDocs(adminQ);
          if (!cancelled) {
            const admins: UserProfile[] = adminSnap.docs.map((d) => ({
              uid: d.id,
              ...(d.data() as Omit<UserProfile, 'uid'>),
            })) as UserProfile[];
            setAdminProfiles(admins);
          }
        } catch (e) {
          // Don’t crash entire page if permission denied
          if (!cancelled) setAdminProfiles([]);
          console.warn('Admin list blocked by rules (ok):', e);
        }

        // 3) Most viewed posts
        const mostViewedQ = fsQuery(
          collection(db, 'posts'),
          where('isDraft', '==', false),
          orderBy('viewsCount', 'desc'),
          limit(12),
        );
        const mvSnap = await getDocs(mostViewedQ);
        if (!cancelled) {
         const mv: PostResult[] = mvSnap.docs.map(d => {
  const data = d.data as unknown as Record<string, unknown>;
  const createdAt =
    data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();

  const rawType = (data.type as string | undefined) ?? 'writing';
  const isVideo = rawType === 'video' || Boolean(data.videoUrl);
  const url = isVideo ? `videos/${d.id}` : `posts/${d.id}`;

  return {
    id: d.id,
    title: String(data.title ?? 'Untitled'),
    authorName: typeof data.authorName === 'string' ? data.authorName : 'Anonymous',
    imageUrl: (data.imageUrl as string | null | undefined) ?? null,
    createdAt,
    viewsCount: typeof data.viewsCount === 'number' ? data.viewsCount : 0,
    type: rawType,
    url,
  };
});

          setMostViewedPosts(mv);
        }

        // 4) Latest posts
        const latestQ = fsQuery(
          collection(db, 'posts'),
          where('isDraft', '==', false),
          orderBy('createdAt', 'desc'),
          limit(12),
        );
        const latestSnap = await getDocs(latestQ);
        if (!cancelled) {
         const lp: PostResult[] = latestSnap.docs.map(d => {
  const data = d.data as unknown as Record<string, unknown>;
  const createdAt =
    data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();

  const rawType = (data.type as string | undefined) ?? 'writing';
  const isVideo = rawType === 'video' || Boolean(data.videoUrl);
  const url = isVideo ? `videos/${d.id}` : `posts/${d.id}`;

  return {
    id: d.id,
    title: String(data.title ?? 'Untitled'),
    authorName: typeof data.authorName === 'string' ? data.authorName : 'Anonymous',
    imageUrl: (data.imageUrl as string | null | undefined) ?? null,
    createdAt,
    viewsCount: typeof data.viewsCount === 'number' ? data.viewsCount : 0,
    type: rawType,
    url,
  };
});

          setLatestPosts(lp);
        }

        // 5) Mixed feed (use latestPosts state instead of undefined lp)  ✅ fixes your crash
        try {
          const [newsData, placesData] = await Promise.all([fetchCMSNews(), fetchCMSPlaces()]);
          if (!cancelled) {
            const cmsNews: SearchResult[] = newsData.slice(0, 6).map((n) => ({
              id: String(n.slug || n.id || ''),
              type: 'news' as ResultType,
              title: n.title,
              subtitle: n.author || 'PattiBytes',
              imageUrl: n.image,
              url: `/news/${String(n.slug || n.id)}`,
              createdAt: new Date(n.date),
              metadata: { language: getLanguageFromContent(n.title) },
            }));

            const cmsPlaces: SearchResult[] = placesData.slice(0, 6).map((p) => ({
              id: String(p.slug || p.id || ''),
              type: 'place' as ResultType,
              title: p.title,
              subtitle: p.location || 'Punjab',
              imageUrl: p.image,
              url: `/places/${String(p.slug || p.id)}`,
              createdAt: new Date(p.date),
              metadata: {
                location: p.location,
                language: getLanguageFromContent(p.title),
              },
            }));

            const latestAsResults: SearchResult[] = latestSnap.docs
              ? latestPosts.slice(0, 8).map((p) => ({
                  id: p.id,
                  type: 'post' as ResultType,
                  title: p.title,
                  subtitle: p.authorName || 'Anonymous',
                  imageUrl: p.imageUrl || undefined,
                  url: p.url,
                  createdAt: p.createdAt,
                  metadata: {
                    authorName: p.authorName,
                    viewsCount: p.viewsCount,
                    language: getLanguageFromContent(p.title),
                  },
                }))
              : [];

            const feed = [...latestAsResults, ...cmsNews, ...cmsPlaces].slice(0, 18);
            setContentFeed(feed);
          }
        } catch (error) {
          console.error('Error loading CMS content:', error);
          if (!cancelled) setContentFeed([]);
        }
      } catch (error) {
        console.error('Error loading suggestions:', error);
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
    return () => {
      cancelled = true;
    };
  }, [db, normalized, latestPosts]);

  const performSearch = useCallback(
    async (searchTerm: string) => {
      if (!db || searchTerm.length < 2) {
        setResults([]);
        return;
      }

      try {
        setLoading(true);
        const allResults: SearchResult[] = [];

        // USERS
        if (tab === 'all' || tab === 'users') {
          const usersQ = fsQuery(collection(db, 'users'), orderBy('displayNameLower'), limit(100));
          const usersSnap = await getDocs(usersQ);

          const userResults = usersSnap.docs
            .map((d) => {
              const data = d.data() as Partial<UserProfile>;
              const profile: UserProfile = {
                uid: d.id,
                username: data.username || '',
                displayName: data.displayName || 'User',
                photoURL: data.photoURL,
                ...data,
              } as UserProfile;

              const score = scoreResult(searchTerm, [
                profile.username,
                profile.displayName,
                profile.bio,
              ]);

              return { profile, score };
            })
            .filter((item) => item.score > 30)
            .sort((a, b) => b.score - a.score)
            .slice(0, 20)
            .map((item) => ({
              id: item.profile.uid,
              type: 'user' as ResultType,
              title: item.profile.displayName,
              subtitle: `@${item.profile.username}`,
              imageUrl: item.profile.photoURL,
              url: `/user/${item.profile.username}`,
              score: item.score,
              metadata: { language: getLanguageFromContent(item.profile.displayName) },
            }));

          allResults.push(...userResults);
        }

        // POSTS (+ videos)
        if (tab === 'all' || tab === 'posts' || tab === 'videos') {
          const titleQ = fsQuery(
            collection(db, 'posts'),
            where('isDraft', '==', false),
            orderBy('titleLower'),
            limit(50),
          );
          const titleSnap = await getDocs(titleQ);

         const postResults: SearchResult[] = titleSnap.docs
            .map((d) => {
              const data = d.data() as Record<string, unknown>;
              const score = scoreResult(searchTerm, [
                String(data.title || ''),
                String(data.description || ''),
                String(data.authorName || ''),
                ...(Array.isArray(data.tags) ? data.tags.map(String) : []),
              ]);
              return { doc: d, data, score };
            })
            .filter((item) => item.score > 30)
            .sort((a, b) => b.score - a.score)
            .slice(0, 25)
            .map((item) => {
              const data = item.data;
              const type = String(data.type || 'writing');
              const isVideo = type === 'video' || Boolean(data.videoUrl);

              return {
                id: item.doc.id,
                type: (isVideo ? 'video' : 'post') as ResultType,
                title: String(data.title || 'Untitled'),
                subtitle: `${String(data.authorName || 'Anonymous')} • ${type}`,
                imageUrl: (data.imageUrl as string | null | undefined) || undefined,
                url: `/posts/${item.doc.id}`,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
                score: item.score,
                metadata: {
                  authorName: String(data.authorName || 'Anonymous'),
                  viewsCount: typeof data.viewsCount === 'number' ? data.viewsCount : 0,
                  language: getLanguageFromContent(String(data.title || '')),
                },
              };
            });

          allResults.push(...(tab === 'videos' ? postResults.filter((r) => r.type === 'video') : postResults));
        }

        // CMS NEWS
        if (tab === 'all' || tab === 'news') {
          try {
            const news = await fetchCMSNews();
            const newsResults: SearchResult[] = news
              .map((n) => ({
                item: n,
                score: scoreResult(searchTerm, [n.title, n.author || '', n.body || '']),
              }))
              .filter((item) => item.score > 30)
              .sort((a, b) => b.score - a.score)
              .slice(0, 20)
              .map((item) => ({
                id: String(item.item.slug || item.item.id || ''),
                type: 'news' as ResultType,
                title: item.item.title,
                subtitle: item.item.author || 'PattiBytes',
                imageUrl: item.item.image,
                url: `/news/${String(item.item.slug || item.item.id)}`,
                createdAt: new Date(item.item.date),
                score: item.score,
                metadata: {
                  authorName: item.item.author,
                  language: getLanguageFromContent(item.item.title),
                },
              }));

            allResults.push(...newsResults);
          } catch (error) {
            console.error('Error searching news:', error);
          }
        }

        // CMS PLACES
        if (tab === 'all' || tab === 'places') {
          try {
            const places = await fetchCMSPlaces();
            const placeResults: SearchResult[] = places
              .map((p) => ({
                item: p,
                score: scoreResult(searchTerm, [
                  p.title,
                  p.location || '',
                  p.description || p.body || '',
                ]),
              }))
              .filter((item) => item.score > 30)
              .sort((a, b) => b.score - a.score)
              .slice(0, 20)
              .map((item) => ({
                id: String(item.item.slug || item.item.id || ''),
                type: 'place' as ResultType,
                title: item.item.title,
                subtitle: item.item.location || 'Punjab',
                imageUrl: item.item.image,
                url: `/places/${String(item.item.slug || item.item.id)}`,
                createdAt: new Date(item.item.date),
                score: item.score,
                metadata: {
                  location: item.item.location,
                  language: getLanguageFromContent(item.item.title),
                },
              }));

            allResults.push(...placeResults);
          } catch (error) {
            console.error('Error searching places:', error);
          }
        }

        // Deduplicate + sort
        const uniqueResults = new Map<string, SearchResult>();
        allResults.forEach((r) => {
          const key = `${r.type}-${r.id}`;
          if (!uniqueResults.has(key) || (r.score || 0) > (uniqueResults.get(key)?.score || 0)) {
            uniqueResults.set(key, r);
          }
        });

        setResults(sortResults(Array.from(uniqueResults.values()), sortBy));
      } catch (error) {
        console.error('Search error:', error);
        toast.error('Search failed. Please try again.');
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [db, tab, sortBy],
  );

  // Debounce
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (normalized.length < 2) {
      setResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(normalized);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [normalized, performSearch]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (normalized.length < 2) {
      toast.error('Please enter at least 2 characters');
      return;
    }
    router.push({ pathname: '/search', query: { q: query, tab } });
  };

  const handleTabChange = (newTab: SearchTab) => {
    setTab(newTab);
    if (normalized.length >= 2) performSearch(normalized);
  };

  const handleTrendingClick = (term: string) => {
    setQuery(term);
    router.push({ pathname: '/search', query: { q: term, tab: 'all' } });
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    router.push('/search');
  };

  const handleSortChange = (newSort: SortBy) => {
    setSortBy(newSort);
    if (results.length > 0) setResults(sortResults(results, newSort));
  };

  const getResultIcon = (type: ResultType): React.ReactElement => {
    const icons: Record<ResultType, React.ReactElement> = {
      user: <FaUser />,
      post: <FaPen />,
      news: <FaNewspaper />,
      place: <FaMapMarkerAlt />,
      video: <FaVideo />,
    };
    return icons[type];
  };

  const getTypeLabel = (type: ResultType): string => {
    const labels: Record<ResultType, string> = {
      user: 'User',
      post: 'Post',
      news: 'News',
      place: 'Place',
      video: 'Video',
    };
    return labels[type];
  };

  const getTypeColor = (type: ResultType): string => {
    const colors: Record<ResultType, string> = {
      user: '#3b82f6',
      post: '#10b981',
      news: '#f59e0b',
      place: '#8b5cf6',
      video: '#ec4899',
    };
    return colors[type];
  };

  return (
    <AuthGuard>
      <Layout title="Search - PattiBytes">
        <div className={styles.page}>
          {/* Search box */}
          <form onSubmit={handleSearch} className={styles.searchBox}>
            <FaSearch className={styles.icon} />
            <input
              className={styles.input}
              placeholder="Search users, posts, news, places, videos"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              lang={containsPunjabi(query) ? 'pa' : 'en'}
              spellCheck
            />
            {query.length > 0 && (
              <button
                type="button"
                onClick={clearSearch}
                className={styles.clearBtn}
                aria-label="Clear search"
                title="Clear search"
              >
                <FaTimes />
              </button>
            )}
          </form>

          {/* Tabs */}
          <div className={styles.tabs}>
            {(['all', 'users', 'posts', 'videos', 'news', 'places'] as const).map((t) => (
              <button
                key={t}
                className={`${styles.tab} ${tab === t ? styles.activeTab : ''}`}
                onClick={() => handleTabChange(t)}
                type="button"
              >
                {t === 'all' && 'All'}
                {t === 'users' && (
                  <>
                    <FaUser /> Users
                  </>
                )}
                {t === 'posts' && (
                  <>
                    <FaPen /> Posts
                  </>
                )}
                {t === 'videos' && (
                  <>
                    <FaVideo /> Videos
                  </>
                )}
                {t === 'news' && (
                  <>
                    <FaNewspaper /> News
                  </>
                )}
                {t === 'places' && (
                  <>
                    <FaMapMarkerAlt /> Places
                  </>
                )}
              </button>
            ))}
          </div>

          {/* Sort */}
          {results.length > 0 && (
            <div className={styles.sortOptions}>
              <label>Sort by</label>
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value as SortBy)}
                className={styles.sortSelect}
              >
                <option value="relevance">Relevance</option>
                <option value="recent">Most Recent</option>
                <option value="popular">Most Popular</option>
              </select>
            </div>
          )}

          {/* Loading */}
          {loading && !results.length && (
            <div className={styles.loading}>
              <FaSpinner className={styles.spinner} />
              <p>Searching…</p>
            </div>
          )}

          {/* Suggestions */}
          {!loading && normalized.length === 0 && (
            <div className={styles.suggestions}>
              {suggestedProfiles.length > 0 && (
                <section className={styles.section}>
                  <h3 className={styles.sectionHeader}>
                    <FaStar /> Suggested Profiles
                  </h3>
                  <div className={styles.userGrid}>
                    {suggestedProfiles.map((p) => (
                      <Link key={p.uid} href={hrefWithFrom(`/user/${p.username}`)} className={styles.userCard}>
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
                </section>
              )}

              {adminProfiles.length > 0 && (
                <section className={styles.section}>
                  <h3 className={styles.sectionHeader}>
                    <FaCrown /> Admins / Moderators
                  </h3>
                  <div className={styles.userGrid}>
                    {adminProfiles.map((p) => (
                      <Link key={p.uid} href={hrefWithFrom(`/user/${p.username}`)} className={styles.userCard}>
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
                </section>
              )}

              {mostViewedPosts.length > 0 && (
                <section className={styles.section}>
                  <h3 className={styles.sectionHeader}>
                    <FaBolt /> Most Viewed Posts
                  </h3>
                  <div className={styles.postGrid}>
                    {mostViewedPosts.slice(0, 8).map((p) => (
                      <Link key={p.id} href={hrefWithFrom(p.url)} className={styles.postCard}>
                        <div className={styles.postThumb}>
                          {p.imageUrl ? (
                            <SafeImage src={p.imageUrl} alt={p.title} width={300} height={170} />
                          ) : (
                            <div className={styles.postFallback}>{p.type === 'video' ? <FaVideo /> : <FaPen />}</div>
                          )}
                        </div>
                        <div className={styles.postMeta}>
                          <div className={styles.postTitle}>{p.title}</div>
                          <div className={styles.postSub}>
                            {(p.authorName || 'Anonymous') + ' • ' + (p.viewsCount ?? 0) + ' views'}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {latestPosts.length > 0 && (
                <section className={styles.section}>
                  <h3 className={styles.sectionHeader}>
                    <FaPen /> Latest Posts
                  </h3>
                  <div className={styles.postGrid}>
                    {latestPosts.slice(0, 8).map((p) => (
                      <Link key={p.id} href={hrefWithFrom(p.url)} className={styles.postCard}>
                        <div className={styles.postThumb}>
                          {p.imageUrl ? (
                            <SafeImage src={p.imageUrl} alt={p.title} width={300} height={170} />
                          ) : (
                            <div className={styles.postFallback}>{p.type === 'video' ? <FaVideo /> : <FaPen />}</div>
                          )}
                        </div>
                        <div className={styles.postMeta}>
                          <div className={styles.postTitle}>{p.title}</div>
                          <div className={styles.postSub}>
                            {(p.authorName || 'Anonymous') + ' • ' + p.createdAt.toLocaleDateString('en-IN')}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {contentFeed.length > 0 && (
                <section className={styles.section}>
                  <h3 className={styles.sectionHeader}>
                    <FaFire /> Content Feed
                  </h3>
                  <div className={styles.resultGrid}>
                    {contentFeed.map((r) => (
                      <Link key={`${r.type}-${r.id}`} href={hrefWithFrom(r.url)} className={styles.resultCard}>
                        <div className={styles.resultThumb}>
                          {r.imageUrl ? (
                            <SafeImage src={r.imageUrl} alt={r.title} width={120} height={120} />
                          ) : (
                            <div className={styles.resultFallback}>{getResultIcon(r.type)}</div>
                          )}
                        </div>
                        <div className={styles.resultMeta}>
                          <div className={styles.resultTitle}>{r.title}</div>
                          <div className={styles.resultSub}>{r.subtitle}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              <section className={styles.trendingSection}>
                <h3>
                  <FaFire /> Trending Searches
                </h3>
                <div className={styles.trendingGrid}>
                  {TRENDING_SEARCHES.map((term) => (
                    <button
                      key={term}
                      onClick={() => handleTrendingClick(term)}
                      className={styles.trendingItem}
                      type="button"
                      lang={containsPunjabi(term) ? 'pa' : 'en'}
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* No results */}
          {!loading && normalized.length >= 2 && results.length === 0 && (
            <div className={styles.empty}>
              <FaSearch className={styles.emptyIcon} />
              <h2>No results found for &quot;{normalized}&quot;</h2>

              {getSearchVariants(normalized).length > 1 && (
                <p className={styles.searchVariants}>
                  <FaGlobe /> Also searched: {getSearchVariants(normalized).slice(1).join(', ')}
                </p>
              )}

              <p className={styles.emptyHint}>Try different keywords or explore trending topics.</p>
            </div>
          )}

          {/* Results */}
          {!loading && results.length > 0 && (
            <div className={styles.resultsContainer}>
              <div className={styles.resultsHeader}>
                <h2>
                  Found <strong>{results.length}</strong> result{results.length !== 1 ? 's' : ''} for{' '}
                  &quot;<strong>{normalized}</strong>&quot;
                </h2>
              </div>

              <ul className={styles.list}>
                {results.map((result) => (
                  <li key={`${result.type}-${result.id}`} className={styles.item}>
                    <Link href={hrefWithFrom(result.url)} className={styles.link}>
                      <div className={styles.resultIcon}>
                        {result.imageUrl ? (
                          <SafeImage src={result.imageUrl} alt={result.title} width={64} height={64} className={styles.resultImage} />
                        ) : (
                          <div className={styles.fallbackIcon} style={{ color: getTypeColor(result.type) }}>
                            {getResultIcon(result.type)}
                          </div>
                        )}
                      </div>

                      <div className={styles.meta}>
                        <div className={styles.typeBadge}>
                          {getResultIcon(result.type)} <span>{getTypeLabel(result.type)}</span>
                        </div>

                        <div className={styles.title} lang={result.metadata?.language === 'pa' ? 'pa' : 'en'}>
                          {result.title}
                        </div>

                        {result.subtitle && <div className={styles.subtitle}>{result.subtitle}</div>}

                        <div className={styles.metaInfo}>
                          {result.metadata?.authorName && <span>by {result.metadata.authorName}</span>}
                          {result.metadata?.location && <span>{result.metadata.location}</span>}
                          {typeof result.metadata?.viewsCount === 'number' && <span>{result.metadata.viewsCount} views</span>}
                          {result.createdAt && (
                            <span>
                              {result.createdAt.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>

                      {!!result.score && (
                        <div className={styles.relevance}>
                          <div
                            className={styles.scoreBar}
                            style={{ width: `${Math.min((result.score / 100) * 100, 100)}%` }}
                            title={`Relevance ${Math.round(result.score)}`}
                          />
                        </div>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className={styles.footer}>
                <p>
                  Showing {results.length} results. Sorted by{' '}
                  {sortBy === 'relevance' ? 'relevance' : sortBy === 'recent' ? 'most recent' : 'most popular'}.
                </p>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </AuthGuard>
  );
}
