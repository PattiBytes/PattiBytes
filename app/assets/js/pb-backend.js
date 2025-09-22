// /app/assets/js/pb-backend.js
// Reads window.FIREBASE_CONFIG (generated at build) and exposes window.firebaseAuth / firebaseFirestore.
// Local vendor imports (copy Firebase ESM files into /app/vendor/firebase/*)
import { initializeApp } from '/app/vendor/firebase/firebase-app.js';
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  sendPasswordResetEmail, GoogleAuthProvider, FacebookAuthProvider, signInWithPopup,
  onAuthStateChanged, updateProfile, deleteUser, reauthenticateWithCredential,
  EmailAuthProvider, updateEmail, updatePassword, setPersistence, browserLocalPersistence
} from '/app/vendor/firebase/firebase-auth.js';
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where,
  orderBy, limit, getDocs, addDoc, writeBatch, increment, arrayUnion, arrayRemove,
  serverTimestamp, onSnapshot, enableNetwork, disableNetwork
} from '/app/vendor/firebase/firebase-firestore.js';

// Optional analytics guarded (remove or keep disabled if config incomplete)
let analytics = null, logEvent = () => {};
try {
  const mod = await import('/app/vendor/firebase/firebase-analytics.js');
  if (window.FIREBASE_CONFIG?.apiKey?.startsWith('AIza')) {
    const { getAnalytics, logEvent: _logEvent } = mod;
    analytics = getAnalytics(initializeApp(window.FIREBASE_CONFIG));
    logEvent = _logEvent;
  }
} catch { /* skip analytics if vendor not present */ }

// Initialize core services once
const app = initializeApp(window.FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);

// Providers
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
const facebookProvider = new FacebookAuthProvider();
facebookProvider.setCustomParameters({ display: 'popup' });

// Cloudinary (unsigned)
const CLOUDINARY_CONFIG = {
  cloudName: 'dpzrheprv',
  uploadPreset: 'pattibytes_unsigned',
  folder: 'pattibytes',
  maxFileSize: 10 * 1024 * 1024,
  allowedFormats: ['jpg','jpeg','png','gif','webp','svg','bmp','mp4','webm','mov']
};
class CloudinaryService {
  constructor(cfg=CLOUDINARY_CONFIG){ this.cfg=cfg; this.base=`https://api.cloudinary.com/v1_1/${cfg.cloudName}`; }
  validate(file){
    if (!(file instanceof File)) throw new Error('No file selected');
    if (file.size > this.cfg.maxFileSize) throw new Error(`Max ${this.cfg.maxFileSize/1024/1024}MB`);
    const ext=(file.name.split('.').pop()||'').toLowerCase();
    if (!this.cfg.allowedFormats.includes(ext)) throw new Error(`.${ext} not allowed`);
  }
  uploadFile(file,opts={}){
    this.validate(file);
    return new Promise((res,rej)=>{
      const fd=new FormData();
      const p={ upload_preset:this.cfg.uploadPreset, folder:opts.folder||this.cfg.folder,
        public_id:opts.publicId||null, tags:opts.tags||'pattibytes', context:'app=pattibytes' };
      fd.append('file',file); Object.entries(p).forEach(([k,v])=> (v??v===0) && fd.append(k,v));
      const xhr=new XMLHttpRequest();
      xhr.upload.onprogress=e=> e.lengthComputable && opts.onProgress?.(Math.round(e.loaded/e.total*100));
      xhr.onload=()=> xhr.status===200 ? res(JSON.parse(xhr.responseText)) : rej(new Error(`Upload ${xhr.status}`));
      xhr.onerror=()=> rej(new Error('Network error'));
      xhr.open('POST', `${this.base}/upload`); xhr.send(fd);
    });
  }
}
class FirebaseService {
  constructor(){ this.db=db; this.auth=auth; }
  async createUserProfile(user,extra={}){
    const ref=doc(this.db,'users',user.uid); const snap=await getDoc(ref);
    if (!snap.exists()){
      const data={ uid:user.uid, displayName:user.displayName||'', email:user.email||'',
        photoURL:user.photoURL||null, username:extra.username||'', bio:extra.bio||'',
        coverURL:extra.coverURL||null, profileVisibility:'public', showEmail:false, allowComments:true,
        stats:{posts:0,likes:0,comments:0,views:0,followers:0,following:0,photosUploaded:0,storageUsed:0},
        cloudinary:{publicIds:[],totalBytes:0,lastCleanup:null},
        createdAt:serverTimestamp(), updatedAt:serverTimestamp(), lastActive:serverTimestamp(), isOnline:false,
        settings:{ theme:'light', language:'en', notifications:{email:true,push:true,comments:true,likes:true,follows:true},
          privacy:{showOnline:true,allowMessages:true,showLocation:false} } };
      await setDoc(ref,data); return data;
    }
    return snap.data();
  }
  async updateUserProfile(uid, data){
    const ref=doc(this.db,'users',uid); await updateDoc(ref,{...data,updatedAt:serverTimestamp()}); return true;
  }
}

await setPersistence(auth, browserLocalPersistence).catch(()=>{});

window.firebaseAuth = {
  auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail,
  signInWithPopup, googleProvider, facebookProvider, onAuthStateChanged, updateProfile, deleteUser,
  reauthenticateWithCredential, EmailAuthProvider, updateEmail, updatePassword
};
window.firebaseFirestore = {
  db, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, orderBy, limit,
  getDocs, addDoc, writeBatch, increment, arrayUnion, arrayRemove, serverTimestamp, onSnapshot,
  enableNetwork, disableNetwork
};
window.cloudinaryService = new CloudinaryService();
window.firebaseService = new FirebaseService();
window.firebaseAnalytics = { analytics, logEvent };
console.log('Firebase + Cloudinary ready');
