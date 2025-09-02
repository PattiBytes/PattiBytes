/* news.js — PattiBytes (Rewritten; robust date & TTS)
   - Full month date formatting
   - Robust timeAgo (no negative secs)
   - Infinite scroll / pagination
   - Accessible modal + related articles
   - TTS with safe voice loading, play/pause/stop, voice select
   - TTS toggles by adding/removing .show on .tts-controls (matches CSS)
*/

document.addEventListener("DOMContentLoaded", () => {
  /* -------------------------
     Utilities
  ------------------------- */
  const q = (sel, ctx = document) => (ctx || document).querySelector(sel);
  const qa = (sel, ctx = document) => Array.from((ctx || document).querySelectorAll(sel));
  const stripHtml = (html = "") => {
    const d = document.createElement("div");
    d.innerHTML = html;
    return d.textContent || d.innerText || "";
  };
  const wordCount = (text = "") => (text || "").trim().split(/\s+/).filter(Boolean).length;
  const readMinutes = (words, wpm = 200) => Math.max(1, Math.round(words / wpm));
  const getLangCode = (code) => (code ? String(code).split(/[-_]/)[0].toLowerCase() : "");

  /* -------------------------
     Date / Relative time helpers
  ------------------------- */
  function formatFullDateISO(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("pa-IN", { year: "numeric", month: "long", day: "2-digit" });
  }

  function timeAgo(isoDate) {
    if (!isoDate) return "";
    const then = new Date(isoDate);
    if (isNaN(then.getTime())) return "";
    const now = new Date();
    const diffMs = now.getTime() - then.getTime();
    const sec = Math.round(diffMs / 1000);

    // If in the future, show formatted date (no negative secs)
    if (sec < 0) {
      // if small future, say 'ਹੁਣੇ ਹੀ'
      if (Math.abs(sec) <= 60) return "ਹੁਣੇ ਹੀ";
      return formatFullDateISO(isoDate);
    }

    if (sec < 60) return `${sec} sec ਪਹਿਲਾਂ`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} ਮਿੰਟ ਪਹਿਲਾਂ`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} ਘੰਟੇ ਪਹਿਲਾਂ`;
    const days = Math.floor(hr / 24);
    if (days < 7) return `${days} ਦਿਨ ਪਹਿਲਾਂ`;
    return formatFullDateISO(isoDate);
  }

  /* -------------------------
     Page elements
  ------------------------- */
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

  /* -------------------------
     Copy link
  ------------------------- */
  qa(".copy-link").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const article = btn.closest("article.news-card");
      if (!article || !article.id) return;
      const url = `${window.location.origin}${window.location.pathname}#${article.id}`;
      try {
        await navigator.clipboard.writeText(url);
      } catch {
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
      }, 1400);
    });
  });

  /* -------------------------
     Populate read-time and formatted date on cards
  ------------------------- */
  allCards.forEach((card) => {
    // Read time (from content if available, otherwise preview)
    const contentRaw = decodeURIComponent(card.dataset.content || "") || stripHtml(card.dataset.preview || "");
    const words = wordCount(contentRaw);
    const minutes = readMinutes(words);
    const readTimeEl = card.querySelector(".read-time");
    if (readTimeEl) readTimeEl.textContent = `${minutes} ਮਿੰਟ ਪੜ੍ਹਨ ਲਈ`;

    // Published date: replace visible text with full-month format + relative time span
    const dateISO = card.dataset.date;
    const publishedEl = card.querySelector(".published");
    if (publishedEl && dateISO) {
      const full = formatFullDateISO(dateISO);
      if (full) {
        publishedEl.textContent = full;
        publishedEl.setAttribute("datetime", dateISO);
        publishedEl.title = full;
        // add (relative) and ensure we don't duplicate
        const existingRel = publishedEl.parentNode.querySelector(".published-relative");
        if (existingRel) existingRel.remove();
        const rel = document.createElement("span");
        rel.className = "published-relative";
        rel.textContent = ` (${timeAgo(dateISO)})`;
        publishedEl.parentNode.insertBefore(rel, publishedEl.nextSibling);
      }
    }
  });

  /* -------------------------
     Pagination / Infinite scroll
  ------------------------- */
  const PAGE_SIZE = 6;
  let pageIndex = 0;
  const totalCards = allCards.length;
  allCards.forEach((c) => (c.style.display = "none"));

  function showNextPage() {
    const start = pageIndex * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const chunk = allCards.slice(start, end);
    chunk.forEach((c) => (c.style.display = ""));
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

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) showNextPage();
    });
  }, { root: null, rootMargin: "200px", threshold: 0.01 });

  observer.observe(sentinel);

  /* -------------------------
     Modal open/close + populate content & related
  ------------------------- */
  let lastFocusBeforeModal = null;

  function openNewsModal(card) {
    if (!card) return;
    lastFocusBeforeModal = document.activeElement;

    const title = card.dataset.title || "";
    const author = card.dataset.author || "";
    const dateISO = card.dataset.date || "";
    const image = card.dataset.image || "";
    const rawContent = card.dataset.content || "";
    const contentHtml = decodeURIComponent(rawContent) || "";

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

    // insert content (if contentHtml is empty, fall back to preview)
    if (contentHtml.trim()) modalText.innerHTML = contentHtml;
    else modalText.innerHTML = `<p>${card.dataset.preview || ""}</p>`;

    // prepend modal meta
    const metaWrap = document.createElement("div");
    metaWrap.className = "modal-meta";
    const dateStr = dateISO ? formatFullDateISO(dateISO) : "";
    metaWrap.innerHTML = `<p style="margin:0 0 .5rem 0;"><strong>${author}</strong> · ${dateStr}</p>`;
    modalText.prepend(metaWrap);

    // related
    populateRelated(card);

    // remove any previous TTS UI (avoid duplicates)
    const prevToggle = newsModal.querySelector(".tts-toggle-btn");
    if (prevToggle) prevToggle.remove();
    const prevControls = newsModal.querySelector(".tts-controls");
    if (prevControls) prevControls.remove();

    // create TTS toggle and controls
    const ttsToggleBtn = document.createElement("button");
    ttsToggleBtn.className = "tts-toggle-btn";
    ttsToggleBtn.type = "button";
    ttsToggleBtn.title = "Toggle Text-to-Speech Controls";
    ttsToggleBtn.innerHTML = "🔊";
    // put after modal close button for visual consistency
    modalCloseBtn.after(ttsToggleBtn);

    const ttsWrap = document.createElement("div");
    ttsWrap.className = "tts-controls"; // CSS controls visibility with .show
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

    // language preference for voice selection
    const cardLang = card.dataset.lang || document.documentElement.lang || "pa-IN";
    const langPref = getLangCode(cardLang);

    // toggle show class (matches your CSS .tts-controls.show)
    ttsToggleBtn.addEventListener("click", () => {
      ttsWrap.classList.toggle("show");
      if (ttsWrap.classList.contains("show")) {
        // small delay to let layout settle then scroll into view
        setTimeout(() => ttsWrap.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
      }
    });

    // init TTS
    initTTSControls(ttsWrap, modalText, langPref);

    // present modal
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
    stopTTSGlobal();
    if (lastFocusBeforeModal) lastFocusBeforeModal.focus();

    // restore plain text: replace any .tts-word-span with text nodes
    qa(".tts-word-span").forEach((s) => {
      if (s.parentNode) s.parentNode.replaceChild(document.createTextNode(s.textContent), s);
    });
  }

  function modalKeyHandler(e) {
    if (e.key === "Escape") closeNewsModal();
    if (e.key === "Tab") {
      const focusables = qa("#news-modal button, #news-modal a, #news-modal [tabindex]:not([tabindex='-1'])");
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
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
  newsModal.addEventListener("click", (e) => { if (e.target === newsModal) closeNewsModal(); });

  /* -------------------------
     Image modal
  ------------------------- */
  qa(".enlarge-btn").forEach((b) => b.addEventListener("click", () => {
    const card = b.closest("article.news-card");
    const imgSrc = card.dataset.image;
    if (!imgSrc) return;
    modalImage.src = imgSrc;
    modalImage.alt = card.dataset.title || "";
    imageModal.setAttribute("aria-hidden", "false");
    imageModal.style.display = "flex";
    document.body.style.overflow = "hidden";
    imageModalClose.focus();
  }));
  imageModalClose.addEventListener("click", () => {
    imageModal.setAttribute("aria-hidden", "true");
    imageModal.style.display = "none";
    modalImage.src = "";
    document.body.style.overflow = "";
  });
  imageModal.addEventListener("click", (e) => { if (e.target === imageModal) {
    imageModal.setAttribute("aria-hidden", "true"); imageModal.style.display = "none"; modalImage.src = ""; document.body.style.overflow = "";
  } });

  /* -------------------------
     Related articles
  ------------------------- */
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
    if (!top.length) return;

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
          <div class="related-meta">${preview.slice(0,80)}…</div>
          <div style="margin-top:.5rem"><button class="related-open" data-id="${c.id}">ਖੋਲੋ</button></div>
        </div>
      `;
      list.appendChild(rel);
    });

    wrap.appendChild(list);
    modalText.parentNode.appendChild(wrap);

    qa(".related-open", wrap).forEach((btn) => btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const target = document.getElementById(id);
      if (target) {
        closeNewsModal();
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.classList.add("highlighted");
        setTimeout(() => target.classList.remove("highlighted"), 1600);
      }
    }));
  }

  /* -------------------------
     TTS: voice loading and controls
  ------------------------- */
  let synth = window.speechSynthesis;
  let voiceCache = [];
  let ttsState = { playing: false, paused: false, utter: null };

  // Ensure voices are loaded: prefer onvoiceschanged event and also poll as fallback.
  function ensureVoicesLoaded(timeout = 2500) {
    return new Promise((resolve) => {
      try {
        const vs = synth ? synth.getVoices() : [];
        if (vs && vs.length > 0) { voiceCache = vs; return resolve(vs); }
      } catch (e) { /* ignore */ }

      let resolved = false;
      const timerStart = performance.now();

      function tryResolve() {
        const v = synth ? synth.getVoices() : [];
        if (v && v.length > 0) {
          voiceCache = v;
          resolved = true;
          return resolve(v);
        }
        if (performance.now() - timerStart > timeout) {
          voiceCache = v || [];
          resolved = true;
          return resolve(voiceCache);
        }
        setTimeout(tryResolve, 120);
      }

      if (synth && "onvoiceschanged" in synth) {
        synth.onvoiceschanged = () => {
          const v = synth.getVoices();
          if (v && v.length > 0 && !resolved) {
            voiceCache = v;
            resolved = true;
            resolve(v);
          }
        };
      }

      tryResolve();
    });
  }

  // Create voice select options grouped by preferred lang, english, others.
  function populateVoiceSelect(selectEl, langPref) {
    selectEl.innerHTML = "";
    const voices = voiceCache || [];
    const preferred = voices.filter(v => getLangCode(v.lang) === langPref);
    const english = voices.filter(v => getLangCode(v.lang) === "en" && getLangCode(v.lang) !== langPref);
    const others = voices.filter(v => !preferred.includes(v) && !english.includes(v));

    function addGroup(label, arr) {
      if (!arr.length) return;
      const og = document.createElement("optgroup");
      og.label = label;
      arr.forEach(v => {
        const opt = document.createElement("option");
        opt.value = `${v.name}||${v.lang}`;
        opt.textContent = `${v.name} (${v.lang})`;
        og.appendChild(opt);
      });
      selectEl.appendChild(og);
    }
    addGroup("Preferred", preferred);
    addGroup("English", english);
    addGroup("Other voices", others);

    if (selectEl.options.length === 0) {
      const opt = document.createElement("option");
      opt.value = "__default__";
      opt.textContent = "Default";
      selectEl.appendChild(opt);
    }
  }

  // Prepare modal text for TTS: replace visible paragraphs/lists with spans per word
  function prepareTextForTTS(container) {
    // remove any previous spans
    qa(".tts-word-span", container).forEach(s => {
      if (s.parentNode) s.parentNode.replaceChild(document.createTextNode(s.textContent), s);
    });

    // keep modal meta but exclude related sections
    const meta = container.querySelector(".modal-meta");
    const related = container.parentNode.querySelector(".modal-related");
    if (related) related.remove();

    // get text nodes to speak: p, li, headings
    const nodes = Array.from(container.querySelectorAll("p, li, h1, h2, h3, h4")).filter(n => n.textContent.trim());
    // make a read container
    const readWrap = document.createElement("div");
    readWrap.className = "tts-read-wrap";
    nodes.forEach(node => {
      const newEl = document.createElement(node.tagName);
      const words = stripHtml(node.innerHTML).trim().split(/\s+/).filter(Boolean);
      words.forEach((w, i) => {
        const span = document.createElement("span");
        span.className = "tts-word-span";
        span.textContent = w + (i < words.length - 1 ? " " : "");
        newEl.appendChild(span);
      });
      readWrap.appendChild(newEl);
    });

    // clear and reinsert: keep meta at top
    container.innerHTML = "";
    if (meta) container.appendChild(meta);
    container.appendChild(readWrap);
  }

  // Core TTS controller for a modal instance
  async function initTTSControls(wrapper, modalTextContainer, langPref = "pa") {
    // wrapper: .tts-controls element (hidden by CSS until .show)
    const playBtn = wrapper.querySelector(".tts-play");
    const pauseBtn = wrapper.querySelector(".tts-pause");
    const stopBtn = wrapper.querySelector(".tts-stop");
    const select = wrapper.querySelector("#tts-voices");
    const status = wrapper.querySelector(".tts-status");
    const progress = wrapper.querySelector(".tts-progress");

    // Load voices
    await ensureVoicesLoaded(2500);
    populateVoiceSelect(select, langPref);

    // Local state
    let wordSpans = [];

    // Prepare text and word spans
    function prepare() {
      prepareTextForTTS(modalTextContainer);
      wordSpans = qa(".tts-word-span", modalTextContainer);
    }

    // Map charIndex to span index (best-effort)
    function highlightForCharIndex(charIndex) {
      if (!wordSpans || !wordSpans.length) return;
      let cum = 0;
      for (let i = 0; i < wordSpans.length; i++) {
        const len = (wordSpans[i].textContent || "").length;
        const start = cum;
        const end = cum + len;
        if (charIndex >= start && charIndex < end) {
          qa(".tts-highlight", modalTextContainer).forEach(x => x.classList.remove("tts-highlight"));
          wordSpans[i].classList.add("tts-highlight");
          // ensure visible
          const container = modalTextContainer.closest(".modal-content");
          if (container) {
            const r = wordSpans[i].getBoundingClientRect();
            const cr = container.getBoundingClientRect();
            if (r.top < cr.top + 40 || r.bottom > cr.bottom - 40) wordSpans[i].scrollIntoView({ behavior: "smooth", block: "center" });
          } else {
            wordSpans[i].scrollIntoView({ behavior: "smooth", block: "center" });
          }
          return;
        }
        cum = end;
      }
    }

    // Speak full content (single utterance) with boundary highlighting if available
    function speakFull() {
      if (!speechSynthesis) {
        status.textContent = "TTS not supported";
        return;
      }
      // prepare spans
      prepare();
      if (!wordSpans.length) {
        status.textContent = "ਕੋਈ ਪਾਠ ਨਹੀਂ";
        return;
      }
      const fullText = wordSpans.map(s => s.textContent).join("");

      // create utterance
      const utter = new SpeechSynthesisUtterance(fullText);
      const sel = select.value;
      const [vname, vlang] = (sel || "").split("||");
      const chosen = voiceCache.find(v => `${v.name}` === vname && v.lang === vlang);
      if (chosen) {
        utter.voice = chosen;
        utter.lang = chosen.lang;
      } else {
        // fallback to langPref or document lang
        utter.lang = langPref ? (langPref + (langPref.includes("-") ? "" : "-IN")) : (document.documentElement.lang || "pa-IN");
      }
      utter.rate = 1.03;
      utter.pitch = 1.0;

      // boundary highlight if available
      let charBase = 0;
      utter.onboundary = (ev) => {
        if (ev.name === "word") {
          // The boundary charIndex is relative to utterance; highlight by that index
          highlightForCharIndex(ev.charIndex);
        }
      };

      utter.onstart = () => {
        ttsState.playing = true;
        ttsState.paused = false;
        ttsState.utter = utter;
        playBtn.textContent = "⏸️ Pause";
        playBtn.setAttribute("aria-pressed", "true");
        status.textContent = "Playing...";
      };

      utter.onend = () => {
        ttsState.playing = false;
        ttsState.paused = false;
        ttsState.utter = null;
        playBtn.textContent = "▶️ Play";
        playBtn.setAttribute("aria-pressed", "false");
        status.textContent = "Finished";
        qa(".tts-highlight", modalTextContainer).forEach(x => x.classList.remove("tts-highlight"));
        if (progress) progress.textContent = "";
      };

      utter.onerror = (err) => {
        ttsState.playing = false;
        ttsState.paused = false;
        ttsState.utter = null;
        playBtn.textContent = "▶️ Play";
        playBtn.setAttribute("aria-pressed", "false");
        status.textContent = "Playback error";
        console.warn("TTS error:", err);
        qa(".tts-highlight", modalTextContainer).forEach(x => x.classList.remove("tts-highlight"));
      };

      speechSynthesis.speak(utter);
    }

    function pauseTTSLocal() {
      if (!speechSynthesis) return;
      if (speechSynthesis.speaking && !speechSynthesis.paused) {
        speechSynthesis.pause();
        ttsState.paused = true;
        ttsState.playing = false;
        playBtn.textContent = "▶️ Play";
        playBtn.setAttribute("aria-pressed", "false");
        status.textContent = "Paused";
      }
    }

    function resumeTTSLocal() {
      if (!speechSynthesis) return;
      if (speechSynthesis.paused) {
        speechSynthesis.resume();
        ttsState.paused = false;
        ttsState.playing = true;
        playBtn.textContent = "⏸️ Pause";
        playBtn.setAttribute("aria-pressed", "true");
        status.textContent = "Playing...";
      }
    }

    function stopTTSLocal() {
      if (!speechSynthesis) return;
      if (speechSynthesis.speaking || speechSynthesis.paused) speechSynthesis.cancel();
      ttsState.playing = false;
      ttsState.paused = false;
      ttsState.utter = null;
      playBtn.textContent = "▶️ Play";
      playBtn.setAttribute("aria-pressed", "false");
      status.textContent = "Stopped";
      qa(".tts-highlight", modalTextContainer).forEach(x => x.classList.remove("tts-highlight"));
      if (progress) progress.textContent = "";
    }

    // wire UI
    playBtn.addEventListener("click", () => {
      try {
        if (ttsState.playing && !ttsState.paused) {
          // pause
          pauseTTSLocal();
        } else if (ttsState.paused) {
          // resume
          resumeTTSLocal();
        } else {
          // start fresh
          speakFull();
        }
      } catch (err) {
        console.warn("Play error:", err);
      }
    });

    pauseBtn.addEventListener("click", pauseTTSLocal);
    stopBtn.addEventListener("click", stopTTSLocal);
  } // initTTSControls

  // Global stop (used when closing modal or Escape)
  function stopTTSGlobal() {
    if (speechSynthesis && (speechSynthesis.speaking || speechSynthesis.paused)) {
      speechSynthesis.cancel();
    }
    ttsState = { playing: false, paused: false, utter: null };
    qa(".tts-highlight").forEach(x => x.classList.remove("tts-highlight"));
    qa(".tts-play").forEach(btn => { btn.textContent = "▶️ Play"; btn.setAttribute("aria-pressed", "false"); });
    qa(".tts-status").forEach(el => el.textContent = "");
  }

  /* -------------------------
     On-load hash highlight
  ------------------------- */
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

  /* -------------------------
     Global Escape handler
  ------------------------- */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      qa(".modal-overlay[aria-hidden='false']").forEach(m => {
        m.setAttribute("aria-hidden", "true");
        m.style.display = "none";
        document.body.style.overflow = "";
      });
      stopTTSGlobal();
    }
  });
}); // DOMContentLoaded end
