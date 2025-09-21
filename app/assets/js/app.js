// /app/common.js — App-only bootstrap
(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/app/sw.js', { scope: '/app/' }).catch(console.error);
  }

  // Optional: install UI shown on app pages
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.documentElement.classList.add('pwa-can-install');
  });
  window.triggerPWAInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    deferredPrompt = null;
    document.documentElement.classList.remove('pwa-can-install');
  };
})();

/**
 * PattiBytes Main Application
 * Handles dashboard functionality, navigation, and user interactions
 */

class PattiBytesDashboard {
    constructor() {
        this.auth = window.firebaseAuth?.auth;
        this.currentUser = null;
        this.currentSection = 'dashboard';
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        this.checkAuthentication();
        this.bindEvents();
        this.loadInitialData();
        this.setupServiceWorker();
    }

    /**
     * Check user authentication status
     */
    checkAuthentication() {
        if (!window.firebaseAuth) {
            console.error('Firebase not initialized');
            this.redirectToAuth();
            return;
        }

        window.firebaseAuth.onAuthStateChanged(this.auth, (user) => {
            if (user) {
                this.currentUser = user;
                this.loadUserData();
                this.hideLoading();
            } else {
                this.redirectToAuth();
            }
        });
    }

    /**
     * Load user data into UI
     */
    loadUserData() {
        const userName = document.getElementById('userName');
        const profileName = document.getElementById('profileName');
        const profileEmail = document.getElementById('profileEmail');

        if (userName) {
            userName.textContent = this.currentUser.displayName || 'User';
        }

        if (profileName) {
            profileName.value = this.currentUser.displayName || '';
        }

        if (profileEmail) {
            profileEmail.value = this.currentUser.email;
        }
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Navigation events
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.currentTarget.dataset.section;
                this.navigateToSection(section);
                this.updateActiveNavigation(e.currentTarget);
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

        // Handle browser back/forward
        window.addEventListener('popstate', (e) => {
            const section = e.state?.section || 'dashboard';
            this.navigateToSection(section, false);
        });

        // Handle hash changes
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.slice(1);
            if (hash && hash !== this.currentSection) {
                this.navigateToSection(hash);
            }
        });
    }

    /**
     * Navigate to a specific section
     * @param {string} sectionName - The section to navigate to
     * @param {boolean} pushState - Whether to update browser history
     */
    navigateToSection(sectionName, pushState = true) {
        // Hide all sections
        const sections = document.querySelectorAll('.content-section');
        sections.forEach(section => {
            section.classList.remove('active');
            section.setAttribute('aria-hidden', 'true');
        });

        // Show target section
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
            targetSection.setAttribute('aria-hidden', 'false');
            this.currentSection = sectionName;

            // Update page title
            this.updatePageTitle(sectionName);

            // Update browser history
            if (pushState) {
                const url = `/app/#${sectionName}`;
                history.pushState({ section: sectionName }, '', url);
            }

            // Load section-specific data
            this.loadSectionData(sectionName);
        }
    }

    /**
     * Update active navigation item
     * @param {Element} activeItem - The active navigation item
     */
    updateActiveNavigation(activeItem) {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.classList.remove('active');
            item.removeAttribute('aria-current');
        });
        
        activeItem.classList.add('active');
        activeItem.setAttribute('aria-current', 'page');
    }

    /**
     * Update page title based on current section
     * @param {string} section - The current section
     */
    updatePageTitle(section) {
        const titles = {
            dashboard: 'Dashboard - PattiBytes',
            news: 'News - PattiBytes',
            places: 'Places - PattiBytes',
            shop: 'Shop - PattiBytes',
            profile: 'Profile - PattiBytes'
        };

        document.title = titles[section] || 'PattiBytes';
    }

    /**
     * Load section-specific data
     * @param {string} section - The section to load data for
     */
    async loadSectionData(section) {
        const contentArea = document.getElementById(`${section}Content`);
        
        if (!contentArea) return;

        try {
            this.showLoading();
            
            switch (section) {
                case 'news':
                    await this.loadNewsData();
                    break;
                case 'places':
                    await this.loadPlacesData();
                    break;
                case 'shop':
                    await this.loadShopData();
                    break;
                default:
                    break;
            }
        } catch (error) {
            console.error(`Error loading ${section} data:`, error);
            this.showError(`Failed to load ${section} data. Please try again.`);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Load news data
     */
    async loadNewsData() {
        const newsContent = document.getElementById('newsContent');
        if (!newsContent) return;

        try {
            const response = await fetch('/app/data/news.json');
            const newsData = await response.json();
            
            newsContent.innerHTML = this.renderNewsItems(newsData);
        } catch (error) {
            newsContent.innerHTML = '<p>Unable to load news at this time.</p>';
        }
    }

    /**
     * Load places data
     */
    async loadPlacesData() {
        const placesContent = document.getElementById('placesContent');
        if (!placesContent) return;

        try {
            const response = await fetch('/app/data/places.json');
            const placesData = await response.json();
            
            placesContent.innerHTML = this.renderPlacesItems(placesData);
        } catch (error) {
            placesContent.innerHTML = '<p>Unable to load places at this time.</p>';
        }
    }

    /**
     * Load shop data
     */
    async loadShopData() {
        const shopContent = document.getElementById('shopContent');
        if (!shopContent) return;

        try {
            const response = await fetch('/app/data/shop.json');
            const shopData = await response.json();
            
            shopContent.innerHTML = this.renderShopItems(shopData);
        } catch (error) {
            shopContent.innerHTML = '<p>Unable to load shop data at this time.</p>';
        }
    }

    /**
     * Render news items
     * @param {Array} newsData - Array of news items
     * @returns {string} HTML string
     */
    renderNewsItems(newsData) {
        return newsData.map(item => `
            <article class="news-item" itemscope itemtype="https://schema.org/NewsArticle">
                <header class="news-header">
                    <h3 itemprop="headline">${item.title}</h3>
                    <time itemprop="datePublished" datetime="${item.date}">${new Date(item.date).toLocaleDateString()}</time>
                </header>
                <p itemprop="description">${item.excerpt}</p>
                <a href="${item.url}" class="read-more" itemprop="url">Read more</a>
            </article>
        `).join('');
    }

    /**
     * Render places items
     * @param {Array} placesData - Array of places
     * @returns {string} HTML string
     */
    renderPlacesItems(placesData) {
        return placesData.map(item => `
            <article class="place-item" itemscope itemtype="https://schema.org/Place">
                <header class="place-header">
                    <h3 itemprop="name">${item.name}</h3>
                    <address itemprop="address">${item.location}</address>
                </header>
                <p itemprop="description">${item.description}</p>
                ${item.image ? `<img src="${item.image}" alt="${item.name}" itemprop="image">` : ''}
            </article>
        `).join('');
    }

    /**
     * Render shop items
     * @param {Array} shopData - Array of shops
     * @returns {string} HTML string
     */
    renderShopItems(shopData) {
        return shopData.map(item => `
            <article class="shop-item" itemscope itemtype="https://schema.org/LocalBusiness">
                <header class="shop-header">
                    <h3 itemprop="name">${item.name}</h3>
                    <address itemprop="address">${item.location}</address>
                </header>
                <p itemprop="description">${item.description}</p>
                <div class="shop-contact">
                    ${item.phone ? `<a href="tel:${item.phone}" itemprop="telephone">${item.phone}</a>` : ''}
                    ${item.website ? `<a href="${item.website}" itemprop="url">Visit Website</a>` : ''}
                </div>
            </article>
        `).join('');
    }

    /**
     * Load initial data
     */
    loadInitialData() {
        // Check for initial hash
        const hash = window.location.hash.slice(1);
        if (hash) {
            this.navigateToSection(hash, false);
        }
    }

    /**
     * Handle user sign out
     */
    async handleSignOut() {
        try {
            this.showLoading();
            await window.firebaseAuth.signOut(this.auth);
            this.redirectToAuth();
        } catch (error) {
            console.error('Error signing out:', error);
            this.showError('Error signing out. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Update user profile
     */
    async updateProfile() {
        const nameInput = document.getElementById('profileName');
        const newName = nameInput?.value?.trim();
        
        if (!newName) {
            this.showError('Please enter a name');
            return;
        }

        try {
            this.showLoading();
            
            await window.firebaseAuth.updateProfile(this.currentUser, {
                displayName: newName
            });
            
            // Update UI
            const userName = document.getElementById('userName');
            if (userName) {
                userName.textContent = newName;
            }
            
            this.showSuccess('Profile updated successfully!');
        } catch (error) {
            console.error('Error updating profile:', error);
            this.showError('Error updating profile. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Setup service worker
     */
    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/app/sw.js', { scope: '/app/' })
                .then(registration => {
                    console.log('Service Worker registered successfully');
                })
                .catch(error => {
                    console.log('Service Worker registration failed:', error);
                });
        }
    }

    /**
     * Show loading overlay
     */
    showLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('show');
            overlay.setAttribute('aria-hidden', 'false');
        }
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('show');
            overlay.setAttribute('aria-hidden', 'true');
        }
    }

    /**
     * Show success message
     * @param {string} message - Success message to display
     */
    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    /**
     * Show error message
     * @param {string} message - Error message to display
     */
    showError(message) {
        this.showMessage(message, 'error');
    }

    /**
     * Show message
     * @param {string} message - Message to display
     * @param {string} type - Message type (success, error, warning)
     */
    showMessage(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'polite');
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Remove after delay
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    /**
     * Redirect to authentication page
     */
    redirectToAuth() {
        window.location.href = '/app/auth.html';
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PattiBytesDashboard();
});

// Export for potential use in other modules
window.PattiBytesDashboard = PattiBytesDashboard;
