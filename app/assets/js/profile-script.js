/**
 * PattiBytes Profile Management Script
 * Handles profile editing, image uploads, and user data management
 */

class ProfileManager {
    constructor() {
        this.isEditing = false;
        this.originalData = {};
        this.uploadTasks = new Map();
        
        this.init();
    }

    async init() {
        try {
            await this.loadUserProfile();
            this.setupEventListeners();
            this.setupImageUploads();
            this.setupFormValidation();
            
            console.log('✅ ProfileManager initialized');
        } catch (error) {
            console.error('❌ ProfileManager initialization failed:', error);
            window.pattiBytes?.showToast('Failed to load profile', 'error');
        }
    }

    /**
     * Load user profile data
     */
    async loadUserProfile() {
        try {
            const user = window.firebaseAuth.auth.currentUser;
            if (!user) {
                window.location.href = '/app/auth.html';
                return;
            }

            // Load basic profile data
            this.displayBasicProfile(user);
            
            // Load extended profile data from Firestore
            const userDoc = await window.firebaseFirestore.doc(
                window.firebaseFirestore.db, 
                'users', 
                user.uid
            ).get();

            if (userDoc.exists()) {
                const userData = userDoc.data();
                this.displayExtendedProfile(userData);
                this.loadUserStats(userData);
            } else {
                // Create initial user document
                await this.createInitialUserProfile(user);
            }

        } catch (error) {
            console.error('Error loading profile:', error);
            window.pattiBytes?.showToast('Error loading profile data', 'error');
        }
    }

