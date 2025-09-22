// app/assets/js/pb-backend-cdn.js
// Load as: <script type="module" src="/app/assets/js/pb-backend-cdn.js"></script>

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup, onAuthStateChanged,
  updateProfile, deleteUser, reauthenticateWithCredential, EmailAuthProvider,
  updateEmail, updatePassword, setPersistence, browserLocalPersistence
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query,
  where, orderBy, limit, getDocs, addDoc, writeBatch, increment, arrayUnion,
  arrayRemove, serverTimestamp, onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

// Optional Analytics (guarded)
let analytics = null, logEvent = () => {};
try {
  if (window.FIREBASE_CONFIG?.measurementId) {
    const { getAnalytics, logEvent: _logEvent } =
      await import('https://www.gstatic.com/firebasejs/10.12.4/firebase-analytics.js');
    const appForAnalytics = initializeApp(window.FIREBASE_CONFIG, 'analytics-only');
    analytics = getAnalytics(appForAnalytics);
    logEvent = _logEvent;
  }
} catch { /* ignore analytics errors */ }

// Initialize core app
const app = initializeApp(window.FIREBASE_CONFIG);

// Auth
const auth = getAuth(app);
await setPersistence(auth, browserLocalPersistence).catch(() => {});
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Firestore
const db = getFirestore(app);

// Expose bridges expected by UI
window.firebaseAuth = {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  signInWithPopup,
  googleProvider,
  onAuthStateChanged,
  updateProfile,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updateEmail,
  updatePassword
};

window.firebaseFirestore = {
  db, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where,
  orderBy, limit, getDocs, addDoc, writeBatch, increment, arrayUnion,
  arrayRemove, serverTimestamp, onSnapshot
};

window.firebaseAnalytics = { analytics, logEvent };

// Signal readiness to the UI
document.dispatchEvent(new CustomEvent('patti:firebase:ready'));
console.log('✅ Firebase ready (CDN, modular)');
