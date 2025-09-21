/**
 * Component Loader - Fixed Implementation
 * Properly loads header and bottom navigation
 */

class ComponentLoader {
    constructor() {
        this.components = {
            header: '/app/components/header.html',
            bottomNav: '/app/components/bottom-nav.html'
        };
        this.loadedComponents = new Set();
    }

    async loadComponent(name, containerId) {
        if (this.loadedComponents.has(name)) return;

        try {
            const container = document.getElementById(containerId);
            if (!container) {
                console.warn(`Container ${containerId} not found`);
                return;
            }

            const response = await fetch(this.components[name]);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const html = await response.text();
            container.innerHTML = html;
            
            this.loadedComponents.add(name);
            
            // Initialize component-specific functionality
            this.initializeComponent(name);
            
            console.log(`✅ Loaded ${name} component`);
            
        } catch (error) {
            console.error(`❌ Failed to load ${name} component:`, error);
            this.renderFallback(name, containerId);
        }
    }

    initializeComponent(name) {
        switch (name) {
            case 'header':
                this.initializeHeader();
                break;
            case 'bottomNav':
                this.initializeBottomNav();
                break;
        }
    }

    initializeHeader() {
        // Update user info
        this.updateUserInfo();
        
        // Setup dropdowns
        this.setupUserDropdown();
        
        // Setup language toggle
        this.setupLanguageToggle();
        
        // Setup notifications
        this.setupNotifications();
        
        // Setup back button
        this.setupBackButton();
    }

    initializeBottomNav() {
        // Update active states
        this.updateActiveNavItem();
        
        // Setup navigation
        this.setupBottomNavigation();
        
        // Update badges
        this.updateNavigationBadges();
    }

    updateUserInfo() {
        const user = window.PattiApp?.currentUser;
        if (!user) return;

        const userAvatar = document.getElementById('userAvatar');
        const userInitials = document.getElementById('userInitials');
        const userName = document.getElementById('userName');

        if (user.photoURL && userAvatar) {
            userAvatar.src = user.photoURL;
            userAvatar.style.display = 'block';
            if (userInitials) userInitials.style.display = 'none';
        } else if (userInitials) {
            const initials = (user.displayName || user.email || 'User')
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .substr(0, 2);
            userInitials.textContent = initials;
            userInitials.style.display = 'flex';
            if (userAvatar) userAvatar.style.display = 'none';
        }

        if (userName) {
            userName.textContent = user.displayName || 'User';
        }
    }

    setupUserDropdown() {
        const userMenuBtn = document.getElementById('userMenuBtn');
        const userDropdown = document.getElementById('userDropdown');
        const signOutBtn = document.getElementById('signOutBtn');

        if (userMenuBtn && userDropdown) {
            userMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                userDropdown.classList.toggle('show');
            });

