import { ReactNode } from 'react';
import Head from 'next/head';
import { useAuth } from '@/context/AuthContext';
import Header from './Header';
import BottomNav from './BottomNav';
import InstallPrompt from './InstallPrompt';
import styles from '@/styles/Layout.module.css';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  showBottomNav?: boolean;
}

export default function Layout({
  children,
  title = 'PattiBytes',
  description = 'Your community platform',
  showBottomNav = true,
}: LayoutProps) {
  const { user } = useAuth();

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link rel="icon" href="/icons/pwab-192.jpg" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#667eea" />
        <link rel="apple-touch-icon" href="/icons/pwab-512.jpg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="PattiBytes" />
      </Head>

      <div className={styles.layout}>
        <Header />
        <InstallPrompt />
        <main className={styles.main}>{children}</main>
        {showBottomNav && user && <BottomNav />}
      </div>
    </>
  );
}
