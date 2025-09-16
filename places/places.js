// Enhanced places.js with full-screen modals, improved controls, and comprehensive sharing
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

  // Store previous URL and scroll position
  let previousUrl = window.location.href;
  let scrollPosition = 0;
  let ttsState = { paused: false, currentWord: 0, queuePos: 0, language: 'auto' };

  // Always use full-screen modal instead of page redirect
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

  // Enhanced custom share modal - NEVER use native sharing
  function showCustomShareModal({ title, text, url, image }) {
    // Remove any existing share modal
    const existing = q('.custom-share-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.className = 'custom-share-modal';
    modal.innerHTML = `
      <div class="share-modal-overlay">
        <div class="share-modal-content">
          <div class="share-modal-header">
            <h3>ਸਾਂਝਾ ਕਰੋ / Share</h3>
            <button class="share-modal-close" aria-label="Close">&times;</button>
          </div>
          <div class="share-modal-body">
            <div class="share-preview">
              ${image ? `<img src="${image}" alt="${title}" class="share-preview-image">` : '<div class="share-preview-placeholder">📍</div>'}
              <div class="share-preview-content">
                <h4 class="share-preview-title">${title}</h4>
                <p class="share-preview-text">${text}</p>
                <p class="share-preview-link">${url}</p>
                <div class="share-preview-actions">
                  <button class="share-copy-link">📋 ਲਿੰਕ ਕਾਪੀ ਕਰੋ</button>
                  <a href="${url}" target="_blank" class="share-read-full">📖 ਪੂਰਾ ਪੜ੍ਹੋ</a>
                </div>
              </div>
            </div>
            <div class="share-platforms">
              <h5>ਸੋਸ਼ਲ ਮੀਡੀਆ / Social Media</h5>
              <div class="share-platforms-scroll">
                <button class="share-platform" data-platform="whatsapp">
                  <span class="share-platform-icon">📱</span>
                  <span class="share-platform-name">WhatsApp</span>
                </button>
                <button class="share-platform" data-platform="facebook">
                  <span class="share-platform-icon">📘</span>
                  <span class="share-platform-name">Facebook</span>
                </button>
                <button class="share-platform" data-platform="twitter">
                  <span class="share-platform-icon">🐦</span>
                  <span class="share-platform-name">Twitter</span>
                </button>
                <button class="share-platform" data-platform="instagram">
                  <span class="share-platform-icon">📸</span>
                  <span class="share-platform-name">Instagram</span>
                </button>
                <button class="share-platform" data-platform="telegram">
                  <span class="share-platform-icon">✈️</span>
                  <span class="share-platform-name">Telegram</span>
                </button>
                <button class="share-platform" data-platform="linkedin">
                  <span class="share-platform-icon">💼</span>
                  <span class="share-platform-name">LinkedIn</span>
                </button>
                <button class="share-platform" data-platform="reddit">
                  <span class="share-platform-icon">🤖</span>
                  <span class="share-platform-name">Reddit</span>
                </button>
                <button class="share-platform" data-platform="quora">
                  <span class="share-platform-icon">❓</span>
                  <span class="share-platform-name">Quora</span>
                </button>
                <button class="share-platform" data-platform="pinterest">
                  <span class="share-platform-icon">📌</span>
                  <span class="share-platform-name">Pinterest</span>
                </button>
                <button class="share-platform" data-platform="email">
                  <span class="share-platform-icon">📧</span>
                  <span class="share-platform-name">Email</span>
                </button>
                <button class="share-platform" data-platform="sms">
                  <span class="share-platform-icon">💬</span>
                  <span class="share-platform-name">SMS</span>
                </button>
              </div>
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
        btn.style.background = 'var(--success-color)';
        setTimeout(() => {
          btn.textContent = original;
          btn.style.background = '';
        }, 2000);
      } catch {
        showNotification('Copy failed / ਕਾਪੀ ਅਸਫਲ', 'error');
      }
    });

    // Social media sharing
    qa('.share-platform', modal).forEach(btn => {
      btn.addEventListener('click', () => {
        const platform = btn.dataset.platform;
        const shareText = `${title}\n\n${text}\n\nRead more: ${url}`;
        
        const shareUrls = {
          whatsapp: `https://wa.me/?text=${encodeURIComponent(shareText)}`,
          facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
          twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
          instagram: `https://www.instagram.com/`, // Instagram doesn't support direct URL sharing
          telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
          linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
          reddit: `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
          quora: `https://www.quora.com/`, // Quora doesn't support direct sharing
          pinterest: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&description=${encodeURIComponent(title)}`,
          email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(shareText)}`,
          sms: `sms:?body=${encodeURIComponent(shareText)}`
        };
        
        if (shareUrls[platform]) {
          if (platform === 'email' || platform === 'sms') {
            window.location.href = shareUrls[platform];
          } else if (platform === 'instagram' || platform === 'quora') {
            // For Instagram and Quora, copy to clipboard and notify user
            copyToClipboard(shareText);
            showNotification(`Link copied! Open ${platform === 'instagram' ? 'Instagram' : 'Quora'} app to share.`, 'info');
          } else {
            window.open(shareUrls[platform], '_blank', 'width=600,height=400,scrollbars=yes,resizable=yes');
          }
          closeModal();
        }
      });
    });

    // Prevent default browser sharing
    return false;
  }

  // Enhanced notification system
  function showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <span class="notification-message">${message}</span>
      <button class="notification-close" aria-label="Close">&times;</button>
    `;
    
    notification.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 10003;
      background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
      color: white; padding: 1rem 1.5rem; border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.15); max-width: 400px;
      animation: slideInRight 0.3s ease-out;
    `;

    document.body.appendChild(notification);

    const close = () => {
      notification.style.animation = 'slideOutRight 0.3s ease-in forwards';
      setTimeout(() => notification.remove(), 300);
    };

    q('.notification-close', notification).addEventListener('click', close);
    setTimeout(close, duration);
  }

  // Visual flash highlight for deep link feedback
  function flashHighlight(el, className = 'highlighted', duration = 2000) {
    if (!el) return;
    el.classList.add(className);
    setTimeout(() => el.classList.remove(className), duration);
  }

  // Enhanced language detection with character threshold
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

  // Enhanced auto-translate text with better mappings
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

  // Enhanced Google Translate integration
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

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    return observer;
  }

  // Update TTS language based on detected content
  function updateTTSLanguage(ttsWrapper, modalTextContainer, detectedLang) {
    const statusSpan = q('.tts-status', ttsWrapper);
    const voiceSelect = q('#tts-voices', ttsWrapper);
    
    if (statusSpan) {
      if (detectedLang.includes('insufficient') || detectedLang === 'mixed') {
        statusSpan.textContent = 'Content auto-translated for better speech quality';
      } else {
        statusSpan.textContent = `Using ${detectedLang.toUpperCase()} voices`;
      }
    }
    
    if (voiceSelect) {
      loadVoicesForLanguage(voiceSelect, detectedLang);
    }
  }

  // Create enhanced Table of Contents
  function createTableOfContents(content) {
    const headings = qa('h1, h2, h3, h4, h5, h6', content);
    if (!headings.length) return null;

    const tocContainer = document.createElement('div');
    tocContainer.className = 'table-of-contents';
    
    const tocHeader = document.createElement('div');
    tocHeader.className = 'toc-header';
    tocHeader.innerHTML = `
      <h4 class="toc-title">ਸਮੱਗਰੀ / Contents</h4>
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
        scrollPosition = document.querySelector('.modal-body')?.scrollTop || 0;
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

  // Load voices for specific language - FIXED toLowerCase issue
  function loadVoicesForLanguage(selectElement, langPref) {
    const getLangCode = code => ((code || '').split(/[-_]/)[0] || '').toLowerCase();
    
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

    const cleanLangPref = (langPref || '').replace('-insufficient', '');
    
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

  // Stop TTS and reset UI
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
            const headerHeight = q('.modal-controls-fixed')?.offsetHeight || 80;
            
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

  // Search and Clear elements
  let searchInput, clearSearch, noMatchEl;

  // Index for search
  let index = [];

  // Enhanced page scroll management
  function lockPageScroll() { 
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  }
  
  function unlockPageScroll() { 
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }

  // Enhanced focus trap - FIXED focusables array access
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

  // Enhanced button arrangement
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

  // Enhanced related articles
  function populateRelatedAll(activeCard) {
    if (!modalText) return;
    
    const existing = modalText.parentNode.querySelector('.modal-related');
    if (existing) existing.remove();

    const wrap = document.createElement('div');
    wrap.className = 'modal-related';
    wrap.innerHTML = `<h4>ਤੁਹਾਨੂੰ ਇਹ ਵੀ ਪਸੰਦ ਆ ਸਕਦਾ ਹੈ / You May Also Like</h4>`;

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
            <button class="related-open" data-id="${c.id}">ਖੋਲੋ / Open</button>
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
          scrollPosition = q('.modal-body')?.scrollTop || 0;
          
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

  // Enhanced modal close
  function internalClose() {
    if (!modal) return;
    
    modal.setAttribute('aria-hidden', 'true');
    modal.classList.remove('open');
    modal.style.display = 'none';
    unlockPageScroll();

    if (window.speechSynthesis?.speaking) {
      window.speechSynthesis.cancel();
    }

    // Clean up all modal elements
    qa('.modal-controls-fixed, .tts-controls, .table-of-contents, .modal-related', modal).forEach(n => n.remove());
    qa('.custom-share-modal').forEach(n => n.remove());
    
    // Restore original content
    qa('.tts-word-span', modalText).forEach(s => {
      if (s.parentNode) s.parentNode.replaceChild(document.createTextNode(s.textContent), s);
    });

    // Restore static close button
    if (btnClose) btnClose.classList.remove('sr-only');

    if (lastFocusedElement?.focus) {
      try {
        lastFocusedElement.focus();
      } catch (e) {}
    }

    document.documentElement.classList.remove('modal-open');
    modalOpen = false;
  }

  // Enhanced modal close with better back button handling
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

  // FIXED: Enhanced full-screen modal opening - controls inside modal content + article link button
  function openModal(index) {
    if (!modal) return;
    if (index < 0 || index >= cards.length) return;

    previousUrl = window.location.href;
    currentIndex = index;
    const card = cards[currentIndex];

    const imgSrc = card.dataset.image || '';
    const fullHtml = card.dataset.full || card.dataset.preview || '';
    const cardTitle = card.dataset.title || card.querySelector('h3')?.textContent || '';

    // Clean up existing modal content
    qa('.modal-controls-fixed, .tts-controls, .table-of-contents, .modal-related', modal).forEach(n => n.remove());

    // Hide static close button to avoid duplicates
    if (btnClose) btnClose.classList.add('sr-only');

    // FIXED: Create fixed modal controls INSIDE modal content, not overlay
    const modalControlsFixed = document.createElement('div');
    modalControlsFixed.className = 'modal-controls-fixed';
    
    const controlsTitle = document.createElement('h2');
    controlsTitle.className = 'modal-controls-title';
    controlsTitle.textContent = cardTitle;
    
    const controlsButtons = document.createElement('div');
    controlsButtons.className = 'modal-controls-buttons';

    // Create control buttons with FIXED emojis
    const ttsToggleBtn = document.createElement('button');
    ttsToggleBtn.className = 'modal-control-btn tts-toggle-btn';
    ttsToggleBtn.innerHTML = '🔊';
    ttsToggleBtn.title = 'Text-to-Speech';
    ttsToggleBtn.setAttribute('aria-label', 'Toggle Text-to-Speech');

    const tocToggleBtn = document.createElement('button');
    tocToggleBtn.className = 'modal-control-btn toc-toggle-btn';
    tocToggleBtn.innerHTML = '📋';
    tocToggleBtn.title = 'Table of Contents';
    tocToggleBtn.setAttribute('aria-label', 'Toggle table of contents');

    const modalShareBtn = document.createElement('button');
    modalShareBtn.className = 'modal-control-btn modal-share-btn';
    modalShareBtn.innerHTML = '📤';
    modalShareBtn.title = 'Share Article';
    modalShareBtn.setAttribute('aria-label', 'Share this article');

    // ADDED: Article Link button
    const modalLinkBtn = document.createElement('button');
    modalLinkBtn.className = 'modal-control-btn modal-link-btn';
    modalLinkBtn.innerHTML = '🔗';
    modalLinkBtn.title = 'Copy Article Link';
    modalLinkBtn.setAttribute('aria-label', 'Copy Article Link');

    const modalCloseBtn = document.createElement('button');
    modalCloseBtn.className = 'modal-control-btn modal-close-btn';
    modalCloseBtn.innerHTML = '✕';
    modalCloseBtn.title = 'Close';
    modalCloseBtn.setAttribute('aria-label', 'Close modal');

    controlsButtons.appendChild(ttsToggleBtn);
    controlsButtons.appendChild(tocToggleBtn);
    controlsButtons.appendChild(modalShareBtn);
    controlsButtons.appendChild(modalLinkBtn);
    controlsButtons.appendChild(modalCloseBtn);
    
    modalControlsFixed.appendChild(controlsTitle);
    modalControlsFixed.appendChild(controlsButtons);
    
    // FIXED: Insert controls inside modal-content, not overlay
    (modalContent || modal).prepend(modalControlsFixed);

    // Update modal content
    if (modalMedia) {
      modalMedia.innerHTML = imgSrc ?
        `<img src="${imgSrc}" alt="${cardTitle}" loading="lazy">` : '';
    }
    
    if (modalText) {
      modalText.innerHTML = fullHtml;
    }

    // Create table of contents AFTER image and title
    const tocContainer = createTableOfContents(modalText);
    if (tocContainer) {
      if (modalMedia && modalMedia.innerHTML) {
        // Insert after media
        modalMedia.after(tocContainer);
      } else {
        // Insert at beginning of modal text
        modalText.parentNode.insertBefore(tocContainer, modalText);
      }
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

    // Insert TTS controls after TOC or before modal text
    if (tocContainer) {
      tocContainer.after(ttsWrap);
    } else {
      modalText?.before(ttsWrap);
    }

    // FIXED: langPref split result indexed before toLowerCase
    const langPref = ((document.documentElement.lang || 'pa-IN').split(/[-_]/)[0] || 'pa').toLowerCase();
    let ttsInstance = null;

    // Enhanced button event listeners
    ttsToggleBtn.addEventListener('click', () => {
      const opening = !ttsWrap.classList.contains('show');
      if (opening) {
        ttsWrap.classList.add('show');
        ttsToggleBtn.classList.add('active');
        if (!ttsInstance) {
          ttsInstance = initTTSControls(ttsWrap, modalText, langPref);
        }
        q('.tts-play', ttsWrap)?.focus();
      } else {
        ttsWrap.classList.remove('show');
        ttsToggleBtn.classList.remove('active');
        if (ttsInstance?.stop) ttsInstance.stop();
      }
    });

    tocToggleBtn.addEventListener('click', () => {
      if (tocContainer) {
        const isVisible = tocContainer.style.display !== 'none';
        tocContainer.style.display = isVisible ? 'none' : 'block';
        tocToggleBtn.classList.toggle('active', !isVisible);
      }
    });

    modalShareBtn.addEventListener('click', async () => {
      const url = `https://www.pattibytes.com/places/#${encodeURIComponent(card.id)}`;
      const text = (card.dataset.preview || 'ਪੱਟੀ ਦੇ ਪ੍ਰਸਿੱਧ ਸਥਾਨ').slice(0, 140);
      // Always use custom share modal, never native
      showCustomShareModal({ title: cardTitle, text, url, image: imgSrc });
    });

    // ADDED: Article Link button event listener
    modalLinkBtn.addEventListener('click', async () => {
      const url = `https://www.pattibytes.com/places/#${encodeURIComponent(card.id)}`;
      try {
        await copyToClipboard(url);
        showNotification('Article link copied to clipboard!', 'success');
      } catch {
        showNotification(`Copy failed. Please copy manually: ${url}`, 'error');
      }
    });

    modalCloseBtn.addEventListener('click', closeModal);

    // Show full-screen modal
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

    // Setup Google Translate observer
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

  // Enhanced keyboard handler
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

  // Enhanced copy-link functionality
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

  // Enhanced share buttons - always use custom modal
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

        // Always use custom share modal
        showCustomShareModal({ title, text, url, image });
        
        btn.classList.add('shared');
        setTimeout(() => btn.classList.remove('shared'), 2000);
      });
    });
  }

  // ENHANCED: Search with ID support - now searches place IDs too
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
    index.forEach(({ el, nText, rText, idText }) => {
      const matches = !normalizedQuery ||
        nText.includes(normalizedQuery) ||
        rText.includes(romanQuery) ||
        idText.includes(normalizedQuery) || // ADDED: Search by ID
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

  // Enhanced search setup
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

  // Enhanced responsive behavior handling
  function handleResponsiveChanges() {
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        // Update modal controls on resize
        const controlsFixed = q('.modal-controls-fixed');
        if (controlsFixed && modalOpen) {
          const title = q('.modal-controls-title', controlsFixed);
          if (title && isMobile()) {
            title.style.display = 'none';
          } else if (title) {
            title.style.display = 'block';
          }
        }
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

    arrangeActionButtonsHorizontally();

    // ENHANCED: Build search index with ID support
    index = cards.map(c => {
      const title = c.dataset.title || c.querySelector('h3')?.textContent || '';
      const preview = c.dataset.preview || '';
      const fullContent = c.dataset.full || '';
      const placeId = c.id || c.dataset.id || ''; // ADDED: Include place ID
      const searchText = `${title} ${preview} ${fullContent}`.trim();
      return {
        el: c,
        nText: norm(searchText),
        rText: norm(paToRoman(searchText)),
        idText: norm(placeId) // ADDED: Normalized place ID for searching
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

    // Enhanced history management
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

    // NOTE: CSS injection removed - styles should be in your CSS file

    console.log('Enhanced Places.js with full-screen modals initialized successfully');
  });

  // Global error handler
  window.addEventListener('error', (e) => {
    if (e.filename?.includes('places.js')) {
      console.error('Places.js error:', e.error);
      showNotification('An error occurred. Please refresh the page.', 'error');
    }
  });

})();