            document.addEventListener('click', (e) => {
                if (!userDropdown.contains(e.target) && !userMenuBtn.contains(e.target)) {
                    userDropdown.classList.remove('show');
                }
            });
        }

        if (signOutBtn) {
            signOutBtn.addEventListener('click', async () => {
                try {
                    if (window.firebaseAuth?.signOut) {
                        await window.firebaseAuth.signOut(window.firebaseAuth.auth);
                    }
                    window.location.href = '/app/auth.html';
                } catch (error) {
                    console.error('Sign out error:', error);
                    Toast?.show('Failed to sign out', 'error');
                }
            });
        }
    }

    setupLanguageToggle() {
        const langToggle = document.getElementById('langToggle');
        const langText = document.getElementById('langText');

        if (langToggle && langText) {
            const currentLang = localStorage.getItem('pattibytes-lang') || 'pa';
            langText.textContent = currentLang.toUpperCase();

            langToggle.addEventListener('click', () => {
                const newLang = currentLang === 'pa' ? 'en' : 'pa';
                localStorage.setItem('pattibytes-lang', newLang);
                langText.textContent = newLang.toUpperCase();
                
                if (window.PattiApp) {
                    window.PattiApp.language = newLang;
                }

                // Dispatch language change event
                window.dispatchEvent(new CustomEvent('languageChange', {
                    detail: { language: newLang }
                }));

                Toast?.show(`Language changed to ${newLang.toUpperCase()}`, 'success', 2000);
            });
        }
    }

    setupNotifications() {
        const notificationBtn = document.getElementById('notificationBtn');
        const notificationBadge = document.getElementById('notificationBadge');

        if (notificationBtn) {
            notificationBtn.addEventListener('click', () => {
                Toast?.show('Notifications feature coming soon!', 'info');
            });
        }

        // Update badge
        const count = window.PattiApp?.notifications?.length || 0;
        if (notificationBadge) {
            notificationBadge.textContent = count;
            notificationBadge.style.display = count > 0 ? 'block' : 'none';
        }
    }

    setupBackButton() {
        const backBtn = document.getElementById('backBtn');
        if (backBtn) {
            // Show back button on non-dashboard pages
            const isDashboard = window.location.pathname === '/app/' || 
                              window.location.pathname === '/app/index.html';
            backBtn.style.display = isDashboard ? 'none' : 'block';

            backBtn.addEventListener('click', () => {
                if (window.history.length > 1) {
                    window.history.back();
                } else {
                    window.location.href = '/app/';
                }
            });
        }
    }

    updateActiveNavItem() {
        const navItems = document.querySelectorAll('.nav-item[data-page]');
        const currentPath = window.location.pathname;

        navItems.forEach(item => {
            const page = item.getAttribute('data-page');
            let isActive = false;

            switch (page) {
                case 'dashboard':
                    isActive = currentPath === '/app/' || currentPath === '/app/index.html';
                    break;
                case 'news':
                    isActive = currentPath.includes('/app/news');
                    break;
                case 'places':
                    isActive = currentPath.includes('/app/places');
                    break;
                case 'community':
                    isActive = currentPath.includes('/app/community');
                    break;
                case 'profile':
                    isActive = currentPath.includes('/app/profile');
                    break;
            }

            item.classList.toggle('active', isActive);
        });
    }

    setupBottomNavigation() {
        const navItems = document.querySelectorAll('.nav-item[data-page]');
        
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                
                const page = item.getAttribute('data-page');
                let url = '/app/';

                switch (page) {
                    case 'dashboard':
                        url = '/app/';
                        break;
                    case 'news':
                        url = '/app/news.html';
                        break;
                    case 'places':
                        url = '/app/places.html';
                        break;
                    case 'community':
                        url = '/app/community.html';
                        break;
                    case 'profile':
                        url = '/app/profile.html';
                        break;
                }

                if (url !== window.location.pathname) {
                    window.location.href = url;
                }
            });
        });
    }

    updateNavigationBadges() {
        // Update news badge
        const newsBadge = document.getElementById('newsBadge');
        if (newsBadge && window.PattiApp?.newsCount) {
            newsBadge.textContent = window.PattiApp.newsCount;
            newsBadge.style.display = window.PattiApp.newsCount > 0 ? 'flex' : 'none';
        }

        // Update community badge
        const communityBadge = document.getElementById('communityBadge');
        if (communityBadge && window.PattiApp?.communityNotifications) {
            communityBadge.textContent = window.PattiApp.communityNotifications;
            communityBadge.style.display = window.PattiApp.communityNotifications > 0 ? 'flex' : 'none';
        }
    }

    renderFallback(name, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (name === 'header') {
            container.innerHTML = `
                <header class="app-header">
                    <div class="header-container">
                        <div class="header-brand">
                            <img src="https://i.ibb.co/q3pGgxrZ/Whats-App-Image-2025-05-20-at-18-42-18-c8959cfa.jpg" 
                                 alt="PattiBytes" class="logo-img">
                            <div class="brand-text">
                                <h1 class="brand-title">PattiBytes</h1>
                            </div>
                        </div>
                    </div>
                </header>
            `;
        } else if (name === 'bottomNav') {
            container.innerHTML = `
                <nav class="bottom-nav">
                    <a href="/app/" class="nav-item active">
                        <span class="nav-label">Home</span>
                    </a>
                    <a href="/app/news.html" class="nav-item">
                        <span class="nav-label">News</span>
                    </a>
                    <a href="/app/places.html" class="nav-item">
                        <span class="nav-label">Places</span>
                    </a>
                    <a href="/app/community.html" class="nav-item">
                        <span class="nav-label">Community</span>
                    </a>
                    <a href="/app/profile.html" class="nav-item">
                        <span class="nav-label">Profile</span>
                    </a>
                </nav>
            `;
        }

        this.initializeComponent(name);
    }

    async loadAllComponents() {
        const promises = [];
        
        // Load header if container exists
        if (document.getElementById('headerContainer')) {
            promises.push(this.loadComponent('header', 'headerContainer'));
        }
        
        // Load bottom nav if container exists
        if (document.getElementById('bottomNavContainer')) {
            promises.push(this.loadComponent('bottomNav', 'bottomNavContainer'));
        }

        await Promise.all(promises);
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const componentLoader = new ComponentLoader();
    await componentLoader.loadAllComponents();
    
    // Make available globally
    window.componentLoader = componentLoader;
});

// Export
window.ComponentLoader = ComponentLoader;
