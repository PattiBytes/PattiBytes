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
        if (isNaN(then.getTime())) return "";
        const now = new Date();
        const diffMs = now.getTime() - then.getTime();
        const sec = Math.round(diffMs / 1000);

        if (sec < 0) {
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

    /* ---------- 2) populate read-time + relative date ---------- */
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
                const existingRel = publishedEl.parentNode.querySelector('.published-relative');
                if (existingRel) existingRel.remove();
                publishedEl.parentNode.insertBefore(relSpan, publishedEl.nextSibling);
            }
        }
    });

    /* ---------- 3) Pagination / infinite scroll ---------- */
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
        }, { root: null, rootMargin: "200px", threshold: 0.01 }
    );
    observer.observe(sentinel);

    /* ---------- 4) Modal open / close ---------- */
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

        const metaWrap = document.createElement("div");
        metaWrap.className = "modal-meta";
        const d = new Date(dateISO);
        const dateStr = !isNaN(d.getTime()) ?
            d.toLocaleDateString("pa-IN", { year: "numeric", month: "long", day: "numeric" }) :
            "";
        metaWrap.innerHTML = `<p style="margin:0 0 .5rem 0;"><strong>${author}</strong> · ${dateStr}</p>`;
        modalText.prepend(metaWrap);

        populateRelated(card);

        // Remove any previous TTS UI elements to prevent duplication
        const existingTtsToggle = newsModal.querySelector(".tts-toggle-btn");
        if (existingTtsToggle) existingTtsToggle.remove();
        const existingTtsControls = newsModal.querySelector(".tts-controls");
        if (existingTtsControls) existingTtsControls.remove();

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
            if (ttsWrap.style.display !== "none") {
                setTimeout(() => {
                    ttsWrap.scrollIntoView({ behavior: "smooth", block: "center" });
                }, 100); // Small delay to allow element to render and occupy space
            }
        });

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

        qa(".tts-word-span").forEach((s) => {
            if (s.parentNode) {
                const textNode = document.createTextNode(s.textContent);
                s.parentNode.replaceChild(textNode, s);
                s.parentNode.normalize();
            }
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

    /* ---------- 5) image modal ---------- */
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

    /* ---------- 6) related ---------- */
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

    /* ---------- 7) TTS improvements ---------- */
    let synth = window.speechSynthesis;
    let voiceList = [];
    let ttsUtterance = null;
    let ttsPlaying = false; // Correct state variable

    function ensureVoicesLoaded(timeout = 2500) {
        return new Promise((resolve) => {
            let voices = synth ? synth.getVoices() : [];
            if (voices.length > 0) {
                resolve(voices);
                return;
            }
            if (synth && "onvoiceschanged" in synth) {
                synth.onvoiceschanged = () => {
                    voices = synth.getVoices();
                    if (voices.length > 0) {
                        resolve(voices);
                    }
                };
            }
            setTimeout(() => {
                voices = synth ? synth.getVoices() : [];
                resolve(voices);
            }, timeout);
        });
    }

    async function initTTSControls(wrapper, modalTextContainer, langPref) {
        const playBtn = wrapper.querySelector(".tts-play");
        const stopBtn = wrapper.querySelector(".tts-stop");
        const select = wrapper.querySelector("#tts-voices");
        const statusSpan = wrapper.querySelector(".tts-status");
        
        voiceList = await ensureVoicesLoaded();

        function populateVoices() {
            select.innerHTML = "";
            const preferred = voiceList.filter((v) => getLangCode(v.lang) === langPref);
            const english = voiceList.filter((v) => getLangCode(v.lang) === "en" && getLangCode(v.lang) !== langPref);
            const others = voiceList.filter((v) => !preferred.includes(v) && !english.includes(v));

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
        }
        populateVoices();

        function prepareTextForReading() {
            // Remove previous tts word spans
            qa(".tts-word-span", modalTextContainer).forEach((s) => {
                if (s.parentNode) s.parentNode.replaceChild(document.createTextNode(s.textContent), s);
            });
            modalTextContainer.normalize();
            
            const content = modalTextContainer.cloneNode(true);
            const meta = content.querySelector('.modal-meta');
            if(meta) meta.remove();

            const nodes = Array.from(content.querySelectorAll("p, h1, h2, h3, h4, li")).filter(
                (el) => el.textContent.trim() !== ""
            );
            const newContent = document.createElement("div");
            newContent.className = 'tts-prepared-content';
            
            nodes.forEach(el => {
                const textContent = stripHtml(el.innerHTML).trim();
                const words = textContent.split(/\s+/).filter(Boolean);
                const newEl = document.createElement(el.tagName);
                words.forEach(word => {
                    const span = document.createElement("span");
                    span.className = "tts-word-span";
                    span.textContent = word + ' ';
                    newEl.appendChild(span);
                });
                newContent.appendChild(newEl);
            });
            
            modalTextContainer.innerHTML = '';
            modalTextContainer.appendChild(newContent);
        }
        
        let wordSpans = [];
        
        function speakAllText() {
            if (!synth) {
                statusSpan.textContent = "TTS not supported.";
                return;
            }
            
            prepareTextForReading();
            wordSpans = qa(".tts-word-span", modalTextContainer);
            const fullText = wordSpans.map(span => span.textContent).join('');
            
            ttsUtterance = new SpeechSynthesisUtterance(fullText);
            const sel = select.value;
            const chosen = voiceList.find(v => `${v.name}||${v.lang}` === sel);
            if (chosen) {
                ttsUtterance.voice = chosen;
                ttsUtterance.lang = chosen.lang;
            } else {
                ttsUtterance.lang = langPref;
            }
            ttsUtterance.rate = 1.05;
            ttsUtterance.pitch = 1;
            
            let charIndex = 0;
            ttsUtterance.onboundary = (ev) => {
                if (ev.name === 'word') {
                    qa(".tts-highlight", modalTextContainer).forEach(s => s.classList.remove('tts-highlight'));
                    let wordFound = false;
                    for (const span of wordSpans) {
                        const wordText = span.textContent;
                        if (ev.charIndex >= charIndex && ev.charIndex < charIndex + wordText.length) {
                            span.classList.add('tts-highlight');
                            span.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            wordFound = true;
                            break;
                        }
                        charIndex += wordText.length;
                    }
                    if (!wordFound) {
                        charIndex = 0; // Reset if boundary event doesn't map correctly
                    }
                }
            };
            
            ttsUtterance.onend = () => {
                stopTTS();
            };
            
            synth.speak(ttsUtterance);
            ttsPlaying = true; // Set state to playing
            playBtn.textContent = '⏸️ Pause';
            playBtn.setAttribute('aria-pressed', 'true');
            statusSpan.textContent = 'Playing...';
        }
        
        function pauseTTS() {
            if (synth.speaking && !synth.paused) {
                synth.pause();
                playBtn.textContent = '▶️ Play';
                playBtn.setAttribute('aria-pressed', 'false');
                statusSpan.textContent = 'Paused...';
                ttsPlaying = false; // Set state to paused
            }
        }
        
        function resumeTTS() {
            if (synth.paused) {
                synth.resume();
                playBtn.textContent = '⏸️ Pause';
                playBtn.setAttribute('aria-pressed', 'true');
                statusSpan.textContent = 'Playing...';
                ttsPlaying = true; // Set state to playing
            }
        }
        
        function stopTTS() {
            if (synth.speaking) {
                synth.cancel();
            }
            ttsUtterance = null;
            qa(".tts-highlight", modalTextContainer).forEach(s => s.classList.remove('tts-highlight'));
            playBtn.textContent = '▶️ Play';
            playBtn.setAttribute('aria-pressed', 'false');
            statusSpan.textContent = 'Stopped';
            ttsPlaying = false; // Set state to stopped
        }

        // Toggle button logic
        playBtn.addEventListener("click", () => {
            if (ttsPlaying) {
                pauseTTS();
            } else {
                if (synth.paused) {
                    resumeTTS();
                } else {
                    speakAllText();
                }
            }
        });
        
        stopBtn.addEventListener("click", stopTTS);
    }

    /* ---------- 8) hash highlight ---------- */
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

    /* ---------- 9) global Escape closes modals ---------- */
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            qa(".modal-overlay[aria-hidden='false']").forEach((m) => {
                m.setAttribute("aria-hidden", "true");
                m.style.display = "none";
                document.body.style.overflow = "";
            });
            if (window.speechSynthesis) window.speechSynthesis.cancel();
        }
    });

});
