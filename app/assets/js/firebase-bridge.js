(async () => {
  if (!window.FIREBASE_CONFIG) { console.error('FIREBASE_CONFIG missing'); return; }

  // Prefer local vendor builds; fallback to CDN if vendor missing
  async function safeImport(path, cdn){
    try { return await import(path); }
    catch { return await import(cdn); }
  }

  const appMod = await safeImport('/app/vendor/firebase/firebase-app.js', 'https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js');
  const authMod = await safeImport('/app/vendor/firebase/firebase-auth.js', 'https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js');
  const fsMod   = await safeImport('/app/vendor/firebase/firebase-firestore.js', 'https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js');
  const stMod   = await safeImport('/app/vendor/firebase/firebase-storage.js', 'https://www.gstatic.com/firebasejs/10.12.3/firebase-storage.js');

  const app = appMod.initializeApp(window.FIREBASE_CONFIG);

  const auth = authMod.getAuth(app);
  window.firebaseAuth = {
    auth,
    GoogleAuthProvider: authMod.GoogleAuthProvider,
    signInWithPopup: authMod.signInWithPopup,
    signInWithRedirect: authMod.signInWithRedirect,
    signInWithEmailAndPassword: authMod.signInWithEmailAndPassword,
    createUserWithEmailAndPassword: authMod.createUserWithEmailAndPassword,
    updateProfile: authMod.updateProfile,
    sendPasswordResetEmail: authMod.sendPasswordResetEmail,
    onAuthStateChanged: authMod.onAuthStateChanged,
    signOut: authMod.signOut
  };

  const db = fsMod.getFirestore(app);
  window.firebaseFirestore = {
    db, doc: fsMod.doc, getDoc: fsMod.getDoc, setDoc: fsMod.setDoc, updateDoc: fsMod.updateDoc
  };

  const storage = stMod.getStorage(app);
  window.firebaseStorage = {
    storage, ref: stMod.ref, uploadBytes: stMod.uploadBytes, getDownloadURL: stMod.getDownloadURL
  };

  console.log('Firebase bridge ready');
})();
