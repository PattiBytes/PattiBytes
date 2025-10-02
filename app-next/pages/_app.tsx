import type { AppProps } from 'next/app';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';
import ErrorBoundary from '@/components/ErrorBoundary';
import '@/styles/globals.css';
import Head from 'next/head';

export default function App({ Component, pageProps, router }: AppProps) {
  return (
    <>
      <Head>
        <title>PattiBytes - Community Hub for Patti City</title>
        <meta name="description" content="Connect with your community in Patti city through news, places, and social features." />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="theme-color" content="#667eea" />
      </Head>
      
      <ErrorBoundary>
        <AuthProvider>
          <AnimatePresence 
            mode="wait" 
            initial={false}
            onExitComplete={() => window.scrollTo(0, 0)}
          >
            <Component {...pageProps} key={router.asPath} />
          </AnimatePresence>
          
          {/* Toast notifications */}
          <Toaster
            position="top-center"
            reverseOrder={false}
            gutter={8}
            containerClassName=""
            containerStyle={{}}
            toastOptions={{
              className: '',
              duration: 4000,
              style: {
                background: 'rgba(0, 0, 0, 0.8)',
                color: '#fff',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
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
        </AuthProvider>
      </ErrorBoundary>
    </>
  );
}
