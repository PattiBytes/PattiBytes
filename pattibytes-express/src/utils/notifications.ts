export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export function sendBrowserNotification(title: string, body: string, icon?: string) {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: icon || '/icon-192.png',
      badge: '/icon-192.png',
    });
  }
}

export async function subscribeToNotifications() {
  try {
    const permission = await requestNotificationPermission();
    if (!permission) return null;

    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      
      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      return subscription;
    }
  } catch (error) {
    console.error('Failed to subscribe to notifications:', error);
    return null;
  }
}
