/* news.js — PattiBytes (Updated)
   - Consistent full-month date formatting (pa-IN)
   - Advanced TTS (voice loading, voice select, rate/pitch, highlight)
   - Related "ਖੋਲੋ" uses the same link that Copy Link provides
   - TTS toggle toggles both .show and .active classes
   - Cleanup of event listeners on modal close
*/

document.addEventListener("DOMContentLoaded", () => {
  /* -------------------------
     Small helpers
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
  const getLangCode = c => (c ? String(c).split(/[-_]/)[0].toLowerCase() : "");

  /* -------------------------
     Date formatting (consistent)
  ------------------------- */
  const LOCALE = "pa-IN";
  const dateFormatter = new Intl.DateTimeFormat(LOCALE, { year: "numeric", month: "long", day: "2-digit" });

  function formatFullDateISO(iso) {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return "";
      return dateFormatter.format(d);
    } catch {
      return "";
    }
  }

  function timeAgo(iso) {
    if (!iso) return "";
    const then = new Date(iso);
    if (isNaN(then.getTime())) return "";
    const now = new Date();
    const diff = Math.round((now - then) / 1000);
    if (diff < 0) {
      if (Math.abs(diff) <= 60) return "ਹੁਣੇ ਹੀ";
      return formatFullDateISO(iso);
    }
    if (diff < 60) return `${diff} sec ਪਹਿਲਾਂ`;
    const min = Math.floor(diff / 60);
    if (min < 60) return `${min} ਮਿੰਟ ਪਹਿਲਾਂ`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} ਘੰਟੇ ਪਹਿਲਾਂ`;
    const days = Math.floor(hr / 24);
    if (days < 7) return `${days} ਦਿਨ ਪਹਿਲਾਂ`;
    return formatFullDateISO(iso);
  }

  /* -------------------------
     Elements
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
     Copy Link: keep same behavior (and rely on data-url if present)
  ------------------------- */
  qa(".copy-link").forEach(btn => {
    btn.addEventListener("click", async () => {
      const article = btn.closest("article.news-card");
      if (!article || !article.id) return;
      // prefer data-url if present (server-side)
      const dataUrl = btn.dataset.url;
      const fallback = `${window.location.origin}${window.location.pathname}#${article.id}`;
      const urlToCopy = dataUrl && dataUrl !== "#" ? dataUrl : fallback;
      try {
        await navigator.clipboard.writeText(urlToCopy);
      } catch {
        const ta = document.createElement("textarea");
        ta.value = urlToCopy;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      btn.classList.add("copied");
      const prev = btn.textContent;
      btn.textContent = "✔️";
      setTimeout(() => { btn.classList.remove("copied"); btn.textContent = prev; }, 1400);
    });
  });

  /* -------------------------
     Populate read-time + formatted date on cards
  ------------------------- */
  allCards.forEach(card => {
    const contentRaw = card.dataset.content ? decodeHtmlEntities(card.dataset.content) : (card.dataset.preview || "");
    const mins = readMinutes(wordCount(contentRaw));
    const readEl = card.querySelector(".read-time");
    if (readEl) readEl.textContent = `${mins} ਮਿੰਟ ਪੜ੍ਹਨ ਲਈ`;

    const pub = card.querySelector(".published");
    const iso = card.dataset.date;
    if (pub && iso) {
      const full = formatFullDateISO(iso);
      if (full) {
        pub.textContent = full;
        pub.setAttribute("datetime", iso);
        pub.title = full;
        // add relative if not already
        const existingRel = pub.parentNode.querySelector(".published-relative");
        if (existingRel) existingRel.remove();
        const rel = document.createElement("span");
        rel.className = "published-relative";
        rel.textContent = ` (${timeAgo(iso)})`;
        pub.parentNode.insertBefore(rel, pub.nextSibling);
      }
    }
  });

  /* -------------------------
     Pagination / infinite scroll
  ------------------------- */
  const PAGE_SIZE = 6;
  let pageIndex = 0;
  const totalCards = allCards.length;
  allCards.forEach(c => c.style.display = "none");

  function showNextPage() {
    const start = pageIndex * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const slice = allCards.slice(start, end);
    slice.forEach(c => c.style.display = "");
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

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) showNextPage();
    });
  }, { root: null, rootMargin: "200px", threshold: 0.01 });
  observer.observe(sentinel);

  /* -------------------------
     Modal open/close with TTS and related
  ------------------------- */

  let lastFocusBeforeModal = null;

  function decodeHtmlEntities(str) {
    // handle common HTML-escaped content
    const ta = document.createElement("textarea");
    ta.innerHTML = str || "";
    return ta.value;
  }

  function openNewsModal(card) {
    if (!card) return;
    lastFocusBeforeModal = document.activeElement;

    // set title
    modalTitle.textContent = card.dataset.title || "";

    // set media
    modalMedia.innerHTML = "";
    if (card.dataset.image) {
      const img = document.createElement("img");
      img.src = card.dataset.image;
      img.alt = card.dataset.title || "";
      img.loading = "lazy";
      img.style.maxWidth = "100%";
      img.style.borderRadius = "8px";
      modalMedia.appendChild(img);
    }

    // set content
    const raw = card.dataset.content ? decodeHtmlEntities(card.dataset.content) : "";
    modalText.innerHTML = raw || `<p>${card.dataset.preview || ""}</p>`;

    // add modal meta (author + formatted date)
    const metaWrap = document.createElement("div");
    metaWrap.className = "modal-meta";
    const d = card.dataset.date ? formatFullDateISO(card.dataset.date) : "";
    metaWrap.innerHTML = `<p style="margin:0 0 .5rem 0;"><strong>${card.dataset.author || ""}</strong> · ${d}</p>`;
    modalText.prepend(metaWrap);

    // Related articles
    populateRelated(card);

    // Remove previous TTS UI if any
    const prevToggle = newsModal.querySelector(".tts-toggle-btn");
    if (prevToggle) prevToggle.remove();
    const prevControls = newsModal.querySelector(".tts-controls");
    if (prevControls) {
      // cleanup attached handlers if stored
      if (prevControls._cleanup) prevControls._cleanup();
      prevControls.remove();
    }

    // create TTS toggle
    const ttsToggle = document.createElement("button");
    ttsToggle.className = "tts-toggle-btn";
    ttsToggle.type = "button";
    ttsToggle.title = "Toggle Text-to-Speech Controls";
    ttsToggle.innerHTML = "🔊";
    modalCloseBtn.after(ttsToggle);

    // TTS controls (hidden; CSS uses .show)
    const ttsWrap = document.createElement("div");
    ttsWrap.className = "tts-controls";
    ttsWrap.innerHTML = `
      <div class="tts-controls-row" style="display:flex;align-items:center;gap:.5rem;">
        <button class="tts-play" aria-pressed="false" title="Play">▶️</button>
        <button class="tts-pause" title="Pause">⏸️</button>
        <button class="tts-stop" title="Stop">⏹️</button>
        <div class="tts-progress" aria-hidden="true" style="margin-left:.5rem;"></div>
      </div>
      <div class="tts-controls-row" style="display:flex;gap:.5rem;align-items:center;margin-top:.5rem;">
        <label for="tts-voices" class="sr-only">Voice</label>
        <select id="tts-voices" aria-label="Choose voice"></select>
        <label for="tts-rate" class="sr-only">Rate</label>
        <input id="tts-rate" type="range" min="0.6" max="1.4" step="0.05" value="1" aria-label="Speech rate" />
        <label for="tts-pitch" class="sr-only">Pitch</label>
        <input id="tts-pitch" type="range" min="0.6" max="1.6" step="0.05" value="1" aria-label="Speech pitch" />
        <span class="tts-status" aria-live="polite" style="margin-left:.5rem;"></span>
      </div>
    `;
    modalText.parentNode.insertBefore(ttsWrap, modalText.nextSibling);

    // language preference for voice selection
    const cardLang = card.dataset.lang || document.documentElement.lang || "pa-IN";
    const langPref = getLangCode(cardLang);

    // Toggle click toggles both .show and .active to match your CSS
    ttsToggle.addEventListener("click", () => {
      const open = ttsWrap.classList.toggle("show");
      ttsToggle.classList.toggle("active", open);
      if (open) setTimeout(() => ttsWrap.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    });

    // Initialize TTS controls
    initTTSControls(ttsWrap, modalText, langPref);

    // show modal
    newsModal.setAttribute("aria-hidden", "false");
    newsModal.style.display = "flex";
    document.body.style.overflow = "hidden";
    modalCloseBtn.focus();
    document.addEventListener("keydown", modalKeyHandler);
  }

  function closeNewsModal() {
    // stop TTS globally and cleanup
    stopTTSGlobal();
    newsModal.setAttribute("aria-hidden", "true");
    newsModal.style.display = "none";
    document.body.style.overflow = "";
    document.removeEventListener("keydown", modalKeyHandler);
    if (lastFocusBeforeModal) lastFocusBeforeModal.focus();

    // restore original text nodes where we added word spans
    qa(".tts-word-span").forEach(span => {
      if (span.parentNode) span.parentNode.replaceChild(document.createTextNode(span.textContent), span);
    });
  }

  function modalKeyHandler(e) {
    if (e.key === "Escape") closeNewsModal();
    if (e.key === "Tab") {
      const focusables = qa("#news-modal button, #news-modal a, #news-modal [tabindex]:not([tabindex='-1'])");
      if (!focusables.length) return;
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
  }

  qa(".read-more-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const card = btn.closest("article.news-card");
      openNewsModal(card);
    });
  });

  modalCloseBtn.addEventListener("click", closeNewsModal);
  newsModal.addEventListener("click", e => { if (e.target === newsModal) closeNewsModal(); });

  /* -------------------------
     Image modal
  ------------------------- */
  qa(".enlarge-btn").forEach(b => {
    b.addEventListener("click", () => {
      const card = b.closest("article.news-card");
      const src = card.dataset.image;
      if (!src) return;
      modalImage.src = src;
      modalImage.alt = card.dataset.title || "";
      imageModal.setAttribute("aria-hidden", "false");
      imageModal.style.display = "flex";
      document.body.style.overflow = "hidden";
      imageModalClose.focus();
    });
  });

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

  /* -------------------------
     Related articles: use same link as copy-link's data-url
  ------------------------- */
  function populateRelated(activeCard) {
    const existing = modalText.parentNode.querySelector(".modal-related");
    if (existing) existing.remove();

    const tags = (activeCard.dataset.tags || "").split(/\s+/).filter(Boolean);
    const titleWords = (activeCard.dataset.title || "").toLowerCase().split(/\W+/).filter(Boolean);

    const scores = [];
    allCards.forEach(c => {
      if (c === activeCard) return;
      let score = 0;
      const otherTags = (c.dataset.tags || "").split(/\s+/).filter(Boolean);
      score += otherTags.filter(t => tags.includes(t)).length * 10;
      const otherTitleWords = (c.dataset.title || "").toLowerCase().split(/\W+/).filter(Boolean);
      score += otherTitleWords.filter(w => titleWords.includes(w)).length * 3;
      if (c.classList.contains("featured-card")) score += 2;
      if (score > 0) scores.push({ card: c, score });
    });

    scores.sort((a, b) => b.score - a.score);
    const top = scores.slice(0, 4).map(s => s.card);
    if (!top.length) return;

    const wrap = document.createElement("div");
    wrap.className = "modal-related";
    wrap.innerHTML = `<h4>ਤੁਹਾਨੂੰ ਇਹ ਵੀ ਪਸੰਦ ਆ ਸਕਦਾ ਹੈ</h4>`;
    const list = document.createElement("div");
    list.className = "related-list";

    top.forEach(c => {
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

    // attach handler: if related card's original copy-link has data-url, redirect to that.
    qa(".related-open", wrap).forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        // find the card on the page by id
        const targetCard = document.getElementById(id);
        let redirectUrl = null;

        if (targetCard) {
          // first preference: copy-link data-url inside that target card
          const copyBtn = targetCard.querySelector(".copy-link");
          if (copyBtn && copyBtn.dataset && copyBtn.dataset.url && copyBtn.dataset.url !== "#") {
            redirectUrl = copyBtn.dataset.url;
          } else {
            // second preference: read-more button's data-url inside that card
            const rm = targetCard.querySelector(".read-more-btn");
            if (rm && rm.dataset && rm.dataset.url && rm.dataset.url !== "#") {
              redirectUrl = rm.dataset.url;
            } else {
              // fallback: construct current-page URL with hash
              redirectUrl = `${window.location.origin}${window.location.pathname}#${id}`;
            }
          }
        } else {
          // If the card isn't on the page (maybe different page), try to find a global link in DOM matching the id
          // Search for any element with data-id or data-url referencing the id
          const copyGlob = document.querySelector(`.copy-link[data-url*="#${id}"], .copy-link[data-url*="${id}"]`);
          if (copyGlob && copyGlob.dataset && copyGlob.dataset.url) redirectUrl = copyGlob.dataset.url;
          else redirectUrl = `/#${id}`; // fallback
        }

        // Ensure hash present: if redirectUrl doesn't already include a hash for the id, append it
        try {
          const hasHash = redirectUrl.includes(`#${id}`);
          if (!hasHash) {
            // if redirectUrl already has a hash for something else, replace; otherwise append
            if (redirectUrl.includes("#")) {
              redirectUrl = redirectUrl.split("#")[0] + `#${id}`;
            } else {
              redirectUrl = redirectUrl + `#${id}`;
            }
          }
        } catch { /* noop */ }

        // navigate
        window.location.href = redirectUrl;
      });
    });
  }

  /* -------------------------
     TTS: robust voice loader + controls
     - loads voices safely
     - play / pause / resume / stop
     - word highlighting with onboundary (best-effort)
     - toggles .show on controls & .active on toggle button
  ------------------------- */
  const synth = window.speechSynthesis || null;
  let voiceCache = [];

  function ensureVoicesLoaded(timeout = 2500) {
    return new Promise(resolve => {
      try {
        const v = synth ? synth.getVoices() : [];
        if (v && v.length) { voiceCache = v; return resolve(v); }
      } catch {}
      let done = false;
      const start = performance.now();
      function poll() {
        const vs = synth ? synth.getVoices() : [];
        if (vs && vs.length) {
          voiceCache = vs; done = true; return resolve(vs);
        }
        if (performance.now() - start > timeout) {
          voiceCache = vs || []; done = true; return resolve(voiceCache);
        }
        setTimeout(poll, 120);
      }
      if (synth && "onvoiceschanged" in synth) {
        synth.onvoiceschanged = () => {
          const vs = synth.getVoices();
          if (vs && vs.length && !done) { voiceCache = vs; done = true; resolve(vs); }
        };
      }
      poll();
    });
  }

  function groupVoices(selectEl, langPref) {
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
    if (!selectEl.options.length) {
      const o = document.createElement("option");
      o.value = "__default__";
      o.textContent = "Default";
      selectEl.appendChild(o);
    }
  }

  function prepareTextForTTS(container) {
    // remove existing spans
    qa(".tts-word-span", container).forEach(s => {
      if (s.parentNode) s.parentNode.replaceChild(document.createTextNode(s.textContent), s);
    });

    const meta = container.querySelector(".modal-meta");
    const nodes = Array.from(container.querySelectorAll("p, li, h1, h2, h3, h4")).filter(n => n.textContent.trim());
    const wrap = document.createElement("div");
    wrap.className = "tts-read-wrap";
    nodes.forEach(n => {
      const newEl = document.createElement(n.tagName);
      const words = stripHtml(n.innerHTML).trim().split(/\s+/).filter(Boolean);
      words.forEach((w, i) => {
        const span = document.createElement("span");
        span.className = "tts-word-span";
        span.textContent = w + (i < words.length - 1 ? " " : "");
        newEl.appendChild(span);
      });
      wrap.appendChild(newEl);
    });
    container.innerHTML = "";
    if (meta) container.appendChild(meta);
    container.appendChild(wrap);
  }

  function highlightByCharIndex(container, charIndex) {
    const spans = qa(".tts-word-span", container);
    if (!spans.length) return;
    let cum = 0;
    for (let i = 0; i < spans.length; i++) {
      const len = (spans[i].textContent || "").length;
      if (charIndex >= cum && charIndex < cum + len) {
        qa(".tts-highlight", container).forEach(x => x.classList.remove("tts-highlight"));
        spans[i].classList.add("tts-highlight");
        // ensure visible in modal
        const modalContent = container.closest(".modal-content");
        if (modalContent) {
          const r = spans[i].getBoundingClientRect();
          const cr = modalContent.getBoundingClientRect();
          if (r.top < cr.top + 40 || r.bottom > cr.bottom - 40) spans[i].scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
          spans[i].scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return;
      }
      cum += len;
    }
  }

  // initialize controls inside wrapper for given modalTextContainer
  async function initTTSControls(wrapper, modalTextContainer, langPref = "pa") {
    const playBtn = wrapper.querySelector(".tts-play");
    const pauseBtn = wrapper.querySelector(".tts-pause");
    const stopBtn = wrapper.querySelector(".tts-stop");
    const select = wrapper.querySelector("#tts-voices");
    const rateInput = wrapper.querySelector("#tts-rate");
    const pitchInput = wrapper.querySelector("#tts-pitch");
    const status = wrapper.querySelector(".tts-status");
    const progress = wrapper.querySelector(".tts-progress");

    // style play button circular (inline so CSS change not required)
    playBtn.style.width = playBtn.style.height = "46px";
    playBtn.style.borderRadius = "50%";
    playBtn.style.display = "inline-flex";
    playBtn.style.alignItems = playBtn.style.justifyContent = "center";
    playBtn.style.fontSize = "18px";
    playBtn.style.border = "none";
    playBtn.style.cursor = "pointer";
    playBtn.style.boxShadow = "0 2px 8px rgba(0,0,0,0.12)";
    playBtn.style.background = getComputedStyle(document.documentElement).getPropertyValue("--accent-color") || "#ff2d95";
    playBtn.style.color = "#fff";

    await ensureVoicesLoaded(2500);
    groupVoices(select, langPref);

    // persist voice/rate/pitch (optional)
    try {
      const saved = JSON.parse(localStorage.getItem("pattibytes_tts_settings") || "{}");
      if (saved.voice) {
        const opt = Array.from(select.options).find(o => o.value === saved.voice);
        if (opt) select.value = saved.voice;
      }
      if (saved.rate && rateInput) rateInput.value = saved.rate;
      if (saved.pitch && pitchInput) pitchInput.value = saved.pitch;
    } catch {}

    function saveSettings() {
      const data = { voice: select.value, rate: rateInput ? rateInput.value : 1, pitch: pitchInput ? pitchInput.value : 1 };
      try { localStorage.setItem("pattibytes_tts_settings", JSON.stringify(data)); } catch {}
    }
    select.addEventListener("change", saveSettings);
    rateInput && rateInput.addEventListener("change", saveSettings);
    pitchInput && pitchInput.addEventListener("change", saveSettings);

    let currentUtter = null;
    let playing = false;
    let paused = false;

    function stopLocal() {
      if (synth && (synth.speaking || synth.paused)) synth.cancel();
      playing = false; paused = false; currentUtter = null;
      playBtn.textContent = "▶️";
      playBtn.setAttribute("aria-pressed", "false");
      status.textContent = "Stopped";
      qa(".tts-highlight", modalTextContainer).forEach(x => x.classList.remove("tts-highlight"));
      if (progress) progress.textContent = "";
    }

    function pauseLocal() {
      if (synth && synth.speaking && !synth.paused) {
        synth.pause(); paused = true; playing = false;
        playBtn.textContent = "▶️"; playBtn.setAttribute("aria-pressed", "false");
        status.textContent = "Paused";
      }
    }

    function resumeLocal() {
      if (synth && synth.paused) {
        synth.resume(); paused = false; playing = true;
        playBtn.textContent = "⏸️"; playBtn.setAttribute("aria-pressed", "true");
        status.textContent = "Playing";
      }
    }

    function startSpeak() {
      if (!synth) { status.textContent = "TTS not supported"; return; }

      // prepare text spans
      prepareTextForTTS(modalTextContainer);
      const spans = qa(".tts-word-span", modalTextContainer);
      if (!spans.length) { status.textContent = "No text to read"; return; }

      const fullText = spans.map(s => s.textContent).join("");

      const utter = new SpeechSynthesisUtterance(fullText);
      // choose voice
      const sel = select.value;
      const [name, lang] = (sel || "").split("||");
      const chosen = voiceCache.find(v => v.name === name && v.lang === lang);
      if (chosen) { utter.voice = chosen; utter.lang = chosen.lang; }
      else utter.lang = langPref ? `${langPref}-IN` : (document.documentElement.lang || "pa-IN");

      utter.rate = rateInput ? parseFloat(rateInput.value) || 1 : 1;
      utter.pitch = pitchInput ? parseFloat(pitchInput.value) || 1 : 1;

      utter.onboundary = (ev) => {
        if (ev.name === "word") {
          highlightByCharIndex(modalTextContainer, ev.charIndex);
          if (progress) {
            const total = qa(".tts-word-span", modalTextContainer).length || 1;
            // approx index by scanning spans cumulatively until char index reached
            let cum = 0, idx = 0;
            const spans = qa(".tts-word-span", modalTextContainer);
            for (let i = 0; i < spans.length; i++) {
              cum += (spans[i].textContent || "").length;
              if (ev.charIndex <= cum) { idx = i + 1; break; }
            }
            const pct = Math.min(100, Math.round((idx / total) * 100));
            progress.textContent = ` ${pct}%`;
          }
        }
      };

      utter.onstart = () => {
        playing = true; paused = false; currentUtter = utter;
        playBtn.textContent = "⏸️"; playBtn.setAttribute("aria-pressed", "true");
        status.textContent = "Playing";
      };

      utter.onend = () => {
        playing = false; paused = false; currentUtter = null;
        playBtn.textContent = "▶️"; playBtn.setAttribute("aria-pressed", "false");
        status.textContent = "Finished";
        qa(".tts-highlight", modalTextContainer).forEach(x => x.classList.remove("tts-highlight"));
        if (progress) progress.textContent = "";
      };

      utter.onerror = (err) => {
        console.warn("TTS error", err);
        playing = false; paused = false; currentUtter = null;
        playBtn.textContent = "▶️"; playBtn.setAttribute("aria-pressed", "false");
        status.textContent = "Playback error";
        qa(".tts-highlight", modalTextContainer).forEach(x => x.classList.remove("tts-highlight"));
      };

      synth.speak(utter);
    }

    // wire controls
    playBtn.addEventListener("click", () => {
      if (playing && !paused) { pauseLocal(); return; }
      if (paused) { resumeLocal(); return; }
      startSpeak();
    });
    pauseBtn.addEventListener("click", pauseLocal);
    stopBtn.addEventListener("click", stopLocal);

    // keyboard shortcuts while modal open
    function ttsKeyHandler(e) {
      if (e.code === "Space") {
        e.preventDefault();
        if (playing && !paused) pauseLocal();
        else if (paused) resumeLocal();
        else startSpeak();
      } else if (e.key && e.key.toLowerCase() === "s") {
        e.preventDefault();
        stopLocal();
      }
    }
    document.addEventListener("keydown", ttsKeyHandler);

    // expose cleanup for modal close
    wrapper._cleanup = () => {
      try { document.removeEventListener("keydown", ttsKeyHandler); } catch {}
      try { stopLocal(); } catch {}
    };
  }

  function stopTTSGlobal() {
    if (synth && (synth.speaking || synth.paused)) synth.cancel();
    // cleanup any tts-controls wrappers
    qa(".tts-controls").forEach(w => {
      if (w._cleanup) w._cleanup();
      try { w._cleanup = null; } catch {}
      if (w._stopLocal) w._stopLocal = null;
    });
    qa(".tts-highlight").forEach(h => h.classList.remove("tts-highlight"));
    qa(".tts-play").forEach(b => { b.textContent = "▶️"; b.setAttribute("aria-pressed", "false"); });
    qa(".tts-status").forEach(s => s.textContent = "");
    qa(".tts-progress").forEach(p => p.textContent = "");
  }

  /* -------------------------
     Hash-on-load highlight
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
     Global Escape: close modals + stop TTS
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

  /* -------------------------
     Utility: decode HTML entities safely
  ------------------------- */
  function decodeHtmlEntities(str) {
    const ta = document.createElement("textarea");
    ta.innerHTML = str || "";
    return ta.value;
  }

  /* -------------------------
     End
  ------------------------- */
});
