/**
 * Authentication System - Complete Implementation
 * Firebase Auth with Google/Email authentication
 */

class AuthManager {
    constructor() {
        this.isInitialized = false;
        this.currentUser = null;
        this.authStateListeners = new Set();
        
        this.init();
    }

    async init() {
        try {
            await this.waitForFirebase();
            this.setupEventListeners();
            this.setupFormValidation();
            this.setupPasswordStrength();
            this.checkAuthState();
            
            this.isInitialized = true;
            console.log('✅ AuthManager initialized');
        } catch (error) {
            console.error('❌ AuthManager initialization failed:', error);
            Toast.show('Authentication system failed to load', 'error');
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

        // Google authentication
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
        // Email validation
        const emailInputs = document.querySelectorAll('input[type="email"]');
        emailInputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.validateEmail(input);
            });
        });

        // Password confirmation
        const confirmPassword = document.getElementById('confirmPassword');
        const signUpPassword = document.getElementById('signUpPassword');

        if (confirmPassword && signUpPassword) {
            confirmPassword.addEventListener('input', () => {
                this.validatePasswordMatch(signUpPassword, confirmPassword);
            });
        }

        // Terms agreement
        const agreeTerms = document.getElementById('agreeTerms');
        const signUpSubmit = document.getElementById('signUpSubmitBtn');

        if (agreeTerms && signUpSubmit) {
            agreeTerms.addEventListener('change', () => {
                this.updateSignUpButton();
            });
        }
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
                forgotPasswordModal.style.display = 'flex';
            });
        }

        const closeModal = () => {
            if (forgotPasswordModal) {
                forgotPasswordModal.style.display = 'none';
            }
        };

        if (forgotPasswordModalClose) {
            forgotPasswordModalClose.addEventListener('click', closeModal);
        }

        if (cancelResetBtn) {
            cancelResetBtn.addEventListener('click', closeModal);
        }

        if (forgotPasswordModal) {
            forgotPasswordModal.addEventListener('click', (e) => {
                if (e.target === forgotPasswordModal) {
                    closeModal();
                }
            });
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

            Toast.show('Password reset email sent! Check your inbox.', 'success');
            
            // Close modal
            const modal = document.getElementById('forgotPasswordModal');
            if (modal) modal.style.display = 'none';

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

            // Save to localStorage if remember me is checked
            if (rememberMe) {
                localStorage.setItem('pattibytes-user', JSON.stringify(userData));
            } else {
                sessionStorage.setItem('pattibytes-user', JSON.stringify(userData));
            }

            // Update global state
            window.PattiApp.currentUser = userData;

            // Create user profile in Firestore
            if (window.pattiDataService) {
                await window.pattiDataService.createUserProfile(user);
            }

            Toast.show(`Welcome ${user.displayName || 'to PattiBytes'}!`, 'success');

            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = '/app/';
            }, 1500);

        } catch (error) {
            console.error('Error in auth success handler:', error);
            Toast.show('Sign in successful, but there was an issue saving your data', 'warning');
            
            // Still redirect, but with a delay
            setTimeout(() => {
                window.location.href = '/app/';
            }, 2000);
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
            default:
                message = error.message || message;
        }

        Toast.show(message, 'error');
    }

    // Validation Methods
    validateSignUpForm(firstName, lastName, email, password, confirmPassword, agreeTerms) {
        if (!firstName || !lastName) {
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
            const allFieldsFilled = firstName?.value && lastName?.value && 
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
    }

    checkAuthState() {
        // Check for existing session
        const savedUser = localStorage.getItem('pattibytes-user') || 
                         sessionStorage.getItem('pattibytes-user');
        
        if (savedUser) {
            try {
                window.PattiApp.currentUser = JSON.parse(savedUser);
                
                // If already on auth page and logged in, redirect
                if (window.location.pathname.includes('auth.html')) {
                    window.location.href = '/app/';
                }
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

            // Update components if they exist
            if (window.componentLoader) {
                window.componentLoader.updateUserInfo();
            }

            // Redirect from auth page
            if (window.location.pathname.includes('auth.html')) {
                window.location.href = '/app/';
            }
        } else {
            // User is signed out
            window.PattiApp.currentUser = null;
            localStorage.removeItem('pattibytes-user');
            sessionStorage.removeItem('pattibytes-user');

            // Redirect to auth page if not already there
            if (!window.location.pathname.includes('auth.html')) {
                window.location.href = '/app/auth.html';
            }
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
            window.PattiApp.currentUser = null;

            Toast.show('Signed out successfully', 'success');
            
            // Redirect to auth page
            setTimeout(() => {
                window.location.href = '/app/auth.html';
            }, 1000);

        } catch (error) {
            console.error('Sign out error:', error);
            Toast.show('Failed to sign out', 'error');
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return !!this.currentUser;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});

// Export
window.AuthManager = AuthManager;
