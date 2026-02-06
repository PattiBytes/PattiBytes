import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

import AuthProvider from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';

import Header from '@/components/common/Header';
import PWAInstaller from '@/components/PWAInstaller';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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

  keywords: ['food delivery', 'patti', 'punjab', 'restaurant', 'online food', 'pattibytes', 'ਪੱਟੀਬਾਈਟਸ'],

  authors: [{ name: 'PattiBytes Express' }],

  // Keep your existing manifest filename (or rename if you want)
  manifest: '/manifest.json',

  icons: {
    icon: [
      { url: '/favicon.ico' },
      // Recommended by Google to look good across surfaces (>=48x48) [web:276]
      { url: '/favicon-48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      // iOS standard
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: [{ url: '/favicon.ico' }],
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
    url: siteUrl,
    siteName: 'PattiBytes Express',
    title: 'PattiBytes Express - Food Delivery',
    description: 'Fast food delivery in Patti, Punjab',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'PattiBytes Express',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'PattiBytes Express',
    description: 'Fast food delivery in Patti, Punjab',
    images: ['/og.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#f97316',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Organization Logo JSON-LD (helps Google associate logo with site) [web:268] */}
        <Script
          id="org-jsonld"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'PattiBytes Express',
              url: siteUrl,
              logo: `${siteUrl}/icon-512.png`,
              sameAs: [
                'https://www.instagram.com/pbexpress_38',
                'https://www.youtube.com/pattibytes',
              ],
            }),
          }}
        />

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
      </body>
    </html>
  );
}
