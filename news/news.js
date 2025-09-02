/* news.js — PattiBytes (quick fixes)
   - fixes date display (forces full month names)
   - robust timeAgo (no negative sec output)
   - TTS toggle now uses classList.toggle('show') to match CSS
   - ensures modal has relative position (see CSS below)
   - safer voice loading and TTS initialization
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

  /* ---------- date helpers ---------- */
  function timeAgo(isoDate) {
    if (!isoDate) return "";
    const then = new Date(isoDate);
    if (isNaN(then.getTime())) return "";
    const now = new Date();
    const diff = now.getTime() - then.getTime();
    const sec = Math.round(diff / 1000);
    if (sec < 0) { // future date
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

  /* ---------- elements ---------- */
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

  /* ---------- copy link ---------- */
  qa(".copy-link").forEach((btn) =>
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
    })
  );

  /* ---------- populate read-time + formatted date ---------- */
  allCards.forEach((card) => {
    const contentRaw = decodeHtmlEntities(card.dataset.content || "");
    const words = wordCount(contentRaw || card.dataset.preview || "");
    const minutes = readMinutes(words);
    const readTimeEl = card.querySelector(".read-time");
    if (readTimeEl) readTimeEl.textContent = `${minutes} ਮਿੰਟ ਪੜ੍ਹਨ ਲਈ`;

    const dateISO = card.dataset.date;
    const publishedEl = card.querySelector(".published");
    if (publishedEl && dateISO) {
      const dateObj = new Date(dateISO);
      if (!isNaN(dateObj.getTime())) {
        // overwrite the visible published text with full-month format
        publishedEl.textContent = dateObj.toLocaleDateString("pa-IN", {
          month: "long",
          day: "2-digit",
          year: "numeric",
        });
        publishedEl.setAttribute("datetime", dateISO);
        publishedEl.title = dateObj.toLocaleString("pa-IN", {
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
    }
  });

  /* ---------- pagination / infinite scroll ---------- */
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

  /* ---------- modal open / close ---------- */
  let lastFocusBeforeModal = null;

  function openNewsModal(card) {
    if (!card) return;
    lastFocusBeforeModal = document.activeElement;

    const title = card.dataset.title || "";
    const author = card.dataset.author || "";
    const dateISO = card.dataset.date || "";
    const image = card.dataset.image || "";
    const rawContent = card.dataset.content || "";
    const contentHtml = decodeHtmlEntities(rawContent || "");

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

    // prepend meta block
    const metaWrap = document.createElement("div");
    metaWrap.className = "modal-meta";
    const d = new Date(dateISO);
    const dateStr = !isNaN(d.getTime())
      ? d.toLocaleDateString("pa-IN", { year: "numeric", month: "long", day: "numeric" })
      : "";
    metaWrap.innerHTML = `<p style="margin:0 0 .5rem 0;"><strong>${author}</strong> · ${dateStr}</p>`;
    modalText.prepend(metaWrap);

    populateRelated(card);

    // cleanup any prior TTS UI to avoid duplicates
    const prevTTS = newsModal.querySelectorAll(".tts-controls, .tts-toggle-btn");
    prevTTS.forEach((n) => n.remove());

    // ensure modal-content is positioned (CSS change also suggested)
    // add TTS toggle button (absolute inside modal-content)
    const ttsToggleBtn = document.createElement("button");
    ttsToggleBtn.className = "tts-toggle-btn";
    ttsToggleBtn.type = "button";
    ttsToggleBtn.title = "Toggle Text-to-Speech Controls";
    ttsToggleBtn.innerHTML = "🔊";
    // place after close button
    modalCloseBtn.after(ttsToggleBtn);

    // create controls container (initially hidden — controlled by .show class)
    const ttsWrap = document.createElement("div");
    ttsWrap.className = "tts-controls";
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
    // insert after article content
    modalText.parentNode.insertBefore(ttsWrap, modalText.nextSibling);

    // language pref (from article or doc)
    const cardLang = card.dataset.lang || document.documentElement.lang || "pa-IN";
    const langPref = getLangCode(cardLang);

    // toggle via class to match CSS
    ttsToggleBtn.addEventListener("click", () => {
      ttsWrap.classList.toggle("show");
      // if now visible, scroll it into view
      if (ttsWrap.classList.contains("show")) ttsWrap.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    // init TTS controls
    initTTSControls(ttsWrap, modalText, langPref);

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
    stopTTS();
    if (lastFocusBeforeModal) lastFocusBeforeModal.focus();
    // restore any tts spans => plain text
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

  /* ---------- image modal ---------- */
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

  /* ---------- related articles ---------- */
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

  /* ---------- TTS (simple, reliable) ---------- */
  let synth = window.speechSynthesis;
  let voiceList = [];

  function ensureVoicesLoaded(timeout = 2000) {
    return new Promise((resolve) => {
      try {
        const v = synth ? synth.getVoices() : [];
        if (v && v.length > 0) {
          voiceList = v;
          return resolve(v);
        }
      } catch (e) {}
      let resolved = false;
      const start = performance.now();
      function poll() {
        const vs = synth ? synth.getVoices() : [];
        if (!resolved && vs && vs.length) {
          voiceList = vs;
          resolved = true;
          return resolve(vs);
        }
        if (performance.now() - start > timeout) {
          voiceList = vs || [];
          resolved = true;
          return resolve(voiceList);
        }
        setTimeout(poll, 120);
      }
      poll();
    });
  }

  async function initTTSControls(wrapper, modalTextContainer, langPref) {
    // wrapper DOM is already inserted and hidden (CSS .tts-controls)
    const playBtn = wrapper.querySelector(".tts-play");
    const pauseBtn = wrapper.querySelector(".tts-pause");
    const stopBtn = wrapper.querySelector(".tts-stop");
    const select = wrapper.querySelector("#tts-voices");
    const statusSpan = wrapper.querySelector(".tts-status");
    const progressEl = wrapper.querySelector(".tts-progress");

    await ensureVoicesLoaded(2500);
    const voices = voiceList || [];

    // populate select (preferred lang first)
    select.innerHTML = "";
    const preferred = voices.filter((v) => getLangCode(v.lang) === langPref);
    const english = voices.filter((v) => getLangCode(v.lang) === "en" && getLangCode(v.lang) !== langPref);
    const others = voices.filter((v) => !preferred.includes(v) && !english.includes(v));
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
    addGroup("Preferred", preferred);
    addGroup("English", english);
    addGroup("Other voices", others);
    if (!select.options.length) {
      const o = document.createElement("option");
      o.value = "__default__";
      o.textContent = "Default";
      select.appendChild(o);
    }

    // helper to create highlight spans
    function prepareTextForReading() {
      qa(".tts-word-span", modalTextContainer).forEach((s) => {
        if (s.parentNode) s.parentNode.replaceChild(document.createTextNode(s.textContent), s);
      });

      const nodes = Array.from(modalTextContainer.querySelectorAll("p, h1, h2, h3, h4, li")).filter(
        (el) => el.textContent.trim() !== ""
      );
      const container = document.createElement("div");
      container.className = "tts-read-container";
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
        container.appendChild(newEl);
      });
      const meta = modalTextContainer.querySelector(".modal-meta");
      modalTextContainer.innerHTML = "";
      if (meta) modalTextContainer.appendChild(meta);
      modalTextContainer.appendChild(container);
    }

    // queue & play chunked utterances
    let queue = [];
    let queueIndex = 0;
    let wordSpans = [];
    let currentWord = 0;
    function buildQueue() {
      const readContainer = modalTextContainer.querySelector(".tts-read-container");
      if (!readContainer) return;
      queue = Array.from(readContainer.children).map((el) => el.textContent.trim()).filter(Boolean);
      queueIndex = 0;
    }

    function pickVoiceFromSelect(val) {
      const [name, lang] = (val || "").split("||");
      return voices.find((v) => v.name === name && v.lang === lang) || null;
    }

    function speakNext() {
      if (!speechSynthesis) return;
      if (queueIndex >= queue.length) {
        // finished
        stopLocal();
        return;
      }
      const text = queue[queueIndex++];
      const ut = new SpeechSynthesisUtterance(text);
      const chosen = pickVoiceFromSelect(select.value);
      if (chosen) ut.voice = chosen;
      else ut.lang = langPref || document.documentElement.lang || "pa-IN";
      ut.rate = 1.02;
      ut.pitch = 1.0;
      ut.onboundary = (ev) => {
        if (ev.name === "word") {
          // charIndex mapping best-effort
          highlightByCharIndex(ev.charIndex);
        }
      };
      ut.onend = () => {
        // approximate progress update
        const words = text.split(/\s+/).length;
        currentWord = Math.min((qa(".tts-word-span", modalTextContainer).length || 1), currentWord + words);
        if (progressEl) {
          const total = qa(".tts-word-span", modalTextContainer).length || 1;
          progressEl.textContent = ` ${Math.round((currentWord / total) * 100)}%`;
        }
        setTimeout(() => speakNext(), 80);
      };
      speechSynthesis.speak(ut);
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
          wordSpans[i].scrollIntoView({ behavior: "smooth", block: "center" });
          currentWord = i + 1;
          return;
        }
        total = end;
      }
    }

    function startLocal() {
      if (!speechSynthesis) {
        statusSpan.textContent = "TTS not supported";
        return;
      }
      prepareTextForReading();
      wordSpans = qa(".tts-word-span", modalTextContainer);
      if (!wordSpans.length) {
        statusSpan.textContent = "No text";
        return;
      }
      buildQueue();
      queueIndex = 0;
      currentWord = 0;
      ttsPlaying = true;
      statusSpan.textContent = "ਬੋਲ ਰਹੇ ਹਨ...";
      playBtn.textContent = "⏸️ Pause";
      playBtn.setAttribute("aria-pressed", "true");
      speakNext();
    }

    function pauseLocal() {
      if (speechSynthesis && speechSynthesis.speaking && !speechSynthesis.paused) {
        speechSynthesis.pause();
        ttsPlaying = false;
        statusSpan.textContent = "ਰੁਕਿਆ";
        playBtn.textContent = "▶️ Play";
      }
    }
    function resumeLocal() {
      if (speechSynthesis && speechSynthesis.paused) {
        speechSynthesis.resume();
        ttsPlaying = true;
        statusSpan.textContent = "ਜਾਰੀ...";
        playBtn.textContent = "⏸️ Pause";
      }
    }
    function stopLocal() {
      if (speechSynthesis) speechSynthesis.cancel();
      ttsPlaying = false;
      qa(".tts-highlight", modalTextContainer).forEach((s) => s.classList.remove("tts-highlight"));
      playBtn.textContent = "▶️ Play";
      playBtn.setAttribute("aria-pressed", "false");
      statusSpan.textContent = "Stopped";
      if (progressEl) progressEl.textContent = "";
    }

    playBtn.addEventListener("click", () => {
      if (speechSynthesis && speechSynthesis.speaking && !speechSynthesis.paused) pauseLocal();
      else if (speechSynthesis && speechSynthesis.paused) resumeLocal();
      else startLocal();
    });
    pauseBtn.addEventListener("click", pauseLocal);
    stopBtn.addEventListener("click", stopLocal);

    // store cleanup reference if needed
    wrapper._ttsStop = stopLocal;
  } // initTTSControls

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

  /* ---------- on-load hash highlight ---------- */
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

  /* ---------- escape closes modals ---------- */
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
