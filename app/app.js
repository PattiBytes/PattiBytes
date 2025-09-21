// Main App JavaScript - Pattibytes Native App
class PattiBytesApp {
    constructor() {
        this.currentLanguage = localStorage.getItem('appLanguage') || 'pa';
        this.user = JSON.parse(localStorage.getItem('appUser')) || null;
        this.notifications = [];
        this.isOnline = navigator.onLine;
        
        this.translations = {
            pa: {
                loading: '[translate:ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ...]',
                error: '[translate:ਗਲਤੀ ਹੋਈ]',
                success: '[translate:ਸਫਲ]',
                noData: '[translate:ਕੋਈ ਡੇਟਾ ਨਹੀਂ ਮਿਲਿਆ]',
                tryAgain: '[translate:ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ]',
                offline: '[translate:ਤੁਸੀਂ ਔਫਲਾਈਨ ਹੋ]',
                online: '[translate:ਵਾਪਸ ਔਨਲਾਈਨ]'
            },
            en: {
                loading: 'Loading...',
                error: 'Error occurred',
                success: 'Success',
                noData: 'No data found',
                tryAgain: 'Try again',
                offline: 'You are offline',
                online: 'Back online'
            }
        };
        
        this.init();
    }

    async init() {
        console.log('Initializing Patti Bytes App...');
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initialize PWA features
        this.initializePWA();
        
        // Check authentication status
        this.checkAuthStatus();
        
        // Setup offline handling
        this.setupOfflineHandling();
        
        // Initialize notifications
        await this.initializeNotifications();
        
        // Setup analytics
        this.initializeAnalytics();
        
        // Load app data
        await this.loadInitialData();
        
        console.log('App initialized successfully');
    }

