/* news.js — PattiBytes (Fixes: date/time, TTS reliability, voice loading)
   - Robust timeAgo (handles future/invalid dates and shows full month)
   - TTS: safe voice loader, language-pref, fallback, better highlights
   - Keeps: copy-link, infinite scroll, image modal, related articles
*/

document.addEventListener("DOMContentLoaded", () => {
  const q = (sel, ctx = document) => (ctx || document).querySelector(sel);
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
    if (isNaN(then.getTime())) return ""; // invalid date
    const now = new Date();
    const diffMs = now.getTime() - then.getTime();
    const sec = Math.round(diffMs / 1000);
    // if the date is in the future
    if (sec < 0) {
      // very small future (within 60s): treat as 'just now'
      if (Math.abs(sec) <= 60) return `ਹੁਣੇ ਹੀ`;
      // otherwise show formatted date (full month)
      return then.toLocaleDateString("pa-IN", { year: "numeric", month: "long", day: "numeric" });
    }
    if (sec < 60) return `${sec} sec ਪਹਿਲਾਂ`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} ਮਿੰਟ ਪਹਿਲਾਂ`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} ਘੰਟੇ ਪਹਿਲਾਂ`;
    const days = Math.floor(hr / 24);
    if (days < 7) return `${days} ਦਿਨ ਪਹਿਲਾਂ`;
    return then.toLocaleDateString("pa-IN", { year: "numeric", month: "long", day: "numeric" });
  }

  function decodeHtmlEntities(str) {
    const ta = document.createElement("textarea");
    ta.innerHTML = str || "";
    return ta.value;
  }

  function getLangCode(code) {
    if (!code) return "";
    return String(code).split(/[-_]/)[0].toLowerCase();
  }

  /* Elements */
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

  /* 1) Copy link */
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

  /* 2) populate read-time + relative date */
  allCards.forEach((card) => {
    const contentRaw = decodeHtmlEntities(card.dataset.content || "");
    const words = wordCount(contentRaw || card.dataset.preview || "");
    const minutes = readMinutes(words);
    const readTimeEl = card.querySelector(".read-time");
    if (readTimeEl) readTimeEl.textContent = `${minutes} ਮਿੰਟ ਪੜ੍ਹਨ ਲਈ`;

    const dateISO = card.dataset.date;
    const publishedEl = card.querySelector(".published");
    if (publishedEl && dateISO) {
      const d = new Date(dateISO);
      if (!isNaN(d.getTime())) {
        publishedEl.setAttribute("datetime", dateISO);
        publishedEl.title = d.toLocaleDateString("pa-IN", { year: "numeric", month: "long", day: "numeric" });
        const rel = timeAgo(dateISO);
        const relSpan = document.createElement("span");
        relSpan.className = "published-relative";
        relSpan.textContent = ` (${rel})`;
        publishedEl.parentNode.insertBefore(relSpan, publishedEl.nextSibling);
      }
    }
  });

  /* 3) Pagination / infinite scroll */
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

  /* 4) Modal open / close */
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

    modalText.innerHTML = contentHtml || `<p>${card.dataset.preview || ""}</p>`;

    // meta
    const metaWrap = document.createElement("div");
    metaWrap.className = "modal-meta";
    const d = new Date(dateISO);
    const dateStr = !isNaN(d.getTime())
      ? d.toLocaleDateString("pa-IN", { year: "numeric", month: "long", day: "numeric" })
      : "";
    metaWrap.innerHTML = `<p style="margin:0 0 .5rem 0;"><strong>${author}</strong> · ${dateStr}</p>`;
    modalText.prepend(metaWrap);

    populateRelated(card);

    // remove previous TTS UI to avoid duplicates
    const existingTts = newsModal.querySelector(".tts-controls, .tts-toggle-btn");
    if (existingTts) existingTts.remove();

    // add toggle and controls
    const ttsToggleBtn = document.createElement("button");
    ttsToggleBtn.className = "tts-toggle-btn";
    ttsToggleBtn.innerHTML = "🔊";
    ttsToggleBtn.title = "Toggle Text-to-Speech Controls";
    ttsToggleBtn.type = "button";
    ttsToggleBtn.style.marginLeft = "8px";
    modalCloseBtn.after(ttsToggleBtn);

    const ttsWrap = document.createElement("div");
    ttsWrap.className = "tts-controls";
    ttsWrap.style.display = "none";
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

    const cardLang = card.dataset.lang || document.documentElement.lang || "pa-IN";
    const langPref = getLangCode(cardLang);

    ttsToggleBtn.addEventListener("click", () => {
      ttsWrap.style.display = ttsWrap.style.display === "none" ? "" : "none";
      if (ttsWrap.style.display !== "none") ttsWrap.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    // init TTS controls (safe loader)
    initTTSControls(ttsWrap, modalText, langPref);

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
    stopTTS();
    if (lastFocusBeforeModal) lastFocusBeforeModal.focus();

    // restore: replace any tts spans with text nodes
    qa(".tts-word-span").forEach((s) => {
      if (s.parentNode) s.parentNode.replaceChild(document.createTextNode(s.textContent), s);
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

  qa(".read-more-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      const card = btn.closest("article.news-card");
      openNewsModal(card);
    })
  );

  modalCloseBtn.addEventListener("click", closeNewsModal);
  newsModal.addEventListener("click", (e) => {
    if (e.target === newsModal) closeNewsModal();
  });

  /* 5) image modal */
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

  /* 6) related */
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
      btn.addEventListener("click", () => {
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

  /* 7) TTS improvements */
  let synth = window.speechSynthesis;
  let voiceList = [];
  function ensureVoicesLoaded(timeout = 2000) {
    return new Promise((resolve) => {
      const voices = synth ? synth.getVoices() : [];
      if (voices && voices.length > 0) {
        voiceList = voices;
        resolve(voices);
        return;
      }
      let resolved = false;
      const onVoices = () => {
        if (resolved) return;
        const v = synth.getVoices();
        voiceList = v || [];
        resolved = true;
        resolve(voiceList);
      };
      if (speechSynthesis && "onvoiceschanged" in speechSynthesis) {
        speechSynthesis.onvoiceschanged = onVoices;
      }
      // fallback polling
      const t0 = performance.now();
      (function poll() {
        const v = synth.getVoices();
        if (v && v.length > 0) {
          voiceList = v;
          resolved = true;
          resolve(voiceList);
          return;
        }
        if (performance.now() - t0 > timeout) {
          // timeout: resolve with whatever we have (maybe empty)
          voiceList = v || [];
          resolved = true;
          resolve(voiceList);
          return;
        }
        setTimeout(poll, 120);
      })();
    });
  }

  async function initTTSControls(wrapper, modalTextContainer, langPref) {
    // langPref: 'pa' or 'en' etc.
    const playBtn = wrapper.querySelector(".tts-play");
    const pauseBtn = wrapper.querySelector(".tts-pause");
    const stopBtn = wrapper.querySelector(".tts-stop");
    const select = wrapper.querySelector("#tts-voices");
    const statusSpan = wrapper.querySelector(".tts-status");
    const progressEl = wrapper.querySelector(".tts-progress");

    await ensureVoicesLoaded(2500); // wait up to 2.5s for voices
    const voices = voiceList || [];

    function populateVoices() {
      select.innerHTML = "";
      // prefer langPref
      const preferred = voices.filter((v) => getLangCode(v.lang) === langPref);
      const english = voices.filter((v) => getLangCode(v.lang) === "en" && getLangCode(v.lang) !== langPref);
      const others = voices.filter((v) => !preferred.includes(v) && !english.includes(v));
      function addGroup(label, arr) {
        if (!arr.length) return;
        const og = document.createElement("optgroup");
        og.label = label;
        arr.forEach((v) => {
          const opt = document.createElement("option");
          // use voice.name+"|"+voice.lang as value to find voice later
          opt.value = `${v.name}||${v.lang}`;
          opt.textContent = `${v.name} (${v.lang})`;
          og.appendChild(opt);
        });
        select.appendChild(og);
      }
      addGroup("Preferred", preferred);
      addGroup("English", english);
      addGroup("Other voices", others);
      if (!select.options.length) {
        const o = document.createElement("option");
        o.value = "__default__";
        o.textContent = "Default";
        select.appendChild(o);
      }
    }

    populateVoices();

    function prepareTextForReading() {
      // remove previous spans
      qa(".tts-word-span", modalTextContainer).forEach((s) => {
        if (s.parentNode) s.parentNode.replaceChild(document.createTextNode(s.textContent), s);
      });

      // nodes to read
      const nodes = Array.from(modalTextContainer.querySelectorAll("p, h1, h2, h3, h4, li")).filter(
        (el) => el.textContent.trim() !== ""
      );
      const readContainer = document.createElement("div");
      readContainer.className = "tts-read-container";
      nodes.forEach((el) => {
        const newEl = document.createElement(el.tagName);
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
      const meta = modalTextContainer.querySelector(".modal-meta");
      modalTextContainer.innerHTML = "";
      if (meta) modalTextContainer.appendChild(meta);
      modalTextContainer.appendChild(readContainer);
    }

    // core speak routine: chunked queue
    let queue = [];
    let queuePos = 0;
    let wordSpans = [];
    let currentWord = 0;
    function buildQueue() {
      const readContainer = modalTextContainer.querySelector(".tts-read-container");
      if (!readContainer) return;
      queue = Array.from(readContainer.children).map((el) => el.textContent.trim()).filter(Boolean);
      queuePos = 0;
    }

    function findVoiceByValue(val) {
      const [name, lang] = (val || "").split("||");
      return voices.find((v) => v.name === name && v.lang === lang) || null;
    }

    function speakNextChunk() {
      if (!speechSynthesis) return;
      if (queuePos >= queue.length) {
        stopTTS();
        return;
      }
      const text = queue[queuePos++];
      const utter = new SpeechSynthesisUtterance(text);
      // choose selected voice
      const sel = select.value;
      const chosen = findVoiceByValue(sel);
      if (chosen) utter.voice = chosen;
      else {
        utter.lang = langPref ? `${langPref}` : document.documentElement.lang || "pa-IN";
      }
      utter.rate = 1.02;
      utter.pitch = 1.0;

      // boundary highlighting (best-effort)
      utter.onboundary = (ev) => {
        if (ev.name === "word") {
          // map charIndex to span roughly
          highlightByCharIndex(ev.charIndex);
        }
      };

      utter.onend = () => {
        // update approximate progress
        if (progressEl) {
          const total = qa(".tts-word-span", modalTextContainer).length || 1;
          currentWord = Math.min(total, currentWord + (text.split(/\s+/).length));
          const pct = Math.round((currentWord / total) * 100);
          progressEl.textContent = ` ${pct}%`;
        }
        setTimeout(() => speakNextChunk(), 80);
      };

      speechSynthesis.speak(utter);
    }

    function highlightByCharIndex(charIndex) {
      wordSpans = qa(".tts-word-span", modalTextContainer);
      if (!wordSpans.length) return;
      // build cumulative map
      let total = 0;
      for (let i = 0; i < wordSpans.length; i++) {
        const len = (wordSpans[i].textContent || "").length;
        const start = total;
        const end = total + len;
        if (charIndex >= start && charIndex <= end) {
          // remove old
          qa(".tts-highlight", modalTextContainer).forEach((el) => el.classList.remove("tts-highlight"));
          wordSpans[i].classList.add("tts-highlight");
          wordSpans[i].scrollIntoView({ behavior: "smooth", block: "center" });
          currentWord = i + 1;
          return;
        }
        total = end;
      }
    }

    function startTTS() {
      if (!speechSynthesis) {
        statusSpan.textContent = "TTS 지원되지 않음";
        return;
      }
      prepareTextForReading();
      wordSpans = qa(".tts-word-span", modalTextContainer);
      if (!wordSpans.length) {
        statusSpan.textContent = "ਕੋਈ ਪਾਠ ਨਹੀਂ";
        return;
      }
      buildQueue();
      currentWord = 0;
      queuePos = 0;
      ttsPlaying = true;
      statusSpan.textContent = "ਬੋਲ ਰਹੇ ਹਨ...";
      playBtn.textContent = "⏸️ Pause";
      playBtn.setAttribute("aria-pressed", "true");
      speakNextChunk();
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
    function stopTTS() {
      if (speechSynthesis) speechSynthesis.cancel();
      ttsPlaying = false;
      qa(".tts-highlight", modalTextContainer).forEach((s) => s.classList.remove("tts-highlight"));
      playBtn.textContent = "▶️ Play";
      playBtn.setAttribute("aria-pressed", "false");
      statusSpan.textContent = "Stopped";
      if (progressEl) progressEl.textContent = "";
    }

    // wire UI
    playBtn.addEventListener("click", () => {
      if (speechSynthesis && speechSynthesis.speaking && !speechSynthesis.paused) {
        pauseTTS();
      } else if (speechSynthesis && speechSynthesis.paused) {
        resumeTTS();
      } else {
        startTTS();
      }
    });
    pauseBtn.addEventListener("click", () => pauseTTS());
    stopBtn.addEventListener("click", () => stopTTS());

    // expose stop to outer scope by storing wrapper on node (optional)
    wrapper._cleanupStop = stopTTS;
    wrapper._cleanupReset = () => {
      // remove highlights and cancel
      stopTTS();
    };
  }

  // outer stopTTS that other parts call
  function stopTTS() {
    if (speechSynthesis) speechSynthesis.cancel();
    qa(".tts-highlight").forEach((s) => s.classList.remove("tts-highlight"));
    qa(".tts-play").forEach((b) => {
      b.textContent = "▶️ Play";
      b.setAttribute("aria-pressed", "false");
    });
    qa(".tts-status").forEach((el) => (el.textContent = "Stopped"));
    qa(".tts-progress").forEach((el) => (el.textContent = ""));
  }

  /* 8) hash highlight */
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

  /* 9) global Escape closes modals */
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
});
