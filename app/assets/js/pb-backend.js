// Load as: <script type="module" src="/app/assets/js/pb-backend.js"></script>
// Initializes Firebase (v10 ESM from CDN), sets persistence, and exposes window.firebaseAuth / window.firebaseFirestore.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  updateProfile,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updateEmail,
  updatePassword,
  setPersistence,
  browserLocalPersistence
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  writeBatch,
  increment,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

// Optional Analytics (guarded; auth works even if analytics cannot fetch config)
let analytics = null;
let logEvent = () => {};
try {
  if (window.FIREBASE_CONFIG?.measurementId) {
    const mod = await import('https://www.gstatic.com/firebasejs/10.12.4/firebase-analytics.js');
    const { getAnalytics, logEvent: _logEvent } = mod;
    const analyticsApp = initializeApp(window.FIREBASE_CONFIG, 'pb-analytics');
    analytics = getAnalytics(analyticsApp);
    logEvent = _logEvent;
  }
} catch {
  // ignore analytics issues to keep auth working
}

// Initialize core services
const app = initializeApp(window.FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);

// Persistence for email/password and Google
try { await setPersistence(auth, browserLocalPersistence); } catch {}

// Providers
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Expose a stable bridge for UI (canonical names + friendly aliases)
window.firebaseAuth = {
  // objects
  auth,
  googleProvider,

  // canonical modular functions
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  signInWithPopup,
  onAuthStateChanged,
  updateProfile,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updateEmail,
  updatePassword,

  // friendly aliases used by UI to avoid API name mismatches
  createUserEmail: createUserWithEmailAndPassword,
  signInEmail: signInWithEmailAndPassword,
  signInPopup: signInWithPopup,
  sendResetEmail: sendPasswordResetEmail
};

window.firebaseFirestore = {
  db,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  writeBatch,
  increment,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  onSnapshot
};

window.firebaseAnalytics = { analytics, logEvent };

// Notify UI that Firebase is ready (prevents race conditions)
document.dispatchEvent(new CustomEvent('patti:firebase:ready'));
console.log('✅ Firebase initialized (v10 ESM, CDN)');
