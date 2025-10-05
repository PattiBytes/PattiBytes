import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';
import ErrorBoundary from '@/components/ErrorBoundary';
import InstallPrompt from '@/components/InstallPrompt';
import '@/styles/globals.css';
import Head from 'next/head';

function AppContent({ Component, pageProps }: AppProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect logged-in users away from landing/auth pages
    if (!loading && user) {
      const publicPaths = ['/', '/auth/login', '/auth/register', '/auth/setup-username'];
      if (publicPaths.includes(router.pathname)) {
        router.replace('/dashboard');
      }
    }
  }, [user, loading, router]);

  return (
    <>
      <Component {...pageProps} />
      {user && <InstallPrompt />}
      
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(0, 0, 0, 0.8)',
            color: '#fff',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '12px 16px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </>
  );
}

export default function App(props: AppProps) {
  return (
    <>
      <Head>
        <title>PattiBytes - ਪੱਟੀ ਬਾਈਟਸ</title>
        <meta name="description" content="Latest Patti news, places, and community services" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#667eea" />
      </Head>
      
      <ErrorBoundary>
        <AuthProvider>
          <AnimatePresence mode="wait" initial={false}>
            <AppContent {...props} key={props.router.asPath} />
          </AnimatePresence>
        </AuthProvider>
      </ErrorBoundary>
    </>
  );
}
