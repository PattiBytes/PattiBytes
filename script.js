document.addEventListener("DOMContentLoaded", () => {
  // ----- 1) GTranslate Toggle (unchanged) -----
  const desktopToggle = document.getElementById("lang-toggle");
  function setGTranslate(lang) {
    document.cookie = `googtrans=/pa/${lang}; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/`;
  }
  const savedLang = localStorage.getItem("pattiBytesLang") || "pa";
  setGTranslate(savedLang);
  if (desktopToggle) {
    desktopToggle.checked = savedLang === "en";
    desktopToggle.addEventListener("change", (e) => {
      const newLang = e.target.checked ? "en" : "pa";
      localStorage.setItem("pattiBytesLang", newLang);
      setGTranslate(newLang);
      setTimeout(() => window.location.reload(), 300);
    });
  }

  // ----- 2) Back-to-Top Button (unchanged) -----
  const backToTop = document.getElementById("back-to-top");
  if (backToTop) {
    let scrollTimeout;
    window.addEventListener("scroll", () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        backToTop.classList.toggle("visible", window.scrollY > 300);
      }, 100);
    });
    backToTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // ----- 3) Scroll-Triggered Animations (unchanged) -----
  (function initScrollAnimations() {
    const elements = document.querySelectorAll(".slide-in-left");
    if (!elements.length) return;
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.animation = "slideInLeft 1s ease-out forwards";
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );
    elements.forEach((el) => observer.observe(el));
  })();

  // ----- 4) Three.js Setup (unchanged) -----
  (function initThreeJS() {
    const container = document.getElementById("threejs-container");
    if (!container) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1.5, 3);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    const loader = new THREE.GLTFLoader();
    loader.load(
      "models/punjab_monument.glb",
      (gltf) => {
        const model = gltf.scene;
        model.scale.set(1.2, 1.2, 1.2);
        scene.add(model);
        function animate() {
          requestAnimationFrame(animate);
          model.rotation.y += 0.005;
          renderer.render(scene, camera);
        }
        animate();
      },
      undefined,
      (error) => console.error("Error loading 3D model:", error)
    );

    window.addEventListener("resize", () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    });
  })();

  // ----- 5) FAQ Dropdown (unchanged) -----
  document.querySelectorAll(".faq-question").forEach((btn) => {
    btn.addEventListener("click", () => {
      const answer = btn.nextElementSibling;
      if (answer.style.maxHeight) {
        answer.style.maxHeight = null;
      } else {
        answer.style.maxHeight = answer.scrollHeight + "px";
      }
    });
  });

  // ----- 6) Hamburger + “Home ▶ Topics” Toggle (unchanged) -----
  const hamburger = document.getElementById("hamburger");
  const mobileMenu = document.getElementById("mobile-menu");

  if (hamburger && mobileMenu) {
    const closeMenu = () => {
      mobileMenu.classList.remove("show");
      hamburger.setAttribute("aria-expanded", "false");
      mobileMenu.setAttribute("aria-hidden", "true");

      document.querySelectorAll(".has-dropdown .dropdown").forEach((dd) => {
        dd.style.display = "none";
      });
      document
        .querySelectorAll(".dropdown-toggle.open")
        .forEach((btn) => btn.classList.remove("open"));
    };

    const toggleMenu = () => {
      const isExpanded = hamburger.getAttribute("aria-expanded") === "true";
      hamburger.setAttribute("aria-expanded", String(!isExpanded));
      mobileMenu.classList.toggle("show");
      mobileMenu.setAttribute("aria-hidden", String(isExpanded));
    };

    hamburger.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMenu();
    });
    document.addEventListener("click", closeMenu);
    mobileMenu.addEventListener("click", (e) => e.stopPropagation());

    document.querySelectorAll(".dropdown-toggle").forEach((toggleBtn) => {
      toggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const parentLi = toggleBtn.closest(".has-dropdown");
        const submenu = parentLi.querySelector(".dropdown");
        const isOpen = submenu.style.display === "block";

        document
          .querySelectorAll(".has-dropdown .dropdown")
          .forEach((dd) => (dd.style.display = "none"));
        document
          .querySelectorAll(".dropdown-toggle.open")
          .forEach((btn) => btn.classList.remove("open"));

        if (!isOpen) {
          submenu.style.display = "block";
          toggleBtn.classList.add("open");
        } else {
          submenu.style.display = "none";
          toggleBtn.classList.remove("open");
        }
      });
    });

    mobileMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", (e) => {
        const href = link.getAttribute("href");
        if (href.startsWith("#")) {
          e.preventDefault();
          const target = document.querySelector(href);
          if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        closeMenu();
      });
    });
  }

  // ----- 7) Auto-Scroll Achievements (unchanged) -----
  const scrollContainer = document.querySelector(".achievements-scroll");
  if (scrollContainer) {
    let scrollPos = 0;
    const scrollSpeed = 0.5;
    function step() {
      const scrollWidth = scrollContainer.scrollWidth;
      const visibleWidth = scrollContainer.clientWidth;
      const maxScrollLeft = scrollWidth - visibleWidth;
      scrollPos += scrollSpeed;
      if (scrollPos >= maxScrollLeft) scrollPos = 0;
      scrollContainer.scrollLeft = scrollPos;
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // ----- 8) “History” Read-More Modal (unchanged) -----
  const historyModal = document.getElementById("history-modal");
  const readMoreBtn = document.getElementById("read-more-btn");
  const closeBtn = document.getElementById("modal-close");

  if (readMoreBtn && historyModal) {
    readMoreBtn.addEventListener("click", () => {
      historyModal.style.display = "flex";
      historyModal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    });
  }
  if (closeBtn && historyModal) {
    closeBtn.addEventListener("click", () => {
      historyModal.style.display = "none";
      historyModal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    });
  }
  if (historyModal) {
    historyModal.addEventListener("click", (e) => {
      if (e.target === historyModal) {
        historyModal.style.display = "none";
        historyModal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && historyModal.style.display === "flex") {
        historyModal.style.display = "none";
        historyModal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
      }
    });
  }

  /*********************************************
   * 9) “Read More →” Buttons for News Cards
   *********************************************/
 const newsModal   = document.getElementById("news-modal");
const modalTitle  = document.getElementById("modal-title");
const modalText   = document.getElementById("modal-text");
const modalMedia  = document.getElementById("modal-media");
const modalCloseN = document.getElementById("modal-close");

function clearModalMedia() {
  if (modalMedia) modalMedia.innerHTML = "";
}

document.querySelectorAll(".latest-news .read-more-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const card = e.target.closest(".news-card");
    if (!card) return;

    // 1) Title remains plain text → safe against XSS
    const title   = card.getAttribute("data-title")   || "";
    // 2) Content is now HTML → inject via innerHTML
    const content = card.getAttribute("data-content") || "";
    modalTitle.textContent = title;
    modalText.innerHTML    = content;

    // 3) If there is a media-container, clone it:
    clearModalMedia();
    const sourceMedia = card.querySelector(".media-container");
    if (sourceMedia) {
      const clone = sourceMedia.cloneNode(true);
      clone.style.width  = "100%";
      clone.style.height = "auto";
      clone.querySelectorAll("img, iframe").forEach((el) => {
        el.style.width  = "100%";
        el.style.height = "auto";
      });
      modalMedia.appendChild(clone);
    }

    // 4) Show the modal
    newsModal.style.display       = "flex";
    newsModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  });
});

