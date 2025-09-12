// places.js (unified, enhanced) — keeps your working modal open/close, adds search, related, share, copy, TTS, a11y, deep-links, back-button close
(function () {
  "use strict";

  // ---------- Utilities ----------
  const q  = (s, c = document) => (c || document).querySelector(s);
  const qa = (s, c = document) => Array.from((c || document).querySelectorAll(s));
  const norm = (s) => (s || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const normalizeHash = (h) => {
    if (!h) return "";
    let s = h.replace(/^#/, "");
    s = s.replace(/\/+$/, "");
    try { return decodeURIComponent(s); } catch { return s; }
  };
  const paToRoman = (txt) => (txt || "")
    .replace(/[ਅਆ]/g, "a").replace(/[ਇਈ]/g, "i").replace(/[ਉਊ]/g, "u")
    .replace(/[ਏਐ]/g, "e").replace(/[ਓਔ]/g, "o").replace(/[ਂੰ]/g, "n")
    .replace(/[ਕਖਗਘ]/g, "k").replace(/[ਙ]/g, "ng").replace(/[ਚਛਜਝ]/g, "ch")
    .replace(/[ਞ]/g, "nj").replace(/[ਟਠਡਢ]/g, "t").replace(/[ਣਨ]/g, "n")
    .replace(/[ਤਥਦਧ]/g, "d").replace(/[ਪਫਬਭ]/g, "p").replace(/[ਮ]/g, "m")
    .replace(/[ਯ]/g, "y").replace(/[ਰ]/g, "r").replace(/[ਲ]/g, "l")
    .replace(/[ਵ]/g, "v").replace(/[ਸਸ਼]/g, "s").replace(/[ਹ]/g, "h");

  async function copyToClipboard(text) {
    if (!text) throw new Error("No text to copy");
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }

  async function shareLink({ title, text, url }) {
    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare({ title, text, url }))) {
        await navigator.share({ title, text, url });
        return true;
      }
    } catch (e) {
      // fall back to copy
    }
    await copyToClipboard(url);
    return false;
  }

  function flashHighlight(el, className = "highlighted", duration = 2000) {
    if (!el) return;
    el.classList.add(className);
    setTimeout(() => el.classList.remove(className), duration);
  }

  // ---------- TTS (single Play/Pause with word highlighting) ----------
  let voiceList = [];
  function ensureVoicesLoaded(timeout = 2500) {
    return new Promise((resolve) => {
      const s = window.speechSynthesis;
      const v = s ? s.getVoices() : [];
      if (v && v.length > 0) { voiceList = v; resolve(v); return; }
      let resolved = false;
      const onVoices = () => {
        if (resolved) return;
        const voices = s.getVoices();
        voiceList = voices || [];
        resolved = true;
        resolve(voiceList);
      };
      if (s && "onvoiceschanged" in s) s.onvoiceschanged = onVoices;
      const t0 = performance.now();
      (function poll() {
        const vv = s ? s.getVoices() : [];
        if (vv && vv.length > 0) { voiceList = vv; resolved = true; resolve(voiceList); return; }
        if (performance.now() - t0 > timeout) { voiceList = vv || []; resolved = true; resolve(voiceList); return; }
        setTimeout(poll, 120);
      })();
    });
  }
  function stopTTS() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    qa(".tts-highlight").forEach((s) => s.classList.remove("tts-highlight"));
    qa(".tts-play").forEach((b) => { b.textContent = "▶️ Play"; b.setAttribute("aria-pressed","false"); });
    qa(".tts-status").forEach((el) => el.textContent = "Stopped");
    qa(".tts-progress").forEach((el) => el.textContent = "");
  }
  function initTTSControls(wrapper, modalTextContainer, langPref) {
    const playBtn    = q(".tts-play", wrapper);
    const select     = q("#tts-voices", wrapper);
    const statusSpan = q(".tts-status", wrapper);
    const progressEl = q(".tts-progress", wrapper);
    const rateInput  = q("#tts-rate", wrapper);
    const pitchInput = q("#tts-pitch", wrapper);

    let voices = [];
    let utterRate = parseFloat(rateInput ? rateInput.value : 1.02) || 1.02;
    let utterPitch = parseFloat(pitchInput ? pitchInput.value : 1.0) || 1.0;
    let queue = [], queuePos = 0, wordSpans = [], currentWord = 0, pauseRequested = false;

    const getLangCode = (code) => (code || "").split(/[-_]/).toLowerCase();
    function findVoiceByValue(val) {
      if (!val || val === "__default__") return null;
      const [name, lang] = (val || "").split("||");
      return voices.find((v) => v.name === name && v.lang === lang) || null;
    }

    async function loadVoices() {
      voices = await ensureVoicesLoaded(2500);
      function addGroup(label, arr) {
        if (!arr.length) return;
        const og = document.createElement("optgroup"); og.label = label;
        arr.forEach((v) => {
          const opt = document.createElement("option");
          opt.value = `${v.name}||${v.lang}`;
          opt.textContent = `${v.name} (${v.lang})`;
          og.appendChild(opt);
        });
        select.appendChild(og);
      }
      const preferred = voices.filter((v) => getLangCode(v.lang) === langPref);
      const english   = voices.filter((v) => getLangCode(v.lang) === "en" && getLangCode(v.lang) !== langPref);
      const others    = voices.filter((v) => !preferred.includes(v) && !english.includes(v));
      select.innerHTML = "";
      addGroup("Preferred", preferred);
      addGroup("English", english);
      addGroup("Other voices", others);
      if (!select.options.length) {
        const o = document.createElement("option");
        o.value = "__default__"; o.textContent = "Default";
        select.appendChild(o);
      }
    }

    function prepareTextForReading() {
      qa(".tts-word-span", modalTextContainer).forEach((s) => {
        if (s.parentNode) s.parentNode.replaceChild(document.createTextNode(s.textContent), s);
      });
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
      modalTextContainer.innerHTML = "";
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
          try { wordSpans[i].scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) {}
          currentWord = i + 1;
          return;
        }
        total = end;
      }
    }

    function speakNextChunk() {
      if (!window.speechSynthesis) { statusSpan.textContent = "TTS unsupported"; return; }
      if (queuePos >= queue.length) { stopLocal(); return; }
      const text = queue[queuePos++];
      const utter = new SpeechSynthesisUtterance(text);
      const sel = select.value;
      const chosen = findVoiceByValue(sel);
      if (chosen) utter.voice = chosen;
      else utter.lang = langPref || (document.documentElement.lang || "pa-IN");
      utter.rate = utterRate;
      utter.pitch = utterPitch;

      // boundary events provide charIndex for highlighting
      utter.onboundary = (ev) => { if (ev.name === "word") highlightByCharIndex(ev.charIndex); };

      utter.onend = () => {
        const total = qa(".tts-word-span", modalTextContainer).length || 1;
        const add = text.split(/\s+/).length;
        currentWord = Math.min(total, currentWord + add);
        const pct = Math.round((currentWord / total) * 100);
        if (progressEl) progressEl.textContent = ` ${pct}%`;
        setTimeout(() => { if (!pauseRequested) speakNextChunk(); }, 80);
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
      qa(".tts-highlight", modalTextContainer).forEach((s) => s.classList.remove("tts-highlight"));
      playBtn.textContent = "▶️ Play";
      playBtn.setAttribute("aria-pressed", "false");
      statusSpan.textContent = "Stopped";
      if (progressEl) progressEl.textContent = "";
    }

    function startTTS() {
      if (!window.speechSynthesis) { statusSpan.textContent = "TTS 지원되지 않음"; return; }
      prepareTextForReading();
      if (!qa(".tts-word-span", modalTextContainer).length) { statusSpan.textContent = "ਕੋਈ ਪਾਠ ਨਹੀਂ"; return; }
      buildQueue();
      currentWord = 0; queuePos = 0; pauseRequested = false;
      statusSpan.textContent = "ਬੋਲ ਰਹੇ ਹਨ...";
      playBtn.textContent = "⏸️ Pause";
      playBtn.setAttribute("aria-pressed", "true");
      speakNextChunk();
    }

    function pauseTTS() {
      if (window.speechSynthesis?.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        pauseRequested = true;
        statusSpan.textContent = "ਰੁਕਿਆ";
        playBtn.textContent = "▶️ Play";
        playBtn.setAttribute("aria-pressed", "false");
      }
    }

    function resumeTTS() {
      if (window.speechSynthesis?.paused) {
        window.speechSynthesis.resume();
        pauseRequested = false;
        statusSpan.textContent = "ਜਾਰੀ...";
        playBtn.textContent = "⏸️ Pause";
        playBtn.setAttribute("aria-pressed", "true");
      }
    }

    function restartFromCurrentWord() {
      const idx = computeChunkIndexForWordIndex(currentWord || 1);
      if (idx >= 0) {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        queuePos = idx;
        qa(".tts-highlight", modalTextContainer).forEach((s) => s.classList.remove("tts-highlight"));
        setTimeout(() => speakNextChunk(), 120);
      }
    }

    playBtn.addEventListener("click", () => {
      if (window.speechSynthesis?.speaking && !window.speechSynthesis.paused) pauseTTS();
      else if (window.speechSynthesis?.paused)                                            resumeTTS();
      else                                                                                startTTS();
    });
    select.addEventListener("change", () => { if (window.speechSynthesis?.speaking) restartFromCurrentWord(); });
    rateInput.addEventListener("input", (e) => { const v = parseFloat(e.target.value)||1.02; if (v!==utterRate) utterRate=v; if (window.speechSynthesis?.speaking) restartFromCurrentWord(); });
    pitchInput.addEventListener("input", (e) => { const v = parseFloat(e.target.value)||1.0; if (v!==utterPitch) utterPitch=v; if (window.speechSynthesis?.speaking) restartFromCurrentWord(); });

    loadVoices().catch(()=>{});
    return { stop: () => { try { stopLocal(); } catch(e){} } };
  }

  // ---------- Main ----------
  document.addEventListener("DOMContentLoaded", () => {
    // COPY LINK (unified)
    qa(".copy-link").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const article = btn.closest("article");
        if (!article) return;
        const basePath = article.classList.contains("place-card") ? "/places/" :
                         article.classList.contains("news-card")  ? "/news/"   :
                         window.location.pathname;
        const id = article.id;
        if (!id) return;
        const url = `${window.location.origin}${basePath}#${encodeURIComponent(id)}`;
        try {
          await copyToClipboard(url);
          btn.classList.add("copied");
          const prev = btn.textContent;
          btn.textContent = "✔️";
          setTimeout(() => { btn.classList.remove("copied"); btn.textContent = prev || "🔗"; }, 1500);
        } catch {
          alert("Copy failed — please copy manually: " + url);
        }
      });
    });

    // SHARE (native if available, fallback to copy)
    qa(".share-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const a = btn.closest("article.place-card");
        if (!a) return;
        const title = a.dataset.title || a.querySelector("h3")?.textContent || document.title;
        const url   = `${window.location.origin}/places/#${encodeURIComponent(a.id)}`;
        const text  = (a.dataset.preview || "").slice(0, 120);
        const ok = await shareLink({ title, text, url });
        if (!ok) {
          btn.classList.add("copied");
          const prev = btn.textContent;
          btn.textContent = "✔️";
          setTimeout(() => { btn.classList.remove("copied"); btn.textContent = prev || "📤"; }, 1500);
        }
      });
    });

    // HASH ON LOAD: scroll + highlight
    const initialHash = window.location.hash.slice(1);
    if (initialHash) {
      setTimeout(() => {
        const targetId = initialHash.split("/").pop();
        const target = document.getElementById(targetId);
        if (target) {
          try { target.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) {}
          flashHighlight(target, "highlighted", 2000);
        }
      }, 250);
    }

    // ---------- PLACES MODAL ----------
    const cards = Array.from(document.querySelectorAll(".place-card"));
    const modal = document.getElementById("places-modal");
    const modalMedia = modal ? modal.querySelector("#modal-media") : null;
    const modalText  = modal ? modal.querySelector("#modal-text")  : null;
    const btnClose   = modal ? modal.querySelector("#modal-close") : null;
    const btnPrev    = modal ? modal.querySelector("#modal-prev")  : null;
    const btnNext    = modal ? modal.querySelector("#modal-next")  : null;

    if (!modal || !cards.length) return;

    // Search (Gurmukhi + romanized)
    const searchInput = q("#places-search");
    const clearSearch = q("#clear-search");
    const noMatchEl   = q("#no-match");

    const index = cards.map((c) => {
      const title = c.dataset.title || c.querySelector("h3")?.textContent || "";
      const prev  = c.dataset.preview || "";
      const text  = `${title} ${prev}`.trim();
      return { el: c, nText: norm(text), rText: norm(paToRoman(text)) };
    });

    function applySearch(qstr) {
      const qn = norm(qstr);
      const qr = norm(paToRoman(qstr));
      let shown = 0;
      index.forEach(({ el, nText, rText }) => {
        const match = (!qn && !qr) || nText.includes(qn) || rText.includes(qr);
        el.style.display = match ? "" : "none";
        if (match) shown++;
      });
      if (noMatchEl) {
        if (shown === 0) { noMatchEl.style.display = "block"; noMatchEl.textContent = "ਕੋਈ ਮਿਲਦਾ ਸਥਾਨ ਨਹੀਂ ਮਿਲਿਆ।"; }
        else noMatchEl.style.display = "none";
      }
    }

    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        applySearch(e.target.value || "");
        const hasValue = !!(e.target.value || "").trim();
        clearSearch?.classList.toggle("visible", hasValue);
      });
      searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const first = cards.find((c) => c.style.display !== "none");
          if (first) first.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    }
    clearSearch?.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      applySearch("");
      clearSearch.classList.remove("visible");
      searchInput?.focus();
    });

    // State for history/back + focus
    let currentIndex = -1;
    let lastFocusedElement = null;
    let modalOpen = false;
    let hadPushedState = false;

    function trapFocus(e) {
      if (!modalOpen || e.key !== "Tab") return;
      const focusables = qa("#places-modal button, #places-modal a, #places-modal input, #places-modal select, #places-modal textarea, #places-modal [tabindex]:not([tabindex='-1'])")
        .filter(el => !el.hasAttribute("disabled") && el.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables, last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    // Related articles
    function populateRelated(activeCard) {
      if (!modalText) return;
      const existing = modalText.parentNode.querySelector(".modal-related");
      if (existing) existing.remove();

      const titleWords = (activeCard.dataset.title || activeCard.querySelector("h3")?.textContent || "")
        .toLowerCase().split(/\W+/).filter(Boolean);
      const prevWords  = (activeCard.dataset.preview || "").toLowerCase().split(/\W+/).filter(Boolean);

      const scores = [];
      cards.forEach((c) => {
        if (c === activeCard) return;
        let score = 0;
        const tWords = (c.dataset.title || c.querySelector("h3")?.textContent || "").toLowerCase().split(/\W+/).filter(Boolean);
        const pWords = (c.dataset.preview || "").toLowerCase().split(/\W+/).filter(Boolean);
        score += tWords.filter((w) => titleWords.includes(w)).length * 3;
        score += pWords.filter((w) => prevWords.includes(w)).length;
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
        const cardTitle = c.dataset.title || c.querySelector("h3")?.textContent || "";
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

      qa(".related-open", wrap).forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.dataset.id;
          if (!id) return;
          const encoded = encodeURIComponent(id);
          try { history.pushState({ placeModal: id }, "", `/places/#${encoded}`); hadPushedState = true; } catch (e) { hadPushedState = false; }
          const target = document.getElementById(id);
          if (target) {
            // soft close current, then open target
            internalClose();
            setTimeout(() => {
              try { target.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) {}
              flashHighlight(target, "highlighted", 1600);
              openModal(cards.indexOf(target));
            }, 280);
          }
        });
      });
    }

    function internalClose() {
      modal.setAttribute("aria-hidden", "true");
      modal.classList.remove("open");
      if (modal.style.display !== "none") modal.style.display = "none"; // safety
      // cleanup TTS and UI
      stopTTS();
      qa(".tts-controls", modal).forEach((n) => n.remove());
      qa(".tts-toggle-btn", modal).forEach((n) => n.remove());
      qa(".tts-word-span", modalText).forEach((s) => {
        if (s.parentNode) s.parentNode.replaceChild(document.createTextNode(s.textContent), s);
      });
      // restore focus
      if (lastFocusedElement && typeof lastFocusedElement.focus === "function") lastFocusedElement.focus();
      document.documentElement.classList.remove("modal-open");
      modalOpen = false;
    }

    function closeModal() {
      // Honor history so Back closes modal
      if (hadPushedState) {
        try { history.back(); }
        catch { internalClose(); hadPushedState = false; modalOpen = false; }
        return;
      }
      internalClose();
      hadPushedState = false;
      try { history.replaceState(history.state, "", "/places/"); } catch {}
    }

    function openModal(index) {
      if (!modal) return;
      if (index < 0 || index >= cards.length) return;
      currentIndex = index;
      const card = cards[currentIndex];

      // Populate media and content
      const imgSrc = card.dataset.image || "";
      const fullHtml = card.dataset.full || card.dataset.preview || card.innerHTML || "";

      if (modalMedia) {
        modalMedia.innerHTML = imgSrc
          ? `<img src="${imgSrc}" alt="${card.dataset.title || card.querySelector("h3")?.textContent || ""}" loading="lazy" style="max-width:100%;">`
          : "";
      }
      if (modalText) {
        modalText.innerHTML = fullHtml;
      }

      // Related
      populateRelated(card);

      // TTS toggle + container (lazy-init controls)
      const existing = modal.querySelector(".tts-controls, .tts-toggle-btn");
      if (existing) existing.remove();

      const ttsToggleBtn = document.createElement("button");
      ttsToggleBtn.className = "tts-toggle-btn";
      ttsToggleBtn.innerHTML = "🔊";
      ttsToggleBtn.title = "Toggle Text-to-Speech";
      ttsToggleBtn.type = "button";
      btnClose?.after(ttsToggleBtn);

      const ttsWrap = document.createElement("div");
      ttsWrap.className = "tts-controls";
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

      const cardLang = (document.documentElement.lang || "pa-IN");
      const langPref = cardLang.split(/[-_]/).toLowerCase();
      let ttsInstance = null;
      ttsToggleBtn.addEventListener("click", () => {
        const opening = !ttsWrap.classList.contains("show");
        if (opening) {
          ttsWrap.classList.add("show");
          ttsToggleBtn.classList.add("active");
          if (!ttsInstance) ttsInstance = initTTSControls(ttsWrap, modalText, langPref);
          q(".tts-play", ttsWrap)?.focus();
          try { ttsWrap.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) {}
        } else {
          ttsWrap.classList.remove("show");
          ttsToggleBtn.classList.remove("active");
          if (ttsInstance?.stop) { try { ttsInstance.stop(); } catch(e){} }
          qa(".tts-highlight", modalText).forEach((s) => s.classList.remove("tts-highlight"));
        }
      });

      // Show modal (keep your working pattern + force display in case CSS differs)
      modal.setAttribute("aria-hidden", "false");
      modal.classList.add("open");
      modal.style.display = "flex";
      lastFocusedElement = document.activeElement;
      btnClose?.focus();
      document.documentElement.classList.add("modal-open");
      modalOpen = true;

      // Push state so Back closes modal
      const articleId = card.id || card.dataset.id;
      const basePath = card.dataset.path || "/places/";
      const newUrl = `${basePath}#${encodeURIComponent(articleId)}`;
      try { history.pushState({ placeModal: articleId }, "", newUrl); hadPushedState = true; } catch { hadPushedState = false; }

      // Keyboard accessibility
      document.addEventListener("keydown", keyHandler);
    }

    function keyHandler(ev) {
      if (!modal.classList.contains("open")) return;
      if (ev.key === "Escape")           closeModal();
      else if (ev.key === "ArrowLeft")   showPrev();
      else if (ev.key === "ArrowRight")  showNext();
      else if (ev.key === "Tab")         trapFocus(ev);
    }

    function showPrev() { if (!cards.length) return; openModal((currentIndex - 1 + cards.length) % cards.length); }
    function showNext() { if (!cards.length) return; openModal((currentIndex + 1) % cards.length); }

    // Buttons
    btnClose?.addEventListener("click", (ev) => { ev.stopPropagation(); closeModal(); });
    btnPrev?.addEventListener("click",  (ev) => { ev.stopPropagation(); showPrev(); });
    btnNext?.addEventListener("click",  (ev) => { ev.stopPropagation(); showNext(); });

    // Clicking overlay outside content closes
    modal.addEventListener("click", (ev) => { if (ev.target === modal) closeModal(); });

    // Card triggers
    cards.forEach((card, idx) => {
      const readBtn = card.querySelector(".read-more-btn");
      if (readBtn) {
        readBtn.addEventListener("click", (ev) => { ev.stopPropagation(); openModal(idx); });
      }
      card.addEventListener("keydown", (ev) => {
        if ((ev.key === "Enter" || ev.key === " ") && document.activeElement === card) {
          ev.preventDefault();
          openModal(idx);
        }
      });
    });

    // Back/Forward: close modal via popstate, and open from hash if present
    window.addEventListener("popstate", () => {
      if (modalOpen) {
        internalClose();
        hadPushedState = false;
      }
      const id = normalizeHash(window.location.hash || "");
      if (id) {
        const target = document.getElementById(id);
        if (target && target.classList.contains("place-card")) {
          openModal(cards.indexOf(target));
        }
      }
    });

    // Open from hash on load and on hashchange
    function handleHashOpen() {
      const id = normalizeHash(window.location.hash || "");
      if (!id) return;
      const target = document.getElementById(id);
      if (target && target.classList.contains("place-card")) {
        openModal(cards.indexOf(target));
        try { target.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) {}
        flashHighlight(target, "highlighted", 1600);
      }
    }
    handleHashOpen();
    window.addEventListener("hashchange", handleHashOpen, false);
  });
})();
