// /app-next/pages/_app.tsx
import type { AppProps } from 'next/app';
import InstallPromptProvider, { useInstall } from '@/components/InstallPromptProvider';

function InstallButton() {
  const { canInstall, promptInstall } = useInstall();
  if (!canInstall) return null;
  return (
    <button onClick={() => promptInstall()} aria-label="Install app">
      📲 Install PattiBytes
    </button>
  );
}

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <InstallPromptProvider>
      <InstallButton />
      <Component {...pageProps} />
    </InstallPromptProvider>
  );
}
