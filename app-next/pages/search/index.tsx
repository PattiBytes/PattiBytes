import { useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import { FaSearch } from 'react-icons/fa';
import styles from '@/styles/Search.module.css';

export default function Search() {
  const [query, setQuery] = useState('');

  return (
    <AuthGuard>
      <Layout title="Search - PattiBytes">
        <div className={styles.search}>
          <div className={styles.searchBox}>
            <FaSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search posts, users, places..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
          </div>

          <div className={styles.empty}>
            <FaSearch className={styles.emptyIcon} />
            <p>Search for posts, users, and places</p>
          </div>
        </div>
      </Layout>
    </AuthGuard>
  );
}
