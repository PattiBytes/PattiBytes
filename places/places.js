// places.js (updated, unified)
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

        // Prefer explicit data-url (set in template)
        let url = btn.dataset.url;
        if (!url) {
          // fallback: build from id + path if available
          const id = article.dataset.id || article.id;
          if (id) {
            let basePath = article.dataset.path || window.location.pathname;
            url = `${window.location.origin}${basePath}#${id}`;
          }
        }

        if (!url) {
          console.error("copy-link: no URL to copy");
          return;
        }

        try {
          await copyToClipboard(url);
          // Visual feedback
          btn.classList.add("copied");
          const prev = btn.textContent;
          btn.textContent = "✔️";
          setTimeout(() => {
            btn.classList.remove("copied");
            btn.textContent = prev || "🔗";
          }, 1500);
        } catch (err) {
          console.warn("copy failed", err);
          alert("Copy failed — please copy manually: " + url);
        }
      });
    });

    // ---------- HASH ON LOAD: scroll + highlight ----------
    const initialHash = window.location.hash.slice(1);
    if (initialHash) {
      setTimeout(() => {
        const target = document.getElementById(initialHash);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
          flashHighlight(target, "highlighted", 2000);
        }
      }, 250);
    }

    // ---------- PLACES MODAL ----------
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

      // Populate media and content
      const imgSrc = card.dataset.image || "";
      const fullHtml =
        card.dataset.full || card.dataset.preview || card.innerHTML || "";

      if (modalMedia) {
        modalMedia.innerHTML = imgSrc
          ? `<img src="${imgSrc}" alt="${card.dataset.title || card.querySelector("h3")?.textContent || ""}" loading="lazy" style="max-width:100%;">`
          : "";
      }
      if (modalText) {
        modalText.innerHTML = fullHtml;
      }

      modal.setAttribute("aria-hidden", "false");
      modal.classList.add("open");

      lastFocusedElement = document.activeElement;
      if (btnClose) btnClose.focus();
      document.documentElement.classList.add("modal-open");
    }

    function closeModal() {
      if (!modal) return;
      modal.setAttribute("aria-hidden", "true");
      modal.classList.remove("open");
      if (
        lastFocusedElement &&
        typeof lastFocusedElement.focus === "function"
      ) {
        lastFocusedElement.focus();
      }
      document.documentElement.classList.remove("modal-open");
    }

    function showPrev() {
      if (!cards.length) return;
      openModal((currentIndex - 1 + cards.length) % cards.length);
    }
    function showNext() {
      if (!cards.length) return;
      openModal((currentIndex + 1) % cards.length);
    }

    if (cards.length && modal) {
      cards.forEach((card, idx) => {
        const readBtn = card.querySelector(".read-more-btn");
        if (readBtn) {
          readBtn.addEventListener("click", (ev) => {
            ev.stopPropagation();
            openModal(idx);
          });
        }

        // Keyboard accessibility
        card.addEventListener("keydown", (ev) => {
          if (
            (ev.key === "Enter" || ev.key === " ") &&
            document.activeElement === card
          ) {
            ev.preventDefault();
            openModal(idx);
          }
        });
      });

      if (btnClose) btnClose.addEventListener("click", (ev) => { ev.stopPropagation(); closeModal(); });
      if (btnPrev) btnPrev.addEventListener("click", (ev) => { ev.stopPropagation(); showPrev(); });
      if (btnNext) btnNext.addEventListener("click", (ev) => { ev.stopPropagation(); showNext(); });

      modal.addEventListener("click", (ev) => {
        if (ev.target === modal) closeModal();
      });

      document.addEventListener("keydown", (ev) => {
        if (!modal.classList.contains("open")) return;
        if (ev.key === "Escape") closeModal();
        else if (ev.key === "ArrowLeft") showPrev();
        else if (ev.key === "ArrowRight") showNext();
      });
    }
  }); // DOMContentLoaded
})();
