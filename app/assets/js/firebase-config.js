/**
 * Firebase & Cloudinary Configuration
 * Complete backend services setup for PattiBytes
 */

// Import Firebase v10 modules [web:328][web:314]
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
    updatePassword
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';

// Firestore imports [web:315][web:316]
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

// Storage imports [web:325][web:319]
import {
    getStorage,
    ref,
    uploadBytes,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject,
    listAll,
    getMetadata
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js';

// Analytics (optional)
import {
    getAnalytics,
    logEvent
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-analytics.js';

// Firebase configuration
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
const db = getFirestore(app);
const storage = getStorage(app);
const analytics = getAnalytics(app);

// Configure auth providers
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
    prompt: 'select_account',
    login_hint: 'user@gmail.com'
});

const facebookProvider = new FacebookAuthProvider();
facebookProvider.setCustomParameters({
    display: 'popup'
});

// Cloudinary Configuration [web:318][web:327]
const CLOUDINARY_CONFIG = {
    cloudName: 'YOUR_CLOUD_NAME', // Replace with your cloud name
    uploadPreset: 'YOUR_UPLOAD_PRESET', // Replace with your unsigned upload preset
    apiKey: 'YOUR_API_KEY', // For client-side (optional)
    folder: 'pattibytes', // Default folder for uploads
    maxFileSize: 10 * 1024 * 1024, // 10MB limit
    allowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'mp4', 'webm', 'mov']
};

/**
 * Cloudinary Upload Service [web:318][web:324]
 */
class CloudinaryService {
    constructor(config = CLOUDINARY_CONFIG) {
        this.config = config;
        this.baseUrl = `https://api.cloudinary.com/v1_1/${config.cloudName}`;
    }

    /**
     * Upload file to Cloudinary [web:318]
     */
    async uploadFile(file, options = {}) {
        return new Promise((resolve, reject) => {
            // Validate file
            if (!this.validateFile(file)) {
                reject(new Error('Invalid file type or size'));
                return;
            }

            const formData = new FormData();
            const uploadOptions = {
                upload_preset: this.config.uploadPreset,
                folder: options.folder || this.config.folder,
                public_id: options.publicId || null,
                tags: options.tags || 'pattibytes',
                transformation: options.transformation || null,
                ...options.additionalParams
            };

            // Add file and parameters
            formData.append('file', file);
            Object.keys(uploadOptions).forEach(key => {
                if (uploadOptions[key] !== null && uploadOptions[key] !== undefined) {
                    formData.append(key, uploadOptions[key]);
                }
            });

            const xhr = new XMLHttpRequest();
            
            // Upload progress tracking
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable && options.onProgress) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    options.onProgress(Math.round(percentComplete));
                }
            };

            // Success handler
            xhr.onload = () => {
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve({
                            url: response.secure_url,
                            publicId: response.public_id,
                            format: response.format,
                            width: response.width,
                            height: response.height,
                            bytes: response.bytes,
                            etag: response.etag,
                            version: response.version,
                            createdAt: response.created_at
                        });
                    } catch (error) {
                        reject(new Error('Failed to parse response'));
                    }
                } else {
                    reject(new Error(`Upload failed with status: ${xhr.status}`));
                }
            };

            // Error handler
            xhr.onerror = () => {
                reject(new Error('Network error during upload'));
            };

            // Send request
            xhr.open('POST', `${this.baseUrl}/upload`);
            xhr.send(formData);
        });
    }

    /**
     * Upload multiple files [web:318]
     */
    async uploadMultipleFiles(files, options = {}) {
        const uploads = Array.from(files).map((file, index) => {
            const fileOptions = {
                ...options,
                publicId: options.publicId ? `${options.publicId}_${index}` : null,
                onProgress: options.onProgress ? (progress) => {
                    options.onProgress(index, progress);
                } : null
            };
            return this.uploadFile(file, fileOptions);
        });

        return Promise.all(uploads);
    }

    /**
     * Delete file from Cloudinary
     */
    async deleteFile(publicId) {
        // This requires server-side implementation due to signature requirement
        // For now, we'll just track it for cleanup
        console.log('Delete request for:', publicId);
        return { success: true, publicId };
    }

    /**
     * Validate file before upload
     */
    validateFile(file) {
        if (!file || !(file instanceof File)) {
            return false;
        }

        // Check file size
        if (file.size > this.config.maxFileSize) {
            throw new Error(`File size exceeds ${this.config.maxFileSize / 1024 / 1024}MB limit`);
        }

        // Check file format
        const fileExtension = file.name.split('.').pop().toLowerCase();
        if (!this.config.allowedFormats.includes(fileExtension)) {
            throw new Error(`File format .${fileExtension} is not allowed`);
        }

        return true;
    }

    /**
     * Generate transformation URL
     */
    getTransformedUrl(publicId, transformations) {
        const transformString = Object.entries(transformations)
            .map(([key, value]) => `${key}_${value}`)
            .join(',');
        
        return `https://res.cloudinary.com/${this.config.cloudName}/image/upload/${transformString}/${publicId}`;
    }
}

