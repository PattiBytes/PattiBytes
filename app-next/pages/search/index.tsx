import { useState, useEffect, useCallback } from 'react';
import { collection, query as firestoreQuery, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import { searchUsersByUsername } from '@/lib/username';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import SafeImage from '@/components/SafeImage';
import { motion } from 'framer-motion';
import { FaSearch, FaUser, FaNewspaper, FaMapMarkerAlt, FaTimes } from 'react-icons/fa';
import Link from 'next/link';
import styles from '@/styles/Search.module.css';

interface SearchResult {
  id: string;
  type: 'user' | 'post';
  title?: string;
  content?: string;
  postType?: 'news' | 'place' | 'writing';
  username?: string;
  displayName?: string;
  photoURL?: string;
  bio?: string;
  location?: string;
  imageUrl?: string;
  createdAt?: Date;
}

interface PostData {
  title: string;
  content: string;
  type: string;
  authorName: string;
  authorUsername: string;
  authorPhoto: string;
  imageUrl?: string;
  location?: string;
  createdAt: Timestamp;
}

export default function Search() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'users' | 'posts'>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const performSearch = useCallback(async (searchText: string) => {
    if (!searchText.trim() || searchText.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const { db } = getFirebaseClient();
      if (!db) throw new Error('Firestore not initialized');

      const allResults: SearchResult[] = [];

      // Users
      if (activeTab === 'all' || activeTab === 'users') {
        try {
          const users = await searchUsersByUsername(searchText, 10);
          const userResults = users.map(user => ({
            id: user.uid,
            type: 'user' as const,
            username: user.username,
            displayName: user.displayName,
            photoURL: user.photoURL,
            bio: user.bio
          }));
          allResults.push(...userResults);
        } catch (error) {
          console.error('Error searching users:', error);
        }
      }

      // Posts
      if (activeTab === 'all' || activeTab === 'posts') {
        try {
          const postsRef = collection(db, 'posts');
          const searchLower = searchText.toLowerCase();

          const allPostsQuery = firestoreQuery(
            postsRef,
            orderBy('createdAt', 'desc'),
            limit(100)
          );

          const allPostsSnapshot = await getDocs(allPostsQuery);
          const postResults = allPostsSnapshot.docs
            .filter(doc => {
              const data = doc.data() as PostData;
              return (
                data.title?.toLowerCase().includes(searchLower) ||
                data.content?.toLowerCase().includes(searchLower) ||
                data.location?.toLowerCase().includes(searchLower)
              );
            })
            .slice(0, 10)
            .map(doc => {
              const data = doc.data() as PostData;
              return {
                id: doc.id,
                type: 'post' as const,
                title: data.title,
                content: data.content,
                postType: data.type as 'news' | 'place' | 'writing',
                displayName: data.authorName,
                username: data.authorUsername,
                photoURL: data.authorPhoto,
                imageUrl: data.imageUrl,
                location: data.location,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date()
              };
            });

          allResults.push(...postResults);
        } catch (error) {
          console.error('Error searching posts:', error);
        }
      }

      setResults(allResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, activeTab, performSearch]);

  const handleClear = () => {
    setSearchQuery('');
    setResults([]);
    setSearched(false);
  };

  const getPostIcon = (type?: string) => {
    switch (type) {
      case 'news': return <FaNewspaper />;
      case 'place': return <FaMapMarkerAlt />;
      default: return <FaNewspaper />;
    }
  };

  return (
    <AuthGuard>
      <Layout title="Search - PattiBytes">
        <div className={styles.search}>
          <div className={styles.searchBox}>
            <FaSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search users, posts, places..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searchQuery && (
              <button onClick={handleClear} className={styles.clearBtn}>
                <FaTimes />
              </button>
            )}
          </div>

          <div className={styles.tabs}>
            <button className={`${styles.tab} ${activeTab === 'all' ? styles.activeTab : ''}`} onClick={() => setActiveTab('all')}>All</button>
            <button className={`${styles.tab} ${activeTab === 'users' ? styles.activeTab : ''}`} onClick={() => setActiveTab('users')}><FaUser /> Users</button>
            <button className={`${styles.tab} ${activeTab === 'posts' ? styles.activeTab : ''}`} onClick={() => setActiveTab('posts')}><FaNewspaper /> Posts</button>
          </div>

          <div className={styles.results}>
            {loading && (
              <div className={styles.loading}>
                <div className={styles.spinner} />
                <p>Searching...</p>
              </div>
            )}

            {!loading && searched && results.length === 0 && (
              <div className={styles.empty}>
                <FaSearch className={styles.emptyIcon} />
                <p>No results found for &quot;{searchQuery}&quot;</p>
                <small>Try different keywords or check spelling</small>
              </div>
            )}

            {!loading && !searched && searchQuery.length === 0 && (
              <div className={styles.empty}>
                <FaSearch className={styles.emptyIcon} />
                <p>Search for users, news, and places</p>
                <small>Start typing to see results</small>
              </div>
            )}

            {!loading && results.length > 0 && (
              <div className={styles.resultsList}>
                {results.map((result, index) => (
                  <motion.div
                    key={`${result.type}-${result.id}`}
                    className={styles.resultCard}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    {result.type === 'user' ? (
                      <Link href={`/user/${result.username}`} className={styles.userResult}>
                        <SafeImage
                          src={result.photoURL}
                          alt={result.displayName || 'User'}
                          width={48}
                          height={48}
                          className={styles.userAvatar}
                        />
                        <div className={styles.userInfo}>
                          <h3>{result.displayName}</h3>
                          <p className={styles.username}>@{result.username}</p>
                          {result.bio && <p className={styles.bio}>{result.bio}</p>}
                        </div>
                        <FaUser className={styles.typeIcon} />
                      </Link>
                    ) : (
                      <Link href={`/posts/${result.id}`} className={styles.postResult}>
                        <div className={styles.postHeader}>
                          <div className={styles.postAuthor}>
                            <SafeImage
                              src={result.photoURL}
                              alt={result.displayName || 'User'}
                              width={32}
                              height={32}
                              className={styles.postAvatar}
                            />
                            <div>
                              <span className={styles.authorName}>{result.displayName}</span>
                              <span className={styles.postType}>
                                {getPostIcon(result.postType)} {result.postType}
                              </span>
                            </div>
                          </div>
                        </div>
                        {result.imageUrl && (
                          <div className={styles.postImage}>
                            <SafeImage
                              src={result.imageUrl}
                              alt={result.title || 'Post'}
                              width={300}
                              height={200}
                            />
                          </div>
                        )}
                        <div className={styles.postContent}>
                          <h3>{result.title}</h3>
                          {result.location && (
                            <p className={styles.location}>
                              <FaMapMarkerAlt /> {result.location}
                            </p>
                          )}
                          <p className={styles.excerpt}>
                            {result.content?.substring(0, 150)}...
                          </p>
                        </div>
                      </Link>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Layout>
    </AuthGuard>
  );
}
