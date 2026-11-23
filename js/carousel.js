/* ==========================================================================
   BICIS — Service Carousel Controller (BICIS, DRRM, GAD, Social Welfare)
   Vanilla JS Only — Supports Tabs, Prev/Next, Keyboard, Touch Swipe, Autoplay
   ========================================================================== */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    const section = document.getElementById("service-carousel");
    if (!section) return;

    const viewport = section.querySelector(".carousel-viewport");
    const slides = Array.from(section.querySelectorAll(".carousel-slide"));
    const tabs = Array.from(section.querySelectorAll(".carousel-tab"));
    const prevBtn = section.querySelector("[data-carousel-prev]");
    const nextBtn = section.querySelector("[data-carousel-next]");
    const currentCounter = section.querySelector("[data-carousel-current]");
    const totalCounter = section.querySelector("[data-carousel-total]");

    if (!slides.length) return;

    const AUTOPLAY_MS = 6500;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let currentIndex = 0;
    let timerId = null;
    let isPausedByUser = false;

    if (totalCounter) {
      totalCounter.textContent = String(slides.length).padStart(2, "0");
    }

    function updateCounter(index) {
      if (currentCounter) {
        currentCounter.textContent = String(index + 1).padStart(2, "0");
      }
    }

    function restartProgressBar(activeIndex) {
      tabs.forEach(function (tab, idx) {
        const fill = tab.querySelector(".carousel-tab-progress-fill");
        if (!fill) return;

        // Force CSS transition reset for the newly active slide indicator
        fill.style.transition = "none";
        fill.style.transform = "scaleX(0)";

        if (idx === activeIndex && !isPausedByUser && !reducedMotion) {
          // Trigger reflow so the progress bar animates cleanly from 0 to 1
          void fill.offsetWidth;
          fill.style.transition = "";
          fill.style.transform = "";
        } else if (idx === activeIndex) {
          fill.style.transform = "scaleX(1)";
        }
      });
    }

    function goToSlide(nextIndex, userTriggered) {
      const total = slides.length;
      const targetIndex = ((nextIndex % total) + total) % total;

      if (targetIndex === currentIndex && !userTriggered) {
        restartProgressBar(targetIndex);
        return;
      }

      const prevSlide = slides[currentIndex];
      const nextSlide = slides[targetIndex];

      slides.forEach(function (slide) {
        slide.classList.remove("is-active", "is-exiting-left");
        slide.setAttribute("aria-hidden", "true");
      });

      if (prevSlide && prevSlide !== nextSlide) {
        prevSlide.classList.add("is-exiting-left");
      }

      nextSlide.classList.add("is-active");
      nextSlide.setAttribute("aria-hidden", "false");

      tabs.forEach(function (tab, idx) {
        const active = idx === targetIndex;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-selected", active ? "true" : "false");
      });

      currentIndex = targetIndex;
      updateCounter(currentIndex);

      if (userTriggered) {
        pauseAutoplay(true);
      }

      restartProgressBar(currentIndex);
    }

    function startAutoplay() {
      if (reducedMotion || isPausedByUser) return;
      stopAutoplay();
      section.classList.remove("is-paused");
      timerId = window.setInterval(function () {
        goToSlide(currentIndex + 1, false);
      }, AUTOPLAY_MS);
    }

    function stopAutoplay() {
      if (timerId !== null) {
        window.clearInterval(timerId);
        timerId = null;
      }
    }

    function pauseAutoplay(permanent) {
      stopAutoplay();
      section.classList.add("is-paused");
      if (permanent) {
        isPausedByUser = true;
      }
    }

    // Controls: Previous & Next
    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        goToSlide(currentIndex - 1, true);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        goToSlide(currentIndex + 1, true);
      });
    }

    // Controls: Slide Indicator Tabs
    tabs.forEach(function (tab, idx) {
      tab.addEventListener("click", function () {
        goToSlide(idx, true);
      });
    });

    // Keyboard Navigation when Carousel has focus
    section.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToSlide(currentIndex - 1, true);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goToSlide(currentIndex + 1, true);
      }
    });

    // Pause on hover / focus-within
    section.addEventListener("mouseenter", function () {
      if (!isPausedByUser) {
        stopAutoplay();
        section.classList.add("is-paused");
      }
    });

    section.addEventListener("mouseleave", function () {
      if (!isPausedByUser && !reducedMotion) {
        section.classList.remove("is-paused");
        restartProgressBar(currentIndex);
        startAutoplay();
      }
    });

    section.addEventListener("focusin", function () {
      if (!isPausedByUser) {
        stopAutoplay();
        section.classList.add("is-paused");
      }
    });

    section.addEventListener("focusout", function (event) {
      if (!section.contains(event.relatedTarget) && !isPausedByUser && !reducedMotion) {
        section.classList.remove("is-paused");
        restartProgressBar(currentIndex);
        startAutoplay();
      }
    });

    // Mobile Touch Swipe Support
    if (viewport) {
      let touchStartX = 0;
      let touchStartY = 0;
      let isSwiping = false;

      viewport.addEventListener(
        "touchstart",
        function (event) {
          if (event.touches.length !== 1) return;
          touchStartX = event.touches[0].clientX;
          touchStartY = event.touches[0].clientY;
          isSwiping = true;
        },
        { passive: true }
      );

      viewport.addEventListener(
        "touchend",
        function (event) {
          if (!isSwiping || !event.changedTouches.length) return;
          isSwiping = false;

          const deltaX = event.changedTouches[0].clientX - touchStartX;
          const deltaY = event.changedTouches[0].clientY - touchStartY;

          // Only treat predominantly horizontal gestures over 42px as slide swipes
          if (Math.abs(deltaX) > 42 && Math.abs(deltaX) > Math.abs(deltaY) * 1.25) {
            if (deltaX < 0) {
              goToSlide(currentIndex + 1, true);
            } else {
              goToSlide(currentIndex - 1, true);
            }
          }
        },
        { passive: true }
      );
    }

    // Initialize Slide 0 (BICIS)
    updateCounter(0);
    restartProgressBar(0);
    startAutoplay();
  });
})();