    setupEventListeners() {
        // Page navigation
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-navigate]')) {
                e.preventDefault();
                const route = e.target.getAttribute('data-navigate');
                this.navigateTo(route);
            }
        });

        // Form submissions
        document.addEventListener('submit', (e) => {
            if (e.target.matches('.app-form')) {
                e.preventDefault();
                this.handleFormSubmission(e.target);
            }
        });

        // Language change
        window.addEventListener('languageChanged', (e) => {
            this.currentLanguage = e.detail.language;
            this.updatePageLanguage();
        });

        // Online/offline status
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.showNotification(this.t('online'), 'success');
            this.syncOfflineData();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showNotification(this.t('offline'), 'warning');
        });

        // Back button handling
        window.addEventListener('popstate', (e) => {
            this.handleBackNavigation(e);
        });
    }

    initializePWA() {
        // Register service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('SW registered:', registration);
                })
                .catch(error => {
                    console.log('SW registration failed:', error);
                });
        }

        // Handle install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.installPrompt = e;
            this.showInstallBanner();
        });
    }

    checkAuthStatus() {
        const authData = localStorage.getItem('pattibytes_auth');
        if (authData) {
            this.user = JSON.parse(authData);
            document.body.classList.add('user-authenticated');
        } else {
            document.body.classList.add('user-guest');
        }
    }

    setupOfflineHandling() {
        // Setup cache management
        this.cache = {
            news: JSON.parse(localStorage.getItem('cache_news')) || [],
            places: JSON.parse(localStorage.getItem('cache_places')) || [],
            shop: JSON.parse(localStorage.getItem('cache_shop')) || []
        };

        // Sync data when online
        if (this.isOnline) {
            this.syncOfflineData();
        }
    }

    async initializeNotifications() {
        if ('Notification' in window && 'serviceWorker' in navigator) {
            if (Notification.permission === 'default') {
                const permission = await Notification.requestPermission();
                console.log('Notification permission:', permission);
            }
        }
    }

    initializeAnalytics() {
        // Track page views and user interactions
        this.analytics = {
            pageViews: JSON.parse(localStorage.getItem('analytics_pageViews')) || {},
            userInteractions: JSON.parse(localStorage.getItem('analytics_interactions')) || []
        };
        
        this.trackPageView(window.location.pathname);
    }

    async loadInitialData() {
        // Load cached data first for faster rendering
        this.loadCachedData();
        
        // Then fetch fresh data if online
        if (this.isOnline) {
            await this.fetchFreshData();
        }
    }

    loadCachedData() {
        // Load from localStorage/IndexedDB
        const cachedData = {
            news: this.cache.news,
            places: this.cache.places,
            shop: this.cache.shop
        };
        
        // Dispatch events for components to update
        window.dispatchEvent(new CustomEvent('dataLoaded', { 
            detail: cachedData 
        }));
    }

    async fetchFreshData() {
        try {
            const promises = [
                this.fetchNews(),
                this.fetchPlaces(),
                this.fetchShopItems()
            ];
            
            const [news, places, shop] = await Promise.all(promises);
            
            // Update cache
            this.updateCache('news', news);
            this.updateCache('places', places);
            this.updateCache('shop', shop);
            
            // Dispatch fresh data event
            window.dispatchEvent(new CustomEvent('freshDataLoaded', { 
                detail: { news, places, shop } 
            }));
            
        } catch (error) {
            console.error('Error fetching fresh data:', error);
        }
    }

    async fetchNews(limit = 10) {
        try {
            // Fetch from your CMS or API
            const response = await fetch('/api/news');
            if (!response.ok) throw new Error('Failed to fetch news');
            return await response.json();
        } catch (error) {
            console.error('Error fetching news:', error);
            return this.cache.news;
        }
    }

    async fetchPlaces(limit = 10) {
        try {
            const response = await fetch('/api/places');
            if (!response.ok) throw new Error('Failed to fetch places');
            return await response.json();
        } catch (error) {
            console.error('Error fetching places:', error);
            return this.cache.places;
        }
    }

    async fetchShopItems(limit = 20) {
        try {
            const response = await fetch('/api/shop');
            if (!response.ok) throw new Error('Failed to fetch shop items');
            return await response.json();
        } catch (error) {
            console.error('Error fetching shop items:', error);
            return this.cache.shop;
        }
    }

    updateCache(key, data) {
        this.cache[key] = data;
        localStorage.setItem(`cache_${key}`, JSON.stringify(data));
    }

    navigateTo(route) {
        // Add page transition
        document.body.classList.add('page-transitioning');
        
        // Track navigation
        this.trackPageView(route);
        
        setTimeout(() => {
            window.location.href = route;
        }, 150);
    }

    handleFormSubmission(form) {
        const formData = new FormData(form);
        const action = form.getAttribute('data-action');
        
        switch (action) {
            case 'login':
                this.handleLogin(formData);
                break;
            case 'register':
                this.handleRegister(formData);
                break;
            case 'comment':
                this.handleComment(formData);
                break;
            default:
                console.log('Unknown form action:', action);
        }
    }

    async handleLogin(formData) {
        const email = formData.get('email');
        const password = formData.get('password');
        
        try {
            this.showLoading('Logging in...');
            
            // Demo authentication - replace with real API
            const response = await this.simulateLogin(email, password);
            
            if (response.success) {
                localStorage.setItem('pattibytes_auth', JSON.stringify(response.user));
                this.user = response.user;
                this.showNotification('Login successful!', 'success');
                this.navigateTo('/app/dashboard/');
            } else {
                this.showNotification('Login failed', 'error');
            }
        } catch (error) {
            this.showNotification('Login error', 'error');
        } finally {
            this.hideLoading();
        }
    }

    simulateLogin(email, password) {
        return new Promise((resolve) => {
            setTimeout(() => {
                if (email && password) {
                    resolve({
                        success: true,
                        user: {
                            id: Date.now(),
                            email: email,
                            name: 'User',
                            avatar: '👤',
                            loginTime: new Date().toISOString()
                        }
                    });
                } else {
                    resolve({ success: false });
                }
            }, 1000);
        });
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    showLoading(message = '') {
        let loader = document.querySelector('.app-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.className = 'app-loader';
            document.body.appendChild(loader);
        }
        
        loader.innerHTML = `
            <div class="loader-content">
                <div class="loader-spinner"></div>
                <div class="loader-message">${message || this.t('loading')}</div>
            </div>
        `;
        
        loader.classList.add('show');
    }

    hideLoading() {
        const loader = document.querySelector('.app-loader');
        if (loader) {
            loader.classList.remove('show');
        }
    }

    trackPageView(path) {
        this.analytics.pageViews[path] = (this.analytics.pageViews[path] || 0) + 1;
        localStorage.setItem('analytics_pageViews', JSON.stringify(this.analytics.pageViews));
    }

    trackInteraction(type, data) {
        this.analytics.userInteractions.push({
            type,
            data,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('analytics_interactions', JSON.stringify(this.analytics.userInteractions));
    }

    t(key) {
        return this.translations[this.currentLanguage][key] || key;
    }

    updatePageLanguage() {
        // Update all translatable elements
        document.querySelectorAll('[data-translate]').forEach(element => {
            const key = element.getAttribute('data-translate');
            element.textContent = this.t(key);
        });
    }

    syncOfflineData() {
        // Sync any offline changes when back online
        const offlineData = JSON.parse(localStorage.getItem('offlineChanges')) || [];
        
        offlineData.forEach(async (change) => {
            try {
                await this.syncChange(change);
            } catch (error) {
                console.error('Error syncing change:', error);
            }
        });
        
        // Clear offline changes after sync
        localStorage.removeItem('offlineChanges');
    }

    async syncChange(change) {
        // Implementation for syncing offline changes
        console.log('Syncing change:', change);
    }

    showInstallBanner() {
        const banner = document.createElement('div');
        banner.className = 'install-banner';
        banner.innerHTML = `
            <div class="install-content">
                <div class="install-icon">📱</div>
                <div class="install-text">
                    <div class="install-title">${this.currentLanguage === 'pa' ? '[translate:ਐਪ ਇੰਸਟਾਲ ਕਰੋ]' : 'Install App'}</div>
                    <div class="install-subtitle">${this.currentLanguage === 'pa' ? '[translate:ਬਿਹਤਰ ਤਜਰਬੇ ਲਈ]' : 'For better experience'}</div>
                </div>
                <button class="install-btn" onclick="app.installApp()">
                    ${this.currentLanguage === 'pa' ? '[translate:ਇੰਸਟਾਲ]' : 'Install'}
                </button>
                <button class="install-close" onclick="this.parentElement.parentElement.remove()">✕</button>
            </div>
        `;
        
        document.body.appendChild(banner);
    }

    async installApp() {
        if (this.installPrompt) {
            this.installPrompt.prompt();
            const result = await this.installPrompt.userChoice;
            console.log('Install result:', result);
            this.installPrompt = null;
            
            // Remove banner
            const banner = document.querySelector('.install-banner');
            if (banner) banner.remove();
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new PattiBytesApp();
});

// Global utility functions
function formatDate(date, language = 'pa') {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffHours / 24;
    
    if (language === 'pa') {
        if (diffHours < 1) return '[translate:ਹੁਣੇ ਹੁਣੇ]';
        if (diffHours < 24) return `${Math.floor(diffHours)} [translate:ਘੰਟੇ ਪਹਿਲਾਂ]`;
        if (diffDays < 7) return `${Math.floor(diffDays)} [translate:ਦਿਨ ਪਹਿਲਾਂ]`;
        return d.toLocaleDateString('pa-IN');
    } else {
        if (diffHours < 1) return 'Just now';
        if (diffHours < 24) return `${Math.floor(diffHours)} hours ago`;
        if (diffDays < 7) return `${Math.floor(diffDays)} days ago`;
        return d.toLocaleDateString('en-US');
    }
}
function truncateText(text, length = 150) {
    if (text.length <= length) return text;
    return text.slice(0, length) + '...';
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
// App-specific logic
class PattiByteApp {
  constructor() {
    this.isAppMode = true;
    this.currentPage = this.detectCurrentPage();
    
    console.log('Patti Bytes App initialized:', { currentPage: this.currentPage });
    
    this.init();
  }

  detectCurrentPage() {
    const path = window.location.pathname;
    
    if (path.includes('/news')) return 'news';
    if (path.includes('/places')) return 'places';
    if (path.includes('/shop')) return 'shop';
    if (path.includes('/community')) return 'community';
    if (path.includes('/dashboard')) return 'dashboard';
    if (path.includes('/profile')) return 'profile';
    
    return 'home';
  }

  init() {
    this.setupAppUI();
    this.setupNavigation();
    this.trackAppUsage();
  }

  setupAppUI() {
    // Add app-specific classes
    document.body.classList.add('app-mode');
    
    // Setup page-specific features
    switch(this.currentPage) {
      case 'home':
        this.setupHomePage();
        break;
      case 'news':
        this.setupNewsPage();
        break;
      case 'places':
        this.setupPlacesPage();
        break;
      case 'shop':
        this.setupShopPage();
        break;
      case 'community':
        this.setupCommunityPage();
        break;
      case 'dashboard':
        this.setupDashboardPage();
        break;
      case 'profile':
        this.setupProfilePage();
        break;
    }
  }

  setupNavigation() {
    // Add bottom navigation if not exists
    if (!document.querySelector('.app-bottom-nav')) {
      this.addBottomNavigation();
    }
    
    // Update active navigation item
    this.updateActiveNavItem();
  }

  addBottomNavigation() {
    const nav = document.createElement('nav');
    nav.className = 'app-bottom-nav';
    nav.innerHTML = `
      <div class="app-nav-container">
        <a href="/app/" class="app-nav-item ${this.currentPage === 'home' ? 'active' : ''}">
          <div class="nav-icon">🏠</div>
          <span class="nav-label">ਘਰ</span>
        </a>
        <a href="/app/news/" class="app-nav-item ${this.currentPage === 'news' ? 'active' : ''}">
          <div class="nav-icon">📰</div>
          <span class="nav-label">ਨਿਊਜ਼</span>
        </a>
        <a href="/app/places/" class="app-nav-item ${this.currentPage === 'places' ? 'active' : ''}">
          <div class="nav-icon">📍</div>
          <span class="nav-label">ਸਥਾਨ</span>
        </a>
        <a href="/app/shop/" class="app-nav-item ${this.currentPage === 'shop' ? 'active' : ''}">
          <div class="nav-icon">🛍️</div>
          <span class="nav-label">ਦੁਕਾਨ</span>
        </a>
        <a href="/app/community/" class="app-nav-item ${this.currentPage === 'community' ? 'active' : ''}">
          <div class="nav-icon">👥</div>
          <span class="nav-label">ਕਮਿਊਨਿਟੀ</span>
        </a>
      </div>
    `;
    
    document.body.appendChild(nav);
  }

  updateActiveNavItem() {
    const navItems = document.querySelectorAll('.app-nav-item');
    navItems.forEach(item => {
      const href = item.getAttribute('href');
      const isActive = (href === '/app/' && this.currentPage === 'home') ||
                      href.includes(`/${this.currentPage}/`);
      
      item.classList.toggle('active', isActive);
    });
  }

  // Page-specific setup methods
  setupHomePage() {
    console.log('Setting up app home page');
    // Add home-specific features
  }

  setupNewsPage() {
    console.log('Setting up app news page');
    // Add news-specific features like commenting, sharing
  }

  setupPlacesPage() {
    console.log('Setting up app places page');
    // Add places-specific features like maps, reviews
  }

  setupShopPage() {
    console.log('Setting up app shop page');
    // Add shop-specific features like cart, wishlist
  }

  setupCommunityPage() {
    console.log('Setting up app community page');
    // Add community features like chat, forums
  }

  setupDashboardPage() {
    console.log('Setting up app dashboard page');
    // Add dashboard features like analytics, settings
  }

  setupProfilePage() {
    console.log('Setting up app profile page');
    // Add profile features like edit, preferences
  }

  trackAppUsage() {
    // Track app page views
    if (typeof gtag !== 'undefined') {
      gtag('event', 'page_view', {
        event_category: 'App',
        page_title: this.currentPage,
        app_mode: true
      });
    }
    
    console.log('App page tracked:', this.currentPage);
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.pattiBytesApp = new PattiByteApp();
});

console.log('App script loaded - app-specific features enabled');

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

