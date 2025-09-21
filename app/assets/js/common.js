/**
 * Common JavaScript Functionality for PattiBytes App
 * Handles shared features across all pages
 */

// Global App State
window.PattiApp = {
    currentUser: null,
    language: 'pa',
    theme: 'light',
    isOnline: navigator.onLine,
    notifications: [],
    settings: {}
};

// Utility Functions
const PattiUtils = {
    // DOM Helpers
    $(selector, context = document) {
        return context.querySelector(selector);
    },
    
    $$(selector, context = document) {
        return Array.from(context.querySelectorAll(selector));
    },
    
    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Throttle function
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    },
    
    // Format date for display
    formatDate(date, locale = 'en-IN') {
        return new Intl.DateTimeFormat(locale, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(date));
    },
    
    // Format time ago
    timeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - new Date(date)) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        
        return this.formatDate(date);
    },
    
    // Generate unique ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },
    
    // Sanitize HTML
    sanitizeHTML(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    },
    
    // Copy to clipboard
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.select();
            textArea.setSelectionRange(0, 99999);
            const success = document.execCommand('copy');
            document.body.removeChild(textArea);
            return success;
        }
    }
};

// Toast Notification System
const Toast = {
    container: null,
    
    init() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            this.container.setAttribute('aria-live', 'polite');
            this.container.setAttribute('aria-atomic', 'true');
            document.body.appendChild(this.container);
        }
    },
    
    show(message, type = 'info', duration = 4000) {
        this.init();
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.setAttribute('role', 'alert');
        
        const icon = this.getIcon(type);
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">${icon}</span>
                <span class="toast-message">${PattiUtils.sanitizeHTML(message)}</span>
                <button class="toast-close" aria-label="Close notification">&times;</button>
            </div>
        `;
        
        // Add to container
        this.container.appendChild(toast);
        
        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('toast-show');
        });
        
        // Auto remove
        const autoRemove = setTimeout(() => {
            this.remove(toast);
        }, duration);
        
        // Manual close
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            clearTimeout(autoRemove);
            this.remove(toast);
        });
        
        return toast;
    },
    
    remove(toast) {
        toast.classList.remove('toast-show');
        toast.classList.add('toast-hide');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    },
    
    getIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || icons.info;
    }
};

// Loading Manager
const LoadingManager = {
    overlays: new Map(),
    
    show(key, container = document.body, message = 'Loading...') {
        this.hide(key); // Remove existing
        
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-message">${PattiUtils.sanitizeHTML(message)}</div>
            </div>
        `;
        
        container.appendChild(overlay);
        this.overlays.set(key, overlay);
        
        return overlay;
    },
    
    hide(key) {
        const overlay = this.overlays.get(key);
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
            this.overlays.delete(key);
        }
    },
    
    hideAll() {
        this.overlays.forEach((overlay, key) => {
            this.hide(key);
        });
    }
};

