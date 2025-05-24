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

  // ----- 2) Back-to-Top Button -----
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

  // ----- 6) Hamburger + Home ▶ Topics Toggle -----
  const hamburger = document.getElementById("hamburger");
  const mobileMenu = document.getElementById("mobile-menu");

  if (hamburger && mobileMenu) {
    // Function to close entire menu & submenus
    const closeMenu = () => {
      mobileMenu.classList.remove("show");
      hamburger.setAttribute("aria-expanded", "false");
      mobileMenu.setAttribute("aria-hidden", "true");

      // Hide all open submenus & reset caret
      document.querySelectorAll(".has-dropdown .dropdown").forEach((dd) => {
        dd.style.display = "none";
      });
      document
        .querySelectorAll(".dropdown-toggle.open")
        .forEach((btn) => btn.classList.remove("open"));
    };

    // Toggle main menu
    const toggleMenu = () => {
      const isExpanded = hamburger.getAttribute("aria-expanded") === "true";
      hamburger.setAttribute("aria-expanded", String(!isExpanded));
      mobileMenu.classList.toggle("show");
      mobileMenu.setAttribute("aria-hidden", String(isExpanded));
    };

    // 6a) Hamburger click
    hamburger.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMenu();
    });

    // 6b) Clicking outside closes everything
    document.addEventListener("click", closeMenu);
    mobileMenu.addEventListener("click", (e) => e.stopPropagation());

    // 6c) Caret‐button toggles dropdown on all screens
    document.querySelectorAll(".dropdown-toggle").forEach((toggleBtn) => {
      toggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const parentLi = toggleBtn.closest(".has-dropdown");
        const submenu = parentLi.querySelector(".dropdown");
        const isOpen = submenu.style.display === "block";

        // Close any other open submenu first
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

    // 6d) Clicking any link inside nav closes the menu
    mobileMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", (e) => {
        const href = link.getAttribute("href");
        // Smooth‐scroll if it’s an in-page anchor
        if (href.startsWith("#")) {
          e.preventDefault();
          const target = document.querySelector(href);
          if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
          }
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
      if (scrollPos >= maxScrollLeft) {
        scrollPos = 0;
      }
      scrollContainer.scrollLeft = scrollPos;
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // ----- 8) Read More Modal (unchanged) -----
  const modalOverlay = document.getElementById("history-modal");
  const readMoreBtn = document.getElementById("read-more-btn");
  const closeBtn = document.getElementById("modal-close");

  if (readMoreBtn && modalOverlay) {
    readMoreBtn.addEventListener("click", () => {
      modalOverlay.style.display = "flex";
      modalOverlay.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    });
  }
  if (closeBtn && modalOverlay) {
    closeBtn.addEventListener("click", () => {
      modalOverlay.style.display = "none";
      modalOverlay.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    });
  }
  if (modalOverlay) {
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) {
        modalOverlay.style.display = "none";
        modalOverlay.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modalOverlay.style.display === "flex") {
        modalOverlay.style.display = "none";
        modalOverlay.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
      }
    });
  }
});
