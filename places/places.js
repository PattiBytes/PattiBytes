// Enhanced places.js with advanced search, TTS, modal management, and improved UI
(function () {
  "use strict";

  // Utilities
  const q = (s, c = document) => (c || document).querySelector(s);
  const qa = (s, c = document) => Array.from((c || document).querySelectorAll(s));

  // Normalize text: remove accents, lower case, handle special characters
  const norm = (s) => (s || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Enhanced Punjabi to Roman transliteration with comprehensive mappings
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

  // Comprehensive English to Punjabi word mapping for enhanced search
  const enToPunjabi = {
    // Religious places
    'gurdwara': 'ਗੁਰਦੁਆਰਾ', 'gurudwara': 'ਗੁਰਦੁਆਰਾ', 'gurudrawa': 'ਗੁਰਦੁਆਰਾ',
    'temple': 'ਮੰਦਿਰ', 'mandir': 'ਮੰਦਿਰ', 'mosque': 'ਮਸਜਿਦ', 'masjid': 'ਮਸਜਿਦ',
    'church': 'ਗਿਰਜਾ', 'girja': 'ਗਿਰਜਾ',
    
    // Educational institutions
    'school': 'ਸਕੂਲ', 'college': 'ਕਾਲਜ', 'university': 'ਯੂਨੀਵਰਸਿਟੀ',
    'academy': 'ਅਕਾਦਮੀ', 'institute': 'ਇੰਸਟੀਟਿਊਟ',
    
    // Healthcare
    'hospital': 'ਹਸਪਤਾਲ', 'clinic': 'ਕਲੀਨਿਕ', 'dispensary': 'ਡਿਸਪੈਂਸਰੀ',
    'doctor': 'ਡਾਕਟਰ', 'medical': 'ਮੈਡੀਕਲ',
    
    // Commercial places
    'market': 'ਮਾਰਕੀਟ', 'bazaar': 'ਬਜ਼ਾਰ', 'shop': 'ਦੁਕਾਨ',
    'mall': 'ਮਾਲ', 'store': 'ਸਟੋਰ', 'bank': 'ਬੈਂਕ',
    
    // Public places
    'park': 'ਪਾਰਕ', 'garden': 'ਬਗੀਚਾ', 'playground': 'ਖੇਡ ਮੈਦਾਨ',
    'stadium': 'ਸਟੇਡੀਅਮ', 'ground': 'ਮੈਦਾਨ',
    
    // Transportation
    'station': 'ਸਟੇਸ਼ਨ', 'bus': 'ਬੱਸ', 'railway': 'ਰੇਲਵੇ',
    'airport': 'ਏਅਰਪੋਰਟ', 'bridge': 'ਪੁਲ',
    
    // Geographic features
    'river': 'ਨਦੀ', 'canal': 'ਨਹਿਰ', 'pond': 'ਤਲਾਬ',
    'lake': 'ਝੀਲ', 'well': 'ਖੂਹ', 'tube': 'ਟਿਊਬ',
    
    // Settlements
    'village': 'ਪਿੰਡ', 'city': 'ਸ਼ਹਿਰ', 'town': 'ਕਸਬਾ',
    'district': 'ਜਿਲ੍ਹਾ', 'tehsil': 'ਤਹਿਸੀਲ', 'block': 'ਬਲਾਕ',
    
    // Descriptive terms
    'place': 'ਸਥਾਨ', 'location': 'ਜਗ੍ਹਾ', 'area': 'ਇਲਾਕਾ',
    'famous': 'ਮਸ਼ਹੂਰ', 'popular': 'ਪ੍ਰਸਿੱਧ', 'old': 'ਪੁਰਾਣਾ',
    'new': 'ਨਵਾਂ', 'big': 'ਵੱਡਾ', 'small': 'ਛੋਟਾ',
    'main': 'ਮੁੱਖ', 'central': 'ਕੇਂਦਰੀ', 'local': 'ਸਥਾਨਕ',
    
    // Cultural terms
    'history': 'ਇਤਿਹਾਸ', 'heritage': 'ਵਿਰਾਸਤ', 'culture': 'ਸੱਭਿਆਚਾਰ',
    'tradition': 'ਪਰੰਪਰਾ', 'festival': 'ਤਿਉਹਾਰ', 'fair': 'ਮੇਲਾ',
    
    // Administrative
    'office': 'ਦਫ਼ਤਰ', 'government': 'ਸਰਕਾਰੀ', 'public': 'ਜਨਤਕ',
    'private': 'ਪ੍ਰਾਈਵੇਟ', 'committee': 'ਕਮੇਟੀ', 'society': 'ਸੋਸਾਇਟੀ',
    
    // Common Punjabi place names
    'singh': 'ਸਿੰਘ', 'kaur': 'ਕੌਰ', 'guru': 'ਗੁਰੂ',
    'sahib': 'ਸਾਹਿਬ', 'ji': 'ਜੀ', 'wala': 'ਵਾਲਾ',
    'pura': 'ਪੁਰਾ', 'nagar': 'ਨਗਰ', 'pur': 'ਪੁਰ'
  };

  // Store navigation state and modal stack
  let modalStack = [];
  let navigationHistory = [];
  let currentModalId = null;
  let scrollPositions = new Map();
  let isInitialLoad = true;

  // TTS State Management
  let ttsState = {
    isActive: false,
    isPaused: false,
    currentUtterance: null,
    currentIndex: 0,
    wordSpans: [],
    queuePosition: 0,
    detectedLanguage: 'auto',
    preferredVoice: null
  };

  // Modal and UI state
  let modal, modalMedia, modalText, btnClose, modalContent, cards;
  let searchInput, clearSearch, noMatchEl, placesGrid;
  let searchIndex = [];
  let currentIndex = -1;
  let lastFocusedElement = null;
  let modalOpen = false;

  // Enhanced clipboard functionality with better error handling
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
    
    // Fallback for older browsers
    return new Promise((resolve, reject) => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;pointer-events:none;';
      document.body.appendChild(textarea);
      
      try {
        textarea.select();
        textarea.setSelectionRange(0, text.length);
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        
        if (successful) {
          resolve(true);
        } else {
          reject(new Error('Copy command failed'));
        }
      } catch (error) {
        document.body.removeChild(textarea);
        reject(error);
      }
    });
  }

  // Enhanced notification system with better positioning and accessibility
  function showNotification(message, type = 'info', duration = 4000) {
    // Remove existing notifications of the same type
    qa(`.notification-${type}`).forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.setAttribute('role', 'alert');
    notification.setAttribute('aria-live', 'polite');
    
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-message">${message}</span>
        <button class="notification-close" aria-label="Close notification">&times;</button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Add show class for animation
    requestAnimationFrame(() => {
      notification.classList.add('show');
    });

    const closeNotification = () => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    };

    q('.notification-close', notification)?.addEventListener('click', closeNotification);
    
    if (duration > 0) {
      setTimeout(closeNotification, duration);
    }
    
    return closeNotification;
  }

  // Enhanced language detection with better accuracy
  function detectLanguage(text, minLength = 100) {
    if (!text || text.length < 10) return { language: 'unknown', confidence: 0 };
    
    const cleanText = text.replace(/[^\w\s\u0A00-\u0A7F]/g, ' ').trim();
    const totalChars = cleanText.length;
    
    if (totalChars < minLength) {
      return { language: 'insufficient', confidence: 0, suggestion: 'en' };
    }

    const punjabiFactor = (cleanText.match(/[\u0A00-\u0A7F]/g) || []).length;
    const englishFactor = (cleanText.match(/[a-zA-Z]/g) || []).length;
    const hindiDevanagari = (cleanText.match(/[\u0900-\u097F]/g) || []).length;
    
    const punjabi = punjabiFactor / totalChars;
    const english = englishFactor / totalChars;
    const hindi = hindiDevanagari / totalChars;
    
    if (punjabi > 0.4) {
      return { language: 'pa', confidence: punjabi, script: 'Gurmukhi' };
    } else if (hindi > 0.3) {
      return { language: 'hi', confidence: hindi, script: 'Devanagari' };
    } else if (english > 0.6) {
      return { language: 'en', confidence: english, script: 'Latin' };
    } else if (punjabi > english && punjabi > hindi) {
      return { language: 'pa', confidence: punjabi, script: 'Gurmukhi' };
    }
    
    return { language: 'en', confidence: english, script: 'Latin', fallback: true };
  }

  // Enhanced TTS with multi-language support and better error handling
  class AdvancedTTS {
    constructor() {
      this.synth = window.speechSynthesis;
      this.voices = [];
      this.isSupported = !!this.synth;
      this.currentUtterance = null;
      this.isPlaying = false;
      this.isPaused = false;
      this.queue = [];
      this.currentIndex = 0;
      this.callbacks = {};
      
      this.init();
    }

    async init() {
      if (!this.isSupported) {
        console.warn('Speech Synthesis not supported');
        return;
      }

      // Load voices with retry mechanism
      await this.loadVoices();
      
      // Handle voice changes
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }

    async loadVoices(maxRetries = 5, retryDelay = 500) {
      for (let i = 0; i < maxRetries; i++) {
        this.voices = this.synth?.getVoices() || [];
        if (this.voices.length > 0) break;
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
      
      if (this.voices.length === 0) {
        console.warn('No voices available for TTS');
      }
      
      return this.voices;
    }

    getVoicesForLanguage(language) {
      if (!this.voices.length) return [];
      
      const langCode = language.split('-')[0].toLowerCase();
      const voices = this.voices.filter(voice => {
        const voiceLang = voice.lang.split('-')[0].toLowerCase();
        return voiceLang === langCode;
      });
      
      // Sort by quality (prefer non-remote voices)
      return voices.sort((a, b) => {
        if (!a.localService && b.localService) return 1;
        if (a.localService && !b.localService) return -1;
        return 0;
      });
    }

    getBestVoice(language, preferredName = null) {
      const voices = this.getVoicesForLanguage(language);
      
      if (preferredName) {
        const preferred = voices.find(v => v.name === preferredName);
        if (preferred) return preferred;
      }
      
      // Fallback to best available voice
      const localVoices = voices.filter(v => v.localService);
      if (localVoices.length > 0) return localVoices[0];
      
      if (voices.length > 0) return voices[0];
      
      // Ultimate fallback - any voice
      return this.voices.length > 0 ? this.voices[0] : null;
    }

    cleanTextForTTS(text) {
      return text
        // Remove emojis and special characters
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu, ' ')
        // Remove URLs
        .replace(/https?:\/\/[^\s]+/g, ' ')
        // Remove email addresses
        .replace(/\S+@\S+\.\S+/g, ' ')
        // Clean up whitespace
        .replace(/\s+/g, ' ')
        .trim();
    }

    createUtterance(text, options = {}) {
      const cleanText = this.cleanTextForTTS(text);
      if (!cleanText) return null;
      
      const utterance = new SpeechSynthesisUtterance(cleanText);
      
      // Detect language if not provided
      const detectedLang = options.language || this.detectTextLanguage(cleanText);
      const voice = this.getBestVoice(detectedLang, options.voiceName);
      
      if (voice) {
        utterance.voice = voice;
      } else {
        utterance.lang = this.mapLanguageCode(detectedLang);
      }
      
      utterance.rate = options.rate || 1.0;
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = options.volume || 1.0;
      
      return utterance;
    }

    detectTextLanguage(text) {
      const detection = detectLanguage(text);
      
      switch(detection.language) {
        case 'pa': return 'pa-IN';
        case 'hi': return 'hi-IN';
        case 'en': return 'en-US';
        default: return 'en-US';
      }
    }

    mapLanguageCode(lang) {
      const mapping = {
        'pa': 'pa-IN',
        'hi': 'hi-IN', 
        'en': 'en-US',
        'es': 'es-ES',
        'fr': 'fr-FR',
        'de': 'de-DE',
        'it': 'it-IT',
        'pt': 'pt-BR',
        'ru': 'ru-RU',
        'ja': 'ja-JP',
        'ko': 'ko-KR',
        'zh': 'zh-CN'
      };
      return mapping[lang.split('-')[0]] || 'en-US';
    }

    speak(text, options = {}) {
      return new Promise((resolve, reject) => {
        if (!this.isSupported) {
          reject(new Error('Speech synthesis not supported'));
          return;
        }

        const utterance = this.createUtterance(text, options);
        if (!utterance) {
          reject(new Error('Failed to create utterance'));
          return;
        }

        // Stop current speech
        this.stop();

        utterance.onstart = () => {
          this.isPlaying = true;
          this.isPaused = false;
          this.currentUtterance = utterance;
          this.callbacks.onStart?.(utterance);
        };

        utterance.onend = () => {
          this.isPlaying = false;
          this.currentUtterance = null;
          this.callbacks.onEnd?.(utterance);
          resolve();
        };

        utterance.onerror = (error) => {
          this.isPlaying = false;
          this.currentUtterance = null;
          this.callbacks.onError?.(error);
          reject(error);
        };

        utterance.onboundary = (event) => {
          this.callbacks.onBoundary?.(event);
        };

        this.synth.speak(utterance);
      });
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
        this.callbacks.onStop?.();
      }
    }

    on(event, callback) {
      this.callbacks[event] = callback;
    }

    getStatus() {
      return {
        isSupported: this.isSupported,
        isPlaying: this.isPlaying,
        isPaused: this.isPaused,
        hasVoices: this.voices.length > 0,
        voiceCount: this.voices.length
      };
    }
  }

  // Initialize advanced TTS
  const advancedTTS = new AdvancedTTS();

  // Enhanced modal stack management
  function pushModal(modalId, data = {}) {
    modalStack.push({ id: modalId, data, timestamp: Date.now() });
    currentModalId = modalId;
    console.log('Modal stack:', modalStack.map(m => m.id));
  }

  function popModal() {
    if (modalStack.length > 0) {
      modalStack.pop();
      currentModalId = modalStack.length > 0 ? modalStack[modalStack.length - 1].id : null;
      console.log('Modal stack after pop:', modalStack.map(m => m.id));
      return currentModalId;
    }
    return null;
  }

  function clearModalStack() {
    modalStack = [];
    currentModalId = null;
    console.log('Modal stack cleared');
  }

  function getCurrentModalLevel() {
    return modalStack.length;
  }

  // Enhanced navigation management
  function updateNavigation(articleId, action = 'push') {
    const baseUrl = 'https://www.pattibytes.com/places/';
    const newUrl = articleId ? `${baseUrl}#${encodeURIComponent(articleId)}` : baseUrl;
    
    try {
      if (action === 'push' && window.location.href !== newUrl) {
        history.pushState({ 
          articleId, 
          modalLevel: getCurrentModalLevel(),
          timestamp: Date.now() 
        }, '', newUrl);
        console.log('Navigation pushed:', { articleId, modalLevel: getCurrentModalLevel() });
      } else if (action === 'replace') {
        history.replaceState({ 
          articleId, 
          modalLevel: getCurrentModalLevel(),
          timestamp: Date.now() 
        }, '', newUrl);
        console.log('Navigation replaced:', { articleId, modalLevel: getCurrentModalLevel() });
      }
    } catch (error) {
      console.warn('Navigation update failed:', error);
    }
  }

  // Enhanced scroll management
  function saveScrollPosition(key = 'main') {
    const modalBody = q('.modal-body');
    if (modalBody && modalOpen) {
      scrollPositions.set(key, modalBody.scrollTop);
    } else {
      scrollPositions.set(key, window.pageYOffset || document.documentElement.scrollTop);
    }
  }

  function restoreScrollPosition(key = 'main', behavior = 'auto') {
    const position = scrollPositions.get(key) || 0;
    const modalBody = q('.modal-body');
    
    if (modalBody && modalOpen) {
      modalBody.scrollTo({ top: position, behavior });
    } else {
      window.scrollTo({ top: position, behavior });
    }
  }

  function smoothScrollToElement(element, offset = 80) {
    if (!element) return;
    
    const modalBody = q('.modal-body');
    if (modalBody && modalOpen) {
      const elementRect = element.getBoundingClientRect();
      const modalRect = modalBody.getBoundingClientRect();
      const scrollTop = modalBody.scrollTop + elementRect.top - modalRect.top - offset;
      modalBody.scrollTo({ top: scrollTop, behavior: 'smooth' });
    } else {
      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }
  }

  // Enhanced search functionality with comprehensive English to Punjabi mapping
  function buildSearchIndex() {
    searchIndex = cards.map(card => {
      const id = card.id || card.dataset.id || '';
      const title = card.dataset.title || card.querySelector('h3')?.textContent || '';
      const preview = card.dataset.preview || '';
      const fullContent = card.dataset.full || '';
      
      // Create comprehensive search terms
      const searchTerms = [
        id, title, preview, fullContent
      ].filter(Boolean).join(' ');
      
      // Enhanced search with transliteration and translation
      const normalizedTerms = norm(searchTerms);
      const romanizedTerms = norm(paToRoman(searchTerms));
      
      // Add English translations for Punjabi terms
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
        id,
        title,
        preview,
        searchText: [
          normalizedTerms,
          romanizedTerms, 
          expandedNormalized,
          expandedRomanized
        ].filter(Boolean).join(' ')
      };
    });
    
    console.log('Search index built with', searchIndex.length, 'items');
  }

  function performSearch(query) {
    if (!query.trim()) {
      // Show all cards
      cards.forEach(card => card.style.display = '');
      updateSearchResults(cards.length);
      return cards.length;
    }

    let searchQuery = query.trim();
    
    // Expand English terms to include Punjabi equivalents
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
    return visibleCount;
  }

  function updateSearchResults(count) {
    if (noMatchEl) {
      if (count === 0) {
        noMatchEl.style.display = 'block';
        noMatchEl.innerHTML = `
          <div>ਕੋਈ ਮਿਲਦਾ ਸਥਾਨ ਨਹੀਂ ਮਿਲਿਆ / No matching places found</div>
          <small>Try: gurdwara, school, hospital, market, park</small>
        `;
      } else {
        noMatchEl.style.display = 'none';
      }
    }
    
    // Update clear button visibility
    if (clearSearch) {
      clearSearch.classList.toggle('visible', !!searchInput?.value.trim());
    }
  }

  // Enhanced custom share modal
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
    pushModal('share-modal', { title, text, url, image });
    
    // Animate in
    requestAnimationFrame(() => {
      modal.classList.add('show');
    });

    const closeModal = () => {
      modal.classList.remove('show');
      setTimeout(() => {
        modal.remove();
        popModal();
      }, 300);
    };

    // Event listeners
    q('.share-modal-close', modal).addEventListener('click', closeModal);
    q('.share-modal-overlay', modal).addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal();
    });

    // Copy link functionality
    q('.share-copy-link', modal).addEventListener('click', async () => {
      try {
        await copyToClipboard(url);
        const btn = q('.share-copy-link', modal);
        const original = btn.textContent;
        btn.textContent = '✅ ਕਾਪੀ ਹੋਇਆ!';
        btn.classList.add('copied');
        
        setTimeout(() => {
          btn.textContent = original;
          btn.classList.remove('copied');
        }, 2000);
        
        showNotification('Link copied successfully! / ਲਿੰਕ ਕਾਪੀ ਹੋ ਗਿਆ!', 'success');
      } catch (error) {
        showNotification('Failed to copy link / ਲਿੰਕ ਕਾਪੀ ਨਹੀਂ ਹੋਇਆ', 'error');
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
            window.open(shareUrls[platform], '_blank', 'width=600,height=500,scrollbars=yes,resizable=yes');
          }
          
          btn.classList.add('shared');
          setTimeout(() => btn.classList.remove('shared'), 1000);
          
          // Close modal after sharing
          setTimeout(closeModal, 500);
        }
      });
    });

    // Focus management
    const closeButton = q('.share-modal-close', modal);
    closeButton?.focus();
    
    // Trap focus in modal
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal();
      } else if (e.key === 'Tab') {
        const focusableElements = qa('button, a, [tabindex]:not([tabindex="-1"])', modal);
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    });
  }

  // Enhanced table of contents with better navigation
  function createTableOfContents(content) {
    const headings = qa('h1, h2, h3, h4, h5, h6', content);
    if (!headings.length) return null;

    const tocContainer = document.createElement('div');
    tocContainer.className = 'table-of-contents';
    tocContainer.style.display = 'none';
    tocContainer.setAttribute('role', 'navigation');
    tocContainer.setAttribute('aria-label', 'Table of contents');
    
    const tocHeader = document.createElement('div');
    tocHeader.className = 'toc-header';
    tocHeader.innerHTML = `
      <h4 class="toc-title">ਸਮੱਗਰੀ / Contents</h4>
      <button class="toc-collapse" aria-label="Collapse table of contents" aria-expanded="true">−</button>
    `;
    
    const tocList = document.createElement('ul');
    tocList.className = 'toc-list';
    tocList.setAttribute('role', 'list');

    headings.forEach((heading, index) => {
      const headingId = `heading-${index}-${heading.textContent.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '-')}`;
      heading.id = headingId;
      heading.style.scrollMarginTop = '120px';
      
      const tocItem = document.createElement('li');
      tocItem.className = `toc-item toc-level-${heading.tagName.toLowerCase()}`;
      tocItem.setAttribute('role', 'listitem');
      
      const tocLink = document.createElement('button');
      tocLink.textContent = heading.textContent;
      tocLink.className = 'toc-link';
      tocLink.setAttribute('aria-label', `Navigate to: ${heading.textContent}`);
      
      tocLink.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Remove active class from all links
        qa('.toc-link').forEach(link => {
          link.classList.remove('active');
          link.setAttribute('aria-current', 'false');
        });
        
        // Add active class to clicked link
        tocLink.classList.add('active');
        tocLink.setAttribute('aria-current', 'page');
        
        // Smooth scroll to heading
        smoothScrollToElement(heading, 100);
        
        // Highlight the heading temporarily
        heading.classList.add('toc-target-highlight');
        setTimeout(() => heading.classList.remove('toc-target-highlight'), 2000);
      });

      tocItem.appendChild(tocLink);
      tocList.appendChild(tocItem);
    });

    tocContainer.appendChild(tocHeader);
    tocContainer.appendChild(tocList);

    // Collapse/expand functionality
    const collapseBtn = q('.toc-collapse', tocContainer);
    collapseBtn.addEventListener('click', function() {
      const isExpanded = this.getAttribute('aria-expanded') === 'true';
      const newState = !isExpanded;
      
      tocList.style.display = newState ? 'block' : 'none';
      this.textContent = newState ? '−' : '+';
      this.setAttribute('aria-expanded', newState.toString());
    });

    return tocContainer;
  }

  // Enhanced TTS controls with multi-language support
  function createTTSControls(container, options = {}) {
    const { language = 'auto', container: parentContainer } = options;
    
    const ttsWrap = document.createElement('div');
    ttsWrap.className = 'tts-controls';
    ttsWrap.style.display = 'none';
    ttsWrap.setAttribute('role', 'region');
    ttsWrap.setAttribute('aria-label', 'Text-to-speech controls');
    
    ttsWrap.innerHTML = `
      <div class="tts-controls-header">
        <h5>🔊 Text-to-Speech Controls / ਟੈਕਸਟ ਟੂ ਸਪੀਚ ਕੰਟਰੋਲ</h5>
      </div>
      <div class="tts-controls-row">
        <button class="tts-play" aria-pressed="false" aria-label="Play or pause text-to-speech">
          <span class="tts-play-icon">▶️</span>
          <span class="tts-play-text">Play</span>
        </button>
        <div class="tts-status-group">
          <div class="tts-progress" role="progressbar" aria-label="Reading progress"></div>
          <div class="tts-status" aria-live="polite">Ready</div>
        </div>
      </div>
      <div class="tts-controls-row">
        <div class="tts-control-group">
          <label for="tts-voices">Voice:</label>
          <select id="tts-voices" aria-label="Choose voice for text-to-speech"></select>
        </div>
        <div class="tts-control-group">
          <label for="tts-rate">Speed: <span class="rate-value">1.0</span></label>
          <input id="tts-rate" type="range" min="0.5" max="2.0" step="0.1" value="1.0" 
                 aria-label="Speech rate" aria-valuemin="0.5" aria-valuemax="2.0">
        </div>
        <div class="tts-control-group">
          <label for="tts-pitch">Pitch: <span class="pitch-value">1.0</span></label>
          <input id="tts-pitch" type="range" min="0.5" max="2.0" step="0.1" value="1.0"
                 aria-label="Speech pitch" aria-valuemin="0.5" aria-valuemax="2.0">
        </div>
      </div>
    `;
    
    if (parentContainer) {
      parentContainer.appendChild(ttsWrap);
    }
    
    // Initialize TTS functionality
    initializeTTS(ttsWrap, container, options);
    
    return ttsWrap;
  }

  function initializeTTS(controlsWrap, textContainer, options = {}) {
    const playBtn = q('.tts-play', controlsWrap);
    const statusEl = q('.tts-status', controlsWrap);
    const progressEl = q('.tts-progress', controlsWrap);
    const voiceSelect = q('#tts-voices', controlsWrap);
    const rateSlider = q('#tts-rate', controlsWrap);
    const pitchSlider = q('#tts-pitch', controlsWrap);
    const rateValue = q('.rate-value', controlsWrap);
    const pitchValue = q('.pitch-value', controlsWrap);
    
    let isReading = false;
    let textSegments = [];
    let currentSegment = 0;
    let totalWords = 0;
    let currentWords = 0;
    
    // Load voices when available
    const loadVoices = async () => {
      await advancedTTS.loadVoices();
      populateVoiceSelect();
      statusEl.textContent = 'Ready - Choose a voice and click play';
    };
    
    const populateVoiceSelect = () => {
      const voices = advancedTTS.voices;
      if (!voices.length) {
        voiceSelect.innerHTML = '<option value="">No voices available</option>';
        return;
      }
      
      // Detect content language
      const content = textContainer.textContent || '';
      const detection = detectLanguage(content);
      
      // Group voices by language
      const voiceGroups = {
        preferred: [],
        english: [],
        punjabi: [],
        hindi: [],
        others: []
      };
      
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
      
      voiceSelect.innerHTML = '';
      
      // Add voices by groups
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
        
        voiceSelect.appendChild(group);
      };
      
      addVoiceGroup(`Recommended (${detection.language.toUpperCase()})`, voiceGroups.preferred);
      addVoiceGroup('English', voiceGroups.english);
      addVoiceGroup('ਪੰਜਾਬੀ (Punjabi)', voiceGroups.punjabi);
      addVoiceGroup('हिंदी (Hindi)', voiceGroups.hindi);
      addVoiceGroup('Other Languages', voiceGroups.others);
      
      // Select best default voice
      if (voiceGroups.preferred.length > 0) {
        voiceSelect.value = voiceGroups.preferred[0].name;
      } else if (voiceGroups.english.length > 0) {
        voiceSelect.value = voiceGroups.english[0].name;
      }
    };
    
    const prepareTextForReading = () => {
      // Get readable text elements
      const elements = qa('p, h1, h2, h3, h4, h5, h6, li', textContainer);
      textSegments = [];
      totalWords = 0;
      
      elements.forEach(el => {
        const text = advancedTTS.cleanTextForTTS(el.textContent);
        if (text) {
          const words = text.split(/\s+/).filter(w => w.length > 0);
          if (words.length > 0) {
            textSegments.push({
              element: el,
              text,
              words: words.length
            });
            totalWords += words.length;
          }
        }
      });
      
      return textSegments.length > 0;
    };
    
    const updateProgress = () => {
      if (totalWords > 0) {
        const percentage = Math.round((currentWords / totalWords) * 100);
        progressEl.textContent = `${percentage}%`;
        progressEl.setAttribute('aria-valuenow', percentage.toString());
        progressEl.setAttribute('aria-valuemin', '0');
        progressEl.setAttribute('aria-valuemax', '100');
      }
    };
    
    const highlightCurrentSegment = (segmentIndex) => {
      // Remove previous highlights
      qa('.tts-highlight', textContainer).forEach(el => {
        el.classList.remove('tts-highlight');
      });
      
      // Highlight current segment
      if (segmentIndex < textSegments.length) {
        const segment = textSegments[segmentIndex];
        segment.element.classList.add('tts-highlight');
        smoothScrollToElement(segment.element, 150);
      }
    };
    
    const speakNext = async () => {
      if (currentSegment >= textSegments.length) {
        // Finished reading
        isReading = false;
        playBtn.innerHTML = '<span class="tts-play-icon">▶️</span><span class="tts-play-text">Play</span>';
        playBtn.setAttribute('aria-pressed', 'false');
        statusEl.textContent = 'Finished reading';
        qa('.tts-highlight', textContainer).forEach(el => el.classList.remove('tts-highlight'));
        currentSegment = 0;
        currentWords = 0;
        updateProgress();
        return;
      }
      
      const segment = textSegments[currentSegment];
      highlightCurrentSegment(currentSegment);
      statusEl.textContent = `Reading... (${currentSegment + 1}/${textSegments.length})`;
      
      try {
        const selectedVoice = voiceSelect.value;
        const options = {
          voiceName: selectedVoice,
          rate: parseFloat(rateSlider.value) || 1.0,
          pitch: parseFloat(pitchSlider.value) || 1.0
        };
        
        await advancedTTS.speak(segment.text, options);
        
        currentWords += segment.words;
        currentSegment++;
        updateProgress();
        
        if (isReading) {
          setTimeout(() => speakNext(), 100);
        }
        
      } catch (error) {
        console.error('TTS Error:', error);
        statusEl.textContent = `Error: ${error.message}`;
        isReading = false;
        playBtn.innerHTML = '<span class="tts-play-icon">▶️</span><span class="tts-play-text">Play</span>';
        playBtn.setAttribute('aria-pressed', 'false');
      }
    };
    
    const startReading = () => {
      if (!prepareTextForReading()) {
        statusEl.textContent = 'No readable content found';
        return;
      }
      
      isReading = true;
      currentSegment = 0;
      currentWords = 0;
      playBtn.innerHTML = '<span class="tts-play-icon">⏸️</span><span class="tts-play-text">Pause</span>';
      playBtn.setAttribute('aria-pressed', 'true');
      statusEl.textContent = 'Starting...';
      updateProgress();
      speakNext();
    };
    
    const stopReading = () => {
      isReading = false;
      advancedTTS.stop();
      playBtn.innerHTML = '<span class="tts-play-icon">▶️</span><span class="tts-play-text">Play</span>';
      playBtn.setAttribute('aria-pressed', 'false');
      statusEl.textContent = 'Stopped';
      qa('.tts-highlight', textContainer).forEach(el => el.classList.remove('tts-highlight'));
    };
    
    // Event listeners
    playBtn.addEventListener('click', () => {
      if (isReading) {
        stopReading();
      } else {
        startReading();
      }
    });
    
    rateSlider.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      rateValue.textContent = value.toFixed(1);
    });
    
    pitchSlider.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      pitchValue.textContent = value.toFixed(1);
    });
    
    // Initialize voices
    loadVoices();
    
    return {
      start: startReading,
      stop: stopReading,
      isReading: () => isReading
    };
  }

  // Enhanced modal management with better cleanup
  function closeModal(force = false) {
    console.log('Closing modal, stack level:', getCurrentModalLevel());
    
    // Handle nested modals (like share modal)
    if (q('.custom-share-modal')) {
      qa('.custom-share-modal').forEach(modal => {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
      });
      popModal();
      
      if (!force) {
        return; // Don't close main modal if we're just closing a nested modal
      }
    }
    
    // Stop TTS
    advancedTTS.stop();
    
    // Save scroll position before closing
    saveScrollPosition('main-modal');
    
    if (!modal || !modalOpen) {
      return;
    }
    
    // Clean up modal state
    modal.setAttribute('aria-hidden', 'true');
    modal.classList.remove('open');
    modal.style.display = 'none';
    
    // Remove modal-specific elements
    qa('.modal-controls-fixed, .tts-controls, .table-of-contents, .modal-related', modal)
      .forEach(el => el.remove());
    
    // Clean up highlights and TTS elements
    qa('.tts-highlight, .tts-word-span', modalText).forEach(el => {
      if (el.classList.contains('tts-word-span')) {
        el.parentNode?.replaceChild(document.createTextNode(el.textContent), el);
      } else {
        el.classList.remove('tts-highlight');
      }
    });
    
    // Show original close button
    if (btnClose) {
      btnClose.classList.remove('sr-only');
    }
    
    // Unlock page scroll
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
    clearModalStack();
    
    // Handle navigation
    const shouldNavigateBack = getCurrentModalLevel() > 0 || !isInitialLoad;
    
    if (shouldNavigateBack) {
      try {
        // Check if we can go back in history
        if (window.history.length > 1 && window.history.state) {
          history.back();
        } else {
          // Fallback to places page
          window.location.href = 'https://www.pattibytes.com/places/';
        }
      } catch (error) {
        console.warn('Navigation failed:', error);
        window.location.href = 'https://www.pattibytes.com/places/';
      }
    } else {
      // Update URL without navigation
      try {
        history.replaceState(null, '', 'https://www.pattibytes.com/places/');
      } catch (error) {
        console.warn('URL update failed:', error);
      }
    }
    
    console.log('Modal closed successfully');
  }

  function openModal(index) {
    if (!modal || index < 0 || index >= cards.length) {
      console.error('Invalid modal open request:', { modal: !!modal, index, cardsLength: cards.length });
      return;
    }
    
    // Save current scroll position
    if (modalOpen) {
      saveScrollPosition(`modal-${currentIndex}`);
    } else {
      saveScrollPosition('main-page');
    }
    
    currentIndex = index;
    const card = cards[currentIndex];
    const articleId = card.id || card.dataset.id || '';
    
    console.log('Opening modal for:', articleId);
    
    // Clean up previous modal state
    qa('.modal-controls-fixed, .tts-controls, .table-of-contents, .modal-related', modal)
      .forEach(el => el.remove());
    
    // Hide original close button
    if (btnClose) {
      btnClose.classList.add('sr-only');
    }
    
    // Get content data
    const imgSrc = card.dataset.image || '';
    const fullHtml = card.dataset.full || card.dataset.preview || '';
    const cardTitle = card.dataset.title || card.querySelector('h3')?.textContent || '';
    
    // Create enhanced modal controls
    const modalControls = createModalControls(cardTitle, articleId, imgSrc);
    modalContent.prepend(modalControls);
    
    // Set modal content
    if (modalMedia) {
      modalMedia.innerHTML = imgSrc ? 
        `<img src="${imgSrc}" alt="${cardTitle}" loading="lazy">` : '';
    }
    
    if (modalText) {
      modalText.innerHTML = fullHtml;
    }
    
    // Create table of contents
    const tocContainer = createTableOfContents(modalText);
    if (tocContainer) {
      if (modalMedia?.innerHTML) {
        modalMedia.after(tocContainer);
      } else {
        modalText.parentNode.insertBefore(tocContainer, modalText);
      }
    }
    
    // Create TTS controls
    const ttsControls = createTTSControls(modalText, {
      language: detectLanguage(modalText.textContent).language
    });
    
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
    
    // Lock page scroll
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    
    document.documentElement.classList.add('modal-open');
    modalOpen = true;
    
    // Focus management
    lastFocusedElement = document.activeElement;
    const closeBtn = q('.modal-close-btn', modalControls);
    closeBtn?.focus();
    
    // Reset scroll position
    const modalBody = q('.modal-body', modal);
    if (modalBody) {
      modalBody.scrollTop = 0;
    }
    
    // Update navigation
    pushModal('main-modal', { articleId, index });
    updateNavigation(articleId, 'push');
    
    console.log('Modal opened successfully');
  }

  function createModalControls(title, articleId, image) {
    const controls = document.createElement('div');
    controls.className = 'modal-controls-fixed';
    
    const titleEl = document.createElement('h2');
    titleEl.className = 'modal-controls-title';
    titleEl.textContent = title;
    
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'modal-controls-buttons';
    
    const buttons = [
      { class: 'tts-toggle-btn', icon: '🔊', label: 'Toggle text-to-speech', action: 'tts' },
      { class: 'toc-toggle-btn', icon: '📋', label: 'Toggle table of contents', action: 'toc' },
      { class: 'modal-share-btn', icon: '📤', label: 'Share article', action: 'share' },
      { class: 'modal-link-btn', icon: '🔗', label: 'Copy article link', action: 'copy' },
      { class: 'modal-close-btn', icon: '✕', label: 'Close modal', action: 'close' }
    ];
    
    buttons.forEach(({ class: className, icon, label, action }) => {
      const btn = document.createElement('button');
      btn.className = `modal-control-btn ${className}`;
      btn.innerHTML = icon;
      btn.title = label;
      btn.setAttribute('aria-label', label);
      btn.setAttribute('data-action', action);
      
      buttonsContainer.appendChild(btn);
    });
    
    controls.appendChild(titleEl);
    controls.appendChild(buttonsContainer);
    
    // Add event listeners
    setupModalControlEvents(controls, title, articleId, image);
    
    return controls;
  }

  function setupModalControlEvents(controls, title, articleId, image) {
    const buttons = qa('.modal-control-btn', controls);
    
    buttons.forEach(btn => {
      const action = btn.dataset.action;
      
      btn.addEventListener('click', async () => {
        switch(action) {
          case 'tts':
            toggleTTS(btn);
            break;
          case 'toc':
            toggleTOC(btn);
            break;
          case 'share':
            await shareArticle(title, articleId, image);
            break;
          case 'copy':
            await copyArticleLink(articleId, btn);
            break;
          case 'close':
            closeModal(true);
            break;
        }
      });
    });
  }

  function toggleTTS(btn) {
    const ttsControls = q('.tts-controls');
    if (!ttsControls) return;
    
    const isActive = btn.classList.contains('active');
    
    if (isActive) {
      ttsControls.style.display = 'none';
      btn.classList.remove('active');
      btn.innerHTML = '🔊';
      advancedTTS.stop();
    } else {
      ttsControls.style.display = 'flex';
      btn.classList.add('active');
      btn.innerHTML = '🔊';
      
      // Focus the play button
      const playBtn = q('.tts-play', ttsControls);
      if (playBtn) {
        smoothScrollToElement(ttsControls, 80);
        setTimeout(() => playBtn.focus(), 300);
      }
    }
  }

  function toggleTOC(btn) {
    const tocContainer = q('.table-of-contents');
    if (!tocContainer) return;
    
    const isVisible = tocContainer.style.display !== 'none';
    
    tocContainer.style.display = isVisible ? 'none' : 'block';
    btn.classList.toggle('active', !isVisible);
    btn.innerHTML = isVisible ? '📋' : '✕';
    
    if (!isVisible) {
      smoothScrollToElement(tocContainer, 80);
    }
  }

  async function shareArticle(title, articleId, image) {
    const url = `https://www.pattibytes.com/places/#${encodeURIComponent(articleId)}`;
    const card = document.getElementById(articleId);
    const text = (card?.dataset.preview || 'ਪੱਟੀ ਦੇ ਪ੍ਰਸਿੱਧ ਸਥਾਨ').slice(0, 200);
    
    showCustomShareModal({ title, text, url, image });
  }

  async function copyArticleLink(articleId, btn) {
    const url = `https://www.pattibytes.com/places/#${encodeURIComponent(articleId)}`;
    
    try {
      await copyToClipboard(url);
      btn.classList.add('copied');
      btn.innerHTML = '✓';
      showNotification('Article link copied! / ਲਿੰਕ ਕਾਪੀ ਹੋਇਆ!', 'success');
      
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.innerHTML = '🔗';
      }, 2000);
    } catch (error) {
      showNotification('Copy failed. Please try again. / ਕਾਪੀ ਅਸਫਲ ਹੋਇਆ।', 'error');
      console.error('Copy failed:', error);
    }
  }

  function createRelatedContent(activeCard) {
    const existing = q('.modal-related');
    if (existing) existing.remove();
    
    const relatedContainer = document.createElement('div');
    relatedContainer.className = 'modal-related';
    relatedContainer.innerHTML = `
      <h4>ਤੁਹਾਨੂੰ ਇਹ ਵੀ ਪਸੰਦ ਆ ਸਕਦਾ ਹੈ / You May Also Like</h4>
    `;
    
    const relatedList = document.createElement('div');
    relatedList.className = 'related-list';
    
    // Get related cards (excluding current one)
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
            <button class="related-open" data-card-id="${cardId}" aria-label="Open ${cardTitle}">
              ਖੋਲ੍ਹੋ / Open
            </button>
          </div>
        </div>
      `;
      
      relatedList.appendChild(relatedCard);
    });
    
    relatedContainer.appendChild(relatedList);
    modalText.parentNode.appendChild(relatedContainer);
    
    // Add event listeners for related cards
    qa('.related-open', relatedContainer).forEach(btn => {
      btn.addEventListener('click', () => {
        const cardId = btn.dataset.cardId;
        const targetCard = document.getElementById(cardId);
        
        if (targetCard) {
          const targetIndex = cards.indexOf(targetCard);
          if (targetIndex !== -1) {
            // Save current position in stack
            saveScrollPosition(`modal-${currentIndex}`);
            
            // Open new modal
            setTimeout(() => {
              openModal(targetIndex);
              
              // Highlight the card briefly
              targetCard.classList.add('highlighted');
              setTimeout(() => targetCard.classList.remove('highlighted'), 2000);
            }, 100);
          }
        }
      });
    });
  }

  // Enhanced keyboard and navigation handling
  function setupKeyboardHandling() {
    document.addEventListener('keydown', (e) => {
      if (!modalOpen) return;
      
      switch(e.key) {
        case 'Escape':
          if (q('.custom-share-modal.show')) {
            // Close share modal first
            qa('.custom-share-modal').forEach(modal => {
              modal.classList.remove('show');
              setTimeout(() => modal.remove(), 300);
            });
            popModal();
          } else {
            closeModal(true);
          }
          break;
          
        case ' ':
          if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') {
            e.preventDefault();
            const ttsToggle = q('.tts-toggle-btn');
            if (ttsToggle) {
              ttsToggle.click();
            }
          }
          break;
          
        case 'ArrowLeft':
          if (e.ctrlKey && currentIndex > 0) {
            e.preventDefault();
            openModal(currentIndex - 1);
          }
          break;
          
        case 'ArrowRight':
          if (e.ctrlKey && currentIndex < cards.length - 1) {
            e.preventDefault();
            openModal(currentIndex + 1);
          }
          break;
      }
    }, true);
    
    // Handle browser back/forward buttons
    window.addEventListener('popstate', (e) => {
      console.log('Popstate event:', e.state);
      
      if (modalOpen) {
        // Modal is open, close it
        closeModal(false);
        return;
      }
      
      // Check if we should open a modal based on hash
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

  // Setup search functionality
  function setupSearch() {
    if (!searchInput) return;
    
    let searchTimeout;
    
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      
      searchTimeout = setTimeout(() => {
        const query = e.target.value.trim();
        const resultCount = performSearch(query);
        
        // Update clear button visibility
        if (clearSearch) {
          clearSearch.classList.toggle('visible', query.length > 0);
        }
        
        // Log search for analytics (if needed)
        if (query.length > 2) {
          console.log('Search performed:', { query, results: resultCount });
        }
      }, 300);
    });
    
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        
        // Find first visible card and highlight it
        const firstVisible = cards.find(card => card.style.display !== 'none');
        if (firstVisible) {
          smoothScrollToElement(firstVisible, 100);
          firstVisible.classList.add('search-result-highlight');
          setTimeout(() => firstVisible.classList.remove('search-result-highlight'), 3000);
          
          // Focus the card for keyboard navigation
          firstVisible.focus();
        }
      }
    });
    
    // Clear search functionality
    if (clearSearch) {
      clearSearch.addEventListener('click', () => {
        searchInput.value = '';
        performSearch('');
        clearSearch.classList.remove('visible');
        searchInput.focus();
      });
    }
  }

  // Setup card interactions
  function setupCardInteractions() {
    cards.forEach((card, index) => {
      // Make cards keyboard accessible
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'article');
      card.setAttribute('aria-label', `Open article: ${card.dataset.title || 'Untitled'}`);
      
      // Click to open modal
      card.addEventListener('click', (e) => {
        // Don't open modal if clicking on buttons
        if (e.target.closest('button, a, .action-buttons')) {
          return;
        }
        
        openModal(index);
      });
      
      // Keyboard navigation
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal(index);
        }
      });
      
      // Enhanced hover effects
      let hoverTimeout;
      card.addEventListener('mouseenter', () => {
        clearTimeout(hoverTimeout);
        card.style.transform = 'translateY(-8px) scale(1.02)';
      });
      
      card.addEventListener('mouseleave', () => {
        hoverTimeout = setTimeout(() => {
          card.style.transform = '';
        }, 150);
      });
    });
  }

  // Setup copy and share functionality
  function setupCopyShareButtons() {
    // Setup copy buttons
    qa('.copy-link').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        const card = btn.closest('.place-card');
        if (!card) return;
        
        const articleId = card.id || card.dataset.id || '';
        const url = `https://www.pattibytes.com/places/#${encodeURIComponent(articleId)}`;
        
        try {
          await copyToClipboard(url);
          
          btn.classList.add('copied');
          const originalText = btn.textContent;
          btn.textContent = '✓';
          
          showNotification('Link copied! / ਲਿੰਕ ਕਾਪੀ ਹੋਇਆ!', 'success');
          
          setTimeout(() => {
            btn.classList.remove('copied');
            btn.textContent = originalText;
          }, 2000);
          
        } catch (error) {
          showNotification('Copy failed / ਕਾਪੀ ਅਸਫਲ', 'error');
          console.error('Copy failed:', error);
        }
      });
    });
    
    // Setup share buttons
    qa('.share-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        const card = btn.closest('.place-card');
        if (!card) return;
        
        const title = card.dataset.title || card.querySelector('h3')?.textContent || '';
        const url = `https://www.pattibytes.com/places/#${encodeURIComponent(card.id)}`;
        const text = (card.dataset.preview || 'ਪੱਟੀ ਦੇ ਪ੍ਰਸਿੱਧ ਸਥਾਨ').slice(0, 200);
        const image = card.dataset.image || '';
        
        showCustomShareModal({ title, text, url, image });
        
        btn.classList.add('shared');
        setTimeout(() => btn.classList.remove('shared'), 1500);
      });
    });
  }

  // Initialize everything when DOM is ready
  function initializePlaces() {
    console.log('Initializing Enhanced Places.js...');
    
    // Get DOM elements
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
      console.warn('Essential elements not found:', { modal: !!modal, cards: cards.length });
      return;
    }
    
    // Arrange action buttons horizontally
    cards.forEach((card, index) => {
      const content = card.querySelector('.place-content');
      if (!content) return;
      
      // Find existing buttons
      const readBtn = content.querySelector('.read-more-btn');
      const copyBtn = content.querySelector('.copy-link');
      const shareBtn = content.querySelector('.share-btn');
      
      // Skip if already arranged
      if (content.querySelector('.place-actions')) return;
      
      // Create actions container
      const actionsContainer = document.createElement('div');
      actionsContainer.className = 'place-actions';
      
      // Add read more button
      if (readBtn) {
        readBtn.remove();
        readBtn.setAttribute('data-index', index);
        actionsContainer.appendChild(readBtn);
        
        // Add event listener
        readBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openModal(index);
        });
      }
      
      // Create button group for copy/share
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
    });
    
    // Build search index
    buildSearchIndex();
    
    // Setup all functionality
    setupSearch();
    setupCardInteractions();
    setupCopyShareButtons();
    setupKeyboardHandling();
    
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
    
    // Setup modal overlay click
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal(true);
        }
      });
    }
    
    console.log('Enhanced Places.js initialized successfully!', {
      cards: cards.length,
      searchEnabled: !!searchInput,
      ttsSupported: advancedTTS.isSupported,
      voicesAvailable: advancedTTS.voices.length
    });
  }

  // Error handling
  window.addEventListener('error', (e) => {
    if (e.filename?.includes('places.js') || e.message?.includes('places')) {
      console.error('Places.js Error:', e.error || e.message);
      showNotification('A technical error occurred. Please refresh the page.', 'error', 8000);
    }
  });
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    advancedTTS.stop();
  });
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePlaces);
  } else {
    initializePlaces();
  }

})();
