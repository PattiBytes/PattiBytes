// app-next/lib/firebase.ts
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore as compatGetFirestore,
  Firestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
  clearIndexedDbPersistence,
} from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FB_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FB_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FB_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FB_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FB_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FB_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FB_MEASUREMENT_ID
};

export function isFirebaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_FB_API_KEY &&
    process.env.NEXT_PUBLIC_FB_AUTH_DOMAIN &&
    process.env.NEXT_PUBLIC_FB_PROJECT_ID
  );
}

// Singletons
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let googleProvider: GoogleAuthProvider | null = null;

// Optional: clear local IndexedDB cache (call manually if needed)
export async function clearFirestoreLocalCache(): Promise<void> {
  if (!db) return;
  try {
    await clearIndexedDbPersistence(db);
  } catch {
    // Will throw if there are active tabs; close other tabs before calling
  }
}

export function getFirebaseClient() {
  const isBrowser = typeof window !== 'undefined';

  if (!isBrowser && !isFirebaseConfigured()) {
    return { app: null, auth: null, db: null, storage: null, googleProvider: null };
  }

  if (!app && isFirebaseConfigured()) {
    app = getApps()[0] || initializeApp(firebaseConfig);
    auth = getAuth(app);

    // Use memory cache in development (prevents INTERNAL ASSERTION during HMR)
    // Allow forcing memory cache via env in any environment for hotfixing.
    const forceMemory = (process.env.NEXT_PUBLIC_FS_FORCE_MEMORY || '').toLowerCase() === '1';
    const usePersistent = !forceMemory && process.env.NODE_ENV === 'production';

    try {
      db = initializeFirestore(app, {
        experimentalAutoDetectLongPolling: true,
        localCache: usePersistent
          ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
          : memoryLocalCache(),
      });
    } catch {
      // Fallback to compat if modular init fails for any reason
      db = compatGetFirestore(app);
    }

    storage = getStorage(app);

    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
  }

  return { app, auth, db, storage, googleProvider };
}

export { app, auth, db, storage, googleProvider };
