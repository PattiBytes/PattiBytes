/* news.js — PattiBytes (Upgraded)
   - fixes date/time bug (shows full month names, e.g. "August")
   - more robust timeAgo calculation
   - improved TTS: language-aware (prefers Punjabi then English), safer voice loading,
     play/pause/stop, highlighted words, progress indicator, keyboard shortcuts,
     reduced-motion respect, cleanup on modal close
   - infinite scroll, copy-link, image modal, related articles preserved & improved
*/

document.addEventListener("DOMContentLoaded", () => {
  /* ---------- Utilities ---------- */
  const q = (sel, ctx = document) => ctx.querySelector(sel);
  const qa = (sel, ctx = document) => Array.from((ctx || document).querySelectorAll(sel));

  const stripHtml = (html) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = html || "";
    return tmp.textContent || tmp.innerText || "";
  };

  const wordCount = (text) => (text || "").trim().split(/\s+/).filter(Boolean).length;
  const readMinutes = (words, wpm = 200) => Math.max(1, Math.round(words / wpm));

  function timeAgo(isoDate) {
    if (!isoDate) return "";
    const then = new Date(isoDate);
    if (isNaN(then)) return "";
    const now = new Date();
    const sec = Math.floor((now - then) / 1000);
    if (sec < 60) return `${sec} sec ਪਹਿਲਾਂ`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} ਮਿੰਟ ਪਹਿਲਾਂ`;
    const hr = Math.floor(min / 60);              // FIXED: was min / 24 (incorrect)
    if (hr < 24) return `${hr} ਘੰਟੇ ਪਹਿਲਾਂ`;
    const days = Math.floor(hr / 24);
    if (days < 7) return `${days} ਦਿਨ ਪਹਿਲਾਂ`;
    // fallback to formatted date with full month name
    return then.toLocaleDateString("pa-IN", {
      year: "numeric",
      month: "long", // full month name, e.g. August
      day: "numeric",
    });
  }

  function decodeHtmlEntities(str) {
    const ta = document.createElement("textarea");
    ta.innerHTML = str || "";
    return ta.value;
  }

  function getLangCode(lang) {
    if (!lang) return "";
    // e.g. 'pa-IN' -> 'pa', 'en-US' -> 'en'
    return String(lang).split(/[-_]/)[0].toLowerCase();
  }

  /* ---------- Elements ---------- */
  const allCards = qa(".news-card");
  const newsGrid = q(".news-grid");
  const newsModal = q("#news-modal");
  const modalTitle = q("#modal-title");
  const modalMedia = q("#modal-media");
  const modalText = q("#modal-text");
  const modalCloseBtn = q("#modal-close");
  const imageModal = q("#image-modal");
  const imageModalClose = q("#image-modal-close");
  const modalImage = q("#modal-image");

  /* ---------- 1) Copy link ---------- */
  qa(".copy-link").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const article = btn.closest("article.news-card");
      if (!article || !article.id) return;
      const url = `${window.location.origin}${window.location.pathname}#${article.id}`;
      try {
        await navigator.clipboard.writeText(url);
      } catch (err) {
        const ta = document.createElement("textarea");
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      btn.classList.add("copied");
      const prev = btn.textContent;
      btn.textContent = "✔️";
      setTimeout(() => {
        btn.classList.remove("copied");
        btn.textContent = prev;
      }, 1500);
    });
  });

  /* ---------- 2) populate card meta: read-time and relative date ---------- */
  allCards.forEach((card) => {
    const preview = card.dataset.preview || "";
    // prefer full content if available for more accurate read time
    const contentRaw = decodeHtmlEntities(card.dataset.content || "");
    const words = wordCount(contentRaw || preview);
    const minutes = readMinutes(words);
    const readTimeEl = card.querySelector(".read-time");
    if (readTimeEl) readTimeEl.textContent = `${minutes} ਮਿੰਟ ਪੜ੍ਹਨ ਲਈ`;

    const dateISO = card.dataset.date;
    const publishedEl = card.querySelector(".published");
    if (publishedEl && dateISO) {
      publishedEl.setAttribute("datetime", dateISO);
      // full month name shown
      publishedEl.title = new Date(dateISO).toLocaleString("pa-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const rel = timeAgo(dateISO);
      const relSpan = document.createElement("span");
      relSpan.className = "published-relative";
      relSpan.textContent = ` (${rel})`;
      publishedEl.parentNode.insertBefore(relSpan, publishedEl.nextSibling);
    }
  });

  /* ---------- 3) Pagination / Infinite scroll ---------- */
  const PAGE_SIZE = 6;
  let pageIndex = 0;
  const totalCards = allCards.length;
  allCards.forEach((c) => (c.style.display = "none"));

  function showNextPage() {
    const start = pageIndex * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const slice = allCards.slice(start, end);
    slice.forEach((c) => (c.style.display = ""));
    pageIndex++;
    if (pageIndex * PAGE_SIZE >= totalCards && sentinel) {
      observer.unobserve(sentinel);
      sentinel.remove();
    }
  }

  showNextPage();

  const sentinel = document.createElement("div");
  sentinel.className = "scroll-sentinel";
  sentinel.style.height = "2px";
  newsGrid.after(sentinel);

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) showNextPage();
      });
    },
    { root: null, rootMargin: "200px", threshold: 0.01 }
  );
  observer.observe(sentinel);

  /* ---------- 4) Modal open / close (article full text) ---------- */
  let lastFocusBeforeModal = null;

  function openNewsModal(card) {
    if (!card) return;
    lastFocusBeforeModal = document.activeElement;

    const title = card.dataset.title || "";
    const author = card.dataset.author || "";
    const dateISO = card.dataset.date || "";
    const image = card.dataset.image || "";
    const rawContent = card.dataset.content || "";
    const contentHtml = decodeHtmlEntities(rawContent);

    // populate modal
    modalTitle.textContent = title;
    modalMedia.innerHTML = "";
    if (image) {
      const img = document.createElement("img");
      img.src = image;
      img.alt = title;
      img.loading = "lazy";
      img.style.maxWidth = "100%";
      img.style.borderRadius = "8px";
      modalMedia.appendChild(img);
    }

    // insert content
    modalText.innerHTML = contentHtml || `<p>${card.dataset.preview || ""}</p>`;

    // meta: add author & date & read-time
    const metaWrap = document.createElement("div");
    metaWrap.className = "modal-meta";
    metaWrap.innerHTML = `<p style="margin:0 0 .5rem 0;"><strong>${author}</strong> · ${new Date(dateISO).toLocaleString("pa-IN", { year: "numeric", month: "long", day: "numeric" })}</p>`;
    modalText.prepend(metaWrap);

    // related articles
    populateRelated(card);

    // TTS toggle + controls
    // remove any existing TTS UI to avoid duplicates
    const prevTTS = newsModal.querySelector(".tts-controls, .tts-toggle-btn");
    if (prevTTS) prevTTS.remove();

    const ttsToggleBtn = document.createElement("button");
    ttsToggleBtn.className = "tts-toggle-btn";
    ttsToggleBtn.innerHTML = "🔊";
    ttsToggleBtn.title = "Toggle Text-to-Speech Controls";
    ttsToggleBtn.type = "button";
    ttsToggleBtn.style.marginLeft = "8px";
    modalCloseBtn.after(ttsToggleBtn);

    const ttsWrap = document.createElement("div");
    ttsWrap.className = "tts-controls";
    ttsWrap.style.display = "none"; // toggled via button
    ttsWrap.innerHTML = `
      <div class="tts-controls-row" style="display:flex;gap:.5rem;align-items:center;">
        <button class="tts-play" aria-pressed="false" title="Play article">▶️ Play</button>
        <button class="tts-pause" title="Pause">⏸️ Pause</button>
        <button class="tts-stop" title="Stop">⏹️ Stop</button>
        <div class="tts-progress" aria-hidden="true" style="margin-left:0.5rem;"></div>
      </div>
      <div class="tts-controls-row" style="margin-top:.5rem;display:flex;gap:.5rem;align-items:center;">
        <label for="tts-voices" class="sr-only">Voice</label>
        <select id="tts-voices" aria-label="Choose voice"></select>
        <span class="tts-status" aria-live="polite" style="margin-left:.5rem;"></span>
      </div>
    `;
    modalText.parentNode.insertBefore(ttsWrap, modalText.nextSibling);

    // language preference: card.dataset.lang or document lang
    const cardLang = card.dataset.lang || document.documentElement.lang || "pa-IN";
    const ttsLangPref = getLangCode(cardLang);

    // toggle behavior
    ttsToggleBtn.addEventListener(
      "click",
      () => {
        if (ttsWrap.style.display === "none") {
          ttsWrap.style.display = "";
          ttsWrap.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          ttsWrap.style.display = "none";
        }
      },
      { once: false }
    );

    // initialize controls with language preference
    initTTSControls(ttsWrap, modalText, ttsLangPref);

    // show modal
    newsModal.setAttribute("aria-hidden", "false");
    newsModal.style.display = "flex";
    document.body.style.overflow = "hidden";

    modalCloseBtn.focus();
    document.addEventListener("keydown", modalKeyHandler);
  }

  function closeNewsModal() {
    newsModal.setAttribute("aria-hidden", "true");
    newsModal.style.display = "none";
    document.body.style.overflow = "";
    document.removeEventListener("keydown", modalKeyHandler);

    // stop any TTS
    stopTTS();

    if (lastFocusBeforeModal) lastFocusBeforeModal.focus();

    // cleanup highlights & restore text nodes if any wrapped
    qa(".tts-word-span").forEach((s) => {
      // replace spans with text nodes (safe since we created them)
      const txt = document.createTextNode(s.textContent);
      s.parentNode.replaceChild(txt, s);
    });
  }

  function modalKeyHandler(e) {
    if (e.key === "Escape") closeNewsModal();
    if (e.key === "Tab") {
      const focusables = qa("#news-modal button, #news-modal a, #news-modal [tabindex]:not([tabindex='-1'])");
      if (focusables.length === 0) return;
      const first = focusables[0],
        last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    }
  }

  qa(".read-more-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest("article.news-card");
      openNewsModal(card);
    });
  });

  modalCloseBtn.addEventListener("click", closeNewsModal);
  newsModal.addEventListener("click", (e) => {
    if (e.target === newsModal) closeNewsModal();
  });

  /* ---------- 5) Image modal ---------- */
  qa(".enlarge-btn").forEach((b) =>
    b.addEventListener("click", () => {
      const card = b.closest("article.news-card");
      const imgSrc = card.dataset.image;
      if (!imgSrc) return;
      modalImage.src = imgSrc;
      modalImage.alt = card.dataset.title || "";
      imageModal.setAttribute("aria-hidden", "false");
      imageModal.style.display = "flex";
      document.body.style.overflow = "hidden";
      imageModalClose.focus();
    })
  );

  imageModalClose.addEventListener("click", () => {
    imageModal.setAttribute("aria-hidden", "true");
    imageModal.style.display = "none";
    modalImage.src = "";
    document.body.style.overflow = "";
  });
  imageModal.addEventListener("click", (e) => {
    if (e.target === imageModal) {
      imageModal.setAttribute("aria-hidden", "true");
      imageModal.style.display = "none";
      modalImage.src = "";
      document.body.style.overflow = "";
    }
  });

  /* ---------- 6) Related articles ---------- */
  function populateRelated(activeCard) {
    const existing = modalText.parentNode.querySelector(".modal-related");
    if (existing) existing.remove();

    const tags = (activeCard.dataset.tags || "").split(/\s+/).filter(Boolean);
    const titleWords = (activeCard.dataset.title || "").toLowerCase().split(/\W+/).filter(Boolean);

    const scores = [];
    allCards.forEach((c) => {
      if (c === activeCard) return;
      let score = 0;
      const otherTags = (c.dataset.tags || "").split(/\s+/).filter(Boolean);
      score += otherTags.filter((t) => tags.includes(t)).length * 10;

      const otherTitleWords = (c.dataset.title || "").toLowerCase().split(/\W+/).filter(Boolean);
      score += otherTitleWords.filter((w) => titleWords.includes(w)).length * 3;

      if (c.classList.contains("featured-card")) score += 2;
      if (score > 0) scores.push({ card: c, score });
    });

    scores.sort((a, b) => b.score - a.score);
    const top = scores.slice(0, 4).map((s) => s.card);
    if (top.length === 0) return;

    const wrap = document.createElement("div");
    wrap.className = "modal-related";
    wrap.innerHTML = `<h4>ਤੁਹਾਨੂੰ ਇਹ ਵੀ ਪਸੰਦ ਆ ਸਕਦਾ ਹੈ</h4>`;
    const list = document.createElement("div");
    list.className = "related-list";

    top.forEach((c) => {
      const thumb = c.dataset.image || "";
      const cardTitle = c.dataset.title || "";
      const preview = c.dataset.preview || "";
      const rel = document.createElement("div");
      rel.className = "related-card";
      rel.innerHTML = `
        ${thumb ? `<img src="${thumb}" alt="${cardTitle}" loading="lazy"/>` : ""}
        <div class="related-info">
          <div class="related-title">${cardTitle}</div>
          <div class="related-meta">${preview.slice(0, 80)}…</div>
          <div style="margin-top:.5rem"><button class="related-open" data-id="${c.id}">ਖੋਲੋ</button></div>
        </div>
      `;
      list.appendChild(rel);
    });

    wrap.appendChild(list);
    modalText.parentNode.appendChild(wrap);

    qa(".related-open", wrap).forEach((btn) =>
      btn.addEventListener("click", (e) => {
        const id = btn.dataset.id;
        const target = document.getElementById(id);
        if (target) {
          closeNewsModal();
          target.scrollIntoView({ behavior: "smooth", block: "center" });
          target.classList.add("highlighted");
          setTimeout(() => target.classList.remove("highlighted"), 1600);
        }
      })
    );
  }

  /* ---------- 7) TTS (Web Speech API) — language-aware improvements ---------- */
  let synth = window.speechSynthesis;
  let availableVoices = [];
  let ttsUtterance = null;
  let ttsPlaying = false;
  let activeHighlightInterval = null;

  // load voices safely and cache
  function loadVoices() {
    availableVoices = synth.getVoices() || [];
    return availableVoices;
  }
  if (speechSynthesis && speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = () => {
      loadVoices();
    };
  } else {
    // attempt immediate load
    loadVoices();
  }

  function populateVoices(selectEl, langPref) {
    // langPref is like 'pa' or 'en' (two-letter)
    const voices = loadVoices();
    selectEl.innerHTML = "";

    // group preferred voices first (match langPref), then English fallback
    const preferred = voices.filter((v) => getLangCode(v.lang) === langPref);
    const english = voices.filter((v) => getLangCode(v.lang) === "en" && getLangCode(v.lang) !== langPref);
    const others = voices.filter((v) => ![...preferred, ...english].includes(v));

    function addGroup(label, arr) {
      if (!arr.length) return;
      const og = document.createElement("optgroup");
      og.label = label;
      arr.forEach((v, idx) => {
        const opt = document.createElement("option");
        opt.value = `${voices.indexOf(v)}`; // use index into global voices array
        opt.textContent = `${v.name} (${v.lang})`;
        og.appendChild(opt);
      });
      selectEl.appendChild(og);
    }

    addGroup("Preferred", preferred);
    addGroup("English", english);
    addGroup("Other voices", others);

    if (selectEl.options.length === 0) {
      const o = document.createElement("option");
      o.value = "-1";
      o.textContent = "Default";
      selectEl.appendChild(o);
    }
  }

  function initTTSControls(wrapper, modalTextContainer, langPref) {
    // wrapper: container we inserted
    // modalTextContainer: element that contains modal article content
    // langPref: 'pa' or 'en' etc.
    const playBtn = wrapper.querySelector(".tts-play");
    const pauseBtn = wrapper.querySelector(".tts-pause");
    const stopBtn = wrapper.querySelector(".tts-stop");
    const select = wrapper.querySelector("#tts-voices");
    const statusSpan = wrapper.querySelector(".tts-status");
    const progressEl = wrapper.querySelector(".tts-progress");

    // accessibility: keyboard shortcuts
    function onKeyDown(e) {
      if (newsModal.getAttribute("aria-hidden") === "false") {
        if (e.code === "Space") {
          e.preventDefault();
          // toggle play/pause
          if (synth.speaking && !synth.paused) {
            synth.pause();
            statusSpan.textContent = "ਰੁਕਿਆ";
            playBtn.textContent = "▶️ Play";
          } else if (synth.paused) {
            synth.resume();
            statusSpan.textContent = "ਜਾਰੀ...";
            playBtn.textContent = "⏸️ Pause";
          } else {
            startTTS();
          }
        }
        if (e.key === "s" || e.key === "S") {
          // stop
          stopTTS();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);

    // prepare voices
    populateVoices(select, langPref);
    if (speechSynthesis && speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => populateVoices(select, langPref);
    }

    // detect reduced motion preference
    const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // helper to wrap text into spans for highlighting
    function prepareTextForReading() {
      // Remove any previous spans
      qa(".tts-word-span", modalTextContainer).forEach((s) => {
        const t = document.createTextNode(s.textContent);
        s.parentNode.replaceChild(t, s);
      });

      // collect paragraphs/headings to read
      const nodes = Array.from(modalTextContainer.querySelectorAll("p, h1, h2, h3, h4, li, strong")).filter(
        (el) => el.textContent.trim() !== ""
      );

      // create container for read content
      const readContainer = document.createElement("div");
      readContainer.className = "tts-read-container";

      nodes.forEach((el) => {
        const newEl = document.createElement(el.tagName);
        // split the element's text into words, preserve punctuation spacing
        const text = el.textContent.replace(/\s+/g, " ").trim();
        const words = text.split(/\s+/);
        words.forEach((w, i) => {
          const span = document.createElement("span");
          span.className = "tts-word-span";
          span.textContent = w + (i < words.length - 1 ? " " : "");
          newEl.appendChild(span);
        });
        readContainer.appendChild(newEl);
      });

      // replace modalTextContainer content (keep meta if present)
      // preserve modal-meta if present at top
      const meta = modalTextContainer.querySelector(".modal-meta");
      modalTextContainer.innerHTML = "";
      if (meta) modalTextContainer.appendChild(meta);
      modalTextContainer.appendChild(readContainer);
    }

    // core TTS flow
    let utteranceQueue = [];
    let utterIndex = 0;
    let wordSpans = [];
    let currentSpanIndex = 0;

    function buildQueue() {
      // build utterance chunks (to improve boundary events reliability)
      const readContainer = modalTextContainer.querySelector(".tts-read-container");
      if (!readContainer) return;
      utteranceQueue = [];
      const blocks = Array.from(readContainer.children);
      blocks.forEach((block) => {
        const text = block.textContent.trim();
        if (text) utteranceQueue.push(text);
      });
    }

    function speakQueueItem(text, onend) {
      if (!speechSynthesis) return;
      // cancel any existing utterance safely
      if (ttsUtterance) {
        try {
          ttsUtterance.onboundary = null;
          ttsUtterance.onend = null;
        } catch (e) {}
      }

      ttsUtterance = new SpeechSynthesisUtterance(text);

      // choose voice by select -> voices index in global voices list
      const selVal = select.value;
      if (selVal && parseInt(selVal, 10) >= 0 && synth.getVoices()[parseInt(selVal, 10)]) {
        ttsUtterance.voice = synth.getVoices()[parseInt(selVal, 10)];
      } else {
        // fallback: set lang to pref if possible
        ttsUtterance.lang = langPref ? `${langPref}` : document.documentElement.lang || "pa-IN";
      }

      // tune
      ttsUtterance.rate = 1.02;
      ttsUtterance.pitch = 1.0;

      // boundary highlight attempt (may not be supported everywhere)
      ttsUtterance.onboundary = (ev) => {
        if (ev.name === "word") {
          // try to match nth word - but since boundary.word index is not always reliable across chunks,
          // we'll maintain a simple index based on progress through all word spans.
          highlightWordByCharIndex(ev.charIndex);
        }
      };

      ttsUtterance.onend = () => {
        if (typeof onend === "function") onend();
      };

      synth.speak(ttsUtterance);
    }

    function startTTS() {
      if (!speechSynthesis) {
        statusSpan.textContent = "TTS browser ਵੱਲੋਂ supported ਨਹੀਂ";
        return;
      }

      // prepare DOM for reading & highlighting
      prepareTextForReading();

      // small performance guard for very large articles
      const totalWords = qa(".tts-word-span", modalTextContainer).length;
      if (totalWords === 0) {
        statusSpan.textContent = "ਕੋਈ ਪਾਠ ਨਹੀਂ";
        return;
      }

      // fill arrays
      wordSpans = qa(".tts-word-span", modalTextContainer);
      currentSpanIndex = 0;
      buildQueue();

      // start speaking utterance by utterance
      ttsPlaying = true;
      statusSpan.textContent = "ਬੋਲ ਰਹੇ ਹਨ...";
      playBtn.textContent = "⏸️ Pause";
      playBtn.setAttribute("aria-pressed", "true");

      // iterative speak
      function speakNext() {
        if (utterIndex >= utteranceQueue.length) {
          // finished
          stopTTS();
          return;
        }
        const textChunk = utteranceQueue[utterIndex++];
        speakQueueItem(textChunk, () => {
          // advance highlighting to next chunk start
          // approximate: advance currentSpanIndex by number of words in chunk
          const wordsInChunk = textChunk.trim().split(/\s+/).length;
          currentSpanIndex = Math.min(wordSpans.length, currentSpanIndex + wordsInChunk);
          updateProgress();
          // short delay for smoother flow
          setTimeout(() => speakNext(), 80);
        });
      }

      // try to highlight as the speech progresses: poll for spoken words if boundary unsupported
      if (!("onboundary" in SpeechSynthesisUtterance.prototype)) {
        // fallback periodic highlighting approximate
        if (!prefersReducedMotion) {
          activeHighlightInterval = setInterval(() => {
            if (!synth.speaking) return;
            // attempt to highlight next few words
            if (currentSpanIndex < wordSpans.length) {
              wordSpans[currentSpanIndex] && wordSpans[currentSpanIndex].classList.add("tts-highlight");
              currentSpanIndex++;
              updateProgress();
            }
          }, 600);
        }
      }

      // start queue
      utterIndex = 0;
      speakNext();
    }

    // best-effort highlight using charIndex from onboundary (approximate)
    function highlightWordByCharIndex(charIndex) {
      // naive approach: find the first span that contains the charIndex position in the concatenated text
      // build concat text and map
      const concat = [];
      let total = 0;
      wordSpans = qa(".tts-word-span", modalTextContainer);
      for (let i = 0; i < wordSpans.length; i++) {
        const w = wordSpans[i].textContent || "";
        concat.push({ start: total, end: total + w.length, idx: i });
        total += w.length;
      }
      const found = concat.find((c) => charIndex >= c.start && charIndex <= c.end);
      if (found) {
        // remove previous highlights
        qa(".tts-highlight", modalTextContainer).forEach((s) => s.classList.remove("tts-highlight"));
        const el = wordSpans[found.idx];
        if (el) {
          el.classList.add("tts-highlight");
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        currentSpanIndex = found.idx + 1;
        updateProgress();
      }
    }

    function updateProgress() {
      const total = qa(".tts-word-span", modalTextContainer).length || 1;
      const done = Math.min(total, currentSpanIndex);
      const pct = Math.round((done / total) * 100);
      if (progressEl) progressEl.textContent = ` ${pct}%`;
    }

    function pauseTTS() {
      if (speechSynthesis && speechSynthesis.speaking && !speechSynthesis.paused) {
        speechSynthesis.pause();
        ttsPlaying = false;
        statusSpan.textContent = "ਰੁਕਿਆ";
        playBtn.textContent = "▶️ Play";
      }
    }

    function resumeTTS() {
      if (speechSynthesis && speechSynthesis.paused) {
        speechSynthesis.resume();
        ttsPlaying = true;
        statusSpan.textContent = "ਜਾਰੀ...";
        playBtn.textContent = "⏸️ Pause";
      }
    }

    function stopAllHighlights() {
      qa(".tts-highlight", modalTextContainer).forEach((s) => s.classList.remove("tts-highlight"));
      if (activeHighlightInterval) {
        clearInterval(activeHighlightInterval);
        activeHighlightInterval = null;
      }
    }

    function stopTTSLocalCleanup() {
      stopAllHighlights();
      updateProgress();
      if (playBtn) {
        playBtn.textContent = "▶️ Play";
        playBtn.setAttribute("aria-pressed", "false");
      }
    }

    // play/pause/stop handlers
    playBtn.addEventListener("click", () => {
      if (!speechSynthesis) {
        statusSpan.textContent = "TTS supported ਨਹੀਂ";
        return;
      }
      if (speechSynthesis.speaking && !speechSynthesis.paused) {
        pauseTTS();
      } else if (speechSynthesis.paused) {
        resumeTTS();
      } else {
        startTTS();
      }
    });

    pauseBtn.addEventListener("click", () => {
      pauseTTS();
    });

    stopBtn.addEventListener("click", () => {
      stopTTS();
    });

    // stopTTS needs global visibility — attach to outer stopTTS below which cancels speechSynthesis
    // we also return a cleanup function so callers can remove listeners if needed
    return () => {
      // remove event listeners (best-effort)
      document.removeEventListener("keydown", onKeyDown);
      stopAllHighlights();
      stopTTS();
    };
  }

  function stopTTS() {
    if (speechSynthesis && speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }
    ttsPlaying = false;
    // remove highlight classes
    qa(".tts-highlight").forEach((s) => s.classList.remove("tts-highlight"));
    // reset play buttons text if present
    qa(".tts-play").forEach((b) => {
      b.textContent = "▶️ Play";
      b.setAttribute("aria-pressed", "false");
    });
    // clear intervals
    if (activeHighlightInterval) {
      clearInterval(activeHighlightInterval);
      activeHighlightInterval = null;
    }
    // update statuses
    qa(".tts-status").forEach((el) => (el.textContent = "Stopped"));
    qa(".tts-progress").forEach((el) => (el.textContent = ""));
  }

  /* ---------- 8) On-load highlight from hash ---------- */
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

  /* ---------- 9) Accessibility: global Escape closes modals ---------- */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      qa(".modal-overlay[aria-hidden='false']").forEach((m) => {
        m.setAttribute("aria-hidden", "true");
        m.style.display = "none";
        document.body.style.overflow = "";
      });
      stopTTS();
    }
  });
}); // DOMContentLoaded end
