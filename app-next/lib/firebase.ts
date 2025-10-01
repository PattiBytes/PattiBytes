import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FB_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FB_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FB_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FB_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FB_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FB_APP_ID!,
  measurementId: process.env.NEXT_PUBLIC_FB_MEASUREMENT_ID
};

// Initialize Firebase only when config is valid and in browser/dev environment
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;

const initFirebase = () => {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) return;
  
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  } catch (error) {
    console.warn('Firebase initialization failed:', error);
  }
};

// Only initialize in browser or development
if (typeof window !== 'undefined') {
  initFirebase();
} else if (process.env.NODE_ENV === 'development') {
  initFirebase();
}

export { auth, db, storage };