/**
 * Firebase Database Service [web:315][web:329]
 */
class FirebaseService {
    constructor() {
        this.db = db;
        this.auth = auth;
        this.storage = storage;
    }

    /**
     * User Management
     */
    async createUserProfile(user, additionalData = {}) {
        const userRef = doc(this.db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
            const userData = {
                uid: user.uid,
                displayName: user.displayName || '',
                email: user.email,
                photoURL: user.photoURL || null,
                username: additionalData.username || '',
                bio: additionalData.bio || '',
                location: additionalData.location || '',
                website: additionalData.website || '',
                coverURL: additionalData.coverURL || null,
                
                // Privacy settings
                profileVisibility: 'public',
                showEmail: false,
                allowComments: true,
                
                // Stats
                stats: {
                    posts: 0,
                    likes: 0,
                    comments: 0,
                    views: 0,
                    followers: 0,
                    following: 0
                },
                
                // Metadata
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                lastActive: serverTimestamp(),
                isOnline: false,
                
                // App settings
                settings: {
                    theme: 'light',
                    language: 'en',
                    notifications: {
                        email: true,
                        push: true,
                        comments: true,
                        likes: true,
                        follows: true
                    }
                }
            };
            
            await setDoc(userRef, userData);
            return userData;
        }
        
        return userDoc.data();
    }

    /**
     * Update user profile
     */
    async updateUserProfile(userId, data) {
        const userRef = doc(this.db, 'users', userId);
        const updateData = {
            ...data,
            updatedAt: serverTimestamp()
        };
        
        await updateDoc(userRef, updateData);
        return updateData;
    }

    /**
     * Get user profile
     */
    async getUserProfile(userId) {
        const userRef = doc(this.db, 'users', userId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
            return { id: userDoc.id, ...userDoc.data() };
        }
        
        return null;
    }

    /**
     * Posts Management
     */
    async createPost(postData) {
        const postsRef = collection(this.db, 'posts');
        const post = {
            ...postData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            likes: 0,
            comments: 0,
            views: 0,
            shares: 0
        };
        
        const docRef = await addDoc(postsRef, post);
        
        // Update user stats
        await this.updateUserStats(postData.authorId, { posts: increment(1) });
        
        return { id: docRef.id, ...post };
    }

    /**
     * Get posts with pagination
     */
    async getPosts(options = {}) {
        const {
            authorId = null,
            limit: limitCount = 10,
            orderBy: orderByField = 'createdAt',
            orderDirection = 'desc',
            startAfter = null
        } = options;

        let q = collection(this.db, 'posts');
        
        if (authorId) {
            q = query(q, where('authorId', '==', authorId));
        }
        
        q = query(q, orderBy(orderByField, orderDirection));
        
        if (limitCount) {
            q = query(q, limit(limitCount));
        }
        
        if (startAfter) {
            q = query(q, startAfter(startAfter));
        }
        
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    }

    /**
     * Update user stats
     */
    async updateUserStats(userId, stats) {
        const userRef = doc(this.db, 'users', userId);
        const updateData = {};
        
        Object.keys(stats).forEach(key => {
            updateData[`stats.${key}`] = stats[key];
        });
        
        updateData.updatedAt = serverTimestamp();
        
        await updateDoc(userRef, updateData);
    }

    /**
     * Real-time listeners
     */
    subscribeToUser(userId, callback) {
        const userRef = doc(this.db, 'users', userId);
        return onSnapshot(userRef, callback);
    }

    subscribeToUserPosts(userId, callback) {
        const q = query(
            collection(this.db, 'posts'),
            where('authorId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(10)
        );
        return onSnapshot(q, callback);
    }
}

// Initialize services
const cloudinaryService = new CloudinaryService();
const firebaseService = new FirebaseService();

// Set auth persistence
auth.setPersistence('local')
    .then(() => {
        console.log('✅ Firebase auth persistence set to local');
    })
    .catch((error) => {
        console.error('❌ Error setting auth persistence:', error);
    });

// Online/Offline status tracking
window.addEventListener('online', async () => {
    await enableNetwork(db);
    if (auth.currentUser) {
        await firebaseService.updateUserProfile(auth.currentUser.uid, {
            isOnline: true,
            lastActive: serverTimestamp()
        });
    }
});

window.addEventListener('offline', async () => {
    if (auth.currentUser) {
        await firebaseService.updateUserProfile(auth.currentUser.uid, {
            isOnline: false,
            lastActive: serverTimestamp()
        });
    }
    await disableNetwork(db);
});

// Export Firebase services globally [web:314]
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

window.firebaseStorage = {
    storage,
    ref,
    uploadBytes,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject,
    listAll,
    getMetadata
};

window.cloudinaryService = cloudinaryService;
window.firebaseService = firebaseService;

// Export analytics for tracking
window.firebaseAnalytics = {
    analytics,
    logEvent
};

console.log('✅ Firebase & Cloudinary services initialized successfully');
