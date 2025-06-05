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
document.addEventListener("DOMContentLoaded", () => {
  /* ----------------------------------------
     1) Hamburger Menu Toggle
  ---------------------------------------- */
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
    2: {
      title: "ਪੰਜਾਬੀ ਕੌਫ਼ੀ ਮੱਗ",
      text: `
        <strong>ਤਫਸੀਲੀ ਵਰਣਨ:</strong><br/>
        11 oz ਸਿਰਾਮਿਕ ਮੱਗ ਉੱਤੇ “ਛੋਹਾ ਦੇ ਘਰੇ” ਦੇ ਪੰਜਾਬੀ ਸ਼ਬਦ ਲਿਖੇ ਹੋਏ ਹਨ। ਮੁੱਕਦਰ ਰੰਗ: ਨੀਲਾ ਬੋਰਡਰ।
        ਪੀਣ ਲਈ ਆਦਰਸ਼, ਡਿਸਪਲੇਅ ਕਰਨ ਲਈ ਆਰਾਮਦਾਇਕ। 
        <br/><br/>
        <strong>ਵਿਸ਼ੇਸ਼ਤਾ:</strong>
        <ul>
          <li>ਡਿਸ਼ਵਾਸ਼ਰ ਅਤੇ ਮਾਈਕ੍ਰੋਵੇਵ ਸੇਫ਼</li>
          <li>ਲਕੜੀ ਦਾ ਕਵਰ ਨਾਲ ਉਪਲਬ্ধ</li>
          <li>ਉਪਹਾਰ ਦੇ ਤੌਰ ਤੇ ਸ਼ਾਨਦਾਰ</li>
        </ul>
      `,
    },
    3: {
      title: "ਪੰਜਾਬੀ ਪੋਸਟਰ",
      text: `
        <strong>ਤਫਸੀਲੀ ਵਰਣਨ:</strong><br/>
        18"x24" ਮੈਟ ਲੈਮੀਨੇਟਿਡ ਪੋਸਟਰ ਵਿੱਚ ਪੰਜਾਬੀ ਲੋਕਧਾਰਾ ਦੇ ਰੰਗੀਨ ਦ੍ਰਿਸ਼ ਹਨ। 
        ਤੁਹਾਡੇ ਕੰਮਰੇ ਜਾਂ ਆਫਿਸ ਦੀ ਸ਼ਾਨ ਵਧਾਉਂਦਾ ਹੈ।
        <br/><br/>
        <strong>ਵਿਸ਼ੇਸ਼ਤਾ:</strong>
        <ul>
          <li>ਹਾਈ-ਰੈਜ਼ੋਲੇਸ਼ਨ ਪ੍ਰਿੰਟ</li>
          <li>ਟਿਅਰ-ਰੇਜ਼ਿਸਟੈਂਟ ਮੈਟੀਸ਼ ਫਿਨਿਸ਼</li>
          <li>ਦਿੱਤਾ ਮੁੱਕਦਰ ਦੀ ਮਹਾਰਤ</li>
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
      title: "ਪੰਜਾਬੀ ਟੀ-ਸ਼ਰਟ",
      price: 499,
      link: "https://www.amazon.in/example-product-1",
    },
    2: {
      title: "ਪੰਜਾਬੀ ਕੌਫ਼ੀ ਮੱਗ",
      price: 299,
      link: "https://www.flipkart.com/example-product-2",
    },
    3: {
      title: "ਪੰਜਾਬੀ ਪੋਸਟਰ",
      price: 199,
      link: "https://pattibytes.myshopify.com/example-product-3",
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