function closeNewsModal() {
  newsModal.style.display       = "none";
  newsModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow  = "";
  clearModalMedia();
}

modalCloseN.addEventListener("click", closeNewsModal);
newsModal.addEventListener("click", (e) => {
  if (e.target === newsModal) closeNewsModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && newsModal.style.display === "flex") {
    closeNewsModal();
  }
});

  /*******************************************
   * 10) Image-Lightbox (“Enlarge”) Logic
   *******************************************/
  const imageModal       = document.getElementById("image-modal");
  let   modalImageElem   = document.getElementById("modal-image");
  const imageModalClose  = document.getElementById("image-modal-close");

  function closeImageModal() {
    imageModal.style.display = "none";
    imageModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";

    // If we previously replaced <img> with <iframe>, restore <img> element:
    if (modalImageElem.tagName !== "IMG") {
      const newImg = document.createElement("img");
      newImg.id = "modal-image";
      newImg.style.maxWidth = "100%";
      newImg.style.maxHeight = "100%";
      newImg.style.display = "block";
      newImg.style.objectFit = "contain";
      newImg.alt = "";
      modalImageElem.replaceWith(newImg);
      modalImageElem = newImg;
    }
  }

  document.querySelectorAll(".enlarge-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const mediaContainer = e.target.closest(".media-container");
      if (!mediaContainer) return;

      // 1) If the card has an <img>, enlarge that:
      const imgElem = mediaContainer.querySelector("img");
      if (imgElem) {
        modalImageElem.src = imgElem.src;
        modalImageElem.alt = imgElem.alt || "";
      } else {
        // 2) Otherwise, if it's a <iframe> (video), clone it instead:
        const iframeElem = mediaContainer.querySelector("iframe");
        if (iframeElem) {
          // Remove existing <img> (just set its src to empty)
          modalImageElem.remove();
          const cloneIframe = iframeElem.cloneNode(true);
          cloneIframe.style.maxWidth  = "100%";
          cloneIframe.style.maxHeight = "100%";
          cloneIframe.style.display   = "block";
          cloneIframe.setAttribute("frameborder", "0");
          cloneIframe.setAttribute("allowfullscreen", "");
          // Insert cloned iframe into the modal body
          const wrapper = document.querySelector(".image-modal-body");
          wrapper.appendChild(cloneIframe);
          // Keep a reference in modalImageElem so we can restore later
          modalImageElem = cloneIframe;
        }
      }

      // 3) Show the lightbox modal
      imageModal.style.display = "flex";
      imageModal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    });
  });

  // Close when × is clicked
  if (imageModalClose) imageModalClose.addEventListener("click", closeImageModal);

  // Close when clicking outside content
  imageModal.addEventListener("click", (e) => {
    if (e.target === imageModal) closeImageModal();
  });

  // Close on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && imageModal.style.display === "flex") {
      closeImageModal();
    }
  });
});
// places.js
document.addEventListener("DOMContentLoaded", () => {
  // ──── 1) Grab Elements ────
  const searchInput    = document.getElementById("places-search");
  const clearBtn       = document.getElementById("clear-search");
  const noMatchDiv     = document.getElementById("no-match");
  const placeCards     = Array.from(document.querySelectorAll(".place-card"));

  const modalOverlay   = document.getElementById("places-modal");
  const modalMedia     = document.getElementById("modal-media");
  const modalText      = document.getElementById("modal-text");
  const modalClose     = document.getElementById("modal-close");
  const modalPrev      = document.getElementById("modal-prev");
  const modalNext      = document.getElementById("modal-next");
  let   currentIndex   = -1;

  // ──── 2) Helper: Read current GTranslate language ────
  function getCurrentLang() {
    const name    = "googtrans=";
    const cookie  = decodeURIComponent(document.cookie);
    const parts   = cookie.split("; ");
    for (let part of parts) {
      if (part.indexOf(name) === 0) {
        const segs = part.substring(name.length).split("/");
        if (segs[2]) return segs[2];
      }
    }
    return "pa";
  }

  // ──── 3) Debounce ────
  function debounce(fn, delay = 200) {
    let id;
    return (...args) => {
      clearTimeout(id);
      id = setTimeout(() => fn(...args), delay);
    };
  }

  // ──── 4) Filter Logic ────
  function filterPlaces() {
    const qRaw  = searchInput.value.trim().toLowerCase();
    const lang  = getCurrentLang();
    let anyVisible = false;

    placeCards.forEach(card => {
      const text = card.textContent.toLowerCase();
      const match = qRaw === "" || text.includes(qRaw);
      card.classList.toggle("hidden", !match);
      if (match) anyVisible = true;
    });

    if (!anyVisible && qRaw.length > 0) {
      noMatchDiv.textContent = lang === "en"
        ? "No results found. Please try searching in the other language."
        : "ਕੋਈ ਮੇਲ ਨਹੀਂ ਲੱਭਿਆ। ਕਿਰਪਾ ਕਰਕੇ ਵੱਖਰੀ ਭਾਸ਼ਾ ਵਿੱਚ ਕੋਸ਼ਿਸ਼ ਕਰੋ।";
      noMatchDiv.style.display = "block";
    } else {
      noMatchDiv.style.display = "none";
    }
    clearBtn.classList.toggle("visible", qRaw.length > 0);
  }

  clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    filterPlaces();
    searchInput.focus();
  });
  searchInput.addEventListener("input", debounce(filterPlaces, 150));
  searchInput.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      searchInput.value = "";
      filterPlaces();
      searchInput.blur();
    }
  });
  filterPlaces();

  // ──── 5) Modal Helpers ────
  function getVisibleCards() {
    return placeCards.filter(c => !c.classList.contains("hidden"));
  }

  function updateNavButtons() {
    const visible = getVisibleCards();
    // Prev
    if (currentIndex <= 0) {
      modalPrev.disabled = true; modalPrev.textContent = "";
    } else {
      modalPrev.disabled = false;
      const prev = visible[currentIndex - 1];
      const m = /<h3>(.*?)<\/h3>/.exec(prev.dataset.full) || [];
      modalPrev.textContent = `← ${m[1] || "ਪਿਛਲਾ"}`;
    }
    // Next
    if (currentIndex >= visible.length - 1) {
      modalNext.disabled = true; modalNext.textContent = "";
    } else {
      modalNext.disabled = false;
      const nxt = visible[currentIndex + 1];
      const m = /<h3>(.*?)<\/h3>/.exec(nxt.dataset.full) || [];
      modalNext.textContent = `${m[1] || "ਅਗਲਾ"} →`;
    }
  }

  function openModal(index) {
    const visible = getVisibleCards();
    if (index < 0 || index >= visible.length) return;
    currentIndex = index;
    const card = visible[index];

    // Populate media
    modalMedia.innerHTML = "";
    const img = card.querySelector(".media-container img");
    if (img) {
      const clone = img.cloneNode(true);
      clone.style.width = "100%";
      clone.style.height = "auto";
      modalMedia.appendChild(clone);
    }

    // Populate text
    modalText.innerHTML = card.dataset.full || "";

    // Show modal
    modalOverlay.style.display = "flex";
    modalOverlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    updateNavButtons();
  }

  function closeModal() {
    modalOverlay.style.display = "none";
    modalOverlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  // ──── 6) Attach Modal & Copy Handlers ────
  placeCards.forEach(card => {
    // Read More opens modal
    const readBtn = card.querySelector(".read-more-btn");
    if (readBtn) {
      readBtn.addEventListener("click", e => {
        e.stopPropagation();
        const idx = getVisibleCards().indexOf(card);
        openModal(idx);
      });
    }

    // Copy Link never opens modal
    const copyBtn = card.querySelector(".copy-link");
    if (copyBtn) {
      copyBtn.addEventListener("click", async e => {
        e.stopPropagation();
        const url = `${window.location.origin}/places/#${card.dataset.id}`;
        try {
          await navigator.clipboard.writeText(url);
        } catch {
          const ta = document.createElement("textarea");
          ta.value = url;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
        }
        copyBtn.classList.add("copied");
        copyBtn.textContent = "✔️";
        setTimeout(() => {
          copyBtn.classList.remove("copied");
          copyBtn.textContent = "🔗";
        }, 1500);
      });
    }
  });

  // Modal controls
  modalClose.addEventListener("click", e => { e.stopPropagation(); closeModal(); });
  modalPrev.addEventListener("click", e => { e.stopPropagation(); openModal(currentIndex - 1); });
  modalNext.addEventListener("click", e => { e.stopPropagation(); openModal(currentIndex + 1); });
  modalOverlay.addEventListener("click", e => {
    if (e.target === modalOverlay) closeModal();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeModal();
  });

  // ──── 7) On‑load hash scroll/highlight ────
  const hash = window.location.hash.slice(1);
  if (hash) {
    const el = document.getElementById(hash);
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth" });
        el.classList.add("highlighted");
        setTimeout(() => el.classList.remove("highlighted"), 2000);
      }, 300);
    }
  }
});


  /* ----------------------------------------
     1) Hamburger Menu Toggle
  ---------------------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    
  const hamburger = document.getElementById("hamburger");
  const mobileMenu = document.getElementById("mobile-menu");
  if (hamburger && mobileMenu) {
    hamburger.addEventListener("click", (e) => {
      e.stopPropagation();
      const isExpanded = hamburger.getAttribute("aria-expanded") === "true";
      hamburger.setAttribute("aria-expanded", String(!isExpanded));
      mobileMenu.classList.toggle("show");
      mobileMenu.setAttribute("aria-hidden", String(isExpanded));
    });
    mobileMenu.addEventListener("click", (e) => e.stopPropagation());
    document.addEventListener("click", () => {
      if (mobileMenu.classList.contains("show")) {
        mobileMenu.classList.remove("show");
        hamburger.setAttribute("aria-expanded", "false");
        mobileMenu.setAttribute("aria-hidden", "true");
      }
    });
  }

  /* ----------------------------------------
     2) “Read More” Modal Logic
  ---------------------------------------- */
  const readModal = document.getElementById("read-modal");
  const readTitle = document.getElementById("read-title");
  const readText = document.getElementById("read-text");
  const btnReadMore = document.querySelectorAll(".btn-read-more");
  const btnReadClose = document.getElementById("read-close");

  // Full descriptions for each product ID
 const productDetails = {
  1: {
    title: "ਪੱਟੀ ਬਾਈਟਸ ਸਟਿੱਕਰ ਪੈਕ",
    text: `
      <strong>ਤਫਸੀਲੀ ਵਰਣਨ:</strong><br/>
      ਇਹ ਸਟਿੱਕਰ ਪੈਕ ਵਿੱਚ 10 ਰੰਗੀਨ ਪੰਜਾਬੀ ਲੋਕਧਾਰਾ ਦੇ ਡਿਜ਼ਾਈਨਡ ਸਟਿੱਕਰ ਸ਼ਾਮਲ ਹਨ। 
      ਹਰ ਸਟਿੱਕਰ ਦੀ ਮਾਪ: 5cm × 5cm, ਪ੍ਰੀਮੀਅਮ ਮੈਟ ਫਿਨਿਸ਼ ਅਤੇ ਜਲ-ਰੋਧੀ।
      <br/><br/>
      <strong>ਵਿਸ਼ੇਸ਼ਤਾ:</strong>
      <ul>
        <li>ਹਾਈ-ਕੁਆਲਿਟੀ ਵਾਈਨਾਈਲ ਮੈਟਰੀਅਲ</li>
        <li>ਪੂਰੀ ਤਰ੍ਹਾਂ ਜਲ-ਰੋਧੀ ਅਤੇ ਟਿਕਾਊ</li>
        <li>ਆਸਾਨ ਪੀਲ ਅਤੇ ਸਟਿਕ</li>
        <li>ਉੱਚ ਰੈਜ਼ੋਲੇਸ਼ਨ ਪ੍ਰਿੰਟ</li>
      </ul>
    `,
  },
  2: {
    title: "ਪੰਜਾਬੀ ਟੀ-ਸ਼ਰਟ",
    text: `
      <strong>ਤਫਸੀਲੀ ਵਰਣਨ:</strong><br/>
      ਇਹ 100% ਕਾਟਨ ਦੀ ਟੀ-ਸ਼ਰਟ ਹੈ ਜਿਸ ਉੱਤੇ “ਪੱਟੀ ਬਾਈਟਸ” ਦਾ ਪੰਜਾਬੀ ਲਹਿਜ਼ਾ ਪ੍ਰਿੰਟ ਕੀਤਾ ਗਿਆ ਹੈ।
      ਮਿਡੀਅਮ ਫਿਟ, ਨਰਮ ਅਤੇ ਹੇਠਲੇ ਦਰਜੇ ਦੀ ਸ਼ੈਲੀ – ਰੰਗ: ਚਿੱਟਾ, ਨੀਲਾ, ਕਾਲਾ।
      <br/><br/>
      <strong>ਵਿਸ਼ੇਸ਼ਤਾ:</strong>
      <ul>
        <li>ਐਕਸਟਰਿਮ ਵਾਸ਼ਰ</li>
        <li>ਸਮਰਥਿਤ ਦਰਜੇ ਦੀ ਸੁਤਲੀ</li>
        <li>ਔਥੈਂਟਿਕ ਪੰਜਾਬੀ ਨਕਸ਼</li>
      </ul>
    `,
  },
};

  btnReadMore.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      if (!productDetails[id]) return;
      readTitle.innerHTML = productDetails[id].title;
      readText.innerHTML = productDetails[id].text;
      readModal.style.display = "flex";
      readModal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    });
  });

  btnReadClose.addEventListener("click", () => {
    readModal.style.display = "none";
    readModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  });

  readModal.addEventListener("click", (e) => {
    if (e.target === readModal) {
      readModal.style.display = "none";
      readModal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && readModal.style.display === "flex") {
      readModal.style.display = "none";
      readModal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }
  });

  /* ----------------------------------------
     3) Image Carousel Logic
  ---------------------------------------- */
  document.querySelectorAll(".product-card").forEach((card) => {
    const carousel = card.querySelector(".image-carousel");
    if (!carousel) return;

    const images = carousel.querySelectorAll(".carousel-image");
    const prevBtn = carousel.querySelector(".prev-btn");
    const nextBtn = carousel.querySelector(".next-btn");
    let idx = 0;
    carousel.dataset.index = 0;

    // If only one image, hide arrows
    if (images.length <= 1) {
      prevBtn.style.display = "none";
      nextBtn.style.display = "none";
    }

    function showImage(newIdx) {
      images[idx].classList.remove("active");
      idx = (newIdx + images.length) % images.length;
      carousel.dataset.index = idx;
      images[idx].classList.add("active");
    }

    prevBtn.addEventListener("click", () => {
      showImage(idx - 1);
    });
    nextBtn.addEventListener("click", () => {
      showImage(idx + 1);
    });
  });

  /* ----------------------------------------
     4) Image Enlarge (Lightbox) Logic
  ---------------------------------------- */
  const imageModal = document.getElementById("image-modal");
  const imageClose = document.getElementById("image-close");
  const imageModalImg = document.getElementById("image-modal-img");
  document.querySelectorAll(".enlarge-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const mediaContainer = e.currentTarget.closest(".media-container");
      if (!mediaContainer) return;
      const carousel = mediaContainer.querySelector(".image-carousel");
      const idx = parseInt(carousel.dataset.index, 10);
      const currentImage = carousel.querySelectorAll(".carousel-image")[idx];
      if (!currentImage) return;
      imageModalImg.src = currentImage.src;
      imageModalImg.alt = currentImage.alt || "Enlarged product";
      imageModal.style.display = "flex";
      imageModal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    });
  });

  imageClose.addEventListener("click", () => {
    imageModal.style.display = "none";
    imageModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  });
  imageModal.addEventListener("click", (e) => {
    if (e.target === imageModal) {
      imageModal.style.display = "none";
      imageModal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && imageModal.style.display === "flex") {
      imageModal.style.display = "none";
      imageModal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }
  });

  /* ----------------------------------------
     5) Shopping Cart Logic
  ---------------------------------------- */
  let cart = []; // each entry: { id, title, price, link, quantity }

  const btnAddCart = document.querySelectorAll(".btn-add-cart");
  const cartBtn = document.getElementById("cart-btn");
  const cartCount = document.getElementById("cart-count");
  const cartModal = document.getElementById("cart-modal");
  const cartItemsEl = document.querySelector(".cart-items");
  const cartTotalEl = document.getElementById("cart-total");
  const cartClose = document.getElementById("cart-close");

  // Product data for cart
 const productData = {
  1: {
    title: "ਪੱਟੀ ਬਾਈਟਸ ਸਟਿੱਕਰ ਪੈਕ",
    price: 400,
    link: "https://pattibytes.myshopify.com/example-sticker-pack",
  },
  2: {
    title: "ਪੰਜਾਬੀ ਟੀ-ਸ਼ਰਟ",
    price: 499,
    link: "https://www.amazon.in/example-product-1",
  },
};

   

  function updateCartUI() {
    cartItemsEl.innerHTML = "";
    if (cart.length === 0) {
      cartItemsEl.innerHTML =
        '<p class="empty-cart">ਤੁਹਾਡੇ ਕਾਰਟ ਵਿੱਚ ਕੁਝ ਨਹੀਂ।</p>';
      cartTotalEl.textContent = "0";
      return;
    }
    let total = 0;
    cart.forEach((item, index) => {
      total += item.price * item.quantity;
      const div = document.createElement("div");
      div.classList.add("cart-item");
      div.innerHTML = `
        <div class="item-info">
          <span>${item.title}</span>
          <span>₹${item.price} × <span class="qty-display">${item.quantity}</span></span>
        </div>
        <div class="quantity-controls">
          <button class="qty-btn" data-index="${index}" data-action="decrease">−</button>
          <button class="qty-btn" data-index="${index}" data-action="increase">＋</button>
          <button class="remove-btn" data-index="${index}" aria-label="Remove">🗑️</button>
        </div>
      `;
      cartItemsEl.appendChild(div);
    });
    cartTotalEl.textContent = total.toFixed(2);

    // Attach event handlers for qty and remove
    cartItemsEl.querySelectorAll(".qty-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        const action = e.currentTarget.dataset.action;
        if (action === "increase") {
          cart[idx].quantity += 1;
        } else if (action === "decrease") {
          cart[idx].quantity -= 1;
          if (cart[idx].quantity < 1) cart.splice(idx, 1);
        }
        if (cart.length === 0) {
          cartCount.textContent = "0";
        } else {
          const sumQty = cart.reduce((acc, it) => acc + it.quantity, 0);
          cartCount.textContent = sumQty;
        }
        updateCartUI();
      });
    });

    cartItemsEl.querySelectorAll(".remove-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        cart.splice(idx, 1);
        if (cart.length === 0) {
          cartCount.textContent = "0";
        } else {
          const sumQty = cart.reduce((acc, it) => acc + it.quantity, 0);
          cartCount.textContent = sumQty;
        }
        updateCartUI();
      });
    });
  }

  btnAddCart.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      if (!productData[id]) return;

      // If exists, just increment quantity
      const existing = cart.find((item) => item.id === id);
      if (existing) {
        existing.quantity += 1;
      } else {
        cart.push({
          id,
          title: productData[id].title,
          price: productData[id].price,
          link: productData[id].link,
          quantity: 1,
        });
      }

      const sumQty = cart.reduce((acc, it) => acc + it.quantity, 0);
      cartCount.textContent = sumQty;
    });
  });

  // Open Cart Modal
  cartBtn.addEventListener("click", () => {
    updateCartUI();
    cartModal.style.display = "flex";
    cartModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  });

  // Close Cart Modal
  cartClose.addEventListener("click", () => {
    cartModal.style.display = "none";
    cartModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  });

  cartModal.addEventListener("click", (e) => {
    if (e.target === cartModal) {
      cartModal.style.display = "none";
      cartModal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && cartModal.style.display === "flex") {
      cartModal.style.display = "none";
      cartModal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }
  });
});
function showComingSoon(event) {
  event.preventDefault();
  const modal = document.getElementById("comingSoonModal");
  modal.classList.add("show");
  modal.style.display = "block";
}

