/**
 * Firebase Configuration and Initialization
 * Provides authentication services for PattiBytes app
 */

// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    sendPasswordResetEmail,
    GoogleAuthProvider,
    FacebookAuthProvider,
    signInWithPopup,
    onAuthStateChanged,
    updateProfile
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDSp4mE15rFn1Tdo4YARZ4MD3_vdnsYyog",
  authDomain: "pattibytes-cf602.firebaseapp.com",
  projectId: "pattibytes-cf602",
  storageBucket: "pattibytes-cf602.firebasestorage.app",
  messagingSenderId: "980629232960",
  appId: "1:980629232960:web:c169821e1f4bb409c2aea5",
  measurementId: "G-WGMH00XGJC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Configure providers
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
    prompt: 'select_account'
});

const facebookProvider = new FacebookAuthProvider();
facebookProvider.setCustomParameters({
    display: 'popup'
});

// Export Firebase services globally
window.firebaseAuth = {
    auth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    signInWithPopup,
    googleProvider,
    facebookProvider,
    onAuthStateChanged,
    updateProfile
};

// Set up auth state persistence
auth.setPersistence('local')
    .then(() => {
        console.log('Firebase auth persistence set to local');
    })
    .catch((error) => {
        console.error('Error setting auth persistence:', error);
    });

console.log('Firebase initialized successfully');
