/**
 * PattiBytes Core Application Script
 * Modern, performant, and accessible JavaScript patterns
 */

class PattiBytes {
    constructor() {
        // App state
        this.isAuthPage = window.location.pathname.includes('auth.html');
        this.isDashboard = !this.isAuthPage;
        this.isOnline = navigator.onLine;
        this.deferredPrompt = null;
        this.touchStartY = 0;
        
        // Performance monitoring
        this.performanceObserver = null;
        
        // Initialize app
        this.init();
    }

    /**
     * Initialize application
     */
    async init() {
        try {
            // Core setup
            await this.setupCore();
            
            // Feature initialization
            await Promise.all([
                this.initializeServiceWorker(),
                this.setupUI(),
                this.setupEventListeners(),
                this.setupAccessibility(),
                this.initializePerformanceMonitoring()
            ]);
            
            // Page-specific initialization
            if (this.isAuthPage) {
                await this.initializeAuthPage();
            } else {
                await this.initializeDashboard();
            }
            
            console.log('✅ PattiBytes initialized successfully');
        } catch (error) {
            console.error('❌ PattiBytes initialization failed:', error);
            this.handleCriticalError(error);
        }
    }

    /**
     * Setup core functionality [web:278]
     */
    async setupCore() {
        // Create essential UI elements
        this.createLoadingSystem();
        this.createToastSystem();
        this.createModalSystem();
        
        // Setup theme management
        this.setupThemeSystem();
        
        // Setup offline detection
        this.setupOfflineDetection();
        
        // Setup error handling
        this.setupErrorHandling();
    }

    /**
     * Initialize Service Worker for PWA
     */
    async initializeServiceWorker() {
        if (!('serviceWorker' in navigator)) return;
        
        try {
            const registration = await navigator.serviceWorker.register('/app/sw.js', { 
                scope: '/app/' 
            });
            
            console.log('✅ Service Worker registered');
            
            // Handle updates
            registration.addEventListener('updatefound', () => {
                this.handleServiceWorkerUpdate(registration);
            });
            
            // Handle messages from SW
            navigator.serviceWorker.addEventListener('message', (event) => {
                this.handleServiceWorkerMessage(event.data);
            });
            
            // Setup install prompt
            this.setupInstallPrompt();
            
        } catch (error) {
            console.error('❌ Service Worker registration failed:', error);
        }
    }

