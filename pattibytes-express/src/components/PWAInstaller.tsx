'use client';

import { useEffect } from 'react';
import { registerServiceWorker, requestNotificationPermission } from '@/lib/pwa';

export default function PWAInstaller() {
  useEffect(() => {
    // Register service worker
    registerServiceWorker();

    // Request notification permission after 5 seconds
    const timer = setTimeout(() => {
      requestNotificationPermission();
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
