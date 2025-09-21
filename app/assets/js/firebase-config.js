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

// Firebase configuration
const firebaseConfig = {
    apiKey: "your-api-key-here",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
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