    /**
     * Display basic profile information
     */
    displayBasicProfile(user) {
        // Set profile name and email
        document.getElementById('profileDisplayName').textContent = 
            user.displayName || 'Anonymous User';
        document.getElementById('profileEmail').textContent = user.email;
        
        // Set form values
        document.getElementById('displayName').value = user.displayName || '';
        document.getElementById('email').value = user.email;
        
        // Set avatar
        this.updateAvatarDisplay(user.photoURL, user.displayName);
        
        // Set join date
        if (user.metadata?.creationTime) {
            const joinDate = new Date(user.metadata.creationTime).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long'
            });
            document.getElementById('profileJoinDate').textContent = joinDate;
        }
    }

    /**
     * Display extended profile information
     */
    displayExtendedProfile(userData) {
        // Set form values
        document.getElementById('username').value = userData.username || '';
        document.getElementById('bio').value = userData.bio || '';
        document.getElementById('location').value = userData.location || '';
        document.getElementById('website').value = userData.website || '';
        
        // Set privacy settings
        document.getElementById('profileVisibility').value = 
            userData.profileVisibility || 'public';
        document.getElementById('showEmail').checked = userData.showEmail || false;
        document.getElementById('allowComments').checked = userData.allowComments !== false;
        
        this.updateCharacterCount();
    }

    /**
     * Load and display user statistics
     */
    loadUserStats(userData) {
        const stats = userData.stats || {};
        
        document.getElementById('postsCount').textContent = stats.posts || 0;
        document.getElementById('likesCount').textContent = stats.likes || 0;
        document.getElementById('commentsCount').textContent = stats.comments || 0;
        document.getElementById('viewsCount').textContent = stats.views || 0;
        
        // Animate counters
        this.animateCounters();
    }

    /**
     * Create initial user profile document
     */
    async createInitialUserProfile(user) {
        const initialProfile = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            username: '',
            bio: '',
            location: '',
            website: '',
            profileVisibility: 'public',
            showEmail: false,
            allowComments: true,
            stats: {
                posts: 0,
                likes: 0,
                comments: 0,
                views: 0
            },
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await window.firebaseFirestore.setDoc(
            window.firebaseFirestore.doc(window.firebaseFirestore.db, 'users', user.uid),
            initialProfile
        );
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Edit toggle
        document.getElementById('editToggleBtn')?.addEventListener('click', () => {
            this.toggleEdit();
        });

        // Form submission
        document.getElementById('profileForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProfile();
        });

        // Cancel edit
        document.getElementById('cancelEditBtn')?.addEventListener('click', () => {
            this.cancelEdit();
        });

        // Settings button
        document.getElementById('appSettingsBtn')?.addEventListener('click', () => {
            this.openAppSettings();
        });

        // Download data
        document.getElementById('downloadDataBtn')?.addEventListener('click', () => {
            this.downloadUserData();
        });

        // Sign out
        document.getElementById('signOutBtn')?.addEventListener('click', () => {
            this.confirmSignOut();
        });

        // Bio character count
        document.getElementById('bio')?.addEventListener('input', () => {
            this.updateCharacterCount();
        });

        // Privacy settings
        document.getElementById('profileVisibility')?.addEventListener('change', () => {
            this.savePrivacySettings();
        });

        document.getElementById('showEmail')?.addEventListener('change', () => {
            this.savePrivacySettings();
        });

        document.getElementById('allowComments')?.addEventListener('change', () => {
            this.savePrivacySettings();
        });
    }

    /**
     * Setup image upload functionality
     */
    setupImageUploads() {
        const avatarBtn = document.getElementById('avatarUploadBtn');
        const coverBtn = document.getElementById('coverUploadBtn');
        const avatarInput = document.getElementById('avatarInput');
        const coverInput = document.getElementById('coverInput');

        avatarBtn?.addEventListener('click', () => {
            avatarInput.click();
        });

        coverBtn?.addEventListener('click', () => {
            coverInput.click();
        });

        avatarInput?.addEventListener('change', (e) => {
            this.handleImageUpload(e.target.files[0], 'avatar');
        });

        coverInput?.addEventListener('change', (e) => {
            this.handleImageUpload(e.target.files[0], 'cover');
        });
    }

    /**
     * Handle image upload
     */
    async handleImageUpload(file, type) {
        if (!file) return;

        // Validate file
        if (!file.type.startsWith('image/')) {
            window.pattiBytes?.showToast('Please select an image file', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            window.pattiBytes?.showToast('Image size should be less than 5MB', 'error');
            return;
        }

        try {
            // Show upload progress
            this.showUploadProgress();

            // Compress and resize image
            const processedFile = await this.processImage(file, type);

            // Upload to storage service
            const imageUrl = await this.uploadImageToStorage(processedFile, type);

            // Update profile
            await this.updateProfileImage(imageUrl, type);

            // Update UI
            if (type === 'avatar') {
                this.updateAvatarDisplay(imageUrl);
            }

            this.hideUploadProgress();
            window.pattiBytes?.showToast('Image updated successfully!', 'success');

        } catch (error) {
            console.error('Image upload error:', error);
            this.hideUploadProgress();
            window.pattiBytes?.showToast('Failed to upload image', 'error');
        }
    }

    /**
     * Process image (compress and resize)
     */
    async processImage(file, type) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                // Set dimensions based on type
                let { width, height } = type === 'avatar' 
                    ? { width: 300, height: 300 }
                    : { width: 800, height: 400 };

                // Calculate aspect ratio
                const aspectRatio = img.width / img.height;
                
                if (type === 'avatar') {
                    // For avatar, make it square
                    width = height = Math.min(img.width, img.height, 300);
                } else {
                    // For cover, maintain aspect ratio
                    if (aspectRatio > 2) {
                        height = width / aspectRatio;
                    } else {
                        width = height * aspectRatio;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob(resolve, 'image/jpeg', 0.8);
            };

            img.src = URL.createObjectURL(file);
        });
    }

    /**
     * Upload image to storage service
     * Using Cloudinary as an example (free tier: 25GB storage, 25GB bandwidth/month)
     */
    async uploadImageToStorage(file, type) {
        // For demo purposes, using a placeholder upload
        // In production, integrate with your chosen storage service
        
        return new Promise((resolve) => {
            // Simulate upload progress
            let progress = 0;
            const interval = setInterval(() => {
                progress += Math.random() * 20;
                this.updateUploadProgress(Math.min(progress, 90));
                
                if (progress >= 90) {
                    clearInterval(interval);
                    // Simulate final upload
                    setTimeout(() => {
                        this.updateUploadProgress(100);
                        // Return a demo URL - replace with actual upload service
                        resolve(`https://example.com/uploads/${Date.now()}-${type}.jpg`);
                    }, 500);
                }
            }, 200);
        });
    }

    /**
     * Update profile image in database
     */
    async updateProfileImage(imageUrl, type) {
        const user = window.firebaseAuth.auth.currentUser;
        if (!user) return;

        const updateData = {
            updatedAt: new Date()
        };

        if (type === 'avatar') {
            // Update Firebase Auth profile
            await window.firebaseAuth.updateProfile(user, {
                photoURL: imageUrl
            });
            updateData.photoURL = imageUrl;
        } else {
            updateData.coverURL = imageUrl;
        }

        // Update Firestore document
        await window.firebaseFirestore.updateDoc(
            window.firebaseFirestore.doc(window.firebaseFirestore.db, 'users', user.uid),
            updateData
        );
    }

    /**
     * Toggle edit mode
     */
    toggleEdit() {
        if (this.isEditing) {
            this.cancelEdit();
        } else {
            this.startEdit();
        }
    }

    /**
     * Start edit mode
     */
    startEdit() {
        this.isEditing = true;
        
        // Store original values
        const form = document.getElementById('profileForm');
        const formData = new FormData(form);
        this.originalData = Object.fromEntries(formData);
        
        // Enable form fields
        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            if (input.name !== 'email') { // Keep email readonly
                input.readOnly = false;
                input.disabled = false;
            }
        });
        
        // Update UI
        document.getElementById('formActions').style.display = 'flex';
        const editBtn = document.getElementById('editToggleBtn');
        editBtn.textContent = 'Cancel';
        editBtn.classList.add('cancel');
        
        window.pattiBytes?.showToast('Edit mode enabled', 'info');
    }

    /**
     * Cancel edit mode
     */
    cancelEdit() {
        this.isEditing = false;
        
        // Restore original values
        Object.entries(this.originalData).forEach(([name, value]) => {
            const input = document.querySelector(`[name="${name}"]`);
            if (input) input.value = value;
        });
        
        // Disable form fields
        const form = document.getElementById('profileForm');
        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.readOnly = true;
            input.disabled = false;
        });
        
        // Update UI
        document.getElementById('formActions').style.display = 'none';
        const editBtn = document.getElementById('editToggleBtn');
        editBtn.textContent = 'Edit';
        editBtn.classList.remove('cancel');
        
        this.updateCharacterCount();
    }

    /**
     * Save profile changes
     */
    async saveProfile() {
        try {
            window.pattiBytes?.showLoading('Saving profile...');
            
            const user = window.firebaseAuth.auth.currentUser;
            if (!user) return;

            // Get form data
            const formData = new FormData(document.getElementById('profileForm'));
            const profileData = Object.fromEntries(formData);
            
            // Validate data
            if (!this.validateProfileData(profileData)) {
                return;
            }

            // Update Firebase Auth profile
            if (profileData.displayName !== user.displayName) {
                await window.firebaseAuth.updateProfile(user, {
                    displayName: profileData.displayName
                });
            }

            // Update Firestore document
            const updateData = {
                displayName: profileData.displayName,
                username: profileData.username,
                bio: profileData.bio,
                location: profileData.location,
                website: profileData.website,
                updatedAt: new Date()
            };

            await window.firebaseFirestore.updateDoc(
                window.firebaseFirestore.doc(window.firebaseFirestore.db, 'users', user.uid),
                updateData
            );

            // Update UI
            document.getElementById('profileDisplayName').textContent = profileData.displayName;
            
            // Exit edit mode
            this.isEditing = false;
            document.getElementById('formActions').style.display = 'none';
            const editBtn = document.getElementById('editToggleBtn');
            editBtn.textContent = 'Edit';
            editBtn.classList.remove('cancel');
            
            // Make fields readonly
            const inputs = document.querySelectorAll('#profileForm input, #profileForm textarea');
            inputs.forEach(input => {
                if (input.name !== 'email') {
                    input.readOnly = true;
                }
            });

            window.pattiBytes?.hideLoading();
            window.pattiBytes?.showToast('Profile updated successfully!', 'success');

        } catch (error) {
            console.error('Error saving profile:', error);
            window.pattiBytes?.hideLoading();
            window.pattiBytes?.showToast('Failed to save profile', 'error');
        }
    }

    /**
     * Validate profile data
     */
    validateProfileData(data) {
        let isValid = true;
        
        // Clear previous errors
        document.querySelectorAll('.input-error').forEach(el => {
            el.textContent = '';
        });

        // Validate display name
        if (!data.displayName || data.displayName.length < 2) {
            this.showFieldError('displayName', 'Display name must be at least 2 characters');
            isValid = false;
        }

        // Validate username
        if (data.username && !/^[a-zA-Z0-9_]+$/.test(data.username)) {
            this.showFieldError('username', 'Username can only contain letters, numbers, and underscores');
            isValid = false;
        }

        // Validate bio length
        if (data.bio && data.bio.length > 150) {
            this.showFieldError('bio', 'Bio must be 150 characters or less');
            isValid = false;
        }

        // Validate website URL
        if (data.website && !this.isValidUrl(data.website)) {
            this.showFieldError('website', 'Please enter a valid URL');
            isValid = false;
        }

        return isValid;
    }

    /**
     * Save privacy settings
     */
    async savePrivacySettings() {
        try {
            const user = window.firebaseAuth.auth.currentUser;
            if (!user) return;

            const updateData = {
                profileVisibility: document.getElementById('profileVisibility').value,
                showEmail: document.getElementById('showEmail').checked,
                allowComments: document.getElementById('allowComments').checked,
                updatedAt: new Date()
            };

            await window.firebaseFirestore.updateDoc(
                window.firebaseFirestore.doc(window.firebaseFirestore.db, 'users', user.uid),
                updateData
            );

            window.pattiBytes?.showToast('Privacy settings updated', 'success');

        } catch (error) {
            console.error('Error saving privacy settings:', error);
            window.pattiBytes?.showToast('Failed to update settings', 'error');
        }
    }

    /**
     * Confirm sign out
     */
    confirmSignOut() {
        this.showConfirmModal(
            'Are you sure you want to sign out?',
            'You will be redirected to the login page.',
            () => this.handleSignOut()
        );
    }

    /**
     * Handle sign out
     */
    async handleSignOut() {
        try {
            window.pattiBytes?.showLoading('Signing out...');
            
            await window.firebaseAuth.signOut(window.firebaseAuth.auth);
            
            // Clear local storage
            localStorage.removeItem('auth_email');
            
            // Redirect to auth page
            window.location.href = '/app/auth.html';
            
        } catch (error) {
            console.error('Sign out error:', error);
            window.pattiBytes?.hideLoading();
            window.pattiBytes?.showToast('Failed to sign out', 'error');
        }
    }

    /**
     * Download user data
     */
    async downloadUserData() {
        try {
            window.pattiBytes?.showLoading('Preparing data...');
            
            const user = window.firebaseAuth.auth.currentUser;
            if (!user) return;

            // Get user data
            const userDoc = await window.firebaseFirestore.getDoc(
                window.firebaseFirestore.doc(window.firebaseFirestore.db, 'users', user.uid)
            );

            const userData = {
                profile: userDoc.data(),
                auth: {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    emailVerified: user.emailVerified,
                    creationTime: user.metadata?.creationTime,
                    lastSignInTime: user.metadata?.lastSignInTime
                },
                exportDate: new Date().toISOString()
            };

            // Create and download file
            const blob = new Blob([JSON.stringify(userData, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pattibytes-data-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            window.pattiBytes?.hideLoading();
            window.pattiBytes?.showToast('Data downloaded successfully!', 'success');

        } catch (error) {
            console.error('Error downloading data:', error);
            window.pattiBytes?.hideLoading();
            window.pattiBytes?.showToast('Failed to download data', 'error');
        }
    }

    /**
     * Open app settings
     */
    openAppSettings() {
        // Navigate to settings page or show settings modal
        window.pattiBytes?.showToast('Settings page coming soon!', 'info');
    }

    // ===================
    // UTILITY METHODS
    // ===================

    updateAvatarDisplay(photoURL, displayName) {
        const avatarImage = document.getElementById('profileAvatarImage');
        const avatarInitials = document.getElementById('profileAvatarInitials');
        
        if (photoURL) {
            avatarImage.src = photoURL;
            avatarImage.style.display = 'block';
            avatarInitials.style.display = 'none';
        } else {
            avatarImage.style.display = 'none';
            avatarInitials.style.display = 'flex';
            avatarInitials.textContent = (displayName || 'U').charAt(0).toUpperCase();
        }
    }

    updateCharacterCount() {
        const bioInput = document.getElementById('bio');
        const countElement = document.getElementById('bioCharCount');
        
        if (bioInput && countElement) {
            const count = bioInput.value.length;
            countElement.textContent = count;
            countElement.style.color = count > 150 ? 'var(--error)' : 'var(--text-tertiary)';
        }
    }

    animateCounters() {
        document.querySelectorAll('.stat-value').forEach(counter => {
            const target = parseInt(counter.textContent);
            const increment = target / 30;
            let current = 0;
            
            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    counter.textContent = target;
                    clearInterval(timer);
                } else {
                    counter.textContent = Math.floor(current);
                }
            }, 50);
        });
    }

    showUploadProgress() {
        document.getElementById('uploadProgress').classList.add('show');
    }

    hideUploadProgress() {
        document.getElementById('uploadProgress').classList.remove('show');
    }

    updateUploadProgress(percentage) {
        const progressFill = document.querySelector('.progress-fill');
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
    }

    showFieldError(fieldName, message) {
        const errorElement = document.getElementById(`${fieldName}Error`);
        if (errorElement) {
            errorElement.textContent = message;
        }
    }

    showConfirmModal(title, message, onConfirm) {
        const modal = document.getElementById('confirmModal');
        const titleElement = modal.querySelector('.modal-title');
        const messageElement = document.getElementById('confirmMessage');
        const confirmBtn = document.getElementById('confirmAction');
        const cancelBtn = document.getElementById('confirmCancel');

        titleElement.textContent = title;
        messageElement.textContent = message;
        modal.style.display = 'flex';

        const handleConfirm = () => {
            modal.style.display = 'none';
            onConfirm();
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
        };

        const handleCancel = () => {
            modal.style.display = 'none';
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
        };

        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
    }

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    setupFormValidation() {
        // Real-time validation as user types
        document.getElementById('bio')?.addEventListener('input', (e) => {
            if (e.target.value.length > 150) {
                this.showFieldError('bio', 'Bio must be 150 characters or less');
            } else {
                document.getElementById('bioError').textContent = '';
            }
        });

        document.getElementById('website')?.addEventListener('blur', (e) => {
            if (e.target.value && !this.isValidUrl(e.target.value)) {
                this.showFieldError('website', 'Please enter a valid URL');
            } else {
                document.getElementById('websiteError').textContent = '';
            }
        });
    }
}

// Initialize ProfileManager when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.profileManager = new ProfileManager();
});
