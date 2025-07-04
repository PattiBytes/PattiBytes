document.addEventListener("DOMContentLoaded", () => {
  // 1) Copy-link handler: builds /news.html#<id>
  document.querySelectorAll(".copy-link").forEach((btn) => {
    btn.addEventListener("click", async () => {
      console.log("🔗 Copy button clicked");
      const article = btn.closest("article.news-card");
      if (!article || !article.id) {
        console.error("No article or missing id");
        return;
      }

      // Hash-based URL
      const url = `${window.location.origin}${window.location.pathname}#${article.id}`;
      console.log("Copying URL:", url);

      try {
        // Try native API
        await navigator.clipboard.writeText(url);
      } catch (err) {
        console.warn("Clipboard API failed, using fallback", err);
        // Fallback using textarea+execCommand
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.top = 0;
        ta.style.left = 0;
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }

      // Visual feedback
      btn.classList.add("copied");
      btn.textContent = "✔️";
      setTimeout(() => {
        btn.classList.remove("copied");
        btn.textContent = "🔗";
      }, 1500);
    });
  });

  // 2) On-load: scroll & highlight if there's a hash
  const hash = window.location.hash.slice(1);
  if (hash) {
    const target = document.getElementById(hash);
    if (target) {
      setTimeout(() => {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        target.classList.add("highlighted");
        setTimeout(() => target.classList.remove("highlighted"), 2000);
      }, 300);
    }
  }
});

// places.js

document.addEventListener("DOMContentLoaded", () => {
  const cards = document.querySelectorAll(".place-card");
  const modal = document.getElementById("places-modal");
  const modalMedia = document.getElementById("modal-media");
  const modalText = document.getElementById("modal-text");
  const btnClose = document.getElementById("modal-close");
  const btnPrev = document.getElementById("modal-prev");
  const btnNext = document.getElementById("modal-next");

  let currentIndex = -1;

  // Open modal for a given card index
  function openModal(index) {
    currentIndex = index;
    const card = cards[currentIndex];
    const imgSrc = card.dataset.image;
    const fullText = card.dataset.full;
    modalMedia.innerHTML = imgSrc
      ? `<img src="${imgSrc}" alt="" loading="lazy" style="max-width:100%;">`
      : "";
    modalText.innerHTML = fullText;
    modal.setAttribute("aria-hidden", "false");
    modal.classList.add("open");
  }

  // Close modal
  function closeModal() {
    modal.setAttribute("aria-hidden", "true");
    modal.classList.remove("open");
  }

  // Prev/Next
  function showPrev() {
    openModal((currentIndex - 1 + cards.length) % cards.length);
  }
  function showNext() {
    openModal((currentIndex + 1) % cards.length);
  }

  // 1) Attach only to Read‑More buttons
  cards.forEach((card, idx) => {
    const readBtn = card.querySelector(".read-more-btn");
    const copyBtn = card.querySelector(".copy-link");

    // Open modal when Read‑More is clicked
    if (readBtn) {
      readBtn.addEventListener("click", e => {
        e.stopPropagation();
        openModal(idx);
      });
    }

    // Copy Link handler (example)
    if (copyBtn) {
      copyBtn.addEventListener("click", e => {
        e.stopPropagation();
        const url = `${window.location.origin}/places/#${card.dataset.id}`;
        navigator.clipboard.writeText(url)
          .then(() => alert("Link copied!"))
          .catch(() => alert("Copy failed"));
      });
    }

    // Prevent card click from doing anything (if you had a handler)
    card.addEventListener("click", e => {
      /* no-op: or you can remove any existing logic here */
    });
  });

  // Modal controls
  btnClose.addEventListener("click", e => {
    e.stopPropagation();
    closeModal();
  });
  btnPrev.addEventListener("click", e => {
    e.stopPropagation();
    showPrev();
  });
  btnNext.addEventListener("click", e => {
    e.stopPropagation();
    showNext();
  });

  // Close modal on overlay click (optional)
  modal.addEventListener("click", e => {
    if (e.target === modal) closeModal();
  });

  // Escape key closes modal
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeModal();
  });
});

