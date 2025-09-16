(function () {
  "use strict";

  // Utilities
  const q = (s, c = document) => (c || document).querySelector(s);
  const qa = (s, c = document) => Array.from((c || document).querySelectorAll(s));

  // Normalize text: remove accents, lower case
  const norm = (s) => (s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  // Punjabi to Roman transliteration
  const paToRoman = (txt) => (txt || '')
    .replace(/[ਅਆ]/g, 'a').replace(/[ਇਈ]/g, 'i').replace(/[ਉਊ]/g, 'u')
    .replace(/[ਏਐ]/g, 'e').replace(/[ਓਔ]/g, 'o').replace(/[ਂੰ]/g, 'n')
    .replace(/[ਕਖਗਘ]/g, 'k').replace(/[ਙ]/g, 'ng').replace(/[ਚਛਜਝ]/g, 'ch')
    .replace(/[ਞ]/g, 'nj').replace(/[ਟਠਡਢ]/g, 't').replace(/[ਣਨ]/g, 'n')
    .replace(/[ਤਥਦਧ]/g, 'd').replace(/[ਪਫਬਭ]/g, 'p').replace(/[ਮ]/g, 'm')
    .replace(/[ਯ]/g, 'y').replace(/[ਰ]/g, 'r').replace(/[ਲ]/g, 'l')
    .replace(/[ਵ]/g, 'v').replace(/[ਸਸ਼]/g, 's').replace(/[ਹ]/g, 'h');

  // English to Punjabi mapping for search enhancement
  const enToPunjabi = {
    'gurdwara': 'ਗੁਰਦੁਆਰਾ', 'gurudwara': 'ਗੁਰਦੁਆਰਾ', 'temple': 'ਮੰਦਿਰ',
    'school': 'ਸਕੂਲ', 'college': 'ਕਾਲਜ', 'university': 'ਯੂਨੀਵਰਸਿਟੀ',
    'hospital': 'ਹਸਪਤਾਲ', 'market': 'ਮਾਰਕੀਟ', 'bazaar': 'ਬਜ਼ਾਰ',
    'park': 'ਪਾਰਕ', 'garden': 'ਬਗੀਚਾ', 'river': 'ਨਦੀ', 'canal': 'ਨਹਿਰ',
    'village': 'ਪਿੰਡ', 'city': 'ਸ਼ਹਿਰ', 'town': 'ਕਸਬਾ',
    'place': 'ਸਥਾਨ', 'location': 'ਜਗ੍ਹਾ', 'famous': 'ਮਸ਼ਹੂਰ', 'popular': 'ਪ੍ਰਸਿੱਧ',
    'history': 'ਇਤਿਹਾਸ', 'heritage': 'ਵਿਰਾਸਤ', 'culture': 'ਸੱਭਿਆਚਾਰ'
  };

  // Modal and UI state
  let modal, modalMedia, modalText, modalControlsFixed;
  let cards = [];
  let searchInput, clearSearch, noMatchEl;
  let index = [];
  let modalOpen = false;
  let lastFocusedElement = null;

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

  // Show notification
  function showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10003;
      background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.15);
      animation: slideInRight 0.3s ease-out;
      max-width: 400px;
      font-weight: 600;
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease-in forwards';
      setTimeout(() => notification.remove(), 300);
    }, duration);
  }

  // Lock and unlock page scroll while modal open
  function lockPageScroll() {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  }
  function unlockPageScroll() {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }

  // Create top modal control bar (inside modal, top aligned)
  function createModalControls(card) {
    if (modalControlsFixed) {
      modalControlsFixed.remove();
    }
    modalControlsFixed = document.createElement('div');
    modalControlsFixed.className = 'modal-controls-fixed';
    modalControlsFixed.style.cssText = `
      position: sticky;
      top: 0;
      background: var(--glass-bg, rgba(255,255,255,0.9));
      backdrop-filter: var(--blur-glass, blur(10px));
      padding: 1rem 2rem;
      border-bottom: 1px solid rgba(0,0,0,0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 1000;
      gap: 1rem;
      flex-wrap: nowrap;
    `;

    // Title
    const title = document.createElement('h2');
    title.className = 'modal-controls-title';
    title.textContent = card.dataset.title || card.querySelector('h3')?.textContent || '';
    title.style.flex = '1 1 auto';
    title.style.margin = '0';
    title.style.whiteSpace = 'nowrap';
    title.style.overflow = 'hidden';
    title.style.textOverflow = 'ellipsis';
    modalControlsFixed.appendChild(title);

    // Buttons container
    const btnGroup = document.createElement('div');
    btnGroup.style.display = 'flex';
    btnGroup.style.gap = '0.5rem';
    btnGroup.style.flexShrink = '0';

    // Share button
    const shareBtn = document.createElement('button');
    shareBtn.className = 'modal-control-btn modal-share-btn';
    shareBtn.innerHTML = '📤';
    shareBtn.title = 'Share Article';
    shareBtn.setAttribute('aria-label', 'Share this article');
    shareBtn.style.width = '40px';
    shareBtn.style.height = '40px';
    shareBtn.style.fontSize = '1.3rem';
    shareBtn.style.borderRadius = '8px';
    shareBtn.style.border = 'none';
    shareBtn.style.cursor = 'pointer';
    btnGroup.appendChild(shareBtn);

    // Sound (text-to-speech) toggle button
    const ttsBtn = document.createElement('button');
    ttsBtn.className = 'modal-control-btn modal-tts-btn';
    ttsBtn.innerHTML = '🔊';
    ttsBtn.title = 'Toggle Text-to-Speech';
    ttsBtn.setAttribute('aria-label', 'Toggle Text-to-Speech');
    ttsBtn.style.width = '40px';
    ttsBtn.style.height = '40px';
    ttsBtn.style.fontSize = '1.3rem';
    ttsBtn.style.borderRadius = '8px';
    ttsBtn.style.border = 'none';
    ttsBtn.style.cursor = 'pointer';
    btnGroup.appendChild(ttsBtn);

    // Copy article link button
    const copyLinkBtn = document.createElement('button');
    copyLinkBtn.className = 'modal-control-btn modal-copy-link-btn';
    copyLinkBtn.innerHTML = '🔗';
    copyLinkBtn.title = 'Copy Article Link';
    copyLinkBtn.setAttribute('aria-label', 'Copy Article Link');
    copyLinkBtn.style.width = '40px';
    copyLinkBtn.style.height = '40px';
    copyLinkBtn.style.fontSize = '1.3rem';
    copyLinkBtn.style.borderRadius = '8px';
    copyLinkBtn.style.border = 'none';
    copyLinkBtn.style.cursor = 'pointer';
    btnGroup.appendChild(copyLinkBtn);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-control-btn modal-close-btn';
    closeBtn.innerHTML = '✕';
    closeBtn.title = 'Close';
    closeBtn.setAttribute('aria-label', 'Close modal');
    closeBtn.style.width = '40px';
    closeBtn.style.height = '40px';
    closeBtn.style.fontSize = '1.3rem';
    closeBtn.style.borderRadius = '8px';
    closeBtn.style.border = 'none';
    closeBtn.style.cursor = 'pointer';
    btnGroup.appendChild(closeBtn);

    modalControlsFixed.appendChild(btnGroup);
    modal.prepend(modalControlsFixed);

    // Event listeners for buttons

    // Share - open custom share modal
    shareBtn.addEventListener('click', () => {
      const title = card.dataset.title || card.querySelector('h3')?.textContent || document.title;
      const url = window.location.href;
      const text = (card.dataset.preview || 'ਪੱਟੀ ਦੇ ਪ੍ਰਸਿੱਧ ਸਥਾਨ').slice(0, 140);
      showCustomShareModal({ title, text, url, image: card.dataset.image || '' });
    });

    // Text-to-Speech toggle: basic implementation
    let ttsActive = false;
    let utterance = null;
    ttsBtn.addEventListener('click', () => {
      if (!('speechSynthesis' in window)) {
        showNotification('Speech synthesis not supported on this browser', 'error');
        return;
      }
      if (ttsActive) {
        window.speechSynthesis.cancel();
        ttsActive = false;
        ttsBtn.style.backgroundColor = '';
      } else {
        if (utterance) window.speechSynthesis.cancel();
        const textContent = modalText.textContent.trim();
        if (!textContent) {
          showNotification('No content to read', 'error');
          return;
        }
        utterance = new SpeechSynthesisUtterance(textContent);
        utterance.lang = 'pa-IN'; // Punjabi language code
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
        ttsActive = true;
        ttsBtn.style.backgroundColor = '#a2d2ff';
        utterance.onend = () => {
          ttsActive = false;
          ttsBtn.style.backgroundColor = '';
        };
      }
    });

    // Copy article link button
    copyLinkBtn.addEventListener('click', async () => {
      try {
        await copyToClipboard(window.location.href);
        showNotification('Article link copied!', 'success');
      } catch {
        showNotification('Failed to copy link', 'error');
      }
    });

    // Close button closes modal
    closeBtn.addEventListener('click', closeModal);
  }

  // Custom share modal (simplified version)
  function showCustomShareModal({ title, text, url, image }) {
    const existing = q('.custom-share-modal');
    if (existing) existing.remove();

    const modalDiv = document.createElement('div');
    modalDiv.className = 'custom-share-modal';
    modalDiv.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0,0,0,0.75);
      backdrop-filter: blur(8px);
      z-index: 15000;
      display: flex; align-items: center; justify-content: center;
      opacity: 0; visibility: hidden;
      transition: opacity 0.3s ease;
    `;

    modalDiv.innerHTML = `
      <div style="
        background: white;
        border-radius: 10px;
        padding: 1.5rem;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        text-align: center;
        position: relative;
      ">
        <h3 style="margin-top: 0; font-weight: 700; color: #333;">ਸਾਂਝਾ ਕਰੋ / Share</h3>
        ${image ? `<img src="${image}" alt="${title}" style="max-width: 100%; border-radius: 8px; margin-bottom: 0.5rem;"/>` : ''}
        <p style="font-size: 0.95rem; color: #555; margin-bottom: 1rem;">${text}</p>
        <input type="text" readonly value="${url}" style="
          width: 100%; padding: 0.5rem; font-size: 0.95rem; user-select: all; border: 1px solid #ccc;
          border-radius: 5px; margin-bottom: 1rem;
        "/>
        <button id="copyShareLinkBtn" style="
          background: #3b82f6; color: white; border: none; border-radius: 5px; padding: 0.5rem 1rem; cursor: pointer; font-weight: 600;
        ">ਲਿੰਕ ਕਾਪੀ ਕਰੋ / Copy Link</button>
        <button id="closeShareModalBtn" style="
          position: absolute; top: 10px; right: 10px; background: none; border: none; font-size: 1.5rem; cursor: pointer;
        " aria-label="Close share modal">&times;</button>
      </div>
    `;

    document.body.appendChild(modalDiv);
    // Show transition
    setTimeout(() => {
      modalDiv.style.opacity = '1';
      modalDiv.style.visibility = 'visible';
    }, 10);

    const input = modalDiv.querySelector('input');
    const copyBtn = modalDiv.querySelector('#copyShareLinkBtn');
    const closeBtn = modalDiv.querySelector('#closeShareModalBtn');

    copyBtn.addEventListener('click', async () => {
      try {
        await copyToClipboard(input.value);
        showNotification('Share link copied!', 'success');
      } catch {
        showNotification('Failed to copy share link', 'error');
      }
    });

    closeBtn.addEventListener('click', () => {
      modalDiv.style.opacity = '0';
      modalDiv.style.visibility = 'hidden';
      setTimeout(() => modalDiv.remove(), 300);
    });

    modalDiv.addEventListener('click', (e) => {
      if (e.target === modalDiv) {
        closeBtn.click();
      }
    });
  }

  // Open modal for place card at given index
  function openModal(index) {
    if (!modal || index < 0 || index >= cards.length) return;
    const card = cards[index];
    if (!card) return;

    lastFocusedElement = document.activeElement;

    // Fill modal content
    const imgSrc = card.dataset.image || '';
    const fullHtml = card.dataset.full || card.dataset.preview || '';
    modalMedia.innerHTML = imgSrc ? `<img src="${imgSrc}" alt="${card.dataset.title || ''}" loading="lazy" style="max-width: 100%;">` : '';
    modalText.innerHTML = fullHtml;

    // Show modal
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    modalOpen = true;
    lockPageScroll();

    createModalControls(card);

    // Scroll modal content to top
    if (modalText.parentElement) modalText.parentElement.scrollTop = 0;

    // Update URL hash to reflect open article
    const articleId = card.id || card.dataset.id;
    if (articleId) {
      try {
        history.pushState({ placeModal: articleId }, '', `#${encodeURIComponent(articleId)}`);
      } catch {}
    }

    // Focus close button for accessibility
    modalControlsFixed.querySelector('.modal-close-btn')?.focus();

    // Add keyboard event for escape and tab trap
    document.addEventListener('keydown', keyDownHandler, true);
  }

  // Close modal
  function closeModal() {
    if (!modalOpen) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    modalOpen = false;
    unlockPageScroll();

    // Cancel any speech synthesis
    if (window.speechSynthesis?.speaking) {
      window.speechSynthesis.cancel();
    }

    // Remove modal controls bar
    if (modalControlsFixed) {
      modalControlsFixed.remove();
      modalControlsFixed = null;
    }

    // Restore focus
    if (lastFocusedElement?.focus) {
      lastFocusedElement.focus();
    }

    // Clear URL hash if it was set by modal
    try {
      if (history.state?.placeModal) {
        history.pushState({}, '', window.location.pathname + window.location.search);
      }
    } catch {}

    document.removeEventListener('keydown', keyDownHandler, true);
  }

  // Trap tab navigation and close on Escape
  function keyDownHandler(e) {
    if (!modalOpen) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
    } else if (e.key === 'Tab') {
      const focusable = qa('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', modalControlsFixed)
        .filter(el => el.offsetParent !== null);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  }

  // Setup search input handler with auto-translation and filtering
  function applySearch(query) {
    if (!index.length) return;
    const siteLang = (document.documentElement.lang || 'pa').toLowerCase();
    const inputLang = /[\u0A00-\u0A7F]/.test(query.trim()) ? 'pa' : 'en';
    let searchQuery = query.trim();

    // If site is Punjabi and user types English, inject Punjabi keywords for better matching
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
        (el.dataset.full &&
          (norm(el.dataset.full).includes(normalizedQuery) ||
            norm(paToRoman(el.dataset.full)).includes(romanQuery))
        );
      el.style.display = matches ? '' : 'none';
      if (matches) shown++;
    });

    if (noMatchEl) {
      if (shown === 0) {
        noMatchEl.style.display = 'block';
        noMatchEl.innerHTML = siteLang === 'pa' ?
          'ਕੋਈ ਮਿਲਦਾ ਸਥਾਨ ਨਹੀਂ ਮਿਲਿਆ।<br><small>ਚੋਣਾਂ ਲਈ ਉਦਾਹਰਣ: gurdwara, temple, school, market</small>' :
          'No matching places found.<br><small>Try Punjabi terms or different keywords</small>';
      } else {
        noMatchEl.style.display = 'none';
      }
    }
  }

  function setupSearch() {
    if (!searchInput) return;

    let searchTimeout;
    searchInput.addEventListener('input', e => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        applySearch(e.target.value || '');
        if (clearSearch) clearSearch.classList.toggle('visible', !!(e.target.value || '').trim());
      }, 300);
    });

    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        // Open first visible card
        const firstCard = cards.find(c => c.style.display !== 'none');
        if (firstCard) {
          firstCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });

    if (clearSearch) {
      clearSearch.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        applySearch('');
        clearSearch.classList.remove('visible');
        searchInput.focus();
      });
    }
  }

  // Build search index from cards
  function buildSearchIndex() {
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
  }

  // Initialization
  document.addEventListener('DOMContentLoaded', () => {
    modal = q('#places-modal');
    if (!modal) {
      console.warn('Places modal not found');
      return;
    }
    modalMedia = q('#modal-media', modal);
    modalText = q('#modal-text', modal);

    cards = Array.from(document.querySelectorAll('.place-card'));
    if (!cards.length) {
      console.warn('No place cards found');
      return;
    }

    searchInput = q('#places-search');
    clearSearch = q('#clear-search');
    noMatchEl = q('#no-match');

    buildSearchIndex();
    setupSearch();

    // Open modal on card click or keyboard enter
    cards.forEach((card, idx) => {
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'article');

      card.addEventListener('click', () => {
        openModal(idx);
      });

      card.addEventListener('keydown', (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && document.activeElement === card) {
          e.preventDefault();
          openModal(idx);
        }
      });

      // Hover effect
      card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-4px) scale(1.01)';
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });

    // Open modal if URL hash matches
    const hash = window.location.hash.replace(/^#/, '');
    if (hash) {
      const target = document.getElementById(hash);
      if (target && target.classList.contains('place-card')) {
        const idx = cards.indexOf(target);
        if (idx !== -1) openModal(idx);
      }
    }

    // Listen for hash changes to open modal
    window.addEventListener('hashchange', () => {
      if (!modalOpen) {
        const id = window.location.hash.replace(/^#/, '');
        const target = document.getElementById(id);
        if (target && target.classList.contains('place-card')) {
          const index = cards.indexOf(target);
          if (index !== -1) openModal(index);
        }
      }
    });

    // On popstate (back button) close modal
    window.addEventListener('popstate', () => {
      if (modalOpen) closeModal();
    });
  });

  // CSS Animations (inject)
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideInRight {
      from {transform: translateX(100%); opacity: 0;}
      to {transform: translateX(0); opacity: 1;}
    }
    @keyframes slideOutRight {
      from {transform: translateX(0); opacity: 1;}
      to {transform: translateX(100%); opacity: 0;}
    }
    .modal-control-btn:hover {
      filter: brightness(1.2);
    }
    .notification {
      font-family: system-ui, sans-serif;
    }
  `;
  document.head.appendChild(style);

  console.log('Updated places modal and search JS initialized.');
})();
