import type { AppProps } from 'next/app';
import '@/styles/globals.css';
import AuthProvider from '@/context/AuthContext';
import InstallPromptProvider from '@/components/InstallPromptProvider';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <InstallPromptProvider>
        <Component {...pageProps} />
      </InstallPromptProvider>
    </AuthProvider>
  );
}
