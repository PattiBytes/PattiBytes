/**
 * PattiBytes Dashboard Script
 * Handles dashboard-specific functionality and interactions
 */

class DashboardManager {
    constructor() {
        this.currentUser = null;
        this.currentSection = 'dashboard';
        this.isMobile = window.innerWidth <= 1024;
        this.sidebarOpen = false;
        this.init();
    }

    init() {
        this.setupAuthCheck();
        this.bindEvents();
        this.setupMobileHandlers();
        this.loadDashboardData();
        this.setupNotifications();
    }

    setupAuthCheck() {
        if (!window.firebaseAuth) {
            console.error('Firebase not initialized');
            this.redirectToAuth();
            return;
        }

        window.firebaseAuth.onAuthStateChanged(window.firebaseAuth.auth, (user) => {
            if (user) {
                this.currentUser = user;
                this.updateUserUI();
                this.hideLoading();
            } else {
                this.redirectToAuth();
            }
        });
    }

    bindEvents() {
        // Navigation events
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.currentTarget.dataset.section;
                if (section) {
                    this.navigateToSection(section);
                    this.updateActiveNavigation(e.currentTarget);
                    
                    if (this.isMobile) {
                        this.closeSidebar();
                    }
                }
            });
        });

        // Sign out event
        const signOutBtn = document.getElementById('signOutBtn');
        if (signOutBtn) {
            signOutBtn.addEventListener('click', () => {
                this.handleSignOut();
            });
        }

        // Profile update event
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateProfile();
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // Hash change for navigation
        window.addEventListener('hashchange', () => {
            this.handleHashChange();
        });
    }

    setupMobileHandlers() {
        // Create mobile menu button if not exists
        if (this.isMobile && !document.querySelector('.mobile-menu-btn')) {
            this.createMobileMenuButton();
        }

        // Create mobile overlay
        if (this.isMobile && !document.querySelector('.mobile-overlay')) {
            this.createMobileOverlay();
        }
    }

    createMobileMenuButton() {
        const menuBtn = document.createElement('button');
        menuBtn.className = 'mobile-menu-btn';
        menuBtn.innerHTML = '☰';
        menuBtn.setAttribute('aria-label', 'Toggle menu');
        
        menuBtn.addEventListener('click', () => {
            this.toggleSidebar();
        });
        
        const headerContent = document.querySelector('.header-content');
        if (headerContent) {
            headerContent.insertBefore(menuBtn, headerContent.firstChild);
        }
    }

    createMobileOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'mobile-overlay';
        
        overlay.addEventListener('click', () => {
            this.closeSidebar();
        });
        
        document.body.appendChild(overlay);
    }

    toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.mobile-overlay');
        
        this.sidebarOpen = !this.sidebarOpen;
        
        if (sidebar) {
            sidebar.classList.toggle('open', this.sidebarOpen);
        }
        
        if (overlay) {
            overlay.classList.toggle('active', this.sidebarOpen);
        }
        
        // Prevent body scroll when sidebar is open
        document.body.style.overflow = this.sidebarOpen ? 'hidden' : '';
    }

    closeSidebar() {
        if (this.sidebarOpen) {
            this.toggleSidebar();
        }
    }

    updateUserUI() {
        if (!this.currentUser) return;

        // Update user name
        const userName = document.getElementById('userName');
        if (userName) {
            userName.textContent = this.currentUser.displayName || 'User';
        }

        // Update user avatar
        const userAvatar = document.querySelector('.user-avatar');
        if (userAvatar) {
            const initials = this.getUserInitials(this.currentUser.displayName || this.currentUser.email);
            userAvatar.textContent = initials;
        }

        // Update profile form
        const profileName = document.getElementById('profileName');
        const profileEmail = document.getElementById('profileEmail');
        
        if (profileName) {
            profileName.value = this.currentUser.displayName || '';
        }
        
        if (profileEmail) {
            profileEmail.value = this.currentUser.email || '';
        }

        // Update profile avatar large
        const profileAvatarLarge = document.querySelector('.profile-avatar-large');
        if (profileAvatarLarge) {
            const initials = this.getUserInitials(this.currentUser.displayName || this.currentUser.email);
            profileAvatarLarge.textContent = initials;
        }
    }

    getUserInitials(name) {
        if (!name) return '?';
        
        const nameParts = name.split(' ');
        if (nameParts.length >= 2) {
            return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }

    navigateToSection(sectionName) {
        // Hide all sections
        const sections = document.querySelectorAll('.content-section');
        sections.forEach(section => {
            section.classList.remove('active');
        });

        // Show target section
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
            this.currentSection = sectionName;

            // Update URL hash
            window.location.hash = sectionName;

            // Update page title
            this.updatePageTitle(sectionName);

            // Load section data
            this.loadSectionData(sectionName);
        }
    }

    updateActiveNavigation(activeItem) {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.classList.remove('active');
        });
        
        activeItem.classList.add('active');
    }

    updatePageTitle(section) {
        const titles = {
            dashboard: 'Dashboard - PattiBytes',
            news: 'Latest News - PattiBytes',
            places: 'Famous Places - PattiBytes',
            shop: 'Local Shop - PattiBytes',
            profile: 'My Profile - PattiBytes'
        };

        document.title = titles[section] || 'PattiBytes';
    }

    async loadSectionData(section) {
        try {
            switch (section) {
                case 'dashboard':
                    await this.loadDashboardData();
                    break;
                case 'news':
                    await this.loadNewsData();
                    break;
                case 'places':
                    await this.loadPlacesData();
                    break;
                case 'shop':
                    await this.loadShopData();
                    break;
            }
        } catch (error) {
            console.error(`Error loading ${section} data:`, error);
            this.showToast(`Failed to load ${section} data`, 'error');
        }
    }

    async loadDashboardData() {
        this.showSectionLoading('dashboard');
        
        // Simulate loading time
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Update stats with real data (placeholder for now)
        this.updateStatsCards([
            { title: 'Total News', value: '248', change: '+12%', positive: true },
            { title: 'Famous Places', value: '45', change: '+3%', positive: true },
            { title: 'Local Shops', value: '156', change: '+8%', positive: true },
            { title: 'Active Users', value: '1,234', change: '+15%', positive: true }
        ]);
        
        this.hideSectionLoading('dashboard');
    }

    async loadNewsData() {
        const newsContent = document.getElementById('newsContent');
        if (!newsContent) return;

        this.showSectionLoading('news');
        
        try {
            // In real implementation, this would fetch from your API
            const newsData = [
                {
                    title: 'ਪੱਟੀ ਵਿੱਚ ਨਵਾਂ ਸਕੂਲ ਖੋਲ੍ਹਿਆ ਗਿਆ',
                    excerpt: 'ਸਥਾਨਕ ਪ੍ਰਸ਼ਾਸਨ ਵੱਲੋਂ ਇੱਕ ਨਵਾਂ ਸਰਕਾਰੀ ਸਕੂਲ ਖੋਲ੍ਹਿਆ ਗਿਆ ਹੈ।',
                    date: new Date().toISOString(),
                    category: 'Education'
                },
                {
                    title: 'ਕਿਸਾਨਾਂ ਲਈ ਨਵੀਂ ਸਕੀਮ ਦਾ ਐਲਾਨ',
                    excerpt: 'ਕਿਸਾਨਾਂ ਦੀ ਆਰਥਿਕ ਸਹਾਇਤਾ ਲਈ ਨਵੀਂ ਯੋਜਨਾ ਸ਼ੁਰੂ ਕੀਤੀ ਗਈ।',
                    date: new Date().toISOString(),
                    category: 'Agriculture'
                }
            ];
            
            newsContent.innerHTML = this.renderNewsItems(newsData);
        } catch (error) {
            newsContent.innerHTML = '<p>Unable to load news at this time.</p>';
        }
        
        this.hideSectionLoading('news');
    }

    renderNewsItems(newsData) {
        return newsData.map(item => `
            <article class="content-card">
                <div class="card-header">
                    <div>
                        <h3 class="card-title">${item.title}</h3>
                        <span class="card-category">${item.category}</span>
                    </div>
                    <time class="card-date">${this.formatDate(item.date)}</time>
                </div>
                <div class="card-body">
                    <p>${item.excerpt}</p>
                    <a href="#" class="card-action">Read more →</a>
                </div>
            </article>
        `).join('');
    }

    updateStatsCards(stats) {
        const statCards = document.querySelectorAll('.stat-card');
        
        stats.forEach((stat, index) => {
            const card = statCards[index];
            if (card) {
                const numberEl = card.querySelector('.stat-number');
                const changeEl = card.querySelector('.stat-change');
                
                if (numberEl) {
                    this.animateNumber(numberEl, parseInt(stat.value.replace(/,/g, '')));
                }
                
                if (changeEl) {
                    changeEl.textContent = stat.change;
                    changeEl.className = `stat-change ${stat.positive ? 'positive' : 'negative'}`;
                }
            }
        });
    }

    animateNumber(element, finalValue) {
        const duration = 1000;
        const start = 0;
        const startTime = performance.now();
        
        const updateNumber = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const currentValue = Math.floor(start + (finalValue - start) * progress);
            element.textContent = currentValue.toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(updateNumber);
            }
        };
        
        requestAnimationFrame(updateNumber);
    }

    showSectionLoading(section) {
        const sectionEl = document.getElementById(`${section}-section`);
        if (sectionEl && !sectionEl.querySelector('.loading-skeleton')) {
            const skeleton = this.createLoadingSkeleton();
            sectionEl.appendChild(skeleton);
        }
    }

    hideSectionLoading(section) {
        const sectionEl = document.getElementById(`${section}-section`);
        if (sectionEl) {
            const skeleton = sectionEl.querySelector('.loading-skeleton');
            if (skeleton) {
                skeleton.remove();
            }
        }
    }

    createLoadingSkeleton() {
        const skeleton = document.createElement('div');
        skeleton.className = 'loading-skeleton';
        skeleton.innerHTML = `
            <div class="loading-card">
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text" style="width: 80%;"></div>
            </div>
        `;
        return skeleton;
    }

    setupNotifications() {
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    showToast(message, type = 'info') {
        if (window.pattiBytes) {
            window.pattiBytes.showToast(message, type);
        }
    }

    showLoading() {
        if (window.pattiBytes) {
            window.pattiBytes.showLoading();
        }
    }

    hideLoading() {
        if (window.pattiBytes) {
            window.pattiBytes.hideLoading();
        }
    }

    handleKeyboardShortcuts(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case '1':
                    e.preventDefault();
                    this.navigateToSection('dashboard');
                    break;
                case '2':
                    e.preventDefault();
                    this.navigateToSection('news');
                    break;
                case '3':
                    e.preventDefault();
                    this.navigateToSection('places');
                    break;
                case '4':
                    e.preventDefault();
                    this.navigateToSection('shop');
                    break;
                case '5':
                    e.preventDefault();
                    this.navigateToSection('profile');
                    break;
            }
        }
        
        // Escape key to close sidebar on mobile
        if (e.key === 'Escape' && this.isMobile && this.sidebarOpen) {
            this.closeSidebar();
        }
    }

    handleResize() {
        const wasMobile = this.isMobile;
        this.isMobile = window.innerWidth <= 1024;
        
        if (wasMobile !== this.isMobile) {
            if (this.isMobile) {
                this.setupMobileHandlers();
                this.closeSidebar();
            } else {
                const sidebar = document.querySelector('.sidebar');
                const overlay = document.querySelector('.mobile-overlay');
                
                if (sidebar) sidebar.classList.remove('open');
                if (overlay) overlay.classList.remove('active');
                
                document.body.style.overflow = '';
                this.sidebarOpen = false;
            }
        }
    }

    handleHashChange() {
        const hash = window.location.hash.slice(1);
        if (hash && hash !== this.currentSection) {
            this.navigateToSection(hash);
            
            // Update active navigation
            const navItem = document.querySelector(`[data-section="${hash}"]`);
            if (navItem) {
                this.updateActiveNavigation(navItem);
            }
        }
    }

    async handleSignOut() {
        try {
            this.showLoading();
            await window.firebaseAuth.signOut(window.firebaseAuth.auth);
            this.redirectToAuth();
        } catch (error) {
            console.error('Error signing out:', error);
            this.showToast('Error signing out. Please try again.', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async updateProfile() {
        const nameInput = document.getElementById('profileName');
        const newName = nameInput?.value?.trim();
        
        if (!newName) {
            this.showToast('Please enter a name', 'error');
            return;
        }

        try {
            this.showLoading();
            
            await window.firebaseAuth.updateProfile(this.currentUser, {
                displayName: newName
            });
            
            this.updateUserUI();
            this.showToast('Profile updated successfully!', 'success');
        } catch (error) {
            console.error('Error updating profile:', error);
            this.showToast('Error updating profile. Please try again.', 'error');
        } finally {
            this.hideLoading();
        }
    }

    formatDate(dateString) {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(new Date(dateString));
    }

    redirectToAuth() {
        window.location.href = '/app/auth.html';
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DashboardManager();
});
