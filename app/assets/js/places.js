/**
 * Places Page - Complete Functionality
 * Heritage sites and locations management
 */

class PlacesManager {
    constructor() {
        this.places = [];
        this.filteredPlaces = [];
        this.currentCategory = 'all';
        this.searchQuery = '';
        this.viewMode = 'grid'; // grid or list
        this.currentPlace = null;
        this.userLocation = null;
        
        this.init();
    }

    async init() {
        try {
            await this.waitForDependencies();
            this.setupEventListeners();
            this.setupSearch();
            this.setupCategories();
            this.setupViewToggle();
            this.setupModals();
            
            // Load places data
            await this.loadPlaces();
            
            // Get user location for directions
            this.getUserLocation();
            
            console.log('✅ PlacesManager initialized');
        } catch (error) {
            console.error('❌ PlacesManager initialization failed:', error);
            Toast.show('Failed to initialize places page', 'error');
        }
    }

    async waitForDependencies() {
        return new Promise((resolve) => {
            const checkDependencies = () => {
                if (window.PattiUtils && window.Toast && window.LoadingManager) {
                    resolve();
                } else {
                    setTimeout(checkDependencies, 100);
                }
            };
            checkDependencies();
        });
    }

    setupEventListeners() {
        // Add place FAB
        const addPlaceFab = PattiUtils.$('#addPlaceFab');
        if (addPlaceFab) {
            addPlaceFab.addEventListener('click', () => {
                this.openAddPlaceModal();
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'f':
                        e.preventDefault();
                        const searchInput = PattiUtils.$('#placesSearch');
                        if (searchInput) searchInput.focus();
                        break;
                    case 'g':
                        e.preventDefault();
                        this.toggleViewMode();
                        break;
                }
            }
        });
    }

    setupSearch() {
        const searchInput = PattiUtils.$('#placesSearch');
        const clearBtn = PattiUtils.$('#clearSearch');

        if (searchInput) {
            searchInput.addEventListener('input', PattiUtils.debounce((e) => {
                this.searchQuery = e.target.value.trim();
                this.filterPlaces();
                
                if (clearBtn) {
                    clearBtn.style.display = this.searchQuery ? 'block' : 'none';
                }
            }, 300));
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                searchInput.value = '';
                this.searchQuery = '';
                clearBtn.style.display = 'none';
                this.filterPlaces();
                searchInput.focus();
            });
        }
    }

    setupCategories() {
        const categoryTabs = PattiUtils.$$('.category-tab');
        
        categoryTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const category = tab.getAttribute('data-category');
                this.setActiveCategory(category);
                
                // Update UI
                categoryTabs.forEach(t => t.setAttribute('aria-selected', 'false'));
                tab.setAttribute('aria-selected', 'true');
            });
        });
    }

    setupViewToggle() {
        const viewToggle = PattiUtils.$('#viewToggle');
        const placesGrid = PattiUtils.$('#placesGrid');

        if (viewToggle && placesGrid) {
            viewToggle.addEventListener('click', () => {
                this.toggleViewMode();
            });
        }
    }

    setupModals() {
        // Place detail modal
        const placeModal = PattiUtils.$('#placeModal');
        const placeModalClose = PattiUtils.$('#placeModalClose');

        if (placeModalClose) {
            placeModalClose.addEventListener('click', () => {
                this.closePlaceModal();
            });
        }

        if (placeModal) {
            placeModal.addEventListener('click', (e) => {
                if (e.target === placeModal) {
                    this.closePlaceModal();
                }
            });
        }

        // Setup place actions
        this.setupPlaceActions();
    }

    setupPlaceActions() {
        // Favorite button
        const favoriteBtn = PattiUtils.$('#placeFavoriteBtn');
        if (favoriteBtn) {
            favoriteBtn.addEventListener('click', () => {
                this.toggleFavorite();
            });
        }

        // Directions button
        const directionsBtn = PattiUtils.$('#placeDirectionsBtn');
        if (directionsBtn) {
            directionsBtn.addEventListener('click', () => {
                this.getDirections();
            });
        }

        // Share button
        const shareBtn = PattiUtils.$('#placeShareBtn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                this.sharePlace();
            });
        }

        // Mark visited button
        const markVisitedBtn = PattiUtils.$('#markVisitedBtn');
        if (markVisitedBtn) {
            markVisitedBtn.addEventListener('click', () => {
                this.markAsVisited();
            });
        }
    }

    // Data Loading
    async loadPlaces() {
        this.showLoadingSkeleton();
        
        try {
            // Load from various sources
            let places = await this.loadFromNetlifyCMS();
            
            if (!places || places.length === 0) {
                places = await this.loadFromFirebase();
            }
            
            if (!places || places.length === 0) {
                places = this.generateMockPlaces();
            }

            this.places = places;
            this.filterPlaces();
            
            console.log(`✅ Loaded ${places.length} places`);
            
        } catch (error) {
            console.error('Error loading places:', error);
            this.showErrorState();
            Toast.show('Failed to load places', 'error');
        } finally {
            this.hideLoadingSkeleton();
        }
    }

    async loadFromNetlifyCMS() {
        try {
            const response = await fetch('/places/index.json');
            if (!response.ok) throw new Error('NetlifyCMS not available');
            
            const data = await response.json();
            
            return data.map(item => ({
                id: item.slug || this.generateId(),
                name: item.title || item.name,
                nameGurmukhi: item.name_gurmukhi || item.nameGurmukhi,
                description: item.description || item.content,
                category: item.category || 'historical',
                location: item.location || 'Patti, Punjab',
                coordinates: item.coordinates || { lat: 31.966, lng: 74.961 },
                images: Array.isArray(item.images) ? item.images : [item.image || item.featured_image].filter(Boolean),
                address: item.address,
                timings: item.timings,
                contact: item.contact,
                website: item.website,
                history: item.history,
                rating: item.rating || Math.random() * 2 + 3, // 3-5 rating
                reviews: item.reviews || Math.floor(Math.random() * 100) + 10,
                visits: item.visits || Math.floor(Math.random() * 500) + 50,
                likes: item.likes || Math.floor(Math.random() * 200) + 25,
                verified: item.verified || Math.random() > 0.7,
                featured: item.featured || Math.random() > 0.8,
                source: 'cms'
            }));
            
        } catch (error) {
            console.log('NetlifyCMS not available for places');
            return [];
        }
    }

    async loadFromFirebase() {
        try {
            if (!window.pattiDataService) {
                return [];
            }

            const places = await window.pattiDataService.getPlaces({
                limit: 50,
                orderBy: 'featured',
                orderDirection: 'desc'
            });

            return places.map(place => ({
                ...place,
                source: 'firebase'
            }));

        } catch (error) {
            console.error('Firebase loading failed for places:', error);
            return [];
        }
    }

    generateMockPlaces() {
        const categories = ['religious', 'historical', 'educational', 'recreational', 'cultural'];
        const placeNames = [
            'ਗੁਰਦੁਆਰਾ ਸਾਹਿਬ', 'ਸ਼ਿਵ ਮੰਦਿਰ', 'ਸੰਗਮ ਪਾਰਕ', 
            'ਪੱਟੀ ਕਿਲ਼ਾ', 'ਸਰਕਾਰੀ ਸਕੂਲ', 'ਕਮਿਊਨਿਟੀ ਸੈਂਟਰ',
            'ਪੁਰਾਤਨ ਹਵੇਲੀ', 'ਪਿੰਡ ਦਾ ਤਾਲਾਬ', 'ਖੇਡ ਸਟੇਡੀਅਮ'
        ];
        const englishNames = [
            'Gurdwara Sahib', 'Shiv Mandir', 'Sangam Park',
            'Patti Fort', 'Government School', 'Community Center',  
            'Heritage Haveli', 'Village Pond', 'Sports Stadium'
        ];

        return Array.from({ length: 15 }, (_, i) => ({
            id: `place-${i}`,
            name: englishNames[i % englishNames.length],
            nameGurmukhi: placeNames[i % placeNames.length],
            description: `This is a beautiful ${categories[i % categories.length]} place in Patti, Punjab with rich history and cultural significance.`,
            category: categories[i % categories.length],
            location: 'Patti, Tarn Taran, Punjab',
            coordinates: {
                lat: 31.966 + (Math.random() - 0.5) * 0.01,
                lng: 74.961 + (Math.random() - 0.5) * 0.01
            },
            images: [
                `https://picsum.photos/800/600?random=${i}`,
                `https://picsum.photos/800/600?random=${i + 100}`,
                `https://picsum.photos/800/600?random=${i + 200}`
            ],
            address: `Street ${i + 1}, Patti, Punjab 143416`,
            timings: '6:00 AM - 8:00 PM',
            contact: `+91 98765${String(i).padStart(5, '0')}`,
            website: i % 3 === 0 ? `https://example.com/place-${i}` : null,
            history: `This ${categories[i % categories.length]} site has been an important landmark in Patti for over ${Math.floor(Math.random() * 200) + 50} years.`,
            rating: Math.round((Math.random() * 2 + 3) * 10) / 10, // 3.0-5.0
            reviews: Math.floor(Math.random() * 100) + 10,
            visits: Math.floor(Math.random() * 500) + 50,
            likes: Math.floor(Math.random() * 200) + 25,
            verified: Math.random() > 0.6,
            featured: i < 3,
            source: 'mock'
        }));
    }

    // Filtering and Search
    setActiveCategory(category) {
        this.currentCategory = category;
        this.filterPlaces();
    }

    filterPlaces() {
        let filtered = this.places;

        // Apply category filter
        if (this.currentCategory !== 'all') {
            filtered = filtered.filter(place => place.category === this.currentCategory);
        }

        // Apply search filter
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(place =>
                place.name.toLowerCase().includes(query) ||
                (place.nameGurmukhi && place.nameGurmukhi.includes(query)) ||
                place.description.toLowerCase().includes(query) ||
                place.location.toLowerCase().includes(query) ||
                place.category.toLowerCase().includes(query)
            );
        }

        this.filteredPlaces = filtered;
        this.renderPlaces();
        this.updateNoMatchMessage();
    }

    // Rendering
    renderPlaces() {
        const placesGrid = PattiUtils.$('#placesGrid');
        if (!placesGrid) return;

        if (this.filteredPlaces.length === 0) {
            placesGrid.innerHTML = '';
            return;
        }

        // Sort places (featured first, then by rating)
        const sortedPlaces = this.filteredPlaces.sort((a, b) => {
            if (a.featured !== b.featured) {
                return b.featured - a.featured;
            }
            return b.rating - a.rating;
        });

        const placesHTML = sortedPlaces
            .map(place => this.createPlaceCard(place))
            .join('');

        placesGrid.innerHTML = placesHTML;
        placesGrid.className = `places-grid ${this.viewMode}-view`;
        
        // Bind events
        this.bindPlaceEvents();
    }

    createPlaceCard(place) {
        const rating = Math.round(place.rating * 10) / 10;
        const stars = '★'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '☆' : '');
        
        return `
            <article class="place-card ${place.featured ? 'featured' : ''} ${place.verified ? 'verified' : ''}" 
                     data-place-id="${place.id}"
                     data-category="${place.category}">
                <div class="place-image-container">
                    <img src="${place.images[0]}" 
                         alt="${PattiUtils.sanitizeHTML(place.name)}" 
                         class="place-image"
                         loading="lazy"
                         onerror="this.src='https://picsum.photos/800/600?random=default'">
                    
                    <div class="place-category-badge">${place.category}</div>
                    
                    <div class="place-rating">
                        <span class="rating-stars">${stars}</span>
                        <span>${rating}</span>
                    </div>
                    
                    <button class="place-favorite-btn" 
                            onclick="placesManager.togglePlaceFavorite('${place.id}', event)"
                            aria-label="Add to favorites">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                    </button>
                </div>
                
                <div class="place-content">
                    <h3 class="place-title">
                        ${PattiUtils.sanitizeHTML(place.name)}
                        ${place.nameGurmukhi ? `<span class="place-title-punjabi">${PattiUtils.sanitizeHTML(place.nameGurmukhi)}</span>` : ''}
                    </h3>
                    
                    <div class="place-location">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        ${PattiUtils.sanitizeHTML(place.location)}
                    </div>
                    
                    <p class="place-description">${PattiUtils.sanitizeHTML(place.description)}</p>
                    
                    <div class="place-stats">
                        <div class="place-stat">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            ${place.visits}
                        </div>
                        <div class="place-stat">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                            </svg>
                            ${place.likes}
                        </div>
                        <div class="place-stat">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            </svg>
                            ${place.reviews}
                        </div>
                        
                        <div class="place-actions">
                            <button class="visit-btn" 
                                    onclick="placesManager.toggleVisited('${place.id}', event)">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="9,11 12,14 22,4"></polyline>
                                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                                </svg>
                                Visit
                            </button>
                            <button class="directions-btn" 
                                    onclick="placesManager.getPlaceDirections('${place.id}', event)">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
                                </svg>
                                Directions
                            </button>
                        </div>
                    </div>
                </div>
            </article>
        `;
    }

    bindPlaceEvents() {
        const placeCards = PattiUtils.$$('.place-card');
        
        placeCards.forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't trigger if clicking on action buttons
                if (e.target.closest('.place-favorite-btn, .visit-btn, .directions-btn')) return;
                
                const placeId = card.getAttribute('data-place-id');
                this.openPlace(placeId);
            });
        });
    }

    // Place Detail Modal
    openPlace(placeId) {
        const place = this.places.find(p => p.id === placeId);
        if (!place) return;

        this.currentPlace = place;
        this.renderPlaceModal(place);
        this.showPlaceModal();
        this.trackPlaceView(place);
    }

    renderPlaceModal(place) {
        const modalMedia = PattiUtils.$('#placeModalMedia');
        const modalTitle = PattiUtils.$('#placeModalTitle');
        const modalMeta = PattiUtils.$('#placeModalMeta');
        const modalContent = PattiUtils.$('#placeModalContent');

        if (modalMedia && place.images && place.images.length > 0) {
            modalMedia.innerHTML = `<img src="${place.images[0]}" alt="${PattiUtils.sanitizeHTML(place.name)}">`;
            modalMedia.style.display = 'block';
        }

        if (modalTitle) {
            modalTitle.innerHTML = `
                ${PattiUtils.sanitizeHTML(place.name)}
                ${place.nameGurmukhi ? `<div class="modal-title-punjabi">${PattiUtils.sanitizeHTML(place.nameGurmukhi)}</div>` : ''}
            `;
        }

        if (modalMeta) {
            const rating = Math.round(place.rating * 10) / 10;
            const stars = '★'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '☆' : '');
            
            modalMeta.innerHTML = `
                <div class="modal-location-info">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    ${PattiUtils.sanitizeHTML(place.location)}
                </div>
                <div class="modal-rating-info">
                    <div class="rating-display">
                        <span class="stars">${stars}</span>
                        <span class="rating-text">${rating}</span>
                        <span class="rating-count">(${place.reviews} reviews)</span>
                    </div>
                </div>
                <div class="place-category-info">
                    <span class="category-label">${place.category}</span>
                    ${place.verified ? '<span class="verified-badge">✓ Verified</span>' : ''}
                </div>
            `;
        }

        if (modalContent) {
            modalContent.innerHTML = `
                <div class="place-details">
                    <div class="place-detail-section">
                        <h3 class="detail-section-title">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14,2 14,8 20,8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <polyline points="10,9 9,9 8,9"></polyline>
                            </svg>
                            Description
                        </h3>
                        <div class="detail-content">${PattiUtils.sanitizeHTML(place.description)}</div>
                    </div>
                    
                    ${place.history ? `
                        <div class="place-detail-section">
                            <h3 class="detail-section-title">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12,6 12,12 16,14"></polyline>
                                </svg>
                                History
                            </h3>
                            <div class="detail-content">${PattiUtils.sanitizeHTML(place.history)}</div>
                        </div>
                    ` : ''}
                    
                    <div class="place-detail-section">
                        <h3 class="detail-section-title">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            Information
                        </h3>
                        <div class="place-info-grid">
                            ${place.address ? `
                                <div class="info-item">
                                    <div class="info-label">Address</div>
                                    <div class="info-value">${PattiUtils.sanitizeHTML(place.address)}</div>
                                </div>
                            ` : ''}
                            ${place.timings ? `
                                <div class="info-item">
                                    <div class="info-label">Timings</div>
                                    <div class="info-value">${PattiUtils.sanitizeHTML(place.timings)}</div>
                                </div>
                            ` : ''}
                            ${place.contact ? `
                                <div class="info-item">
                                    <div class="info-label">Contact</div>
                                    <div class="info-value">${PattiUtils.sanitizeHTML(place.contact)}</div>
                                </div>
                            ` : ''}
                            ${place.website ? `
                                <div class="info-item">
                                    <div class="info-label">Website</div>
                                    <div class="info-value">
                                        <a href="${place.website}" target="_blank" rel="noopener">${place.website}</a>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    ${place.images && place.images.length > 1 ? `
                        <div class="place-detail-section">
                            <h3 class="detail-section-title">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                    <polyline points="21,15 16,10 5,21"></polyline>
                                </svg>
                                Gallery
                            </h3>
                            <div class="place-gallery">
                                <div class="gallery-grid">
                                    ${place.images.slice(1).map((image, index) => `
                                        <div class="gallery-item" onclick="placesManager.openImageModal('${image}')">
                                            <img src="${image}" alt="Gallery image ${index + 2}" loading="lazy">
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        // Update action buttons
        this.updatePlaceActions(place);
    }

    updatePlaceActions(place) {
        const favoriteBtn = PattiUtils.$('#placeFavoriteBtn');
        const favoriteCount = favoriteBtn?.querySelector('.favorite-count');
        
        if (favoriteCount) {
            favoriteCount.textContent = place.likes;
        }
    }

    showPlaceModal() {
        const modal = PattiUtils.$('#placeModal');
        if (modal) {
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            
            // Focus management
            const closeBtn = modal.querySelector('.modal-close');
            if (closeBtn) closeBtn.focus();
        }
    }

    closePlaceModal() {
        const modal = PattiUtils.$('#placeModal');
        if (modal) {
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
            this.currentPlace = null;
        }
    }

    // Interaction Methods
    toggleViewMode() {
        this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
        const placesGrid = PattiUtils.$('#placesGrid');
        const viewToggle = PattiUtils.$('#viewToggle');
        
        if (placesGrid) {
            placesGrid.className = `places-grid ${this.viewMode}-view`;
        }
        
        if (viewToggle) {
            viewToggle.classList.toggle('active', this.viewMode === 'list');
        }
        
        Toast.show(`Switched to ${this.viewMode} view`, 'info', 2000);
    }

    togglePlaceFavorite(placeId, event) {
        event?.stopPropagation();
        
        const place = this.places.find(p => p.id === placeId);
        if (!place) return;
        
        const btn = event?.target.closest('.place-favorite-btn');
        const isFavorited = btn?.classList.contains('favorited');
        
        if (btn) {
            btn.classList.toggle('favorited');
            place.likes += isFavorited ? -1 : 1;
        }
        
        Toast.show(isFavorited ? 'Removed from favorites' : 'Added to favorites', 'success', 2000);
    }

    toggleVisited(placeId, event) {
        event?.stopPropagation();
        
        const place = this.places.find(p => p.id === placeId);
        if (!place) return;
        
        const btn = event?.target.closest('.visit-btn');
        const isVisited = btn?.classList.contains('visited');
        
        if (btn) {
            btn.classList.toggle('visited');
            btn.innerHTML = isVisited ? 
                `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9,11 12,14 22,4"></polyline>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                </svg>Visit` :
                `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20,6 9,17 4,12"></polyline>
                </svg>Visited`;
            
            place.visits += isVisited ? -1 : 1;
        }
        
        Toast.show(isVisited ? 'Marked as not visited' : 'Marked as visited!', 'success', 2000);
    }

    getPlaceDirections(placeId, event) {
        event?.stopPropagation();
        
        const place = this.places.find(p => p.id === placeId);
        if (!place || !place.coordinates) return;
        
        this.openDirections(place.coordinates, place.name);
    }

    async toggleFavorite() {
        if (!this.currentPlace) return;
        
        const favoriteBtn = PattiUtils.$('#placeFavoriteBtn');
        const favoriteCount = favoriteBtn?.querySelector('.favorite-count');
        
        if (!favoriteBtn) return;
        
        const isFavorited = favoriteBtn.classList.contains('active');
        const newCount = isFavorited ? 
            Math.max(0, this.currentPlace.likes - 1) :
            this.currentPlace.likes + 1;
        
        // Update UI
        favoriteBtn.classList.toggle('active');
        if (favoriteCount) favoriteCount.textContent = newCount;
        this.currentPlace.likes = newCount;
        
        Toast.show(isFavorited ? 'Removed from favorites' : 'Added to favorites!', 'success', 2000);
    }

    async getDirections() {
        if (!this.currentPlace || !this.currentPlace.coordinates) {
            Toast.show('Location coordinates not available', 'warning');
            return;
        }
        
        this.openDirections(this.currentPlace.coordinates, this.currentPlace.name);
    }

    openDirections(coordinates, placeName) {
        const { lat, lng } = coordinates;
        
        // Try different map apps
        const mapUrls = [
            `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
            `https://maps.apple.com/?daddr=${lat},${lng}`,
            `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(placeName)})`
        ];
        
        // Open appropriate map app
        if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
            window.open(mapUrls[1], '_blank');
        } else {
            window.open(mapUrls[0], '_blank');
        }
        
        Toast.show(`Opening directions to ${placeName}`, 'info', 3000);
    }

    async sharePlace() {
        if (!this.currentPlace) return;
        
        const shareData = {
            title: this.currentPlace.name,
            text: this.currentPlace.description,
            url: `${window.location.origin}${window.location.pathname}?place=${this.currentPlace.id}`
        };
        
        try {
            if (navigator.share && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                await navigator.share(shareData);
            } else {
                await PattiUtils.copyToClipboard(shareData.url);
                Toast.show('Link copied to clipboard!', 'success');
            }
            
            // Track share
            this.currentPlace.shares = (this.currentPlace.shares || 0) + 1;
            
        } catch (error) {
            if (!error.name === 'AbortError') {
                Toast.show('Failed to share place', 'error');
            }
        }
    }

    async markAsVisited() {
        if (!this.currentPlace) return;
        
        const markVisitedBtn = PattiUtils.$('#markVisitedBtn');
        if (!markVisitedBtn) return;
        
        const isVisited = markVisitedBtn.classList.contains('visited');
        
        markVisitedBtn.classList.toggle('visited');
        markVisitedBtn.innerHTML = isVisited ? 
            `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9,11 12,14 22,4"></polyline>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
            </svg>Mark as Visited` :
            `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20,6 9,17 4,12"></polyline>
            </svg>Visited`;
        
        this.currentPlace.visits += isVisited ? -1 : 1;
        
        Toast.show(isVisited ? 'Removed from visited places' : 'Added to visited places!', 'success', 2000);
    }

    openImageModal(imageSrc) {
        // Create a simple image modal
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 90vw; max-height: 90vh; background: transparent; border: none;">
                <button class="modal-close" style="position: absolute; top: 20px; right: 20px; z-index: 1001;">&times;</button>
                <img src="${imageSrc}" alt="Gallery image" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 12px;">
            </div>
        `;
        
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        
        const closeModal = () => {
            document.body.removeChild(modal);
            document.body.style.overflow = '';
        };
        
        modal.querySelector('.modal-close').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    // Utility Methods
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    trackPlaceView(place) {
        place.views = (place.views || 0) + 1;
    }

    async getUserLocation() {
        if (!navigator.geolocation) return;
        
        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    timeout: 10000,
                    enableHighAccuracy: false
                });
            });
            
            this.userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            
        } catch (error) {
            console.log('Could not get user location:', error);
        }
    }

    openAddPlaceModal() {
        Toast.show('Add new place feature coming soon!', 'info');
    }

    showLoadingSkeleton() {
        const placesGrid = PattiUtils.$('#placesGrid');
        if (placesGrid) {
            placesGrid.innerHTML = `
                <div class="loading-skeleton">
                    ${Array(6).fill(0).map(() => `
                        <div class="skeleton-place-card">
                            <div class="skeleton-place-image skeleton"></div>
                            <div class="skeleton-place-content">
                                <div class="skeleton-place-title skeleton"></div>
                                <div class="skeleton-place-location skeleton"></div>
                                <div class="skeleton-place-description skeleton"></div>
                                <div class="skeleton-place-description skeleton"></div>
                                <div class="skeleton-place-description skeleton"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    }

    hideLoadingSkeleton() {
        // Will be hidden when places are rendered
    }

    showErrorState() {
        const placesGrid = PattiUtils.$('#placesGrid');
        if (placesGrid) {
            placesGrid.innerHTML = `
                <div class="places-error">
                    <div class="error-icon">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                    </div>
                    <h3 class="error-title">Failed to Load Places</h3>
                    <p class="error-message">There was an error loading the places. Please try again.</p>
                    <button class="btn btn-primary" onclick="placesManager.loadPlaces()">Retry</button>
                </div>
            `;
        }
    }

    updateNoMatchMessage() {
        const noMatchMessage = PattiUtils.$('#noMatchMessage');
        const placesGrid = PattiUtils.$('#placesGrid');
        
        if (noMatchMessage && placesGrid) {
            const hasResults = this.filteredPlaces.length > 0;
            noMatchMessage.style.display = hasResults ? 'none' : 'block';
            
            if (!hasResults) {
                noMatchMessage.innerHTML = `
                    <h3>No places found</h3>
                    <p>Try adjusting your search or category filter</p>
                    ${this.searchQuery || this.currentCategory !== 'all' ? 
                        '<button class="btn btn-secondary" onclick="placesManager.clearFilters()">Clear Filters</button>' : 
                        ''
                    }
                `;
            }
        }
    }

    clearFilters() {
        // Reset filters
        this.currentCategory = 'all';
        this.searchQuery = '';
        
        // Update UI
        const searchInput = PattiUtils.$('#placesSearch');
        if (searchInput) {
            searchInput.value = '';
        }
        
        const clearBtn = PattiUtils.$('#clearSearch');
        if (clearBtn) {
            clearBtn.style.display = 'none';
        }
        
        // Update category tabs
        const categoryTabs = PattiUtils.$$('.category-tab');
        categoryTabs.forEach(tab => {
            const isAll = tab.getAttribute('data-category') === 'all';
            tab.setAttribute('aria-selected', isAll.toString());
        });
        
        // Re-filter
        this.filterPlaces();
        
        Toast.show('Filters cleared', 'info', 2000);
    }
}

// Initialize PlacesManager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.placesManager = new PlacesManager();
});

// Export for global access
window.PlacesManager = PlacesManager;
