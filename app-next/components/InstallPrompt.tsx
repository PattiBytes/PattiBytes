import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaDownload, FaApple } from 'react-icons/fa';
import SafeImage from './SafeImage';
import styles from '@/styles/InstallPrompt.module.css';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Navigator {
    standalone?: boolean;
  }

  interface Window {
    MSStream?: unknown;
  }
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

    // Check if already installed
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches || 
                       navigator.standalone === true;
    const hasPromptDismissed = localStorage.getItem('installPromptDismissed');

    if (isInstalled || hasPromptDismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt after 5 seconds
      setTimeout(() => {
        setShowPrompt(true);
      }, 5000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // For iOS, show after 10 seconds
    if (iOS && !isInstalled && !hasPromptDismissed) {
      setTimeout(() => {
        setShowPrompt(true);
      }, 10000);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [isIOS]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowPrompt(false);
      localStorage.setItem('installPromptDismissed', 'true');
    }

    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('installPromptDismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        className={styles.installPrompt}
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 20 }}
      >
        <div className={styles.content}>
          <div className={styles.icon}>
            <SafeImage 
              src="/icons/pwab-192.jpg" 
              alt="PattiBytes" 
              width={56}
              height={56}
            />
          </div>
          <div className={styles.text}>
            <h3>ਪੱਟੀਬਾਈਟਸ ਐਪ ਲਗਾਓ</h3>
            <p>
              {isIOS ? (
                <>
                  <FaApple /> Tap Share, then &ldquo;Add to Home Screen&rdquo;
                </>
              ) : (
                'Get quick access from your home screen'
              )}
            </p>
          </div>
          <div className={styles.actions}>
            {!isIOS && deferredPrompt && (
              <button onClick={handleInstall} className={styles.installBtn}>
                <FaDownload /> Install
              </button>
            )}
            <button onClick={handleDismiss} className={styles.dismissBtn} aria-label="Dismiss">
              <FaTimes />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
