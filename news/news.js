/* news.js — PattiBytes (Full replacement)
   - Robust date formatting (Intl DateTimeFormat 'pa-IN')
   - Infinite scroll + accessible modal + related
   - Advanced TTS: voice loading, voice selection, circular play/pause,
     pause/resume/stop, rate/pitch sliders, persisted settings, keyboard shortcuts, highlighting
*/

document.addEventListener("DOMContentLoaded", () => {
  /* ------------------------
     Basic helpers
  ------------------------ */
  const q = (sel, ctx = document) => (ctx || document).querySelector(sel);
  const qa = (sel, ctx = document) => Array.from((ctx || document).querySelectorAll(sel));
  const stripHtml = (html = "") => {
    const d = document.createElement("div");
    d.innerHTML = html;
    return d.textContent || d.innerText || "";
  };
  const wordCount = (t = "") => (t || "").trim().split(/\s+/).filter(Boolean).length;
  const readMinutes = (words, wpm = 200) => Math.max(1, Math.round(words / wpm));
  const getLangCode = (code) => (code ? String(code).split(/[-_]/)[0].toLowerCase() : "");
  const storage = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return localStorage.getItem(k); } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { localStorage.setItem(k, String(v)); } },
  };

  /* ------------------------
     Date formatting helpers (force consistent output)
  ------------------------ */
  const FORMAT_LOCALE = "pa-IN";
  const dateFormatter = new Intl.DateTimeFormat(FORMAT_LOCALE, { year: "numeric", month: "long", day: "2-digit" });
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
    const diffMs = now - then;
    const sec = Math.round(diffMs / 1000);
    if (sec < 0) {
      if (Math.abs(sec) <= 60) return "ਹੁਣੇ ਹੀ";
      return formatFullDateISO(iso);
    }
    if (sec < 60) return `${sec} sec ਪਹਿਲਾਂ`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} ਮਿੰਟ ਪਹਿਲਾਂ`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} ਘੰਟੇ ਪਹਿਲਾਂ`;
    const days = Math.floor(hr / 24);
    if (days < 7) return `${days} ਦਿਨ ਪਹਿਲਾਂ`;
    return formatFullDateISO(iso);
  }

  /* ------------------------
     DOM elements
  ------------------------ */
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

  /* ------------------------
     Copy link
  ------------------------ */
  qa(".copy-link").forEach(btn => {
    btn.addEventListener("click", async () => {
      const article = btn.closest("article.news-card");
      if (!article || !article.id) return;
      const url = `${window.location.origin}${window.location.pathname}#${article.id}`;
      try { await navigator.clipboard.writeText(url); }
      catch {
        const ta = document.createElement("textarea");
        ta.value = url; document.body.appendChild(ta);
        ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
      }
      btn.classList.add("copied");
      const prev = btn.textContent;
      btn.textContent = "✔️";
      setTimeout(() => { btn.classList.remove("copied"); btn.textContent = prev; }, 1400);
    });
  });

  /* ------------------------
     Populate read-time & date (cards)
  ------------------------ */
  allCards.forEach(card => {
    // read time
    const raw = (card.dataset.content && decodeURIComponent(card.dataset.content)) || stripHtml(card.dataset.preview || "");
    const mins = readMinutes(wordCount(raw));
    const readEl = card.querySelector(".read-time");
    if (readEl) readEl.textContent = `${mins} ਮਿੰਟ ਪੜ੍ਹਨ ਲਈ`;

    // published date - override visible text to strict full-month format and add relative
    const publishedEl = card.querySelector(".published");
    const iso = card.dataset.date;
    if (publishedEl && iso) {
      const full = formatFullDateISO(iso);
      if (full) {
        publishedEl.textContent = full;
        publishedEl.setAttribute("datetime", iso);
        publishedEl.title = full;
        // ensure single relative span
        const existing = publishedEl.parentNode.querySelector(".published-relative");
        if (existing) existing.remove();
        const rel = document.createElement("span");
        rel.className = "published-relative";
        rel.textContent = ` (${timeAgo(iso)})`;
        publishedEl.parentNode.insertBefore(rel, publishedEl.nextSibling);
      }
    }
  });

  /* ------------------------
     Pagination / infinite scroll
  ------------------------ */
  const PAGE_SIZE = 6;
  let pageIndex = 0;
  const totalCards = allCards.length;
  allCards.forEach(c => c.style.display = "none");
  function showNextPage() {
    const start = pageIndex * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    allCards.slice(start, end).forEach(c => c.style.display = "");
    pageIndex++;
    if (pageIndex * PAGE_SIZE >= totalCards && sentinel) {
      observer.unobserve(sentinel); sentinel.remove();
    }
  }
  showNextPage();
  const sentinel = document.createElement("div"); sentinel.className = "scroll-sentinel"; sentinel.style.height = "2px";
  newsGrid.after(sentinel);
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) showNextPage(); });
  }, { root: null, rootMargin: "200px", threshold: 0.01 });
  observer.observe(sentinel);

  /* ------------------------
     Modal open/close & populate content
  ------------------------ */
  let lastFocus = null;
  function openNewsModal(card) {
    if (!card) return;
    lastFocus = document.activeElement;
    // populate title/media/content
    modalTitle.textContent = card.dataset.title || "";
    modalMedia.innerHTML = "";
    if (card.dataset.image) {
      const img = document.createElement("img");
      img.src = card.dataset.image; img.alt = card.dataset.title || ""; img.loading = "lazy";
      img.style.maxWidth = "100%"; img.style.borderRadius = "8px";
      modalMedia.appendChild(img);
    }
    const rawContent = (card.dataset.content && decodeURIComponent(card.dataset.content)) || "";
    modalText.innerHTML = rawContent || `<p>${card.dataset.preview || ""}</p>`;

    // meta
    const meta = document.createElement("div"); meta.className = "modal-meta";
    const dateStr = card.dataset.date ? formatFullDateISO(card.dataset.date) : "";
    meta.innerHTML = `<p style="margin:0 0 .5rem 0;"><strong>${card.dataset.author || ""}</strong> · ${dateStr}</p>`;
    modalText.prepend(meta);

    // related
    populateRelated(card);

    // remove previous TTS UI to avoid duplicates
    const prevToggle = newsModal.querySelector(".tts-toggle-btn"); if (prevToggle) prevToggle.remove();
    const prevControls = newsModal.querySelector(".tts-controls"); if (prevControls) prevControls.remove();

    // add TTS toggle + controls
    const ttsToggle = document.createElement("button");
    ttsToggle.className = "tts-toggle-btn";
    ttsToggle.type = "button";
    ttsToggle.title = "Toggle Text-to-Speech";
    ttsToggle.innerHTML = "🔊";
    modalCloseBtn.after(ttsToggle);

    const ttsControls = document.createElement("div");
    ttsControls.className = "tts-controls";
    ttsControls.innerHTML = `
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
    modalText.parentNode.insertBefore(ttsControls, modalText.nextSibling);

    // lang pref
    const cardLang = card.dataset.lang || document.documentElement.lang || "pa-IN";
    const langPref = getLangCode(cardLang);

    // toggle behavior uses CSS .show (keeps CSS/JS aligned)
    ttsToggle.addEventListener("click", () => {
      ttsControls.classList.toggle("show");
      if (ttsControls.classList.contains("show")) setTimeout(() => ttsControls.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    });

    // init TTS UI & functionality
    initTTSControls(ttsControls, modalText, langPref, card);

    // show modal
    newsModal.setAttribute("aria-hidden", "false");
    newsModal.style.display = "flex";
    document.body.style.overflow = "hidden";
    modalCloseBtn.focus();
    document.addEventListener("keydown", modalKeyHandler);
  }

  function closeNewsModal() {
    // stop TTS and close
    stopTTSGlobal();
    newsModal.setAttribute("aria-hidden", "true");
    newsModal.style.display = "none";
    document.body.style.overflow = "";
    document.removeEventListener("keydown", modalKeyHandler);
    if (lastFocus) lastFocus.focus();
    // restore any tts spans to plain text
    qa(".tts-word-span").forEach(s => { if (s.parentNode) s.parentNode.replaceChild(document.createTextNode(s.textContent), s); });
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

  qa(".read-more-btn").forEach(btn => btn.addEventListener("click", e => {
    const card = btn.closest("article.news-card");
    openNewsModal(card);
  }));

  modalCloseBtn.addEventListener("click", closeNewsModal);
  newsModal.addEventListener("click", e => { if (e.target === newsModal) closeNewsModal(); });

  /* ------------------------
     Image modal
  ------------------------ */
  qa(".enlarge-btn").forEach(b => b.addEventListener("click", () => {
    const card = b.closest("article.news-card"); const src = card.dataset.image; if (!src) return;
    modalImage.src = src; modalImage.alt = card.dataset.title || "";
    imageModal.setAttribute("aria-hidden", "false"); imageModal.style.display = "flex"; document.body.style.overflow = "hidden";
    imageModalClose.focus();
  }));
  imageModalClose.addEventListener("click", () => { imageModal.setAttribute("aria-hidden", "true"); imageModal.style.display = "none"; modalImage.src = ""; document.body.style.overflow = ""; });
  imageModal.addEventListener("click", e => { if (e.target === imageModal) { imageModal.setAttribute("aria-hidden", "true"); imageModal.style.display = "none"; modalImage.src = ""; document.body.style.overflow = ""; } });

  /* ------------------------
     Related articles: open -> either redirect to article page (if URL found) or scroll on same page
  ------------------------ */
  function populateRelated(activeCard) {
    const existing = modalText.parentNode.querySelector(".modal-related"); if (existing) existing.remove();
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
      if (score > 0) scores.push({card: c, score});
    });
    scores.sort((a,b) => b.score - a.score);
    const top = scores.slice(0,4).map(s => s.card);
    if (!top.length) return;

    const wrap = document.createElement("div"); wrap.className = "modal-related";
    wrap.innerHTML = `<h4>ਤੁਹਾਨੂੰ ਇਹ ਵੀ ਪਸੰਦ ਆ ਸਕਦਾ ਹੈ</h4>`;
    const list = document.createElement("div"); list.className = "related-list";
    top.forEach(c => {
      const thumb = c.dataset.image || ""; const ct = c.dataset.title || ""; const prev = c.dataset.preview || "";
      const rel = document.createElement("div"); rel.className = "related-card";
      rel.innerHTML = `${thumb?`<img src="${thumb}" alt="${ct}" loading="lazy"/>`:''}
        <div class="related-info">
          <div class="related-title">${ct}</div>
          <div class="related-meta">${prev.slice(0,80)}…</div>
          <div style="margin-top:.5rem"><button class="related-open" data-id="${c.id}">ਖੋਲੋ</button></div>
        </div>`;
      list.appendChild(rel);
    });
    wrap.appendChild(list); modalText.parentNode.appendChild(wrap);

    qa(".related-open", wrap).forEach(btn => btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const target = document.getElementById(id);
      // try to find a url for that card (read-more button)
      let cardEl = null;
      if (target) cardEl = target;
      else {
        // try to find by matching title
        cardEl = allCards.find(c => (c.dataset.id || c.id) === id) || null;
      }
      if (cardEl) {
        // if the card itself has a read-more button with data-url (server-side), redirect to that URL + hash,
        // otherwise scroll within current page
        const rm = cardEl.querySelector(".read-more-btn");
        const url = rm && rm.dataset && rm.dataset.url ? rm.dataset.url : null;
        if (url && url !== "#") {
          // ensure url doesn't already have hash
          const sep = url.includes("#") ? "" : "#";
          window.location.href = `${url}${sep}${id}`;
        } else {
          // scroll and highlight
          target.scrollIntoView({behavior: "smooth", block: "center"});
          target.classList.add("highlighted");
          setTimeout(()=> target.classList.remove("highlighted"), 1600);
          closeNewsModal();
        }
      } else {
        // fallback: redirect to homepage with hash
        window.location.href = `/#${id}`;
      }
    }));
  }

  /* ------------------------
     TTS — advanced & robust
     Features:
      - safe voice loader (event+poll)
      - voice select grouped (preferred lang, english, others)
      - remembers voice/rate/pitch in localStorage
      - circular play/pause button (JS provides inline style)
      - rate & pitch sliders
      - keyboard shortcuts while modal open: Space -> play/pause, S -> stop
      - highlighting using onboundary, degrade gracefully
  ------------------------ */
  const synth = window.speechSynthesis || null;
  let voiceCache = [];
  const LS_VOICE = "pattibytes_tts_voice";
  const LS_RATE = "pattibytes_tts_rate";
  const LS_PITCH = "pattibytes_tts_pitch";

  function ensureVoicesLoaded(timeout = 2500) {
    return new Promise(resolve => {
      try {
        const vs = synth ? synth.getVoices() : [];
        if (vs && vs.length) { voiceCache = vs; return resolve(vs); }
      } catch {}
      let resolved = false;
      const start = performance.now();
      function poll() {
        const v = synth ? synth.getVoices() : [];
        if (v && v.length) {
          voiceCache = v; resolved = true; return resolve(v);
        }
        if (performance.now() - start > timeout) {
          voiceCache = v || []; resolved = true; return resolve(voiceCache);
        }
        setTimeout(poll, 120);
      }
      if (synth && "onvoiceschanged" in synth) {
        synth.onvoiceschanged = () => {
          const v = synth.getVoices();
          if (v && v.length && !resolved) {
            voiceCache = v; resolved = true; resolve(v);
          }
        };
      }
      poll();
    });
  }

  function groupVoicesByPref(selectEl, langPref) {
    selectEl.innerHTML = "";
    const voices = voiceCache || [];
    const preferred = voices.filter(v => getLangCode(v.lang) === langPref);
    const english = voices.filter(v => getLangCode(v.lang) === "en" && getLangCode(v.lang) !== langPref);
    const others = voices.filter(v => !preferred.includes(v) && !english.includes(v));
    function addGroup(label, arr) {
      if (!arr.length) return;
      const og = document.createElement("optgroup"); og.label = label;
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

  // prepare DOM text for highlighting: replace p/li/heading text with word spans
  function prepareTextForHighlight(container) {
    // remove previous spans if exist
    qa(".tts-word-span", container).forEach(s => {
      if (s.parentNode) s.parentNode.replaceChild(document.createTextNode(s.textContent), s);
    });
    container.normalize();

    const meta = container.querySelector(".modal-meta");
    const nodes = Array.from(container.querySelectorAll("p, li, h1, h2, h3, h4")).filter(n => n.textContent.trim());
    const wrap = document.createElement("div"); wrap.className = "tts-read-wrap";
    nodes.forEach(n => {
      const newEl = document.createElement(n.tagName);
      const text = stripHtml(n.innerHTML).trim();
      const words = text.split(/\s+/).filter(Boolean);
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

  // map charIndex to word span highlight (best-effort)
  function highlightWordByCharIndex(container, charIndex) {
    const spans = qa(".tts-word-span", container);
    if (!spans.length) return;
    let cum = 0;
    for (let i = 0; i < spans.length; i++) {
      const len = (spans[i].textContent || "").length;
      if (charIndex >= cum && charIndex < cum + len) {
        qa(".tts-highlight", container).forEach(x => x.classList.remove("tts-highlight"));
        spans[i].classList.add("tts-highlight");
        // keep visible inside modal
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

  // main initializer for controls (creates behavior)
  async function initTTSControls(wrapper, modalTextContainer, langPref = "pa", card = null) {
    const playBtn = wrapper.querySelector(".tts-play");
    const pauseBtn = wrapper.querySelector(".tts-pause");
    const stopBtn = wrapper.querySelector(".tts-stop");
    const select = wrapper.querySelector("#tts-voices");
    const rateInput = wrapper.querySelector("#tts-rate");
    const pitchInput = wrapper.querySelector("#tts-pitch");
    const status = wrapper.querySelector(".tts-status");
    const progress = wrapper.querySelector(".tts-progress");

    // style play button to be circular (inline so CSS not required)
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

    // load voices
    await ensureVoicesLoaded(3000);
    groupVoicesByPref(select, langPref);

    // restore saved voice/rate/pitch if present
    const savedVoice = storage.get(LS_VOICE);
    const savedRate = storage.get(LS_RATE);
    const savedPitch = storage.get(LS_PITCH);
    if (savedVoice) {
      // try to set option value if available
      const opt = Array.from(select.options).find(o => o.value === savedVoice);
      if (opt) select.value = savedVoice;
    }
    if (savedRate && rateInput) rateInput.value = savedRate;
    if (savedPitch && pitchInput) pitchInput.value = savedPitch;

    // store updates
    select.addEventListener("change", () => storage.set(LS_VOICE, select.value));
    rateInput && rateInput.addEventListener("change", () => storage.set(LS_RATE, rateInput.value));
    pitchInput && pitchInput.addEventListener("change", () => storage.set(LS_PITCH, pitchInput.value));

    // local state for this modal instance
    let utter = null;
    let playing = false;
    let paused = false;

    function stopLocal() {
      if (synth && (synth.speaking || synth.paused)) synth.cancel();
      playing = false; paused = false; utter = null;
      playBtn.textContent = "▶️";
      playBtn.setAttribute("aria-pressed", "false");
      status.textContent = "Stopped";
      qa(".tts-highlight", modalTextContainer).forEach(x => x.classList.remove("tts-highlight"));
      if (progress) progress.textContent = "";
    }

    function pauseLocal() {
      if (synth && synth.speaking && !synth.paused) {
        synth.pause(); paused = true; playing = false;
        playBtn.textContent = "▶️";
        playBtn.setAttribute("aria-pressed", "false");
        status.textContent = "Paused";
      }
    }

    function resumeLocal() {
      if (synth && synth.paused) {
        synth.resume(); paused = false; playing = true;
        playBtn.textContent = "⏸️";
        playBtn.setAttribute("aria-pressed", "true");
        status.textContent = "Playing";
      }
    }

    function startSpeak() {
      if (!synth) { status.textContent = "TTS not supported"; return; }
      // prepare highlight spans
      prepareTextForHighlight(modalTextContainer);
      const spans = qa(".tts-word-span", modalTextContainer);
      if (!spans.length) { status.textContent = "No text to read"; return; }
      // build full text from spans (keeps spaces)
      const full = spans.map(s => s.textContent).join("");

      const utterance = new SpeechSynthesisUtterance(full);
      const sel = select.value;
      const [name, lang] = (sel || "").split("||");
      const chosen = voiceCache.find(v => v.name === name && v.lang === lang);
      if (chosen) { utterance.voice = chosen; utterance.lang = chosen.lang; }
      else utterance.lang = langPref || (document.documentElement.lang || "pa-IN");

      // rate/pitch from inputs or stored
      const rate = rateInput ? parseFloat(rateInput.value) : (savedRate || 1.0);
      const pitch = pitchInput ? parseFloat(pitchInput.value) : (savedPitch || 1.0);
      utterance.rate = isNaN(rate) ? 1.0 : rate;
      utterance.pitch = isNaN(pitch) ? 1.0 : pitch;

      // boundary highlighting
      let charBase = 0;
      utterance.onboundary = (ev) => {
        if (ev.name === "word") {
          highlightWordByCharIndex(modalTextContainer, ev.charIndex);
          // progress approx
          if (progress) {
            const total = qa(".tts-word-span", modalTextContainer).length || 1;
            // find current index by counting chars up to ev.charIndex
            let cum = 0, idx = 0;
            const spans = qa(".tts-word-span", modalTextContainer);
            for (let i = 0; i < spans.length; i++) {
              cum += (spans[i].textContent || "").length;
              if (ev.charIndex <= cum) { idx = i+1; break; }
            }
            const pct = Math.min(100, Math.round((idx/total)*100));
            progress.textContent = ` ${pct}%`;
          }
        }
      };

      utterance.onstart = () => {
        playing = true; paused = false; utter = utterance;
        playBtn.textContent = "⏸️"; playBtn.setAttribute("aria-pressed", "true");
        status.textContent = "Playing";
      };
      utterance.onend = () => {
        playing = false; paused = false; utter = null;
        playBtn.textContent = "▶️"; playBtn.setAttribute("aria-pressed", "false");
        status.textContent = "Finished";
        qa(".tts-highlight", modalTextContainer).forEach(x => x.classList.remove("tts-highlight"));
        if (progress) progress.textContent = "";
      };
      utterance.onerror = (err) => {
        console.warn("TTS utterance error:", err);
        playing = false; paused = false; utter = null;
        playBtn.textContent = "▶️"; playBtn.setAttribute("aria-pressed", "false");
        status.textContent = "Playback error";
        qa(".tts-highlight", modalTextContainer).forEach(x => x.classList.remove("tts-highlight"));
      };

      synth.speak(utterance);
    }

    // play/pause button behavior
    playBtn.addEventListener("click", () => {
      if (playing && !paused) { pauseLocal(); return; }
      if (paused) { resumeLocal(); return; }
      // else start
      startSpeak();
    });

    pauseBtn.addEventListener("click", () => {
      if (playing && !paused) pauseLocal();
    });

    stopBtn.addEventListener("click", () => stopLocal = stopLocal); // overwritten below

    // stop button: fully stop speech
    stopBtn.addEventListener("click", () => stopLocal());

    // keyboard shortcuts for modal: Space -> play/pause, S -> stop
    function ttsModalKeydownHandler(e) {
      if (e.code === "Space") {
        e.preventDefault();
        if (playing && !paused) pauseLocal();
        else if (paused) resumeLocal();
        else startSpeak();
      } else if (e.key && e.key.toLowerCase() === "s") {
        e.preventDefault(); stopLocal();
      }
    }
    // attach when modal opens — listener is added globally in modal open (we will add it)
    document.addEventListener("keydown", ttsModalKeydownHandler);

    // ensure on modal close or when stopTTSGlobal runs we cleanup this listener — the global stop will remove it
    wrapper._cleanup = () => {
      try { document.removeEventListener("keydown", ttsModalKeydownHandler); } catch {}
    };

    // expose stop to wrapper for global cleanup
    wrapper._stopLocal = stopLocal;
  } // initTTSControls

  // global stop used when closing modal or ESC
  function stopTTSGlobal() {
    if (synth && (synth.speaking || synth.paused)) synth.cancel();
    // cleanup any tts wrappers cleanup handler
    qa(".tts-controls").forEach(w => { if (w._cleanup) w._cleanup(); if (w._stopLocal) w._stopLocal(); });
    qa(".tts-highlight").forEach(x => x.classList.remove("tts-highlight"));
    qa(".tts-play").forEach(btn => { btn.textContent = "▶️"; btn.setAttribute("aria-pressed", "false"); });
    qa(".tts-status").forEach(s => s.textContent = "");
    qa(".tts-progress").forEach(p => p.textContent = "");
  }

  /* ------------------------
     On-load hash -> highlight if present
  ------------------------ */
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

  /* ------------------------
     Global keyboard: Escape closes modals + stop TTS
  ------------------------ */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      qa(".modal-overlay[aria-hidden='false']").forEach(m => { m.setAttribute("aria-hidden", "true"); m.style.display = "none"; document.body.style.overflow = ""; });
      stopTTSGlobal();
    }
  });

  /* ------------------------
     Helper: try to find article read-more data-url (used by related redirect)
  ------------------------ */
  // done inline inside populateRelated

  /* ------------------------
     End of script
  ------------------------ */
});
