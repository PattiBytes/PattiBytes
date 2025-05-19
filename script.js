document.addEventListener("DOMContentLoaded", () => {
  // 1) Element References
  const desktopToggle = document.getElementById("lang-toggle");
  const mobileMenu    = document.getElementById("mobile-menu");
  const backToTop     = document.getElementById("back-to-top");
  const hamburger     = document.getElementById("hamburger");

  // Helper: set GTranslate cookie
  function setGTranslate(lang) {
    document.cookie = `googtrans=/pa/${lang}; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/`;
  }

  // Initialize saved language (default 'pa')
  const savedLang = localStorage.getItem("pattiBytesLang") || "pa";
  setGTranslate(savedLang);

  // Set initial state of toggle
  if (desktopToggle) {
    desktopToggle.checked = (savedLang === "en");
  }

  // When desktop toggle changes
  if (desktopToggle) {
    desktopToggle.addEventListener("change", (e) => {
      const newLang = e.target.checked ? "en" : "pa";
      localStorage.setItem("pattiBytesLang", newLang);
      setGTranslate(newLang);
      setTimeout(() => window.location.reload(), 300);
    });
  }

  // 2) Hamburger Menu Toggle (Mobile)
  if (hamburger) {
    hamburger.addEventListener("click", (e) => {
      e.stopPropagation();
      const isExpanded = hamburger.getAttribute("aria-expanded") === "true";
      hamburger.setAttribute("aria-expanded", !isExpanded);
      mobileMenu.classList.toggle("show");
      mobileMenu.setAttribute("aria-hidden", isExpanded);
    });
    mobileMenu.addEventListener("click", (e) => e.stopPropagation());
  }
  document.addEventListener("click", () => {
    if (mobileMenu) {
      mobileMenu.classList.remove("show");
      hamburger.setAttribute("aria-expanded", "false");
      mobileMenu.setAttribute("aria-hidden", "true");
    }
  });

  // 3) Back-to-Top Button Logic (Debounced)
  if (backToTop) {
    let scrollTimeout;
    window.addEventListener("scroll", () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (window.scrollY > 300) {
          backToTop.classList.add("visible");
        } else {
          backToTop.classList.remove("visible");
        }
      }, 100);
    });
    backToTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // 4) Scroll-Triggered Animations
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

  // 5) Three.js 3D Model Setup (Optional)
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
});
document.addEventListener("DOMContentLoaded", () => {
  /* FAQ Dropdown Toggle */
  const faqButtons = document.querySelectorAll(".faq-question");
  faqButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const answer = btn.nextElementSibling;
      if (answer.style.maxHeight) {
        answer.style.maxHeight = null;
      } else {
        answer.style.maxHeight = answer.scrollHeight + "px";
      }
    });
  });

  /* Back-to-Top Button Logic */
  const backToTop = document.getElementById("back-to-top");
  window.addEventListener("scroll", () => {
    if (window.scrollY > 300) {
      backToTop.classList.add("visible");
    } else {
      backToTop.classList.remove("visible");
    }
  });
  backToTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  /* Hamburger Menu Toggle (if needed) */
  const hamburger = document.getElementById("hamburger");
  const mobileMenu = document.getElementById("mobile-menu");
  hamburger.addEventListener("click", (e) => {
    e.stopPropagation();
    const isExpanded = hamburger.getAttribute("aria-expanded") === "true";
    hamburger.setAttribute("aria-expanded", !isExpanded);
    mobileMenu.classList.toggle("show");
    mobileMenu.setAttribute("aria-hidden", isExpanded);
  });
  mobileMenu.addEventListener("click", (e) => e.stopPropagation());
  document.addEventListener("click", () => {
    mobileMenu.classList.remove("show");
    hamburger.setAttribute("aria-expanded", "false");
    mobileMenu.setAttribute("aria-hidden", "true");
  });
});
document.addEventListener("DOMContentLoaded", () => {
  /* ----------------------------
     Auto‑Scroll Achievements
  ----------------------------- */
  const scrollContainer = document.querySelector(".achievements-scroll");
  if (scrollContainer) {
    // Total width of all cards (including gaps)
    const scrollWidth = scrollContainer.scrollWidth;
    // Visible width of the container
    const visibleWidth = scrollContainer.clientWidth;
    // Current scroll position
    let scrollPos = 0;
    // Scroll speed (pixels per frame)
    const scrollSpeed = 0.5;
    // When to reset (scrollWidth – visibleWidth)
    const maxScrollLeft = scrollWidth - visibleWidth;

    function step() {
      scrollPos += scrollSpeed;
      if (scrollPos >= maxScrollLeft) {
        // Once we reach the end, jump back to start
        scrollPos = 0;
      }
      scrollContainer.scrollLeft = scrollPos;
      requestAnimationFrame(step);
    }
    // Kick off the animation
    requestAnimationFrame(step);
  }
});
