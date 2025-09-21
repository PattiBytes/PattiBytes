/**
 * PattiBytes Authentication Script
 * Supports Email/Password, Email Link (passwordless), and Google Sign-in
 */

class AuthManager {
    constructor() {
        this.auth = window.firebaseAuth?.auth;
        this.isEmailLinkMode = new URLSearchParams(window.location.search).get('mode') === 'emailLink';
        this.init();
    }

    init() {
        if (!this.auth) {
            console.error('Firebase not initialized');
            return;
        }
        
        this.bindEvents();
        this.checkAuthState();
        this.handleEmailLink();
    }

    bindEvents() {
        // Form switching
        document.getElementById('showSignup')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showForm('signup');
        });

        document.getElementById('showLogin')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showForm('login');
        });

        document.getElementById('showEmailLink')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showForm('emailLink');
        });

        document.getElementById('backToLogin')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showForm('login');
        });

        // Form submissions
        document.getElementById('loginForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.getElementById('signupForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSignup();
        });

        document.getElementById('emailLinkForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEmailLink();
        });

        // Social auth - only Google
        document.getElementById('googleSignIn')?.addEventListener('click', () => {
            this.handleGoogleAuth();
        });
    }

    showForm(formType) {
        const forms = document.querySelectorAll('.auth-form');
        forms.forEach(form => form.classList.remove('active'));
        
        const targetForm = document.getElementById(`${formType}-form`);
        if (targetForm) {
            targetForm.classList.add('active');
        }
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail')?.value;
        const password = document.getElementById('loginPassword')?.value;

        if (!this.validateEmail(email)) {
            this.showMessage('Please enter a valid email address', 'error');
            return;
        }

        try {
            this.showLoading('loginForm');
            await window.firebaseAuth.signInWithEmailAndPassword(this.auth, email, password);
            this.showMessage('Welcome back!', 'success');
            this.redirectToDashboard();
        } catch (error) {
            this.showMessage(this.getErrorMessage(error), 'error');
        } finally {
            this.hideLoading('loginForm');
        }
    }

    async handleSignup() {
        const name = document.getElementById('signupName')?.value;
        const email = document.getElementById('signupEmail')?.value;
        const password = document.getElementById('signupPassword')?.value;
        const confirmPassword = document.getElementById('confirmPassword')?.value;

        if (!this.validateSignup(name, email, password, confirmPassword)) {
            return;
        }

        try {
            this.showLoading('signupForm');
            const userCredential = await window.firebaseAuth.createUserWithEmailAndPassword(this.auth, email, password);
            
            await window.firebaseAuth.updateProfile(userCredential.user, {
                displayName: name
            });

            this.showMessage('Account created successfully!', 'success');
            this.redirectToDashboard();
        } catch (error) {
            this.showMessage(this.getErrorMessage(error), 'error');
        } finally {
            this.hideLoading('signupForm');
        }
    }

    async handleEmailLinkSend() {
        const email = document.getElementById('emailLinkEmail')?.value;

        if (!this.validateEmail(email)) {
            this.showMessage('Please enter a valid email address', 'error');
            return;
        }

        try {
            this.showLoading('emailLinkForm');
            
            // Send sign-in link to email
            await window.firebaseAuth.sendSignInLinkToEmail(
                this.auth, 
                email, 
                window.firebaseAuth.actionCodeSettings
            );
            
            // Save email locally for completion
            localStorage.setItem('emailForSignIn', email);
            
            this.showMessage('Magic link sent to your email! Check your inbox.', 'success');
            this.showEmailLinkSentUI();
            
        } catch (error) {
            this.showMessage(this.getErrorMessage(error), 'error');
        } finally {
            this.hideLoading('emailLinkForm');
        }
    }

    async handleEmailLink() {
        // Check if this is an email link sign-in
        if (window.firebaseAuth.isSignInWithEmailLink(this.auth, window.location.href)) {
            let email = localStorage.getItem('emailForSignIn');
            
            if (!email) {
                // If email not found, prompt user to enter it
                email = window.prompt('Please provide your email for confirmation');
            }

            if (email && this.validateEmail(email)) {
                try {
                    this.showLoading();
                    
                    const result = await window.firebaseAuth.signInWithEmailLink(
                        this.auth, 
                        email, 
                        window.location.href
                    );
                    
                    // Clear saved email
                    localStorage.removeItem('emailForSignIn');
                    
                    this.showMessage('Successfully signed in!', 'success');
                    this.redirectToDashboard();
                    
                } catch (error) {
                    this.showMessage(this.getErrorMessage(error), 'error');
                    console.error('Email link sign-in error:', error);
                }
            }
        }
    }

    async handleGoogleAuth() {
        try {
            await window.firebaseAuth.signInWithPopup(this.auth, window.firebaseAuth.googleProvider);
            this.showMessage('Welcome! Signed in with Google', 'success');
            this.redirectToDashboard();
        } catch (error) {
            this.showMessage(this.getErrorMessage(error), 'error');
        }
    }

    showEmailLinkSentUI() {
        const form = document.getElementById('emailLink-form');
        if (form) {
            form.innerHTML = `
                <div class="email-link-sent">
                    <h3>✉️ Check Your Email</h3>
                    <p>We've sent a magic link to your email address. Click the link to sign in instantly!</p>
                    <p class="note">Didn't receive it? Check your spam folder.</p>
                    <button type="button" onclick="location.reload()" class="auth-btn secondary">
                        Send Another Link
                    </button>
                    <a href="#" id="backToLogin" class="auth-switch">Back to Login</a>
                </div>
            `;
            
            // Re-bind the back button
            form.querySelector('#backToLogin').addEventListener('click', (e) => {
                e.preventDefault();
                location.reload();
            });
        }
    }

    checkAuthState() {
        window.firebaseAuth.onAuthStateChanged(this.auth, (user) => {
            if (user && !this.isEmailLinkMode) {
                this.redirectToDashboard();
            }
        });
    }

    validateEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    validateSignup(name, email, password, confirmPassword) {
        if (name.length < 2) {
            this.showMessage('Name must be at least 2 characters long', 'error');
            return false;
        }

        if (!this.validateEmail(email)) {
            this.showMessage('Please enter a valid email address', 'error');
            return false;
        }

        if (password.length < 6) {
            this.showMessage('Password must be at least 6 characters long', 'error');
            return false;
        }

        if (password !== confirmPassword) {
            this.showMessage('Passwords do not match', 'error');
            return false;
        }

        return true;
    }

    showMessage(message, type = 'success') {
        if (window.pattiBytes) {
            window.pattiBytes.showToast(message, type);
        } else {
            alert(message);
        }
    }

    showLoading(formId) {
        if (window.pattiBytes) {
            window.pattiBytes.showLoading('Authenticating...');
        }
        
        if (formId) {
            const form = document.getElementById(formId);
            const button = form?.querySelector('.auth-btn.primary');
            if (button) {
                button.textContent = 'Loading...';
                button.disabled = true;
            }
        }
    }

    hideLoading(formId) {
        if (window.pattiBytes) {
            window.pattiBytes.hideLoading();
        }
        
        if (formId) {
            const form = document.getElementById(formId);
            const button = form?.querySelector('.auth-btn.primary');
            if (button) {
                button.disabled = false;
                
                if (formId === 'loginForm') button.textContent = 'Sign In';
                else if (formId === 'signupForm') button.textContent = 'Create Account';
                else if (formId === 'emailLinkForm') button.textContent = 'Send Magic Link';
            }
        }
    }

    getErrorMessage(error) {
        switch (error.code) {
            case 'auth/user-not-found':
                return 'No account found with this email address';
            case 'auth/wrong-password':
                return 'Incorrect password';
            case 'auth/email-already-in-use':
                return 'An account with this email already exists';
            case 'auth/weak-password':
                return 'Password should be at least 6 characters';
            case 'auth/invalid-email':
                return 'Invalid email address';
            case 'auth/popup-closed-by-user':
                return 'Sign-in popup was closed';
            case 'auth/invalid-action-code':
                return 'Invalid or expired email link';
            case 'auth/expired-action-code':
                return 'Email link has expired. Please request a new one.';
            default:
                return error.message || 'An error occurred. Please try again.';
        }
    }

    redirectToDashboard() {
        setTimeout(() => {
            window.location.href = '/app/';
        }, 1500);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});
