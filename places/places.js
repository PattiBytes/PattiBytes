// Enhanced places.js with custom share modal, smart TTS, improved UX, and dynamic search translation
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

  // Reverse transliteration: English to Punjabi approximation
  const romanToPa = (txt) => (txt || '')
    .replace(/ng/g, 'ਙ').replace(/ch/g, 'ਚ').replace(/nj/g, 'ਞ')
    .replace(/k/g, 'ਕ').replace(/t/g, 'ਟ').replace(/n/g, 'ਨ')
    .replace(/d/g, 'ਦ').replace(/p/g, 'ਪ').replace(/m/g, 'ਮ')
    .replace(/y/g, 'ਯ').replace(/r/g, 'ਰ').replace(/l/g, 'ਲ')
    .replace(/v/g, 'ਵ').replace(/s/g, 'ਸ').replace(/h/g, 'ਹ')
    .replace(/a/g, 'ਅ').replace(/i/g, 'ਇ').replace(/u/g, 'ਉ')
    .replace(/e/g, 'ਏ').replace(/o/g, 'ਓ');

  // Deep-link hash normalize
  function normalizeHash(h) {
    if (!h) return '';
    let s = h.replace(/^#/, '').replace(/\/+$|\/+/g, '');
    try { return decodeURIComponent(s); } catch { return s; }
  }

  // Store previous URL and TTS state
  let previousUrl = window.location.href;
  let ttsState = {
    currentWord: 0,
    queuePos: 0,
    isPaused: false,
    wasPlaying: false
  };

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

  // Visual flash highlight for deep link feedback
  function flashHighlight(el, className = 'highlighted', duration = 2000) {
    if (!el) return;
    el.classList.add(className);
    setTimeout(() => el.classList.remove(className), duration);
  }

  // Create custom share modal
  function createShareModal(shareData) {
    // Remove existing share modal
    qa('.share-modal-overlay').forEach(el => el.remove());

    const shareModal = document.createElement('div');
    shareModal.className = 'share-modal-overlay';
    shareModal.innerHTML = `
      <div class="share-modal">
        <div class="share-modal-header">
          <h3>ਸਾਂਝਾ ਕਰੋ</h3>
          <button class="share-modal-close" type="button">&times;</button>
        </div>
        <div class="share-modal-content">
          <div class="share-preview">
            <h4>${shareData.title}</h4>
            <p>${shareData.text}</p>
            <div class="share-url">${shareData.url}</div>
          </div>
          <div class="share-options">
            <button class="share-option" data-action="copy">
              <span class="share-icon">🔗</span>
              <span>ਲਿੰਕ ਕਾਪੀ ਕਰੋ</span>
            </button>
            <button class="share-option" data-action="whatsapp">
              <span class="share-icon">📱</span>
              <span>WhatsApp</span>
            </button>
            <button class="share-option" data-action="telegram">
              <span class="share-icon">✈️</span>
              <span>Telegram</span>
            </button>
            <button class="share-option" data-action="twitter">
              <span class="share-icon">🐦</span>
              <span>Twitter</span>
            </button>
            <button class="share-option" data-action="facebook">
              <span class="share-icon">📘</span>
              <span>Facebook</span>
            </button>
            <button class="share-option" data-action="native">
              <span class="share-icon">📤</span>
              <span>ਹੋਰ...</span>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(shareModal);

    // Animate in
    setTimeout(() => shareModal.classList.add('show'), 10);

    // Handle share options
    qa('.share-option', shareModal).forEach(btn => {
      btn.addEventListener('click', async () => {
        const action = btn.dataset.action;
        const { title, text, url } = shareData;

        switch (action) {
          case 'copy':
            try {
              await copyToClipboard(url);
              btn.innerHTML = '<span class="share-icon">✅</span><span>ਕਾਪੀ ਹੋ ਗਿਆ!</span>';
              setTimeout(() => {
                btn.innerHTML = '<span class="share-icon">🔗</span><span>ਲਿੰਕ ਕਾਪੀ ਕਰੋ</span>';
              }, 2000);
            } catch {
              alert('Copy failed');
            }
            break;
            
          case 'whatsapp':
            window.open(`https://wa.me/?text=${encodeURIComponent(`${title}\n${text}\n${url}`)}`, '_blank');
            break;
            
          case 'telegram':
            window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`${title}\n${text}`)}`, '_blank');
            break;
            
          case 'twitter':
            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${title}\n${text}`)}&url=${encodeURIComponent(url)}`, '_blank');
            break;
            
          case 'facebook':
            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
            break;
            
          case 'native':
            try {
              if (navigator.share) {
                await navigator.share({ title, text, url });
              } else {
                await copyToClipboard(`${title}\n${text}\n${url}`);
                btn.innerHTML = '<span class="share-icon">✅</span><span>ਕਾਪੀ ਹੋ ਗਿਆ!</span>';
              }
            } catch (e) {
              console.log('Share cancelled or failed');
            }
            break;
        }
      });
    });

    // Close modal handlers
    function closeShareModal() {
      shareModal.classList.remove('show');
      setTimeout(() => shareModal.remove(), 300);
    }

    q('.share-modal-close', shareModal).addEventListener('click', closeShareModal);
    shareModal.addEventListener('click', (e) => {
      if (e.target === shareModal) closeShareModal();
    });

    // ESC key to close
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        closeShareModal();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  // Detect content language and amount
  function analyzeContent(text) {
    const punjabiChars = (text.match(/[\u0A00-\u0A7F]/g) || []).length;
    const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
    const totalChars = text.length;
    const words = text.trim().split(/\s+/).filter(Boolean).length;

    return {
      totalWords: words,
      totalChars,
      punjabiChars,
      englishChars,
      primaryLang: punjabiChars > englishChars ? 'pa' : 'en',
      hasSufficientContent: words > 20, // Minimum 20 words for TTS
      punjabRatio: punjabiChars / totalChars,
      englishRatio: englishChars / totalChars
    };
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

    if (window.innerWidth <= 768) {
      tocContainer.style.display = 'none';
    }

    return tocButton;
  }

  // Enhanced TTS with language detection and fallback
  let voiceList = [];
  function ensureVoicesLoaded(timeout = 3000) {
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
        setTimeout(poll, 150);
      })();
    });
  }

  // Stop TTS and reset UI
  function stopTTS() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    qa('.tts-highlight').forEach(s => s.classList.remove('tts-highlight'));
    qa('.tts-play').forEach(b => { b.textContent = '▶️ Play'; b.setAttribute('aria-pressed', 'false'); });
    qa('.tts-status').forEach(el => el.textContent = 'Ready');
    qa('.tts-progress').forEach(el => el.textContent = '');
    ttsState.isPaused = false;
    ttsState.wasPlaying = false;
  }

  // Initialize enhanced TTS controls
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
    let queue = [], queuePos = 0, wordSpans = [], currentWord = 0, pauseRequested = false;

    // Analyze content for TTS suitability
    const contentAnalysis = analyzeContent(modalTextContainer.textContent || '');
    
    if (!contentAnalysis.hasSufficientContent) {
      statusSpan.textContent = 'ਘੱਟ ਸਮੱਗਰੀ - TTS ਉਪਲਬਧ ਨਹੀਂ';
      playBtn.disabled = true;
      playBtn.style.opacity = '0.5';
      return { stop: () => {} };
    }

    const getLangCode = code => (code || '').split(/[-_]/)[0].toLowerCase();

    function findBestVoice(preferredLang) {
      // Find voice for preferred language
      let voice = voices.find(v => getLangCode(v.lang) === preferredLang);
      
      // Fallback to English if preferred not available
      if (!voice && preferredLang !== 'en') {
        voice = voices.find(v => getLangCode(v.lang) === 'en');
      }
      
      // Fallback to Hindi if English not available
      if (!voice) {
        voice = voices.find(v => getLangCode(v.lang) === 'hi');
      }
      
      return voice;
    }

    function findVoiceByValue(val) {
      if (!val || val === '__default__') return findBestVoice(langPref);
      const [name, lang] = val.split('||');
      return voices.find(v => v.name === name && v.lang === lang) || findBestVoice(langPref);
    }

    async function loadVoices() {
      voices = await ensureVoicesLoaded(3000);
      
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

      // Determine best language based on content
      const bestLang = contentAnalysis.primaryLang === 'pa' ? 'pa' : 'en';
      const preferred = voices.filter(v => getLangCode(v.lang) === bestLang);
      const english = voices.filter(v => getLangCode(v.lang) === 'en' && bestLang !== 'en');
      const hindi = voices.filter(v => getLangCode(v.lang) === 'hi');
      const others = voices.filter(v => !preferred.includes(v) && !english.includes(v) && !hindi.includes(v));

      select.innerHTML = '';
      if (preferred.length) addGroup(`${bestLang === 'pa' ? 'Punjabi' : 'English'} (Recommended)`, preferred);
      if (english.length) addGroup('English', english);
      if (hindi.length) addGroup('Hindi (हिंदी)', hindi);
      if (others.length) addGroup('Other voices', others);

      if (!select.options.length) {
        const defOpt = document.createElement('option');
        defOpt.value = '__default__';
        defOpt.textContent = 'Default Voice';
        select.appendChild(defOpt);
      }

      // Update status based on available voices
      if (preferred.length === 0 && bestLang === 'pa') {
        statusSpan.textContent = 'ਪੰਜਾਬੀ ਆਵਾਜ਼ ਨਹੀਂ - English/Hindi ਵਰਤੇਗਾ';
      }
    }

    function prepareTextForReading() {
      // Clean up existing spans
      qa('.tts-word-span', modalTextContainer).forEach(s => {
        if (s.parentNode) s.parentNode.replaceChild(document.createTextNode(s.textContent), s);
      });

      const nodes = Array.from(modalTextContainer.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li')).filter(el => el.textContent.trim() !== '');
      const readContainer = document.createElement('div');
      readContainer.className = 'tts-read-container';

      nodes.forEach(el => {
        const newEl = document.createElement(el.tagName);
        const text = el.textContent.replace(/\s+/g, ' ').trim();
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
      queuePos = ttsState.queuePos || 0;
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
          
          // Smooth scroll to highlighted word without disrupting user scroll
          const rect = wordSpans[i].getBoundingClientRect();
          const modalBody = q('.modal-body');
          if (modalBody && (rect.top < 100 || rect.bottom > window.innerHeight - 100)) {
            wordSpans[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          
          currentWord = i + 1;
          ttsState.currentWord = currentWord;
          return;
        }
        total += len;
      }
    }

    function speakNextChunk() {
      if (!window.speechSynthesis) { statusSpan.textContent = 'TTS not supported'; return; }
      if (queuePos >= queue.length) { stopLocal(); return; }

      const text = queue[queuePos++];
      const utterance = new SpeechSynthesisUtterance(text);
      const selectedVoice = findVoiceByValue(select.value);
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      } else {
        // Auto-select best language based on content
        utterance.lang = contentAnalysis.primaryLang === 'pa' ? 'hi-IN' : 'en-US';
      }
      
      utterance.rate = utterRate;
      utterance.pitch = utterPitch;
      utterance.onboundary = (ev) => { if (ev.name === 'word') highlightByCharIndex(ev.charIndex); };
      utterance.onend = () => {
        const totalWords = qa('.tts-word-span', modalTextContainer).length || 1;
        const wordCount = text.split(/\s+/).length;
        currentWord = Math.min(totalWords, currentWord + wordCount);
        
        if (progressEl) {
          const pct = Math.round((currentWord / totalWords) * 100);
          progressEl.textContent = `${pct}%`;
        }
        
        ttsState.queuePos = queuePos;
        setTimeout(() => { if (!pauseRequested) speakNextChunk(); }, 100);
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
      ttsState.isPaused = false;
      ttsState.wasPlaying = false;
    }

    function startTTS() {
      if (!window.speechSynthesis) { statusSpan.textContent = 'TTS not supported'; return; }
      
      prepareTextForReading();
      if (!qa('.tts-word-span', modalTextContainer).length) { statusSpan.textContent = 'No text to read'; return; }
      
      buildQueue();
      if (!ttsState.isPaused) {
        currentWord = 0;
        queuePos = 0;
      }
      
      pauseRequested = false;
      statusSpan.textContent = 'Speaking...';
      playBtn.textContent = '⏸️ Pause';
      playBtn.setAttribute('aria-pressed', 'true');
      ttsState.wasPlaying = true;
      speakNextChunk();
    }

    function pauseTTS() {
      if (window.speechSynthesis?.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        pauseRequested = true;
        ttsState.isPaused = true;
        statusSpan.textContent = 'Paused - Click to resume';
        playBtn.textContent = '▶️ Resume';
        playBtn.setAttribute('aria-pressed', 'false');
      }
    }

    function resumeTTS() {
      if (window.speechSynthesis?.paused) {
        window.speechSynthesis.resume();
        pauseRequested = false;
        ttsState.isPaused = false;
        statusSpan.textContent = 'Resumed...';
        playBtn.textContent = '⏸️ Pause';
        playBtn.setAttribute('aria-pressed', 'true');
      }
    }

    // Event listeners
    playBtn.addEventListener('click', () => {
      if (window.speechSynthesis?.speaking && !window.speechSynthesis.paused) pauseTTS();
      else if (window.speechSynthesis?.paused) resumeTTS();
      else startTTS();
    });

    select.addEventListener('change', () => {
      if (window.speechSynthesis?.speaking) {
        window.speechSynthesis.cancel();
        setTimeout(() => speakNextChunk(), 150);
      }
    });

    rateInput.addEventListener('input', (e) => {
      utterRate = parseFloat(e.target.value) || 1.0;
    });

    pitchInput.addEventListener('input', (e) => {
      utterPitch = parseFloat(e.target.value) || 1.0;
    });

    loadVoices().catch(() => {});

    return {
      stop: () => { try { stopLocal(); } catch (e) {} }
    };
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
  function lockPageScroll() { document.body.style.overflow = 'hidden'; }
  function unlockPageScroll() { document.body.style.overflow = ''; }

  // Enhanced focus trap
  function trapFocus(e) {
    if (!modalOpen || e.key !== 'Tab') return;
    const focusables = qa('#places-modal button:not([disabled]), #places-modal a, #places-modal input, #places-modal select, #places-modal textarea, #places-modal [tabindex]:not([tabindex="-1"])')
      .filter(el => el.offsetParent !== null);
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
          <div style="margin-top:.5rem"><button class="related-open" data-id="${c.id}">ਖੋਲੋ</button></div>
        </div>`;
      list.appendChild(rel);
    });

    wrap.appendChild(list);
    modalText.parentNode.appendChild(wrap);

    qa('.related-open', wrap).forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        if (!id) return;
        
        // Smooth transition to new modal
        internalClose();
        setTimeout(() => {
          const target = document.getElementById(id);
          if (target) {
            openModal(cards.indexOf(target));
            setTimeout(() => {
              // Scroll to top of new modal
              const modalBody = q('.modal-body');
              if (modalBody) modalBody.scrollTop = 0;
            }, 100);
          }
        }, 200);
      });
    });
  }

  // Internal modal close
  function internalClose() {
    modal.setAttribute('aria-hidden', 'true');
    modal.classList.remove('open');
    modal.style.display = 'none';
    unlockPageScroll();

    stopTTS();
    qa('.tts-controls', modal).forEach(n => n.remove());
    qa('.tts-toggle-btn', modal).forEach(n => n.remove());
    qa('.mobile-toc-toggle', modal).forEach(n => n.remove());
    qa('.table-of-contents', modal).forEach(n => n.remove());
    qa('.tts-word-span', modalText).forEach(s => {
      if (s.parentNode) s.parentNode.replaceChild(document.createTextNode(s.textContent), s);
    });

    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }

    document.documentElement.classList.remove('modal-open');
    modalOpen = false;
    
    // Reset TTS state for next modal
    ttsState = { currentWord: 0, queuePos: 0, isPaused: false, wasPlaying: false };
  }

  // Close modal with better back button handling
  function closeModal() {
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
    try { history.replaceState(history.state, '', '/places/'); } catch {}
  }

  // Open modal with scroll to top and enhanced UX
  function openModal(index) {
    if (!modal) return;
    if (index < 0 || index >= cards.length) return;
    
    previousUrl = window.location.href;
    currentIndex = index;
    const card = cards[currentIndex];

    const imgSrc = card.dataset.image || '';
    const fullHtml = card.dataset.full || card.dataset.preview || card.innerHTML || '';

    if (modalMedia) {
      modalMedia.innerHTML = imgSrc ?
        `<img src="${imgSrc}" alt="${card.dataset.title || card.querySelector('h3')?.textContent || ''}" loading="lazy" style="max-width:100%;">` : '';
    }
    if (modalText) modalText.innerHTML = fullHtml;

    // Create enhanced navigation
    const tocContainer = createTableOfContents(modalText);
    const mobileTocButton = createMobileTocButton(tocContainer);

    populateRelatedAll(card);

    // Clean up existing controls
    qa('.tts-controls, .tts-toggle-btn, .mobile-toc-toggle, .table-of-contents', modal).forEach(el => el.remove());

    // Create modal header if it doesn't exist
    let modalHeader = q('.modal-header', modal);
    if (!modalHeader) {
      modalHeader = document.createElement('div');
      modalHeader.className = 'modal-header';
      modal.insertBefore(modalHeader, modal.firstChild);
    }

    // Add controls to header
    const controlsGroup = document.createElement('div');
    controlsGroup.className = 'modal-controls';

    // TTS toggle button
    const ttsToggleBtn = document.createElement('button');
    ttsToggleBtn.className = 'tts-toggle-btn';
    ttsToggleBtn.innerHTML = '🔊';
    ttsToggleBtn.title = 'Text-to-Speech';
    ttsToggleBtn.type = 'button';

    // Add mobile TOC button
    if (mobileTocButton) {
      controlsGroup.appendChild(mobileTocButton);
    }

    controlsGroup.appendChild(ttsToggleBtn);
    
    // Ensure close button exists in header
    if (!q('.modal-close', modalHeader)) {
      const closeBtn = document.createElement('button');
      closeBtn.id = 'modal-close';
      closeBtn.className = 'modal-close';
      closeBtn.innerHTML = '&times;';
      closeBtn.setAttribute('aria-label', 'Close modal');
      closeBtn.type = 'button';
      controlsGroup.appendChild(closeBtn);
      btnClose = closeBtn;
    }

    modalHeader.appendChild(controlsGroup);

    // Add TOC container
    if (tocContainer) {
      modalText?.parentNode?.insertBefore(tocContainer, modalText);
    }

    // Create TTS controls
    const ttsWrap = document.createElement('div');
    ttsWrap.className = 'tts-controls';
    ttsWrap.innerHTML = `
      <div class="tts-controls-row">
        <button class="tts-play" aria-pressed="false" title="Play/Pause TTS">▶️ Play</button>
        <div class="tts-progress" aria-hidden="true"></div>
      </div>
      <div class="tts-controls-row">
        <label for="tts-voices" class="sr-only">Voice</label>
        <select id="tts-voices" aria-label="Choose voice"></select>
        <label for="tts-rate" class="sr-only">Speed</label>
        <input id="tts-rate" type="range" min="0.5" max="2.0" step="0.1" value="1.0" aria-label="Speech rate">
        <label for="tts-pitch" class="sr-only">Pitch</label>
        <input id="tts-pitch" type="range" min="0.5" max="2.0" step="0.1" value="1.0" aria-label="Speech pitch">
        <span class="tts-status" aria-live="polite">Ready</span>
      </div>
    `;

    if (tocContainer) {
      tocContainer.after(ttsWrap);
    } else {
      modalText?.parentNode?.insertBefore(ttsWrap, modalText);
    }

    const langPref = (document.documentElement.lang || 'pa-IN').split(/[-_]/)[0].toLowerCase();
    let ttsInstance = null;

    ttsToggleBtn.addEventListener('click', () => {
      const opening = !ttsWrap.classList.contains('show');
      if (opening) {
        ttsWrap.classList.add('show');
        ttsToggleBtn.classList.add('active');
        if (!ttsInstance) ttsInstance = initTTSControls(ttsWrap, modalText, langPref);
        q('.tts-play', ttsWrap)?.focus();
      } else {
        ttsWrap.classList.remove('show');
        ttsToggleBtn.classList.remove('active');
        if (ttsInstance?.stop) { try { ttsInstance.stop(); } catch {} }
        qa('.tts-highlight', modalText).forEach(s => s.classList.remove('tts-highlight'));
      }
    });

    // Show modal with smooth animation
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('open');
    modal.style.display = 'flex';

    // Scroll to top
    if (modalContent) {
      modalContent.scrollTop = 0;
      setTimeout(() => {
        if (q('.modal-body')) q('.modal-body').scrollTop = 0;
      }, 100);
    }

    lastFocusedElement = document.activeElement;
    btnClose?.focus();
    document.documentElement.classList.add('modal-open');
    modalOpen = true;
    lockPageScroll();

    const articleId = card.id || card.dataset.id;
    const newUrl = `https://www.pattibytes.com/places/#${encodeURIComponent(articleId)}`;

    try {
      history.pushState({ placeModal: articleId }, '', newUrl);
      hadPushedState = true;
    } catch {
      hadPushedState = false;
    }

    // Add enhanced key handlers
    document.addEventListener('keydown', keyHandler, true);
  }

  function keyHandler(ev) {
    if (!modal.classList.contains('open')) return;
    if (ev.key === 'Escape') closeModal();
    else if (ev.key === 'Tab') trapFocus(ev);
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
          const prevText = btn.textContent;
          btn.textContent = '✔️';
          setTimeout(() => {
            btn.classList.remove('copied');
            btn.textContent = prevText || '🔗';
          }, 2000);
        } catch {
          const notification = document.createElement('div');
          notification.className = 'copy-notification';
          notification.textContent = 'Copy manually: ' + url;
          document.body.appendChild(notification);
          setTimeout(() => notification.remove(), 3000);
        }
      });
    });
  }

  // Setup enhanced share buttons
  function setupShareButtons() {
    qa('.share-btn').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const article = btn.closest('article.place-card');
        if (!article) return;
        
        const title = article.dataset.title || article.querySelector('h3')?.textContent || document.title;
        const url = `https://www.pattibytes.com/places/#${encodeURIComponent(article.id)}`;
        const text = (article.dataset.preview || 'ਪੱਟੀ ਦੇ ਪ੍ਰਸਿੱਧ ਸਥਾਨ').slice(0, 140);

        // Create custom share modal
        createShareModal({ title, text, url });
      });
    });
  }

  // Enhanced bilingual search with dynamic translation
  function applySearch(qstr) {
    const siteLang = (document.documentElement.lang || 'pa').toLowerCase();
    const inputLang = /[\u0A00-\u0A7F]/.test(qstr.trim()) ? 'pa' : 'en';
    
    // Create search variants
    const originalQuery = norm(qstr);
    const romanQuery = norm(paToRoman(qstr));
    const punjabiQuery = norm(romanToPa(qstr));

    let shown = 0;
    let searchVariants = [originalQuery];

    // Add transliterated variants for cross-language search
    if (siteLang === 'pa' && inputLang === 'en') {
      searchVariants.push(punjabiQuery);
      // Show search suggestion
      if (qstr.trim().length > 2) {
        const suggestion = romanToPa(qstr);
        if (suggestion !== qstr) {
          showSearchSuggestion(`Searching for: "${qstr}" → "${suggestion}"`);
        }
      }
    } else if (siteLang === 'en' && inputLang === 'pa') {
      searchVariants.push(romanQuery);
    }

    index.forEach(({ el, nText, rText }) => {
      const matches = !originalQuery || 
        searchVariants.some(variant => 
          nText.includes(variant) || rText.includes(variant)
        );

      el.style.display = matches ? '' : 'none';
      if (matches) shown++;
    });

    // Update no-match message
    if (noMatchEl) {
      if (shown === 0) {
        noMatchEl.style.display = 'block';
        noMatchEl.textContent = siteLang === 'pa' ? 
          'ਕੋਈ ਮਿਲਦਾ ਸਥਾਨ ਨਹੀਂ ਮਿਲਿਆ। ਕਿਰਪਾ ਕਰਕੇ ਵੱਖਰੇ ਸ਼ਬਦ ਵਰਤੋ।' : 
          'No matching places found. Try different keywords.';
      } else {
        noMatchEl.style.display = 'none';
        hideSearchSuggestion();
      }
    }
  }

  // Show search suggestion
  function showSearchSuggestion(text) {
    hideSearchSuggestion();
    const suggestion = document.createElement('div');
    suggestion.className = 'search-suggestion';
    suggestion.textContent = text;
    searchInput.parentNode.after(suggestion);
  }

  // Hide search suggestion
  function hideSearchSuggestion() {
    qa('.search-suggestion').forEach(el => el.remove());
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
      }, 150); // Debounce search
    });

    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const first = cards.find(c => c.style.display !== 'none');
        if (first) first.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    clearSearch?.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      applySearch('');
      clearSearch.classList.remove('visible');
      hideSearchSuggestion();
      searchInput?.focus();
    });
  }

  // Handle responsive TOC behavior
  function handleResponsiveToc() {
    window.addEventListener('resize', () => {
      const tocContainers = qa('.table-of-contents');
      tocContainers.forEach(toc => {
        if (window.innerWidth > 768) {
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

  // Initialization
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

    setupSearch();
    setupCopyLinks();
    setupShareButtons();
    handleResponsiveToc();

    // Handle deep links
    function handleHashOpen() {
      const id = normalizeHash(window.location.hash || '');
      if (!id) return;
      const target = document.getElementById(id);
      if (target && target.classList.contains('place-card')) {
        openModal(cards.indexOf(target));
        setTimeout(() => {
          try { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {}
          flashHighlight(target, 'highlighted', 1600);
        }, 300);
      }
    }

    handleHashOpen();
    window.addEventListener('hashchange', handleHashOpen, false);

    // History management
    window.addEventListener('popstate', () => {
      if (modalOpen) {
        internalClose();
        hadPushedState = false;
      }
      const id = normalizeHash(window.location.hash || '');
      if (id) {
        const target = document.getElementById(id);
        if (target && target.classList.contains('place-card')) {
          openModal(cards.indexOf(target));
        }
      }
    });

    // Event bindings
    modal.addEventListener('click', ev => { 
      if (ev.target === modal) closeModal(); 
    });

    // Delegate modal close button clicks
    modal.addEventListener('click', ev => {
      if (ev.target.matches('.modal-close, #modal-close')) {
        ev.stopPropagation();
        closeModal();
      }
    });

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
  });
})();
