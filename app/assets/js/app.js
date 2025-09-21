/**
 * PattiBytes Common Application Script
 * This file is included in all pages and provides common functionality
 */

class PattiBytes {
    constructor() {
        this.isAuthPage = window.location.pathname.includes('auth.html');
        this.isDashboard = !this.isAuthPage;
        this.init();
    }

    init() {
        this.setupCommonFeatures();
        this.initializeServiceWorker();
        this.handleInstallPrompt();
        this.setupGlobalErrorHandling();
    }

    /**
     * Setup common features for all pages
     */
    setupCommonFeatures() {
        // Add loading utility
        this.createLoadingOverlay();
        
        // Add toast notification system
        this.setupToastSystem();
        
        // Setup theme detection
        this.setupThemeDetection();
        
        // Add common keyboard shortcuts
        this.setupKeyboardShortcuts();
    }

    /**
     * Initialize Service Worker for PWA functionality
     */
    initializeServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', async () => {
                try {
                    const registration = await navigator.serviceWorker.register('/app/sw.js', { 
                        scope: '/app/' 
                    });
                    console.log('Service Worker registered successfully:', registration);
                    
                    // Listen for updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                this.showUpdateAvailable();
                            }
                        });
                    });
                } catch (error) {
                    console.error('Service Worker registration failed:', error);
                }
            });

            // Handle service worker messages
            navigator.serviceWorker.addEventListener('message', (event) => {
                this.handleServiceWorkerMessage(event);
            });
        }
    }

    /**
     * Handle PWA install prompt
     */
    handleInstallPrompt() {
        let deferredPrompt = null;

        // Listen for install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            this.showInstallButton();
        });

        // Global install function
        window.installPWA = async () => {
            if (!deferredPrompt) {
                this.showToast('App is already installed or install is not available', 'info');
                return;
            }

            try {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                
                if (outcome === 'accepted') {
                    this.showToast('App installed successfully!', 'success');
                } else {
                    this.showToast('App installation was cancelled', 'info');
                }
                
                deferredPrompt = null;
                this.hideInstallButton();
            } catch (error) {
                console.error('Error during installation:', error);
                this.showToast('Installation failed. Please try again.', 'error');
            }
        };

        // Listen for app installed
        window.addEventListener('appinstalled', () => {
            this.showToast('PattiBytes installed successfully!', 'success');
            this.hideInstallButton();
        });
    }

    /**
     * Show install button
     */
    showInstallButton() {
        let installBtn = document.getElementById('installBtn');
        if (!installBtn) {
            installBtn = document.createElement('button');
            installBtn.id = 'installBtn';
            installBtn.className = 'install-btn';
            installBtn.innerHTML = '📱 Install App';
            installBtn.onclick = window.installPWA;
            
            // Add to page (different locations for auth vs dashboard)
            if (this.isAuthPage) {
                const authCard = document.querySelector('.auth-card');
                if (authCard) authCard.appendChild(installBtn);
            } else {
                const header = document.querySelector('.header-content');
                if (header) header.appendChild(installBtn);
            }
        }
        installBtn.style.display = 'block';
    }

    /**
     * Hide install button
     */
    hideInstallButton() {
        const installBtn = document.getElementById('installBtn');
        if (installBtn) {
            installBtn.style.display = 'none';
        }
    }

    /**
     * Show update available notification
     */
    showUpdateAvailable() {
        const updateBanner = document.createElement('div');
        updateBanner.className = 'update-banner';
        updateBanner.innerHTML = `
            <div class="update-content">
                <span>🔄 New update available!</span>
                <button onclick="window.location.reload()" class="update-btn">Update Now</button>
                <button onclick="this.parentElement.parentElement.remove()" class="dismiss-btn">×</button>
            </div>
        `;
        document.body.insertBefore(updateBanner, document.body.firstChild);
    }

    /**
     * Create loading overlay
     */
    createLoadingOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'globalLoadingOverlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-spinner"></div>
            <p>Loading...</p>
        `;
        overlay.setAttribute('aria-hidden', 'true');
        document.body.appendChild(overlay);
    }

    /**
     * Setup toast notification system
     */
    setupToastSystem() {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    /**
     * Setup theme detection
     */
    setupThemeDetection() {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
        this.updateTheme(prefersDark.matches);
        
        prefersDark.addEventListener('change', (e) => {
            this.updateTheme(e.matches);
        });
    }

    /**
     * Update theme
     */
    updateTheme(isDark) {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K for search (future feature)
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.showSearch();
            }
            
            // Alt + I for install
            if (e.altKey && e.key === 'i') {
                e.preventDefault();
                if (typeof window.installPWA === 'function') {
                    window.installPWA();
                }
            }
        });
    }

    /**
     * Show search (placeholder for future feature)
     */
    showSearch() {
        this.showToast('Search feature coming soon!', 'info');
    }

    /**
     * Global error handling
     */
    setupGlobalErrorHandling() {
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
            this.showToast('An unexpected error occurred', 'error');
        });

        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled promise rejection:', e.reason);
            this.showToast('Network or processing error occurred', 'error');
        });
    }

    /**
     * Handle service worker messages
     */
    handleServiceWorkerMessage(event) {
        const { type, data } = event.data;
        
        switch (type) {
            case 'CACHE_UPDATED':
                this.showToast('Content updated and cached', 'success');
                break;
            case 'OFFLINE':
                this.showToast('You are now offline', 'warning');
                break;
            case 'ONLINE':
                this.showToast('Connection restored', 'success');
                break;
        }
    }

    // Utility Methods
    showLoading(message = 'Loading...') {
        const overlay = document.getElementById('globalLoadingOverlay');
        if (overlay) {
            overlay.querySelector('p').textContent = message;
            overlay.classList.add('show');
            overlay.setAttribute('aria-hidden', 'false');
        }
    }

    hideLoading() {
        const overlay = document.getElementById('globalLoadingOverlay');
        if (overlay) {
            overlay.classList.remove('show');
            overlay.setAttribute('aria-hidden', 'true');
        }
    }

    showToast(message, type = 'info', duration = 5000) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'polite');
        
        container.appendChild(toast);
        
        // Animate in
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Remove after duration
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // Network status
    isOnline() {
        return navigator.onLine;
    }

    // Storage utilities
    setStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Storage error:', error);
            return false;
        }
    }

    getStorage(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error('Storage retrieval error:', error);
            return null;
        }
    }

    // Date utilities
    formatDate(date) {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(new Date(date));
    }
}

// Initialize common app functionality
document.addEventListener('DOMContentLoaded', () => {
    window.pattiBytes = new PattiBytes();
});

// Export for use in other modules
window.PattiBytes = PattiBytes;
