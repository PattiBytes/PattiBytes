import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  Auth, 
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { 
  getFirestore, 
  Firestore, 
  enableNetwork,
  disableNetwork
} from 'firebase/firestore';
import { 
  getStorage, 
  FirebaseStorage
} from 'firebase/storage';
import { getAnalytics, Analytics, isSupported } from 'firebase/analytics';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FB_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FB_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FB_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FB_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FB_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FB_APP_ID!,
  measurementId: process.env.NEXT_PUBLIC_FB_MEASUREMENT_ID || ''
};

interface FirebaseClient {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
  googleProvider: GoogleAuthProvider;
  analytics?: Analytics;
}

let firebaseClient: FirebaseClient | null = null;
let isOffline = false;

export function getFirebaseClient(): FirebaseClient {
  if (firebaseClient) {
    return firebaseClient;
  }

  // Initialize app
  const existingApps = getApps();
  const app: FirebaseApp = existingApps.length === 0 ? initializeApp(firebaseConfig) : existingApps[0];
  
  // Initialize services
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);
  
  // Set auth persistence
  if (typeof window !== 'undefined') {
    setPersistence(auth, browserLocalPersistence).catch(console.error);
  }
  
  // Create Google provider with enhanced config
  const googleProvider = new GoogleAuthProvider();
  googleProvider.addScope('email');
  googleProvider.addScope('profile');
  googleProvider.setCustomParameters({
    prompt: 'select_account'
  });

  // Initialize Analytics (only in production and client-side)
  let analytics: Analytics | undefined;
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    isSupported().then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    }).catch(console.error);
  }

  firebaseClient = {
    app,
    auth,
    db,
    storage,
    googleProvider,
    analytics
  };

  return firebaseClient;
}

// Network status management
export function goOffline(): Promise<void> {
  if (!isOffline) {
    isOffline = true;
    const { db } = getFirebaseClient();
    return disableNetwork(db);
  }
  return Promise.resolve();
}

export function goOnline(): Promise<void> {
  if (isOffline) {
    isOffline = false;
    const { db } = getFirebaseClient();
    return enableNetwork(db);
  }
  return Promise.resolve();
}

// Check if Firebase is properly configured
export function isFirebaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_FB_API_KEY &&
    process.env.NEXT_PUBLIC_FB_AUTH_DOMAIN &&
    process.env.NEXT_PUBLIC_FB_PROJECT_ID
  );
}

// Export individual services for convenience (Named Exports)
let servicesCache: {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
  googleProvider: GoogleAuthProvider;
} | null = null;

function getServices() {
  if (!servicesCache) {
    const client = getFirebaseClient();
    servicesCache = {
      app: client.app,
      auth: client.auth,
      db: client.db,
      storage: client.storage,
      googleProvider: client.googleProvider
    };
  }
  return servicesCache;
}

export const { app, auth, db, storage, googleProvider } = getServices();

// Also export as default
export default getFirebaseClient();
