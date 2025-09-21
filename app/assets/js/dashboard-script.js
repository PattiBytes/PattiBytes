/**
 * PattiBytes Dashboard Script - Complete Integration
 * Handles news fetching from NetlifyCMS and all app features
 */

class DashboardManager {
    constructor() {
        this.currentSection = 'news'; // Default to news
        this.newsData = [];
        this.currentFilter = 'all';
        this.currentArticle = null;
        this.comments = new Map();
        
        this.init();
    }

    async init() {
        try {
            // Wait for Firebase to be ready
            await this.waitForFirebase();
            
            // Check authentication
            await this.checkAuth();
            
            // Initialize UI components
            this.setupEventListeners();
            this.setupNavigation();
            this.setupModals();
            
            // Load initial data
            await this.loadNewsData();
            this.updateUserProfile();
            this.animateCounters();
            
            console.log('✅ Dashboard initialized successfully');
        } catch (error) {
            console.error('❌ Dashboard initialization failed:', error);
            this.handleError('Failed to initialize dashboard');
        }
    }

    /**
     * Wait for Firebase services to be available
     */
    async waitForFirebase() {
        return new Promise((resolve) => {
            const checkFirebase = () => {
                if (window.firebaseAuth && window.firebaseFirestore && window.cloudinaryService) {
                    resolve();
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            checkFirebase();
        });
    }

    /**
     * Check user authentication
     */
    async checkAuth() {
        return new Promise((resolve) => {
            window.firebaseAuth.onAuthStateChanged(window.firebaseAuth.auth, async (user) => {
                if (user) {
                    await this.handleUserLogin(user);
                    resolve();
                } else {
                    // Redirect to auth page
                    window.location.href = '/app/auth.html';
                }
            });
        });
    }

    /**
     * Handle user login and profile setup
     */
    async handleUserLogin(user) {
        try {
            // Create/update user profile in Firestore
            await window.firebaseService.createUserProfile(user);
            
            // Update UI with user info
            this.updateUserUI(user);
            
            console.log('User logged in:', user.uid);
        } catch (error) {
            console.error('Error handling user login:', error);
        }
    }

    /**
     * Update user UI elements
     */
    updateUserUI(user) {
        // Update user name
        const userNameEl = document.getElementById('userName');
        if (userNameEl) {
            userNameEl.textContent = user.displayName || 'User';
        }

        // Update user avatar
        const userAvatarImg = document.getElementById('userAvatarImg');
        const userAvatarInitials = document.getElementById('userAvatarInitials');
        
        if (user.photoURL) {
            userAvatarImg.src = user.photoURL;
            userAvatarImg.style.display = 'block';
            userAvatarInitials.style.display = 'none';
        } else {
            userAvatarImg.style.display = 'none';
            userAvatarInitials.style.display = 'flex';
            userAvatarInitials.textContent = (user.displayName || 'U').charAt(0).toUpperCase();
        }

        // Update comment form avatar
        const commentUserAvatar = document.getElementById('commentUserAvatar');
        const commentUserInitials = document.getElementById('commentUserInitials');
        
        if (user.photoURL && commentUserAvatar) {
            commentUserAvatar.src = user.photoURL;
            commentUserAvatar.style.display = 'block';
            commentUserInitials.style.display = 'none';
        } else if (commentUserInitials) {
            commentUserAvatar.style.display = 'none';
            commentUserInitials.style.display = 'flex';
            commentUserInitials.textContent = (user.displayName || 'U').charAt(0).toUpperCase();
        }
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Navigation
        this.setupNavigationEvents();
        
        // News functionality
        this.setupNewsEvents();
        
        // User menu
        this.setupUserMenuEvents();
        
        // Search functionality
        this.setupSearchEvents();
        
        // Create post functionality
        this.setupCreatePostEvents();
        
        // Mobile menu
        this.setupMobileMenuEvents();
    }

    /**
     * Setup navigation events
     */
    setupNavigationEvents() {
        // Desktop sidebar navigation
        document.querySelectorAll('.nav-item[data-section]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.getAttribute('data-section');
                this.navigateToSection(section);
            });
        });

