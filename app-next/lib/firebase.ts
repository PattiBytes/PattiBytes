import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Global instances
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

// Firebase config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FB_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FB_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FB_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FB_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FB_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FB_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FB_MEASUREMENT_ID
};

// Safe initialization function
export function getFirebaseClient() {
  // Only initialize in browser or when all required env vars are present
  if (typeof window === 'undefined') {
    // During SSR/build, only initialize if we have all required vars
    const requiredVars = [
      'NEXT_PUBLIC_FB_API_KEY',
      'NEXT_PUBLIC_FB_AUTH_DOMAIN', 
      'NEXT_PUBLIC_FB_PROJECT_ID'
    ];
    
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.warn(`Firebase not initialized during build - missing: ${missingVars.join(', ')}`);
      // Return null objects that won't crash but won't work either
      return {
        app: null,
        auth: null,
        db: null,
        storage: null
      };
    }
  }

  // Initialize if not already done
  if (!app) {
    try {
      app = getApps()[0] || initializeApp(firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);
      storage = getStorage(app);
    } catch (error) {
      console.error('Firebase initialization failed:', error);
      return {
        app: null,
        auth: null,
        db: null,
        storage: null
      };
    }
  }

  return { app, auth, db, storage };
}

// Export individual services for convenience
export const { auth: firebaseAuth, db: firebaseDb, storage: firebaseStorage } = getFirebaseClient();

// Default export
export default getFirebaseClient;
