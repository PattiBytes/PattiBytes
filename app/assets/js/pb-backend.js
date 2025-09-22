/**
 * Firebase & Cloudinary Configuration - FREE TIER OPTIMIZED
 * Complete backend services setup for PattiBytes
 * Cloudinary Config: dpzrheprv / pattibytes_unsigned
 * Reads Firebase config from window.FIREBASE_CONFIG injected at build time.
 */

// Imports (Firebase v10)
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
  onSnapshot,
  enableNetwork,
  disableNetwork
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

// Optional analytics (guarded)
let getAnalytics, logEvent;
try {
  const mod = await import('https://www.gstatic.com/firebasejs/10.12.4/firebase-analytics.js');
  getAnalytics = mod.getAnalytics;
  logEvent = mod.logEvent;
} catch { /* skip analytics in unsupported contexts */ }

// Firebase config from build-time secrets
const firebaseConfig = window.FIREBASE_CONFIG || {
  apiKey: "YOUR_KEY",
  authDomain: "YOUR_DOMAIN",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_BUCKET",
  messagingSenderId: "YOUR_SENDER",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase (free services only)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = (typeof window !== 'undefined' && location.protocol.startsWith('http') && getAnalytics)
  ? getAnalytics(app) : null;

// Providers
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const facebookProvider = new FacebookAuthProvider();
facebookProvider.setCustomParameters({ display: 'popup' });

// Cloudinary configuration (unsigned uploads, free tier)
const CLOUDINARY_CONFIG = {
  cloudName: 'dpzrheprv',
  uploadPreset: 'pattibytes_unsigned',
  folder: 'pattibytes',
  maxFileSize: 10 * 1024 * 1024,
  allowedFormats: ['jpg','jpeg','png','gif','webp','svg','bmp','mp4','webm','mov']
};

// Cloudinary service
class CloudinaryService {
  constructor(config = CLOUDINARY_CONFIG) {
    this.config = config;
    this.baseUrl = `https://api.cloudinary.com/v1_1/${config.cloudName}`;
  }
  validateFile(file) {
    if (!file || !(file instanceof File)) return false;
    if (file.size > this.config.maxFileSize) throw new Error(`File size exceeds ${this.config.maxFileSize/1024/1024}MB limit`);
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!this.config.allowedFormats.includes(ext)) throw new Error(`File format .${ext} is not allowed`);
    return true;
  }
  uploadFile(file, options = {}) {
    return new Promise((resolve, reject) => {
      try { this.validateFile(file); } catch (e) { reject(e); return; }
      const form = new FormData();
      const params = {
        upload_preset: this.config.uploadPreset,
        folder: options.folder || this.config.folder,
        public_id: options.publicId || null,
        tags: options.tags || 'pattibytes',
        context: `app=pattibytes|version=1.0`,
        ...options.additionalParams
      };
      form.append('file', file);
      Object.entries(params).forEach(([k,v]) => (v ?? v === 0) && form.append(k,v));
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = e => {
        if (e.lengthComputable && typeof options.onProgress === 'function') {
          options.onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
      xhr.onload = () => {
        if (xhr.status === 200) {
          try {
            const r = JSON.parse(xhr.responseText);
            resolve({
              url: r.secure_url, publicId: r.public_id, format: r.format,
              width: r.width, height: r.height, bytes: r.bytes, etag: r.etag,
              version: r.version, createdAt: r.created_at, resourceType: r.resource_type
            });
          } catch { reject(new Error('Failed to parse upload response')); }
        } else { reject(new Error(`Upload failed with status: ${xhr.status}`)); }
      };
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.open('POST', `${this.baseUrl}/upload`);
      xhr.send(form);
    });
  }
  async uploadMultipleFiles(files, options = {}) {
    const tasks = Array.from(files).map((file, i) => this.uploadFile(file, {
      ...options,
      publicId: options.publicId ? `${options.publicId}_${i}` : null,
      onProgress: options.onProgress ? (p) => options.onProgress(i, p, file.name) : null
    }));
    return Promise.all(tasks);
  }
  getOptimizedUrl(publicId, t = {}) {
    const { width='auto', height='auto', crop='fill', quality='auto', format='auto', fetchFormat='auto', flags=null } = t;
    let s = `w_${width},h_${height},c_${crop},q_${quality},f_${format}`;
    if (fetchFormat !== 'auto') s += `,f_${fetchFormat}`;
    if (flags) s += `,fl_${flags}`;
    return `https://res.cloudinary.com/${this.config.cloudName}/image/upload/${s}/${publicId}`;
  }
  getAvatarUrl(publicId, size=150) {
    return this.getOptimizedUrl(publicId, { width:size, height:size, crop:'fill', gravity:'face', quality:'auto', format:'auto' });
  }
  getCoverUrl(publicId, width=800, height=400) {
    return this.getOptimizedUrl(publicId, { width, height, crop:'fill', quality:'auto', format:'auto' });
  }
  async deleteFile(publicId) {
    console.log('Delete queued:', publicId);
    return { success:true, publicId, note:'Queued for deletion' };
  }
}

// Firestore helpers
class FirebaseService {
  constructor() { this.db = db; this.auth = auth; }
  async createUserProfile(user, additional = {}) {
    const ref = doc(this.db, 'users', user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const data = {
        uid: user.uid,
        displayName: user.displayName || '',
        email: user.email || '',
        photoURL: user.photoURL || null,
        username: additional.username || '',
        bio: additional.bio || '',
        location: additional.location || '',
        website: additional.website || '',
        coverURL: additional.coverURL || null,
        profileVisibility: 'public',
        showEmail: false,
        allowComments: true,
        stats: { posts:0, likes:0, comments:0, views:0, followers:0, following:0, photosUploaded:0, storageUsed:0 },
        cloudinary: { publicIds:[], totalBytes:0, lastCleanup:null },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastActive: serverTimestamp(),
        isOnline: false,
        settings: {
          theme:'light', language:'en',
          notifications:{ email:true, push:true, comments:true, likes:true, follows:true },
          privacy:{ showOnline:true, allowMessages:true, showLocation:false }
        }
      };
      await setDoc(ref, data);
      return data;
    }
    return snap.data();
  }
  async updateUserProfile(uid, data) {
    const ref = doc(this.db, 'users', uid);
    const update = { ...data, updatedAt: serverTimestamp() };
    if (data.photoURL?.includes('cloudinary.com')) update['cloudinary.publicIds'] = arrayUnion(this.extractPublicIdFromUrl(data.photoURL));
    if (data.coverURL?.includes('cloudinary.com')) update['cloudinary.publicIds'] = arrayUnion(this.extractPublicIdFromUrl(data.coverURL));
    await updateDoc(ref, update);
    return update;
  }
  extractPublicIdFromUrl(url) { try { return (url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/) || [])[1] || null; } catch { return null; } }
  async getUserProfile(uid) { const s = await getDoc(doc(this.db, 'users', uid)); return s.exists() ? { id:s.id, ...s.data() } : null; }
  async createPost(post) {
    const ref = await addDoc(collection(this.db, 'posts'), {
      ...post,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      likes:0, comments:0, views:0, shares:0,
      mediaUrls: post.mediaUrls || [], mediaTypes: post.mediaTypes || []
    });
    await this.updateUserStats(post.authorId, { posts: increment(1) });
    return { id: ref.id, ...post };
  }
  async getPosts({ authorId=null, limit:lim=10, orderBy:field='createdAt', orderDirection='desc' } = {}) {
    let qRef = collection(this.db, 'posts');
    if (authorId) qRef = query(qRef, where('authorId','==',authorId));
    qRef = query(qRef, orderBy(field, orderDirection), limit(lim));
    const snap = await getDocs(qRef);
    return snap.docs.map(d => ({ id:d.id, ...d.data() }));
  }
  async updateUserStats(uid, stats) {
    const ref = doc(this.db, 'users', uid);
    const update = {};
    Object.keys(stats).forEach(k => update[`stats.${k}`] = stats[k]);
    update.updatedAt = serverTimestamp();
    await updateDoc(ref, update);
  }
  subscribeToUser(uid, cb){ return onSnapshot(doc(this.db, 'users', uid), cb); }
  subscribeToUserPosts(uid, cb){
    const qRef = query(collection(this.db,'posts'), where('authorId','==',uid), orderBy('createdAt','desc'), limit(10));
    return onSnapshot(qRef, cb);
  }
  async getCloudinaryUsage(uid){ const u = await this.getUserProfile(uid); return u?.cloudinary || { publicIds:[], totalBytes:0, lastCleanup:null }; }
}

// Initialize services
const cloudinaryService = new CloudinaryService();
const firebaseService = new FirebaseService();

// Correct persistence (modular API)
try {
  await setPersistence(auth, browserLocalPersistence);
  console.log('Auth persistence: local');
} catch (e) {
  console.warn('Persistence set failed (continuing):', e?.message || e);
}

// Online/Offline handling
window.addEventListener('online', async () => {
  try { await enableNetwork(db); } catch {}
  if (auth.currentUser) {
    try { await firebaseService.updateUserProfile(auth.currentUser.uid, { isOnline:true, lastActive: serverTimestamp() }); } catch {}
  }
});
window.addEventListener('offline', async () => {
  if (auth.currentUser) {
    try { await firebaseService.updateUserProfile(auth.currentUser.uid, { isOnline:false, lastActive: serverTimestamp() }); } catch {}
  }
  try { await disableNetwork(db); } catch {}
});

// Global bridges (expected by UI)
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
  updateProfile,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updateEmail,
  updatePassword
};

window.firebaseFirestore = {
  db, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, orderBy,
  limit, getDocs, addDoc, writeBatch, increment, arrayUnion, arrayRemove, serverTimestamp, onSnapshot
};

window.cloudinaryService = cloudinaryService;
window.firebaseService = firebaseService;
window.firebaseAnalytics = { analytics, logEvent };

console.log('✅ Firebase + Cloudinary initialized (free tier optimized)');
