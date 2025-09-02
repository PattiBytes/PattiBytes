/* news.js — PattiBytes
    Features:
    - copy-link (existing)
    - populate read-time and relative date on cards
    - pagination / infinite scroll (IntersectionObserver)
    - accessible modal for full article (with related articles)
    - image modal (existing)
    - TTS (Web Speech API) for modal content (play/pause/stop + voice select)
*/

document.addEventListener("DOMContentLoaded", () => {
  /* ---------- Utilities ---------- */
  const q = (sel, ctx=document) => ctx.querySelector(sel);
  const qa = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));
  const stripHtml = (html) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    return tmp.textContent || tmp.innerText || '';
  };
  const wordCount = (text) => (text || '').trim().split(/\s+/).filter(Boolean).length;
  const readMinutes = (words, wpm = 200) => Math.max(1, Math.round(words / wpm));

  function timeAgo(isoDate) {
    if (!isoDate) return '';
    const then = new Date(isoDate);
    if (isNaN(then)) return '';
    const now = new Date();
    const sec = Math.floor((now - then) / 1000);
    if (sec < 60) return `${sec} sec ਪਹਿਲਾਂ`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} ਮਿੰਟ ਪਹਿਲਾਂ`;
    const hr = Math.floor(min / 24);
    if (hr < 24) return `${hr} ਘੰਟੇ ਪਹਿਲਾਂ`;
    const days = Math.floor(hr / 24);
    if (days < 7) return `${days} ਦਿਨ ਪਹਿਲਾਂ`;
    // fallback to formatted date with full month name
    return then.toLocaleDateString('pa-IN', { year: 'numeric', month:'long', day:'numeric' });
  }

  function decodeHtmlEntities(str) {
    // some dataset values might be HTML-encoded; decode safely
    const ta = document.createElement('textarea');
    ta.innerHTML = str || '';
    return ta.value;
  }

  /* ---------- Elements ---------- */
  const allCards = qa('.news-card');
  const newsGrid = q('.news-grid');
  const newsModal = q('#news-modal');
  const modalTitle = q('#modal-title');
  const modalMedia = q('#modal-media');
  const modalText = q('#modal-text');
  const modalCloseBtn = q('#modal-close');
  const imageModal = q('#image-modal');
  const imageModalClose = q('#image-modal-close');
  const modalImage = q('#modal-image');

  /* ---------- 1) Copy link (keeps your behavior) ---------- */
  qa('.copy-link').forEach((btn) => {
    btn.addEventListener('click', async (ev) => {
      const article = btn.closest('article.news-card');
      if (!article || !article.id) return;
      const url = `${window.location.origin}${window.location.pathname}#${article.id}`;
      try {
        await navigator.clipboard.writeText(url);
      } catch (err) {
        const ta = document.createElement('textarea');
        ta.value = url; document.body.appendChild(ta);
        ta.select(); document.execCommand('copy');
        document.body.removeChild(ta);
      }
      btn.classList.add('copied');
      const prev = btn.textContent;
      btn.textContent = '✔️';
      setTimeout(()=> { btn.classList.remove('copied'); btn.textContent = prev; }, 1500);
    });
  });

  /* ---------- 2) populate card meta: read-time and relative date ---------- */
  allCards.forEach(card => {
    // read time from preview (best-effort)
    const preview = card.dataset.preview || '';
    const words = wordCount(preview);
    const minutes = readMinutes(words);
    const readTimeEl = card.querySelector('.read-time');
    if (readTimeEl) readTimeEl.textContent = `${minutes} ਮਿੰਟ ਪੜ੍ਹਨ ਲਈ`;

    // published date (relative)
    const dateISO = card.dataset.date;
    const publishedEl = card.querySelector('.published');
    if (publishedEl && dateISO) {
      publishedEl.setAttribute('datetime', dateISO);
      publishedEl.title = new Date(dateISO).toLocaleString('pa-IN', { year: 'numeric', month: 'long', day: 'numeric' });
      // show relative if space below title
      const rel = timeAgo(dateISO);
      // append relative to meta
      const relSpan = document.createElement('span');
      relSpan.className = 'published-relative';
      relSpan.textContent = ` (${rel})`;
      publishedEl.parentNode.insertBefore(relSpan, publishedEl.nextSibling);
    }
  });

  /* ---------- 3) Pagination / Infinite scroll ---------- */
  const PAGE_SIZE = 6;
  let pageIndex = 0;
  const totalCards = allCards.length;

  // hide all then show slice
  allCards.forEach(c => c.style.display = 'none');

  function showNextPage() {
    const start = pageIndex * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const slice = allCards.slice(start, end);
    slice.forEach(c => c.style.display = '');
    pageIndex++;
    // if all shown, remove sentinel
    if (pageIndex * PAGE_SIZE >= totalCards && sentinel) {
      observer.unobserve(sentinel);
      sentinel.remove();
    }
  }

  // initial page
  showNextPage();

  // sentinel element
  const sentinel = document.createElement('div');
  sentinel.className = 'scroll-sentinel';
  sentinel.style.height = '2px';
  newsGrid.after(sentinel);

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        showNextPage();
      }
    });
  }, { root: null, rootMargin: '200px', threshold: 0.01 });

  observer.observe(sentinel);

  /* ---------- 4) Modal open / close (article full text) ---------- */
  // helper to trap focus minimally
  let lastFocusBeforeModal = null;
  function openNewsModal(card) {
    if (!card) return;
    lastFocusBeforeModal = document.activeElement;

    const title = card.dataset.title || '';
    const author = card.dataset.author || '';
    const dateISO = card.dataset.date || '';
    const image = card.dataset.image || '';
    const rawContent = card.dataset.content || ''; // may be escaped
    const contentHtml = decodeHtmlEntities(rawContent);
    // populate modal
    modalTitle.textContent = title;
    modalMedia.innerHTML = '';
    if (image) {
      const img = document.createElement('img');
      img.src = image; img.alt = title;
      img.loading = 'lazy';
      img.style.maxWidth = '100%';
      img.style.borderRadius = '8px';
      modalMedia.appendChild(img);
    }
    // insert content
    modalText.innerHTML = contentHtml;

    // meta: add author & date & read-time
    const metaWrap = modalText.querySelector('.modal-meta') || document.createElement('div');
    metaWrap.className = 'modal-meta';
    metaWrap.innerHTML = `<p style="margin:0 0 .5rem 0;"><strong>${author}</strong> · ${new Date(dateISO).toLocaleString('pa-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>`;
    modalText.prepend(metaWrap);

    // related articles
    populateRelated(card);

    // add TTS controls area (if not present) and the toggle button
    if (!modalText.parentNode.querySelector('.tts-controls')) {
      const ttsToggleBtn = document.createElement('button');
      ttsToggleBtn.className = 'tts-toggle-btn';
      ttsToggleBtn.innerHTML = '🔊';
      ttsToggleBtn.title = 'Toggle Text-to-Speech Controls';
      ttsToggleBtn.type = 'button';
      modalCloseBtn.after(ttsToggleBtn);

      const ttsWrap = document.createElement('div');
      ttsWrap.className = 'tts-controls';
      ttsWrap.innerHTML = `
        <div class="tts-controls-row">
            <button class="tts-play" aria-pressed="false" title="Play article">▶️ Play</button>
            <button class="tts-pause" title="Pause">⏸️</button>
            <button class="tts-stop" title="⏹️"></button>
        </div>
        <div class="tts-controls-row">
            <label for="tts-voices" class="sr-only">Voice</label>
            <select id="tts-voices" aria-label="Choose voice"></select>
            <span class="tts-status" aria-live="polite"></span>
        </div>
      `;
      modalText.parentNode.insertBefore(ttsWrap, modalText.nextSibling);

      // add click listener for the new toggle button
      ttsToggleBtn.addEventListener('click', () => {
        ttsWrap.classList.toggle('show');
      });
      initTTSControls(ttsWrap, modalText);
    }

    // show modal
    newsModal.setAttribute('aria-hidden','false');
    newsModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // focus management
    modalCloseBtn.focus();
    document.addEventListener('keydown', modalKeyHandler);
  }

  function closeNewsModal() {
    newsModal.setAttribute('aria-hidden','true');
    newsModal.style.display = 'none';
    document.body.style.overflow = '';
    document.removeEventListener('keydown', modalKeyHandler);
    // stop any TTS
    stopTTS();
    if (lastFocusBeforeModal) lastFocusBeforeModal.focus();
    // remove highlight
    qa('.tts-highlight').forEach(s => {
      const parent = s.parentNode;
      parent.replaceChild(document.createTextNode(s.textContent), s);
      parent.normalize();
    });
  }

  function modalKeyHandler(e) {
    if (e.key === 'Escape') closeNewsModal();
    if (e.key === 'Tab') {
      // minimal focus trap: keep focus inside modal close button and next tabbables
      const focusables = qa('#news-modal button, #news-modal a, #news-modal [tabindex]:not([tabindex="-1"])');
      if (focusables.length === 0) return;
      const first = focusables[0], last = focusables[focusables.length -1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
  }

  // open modal on read-more click
  qa('.read-more-btn').forEach(btn => {
    btn.addEventListener('click', (ev) => {
      const card = btn.closest('article.news-card');
      openNewsModal(card);
    });
  });

  // close modal
  modalCloseBtn.addEventListener('click', closeNewsModal);
  newsModal.addEventListener('click', (e) => {
    if (e.target === newsModal) closeNewsModal();
  });

  /* ---------- 5) Image modal (open when enlarge clicked) ---------- */
  qa('.enlarge-btn').forEach(b => {
    b.addEventListener('click', (ev) => {
      const card = b.closest('article.news-card');
      const imgSrc = card.dataset.image;
      if (!imgSrc) return;
      modalImage.src = imgSrc;
      modalImage.alt = card.dataset.title || '';
      imageModal.setAttribute('aria-hidden','false');
      imageModal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      imageModalClose.focus();
    });
  });

  imageModalClose.addEventListener('click', () => {
    imageModal.setAttribute('aria-hidden','true');
    imageModal.style.display = 'none';
    modalImage.src = '';
    document.body.style.overflow = '';
  });
  imageModal.addEventListener('click', (e) => {
    if (e.target === imageModal) {
      imageModal.setAttribute('aria-hidden','true');
      imageModal.style.display = 'none';
      modalImage.src = '';
      document.body.style.overflow = '';
    }
  });

  /* ---------- 6) Related articles (simple tag-based + title overlap) ---------- */
  function populateRelated(activeCard) {
    // remove old related
    const existing = modalText.parentNode.querySelector('.modal-related');
    if (existing) existing.remove();

    const tags = (activeCard.dataset.tags || '').split(/\s+/).filter(Boolean);
    const titleWords = (activeCard.dataset.title || '').toLowerCase().split(/\W+/).filter(Boolean);

    const scores = [];
    allCards.forEach(c => {
      if (c === activeCard) return;
      // only consider visible cards (we may hide due to pagination) — still allow
      let score = 0;
      const otherTags = (c.dataset.tags||'').split(/\s+/).filter(Boolean);
      const tagOverlap = otherTags.filter(t => tags.includes(t)).length;
      score += tagOverlap * 10;
      // title overlap
      const otherTitleWords = (c.dataset.title||'').toLowerCase().split(/\W+/).filter(Boolean);
      const titleOverlap = otherTitleWords.filter(w => titleWords.includes(w)).length;
      score += titleOverlap * 3;
      // small boost for featured
      if (c.classList.contains('featured-card')) score += 2;
      if (score > 0) scores.push({ card: c, score });
    });

    scores.sort((a,b)=> b.score - a.score);
    const top = scores.slice(0,4).map(s => s.card);
    if (top.length === 0) return; // nothing related

    const wrap = document.createElement('div');
    wrap.className = 'modal-related';
    wrap.innerHTML = `<h4>ਤੁਹਾਨੂੰ ਇਹ ਵੀ ਪਸੰਦ ਆ ਸਕਦਾ ਹੈ</h4>`;
    const list = document.createElement('div');
    list.className = 'related-list';

    top.forEach(c => {
      const thumb = c.dataset.image || '';
      const cardTitle = c.dataset.title || '';
      const preview = c.dataset.preview || '';
      const rel = document.createElement('div');
      rel.className = 'related-card';
      rel.innerHTML = `
        ${thumb ? `<img src="${thumb}" alt="${cardTitle}" loading="lazy"/>` : ''}
        <div class="related-info">
          <div class="related-title">${cardTitle}</div>
          <div class="related-meta">${preview.slice(0,80)}…</div>
          <div style="margin-top:.5rem"><button class="related-open" data-id="${c.id}">ਖੋਲੋ</button></div>
        </div>
      `;
      list.appendChild(rel);
    });

    wrap.appendChild(list);
    modalText.parentNode.appendChild(wrap);

    // attach clicks
    qa('.related-open', wrap).forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = btn.dataset.id;
        const target = document.getElementById(id);
        if (target) {
          // either open target in modal or scroll to it
          closeNewsModal();
          target.scrollIntoView({behavior:'smooth', block:'center'});
          target.classList.add('highlighted');
          setTimeout(()=> target.classList.remove('highlighted'), 1600);
        }
      });
    });
  }

  /* ---------- 7) TTS (Web Speech API) ---------- */
  let synth = window.speechSynthesis;
  let ttsUtterance = null;
  let availableVoices = [];
  let ttsPlaying = false;
  let ttsStatusSpan = null;
  let ttsPlayBtn = null;
  let ttsTextElement = null;
  let wordSpans = [];
  let currentWordIndex = -1;

  function populateVoices(selectEl) {
    const currentLang = document.documentElement.lang;
    availableVoices = (synth.getVoices() || []).filter(voice =>
      voice.lang.startsWith(currentLang) || voice.lang.startsWith('en')
    );
    selectEl.innerHTML = '';
    
    if (availableVoices.length === 0) {
      const opt = document.createElement('option');
      opt.textContent = 'Default';
      selectEl.appendChild(opt);
    } else {
      availableVoices.forEach((v, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = `${v.name} (${v.lang})`;
        opt.lang = v.lang;
        selectEl.appendChild(opt);
      });
    }
  }

  function highlightAndScroll() {
      if (currentWordIndex >= 0 && currentWordIndex < wordSpans.length) {
          // Remove highlight from previous word
          if (currentWordIndex > 0) {
              const prevWordSpan = wordSpans[currentWordIndex - 1];
              if (prevWordSpan) prevWordSpan.classList.remove('tts-highlight');
          }
          // Highlight current word and scroll
          const currentWordSpan = wordSpans[currentWordIndex];
          if (currentWordSpan) {
              currentWordSpan.classList.add('tts-highlight');
              // Using a minimal scroll to keep the text in view
              const rect = currentWordSpan.getBoundingClientRect();
              const container = ttsTextElement.parentNode;
              if (rect.top < container.offsetTop || rect.bottom > container.offsetTop + container.clientHeight) {
                  currentWordSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
          }
      }
  }

  function initTTSControls(wrapper, modalTextContainer) {
    ttsTextElement = modalTextContainer;
    ttsPlayBtn = wrapper.querySelector('.tts-play');
    const pauseBtn = wrapper.querySelector('.tts-pause');
    const stopBtn = wrapper.querySelector('.tts-stop');
    const select = wrapper.querySelector('#tts-voices');
    ttsStatusSpan = wrapper.querySelector('.tts-status');

    // voices may load later
    populateVoices(select);
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => populateVoices(select);
    }

    function prepareTextForReading() {
      // First, remove old spans if they exist
      qa('.tts-highlight').forEach(s => {
          const parent = s.parentNode;
          parent.replaceChild(document.createTextNode(s.textContent), s);
          parent.normalize();
      });

      const text = ttsTextElement.textContent;
      const paragraphs = text.split('\n\n').filter(p => p.trim() !== '');
      ttsTextElement.innerHTML = ''; // Clear content
      wordSpans = [];
      paragraphs.forEach(pText => {
          const p = document.createElement('p');
          const words = pText.split(/\s+/);
          words.forEach((word, index) => {
              const span = document.createElement('span');
              span.textContent = word + ' ';
              wordSpans.push(span);
              p.appendChild(span);
          });
          ttsTextElement.appendChild(p);
      });
    }

    ttsPlayBtn.addEventListener('click', () => {
      if (!synth) {
        ttsStatusSpan.textContent = 'TTS not supported in this browser';
        return;
      }
      if (ttsPlaying && ttsUtterance && synth.paused) {
        synth.resume();
        ttsStatusSpan.textContent = 'Resumed';
        return;
      }
      if (ttsPlaying) return;

      prepareTextForReading();
      const text = wordSpans.map(s => s.textContent).join('');
      if (!text) { ttsStatusSpan.textContent = 'No text to read'; return; }
      
      ttsUtterance = new SpeechSynthesisUtterance(text);
      const vIdx = parseInt(select.value, 10);
      if (!isNaN(vIdx) && availableVoices[vIdx]) ttsUtterance.voice = availableVoices[vIdx];
      // Set language automatically
      ttsUtterance.lang = document.documentElement.lang || 'en-US';
      ttsUtterance.rate = 1.05; // slightly faster
      ttsUtterance.pitch = 1;

      let charIndex = 0;
      ttsUtterance.onboundary = (event) => {
          if (event.name === 'word') {
              const boundaryIndex = event.charIndex;
              let tempIndex = 0;
              for (let i = 0; i < wordSpans.length; i++) {
                  const spanText = wordSpans[i].textContent;
                  if (boundaryIndex >= tempIndex && boundaryIndex < tempIndex + spanText.length) {
                      if (currentWordIndex >= 0 && wordSpans[currentWordIndex]) {
                          wordSpans[currentWordIndex].classList.remove('tts-highlight');
                      }
                      currentWordIndex = i;
                      wordSpans[currentWordIndex].classList.add('tts-highlight');
                      wordSpans[currentWordIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
                      break;
                  }
                  tempIndex += spanText.length;
              }
          }
      };

      ttsUtterance.onstart = () => { 
          ttsPlaying = true; 
          ttsStatusSpan.textContent = 'Playing...'; 
          ttsPlayBtn.setAttribute('aria-pressed','true'); 
      };
      ttsUtterance.onend = () => { 
          ttsPlaying = false; 
          ttsStatusSpan.textContent = 'Finished'; 
          ttsPlayBtn.setAttribute('aria-pressed','false'); 
          qa('.tts-highlight').forEach(s => s.classList.remove('tts-highlight'));
      };
      ttsUtterance.onerror = (e) => { 
          ttsPlaying = false; 
          ttsStatusSpan.textContent = 'Playback error'; 
          ttsPlayBtn.setAttribute('aria-pressed','false'); 
      };
      
      synth.speak(ttsUtterance);
    });

    pauseBtn.addEventListener('click', () => {
      if (!synth || !ttsPlaying) return;
      if (synth.speaking && !synth.paused) {
        synth.pause();
        ttsStatusSpan.textContent = 'Paused';
      } else if (synth.paused) {
        synth.resume();
        ttsStatusSpan.textContent = 'Resumed';
      }
    });

    stopBtn.addEventListener('click', () => {
      if (!synth) return;
      synth.cancel();
      ttsPlaying = false;
      ttsStatusSpan.textContent = 'Stopped';
      ttsPlayBtn.setAttribute('aria-pressed','false');
      qa('.tts-highlight').forEach(s => s.classList.remove('tts-highlight'));
    });
  }

  function stopTTS() {
    if (synth && synth.speaking) {
      synth.cancel();
    }
    ttsPlaying = false;
    if (ttsStatusSpan) ttsStatusSpan.textContent = 'Stopped';
    if (ttsPlayBtn) ttsPlayBtn.setAttribute('aria-pressed','false');
    qa('.tts-highlight').forEach(s => s.classList.remove('tts-highlight'));
  }

  /* ---------- 8) On-load highlight from hash (you already had this) ---------- */
  const hash = window.location.hash.slice(1);
  if (hash) {
    const target = document.getElementById(hash);
    if (target) {
      setTimeout(() => {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.classList.add("highlighted");
        setTimeout(() => target.classList.remove("highlighted"), 2000);
      }, 300);
    }
  }

  /* ---------- 9) Small accessibility: close modals with Escape (global) ---------- */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // close any open modal overlays
      qa('.modal-overlay[aria-hidden="false"]').forEach(m => {
        m.setAttribute('aria-hidden','true');
        m.style.display = 'none';
        document.body.style.overflow = '';
      });
      stopTTS();
    }
  });

}); // DOMContentLoaded end
