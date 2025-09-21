/**
 * Usage Examples - How to use the complete backend
 * /app/assets/js/usage-examples.js
 */

class PattiUsageExamples {
    constructor() {
        this.dataService = window.pattiDataService;
    }

    // ==================
    // USER EXAMPLES
    // ==================

    /**
     * Complete user profile update with images
     */
    async updateUserProfileComplete() {
        const userId = window.firebaseAuth.auth.currentUser.uid;
        const profilePictureFile = document.getElementById('profilePicture').files[0];
        const coverPhotoFile = document.getElementById('coverPhoto').files[0];

        try {
            const result = await this.dataService.updateUserProfile(
                userId,
                {
                    displayName: 'John Doe',
                    bio: 'Local Patti resident and news enthusiast',
                    location: 'Patti, Punjab, India',
                    website: 'https://johndoe.com'
                },
                {
                    profilePicture: profilePictureFile,
                    coverPhoto: coverPhotoFile
                }
            );

            console.log('Profile updated:', result);
        } catch (error) {
            console.error('Error updating profile:', error);
        }
    }

    /**
     * Create news article with multiple media
     */
    async createNewsWithMedia() {
        const featuredImageFile = document.getElementById('featuredImage').files[0];
        const galleryFiles = document.getElementById('galleryImages').files;
        const videoFiles = document.getElementById('videos').files;

        try {
            const article = await this.dataService.createNewsArticle(
                {
                    title: 'Breaking: New Development in Patti',
                    content: '<p>Full article content here...</p>',
                    preview: 'Short preview of the article...',
                    authorId: window.firebaseAuth.auth.currentUser.uid,
                    authorName: 'News Team',
                    category: 'breaking',
                    tags: ['patti', 'development', 'local'],
                    language: 'pa',
                    metaDescription: 'Latest development news from Patti'
                },
                {
                    featuredImage: featuredImageFile,
                    images: galleryFiles,
                    videos: videoFiles
                }
            );

            console.log('News article created:', article);
        } catch (error) {
            console.error('Error creating news:', error);
        }
    }

    /**
     * Create user post with video
     */
    async createVideoPost() {
        const videoFile = document.getElementById('postVideo').files[0];

        try {
            const post = await this.dataService.createUserPost(
                {
                    title: 'My visit to Gurdwara Sahib',
                    description: 'Beautiful morning at our local Gurdwara',
                    category: 'culture',
                    tags: ['gurdwara', 'culture', 'morning'],
                    location: 'Patti, Punjab',
                    visibility: 'public'
                },
                videoFile
            );

            console.log('Video post created:', post);
        } catch (error) {
            console.error('Error creating post:', error);
        }
    }

    /**
     * Handle like/unlike
     */
    async handleLike(itemType, itemId) {
        const userId = window.firebaseAuth.auth.currentUser.uid;

        try {
            const isLiked = await this.dataService.toggleLike(itemType, itemId, userId);
            
            // Update UI
            const likeBtn = document.querySelector(`[data-item-id="${itemId}"] .like-btn`);
            if (likeBtn) {
                likeBtn.classList.toggle('liked', isLiked);
                
                const countEl = likeBtn.querySelector('.like-count');
                const currentCount = parseInt(countEl.textContent);
                countEl.textContent = isLiked ? currentCount + 1 : currentCount - 1;
            }

            console.log(`${isLiked ? 'Liked' : 'Unliked'} ${itemType}:`, itemId);
        } catch (error) {
            console.error('Error toggling like:', error);
        }
    }

    /**
     * Add comment with real-time UI update
     */
    async addComment(itemType, itemId, content) {
        try {
            const comment = await this.dataService.addComment(itemType, itemId, content);
            
            // Add to UI immediately
            const commentsList = document.querySelector(`[data-item-id="${itemId}"] .comments-list`);
            if (commentsList) {
                const commentHTML = this.createCommentHTML(comment);
                commentsList.insertAdjacentHTML('afterbegin', commentHTML);
                
                // Update comment count
                const countEl = document.querySelector(`[data-item-id="${itemId}"] .comment-count`);
                if (countEl) {
                    countEl.textContent = parseInt(countEl.textContent) + 1;
                }
            }

            console.log('Comment added:', comment);
        } catch (error) {
            console.error('Error adding comment:', error);
        }
    }

