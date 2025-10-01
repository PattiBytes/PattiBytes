import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Browser-exposed config via NEXT_PUBLIC_* (required by Firebase Web) 
const cfg = {
  apiKey: process.env.NEXT_PUBLIC_FB_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FB_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FB_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FB_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FB_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FB_APP_ID!,
  measurementId: process.env.NEXT_PUBLIC_FB_MEASUREMENT_ID
};

let appRef: FirebaseApp | null = null;
let authRef: Auth | null = null;
let dbRef: Firestore | null = null;
let storageRef: FirebaseStorage | null = null;

function initClient() {
  if (!appRef) {
    if (!cfg.apiKey || !cfg.projectId) throw new Error('Missing Firebase env config');
    const app = getApps().length ? getApp() : initializeApp(cfg);
    appRef = app;
    authRef = getAuth(app);
    dbRef = getFirestore(app);
    storageRef = getStorage(app);
  }
}

export function getFirebaseClient(): { auth: Auth; db: Firestore; storage: FirebaseStorage } {
  if (typeof window === 'undefined') throw new Error('Firebase client is browser-only');
  initClient();
  if (!authRef || !dbRef || !storageRef) throw new Error('Firebase not initialized');
  return { auth: authRef, db: dbRef, storage: storageRef };
}

// Optional: named exports remain for callers that already null-check
export const auth = authRef || undefined;
export const db = dbRef || undefined;
export const storage = storageRef || undefined;
