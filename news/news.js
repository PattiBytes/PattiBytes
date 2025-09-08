/* news.js — PattiBytes (Merged related buttons, lazy TTS init on toggle, remove double dates)
   - Canonical links: https://www.pattibytes.com/news/#<id>/
   - Single related "Open" button updates hash + opens the modal
   - TTS controls load only when the toggle button is clicked; cleaned up on close
   - Avoid inserting duplicate date metadata into modal if the content already contains it
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
    if (sec < 0) {
      if (Math.abs(sec) <= 60) return `ਹੁਣੇ ਹੀ`;
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

  /* Canonical news path (change if your path differs) */
  const newsBasePath = "/news/";

  /* COPY LINK */
  qa(".copy-link").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const article = btn.closest("article.news-card");
      if (!article || !article.id) return;
      const id = encodeURIComponent(article.id);
      const url = `${window.location.origin}${newsBasePath}#${id}/`;
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

  /* READ TIME + RELATIVE DATE (on cards) */
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
        // Only append if a sibling relative hasn't already been added
        if (!publishedEl.nextSibling || !publishedEl.nextSibling.classList || !publishedEl.nextSibling.classList.contains("published-relative")) {
          publishedEl.parentNode.insertBefore(relSpan, publishedEl.nextSibling);
        }
      }
    }
  });

  /* PAGINATION / INFINITE SCROLL */
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

  /* MODAL OPEN/CLOSE & HASH HANDLING */
  let lastFocusBeforeModal = null;

  function normalizeHash(h) {
    if (!h) return "";
    let s = h.replace(/^#/, "");
    s = s.replace(/\/+$/, "");
    return decodeURIComponent(s);
  }

  function openNewsModalById(id) {
    const normalized = id ? String(id) : "";
    if (!normalized) return;
    const target = document.getElementById(normalized);
    if (target) {
      openNewsModal(target);
    }
  }

  function ensureCardPageVisible(target) {
    const idx = allCards.indexOf(target);
    if (idx >= 0) {
      const requiredPage = Math.floor(idx / PAGE_SIZE) + 1;
      while (pageIndex < requiredPage) showNextPage();
    }
  }

  function handleHashOpen() {
    const rawHash = window.location.hash || "";
    const id = normalizeHash(rawHash);
    if (id) {
      const target = document.getElementById(id);
      if (target) {
        ensureCardPageVisible(target);
        setTimeout(() => {
          target.scrollIntoView({ behavior: "smooth", block: "center" });
          target.classList.add("highlighted");
          setTimeout(() => target.classList.remove("highlighted"), 2000);
          openNewsModal(target);
        }, 250);
      }
    }
  }

  window.addEventListener("hashchange", handleHashOpen, false);
  setTimeout(handleHashOpen, 350);

  function openNewsModal(card) {
    if (!card) return;
    lastFocusBeforeModal = document.activeElement;

    const title = card.dataset.title || "";
    const author = card.dataset.author || "";
    const dateISO = card.dataset.date || "";
    const image = card.dataset.image || "";
    const rawContent = card.dataset.content || "";
    const contentHtml = decodeHtmlEntities(rawContent);

    modalTitle.textContent = title || "";
    modalMedia.innerHTML = "";
    if (image) {
      const img = document.createElement("img");
      img.src = image;
      img.alt = title || "";
      img.loading = "lazy";
      img.style.maxWidth = "100%";
      img.style.borderRadius = "8px";
      modalMedia.appendChild(img);
    }

    // Fill modal text (raw HTML)
    modalText.innerHTML = contentHtml || `<p>${card.dataset.preview || ""}</p>`;

    // meta (author/date) — insert only if not already present in content
    const d = new Date(dateISO);
    const dateStr = !isNaN(d.getTime())
      ? d.toLocaleDateString("pa-IN", { year: "numeric", month: "long", day: "numeric" })
      : "";
    const alreadyHasPublished = !!modalText.querySelector(".published") || (dateStr && modalText.textContent.includes(dateStr));
    if (!alreadyHasPublished) {
      const metaWrap = document.createElement("div");
      metaWrap.className = "modal-meta";
      metaWrap.innerHTML = `<p style="margin:0 0 .5rem 0;"><strong>${author}</strong> · ${dateStr}</p>`;
      if (modalText.firstChild) modalText.insertBefore(metaWrap, modalText.firstChild);
      else modalText.appendChild(metaWrap);
    }

    populateRelated(card);

    // remove previous TTS UI to avoid duplicates
    const existingTts = newsModal.querySelector(".tts-controls, .tts-toggle-btn");
    if (existingTts) existingTts.remove();

    // add toggle and an empty controls container (controls will be initialized lazily)
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
    modalText.parentNode.insertBefore(ttsWrap, modalText.nextSibling);

    const cardLang = card.dataset.lang || document.documentElement.lang || "pa-IN";
    const langPref = getLangCode(cardLang);

    // lazy init: only call initTTSControls when user opens the TTS UI
    let ttsInstance = null;
    ttsToggleBtn.addEventListener("click", () => {
      const opening = ttsWrap.style.display === "none";
      if (opening) {
        ttsWrap.style.display = "";
        // init only once
        if (!ttsInstance) {
          ttsInstance = initTTSControls(ttsWrap, modalText, langPref);
          // store reference for cleanup
          ttsWrap._cleanup = ttsInstance;
        }
        // focus the play button when opened
        const pb = ttsWrap.querySelector(".tts-play");
        if (pb) pb.focus();
        ttsWrap.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        // closing: cleanup if there is an instance
        if (ttsInstance && ttsInstance.stop) {
          try {
            ttsInstance.stop();
          } catch (e) {}
        }
        // remove highlights and reset any spans
        qa(".tts-highlight", modalText).forEach((s) => s.classList.remove("tts-highlight"));
        ttsWrap.style.display = "none";
      }
    });

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

    // stop TTS globally
    stopTTS();

    // cleanup TTS UI if present
    qa(".tts-controls").forEach((wrap) => {
      if (wrap._cleanup) {
        try {
          wrap._cleanup.stop && wrap._cleanup.stop();
        } catch (e) {}
      }
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
    });
    qa(".tts-toggle-btn").forEach((b) => b.remove());

    if (lastFocusBeforeModal) lastFocusBeforeModal.focus();

    // restore: replace any tts spans with text nodes (cleanup highlight)
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

  /* read-more: open modal and update canonical hash */
  qa(".read-more-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      const card = btn.closest("article.news-card");
      if (card && card.id) {
        const id = encodeURIComponent(card.id);
        history.pushState(null, "", `${newsBasePath}#${id}/`);
      }
      openNewsModal(card);
    })
  );

  modalCloseBtn.addEventListener("click", closeNewsModal);
  newsModal.addEventListener("click", (e) => {
    if (e.target === newsModal) closeNewsModal();
  });

  /* IMAGE MODAL */
  qa(".enlarge-btn").forEach((b) =>
    b.addEventListener("click", () => {
      const card = b.closest("article.news-card");
      const imgSrc = card ? card.dataset.image : null;
      if (!imgSrc) return;
      modalImage.src = imgSrc;
      modalImage.alt = (card && card.dataset.title) || "";
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

  /* RELATED ARTICLES (single merged "Open" button) */
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
        if (!id) return;
        const encoded = encodeURIComponent(id);
        // push canonical URL
        history.pushState(null, "", `${newsBasePath}#${encoded}/`);
        const target = document.getElementById(id);
        if (target) {
          // ensure pagination shows the target
          ensureCardPageVisible(target);
          // close current modal (if open) and open the target after a moment
          closeNewsModal();
          setTimeout(() => {
            target.scrollIntoView({ behavior: "smooth", block: "center" });
            target.classList.add("highlighted");
            setTimeout(() => target.classList.remove("highlighted"), 1600);
            openNewsModal(target);
          }, 300);
        }
      })
    );
  }

  /* TTS (voices loader + controls) */
  let synth = window.speechSynthesis;
  let voiceList = [];

  function ensureVoicesLoaded(timeout = 2500) {
    return new Promise((resolve) => {
      const s = window.speechSynthesis;
      const v = s ? s.getVoices() : [];
      if (v && v.length > 0) {
        voiceList = v;
        resolve(v);
        return;
      }
      let resolved = false;
      const onVoices = () => {
        if (resolved) return;
        const voices = s.getVoices();
        voiceList = voices || [];
        resolved = true;
        resolve(voiceList);
      };
      if (s && "onvoiceschanged" in s) {
        s.onvoiceschanged = onVoices;
      }
      const t0 = performance.now();
      (function poll() {
        const vv = s ? s.getVoices() : [];
        if (vv && vv.length > 0) {
          voiceList = vv;
          resolved = true;
          resolve(voiceList);
          return;
        }
        if (performance.now() - t0 > timeout) {
          voiceList = vv || [];
          resolved = true;
          resolve(voiceList);
          return;
        }
        setTimeout(poll, 120);
      })();
    });
  }

  function stopTTS() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    qa(".tts-highlight").forEach((s) => s.classList.remove("tts-highlight"));
    qa(".tts-play").forEach((b) => {
      b.textContent = "▶️ Play";
      b.setAttribute("aria-pressed", "false");
    });
    qa(".tts-status").forEach((el) => (el.textContent = "Stopped"));
    qa(".tts-progress").forEach((el) => (el.textContent = ""));
  }

  function initTTSControls(wrapper, modalTextContainer, langPref) {
    // returns { stop, reset } - same as before but safe to call lazily
    const playBtn = wrapper.querySelector(".tts-play");
    const pauseBtn = wrapper.querySelector(".tts-pause");
    const stopBtn = wrapper.querySelector(".tts-stop");
    const select = wrapper.querySelector("#tts-voices");
    const statusSpan = wrapper.querySelector(".tts-status");
    const progressEl = wrapper.querySelector(".tts-progress");
    const rateInput = wrapper.querySelector("#tts-rate");
    const pitchInput = wrapper.querySelector("#tts-pitch");

    let voices = [];
    let utterRate = parseFloat(rateInput ? rateInput.value : 1.02) || 1.02;
    let utterPitch = parseFloat(pitchInput ? pitchInput.value : 1.0) || 1.0;
    let ttsPlaying = false;
    let queue = [];
    let queuePos = 0;
    let wordSpans = [];
    let currentWord = 0;
    let pauseRequested = false;

    function findVoiceByValue(val) {
      if (!val || val === "__default__") return null;
      const [name, lang] = (val || "").split("||");
      return voices.find((v) => v.name === name && v.lang === lang) || null;
    }

    async function loadVoices() {
      voices = await ensureVoicesLoaded(2500);
      function addGroup(label, arr) {
        if (!arr.length) return;
        const og = document.createElement("optgroup");
        og.label = label;
        arr.forEach((v) => {
          const opt = document.createElement("option");
          opt.value = `${v.name}||${v.lang}`;
          opt.textContent = `${v.name} (${v.lang})`;
          og.appendChild(opt);
        });
        select.appendChild(og);
      }
      const preferred = voices.filter((v) => getLangCode(v.lang) === langPref);
      const english = voices.filter((v) => getLangCode(v.lang) === "en" && getLangCode(v.lang) !== langPref);
      const others = voices.filter((v) => !preferred.includes(v) && !english.includes(v));
      select.innerHTML = "";
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

    function prepareTextForReading() {
      qa(".tts-word-span", modalTextContainer).forEach((s) => {
        if (s.parentNode) s.parentNode.replaceChild(document.createTextNode(s.textContent), s);
      });

      // exclude modal-meta and any .published elements from reading
      const nodes = Array.from(modalTextContainer.querySelectorAll("p, h1, h2, h3, h4, li")).filter(
        (el) => el.textContent.trim() !== "" && !el.closest(".modal-meta") && !el.closest(".published")
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

    function buildQueue() {
      const readContainer = modalTextContainer.querySelector(".tts-read-container");
      if (!readContainer) return;
      queue = Array.from(readContainer.children).map((el) => el.textContent.trim()).filter(Boolean);
      queuePos = 0;
    }

    function highlightByCharIndex(charIndex) {
      wordSpans = qa(".tts-word-span", modalTextContainer);
      if (!wordSpans.length) return;
      let total = 0;
      for (let i = 0; i < wordSpans.length; i++) {
        const len = (wordSpans[i].textContent || "").length;
        const start = total;
        const end = total + len;
        if (charIndex >= start && charIndex <= end) {
          qa(".tts-highlight", modalTextContainer).forEach((el) => el.classList.remove("tts-highlight"));
          wordSpans[i].classList.add("tts-highlight");
          try {
            wordSpans[i].scrollIntoView({ behavior: "smooth", block: "center" });
          } catch (e) {}
          currentWord = i + 1;
          return;
        }
        total = end;
      }
    }

    function speakNextChunk() {
      if (!window.speechSynthesis) {
        statusSpan.textContent = "TTS unsupported";
        return;
      }
      if (queuePos >= queue.length) {
        stopLocal();
        return;
      }
      const text = queue[queuePos++];
      const utter = new SpeechSynthesisUtterance(text);
      const sel = select.value;
      const chosen = findVoiceByValue(sel);
      if (chosen) utter.voice = chosen;
      else utter.lang = langPref ? `${langPref}` : document.documentElement.lang || "pa-IN";
      utter.rate = utterRate;
      utter.pitch = utterPitch;

      utter.onboundary = (ev) => {
        if (ev.name === "word") highlightByCharIndex(ev.charIndex);
      };

      utter.onend = () => {
        if (progressEl) {
          const total = qa(".tts-word-span", modalTextContainer).length || 1;
          currentWord = Math.min(total, currentWord + (text.split(/\s+/).length));
          const pct = Math.round((currentWord / total) * 100);
          progressEl.textContent = ` ${pct}%`;
        }
        setTimeout(() => {
          if (!pauseRequested) speakNextChunk();
        }, 80);
      };

      window.speechSynthesis.speak(utter);
    }

    function computeChunkIndexForWordIndex(wordIndex) {
      const readContainer = modalTextContainer.querySelector(".tts-read-container");
      if (!readContainer) return 0;
      const children = Array.from(readContainer.children);
      let cum = 0;
      for (let i = 0; i < children.length; i++) {
        const wCount = (children[i].textContent || "").trim().split(/\s+/).filter(Boolean).length;
        if (wordIndex <= cum + wCount) return i;
        cum += wCount;
      }
      return Math.max(0, children.length - 1);
    }

    function stopLocal() {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      ttsPlaying = false;
      pauseRequested = false;
      qa(".tts-highlight", modalTextContainer).forEach((s) => s.classList.remove("tts-highlight"));
      playBtn.textContent = "▶️ Play";
      playBtn.setAttribute("aria-pressed", "false");
      statusSpan.textContent = "Stopped";
      if (progressEl) progressEl.textContent = "";
    }

    function startTTS() {
      if (!window.speechSynthesis) {
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
      pauseRequested = false;
      statusSpan.textContent = "ਬੋਲ ਰਹੇ ਹਨ...";
      playBtn.textContent = "⏸️ Pause";
      playBtn.setAttribute("aria-pressed", "true");
      speakNextChunk();
    }

    function pauseTTS() {
      if (window.speechSynthesis && window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        ttsPlaying = false;
        pauseRequested = true;
        statusSpan.textContent = "ਰੁਕਿਆ";
        playBtn.textContent = "▶️ Play";
      }
    }
    function resumeTTS() {
      if (window.speechSynthesis && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        ttsPlaying = true;
        pauseRequested = false;
        statusSpan.textContent = "ਜਾਰੀ...";
        playBtn.textContent = "⏸️ Pause";
      }
    }

    function restartFromCurrentWord() {
      const chunkIdx = computeChunkIndexForWordIndex(currentWord || 1);
      if (chunkIdx >= 0) {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        queuePos = chunkIdx;
        qa(".tts-highlight", modalTextContainer).forEach((s) => s.classList.remove("tts-highlight"));
        setTimeout(() => {
          speakNextChunk();
        }, 120);
      }
    }

    // wire UI
    playBtn.addEventListener("click", () => {
      if (window.speechSynthesis && window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        pauseTTS();
      } else if (window.speechSynthesis && window.speechSynthesis.paused) {
        resumeTTS();
      } else {
        startTTS();
      }
    });
    pauseBtn.addEventListener("click", () => pauseTTS());
    stopBtn.addEventListener("click", () => stopLocal());

    select.addEventListener("change", () => {
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        restartFromCurrentWord();
      }
    });

    rateInput.addEventListener("input", (e) => {
      utterRate = parseFloat(e.target.value) || 1.02;
      if (window.speechSynthesis && window.speechSynthesis.speaking) restartFromCurrentWord();
    });
    pitchInput.addEventListener("input", (e) => {
      utterPitch = parseFloat(e.target.value) || 1.0;
      if (window.speechSynthesis && window.speechSynthesis.speaking) restartFromCurrentWord();
    });

    loadVoices().catch(() => {});

    return {
      stop: () => {
        try {
          stopLocal();
        } catch (e) {}
      },
      reset: () => {
        try {
          stopLocal();
          qa(".tts-word-span", modalTextContainer).forEach((s) => {
            if (s.parentNode) s.parentNode.replaceChild(document.createTextNode(s.textContent), s);
          });
        } catch (e) {}
      },
    };
  }

  /* HASH HIGHLIGHT ON LOAD (fallback) */
  const hash = normalizeHash(window.location.hash.slice(1));
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

  /* GLOBAL ESC CLOSES MODALS */
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
