/**
 * Firebase Bridge (local ESM imports, no external URLs)
 * Exposes window.firebaseAuth / window.firebaseFirestore / window.firebaseStorage
 */
(async () => {
  if (!window.FIREBASE_CONFIG) { console.error('FIREBASE_CONFIG missing'); return; }

  // Local ESM builds
  const [{ initializeApp }, { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail, onAuthStateChanged, signOut },
         { getFirestore, doc, getDoc, setDoc, updateDoc },
         { getStorage, ref, uploadBytes, getDownloadURL }] = await Promise.all([
    import('/app/vendor/firebase/firebase-app.js'),
    import('/app/vendor/firebase/firebase-auth.js'),
    import('/app/vendor/firebase/firebase-firestore.js'),
    import('/app/vendor/firebase/firebase-storage.js')
  ]);

  const app = initializeApp(window.FIREBASE_CONFIG);
  // Auth
  const auth = getAuth(app);
  window.firebaseAuth = {
    auth,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    sendPasswordResetEmail,
    onAuthStateChanged,
    signOut
  };
  // Firestore
  const db = getFirestore(app);
  window.firebaseFirestore = { db, doc, getDoc, setDoc, updateDoc };
  // Storage
  const storage = getStorage(app);
  window.firebaseStorage = { storage, ref, uploadBytes, getDownloadURL };

  console.log('Firebase bridge ready');
})();