// Header Component Manager
const HeaderManager = {
    init() {
        this.loadHeader();
        this.setupEventListeners();
    },
    
    async loadHeader() {
        const container = PattiUtils.$('#headerContainer');
        if (!container) return;
        
        try {
            const response = await fetch('/app/components/header.html');
            const html = await response.text();
            container.innerHTML = html;
            
            this.updateUserInfo();
            this.setupDropdowns();
            this.setupLanguageToggle();
            this.setupNotifications();
        } catch (error) {
            console.error('Failed to load header:', error);
        }
    },
    
    updateUserInfo() {
        const user = window.PattiApp.currentUser;
        if (!user) return;
        
        const userAvatar = PattiUtils.$('#userAvatar');
        const userInitials = PattiUtils.$('#userInitials');
        
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
        }
    },
    
    setupDropdowns() {
        const userMenuBtn = PattiUtils.$('#userMenuBtn');
        const userDropdown = PattiUtils.$('#userDropdown');
        const signOutBtn = PattiUtils.$('#signOutBtn');
        
        if (userMenuBtn && userDropdown) {
            userMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                userDropdown.classList.toggle('show');
            });
            
            document.addEventListener('click', () => {
                userDropdown.classList.remove('show');
            });
        }
        
        if (signOutBtn) {
            signOutBtn.addEventListener('click', this.handleSignOut);
        }
    },
    
    setupLanguageToggle() {
        const langToggle = PattiUtils.$('#langToggle');
        const langText = PattiUtils.$('#langText');
        
        if (langToggle && langText) {
            const currentLang = localStorage.getItem('pattibytes-lang') || 'pa';
            langText.textContent = currentLang.toUpperCase();
            
            langToggle.addEventListener('click', () => {
                const newLang = currentLang === 'pa' ? 'en' : 'pa';
                localStorage.setItem('pattibytes-lang', newLang);
                langText.textContent = newLang.toUpperCase();
                window.PattiApp.language = newLang;
                
                // Trigger language change event
                window.dispatchEvent(new CustomEvent('languageChange', {
                    detail: { language: newLang }
                }));
            });
        }
    },
    
    setupNotifications() {
        const notificationBtn = PattiUtils.$('#notificationBtn');
        const notificationBadge = PattiUtils.$('#notificationBadge');
        
        if (notificationBtn) {
            notificationBtn.addEventListener('click', () => {
                // TODO: Show notifications panel
                Toast.show('Notifications feature coming soon!', 'info');
            });
        }
        
        // Update badge count
        this.updateNotificationBadge();
    },
    
    updateNotificationBadge() {
        const badge = PattiUtils.$('#notificationBadge');
        const count = window.PattiApp.notifications.length;
        
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'block' : 'none';
        }
    },
    
    async handleSignOut() {
        try {
            LoadingManager.show('signout', document.body, 'Signing out...');
            
            if (window.firebaseAuth && window.firebaseAuth.signOut) {
                await window.firebaseAuth.signOut(window.firebaseAuth.auth);
            }
            
            // Clear local data
            localStorage.removeItem('pattibytes-user');
            window.PattiApp.currentUser = null;
            
            // Redirect to auth page
            window.location.href = '/app/auth.html';
            
        } catch (error) {
            console.error('Sign out error:', error);
            Toast.show('Failed to sign out. Please try again.', 'error');
        } finally {
            LoadingManager.hide('signout');
        }
    },
    
    setupEventListeners() {
        // Back button
        const backBtn = PattiUtils.$('#backBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                if (window.history.length > 1) {
                    window.history.back();
                } else {
                    window.location.href = '/app/';
                }
            });
        }
    },
    
    showBackButton(show = true) {
        const backBtn = PattiUtils.$('#backBtn');
        if (backBtn) {
            backBtn.style.display = show ? 'block' : 'none';
        }
    }
};

// Bottom Navigation Manager
const BottomNavManager = {
    init() {
        this.loadBottomNav();
        this.updateActiveItem();
    },
    
    async loadBottomNav() {
        const container = PattiUtils.$('#bottomNavContainer');
        if (!container) return;
        
        try {
            const response = await fetch('/app/components/bottom-nav.html');
            const html = await response.text();
            container.innerHTML = html;
            
            this.setupNavigation();
            this.updateBadges();
        } catch (error) {
            console.error('Failed to load bottom navigation:', error);
        }
    },
    
    setupNavigation() {
        const navItems = PattiUtils.$$('.nav-item');
        
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const href = item.getAttribute('href');
                
                if (href && href !== window.location.pathname) {
                    window.location.href = href;
                }
            });
        });
    },
    
    updateActiveItem() {
        const navItems = PattiUtils.$$('.nav-item');
        const currentPath = window.location.pathname;
        
        navItems.forEach(item => {
            const href = item.getAttribute('href');
            const isActive = href === currentPath || 
                           (href === '/app/' && currentPath === '/app/index.html');
            
            item.classList.toggle('active', isActive);
        });
    },
    
    updateBadges() {
        // Update news badge
        const newsBadge = PattiUtils.$('#newsBadge');
        if (newsBadge && window.PattiApp.newsCount) {
            newsBadge.textContent = window.PattiApp.newsCount;
            newsBadge.style.display = window.PattiApp.newsCount > 0 ? 'block' : 'none';
        }
        
        // Update community badge
        const communityBadge = PattiUtils.$('#communityBadge');
        if (communityBadge && window.PattiApp.communityNotifications) {
            communityBadge.textContent = window.PattiApp.communityNotifications;
            communityBadge.style.display = window.PattiApp.communityNotifications > 0 ? 'block' : 'none';
        }
    }
};

