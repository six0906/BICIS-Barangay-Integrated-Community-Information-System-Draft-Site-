/* ==========================================================================
   BICIS — Theme Switcher (Light & Dark Mode)
   Persists user choice in localStorage; falls back to system preference.
   ========================================================================== */

(function () {
  "use strict";

  const STORAGE_KEY = "bicis-theme";
  const DARK_MEDIA = window.matchMedia("(prefers-color-scheme: dark)");

  function getSavedTheme() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === "dark" || saved === "light" ? saved : null;
    } catch (err) {
      return null;
    }
  }

  function getInitialTheme() {
    return getSavedTheme() || (DARK_MEDIA.matches ? "dark" : "light");
  }

  function applyTheme(theme, savePreference) {
    const resolved = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", resolved);

    if (savePreference) {
      try {
        localStorage.setItem(STORAGE_KEY, resolved);
      } catch (err) {
        // Ignore storage restrictions in private browsing
      }
    }

    updateToggleButtons(resolved);
  }

  function updateToggleButtons(theme) {
    const buttons = document.querySelectorAll("[data-theme-toggle]");
    const nextLabel = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

    buttons.forEach(function (btn) {
      btn.setAttribute("aria-label", nextLabel);
      btn.setAttribute("title", nextLabel);
      btn.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    });
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || getInitialTheme();
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next, true);
  }

  // Apply immediately in case inline head script was not present
  applyTheme(getInitialTheme(), false);

  document.addEventListener("DOMContentLoaded", function () {
    const current = document.documentElement.getAttribute("data-theme") || getInitialTheme();
    updateToggleButtons(current);

    document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
      btn.addEventListener("click", toggleTheme);
    });
  });

  // Follow OS theme changes when the user has not explicitly chosen a theme
  if (typeof DARK_MEDIA.addEventListener === "function") {
    DARK_MEDIA.addEventListener("change", function (event) {
      if (!getSavedTheme()) {
        applyTheme(event.matches ? "dark" : "light", false);
      }
    });
  }
})();
