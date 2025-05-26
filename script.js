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