    /**
     * Setup install prompt handling [web:282]
     */
    setupInstallPrompt() {
        // Listen for install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            
            // Show custom install UI
            this.showInstallPromotion();
        });

        // Listen for app installed
        window.addEventListener('appinstalled', () => {
            this.hideInstallPromotion();
            this.showToast('📱 PattiBytes installed successfully!', 'success');
            
            // Analytics (if needed)
            this.trackEvent('pwa_install', 'success');
        });
    }

    /**
     * Show install promotion
     */
    showInstallPromotion() {
        if (document.querySelector('.install-banner')) return;
        
        const banner = this.createElement('div', {
            className: 'install-banner',
            innerHTML: `
                <div class="install-content">
                    <img src="https://i.ibb.co/q3pGgxrZ/Whats-App-Image-2025-05-20-at-18-42-18-c8959cfa.jpg" 
                         alt="PattiBytes" class="install-icon">
                    <div class="install-text">
                        <h3>Install PattiBytes</h3>
                        <p>Get the native app experience</p>
                    </div>
                    <button class="install-btn" id="installAppBtn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7,10 12,15 17,10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Install
                    </button>
                    <button class="dismiss-btn" id="dismissInstallBtn" aria-label="Dismiss">×</button>
                </div>
            `
        });

        document.body.appendChild(banner);
        
        // Animate in
        requestAnimationFrame(() => {
            banner.classList.add('show');
        });

        // Bind events
        const installBtn = banner.querySelector('#installAppBtn');
        const dismissBtn = banner.querySelector('#dismissInstallBtn');
        
        installBtn.addEventListener('click', () => this.handleInstallClick());
        dismissBtn.addEventListener('click', () => this.hideInstallPromotion());
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (banner.parentNode) {
                this.hideInstallPromotion();
            }
        }, 10000);
    }

    /**
     * Handle install button click
     */
    async handleInstallClick() {
        if (!this.deferredPrompt) {
            this.showToast('Installation not available', 'info');
            return;
        }

        try {
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                this.trackEvent('pwa_install_prompt', 'accepted');
            } else {
                this.trackEvent('pwa_install_prompt', 'dismissed');
            }
            
            this.deferredPrompt = null;
            this.hideInstallPromotion();
            
        } catch (error) {
            console.error('Install prompt error:', error);
            this.showToast('Installation failed', 'error');
        }
    }

    /**
     * Hide install promotion
     */
    hideInstallPromotion() {
        const banner = document.querySelector('.install-banner');
        if (!banner) return;
        
        banner.classList.remove('show');
        setTimeout(() => banner.remove(), 300);
    }

    /**
     * Setup UI components and interactions [web:284]
     */
    async setupUI() {
        // Setup smooth scrolling
        this.setupSmoothScrolling();
        
        // Setup touch gestures
        this.setupTouchGestures();
        
        // Setup keyboard navigation
        this.setupKeyboardNavigation();
        
        // Setup form enhancements
        this.setupFormEnhancements();
        
        // Setup lazy loading
        this.setupLazyLoading();
        
        // Setup animations
        this.setupAnimations();
    }

    /**
     * Setup smooth scrolling behavior
     */
    setupSmoothScrolling() {
        // Enhanced smooth scrolling for anchor links
        document.addEventListener('click', (e) => {
            const anchor = e.target.closest('a[href^="#"]');
            if (!anchor) return;
            
            const href = anchor.getAttribute('href');
            if (href === '#') return;
            
            const target = document.querySelector(href);
            if (!target) return;
            
            e.preventDefault();
            
            // Smooth scroll with reduced motion support
            const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches 
                ? 'auto' : 'smooth';
                
            target.scrollIntoView({ 
                behavior,
                block: 'start',
                inline: 'nearest'
            });
            
            // Update URL without triggering navigation
            history.pushState(null, null, href);
        });
    }

    /**
     * Setup touch gestures for mobile [web:264]
     */
    setupTouchGestures() {
        // Pull-to-refresh gesture
        document.addEventListener('touchstart', (e) => {
            this.touchStartY = e.touches[0].clientY;
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            const touchY = e.touches[0].clientY;
            const pullDistance = touchY - this.touchStartY;
            
            // Pull-to-refresh on main content
            if (pullDistance > 100 && window.scrollY === 0) {
                this.handlePullToRefresh();
            }
        }, { passive: true });

        // Swipe gestures for navigation
        let startX = 0;
        let startY = 0;
        
        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            
            const deltaX = endX - startX;
            const deltaY = endY - startY;
            
            // Horizontal swipe detection
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                if (deltaX > 0) {
                    this.handleSwipeRight();
                } else {
                    this.handleSwipeLeft();
                }
            }
        }, { passive: true });
    }

    /**
     * Setup keyboard navigation [web:264]
     */
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Global keyboard shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'k':
                        e.preventDefault();
                        this.focusSearch();
                        break;
                    case '/':
                        e.preventDefault();
                        this.focusSearch();
                        break;
                    case 'Enter':
                        if (e.target.matches('.install-btn')) {
                            this.handleInstallClick();
                        }
                        break;
                }
            }
            
            // Escape key handling
            if (e.key === 'Escape') {
                this.closeModals();
                this.closeMobileMenu();
            }
            
            // Tab navigation enhancement
            if (e.key === 'Tab') {
                document.body.classList.add('keyboard-navigation');
            }
        });

        // Remove keyboard navigation class on mouse use
        document.addEventListener('mousedown', () => {
            document.body.classList.remove('keyboard-navigation');
        });
    }

    /**
     * Setup form enhancements [web:283][web:285]
     */
    setupFormEnhancements() {
        // Auto-save form data
        this.setupAutoSave();
        
        // Real-time validation
        this.setupRealTimeValidation();
        
        // Password strength indicator
        this.setupPasswordStrength();
        
        // Input formatting
        this.setupInputFormatting();
    }

    /**
     * Setup real-time form validation [web:285][web:293]
     */
    setupRealTimeValidation() {
        document.addEventListener('blur', (e) => {
            if (e.target.matches('input, textarea, select')) {
                this.validateField(e.target);
            }
        }, true);

        document.addEventListener('input', (e) => {
            if (e.target.matches('input[type="password"]')) {
                this.updatePasswordStrength(e.target);
            }
        });
    }

    /**
     * Validate form field [web:285]
     */
    validateField(field) {
        const errorElement = field.parentNode.querySelector('.input-error');
        
        // Clear previous errors
        field.classList.remove('error');
        if (errorElement) {
            errorElement.textContent = '';
        }

        // Skip validation if field is empty and not required
        if (!field.value.trim() && !field.required) {
            return true;
        }

        let isValid = true;
        let errorMessage = '';

        // Required field validation
        if (field.required && !field.value.trim()) {
            isValid = false;
            errorMessage = `${this.getFieldLabel(field)} is required`;
        }
        
        // Email validation
        else if (field.type === 'email' && field.value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(field.value)) {
                isValid = false;
                errorMessage = 'Please enter a valid email address';
            }
        }
        
        // Password validation
        else if (field.type === 'password' && field.value) {
            if (field.value.length < 6) {
                isValid = false;
                errorMessage = 'Password must be at least 6 characters long';
            }
        }
        
        // Confirm password validation
        else if (field.name === 'confirm-password' && field.value) {
            const passwordField = field.form.querySelector('input[name="password"]');
            if (passwordField && field.value !== passwordField.value) {
                isValid = false;
                errorMessage = 'Passwords do not match';
            }
        }

        // Show validation result
        if (!isValid) {
            field.classList.add('error');
            if (errorElement) {
                errorElement.textContent = errorMessage;
                this.announceToScreenReader(errorMessage);
            }
        }

        return isValid;
    }

    /**
     * Update password strength indicator
     */
    updatePasswordStrength(passwordField) {
        const strengthIndicator = passwordField.parentNode.parentNode.querySelector('.password-strength');
        if (!strengthIndicator) return;

        const password = passwordField.value;
        const strength = this.calculatePasswordStrength(password);
        
        const strengthFill = strengthIndicator.querySelector('.strength-fill');
        const strengthText = strengthIndicator.querySelector('.strength-text');
        
        if (strengthFill && strengthText) {
            strengthFill.className = `strength-fill ${strength.level}`;
            strengthText.textContent = `Password strength: ${strength.label}`;
        }
    }

    /**
     * Calculate password strength
     */
    calculatePasswordStrength(password) {
        if (!password) return { level: '', label: 'Enter password' };
        
        let score = 0;
        
        // Length check
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        
        // Character variety
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        
        if (score < 2) return { level: 'weak', label: 'Weak' };
        if (score < 4) return { level: 'fair', label: 'Fair' };
        if (score < 5) return { level: 'good', label: 'Good' };
        return { level: 'strong', label: 'Strong' };
    }

    /**
     * Setup auto-save functionality
     */
    setupAutoSave() {
        const autoSaveFields = document.querySelectorAll('[data-autosave]');
        
        autoSaveFields.forEach(field => {
            // Load saved value
            const saved = localStorage.getItem(`autosave_${field.name}`);
            if (saved && !field.value) {
                field.value = saved;
            }
            
            // Save on input
            field.addEventListener('input', this.debounce(() => {
                localStorage.setItem(`autosave_${field.name}`, field.value);
            }, 500));
        });
    }

    /**
     * Setup animations and micro-interactions [web:284]
     */
    setupAnimations() {
        // Intersection Observer for scroll animations
        if ('IntersectionObserver' in window) {
            const observerOptions = {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            };

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('animate-in');
                        observer.unobserve(entry.target);
                    }
                });
            }, observerOptions);

            // Observe elements with animation classes
            document.querySelectorAll('.fade-in-up, .fade-in, .slide-in-right').forEach(el => {
                observer.observe(el);
            });
        }

        // Button hover effects
        this.setupButtonAnimations();
        
        // Loading animations
        this.setupLoadingAnimations();
    }

    /**
     * Setup button animations
     */
    setupButtonAnimations() {
        document.addEventListener('click', (e) => {
            const button = e.target.closest('button, .btn');
            if (!button) return;
            
            // Ripple effect
            this.createRippleEffect(button, e);
        }, { passive: true });
    }

    /**
     * Create ripple effect for buttons [web:284]
     */
    createRippleEffect(button, event) {
        if (button.querySelector('.ripple')) return;
        
        const ripple = this.createElement('span', { className: 'ripple' });
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            transform: scale(0);
            animation: ripple 0.6s ease-out;
            pointer-events: none;
        `;
        
        button.style.position = 'relative';
        button.style.overflow = 'hidden';
        button.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
    }

    /**
     * Setup accessibility features
     */
    setupAccessibility() {
        // Skip navigation
        this.createSkipNavigation();
        
        // ARIA live regions
        this.setupAriaLiveRegions();
        
        // Focus management
        this.setupFocusManagement();
        
        // Screen reader announcements
        this.setupScreenReaderSupport();
    }

    /**
     * Create skip navigation
     */
    createSkipNavigation() {
        if (document.querySelector('.skip-nav')) return;
        
        const skipNav = this.createElement('a', {
            href: '#main-content',
            className: 'skip-nav sr-only-focusable',
            textContent: 'Skip to main content',
            style: `
                position: absolute;
                top: -40px;
                left: 6px;
                background: var(--primary);
                color: white;
                padding: 8px 16px;
                text-decoration: none;
                border-radius: 4px;
                z-index: 1000;
                transition: top 0.3s;
            `
        });
        
        skipNav.addEventListener('focus', () => {
            skipNav.style.top = '6px';
        });
        
        skipNav.addEventListener('blur', () => {
            skipNav.style.top = '-40px';
        });
        
        document.body.insertBefore(skipNav, document.body.firstChild);
    }

    /**
     * Setup loading system
     */
    createLoadingSystem() {
        if (document.querySelector('.loading-overlay')) return;
        
        const overlay = this.createElement('div', {
            id: 'globalLoadingOverlay',
            className: 'loading-overlay',
            innerHTML: `
                <div class="loading-spinner"></div>
                <p class="loading-text">Loading...</p>
            `,
            'aria-hidden': 'true'
        });
        
        document.body.appendChild(overlay);
    }

    /**
     * Setup toast notification system [web:282]
     */
    createToastSystem() {
        if (document.querySelector('.toast-container')) return;
        
        const container = this.createElement('div', {
            id: 'toastContainer',
            className: 'toast-container',
            'aria-live': 'polite',
            'aria-atomic': 'false'
        });
        
        document.body.appendChild(container);
    }

    /**
     * Setup modal system
     */
    createModalSystem() {
        // Modal backdrop
        const backdrop = this.createElement('div', {
            id: 'modalBackdrop',
            className: 'modal-backdrop',
            'aria-hidden': 'true'
        });
        
        backdrop.addEventListener('click', () => this.closeModals());
        document.body.appendChild(backdrop);
    }

    /**
     * Setup theme system
     */
    setupThemeSystem() {
        // Load saved theme
        const savedTheme = localStorage.getItem('pattibytes-theme') || 'light';
        this.setTheme(savedTheme);
        
        // Listen for system theme changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', (e) => {
            if (!localStorage.getItem('pattibytes-theme')) {
                this.setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    /**
     * Set theme
     */
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('pattibytes-theme', theme);
        
        // Update theme-color meta tag
        const themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (themeColorMeta) {
            themeColorMeta.content = theme === 'dark' ? '#1e293b' : '#667eea';
        }
    }

    /**
     * Setup offline detection
     */
    setupOfflineDetection() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.showToast('🌐 Connection restored', 'success');
            this.syncOfflineData();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showToast('📡 You are now offline', 'warning');
        });
    }

    /**
     * Setup error handling
     */
    setupErrorHandling() {
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
            this.handleError(e.error);
        });

        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled promise rejection:', e.reason);
            this.handleError(e.reason);
        });
    }

    /**
     * Handle errors gracefully
     */
    handleError(error) {
        if (this.isDevelopment()) {
            console.error('Error details:', error);
        } else {
            // In production, show user-friendly message
            this.showToast('Something went wrong. Please try again.', 'error');
        }
        
        // Track error for analytics
        this.trackEvent('error', {
            message: error.message,
            stack: error.stack?.substring(0, 500)
        });
    }

    // ===================
    // PUBLIC API METHODS
    // ===================

    /**
     * Show loading overlay
     */
    showLoading(message = 'Loading...') {
        const overlay = document.getElementById('globalLoadingOverlay');
        const text = overlay?.querySelector('.loading-text');
        
        if (overlay) {
            if (text) text.textContent = message;
            overlay.classList.add('show');
            overlay.setAttribute('aria-hidden', 'false');
            
            // Prevent scrolling
            document.body.style.overflow = 'hidden';
        }
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        const overlay = document.getElementById('globalLoadingOverlay');
        if (overlay) {
            overlay.classList.remove('show');
            overlay.setAttribute('aria-hidden', 'true');
            
            // Restore scrolling
            document.body.style.overflow = '';
        }
    }

    /**
     * Show toast notification [web:282]
     */
    showToast(message, type = 'info', duration = 5000) {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        
        const toast = this.createElement('div', {
            className: `toast toast-${type}`,
            innerHTML: `
                <div class="toast-icon">${this.getToastIcon(type)}</div>
                <div class="toast-content">
                    <div class="toast-message">${message}</div>
                </div>
                <button class="toast-close" aria-label="Close notification">×</button>
            `,
            role: 'alert',
            'aria-live': 'assertive'
        });
        
        // Bind close button
        toast.querySelector('.toast-close').addEventListener('click', () => {
            this.closeToast(toast);
        });
        
        container.appendChild(toast);
        
        // Animate in
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
        
        // Auto-remove
        if (duration > 0) {
            setTimeout(() => this.closeToast(toast), duration);
        }
        
        return toast;
    }

    /**
     * Close toast
     */
    closeToast(toast) {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }

    /**
     * Get toast icon
     */
    getToastIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    // ===================
    // UTILITY METHODS
    // ===================

    /**
     * Debounce function
     */
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
    }

    /**
     * Throttle function
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Create DOM element with attributes
     */
    createElement(tag, attributes = {}) {
        const element = document.createElement(tag);
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'innerHTML') {
                element.innerHTML = value;
            } else if (key === 'textContent') {
                element.textContent = value;
            } else {
                element.setAttribute(key, value);
            }
        });
        
        return element;
    }

    /**
     * Check if in development mode
     */
    isDevelopment() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1';
    }

    /**
     * Track events (placeholder for analytics)
     */
    trackEvent(eventName, data = {}) {
        if (this.isDevelopment()) {
            console.log('📊 Event tracked:', eventName, data);
        }
        
        // Integrate with your analytics service
        // e.g., gtag('event', eventName, data);
    }

    /**
     * Announce to screen reader
     */
    announceToScreenReader(message) {
        const announcement = this.createElement('div', {
            className: 'sr-only',
            textContent: message,
            'aria-live': 'assertive'
        });
        
        document.body.appendChild(announcement);
        setTimeout(() => announcement.remove(), 1000);
    }

    // Placeholder methods for page-specific functionality
    async initializeAuthPage() { /* Implemented in auth-script.js */ }
    async initializeDashboard() { /* Implemented in dashboard-script.js */ }
    handlePullToRefresh() { /* Refresh current data */ }
    handleSwipeLeft() { /* Navigate forward */ }
    handleSwipeRight() { /* Navigate back */ }
    focusSearch() { /* Focus search input */ }
    closeModals() { /* Close any open modals */ }
    closeMobileMenu() { /* Close mobile navigation */ }
    syncOfflineData() { /* Sync cached data */ }
}

// Initialize PattiBytes when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.pattiBytes = new PattiBytes();
    });
} else {
    window.pattiBytes = new PattiBytes();
}

// Expose PattiBytes class globally
window.PattiBytes = PattiBytes;

// Add CSS for dynamic features
const dynamicStyles = `
<style>
.ripple {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    transform: scale(0);
    animation: ripple 0.6s ease-out;
}

@keyframes ripple {
    to {
        transform: scale(4);
        opacity: 0;
    }
}

.toast {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    background: var(--surface);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    padding: var(--space-4);
    margin-bottom: var(--space-2);
    min-width: 300px;
    max-width: 500px;
    transform: translateX(400px);
    opacity: 0;
    transition: all var(--transition-normal);
}

.toast.show {
    transform: translateX(0);
    opacity: 1;
}

.toast-success { border-left: 4px solid var(--success); }
.toast-error { border-left: 4px solid var(--error); }
.toast-warning { border-left: 4px solid var(--warning); }
.toast-info { border-left: 4px solid var(--info); }

.toast-icon {
    font-size: 1.25rem;
    flex-shrink: 0;
}

.toast-content {
    flex: 1;
    min-width: 0;
}

.toast-message {
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--text-primary);
}

