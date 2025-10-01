// /app-next/pages/_document.tsx
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="pa-IN">
      <Head>
        {/* PWA */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="application-name" content="PattiBytes" />
        <meta name="theme-color" content="#667eea" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />

        {/* Icons */}
        <link rel="icon" href="/icons/pwab-192.png" sizes="192x192" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/pwab-192.png" />

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
