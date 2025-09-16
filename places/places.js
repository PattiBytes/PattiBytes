// Enhanced places.js with instant responses, proper navigation, and GTranslate support
(function () {
  "use strict";

  // Utilities
  const q = (s, c = document) => (c || document).querySelector(s);
  const qa = (s, c = document) => Array.from((c || document).querySelectorAll(s));

  // Enhanced loading state management
  const LoadingManager = {
    states: new Map(),
    
    show(key, element = null, message = 'Loading...') {
      this.hide(key); // Remove existing loader
      
      const loader = document.createElement('div');
      loader.className = 'dynamic-loader';
      loader.innerHTML = `
        <div class="loader-content">
          <div class="loader-spinner"></div>
          <span class="loader-message">${message}</span>
        </div>
      `;
      
      if (element) {
        element.appendChild(loader);
      } else {
        document.body.appendChild(loader);
      }
      
      this.states.set(key, loader);
      return loader;
    },
    
    hide(key) {
      const loader = this.states.get(key);
      if (loader && loader.parentNode) {
        loader.remove();
        this.states.delete(key);
      }
    },
    
    update(key, message) {
      const loader = this.states.get(key);
      if (loader) {
        const messageEl = loader.querySelector('.loader-message');
        if (messageEl) messageEl.textContent = message;
      }
    }
  };

  // Enhanced error handler
  const ErrorHandler = {
    show(message, context = '', action = null) {
      console.error(`[Places.js] ${context}:`, message);
      
      const errorEl = document.createElement('div');
      errorEl.className = 'error-notification';
      errorEl.innerHTML = `
        <div class="error-content">
          <span class="error-icon">⚠️</span>
          <div class="error-details">
            <div class="error-message">${message}</div>
            ${context ? `<div class="error-context">${context}</div>` : ''}
            ${action ? `<button class="error-action">${action.text}</button>` : ''}
          </div>
          <button class="error-close" aria-label="Close error">✕</button>
        </div>
      `;
      
      document.body.appendChild(errorEl);
      
      // Auto-remove after 8 seconds
      setTimeout(() => {
        if (errorEl.parentNode) errorEl.remove();
      }, 8000);
      
      // Event listeners
      errorEl.querySelector('.error-close').addEventListener('click', () => errorEl.remove());
      
      if (action) {
        errorEl.querySelector('.error-action').addEventListener('click', () => {
          action.callback();
          errorEl.remove();
        });
      }
      
      return errorEl;
    }
  };

  // Normalize text: remove accents, lower case, handle special characters
  const norm = (s) => (s || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Enhanced Punjabi to Roman transliteration
  const paToRoman = (txt) => (txt || '')
    .replace(/[ਅਆ]/g, 'a').replace(/[ਇਈ]/g, 'i').replace(/[ਉਊ]/g, 'u')
    .replace(/[ਏਐ]/g, 'e').replace(/[ਓਔ]/g, 'o').replace(/[ਂੰ]/g, 'n')
    .replace(/[ਕਖਗਘ]/g, 'k').replace(/[ਙ]/g, 'ng').replace(/[ਚਛਜਝ]/g, 'ch')
    .replace(/[ਞ]/g, 'nj').replace(/[ਟਠਡਢ]/g, 't').replace(/[ਣਨ]/g, 'n')
    .replace(/[ਤਥਦਧ]/g, 'd').replace(/[ਪਫਬਭ]/g, 'p').replace(/[ਮ]/g, 'm')
    .replace(/[ਯ]/g, 'y').replace(/[ਰ]/g, 'r').replace(/[ਲਵ]/g, 'l')
    .replace(/[ਸਸ਼]/g, 's').replace(/[ਹ]/g, 'h').replace(/[ੜ]/g, 'r')
    .replace(/[ਜ਼]/g, 'z').replace(/[ਫ਼]/g, 'f').replace(/[ਖ਼]/g, 'kh')
    .replace(/[ਗ਼]/g, 'gh').replace(/[ੱ]/g, '').replace(/[੍]/g, '');

  // Comprehensive English to Punjabi mapping
  const enToPunjabi = {
    'gurdwara': 'ਗੁਰਦੁਆਰਾ', 'gurudwara': 'ਗੁਰਦੁਆਰਾ', 'gurudrawa': 'ਗੁਰਦੁਆਰਾ',
    'temple': 'ਮੰਦਿਰ', 'mandir': 'ਮੰਦਿਰ', 'mosque': 'ਮਸਜਿਦ', 'masjid': 'ਮਸਜਿਦ',
    'church': 'ਗਿਰਜਾ', 'girja': 'ਗਿਰਜਾ', 'school': 'ਸਕੂਲ', 'college': 'ਕਾਲਜ', 
    'university': 'ਯੂਨੀਵਰਸਿਟੀ', 'hospital': 'ਹਸਪਤਾਲ', 'clinic': 'ਕਲੀਨਿਕ',
    'market': 'ਮਾਰਕੀਟ', 'bazaar': 'ਬਜ਼ਾਰ', 'shop': 'ਦੁਕਾਨ', 'mall': 'ਮਾਲ',
    'park': 'ਪਾਰਕ', 'garden': 'ਬਗੀਚਾ', 'playground': 'ਖੇਡ ਮੈਦਾਨ',
    'station': 'ਸਟੇਸ਼ਨ', 'bus': 'ਬੱਸ', 'railway': 'ਰੇਲਵੇ', 'airport': 'ਏਅਰਪੋਰਟ',
    'river': 'ਨਦੀ', 'canal': 'ਨਹਿਰ', 'pond': 'ਤਲਾਬ', 'lake': 'ਝੀਲ',
    'village': 'ਪਿੰਡ', 'city': 'ਸ਼ਹਿਰ', 'town': 'ਕਸਬਾ', 'district': 'ਜਿਲ੍ਹਾ',
    'place': 'ਸਥਾਨ', 'location': 'ਜਗ੍ਹਾ', 'area': 'ਇਲਾਕਾ', 'famous': 'ਮਸ਼ਹੂਰ',
    'popular': 'ਪ੍ਰਸਿੱਧ', 'old': 'ਪੁਰਾਣਾ', 'new': 'ਨਵਾਂ', 'big': 'ਵੱਡਾ',
    'history': 'ਇਤਿਹਾਸ', 'heritage': 'ਵਿਰਾਸਤ', 'culture': 'ਸੱਭਿਆਚਾਰ',
    'singh': 'ਸਿੰਘ', 'kaur': 'ਕੌਰ', 'guru': 'ਗੁਰੂ', 'sahib': 'ਸਾਹਿਬ'
  };

  // State management
  let modalStack = [];
  let currentModalId = null;
  let scrollPositions = new Map();
  let isInitialLoad = true;
  let gtranslateReady = false;

  // UI elements
  let modal, modalMedia, modalText, btnClose, modalContent, cards;
  let searchInput, clearSearch, noMatchEl, placesGrid;
  let searchIndex = [];
  let currentIndex = -1;
  let lastFocusedElement = null;
  let modalOpen = false;

  // TTS State
  let ttsState = {
    isActive: false,
    isPaused: false,
    currentUtterance: null,
    currentSegment: 0,
    segments: [],
    settings: { rate: 1.0, pitch: 1.0, voice: null }
  };

  // Enhanced clipboard functionality
  async function copyToClipboard(text) {
    if (!text) throw new Error('No text provided');
    
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (error) {
      console.warn('Modern clipboard API failed:', error);
    }
    
    return new Promise((resolve, reject) => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;';
      document.body.appendChild(textarea);
      
      try {
        textarea.select();
        textarea.setSelectionRange(0, text.length);
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        successful ? resolve(true) : reject(new Error('Copy failed'));
      } catch (error) {
        document.body.removeChild(textarea);
        reject(error);
      }
    });
  }

  // Enhanced notification system
  function showNotification(message, type = 'info', duration = 4000) {
    qa(`.notification-${type}`).forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.setAttribute('role', 'alert');
    notification.innerHTML = `
      <span class="notification-message">${message}</span>
      <button class="notification-close" aria-label="Close">&times;</button>
    `;
    
    document.body.appendChild(notification);
    requestAnimationFrame(() => notification.classList.add('show'));

    const closeNotification = () => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    };

    notification.querySelector('.notification-close').addEventListener('click', closeNotification);
    if (duration > 0) setTimeout(closeNotification, duration);
    
    return closeNotification;
  }

  // Enhanced language detection
  function detectLanguage(text, minLength = 100) {
    if (!text || text.length < 10) return { language: 'unknown', confidence: 0 };
    
    const cleanText = text.replace(/[^\w\s\u0A00-\u0A7F]/g, ' ').trim();
    const totalChars = cleanText.length;
    
    if (totalChars < minLength) {
      return { language: 'insufficient', confidence: 0, suggestion: 'en' };
    }

    const punjabiFactor = (cleanText.match(/[\u0A00-\u0A7F]/g) || []).length / totalChars;
    const englishFactor = (cleanText.match(/[a-zA-Z]/g) || []).length / totalChars;
    const hindiDevanagari = (cleanText.match(/[\u0900-\u097F]/g) || []).length / totalChars;
    
    if (punjabiFactor > 0.4) return { language: 'pa', confidence: punjabiFactor };
    if (hindiDevanagari > 0.3) return { language: 'hi', confidence: hindiDevanagari };
    if (englishFactor > 0.6) return { language: 'en', confidence: englishFactor };
    
    return { language: 'en', confidence: englishFactor, fallback: true };
  }

  // Advanced TTS with instant response
  class AdvancedTTS {
    constructor() {
      this.synth = window.speechSynthesis;
      this.voices = [];
      this.isSupported = !!this.synth;
      this.isPlaying = false;
      this.isPaused = false;
      this.currentUtterance = null;
      this.settings = { rate: 1.0, pitch: 1.0, voice: null };
      this.callbacks = {};
      
      this.init();
    }

    async init() {
      if (!this.isSupported) return;
      await this.loadVoices();
      
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }

    async loadVoices(retries = 5) {
      for (let i = 0; i < retries; i++) {
        this.voices = this.synth?.getVoices() || [];
        if (this.voices.length > 0) break;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      return this.voices;
    }

    // Instant settings update without stopping current speech
    updateSettings(newSettings) {
      const wasPlaying = this.isPlaying;
      const currentPosition = ttsState.currentSegment;
      
      // Update settings
      Object.assign(this.settings, newSettings);
      
      // If playing, apply changes immediately
      if (wasPlaying && this.currentUtterance) {
        // Cancel current utterance
        this.synth.cancel();
        
        // Resume from current position with new settings
        setTimeout(() => {
          if (wasPlaying) {
            this.resumeFromSegment(currentPosition);
          }
        }, 50);
      }
    }

    resumeFromSegment(segmentIndex) {
      if (segmentIndex < ttsState.segments.length) {
        ttsState.currentSegment = segmentIndex;
        this.speakCurrentSegment();
      }
    }

    speakCurrentSegment() {
      if (ttsState.currentSegment >= ttsState.segments.length) {
        this.stop();
        return;
      }

      const segment = ttsState.segments[ttsState.currentSegment];
      const utterance = new SpeechSynthesisUtterance(this.cleanText(segment.text));
      
      // Apply current settings
      utterance.rate = this.settings.rate;
      utterance.pitch = this.settings.pitch;
      utterance.volume = 1.0;
      
      if (this.settings.voice) {
        utterance.voice = this.settings.voice;
      }

      utterance.onstart = () => {
        this.isPlaying = true;
        this.currentUtterance = utterance;
        this.highlightSegment(ttsState.currentSegment);
        this.callbacks.onStart?.(ttsState.currentSegment);
      };

      utterance.onend = () => {
        ttsState.currentSegment++;
        if (ttsState.currentSegment < ttsState.segments.length && this.isPlaying) {
          setTimeout(() => this.speakCurrentSegment(), 100);
        } else {
          this.stop();
        }
      };

      utterance.onerror = (error) => {
        ErrorHandler.show('Speech synthesis error', error.error);
        this.callbacks.onError?.(error);
      };

      this.synth.speak(utterance);
    }

    cleanText(text) {
      return text
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}]/gu, ' ')
        .replace(/https?:\/\/[^\s]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    highlightSegment(index) {
      qa('.tts-highlight').forEach(el => el.classList.remove('tts-highlight'));
      
      if (index < ttsState.segments.length) {
        const segment = ttsState.segments[index];
        segment.element.classList.add('tts-highlight');
        this.scrollToElement(segment.element);
      }
    }

    scrollToElement(element) {
      const modalBody = q('.modal-body');
      if (modalBody && element) {
        const rect = element.getBoundingClientRect();
        const bodyRect = modalBody.getBoundingClientRect();
        const offset = rect.top - bodyRect.top + modalBody.scrollTop - 100;
        modalBody.scrollTo({ top: offset, behavior: 'smooth' });
      }
    }

    start(segments) {
      if (!this.isSupported || !segments.length) return;
      
      ttsState.segments = segments;
      ttsState.currentSegment = 0;
      this.isPlaying = true;
      this.speakCurrentSegment();
    }

    pause() {
      if (this.isSupported && this.isPlaying) {
        this.synth.pause();
        this.isPaused = true;
        this.callbacks.onPause?.();
      }
    }

    resume() {
      if (this.isSupported && this.isPaused) {
        this.synth.resume();
        this.isPaused = false;
        this.callbacks.onResume?.();
      }
    }

    stop() {
      if (this.isSupported) {
        this.synth.cancel();
        this.isPlaying = false;
        this.isPaused = false;
        this.currentUtterance = null;
        qa('.tts-highlight').forEach(el => el.classList.remove('tts-highlight'));
        this.callbacks.onStop?.();
      }
    }

    on(event, callback) {
      this.callbacks[event] = callback;
    }
  }

  const advancedTTS = new AdvancedTTS();

  // GTranslate integration
  function initGTranslate() {
    // Check if GTranslate is available
    if (typeof window.GTranslate !== 'undefined' || q('.gtranslate_wrapper')) {
      gtranslateReady = true;
      
      // Ensure modal content is translatable
      const observer = new MutationObserver(() => {
        const modalText = q('#modal-text');
        if (modalText && modalText.hasAttribute('translate') && modalText.getAttribute('translate') === 'no') {
          modalText.removeAttribute('translate');
          
          // Trigger retranslation if needed
          if (window.gtranslate && typeof window.gtranslate.translate === 'function') {
            setTimeout(() => {
              try {
                window.gtranslate.translate();
              } catch (e) {
                console.warn('GTranslate retranslation failed:', e);
              }
            }, 100);
          }
        }
      });
      
      observer.observe(document.body, { 
        childList: true, 
        subtree: true, 
        attributes: true, 
        attributeFilter: ['translate'] 
      });
    }
  }

  // Enhanced instant search with loading states
  function buildSearchIndex() {
    const loader = LoadingManager.show('search-index', null, 'Building search index...');
    
    try {
      searchIndex = cards.map(card => {
        const id = card.id || card.dataset.id || '';
        const title = card.dataset.title || card.querySelector('h3')?.textContent || '';
        const preview = card.dataset.preview || '';
        const fullContent = card.dataset.full || '';
        
        const searchTerms = [id, title, preview, fullContent].filter(Boolean).join(' ');
        const normalizedTerms = norm(searchTerms);
        const romanizedTerms = norm(paToRoman(searchTerms));
        
        // Add English translations
        let expandedTerms = searchTerms;
        Object.entries(enToPunjabi).forEach(([eng, pun]) => {
          if (searchTerms.includes(pun)) {
            expandedTerms += ` ${eng}`;
          }
        });
        
        const expandedNormalized = norm(expandedTerms);
        const expandedRomanized = norm(paToRoman(expandedTerms));
        
        return {
          element: card,
          id, title, preview,
          searchText: [normalizedTerms, romanizedTerms, expandedNormalized, expandedRomanized]
            .filter(Boolean).join(' ')
        };
      });
      
      LoadingManager.hide('search-index');
      console.log('Search index built:', searchIndex.length, 'items');
    } catch (error) {
      LoadingManager.hide('search-index');
      ErrorHandler.show('Failed to build search index', error.message, {
        text: 'Retry',
        callback: buildSearchIndex
      });
    }
  }

  // Instant search with debouncing and loading states
  function performSearch(query, showLoading = false) {
    if (showLoading) {
      LoadingManager.show('search', searchInput.parentNode, 'Searching...');
    }
    
    try {
      if (!query.trim()) {
        cards.forEach(card => card.style.display = '');
        updateSearchResults(cards.length);
        LoadingManager.hide('search');
        return cards.length;
      }

      let searchQuery = query.trim();
      
      // Expand English terms
      Object.entries(enToPunjabi).forEach(([eng, pun]) => {
        const regex = new RegExp(`\\b${eng}\\b`, 'gi');
        if (regex.test(searchQuery)) {
          searchQuery += ` ${pun}`;
        }
      });
      
      const normalizedQuery = norm(searchQuery);
      const romanizedQuery = norm(paToRoman(searchQuery));
      
      let visibleCount = 0;
      
      searchIndex.forEach(({ element, searchText }) => {
        const matches = searchText.includes(normalizedQuery) || 
                       searchText.includes(romanizedQuery) ||
                       normalizedQuery.split(' ').some(term => 
                         term.length > 2 && searchText.includes(term)
                       );
        
        element.style.display = matches ? '' : 'none';
        if (matches) visibleCount++;
      });
      
      updateSearchResults(visibleCount);
      LoadingManager.hide('search');
      return visibleCount;
      
    } catch (error) {
      LoadingManager.hide('search');
      ErrorHandler.show('Search failed', error.message);
      return 0;
    }
  }

  function updateSearchResults(count) {
    if (noMatchEl) {
      if (count === 0) {
        noMatchEl.style.display = 'block';
        noMatchEl.innerHTML = `
          <div>ਕੋਈ ਮਿਲਦਾ ਸਥਾਨ ਨਹੀਂ ਮਿਲਿਆ / No matching places found</div>
          <small>Try: gurdwara, school, hospital, market, park, village</small>
        `;
      } else {
        noMatchEl.style.display = 'none';
      }
    }
    
    if (clearSearch) {
      clearSearch.classList.toggle('visible', !!searchInput?.value.trim());
    }
  }

  // Enhanced table of contents with proper navigation
  function createTableOfContents(content) {
    const headings = qa('h1, h2, h3, h4, h5, h6', content);
    if (!headings.length) return null;

    const tocContainer = document.createElement('div');
    tocContainer.className = 'table-of-contents';
    tocContainer.style.display = 'none';
    tocContainer.setAttribute('role', 'navigation');
    tocContainer.setAttribute('aria-label', 'Table of contents');
    
    tocContainer.innerHTML = `
      <div class="toc-header">
        <h4 class="toc-title">ਸਮੱਗਰੀ / Contents</h4>
        <button class="toc-collapse" aria-label="Collapse table of contents" aria-expanded="true">−</button>
      </div>
      <ul class="toc-list" role="list"></ul>
    `;
    
    const tocList = tocContainer.querySelector('.toc-list');

    headings.forEach((heading, index) => {
      const headingId = `heading-${index}-${heading.textContent.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '-')}`;
      heading.id = headingId;
      heading.style.scrollMarginTop = '120px';
      
      const tocItem = document.createElement('li');
      tocItem.className = `toc-item toc-level-${heading.tagName.toLowerCase()}`;
      
      const tocLink = document.createElement('button');
      tocLink.textContent = heading.textContent;
      tocLink.className = 'toc-link';
      tocLink.setAttribute('aria-label', `Navigate to: ${heading.textContent}`);
      tocLink.setAttribute('data-target', headingId);
      
      // Enhanced navigation with proper scrolling
      tocLink.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Remove active states
        qa('.toc-link').forEach(link => {
          link.classList.remove('active');
          link.setAttribute('aria-current', 'false');
        });
        
        // Add active state
        tocLink.classList.add('active');
        tocLink.setAttribute('aria-current', 'page');
        
        // Smooth scroll with proper offset
        const modalBody = q('.modal-body');
        if (modalBody && heading) {
          const headingRect = heading.getBoundingClientRect();
          const modalRect = modalBody.getBoundingClientRect();
          const headerHeight = q('.modal-controls-fixed')?.offsetHeight || 80;
          
          const targetScrollTop = modalBody.scrollTop + headingRect.top - modalRect.top - headerHeight - 20;
          
          modalBody.scrollTo({
            top: Math.max(0, targetScrollTop),
            behavior: 'smooth'
          });
          
          // Highlight heading
          heading.classList.add('toc-target-highlight');
          setTimeout(() => heading.classList.remove('toc-target-highlight'), 2000);
        }
      });

      tocItem.appendChild(tocLink);
      tocList.appendChild(tocItem);
    });

    // Collapse functionality
    const collapseBtn = tocContainer.querySelector('.toc-collapse');
    collapseBtn.addEventListener('click', function() {
      const isExpanded = this.getAttribute('aria-expanded') === 'true';
      const newState = !isExpanded;
      
      tocList.style.display = newState ? 'block' : 'none';
      this.textContent = newState ? '−' : '+';
      this.setAttribute('aria-expanded', newState.toString());
    });

    return tocContainer;
  }

  // Enhanced share modal with horizontal buttons
  function showCustomShareModal({ title, text, url, image }) {
    const existingModal = q('.custom-share-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.className = 'custom-share-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-labelledby', 'share-modal-title');
    modal.setAttribute('aria-modal', 'true');
    
    modal.innerHTML = `
      <div class="share-modal-overlay">
        <div class="share-modal-content">
          <div class="share-modal-header">
            <h3 id="share-modal-title">ਸਾਂਝਾ ਕਰੋ / Share</h3>
            <button class="share-modal-close" aria-label="Close share dialog">&times;</button>
          </div>
          <div class="share-modal-body">
            <div class="share-preview">
              ${image ? `<img src="${image}" alt="${title}" class="share-preview-image" loading="lazy">` : '<div class="share-preview-placeholder">📍</div>'}
              <div class="share-preview-content">
                <h4 class="share-preview-title">${title}</h4>
                <p class="share-preview-text">${text}</p>
                <p class="share-preview-link">${url}</p>
                <div class="share-preview-actions">
                  <button class="share-copy-link">📋 ਲਿੰਕ ਕਾਪੀ ਕਰੋ</button>
                  <a href="${url}" target="_blank" rel="noopener" class="share-read-full">📖 ਪੂਰਾ ਪੜ੍ਹੋ</a>
                </div>
              </div>
            </div>
            <div class="share-platforms">
              <h5>ਸੋਸ਼ਲ ਮੀਡੀਆ / Social Media</h5>
              <div class="share-platforms-scroll">
                ${[
                  { platform: 'whatsapp', icon: '📱', name: 'WhatsApp' },
                  { platform: 'facebook', icon: '📘', name: 'Facebook' },
                  { platform: 'twitter', icon: '🐦', name: 'Twitter' },
                  { platform: 'telegram', icon: '✈️', name: 'Telegram' },
                  { platform: 'linkedin', icon: '💼', name: 'LinkedIn' },
                  { platform: 'email', icon: '📧', name: 'Email' }
                ].map(({ platform, icon, name }) => `
                  <button class="share-platform" data-platform="${platform}" aria-label="Share on ${name}">
                    <span class="share-platform-icon">${icon}</span>
                    <span class="share-platform-name">${name}</span>
                  </button>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('show'));

    const closeModal = () => {
      modal.classList.remove('show');
      setTimeout(() => modal.remove(), 300);
    };

    // Event listeners
    modal.querySelector('.share-modal-close').addEventListener('click', closeModal);
    modal.querySelector('.share-modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal();
    });

    // Copy functionality
    modal.querySelector('.share-copy-link').addEventListener('click', async () => {
      try {
        await copyToClipboard(url);
        const btn = modal.querySelector('.share-copy-link');
        const original = btn.textContent;
        btn.textContent = '✅ ਕਾਪੀ ਹੋਇਆ!';
        
        setTimeout(() => btn.textContent = original, 2000);
        showNotification('Link copied! / ਲਿੰਕ ਕਾਪੀ ਹੋ ਗਿਆ!', 'success');
      } catch (error) {
        ErrorHandler.show('Failed to copy link', error.message);
      }
    });

    // Platform sharing
    qa('.share-platform', modal).forEach(btn => {
      btn.addEventListener('click', () => {
        const platform = btn.dataset.platform;
        const shareText = `${title}\n\n${text}\n\nRead more: ${url}`;
        
        const shareUrls = {
          whatsapp: `https://wa.me/?text=${encodeURIComponent(shareText)}`,
          facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
          twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
          telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
          linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
          email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(shareText)}`
        };
        
        if (shareUrls[platform]) {
          if (platform === 'email') {
            window.location.href = shareUrls[platform];
          } else {
            window.open(shareUrls[platform], '_blank', 'width=600,height=500');
          }
          setTimeout(closeModal, 500);
        }
      });
    });

    // Focus management and keyboard navigation
    const closeButton = modal.querySelector('.share-modal-close');
    closeButton?.focus();
    
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal();
      } else if (e.key === 'Tab') {
        const focusable = qa('button, a, [tabindex]:not([tabindex="-1"])', modal);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }

  // Enhanced TTS controls with instant response
  function createTTSControls(textContainer) {
    const ttsWrap = document.createElement('div');
    ttsWrap.className = 'tts-controls';
    ttsWrap.style.display = 'none';
    
    ttsWrap.innerHTML = `
      <div class="tts-controls-header">
        <h5>🔊 Text-to-Speech Controls / ਟੈਕਸਟ ਟੂ ਸਪੀਚ ਕੰਟਰੋਲ</h5>
      </div>
      <div class="tts-controls-row">
        <button class="tts-play" aria-pressed="false">
          <span class="tts-play-icon">▶️</span>
          <span class="tts-play-text">Play</span>
        </button>
        <div class="tts-status-group">
          <div class="tts-progress" role="progressbar"></div>
          <div class="tts-status" aria-live="polite">Ready</div>
        </div>
      </div>
      <div class="tts-controls-row">
        <div class="tts-control-group">
          <label for="tts-voices">Voice:</label>
          <select id="tts-voices" aria-label="Choose voice"></select>
        </div>
        <div class="tts-control-group">
          <label for="tts-rate">Speed: <span class="rate-value">1.0</span></label>
          <input id="tts-rate" type="range" min="0.5" max="2.0" step="0.1" value="1.0">
        </div>
        <div class="tts-control-group">
          <label for="tts-pitch">Pitch: <span class="pitch-value">1.0</span></label>
          <input id="tts-pitch" type="range" min="0.5" max="2.0" step="0.1" value="1.0">
        </div>
      </div>
    `;
    
    // Initialize TTS functionality
    initializeTTSControls(ttsWrap, textContainer);
    
    return ttsWrap;
  }

  function initializeTTSControls(controlsWrap, textContainer) {
    const elements = {
      playBtn: controlsWrap.querySelector('.tts-play'),
      statusEl: controlsWrap.querySelector('.tts-status'),
      progressEl: controlsWrap.querySelector('.tts-progress'),
      voiceSelect: controlsWrap.querySelector('#tts-voices'),
      rateSlider: controlsWrap.querySelector('#tts-rate'),
      pitchSlider: controlsWrap.querySelector('#tts-pitch'),
      rateValue: controlsWrap.querySelector('.rate-value'),
      pitchValue: controlsWrap.querySelector('.pitch-value')
    };

    let textSegments = [];
    let isReading = false;

    // Load voices
    const loadVoices = async () => {
      const loader = LoadingManager.show('tts-voices', elements.voiceSelect.parentNode, 'Loading voices...');
      
      try {
        await advancedTTS.loadVoices();
        populateVoiceSelect();
        LoadingManager.hide('tts-voices');
        elements.statusEl.textContent = 'Ready - Choose voice and click play';
      } catch (error) {
        LoadingManager.hide('tts-voices');
        ErrorHandler.show('Failed to load voices', error.message);
      }
    };
    
    const populateVoiceSelect = () => {
      const voices = advancedTTS.voices;
      if (!voices.length) {
        elements.voiceSelect.innerHTML = '<option value="">No voices available</option>';
        return;
      }
      
      const detection = detectLanguage(textContainer.textContent || '');
      const voiceGroups = { preferred: [], english: [], punjabi: [], hindi: [], others: [] };
      
      voices.forEach(voice => {
        const lang = voice.lang.toLowerCase();
        if (lang.startsWith(detection.language)) {
          voiceGroups.preferred.push(voice);
        } else if (lang.startsWith('en')) {
          voiceGroups.english.push(voice);
        } else if (lang.startsWith('pa')) {
          voiceGroups.punjabi.push(voice);
        } else if (lang.startsWith('hi')) {
          voiceGroups.hindi.push(voice);
        } else {
          voiceGroups.others.push(voice);
        }
      });
      
      elements.voiceSelect.innerHTML = '';
      
      const addVoiceGroup = (label, voices) => {
        if (!voices.length) return;
        
        const group = document.createElement('optgroup');
        group.label = label;
        
        voices.forEach(voice => {
          const option = document.createElement('option');
          option.value = voice.name;
          option.textContent = `${voice.name} (${voice.lang})`;
          if (!voice.localService) option.textContent += ' [Remote]';
          group.appendChild(option);
        });
        
        elements.voiceSelect.appendChild(group);
      };
      
      addVoiceGroup(`Recommended (${detection.language?.toUpperCase() || 'AUTO'})`, voiceGroups.preferred);
      addVoiceGroup('English', voiceGroups.english);
      addVoiceGroup('ਪੰਜਾਬੀ (Punjabi)', voiceGroups.punjabi);
      addVoiceGroup('हिंदी (Hindi)', voiceGroups.hindi);
      addVoiceGroup('Other Languages', voiceGroups.others);
      
      // Select best default
      if (voiceGroups.preferred.length > 0) {
        elements.voiceSelect.value = voiceGroups.preferred[0].name;
        advancedTTS.settings.voice = voiceGroups.preferred[0];
      } else if (voiceGroups.english.length > 0) {
        elements.voiceSelect.value = voiceGroups.english[0].name;
        advancedTTS.settings.voice = voiceGroups.english[0];
      }
    };
    
    const prepareSegments = () => {
      const elements = qa('p, h1, h2, h3, h4, h5, h6, li', textContainer);
      textSegments = [];
      
      elements.forEach(el => {
        const text = advancedTTS.cleanText(el.textContent);
        if (text && text.length > 10) {
          textSegments.push({ element: el, text });
        }
      });
      
      return textSegments.length > 0;
    };
    
    const updateProgress = () => {
      if (textSegments.length > 0) {
        const percentage = Math.round((ttsState.currentSegment / textSegments.length) * 100);
        elements.progressEl.textContent = `${percentage}%`;
      }
    };

    // Event listeners with instant response
    elements.playBtn.addEventListener('click', () => {
      if (isReading) {
        advancedTTS.stop();
        isReading = false;
        elements.playBtn.innerHTML = '<span class="tts-play-icon">▶️</span><span class="tts-play-text">Play</span>';
        elements.statusEl.textContent = 'Stopped';
      } else {
        if (!prepareSegments()) {
          elements.statusEl.textContent = 'No readable content found';
          return;
        }
        
        isReading = true;
        elements.playBtn.innerHTML = '<span class="tts-play-icon">⏸️</span><span class="tts-play-text">Pause</span>';
        elements.statusEl.textContent = 'Reading...';
        advancedTTS.start(textSegments);
      }
    });

    // Instant response to settings changes
    elements.rateSlider.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      elements.rateValue.textContent = value.toFixed(1);
      advancedTTS.updateSettings({ rate: value });
    });

    elements.pitchSlider.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      elements.pitchValue.textContent = value.toFixed(1);
      advancedTTS.updateSettings({ pitch: value });
    });

    elements.voiceSelect.addEventListener('change', (e) => {
      const selectedVoice = advancedTTS.voices.find(v => v.name === e.target.value);
      if (selectedVoice) {
        advancedTTS.updateSettings({ voice: selectedVoice });
      }
    });

    // TTS callbacks
    advancedTTS.on('onStart', (segmentIndex) => {
      updateProgress();
    });

    advancedTTS.on('onStop', () => {
      isReading = false;
      elements.playBtn.innerHTML = '<span class="tts-play-icon">▶️</span><span class="tts-play-text">Play</span>';
      elements.statusEl.textContent = 'Finished';
      elements.progressEl.textContent = '100%';
    });

    // Initialize
    loadVoices();
  }

  // Enhanced modal management
  function closeModal(force = false) {
    // Handle share modal first
    if (q('.custom-share-modal')) {
      qa('.custom-share-modal').forEach(m => m.remove());
      if (!force) return;
    }
    
    advancedTTS.stop();
    
    if (!modal || !modalOpen) return;
    
    // Cleanup
    modal.setAttribute('aria-hidden', 'true');
    modal.classList.remove('open');
    modal.style.display = 'none';
    
    qa('.modal-controls-fixed, .tts-controls, .table-of-contents, .modal-related', modal)
      .forEach(el => el.remove());
    
    qa('.tts-highlight', modalText).forEach(el => el.classList.remove('tts-highlight'));
    
    if (btnClose) btnClose.classList.remove('sr-only');
    
    // Unlock scroll
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    document.documentElement.classList.remove('modal-open');
    
    // Restore focus
    if (lastFocusedElement?.focus) {
      try {
        lastFocusedElement.focus();
      } catch (error) {
        console.warn('Focus restoration failed:', error);
      }
    }
    
    modalOpen = false;
    modalStack = [];
    
    // Navigation
    try {
      if (window.history.length > 1) {
        history.back();
      } else {
        window.location.href = 'https://www.pattibytes.com/places/';
      }
    } catch (error) {
      window.location.href = 'https://www.pattibytes.com/places/';
    }
  }

  function openModal(index) {
    if (!modal || index < 0 || index >= cards.length) return;
    
    const loader = LoadingManager.show('modal', null, 'Loading article...');
    
    try {
      currentIndex = index;
      const card = cards[currentIndex];
      const articleId = card.id || card.dataset.id || '';
      const imgSrc = card.dataset.image || '';
      const fullHtml = card.dataset.full || card.dataset.preview || '';
      const cardTitle = card.dataset.title || card.querySelector('h3')?.textContent || '';
      
      // Clean up previous state
      qa('.modal-controls-fixed, .tts-controls, .table-of-contents, .modal-related', modal)
        .forEach(el => el.remove());
      
      if (btnClose) btnClose.classList.add('sr-only');
      
      // Create controls
      const controls = createModalControls(cardTitle, articleId, imgSrc);
      modalContent.prepend(controls);
      
      // Set content
      if (modalMedia) {
        modalMedia.innerHTML = imgSrc ? 
          `<img src="${imgSrc}" alt="${cardTitle}" loading="lazy">` : '';
      }
      
      if (modalText) {
        modalText.innerHTML = fullHtml;
        // Ensure GTranslate can access this content
        modalText.removeAttribute('translate');
      }
      
      // Create TOC
      const tocContainer = createTableOfContents(modalText);
      if (tocContainer) {
        if (modalMedia?.innerHTML) {
          modalMedia.after(tocContainer);
        } else {
          modalText.parentNode.insertBefore(tocContainer, modalText);
        }
      }
      
      // Create TTS controls
      const ttsControls = createTTSControls(modalText);
      if (tocContainer) {
        tocContainer.after(ttsControls);
      } else {
        modalText.before(ttsControls);
      }
      
      // Add related content
      createRelatedContent(card);
      
      // Open modal
      modal.setAttribute('aria-hidden', 'false');
      modal.classList.add('open');
      modal.style.display = 'flex';
      
      // Lock scroll
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      document.documentElement.classList.add('modal-open');
      
      modalOpen = true;
      lastFocusedElement = document.activeElement;
      
      // Focus close button
      const closeBtn = controls.querySelector('.modal-close-btn');
      closeBtn?.focus();
      
      // Reset scroll
      const modalBody = q('.modal-body');
      if (modalBody) modalBody.scrollTop = 0;
      
      // Update URL
      try {
        history.pushState({ articleId }, '', `https://www.pattibytes.com/places/#${encodeURIComponent(articleId)}`);
      } catch (error) {
        console.warn('URL update failed:', error);
      }
      
      // Trigger GTranslate retranslation
      if (gtranslateReady && window.gtranslate?.translate) {
        setTimeout(() => {
          try {
            window.gtranslate.translate();
          } catch (e) {
            console.warn('GTranslate retranslation failed:', e);
          }
        }, 500);
      }
      
      LoadingManager.hide('modal');
      
    } catch (error) {
      LoadingManager.hide('modal');
      ErrorHandler.show('Failed to open article', error.message, {
        text: 'Retry',
        callback: () => openModal(index)
      });
    }
  }

  function createModalControls(title, articleId, image) {
    const controls = document.createElement('div');
    controls.className = 'modal-controls-fixed';
    
    controls.innerHTML = `
      <h2 class="modal-controls-title">${title}</h2>
      <div class="modal-controls-buttons">
        <button class="modal-control-btn tts-toggle-btn" data-action="tts" aria-label="Toggle text-to-speech">🔊</button>
        <button class="modal-control-btn toc-toggle-btn" data-action="toc" aria-label="Toggle table of contents">📋</button>
        <button class="modal-control-btn modal-share-btn" data-action="share" aria-label="Share article">📤</button>
        <button class="modal-control-btn modal-link-btn" data-action="copy" aria-label="Copy article link">🔗</button>
        <button class="modal-control-btn modal-close-btn" data-action="close" aria-label="Close modal">✕</button>
      </div>
    `;
    
    // Event listeners
    qa('.modal-control-btn', controls).forEach(btn => {
      btn.addEventListener('click', async () => {
        const action = btn.dataset.action;
        
        switch(action) {
          case 'tts':
            const ttsControls = q('.tts-controls');
            if (ttsControls) {
              const isVisible = ttsControls.style.display === 'flex';
              ttsControls.style.display = isVisible ? 'none' : 'flex';
              btn.classList.toggle('active', !isVisible);
              
              if (!isVisible) {
                const playBtn = ttsControls.querySelector('.tts-play');
                setTimeout(() => playBtn?.focus(), 300);
              }
            }
            break;
            
          case 'toc':
            const tocContainer = q('.table-of-contents');
            if (tocContainer) {
              const isVisible = tocContainer.style.display !== 'none';
              tocContainer.style.display = isVisible ? 'none' : 'block';
              btn.classList.toggle('active', !isVisible);
              btn.innerHTML = isVisible ? '📋' : '✕';
            }
            break;
            
          case 'share':
            const url = `https://www.pattibytes.com/places/#${encodeURIComponent(articleId)}`;
            const card = document.getElementById(articleId);
            const text = (card?.dataset.preview || 'ਪੱਟੀ ਦੇ ਪ੍ਰਸਿੱਧ ਸਥਾਨ').slice(0, 200);
            showCustomShareModal({ title, text, url, image });
            break;
            
          case 'copy':
            try {
              const url = `https://www.pattibytes.com/places/#${encodeURIComponent(articleId)}`;
              await copyToClipboard(url);
              btn.classList.add('copied');
              btn.innerHTML = '✓';
              showNotification('Link copied! / ਲਿੰਕ ਕਾਪੀ ਹੋਇਆ!', 'success');
              setTimeout(() => {
                btn.classList.remove('copied');
                btn.innerHTML = '🔗';
              }, 2000);
            } catch (error) {
              ErrorHandler.show('Copy failed', error.message);
            }
            break;
            
          case 'close':
            closeModal(true);
            break;
        }
      });
    });
    
    return controls;
  }

  function createRelatedContent(activeCard) {
    const existing = q('.modal-related');
    if (existing) existing.remove();
    
    const relatedContainer = document.createElement('div');
    relatedContainer.className = 'modal-related';
    relatedContainer.innerHTML = `
      <h4>ਤੁਹਾਨੂੰ ਇਹ ਵੀ ਪਸੰਦ ਆ ਸਕਦਾ ਹੈ / You May Also Like</h4>
      <div class="related-list"></div>
    `;
    
    const relatedList = relatedContainer.querySelector('.related-list');
    const relatedCards = cards.filter(card => card !== activeCard).slice(0, 6);
    
    relatedCards.forEach(card => {
      const cardImage = card.dataset.image || '';
      const cardTitle = card.dataset.title || card.querySelector('h3')?.textContent || '';
      const cardPreview = (card.dataset.preview || '').slice(0, 120);
      const cardId = card.id || card.dataset.id || '';
      
      const relatedCard = document.createElement('div');
      relatedCard.className = 'related-card';
      relatedCard.innerHTML = `
        ${cardImage ? 
          `<img src="${cardImage}" alt="${cardTitle}" loading="lazy">` : 
          '<div class="related-placeholder">📍</div>'
        }
        <div class="related-info">
          <div class="related-title">${cardTitle}</div>
          <div class="related-meta">${cardPreview}${cardPreview.length > 100 ? '...' : ''}</div>
          <div class="related-actions">
            <button class="related-open" data-card-id="${cardId}">ਖੋਲ੍ਹੋ / Open</button>
          </div>
        </div>
      `;
      
      relatedList.appendChild(relatedCard);
    });
    
    modalText.parentNode.appendChild(relatedContainer);
    
    // Event listeners
    qa('.related-open', relatedContainer).forEach(btn => {
      btn.addEventListener('click', () => {
        const cardId = btn.dataset.cardId;
        const targetCard = document.getElementById(cardId);
        
        if (targetCard) {
          const targetIndex = cards.indexOf(targetCard);
          if (targetIndex !== -1) {
            setTimeout(() => openModal(targetIndex), 100);
          }
        }
      });
    });
  }

  // Setup functions
  function setupSearch() {
    if (!searchInput) return;
    
    let searchTimeout;
    
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      
      const query = e.target.value.trim();
      
      if (query.length === 0) {
        performSearch('');
        return;
      }
      
      // Show loading for longer queries
      if (query.length > 2) {
        LoadingManager.show('search', searchInput.parentNode, 'Searching...');
      }
      
      searchTimeout = setTimeout(() => {
        performSearch(query);
        LoadingManager.hide('search');
      }, query.length > 2 ? 150 : 300);
    });
    
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const firstVisible = cards.find(card => card.style.display !== 'none');
        if (firstVisible) {
          firstVisible.scrollIntoView({ behavior: 'smooth', block: 'center' });
          firstVisible.classList.add('search-result-highlight');
          setTimeout(() => firstVisible.classList.remove('search-result-highlight'), 3000);
        }
      }
    });
    
    if (clearSearch) {
      clearSearch.addEventListener('click', () => {
        searchInput.value = '';
        performSearch('');
        clearSearch.classList.remove('visible');
        searchInput.focus();
      });
    }
  }

  function setupCardInteractions() {
    cards.forEach((card, index) => {
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'article');
      
      // Arrange buttons horizontally
      const content = card.querySelector('.place-content');
      if (!content || content.querySelector('.place-actions')) return;
      
      const readBtn = content.querySelector('.read-more-btn');
      const copyBtn = content.querySelector('.copy-link');
      const shareBtn = content.querySelector('.share-btn');
      
      const actionsContainer = document.createElement('div');
      actionsContainer.className = 'place-actions';
      
      if (readBtn) {
        readBtn.remove();
        actionsContainer.appendChild(readBtn);
        readBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openModal(index);
        });
      }
      
      const buttonGroup = document.createElement('div');
      buttonGroup.className = 'action-buttons';
      
      if (copyBtn) {
        copyBtn.remove();
        buttonGroup.appendChild(copyBtn);
      }
      
      if (shareBtn) {
        shareBtn.remove();
        buttonGroup.appendChild(shareBtn);
      }
      
      if (buttonGroup.children.length > 0) {
        actionsContainer.appendChild(buttonGroup);
      }
      
      content.appendChild(actionsContainer);
      
      // Card interactions
      card.addEventListener('click', (e) => {
        if (e.target.closest('button, a, .action-buttons')) return;
        openModal(index);
      });
      
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal(index);
        }
      });
    });
  }

  function setupCopyShareButtons() {
    qa('.copy-link').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        
        const card = btn.closest('.place-card');
        if (!card) return;
        
        const articleId = card.id || card.dataset.id || '';
        const url = `https://www.pattibytes.com/places/#${encodeURIComponent(articleId)}`;
        
        try {
          await copyToClipboard(url);
          btn.classList.add('copied');
          const original = btn.textContent;
          btn.textContent = '✓';
          showNotification('Link copied! / ਲਿੰਕ ਕਾਪੀ ਹੋਇਆ!', 'success');
          
          setTimeout(() => {
            btn.classList.remove('copied');
            btn.textContent = original;
          }, 2000);
        } catch (error) {
          ErrorHandler.show('Copy failed', error.message);
        }
      });
    });
    
    qa('.share-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        
        const card = btn.closest('.place-card');
        if (!card) return;
        
        const title = card.dataset.title || card.querySelector('h3')?.textContent || '';
        const url = `https://www.pattibytes.com/places/#${encodeURIComponent(card.id)}`;
        const text = (card.dataset.preview || 'ਪੱਟੀ ਦੇ ਪ੍ਰਸਿੱਧ ਸਥਾਨ').slice(0, 200);
        const image = card.dataset.image || '';
        
        showCustomShareModal({ title, text, url, image });
      });
    });
  }

  function setupKeyboardHandling() {
    document.addEventListener('keydown', (e) => {
      if (!modalOpen) return;
      
      if (e.key === 'Escape') {
        if (q('.custom-share-modal.show')) {
          qa('.custom-share-modal').forEach(m => m.remove());
        } else {
          closeModal(true);
        }
      } else if (e.key === ' ' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') {
        e.preventDefault();
        q('.tts-toggle-btn')?.click();
      } else if (e.ctrlKey && e.key === 'ArrowLeft' && currentIndex > 0) {
        e.preventDefault();
        openModal(currentIndex - 1);
      } else if (e.ctrlKey && e.key === 'ArrowRight' && currentIndex < cards.length - 1) {
        e.preventDefault();
        openModal(currentIndex + 1);
      }
    });
    
    window.addEventListener('popstate', () => {
      if (modalOpen) {
        closeModal(false);
        return;
      }
      
      const hash = window.location.hash.slice(1);
      if (hash) {
        const targetCard = document.getElementById(decodeURIComponent(hash));
        if (targetCard) {
          const index = cards.indexOf(targetCard);
          if (index !== -1) {
            setTimeout(() => openModal(index), 100);
          }
        }
      }
    });
  }

  // Initialize everything
  function initializePlaces() {
    console.log('Initializing Enhanced Places.js with instant responses...');
    
    // Get elements
    modal = q('#places-modal');
    modalMedia = q('#modal-media', modal);
    modalText = q('#modal-text', modal);
    btnClose = q('#modal-close', modal);
    modalContent = q('.modal-content', modal);
    
    cards = qa('.place-card');
    searchInput = q('#places-search');
    clearSearch = q('#clear-search');
    noMatchEl = q('#no-match');
    placesGrid = q('.places-grid');
    
    if (!modal || !cards.length) {
      ErrorHandler.show('Essential elements not found', 'Modal or cards missing');
      return;
    }
    
    // Initialize all functionality
    buildSearchIndex();
    setupSearch();
    setupCardInteractions();
    setupCopyShareButtons();
    setupKeyboardHandling();
    initGTranslate();
    
    // Handle initial hash
    const initialHash = window.location.hash.slice(1);
    if (initialHash) {
      const targetCard = document.getElementById(decodeURIComponent(initialHash));
      if (targetCard) {
        const index = cards.indexOf(targetCard);
        if (index !== -1) {
          isInitialLoad = false;
          setTimeout(() => {
            openModal(index);
            targetCard.classList.add('highlighted');
            setTimeout(() => targetCard.classList.remove('highlighted'), 3000);
          }, 500);
        }
      }
    }
    
    // Setup original close button
    if (btnClose) {
      btnClose.addEventListener('click', (e) => {
        e.stopPropagation();
        closeModal(true);
      });
    }
    
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(true);
      });
    }
    
    console.log('Places.js initialized successfully!', {
      cards: cards.length,
      searchEnabled: !!searchInput,
      ttsSupported: advancedTTS.isSupported,
      gtranslateReady
    });
  }

  // Add loading and error styles
  const style = document.createElement('style');
  style.textContent = `
    .dynamic-loader {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(255, 255, 255, 0.95);
      padding: 0.75rem 1rem;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      font-size: 0.9rem;
      z-index: 1000;
    }
    
    .loader-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid #e0e0e0;
      border-top: 2px solid var(--accent-color, #e53e3e);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .error-notification {
      position: fixed;
      bottom: 20px;
      right: 20px;
      max-width: 400px;
      background: #fee;
      border: 2px solid #fcc;
      border-radius: 8px;
      padding: 1rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      z-index: 10001;
      animation: slideInUp 0.3s ease-out;
    }
    
    .error-content {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
    }
    
    .error-icon {
      font-size: 1.2rem;
      flex-shrink: 0;
    }
    
    .error-details {
      flex: 1;
    }
    
    .error-message {
      font-weight: 600;
      margin-bottom: 0.25rem;
    }
    
    .error-context {
      font-size: 0.85rem;
      opacity: 0.8;
      margin-bottom: 0.5rem;
    }
    
    .error-action {
      background: var(--accent-color, #e53e3e);
      color: white;
      border: none;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      cursor: pointer;
    }
    
    .error-close {
      background: none;
      border: none;
      font-size: 1.2rem;
      cursor: pointer;
      color: #999;
      flex-shrink: 0;
    }
    
    @keyframes slideInUp {
      from { transform: translateY(100%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  // Error handling
  window.addEventListener('error', (e) => {
    if (e.filename?.includes('places.js')) {
      ErrorHandler.show('JavaScript error occurred', e.message, {
        text: 'Reload Page',
        callback: () => window.location.reload()
      });
    }
  });
  
  // Cleanup on unload
  window.addEventListener('beforeunload', () => {
    advancedTTS.stop();
    LoadingManager.states.forEach((loader) => loader.remove());
  });
  
  // Initialize when ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePlaces);
  } else {
    initializePlaces();
  }

})();
