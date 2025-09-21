/**
 * PattiBytes Authentication Script
 * Modern form handling with real-time validation and smooth UX
 */

class AuthManager {
    constructor() {
        this.currentForm = 'login';
        this.isSubmitting = false;
        this.formData = new Map();
        this.validationRules = new Map();
        
        this.init();
    }

    init() {
        if (!window.firebaseAuth) {
            console.error('Firebase not initialized');
            this.showError('Authentication system not available');
            return;
        }

        this.setupEventListeners();
        this.setupValidation();
        this.setupPasswordToggles();
        this.setupFormSwitching();
        this.checkAuthState();
        
        console.log('✅ AuthManager initialized');
    }

    /**
     * Setup event listeners [web:283]
     */
    setupEventListeners() {
        // Form submissions
        document.getElementById('loginForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.getElementById('signupForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSignup();
        });

        document.getElementById('forgotForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleForgotPassword();
        });

        // Social authentication
        document.getElementById('googleSignIn')?.addEventListener('click', () => {
            this.handleGoogleAuth();
        });

        // Form switching
        document.getElementById('showSignup')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchForm('signup');
        });

        document.getElementById('showLogin')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchForm('login');
        });

        document.getElementById('forgotPassword')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchForm('forgot');
        });

        document.getElementById('backToLogin')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchForm('login');
        });

        // Real-time validation
        this.setupRealTimeValidation();
        
        // Auto-save form data
        this.setupAutoSave();
    }

    /**
     * Setup form switching with animations [web:284]
     */
    setupFormSwitching() {
        const forms = document.querySelectorAll('.auth-form');
        
        forms.forEach(form => {
            form.addEventListener('animationend', () => {
                if (!form.classList.contains('active')) {
                    form.style.display = 'none';
                }
            });
        });
    }

    /**
     * Switch between forms
     */
    switchForm(formType) {
        const forms = document.querySelectorAll('.auth-form');
        const targetForm = document.getElementById(`${formType}-form`);
        
        if (!targetForm) return;
        
        // Hide current forms
        forms.forEach(form => {
            if (form.classList.contains('active')) {
                form.classList.remove('active');
                form.style.animation = 'formSlideOut 0.3s ease-out forwards';
            }
        });
        
        // Show target form
        setTimeout(() => {
            targetForm.style.display = 'block';
            targetForm.style.animation = 'formSlideIn 0.3s ease-out forwards';
            targetForm.classList.add('active');
            
            // Focus first input
            const firstInput = targetForm.querySelector('input:not([type="hidden"])');
            if (firstInput) {
                firstInput.focus();
            }
            
            this.currentForm = formType;
            this.trackFormSwitch(formType);
        }, 150);
    }

    /**
     * Setup password toggle functionality
     */
    setupPasswordToggles() {
        document.querySelectorAll('.password-toggle').forEach(toggle => {
            toggle.addEventListener('click', () => {
                const input = toggle.parentElement.querySelector('input[type="password"], input[type="text"]');
                const icon = toggle.querySelector('svg');
                
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.innerHTML = `
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                    `;
                    toggle.setAttribute('aria-label', 'Hide password');
                } else {
                    input.type = 'password';
                    icon.innerHTML = `
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    `;
                    toggle.setAttribute('aria-label', 'Show password');
                }
                
                // Add visual feedback
                toggle.style.transform = 'scale(0.9)';
                setTimeout(() => {
                    toggle.style.transform = '';
                }, 150);
            });
        });
    }

    /**
     * Setup real-time validation [web:285][web:293]
     */
    setupRealTimeValidation() {
        const inputs = document.querySelectorAll('.form-input');
        
        inputs.forEach(input => {
            // Validation on blur
            input.addEventListener('blur', () => {
                if (input.value.trim()) {
                    this.validateField(input);
                }
            });
            
            // Clear errors on focus
            input.addEventListener('focus', () => {
                this.clearFieldError(input);
            });
            
            // Special handling for password confirmation
            if (input.name === 'confirm-password') {
                input.addEventListener('input', () => {
                    if (input.value) {
                        this.validatePasswordMatch(input);
                    }
                });
            }
            
            // Password strength for signup
            if (input.id === 'signupPassword') {
                input.addEventListener('input', () => {
                    this.updatePasswordStrength(input);
                });
            }
        });
    }

    /**
     * Validate field with smooth UX [web:285]
     */
    validateField(field) {
        const isValid = window.pattiBytes?.validateField(field);
        
        if (isValid) {
            this.showFieldSuccess(field);
        }
        
        return isValid;
    }

    /**
     * Show field success state
     */
    showFieldSuccess(field) {
        field.classList.add('success');
        
        // Create success icon
        let successIcon = field.parentElement.querySelector('.success-icon');
        if (!successIcon) {
            successIcon = document.createElement('div');
            successIcon.className = 'success-icon';
            successIcon.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20,6 9,17 4,12"></polyline>
                </svg>
            `;
            successIcon.style.cssText = `
                position: absolute;
                right: 12px;
                top: 50%;
                transform: translateY(-50%);
                color: var(--success);
                opacity: 0;
                transition: all 0.3s ease;
            `;
            field.parentElement.appendChild(successIcon);
        }
        
        requestAnimationFrame(() => {
            successIcon.style.opacity = '1';
        });
    }

    /**
     * Clear field error
     */
    clearFieldError(field) {
        field.classList.remove('error', 'success');
        
        const errorElement = field.parentElement.querySelector('.input-error');
        if (errorElement) {
            errorElement.textContent = '';
        }
        
        const successIcon = field.parentElement.querySelector('.success-icon');
        if (successIcon) {
            successIcon.style.opacity = '0';
        }
    }

    /**
     * Validate password match
     */
    validatePasswordMatch(confirmField) {
        const passwordField = document.getElementById('signupPassword');
        const isMatch = passwordField && confirmField.value === passwordField.value;
        
        if (!isMatch && confirmField.value) {
            this.showFieldError(confirmField, 'Passwords do not match');
        } else if (isMatch) {
            this.clearFieldError(confirmField);
            this.showFieldSuccess(confirmField);
        }
        
        return isMatch;
    }

    /**
     * Show field error
     */
    showFieldError(field, message) {
        field.classList.add('error');
        
        const errorElement = field.parentElement.querySelector('.input-error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.animation = 'errorSlideIn 0.3s ease-out';
        }
        
        // Announce to screen reader
        window.pattiBytes?.announceToScreenReader(message);
    }

    /**
     * Update password strength indicator
     */
    updatePasswordStrength(passwordField) {
        window.pattiBytes?.updatePasswordStrength(passwordField);
    }

    /**
     * Setup auto-save functionality
     */
    setupAutoSave() {
        const saveableFields = document.querySelectorAll('input[type="email"]');
        
        saveableFields.forEach(field => {
            const savedValue = localStorage.getItem(`auth_${field.name}`);
            if (savedValue && !field.value) {
                field.value = savedValue;
            }
            
            field.addEventListener('input', window.pattiBytes?.debounce(() => {
                localStorage.setItem(`auth_${field.name}`, field.value);
            }, 500));
        });
    }

    /**
     * Handle login form submission
     */
    async handleLogin() {
        if (this.isSubmitting) return;
        
        const email = document.getElementById('loginEmail')?.value.trim();
        const password = document.getElementById('loginPassword')?.value;
        const rememberMe = document.getElementById('rememberMe')?.checked;
        
        // Validate inputs
        if (!this.validateLoginForm(email, password)) return;
        
        try {
            this.setSubmittingState(true, 'loginBtn');
            
            const userCredential = await window.firebaseAuth.signInWithEmailAndPassword(
                window.firebaseAuth.auth, 
                email, 
                password
            );
            
            // Handle remember me
            if (rememberMe) {
                localStorage.setItem('auth_email', email);
            } else {
                localStorage.removeItem('auth_email');
            }
            
            this.trackAuthEvent('login', 'success');
            window.pattiBytes?.showToast('Welcome back! 👋', 'success');
            
            // Small delay for better UX
            setTimeout(() => {
                this.redirectToDashboard();
            }, 1000);
            
        } catch (error) {
            this.handleAuthError(error, 'login');
        } finally {
            this.setSubmittingState(false, 'loginBtn');
        }
    }

    /**
     * Handle signup form submission
     */
    async handleSignup() {
        if (this.isSubmitting) return;
        
        const name = document.getElementById('signupName')?.value.trim();
        const email = document.getElementById('signupEmail')?.value.trim();
        const password = document.getElementById('signupPassword')?.value;
        const confirmPassword = document.getElementById('confirmPassword')?.value;
        const agreeTerms = document.getElementById('agreeTerms')?.checked;
        
        // Validate inputs
        if (!this.validateSignupForm(name, email, password, confirmPassword, agreeTerms)) return;
        
        try {
            this.setSubmittingState(true, 'signupBtn');
            
            const userCredential = await window.firebaseAuth.createUserWithEmailAndPassword(
                window.firebaseAuth.auth, 
                email, 
                password
            );
            
            // Update profile
            await window.firebaseAuth.updateProfile(userCredential.user, {
                displayName: name
            });
            
            this.trackAuthEvent('signup', 'success');
            window.pattiBytes?.showToast('Account created successfully! 🎉', 'success');
            
            // Clear auto-saved data
            localStorage.removeItem('auth_email');
            
            setTimeout(() => {
                this.redirectToDashboard();
            }, 1000);
            
        } catch (error) {
            this.handleAuthError(error, 'signup');
        } finally {
            this.setSubmittingState(false, 'signupBtn');
        }
    }

    /**
     * Handle Google authentication
     */
    async handleGoogleAuth() {
        if (this.isSubmitting) return;
        
        try {
            this.setSubmittingState(true, 'googleSignIn');
            
            const result = await window.firebaseAuth.signInWithPopup(
                window.firebaseAuth.auth, 
                window.firebaseAuth.googleProvider
            );
            
            this.trackAuthEvent('google_signin', 'success');
            window.pattiBytes?.showToast('Welcome! Signed in with Google 🔍', 'success');
            
            setTimeout(() => {
                this.redirectToDashboard();
            }, 1000);
            
        } catch (error) {
            this.handleAuthError(error, 'google');
        } finally {
            this.setSubmittingState(false, 'googleSignIn');
        }
    }

    /**
     * Handle forgot password
     */
    async handleForgotPassword() {
        if (this.isSubmitting) return;
        
        const email = document.getElementById('forgotEmail')?.value.trim();
        
        if (!email) {
            this.showFieldError(document.getElementById('forgotEmail'), 'Email is required');
            return;
        }
        
        if (!this.isValidEmail(email)) {
            this.showFieldError(document.getElementById('forgotEmail'), 'Please enter a valid email address');
            return;
        }
        
        try {
            this.setSubmittingState(true, 'forgotBtn');
            
            await window.firebaseAuth.sendPasswordResetEmail(
                window.firebaseAuth.auth, 
                email
            );
            
            this.trackAuthEvent('password_reset', 'sent');
            window.pattiBytes?.showToast('Password reset email sent! 📧', 'success');
            
            // Switch back to login
            setTimeout(() => {
                this.switchForm('login');
            }, 2000);
            
        } catch (error) {
            this.handleAuthError(error, 'forgot');
        } finally {
            this.setSubmittingState(false, 'forgotBtn');
        }
    }

    /**
     * Validate login form
     */
    validateLoginForm(email, password) {
        let isValid = true;
        
        if (!email) {
            this.showFieldError(document.getElementById('loginEmail'), 'Email is required');
            isValid = false;
        } else if (!this.isValidEmail(email)) {
            this.showFieldError(document.getElementById('loginEmail'), 'Please enter a valid email address');
            isValid = false;
        }
        
        if (!password) {
            this.showFieldError(document.getElementById('loginPassword'), 'Password is required');
            isValid = false;
        }
        
        return isValid;
    }

    /**
     * Validate signup form
     */
    validateSignupForm(name, email, password, confirmPassword, agreeTerms) {
        let isValid = true;
        
        if (!name || name.length < 2) {
            this.showFieldError(document.getElementById('signupName'), 'Name must be at least 2 characters');
            isValid = false;
        }
        
        if (!email) {
            this.showFieldError(document.getElementById('signupEmail'), 'Email is required');
            isValid = false;
        } else if (!this.isValidEmail(email)) {
            this.showFieldError(document.getElementById('signupEmail'), 'Please enter a valid email address');
            isValid = false;
        }
        
        if (!password) {
            this.showFieldError(document.getElementById('signupPassword'), 'Password is required');
            isValid = false;
        } else if (password.length < 6) {
            this.showFieldError(document.getElementById('signupPassword'), 'Password must be at least 6 characters');
            isValid = false;
        }
        
        if (password !== confirmPassword) {
            this.showFieldError(document.getElementById('confirmPassword'), 'Passwords do not match');
            isValid = false;
        }
        
        if (!agreeTerms) {
            window.pattiBytes?.showToast('Please agree to the Terms of Service', 'warning');
            isValid = false;
        }
        
        return isValid;
    }

    /**
     * Set submitting state for buttons
     */
    setSubmittingState(isSubmitting, buttonId) {
        this.isSubmitting = isSubmitting;
        const button = document.getElementById(buttonId);
        
        if (!button) return;
        
        if (isSubmitting) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    /**
     * Handle authentication errors with user-friendly messages
     */
    handleAuthError(error, context) {
        console.error(`Auth error (${context}):`, error);
        
        let message = 'An error occurred. Please try again.';
        
        switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                message = 'Invalid email or password';
                break;
            case 'auth/email-already-in-use':
                message = 'An account with this email already exists';
                break;
            case 'auth/weak-password':
                message = 'Password should be at least 6 characters';
                break;
            case 'auth/invalid-email':
                message = 'Invalid email address';
                break;
            case 'auth/popup-closed-by-user':
                message = 'Sign-in popup was closed';
                break;
            case 'auth/network-request-failed':
                message = 'Network error. Please check your connection.';
                break;
            case 'auth/too-many-requests':
                message = 'Too many attempts. Please try again later.';
                break;
        }
        
        window.pattiBytes?.showToast(message, 'error');
        this.trackAuthEvent(context, 'error', error.code);
    }

    /**
     * Check authentication state
     */
    checkAuthState() {
        window.firebaseAuth.onAuthStateChanged(window.firebaseAuth.auth, (user) => {
            if (user && !this.isSubmitting) {
                // User is already signed in, redirect to dashboard
                this.redirectToDashboard();
            }
        });
    }

    /**
     * Redirect to dashboard
     */
    redirectToDashboard() {
        // Add transition effect
        document.body.style.opacity = '0';
        document.body.style.transition = 'opacity 0.3s ease-out';
        
        setTimeout(() => {
            window.location.href = '/app/';
        }, 300);
    }

    /**
     * Utility methods
     */
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    /**
     * Track authentication events
     */
    trackAuthEvent(event, status, details = null) {
        window.pattiBytes?.trackEvent(`auth_${event}`, {
            status,
            details,
            form: this.currentForm,
            timestamp: Date.now()
        });
    }

    /**
     * Track form switch events
     */
    trackFormSwitch(formType) {
        window.pattiBytes?.trackEvent('auth_form_switch', {
            from: this.currentForm,
            to: formType,
            timestamp: Date.now()
        });
    }

    /**
     * Show error message
     */
    showError(message) {
        window.pattiBytes?.showToast(message, 'error');
    }
}

// Initialize AuthManager when page is ready
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});

// Add additional CSS for auth-specific animations
const authStyles = `
<style>
@keyframes formSlideIn {
    from {
        opacity: 0;
        transform: translateX(20px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

@keyframes formSlideOut {
    from {
        opacity: 1;
        transform: translateX(0);
    }
    to {
        opacity: 0;
        transform: translateX(-20px);
    }
}

@keyframes errorSlideIn {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.form-input.success {
    border-color: var(--success);
    background: rgba(16, 185, 129, 0.05);
}

.form-input.success:focus {
    box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
}

.success-icon {
    pointer-events: none;
}

.auth-btn.loading {
    pointer-events: none;
    opacity: 0.8;
}

.loading .btn-text {
    opacity: 0;
}

.loading .btn-loader {
    display: inline-block;
    animation: spin 1s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
    @keyframes formSlideIn,
    @keyframes formSlideOut,
    @keyframes errorSlideIn {
        from, to {
            opacity: 1;
            transform: none;
        }
    }
    
    .success-icon {
        transition: none;
    }
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', authStyles);
