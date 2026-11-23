/* ==========================================================================
   BICIS — Authentication Frontend Controller (Login & Registration)
   Pure Vanilla JS — Validation, Password Toggles, Privacy Check, Loading UI
   Note: Never stores real passwords in localStorage and never fabricates
   authentication when no backend server is connected.
   ========================================================================== */

(function () {
  "use strict";

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setFieldError(inputEl, errorEl, message) {
    if (inputEl) {
      inputEl.classList.toggle("is-invalid", Boolean(message));
      inputEl.setAttribute("aria-invalid", message ? "true" : "false");
    }
    if (errorEl) {
      errorEl.textContent = message || "";
    }
  }

  function showBanner(bannerEl, type, htmlMessage) {
    if (!bannerEl) return;
    bannerEl.className = "form-banner form-banner--" + type + " is-visible";
    bannerEl.innerHTML = htmlMessage;
  }

  function clearBanner(bannerEl) {
    if (!bannerEl) return;
    bannerEl.className = "form-banner";
    bannerEl.textContent = "";
  }

  function setButtonLoading(button, isLoading, defaultLabel, loadingLabel) {
    if (!button) return;
    button.disabled = isLoading;
    if (isLoading) {
      button.innerHTML = '<span class="btn-spinner" aria-hidden="true"></span><span>' + loadingLabel + "</span>";
    } else {
      button.innerHTML = defaultLabel;
    }
  }

  /* ------------------------------------------------------------------------
     Password Show / Hide Toggles
     ------------------------------------------------------------------------ */
  function initPasswordToggles() {
    document.querySelectorAll("[data-password-toggle]").forEach(function (toggleBtn) {
      const targetId = toggleBtn.getAttribute("data-password-toggle");
      const input = document.getElementById(targetId);
      if (!input) return;

      const eyeOpen = toggleBtn.querySelector(".icon-eye-open");
      const eyeClosed = toggleBtn.querySelector(".icon-eye-closed");

      toggleBtn.addEventListener("click", function () {
        const showing = input.type === "text";
        input.type = showing ? "password" : "text";
        toggleBtn.setAttribute("aria-pressed", showing ? "false" : "true");
        toggleBtn.setAttribute("aria-label", showing ? "Show password" : "Hide password");

        if (eyeOpen) eyeOpen.style.display = showing ? "block" : "none";
        if (eyeClosed) eyeClosed.style.display = showing ? "none" : "block";
      });
    });
  }

  /* ------------------------------------------------------------------------
     Password Strength Evaluation (Registration Only)
     ------------------------------------------------------------------------ */
  function evaluatePasswordStrength(password) {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  }

  function initStrengthMeter() {
    const pwdInput = document.getElementById("register-password");
    const meterWrap = document.getElementById("password-strength");
    if (!pwdInput || !meterWrap) return;

    const bars = meterWrap.querySelectorAll(".strength-bar");
    const label = meterWrap.querySelector(".strength-label");
    const labels = ["Enter at least 8 characters", "Weak", "Fair", "Good", "Strong"];

    pwdInput.addEventListener("input", function () {
      const value = pwdInput.value;
      const score = value ? evaluatePasswordStrength(value) : 0;

      bars.forEach(function (bar, index) {
        bar.classList.toggle("is-filled", index < score);
      });

      if (label) {
        label.textContent = value ? "Password strength: " + labels[score] : labels[0];
      }
    });
  }

  /* ------------------------------------------------------------------------
     Login Form Handler
     ------------------------------------------------------------------------ */
  function initLoginForm() {
    const form = document.getElementById("bicis-login-form");
    if (!form) return;

    const emailInput = document.getElementById("login-email");
    const passwordInput = document.getElementById("login-password");
    const emailError = document.getElementById("login-email-error");
    const passwordError = document.getElementById("login-password-error");
    const banner = document.getElementById("login-form-banner");
    const submitBtn = document.getElementById("login-submit-btn");
    const defaultBtnHtml = submitBtn ? submitBtn.innerHTML : "Sign In";

    emailInput.addEventListener("input", function () {
      setFieldError(emailInput, emailError, "");
      clearBanner(banner);
    });

    passwordInput.addEventListener("input", function () {
      setFieldError(passwordInput, passwordError, "");
      clearBanner(banner);
    });

    form.addEventListener("submit", function (event) {
      // Prevent submission while no server backend is attached; remove or adapt for PHP POST
      event.preventDefault();
      clearBanner(banner);

      const email = emailInput.value.trim();
      const password = passwordInput.value;
      let isValid = true;

      if (!email) {
        setFieldError(emailInput, emailError, "Please enter your email address.");
        isValid = false;
      } else if (!EMAIL_REGEX.test(email)) {
        setFieldError(emailInput, emailError, "Please enter a valid email address.");
        isValid = false;
      } else {
        setFieldError(emailInput, emailError, "");
      }

      if (!password) {
        setFieldError(passwordInput, passwordError, "Please enter your password.");
        isValid = false;
      } else if (password.length < 8) {
        setFieldError(passwordInput, passwordError, "Password must be at least 8 characters.");
        isValid = false;
      } else {
        setFieldError(passwordInput, passwordError, "");
      }

      if (!isValid) {
        showBanner(banner, "error", "Please review the highlighted fields before continuing.");
        return;
      }

      setButtonLoading(submitBtn, true, defaultBtnHtml, "Checking input...");

      window.setTimeout(function () {
        setButtonLoading(submitBtn, false, defaultBtnHtml, "");
        // Honest frontend notice: do NOT pretend the user is authenticated without a real backend
        showBanner(
          banner,
          "info",
          "<strong>Frontend validation complete — backend required for sign-in.</strong> " +
            "No authentication session was created because this static frontend is not yet connected to a server. " +
            "To enable live accounts in XAMPP, connect this form's <code>action</code> to a PHP/MySQL authentication endpoint (for example, <code>../api/login.php</code>)."
        );
      }, 520);
    });
  }

  /* ------------------------------------------------------------------------
     Registration Form Handler
     ------------------------------------------------------------------------ */
  function initRegisterForm() {
    const form = document.getElementById("bicis-register-form");
    if (!form) return;

    const nameInput = document.getElementById("register-name");
    const emailInput = document.getElementById("register-email");
    const passwordInput = document.getElementById("register-password");
    const confirmInput = document.getElementById("register-confirm");
    const privacyCheckbox = document.getElementById("register-privacy");

    const nameError = document.getElementById("register-name-error");
    const emailError = document.getElementById("register-email-error");
    const passwordError = document.getElementById("register-password-error");
    const confirmError = document.getElementById("register-confirm-error");
    const privacyError = document.getElementById("register-privacy-error");

    const banner = document.getElementById("register-form-banner");
    const submitBtn = document.getElementById("register-submit-btn");
    const defaultBtnHtml = submitBtn ? submitBtn.innerHTML : "Create Account";

    // Ensure privacy checkbox is NEVER auto-checked on load
    if (privacyCheckbox) {
      privacyCheckbox.checked = false;
    }

    // Live confirmation check while typing confirm password
    confirmInput.addEventListener("input", function () {
      if (confirmInput.value && confirmInput.value !== passwordInput.value) {
        setFieldError(confirmInput, confirmError, "Passwords do not match.");
      } else {
        setFieldError(confirmInput, confirmError, "");
      }
    });

    [
      [nameInput, nameError],
      [emailInput, emailError],
      [passwordInput, passwordError]
    ].forEach(function (pair) {
      pair[0].addEventListener("input", function () {
        setFieldError(pair[0], pair[1], "");
        clearBanner(banner);
      });
    });

    privacyCheckbox.addEventListener("change", function () {
      if (privacyCheckbox.checked) {
        setFieldError(privacyCheckbox, privacyError, "");
      }
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      clearBanner(banner);

      const fullName = nameInput.value.trim();
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      const confirmPassword = confirmInput.value;
      let isValid = true;

      if (!fullName || fullName.length < 2) {
        setFieldError(nameInput, nameError, "Please enter your full name.");
        isValid = false;
      } else {
        setFieldError(nameInput, nameError, "");
      }

      if (!email) {
        setFieldError(emailInput, emailError, "An email address is required for account access and recovery.");
        isValid = false;
      } else if (!EMAIL_REGEX.test(email)) {
        setFieldError(emailInput, emailError, "Please enter a valid email address.");
        isValid = false;
      } else {
        setFieldError(emailInput, emailError, "");
      }

      if (!password || password.length < 8) {
        setFieldError(passwordInput, passwordError, "Password must be at least 8 characters long.");
        isValid = false;
      } else {
        setFieldError(passwordInput, passwordError, "");
      }

      if (!confirmPassword) {
        setFieldError(confirmInput, confirmError, "Please confirm your password.");
        isValid = false;
      } else if (confirmPassword !== password) {
        setFieldError(confirmInput, confirmError, "Passwords do not match.");
        isValid = false;
      } else {
        setFieldError(confirmInput, confirmError, "");
      }

      if (!privacyCheckbox.checked) {
        setFieldError(
          privacyCheckbox,
          privacyError,
          "You must review and agree to the Privacy Terms and Agreement before registering."
        );
        isValid = false;
      } else {
        setFieldError(privacyCheckbox, privacyError, "");
      }

      if (!isValid) {
        showBanner(banner, "error", "Please complete all required fields and accept the Privacy Terms and Agreement.");
        return;
      }

      setButtonLoading(submitBtn, true, defaultBtnHtml, "Validating registration...");

      window.setTimeout(function () {
        setButtonLoading(submitBtn, false, defaultBtnHtml, "");
        // Honest frontend notice: never store real passwords in localStorage or fake account creation
        showBanner(
          banner,
          "info",
          "<strong>Frontend validation passed — backend required to register accounts.</strong> " +
            "Your password was not saved in browser storage, and no account has been created yet. " +
            "Connect this form to a secure PHP/MySQL registration handler (for example, <code>../api/register.php</code> using <code>password_hash()</code>) in XAMPP to complete live registration."
        );
      }, 560);
    });
  }

  /* ------------------------------------------------------------------------
     Forgot Password Modal Form (Honest Backend-Ready Flow)
     ------------------------------------------------------------------------ */
  function initForgotPasswordForm() {
    const form = document.getElementById("bicis-forgot-form");
    if (!form) return;

    const emailInput = document.getElementById("forgot-email");
    const errorEl = document.getElementById("forgot-email-error");
    const banner = document.getElementById("forgot-form-banner");

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      const email = emailInput.value.trim();

      if (!EMAIL_REGEX.test(email)) {
        setFieldError(emailInput, errorEl, "Please enter a valid registered email address.");
        return;
      }

      setFieldError(emailInput, errorEl, "");
      showBanner(
        banner,
        "info",
        "<strong>Recovery request validated (frontend only).</strong> No email was dispatched because a mail/backend service is not yet attached. Connect this form to a PHP password-recovery script when deploying on XAMPP."
      );
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initPasswordToggles();
    initStrengthMeter();
    initLoginForm();
    initRegisterForm();
    initForgotPasswordForm();
  });
})();
