// lib/pwa.ts

// Type for beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const isStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // PWA display-mode check (all modern browsers)
  return window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS legacy PWA check
    (navigator as { standalone?: boolean }).standalone === true ||
    // Android TWA check
    document.referrer.includes('android-app://');
};

export const isiOS = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && 
         !('MSStream' in window);
};

export const isAndroid = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return /android/i.test(navigator.userAgent);
};

export const canInstallPWA = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check if already installed
  if (isStandalone()) return false;
  
  // Check if on supported browser
  return isiOS() || isAndroid() || ('serviceWorker' in navigator);
};

export const isPWAInstallable = (): boolean => {
  return !isStandalone() && canInstallPWA();
};

// Get install prompt
let deferredPrompt: BeforeInstallPromptEvent | null = null;

export const setDeferredPrompt = (prompt: BeforeInstallPromptEvent | null) => {
  deferredPrompt = prompt;
};

export const getDeferredPrompt = (): BeforeInstallPromptEvent | null => {
  return deferredPrompt;
};

export const clearDeferredPrompt = () => {
  deferredPrompt = null;
};

// Helper to show install prompt
export const showInstallPrompt = async (): Promise<boolean> => {
  if (!deferredPrompt) {
    console.warn('Install prompt not available');
    return false;
  }

  try {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    clearDeferredPrompt();
    return outcome === 'accepted';
  } catch (error) {
    console.error('Error showing install prompt:', error);
    return false;
  }
};
