// app-next/components/Layout.tsx
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

        {/* PWA mobile web app */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#667eea" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="PattiBytes" />

        {/* Icons */}
        <link rel="icon" href="/icons/pwab-192.jpg" />
        <link rel="apple-touch-icon" href="/icons/pwab-192.jpg" />
        <link rel="manifest" href="/manifest.webmanifest" />
      </Head>

      <div className={styles.layout}>
        <Header />
        <InstallPrompt />
        <main className={styles.main}>{children}</main>

        {/* Bottom nav is rendered only when:
            - page opts in with showBottomNav
            - user is logged in
            Visibility on desktop vs mobile is handled in CSS:
            .bottomNav { display: none; } in @media (min-width: 768px)
        */}
        {showBottomNav && user && <BottomNav />}
      </div>
    </>
  );
}
