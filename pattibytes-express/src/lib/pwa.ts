export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }
  return null;
};

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

export const subscribeToPushNotifications = async () => {
  const registration = await navigator.serviceWorker.ready;
  
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  });

  // Send subscription to your backend
  return subscription;
};

// Check if app is installed
export const isAppInstalled = () => {
  if (typeof window === 'undefined') return false;
  
  // Check if running as PWA
  return window.matchMedia('(display-mode: standalone)').matches ||
         // eslint-disable-next-line @typescript-eslint/no-explicit-any
         (window.navigator as any).standalone === true ||
         document.referrer.includes('android-app://');
};

// Detect device type
export const getDeviceType = (): 'ios' | 'android' | 'desktop' => {
  if (typeof navigator === 'undefined') return 'desktop';
  
  const userAgent = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
  if (/android/.test(userAgent)) return 'android';
  return 'desktop';
};
