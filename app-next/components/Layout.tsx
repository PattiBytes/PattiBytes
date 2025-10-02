import { ReactNode } from 'react';
import Head from 'next/head';
import Header from './Header';
import BottomNav from './BottomNav';
import AuthGuard from './AuthGuard';
import styles from '@/styles/Layout.module.css';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  requireAuth?: boolean;
  showBottomNav?: boolean;
}

export default function Layout({ 
  children, 
  title = 'PattiBytes',
  description = 'Connect with Patti community',
  requireAuth = true,
  showBottomNav = true
}: LayoutProps) {
  const content = (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className={styles.layout}>
        <Header />
        <main className={styles.main}>
          {children}
        </main>
        {showBottomNav && <BottomNav />}
      </div>
    </>
  );

  if (requireAuth) {
    return <AuthGuard requireUsername>{content}</AuthGuard>;
  }

  return content;
}
