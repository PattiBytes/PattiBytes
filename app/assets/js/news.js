/**
 * News Page - Complete Functionality
 * Dynamic loading from NetlifyCMS and Firebase integration
 */

class NewsManager {
    constructor() {
        this.articles = [];
        this.filteredArticles = [];
        this.currentFilter = 'all';
        this.currentPage = 1;
        this.pageSize = 12;
        this.isLoading = false;
        this.searchQuery = '';
        this.currentArticle = null;
        
        this.init();
    }

    async init() {
        try {
            await this.waitForDependencies();
            this.setupEventListeners();
            this.setupSearch();
            this.setupFilters();
            this.setupModals();
            
            // Load initial articles
            await this.loadArticles();
            
            // Setup auto-refresh
            this.setupAutoRefresh();
            
            console.log('✅ NewsManager initialized');
        } catch (error) {
            console.error('❌ NewsManager initialization failed:', error);
            Toast.show('Failed to initialize news page', 'error');
        }
    }

    async waitForDependencies() {
        return new Promise((resolve) => {
            const checkDependencies = () => {
                if (window.PattiUtils && window.Toast && window.LoadingManager) {
                    resolve();
                } else {
                    setTimeout(checkDependencies, 100);
                }
            };
            checkDependencies();
        });
    }

    setupEventListeners() {
        // Refresh news
        const refreshBtn = PattiUtils.$('#refreshNews');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshArticles();
            });
        }

        // Load more
        const loadMoreBtn = PattiUtils.$('#loadMoreNews');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                this.loadMoreArticles();
            });
        }

        // Create news FAB
        const createFab = PattiUtils.$('#createNewsFab');
        if (createFab) {
            createFab.addEventListener('click', () => {
                this.openCreateModal();
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'r':
                        e.preventDefault();
                        this.refreshArticles();
                        break;
                    case 'f':
                        e.preventDefault();
                        const searchInput = PattiUtils.$('#newsSearch');
                        if (searchInput) searchInput.focus();
                        break;
                }
            }
        });
    }

    setupSearch() {
        const searchInput = PattiUtils.$('#newsSearch');
        const clearBtn = PattiUtils.$('#clearSearch');

        if (searchInput) {
            searchInput.addEventListener('input', PattiUtils.debounce((e) => {
                this.searchQuery = e.target.value.trim();
                this.filterArticles();
                
                // Show/hide clear button
                if (clearBtn) {
                    clearBtn.style.display = this.searchQuery ? 'block' : 'none';
                }
            }, 300));

            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.performSearch();
                }
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                searchInput.value = '';
                this.searchQuery = '';
                clearBtn.style.display = 'none';
                this.filterArticles();
                searchInput.focus();
            });
        }
    }

    setupFilters() {
        const filterTabs = PattiUtils.$$('.filter-tab');
        
        filterTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const filter = tab.getAttribute('data-filter');
                this.setActiveFilter(filter);
                
                // Update UI
                filterTabs.forEach(t => t.setAttribute('aria-selected', 'false'));
                tab.setAttribute('aria-selected', 'true');
            });
        });
    }

    setupModals() {
        // News detail modal
        const newsModal = PattiUtils.$('#newsModal');
        const newsModalClose = PattiUtils.$('#newsModalClose');

        if (newsModalClose) {
            newsModalClose.addEventListener('click', () => {
                this.closeNewsModal();
            });
        }

        if (newsModal) {
            newsModal.addEventListener('click', (e) => {
                if (e.target === newsModal) {
                    this.closeNewsModal();
                }
            });
        }

        // Article actions
        this.setupArticleActions();
        this.setupComments();
    }

    setupArticleActions() {
        // Like button
        const likeBtn = PattiUtils.$('#newsLikeBtn');
        if (likeBtn) {
            likeBtn.addEventListener('click', () => {
                this.toggleLike();
            });
        }

        // Share button
        const shareBtn = PattiUtils.$('#newsShareBtn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                this.shareArticle();
            });
        }

        // Comment button
        const commentBtn = PattiUtils.$('#newsCommentBtn');
        if (commentBtn) {
            commentBtn.addEventListener('click', () => {
                const commentsSection = PattiUtils.$('#commentsSection');
                if (commentsSection) {
                    commentsSection.scrollIntoView({ behavior: 'smooth' });
                    const commentInput = PattiUtils.$('#commentInput');
                    if (commentInput) commentInput.focus();
                }
            });
        }
    }

    setupComments() {
        const commentInput = PattiUtils.$('#commentInput');
        const submitBtn = PattiUtils.$('#submitComment');
        const cancelBtn = PattiUtils.$('#cancelComment');

        if (commentInput && submitBtn) {
            commentInput.addEventListener('input', () => {
                const hasContent = commentInput.value.trim().length > 0;
                submitBtn.disabled = !hasContent;
                
                if (cancelBtn) {
                    cancelBtn.style.display = hasContent ? 'inline-flex' : 'none';
                }
            });

            submitBtn.addEventListener('click', () => {
                this.submitComment();
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                commentInput.value = '';
                submitBtn.disabled = true;
                cancelBtn.style.display = 'none';
            });
        }
    }

    // Data Loading Methods
    async loadArticles(refresh = false) {
        if (this.isLoading && !refresh) return;
        
        this.isLoading = true;
        
        try {
            if (refresh) {
                this.showLoadingSkeleton();
            }

            // Try NetlifyCMS first, then Firebase fallback
            let articles = await this.loadFromNetlifyCMS();
            
            if (!articles || articles.length === 0) {
                articles = await this.loadFromFirebase();
            }

            this.articles = articles;
            this.filterArticles();
            
            // Update counters
            this.updateNewsCount();
            
            console.log(`✅ Loaded ${articles.length} articles`);
            
        } catch (error) {
            console.error('Error loading articles:', error);
            Toast.show('Failed to load news articles', 'error');
            this.showErrorState();
        } finally {
            this.isLoading = false;
            this.hideLoadingSkeleton();
        }
    }

    async loadFromNetlifyCMS() {
        try {
            // Load from your existing NetlifyCMS structure
            const response = await fetch('/news/index.json');
            if (!response.ok) throw new Error('NetlifyCMS not available');
            
            const data = await response.json();
            
            return data.map(item => ({
                id: item.slug || this.generateId(),
                title: item.title,
                content: item.content || item.body,
                preview: item.excerpt || this.generatePreview(item.content || item.body),
                author: item.author || 'PattiBytes Team',
                authorAvatar: null,
                publishedAt: new Date(item.date || Date.now()),
                category: item.category || 'local',
                tags: item.tags || [],
                featuredImage: item.image || item.featured_image,
                language: item.language || 'pa',
                featured: item.featured || false,
                likes: Math.floor(Math.random() * 50),
                comments: Math.floor(Math.random() * 20),
                views: Math.floor(Math.random() * 500) + 50,
                shares: Math.floor(Math.random() * 15),
                readingTime: this.calculateReadingTime(item.content || item.body || ''),
                source: 'cms'
            }));
            
        } catch (error) {
            console.log('NetlifyCMS not available, using Firebase fallback');
            return [];
        }
    }

    async loadFromFirebase() {
        try {
            if (!window.pattiDataService) {
                return this.generateMockArticles();
            }

            const articles = await window.pattiDataService.getNewsArticles({
                limit: 20,
                orderBy: 'publishedAt',
                orderDirection: 'desc'
            });

            return articles.map(article => ({
                ...article,
                publishedAt: article.publishedAt?.toDate?.() || new Date(article.publishedAt),
                readingTime: this.calculateReadingTime(article.content),
                source: 'firebase'
            }));

        } catch (error) {
            console.error('Firebase loading failed:', error);
            return this.generateMockArticles();
        }
    }

    generateMockArticles() {
        const categories = ['breaking', 'local', 'politics', 'sports', 'culture'];
        const authors = ['ਸੁਰਿੰਦਰ ਸਿੰਘ', 'ਮਨਜੀਤ ਕੌਰ', 'ਗੁਰਪ੍ਰੀਤ ਸਿੰਘ', 'ਸਿਮਰਨ ਕੌਰ'];
        
        return Array.from({ length: 12 }, (_, i) => ({
            id: `mock-${i}`,
            title: `ਪੱਟੀ ਦੀ ਤਾਜ਼ਾ ਖ਼ਬਰ ${i + 1}`,
            content: `<p>ਇਹ ਇੱਕ ਨਮੂਨਾ ਖ਼ਬਰ ਹੈ। ਪੱਟੀ ਵਿੱਚ ਅੱਜ ਕਈ ਮਹੱਤਵਪੂਰਨ ਘਟਨਾਵਾਂ ਵਾਪਰੀਆਂ ਹਨ।</p>`,
            preview: 'ਪੱਟੀ ਵਿੱਚ ਅੱਜ ਕਈ ਮਹੱਤਵਪੂਰਨ ਘਟਨਾਵਾਂ ਵਾਪਰੀਆਂ ਹਨ। ਇਹ ਖ਼ਬਰ ਸਥਾਨਕ ਲੋਕਾਂ ਲਈ ਮਹੱਤਵਪੂਰਨ ਹੈ।',
            author: authors[i % authors.length],
            authorAvatar: null,
            publishedAt: new Date(Date.now() - (i * 3600000)), // Hours ago
            category: categories[i % categories.length],
            tags: ['ਪੱਟੀ', 'ਸਥਾਨਕ'],
            featuredImage: `https://picsum.photos/800/450?random=${i}`,
            language: 'pa',
            featured: i === 0,
            likes: Math.floor(Math.random() * 50),
            comments: Math.floor(Math.random() * 20),
            views: Math.floor(Math.random() * 500) + 50,
            shares: Math.floor(Math.random() * 15),
            readingTime: Math.floor(Math.random() * 5) + 2,
            source: 'mock'
        }));
    }

    // Utility Methods
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    generatePreview(content, maxLength = 150) {
        if (!content) return '';
        const text = content.replace(/<[^>]*>/g, '').trim();
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    calculateReadingTime(content) {
        const wordsPerMinute = 200;
        const wordCount = content ? content.replace(/<[^>]*>/g, '').split(/\s+/).length : 0;
        return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
    }

    // Filtering and Search
    setActiveFilter(filter) {
        this.currentFilter = filter;
        this.filterArticles();
    }

    filterArticles() {
        let filtered = this.articles;

        // Apply category filter
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(article => article.category === this.currentFilter);
        }

        // Apply search filter
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(article =>
                article.title.toLowerCase().includes(query) ||
                article.content.toLowerCase().includes(query) ||
                article.preview.toLowerCase().includes(query) ||
                article.author.toLowerCase().includes(query)
            );
        }

        this.filteredArticles = filtered;
        this.renderArticles();
        this.updateNoMatchMessage();
    }

    performSearch() {
        if (!this.searchQuery) return;
        
        Toast.show(`Searching for "${this.searchQuery}"...`, 'info', 2000);
        this.filterArticles();
    }

    // Rendering Methods
    renderArticles() {
        const newsGrid = PattiUtils.$('#newsGrid');
        if (!newsGrid) return;

        if (this.filteredArticles.length === 0) {
            newsGrid.innerHTML = '';
            return;
        }

        const articlesHTML = this.filteredArticles
            .slice(0, this.currentPage * this.pageSize)
            .map(article => this.createArticleCard(article))
            .join('');

        newsGrid.innerHTML = `<div class="news-grid">${articlesHTML}</div>`;
        
        // Bind click events
        this.bindArticleEvents();
        
        // Update load more button
        this.updateLoadMoreButton();
    }

    createArticleCard(article) {
        const timeAgo = PattiUtils.timeAgo(article.publishedAt);
        const authorInitial = (article.author || 'P').charAt(0);
        const categoryBadgeClass = article.category === 'breaking' ? 'breaking-badge' : '';
        
        return `
            <article class="news-card ${article.featured ? 'featured' : ''}" 
                     data-article-id="${article.id}"
                     data-category="${article.category}">
                ${article.featuredImage ? `
                    <div class="news-image-container">
                        <img src="${article.featuredImage}" 
                             alt="${PattiUtils.sanitizeHTML(article.title)}" 
                             class="news-image"
                             loading="lazy"
                             onerror="this.style.display='none'">
                        <div class="news-category-badge ${categoryBadgeClass}">
                            ${article.category}
                        </div>
                        <div class="reading-time">${article.readingTime} min read</div>
                    </div>
                ` : ''}
                
                <div class="news-content">
                    <h3 class="news-title">${PattiUtils.sanitizeHTML(article.title)}</h3>
                    
                    <div class="news-meta">
                        <div class="news-author">
                            <div class="author-avatar">${authorInitial}</div>
                            <span>${PattiUtils.sanitizeHTML(article.author)}</span>
                        </div>
                        <span class="news-date">${timeAgo}</span>
                    </div>
                    
                    <p class="news-preview">${PattiUtils.sanitizeHTML(article.preview)}</p>
                    
                    <div class="news-actions-footer">
                        <div class="news-stats">
                            <div class="news-stat">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                                ${article.views}
                            </div>
                            <div class="news-stat">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                                </svg>
                                ${article.likes}
                            </div>
                            <div class="news-stat">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                </svg>
                                ${article.comments}
                            </div>
                        </div>
                        <button class="read-more-btn" onclick="window.newsManager.openArticle('${article.id}')">
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

    bindArticleEvents() {
        const newsCards = PattiUtils.$$('.news-card');
        
        newsCards.forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't trigger if clicking on action buttons
                if (e.target.closest('.read-more-btn')) return;
                
                const articleId = card.getAttribute('data-article-id');
                this.openArticle(articleId);
            });
            
            // Add hover effects
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-4px)';
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
            });
        });
    }

    // Article Detail Methods
    openArticle(articleId) {
        const article = this.articles.find(a => a.id === articleId);
        if (!article) return;

        this.currentArticle = article;
        this.renderArticleModal(article);
        this.showNewsModal();
        this.trackView(article);
    }

    renderArticleModal(article) {
        const modalMedia = PattiUtils.$('#newsModalMedia');
        const modalTitle = PattiUtils.$('#newsModalTitle');
        const modalMeta = PattiUtils.$('#newsModalMeta');
        const modalContent = PattiUtils.$('#newsModalContent');

        if (modalMedia) {
            if (article.featuredImage) {
                modalMedia.innerHTML = `<img src="${article.featuredImage}" alt="${PattiUtils.sanitizeHTML(article.title)}">`;
                modalMedia.style.display = 'block';
            } else {
                modalMedia.style.display = 'none';
            }
        }

        if (modalTitle) {
            modalTitle.textContent = article.title;
        }

        if (modalMeta) {
            const timeAgo = PattiUtils.timeAgo(article.publishedAt);
            modalMeta.innerHTML = `
                <div class="news-author">
                    <div class="author-avatar">${article.author.charAt(0)}</div>
                    <span>By ${PattiUtils.sanitizeHTML(article.author)}</span>
                </div>
                <span class="news-date">${timeAgo}</span>
                <span>${article.readingTime} min read</span>
                <span class="news-category">${article.category}</span>
            `;
        }

        if (modalContent) {
            modalContent.innerHTML = article.content;
        }

        // Update action buttons
        this.updateArticleActions(article);
        this.loadComments(article.id);
    }

    updateArticleActions(article) {
        const likeBtn = PattiUtils.$('#newsLikeBtn');
        const likeCount = likeBtn?.querySelector('.like-count');
        if (likeCount) {
            likeCount.textContent = article.likes;
        }

        const commentBtn = PattiUtils.$('#newsCommentBtn');
        const commentCount = commentBtn?.querySelector('.comment-count');
        if (commentCount) {
            commentCount.textContent = article.comments;
        }
    }

    showNewsModal() {
        const modal = PattiUtils.$('#newsModal');
        if (modal) {
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            
            // Focus management for accessibility
            const closeBtn = modal.querySelector('.modal-close');
            if (closeBtn) closeBtn.focus();
        }
    }

    closeNewsModal() {
        const modal = PattiUtils.$('#newsModal');
        if (modal) {
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
            this.currentArticle = null;
        }
    }

    // Interaction Methods
    async toggleLike() {
        if (!this.currentArticle) return;

        const likeBtn = PattiUtils.$('#newsLikeBtn');
        const likeCount = likeBtn?.querySelector('.like-count');
        
        if (!likeCount) return;

        const isLiked = likeBtn.classList.contains('active');
        const newCount = isLiked ? 
            Math.max(0, parseInt(likeCount.textContent) - 1) :
            parseInt(likeCount.textContent) + 1;

        // Update UI immediately
        likeBtn.classList.toggle('active');
        likeCount.textContent = newCount;
        this.currentArticle.likes = newCount;

        // Update in articles array
        const articleIndex = this.articles.findIndex(a => a.id === this.currentArticle.id);
        if (articleIndex !== -1) {
            this.articles[articleIndex].likes = newCount;
        }

        try {
            // Save to backend if available
            if (window.pattiDataService && window.PattiApp.currentUser) {
                await window.pattiDataService.toggleLike('news', this.currentArticle.id, window.PattiApp.currentUser.uid);
            }

            Toast.show(isLiked ? 'Like removed' : 'Article liked!', 'success', 2000);
        } catch (error) {
            console.error('Error toggling like:', error);
            // Revert UI on error
            likeBtn.classList.toggle('active');
            likeCount.textContent = isLiked ? newCount + 1 : newCount - 1;
            Toast.show('Failed to update like', 'error');
        }
    }

    async shareArticle() {
        if (!this.currentArticle) return;

        const shareData = {
            title: this.currentArticle.title,
            text: this.currentArticle.preview,
            url: `${window.location.origin}${window.location.pathname}?article=${this.currentArticle.id}`
        };

        try {
            if (navigator.share && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                await navigator.share(shareData);
            } else {
                // Fallback: copy to clipboard
                await PattiUtils.copyToClipboard(shareData.url);
                Toast.show('Link copied to clipboard!', 'success');
            }

            // Track share
            this.currentArticle.shares++;
            if (window.pattiDataService) {
                await window.pattiDataService.shareItem('news', this.currentArticle.id, window.PattiApp.currentUser?.uid || 'anonymous');
            }

        } catch (error) {
            console.error('Error sharing:', error);
            if (!error.name === 'AbortError') {
                Toast.show('Failed to share article', 'error');
            }
        }
    }

      async submitComment() {
        const commentInput = PattiUtils.$('#commentInput');
        const submitBtn = PattiUtils.$('#submitComment');
        
        if (!commentInput || !this.currentArticle) return;
        
        const content = commentInput.value.trim();
        if (!content) return;

        try {
            submitBtn.disabled = true;
            submitBtn.classList.add('loading');

            const user = window.PattiApp.currentUser;
            if (!user) {
                Toast.show('Please sign in to comment', 'warning');
                return;
            }

            const comment = {
                id: this.generateId(),
                content: content,
                author: user.displayName || 'Anonymous',
                authorAvatar: user.photoURL,
                createdAt: new Date(),
                likes: 0,
                replies: []
            };

            // Add to UI immediately
            this.addCommentToUI(comment);
            
            // Clear input
            commentInput.value = '';
            submitBtn.disabled = true;
            const cancelBtn = PattiUtils.$('#cancelComment');
            if (cancelBtn) cancelBtn.style.display = 'none';

            // Save to backend
            if (window.pattiDataService) {
                await window.pattiDataService.addComment('news', this.currentArticle.id, content);
            }

            // Update comment count
            this.currentArticle.comments++;
            this.updateArticleActions(this.currentArticle);

            Toast.show('Comment added successfully!', 'success');

        } catch (error) {
            console.error('Error submitting comment:', error);
            Toast.show('Failed to add comment', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
        }
    }

    addCommentToUI(comment) {
        const commentsList = PattiUtils.$('#commentsList');
        if (!commentsList) return;

        const commentHTML = this.createCommentHTML(comment);
        commentsList.insertAdjacentHTML('afterbegin', commentHTML);

        // Update count
        const commentsCount = PattiUtils.$('#commentsCount');
        if (commentsCount) {
            const currentCount = parseInt(commentsCount.textContent) || 0;
            commentsCount.textContent = currentCount + 1;
        }
    }

    createCommentHTML(comment) {
        const timeAgo = PattiUtils.timeAgo(comment.createdAt);
        const authorInitial = (comment.author || 'U').charAt(0).toUpperCase();
        
        return `
            <div class="comment-item" data-comment-id="${comment.id}">
                <div class="comment-header">
                    <div class="comment-avatar">
                        ${comment.authorAvatar 
                            ? `<img src="${comment.authorAvatar}" alt="${comment.author}" loading="lazy">`
                            : `<span>${authorInitial}</span>`
                        }
                    </div>
                    <div class="comment-author">${PattiUtils.sanitizeHTML(comment.author)}</div>
                    <div class="comment-time">${timeAgo}</div>
                </div>
                <div class="comment-content">${PattiUtils.sanitizeHTML(comment.content)}</div>
                <div class="comment-actions">
                    <button class="comment-action like-comment" onclick="newsManager.likeComment('${comment.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                        </svg>
                        <span class="like-count">${comment.likes || 0}</span>
                    </button>
                    <button class="comment-action reply-comment" onclick="newsManager.replyToComment('${comment.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9,17 4,12 9,7"></polyline>
                            <path d="M20 18v-2a4 4 0 0 0-4-4H4"></path>
                        </svg>
                        Reply
                    </button>
                </div>
            </div>
        `;
    }

    async loadComments(articleId) {
        const commentsList = PattiUtils.$('#commentsList');
        const commentsCount = PattiUtils.$('#commentsCount');
        
        if (!commentsList) return;

        try {
            commentsList.innerHTML = '<div class="comments-loading">Loading comments...</div>';

            // Load from backend or generate mock comments
            let comments = [];
            
            if (window.pattiDataService) {
                comments = await window.pattiDataService.getComments('news', articleId);
            } else {
                comments = this.generateMockComments();
            }

            if (comments.length === 0) {
                commentsList.innerHTML = '<div class="no-comments">No comments yet. Be the first to comment!</div>';
            } else {
                const commentsHTML = comments.map(comment => this.createCommentHTML(comment)).join('');
                commentsList.innerHTML = commentsHTML;
            }

            if (commentsCount) {
                commentsCount.textContent = comments.length;
            }

        } catch (error) {
            console.error('Error loading comments:', error);
            commentsList.innerHTML = '<div class="comments-error">Failed to load comments</div>';
        }
    }

    generateMockComments() {
        const authors = ['ਸੁਰਿੰਦਰ ਸਿੰਘ', 'ਮਨਜੀਤ ਕੌਰ', 'ਗੁਰਪ੍ਰੀਤ ਸਿੰਘ'];
        const comments = ['ਬਹੁਤ ਵਧੀਆ ਖ਼ਬਰ!', 'ਧੰਨਵਾਦ ਜਾਣਕਾਰੀ ਲਈ', 'ਇਹ ਮਹੱਤਵਪੂਰਨ ਹੈ'];
        
        return Array.from({ length: 3 }, (_, i) => ({
            id: `comment-${i}`,
            content: comments[i % comments.length],
            author: authors[i % authors.length],
            authorAvatar: null,
            createdAt: new Date(Date.now() - (i * 1800000)), // 30 minutes ago each
            likes: Math.floor(Math.random() * 10),
            replies: []
        }));
    }

    // Additional Methods
    async refreshArticles() {
        Toast.show('Refreshing news...', 'info', 2000);
        await this.loadArticles(true);
        Toast.show('News updated!', 'success', 2000);
    }

    async loadMoreArticles() {
        if (this.isLoading) return;
        
        this.currentPage++;
        const hasMore = this.filteredArticles.length > this.currentPage * this.pageSize;
        
        if (!hasMore) {
            Toast.show('No more articles to load', 'info');
            const loadMoreBtn = PattiUtils.$('#loadMoreNews');
            if (loadMoreBtn) {
                loadMoreBtn.style.display = 'none';
            }
            return;
        }

        this.renderArticles();
    }

    updateLoadMoreButton() {
        const loadMoreBtn = PattiUtils.$('#loadMoreNews');
        const hasMore = this.filteredArticles.length > this.currentPage * this.pageSize;
        
        if (loadMoreBtn) {
            loadMoreBtn.style.display = hasMore ? 'block' : 'none';
        }
    }

    updateNoMatchMessage() {
        const noMatchMessage = PattiUtils.$('#noMatchMessage');
        const newsGrid = PattiUtils.$('#newsGrid');
        
        if (noMatchMessage && newsGrid) {
            const hasResults = this.filteredArticles.length > 0;
            noMatchMessage.style.display = hasResults ? 'none' : 'block';
            newsGrid.style.display = hasResults ? 'block' : 'none';
        }
    }

    updateNewsCount() {
        // Update global news count
        window.PattiApp.newsCount = this.articles.length;
        
        // Update badges in navigation
        if (window.BottomNavManager) {
            window.BottomNavManager.updateBadges();
        }
    }

    showLoadingSkeleton() {
        const newsGrid = PattiUtils.$('#newsGrid');
        if (newsGrid) {
            newsGrid.innerHTML = `
                <div class="loading-skeleton">
                    ${Array(6).fill(0).map(() => `
                        <div class="skeleton-card skeleton">
                            <div class="skeleton-image skeleton"></div>
                            <div class="skeleton-content">
                                <div class="skeleton-title skeleton"></div>
                                <div class="skeleton-meta skeleton"></div>
                                <div class="skeleton-preview skeleton"></div>
                                <div class="skeleton-preview skeleton"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    }

    hideLoadingSkeleton() {
        // Will be hidden when articles are rendered
    }

    showErrorState() {
        const newsGrid = PattiUtils.$('#newsGrid');
        if (newsGrid) {
            newsGrid.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                    </div>
                    <h3>Failed to Load News</h3>
                    <p>There was an error loading the news articles. Please try again.</p>
                    <button class="btn btn-primary" onclick="newsManager.refreshArticles()">Retry</button>
                </div>
            `;
        }
    }

    trackView(article) {
        article.views = (article.views || 0) + 1;
        
        // Track in backend if available
        if (window.pattiDataService && window.PattiApp.currentUser) {
            window.pattiDataService.trackView('news', article.id, window.PattiApp.currentUser.uid);
        }
    }

    setupAutoRefresh() {
        // Refresh every 5 minutes
        setInterval(() => {
            if (!document.hidden) {
                this.loadArticles();
            }
        }, 5 * 60 * 1000);
    }

    async likeComment(commentId) {
        const commentElement = PattiUtils.$(`[data-comment-id="${commentId}"]`);
        if (!commentElement) return;

        const likeBtn = commentElement.querySelector('.like-comment');
        const likeCount = likeBtn.querySelector('.like-count');
        
        if (!likeBtn || !likeCount) return;

        const isLiked = likeBtn.classList.contains('liked');
        const newCount = isLiked ? 
            Math.max(0, parseInt(likeCount.textContent) - 1) :
            parseInt(likeCount.textContent) + 1;

        likeBtn.classList.toggle('liked');
        likeCount.textContent = newCount;

        Toast.show(isLiked ? 'Like removed' : 'Comment liked!', 'success', 1500);
    }

    openCreateModal() {
        Toast.show('Create news feature coming soon!', 'info');
    }
}

// Initialize NewsManager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.newsManager = new NewsManager();
});

// Export for global access
window.NewsManager = NewsManager;
