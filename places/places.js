// places.js (updated)
(function () {
  "use strict";

  // Utility: copy text to clipboard with fallback
  async function copyToClipboard(text) {
    if (!text) return Promise.reject(new Error("No text to copy"));
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return;
      }
      // fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  // Highlight element briefly
  function flashHighlight(el, className = "highlighted", duration = 2000) {
    if (!el) return;
    el.classList.add(className);
    setTimeout(() => el.classList.remove(className), duration);
  }

  // Build canonical link for an article/card: prefer data-id, then id attribute
  function buildHashUrlForElement(el, pathFallback) {
    if (!el) return null;
    const id = el.dataset.id || el.id;
    if (!id) return null;
    // If caller passed a specific path (e.g. '/places/'), use it; otherwise use current pathname
    const basePath = pathFallback || window.location.pathname;
    // Ensure basePath ends with a slash for readability
    const normalizedBase = basePath.endsWith("/") ? basePath : basePath;
    return `${window.location.origin}${normalizedBase}#${id}`;
  }

  // Single DOMContentLoaded handler
  document.addEventListener("DOMContentLoaded", () => {
    // ---------- COPY LINK HANDLERS ----------
    document.querySelectorAll(".copy-link").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const article = btn.closest("article");
        if (!article) {
          console.error("copy-link: no enclosing article found");
          return;
        }

        // Determine a sensible path: if article is a place-card, point to /places/
        const isPlace = article.classList.contains("place-card");
        const isNews = article.classList.contains("news-card");

        // Prefer explicit dataset.path if set, otherwise pick based on class
        let pathFallback = article.dataset.path || (isPlace ? "/places/" : window.location.pathname);

        // Use the article's dataset.id or id property
        const url = buildHashUrlForElement(article, pathFallback);
        if (!url) {
          console.error("copy-link: no id for article");
          return;
        }

        try {
          await copyToClipboard(url);
          // Visual feedback (non-blocking)
          btn.classList.add("copied");
          const prev = btn.textContent;
          btn.textContent = "✔️";
          setTimeout(() => {
            btn.classList.remove("copied");
            btn.textContent = prev || "🔗";
          }, 1500);
        } catch (err) {
          console.warn("copy failed", err);
          // As fallback show an alert (you may replace with custom UI)
          alert("Copy failed — please copy manually: " + url);
        }
      });
    });

    // ---------- HASH ON LOAD: scroll + highlight ----------
    const initialHash = window.location.hash.slice(1);
    if (initialHash) {
      // Delay slightly to allow layout to settle
      setTimeout(() => {
        const target = document.getElementById(initialHash);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
          flashHighlight(target, "highlighted", 2000);
        }
      }, 250);
    }

    // ---------- PLACES MODAL (if any) ----------
    const cards = Array.from(document.querySelectorAll(".place-card"));
    const modal = document.getElementById("places-modal");
    const modalMedia = modal ? modal.querySelector("#modal-media") : null;
    const modalText = modal ? modal.querySelector("#modal-text") : null;
    const btnClose = modal ? modal.querySelector("#modal-close") : null;
    const btnPrev = modal ? modal.querySelector("#modal-prev") : null;
    const btnNext = modal ? modal.querySelector("#modal-next") : null;

    let currentIndex = -1;
    let lastFocusedElement = null;

    function openModal(index) {
      if (!modal) return;
      if (index < 0 || index >= cards.length) return;
      currentIndex = index;
      const card = cards[currentIndex];

      // Populate media and content safely
      const imgSrc = card.dataset.image || "";
      const fullHtml = card.dataset.full || card.dataset.preview || card.innerHTML || "";

      if (modalMedia) {
        modalMedia.innerHTML = imgSrc
          ? `<img src="${imgSrc}" alt="${(card.dataset.title || card.querySelector('h3')?.textContent || '')}" loading="lazy" style="max-width:100%;">`
          : "";
      }
      if (modalText) {
        modalText.innerHTML = fullHtml;
      }

      // Show modal
      modal.setAttribute("aria-hidden", "false");
      modal.classList.add("open");

      // Save focus and move focus to close button for keyboard users
      lastFocusedElement = document.activeElement;
      if (btnClose) btnClose.focus();
      // Prevent background scroll
      document.documentElement.classList.add("modal-open");
    }

    function closeModal() {
      if (!modal) return;
      modal.setAttribute("aria-hidden", "true");
      modal.classList.remove("open");
      // restore focus
      if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
        lastFocusedElement.focus();
      }
      document.documentElement.classList.remove("modal-open");
    }

    function showPrev() {
      if (cards.length === 0) return;
      const prev = (currentIndex - 1 + cards.length) % cards.length;
      openModal(prev);
    }
    function showNext() {
      if (cards.length === 0) return;
      const next = (currentIndex + 1) % cards.length;
      openModal(next);
    }

    // Attach handlers only if modal exists
    if (cards.length && modal) {
      cards.forEach((card, idx) => {
        // Read-more button opens modal
        const readBtn = card.querySelector(".read-more-btn");
        if (readBtn) {
          readBtn.addEventListener("click", (ev) => {
            ev.stopPropagation();
            openModal(idx);
          });
        }

        // Make entire card clickable optionally (not required)
        card.addEventListener("keydown", (ev) => {
          // open on Enter or Space for accessibility
          if ((ev.key === "Enter" || ev.key === " ") && document.activeElement === card) {
            ev.preventDefault();
            openModal(idx);
          }
        });
      });

      // Modal controls (with guards)
      if (btnClose) btnClose.addEventListener("click", (ev) => { ev.stopPropagation(); closeModal(); });
      if (btnPrev) btnPrev.addEventListener("click", (ev) => { ev.stopPropagation(); showPrev(); });
      if (btnNext) btnNext.addEventListener("click", (ev) => { ev.stopPropagation(); showNext(); });

      // Close when clicking the overlay background
      modal.addEventListener("click", (ev) => {
        if (ev.target === modal) closeModal();
      });

      // Keyboard navigation inside modal: Esc to close, left/right for prev/next
      document.addEventListener("keydown", (ev) => {
        if (!modal.classList.contains("open")) return;
        if (ev.key === "Escape") {
          closeModal();
        } else if (ev.key === "ArrowLeft") {
          showPrev();
        } else if (ev.key === "ArrowRight") {
          showNext();
        }
      });
    }

    // If modal exists but there are no cards, remove it or keep hidden
    // (no action necessary)

    // ---------- OPTIONAL: Copy-link handler for news-style .news-card where the earlier code expected it ----------
    // (If you use the same places.js on news page, this will handle .news-card .copy-link clicks + hash-on-load highlight)
    document.querySelectorAll(".news-card .copy-link").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const article = btn.closest("article.news-card");
        if (!article) return;
        const url = buildHashUrlForElement(article, "/news/");
        if (!url) return alert("Unable to build link");
        try {
          await copyToClipboard(url);
          btn.classList.add("copied");
          const prev = btn.textContent;
          btn.textContent = "✔️";
          setTimeout(() => {
            btn.classList.remove("copied");
            btn.textContent = prev || "🔗";
          }, 1500);
        } catch (err) {
          alert("Copy failed — please copy manually: " + url);
        }
      });
    });

  }); // DOMContentLoaded close

})();
