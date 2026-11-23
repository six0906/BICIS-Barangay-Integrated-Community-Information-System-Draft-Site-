/* ==========================================================================
   BICIS — Unified Portal Shell (Clear, Approachable Sidebar & View Router)
   Pure Vanilla JavaScript — Shared by portal, registry, gad-care, gabay, handa-plus
   ========================================================================== */

(function () {
  "use strict";

  const SIDEBAR_GROUPS = [
    {
      id: "gad-care",
      label: "GAD-CARE",
      subtitle: "Women & Family Care",
      page: "gad-care.html",
      permKey: "gadAccess",
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="5"/><circle cx="15" cy="12" r="5"/></svg>',
      items: [
        { hash: "dashboard", label: "Dashboard" },
        { hash: "tagging", label: "Tag Beneficiaries" },
        { hash: "assessments", label: "Needs Assessment" },
        { hash: "inventory", label: "Supply Inventory" },
        { hash: "rules", label: "Allocation Rules" },
        { hash: "release", label: "Release Kits" },
        { hash: "logs", label: "Distribution Logs" },
        { hash: "reports", label: "Printable Reports" }
      ]
    },
    {
      id: "gabay",
      label: "GABAY",
      subtitle: "Social Welfare Aid",
      page: "gabay.html",
      permKey: "gabayAccess",
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M21 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
      items: [
        { hash: "dashboard", label: "Dashboard" },
        { hash: "programs", label: "Assistance Programs" },
        { hash: "beneficiaries", label: "Enrolled Beneficiaries" },
        { hash: "aid-records", label: "Aid Records" },
        { hash: "senior-pwd", label: "Senior & PWD List" },
        { hash: "requests", label: "New Aid Request" },
        { hash: "request-management", label: "Manage Requests" },
        { hash: "indigency", label: "Certificate of Indigency" },
        { hash: "reports", label: "Reports & Records" },
        { hash: "profile", label: "Profile & Settings" }
      ]
    },
    {
      id: "handa-plus",
      label: "HANDA+",
      subtitle: "Disaster Readiness",
      page: "handa-plus.html",
      permKey: "handaAny",
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r="0.6" fill="currentColor"/></svg>',
      items: [
        { hash: "dashboard", label: "Dashboard" },
        { hash: "hazards", label: "Hazard Tagging" },
        { hash: "rescue-list", label: "Priority Rescue List" },
        { hash: "centers", label: "Evacuation Centers" },
        { hash: "checkin", label: "Evacuation Check-In" },
        { hash: "inventory", label: "Relief Supplies" },
        { hash: "rules", label: "Relief Rules" },
        { hash: "distribution", label: "Relief Distribution" },
        { hash: "events", label: "Disaster Events" },
        { hash: "alerts", label: "Alerts & Advisories" },
        { hash: "announcements", label: "Announcements" },
        { hash: "qr-cards", label: "Household QR Cards" },
        { hash: "map", label: "Barangay Safety Map" }
      ]
    }
  ];

  function canViewGroup(group, role) {
    if (role.permissions.residentOnly) {
      return group.id === "handa-plus";
    }
    if (group.permKey === "handaAny") {
      return role.permissions.handaFull || role.permissions.handaCheckinRelief;
    }
    return Boolean(role.permissions[group.permKey]);
  }

  function renderSidebar(currentModule, currentView) {
    const sidebar = document.getElementById("portal-sidebar");
    if (!sidebar || !window.BICIS_STORE) return;

    const role = window.BICIS_STORE.getCurrentRole();
    const isResident = role.permissions.residentOnly;

    let committeeSectionHtml = "";

    if (isResident) {
      // Friendly, ultra-simple navigation for Phase 1 Residents (no intimidating committee menus)
      const pubItems = [
        { hash: "alerts", label: "Alerts & Advisories" },
        { hash: "announcements", label: "Announcements" },
        { hash: "centers", label: "Evacuation Centers" },
        { hash: "map", label: "Barangay Safety Map" }
      ];
      committeeSectionHtml =
        '<div>' +
        '<div class="sidebar-section-label">Public Safety Info</div>' +
        '<ul class="sidebar-nav-list">' +
        pubItems
          .map(function (item) {
            const active = currentModule === "handa-plus" && currentView === item.hash ? " is-active" : "";
            const href = currentModule === "handa-plus" ? "#" + item.hash : "handa-plus.html#" + item.hash;
            return (
              '<li><a class="sidebar-link' +
              active +
              '" href="' +
              href +
              '" data-subview="' +
              item.hash +
              '">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' +
              "<span>" +
              item.label +
              "</span></a></li>"
            );
          })
          .join("") +
        "</ul></div>";
    } else {
      let groupsHtml = "";
      SIDEBAR_GROUPS.forEach(function (group) {
        const allowed = canViewGroup(group, role);
        const isCurrentMod = currentModule === group.id;
        const openClass = isCurrentMod ? " is-open is-current-module" : "";

        let visibleItems = group.items;
        if (!role.permissions.handaFull && role.permissions.handaCheckinRelief && group.id === "handa-plus") {
          visibleItems = group.items.filter(function (item) {
            return ["dashboard", "checkin", "distribution", "centers", "alerts", "announcements", "map"].includes(item.hash);
          });
        }

        const subLinks = visibleItems
          .map(function (item) {
            const active = isCurrentMod && currentView === item.hash ? " is-active" : "";
            const href = isCurrentMod ? "#" + item.hash : group.page + "#" + item.hash;
            return (
              '<li><a class="sidebar-sublink' +
              active +
              '" href="' +
              href +
              '" data-subview="' +
              item.hash +
              '"><span>' +
              item.label +
              "</span></a></li>"
            );
          })
          .join("");

        groupsHtml +=
          '<div class="sidebar-group' +
          openClass +
          '" data-group-id="' +
          group.id +
          '">' +
          '<button type="button" class="sidebar-group-toggle" aria-expanded="' +
          (isCurrentMod ? "true" : "false") +
          '">' +
          '<span class="sidebar-group-title">' +
          group.icon +
          '<span class="sidebar-group-meta"><span>' +
          group.label +
          '</span><span class="sidebar-group-sub">' +
          (allowed ? group.subtitle : "Restricted to " + group.label + " staff") +
          "</span></span></span>" +
          '<svg class="sidebar-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>' +
          "</button>" +
          '<ul class="sidebar-sublist">' +
          subLinks +
          "</ul>" +
          "</div>";
      });

      committeeSectionHtml =
        '<div><div class="sidebar-section-label">Committees</div>' + groupsHtml + "</div>";
    }

    sidebar.innerHTML =
      '<div class="sidebar-brand">' +
      '<a href="portal.html#dashboard" class="brand-link" aria-label="BICIS Dashboard">' +
      '<svg class="brand-emblem" style="width:32px;height:32px;" viewBox="0 0 48 48" aria-hidden="true">' +
      '<path d="M24 3.5L40.5 11.5V24.5C40.5 33.6 33.5 40.3 24 44.5C14.5 40.3 7.5 33.6 7.5 24.5V11.5L24 3.5Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M14.5 29C15.5 24.2 19.3 21.2 24 21.2C28.7 21.2 32.5 24.2 33.5 29" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>' +
      '<circle cx="16.5" cy="18.2" r="2.2" fill="currentColor"/>' +
      '<circle cx="31.5" cy="18.2" r="2.2" fill="currentColor"/>' +
      '<circle cx="24" cy="14.5" r="3.4" fill="var(--accent)"/>' +
      '<circle cx="24" cy="26.5" r="2" fill="var(--accent)"/>' +
      "</svg>" +
      '<span class="brand-text"><span class="brand-name" style="font-family:var(--font-sans);font-weight:700;font-size:1.1rem;">BICIS</span><span class="brand-sub" style="font-size:0.74rem;">Barangay Dimagiba</span></span>' +
      "</a>" +
      '<button type="button" class="sidebar-close-mobile" id="sidebar-close-mobile" aria-label="Close navigation menu">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
      "</button>" +
      "</div>" +
      '<div class="sidebar-scroll">' +
      '<div>' +
      '<div class="sidebar-section-label">Main</div>' +
      '<ul class="sidebar-nav-list">' +
      '<li><a class="sidebar-link' +
      (currentModule === "portal" && currentView === "dashboard" ? " is-active" : "") +
      '" href="' +
      (currentModule === "portal" ? "#dashboard" : "portal.html#dashboard") +
      '">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>' +
      "<span>Home Dashboard</span></a></li>" +
      '<li><a class="sidebar-link' +
      (currentModule === "portal" && currentView === "overview" ? " is-active" : "") +
      '" href="' +
      (currentModule === "portal" ? "#overview" : "portal.html#overview") +
      '">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' +
      "<span>System Guide</span></a></li>" +
      "</ul>" +
      "</div>" +
      (!isResident
        ? '<div>' +
          '<div class="sidebar-section-label">Core Records</div>' +
          '<ul class="sidebar-nav-list">' +
          '<li><a class="sidebar-link' +
          (currentModule === "registry" ? " is-active" : "") +
          '" href="registry.html">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>' +
          "<span>Resident Registry</span></a></li>" +
          "</ul>" +
          "</div>"
        : "") +
      committeeSectionHtml +
      '<div>' +
      '<div class="sidebar-section-label">Account</div>' +
      '<ul class="sidebar-nav-list">' +
      '<li><a class="sidebar-link' +
      (currentModule === "gabay" && currentView === "profile" ? " is-active" : "") +
      '" href="gabay.html#profile">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
      "<span>Profile &amp; Settings</span></a></li>" +
      '<li><a class="sidebar-link" href="../index.html">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' +
      "<span>Public Website</span></a></li>" +
      '<li><a class="sidebar-link" href="login.html">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>' +
      "<span>Sign Out</span></a></li>" +
      "</ul>" +
      "</div>" +
      "</div>" +
      '<div class="sidebar-footer">' +
      '<div><strong>Barangay Dimagiba</strong> · Legazpi City</div>' +
      '<div style="margin-top:0.18rem;">Viewing as: <strong style="color:var(--accent);">' +
      role.short +
      "</strong></div>" +
      "</div>";

    sidebar.querySelectorAll(".sidebar-group-toggle").forEach(function (toggle) {
      toggle.addEventListener("click", function () {
        const groupEl = toggle.closest(".sidebar-group");
        const isOpen = groupEl.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      });
    });

    const closeBtn = document.getElementById("sidebar-close-mobile");
    if (closeBtn) {
      closeBtn.addEventListener("click", closeMobileSidebar);
    }

    sidebar.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        if (window.innerWidth <= 1080) {
          closeMobileSidebar();
        }
      });
    });
  }

  function openMobileSidebar() {
    const sidebar = document.getElementById("portal-sidebar");
    const backdrop = document.getElementById("sidebar-backdrop");
    if (sidebar) sidebar.classList.add("is-open");
    if (backdrop) backdrop.classList.add("is-open");
    document.body.classList.add("no-scroll");
  }

  function closeMobileSidebar() {
    const sidebar = document.getElementById("portal-sidebar");
    const backdrop = document.getElementById("sidebar-backdrop");
    if (sidebar) sidebar.classList.remove("is-open");
    if (backdrop) backdrop.classList.remove("is-open");
    document.body.classList.remove("no-scroll");
  }

  function initTopbarRoleSwitcher(onRoleChange) {
    const select = document.getElementById("portal-role-select");
    if (!select || !window.BICIS_STORE) return;

    // Make the label plain English across every portal page automatically
    const labelEl = document.querySelector(".role-switcher-label");
    if (labelEl) {
      labelEl.textContent = "Viewing as:";
    }

    const roles = window.BICIS_STORE.ROLES;
    select.innerHTML = Object.keys(roles)
      .map(function (key) {
        return '<option value="' + key + '">' + roles[key].label + "</option>";
      })
      .join("");

    select.value = window.BICIS_STORE.getCurrentRoleKey();

    select.addEventListener("change", function () {
      window.BICIS_STORE.setCurrentRoleKey(select.value);
      if (typeof onRoleChange === "function") {
        onRoleChange(window.BICIS_STORE.getCurrentRole());
      }
      if (window.BICIS && window.BICIS.showToast) {
        window.BICIS.showToast("Now viewing portal as: " + window.BICIS_STORE.getCurrentRole().short);
      }
    });
  }

  function initPortalPage(config) {
    const moduleId = config.moduleId;
    const defaultView = config.defaultView || "dashboard";
    const viewTitles = config.viewTitles || {};
    const onViewChange = config.onViewChange;
    const onRoleChange = config.onRoleChange;

    const mobileTrigger = document.getElementById("sidebar-mobile-trigger");
    const backdrop = document.getElementById("sidebar-backdrop");
    const breadcrumbPage = document.getElementById("portal-breadcrumb-page");

    if (mobileTrigger) mobileTrigger.addEventListener("click", openMobileSidebar);
    if (backdrop) backdrop.addEventListener("click", closeMobileSidebar);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMobileSidebar();
    });

    function resolveView() {
      const hash = (window.location.hash || "").replace(/^#/, "").trim();
      const targetId = hash && document.getElementById("view-" + hash) ? hash : defaultView;

      document.querySelectorAll(".portal-view").forEach(function (v) {
        v.classList.toggle("is-active", v.id === "view-" + targetId);
      });

      if (breadcrumbPage) {
        breadcrumbPage.textContent = viewTitles[targetId] || targetId;
      }

      renderSidebar(moduleId, targetId);

      if (typeof onViewChange === "function") {
        onViewChange(targetId);
      }
    }

    initTopbarRoleSwitcher(function (newRole) {
      const hash = (window.location.hash || "").replace(/^#/, "").trim() || defaultView;
      renderSidebar(moduleId, hash);
      if (typeof onRoleChange === "function") {
        onRoleChange(newRole, hash);
      }
    });

    window.addEventListener("hashchange", resolveView);
    resolveView();

    return {
      refreshSidebar: function () {
        const hash = (window.location.hash || "").replace(/^#/, "").trim() || defaultView;
        renderSidebar(moduleId, hash);
      },
      getActiveView: function () {
        const hash = (window.location.hash || "").replace(/^#/, "").trim();
        return hash && document.getElementById("view-" + hash) ? hash : defaultView;
      }
    };
  }

  function confirmAction(options) {
    const esc = window.BICIS_STORE ? window.BICIS_STORE.escapeHtml : function (s) { return String(s); };
    const existing = document.getElementById("bicis-confirm-dialog");
    if (existing) existing.remove();

    const tone = options.tone === "danger" ? "btn-danger" : "btn-primary";
    const confirmLabel = options.confirmLabel || "Confirm";
    const cancelLabel = options.cancelLabel || "Cancel";

    const backdrop = document.createElement("div");
    backdrop.id = "bicis-confirm-dialog";
    backdrop.className = "confirm-dialog-backdrop";
    backdrop.setAttribute("role", "dialog");
    backdrop.setAttribute("aria-modal", "true");
    backdrop.setAttribute("aria-labelledby", "bicis-confirm-title");

    backdrop.innerHTML =
      '<div class="confirm-dialog-box">' +
      '<div class="confirm-dialog-header"><h2 id="bicis-confirm-title" class="confirm-dialog-title">' + esc(options.title || "Confirm Action") + "</h2></div>" +
      '<div class="confirm-dialog-body">' + esc(options.message || "Are you sure you want to continue?") + "</div>" +
      '<div class="confirm-dialog-footer">' +
      '<button type="button" class="btn btn-secondary btn-sm" id="bicis-confirm-cancel">' + esc(cancelLabel) + "</button>" +
      '<button type="button" class="btn ' + tone + ' btn-sm" id="bicis-confirm-ok">' + esc(confirmLabel) + "</button>" +
      "</div></div>";

    document.body.appendChild(backdrop);
    const cancelBtn = document.getElementById("bicis-confirm-cancel");
    const okBtn = document.getElementById("bicis-confirm-ok");
    cancelBtn.focus();

    function cleanup() {
      document.removeEventListener("keydown", onKey);
      backdrop.remove();
    }

    function onKey(e) {
      if (e.key === "Escape") cleanup();
    }

    document.addEventListener("keydown", onKey);
    backdrop.addEventListener("click", function (e) {
      if (e.target === backdrop) cleanup();
    });
    cancelBtn.addEventListener("click", cleanup);
    okBtn.addEventListener("click", function () {
      cleanup();
      if (typeof options.onConfirm === "function") options.onConfirm();
    });
  }

  function renderPagination(cfg) {
    const el = document.getElementById(cfg.containerId);
    if (!el) return;
    const total = cfg.totalItems || 0;
    const pageSize = cfg.pageSize || 6;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const current = Math.min(Math.max(1, cfg.currentPage || 1), totalPages);

    if (total === 0) {
      el.innerHTML = "";
      el.style.display = "none";
      return;
    }

    el.style.display = "flex";
    const start = (current - 1) * pageSize + 1;
    const end = Math.min(total, current * pageSize);

    let pagesHtml = "";
    for (let p = 1; p <= totalPages; p++) {
      pagesHtml +=
        '<button type="button" class="page-btn' +
        (p === current ? " is-active" : "") +
        '" data-page="' + p + '"' +
        (p === current ? ' aria-current="page"' : "") +
        ">" + p + "</button>";
    }

    el.innerHTML =
      "<span>Showing <strong>" + start + "&ndash;" + end + "</strong> of <strong>" + total + "</strong> record" + (total === 1 ? "" : "s") + "</span>" +
      '<div class="pagination-controls">' +
      '<button type="button" class="page-btn" data-page="' + (current - 1) + '"' + (current <= 1 ? " disabled" : "") + ">Previous</button>" +
      pagesHtml +
      '<button type="button" class="page-btn" data-page="' + (current + 1) + '"' + (current >= totalPages ? " disabled" : "") + ">Next</button>" +
      "</div>";

    el.querySelectorAll("[data-page]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const next = parseInt(btn.getAttribute("data-page"), 10);
        if (!isNaN(next) && next >= 1 && next <= totalPages && next !== current) {
          cfg.onPageChange(next);
        }
      });
    });
  }

  function validateForm(form) {
    if (!form) return true;
    form.querySelectorAll(".field-error-msg").forEach(function (m) { m.remove(); });
    form.querySelectorAll(".is-invalid").forEach(function (el) {
      el.classList.remove("is-invalid");
      el.removeAttribute("aria-invalid");
    });

    let firstInvalid = null;
    const fields = form.querySelectorAll("[required]");
    fields.forEach(function (field) {
      const val = (field.value || "").trim();
      if (!val) {
        field.classList.add("is-invalid");
        field.setAttribute("aria-invalid", "true");
        const label = form.querySelector('label[for="' + field.id + '"]');
        const labelText = label ? label.textContent.replace(/\*/g, "").trim() : "this field";
        const err = document.createElement("span");
        err.className = "field-error-msg";
        err.textContent = "Please complete " + labelText + ".";
        field.insertAdjacentElement("afterend", err);
        if (!firstInvalid) firstInvalid = field;
      }
    });

    if (firstInvalid) {
      firstInvalid.focus();
      if (window.BICIS && window.BICIS.showToast) {
        window.BICIS.showToast("Please complete the required fields.");
      }
      return false;
    }
    return true;
  }

  window.BICIS_PORTAL = {
    initPortalPage: initPortalPage,
    confirmAction: confirmAction,
    renderPagination: renderPagination,
    validateForm: validateForm
  };
})();