    /**
     * Track view when user opens content
     */
    async trackContentView(itemType, itemId) {
        const userId = window.firebaseAuth.auth.currentUser?.uid;
        if (!userId) return;

        try {
            await this.dataService.trackView(itemType, itemId, userId);
            
            // Update view count in UI
            const viewCountEl = document.querySelector(`[data-item-id="${itemId}"] .view-count`);
            if (viewCountEl) {
                viewCountEl.textContent = parseInt(viewCountEl.textContent) + 1;
            }

            console.log(`View tracked for ${itemType}:`, itemId);
        } catch (error) {
            console.error('Error tracking view:', error);
        }
    }

    /**
     * Load user notifications
     */
    async loadNotifications() {
        const userId = window.firebaseAuth.auth.currentUser.uid;

        try {
            const notifications = await this.dataService.getUserNotifications(userId);
            
            // Update notifications UI
            const notificationsList = document.getElementById('notificationsList');
            const notificationCount = document.getElementById('notificationCount');
            
            if (notificationsList && notificationCount) {
                notificationsList.innerHTML = notifications
                    .map(notification => this.createNotificationHTML(notification))
                    .join('');
                    
                const unreadCount = notifications.filter(n => !n.read).length;
                notificationCount.textContent = unreadCount;
                notificationCount.style.display = unreadCount > 0 ? 'block' : 'none';
            }

            console.log('Notifications loaded:', notifications.length);
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }

    /**
     * Search across all content types
     */
    async performSearch(query) {
        try {
            const results = await this.dataService.searchContent(query, 'all', 10);
            
            // Update search results UI
            const searchResults = document.getElementById('searchResults');
            if (searchResults) {
                let html = '';
                
                if (results.news?.length > 0) {
                    html += '<h3>News</h3>';
                    html += results.news.map(article => this.createNewsSearchResultHTML(article)).join('');
                }
                
                if (results.places?.length > 0) {
                    html += '<h3>Places</h3>';
                    html += results.places.map(place => this.createPlaceSearchResultHTML(place)).join('');
                }
                
                if (results.users?.length > 0) {
                    html += '<h3>Users</h3>';
                    html += results.users.map(user => this.createUserSearchResultHTML(user)).join('');
                }
                
                searchResults.innerHTML = html || '<p>No results found</p>';
            }

            console.log('Search results:', results);
        } catch (error) {
            console.error('Error searching:', error);
        }
    }

    // ==================
    // HTML GENERATORS
    // ==================

    createCommentHTML(comment) {
        const timeAgo = this.getTimeAgo(comment.createdAt);
        
        return `
            <div class="comment-item" data-comment-id="${comment.id}">
                <div class="comment-avatar">
                    ${comment.authorAvatar 
                        ? `<img src="${comment.authorAvatar}" alt="${comment.authorName}">`
                        : `<span>${comment.authorName.charAt(0)}</span>`
                    }
                </div>
                <div class="comment-content">
                    <div class="comment-author">${comment.authorName}</div>
                    <div class="comment-text">${comment.content}</div>
                    <div class="comment-actions">
                        <span class="comment-time">${timeAgo}</span>
                        <button class="comment-like-btn" onclick="pattiUsageExamples.handleLike('comments', '${comment.id}')">
                            Like <span class="like-count">${comment.likes || 0}</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    createNotificationHTML(notification) {
        return `
            <div class="notification-item ${notification.read ? '' : 'unread'}" data-notification-id="${notification.id}">
                <div class="notification-avatar">
                    ${notification.fromUserAvatar 
                        ? `<img src="${notification.fromUserAvatar}" alt="${notification.fromUserName}">`
                        : `<span>${notification.fromUserName.charAt(0)}</span>`
                    }
                </div>
                <div class="notification-content">
                    <div class="notification-message">${notification.message}</div>
                    <div class="notification-time">${this.getTimeAgo(notification.createdAt)}</div>
                </div>
            </div>
        `;
    }

    // ==================
    // UTILITY METHODS
    // ==================

    getTimeAgo(timestamp) {
        const now = new Date();
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));
        
        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ago`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays}d ago`;
    }
}

// Initialize usage examples
window.pattiUsageExamples = new PattiUsageExamples();
