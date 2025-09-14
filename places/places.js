// Enhanced places.js with fullscreen modal, improved sharing, and better mobile experience
(function () {
  "use strict";

  // Utilities
  const q  = (s, c = document) => (c || document).querySelector(s);
  const qa = (s, c = document) => Array.from((c || document).querySelectorAll(s));

  // Normalize text: remove accents, lower case
  const norm = (s) => (s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  // Enhanced Punjabi to Roman transliteration
  const paToRoman = (txt) => (txt || '')
    .replace(/[ਅਆ]/g, 'a').replace(/[ਇਈ]/g, 'i').replace(/[ਉਊ]/g, 'u')
    .replace(/[ਏਐ]/g, 'e').replace(/[ਓਔ]/g, 'o').replace(/[ਂੰ]/g, 'n')
    .replace(/[ਕਖਗਘ]/g, 'k').replace(/[ਙ]/g, 'ng').replace(/[ਚਛਜਝ]/g, 'ch')
    .replace(/[ਞ]/g, 'nj').replace(/[ਟਠਡਢ]/g, 't').replace(/[ਣਨ]/g, 'n')
    .replace(/[ਤਥਦਧ]/g, 'd').replace(/[ਪਫਬਭ]/g, 'p').replace(/[ਮ]/g, 'm')
    .replace(/[ਯ]/g, 'y').replace(/[ਰ]/g, 'r').replace(/[ਲ]/g, 'l')
    .replace(/[ਵ]/g, 'v').replace(/[ਸਸ਼]/g, 's').replace(/[ਹ]/g, 'h');

  // Enhanced English to Punjabi word mapping for search
  const enToPunjabi = {
    'gurdwara': 'ਗੁਰਦੁਆਰਾ', 'gurudwara': 'ਗੁਰਦੁਆਰਾ', 'temple': 'ਮੰਦਿਰ', 
    'school': 'ਸਕੂਲ', 'college': 'ਕਾਲਜ', 'university': 'ਯੂਨੀਵਰਸਿਟੀ',
    'hospital': 'ਹਸਪਤਾਲ', 'market': 'ਮਾਰਕੀਟ', 'bazaar': 'ਬਜ਼ਾਰ',
    'park': 'ਪਾਰਕ', 'garden': 'ਬਗੀਚਾ', 'river': 'ਨਦੀ', 'canal': 'ਨਹਿਰ',
    'village': 'ਪਿੰਡ', 'city': 'ਸ਼ਹਿਰ', 'town': 'ਕਸਬਾ',
    'place': 'ਸਥਾਨ', 'location': 'ਜਗ੍ਹਾ', 'famous': 'ਮਸ਼ਹੂਰ', 'popular': 'ਪ੍ਰਸਿੱਧ',
    'history': 'ਇਤਿਹਾਸ', 'heritage': 'ਵਿਰਾਸਤ', 'culture': 'ਸੱਭਿਆਚਾਰ'
  };

  // Enhanced translation mappings for TTS
  const paToEnglish = {
    'ਗੁਰਦੁਆਰਾ': 'Gurdwara', 'ਮੰਦਿਰ': 'Temple', 'ਮਸਜਿਦ': 'Mosque',
    'ਸਕੂਲ': 'School', 'ਕਾਲਜ': 'College', 'ਯੂਨੀਵਰਸਿਟੀ': 'University',
    'ਹਸਪਤਾਲ': 'Hospital', 'ਕਲੀਨਿਕ': 'Clinic', 'ਡਾਕਟਰ': 'Doctor',
    'ਪਾਰਕ': 'Park', 'ਬਗੀਚਾ': 'Garden', 'ਮਾਰਕੀਟ': 'Market', 'ਬਜ਼ਾਰ': 'Bazaar',
    'ਪਿੰਡ': 'Village', 'ਸ਼ਹਿਰ': 'City', 'ਕਸਬਾ': 'Town',
    'ਸਥਾਨ': 'Place', 'ਜਗ੍ਹਾ': 'Location', 'ਮਸ਼ਹੂਰ': 'Famous', 'ਪ੍ਰਸਿੱਧ': 'Popular',
    'ਇਤਿਹਾਸ': 'History', 'ਵਿਰਾਸਤ': 'Heritage', 'ਸੱਭਿਆਚਾਰ': 'Culture',
    'ਨਦੀ': 'River', 'ਨਹਿਰ': 'Canal', 'ਤਲਾਬ': 'Pond', 'ਖੇਤ': 'Farm'
  };

  // Deep-link hash normalize
  function normalizeHash(h) {
    if (!h) return '';
    let s = h.replace(/^#/, '').replace(/\/+$|\/+/g, '');
    try { return decodeURIComponent(s); } catch { return s; }
  }

  // Store state
  let previousUrl = window.location.href;
  let scrollPosition = 0;
  let ttsState = { paused: false, currentWord: 0, queuePos: 0, language: 'auto' };

  // Always use modal - no mobile redirect
  const isMobile = () => window.innerWidth <= 768;

  // Clipboard copy fallback
  async function copyToClipboard(text) {
    if (!text) throw new Error('No text to copy');
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }

  // Enhanced share modal with comprehensive social media options
  function showCustomShareModal({ title, text, url, image }) {
    const existing = q('.custom-share-modal');
    if (existing) existing.remove();

    // Disable native sharing completely
    navigator.share = null;

    const shareText = `${text}\n\nClick link to read full article: ${url}`;

    const modal = document.createElement('div');
    modal.className = 'custom-share-modal';
    modal.innerHTML = `
      <div class="share-modal-content">
        <div class="share-modal-header">
          <h3>🔗 Share Article / ਸਾਂਝਾ ਕਰੋ</h3>
          <button class="share-modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="share-modal-body">
          <div class="share-preview">
            ${image ? `<img src="${image}" alt="${title}" class="share-image">` : '<div class="share-placeholder">📍</div>'}
            <div class="share-info">
              <h4>${title}</h4>
              <p>${text}</p>
            </div>
          </div>
          <div class="share-link-container">
            <input type="text" class="share-link-input" value="${url}" readonly>
            <button class="copy-share-link">📋 Copy Link</button>
          </div>
          <div class="share-options-container">
            <h5>Share on Social Media:</h5>
            <div class="share-options-scroll">
              <button class="share-option" data-service="whatsapp">
                <span class="share-icon">💬</span>
                <span>WhatsApp</span>
              </button>
              <button class="share-option" data-service="facebook">
                <span class="share-icon">📘</span>
                <span>Facebook</span>
              </button>
              <button class="share-option" data-service="twitter">
                <span class="share-icon">🐦</span>
                <span>Twitter</span>
              </button>
              <button class="share-option" data-service="telegram">
                <span class="share-icon">✈️</span>
                <span>Telegram</span>
              </button>
              <button class="share-option" data-service="instagram">
                <span class="share-icon">📸</span>
                <span>Instagram</span>
              </button>
              <button class="share-option" data-service="linkedin">
                <span class="share-icon">💼</span>
                <span>LinkedIn</span>
              </button>
              <button class="share-option" data-service="reddit">
                <span class="share-icon">🤖</span>
                <span>Reddit</span>
              </button>
              <button class="share-option" data-service="pinterest">
                <span class="share-icon">📌</span>
                <span>Pinterest</span>
              </button>
              <button class="share-option" data-service="quora">
                <span class="share-icon">🔍</span>
                <span>Quora</span>
              </button>
              <button class="share-option" data-service="email">
                <span class="share-icon">📧</span>
                <span>Email</span>
              </button>
              <button class="share-option" data-service="sms">
                <span class="share-icon">💬</span>
                <span>SMS</span>
              </button>
              <button class="share-option" data-service="copy">
                <span class="share-icon">📝</span>
                <span>Copy Text</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);

    const closeModal = () => {
      modal.classList.remove('show');
      setTimeout(() => modal.remove(), 300);
    };

    // Event listeners
    q('.share-modal-close', modal).addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Copy link functionality
    q('.copy-share-link', modal).addEventListener('click', async () => {
      try {
        await copyToClipboard(url);
        const btn = q('.copy-share-link', modal);
        const original = btn.innerHTML;
        btn.innerHTML = '✅ Copied!';
        btn.style.background = 'var(--success-color)';
        setTimeout(() => {
          btn.innerHTML = original;
          btn.style.background = '';
        }, 2000);
        showNotification('Link copied! / ਲਿੰਕ ਕਾਪੀ ਹੋਇਆ!', 'success');
      } catch {
        showNotification('Copy failed / ਕਾਪੀ ਅਸਫਲ', 'error');
      }
    });

    // Social media sharing
    qa('.share-option', modal).forEach(btn => {
      btn.addEventListener('click', () => {
        const service = btn.dataset.service;
        let shareUrl = '';
        
        const encodedTitle = encodeURIComponent(title);
        const encodedText = encodeURIComponent(shareText);
        const encodedUrl = encodeURIComponent(url);
        
        switch(service) {
          case 'whatsapp':
            shareUrl = `https://wa.me/?text=${encodedText}`;
            break;
          case 'facebook':
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
            break;
          case 'twitter':
            shareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
            break;
          case 'telegram':
            shareUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`;
            break;
          case 'instagram':
            // Instagram doesn't support direct URL sharing, copy to clipboard
            copyToClipboard(shareText);
            showNotification('Content copied! Open Instagram and paste.', 'info');
            break;
          case 'linkedin':
            shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
            break;
          case 'reddit':
            shareUrl = `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`;
            break;
          case 'pinterest':
            shareUrl = `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}`;
            break;
          case 'quora':
            copyToClipboard(`${title}\n\n${shareText}`);
            showNotification('Content copied! Open Quora and paste.', 'info');
            break;
          case 'email':
            shareUrl = `mailto:?subject=${encodedTitle}&body=${encodedText}`;
            break;
          case 'sms':
            shareUrl = `sms:?body=${encodedText}`;
            break;
          case 'copy':
            copyToClipboard(shareText);
            showNotification('Full content copied! / ਪੂਰੀ ਸਮੱਗਰੀ ਕਾਪੀ ਹੋਈ!', 'success');
            break;
        }
        
        if (shareUrl && service !== 'instagram' && service !== 'quora' && service !== 'copy') {
          if (service === 'email' || service === 'sms') {
            window.location.href = shareUrl;
          } else {
            window.open(shareUrl, '_blank', 'width=600,height=400,scrollbars=yes,resizable=yes');
          }
        }
        
        if (service !== 'copy') {
          closeModal();
        }
      });
    });
  }

  // Enhanced notification system
  function showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <span class="notification-message">${message}</span>
      <button class="notification-close" aria-label="Close">&times;</button>
    `;
    
    const colors = {
      error: '#ef4444',
      success: '#10b981', 
      info: '#3b82f6'
    };
    
    notification.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 10002;
      background: ${colors[type] || colors.info};
      color: white; padding: 1rem 1.5rem; border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.15); max-width: 400px;
      animation: slideInRight 0.3s ease-out; backdrop-filter: blur(10px);
    `;

    document.body.appendChild(notification);

    const close = () => {
      notification.style.animation = 'slideOutRight 0.3s ease-in forwards';
      setTimeout(() => notification.remove(), 300);
    };

    q('.notification-close', notification).addEventListener('click', close);
    setTimeout(close, duration);
  }

  // Visual flash highlight
  function flashHighlight(el, className = 'highlighted', duration = 2000) {
    if (!el) return;
    el.classList.add(className);
    setTimeout(() => el.classList.remove(className), duration);
  }

  // Enhanced language detection
  function detectContentLanguage(text, minChars = 200) {
    const totalLength = text.length;
    if (totalLength < 50) return 'insufficient';

    const punjabiFactor = (text.match(/[\u0A00-\u0A7F]/g) || []).length;
    const englishFactor = (text.match(/[a-zA-Z]/g) || []).length;
    const hindiFactor = (text.match(/[\u0900-\u097F]/g) || []).length;

    const hasSufficientPunjabi = punjabiFactor >= minChars;
    const hasSufficientEnglish = englishFactor >= minChars;
    const hasSufficientHindi = hindiFactor >= minChars;

    if (hasSufficientPunjabi && punjabiFactor / totalLength > 0.3) return 'pa';
    if (hasSufficientEnglish && englishFactor / totalLength > 0.5) return 'en';
    if (hasSufficientHindi && hindiFactor / totalLength > 0.3) return 'hi';
    
    if (punjabiFactor > englishFactor && punjabiFactor > hindiFactor) return 'pa-insufficient';
    if (englishFactor > hindiFactor) return 'en-insufficient';
    return 'mixed';
  }

  // Auto-translate text
  function autoTranslateText(text, targetLang = 'en') {
    let translated = text;
    
    if (targetLang === 'en') {
      Object.entries(paToEnglish).forEach(([pa, en]) => {
        translated = translated.replace(new RegExp(pa, 'g'), en);
      });
      
      translated = translated
        .replace(/ਦਾ|ਦੇ|ਦੀ/g, 'of')
        .replace(/ਵਿੱਚ/g, 'in')
        .replace(/ਨਾਲ/g, 'with')
        .replace(/ਤੇ|ਅਤੇ/g, 'and')
        .replace(/ਇਹ/g, 'this')
        .replace(/ਉਹ/g, 'that');
    }
    
    return translated;
  }

  // Enhanced Google Translate integration for full modal content
  function setupGoogleTranslateIntegration() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
          if (modalOpen && q('.modal-text')) {
            const modalText = q('.modal-text');
            const newLang = detectContentLanguage(modalText.textContent || '');
            if (newLang !== ttsState.language) {
              ttsState.language = newLang;
              const ttsControls = q('.tts-controls.show');
              if (ttsControls) {
                updateTTSLanguage(ttsControls, modalText, newLang);
              }
            }
          }
        }
      });
    });

    // Observe the entire modal for Google Translate changes
    if (modal) {
      observer.observe(modal, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['class', 'lang']
      });
    }

    return observer;
  }

  // Update TTS language
  function updateTTSLanguage(ttsWrapper, modalTextContainer, detectedLang) {
    const statusSpan = q('.tts-status', ttsWrapper);
    const voiceSelect = q('#tts-voices', ttsWrapper);
    
    if (statusSpan) {
      if (detectedLang.includes('insufficient') || detectedLang === 'mixed') {
        statusSpan.textContent = 'Content auto-translated for better speech quality';
      } else {
        statusSpan.textContent = `Ready for ${detectedLang.toUpperCase()} voices`;
      }
    }
    
    if (voiceSelect) {
      loadVoicesForLanguage(voiceSelect, detectedLang);
    }
  }

  // Create Table of Contents
  function createTableOfContents(content) {
    const headings = qa('h1, h2, h3, h4, h5, h6', content);
    if (!headings.length) return null;

    const tocContainer = document.createElement('div');
    tocContainer.className = 'table-of-contents';
    
    const tocHeader = document.createElement('div');
    tocHeader.className = 'toc-header';
    tocHeader.innerHTML = `
      <h4 class="toc-title">📑 Contents / ਸਮੱਗਰੀ</h4>
      <button class="toc-collapse" aria-label="Collapse TOC">−</button>
    `;
    tocContainer.appendChild(tocHeader);

    const tocList = document.createElement('ul');
    tocList.className = 'toc-list';

    headings.forEach((heading, index) => {
      const headingId = `heading-${index}-${heading.textContent.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')}`;
      heading.id = headingId;
      heading.style.scrollMarginTop = '120px';

      const tocItem = document.createElement('li');
      tocItem.className = `toc-item toc-level-${heading.tagName.toLowerCase()}`;
      
      const tocLink = document.createElement('a');
      tocLink.href = `#${headingId}`;
      tocLink.textContent = heading.textContent;
      tocLink.className = 'toc-link';
      
      tocLink.addEventListener('click', (e) => {
        e.preventDefault();
        heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
        flashHighlight(heading, 'toc-target-highlight', 2000);
        
        qa('.toc-link.active').forEach(link => link.classList.remove('active'));
        tocLink.classList.add('active');
      });

      tocItem.appendChild(tocLink);
      tocList.appendChild(tocItem);
    });

    tocContainer.appendChild(tocList);

    // TOC collapse functionality
    q('.toc-collapse', tocContainer).addEventListener('click', function() {
      const isCollapsed = tocList.style.display === 'none';
      tocList.style.display = isCollapsed ? 'block' : 'none';
      this.textContent = isCollapsed ? '−' : '+';
      this.setAttribute('aria-label', isCollapsed ? 'Collapse TOC' : 'Expand TOC');
    });

    return tocContainer;
  }

  // Enhanced speech synthesis
  let voiceList = [];
  function ensureVoicesLoaded(timeout = 3000) {
    return new Promise((resolve) => {
      const synth = window.speechSynthesis;
      if (!synth) {
        resolve([]);
        return;
      }

      const voices = synth.getVoices();
      if (voices.length) {
        voiceList = voices;
        resolve(voices);
        return;
      }
      
      let resolved = false;
      const onVoicesChanged = () => {
        if (resolved) return;
        voiceList = synth.getVoices() || [];
        resolved = true;
        resolve(voiceList);
      };
      
      if ('onvoiceschanged' in synth) {
        synth.onvoiceschanged = onVoicesChanged;
      }
      
      const start = performance.now();
      const poll = () => {
        const vs = synth.getVoices();
        if (vs.length) {
          voiceList = vs;
          resolved = true;
          resolve(vs);
          return;
        }
        if (performance.now() - start > timeout) {
          voiceList = vs || [];
          resolved = true;
          resolve(voiceList);
          return;
        }
        setTimeout(poll, 100);
      };
      poll();
    });
  }

  // Load voices for specific language
  function loadVoicesForLanguage(selectElement, langPref) {
    const getLangCode = code => (code || '').split(/[-_]/)[0].toLowerCase();
    
    const addGroup = (label, arr) => {
      if (!arr.length) return;
      const og = document.createElement('optgroup');
      og.label = label;
      arr.forEach(v => {
        const opt = document.createElement('option');
        opt.value = `${v.name}||${v.lang}`;
        opt.textContent = `${v.name} (${v.lang})`;
        og.appendChild(opt);
      });
      selectElement.appendChild(og);
    };

    const cleanLangPref = langPref.replace('-insufficient', '');
    
    const preferred = voiceList.filter(v => getLangCode(v.lang) === cleanLangPref);
    const english = voiceList.filter(v => getLangCode(v.lang) === 'en');
    const hindi = voiceList.filter(v => getLangCode(v.lang) === 'hi');
    const others = voiceList.filter(v => 
      !preferred.includes(v) && !english.includes(v) && !hindi.includes(v)
    );

    selectElement.innerHTML = '';
    
    if (preferred.length) addGroup(`${cleanLangPref.toUpperCase()} Voices`, preferred);
    if (english.length) addGroup('English Voices', english);
    if (hindi.length) addGroup('हिंदी Voices', hindi);
    if (others.length) addGroup('Other Voices', others);

    if (!selectElement.options.length) {
      const defOpt = document.createElement('option');
      defOpt.value = '__default__';
      defOpt.textContent = 'System Default';
      selectElement.appendChild(defOpt);
    }
  }

  // Stop TTS
  function stopTTS() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    qa('.tts-highlight').forEach(s => s.classList.remove('tts-highlight'));
    qa('.tts-play').forEach(b => {
      b.innerHTML = '▶️ <span>Play</span>';
      b.setAttribute('aria-pressed', 'false');
    });
    qa('.tts-status').forEach(el => el.textContent = 'Stopped');
    qa('.tts-progress').forEach(el => el.textContent = '');
    ttsState = { paused: false, currentWord: 0, queuePos: 0, language: 'auto' };
  }

  // Enhanced TTS controls
  function initTTSControls(wrapper, modalTextContainer, langPref) {
    const playBtn = q('.tts-play', wrapper);
    const select = q('#tts-voices', wrapper);
    const statusSpan = q('.tts-status', wrapper);
    const progressEl = q('.tts-progress', wrapper);
    const rateInput = q('#tts-rate', wrapper);
    const pitchInput = q('#tts-pitch', wrapper);

    let voices = [];
    let utterRate = parseFloat(rateInput?.value) || 1.0;
    let utterPitch = parseFloat(pitchInput?.value) || 1.0;
    let queue = [], wordSpans = [];

    function findVoiceByValue(val) {
      if (!val || val === '__default__') return null;
      const [name, lang] = val.split('||');
      return voices.find(v => v.name === name && v.lang === lang) || null;
    }

    async function loadVoices() {
      voices = await ensureVoicesLoaded(3000);
      
      const contentText = modalTextContainer.textContent || '';
      const detectedLang = detectContentLanguage(contentText, 200);
      
      let finalLangPref = langPref;

      if (detectedLang === 'insufficient' || detectedLang.includes('insufficient') || detectedLang === 'mixed') {
        finalLangPref = 'en';
        statusSpan.textContent = 'Content will be auto-translated for better speech';
      } else {
        finalLangPref = detectedLang;
        statusSpan.textContent = `Ready for ${detectedLang.toUpperCase()} speech`;
      }

      ttsState.language = finalLangPref;
      loadVoicesForLanguage(select, finalLangPref);
    }

    function prepareTextForReading() {
      qa('.tts-word-span', modalTextContainer).forEach(s => {
        if (s.parentNode) s.parentNode.replaceChild(document.createTextNode(s.textContent), s);
      });

      const nodes = Array.from(modalTextContainer.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li'))
        .filter(el => el.textContent.trim() !== '');
      
      const readContainer = document.createElement('div');
      readContainer.className = 'tts-read-container';
      
      nodes.forEach(el => {
        const newEl = document.createElement(el.tagName);
        let text = el.textContent.replace(/\s+/g, ' ').trim();
        
        const contentLang = detectContentLanguage(text, 200);
        if (contentLang.includes('insufficient') || contentLang === 'mixed') {
          text = autoTranslateText(text, 'en');
        }
        
        const words = text.split(/\s+/);
        words.forEach((w, i) => {
          const span = document.createElement('span');
          span.className = 'tts-word-span';
          span.textContent = w + (i < words.length - 1 ? ' ' : '');
          newEl.appendChild(span);
        });
        
        Array.from(el.attributes).forEach(attr => {
          if (attr.name !== 'class') {
            newEl.setAttribute(attr.name, attr.value);
          }
        });
        
        readContainer.appendChild(newEl);
      });
      
      modalTextContainer.innerHTML = '';
      modalTextContainer.appendChild(readContainer);
    }

    function buildQueue() {
      const readContainer = modalTextContainer.querySelector('.tts-read-container');
      if (!readContainer) return;
      queue = Array.from(readContainer.children)
        .map(el => el.textContent.trim())
        .filter(Boolean);
    }

    function highlightByCharIndex(charIndex) {
      wordSpans = qa('.tts-word-span', modalTextContainer);
      if (!wordSpans.length) return;
      
      let total = 0;
      for (let i = 0; i < wordSpans.length; i++) {
        const len = (wordSpans[i].textContent || '').length;
        if (charIndex >= total && charIndex <= total + len) {
          qa('.tts-highlight', modalTextContainer).forEach(el => el.classList.remove('tts-highlight'));
          wordSpans[i].classList.add('tts-highlight');
          
          const modalBody = q('.modal-body');
          if (modalBody) {
            const rect = wordSpans[i].getBoundingClientRect();
            const modalRect = modalBody.getBoundingClientRect();
            const headerHeight = q('.modal-header')?.offsetHeight || 80;
            
            if (rect.top < modalRect.top + headerHeight || rect.bottom > modalRect.bottom - 20) {
              const scrollTop = modalBody.scrollTop + rect.top - modalRect.top - headerHeight - 50;
              modalBody.scrollTo({ top: scrollTop, behavior: 'smooth' });
            }
          }
          
          ttsState.currentWord = i + 1;
          return;
        }
        total += len;
      }
    }

    function speakNextChunk() {
      if (!window.speechSynthesis) { 
        statusSpan.textContent = 'Speech synthesis not supported';
        return; 
      }
      
      if (ttsState.queuePos >= queue.length) { 
        stopLocal(); 
        return; 
      }
      
      const text = queue[ttsState.queuePos++];
      const utterance = new SpeechSynthesisUtterance(text);
      const selectedVoice = findVoiceByValue(select.value);
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      } else {
        utterance.lang = ttsState.language === 'pa' ? 'pa-IN' : 
                        ttsState.language === 'hi' ? 'hi-IN' : 'en-US';
      }
      
      utterance.rate = utterRate;
      utterance.pitch = utterPitch;
      utterance.volume = 1;
      
      utterance.onboundary = (ev) => { 
        if (ev.name === 'word') highlightByCharIndex(ev.charIndex); 
      };
      
      utterance.onend = () => {
        const totalWords = qa('.tts-word-span', modalTextContainer).length || 1;
        const wordCount = text.split(/\s+/).length;
        ttsState.currentWord = Math.min(totalWords, ttsState.currentWord + wordCount);
        
        if (progressEl) {
          const pct = Math.round((ttsState.currentWord / totalWords) * 100);
          progressEl.innerHTML = `<span>${pct}%</span>`;
        }
        
        setTimeout(() => { 
          if (!ttsState.paused) speakNextChunk(); 
        }, 100);
      };
      
      utterance.onerror = (error) => {
        statusSpan.textContent = `Speech error: ${error.error}`;
      };
      
      window.speechSynthesis.speak(utterance);
    }

    function stopLocal() {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      qa('.tts-highlight', modalTextContainer).forEach(s => s.classList.remove('tts-highlight'));
      playBtn.innerHTML = '▶️ <span>Play</span>';
      playBtn.setAttribute('aria-pressed', 'false');
      statusSpan.textContent = 'Stopped';
      if (progressEl) progressEl.innerHTML = '';
      ttsState.paused = false;
      ttsState.currentWord = 0;
      ttsState.queuePos = 0;
    }

    function startTTS() {
      if (!window.speechSynthesis) { 
        statusSpan.textContent = 'Speech synthesis not supported'; 
        return; 
      }
      
      prepareTextForReading();
      buildQueue();
      
      if (!qa('.tts-word-span', modalTextContainer).length) { 
        statusSpan.textContent = 'No readable content found'; 
        return; 
      }
      
      if (!ttsState.paused) {
        ttsState.currentWord = 0;
        ttsState.queuePos = 0;
      }
      ttsState.paused = false;
      
      statusSpan.textContent = 'Speaking...';
      playBtn.innerHTML = '⏸️ <span>Pause</span>';
      playBtn.setAttribute('aria-pressed', 'true');
      speakNextChunk();
    }

    function pauseTTS() {
      if (window.speechSynthesis?.speaking) {
        window.speechSynthesis.cancel();
        ttsState.paused = true;
        statusSpan.textContent = 'Paused - Click play to continue';
        playBtn.innerHTML = '▶️ <span>Continue</span>';
        playBtn.setAttribute('aria-pressed', 'false');
      }
    }

    // Event listeners
    playBtn.addEventListener('click', () => {
      if (window.speechSynthesis?.speaking) {
        pauseTTS();
      } else {
        startTTS();
      }
    });

    select.addEventListener('change', () => { 
      if (window.speechSynthesis?.speaking) {
        pauseTTS();
        setTimeout(startTTS, 150);
      }
    });

    rateInput.addEventListener('input', (e) => {
      utterRate = parseFloat(e.target.value) || 1.0;
      q('.rate-value', wrapper).textContent = utterRate.toFixed(1);
    });

    pitchInput.addEventListener('input', (e) => {
      utterPitch = parseFloat(e.target.value) || 1.0;
      q('.pitch-value', wrapper).textContent = utterPitch.toFixed(1);
    });

    loadVoices().catch(() => {
      statusSpan.textContent = 'Failed to load voices';
    });

    return { 
      stop: () => { 
        try { stopLocal(); } catch (e) { console.warn('TTS stop error:', e); } 
      }
    };
  }

  // Variables for modal state
  let currentIndex = -1;
  let lastFocusedElement = null;
  let modalOpen = false;
  let hadPushedState = false;
  let gtranslateObserver = null;

  // Modal elements
  let modal, modalMedia, modalText, btnClose, modalContent, cards;

  // Search elements
  let searchInput, clearSearch, noMatchEl;
  let index = [];

  // Page scroll management
  function lockPageScroll() { 
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  }
  
  function unlockPageScroll() { 
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }

  // Focus trap
  function trapFocus(e) {
    if (!modalOpen || e.key !== 'Tab') return;
    
    const focusables = qa('#places-modal button:not([disabled]), #places-modal a[href], #places-modal input:not([disabled]), #places-modal select:not([disabled]), #places-modal textarea:not([disabled]), #places-modal [tabindex]:not([tabindex="-1"]):not([disabled])')
      .filter(el => el.offsetParent !== null);
    
    if (!focusables.length) return;
    
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  // Arrange action buttons
  function arrangeActionButtonsHorizontally() {
    cards.forEach((card, index) => {
      const content = card.querySelector('.place-content');
      if (!content) return;

      const readBtn = content.querySelector('.read-more-btn');
      const copyBtn = content.querySelector('.copy-link');
      const shareBtn = content.querySelector('.share-btn');

      if (!readBtn && !copyBtn && !shareBtn) return;
      if (content.querySelector('.place-actions')) return;

      const actionsContainer = document.createElement('div');
      actionsContainer.className = 'place-actions';

      const buttonGroup = document.createElement('div');
      buttonGroup.className = 'action-buttons';

      if (readBtn) {
        readBtn.remove();
        readBtn.setAttribute('data-index', index);
        actionsContainer.appendChild(readBtn);
      }

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
  }

  // Populate related articles
  function populateRelatedAll(activeCard) {
    if (!modalText) return;
    
    const existing = modalText.parentNode.querySelector('.modal-related');
    if (existing) existing.remove();

    const wrap = document.createElement('div');
    wrap.className = 'modal-related';
    wrap.innerHTML = `<h4>📚 You May Also Like / ਤੁਹਾਨੂੰ ਇਹ ਵੀ ਪਸੰਦ ਆ ਸਕਦਾ ਹੈ</h4>`;

    const list = document.createElement('div');
    list.className = 'related-list';

    const relatedCards = cards.filter(c => c !== activeCard).slice(0, 6);
    
    relatedCards.forEach(c => {
      const thumb = c.dataset.image || '';
      const cardTitle = c.dataset.title || c.querySelector('h3')?.textContent || '';
      const preview = c.dataset.preview || '';
      
      const rel = document.createElement('div');
      rel.className = 'related-card';
      rel.innerHTML = `
        ${thumb ? `<img src="${thumb}" alt="${cardTitle}" loading="lazy"/>` : '<div class="related-placeholder">📍</div>'}
        <div class="related-info">
          <div class="related-title">${cardTitle}</div>
          <div class="related-meta">${preview.slice(0, 100)}${preview.length > 100 ? '...' : ''}</div>
          <div class="related-actions">
            <button class="related-open" data-id="${c.id}">🔗 Open / ਖੋਲੋ</button>
          </div>
        </div>`;
      list.appendChild(rel);
    });

    wrap.appendChild(list);
    modalText.parentNode.appendChild(wrap);

    qa('.related-open', wrap).forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        if (!id) return;

        const target = document.getElementById(id);
        if (target) {
          internalClose();
          setTimeout(() => {
            if (q('.modal-body')) q('.modal-body').scrollTop = 0;
            
            try { 
              target.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
            } catch {}
            
            flashHighlight(target, 'highlighted', 2000);
            openModal(cards.indexOf(target));
          }, 300);
        }
      });
    });
  }

  // Internal modal close
  function internalClose() {
    if (!modal) return;
    
    modal.setAttribute('aria-hidden', 'true');
    modal.classList.remove('open');
    modal.style.display = 'none';
    unlockPageScroll();

    if (window.speechSynthesis?.speaking) {
      window.speechSynthesis.cancel();
    }

    qa('.tts-controls', modal).forEach(n => n.remove());
    qa('.tts-toggle-btn', modal).forEach(n => n.remove());
    qa('.mobile-toc-toggle', modal).forEach(n => n.remove());
    qa('.table-of-contents', modal).forEach(n => n.remove());
    qa('.modal-header', modal).forEach(n => n.remove());
    qa('.custom-share-modal').forEach(n => n.remove());
    
    qa('.tts-word-span', modalText).forEach(s => {
      if (s.parentNode) s.parentNode.replaceChild(document.createTextNode(s.textContent), s);
    });

    if (lastFocusedElement?.focus) {
      try {
        lastFocusedElement.focus();
      } catch (e) {
        // Focus might fail
      }
    }

    document.documentElement.classList.remove('modal-open');
    modalOpen = false;
  }

  // Close modal
  function closeModal() {
    qa('.custom-share-modal').forEach(modal => modal.remove());
    
    if (hadPushedState) {
      try { 
        history.back();
      } catch { 
        internalClose(); 
        hadPushedState = false; 
      }
      return;
    }
    
    internalClose();
    try { 
      history.replaceState(history.state, '', '/places/'); 
    } catch {}
  }

  // Enhanced modal opening with fullscreen on all devices
  function openModal(index) {
    if (!modal) return;
    if (index < 0 || index >= cards.length) return;

    // Always use fullscreen modal on all devices
    previousUrl = window.location.href;
    currentIndex = index;
    const card = cards[currentIndex];

    const imgSrc = card.dataset.image || '';
    const fullHtml = card.dataset.full || card.dataset.preview || '';
    const cardTitle = card.dataset.title || card.querySelector('h3')?.textContent || '';

    // Clean up existing modal content
    qa('.modal-header, .tts-controls, .table-of-contents, .modal-related', modal).forEach(n => n.remove());

    // Create fixed modal header with top controls
    const modalHeader = document.createElement('div');
    modalHeader.className = 'modal-header';
    
    const modalTitle = document.createElement('h2');
    modalTitle.className = 'modal-title';
    modalTitle.textContent = cardTitle;
    modalHeader.appendChild(modalTitle);

    const modalControls = document.createElement('div');
    modalControls.className = 'modal-controls';

    // Create control buttons
    const ttsToggleBtn = document.createElement('button');
    ttsToggleBtn.className = 'tts-toggle-btn';
    ttsToggleBtn.innerHTML = '🔊<span>TTS</span>';
    ttsToggleBtn.title = 'Text-to-Speech / ਟੈਕਸਟ ਟੂ ਸਪੀਚ';
    ttsToggleBtn.setAttribute('aria-label', 'Toggle Text-to-Speech');

    const mobileTocButton = document.createElement('button');
    mobileTocButton.className = 'mobile-toc-toggle';
    mobileTocButton.innerHTML = '📋<span>TOC</span>';
    mobileTocButton.title = 'Table of Contents / ਸਮੱਗਰੀ';
    mobileTocButton.setAttribute('aria-label', 'Toggle table of contents');

    const modalShareBtn = document.createElement('button');
    modalShareBtn.className = 'modal-share-btn';
    modalShareBtn.innerHTML = '📤<span>Share</span>';
    modalShareBtn.title = 'Share Article / ਸਾਂਝਾ ਕਰੋ';
    modalShareBtn.setAttribute('aria-label', 'Share this article');

    const modalCloseBtn = document.createElement('button');
    modalCloseBtn.className = 'modal-close';
    modalCloseBtn.innerHTML = '✕<span>Close</span>';
    modalCloseBtn.title = 'Close Modal / ਬੰਦ ਕਰੋ';
    modalCloseBtn.setAttribute('aria-label', 'Close modal');

    // Add buttons to controls
    modalControls.appendChild(ttsToggleBtn);
    modalControls.appendChild(mobileTocButton);
    modalControls.appendChild(modalShareBtn);
    modalControls.appendChild(modalCloseBtn);
    
    modalHeader.appendChild(modalControls);
    modal.prepend(modalHeader);

    // Update modal content
    if (modalMedia) {
      modalMedia.innerHTML = imgSrc ?
        `<img src="${imgSrc}" alt="${cardTitle}" loading="lazy">` : '';
    }
    
    if (modalText) {
      modalText.innerHTML = fullHtml;
      // Ensure content is translatable
      modalText.removeAttribute('translate');
      modalText.classList.remove('notranslate');
    }

    // Create table of contents (loads under image and title)
    const tocContainer = createTableOfContents(modalText);
    if (tocContainer) {
      modalText.parentNode.insertBefore(tocContainer, modalText);
    }

    // Populate related articles
    populateRelatedAll(card);

    // Enhanced TTS controls
    const ttsWrap = document.createElement('div');
    ttsWrap.className = 'tts-controls';
    ttsWrap.innerHTML = `
      <div class="tts-controls-header">
        <h5>🔊 Text-to-Speech Controls / ਟੈਕਸਟ ਟੂ ਸਪੀਚ ਕੰਟਰੋਲ</h5>
      </div>
      <div class="tts-controls-row">
        <button class="tts-play" aria-pressed="false" title="Play/Pause">▶️ <span>Play</span></button>
        <div class="tts-progress" aria-hidden="true"></div>
        <span class="tts-status" aria-live="polite">Ready</span>
      </div>
      <div class="tts-controls-row">
        <div class="tts-control-group">
          <label for="tts-voices">Voice:</label>
          <select id="tts-voices" aria-label="Choose voice"></select>
        </div>
        <div class="tts-control-group">
          <label for="tts-rate">Speed: <span class="rate-value">1.0</span></label>
          <input id="tts-rate" type="range" min="0.5" max="2.0" step="0.1" value="1.0" aria-label="Speech rate">
        </div>
        <div class="tts-control-group">
          <label for="tts-pitch">Pitch: <span class="pitch-value">1.0</span></label>
          <input id="tts-pitch" type="range" min="0.5" max="2.0" step="0.1" value="1.0" aria-label="Speech pitch">
        </div>
      </div>
    `;

    if (tocContainer) {
      tocContainer.after(ttsWrap);
    } else {
      modalText?.before(ttsWrap);
    }

    const langPref = (document.documentElement.lang || 'pa-IN').split(/[-_]/)[0].toLowerCase();
    let ttsInstance = null;

    // Enhanced button event listeners
    ttsToggleBtn.addEventListener('click', () => {
      const opening = !ttsWrap.classList.contains('show');
      if (opening) {
        ttsWrap.classList.add('show');
        ttsToggleBtn.classList.add('active');
        ttsToggleBtn.innerHTML = '🔊<span>Hide</span>';
        if (!ttsInstance) {
          ttsInstance = initTTSControls(ttsWrap, modalText, langPref);
        }
        q('.tts-play', ttsWrap)?.focus();
      } else {
        ttsWrap.classList.remove('show');
        ttsToggleBtn.classList.remove('active');
        ttsToggleBtn.innerHTML = '🔊<span>TTS</span>';
        if (ttsInstance?.stop) ttsInstance.stop();
      }
    });

    mobileTocButton.addEventListener('click', () => {
      if (tocContainer) {
        const isVisible = tocContainer.style.display !== 'none';
        tocContainer.style.display = isVisible ? 'none' : 'block';
        mobileTocButton.classList.toggle('active', !isVisible);
        mobileTocButton.innerHTML = isVisible ? '📋<span>Show</span>' : '📋<span>Hide</span>';
      }
    });

    modalShareBtn.addEventListener('click', async () => {
      const url = `https://www.pattibytes.com/places/#${encodeURIComponent(card.id)}`;
      const text = (card.dataset.preview || 'ਪੱਟੀ ਦੇ ਪ੍ਰਸਿੱਧ ਸਥਾਨ').slice(0, 140);
      const image = card.dataset.image || '';
      
      showCustomShareModal({ title: cardTitle, text, url, image });
    });

    modalCloseBtn.addEventListener('click', closeModal);

    // Show fullscreen modal
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('open');
    modal.style.display = 'flex';

    const modalBody = q('.modal-body', modal);
    if (modalBody) {
      modalBody.scrollTop = 0;
      modalBody.classList.add('highlighted');
      setTimeout(() => modalBody.classList.remove('highlighted'), 1000);
    }

    lastFocusedElement = document.activeElement;
    modalCloseBtn.focus();
    document.documentElement.classList.add('modal-open');
    modalOpen = true;
    lockPageScroll();

    // Setup Google Translate observer for full modal
    if (gtranslateObserver) gtranslateObserver.disconnect();
    gtranslateObserver = setupGoogleTranslateIntegration();

    // Update URL
    const articleId = card.id || card.dataset.id;
    const newUrl = `https://www.pattibytes.com/places/#${encodeURIComponent(articleId)}`;

    try {
      history.pushState({ placeModal: articleId }, '', newUrl);
      hadPushedState = true;
    } catch {
      hadPushedState = false;
    }

    // Add keyboard handlers
    document.addEventListener('keydown', keyHandler, true);
  }

  // Keyboard handler
  function keyHandler(ev) {
    if (!modal?.classList.contains('open')) return;
    
    if (ev.key === 'Escape') {
      closeModal();
    } else if (ev.key === 'Tab') {
      trapFocus(ev);
    } else if (ev.key === ' ' && ev.target.tagName !== 'INPUT' && ev.target.tagName !== 'TEXTAREA') {
      const ttsToggle = q('.tts-toggle-btn');
      if (ttsToggle && !ev.ctrlKey && !ev.altKey) {
        ev.preventDefault();
        ttsToggle.click();
      }
    }
  }

  // Setup copy-link functionality
  function setupCopyLinks() {
    qa('.copy-link').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const article = btn.closest('article');
        if (!article) return;

        const id = article.id;
        if (!id) return;

        const url = `https://www.pattibytes.com/places/#${encodeURIComponent(id)}`;

        try {
          await copyToClipboard(url);
          btn.classList.add('copied');
          const prevIcon = btn.textContent;
          btn.textContent = '✔️';
          
          showNotification('Link copied! / ਲਿੰਕ ਕਾਪੀ ਹੋਇਆ!', 'success');
          
          setTimeout(() => {
            btn.classList.remove('copied');
            btn.textContent = prevIcon;
          }, 2000);
        } catch {
          showNotification(`Copy failed. Manual copy: ${url}`, 'error');
        }
      });
    });
  }

  // Setup share buttons functionality
  function setupShareButtons() {
    qa('.share-btn').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const article = btn.closest('article.place-card');
        if (!article) return;

        const title = article.dataset.title || article.querySelector('h3')?.textContent || document.title;
        const url = `https://www.pattibytes.com/places/#${encodeURIComponent(article.id)}`;
        const text = (article.dataset.preview || 'ਪੱਟੀ ਦੇ ਪ੍ਰਸਿੱਧ ਸਥਾਨ').slice(0, 140);
        const image = article.dataset.image || '';

        // Always use custom share modal - disable native sharing
        showCustomShareModal({ title, text, url, image });
        
        btn.classList.add('shared');
        setTimeout(() => btn.classList.remove('shared'), 2000);
      });
    });
  }

  // Enhanced search with auto-translation
  function applySearch(qstr) {
    const siteLang = (document.documentElement.lang || 'pa').toLowerCase();
    const inputLang = /[\u0A00-\u0A7F]/.test(qstr.trim()) ? 'pa' : 'en';

    let searchQuery = qstr.trim();
    
    if (siteLang === 'pa' && inputLang === 'en') {
      Object.entries(enToPunjabi).forEach(([en, pa]) => {
        const regex = new RegExp(`\\b${en}\\b`, 'gi');
        searchQuery = searchQuery.replace(regex, `${en} ${pa}`);
      });
    }

    const normalizedQuery = norm(searchQuery);
    const romanQuery = norm(paToRoman(searchQuery));

    let shown = 0;
    index.forEach(({ el, nText, rText }) => {
      const matches = !normalizedQuery ||
        nText.includes(normalizedQuery) ||
        rText.includes(romanQuery) ||
        (el.dataset.full && (
          norm(el.dataset.full).includes(normalizedQuery) ||
          norm(paToRoman(el.dataset.full)).includes(romanQuery)
        ));

      el.style.display = matches ? '' : 'none';
      if (matches) shown++;
    });

    if (noMatchEl) {
      if (shown === 0) {
        noMatchEl.style.display = 'block';
        noMatchEl.innerHTML = siteLang === 'pa' ? 
          'ਕੋਈ ਮਿਲਦਾ ਸਥਾਨ ਨਹੀਂ ਮਿਲਿਆ।<br><small>Try terms like: gurdwara, temple, school, market</small>' : 
          'No matching places found.<br><small>Try Punjabi terms or different keywords</small>';
      } else {
        noMatchEl.style.display = 'none';
      }
    }
  }

  // Setup search functionality
  function setupSearch() {
    if (!searchInput) return;

    let searchTimeout;
    searchInput.addEventListener('input', e => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        applySearch(e.target.value || '');
        const hasValue = !!(e.target.value || '').trim();
        clearSearch?.classList.toggle('visible', hasValue);
      }, 300);
    });

    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const first = cards.find(c => c.style.display !== 'none');
        if (first) {
          first.scrollIntoView({ behavior: 'smooth', block: 'start' });
          flashHighlight(first, 'search-result-highlight', 2000);
        }
      }
    });

    clearSearch?.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      applySearch('');
      clearSearch.classList.remove('visible');
      searchInput?.focus();
    });
  }

  // Enhanced responsive behavior
  function handleResponsiveChanges() {
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        // Handle TOC visibility
        const tocContainers = qa('.table-of-contents');
        tocContainers.forEach(toc => {
          if (!isMobile()) {
            toc.style.display = 'block';
          } else {
            const button = q('.mobile-toc-toggle');
            if (button && !button.classList.contains('active')) {
              toc.style.display = 'none';
            }
          }
        });
      }, 250);
    });
  }

  // Enhanced initialization
  document.addEventListener('DOMContentLoaded', () => {
    modal = q('#places-modal');
    if (!modal) {
      console.warn('Places modal not found');
      return;
    }

    modalMedia = q('#modal-media', modal);
    modalText = q('#modal-text', modal);
    btnClose = q('#modal-close', modal);
    modalContent = q('.modal-content', modal);

    cards = Array.from(document.querySelectorAll('.place-card'));
    searchInput = q('#places-search');
    clearSearch = q('#clear-search');
    noMatchEl = q('#no-match');

    if (!cards.length) {
      console.warn('No place cards found');
      return;
    }

    // Enhanced button arrangement
    arrangeActionButtonsHorizontally();

    // Build search index
    index = cards.map(c => {
      const title = c.dataset.title || c.querySelector('h3')?.textContent || '';
      const preview = c.dataset.preview || '';
      const fullContent = c.dataset.full || '';
      const searchText = `${title} ${preview} ${fullContent}`.trim();
      return {
        el: c,
        nText: norm(searchText),
        rText: norm(paToRoman(searchText))
      };
    });

    // Setup all functionality
    setupSearch();
    setupCopyLinks();
    setupShareButtons();
    handleResponsiveChanges();

    // Enhanced deep link handling
    function handleHashOpen() {
      const id = normalizeHash(window.location.hash || '');
      if (!id) return;
      
      const target = document.getElementById(id);
      if (target?.classList.contains('place-card')) {
        const targetIndex = cards.indexOf(target);
        if (targetIndex !== -1) {
          openModal(targetIndex);
          try { 
            target.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
          } catch {}
          flashHighlight(target, 'highlighted', 2000);
        }
      }
    }

    handleHashOpen();
    window.addEventListener('hashchange', handleHashOpen);

    // History management
    window.addEventListener('popstate', (e) => {
      if (modalOpen) {
        internalClose();
        hadPushedState = false;
      }
      
      const id = normalizeHash(window.location.hash || '');
      if (id) {
        const target = document.getElementById(id);
        if (target?.classList.contains('place-card')) {
          setTimeout(() => openModal(cards.indexOf(target)), 100);
        }
      }
    });

    // Enhanced event bindings
    btnClose?.addEventListener('click', ev => { 
      ev.stopPropagation(); 
      closeModal(); 
    });
    
    modal?.addEventListener('click', ev => { 
      if (ev.target === modal) closeModal(); 
    });

    // Enhanced card interactions
    cards.forEach((card, idx) => {
      const readBtn = card.querySelector('.read-more-btn');
      if (readBtn) {
        readBtn.addEventListener('click', ev => { 
          ev.stopPropagation(); 
          openModal(idx); 
        });
      }

      card.addEventListener('keydown', ev => {
        if ((ev.key === 'Enter' || ev.key === ' ') && document.activeElement === card) {
          ev.preventDefault();
          openModal(idx);
        }
      });

      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'article');
      
      card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-4px) scale(1.01)';
      });
      
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });

    // Add required styles for share modal
    const style = document.createElement('style');
    style.textContent = `
      .share-preview {
        display: flex; gap: 1rem; margin-bottom: 1.5rem; padding: 1rem;
        background: rgba(255,255,255,0.5); border-radius: 8px; border: 1px solid #eee;
      }
      .share-image { width: 80px; height: 60px; object-fit: cover; border-radius: 6px; }
      .share-placeholder { width: 80px; height: 60px; display: flex; align-items: center; justify-content: center; background: var(--gradient-primary); border-radius: 6px; font-size: 1.5rem; color: white; }
      .share-info h4 { margin: 0 0 0.5rem 0; font-size: 1rem; color: var(--secondary-color); }
      .share-info p { margin: 0; font-size: 0.9rem; color: #666; line-height: 1.4; }
      .share-options-container h5 { margin: 0 0 1rem 0; color: var(--secondary-color); }
      .share-options-scroll {
        display: flex; gap: 1rem; overflow-x: auto; padding: 0.5rem 0;
        scrollbar-width: thin; -webkit-overflow-scrolling: touch;
      }
      .share-options-scroll::-webkit-scrollbar { height: 6px; }
      .share-options-scroll::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 3px; }
      .share-options-scroll::-webkit-scrollbar-thumb { background: var(--accent-color); border-radius: 3px; }
      .share-option {
        min-width: 80px; flex-shrink: 0; padding: 1rem 0.75rem; background: white;
        border: 2px solid #eee; border-radius: 8px; cursor: pointer; text-align: center;
        transition: all 0.3s ease; display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
      }
      .share-option:hover { border-color: var(--accent-color); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
      .share-option span:first-child { font-size: 1.5rem; }
      .share-option span:last-child { font-size: 0.8rem; font-weight: 600; color: var(--text-color); }
    `;
    document.head.appendChild(style);

    console.log('Enhanced Fullscreen Places.js initialized successfully');
  });

  // Global error handler
  window.addEventListener('error', (e) => {
    if (e.filename?.includes('places.js')) {
      console.error('Places.js error:', e.error);
      showNotification('An error occurred. Please refresh the page.', 'error');
    }
  });

})();