function closeModal() {
  const modal = document.getElementById("comingSoonModal");
  modal.classList.remove("show");
  setTimeout(() => {
    modal.style.display = "none";
  }, 300); // matches transition time
}

// Close modal if clicked outside the box
window.onclick = function(event) {
  const modal = document.getElementById("comingSoonModal");
  const content = modal.querySelector(".modal-content");
  if (event.target === modal) {
    closeModal();
  }
};
// ----- Updated Navigation (Hamburger + Dropdown) -----
document.addEventListener("DOMContentLoaded", () => {
  const hamburger = document.getElementById("hamburger");
  const mobileMenu = document.getElementById("mobile-menu");

  if (!hamburger || !mobileMenu) return;

  // Close all submenus and the mobile menu
  function closeAll() {
    mobileMenu.classList.remove("show");
    hamburger.setAttribute("aria-expanded", "false");
    mobileMenu.setAttribute("aria-hidden", "true");

    document.querySelectorAll(".has-dropdown .dropdown").forEach(dd => {
      dd.style.display = "none";
    });
    document.querySelectorAll(".dropdown-toggle.open").forEach(btn => {
      btn.classList.remove("open");
    });
  }

  // Toggle the mobile menu itself
  function toggleMenu() {
    const isExpanded = hamburger.getAttribute("aria-expanded") === "true";
    hamburger.setAttribute("aria-expanded", String(!isExpanded));
    mobileMenu.classList.toggle("show");
    mobileMenu.setAttribute("aria-hidden", String(isExpanded));

    // When closing the menu, also hide any open submenu
    if (isExpanded) {
      document.querySelectorAll(".has-dropdown .dropdown").forEach(dd => {
        dd.style.display = "none";
      });
      document.querySelectorAll(".dropdown-toggle.open").forEach(btn => {
        btn.classList.remove("open");
      });
    }
  }

  // Clicking the hamburger button
  hamburger.addEventListener("click", e => {
    e.stopPropagation();
    toggleMenu();
  });

  // Clicking outside closes everything
  document.addEventListener("click", () => {
    closeAll();
  });

  // Prevent clicks inside the menu from bubbling out
  mobileMenu.addEventListener("click", e => e.stopPropagation());

  // Handle each “Topics” dropdown toggle button
  document.querySelectorAll(".dropdown-toggle").forEach(toggleBtn => {
    toggleBtn.addEventListener("click", e => {
      e.stopPropagation();
      const parentLi = toggleBtn.closest(".has-dropdown");
      const submenu = parentLi.querySelector(".dropdown");
      const isOpen = toggleBtn.classList.contains("open");


     
    });
  });

  // When any link inside the menu is clicked, close the menu
  mobileMenu.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", e => {
      const href = link.getAttribute("href") || "";
      if (href.startsWith("#")) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
      closeAll();
    });
  });
});


