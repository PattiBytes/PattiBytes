/**
 * Complete Firebase Service - All PattiBytes Features
 * /app/assets/js/firebase-service-complete.js
 */

class PattiDataService {
    constructor() {
        this.db = window.firebaseFirestore.db;
        this.auth = window.firebaseAuth.auth;
        this.cloudinary = window.cloudinaryService;
    }

    // ==================
    // USER MANAGEMENT
    // ==================

    /**
     * Create comprehensive user profile
     */
    async createUserProfile(user, additionalData = {}) {
        try {
            const userRef = window.firebaseFirestore.doc(this.db, 'users', user.uid);
            const userDoc = await window.firebaseFirestore.getDoc(userRef);
            
            if (!userDoc.exists()) {
                // Generate unique username
                const username = await this.generateUniqueUsername(user.displayName || user.email);
                
                const userData = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName || '',
                    username: username,
                    bio: additionalData.bio || '',
                    location: additionalData.location || '',
                    website: additionalData.website || '',
                    phoneNumber: user.phoneNumber || '',
                    
                    // Profile Images
                    photoURL: user.photoURL || null,
                    coverURL: null,
                    
                    // Stats
                    stats: {
                        posts: 0,
                        likes: 0,
                        comments: 0,
                        views: 0,
                        followers: 0,
                        following: 0,
                        videosShared: 0,
                        imagesUploaded: 0
                    },
                    
                    // Settings
                    settings: {
                        profileVisibility: 'public',
                        showEmail: false,
                        allowComments: true,
                        allowMessages: true,
                        language: 'pa',
                        theme: 'light',
                        notifications: {
                            email: true,
                            push: true,
                            likes: true,
                            comments: true,
                            follows: true,
                            news: true
                        }
                    },
                    
                    // Social
                    following: [],
                    followers: [],
                    blockedUsers: [],
                    
                    // Activity
                    lastActive: window.firebaseFirestore.serverTimestamp(),
                    isOnline: true,
                    createdAt: window.firebaseFirestore.serverTimestamp(),
                    updatedAt: window.firebaseFirestore.serverTimestamp()
                };
                
                await window.firebaseFirestore.setDoc(userRef, userData);
                console.log('✅ User profile created:', userData.uid);
                return userData;
            }
            
            return userDoc.data();
        } catch (error) {
            console.error('Error creating user profile:', error);
            throw error;
        }
    }

    /**
     * Generate unique username
     */
    async generateUniqueUsername(baseName) {
        const cleanName = (baseName || 'user').toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .substring(0, 15);
        
        let username = cleanName;
        let counter = 1;
        
        while (await this.isUsernameTaken(username)) {
            username = `${cleanName}${counter}`;
            counter++;
        }
        
        return username;
    }

    /**
     * Check if username is taken
     */
    async isUsernameTaken(username) {
        try {
            const usersQuery = window.firebaseFirestore.query(
                window.firebaseFirestore.collection(this.db, 'users'),
                window.firebaseFirestore.where('username', '==', username),
                window.firebaseFirestore.limit(1)
            );
            
            const snapshot = await window.firebaseFirestore.getDocs(usersQuery);
            return !snapshot.empty;
        } catch (error) {
            console.error('Error checking username:', error);
            return false;
        }
    }

    /**
     * Update user profile with media upload
     */
    async updateUserProfile(userId, updateData, files = {}) {
        try {
            const updates = { ...updateData };
            
            // Handle profile picture upload
            if (files.profilePicture) {
                const uploadResult = await this.cloudinary.uploadFile(files.profilePicture, {
                    folder: 'profiles/avatars',
                    tags: `user-${userId},profile-picture`,
                    transformation: 'c_fill,w_300,h_300,f_auto,q_auto'
                });
                
                updates.photoURL = uploadResult.url;
                
                // Update Firebase Auth profile
                await window.firebaseAuth.updateProfile(this.auth.currentUser, {
                    photoURL: uploadResult.url
                });
            }
            
            // Handle cover photo upload
            if (files.coverPhoto) {
                const uploadResult = await this.cloudinary.uploadFile(files.coverPhoto, {
                    folder: 'profiles/covers',
                    tags: `user-${userId},cover-photo`,
                    transformation: 'c_fill,w_1200,h_400,f_auto,q_auto'
                });
                
                updates.coverURL = uploadResult.url;
            }
            
            updates.updatedAt = window.firebaseFirestore.serverTimestamp();
            
            const userRef = window.firebaseFirestore.doc(this.db, 'users', userId);
            await window.firebaseFirestore.updateDoc(userRef, updates);
            
            console.log('✅ User profile updated');
            return updates;
        } catch (error) {
            console.error('Error updating user profile:', error);
            throw error;
        }
    }

    // ==================
    // NEWS MANAGEMENT
    // ==================

    /**
     * Create news article with media
     */
    async createNewsArticle(articleData, files = {}) {
        try {
            const article = {
                ...articleData,
                slug: this.generateSlug(articleData.title),
                likes: 0,
                comments: 0,
                views: 0,
                shares: 0,
                likedBy: [],
                sharedBy: [],
                status: 'published',
                createdAt: window.firebaseFirestore.serverTimestamp(),
                updatedAt: window.firebaseFirestore.serverTimestamp(),
                publishedAt: window.firebaseFirestore.serverTimestamp()
            };
            
            // Handle featured image upload
            if (files.featuredImage) {
                const uploadResult = await this.cloudinary.uploadFile(files.featuredImage, {
                    folder: 'news/featured',
                    tags: 'news,featured-image',
                    transformation: 'c_fill,w_1200,h_630,f_auto,q_auto'
                });
                
                article.featuredImage = uploadResult.url;
            }
            
            // Handle multiple images
            if (files.images && files.images.length > 0) {
                const imageUploads = await Promise.all(
                    Array.from(files.images).map(image => 
                        this.cloudinary.uploadFile(image, {
                            folder: 'news/gallery',
                            tags: 'news,gallery',
                            transformation: 'c_fit,w_800,h_600,f_auto,q_auto'
                        })
                    )
                );
                
                article.images = imageUploads.map(upload => upload.url);
            }
            
            // Handle videos
            if (files.videos && files.videos.length > 0) {
                const videoUploads = await Promise.all(
                    Array.from(files.videos).map(video => 
                        this.cloudinary.uploadFile(video, {
                            folder: 'news/videos',
                            tags: 'news,video',
                            resource_type: 'video'
                        })
                    )
                );
                
                article.videos = videoUploads.map(upload => upload.url);
            }
            
            const newsRef = window.firebaseFirestore.collection(this.db, 'news');
            const docRef = await window.firebaseFirestore.addDoc(newsRef, article);
            
            // Update user stats
            await this.updateUserStats(article.authorId, {
                posts: window.firebaseFirestore.increment(1)
            });
            
            console.log('✅ News article created:', docRef.id);
            return { id: docRef.id, ...article };
        } catch (error) {
            console.error('Error creating news article:', error);
            throw error;
        }
    }

    /**
     * Get news articles with filtering
     */
    async getNewsArticles(options = {}) {
        try {
            const {
                category = null,
                featured = null,
                authorId = null,
                limit = 10,
                orderBy = 'publishedAt',
                orderDirection = 'desc',
                startAfter = null
            } = options;
            
            let newsQuery = window.firebaseFirestore.collection(this.db, 'news');
            
            // Apply filters
            if (category) {
                newsQuery = window.firebaseFirestore.query(
                    newsQuery, 
                    window.firebaseFirestore.where('category', '==', category)
                );
            }
            
            if (featured !== null) {
                newsQuery = window.firebaseFirestore.query(
                    newsQuery, 
                    window.firebaseFirestore.where('featured', '==', featured)
                );
            }
            
            if (authorId) {
                newsQuery = window.firebaseFirestore.query(
                    newsQuery, 
                    window.firebaseFirestore.where('authorId', '==', authorId)
                );
            }
            
            // Only published articles
            newsQuery = window.firebaseFirestore.query(
                newsQuery, 
                window.firebaseFirestore.where('status', '==', 'published')
            );
            
            // Ordering and pagination
            newsQuery = window.firebaseFirestore.query(
                newsQuery,
                window.firebaseFirestore.orderBy(orderBy, orderDirection),
                window.firebaseFirestore.limit(limit)
            );
            
            if (startAfter) {
                newsQuery = window.firebaseFirestore.query(
                    newsQuery,
                    window.firebaseFirestore.startAfter(startAfter)
                );
            }
            
            const snapshot = await window.firebaseFirestore.getDocs(newsQuery);
            const articles = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log(`✅ Retrieved ${articles.length} news articles`);
            return articles;
        } catch (error) {
            console.error('Error getting news articles:', error);
            throw error;
        }
    }

    // ==================
    // PLACES MANAGEMENT
    // ==================

    /**
     * Create place with media
     */
    async createPlace(placeData, files = {}) {
        try {
            const place = {
                ...placeData,
                likes: 0,
                visits: 0,
                reviews: 0,
                rating: 0,
                likedBy: [],
                visitedBy: [],
                verified: false,
                featured: false,
                createdAt: window.firebaseFirestore.serverTimestamp(),
                updatedAt: window.firebaseFirestore.serverTimestamp()
            };
            
            // Handle multiple images
            if (files.images && files.images.length > 0) {
                const imageUploads = await Promise.all(
                    Array.from(files.images).map(image => 
                        this.cloudinary.uploadFile(image, {
                            folder: 'places/gallery',
                            tags: 'places,gallery',
                            transformation: 'c_fill,w_800,h_600,f_auto,q_auto'
                        })
                    )
                );
                
                place.images = imageUploads.map(upload => upload.url);
                place.thumbnailImage = imageUploads[0]?.url; // First image as thumbnail
            }
            
            // Handle videos
            if (files.videos && files.videos.length > 0) {
                const videoUploads = await Promise.all(
                    Array.from(files.videos).map(video => 
                        this.cloudinary.uploadFile(video, {
                            folder: 'places/videos',
                            tags: 'places,video',
                            resource_type: 'video'
                        })
                    )
                );
                
                place.videos = videoUploads.map(upload => upload.url);
            }
            
            const placesRef = window.firebaseFirestore.collection(this.db, 'places');
            const docRef = await window.firebaseFirestore.addDoc(placesRef, place);
            
            console.log('✅ Place created:', docRef.id);
            return { id: docRef.id, ...place };
        } catch (error) {
            console.error('Error creating place:', error);
            throw error;
        }
    }

    // ==================
    // USER POSTS/VIDEOS
    // ==================

    /**
     * Create user post with media
     */
    async createUserPost(postData, mediaFile = null) {
        try {
            const user = this.auth.currentUser;
            if (!user) throw new Error('User not authenticated');
            
            const post = {
                ...postData,
                authorId: user.uid,
                authorName: user.displayName || 'Anonymous',
                authorAvatar: user.photoURL || null,
                likes: 0,
                comments: 0,
                views: 0,
                shares: 0,
                likedBy: [],
                sharedBy: [],
                viewedBy: [],
                visibility: postData.visibility || 'public',
                status: 'published',
                createdAt: window.firebaseFirestore.serverTimestamp(),
                updatedAt: window.firebaseFirestore.serverTimestamp()
            };
            
            // Handle media upload
            if (mediaFile) {
                const isVideo = mediaFile.type.startsWith('video/');
                const folder = isVideo ? 'posts/videos' : 'posts/images';
                const resourceType = isVideo ? 'video' : 'image';
                
                const uploadResult = await this.cloudinary.uploadFile(mediaFile, {
                    folder: folder,
                    tags: `user-post,${resourceType}`,
                    resource_type: resourceType,
                    transformation: isVideo 
                        ? 'c_scale,w_720,h_720,f_auto,q_auto'
                        : 'c_fit,w_800,h_800,f_auto,q_auto'
                });
                
                post.mediaURL = uploadResult.url;
                post.type = isVideo ? 'video' : 'image';
                
                // Generate thumbnail for video
                if (isVideo) {
                    post.thumbnailURL = uploadResult.url.replace('/video/upload/', '/video/upload/so_0/');
                }
                
                // Update user stats
                const statUpdate = isVideo 
                    ? { videosShared: window.firebaseFirestore.increment(1) }
                    : { imagesUploaded: window.firebaseFirestore.increment(1) };
                    
                await this.updateUserStats(user.uid, statUpdate);
            } else {
                post.type = 'text';
            }
            
            const postsRef = window.firebaseFirestore.collection(this.db, 'posts');
            const docRef = await window.firebaseFirestore.addDoc(postsRef, post);
            
            // Update user posts count
            await this.updateUserStats(user.uid, {
                posts: window.firebaseFirestore.increment(1)
            });
            
            console.log('✅ User post created:', docRef.id);
            return { id: docRef.id, ...post };
        } catch (error) {
            console.error('Error creating user post:', error);
            throw error;
        }
    }

    // ==================
    // ENGAGEMENT FEATURES
    // ==================

    /**
     * Toggle like on item (news, post, place, comment)
     */
    async toggleLike(itemType, itemId, userId) {
        try {
            const itemRef = window.firebaseFirestore.doc(this.db, itemType, itemId);
            const itemDoc = await window.firebaseFirestore.getDoc(itemRef);
            
            if (!itemDoc.exists()) {
                throw new Error(`${itemType} not found`);
            }
            
            const itemData = itemDoc.data();
            const likedBy = itemData.likedBy || [];
            const isLiked = likedBy.includes(userId);
            
            const batch = window.firebaseFirestore.writeBatch(this.db);
            
            if (isLiked) {
                // Unlike
                batch.update(itemRef, {
                    likes: window.firebaseFirestore.increment(-1),
                    likedBy: window.firebaseFirestore.arrayRemove(userId),
                    updatedAt: window.firebaseFirestore.serverTimestamp()
                });
            } else {
                // Like
                batch.update(itemRef, {
                    likes: window.firebaseFirestore.increment(1),
                    likedBy: window.firebaseFirestore.arrayUnion(userId),
                    updatedAt: window.firebaseFirestore.serverTimestamp()
                });
                
                // Create notification for content owner
                if (itemData.authorId && itemData.authorId !== userId) {
                    await this.createNotification({
                        userId: itemData.authorId,
                        type: 'like',
                        title: 'New Like',
                        message: `Someone liked your ${itemType}`,
                        itemType: itemType,
                        itemId: itemId,
                        fromUserId: userId
                    });
                }
            }
            
            await batch.commit();
            
            // Update user stats
            await this.updateUserStats(userId, {
                likes: window.firebaseFirestore.increment(isLiked ? -1 : 1)
            });
            
            console.log(`✅ ${isLiked ? 'Unliked' : 'Liked'} ${itemType}:`, itemId);
            return !isLiked; // Return new like state
        } catch (error) {
            console.error('Error toggling like:', error);
            throw error;
        }
    }

    /**
     * Add comment to item
     */
    async addComment(itemType, itemId, content, parentId = null) {
        try {
            const user = this.auth.currentUser;
            if (!user) throw new Error('User not authenticated');
            
            const comment = {
                itemType: itemType,
                itemId: itemId,
                content: content,
                authorId: user.uid,
                authorName: user.displayName || 'Anonymous',
                authorAvatar: user.photoURL || null,
                likes: 0,
                replies: 0,
                likedBy: [],
                parentId: parentId,
                status: 'published',
                createdAt: window.firebaseFirestore.serverTimestamp(),
                updatedAt: window.firebaseFirestore.serverTimestamp()
            };
            
            const batch = window.firebaseFirestore.writeBatch(this.db);
            
            // Add comment
            const commentsRef = window.firebaseFirestore.collection(this.db, 'comments');
            const commentRef = window.firebaseFirestore.doc(commentsRef);
            batch.set(commentRef, comment);
            
            // Update item comment count
            const itemRef = window.firebaseFirestore.doc(this.db, itemType, itemId);
            batch.update(itemRef, {
                comments: window.firebaseFirestore.increment(1),
                updatedAt: window.firebaseFirestore.serverTimestamp()
            });
            
            // If it's a reply, update parent comment
            if (parentId) {
                const parentRef = window.firebaseFirestore.doc(this.db, 'comments', parentId);
                batch.update(parentRef, {
                    replies: window.firebaseFirestore.increment(1)
                });
            }
            
            await batch.commit();
            
            // Update user stats
            await this.updateUserStats(user.uid, {
                comments: window.firebaseFirestore.increment(1)
            });
            
            // Create notification
            const itemDoc = await window.firebaseFirestore.getDoc(itemRef);
            if (itemDoc.exists() && itemDoc.data().authorId !== user.uid) {
                await this.createNotification({
                    userId: itemDoc.data().authorId,
                    type: 'comment',
                    title: 'New Comment',
                    message: `${user.displayName} commented on your ${itemType}`,
                    itemType: itemType,
                    itemId: itemId,
                    fromUserId: user.uid
                });
            }
            
            console.log('✅ Comment added');
            return { id: commentRef.id, ...comment };
        } catch (error) {
            console.error('Error adding comment:', error);
            throw error;
        }
    }

    /**
     * Get comments for item
     */
    async getComments(itemType, itemId, limit = 20) {
        try {
            const commentsQuery = window.firebaseFirestore.query(
                window.firebaseFirestore.collection(this.db, 'comments'),
                window.firebaseFirestore.where('itemType', '==', itemType),
                window.firebaseFirestore.where('itemId', '==', itemId),
                window.firebaseFirestore.where('parentId', '==', null), // Top-level comments only
                window.firebaseFirestore.orderBy('createdAt', 'desc'),
                window.firebaseFirestore.limit(limit)
            );
            
            const snapshot = await window.firebaseFirestore.getDocs(commentsQuery);
            const comments = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log(`✅ Retrieved ${comments.length} comments`);
            return comments;
        } catch (error) {
            console.error('Error getting comments:', error);
            throw error;
        }
    }

    /**
     * Track view
     */
    async trackView(itemType, itemId, userId) {
        try {
            const itemRef = window.firebaseFirestore.doc(this.db, itemType, itemId);
            const itemDoc = await window.firebaseFirestore.getDoc(itemRef);
            
            if (!itemDoc.exists()) return;
            
            const itemData = itemDoc.data();
            const viewedBy = itemData.viewedBy || [];
            
            // Only count unique views
            if (!viewedBy.includes(userId)) {
                await window.firebaseFirestore.updateDoc(itemRef, {
                    views: window.firebaseFirestore.increment(1),
                    viewedBy: window.firebaseFirestore.arrayUnion(userId),
                    updatedAt: window.firebaseFirestore.serverTimestamp()
                });
                
                // Update user stats
                await this.updateUserStats(userId, {
                    views: window.firebaseFirestore.increment(1)
                });
                
                console.log(`✅ View tracked for ${itemType}:`, itemId);
            }
        } catch (error) {
            console.error('Error tracking view:', error);
        }
    }

    /**
     * Share item
     */
    async shareItem(itemType, itemId, userId, platform = 'app') {
        try {
            const itemRef = window.firebaseFirestore.doc(this.db, itemType, itemId);
            
            await window.firebaseFirestore.updateDoc(itemRef, {
                shares: window.firebaseFirestore.increment(1),
                sharedBy: window.firebaseFirestore.arrayUnion(userId),
                updatedAt: window.firebaseFirestore.serverTimestamp()
            });
            
            console.log(`✅ Share tracked for ${itemType}:`, itemId, 'on', platform);
        } catch (error) {
            console.error('Error tracking share:', error);
        }
    }

    // ==================
    // NOTIFICATIONS
    // ==================

    /**
     * Create notification
     */
    async createNotification(notificationData) {
        try {
            const userDoc = await window.firebaseFirestore.getDoc(
                window.firebaseFirestore.doc(this.db, 'users', notificationData.fromUserId)
            );
            
            const fromUser = userDoc.data();
            
            const notification = {
                ...notificationData,
                fromUserName: fromUser?.displayName || 'Someone',
                fromUserAvatar: fromUser?.photoURL || null,
                read: false,
                clicked: false,
                createdAt: window.firebaseFirestore.serverTimestamp(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
            };
            
            const notificationsRef = window.firebaseFirestore.collection(this.db, 'notifications');
            await window.firebaseFirestore.addDoc(notificationsRef, notification);
            
            console.log('✅ Notification created');
        } catch (error) {
            console.error('Error creating notification:', error);
        }
    }

    /**
     * Get user notifications
     */
    async getUserNotifications(userId, limit = 20) {
        try {
            const notificationsQuery = window.firebaseFirestore.query(
                window.firebaseFirestore.collection(this.db, 'notifications'),
                window.firebaseFirestore.where('userId', '==', userId),
                window.firebaseFirestore.orderBy('createdAt', 'desc'),
                window.firebaseFirestore.limit(limit)
            );
            
            const snapshot = await window.firebaseFirestore.getDocs(notificationsQuery);
            const notifications = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log(`✅ Retrieved ${notifications.length} notifications`);
            return notifications;
        } catch (error) {
            console.error('Error getting notifications:', error);
            return [];
        }
    }

    // ==================
    // UTILITY METHODS
    // ==================

    /**
     * Update user stats
     */
    async updateUserStats(userId, stats) {
        try {
            const userRef = window.firebaseFirestore.doc(this.db, 'users', userId);
            const updateData = {};
            
            Object.keys(stats).forEach(key => {
                updateData[`stats.${key}`] = stats[key];
            });
            
            updateData.updatedAt = window.firebaseFirestore.serverTimestamp();
            
            await window.firebaseFirestore.updateDoc(userRef, updateData);
        } catch (error) {
            console.error('Error updating user stats:', error);
        }
    }

    /**
     * Generate URL slug
     */
    generateSlug(title) {
        return title
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }

    /**
     * Search content
     */
    async searchContent(query, type = 'all', limit = 20) {
        try {
            const results = {};
            
            if (type === 'all' || type === 'news') {
                // Search news (title contains query)
                const newsQuery = window.firebaseFirestore.query(
                    window.firebaseFirestore.collection(this.db, 'news'),
                    window.firebaseFirestore.where('status', '==', 'published'),
                    window.firebaseFirestore.orderBy('publishedAt', 'desc'),
                    window.firebaseFirestore.limit(limit)
                );
                
                const newsSnapshot = await window.firebaseFirestore.getDocs(newsQuery);
                results.news = newsSnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(article => 
                        article.title.toLowerCase().includes(query.toLowerCase()) ||
                        article.content.toLowerCase().includes(query.toLowerCase())
                    );
            }
            
            if (type === 'all' || type === 'places') {
                // Search places
                const placesQuery = window.firebaseFirestore.query(
                    window.firebaseFirestore.collection(this.db, 'places'),
                    window.firebaseFirestore.limit(limit)
                );
                
                const placesSnapshot = await window.firebaseFirestore.getDocs(placesQuery);
                results.places = placesSnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(place => 
                        place.name.toLowerCase().includes(query.toLowerCase()) ||
                        place.description.toLowerCase().includes(query.toLowerCase())
                    );
            }
            
            if (type === 'all' || type === 'users') {
                // Search users
                const usersQuery = window.firebaseFirestore.query(
                    window.firebaseFirestore.collection(this.db, 'users'),
                    window.firebaseFirestore.limit(limit)
                );
                
                const usersSnapshot = await window.firebaseFirestore.getDocs(usersQuery);
                results.users = usersSnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(user => 
                        user.displayName?.toLowerCase().includes(query.toLowerCase()) ||
                        user.username?.toLowerCase().includes(query.toLowerCase())
                    );
            }
            
            console.log('✅ Search completed:', results);
            return results;
        } catch (error) {
            console.error('Error searching content:', error);
            return {};
        }
    }

    /**
     * Get user feed (personalized content)
     */
    async getUserFeed(userId, limit = 20) {
        try {
            // Get user's following list
            const userDoc = await window.firebaseFirestore.getDoc(
                window.firebaseFirestore.doc(this.db, 'users', userId)
            );
            
            const userData = userDoc.data();
            const following = userData?.following || [];
            
            const feedItems = [];
            
            // Get posts from followed users
            if (following.length > 0) {
                const postsQuery = window.firebaseFirestore.query(
                    window.firebaseFirestore.collection(this.db, 'posts'),
                    window.firebaseFirestore.where('authorId', 'in', following.slice(0, 10)), // Firestore 'in' limit
                    window.firebaseFirestore.where('status', '==', 'published'),
                    window.firebaseFirestore.where('visibility', 'in', ['public', 'friends']),
                    window.firebaseFirestore.orderBy('createdAt', 'desc'),
                    window.firebaseFirestore.limit(limit)
                );
                
                const postsSnapshot = await window.firebaseFirestore.getDocs(postsQuery);
                feedItems.push(...postsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    type: 'post',
                    ...doc.data()
                })));
            }
            
            // Get latest news
            const newsQuery = window.firebaseFirestore.query(
                window.firebaseFirestore.collection(this.db, 'news'),
                window.firebaseFirestore.where('status', '==', 'published'),
                window.firebaseFirestore.orderBy('publishedAt', 'desc'),
                window.firebaseFirestore.limit(5)
            );
            
            const newsSnapshot = await window.firebaseFirestore.getDocs(newsQuery);
            feedItems.push(...newsSnapshot.docs.map(doc => ({
                id: doc.id,
                type: 'news',
                ...doc.data()
            })));
            
            // Sort by creation/publish date
            feedItems.sort((a, b) => {
                const dateA = a.createdAt || a.publishedAt;
                const dateB = b.createdAt || b.publishedAt;
                return dateB.toMillis() - dateA.toMillis();
            });
            
            console.log(`✅ Retrieved ${feedItems.length} feed items`);
            return feedItems.slice(0, limit);
        } catch (error) {
            console.error('Error getting user feed:', error);
            return [];
        }
    }
}

// Initialize the service
window.pattiDataService = new PattiDataService();
