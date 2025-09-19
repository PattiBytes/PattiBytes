// App-wide functionality
document.addEventListener('DOMContentLoaded', () => {
    console.log('PattiBytes App loaded');
    
    // Initialize app features
    initializeApp();
    
    // Check authentication status
    checkAuthStatus();
    
    // Initialize push notifications if supported
    if ('Notification' in window && 'serviceWorker' in navigator) {
        initializePushNotifications();
    }
});

function initializeApp() {
    // Add app-specific initialization
    document.body.classList.add('app-mode');
    
    // Initialize common UI elements
    initializeCommonComponents();
}

function checkAuthStatus() {
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem('pattibytes_auth');
    const authButtons = document.querySelectorAll('.auth-required');
    
    if (isLoggedIn) {
        authButtons.forEach(btn => {
            btn.style.display = 'block';
        });
    } else {
        authButtons.forEach(btn => {
            btn.style.display = 'none';
        });
    }
}

function initializePushNotifications() {
    // Request notification permission
    if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            console.log('Notification permission:', permission);
        });
    }
}

function initializeCommonComponents() {
    // Initialize any shared components across app pages
    // This can include navigation, modals, etc.
}
