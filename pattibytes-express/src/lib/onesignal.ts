/* eslint-disable @typescript-eslint/no-explicit-any */

declare global {
  interface Window {
    __osInitialized?: boolean;
    __osInitFailed?: boolean;
    __osInitPromise?: Promise<boolean>;
  }
}

const PROD_HOSTS = new Set(['pbexpress.pattibytes.com']);

export async function initOneSignal(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (window.__osInitFailed)  return false;
  if (window.__osInitialized) return true;
  if (window.__osInitPromise) return window.__osInitPromise;

  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  if (!appId) { console.warn('[OneSignal] NEXT_PUBLIC_ONESIGNAL_APP_ID not set'); return false; }

  const hostname = window.location.hostname;
  if (!PROD_HOSTS.has(hostname)) return false; // silent on localhost

 window.__osInitPromise = (async (): Promise<boolean> => {
  try {
    const OneSignal = (await import('react-onesignal')).default;
    await OneSignal.init({
      appId,
      // ✅ Point OneSignal at your merged SW — critical fix
      serviceWorkerPath:  'sw.js',
      serviceWorkerParam: { scope: '/' },
      welcomeNotification: { disable: true, message: '' },
    });
    window.__osInitialized = true;
    window.__osInitPromise  = undefined;
    console.log('[OneSignal] initialized ✓');
    return true;
  } catch (e: any) {
      const msg: string = e?.message ?? '';
      window.__osInitPromise = undefined;
      if (msg.includes('already initialized')) {
        window.__osInitialized = true;
        console.info('[OneSignal] already initialized (HMR) — OK');
        return true;
      }
      if (msg.includes('Can only be used on') || msg.includes('domain')) {
        window.__osInitFailed = true;
        console.warn(`[OneSignal] Domain "${hostname}" not registered.`);
        return false;
      }
      console.warn('[OneSignal] init failed (will retry):', msg);
      return false;
    }
  })();

  return window.__osInitPromise;
}

// ── Wait for push token before calling login() ────────────────────────────────
async function waitForSubscription(OneSignal: any, timeoutMs = 6000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const token = OneSignal.User?.PushSubscription?.token;
    if (token) return;
    await new Promise(r => setTimeout(r, 400));
  }
  // Timeout OK — SDK retries SetAlias internally
}

export async function loginOneSignal(userId: string, role: string): Promise<void> {
  if (typeof window === 'undefined') return;
  const ok = await initOneSignal();
  if (!ok) return;
  try {
    const OneSignal = (await import('react-onesignal')).default;
    // ✅ Wait for subscription token — prevents identity 404 error
    await waitForSubscription(OneSignal);
    await OneSignal.login(userId);
    await OneSignal.User.addTags({ role, app: 'pattibytes-express-web', platform: 'web' });
  } catch (e: any) {
    console.warn('[OneSignal] login failed (SDK will retry):', e?.message);
  }
}

export async function logoutOneSignal(): Promise<void> {
  if (typeof window === 'undefined') return;
  const ok = await initOneSignal();
  if (!ok) return;
  try {
    const OneSignal = (await import('react-onesignal')).default;
    await OneSignal.logout();
  } catch { /* silent */ }
}

export async function getPushPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  return Notification.permission;
}

export async function requestPushPermission(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const ok = await initOneSignal();
  if (!ok) return false;
  try {
    const OneSignal = (await import('react-onesignal')).default;
    await OneSignal.Notifications.requestPermission();
    return OneSignal.Notifications.permission;
  } catch { return false; }
}

export async function isOneSignalSubscribed(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const ok = await initOneSignal();
  if (!ok) return false;
  try {
    const OneSignal = (await import('react-onesignal')).default;
    const optedIn = await OneSignal.User.PushSubscription.optedIn;
    return OneSignal.Notifications.permission && (optedIn ?? false);
  } catch { return false; }
}
