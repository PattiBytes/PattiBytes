// VAPID push (enablePush, subscribeToNotifications) removed —
// push is handled by OneSignal SDK + OneSignalSDKWorker.js

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export function sendBrowserNotification(title: string, body: string, icon?: string) {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon:  icon ?? '/icon-192.png',
      badge: '/icon-192.png',
    });
  }
}
