import type { AppProps } from 'next/app';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from 'react-hot-toast';
import '@/styles/globals.css';
// Add these imports at the top
import '@/styles/admin-theme.css';
import '@/styles/admin-mixins.css';
import '@/styles/AdminLayout.module.css';


export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--card-bg)',
            color: 'var(--text)',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: 'white'
            }
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: 'white'
            }
          }
        }}
      />
      <Component {...pageProps} />
    </AuthProvider>
  );
}
