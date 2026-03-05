/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Window-level flags survive HMR module resets ─────────────────────────────
// Module-level vars (let _initPromise) reset on every hot reload.
// window.__os* persists across HMR, preventing double-init and retry-on-domain-fail.
declare global {
  interface Window {
    __osInitialized?: boolean;  // SDK init succeeded
    __osInitFailed?: boolean;   // SDK init permanently failed (domain error)
    __osInitPromise?: Promise<boolean>; // deduplicates concurrent calls
  }
}

// ── Registered production domains ────────────────────────────────────────────
// OneSignal.init() is HARD domain-locked to whatever you register in the dashboard.
// Adding localhost here will just make it reach OneSignal.init() which then throws.
// ✅ DO NOT add localhost — it will never work unless you register it in your
//    OneSignal dashboard AND use https (e.g. via ngrok).
const PROD_HOSTS = new Set([
  'pbexpress.pattibytes.com',
  // 'staging.pattibytes.com', // add if you have a staging domain
]);

export async function initOneSignal(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // ✅ Permanently failed on this domain (e.g. not registered) — don't retry
  if (window.__osInitFailed) return false;

  // ✅ Already initialized successfully — return immediately (survives HMR)
  if (window.__osInitialized) return true;

  // ✅ Already in progress — return same promise (deduplicates parallel calls)
  if (window.__osInitPromise) return window.__osInitPromise;

  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  if (!appId) {
    console.warn('[OneSignal] NEXT_PUBLIC_ONESIGNAL_APP_ID not set');
    return false;
  }

  // ✅ Skip silently on non-production domains (localhost, preview, etc.)
  const hostname = window.location.hostname;
  if (!PROD_HOSTS.has(hostname)) {
    // No warn — this is expected during development
    return false;
  }

  window.__osInitPromise = (async (): Promise<boolean> => {
    try {
      const OneSignal = (await import('react-onesignal')).default;
      await OneSignal.init({
        appId,
        serviceWorkerPath:  '/sw.js',
        serviceWorkerParam: { scope: '/' },
        welcomeNotification: { disable: true, message: '' },
      });
      window.__osInitialized = true;
      window.__osInitPromise = undefined;
      console.log('[OneSignal] initialized ✓');
      return true;
    } catch (e: any) {
      const msg: string = e?.message ?? '';
      window.__osInitPromise = undefined;

      if (msg.includes('already initialized')) {
        // ✅ HMR re-fired init on an already-running SDK — treat as success
        window.__osInitialized = true;
        console.info('[OneSignal] already initialized (HMR) — OK');
        return true;
      }

      if (msg.includes('Can only be used on') || msg.includes('domain')) {
        // ✅ Permanent domain error — stop all future retries
        window.__osInitFailed = true;
        console.warn(
          `[OneSignal] Domain "${hostname}" not registered in OneSignal dashboard. ` +
          'Add it at: https://dashboard.onesignal.com → Settings → Web Configuration'
        );
        return false;
      }

      // Transient error (network, etc.) — allow retry next call
      console.warn('[OneSignal] init failed (will retry):', msg);
      return false;
    }
  })();

  return window.__osInitPromise;
}

export async function loginOneSignal(userId: string, role: string): Promise<void> {
  if (typeof window === 'undefined') return;
  const ok = await initOneSignal();
  if (!ok) return;

  try {
    const OneSignal = (await import('react-onesignal')).default;
    await OneSignal.login(userId);
    await OneSignal.User.addTags({
      role,
      app:      'pattibytes-express-web',
      platform: 'web',
    });
  } catch (e: any) {
    console.warn('[OneSignal] login failed:', e?.message);
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
  } catch {
    return false;
  }
}

export async function isOneSignalSubscribed(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const ok = await initOneSignal();
  if (!ok) return false;
  try {
    const OneSignal = (await import('react-onesignal')).default;
    const optedIn = await OneSignal.User.PushSubscription.optedIn;
    return OneSignal.Notifications.permission && (optedIn ?? false);
  } catch {
    return false;
  }
}
