// Native App Navigation System
class AppNavigation {
  constructor() {
    this.currentLanguage = localStorage.getItem('appLanguage') || 'pa';
    this.isDrawerOpen = false;
    this.activeRoute = window.location.pathname;
    
    this.translations = {
      pa: {
        home: '[translate:ਹੋਮ]',
        news: '[translate:ਨਿਊਜ਼]',
        places: '[translate:ਸਥਾਨ]',
        shop: '[translate:ਦੁਕਾਨ]',
        community: '[translate:ਕਮਿਊਨਿਟੀ]',
        profile: '[translate:ਪ੍ਰੋਫਾਈਲ]',
        dashboard: '[translate:ਡੈਸ਼ਬੋਰਡ]',
        settings: '[translate:ਸੈਟਿੰਗਜ਼]',
        logout: '[translate:ਲਾਗਆਉਟ]',
        languageSwitch: '[translate:ਭਾਸ਼ਾ ਬਦਲੀ]'
      },
      en: {
        home: 'Home',
        news: 'News', 
        places: 'Places',
        shop: 'Shop',
        community: 'Community',
        profile: 'Profile',
        dashboard: 'Dashboard',
        settings: 'Settings',
        logout: 'Logout',
        languageSwitch: 'Language switched'
      }
    };
    
    this.init();
  }

  init() {
    console.log('Initializing App Navigation...');
    
    // Add app-mode class to body
    document.body.classList.add('app-mode');
    
    // Create navigation elements
    this.createTopNavigation();
    this.createBottomNavigation();
    this.createSideDrawer();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Set active nav item
    this.updateActiveNavItem();
    
    // Setup swipe gestures
    this.setupSwipeGestures();
    
    console.log('App Navigation initialized');
  }

  createTopNavigation() {
    let header = document.querySelector('.app-header');
    if (!header) {
      header = document.createElement('header');
      header.className = 'app-header';
      document.body.insertBefore(header, document.body.firstChild);
    }
    
    header.innerHTML = `
      <div class="header-left">
        <button class="menu-btn" onclick="toggleSideDrawer()" aria-label="Menu">
          <span class="hamburger"></span>
        </button>
        <h1 class="app-title">${this.getPageTitle()}</h1>
      </div>
      <div class="header-right">
        <button class="header-btn search-btn" onclick="openSearch()" aria-label="Search">
          🔍
        </button>
        <button class="header-btn notification-btn" onclick="openNotifications()" aria-label="Notifications">
          🔔
          <span class="notification-badge" id="notification-count"></span>
        </button>
        <button class="header-btn lang-toggle" onclick="toggleLanguage()" aria-label="Language">
          <span class="lang-text">${this.currentLanguage === 'pa' ? 'ਪੰ' : 'EN'}</span>
        </button>
      </div>
    `;
  }

  createBottomNavigation() {
    let bottomNav = document.querySelector('.bottom-navigation');
    if (!bottomNav) {
      bottomNav = document.createElement('nav');
      bottomNav.className = 'bottom-navigation';
      document.body.appendChild(bottomNav);
    }
    
    bottomNav.innerHTML = `
      <a href="/app/" class="nav-item" data-route="/app/">
        <div class="nav-icon">🏠</div>
        <span class="nav-label">${this.t('home')}</span>
      </a>
      <a href="/app/news/" class="nav-item" data-route="/app/news/">
        <div class="nav-icon">📰</div>
        <span class="nav-label">${this.t('news')}</span>
      </a>
      <a href="/app/places/" class="nav-item" data-route="/app/places/">
        <div class="nav-icon">📍</div>
        <span class="nav-label">${this.t('places')}</span>
      </a>
      <a href="/app/community/" class="nav-item" data-route="/app/community/">
        <div class="nav-icon">👥</div>
        <span class="nav-label">${this.t('community')}</span>
      </a>
      <a href="/app/profile/" class="nav-item" data-route="/app/profile/">
        <div class="nav-icon">👤</div>
        <span class="nav-label">${this.t('profile')}</span>
      </a>
    `;
  }

