import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';

// Minimal type for the browser-only beforeinstallprompt event
type DeferredInstallEvent = Event & {
  prompt: () => Promise<{ outcome: 'accepted' | 'dismissed' }>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type Ctx = { canInstall: boolean; promptInstall: () => Promise<void> | void };
const InstallCtx = createContext<Ctx>({ canInstall: false, promptInstall: () => {} });
export const useInstall = () => useContext(InstallCtx);

export default function InstallPromptProvider({ children }: { children: React.ReactNode }) {
  const [canInstall, setCanInstall] = useState(false);
  const deferred = useRef<DeferredInstallEvent | null>(null);
  const router = useRouter();

  useEffect(() => {
    const onBIP = (e: Event) => {
      e.preventDefault();
      deferred.current = e as DeferredInstallEvent;
      setCanInstall(true);
      if (router.asPath.includes('install=1')) {
        // give the SW/manifest a moment to stabilize
        setTimeout(() => deferred.current?.prompt(), 400);
      }
    };
    window.addEventListener('beforeinstallprompt', onBIP);
    return () => window.removeEventListener('beforeinstallprompt', onBIP);
  }, [router.asPath]);

  const promptInstall = async () => {
    if (!deferred.current) return;
    await deferred.current.prompt();
    deferred.current = null;
    setCanInstall(false);
  };

  return (
    <InstallCtx.Provider value={{ canInstall, promptInstall }}>
      {children}
    </InstallCtx.Provider>
  );
}