.toast-close {
    background: none;
    border: none;
    color: var(--text-tertiary);
    cursor: pointer;
    font-size: 1.25rem;
    padding: var(--space-1);
    border-radius: var(--radius-sm);
    transition: var(--transition-fast);
    flex-shrink: 0;
}

.toast-close:hover {
    color: var(--text-primary);
    background: var(--surface-hover);
}

.animate-in {
    opacity: 1;
    transform: translateY(0);
}

.sr-only-focusable:not(:focus) {
    position: absolute !important;
    width: 1px !important;
    height: 1px !important;
    padding: 0 !important;
    margin: -1px !important;
    overflow: hidden !important;
    clip: rect(0, 0, 0, 0) !important;
    white-space: nowrap !important;
    border: 0 !important;
}

.modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    z-index: var(--z-modal-backdrop);
    opacity: 0;
    visibility: hidden;
    transition: all var(--transition-normal);
}

.modal-backdrop.show {
    opacity: 1;
    visibility: visible;
}

@media (max-width: 640px) {
    .toast-container {
        left: var(--space-4);
        right: var(--space-4);
        top: var(--space-4);
    }
    
    .toast {
        min-width: auto;
        transform: translateY(-100px);
    }
    
    .toast.show {
        transform: translateY(0);
    }
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', dynamicStyles);