  createSideDrawer() {
    let drawer = document.querySelector('.side-drawer');
    if (!drawer) {
      drawer = document.createElement('aside');
      drawer.className = 'side-drawer';
      document.body.appendChild(drawer);
    }
    
    drawer.innerHTML = `
      <div class="drawer-overlay" onclick="closeSideDrawer()"></div>
      <div class="drawer-content">
        <div class="drawer-header">
          <div class="user-info">
            <div class="user-avatar">👤</div>
            <div class="user-details">
              <div class="user-name">[translate:ਪੱਟੀ ਬਾਈਟਸ ਯੂਜ਼ਰ]</div>
              <div class="user-location">[translate:ਪੱਟੀ, ਪੰਜਾਬ]</div>
            </div>
          </div>
        </div>
        <nav class="drawer-nav">
          <a href="/app/" class="drawer-item" data-route="/app/">
            <span class="drawer-icon">🏠</span>
            <span class="drawer-label">${this.t('home')}</span>
            <span class="drawer-arrow">›</span>
          </a>
          <a href="/app/news/" class="drawer-item" data-route="/app/news/">
            <span class="drawer-icon">📰</span>
            <span class="drawer-label">${this.t('news')}</span>
            <span class="drawer-arrow">›</span>
          </a>
          <a href="/app/places/" class="drawer-item" data-route="/app/places/">
            <span class="drawer-icon">📍</span>
            <span class="drawer-label">${this.t('places')}</span>
            <span class="drawer-arrow">›</span>
          </a>
          <a href="/app/shop/" class="drawer-item" data-route="/app/shop/">
            <span class="drawer-icon">🛍️</span>
            <span class="drawer-label">${this.t('shop')}</span>
            <span class="drawer-arrow">›</span>
          </a>
          <a href="/app/community/" class="drawer-item" data-route="/app/community/">
            <span class="drawer-icon">👥</span>
            <span class="drawer-label">${this.t('community')}</span>
            <span class="drawer-arrow">›</span>
          </a>
          <div class="drawer-divider"></div>
          <a href="/app/dashboard/" class="drawer-item" data-route="/app/dashboard/">
            <span class="drawer-icon">📊</span>
            <span class="drawer-label">${this.t('dashboard')}</span>
            <span class="drawer-arrow">›</span>
          </a>
          <a href="/app/profile/" class="drawer-item" data-route="/app/profile/">
            <span class="drawer-icon">👤</span>
            <span class="drawer-label">${this.t('profile')}</span>
            <span class="drawer-arrow">›</span>
          </a>
          <a href="/app/settings/" class="drawer-item" data-route="/app/settings/">
            <span class="drawer-icon">⚙️</span>
            <span class="drawer-label">${this.t('settings')}</span>
            <span class="drawer-arrow">›</span>
          </a>
        </nav>
        <div class="drawer-footer">
          <div class="app-version">Patti Bytes v2.0</div>
          <div class="social-links">
            <a href="https://facebook.com/pattibytes" class="social-link" target="_blank">📘</a>
            <a href="https://instagram.com/pattibytes" class="social-link" target="_blank">📷</a>
            <a href="#" class="social-link">🐦</a>
            <a href="#" class="social-link">📺</a>
          </div>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    // Bottom navigation clicks
    document.querySelectorAll('.bottom-navigation .nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const route = item.getAttribute('data-route');
        this.navigateTo(route);
      });
    });

    // Drawer navigation clicks
    document.querySelectorAll('.drawer-nav .drawer-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const route = item.getAttribute('data-route');
        this.closeSideDrawer();
        setTimeout(() => this.navigateTo(route), 300);
      });
    });

    // Language change events
    window.addEventListener('languageChanged', (e) => {
      this.currentLanguage = e.detail.language;
      this.updateLanguageElements();
    });

    // Back button handling
    window.addEventListener('popstate', () => {
      this.activeRoute = window.location.pathname;
      this.updateActiveNavItem();
      this.updatePageTitle();
    });

    // Handle hardware back button on Android
    document.addEventListener('backbutton', (e) => {
      e.preventDefault();
      this.handleBackButton();
    });
  }

  setupSwipeGestures() {
    let startX, startY;
    
    document.addEventListener('touchstart', (e) => {
      startX = e.touches[0].pageX;
      startY = e.touches[0].pageY;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      if (!startX || !startY) return;
      
      const endX = e.changedTouches[0].pageX;
      const endY = e.changedTouches[0].pageY;
      
      const diffX = endX - startX;
      const diffY = endY - startY;
      
      // Only process horizontal swipes
      if (Math.abs(diffY) > Math.abs(diffX)) return;
      
      // Swipe from left edge to open drawer
      if (startX < 50 && diffX > 100) {
        this.openSideDrawer();
      }
      
      // Swipe right to close drawer
      if (this.isDrawerOpen && diffX > 100) {
        this.closeSideDrawer();
      }
      
      // Reset
      startX = null;
      startY = null;
    }, { passive: true });
  }

  navigateTo(route) {
    // Add page transition effect
    document.body.classList.add('page-transitioning');
    
    // Update active route
    this.activeRoute = route;
    
    // Navigate after animation
    setTimeout(() => {
      window.location.href = route;
    }, 150);
  }

  updateActiveNavItem() {
    // Update bottom navigation
    document.querySelectorAll('.bottom-navigation .nav-item').forEach(item => {
      const route = item.getAttribute('data-route');
      if (this.isRouteActive(route)) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Update drawer navigation
    document.querySelectorAll('.drawer-nav .drawer-item').forEach(item => {
      const route = item.getAttribute('data-route');
      if (this.isRouteActive(route)) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  isRouteActive(route) {
    const currentPath = this.activeRoute;
    if (route === '/app/' && currentPath === '/app/') return true;
    if (route !== '/app/' && currentPath.startsWith(route)) return true;
    return false;
  }

  getPageTitle() {
    const path = this.activeRoute;
    if (path.includes('/news/')) return this.t('news');
    if (path.includes('/places/')) return this.t('places');
    if (path.includes('/shop/')) return this.t('shop');
    if (path.includes('/community/')) return this.t('community');
    if (path.includes('/dashboard/')) return this.t('dashboard');
    if (path.includes('/profile/')) return this.t('profile');
    if (path.includes('/settings/')) return this.t('settings');
    return '[translate:ਪੱਟੀ ਬਾਈਟਸ]';
  }

  updatePageTitle() {
    const titleElement = document.querySelector('.app-title');
    if (titleElement) {
      titleElement.textContent = this.getPageTitle();
    }
  }

  updateLanguageElements() {
    // Update navigation labels
    document.querySelectorAll('.nav-label').forEach((element, index) => {
      const labels = ['home', 'news', 'places', 'community', 'profile'];
      if (labels[index]) {
        element.textContent = this.t(labels[index]);
      }
    });

    // Update drawer labels
    document.querySelectorAll('.drawer-label').forEach((element, index) => {
      const labels = ['home', 'news', 'places', 'shop', 'community', 'dashboard', 'profile', 'settings'];
      if (labels[index]) {
        element.textContent = this.t(labels[index]);
      }
    });

    // Update page title
    this.updatePageTitle();

    // Update language toggle
    const langToggle = document.querySelector('.lang-text');
    if (langToggle) {
      langToggle.textContent = this.currentLanguage === 'pa' ? 'ਪੰ' : 'EN';
    }
  }

  openSideDrawer() {
    const drawer = document.querySelector('.side-drawer');
    const menuBtn = document.querySelector('.menu-btn');
    
    if (drawer && !this.isDrawerOpen) {
      drawer.classList.add('open');
      menuBtn.classList.add('active');
      this.isDrawerOpen = true;
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }
  }

  closeSideDrawer() {
    const drawer = document.querySelector('.side-drawer');
    const menuBtn = document.querySelector('.menu-btn');
    
    if (drawer && this.isDrawerOpen) {
      drawer.classList.remove('open');
      menuBtn.classList.remove('active');
      this.isDrawerOpen = false;
      
      // Restore body scroll
      document.body.style.overflow = '';
    }
  }

  toggleLanguage() {
    this.currentLanguage = this.currentLanguage === 'pa' ? 'en' : 'pa';
    localStorage.setItem('appLanguage', this.currentLanguage);
    
    // Dispatch language change event
    window.dispatchEvent(new CustomEvent('languageChanged', {
      detail: { language: this.currentLanguage }
    }));
    
    // Show feedback
    this.showLanguageFeedback();
  }

  showLanguageFeedback() {
    const feedback = document.createElement('div');
    feedback.className = 'app-notification success show';
    feedback.textContent = this.t('languageSwitch');
    
    document.body.appendChild(feedback);
    
    setTimeout(() => {
      feedback.classList.remove('show');
      setTimeout(() => feedback.remove(), 300);
    }, 2000);
  }

  handleBackButton() {
    if (this.isDrawerOpen) {
      this.closeSideDrawer();
      return;
    }
    
    // Navigate back or to home
    if (this.activeRoute === '/app/') {
      // Exit app or minimize (if supported)
      if ('exitApp' in navigator) {
        navigator.exitApp();
      }
    } else {
      this.navigateTo('/app/');
    }
  }

  t(key) {
    return this.translations[this.currentLanguage][key] || key;
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `app-notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 100);
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  updateNotificationCount(count) {
    const badge = document.getElementById('notification-count');
    if (badge) {
      if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }
  }
}

// Initialize navigation when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.appNavigation = new AppNavigation();
});

// Global navigation functions
function toggleSideDrawer() {
  if (window.appNavigation.isDrawerOpen) {
    window.appNavigation.closeSideDrawer();
  } else {
    window.appNavigation.openSideDrawer();
  }
}

function closeSideDrawer() {
  window.appNavigation.closeSideDrawer();
}

function toggleLanguage() {
  window.appNavigation.toggleLanguage();
}

function openSearch() {
  // Implement search functionality
  console.log('Opening search...');
  window.appNavigation.showNotification('[translate:ਖੋਜ ਫੀਚਰ ਜਲਦੀ ਆਵੇਗਾ]');
}

function openNotifications() {
  // Implement notifications
  console.log('Opening notifications...');
  window.appNavigation.showNotification('[translate:ਸੂਚਨਾਵਾਂ ਫੀਚਰ ਜਲਦੀ ਆਵੇਗਾ]');
}
