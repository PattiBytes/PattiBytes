// /app-next/pages/_document.tsx
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  // Keep this env in sync with APP_BASE_PATH to generate correct URLs in the HTML head.
  const base = process.env.NEXT_PUBLIC_BASE_PATH || '';

  return (
    <Html lang="pa-IN">
      <Head>
        {/* PWA manifest and platform meta */}
        <link rel="manifest" href={`${base}/manifest.webmanifest`} />
        <meta name="application-name" content="PattiBytes" />
        <meta name="theme-color" content="#667eea" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />

        {/* Icons */}
        <link rel="icon" href={`${base}/icons/pwab-192.png`} sizes="192x192" />
        <link rel="icon" href={`${base}/icons/pwab-512.png`} sizes="512x512" />
        <link rel="apple-touch-icon" href={`${base}/icons/pwab-192.png`} />
        {/* Optional maskable */}
        <link rel="icon" href={`${base}/icons/pwab-512.png`} type="image/png" />

        {/* SEO/basic */}
        <meta name="description" content="Latest Patti news, places, and community services." />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
