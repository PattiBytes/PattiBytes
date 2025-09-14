// Enhanced places.js with smart TTS, custom share modal, auto-translation, and responsive modal handling
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

  // English to Punjabi word mapping for search enhancement
  const enToPunjabi = {
    'gurdwara': 'ਗੁਰਦੁਆਰਾ', 'temple': 'ਮੰਦਿਰ', 'school': 'ਸਕੂਲ', 'college': 'ਕਾਲਜ',
    'hospital': 'ਹਸਪਤਾਲ', 'market': 'ਮਾਰਕੀਟ', 'park': 'ਪਾਰਕ', 'river': 'ਨਦੀ',
    'village': 'ਪਿੰਡ', 'city': 'ਸ਼ਹਿਰ', 'place': 'ਸਥਾਨ', 'famous': 'ਮਸ਼ਹੂਰ'
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
  let ttsState = { paused: false, currentWord: 0, queuePos: 0 };

  // Detect if device is mobile/small screen
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

  // Enhanced Web Share API with custom share modal
  async function shareLink({ title, text, url }) {
    // Try native share first
    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare({ title, text, url }))) {
        await navigator.share({ title, text, url });
        return true;
      }
    } catch (e) {}

    // Show custom share modal
    showCustomShareModal({ title, text, url });
    return false;
  }

  // Custom share modal
  function showCustomShareModal({ title, text, url }) {
    // Remove existing share modal
    const existing = q('.custom-share-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.className = 'custom-share-modal';
    modal.innerHTML = `
      <div class="share-modal-content">
        <div class="share-modal-header">
          <h3>ਸਾਂਝਾ ਕਰੋ</h3>
          <button class="share-modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="share-modal-body">
          <div class="share-link-container">
            <input type="text" class="share-link-input" value="${url}" readonly>
            <button class="copy-share-link">ਕਾਪੀ</button>
          </div>
          <div class="share-options">
            <button class="share-option" data-service="whatsapp">
              <span class="share-icon">📱</span>
              WhatsApp
            </button>
            <button class="share-option" data-service="facebook">
              <span class="share-icon">📘</span>
              Facebook
            </button>
            <button class="share-option" data-service="twitter">
              <span class="share-icon">🐦</span>
              Twitter
            </button>
            <button class="share-option" data-service="telegram">
              <span class="share-icon">✈️</span>
              Telegram
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    
    // Show modal with animation
    setTimeout(() => modal.classList.add('show'), 10);

    // Handle close
    const closeModal = () => {
      modal.classList.remove('show');
      setTimeout(() => modal.remove(), 300);
    };

    q('.share-modal-close', modal).addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Handle copy link
    q('.copy-share-link', modal).addEventListener('click', async () => {
      try {
        await copyToClipboard(url);
        const btn = q('.copy-share-link', modal);
        const original = btn.textContent;
        btn.textContent = '✅ ਕਾਪੀ ਹੋਇਆ';
        setTimeout(() => btn.textContent = original, 2000);
      } catch {
        alert('Copy failed');
      }
    });

    // Handle share options
    qa('.share-option', modal).forEach(btn => {
      btn.addEventListener('click', () => {
        const service = btn.dataset.service;
        const shareUrls = {
          whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title}\n${text}\n${url}`)}`,
          facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
          twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
          telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`
        };
        
        if (shareUrls[service]) {
          window.open(shareUrls[service], '_blank', 'width=600,height=400');
          closeModal();
        }
      });
    });
  }

  // Visual flash highlight for deep link feedback
  function flashHighlight(el, className = 'highlighted', duration = 2000) {
    if (!el) return;
    el.classList.add(className);
    setTimeout(() => el.classList.remove(className), duration);
  }

  // Smart language detection for content
  function detectContentLanguage(text) {
    const punjabiFactor = (text.match(/[\u0A00-\u0A7F]/g) || []).length / text.length;
    const englishFactor = (text.match(/[a-zA-Z]/g) || []).length / text.length;
    
    if (punjabiFactor > 0.3) return 'pa';
    if (englishFactor > 0.5) return 'en';
    return 'mixed';
  }

  // Check if content has sufficient material for TTS
  function hasSufficientContent(text, minWords = 20) {
    return text.trim().split(/\s+/).length >= minWords;
  }

  // Auto-translate text using simple word replacement
  function autoTranslateText(text, targetLang = 'en') {
    if (targetLang === 'en') {
      // Simple Punjabi to English key terms
      let translated = text;
      Object.entries({
        'ਗੁਰਦੁਆਰਾ': 'Gurdwara', 'ਮੰਦਿਰ': 'Temple', 'ਸਕੂਲ': 'School',
        'ਹਸਪਤਾਲ': 'Hospital', 'ਪਾਰਕ': 'Park', 'ਪਿੰਡ': 'Village',
        'ਸਥਾਨ': 'Place', 'ਮਸ਼ਹੂਰ': 'Famous', 'ਇਤਿਹਾਸ': 'History'
      }).forEach(([pa, en]) => {
        translated = translated.replace(new RegExp(pa, 'g'), en);
      });
      return translated;
    }
    return text;
  }

  // Create Table of Contents from headings
  function createTableOfContents(content) {
    const headings = qa('h1, h2, h3, h4, h5, h6', content);
    if (!headings.length) return null;

    const tocContainer = document.createElement('div');
    tocContainer.className = 'table-of-contents';
    
    const tocTitle = document.createElement('h4');
    tocTitle.textContent = 'ਸਮੱਗਰੀ';
    tocTitle.className = 'toc-title';
    tocContainer.appendChild(tocTitle);

    const tocList = document.createElement('ul');
    tocList.className = 'toc-list';

    headings.forEach((heading, index) => {
      const headingId = `heading-${index}-${heading.textContent.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')}`;
      heading.id = headingId;
      heading.style.scrollMarginTop = '80px'; // Account for fixed header

      const tocItem = document.createElement('li');
      tocItem.className = `toc-item toc-level-${heading.tagName.toLowerCase()}`;
      
      const tocLink = document.createElement('a');
      tocLink.href = `#${headingId}`;
      tocLink.textContent = heading.textContent;
      tocLink.className = 'toc-link';
      
      tocLink.addEventListener('click', (e) => {
        e.preventDefault();
        // Store current scroll position for TTS
        scrollPosition = document.querySelector('.modal-body')?.scrollTop || 0;
        heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
        flashHighlight(heading, 'toc-target-highlight', 2000);
      });

      tocItem.appendChild(tocLink);
      tocList.appendChild(tocItem);
    });

    tocContainer.appendChild(tocList);
    return tocContainer;
  }

  // Create mobile TOC button
  function createMobileTocButton(tocContainer) {
    if (!tocContainer) return null;

    const tocButton = document.createElement('button');
    tocButton.className = 'mobile-toc-toggle';
    tocButton.innerHTML = '📋';
    tocButton.title = 'ਸਮੱਗਰੀ';
    tocButton.setAttribute('aria-label', 'Toggle table of contents');

    let tocVisible = false;
    tocButton.addEventListener('click', () => {
      tocVisible = !tocVisible;
      tocContainer.style.display = tocVisible ? 'block' : 'none';
      tocButton.classList.toggle('active', tocVisible);
      tocButton.innerHTML = tocVisible ? '✕' : '📋';
    });

    if (isMobile()) {
      tocContainer.style.display = 'none';
    }

    return tocButton;
  }

  // Speech synthesis voice loading with timeout
  let voiceList = [];
  function ensureVoicesLoaded(timeout = 2500) {
    return new Promise((resolve) => {
      const synth = window.speechSynthesis;
      const voices = synth ? synth.getVoices() : [];
      if (voices.length) { voiceList = voices; resolve(voices); return; }
      
      let resolved = false;
      const onVoicesChanged = () => {
        if (resolved) return;
        voiceList = synth.getVoices() || [];
        resolved = true;
        resolve(voiceList);
      };
      
      if (synth && 'onvoiceschanged' in synth) synth.onvoiceschanged = onVoicesChanged;
      
      const start = performance.now();
      (function poll() {
        const vs = synth ? synth.getVoices() : [];
        if (vs.length) { voiceList = vs; resolved = true; resolve(vs); return; }
        if (performance.now() - start > timeout) { voiceList = vs || []; resolved = true; resolve(voiceList); return; }
        setTimeout(poll, 120);
      })();
    });
  }

  // Stop TTS and reset UI
  function stopTTS() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    qa('.tts-highlight').forEach(s => s.classList.remove('tts-highlight'));
    qa('.tts-play').forEach(b => { b.textContent = '▶️ Play'; b.setAttribute('aria-pressed', 'false'); });
    qa('.tts-status').forEach(el => el.textContent = 'Stopped');
    qa('.tts-progress').forEach(el => el.textContent = '');
    ttsState = { paused: false, currentWord: 0, queuePos: 0 };
  }

  // Enhanced TTS controls with smart language detection
  function initTTSControls(wrapper, modalTextContainer, langPref) {
    const playBtn = q('.tts-play', wrapper);
    const select = q('#tts-voices', wrapper);
    const statusSpan = q('.tts-status', wrapper);
    const progressEl = q('.tts-progress', wrapper);
    const rateInput = q('#tts-rate', wrapper);
    const pitchInput = q('#tts-pitch', wrapper);

    let voices = [];
    let utterRate = parseFloat(rateInput?.value) || 1.02;
    let utterPitch = parseFloat(pitchInput?.value) || 1.0;
    let queue = [], wordSpans = [];

    const getLangCode = code => (code || '').split(/[-_]/)[0].toLowerCase();

    function findVoiceByValue(val) {
      if (!val || val === '__default__') return null;
      const [name, lang] = val.split('||');
      return voices.find(v => v.name === name && v.lang === lang) || null;
    }

    async function loadVoices() {
      voices = await ensureVoicesLoaded(2500);
      
      // Smart voice selection based on content
      const contentText = modalTextContainer.textContent || '';
      const contentLang = detectContentLanguage(contentText);
      const hasEnoughContent = hasSufficientContent(contentText);

      if (!hasEnoughContent || contentLang === 'mixed') {
        // Show language selection message
        statusSpan.textContent = 'Content auto-translated for better speech';
        langPref = 'en'; // Default to English for better TTS support
      }

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
        select.appendChild(og);
      };

      const preferred = voices.filter(v => getLangCode(v.lang) === langPref);
      const english = voices.filter(v => getLangCode(v.lang) === 'en');
      const hindi = voices.filter(v => getLangCode(v.lang) === 'hi');
      const others = voices.filter(v => !preferred.includes(v) && !english.includes(v) && !hindi.includes(v));

      select.innerHTML = '';
      
      // Prioritize based on content and voice availability
      if (preferred.length) addGroup('Preferred', preferred);
      if (english.length) addGroup('English', english);
      if (hindi.length) addGroup('हिंदी', hindi);
      if (others.length) addGroup('Other voices', others);

      if (!select.options.length) {
        const defOpt = document.createElement('option');
        defOpt.value = '__default__';
        defOpt.textContent = 'Default';
        select.appendChild(defOpt);
      }
    }

    function prepareTextForReading() {
      // Clean up existing spans
      qa('.tts-word-span', modalTextContainer).forEach(s => {
        if (s.parentNode) s.parentNode.replaceChild(document.createTextNode(s.textContent), s);
      });

      const nodes = Array.from(modalTextContainer.querySelectorAll('p, h1, h2, h3, h4, li')).filter(el => el.textContent.trim() !== '');
      const readContainer = document.createElement('div');
      readContainer.className = 'tts-read-container';
      
      nodes.forEach(el => {
        const newEl = document.createElement(el.tagName);
        let text = el.textContent.replace(/\s+/g, ' ').trim();
        
        // Auto-translate if needed
        const contentLang = detectContentLanguage(text);
        if (contentLang === 'pa' && !hasSufficientContent(text, 10)) {
          text = autoTranslateText(text);
        }
        
        const words = text.split(/\s+/);
        words.forEach((w, i) => {
          const span = document.createElement('span');
          span.className = 'tts-word-span';
          span.textContent = w + (i < words.length - 1 ? ' ' : '');
          newEl.appendChild(span);
        });
        readContainer.appendChild(newEl);
      });
      
      modalTextContainer.innerHTML = '';
      modalTextContainer.appendChild(readContainer);
    }

    function buildQueue() {
      const readContainer = modalTextContainer.querySelector('.tts-read-container');
      if (!readContainer) return;
      queue = Array.from(readContainer.children).map(el => el.textContent.trim()).filter(Boolean);
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
          
          // Smooth scroll to highlighted word without interrupting
          const modalBody = q('.modal-body');
          if (modalBody) {
            const rect = wordSpans[i].getBoundingClientRect();
            const modalRect = modalBody.getBoundingClientRect();
            if (rect.top < modalRect.top || rect.bottom > modalRect.bottom) {
              wordSpans[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
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
        statusSpan.textContent = 'Speech not supported'; 
        return; 
      }
      
      if (ttsState.queuePos >= queue.length) { 
        stopLocal(); 
        return; 
      }
      
      const text = queue[ttsState.queuePos++];
      const utterance = new SpeechSynthesisUtterance(text);
      const selectedVoice = findVoiceByValue(select.value);
      
      if (selectedVoice) utterance.voice = selectedVoice;
      else utterance.lang = langPref || 'en-US';
      
      utterance.rate = utterRate;
      utterance.pitch = utterPitch;
      utterance.onboundary = (ev) => { 
        if (ev.name === 'word') highlightByCharIndex(ev.charIndex); 
      };
      
      utterance.onend = () => {
        const totalWords = qa('.tts-word-span', modalTextContainer).length || 1;
        const wordCount = text.split(/\s+/).length;
        ttsState.currentWord = Math.min(totalWords, ttsState.currentWord + wordCount);
        
        if (progressEl) {
          const pct = Math.round((ttsState.currentWord / totalWords) * 100);
          progressEl.textContent = ` ${pct}%`;
        }
        
        setTimeout(() => { 
          if (!ttsState.paused) speakNextChunk(); 
        }, 80);
      };
      
      window.speechSynthesis.speak(utterance);
    }

    function stopLocal() {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      qa('.tts-highlight', modalTextContainer).forEach(s => s.classList.remove('tts-highlight'));
      playBtn.textContent = '▶️ Play';
      playBtn.setAttribute('aria-pressed', 'false');
      statusSpan.textContent = 'Stopped';
      if (progressEl) progressEl.textContent = '';
      ttsState = { paused: false, currentWord: 0, queuePos: 0 };
    }

    function startTTS() {
      if (!window.speechSynthesis) { 
        statusSpan.textContent = 'Speech not supported'; 
        return; 
      }
      
      prepareTextForReading();
      buildQueue();
      
      if (!qa('.tts-word-span', modalTextContainer).length) { 
        statusSpan.textContent = 'No readable content'; 
        return; 
      }
      
      // Resume from where we left off if paused
      if (ttsState.paused) {
        ttsState.paused = false;
      } else {
        ttsState = { paused: false, currentWord: 0, queuePos: 0 };
      }
      
      statusSpan.textContent = 'Speaking...';
      playBtn.textContent = '⏸️ Pause';
      playBtn.setAttribute('aria-pressed', 'true');
      speakNextChunk();
    }

    function pauseTTS() {
      if (window.speechSynthesis?.speaking) {
        window.speechSynthesis.cancel();
        ttsState.paused = true;
        statusSpan.textContent = 'Paused - will resume from current position';
        playBtn.textContent = '▶️ Continue';
        playBtn.setAttribute('aria-pressed', 'false');
      }
    }

    // Event listeners
    playBtn.addEventListener('click', () => {
      if (window.speechSynthesis?.speaking) pauseTTS();
      else startTTS();
    });

    select.addEventListener('change', () => { 
      if (window.speechSynthesis?.speaking) {
        pauseTTS();
        setTimeout(startTTS, 100);
      }
    });

    rateInput.addEventListener('input', (e) => {
      utterRate = parseFloat(e.target.value) || 1.02;
    });

    pitchInput.addEventListener('input', (e) => {
      utterPitch = parseFloat(e.target.value) || 1.0;
    });

    loadVoices().catch(() => {});

    return { stop: () => { try { stopLocal(); } catch {} } };
  }

  // Variables for modal state
  let currentIndex = -1;
  let lastFocusedElement = null;
  let modalOpen = false;
  let hadPushedState = false;

  // Modal elements
  let modal, modalMedia, modalText, btnClose, modalContent, cards;

  // Search and Clear elements
  let searchInput, clearSearch, noMatchEl;

  // Index for search
  let index = [];

  // Lock/unlock page scroll when modal active
  function lockPageScroll() { 
    document.body.style.overflow = 'hidden'; 
    document.body.style.paddingRight = '15px'; // Prevent layout shift
  }
  
  function unlockPageScroll() { 
    document.body.style.overflow = ''; 
    document.body.style.paddingRight = '';
  }

  // Enhanced focus trap
  function trapFocus(e) {
    if (!modalOpen || e.key !== 'Tab') return;
    
    const focusables = qa('#places-modal button, #places-modal a, #places-modal input, #places-modal select, #places-modal textarea, #places-modal [tabindex]:not([tabindex="-1"])')
      .filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
    
    if (!focusables.length) return;
    
    const first = focusables[0], last = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  // Arrange action buttons horizontally
  function arrangeActionButtonsHorizontally() {
    cards.forEach(card => {
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

  // Populate Related Articles
  function populateRelatedAll(activeCard) {
    if (!modalText) return;
    
    const existing = modalText.parentNode.querySelector('.modal-related');
    if (existing) existing.remove();

    const wrap = document.createElement('div');
    wrap.className = 'modal-related';
    wrap.innerHTML = `<h4>ਤੁਹਾਨੂੰ ਇਹ ਵੀ ਪਸੰਦ ਆ ਸਕਦਾ ਹੈ</h4>`;

    const list = document.createElement('div');
    list.className = 'related-list';

    cards.forEach(c => {
      if (c === activeCard) return;
      
      const thumb = c.dataset.image || '';
      const cardTitle = c.dataset.title || c.querySelector('h3')?.textContent || '';
      const preview = c.dataset.preview || '';
      
      const rel = document.createElement('div');
      rel.className = 'related-card';
      rel.innerHTML = `
        ${thumb ? `<img src="${thumb}" alt="${cardTitle}" loading="lazy"/>` : ''}
        <div class="related-info">
          <div class="related-title">${cardTitle}</div>
          <div class="related-meta">${preview.slice(0, 80)}…</div>
          <div style="margin-top:.5rem">
            <button class="related-open" data-id="${c.id}">ਖੋਲੋ</button>
          </div>
        </div>`;
      list.appendChild(rel);
    });

    wrap.appendChild(list);
    modalText.parentNode.appendChild(wrap);

    // Handle related article clicks
    qa('.related-open', wrap).forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        if (!id) return;

        const target = document.getElementById(id);
        if (target) {
          // Store scroll position before closing
          scrollPosition = q('.modal-body')?.scrollTop || 0;
          
          internalClose();
          setTimeout(() => {
            // Scroll to top when opening new modal
            if (q('.modal-body')) q('.modal-body').scrollTop = 0;
            
            try { 
              target.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
            } catch {}
            
            flashHighlight(target, 'highlighted', 1600);
            openModal(cards.indexOf(target));
          }, 280);
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

    // Stop TTS but preserve state for resume
    if (window.speechSynthesis?.speaking) {
      window.speechSynthesis.cancel();
    }

    // Clean up UI elements
    qa('.tts-controls', modal).forEach(n => n.remove());
    qa('.tts-toggle-btn', modal).forEach(n => n.remove());
    qa('.mobile-toc-toggle', modal).forEach(n => n.remove());
    qa('.table-of-contents', modal).forEach(n => n.remove());
    qa('.custom-share-modal').forEach(n => n.remove());
    
    // Restore original content
    qa('.tts-word-span', modalText).forEach(s => {
      if (s.parentNode) s.parentNode.replaceChild(document.createTextNode(s.textContent), s);
    });

    if (lastFocusedElement?.focus) lastFocusedElement.focus();

    document.documentElement.classList.remove('modal-open');
    modalOpen = false;
  }

  // Enhanced modal close with better back button handling
  function closeModal() {
    // Always close any open share modals first
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

  // Open modal with responsive behavior
  function openModal(index) {
    if (!modal) return;
    if (index < 0 || index >= cards.length) return;

    // On small screens, navigate to a separate page instead of modal
    if (isMobile()) {
      const card = cards[index];
      const articleId = card.id || card.dataset.id;
      window.location.href = `/places/${articleId}/`;
      return;
    }

    previousUrl = window.location.href;
    currentIndex = index;
    const card = cards[currentIndex];

    const imgSrc = card.dataset.image || '';
    const fullHtml = card.dataset.full || card.dataset.preview || '';

    if (modalMedia) {
      modalMedia.innerHTML = imgSrc ?
        `<img src="${imgSrc}" alt="${card.dataset.title || ''}" loading="lazy">` : '';
    }
    
    if (modalText) modalText.innerHTML = fullHtml;

    // Create navigation aids
    const tocContainer = createTableOfContents(modalText);
    const mobileTocButton = createMobileTocButton(tocContainer);

    populateRelatedAll(card);

    // Clean up existing controls
    qa('.tts-controls, .tts-toggle-btn, .mobile-toc-toggle, .table-of-contents', modal).forEach(n => n.remove());

    // Create modal header if it doesn't exist
    let modalHeader = q('.modal-header', modal);
    if (!modalHeader) {
      modalHeader = document.createElement('div');
      modalHeader.className = 'modal-header';
      modal.prepend(modalHeader);
    }

    // Add controls to header
    const modalControls = document.createElement('div');
    modalControls.className = 'modal-controls';

    // TTS toggle button
    const ttsToggleBtn = document.createElement('button');
    ttsToggleBtn.className = 'tts-toggle-btn';
    ttsToggleBtn.innerHTML = '🔊';
    ttsToggleBtn.title = 'Text-to-Speech';
    ttsToggleBtn.type = 'button';

    modalControls.appendChild(ttsToggleBtn);

    // Mobile TOC button
    if (mobileTocButton) {
      modalControls.appendChild(mobileTocButton);
    }

    // Close button
    if (btnClose) {
      modalControls.appendChild(btnClose);
    }

    modalHeader.innerHTML = '';
    modalHeader.appendChild(modalControls);

    // Add TOC container
    if (tocContainer) {
      const modalBody = q('.modal-body', modal);
      modalBody.prepend(tocContainer);
    }

    // TTS controls
    const ttsWrap = document.createElement('div');
    ttsWrap.className = 'tts-controls';
    ttsWrap.innerHTML = `
      <div class="tts-controls-row">
        <button class="tts-play" aria-pressed="false" title="Play/Pause">▶️ Play</button>
        <div class="tts-progress" aria-hidden="true"></div>
      </div>
      <div class="tts-controls-row">
        <select id="tts-voices" aria-label="Choose voice"></select>
        <input id="tts-rate" type="range" min="0.5" max="2.0" step="0.05" value="1.02" aria-label="Speech rate">
        <input id="tts-pitch" type="range" min="0.5" max="2.0" step="0.05" value="1.0" aria-label="Speech pitch">
        <span class="tts-status" aria-live="polite"></span>
      </div>
    `;

    if (tocContainer) {
      tocContainer.after(ttsWrap);
    } else {
      modalText?.before(ttsWrap);
    }

    const langPref = (document.documentElement.lang || 'pa-IN').split(/[-_]/)[0].toLowerCase();
    let ttsInstance = null;

    // TTS toggle functionality
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

    // Show modal
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('open');
    modal.style.display = 'flex';

    const modalBody = q('.modal-body', modal);
    if (modalBody) {
      modalBody.scrollTop = 0; // Always start at top
      modalBody.classList.add('highlighted');
      setTimeout(() => modalBody.classList.remove('highlighted'), 1000);
    }

    lastFocusedElement = document.activeElement;
    btnClose?.focus();
    document.documentElement.classList.add('modal-open');
    modalOpen = true;
    lockPageScroll();

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
    
    if (ev.key === 'Escape') closeModal();
    else if (ev.key === 'Tab') trapFocus(ev);
  }

  // Setup copy-link buttons
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
          const prevText = btn.textContent;
          btn.textContent = '✔️';
          setTimeout(() => {
            btn.classList.remove('copied');
            btn.textContent = prevText || '🔗';
          }, 1500);
        } catch {
          const notification = document.createElement('div');
          notification.textContent = `Copy manually: ${url}`;
          notification.style.cssText = `
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
            background: #333; color: white; padding: 10px; border-radius: 5px;
            z-index: 10000; font-size: 14px;
          `;
          document.body.appendChild(notification);
          setTimeout(() => notification.remove(), 3000);
        }
      });
    });
  }

  // Setup share buttons with custom modal
  function setupShareButtons() {
    qa('.share-btn').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const article = btn.closest('article.place-card');
        if (!article) return;

        const title = article.dataset.title || article.querySelector('h3')?.textContent || document.title;
        const url = `https://www.pattibytes.com/places/#${encodeURIComponent(article.id)}`;
        const text = (article.dataset.preview || 'ਪੱਟੀ ਦੇ ਪ੍ਰਸਿੱਧ ਸਥਾਨ').slice(0, 140);

        const shared = await shareLink({ title, text, url });
        if (!shared) {
          // Custom share modal will be shown by shareLink function
          btn.classList.add('shared');
          setTimeout(() => btn.classList.remove('shared'), 1500);
        }
      });
    });
  }

  // Enhanced search with auto-translation
  function applySearch(qstr) {
    const siteLang = (document.documentElement.lang || 'pa').toLowerCase();
    const inputLang = /[\u0A00-\u0A7F]/.test(qstr.trim()) ? 'pa' : 'en';

    let searchQuery = qstr.trim();
    
    // Auto-translate English to Punjabi terms if site is in Punjabi
    if (siteLang === 'pa' && inputLang === 'en') {
      Object.entries(enToPunjabi).forEach(([en, pa]) => {
        searchQuery = searchQuery.replace(new RegExp(`\\b${en}\\b`, 'gi'), `${en} ${pa}`);
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
          'ਕੋਈ ਮਿਲਦਾ ਸਥਾਨ ਨਹੀਂ ਮਿਲਿਆ।<br><small>Try English terms like "gurdwara", "temple", "school"</small>' : 
          'No matching places found.<br><small>Try Punjabi terms or different keywords</small>';
      } else {
        noMatchEl.style.display = 'none';
      }
    }
  }

  // Setup search functionality
  function setupSearch() {
    if (!searchInput) return;

    searchInput.addEventListener('input', e => {
      applySearch(e.target.value || '');
      const hasValue = !!(e.target.value || '').trim();
      clearSearch?.classList.toggle('visible', hasValue);
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

  // Handle responsive behavior
  function handleResponsiveChanges() {
    window.addEventListener('resize', () => {
      // Close modal on mobile when resizing to prevent layout issues
      if (isMobile() && modalOpen) {
        closeModal();
      }
      
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
    });
  }

  // Initialize everything
  document.addEventListener('DOMContentLoaded', () => {
    modal = q('#places-modal');
    if (!modal) return;

    modalMedia = q('#modal-media', modal);
    modalText = q('#modal-text', modal);
    btnClose = q('#modal-close', modal);
    modalContent = q('.modal-content', modal);

    cards = Array.from(document.querySelectorAll('.place-card'));
    searchInput = q('#places-search');
    clearSearch = q('#clear-search');
    noMatchEl = q('#no-match');

    // Arrange buttons horizontally
    arrangeActionButtonsHorizontally();

    // Build enhanced search index
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

    // Setup functionality
    setupSearch();
    setupCopyLinks();
    setupShareButtons();
    handleResponsiveChanges();

    // Handle deep links
    function handleHashOpen() {
      const id = normalizeHash(window.location.hash || '');
      if (!id) return;
      
      const target = document.getElementById(id);
      if (target?.classList.contains('place-card')) {
        openModal(cards.indexOf(target));
        try { 
          target.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
        } catch {}
        flashHighlight(target, 'highlighted', 1600);
      }
    }

    handleHashOpen();
    window.addEventListener('hashchange', handleHashOpen);

    // History management
    window.addEventListener('popstate', () => {
      if (modalOpen) {
        internalClose();
        hadPushedState = false;
      }
      
      const id = normalizeHash(window.location.hash || '');
      if (id) {
        const target = document.getElementById(id);
        if (target?.classList.contains('place-card')) {
          openModal(cards.indexOf(target));
        }
      }
    });

    // Event bindings
    btnClose?.addEventListener('click', ev => { 
      ev.stopPropagation(); 
      closeModal(); 
    });
    
    modal?.addEventListener('click', ev => { 
      if (ev.target === modal) closeModal(); 
    });

    // Card interactions
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
    });

    // Prevent context menu on long press for mobile
    cards.forEach(card => {
      card.addEventListener('contextmenu', e => e.preventDefault());
    });
  });
})();