// collab.js
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('collabForm');
  const status = document.getElementById('formStatus');

  if (!form || !status) return;

  form.addEventListener('submit', () => {
    // reveal the inline “thank you” message
    status.style.display = 'block';
    status.scrollIntoView({ behavior: 'smooth' });
  });
});


// Universal In-App Browser Detection - Enhanced for pattibytes.com
// Enhanced Instagram Detection - Punjabi/English + Pattibytes Theme
(function() {
    'use strict';
    
    // Enhanced device and browser detection
    function getDeviceInfo() {
        const ua = navigator.userAgent || '';
        return {
            isIOS: /iPad|iPhone|iPod/.test(ua),
            isAndroid: /Android/.test(ua),
            isMobile: /Mobi|Android/i.test(ua),
            isTablet: /iPad/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua)),
            isInstagram: ua.toLowerCase().includes('instagram'),
            hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0
        };
    }
    
    // Comprehensive Instagram detection (all versions)
    function detectInstagram() {
        const ua = navigator.userAgent.toLowerCase();
        const patterns = [
            'instagram', 'ig_user_agent', 'instagrambot', 
            'instagram android', 'instagram ios'
        ];
        
        return patterns.some(pattern => ua.includes(pattern)) || 
               (ua.includes('mobile safari') && ua.includes('instagram'));
    }
    
    // Bilingual content
    const content = {
        en: {
            title: 'Open in Browser',
            subtitle: 'For the best experience on Pattibytes',
            iosInstructions: 'iOS Instructions:',
            iosSteps: '1. Tap the <strong>Share button</strong> (square with arrow)<br>2. Select <strong>"Open in Safari"</strong><br><br><em>Or tap the three dots (⋯) and choose "Open in Browser"</em>',
            androidInstructions: 'Android Instructions:',
            androidSteps: '1. Tap the <strong>three dots (⋯)</strong> at the top-right<br>2. Select <strong>"Open in Browser"</strong> or <strong>"Open in Chrome"</strong><br><br><em>Look for the browser icon or "External Browser" option</em>',
            desktopInstructions: 'Desktop Instructions:',
            desktopSteps: 'Copy this URL and paste it in your preferred browser for the best experience.',
            openButton: 'Open in Browser',
            continueButton: 'Continue Here',
            sessionNote: 'This popup appears once per session'
        },
        pa: {
            title: 'ਬ੍ਰਾਊਜ਼ਰ ਵਿੱਚ ਖੋਲ੍ਹੋ',
            subtitle: 'ਪੱਟੀਬਾਈਟਸ ਤੇ ਸਭ ਤੋਂ ਚੰਗਾ ਤਜਰਬਾ ਲਈ',
            iosInstructions: 'iOS ਨਿਰਦੇਸ਼:',
            iosSteps: '1. <strong>Share button</strong> (ਤੀਰ ਵਾਲਾ ਵਰਗ) ਨੂੰ ਦਬਾਓ<br>2. <strong>"Open in Safari"</strong> ਚੁਣੋ<br><br><em>ਜਾਂ ਤਿੰਨ ਬਿੰਦੀਆਂ (⋯) ਦਬਾਓ ਅਤੇ "Open in Browser" ਚੁਣੋ</em>',
            androidInstructions: 'Android ਨਿਰਦੇਸ਼:',
            androidSteps: '1. ਉੱਪਰ ਸੱਜੇ ਪਾਸੇ <strong>ਤਿੰਨ ਬਿੰਦੀਆਂ (⋯)</strong> ਦਬਾਓ<br>2. <strong>"Open in Browser"</strong> ਜਾਂ <strong>"Open in Chrome"</strong> ਚੁਣੋ<br><br><em>ਬ੍ਰਾਊਜ਼ਰ ਆਈਕਨ ਜਾਂ "External Browser" ਵਿਕਲਪ ਲੱਭੋ</em>',
            desktopInstructions: 'Desktop ਨਿਰਦੇਸ਼:',
            desktopSteps: 'ਸਭ ਤੋਂ ਚੰਗੇ ਤਜਰਬੇ ਲਈ ਇਸ URL ਨੂੰ ਕਾਪੀ ਕਰੋ ਅਤੇ ਆਪਣੇ ਪਸੰਦੀਦਾ ਬ੍ਰਾਊਜ਼ਰ ਵਿੱਚ ਪੇਸਟ ਕਰੋ।',
            openButton: 'ਬ੍ਰਾਊਜ਼ਰ ਵਿੱਚ ਖੋਲ੍ਹੋ',
            continueButton: 'ਇੱਥੇ ਜਾਰੀ ਰੱਖੋ',
            sessionNote: 'ਇਹ ਪੌਪਅੱਪ ਪ੍ਰਤੀ ਸੈਸ਼ਨ ਵਿੱਚ ਇੱਕ ਵਾਰ ਦਿਖਾਈ ਦਿੰਦਾ ਹੈ'
        }
    };
    
    // Language detection (default to English)
    function getLanguage() {
        // Check if Punjabi is preferred (from browser language or page content)
        const browserLang = navigator.language || navigator.userLanguage || '';
        const pageTitle = document.title.toLowerCase();
        const pageContent = document.body ? document.body.textContent.substring(0, 200) : '';
        
        // Detect Punjabi content or preference
        if (browserLang.includes('pa') || 
            pageTitle.includes('ਪੰਜਾਬ') || 
            pageContent.includes('ਪੱਟੀ') ||
            window.location.href.includes('pattibytes.com')) {
            return 'pa';
        }
        return 'en';
    }
    
    // Enhanced popup with bilingual support and Pattibytes theme
    function showInstagramInstructions() {
        // Prevent multiple popups
        if (document.getElementById('instagram-popup') || 
            sessionStorage.getItem('instagram-popup-shown')) {
            return;
        }
        
        sessionStorage.setItem('instagram-popup-shown', 'true');
        
        const deviceInfo = getDeviceInfo();
        const lang = getLanguage();
        const text = content[lang];
        
        // Create responsive popup with Pattibytes yellow-white theme
        const popup = document.createElement('div');
        popup.id = 'instagram-popup';
        popup.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.95); z-index: 999999;
            display: flex; align-items: center; justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            color: #333; padding: 20px; box-sizing: border-box;
            animation: fadeInPopup 0.4s ease-out;
        `;
        
        // Device-specific instructions with bilingual content
        let instructions = '';
        
        if (deviceInfo.isIOS) {
            instructions = `
                <div style="background: linear-gradient(135deg, #fff9c4 0%, #ffeaa7 100%); 
                           padding: 20px; border-radius: 12px; margin: 20px 0; 
                           border: 2px solid #fdcb6e; box-shadow: 0 4px 15px rgba(253, 203, 110, 0.3);">
                    <div style="font-size: 32px; margin-bottom: 15px;">📱</div>
                    <div style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #2d3436;">
                        ${text.iosInstructions}
                    </div>
                    <div style="line-height: 1.6; color: #636e72;">
                        ${text.iosSteps}
                    </div>
                </div>
            `;
        } else if (deviceInfo.isAndroid) {
            instructions = `
                <div style="background: linear-gradient(135deg, #fff9c4 0%, #ffeaa7 100%); 
                           padding: 20px; border-radius: 12px; margin: 20px 0; 
                           border: 2px solid #fdcb6e; box-shadow: 0 4px 15px rgba(253, 203, 110, 0.3);">
                    <div style="font-size: 32px; margin-bottom: 15px;">🤖</div>
                    <div style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #2d3436;">
                        ${text.androidInstructions}
                    </div>
                    <div style="line-height: 1.6; color: #636e72;">
                        ${text.androidSteps}
                    </div>
                </div>
            `;
        } else {
            instructions = `
                <div style="background: linear-gradient(135deg, #fff9c4 0%, #ffeaa7 100%); 
                           padding: 20px; border-radius: 12px; margin: 20px 0; 
                           border: 2px solid #fdcb6e; box-shadow: 0 4px 15px rgba(253, 203, 110, 0.3);">
                    <div style="font-size: 32px; margin-bottom: 15px;">🌐</div>
                    <div style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #2d3436;">
                        ${text.desktopInstructions}
                    </div>
                    <div style="line-height: 1.6; color: #636e72;">
                        ${text.desktopSteps}
                    </div>
                </div>
            `;
        }
        
        // Responsive content container with Pattibytes theme
        const content_container = document.createElement('div');
        content_container.style.cssText = `
            text-align: center; max-width: ${deviceInfo.isMobile ? '350px' : '420px'}; 
            width: 90%; background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%); 
            padding: 30px; border-radius: 20px; 
            box-shadow: 0 15px 50px rgba(253, 203, 110, 0.4);
            border: 3px solid #fdcb6e; color: #2d3436;
        `;
        
        content_container.innerHTML = `
            <div style="margin-bottom: 25px;">
                <div style="font-size: 48px; margin-bottom: 15px;">📰</div>
                <h2 style="margin: 0 0 10px 0; font-size: 26px; font-weight: 700; color: #2d3436;">
                    ${text.title}
                </h2>
                <p style="margin: 0; color: #636e72; font-size: 16px; font-weight: 500;">
                    ${text.subtitle}
                </p>
            </div>
            
            ${instructions}
            
            <div style="margin-top: 25px; display: flex; flex-direction: column; gap: 10px; align-items: center;">
                <button id="try-open-btn" style="
                    background: linear-gradient(135deg, #fdcb6e 0%, #e17055 100%);
                    color: white; border: none; padding: 15px 30px; 
                    border-radius: 25px; font-size: 16px; font-weight: 700;
                    cursor: pointer; min-width: 200px; text-transform: uppercase;
                    box-shadow: 0 6px 20px rgba(253, 203, 110, 0.4);
                    transition: all 0.3s ease; letter-spacing: 0.5px;
                " onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 8px 25px rgba(253, 203, 110, 0.6)'" 
                   onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 6px 20px rgba(253, 203, 110, 0.4)'">
                    ${text.openButton}
                </button>
                
                <button id="continue-btn" style="
                    background: rgba(253, 203, 110, 0.2); color: #2d3436;
                    border: 2px solid #fdcb6e; padding: 12px 25px;
                    border-radius: 20px; font-size: 14px; cursor: pointer; font-weight: 600;
                    transition: all 0.3s ease; min-width: 160px;
                " onmouseover="this.style.background='rgba(253, 203, 110, 0.3)'" 
                   onmouseout="this.style.background='rgba(253, 203, 110, 0.2)'">
                    ${text.continueButton}
                </button>
            </div>
            
            <div style="margin-top: 20px; font-size: 12px; color: #74b9ff; font-weight: 500;">
                ${lang === 'pa' ? '• ' : ''}${text.sessionNote}${lang === 'pa' ? ' •' : ''}
            </div>
        `;
        
        popup.appendChild(content_container);
        
        // Add Pattibytes-themed animation styles
        if (!document.getElementById('instagram-popup-styles')) {
            const styles = document.createElement('style');
            styles.id = 'instagram-popup-styles';
            styles.textContent = `
                @keyframes fadeInPopup {
                    from { opacity: 0; transform: scale(0.8) translateY(30px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                @media (max-width: 480px) {
                    #instagram-popup > div {
                        padding: 20px !important;
                        font-size: 14px !important;
                        max-width: 320px !important;
                    }
                }
                #instagram-popup button:focus {
                    outline: 3px solid #fdcb6e;
                    outline-offset: 2px;
                }
            `;
            document.head.appendChild(styles);
        }
        
        document.body.appendChild(popup);
        
        // Enhanced event handlers
        const tryOpenBtn = document.getElementById('try-open-btn');
        const continueBtn = document.getElementById('continue-btn');
        
        // Try to open in external browser (with fallbacks)
        tryOpenBtn.addEventListener('click', function() {
            const currentUrl = window.location.href;
            
            try {
                if (deviceInfo.isAndroid) {
                    const intentUrl = `intent://${window.location.host}${window.location.pathname}${window.location.search}#Intent;scheme=https;package=com.android.chrome;end`;
                    window.location.href = intentUrl;
                    
                    setTimeout(() => {
                        if (!document.hidden) {
                            window.open(currentUrl, '_blank');
                        }
                    }, 2000);
                    
                } else if (deviceInfo.isIOS) {
                    window.location.href = `x-safari-https://${window.location.host}${window.location.pathname}${window.location.search}`;
                    
                    setTimeout(() => {
                        if (!document.hidden) {
                            window.open(currentUrl, '_blank');
                        }
                    }, 2000);
                    
                } else {
                    window.open(currentUrl, '_blank');
                }
            } catch (error) {
                window.open(currentUrl, '_blank');
            }
            
            popup.remove();
        });
        
        // Continue in current browser
        continueBtn.addEventListener('click', function() {
            popup.remove();
        });
        
        // Touch/click outside to close (mobile-friendly)
        popup.addEventListener('click', function(e) {
            if (e.target === popup) {
                popup.remove();
            }
        });
        
        // Keyboard accessibility
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && document.getElementById('instagram-popup')) {
                popup.remove();
            }
        });
        
        // Auto-focus for accessibility
        if (!deviceInfo.hasTouch) {
            setTimeout(() => tryOpenBtn.focus(), 500);
        }
        
        // Auto-remove after 30 seconds
        setTimeout(() => {
            if (document.getElementById('instagram-popup')) {
                popup.remove();
            }
        }, 30000);
    }
    
    // Enhanced initialization
    function initInstagramDetection() {
        if (sessionStorage.getItem('instagram-popup-shown') || 
            window.location.search.includes('external_browser=true')) {
            return;
        }
        
        if (detectInstagram()) {
            setTimeout(showInstagramInstructions, 1000);
        }
    }
    
    // Initialize based on document state
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initInstagramDetection);
    } else {
        initInstagramDetection();
    }
    
    // Also initialize on page show (back/forward navigation)
    window.addEventListener('pageshow', function(event) {
        if (event.persisted) {
            initInstagramDetection();
        }
    });
    
})();
// Minimal PWA Handler - No Conflicts
// Website PWA Install Handler - Simple and Clean
class WebsitePWAInstaller {
  constructor() {
    this.deferredPrompt = null;
    this.isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                       window.navigator.standalone === true;
    
    console.log('Website PWA Installer:', { isStandalone: this.isStandalone });
    
    // Only show install features in browser mode
    if (!this.isStandalone) {
      this.setupInstaller();
    } else {
      this.hideInstallElements();
    }
  }

