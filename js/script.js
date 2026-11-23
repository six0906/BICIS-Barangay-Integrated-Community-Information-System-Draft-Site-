/* ==========================================================================
   BICIS — Core Site Interactions
   Loading screen, sticky navigation, mobile menu, scroll reveals,
   privacy modal, contact form validation, and service filtering.
   ========================================================================== */

(function () {
  "use strict";

  const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------------------
     1. Toast Notification Helper
     ------------------------------------------------------------------------ */
  function showToast(message) {
    let region = document.querySelector(".toast-region");
    if (!region) {
      region = document.createElement("div");
      region.className = "toast-region";
      region.setAttribute("aria-live", "polite");
      region.setAttribute("aria-atomic", "true");
      document.body.appendChild(region);
    }

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    region.appendChild(toast);

    window.setTimeout(function () {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(8px)";
      toast.style.transition = "opacity 220ms ease, transform 220ms ease";
      window.setTimeout(function () {
        toast.remove();
      }, 240);
    }, 3400);
  }

  window.BICIS = window.BICIS || {};
  window.BICIS.showToast = showToast;

  /* ------------------------------------------------------------------------
     2. Custom BICIS Loading Screen (Fast, Non-Blocking, Safe Fallback)
     ------------------------------------------------------------------------ */
  function initLoader() {
    const loader = document.getElementById("bicis-loader");
    if (!loader) return;

    let dismissed = false;

    function dismissLoader() {
      if (dismissed) return;
      dismissed = true;
      loader.classList.add("is-hidden");
      loader.setAttribute("aria-hidden", "true");
      document.body.classList.remove("no-scroll");

      window.setTimeout(function () {
        if (loader.parentNode) {
          loader.remove();
        }
      }, 320);
    }

    // Never delay returning visitors or reduced-motion users
    let seenIntro = false;
    try {
      seenIntro = sessionStorage.getItem("bicis-intro-seen") === "1";
      sessionStorage.setItem("bicis-intro-seen", "1");
    } catch (e) {}

    if (REDUCED_MOTION || seenIntro) {
      dismissLoader();
      return;
    }

    const minDisplayTime = 280;
    const startTime = performance.now();

    function scheduleDismiss() {
      const elapsed = performance.now() - startTime;
      const remaining = Math.max(0, minDisplayTime - elapsed);
      window.setTimeout(dismissLoader, remaining);
    }

    if (document.readyState === "complete") {
      scheduleDismiss();
    } else {
      window.addEventListener("load", scheduleDismiss, { once: true });
    }

    // Hard safety fallback so the loader can never block the website indefinitely
    window.setTimeout(dismissLoader, 2400);
  }

  /* ------------------------------------------------------------------------
     3. Sticky Navigation Scroll State & Mobile Drawer
     ------------------------------------------------------------------------ */
  function initNavigation() {
    const header = document.querySelector(".site-header");
    const hamburger = document.getElementById("nav-hamburger");
    const drawer = document.getElementById("mobile-drawer");

    function updateHeaderScroll() {
      if (!header) return;
      if (window.scrollY > 18) {
        header.classList.add("is-scrolled");
      } else {
        header.classList.remove("is-scrolled");
      }
    }

    updateHeaderScroll();
    window.addEventListener("scroll", updateHeaderScroll, { passive: true });

    if (!hamburger || !drawer) return;

    function setDrawerState(open) {
      hamburger.setAttribute("aria-expanded", open ? "true" : "false");
      drawer.classList.toggle("is-open", open);
      drawer.setAttribute("aria-hidden", open ? "false" : "true");
      document.body.classList.toggle("no-scroll", open);
    }

    hamburger.addEventListener("click", function () {
      const isOpen = hamburger.getAttribute("aria-expanded") === "true";
      setDrawerState(!isOpen);
    });

    drawer.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        setDrawerState(false);
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && drawer.classList.contains("is-open")) {
        setDrawerState(false);
        hamburger.focus();
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 900 && drawer.classList.contains("is-open")) {
        setDrawerState(false);
      }
    });
  }

  /* ------------------------------------------------------------------------
     4. Editorial Scroll Reveals (Intersection Observer)
     ------------------------------------------------------------------------ */
  function initScrollReveals() {
    const targets = document.querySelectorAll("[data-reveal]");
    if (!targets.length) return;

    if (REDUCED_MOTION || !("IntersectionObserver" in window)) {
      targets.forEach(function (el) {
        el.classList.add("is-revealed");
      });
      return;
    }

    const observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -32px 0px" }
    );

    targets.forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ------------------------------------------------------------------------
     5. Reusable Native Modal System (Privacy Terms & Forgot Password)
     ------------------------------------------------------------------------ */
  function initModals() {
    let lastFocusedElement = null;

    function openModal(modalId) {
      const modal = document.getElementById(modalId);
      if (!modal) return;

      lastFocusedElement = document.activeElement;
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("no-scroll");

      const closeBtn = modal.querySelector("[data-modal-close]");
      if (closeBtn) {
        window.setTimeout(function () {
          closeBtn.focus();
        }, 60);
      }
    }

    function closeModal(modal) {
      if (!modal) return;
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("no-scroll");

      if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
        lastFocusedElement.focus();
      }
    }

    document.querySelectorAll("[data-modal-open]").forEach(function (trigger) {
      trigger.addEventListener("click", function (event) {
        event.preventDefault();
        openModal(trigger.getAttribute("data-modal-open"));
      });
    });

    document.querySelectorAll(".modal-backdrop").forEach(function (backdrop) {
      backdrop.addEventListener("click", function (event) {
        if (event.target === backdrop) {
          closeModal(backdrop);
        }
      });

      backdrop.querySelectorAll("[data-modal-close]").forEach(function (closeBtn) {
        closeBtn.addEventListener("click", function () {
          closeModal(backdrop);
        });
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        const activeModal = document.querySelector(".modal-backdrop.is-open");
        if (activeModal) {
          closeModal(activeModal);
        }
      }
    });

    window.BICIS.openModal = openModal;
  }

  /* ------------------------------------------------------------------------
     6. Services Category Filter Tabs (services.html)
     ------------------------------------------------------------------------ */
  function initServiceFilters() {
    const tabButtons = document.querySelectorAll("[data-service-filter]");
    const serviceCards = document.querySelectorAll("[data-service-category]");
    if (!tabButtons.length || !serviceCards.length) return;

    function applyFilter(category) {
      tabButtons.forEach(function (btn) {
        const active = btn.getAttribute("data-service-filter") === category;
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-pressed", active ? "true" : "false");
      });

      serviceCards.forEach(function (card) {
        const match = category === "all" || card.getAttribute("data-service-category") === category;
        card.style.display = match ? "" : "none";
      });
    }

    tabButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        applyFilter(btn.getAttribute("data-service-filter"));
      });
    });

    // Respect URL hash (e.g., services.html#drrm)
    const hash = window.location.hash.replace("#", "").toLowerCase();
    if (["bicis", "drrm", "gad", "social-welfare"].includes(hash)) {
      applyFilter(hash);
    }
  }

  /* ------------------------------------------------------------------------
     7. Community Inquiry Contact Form (Frontend Validation + Backend Ready)
     ------------------------------------------------------------------------ */
  function initContactForm() {
    const form = document.getElementById("bicis-contact-form");
    if (!form) return;

    const banner = document.getElementById("contact-form-banner");
    const nameInput = form.querySelector("#contact-name");
    const emailInput = form.querySelector("#contact-email");
    const topicInput = form.querySelector("#contact-topic");
    const messageInput = form.querySelector("#contact-message");

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      let valid = true;
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      [nameInput, emailInput, messageInput].forEach(function (el) {
        if (el) el.classList.remove("is-invalid");
      });

      if (!nameInput.value.trim() || nameInput.value.trim().length < 2) {
        nameInput.classList.add("is-invalid");
        valid = false;
      }

      if (!emailPattern.test(emailInput.value.trim())) {
        emailInput.classList.add("is-invalid");
        valid = false;
      }

      if (!messageInput.value.trim() || messageInput.value.trim().length < 10) {
        messageInput.classList.add("is-invalid");
        valid = false;
      }

      if (!valid) {
        if (banner) {
          banner.className = "form-banner form-banner--error is-visible";
          banner.textContent =
            "Please enter your full name, a valid email address, and a message of at least 10 characters.";
        }
        return;
      }

      if (banner) {
        banner.className = "form-banner form-banner--info is-visible";
        banner.innerHTML =
          "<strong>Frontend validation passed.</strong> Your inquiry regarding <em>" +
          (topicInput ? topicInput.value : "Community Services") +
          "</em> is formatted for backend delivery. Connect this form to a PHP endpoint (for example, <code>api/contact.php</code> in XAMPP) to store or forward resident inquiries.";
      }

      showToast("Inquiry validated — ready for backend submission.");
      form.reset();
    });
  }

  /* ------------------------------------------------------------------------
     Initialize Everything on DOM Ready
     ------------------------------------------------------------------------ */
  document.addEventListener("DOMContentLoaded", function () {
    initLoader();
    initNavigation();
    initScrollReveals();
    initModals();
    initServiceFilters();
    initContactForm();
  });
})();
