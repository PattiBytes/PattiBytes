/**
 * Optional Authentication System
 * Auth only required for user-specific features like commenting, posting, etc.
 */

class OptionalAuthManager {
    constructor() {
        this.isInitialized = false;
        this.currentUser = null;
        this.authStateListeners = new Set();
        this.authRequiredFeatures = [
            'comment', 'like', 'post', 'favorite', 'visit', 'profile', 
            'settings', 'upload', 'edit', 'delete', 'follow'
        ];
        
        this.init();
    }

    async init() {
        try {
            await this.waitForFirebase();
            this.setupEventListeners();
            this.setupFormValidation();
            this.setupPasswordStrength();
            this.checkExistingAuth();
            
            this.isInitialized = true;
            console.log('✅ OptionalAuthManager initialized');
        } catch (error) {
            console.error('❌ OptionalAuthManager initialization failed:', error);
            Toast?.show('Authentication system loaded with limited features', 'warning');
        }
    }

    async waitForFirebase() {
        return new Promise((resolve) => {
            const checkFirebase = () => {
                if (window.firebaseAuth && window.firebaseFirestore) {
                    resolve();
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            checkFirebase();
        });
    }

    setupEventListeners() {
        // Auth form switching
        const showSignUpBtn = document.getElementById('showSignUpBtn');
        const showSignInBtn = document.getElementById('showSignInBtn');
        const signInCard = document.getElementById('signInCard');
        const signUpCard = document.getElementById('signUpCard');

        if (showSignUpBtn && signUpCard && signInCard) {
            showSignUpBtn.addEventListener('click', () => {
                signInCard.style.display = 'none';
                signUpCard.style.display = 'block';
                this.clearForms();
            });
        }

        if (showSignInBtn && signInCard && signUpCard) {
            showSignInBtn.addEventListener('click', () => {
                signUpCard.style.display = 'none';
                signInCard.style.display = 'block';
                this.clearForms();
            });
        }

        // Skip authentication buttons
        const skipSignInBtn = document.getElementById('skipSignInBtn');
        const skipSignUpBtn = document.getElementById('skipSignUpBtn');

        if (skipSignInBtn) {
            skipSignInBtn.addEventListener('click', () => {
                this.skipAuthentication();
            });
        }

        if (skipSignUpBtn) {
            skipSignUpBtn.addEventListener('click', () => {
                this.skipAuthentication();
            });
        }

        // Form submissions
        const signInForm = document.getElementById('signInForm');
        const signUpForm = document.getElementById('signUpForm');

        if (signInForm) {
            signInForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSignIn(e);
            });
        }

        if (signUpForm) {
            signUpForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSignUp(e);
            });
        }

        // Social authentication
        const googleSignInBtn = document.getElementById('googleSignInBtn');
        const googleSignUpBtn = document.getElementById('googleSignUpBtn');

        if (googleSignInBtn) {
            googleSignInBtn.addEventListener('click', () => {
                this.handleGoogleAuth();
            });
        }

        if (googleSignUpBtn) {
            googleSignUpBtn.addEventListener('click', () => {
                this.handleGoogleAuth();
            });
        }

        // Password toggles
        this.setupPasswordToggles();

        // Forgot password
        this.setupForgotPassword();

        // Close modal on outside click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                this.closeAuthModal();
            }
        });
    }

    setupPasswordToggles() {
        const toggles = [
            { toggle: 'signInPasswordToggle', input: 'signInPassword' },
            { toggle: 'signUpPasswordToggle', input: 'signUpPassword' }
        ];

        toggles.forEach(({ toggle, input }) => {
            const toggleBtn = document.getElementById(toggle);
            const passwordInput = document.getElementById(input);

            if (toggleBtn && passwordInput) {
                toggleBtn.addEventListener('click', () => {
                    const isVisible = passwordInput.type === 'text';
                    passwordInput.type = isVisible ? 'password' : 'text';
                    
                    const eyeClosed = toggleBtn.querySelector('.eye-closed');
                    const eyeOpen = toggleBtn.querySelector('.eye-open');
                    
                    if (eyeClosed && eyeOpen) {
                        eyeClosed.style.display = isVisible ? 'block' : 'none';
                        eyeOpen.style.display = isVisible ? 'none' : 'block';
                    }
                });
            }
        });
    }

    setupFormValidation() {
        // Real-time validation
        const emailInputs = document.querySelectorAll('input[type="email"]');
        emailInputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.validateEmail(input);
            });
            
            input.addEventListener('input', () => {
                input.classList.remove('invalid');
            });
        });

        // Password confirmation
        const confirmPassword = document.getElementById('confirmPassword');
        const signUpPassword = document.getElementById('signUpPassword');

        if (confirmPassword && signUpPassword) {
            confirmPassword.addEventListener('input', () => {
                this.validatePasswordMatch(signUpPassword, confirmPassword);
            });

            signUpPassword.addEventListener('input', () => {
                if (confirmPassword.value) {
                    this.validatePasswordMatch(signUpPassword, confirmPassword);
                }
            });
        }

        // Terms agreement
        const agreeTerms = document.getElementById('agreeTerms');
        if (agreeTerms) {
            agreeTerms.addEventListener('change', () => {
                this.updateSignUpButton();
            });
        }

        // Update signup button state on input
        const signUpInputs = ['firstName', 'lastName', 'signUpEmail', 'signUpPassword', 'confirmPassword'];
        signUpInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('input', () => {
                    this.updateSignUpButton();
                });
            }
        });
    }

    setupPasswordStrength() {
        const passwordInput = document.getElementById('signUpPassword');
        const strengthIndicator = document.getElementById('passwordStrength');

        if (passwordInput && strengthIndicator) {
            passwordInput.addEventListener('input', () => {
                this.updatePasswordStrength(passwordInput.value, strengthIndicator);
            });
        }
    }

    setupForgotPassword() {
        const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
        const forgotPasswordModal = document.getElementById('forgotPasswordModal');
        const forgotPasswordModalClose = document.getElementById('forgotPasswordModalClose');
        const cancelResetBtn = document.getElementById('cancelResetBtn');
        const forgotPasswordForm = document.getElementById('forgotPasswordForm');

        if (forgotPasswordBtn && forgotPasswordModal) {
            forgotPasswordBtn.addEventListener('click', () => {
                forgotPasswordModal.setAttribute('aria-hidden', 'false');
                document.body.style.overflow = 'hidden';
            });
        }

        const closeModal = () => {
            if (forgotPasswordModal) {
                forgotPasswordModal.setAttribute('aria-hidden', 'true');
                document.body.style.overflow = '';
            }
        };

        if (forgotPasswordModalClose) {
            forgotPasswordModalClose.addEventListener('click', closeModal);
        }

        if (cancelResetBtn) {
            cancelResetBtn.addEventListener('click', closeModal);
        }

        if (forgotPasswordForm) {
            forgotPasswordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleForgotPassword(e);
            });
        }
    }

    // Authentication Methods
    async handleSignIn(event) {
        const formData = new FormData(event.target);
        const email = formData.get('email');
        const password = formData.get('password');
        const rememberMe = formData.get('rememberMe');

        const submitBtn = document.getElementById('signInSubmitBtn');
        
        try {
            this.setButtonLoading(submitBtn, true);

            // Validate inputs
            if (!email || !password) {
                throw new Error('Please fill in all fields');
            }

            if (!this.isValidEmail(email)) {
                throw new Error('Please enter a valid email address');
            }

            // Sign in with Firebase
            const userCredential = await window.firebaseAuth.signInWithEmailAndPassword(
                window.firebaseAuth.auth,
                email,
                password
            );

            await this.handleAuthSuccess(userCredential.user, rememberMe);

        } catch (error) {
            console.error('Sign in error:', error);
            this.handleAuthError(error);
        } finally {
            this.setButtonLoading(submitBtn, false);
        }
    }

    async handleSignUp(event) {
        const formData = new FormData(event.target);
        const firstName = formData.get('firstName');
        const lastName = formData.get('lastName');
        const email = formData.get('email');
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');
        const agreeTerms = formData.get('agreeTerms');

        const submitBtn = document.getElementById('signUpSubmitBtn');

        try {
            this.setButtonLoading(submitBtn, true);

            // Validate inputs
            this.validateSignUpForm(firstName, lastName, email, password, confirmPassword, agreeTerms);

            // Create user with Firebase
            const userCredential = await window.firebaseAuth.createUserWithEmailAndPassword(
                window.firebaseAuth.auth,
                email,
                password
            );

            // Update profile
            await window.firebaseAuth.updateProfile(userCredential.user, {
                displayName: `${firstName} ${lastName}`.trim()
            });

            await this.handleAuthSuccess(userCredential.user, true);

        } catch (error) {
            console.error('Sign up error:', error);
            this.handleAuthError(error);
        } finally {
            this.setButtonLoading(submitBtn, false);
        }
    }

    async handleGoogleAuth() {
        try {
            const provider = new window.firebaseAuth.GoogleAuthProvider();
            provider.setCustomParameters({
                prompt: 'select_account'
            });

            const result = await window.firebaseAuth.signInWithPopup(
                window.firebaseAuth.auth,
                provider
            );

            await this.handleAuthSuccess(result.user, true);

        } catch (error) {
            console.error('Google auth error:', error);
            
            if (error.code !== 'auth/cancelled-popup-request' && 
                error.code !== 'auth/popup-closed-by-user') {
                this.handleAuthError(error);
            }
        }
    }

    async handleForgotPassword(event) {
        const formData = new FormData(event.target);
        const email = formData.get('email');
        const submitBtn = document.getElementById('resetSubmitBtn');

        try {
            this.setButtonLoading(submitBtn, true);

            if (!email || !this.isValidEmail(email)) {
                throw new Error('Please enter a valid email address');
            }

            await window.firebaseAuth.sendPasswordResetEmail(
                window.firebaseAuth.auth,
                email
            );

            Toast?.show('Password reset email sent! Check your inbox.', 'success');
            
            // Close modal
            const modal = document.getElementById('forgotPasswordModal');
            if (modal) {
                modal.setAttribute('aria-hidden', 'true');
                document.body.style.overflow = '';
            }

            // Clear form
            event.target.reset();

        } catch (error) {
            console.error('Password reset error:', error);
            this.handleAuthError(error);
        } finally {
            this.setButtonLoading(submitBtn, false);
        }
    }

    async handleAuthSuccess(user, rememberMe = true) {
        try {
            // Store user data
            const userData = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                emailVerified: user.emailVerified
            };

            // Save to localStorage/sessionStorage
            if (rememberMe) {
                localStorage.setItem('pattibytes-user', JSON.stringify(userData));
            } else {
                sessionStorage.setItem('pattibytes-user', JSON.stringify(userData));
            }

            // Update global state
            window.PattiApp = window.PattiApp || {};
            window.PattiApp.currentUser = userData;

            // Create user profile in Firestore if needed
            if (window.pattiDataService) {
                await window.pattiDataService.createUserProfile(user);
            }

            Toast?.show(`Welcome ${user.displayName || 'to PattiBytes'}!`, 'success');

            // Close auth modal and redirect
            this.closeAuthModal();
            
            // Redirect based on where user was before auth
            const returnUrl = sessionStorage.getItem('auth-return-url') || '/app/';
            sessionStorage.removeItem('auth-return-url');
            
            setTimeout(() => {
                if (returnUrl !== window.location.pathname) {
                    window.location.href = returnUrl;
                } else {
                    window.location.reload();
                }
            }, 1500);

        } catch (error) {
            console.error('Error in auth success handler:', error);
            Toast?.show('Sign in successful!', 'success');
            this.closeAuthModal();
        }
    }

    handleAuthError(error) {
        let message = 'An error occurred. Please try again.';

        switch (error.code) {
            case 'auth/user-not-found':
                message = 'No account found with this email address.';
                break;
            case 'auth/wrong-password':
                message = 'Incorrect password. Please try again.';
                break;
            case 'auth/email-already-in-use':
                message = 'An account with this email already exists.';
                break;
            case 'auth/weak-password':
                message = 'Password is too weak. Please use at least 6 characters.';
                break;
            case 'auth/invalid-email':
                message = 'Invalid email address format.';
                break;
            case 'auth/too-many-requests':
                message = 'Too many failed attempts. Please try again later.';
                break;
            case 'auth/network-request-failed':
                message = 'Network error. Please check your connection.';
                break;
            case 'auth/user-disabled':
                message = 'This account has been disabled.';
                break;
            default:
                message = error.message || message;
        }

        Toast?.show(message, 'error');
    }

    // Skip Authentication
    skipAuthentication() {
        // Set guest mode
        window.PattiApp = window.PattiApp || {};
        window.PattiApp.currentUser = null;
        window.PattiApp.guestMode = true;
        
        this.closeAuthModal();
        
        // Redirect to where user wanted to go
        const returnUrl = sessionStorage.getItem('auth-return-url') || '/app/';
        sessionStorage.removeItem('auth-return-url');
        
        Toast?.show('Continuing as guest. Sign in anytime to access all features!', 'info', 5000);
        
        setTimeout(() => {
            window.location.href = returnUrl;
        }, 1000);
    }

    closeAuthModal() {
        // Close any auth modals
        const authModals = document.querySelectorAll('.auth-modal, .modal-overlay');
        authModals.forEach(modal => {
            modal.style.display = 'none';
            modal.setAttribute('aria-hidden', 'true');
        });
        
        document.body.style.overflow = '';
    }

    // Feature Access Control
    requireAuth(feature, callback, fallbackMessage = null) {
        if (this.isAuthenticated()) {
            return callback();
        }

        // Show auth prompt with context
        this.showAuthPrompt(feature, fallbackMessage);
    }

    showAuthPrompt(feature, customMessage = null) {
        const messages = {
            comment: 'Sign in to join the conversation and share your thoughts!',
            like: 'Sign in to show your appreciation and connect with the community!',
            post: 'Sign in to share your stories and experiences with everyone!',
            favorite: 'Sign in to save your favorite places and content!',
            visit: 'Sign in to track the places you\'ve visited!',
            profile: 'Sign in to create your personal profile!',
            settings: 'Sign in to customize your experience!',
            upload: 'Sign in to share photos and videos!',
            edit: 'Sign in to manage your content!',
            delete: 'Sign in to manage your content!',
            follow: 'Sign in to follow people and stay connected!'
        };

        const message = customMessage || messages[feature] || 
                       'Sign in to access this feature and get the full PattiBytes experience!';

        // Store current location for return after auth
        sessionStorage.setItem('auth-return-url', window.location.pathname);

        // Show custom auth prompt
        this.showCustomAuthPrompt(message, feature);
    }

    showCustomAuthPrompt(message, feature) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay auth-prompt-modal';
        modal.setAttribute('aria-hidden', 'false');
        modal.innerHTML = `
            <div class="modal-content auth-prompt-content">
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove(); document.body.style.overflow = ''">&times;</button>
                
                <div class="auth-prompt-header">
                    <div class="auth-prompt-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                    </div>
                    <h3 class="auth-prompt-title">Join PattiBytes Community</h3>
                    <p class="auth-prompt-message">${message}</p>
                </div>
                
                <div class="auth-prompt-actions">
                    <button class="btn btn-primary btn-full" onclick="window.location.href='/app/auth.html'">
                        Sign In / Sign Up
                    </button>
                    <button class="btn btn-ghost btn-full" onclick="this.closest('.modal-overlay').remove(); document.body.style.overflow = ''">
                        Continue as Guest
                    </button>
                </div>
                
                <div class="auth-prompt-features">
                    <p class="features-title">What you'll get:</p>
                    <ul class="features-list">
                        <li>💬 Comment and interact with posts</li>
                        <li>❤️ Like and save favorite content</li>
                        <li>📍 Track places you've visited</li>
                        <li>📱 Personalized experience</li>
                        <li>🔔 Get notified about updates</li>
                    </ul>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        // Auto remove after 10 seconds
        setTimeout(() => {
            if (modal.parentNode) {
                modal.remove();
                document.body.style.overflow = '';
            }
        }, 10000);
    }

    // Validation Methods
    validateSignUpForm(firstName, lastName, email, password, confirmPassword, agreeTerms) {
        if (!firstName?.trim() || !lastName?.trim()) {
            throw new Error('Please enter your first and last name');
        }

        if (!email || !this.isValidEmail(email)) {
            throw new Error('Please enter a valid email address');
        }

        if (!password || password.length < 6) {
            throw new Error('Password must be at least 6 characters long');
        }

        if (password !== confirmPassword) {
            throw new Error('Passwords do not match');
        }

        if (!agreeTerms) {
            throw new Error('Please agree to the Terms of Service');
        }
    }

    validateEmail(input) {
        const isValid = this.isValidEmail(input.value);
        input.classList.toggle('invalid', !isValid);
        return isValid;
    }

    validatePasswordMatch(passwordInput, confirmInput) {
        const match = passwordInput.value === confirmInput.value;
        confirmInput.classList.toggle('invalid', !match && confirmInput.value.length > 0);
        return match;
    }

    updatePasswordStrength(password, indicator) {
        const strength = this.calculatePasswordStrength(password);
        const fill = indicator.querySelector('.strength-fill');
        const text = indicator.querySelector('.strength-text');

        if (fill && text) {
            fill.style.width = `${strength.percentage}%`;
            fill.className = `strength-fill strength-${strength.level}`;
            text.textContent = strength.label;
        }
    }

    calculatePasswordStrength(password) {
        let score = 0;
        
        if (password.length >= 6) score += 1;
        if (password.length >= 10) score += 1;
        if (/[a-z]/.test(password)) score += 1;
        if (/[A-Z]/.test(password)) score += 1;
        if (/[0-9]/.test(password)) score += 1;
        if (/[^A-Za-z0-9]/.test(password)) score += 1;

        const levels = [
            { level: 'very-weak', label: 'Very Weak', percentage: 16 },
            { level: 'weak', label: 'Weak', percentage: 33 },
            { level: 'fair', label: 'Fair', percentage: 50 },
            { level: 'good', label: 'Good', percentage: 66 },
            { level: 'strong', label: 'Strong', percentage: 83 },
            { level: 'very-strong', label: 'Very Strong', percentage: 100 }
        ];

        return levels[Math.min(score, levels.length - 1)];
    }

    updateSignUpButton() {
        const agreeTerms = document.getElementById('agreeTerms');
        const submitBtn = document.getElementById('signUpSubmitBtn');
        const firstName = document.getElementById('firstName');
        const lastName = document.getElementById('lastName');
        const email = document.getElementById('signUpEmail');
        const password = document.getElementById('signUpPassword');
        const confirmPassword = document.getElementById('confirmPassword');

        if (agreeTerms && submitBtn) {
            const allFieldsFilled = firstName?.value?.trim() && lastName?.value?.trim() && 
                                  email?.value && password?.value && 
                                  confirmPassword?.value;
            const termsAgreed = agreeTerms.checked;
            const passwordsMatch = password?.value === confirmPassword?.value;

            submitBtn.disabled = !(allFieldsFilled && termsAgreed && passwordsMatch);
        }
    }

    // Utility Methods
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    setButtonLoading(button, loading) {
        if (!button) return;

        const btnText = button.querySelector('.btn-text');
        const btnLoader = button.querySelector('.btn-loader');

        if (loading) {
            button.disabled = true;
            button.classList.add('loading');
            if (btnText) btnText.style.opacity = '0';
            if (btnLoader) btnLoader.style.display = 'block';
        } else {
            button.disabled = false;
            button.classList.remove('loading');
            if (btnText) btnText.style.opacity = '1';
            if (btnLoader) btnLoader.style.display = 'none';
        }
    }

    clearForms() {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            form.reset();
            
            // Clear validation states
            const inputs = form.querySelectorAll('input');
            inputs.forEach(input => {
                input.classList.remove('invalid', 'valid');
            });
        });

        // Reset password strength indicator
        const strengthIndicator = document.getElementById('passwordStrength');
        if (strengthIndicator) {
            const fill = strengthIndicator.querySelector('.strength-fill');
            const text = strengthIndicator.querySelector('.strength-text');
            if (fill) {
                fill.style.width = '0%';
                fill.className = 'strength-fill';
            }
            if (text) text.textContent = 'Password strength';
        }

        // Reset signup button
        const signUpBtn = document.getElementById('signUpSubmitBtn');
        if (signUpBtn) signUpBtn.disabled = true;
    }

    checkExistingAuth() {
        // Check for existing session
        const savedUser = localStorage.getItem('pattibytes-user') || 
                         sessionStorage.getItem('pattibytes-user');
        
        if (savedUser) {
            try {
                window.PattiApp = window.PattiApp || {};
                window.PattiApp.currentUser = JSON.parse(savedUser);
            } catch (error) {
                console.error('Error parsing saved user data:', error);
                localStorage.removeItem('pattibytes-user');
                sessionStorage.removeItem('pattibytes-user');
            }
        }

        // Setup Firebase auth state listener
        if (window.firebaseAuth?.onAuthStateChanged) {
            window.firebaseAuth.onAuthStateChanged(
                window.firebaseAuth.auth,
                (user) => {
                    this.handleAuthStateChange(user);
                }
            );
        }
    }

    handleAuthStateChange(user) {
        this.currentUser = user;
        
        window.PattiApp = window.PattiApp || {};
        
        if (user) {
            // User is signed in
            const userData = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                emailVerified: user.emailVerified
            };

            window.PattiApp.currentUser = userData;
            window.PattiApp.guestMode = false;

            // Update components if they exist
            if (window.componentLoader) {
                window.componentLoader.updateUserInfo();
            }
        } else {
            // User is signed out - but don't force auth
            window.PattiApp.currentUser = null;
            window.PattiApp.guestMode = true;
            
            localStorage.removeItem('pattibytes-user');
            sessionStorage.removeItem('pattibytes-user');
        }

        // Notify listeners
        this.authStateListeners.forEach(listener => {
            try {
                listener(user);
            } catch (error) {
                console.error('Auth state listener error:', error);
            }
        });
    }

    onAuthStateChanged(listener) {
        this.authStateListeners.add(listener);
        
        // Return unsubscribe function
        return () => {
            this.authStateListeners.delete(listener);
        };
    }

    async signOut() {
        try {
            if (window.firebaseAuth?.signOut) {
                await window.firebaseAuth.signOut(window.firebaseAuth.auth);
            }
            
            // Clear local storage
            localStorage.removeItem('pattibytes-user');
            sessionStorage.removeItem('pattibytes-user');
            
            window.PattiApp = window.PattiApp || {};
            window.PattiApp.currentUser = null;
            window.PattiApp.guestMode = true;

            Toast?.show('Signed out successfully. You can continue browsing as a guest!', 'success', 4000);
            
            // Refresh current page instead of redirecting
            setTimeout(() => {
                window.location.reload();
            }, 1000);

        } catch (error) {
            console.error('Sign out error:', error);
            Toast?.show('Failed to sign out', 'error');
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return !!this.currentUser && !!window.PattiApp?.currentUser;
    }

    isGuest() {
        return !this.isAuthenticated();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.optionalAuth = new OptionalAuthManager();
});

// Export
window.OptionalAuthManager = OptionalAuthManager;
