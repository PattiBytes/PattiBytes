import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

import AuthProvider from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import PWAInstaller from '@/components/PWAInstaller';
import Header from '@/components/common/Header';

import { GoogleAnalytics } from '@next/third-parties/google'; // Next.js GA for App Router [web:348][web:349]

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pbexpress.pattibytes.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'PattiBytes Express - ਪੱਟੀ ਦੀ ਲੋੜ, ਹਾਢੇ ਕੋਲ ਤੋੜ',
    template: '%s | PattiBytes Express',
  },
  description:
    'Fast food delivery service in Patti, Punjab. Order from local restaurants and get food delivered quickly.',
  keywords: [
    'food delivery',
    'patti',
    'punjab',
    'restaurant',
    'pbexpress',
    'pb express',
    'pattibytesexpress',
    'pattibytes express',
    'online food',
    'pattibytes',
    'ਪੱਟੀਬਾਈਟਸ',
  ],
  authors: [{ name: 'PattiBytes Express' }],
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PattiBytes',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'PattiBytes Express',
    title: 'PattiBytes Express - Food Delivery',
    description: 'Fast food delivery in Patti, Punjab',
    images: [
      {
        url: '/icon-192.png',
        width: 192,
        height: 192,
        alt: 'PattiBytes Express Logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'PattiBytes Express',
    description: 'Fast food delivery in Patti, Punjab',
    images: ['/icon-192.png'],
  },

  // Optional (recommended) for Search Console meta-tag verification
  // Put only the code Google gives you (not the whole meta tag).
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
    : {}), // Next.js supports Google verification in metadata [web:341]
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#f97316',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>

      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <CartProvider>
            <Header />
            <PWAInstaller />
            {children}

            <ToastContainer
              position="top-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop={true}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="light"
            />
          </CartProvider>
        </AuthProvider>

        {/* GA4: This replaces pasting the raw gtag.js snippet manually */}
        <GoogleAnalytics gaId="G-MNVMTQ010K" /> {/* include in root layout to load on all routes [web:348][web:349] */}
      </body>
    </html>
  );
}