        // Bottom navigation
        document.querySelectorAll('.bottom-nav-item[data-section]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.getAttribute('data-section');
                this.navigateToSection(section);
            });
        });

        // Quick action cards
        document.querySelectorAll('.action-card[data-section]').forEach(card => {
            card.addEventListener('click', () => {
                const section = card.getAttribute('data-section');
                this.navigateToSection(section);
            });
        });
    }

    /**
     * Setup news-specific events
     */
    setupNewsEvents() {
        // Refresh news button
        document.getElementById('refreshNewsBtn')?.addEventListener('click', () => {
            this.loadNewsData(true);
        });

        // Filter tabs
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const filter = tab.getAttribute('data-filter');
                this.filterNews(filter);
                
                // Update active tab
                document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
            });
        });

        // News modal events
        document.getElementById('newsModalClose')?.addEventListener('click', () => {
            this.closeNewsModal();
        });

        // Article action buttons
        document.getElementById('likeBtn')?.addEventListener('click', () => {
            this.toggleLike();
        });

        document.getElementById('shareBtn')?.addEventListener('click', () => {
            this.shareArticle();
        });

        document.getElementById('translateBtn')?.addEventListener('click', () => {
            this.translateArticle();
        });

        // Comment functionality
        this.setupCommentEvents();
    }

    /**
     * Setup comment events
     */
    setupCommentEvents() {
        const commentInput = document.getElementById('commentInput');
        const submitBtn = document.getElementById('submitCommentBtn');
        const cancelBtn = document.getElementById('cancelCommentBtn');

        if (commentInput) {
            commentInput.addEventListener('input', () => {
                const hasContent = commentInput.value.trim().length > 0;
                submitBtn.disabled = !hasContent;
                cancelBtn.style.display = hasContent ? 'block' : 'none';
            });

            commentInput.addEventListener('focus', () => {
                cancelBtn.style.display = commentInput.value.trim() ? 'block' : 'none';
            });
        }

        submitBtn?.addEventListener('click', () => {
            this.submitComment();
        });

        cancelBtn?.addEventListener('click', () => {
            commentInput.value = '';
            submitBtn.disabled = true;
            cancelBtn.style.display = 'none';
            commentInput.blur();
        });
    }

    /**
     * Setup user menu events
     */
    setupUserMenuEvents() {
        const userDropdownBtn = document.getElementById('userDropdownBtn');
        const userDropdown = document.getElementById('userDropdown');
        const signOutBtn = document.getElementById('signOutBtn');

        userDropdownBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('show');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            userDropdown?.classList.remove('show');
        });

        signOutBtn?.addEventListener('click', () => {
            this.handleSignOut();
        });
    }

    /**
     * Setup search events
     */
    setupSearchEvents() {
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');

        if (searchInput) {
            searchInput.addEventListener('input', window.pattiBytes.debounce(() => {
                this.handleSearch(searchInput.value);
            }, 300));

            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleSearch(searchInput.value);
                }
            });
        }

        searchBtn?.addEventListener('click', () => {
            this.handleSearch(searchInput.value);
        });
    }

    /**
     * Setup create post events
     */
    setupCreatePostEvents() {
        const createPostBtn = document.getElementById('createPostBtn');
        const createPostModal = document.getElementById('createPostModal');
        const createPostModalClose = document.getElementById('createPostModalClose');
        const createPostForm = document.getElementById('createPostForm');
        const imageUploadArea = document.getElementById('imageUploadArea');
        const postImage = document.getElementById('postImage');
        const removeImageBtn = document.getElementById('removeImageBtn');

        createPostBtn?.addEventListener('click', () => {
            this.openCreatePostModal();
        });

        createPostModalClose?.addEventListener('click', () => {
            this.closeCreatePostModal();
        });

        // Image upload handling
        imageUploadArea?.addEventListener('click', () => {
            postImage?.click();
        });

        imageUploadArea?.addEventListener('dragover', (e) => {
            e.preventDefault();
            imageUploadArea.classList.add('dragover');
        });

        imageUploadArea?.addEventListener('dragleave', () => {
            imageUploadArea.classList.remove('dragover');
        });

        imageUploadArea?.addEventListener('drop', (e) => {
            e.preventDefault();
            imageUploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleImageUpload(files[0]);
            }
        });

        postImage?.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleImageUpload(e.target.files[0]);
            }
        });

        removeImageBtn?.addEventListener('click', () => {
            this.removeUploadedImage();
        });

        createPostForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCreatePost();
        });
    }

    /**
     * Setup mobile menu events
     */
    setupMobileMenuEvents() {
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const sidebar = document.getElementById('sidebar');
        const mobileOverlay = document.getElementById('mobileOverlay');

        mobileMenuBtn?.addEventListener('click', () => {
            sidebar?.classList.toggle('show');
            mobileOverlay?.classList.toggle('show');
        });

        mobileOverlay?.addEventListener('click', () => {
            sidebar?.classList.remove('show');
            mobileOverlay?.classList.remove('show');
        });
    }

    /**
     * Load news data from NetlifyCMS/Firebase
     */
    async loadNewsData(forceRefresh = false) {
        try {
            this.showNewsLoading();
            
            // Try to fetch from NetlifyCMS first (your existing source)
            let newsData = [];
            
            try {
                // Fetch from your existing NetlifyCMS endpoint
                const response = await fetch('/admin/collections/news.json');
                if (response.ok) {
                    const cmsData = await response.json();
                    newsData = this.transformCMSData(cmsData);
                }
            } catch (cmsError) {
                console.log('CMS not available, using Firebase fallback');
            }
            
            // If no CMS data, fetch from Firebase
            if (newsData.length === 0) {
                newsData = await this.loadNewsFromFirebase();
            }
            
            // Store and render news
            this.newsData = newsData;
            this.renderNews(newsData);
            this.updateNewsCounts(newsData.length);
            
            console.log(`✅ Loaded ${newsData.length} news articles`);
            
        } catch (error) {
            console.error('Error loading news:', error);
            this.handleError('Failed to load news articles');
        } finally {
            this.hideNewsLoading();
        }
    }

    /**
     * Transform NetlifyCMS data to app format
     */
    transformCMSData(cmsData) {
        return cmsData.map(article => ({
            id: article.slug || Date.now().toString(),
            title: article.title,
            content: article.content || article.body,
            preview: article.preview || article.excerpt || this.generatePreview(article.content),
            author: article.author || 'PattiBytes',
            date: article.date || new Date().toISOString(),
            image: article.image || article.featured_image,
            category: article.category || 'local',
            tags: article.tags || [],
            featured: article.featured || false,
            likes: 0,
            comments: 0,
            views: 0,
            language: article.lang || 'pa'
        }));
    }

    /**
     * Load news from Firebase fallback
     */
    async loadNewsFromFirebase() {
        try {
            const posts = await window.firebaseService.getPosts({
                limit: 20,
                orderBy: 'createdAt',
                orderDirection: 'desc'
            });
            
            return posts.map(post => ({
                id: post.id,
                title: post.title,
                content: post.content,
                preview: post.preview || this.generatePreview(post.content),
                author: post.author || 'PattiBytes',
                date: post.createdAt?.toDate?.() || new Date(),
                image: post.imageUrl,
                category: post.category || 'local',
                tags: post.tags || [],
                featured: post.featured || false,
                likes: post.likes || 0,
                comments: post.comments || 0,
                views: post.views || 0,
                language: post.language || 'pa'
            }));
        } catch (error) {
            console.error('Error loading from Firebase:', error);
            return [];
        }
    }

    /**
     * Generate preview text from content
     */
    generatePreview(content, maxLength = 150) {
        if (!content) return '';
        
        const text = content.replace(/<[^>]*>/g, '').trim();
        return text.length > maxLength 
            ? text.substring(0, maxLength) + '...'
            : text;
    }

    /**
     * Render news articles
     */
    renderNews(newsData) {
        const newsContent = document.getElementById('newsContent');
        if (!newsContent) return;

        if (newsData.length === 0) {
            newsContent.innerHTML = this.getEmptyNewsHTML();
            return;
        }

        const newsHTML = newsData.map(article => this.createNewsCardHTML(article)).join('');
        newsContent.innerHTML = `<div class="news-grid">${newsHTML}</div>`;
        
        // Bind click events to news cards
        this.bindNewsCardEvents();
    }

    /**
     * Create HTML for a news card
     */
    createNewsCardHTML(article) {
        const formattedDate = this.formatDate(article.date);
        const readingTime = this.calculateReadingTime(article.content);
        const authorInitial = (article.author || 'P').charAt(0).toUpperCase();
        
        return `
            <article class="news-card ${article.featured ? 'featured-card' : ''}" 
                     data-article-id="${article.id}"
                     data-category="${article.category}">
                ${article.image ? `
                    <div class="news-image-container">
                        <img src="${article.image}" 
                             alt="${article.title}" 
                             class="news-image"
                             loading="lazy">
                        <div class="news-category-badge">${article.category}</div>
                        <div class="news-reading-time">${readingTime} min read</div>
                    </div>
                ` : ''}
                
                <div class="news-content">
                    <h3 class="news-title">${article.title}</h3>
                    
                    <div class="news-meta">
                        <div class="news-author">
                            <div class="author-avatar">${authorInitial}</div>
                            <span>${article.author}</span>
                        </div>
                        <span class="news-date">${formattedDate}</span>
                    </div>
                    
                    <p class="news-preview">${article.preview}</p>
                    
                    <div class="news-actions">
                        <div class="news-stats">
                            <div class="news-stat">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                                ${article.views || 0}
                            </div>
                            <div class="news-stat">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                                </svg>
                                ${article.likes || 0}
                            </div>
                            <div class="news-stat">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                </svg>
                                ${article.comments || 0}
                            </div>
                        </div>
                        <button class="read-more-btn">
                            Read More
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="9,18 15,12 9,6"></polyline>
                            </svg>
                        </button>
                    </div>
                </div>
            </article>
        `;
    }

    /**
     * Bind events to news cards
     */
    bindNewsCardEvents() {
        document.querySelectorAll('.news-card').forEach(card => {
            card.addEventListener('click', () => {
                const articleId = card.getAttribute('data-article-id');
                this.openNewsModal(articleId);
            });
        });
    }

    /**
     * Open news modal with article content
     */
    openNewsModal(articleId) {
        const article = this.newsData.find(a => a.id === articleId);
        if (!article) return;

        this.currentArticle = article;
        
        // Update modal content
        document.getElementById('modalTitle').textContent = article.title;
        document.getElementById('modalMeta').innerHTML = this.getModalMetaHTML(article);
        document.getElementById('modalContent').innerHTML = article.content;
        
        // Update modal image
        const modalImage = document.getElementById('modalImage');
        if (article.image) {
            modalImage.innerHTML = `<img src="${article.image}" alt="${article.title}">`;
            modalImage.style.display = 'block';
        } else {
            modalImage.style.display = 'none';
        }
        
        // Load comments
        this.loadArticleComments(articleId);
        
        // Show modal
        document.getElementById('newsModal').style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Track view
        this.trackArticleView(articleId);
    }

    /**
     * Get modal meta HTML
     */
    getModalMetaHTML(article) {
        const formattedDate = this.formatDate(article.date);
        const readingTime = this.calculateReadingTime(article.content);
        
        return `
            <div class="news-author">
                <div class="author-avatar">${(article.author || 'P').charAt(0).toUpperCase()}</div>
                <span>By ${article.author}</span>
            </div>
            <span class="news-date">${formattedDate}</span>
            <span>${readingTime} min read</span>
            <span class="news-category">${article.category}</span>
        `;
    }

    /**
     * Close news modal
     */
    closeNewsModal() {
        document.getElementById('newsModal').style.display = 'none';
        document.body.style.overflow = '';
        this.currentArticle = null;
    }

    /**
     * Handle article actions
     */
    async toggleLike() {
        if (!this.currentArticle) return;
        
        try {
            const likeBtn = document.getElementById('likeBtn');
            const likeCount = likeBtn.querySelector('.like-count');
            
            const isLiked = likeBtn.classList.contains('active');
            const newCount = isLiked 
                ? Math.max(0, parseInt(likeCount.textContent) - 1)
                : parseInt(likeCount.textContent) + 1;
            
            // Update UI immediately
            likeBtn.classList.toggle('active');
            likeCount.textContent = newCount;
            
            // Update in Firebase if available
            if (window.firebaseService && this.currentArticle.id) {
                await window.firebaseService.updateUserStats(
                    window.firebaseAuth.auth.currentUser.uid,
                    { likes: window.firebaseFirestore.increment(isLiked ? -1 : 1) }
                );
            }
            
            window.pattiBytes?.showToast(
                isLiked ? 'Like removed' : 'Article liked!', 
                'success'
            );
            
        } catch (error) {
            console.error('Error toggling like:', error);
            window.pattiBytes?.showToast('Failed to update like', 'error');
        }
    }

    async shareArticle() {
        if (!this.currentArticle) return;
        
        const shareData = {
            title: this.currentArticle.title,
            text: this.currentArticle.preview,
            url: window.location.href
        };
        
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                // Fallback: copy to clipboard
                await navigator.clipboard.writeText(shareData.url);
                window.pattiBytes?.showToast('Link copied to clipboard!', 'success');
            }
        } catch (error) {
            console.error('Error sharing:', error);
            window.pattiBytes?.showToast('Failed to share article', 'error');
        }
    }

    async translateArticle() {
        // Implement translation functionality
        window.pattiBytes?.showToast('Translation feature coming soon!', 'info');
    }

    /**
     * Submit comment
     */
    async submitComment() {
        if (!this.currentArticle) return;
        
        const commentInput = document.getElementById('commentInput');
        const comment = commentInput.value.trim();
        
        if (!comment) return;
        
        try {
            const user = window.firebaseAuth.auth.currentUser;
            if (!user) {
                window.pattiBytes?.showToast('Please log in to comment', 'warning');
                return;
            }
            
            const commentData = {
                articleId: this.currentArticle.id,
                authorId: user.uid,
                authorName: user.displayName || 'Anonymous',
                authorAvatar: user.photoURL,
                content: comment,
                likes: 0,
                timestamp: new Date()
            };
            
            // Add comment to Firebase
            if (window.firebaseService) {
                await window.firebaseFirestore.addDoc(
                    window.firebaseFirestore.collection(window.firebaseFirestore.db, 'comments'),
                    {
                        ...commentData,
                        timestamp: window.firebaseFirestore.serverTimestamp()
                    }
                );
            }
            
            // Update UI
            this.addCommentToUI(commentData);
            commentInput.value = '';
            document.getElementById('submitCommentBtn').disabled = true;
            document.getElementById('cancelCommentBtn').style.display = 'none';
            
            window.pattiBytes?.showToast('Comment posted!', 'success');
            
        } catch (error) {
            console.error('Error submitting comment:', error);
            window.pattiBytes?.showToast('Failed to post comment', 'error');
        }
    }

    /**
     * Add comment to UI
     */
    addCommentToUI(commentData) {
        const commentsList = document.getElementById('commentsList');
        const commentHTML = this.createCommentHTML(commentData);
        
        commentsList.insertAdjacentHTML('afterbegin', commentHTML);
        
        // Update comment count
        const currentCount = parseInt(document.getElementById('commentCount').textContent);
        document.getElementById('commentCount').textContent = currentCount + 1;
    }

    /**
     * Create comment HTML
     */
    createCommentHTML(comment) {
        const timeAgo = this.getTimeAgo(comment.timestamp);
        const authorInitial = (comment.authorName || 'U').charAt(0).toUpperCase();
        
        return `
            <div class="comment-item">
                <div class="comment-avatar">
                    ${comment.authorAvatar 
                        ? `<img src="${comment.authorAvatar}" alt="${comment.authorName}">`
                        : `<span>${authorInitial}</span>`
                    }
                </div>
                <div class="comment-content">
                    <div class="comment-author">${comment.authorName}</div>
                    <div class="comment-text">${comment.content}</div>
                    <div class="comment-meta">
                        <span class="comment-time">${timeAgo}</span>
                        <button class="comment-like-btn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                            </svg>
                            ${comment.likes || 0}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Load article comments
     */
    async loadArticleComments(articleId) {
        try {
            const commentsList = document.getElementById('commentsList');
            commentsList.innerHTML = '<div class="loading-comments">Loading comments...</div>';
            
            // Load from Firebase if available
            if (window.firebaseService) {
                const commentsQuery = window.firebaseFirestore.query(
                    window.firebaseFirestore.collection(window.firebaseFirestore.db, 'comments'),
                    window.firebaseFirestore.where('articleId', '==', articleId),
                    window.firebaseFirestore.orderBy('timestamp', 'desc'),
                    window.firebaseFirestore.limit(20)
                );
                
                const snapshot = await window.firebaseFirestore.getDocs(commentsQuery);
                const comments = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    timestamp: doc.data().timestamp?.toDate() || new Date()
                }));
                
                this.renderComments(comments);
            } else {
                commentsList.innerHTML = '<p>Comments not available</p>';
            }
            
        } catch (error) {
            console.error('Error loading comments:', error);
            document.getElementById('commentsList').innerHTML = '<p>Failed to load comments</p>';
        }
    }

    /**
     * Render comments list
     */
    renderComments(comments) {
        const commentsList = document.getElementById('commentsList');
        document.getElementById('commentCount').textContent = comments.length;
        
        if (comments.length === 0) {
            commentsList.innerHTML = '<p class="no-comments">No comments yet. Be the first to comment!</p>';
            return;
        }
        
        const commentsHTML = comments.map(comment => this.createCommentHTML(comment)).join('');
        commentsList.innerHTML = commentsHTML;
    }

    /**
     * Handle create post
     */
    async handleCreatePost() {
        const form = document.getElementById('createPostForm');
        const formData = new FormData(form);
        const submitBtn = document.getElementById('submitPostBtn');
        
        try {
            // Show loading state
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;
            
            const user = window.firebaseAuth.auth.currentUser;
            if (!user) {
                window.pattiBytes?.showToast('Please log in to create posts', 'warning');
                return;
            }
            
            // Prepare post data
            const postData = {
                title: formData.get('title'),
                content: formData.get('content'),
                category: formData.get('category'),
                authorId: user.uid,
                author: user.displayName || 'Anonymous',
                authorAvatar: user.photoURL,
                preview: this.generatePreview(formData.get('content')),
                language: 'pa'
            };
            
            // Handle image upload if present
            const imageFile = formData.get('image');
            if (imageFile && imageFile.size > 0) {
                const uploadResult = await window.cloudinaryService.uploadFile(imageFile, {
                    folder: 'posts',
                    tags: 'user-post',
                    onProgress: (percent) => {
                        console.log(`Upload progress: ${percent}%`);
                    }
                });
                
                postData.imageUrl = uploadResult.url;
                postData.imagePublicId = uploadResult.publicId;
            }
            
            // Save to Firebase
            const newPost = await window.firebaseService.createPost(postData);
            
            // Update UI
            this.newsData.unshift({
                id: newPost.id,
                ...postData,
                date: new Date(),
                likes: 0,
                comments: 0,
                views: 0,
                featured: false
            });
            
            this.renderNews(this.newsData);
            this.updateNewsCounts(this.newsData.length);
            
            // Close modal and show success
            this.closeCreatePostModal();
            window.pattiBytes?.showToast('Post created successfully!', 'success');
            
        } catch (error) {
            console.error('Error creating post:', error);
            window.pattiBytes?.showToast('Failed to create post', 'error');
        } finally {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    }

    /**
     * Handle image upload for create post
     */
    async handleImageUpload(file) {
        const uploadArea = document.getElementById('imageUploadArea');
        const uploadPlaceholder = uploadArea.querySelector('.upload-placeholder');
        const imagePreview = document.getElementById('imagePreview');
        const previewImg = document.getElementById('previewImg');
        
        try {
            // Validate file
            if (!file.type.startsWith('image/')) {
                window.pattiBytes?.showToast('Please select an image file', 'error');
                return;
            }
            
            if (file.size > 10 * 1024 * 1024) {
                window.pattiBytes?.showToast('Image size should be less than 10MB', 'error');
                return;
            }
            
            // Show preview
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                uploadPlaceholder.style.display = 'none';
                imagePreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
            
            // Set file to form
            document.getElementById('postImage').files = file;
            
        } catch (error) {
            console.error('Error handling image upload:', error);
            window.pattiBytes?.showToast('Failed to process image', 'error');
        }
    }

    /**
     * Remove uploaded image
     */
    removeUploadedImage() {
        const uploadArea = document.getElementById('imageUploadArea');
        const uploadPlaceholder = uploadArea.querySelector('.upload-placeholder');
        const imagePreview = document.getElementById('imagePreview');
        const postImage = document.getElementById('postImage');
        
        uploadPlaceholder.style.display = 'flex';
        imagePreview.style.display = 'none';
        postImage.value = '';
    }

    /**
     * Navigation and UI helper methods
     */
    navigateToSection(section) {
        // Update active states
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            item.removeAttribute('aria-current');
        });
        
        document.querySelectorAll('.bottom-nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Activate current section
        document.querySelectorAll(`[data-section="${section}"]`).forEach(item => {
            item.classList.add('active');
            if (item.classList.contains('nav-item')) {
                item.setAttribute('aria-current', 'page');
            }
        });
        
        document.getElementById(`${section}-section`)?.classList.add('active');
        
        this.currentSection = section;
        
        // Load section-specific data
        if (section === 'news' && this.newsData.length === 0) {
            this.loadNewsData();
        }
    }

    filterNews(filter) {
        this.currentFilter = filter;
        
        if (filter === 'all') {
            this.renderNews(this.newsData);
        } else {
            const filteredNews = this.newsData.filter(article => 
                article.category === filter
            );
            this.renderNews(filteredNews);
        }
    }

    handleSearch(query) {
        if (!query.trim()) {
            this.renderNews(this.newsData);
            return;
        }
        
        const searchResults = this.newsData.filter(article =>
            article.title.toLowerCase().includes(query.toLowerCase()) ||
            article.content.toLowerCase().includes(query.toLowerCase()) ||
            article.preview.toLowerCase().includes(query.toLowerCase())
        );
        
        this.renderNews(searchResults);
        window.pattiBytes?.showToast(`Found ${searchResults.length} results`, 'info');
    }

    async handleSignOut() {
        try {
            await window.firebaseAuth.signOut(window.firebaseAuth.auth);
            window.location.href = '/app/auth.html';
        } catch (error) {
            console.error('Sign out error:', error);
            window.pattiBytes?.showToast('Failed to sign out', 'error');
        }
    }

    openCreatePostModal() {
        document.getElementById('createPostModal').style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    closeCreatePostModal() {
        document.getElementById('createPostModal').style.display = 'none';
        document.body.style.overflow = '';
        document.getElementById('createPostForm').reset();
        this.removeUploadedImage();
    }

    setupModals() {
        // Close modals on backdrop click
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                    document.body.style.overflow = '';
                }
            });
        });
    }

    // Utility methods
    formatDate(date) {
        if (!date) return '';
        const dateObj = date instanceof Date ? date : new Date(date);
        return dateObj.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    calculateReadingTime(content) {
        const wordsPerMinute = 200;
        const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
        return Math.ceil(wordCount / wordsPerMinute);
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));
        
        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ago`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays}d ago`;
    }

    updateNewsCounts(count) {
        document.getElementById('newsCount').textContent = count;
        document.getElementById('bottomNewsCount').textContent = count;
        document.getElementById('totalNewsCount').textContent = count;
    }

    showNewsLoading() {
        const newsContent = document.getElementById('newsContent');
        if (newsContent) {
            newsContent.innerHTML = this.getLoadingSkeletonHTML();
        }
    }

    hideNewsLoading() {
        // Loading will be hidden when content is rendered
    }

    getLoadingSkeletonHTML() {
        return `
            <div class="loading-skeleton">
                ${Array(6).fill(0).map(() => `
                    <div class="news-card-skeleton">
                        <div class="skeleton-image"></div>
                        <div class="skeleton-content">
                            <div class="skeleton-title"></div>
                            <div class="skeleton-meta"></div>
                            <div class="skeleton-preview"></div>
                            <div class="skeleton-preview"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    getEmptyNewsHTML() {
        return `
            <div class="empty-state">
                <div class="empty-icon">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path>
                    </svg>
                </div>
                <h3>No News Available</h3>
                <p>Check back later for the latest updates from Patti.</p>
                <button class="btn btn-primary" onclick="window.dashboardManager.loadNewsData(true)">
                    Refresh News
                </button>
            </div>
        `;
    }

    animateCounters() {
        document.querySelectorAll('.stat-number').forEach(counter => {
            const target = parseInt(counter.getAttribute('data-target'));
            const increment = target / 30;
            let current = 0;
            
            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    counter.textContent = target;
                    clearInterval(timer);
                } else {
                    counter.textContent = Math.floor(current);
                }
            }, 50);
        });
    }

    trackArticleView(articleId) {
        // Increment view count
        const article = this.newsData.find(a => a.id === articleId);
        if (article) {
            article.views = (article.views || 0) + 1;
        }
        
        // Track in Firebase if available
        if (window.firebaseService) {
            // Implementation for view tracking
        }
    }
