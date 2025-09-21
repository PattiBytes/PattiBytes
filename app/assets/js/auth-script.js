// Authentication logic
class AuthManager {
    constructor() {
        this.auth = window.firebaseAuth.auth;
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkAuthState();
    }

    bindEvents() {
        // Form switching
        document.getElementById('showSignup').addEventListener('click', (e) => {
            e.preventDefault();
            this.showForm('signup');
        });

        document.getElementById('showLogin').addEventListener('click', (e) => {
            e.preventDefault();
            this.showForm('login');
        });

        document.getElementById('showReset').addEventListener('click', (e) => {
            e.preventDefault();
            this.showForm('reset');
        });

        document.getElementById('backToLogin').addEventListener('click', (e) => {
            e.preventDefault();
            this.showForm('login');
        });

        // Form submissions
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.getElementById('signupForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSignup();
        });

        document.getElementById('resetForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleReset();
        });

        // Social auth
        document.getElementById('googleSignIn').addEventListener('click', () => {
            this.handleSocialAuth('google');
        });

        document.getElementById('facebookSignIn').addEventListener('click', () => {
            this.handleSocialAuth('facebook');
        });
    }

    showForm(formType) {
        const forms = document.querySelectorAll('.auth-form');
        forms.forEach(form => form.classList.remove('active'));
        
        document.getElementById(`${formType}-form`).classList.add('active');
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

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
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (!this.validateSignup(name, email, password, confirmPassword)) {
            return;
        }

        try {
            this.showLoading('signupForm');
            const userCredential = await window.firebaseAuth.createUserWithEmailAndPassword(this.auth, email, password);
            
            // Update profile with display name
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

    async handleReset() {
        const email = document.getElementById('resetEmail').value;

        if (!this.validateEmail(email)) {
            this.showMessage('Please enter a valid email address', 'error');
            return;
        }

        try {
            this.showLoading('resetForm');
            await window.firebaseAuth.sendPasswordResetEmail(this.auth, email);
            this.showMessage('Password reset email sent! Check your inbox.', 'success');
            this.showForm('login');
        } catch (error) {
            this.showMessage(this.getErrorMessage(error), 'error');
        } finally {
            this.hideLoading('resetForm');
        }
    }

    async handleSocialAuth(provider) {
        const providerObj = provider === 'google' 
            ? window.firebaseAuth.googleProvider 
            : window.firebaseAuth.facebookProvider;

        try {
            await window.firebaseAuth.signInWithPopup(this.auth, providerObj);
            this.showMessage(`Welcome! Signed in with ${provider}`, 'success');
            this.redirectToDashboard();
        } catch (error) {
            this.showMessage(this.getErrorMessage(error), 'error');
        }
    }

    checkAuthState() {
        window.firebaseAuth.onAuthStateChanged(this.auth, (user) => {
            if (user && window.location.pathname.includes('auth.html')) {
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
        const container = document.getElementById('messageContainer');
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;
        messageEl.textContent = message;
        
        container.appendChild(messageEl);
        
        setTimeout(() => {
            messageEl.remove();
        }, 5000);
    }

    showLoading(formId) {
        const form = document.getElementById(formId);
        const button = form.querySelector('.auth-btn.primary');
        button.textContent = 'Loading...';
        button.disabled = true;
    }

    hideLoading(formId) {
        const form = document.getElementById(formId);
        const button = form.querySelector('.auth-btn.primary');
        button.disabled = false;
        
        if (formId === 'loginForm') button.textContent = 'Sign In';
        else if (formId === 'signupForm') button.textContent = 'Create Account';
        else if (formId === 'resetForm') button.textContent = 'Send Reset Link';
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
            default:
                return error.message || 'An error occurred. Please try again.';
        }
    }

    redirectToDashboard() {
        setTimeout(() => {
            window.location.href = '/app/dashboard.html';
        }, 1500);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});
