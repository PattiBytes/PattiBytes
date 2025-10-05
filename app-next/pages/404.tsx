import Link from 'next/link';
import Layout from '@/components/Layout';
import { FaHome, FaSearch } from 'react-icons/fa';
import styles from '@/styles/NotFound.module.css';

export default function NotFoundPage() {
  return (
    <Layout title="404 - Page Not Found">
      <div className={styles.container}>
        <div className={styles.content}>
          <h1 className={styles.title}>404</h1>
          <h2 className={styles.subtitle}>Page Not Found</h2>
          <p className={styles.description}>
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          
          <div className={styles.actions}>
            <Link href="/dashboard" className={styles.primaryBtn}>
              <FaHome /> Go to Dashboard
            </Link>
            <Link href="/search" className={styles.secondaryBtn}>
              <FaSearch /> Search
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
