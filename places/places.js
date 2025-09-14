// Enhanced places.js with horizontal buttons, Google Translate integration, heading navigation, and improved UX
(function () {
  "use strict";

  // Utilities
  const q  = (s, c = document) => (c || document).querySelector(s);
  const qa = (s, c = document) => Array.from((c || document).querySelectorAll(s));

  // Normalize text: remove accents, lower case
  const norm = (s) => (s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  // Punjabi to Roman transliteration for dual keyboard search support
  const paToRoman = (txt) => (txt || '')
    .replace(/[ਅਆ]/g, 'a').replace(/[ਇਈ]/g, 'i').replace(/[ਉਊ]/g, 'u')
    .replace(/[ਏਐ]/g, 'e').replace(/[ਓਔ]/g, 'o').replace(/[ਂੰ]/g, 'n')
    .replace(/[ਕਖਗਘ]/g, 'k').replace(/[ਙ]/g, 'ng').replace(/[ਚਛਜਝ]/g, 'ch')
    .replace(/[ਞ]/g, 'nj').replace(/[ਟਠਡਢ]/g, 't').replace(/[ਣਨ]/g, 'n')
    .replace(/[ਤਥਦਧ]/g, 'd').replace(/[ਪਫਬਭ]/g, 'p').replace(/[ਮ]/g, 'm')
    .replace(/[ਯ]/g, 'y').replace(/[ਰ]/g, 'r').replace(/[ਲ]/g, 'l')
    .replace(/[ਵ]/g, 'v').replace(/[ਸਸ਼]/g, 's').replace(/[ਹ]/g, 'h');

  // Deep-link hash normalize
  function normalizeHash(h) {
    if (!h) return '';
    let s = h.replace(/^#/, '').replace(/\/+$|\/+/g, '');
    try { return decodeURIComponent(s); } catch { return s; }
  }

  // Store previous URL for proper back navigation
  let previousUrl = window.location.href;

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

  // Web Share API with fallback to clipboard copy
  async function shareLink({ title, text, url }) {
    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare({ title, text, url }))) {
        await navigator.share({ title, text, url });
        return true;
      }
    } catch (e){}
    await copyToClipboard(`${title}\n${text}\n${url}`);
    return false;
  }

  // Visual flash highlight for deep link feedback
  function flashHighlight(el, className = 'highlighted', duration = 2000) {
    if (!el) return;
    el.classList.add(className);
    setTimeout(() => el.classList.remove(className), duration);
  }

  // Google Translate Integration
  function setupGoogleTranslate() {
    // Hide Google Translate when modal is open
    function toggleTranslateVisibility(hide) {
      const translateElements = qa('.goog-te-banner-frame, .skiptranslate, #google_translate_element, .goog-te-gadget, .goog-te-combo, .goog-te-menu-frame');
      translateElements.forEach(el => {
        if (hide) {
          el.style.display = 'none';
          el.style.visibility = 'hidden';
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
        } else {
          el.style.display = '';
          el.style.visibility = '';
          el.style.opacity = '';
          el.style.pointerEvents = '';
        }
      });
    }

    // Observe modal state and hide/show translate accordingly
    const observer = new MutationObserver(() => {
      const modalOpen = document.documentElement.classList.contains('modal-open');
      toggleTranslateVisibility(modalOpen);
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    // Ensure Google Translate works on all elements except .notranslate
    document.addEventListener('DOMContentLoaded', () => {
      if (typeof google !== 'undefined' && google.translate) {
        // Force Google Translate to respect notranslate class
        qa('[class*="notranslate"]').forEach(el => {
          el.classList.add('notranslate');
          el.setAttribute('translate', 'no');
        });
      }
    });
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
      // Generate unique ID for heading
      const headingId = `heading-${index}-${heading.textContent.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')}`;
      heading.id = headingId;

      // Create TOC entry
      const tocItem = document.createElement('li');
      tocItem.className = `toc-item toc-level-${heading.tagName.toLowerCase()}`;
      
      const tocLink = document.createElement('a');
      tocLink.href = `#${headingId}`;
      tocLink.textContent = heading.textContent;
      tocLink.className = 'toc-link';
      
      tocLink.addEventListener('click', (e) => {
        e.preventDefault();
        heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Highlight the target heading briefly
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

    // Initially hide on mobile
    if (window.innerWidth <= 768) {
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
  }

  // Initialize TTS controls (keeping existing implementation)
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
    let queue = [], queuePos = 0, wordSpans = [], currentWord = 0, pauseRequested = false;

    const getLangCode = code => (code || '').split(/[-_]/)[0].toLowerCase();

    function findVoiceByValue(val) {
      if (!val || val === '__default__') return null;
      const [name, lang] = val.split('||');
      return voices.find(v => v.name === name && v.lang === lang) || null;
    }

    async function loadVoices() {
      voices = await ensureVoicesLoaded(2500);
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
      const english = voices.filter(v => getLangCode(v.lang) === 'en' && getLangCode(v.lang) !== langPref);
      const others = voices.filter(v => !preferred.includes(v) && !english.includes(v));

      select.innerHTML = '';
      addGroup('Preferred', preferred);
      addGroup('English', english);
      addGroup('Other voices', others);

      if (!select.options.length) {
        const defOpt = document.createElement('option');
        defOpt.value = '__default__';
        defOpt.textContent = 'Default';
        select.appendChild(defOpt);
      }
    }

    function prepareTextForReading() {
      qa('.tts-word-span', modalTextContainer).forEach(s => {
        if (s.parentNode) s.parentNode.replaceChild(document.createTextNode(s.textContent), s);
      });

      const nodes = Array.from(modalTextContainer.querySelectorAll('p, h1, h2, h3, h4, li')).filter(el => el.textContent.trim() !== '');
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
      queuePos = 0;
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
          try { wordSpans[i].scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {}
          currentWord = i + 1;
          return;
        }
        total += len;
      }
    }

    function speakNextChunk() {
      if (!window.speechSynthesis) { statusSpan.textContent = 'TTS unsupported'; return; }
      if (queuePos >= queue.length) { stopLocal(); return; }
      const text = queue[queuePos++];
      const utterance = new SpeechSynthesisUtterance(text);
      const selectedVoice = findVoiceByValue(select.value);
      if (selectedVoice) utterance.voice = selectedVoice;
      else utterance.lang = langPref || document.documentElement.lang || 'pa-IN';
      utterance.rate = utterRate;
      utterance.pitch = utterPitch;
      utterance.onboundary = (ev) => { if (ev.name === 'word') highlightByCharIndex(ev.charIndex); };
      utterance.onend = () => {
        const totalWords = qa('.tts-word-span', modalTextContainer).length || 1;
        const wordCount = text.split(/\s+/).length;
        currentWord = Math.min(totalWords, currentWord + wordCount);
        if (progressEl) {
          const pct = Math.round((currentWord / totalWords) * 100);
          progressEl.textContent = ` ${pct}%`;
        }
        setTimeout(() => { if (!pauseRequested) speakNextChunk(); }, 80);
      };
      window.speechSynthesis.speak(utterance);
    }

    function computeChunkIndexForWordIndex(wordIndex) {
      const readContainer = modalTextContainer.querySelector('.tts-read-container');
      if (!readContainer) return 0;
      const children = Array.from(readContainer.children);
      let cum = 0;
      for(let i = 0; i < children.length; i++) {
        const wordsCount = (children[i].textContent || '').trim().split(/\s+/).filter(Boolean).length;
        if(wordIndex <= cum + wordsCount) return i;
        cum += wordsCount;
      }
      return Math.max(0, children.length - 1);
    }

    function stopLocal() {
      if(window.speechSynthesis) window.speechSynthesis.cancel();
      qa('.tts-highlight', modalTextContainer).forEach(s => s.classList.remove('tts-highlight'));
      playBtn.textContent = '▶️ Play';
      playBtn.setAttribute('aria-pressed', 'false');
      statusSpan.textContent = 'Stopped';
      if(progressEl) progressEl.textContent = '';
    }

    function startTTS() {
      if (!window.speechSynthesis) { statusSpan.textContent = 'TTS unsupported'; return; }
      prepareTextForReading();
      if (!qa('.tts-word-span', modalTextContainer).length) { statusSpan.textContent = 'No text to read'; return; }
      buildQueue();
      currentWord = 0; queuePos = 0; pauseRequested = false;
      statusSpan.textContent = 'Speaking...';
      playBtn.textContent = '⏸️ Pause';
      playBtn.setAttribute('aria-pressed', 'true');
      speakNextChunk();
    }

    function pauseTTS() {
      if (window.speechSynthesis?.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        pauseRequested = true;
        statusSpan.textContent = 'Paused';
        playBtn.textContent = '▶️ Play';
        playBtn.setAttribute('aria-pressed', 'false');
      }
    }

    function resumeTTS() {
      if (window.speechSynthesis?.paused) {
        window.speechSynthesis.resume();
        pauseRequested = false;
        statusSpan.textContent = 'Resumed';
        playBtn.textContent = '⏸️ Pause';
        playBtn.setAttribute('aria-pressed', 'true');
      }
    }

    function restartFromCurrentWord() {
      const idx = computeChunkIndexForWordIndex(currentWord || 1);
      if (idx >= 0) {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        queuePos = idx;
        qa('.tts-highlight', modalTextContainer).forEach(s => s.classList.remove('tts-highlight'));
        setTimeout(() => speakNextChunk(), 120);
      }
    }

    playBtn.addEventListener('click', () => {
      if (window.speechSynthesis?.speaking && !window.speechSynthesis.paused) pauseTTS();
      else if (window.speechSynthesis?.paused) resumeTTS();
      else startTTS();
    });

    select.addEventListener('change', () => { if (window.speechSynthesis?.speaking) restartFromCurrentWord(); });
    rateInput.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value) || 1.02;
      if (v !== utterRate) utterRate = v;
      if (window.speechSynthesis?.speaking) restartFromCurrentWord();
    });
    pitchInput.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value) || 1.0;
      if (v !== utterPitch) utterPitch = v;
      if (window.speechSynthesis?.speaking) restartFromCurrentWord();
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

  // Trap keyboard focus inside modal
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

      // Find existing buttons
      const readBtn = content.querySelector('.read-more-btn');
      const copyBtn = content.querySelector('.copy-link');
      const shareBtn = content.querySelector('.share-btn');

      if (!readBtn && !copyBtn && !shareBtn) return;

      // Check if already arranged
      if (content.querySelector('.place-actions')) return;

      // Create actions container
      const actionsContainer = document.createElement('div');
      actionsContainer.className = 'place-actions';

      // Create button group for copy and share
      const buttonGroup = document.createElement('div');
      buttonGroup.className = 'action-buttons';

      // Move buttons to their containers
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

      // Add to content
      content.appendChild(actionsContainer);
    });
  }

  // Populate Related Articles (You May Also Like)
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
        const encoded = encodeURIComponent(id);
        try {
          history.pushState({ placeModal: id }, '', `/places/#${encoded}`);
          hadPushedState = true;
        } catch (e) { hadPushedState = false; }

        const target = document.getElementById(id);
        if (target) {
          internalClose();
          setTimeout(() => {
            try { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {}
            flashHighlight(target, 'highlighted', 1600);
            openModal(cards.indexOf(target));
          }, 280);
        }
      });
    });
  }

  // Internal modal close without history mutation
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

    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') lastFocusedElement.focus();

    document.documentElement.classList.remove('modal-open');
    modalOpen = false;
  }

  // Close modal properly with history back support
  function closeModal() {
    if (hadPushedState) {
      try { 
        // Navigate to previous URL if available, otherwise go back
        if (previousUrl && previousUrl !== window.location.href) {
          window.location.href = previousUrl;
        } else {
          history.back();
        }
      } catch { 
        internalClose(); 
        hadPushedState = false; 
        modalOpen = false; 
      }
      return;
    }
    internalClose();
    hadPushedState = false;
    try { history.replaceState(history.state, '', '/places/'); } catch {}
  }

  // Open modal at index
  function openModal(index) {
    if (!modal) return;
    if (index < 0 || index >= cards.length) return;
    
    // Store current URL as previous URL
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

    // Create table of contents
    const tocContainer = createTableOfContents(modalText);
    const mobileTocButton = createMobileTocButton(tocContainer);

    populateRelatedAll(card);

    // Clean up existing controls
    const existing = modal.querySelector('.tts-controls, .tts-toggle-btn, .mobile-toc-toggle, .table-of-contents');
    if (existing) existing.remove();

    // TTS toggle + controls
    const ttsToggleBtn = document.createElement('button');
    ttsToggleBtn.className = 'tts-toggle-btn';
    ttsToggleBtn.innerHTML = '🔊';
    ttsToggleBtn.title = 'Toggle Text-to-Speech';
    ttsToggleBtn.type = 'button';

    btnClose?.after(ttsToggleBtn);

    // Add TOC button for mobile
    if (mobileTocButton) {
      ttsToggleBtn.after(mobileTocButton);
    }

    // Add TOC container
    if (tocContainer) {
      modalText?.parentNode?.insertBefore(tocContainer, modalText);
    }

    const ttsWrap = document.createElement('div');
    ttsWrap.className = 'tts-controls';
    ttsWrap.innerHTML = `
      <div class="tts-controls-row" style="display:flex;gap:.5rem;align-items:center;">
        <button class="tts-play" aria-pressed="false" title="Play/Pause">▶️ Play</button>
        <div class="tts-progress" aria-hidden="true" style="margin-left:0.5rem;"></div>
      </div>
      <div class="tts-controls-row" style="margin-top:.5rem;display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;">
        <label for="tts-voices" class="sr-only">Voice</label>
        <select id="tts-voices" aria-label="Choose voice"></select>
        <label for="tts-rate" class="sr-only">Rate</label>
        <input id="tts-rate" type="range" min="0.5" max="2.0" step="0.05" value="1.02" aria-label="Speech rate" style="width:120px;">
        <label for="tts-pitch" class="sr-only">Pitch</label>
        <input id="tts-pitch" type="range" min="0.5" max="2.0" step="0.05" value="1.0" aria-label="Speech pitch" style="width:120px;">
        <span class="tts-status" aria-live="polite" style="margin-left:.5rem;"></span>
      </div>
    `;

    modalText?.parentNode?.insertBefore(ttsWrap, modalText.nextSibling);

    const langPref = (document.documentElement.lang || 'pa-IN').split(/[-_]/)[0].toLowerCase();
    let ttsInstance = null;

    ttsToggleBtn.addEventListener('click', () => {
      const opening = !ttsWrap.classList.contains('show');
      if (opening) {
        ttsWrap.classList.add('show');
        ttsToggleBtn.classList.add('active');
        if (!ttsInstance) ttsInstance = initTTSControls(ttsWrap, modalText, langPref);
        q('.tts-play', ttsWrap)?.focus();
        try { ttsWrap.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch {}
      } else {
        ttsWrap.classList.remove('show');
        ttsToggleBtn.classList.remove('active');
        if (ttsInstance?.stop) { try { ttsInstance.stop(); } catch {} }
        qa('.tts-highlight', modalText).forEach(s => s.classList.remove('tts-highlight'));
      }
    });

    // Show modal
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('open');
    modal.style.display = 'flex';

    if (modalContent) {
      modalContent.style.overflow = 'auto';
      modalContent.style.webkitOverflowScrolling = 'touch';
      modalContent.scrollTop = 0;
      modalContent.classList.add('highlighted');
      setTimeout(() => modalContent.classList.remove('highlighted'), 1200);
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

    // Add key handlers
    document.addEventListener('keydown', keyHandler, true);
  }

  function keyHandler(ev) {
    if (!modal.classList.contains('open')) return;
    if (ev.key === 'Escape') closeModal();
    else if (ev.key === 'Tab') trapFocus(ev);
  }

  // Setup copy-link buttons functionality
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
          alert('Copy failed — please copy manually: ' + url);
        }
      });
    });
  }

  // Setup share buttons functionality
  function setupShareButtons() {
    qa('.share-btn').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const a = btn.closest('article.place-card');
        if (!a) return;
        const title = a.dataset.title || a.querySelector('h3')?.textContent || document.title;
        const url = `https://www.pattibytes.com/places/#${encodeURIComponent(a.id)}`;
        const text = (a.dataset.preview || 'ਪੱਟੀ ਦੇ ਪ੍ਰਸਿੱਧ ਸਥਾਨ').slice(0, 140);

        const ok = await shareLink({ title, text, url });
        if (!ok) {
          btn.classList.add('copied');
          const prevText = btn.textContent;
          btn.textContent = '✔️';
          setTimeout(() => {
            btn.classList.remove('copied');
            btn.textContent = prevText || '📤';
          }, 1500);
        }
      });
    });
  }

  // Enhanced bilingual search working with Jekyll data attributes
  function applySearch(qstr) {
    const siteLang = (document.documentElement.lang || 'pa').toLowerCase();
    const inputLang = /[\u0A00-\u0A7F]/.test(qstr.trim()) ? 'pa' : 'en';

    const normalizedQuery = norm(qstr);
    const romanQuery = norm(paToRoman(qstr));

    let shown = 0;
    index.forEach(({ el, nText, rText }) => {
      // Enhanced search logic for both title and preview from Jekyll data
      const matches = (!normalizedQuery && !romanQuery) ||
        (siteLang === inputLang ? nText.includes(normalizedQuery) :
        siteLang === 'pa' ? rText.includes(romanQuery) : nText.includes(normalizedQuery)) ||
        // Also search in full content if available
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
        noMatchEl.textContent = siteLang === 'pa' ? 'ਕੋਈ ਮਿਲਦਾ ਸਥਾਨ ਨਹੀਂ ਮਿਲਿਆ।' : 'No matching places found.';
      } else {
        noMatchEl.style.display = 'none';
      }
    }
  }

  // Set up search input event handlers
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
        if (first) first.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    clearSearch?.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      applySearch('');
      clearSearch.classList.remove('visible');
      searchInput?.focus();
    });
  }

  // Handle responsive TOC behavior
  function handleResponsiveToc() {
    window.addEventListener('resize', () => {
      const tocContainers = qa('.table-of-contents');
      const tocButtons = qa('.mobile-toc-toggle');
      
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

  // Initialization on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    modal = q('#places-modal');
    if (!modal) return; // Stop script if no modal found

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

    // Build enhanced search index from Jekyll data attributes
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
    setupGoogleTranslate();
    handleResponsiveToc();

    // On page load, open modal if deep link hash present
    function handleHashOpen() {
      const id = normalizeHash(window.location.hash || '');
      if (!id) return;
      const target = document.getElementById(id);
      if (target && target.classList.contains('place-card')) {
        openModal(cards.indexOf(target));
        try { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {}
        flashHighlight(target, 'highlighted', 1600);
      }
    }

    handleHashOpen();
    window.addEventListener('hashchange', handleHashOpen, false);

    // History back/forward management
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

    // Keyboard and mouse event bindings
    btnClose?.addEventListener('click', ev => { ev.stopPropagation(); closeModal(); });
    modal.addEventListener('click', ev => { if (ev.target === modal) closeModal(); });
    
    cards.forEach((card, idx) => {
      const readBtn = card.querySelector('.read-more-btn');
      if (readBtn) {
        readBtn.addEventListener('click', ev => { ev.stopPropagation(); openModal(idx); });
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
