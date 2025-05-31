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
document.addEventListener("DOMContentLoaded", () => {
  // ──── 1) Grab Elements ────
  const searchInput = document.getElementById("places-search");
  const clearBtn = document.getElementById("clear-search");
  const noMatchDiv = document.getElementById("no-match");
  const placeCards = Array.from(document.querySelectorAll(".place-card"));

  const modalOverlay = document.getElementById("places-modal");
  const modalMedia = document.getElementById("modal-media");
  const modalText = document.getElementById("modal-text");
  const modalClose = document.getElementById("modal-close");
  const modalPrev = document.getElementById("modal-prev");
  const modalNext = document.getElementById("modal-next");

  // ──── 2) Helper: Read current language from GTranslate cookie ────
  function getCurrentLang() {
    const name = "googtrans=";
    const decoded = decodeURIComponent(document.cookie);
    const parts = decoded.split("; ");
    for (let part of parts) {
      if (part.indexOf(name) === 0) {
        const val = part.substring(name.length);
        const segs = val.split("/");
        if (segs.length === 3 && segs[2]) {
          return segs[2]; // "en" or "pa"
        }
      }
    }
    return "pa"; // default to Punjabi
  }

  // ──── 3) Debounce utility ────
  function debounce(fn, delay = 200) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  }

  // ──── 4) Filtering Logic: search using each card’s visible text ────
  function filterPlaces() {
    const queryRaw = searchInput.value.trim();
    const query = queryRaw.toLowerCase();
    const lang = getCurrentLang(); // either "pa" or "en"
    let anyVisible = false;

    placeCards.forEach((card) => {
      // 4a) Grab the card’s combined visible text (which GTranslate has updated)
      // We use textContent so that tags (<strong>, etc.) are ignored.
      const combinedText = card.textContent.trim().toLowerCase();
      const matches = query === "" || combinedText.includes(query);
      card.classList.toggle("hidden", !matches);
      if (matches) anyVisible = true;
    });

    // 4b) Show/hide “No match” & set dynamic text
    if (!anyVisible && query.length > 0) {
      if (lang === "en") {
        noMatchDiv.textContent =
          "No results found. Please try searching in the other language.";
      } else {
        noMatchDiv.textContent =
          "ਕੋਈ ਮੇਲ ਨਹੀਂ ਲੱਭਿਆ। ਕਿਰਪਾ ਕਰਕੇ ਵੱਖਰੀ ਭਾਸ਼ਾ ਵਿੱਚ ਕੋਸ਼ਿਸ਼ ਕਰੋ।";
      }
      noMatchDiv.style.display = "block";
    } else {
      noMatchDiv.style.display = "none";
    }

    // 4c) Toggle clear button visibility
    clearBtn.classList.toggle("visible", query.length > 0);
  }

  // ──── 5) Clear Button Handler ────
  clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    filterPlaces();
    searchInput.focus();
  });

  // Run filter on input (debounced)
  searchInput.addEventListener("input", debounce(filterPlaces, 150));
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      searchInput.value = "";
      filterPlaces();
      searchInput.blur();
    }
  });

  // Initial filter (in case there’s a prefilled value)
  filterPlaces();

  // ──── 6) Modal Logic ────
  let currentIndex = -1;
  function getVisibleCards() {
    return placeCards.filter((card) => !card.classList.contains("hidden"));
  }

  // Update the text of Prev/Next buttons using each card’s <h3> from data-full
  function updateNavButtons() {
    const visible = getVisibleCards();
    if (currentIndex <= 0) {
      modalPrev.disabled = true;
      modalPrev.textContent = "";
    } else {
      modalPrev.disabled = false;
      const prevCard = visible[currentIndex - 1];
      const prevTitleMatch =
        prevCard.getAttribute("data-full").match(/<h3>(.*?)<\/h3>/) || [];
      const prevTitle = prevTitleMatch[1] || "← ਪਿਛਲਾ";
      modalPrev.textContent = `← ${prevTitle}`;
    }
    if (currentIndex >= visible.length - 1) {
      modalNext.disabled = true;
      modalNext.textContent = "";
    } else {
      const nextCard = visible[currentIndex + 1];
      const nextTitleMatch =
        nextCard.getAttribute("data-full").match(/<h3>(.*?)<\/h3>/) || [];
      const nextTitle = nextTitleMatch[1] || "ਅਗਲਾ →";
      modalNext.disabled = false;
      modalNext.textContent = `${nextTitle} →`;
    }
  }

  function openModal(index) {
    const visible = getVisibleCards();
    if (index < 0 || index >= visible.length) return;
    currentIndex = index;
    const card = visible[currentIndex];

    // 6a) Populate Media
    modalMedia.innerHTML = "";
    const imgElem = card.querySelector(".media-container img");
    if (imgElem) {
      const cloneImg = imgElem.cloneNode(true);
      cloneImg.style.width = "100%";
      cloneImg.style.height = "auto";
      modalMedia.appendChild(cloneImg);
    }

    // 6b) Populate Text (data-full contains HTML)
    modalText.innerHTML = card.getAttribute("data-full") || "";

    // 6c) Show Modal
    modalOverlay.style.display = "flex";
    modalOverlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    // 6d) Update Prev/Next Buttons
    updateNavButtons();
  }

  function closeModal() {
    modalOverlay.style.display = "none";
    modalOverlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  // Attach click on each card (entire card)
  placeCards.forEach((card) => {
    card.addEventListener("click", () => {
      const idx = getVisibleCards().indexOf(card);
      openModal(idx);
    });
    // Also attach on “Read More” button
    const btn = card.querySelector(".read-more-btn");
    if (btn) {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = getVisibleCards().indexOf(card);
        openModal(idx);
      });
    }
  });

  // Modal close handlers
  if (modalClose) {
    modalClose.addEventListener("click", closeModal);
  }
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) {
      closeModal();
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalOverlay.style.display === "flex") {
      closeModal();
    }
  });

  // Prev / Next button handlers
  modalPrev.addEventListener("click", () => {
    if (currentIndex > 0) {
      openModal(currentIndex - 1);
    }
  });
  modalNext.addEventListener("click", () => {
    const visible = getVisibleCards();
    if (currentIndex < visible.length - 1) {
      openModal(currentIndex + 1);
    }
  });
});
