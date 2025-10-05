import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
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

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let googleProvider: GoogleAuthProvider | null = null;

export function getFirebaseClient() {
  if (typeof window === 'undefined' && !isFirebaseConfigured()) {
    return { app: null, auth: null, db: null, storage: null, googleProvider: null };
  }

  if (!app && isFirebaseConfigured()) {
    app = getApps()[0] || initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    googleProvider = new GoogleAuthProvider();
    
    // Configure Google Provider
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
  }

  return { app, auth, db, storage, googleProvider };
}

export { app, auth, db, storage, googleProvider };