  setupInstaller() {
    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('PWA install prompt available');
      e.preventDefault();
      this.deferredPrompt = e;
      
      // Show install banner after 3 seconds
      setTimeout(() => this.showInstallBanner(), 3000);
      
      // Enable header install button
      const headerBtn = document.getElementById('headerInstallBtn');
      if (headerBtn) headerBtn.style.display = 'inline-block';
    });

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      console.log('PWA installed successfully');
      this.onAppInstalled();
    });

    // Setup install button handlers
    this.setupButtons();
  }

  setupButtons() {
    // Install buttons
    const installBtns = document.querySelectorAll(
      '#pwaInstallBtn, #headerInstallBtn, .btn-app-install'
    );
    
    installBtns.forEach(btn => {
      if (btn) {
        btn.addEventListener('click', () => this.triggerInstall());
      }
    });

    // Close buttons
    const closeBtns = document.querySelectorAll(
      '#pwaCloseBtn, .pwa-close-btn'
    );
    
    closeBtns.forEach(btn => {
      if (btn) {
        btn.addEventListener('click', () => this.dismissBanner());
      }
    });
  }

  showInstallBanner() {
    if (!this.deferredPrompt) return;
    
    // Check if recently dismissed
    const dismissed = localStorage.getItem('pwa-banner-dismissed');
    if (dismissed) {
      const daysSince = (Date.now() - parseInt(dismissed)) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) return;
    }
    
    const banner = document.querySelector('.pwa-install-banner');
    if (banner) {
      banner.classList.add('show');
      this.trackEvent('pwa_banner_shown');
    }
  }

  async triggerInstall() {
    if (!this.deferredPrompt) {
      this.showManualInstructions();
      return;
    }

    try {
      // Hide banner
      const banner = document.querySelector('.pwa-install-banner');
      if (banner) banner.classList.remove('show');
      
      // Show install dialog
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      
      console.log('Install result:', outcome);
      this.trackEvent('pwa_install_' + outcome);
      
      this.deferredPrompt = null;
      
    } catch (error) {
      console.error('Install failed:', error);
      this.showManualInstructions();
    }
  }

  dismissBanner() {
    const banner = document.querySelector('.pwa-install-banner');
    if (banner) banner.classList.remove('show');
    
    localStorage.setItem('pwa-banner-dismissed', Date.now().toString());
    this.trackEvent('pwa_banner_dismissed');
  }

  showManualInstructions() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const message = isIOS ? 
      'Safari मेन्यू खोलें और "Add to Home Screen" चुनें' :
      'ब्राउज़र मेन्यू से "Install App" या "Add to Home Screen" चुनें';
    
    alert(message);
  }

  onAppInstalled() {
    // Hide install elements
    const installElements = document.querySelectorAll(
      '.pwa-install-banner, .pwa-promo-section'
    );
    
    installElements.forEach(el => {
      if (el) el.style.display = 'none';
    });
    
    localStorage.removeItem('pwa-banner-dismissed');
    this.trackEvent('pwa_installed');
    
    // Show success message
    setTimeout(() => {
      alert('🎉 ऐप सफलतापूर्वक इंस्टॉल हो गई!');
    }, 500);
  }

  hideInstallElements() {
    const installElements = document.querySelectorAll(
      '.pwa-install-banner, .pwa-promo-section, .btn-app-install'
    );
    
    installElements.forEach(el => {
      if (el) el.style.display = 'none';
    });
  }

  trackEvent(eventName, data = {}) {
    console.log('Website Event:', eventName, data);
    
    // Google Analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName, {
        event_category: 'Website_PWA',
        ...data
      });
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.pwaInstaller = new WebsitePWAInstaller();
  console.log('Website loaded successfully');
});

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(registration => {
        console.log('Service Worker registered for website');
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  });
}

console.log('Website script loaded - no app interference');