// Service Worker Registration
const ServiceWorkerManager = {
    async register() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/app/sw.js');
                console.log('ServiceWorker registered successfully:', registration.scope);
                return registration;
            } catch (error) {
                console.error('ServiceWorker registration failed:', error);
            }
        }
    },
    
    async checkForUpdates() {
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration) {
                registration.update();
            }
        }
    }
};

// Network Status Manager
const NetworkManager = {
    init() {
        this.updateStatus();
        this.setupEventListeners();
    },
    
    setupEventListeners() {
        window.addEventListener('online', () => {
            window.PattiApp.isOnline = true;
            this.updateStatus();
            Toast.show('You are back online!', 'success', 3000);
        });
        
        window.addEventListener('offline', () => {
            window.PattiApp.isOnline = false;
            this.updateStatus();
            Toast.show('You are offline. Some features may not work.', 'warning', 5000);
        });
    },
    
    updateStatus() {
        document.body.classList.toggle('offline', !window.PattiApp.isOnline);
        
        // Update UI elements based on network status
        const offlineElements = PattiUtils.$$('[data-requires-network]');
        offlineElements.forEach(element => {
            element.disabled = !window.PattiApp.isOnline;
            element.title = window.PattiApp.isOnline ? '' : 'This feature requires internet connection';
        });
    },
    
    isOnline() {
        return window.PattiApp.isOnline;
    }
};

// App Initialization
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize core components
        HeaderManager.init();
        BottomNavManager.init();
        NetworkManager.init();
        
        // Register service worker
        await ServiceWorkerManager.register();
        
        // Check authentication status
        await AuthManager.checkAuth();
        
        console.log('PattiBytes App initialized successfully');
        
    } catch (error) {
        console.error('App initialization failed:', error);
        Toast.show('Failed to initialize app. Please refresh the page.', 'error');
    }
});

// Authentication Manager
const AuthManager = {
    async checkAuth() {
        // Check if user is authenticated
        const savedUser = localStorage.getItem('pattibytes-user');
        
        if (savedUser) {
            try {
                window.PattiApp.currentUser = JSON.parse(savedUser);
                HeaderManager.updateUserInfo();
            } catch (error) {
                console.error('Failed to parse saved user data:', error);
                localStorage.removeItem('pattibytes-user');
            }
        }
        
        // If on auth page and user is logged in, redirect
        if (window.location.pathname.includes('auth.html') && window.PattiApp.currentUser) {
            window.location.href = '/app/';
            return;
        }
        
        // If not on auth page and no user, redirect to auth
        if (!window.location.pathname.includes('auth.html') && !window.PattiApp.currentUser) {
            window.location.href = '/app/auth.html';
            return;
        }
    },
    
    async handleAuthStateChange(user) {
        if (user) {
            // User signed in
            window.PattiApp.currentUser = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL
            };
            
            // Save to localStorage
            localStorage.setItem('pattibytes-user', JSON.stringify(window.PattiApp.currentUser));
            
            // Update UI
            HeaderManager.updateUserInfo();
            
            // Redirect if on auth page
            if (window.location.pathname.includes('auth.html')) {
                window.location.href = '/app/';
            }
        } else {
            // User signed out
            window.PattiApp.currentUser = null;
            localStorage.removeItem('pattibytes-user');
            
            // Redirect to auth if not already there
            if (!window.location.pathname.includes('auth.html')) {
                window.location.href = '/app/auth.html';
            }
        }
    }
};

// Firebase Auth State Listener
window.addEventListener('load', () => {
    if (window.firebaseAuth && window.firebaseAuth.onAuthStateChanged) {
        window.firebaseAuth.onAuthStateChanged(
            window.firebaseAuth.auth,
            AuthManager.handleAuthStateChange
        );
    }
});

// Expose utilities globally
window.PattiUtils = PattiUtils;
window.Toast = Toast;
window.LoadingManager = LoadingManager;
window.HeaderManager = HeaderManager;
window.BottomNavManager = BottomNavManager;
window.NetworkManager = NetworkManager;
window.AuthManager = AuthManager;
