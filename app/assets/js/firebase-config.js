/**
 * Firebase & Cloudinary Configuration - FREE TIER OPTIMIZED
 * Complete backend services setup for PattiBytes
 * Cloudinary Config: dpzrheprv / pattibytes_unsigned
 */

// Import Firebase v10 modules (FREE services only)
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

// Firestore imports (FREE - 1GB storage)
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

// ❌ REMOVED Firebase Storage (not free anymore)
// Using Cloudinary instead for all media uploads

// Analytics (optional)
import {
    getAnalytics,
    logEvent
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-analytics.js';

// Firebase configuration
const firebaseConfig = {
  apiKey: "YOUR_KEY",
  authDomain: "YOUR_DOMAIN",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_BUCKET",
  messagingSenderId: "YOUR_SENDER",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase (FREE services only)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
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

// ✅ CLOUDINARY CONFIGURATION - YOUR ACTUAL SETTINGS
const CLOUDINARY_CONFIG = {
    cloudName: 'dpzrheprv', // ✅ Your cloud name
    uploadPreset: 'pattibytes_unsigned', // ✅ Your unsigned upload preset
    folder: 'pattibytes', // Default folder for uploads
    maxFileSize: 10 * 1024 * 1024, // 10MB limit (Cloudinary free supports up to 10MB)
    allowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'mp4', 'webm', 'mov']
};

/**
 * 📸 Cloudinary Upload Service (FREE 25GB)
 * Using your credentials: dpzrheprv / pattibytes_unsigned
 */
class CloudinaryService {
    constructor(config = CLOUDINARY_CONFIG) {
        this.config = config;
        this.baseUrl = `https://api.cloudinary.com/v1_1/${config.cloudName}`;
    }

    /**
     * Upload file to Cloudinary - Optimized for FREE tier
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
                upload_preset: this.config.uploadPreset, // pattibytes_unsigned
                folder: options.folder || this.config.folder, // pattibytes
                public_id: options.publicId || null,
                tags: options.tags || 'pattibytes',
                transformation: options.transformation || null,
                context: `app=pattibytes|version=1.0`, // For tracking
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
                            createdAt: response.created_at,
                            resourceType: response.resource_type
                        });
                    } catch (error) {
                        reject(new Error('Failed to parse upload response'));
                    }
                } else {
                    reject(new Error(`Upload failed with status: ${xhr.status}`));
                }
            };

            // Error handler
            xhr.onerror = () => {
                reject(new Error('Network error during upload'));
            };

            // Send request to your Cloudinary account
            xhr.open('POST', `${this.baseUrl}/upload`);
            xhr.send(formData);
        });
    }

    /**
     * Upload multiple files with progress tracking
     */
    async uploadMultipleFiles(files, options = {}) {
        const uploads = Array.from(files).map((file, index) => {
            const fileOptions = {
                ...options,
                publicId: options.publicId ? `${options.publicId}_${index}` : null,
                onProgress: options.onProgress ? (progress) => {
                    options.onProgress(index, progress, file.name);
                } : null
            };
            return this.uploadFile(file, fileOptions);
        });

        return Promise.all(uploads);
    }

    /**
     * Generate optimized URLs with transformations
     * FREE tier includes unlimited transformations!
     */
    getOptimizedUrl(publicId, transformations = {}) {
        const {
            width = 'auto',
            height = 'auto',
            crop = 'fill',
            quality = 'auto',
            format = 'auto',
            fetchFormat = 'auto',
            flags = null
        } = transformations;
        
        let transformString = `w_${width},h_${height},c_${crop},q_${quality},f_${format}`;
        
        if (fetchFormat !== 'auto') {
            transformString += `,f_${fetchFormat}`;
        }
        
        if (flags) {
            transformString += `,fl_${flags}`;
        }
        
        return `https://res.cloudinary.com/${this.config.cloudName}/image/upload/${transformString}/${publicId}`;
    }

    /**
     * Get avatar URL with standard sizing
     */
    getAvatarUrl(publicId, size = 150) {
        return this.getOptimizedUrl(publicId, {
            width: size,
            height: size,
            crop: 'fill',
            gravity: 'face',
            quality: 'auto',
            format: 'auto'
        });
    }

    /**
     * Get cover photo URL with standard sizing
     */
    getCoverUrl(publicId, width = 800, height = 400) {
        return this.getOptimizedUrl(publicId, {
            width,
            height,
            crop: 'fill',
            quality: 'auto',
            format: 'auto'
        });
    }

    /**
     * Delete file from Cloudinary (requires server-side for signed deletes)
     * For now, just mark for cleanup
     */
    async deleteFile(publicId) {
        // Store deletion request for server-side cleanup
        console.log('🗑️ Delete request queued for:', publicId);
        
        // In a real app, you'd send this to your backend to perform signed deletion
        // For now, files will remain in Cloudinary but unused
        
        return { success: true, publicId, note: 'Queued for deletion' };
    }

    /**
     * Validate file before upload - optimized for FREE tier limits
     */
    validateFile(file) {
        if (!file || !(file instanceof File)) {
            return false;
        }

        // Check file size (10MB limit for free tier)
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
}

/**
 * 🔥 Firebase Database Service - FREE TIER OPTIMIZED
 */
class FirebaseService {
    constructor() {
        this.db = db;
        this.auth = auth;
        // ❌ Removed storage reference (using Cloudinary instead)
    }

    /**
     * Create user profile with Cloudinary URLs
     */
    async createUserProfile(user, additionalData = {}) {
        const userRef = doc(this.db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
            const userData = {
                uid: user.uid,
                displayName: user.displayName || '',
                email: user.email,
                photoURL: user.photoURL || null, // Can be Cloudinary URL
                username: additionalData.username || '',
                bio: additionalData.bio || '',
                location: additionalData.location || '',
                website: additionalData.website || '',
                coverURL: additionalData.coverURL || null, // Cloudinary URL
                
                // Privacy settings
                profileVisibility: 'public',
                showEmail: false,
                allowComments: true,
                
                // Stats for gamification
                stats: {
                    posts: 0,
                    likes: 0,
                    comments: 0,
                    views: 0,
                    followers: 0,
                    following: 0,
                    photosUploaded: 0,
                    storageUsed: 0 // Track Cloudinary usage
                },
                
                // Cloudinary tracking
                cloudinary: {
                    publicIds: [], // Track uploaded files
                    totalBytes: 0, // Track storage usage
                    lastCleanup: null
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
                    },
                    privacy: {
                        showOnline: true,
                        allowMessages: true,
                        showLocation: false
                    }
                }
            };
            
            await setDoc(userRef, userData);
            console.log('✅ User profile created:', userData.uid);
            return userData;
        }
        
        return userDoc.data();
    }

    /**
     * Update user profile with Cloudinary URL tracking
     */
    async updateUserProfile(userId, data) {
        const userRef = doc(this.db, 'users', userId);
        const updateData = {
            ...data,
            updatedAt: serverTimestamp()
        };
        
        // If updating photo URLs, track Cloudinary usage
        if (data.photoURL || data.coverURL) {
            const currentUser = await this.getUserProfile(userId);
            const cloudinaryData = currentUser?.cloudinary || { publicIds: [], totalBytes: 0 };
            
            if (data.photoURL && data.photoURL.includes('cloudinary.com')) {
                const publicId = this.extractPublicIdFromUrl(data.photoURL);
                if (publicId && !cloudinaryData.publicIds.includes(publicId)) {
                    updateData['cloudinary.publicIds'] = arrayUnion(publicId);
                }
            }
            
            if (data.coverURL && data.coverURL.includes('cloudinary.com')) {
                const publicId = this.extractPublicIdFromUrl(data.coverURL);
                if (publicId && !cloudinaryData.publicIds.includes(publicId)) {
                    updateData['cloudinary.publicIds'] = arrayUnion(publicId);
                }
            }
        }
        
        await updateDoc(userRef, updateData);
        return updateData;
    }

    /**
     * Extract public ID from Cloudinary URL
     */
    extractPublicIdFromUrl(url) {
        try {
            const matches = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
            return matches ? matches[1] : null;
        } catch (error) {
            return null;
        }
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
     * Create post with Cloudinary media URLs
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
            shares: 0,
            // Media URLs will be from Cloudinary
            mediaUrls: postData.mediaUrls || [],
            mediaTypes: postData.mediaTypes || [] // ['image', 'video', etc.]
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
            orderDirection = 'desc'
        } = options;

        let q = collection(this.db, 'posts');
        
        if (authorId) {
            q = query(q, where('authorId', '==', authorId));
        }
        
        q = query(q, orderBy(orderByField, orderDirection), limit(limitCount));
        
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

    /**
     * Get user's Cloudinary usage stats
     */
    async getCloudinaryUsage(userId) {
        const user = await this.getUserProfile(userId);
        return user?.cloudinary || { publicIds: [], totalBytes: 0, lastCleanup: null };
    }
}

// Initialize services with your Cloudinary config
const cloudinaryService = new CloudinaryService();
const firebaseService = new FirebaseService();

// Set Firebase auth persistence
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
    console.log('🌐 App is online');
});

window.addEventListener('offline', async () => {
    if (auth.currentUser) {
        await firebaseService.updateUserProfile(auth.currentUser.uid, {
            isOnline: false,
            lastActive: serverTimestamp()
        });
    }
    await disableNetwork(db);
    console.log('📡 App is offline');
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

// ❌ Removed Firebase Storage exports (using Cloudinary instead)

window.cloudinaryService = cloudinaryService;
window.firebaseService = firebaseService;

// Export analytics for tracking
window.firebaseAnalytics = {
    analytics,
    logEvent
};

// Log successful initialization
console.log('✅ Firebase + Cloudinary services initialized successfully!');
console.log('📸 Cloudinary Config:', {
    cloudName: CLOUDINARY_CONFIG.cloudName,
    uploadPreset: CLOUDINARY_CONFIG.uploadPreset,
    maxFileSize: `${CLOUDINARY_CONFIG.maxFileSize / 1024 / 1024}MB`,
    allowedFormats: CLOUDINARY_CONFIG.allowedFormats.join(', ')
});
