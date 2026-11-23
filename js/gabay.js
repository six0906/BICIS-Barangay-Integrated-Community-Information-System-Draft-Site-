/* ==========================================================================
   BICIS — GABAY Social Welfare Module Controller (All 10 Required Views)
   Connected to Central Resident Registry (BICIS_STORE)
   ========================================================================== */

(function () {
  "use strict";

  let activeReqStatusFilter = "all";
  let currentMgmtPage = 1;
  let currentAidPage = 1;
  const GABAY_PAGE_SIZE = 6;

  function showBanner(id, type, html) {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = "form-banner form-banner--" + type + " is-visible";
    el.innerHTML = html;
  }

  function clearBanner(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = "form-banner";
    el.textContent = "";
  }

  function findDuplicateAid(residentId, programId, period) {
    return window.BICIS_STORE.state.gabayAidRecords.find(function (a) {
      return (
        a.residentId === residentId &&
        a.programId === programId &&
        a.period.toLowerCase() === String(period).trim().toLowerCase()
      );
    });
  }

  function getProgramName(programId) {
    const p = window.BICIS_STORE.state.gabayPrograms.find(function (x) { return x.id === programId; });
    return p ? p.name : programId;
  }

  function sortRequestsQueue(list) {
    return list.slice().sort(function (a, b) {
      const aUrg = a.priority === "Urgent" ? 0 : 1;
      const bUrg = b.priority === "Urgent" ? 0 : 1;
      if (aUrg !== bUrg) return aUrg - bUrg;
      // Older requests first
      return a.createdAt.localeCompare(b.createdAt);
    });
  }

  function renderAll(activeView) {
    const store = window.BICIS_STORE;
    const role = store.getCurrentRole();
    const restricted = document.getElementById("gabay-restricted");
    const root = document.getElementById("gabay-views-root");

    // Allow Profile & Settings view for any role; restrict operational social welfare views
    const isProfileView = activeView === "profile" || window.location.hash === "#profile";
    if (!role.permissions.gabayAccess && !isProfileView) {
      restricted.style.display = "flex";
      root.style.display = "none";
      return;
    }

    restricted.style.display = "none";
    root.style.display = "";

    populateSelects();
    renderDashboard();
    renderPrograms();
    renderBeneficiaries();
    renderAidRecords();
    renderSeniorPwd();
    renderRequestManagement();
    renderCertificate();
    renderReports();
    renderProfile();
  }

  function populateSelects() {
    const store = window.BICIS_STORE;
    const esc = store.escapeHtml;

    const hhOpts = store.state.households
      .map(function (h) {
        const head = h.families[0] ? h.families[0].headName : "N/A";
        return '<option value="' + esc(h.id) + '">' + esc(h.id) + " — " + esc(head) + " (" + esc(h.purok) + ")</option>";
      })
      .join("");
    const enrollHh = document.getElementById("enroll-household");
    if (enrollHh) enrollHh.innerHTML = hhOpts;

    const prgOpts = store.state.gabayPrograms
      .map(function (p) {
        return '<option value="' + esc(p.id) + '">' + esc(p.name) + " (" + esc(p.category) + ")</option>";
      })
      .join("");
    ["enroll-program", "aid-program", "req-program"].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.innerHTML = prgOpts;
    });

    const resOpts = store
      .getAllResidents()
      .filter(function (r) { return r.status === "Active"; })
      .map(function (r) {
        return '<option value="' + esc(r.id) + '">' + esc(r.fullName) + " (" + esc(r.householdId) + " · " + esc(r.purok) + ")</option>";
      })
      .join("");
    ["aid-resident", "req-resident"].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.innerHTML = resOpts;
    });

    const certReqs = store.state.gabayRequests.filter(function (q) {
      return q.status === "Approved" || q.status === "Released";
    });
    const certSel = document.getElementById("cert-request-select");
    if (certSel) {
      const prev = certSel.value;
      certSel.innerHTML = certReqs.length
        ? certReqs
            .map(function (q) {
              const r = store.getResidentById(q.residentId);
              return '<option value="' + esc(q.id) + '">' + esc(q.id) + " — " + esc(r ? r.fullName : q.residentId) + " (" + esc(q.status) + ")</option>";
            })
            .join("")
        : '<option value="">No approved requests available yet</option>';
      if (prev && certReqs.some(function (q) { return q.id === prev; })) {
        certSel.value = prev;
      }
    }
  }

  function renderDashboard() {
    const store = window.BICIS_STORE;
    const esc = store.escapeHtml;
    const st = store.state;

    const pending = st.gabayRequests.filter(function (q) { return q.status === "Pending"; }).length;
    const released = st.gabayAidRecords.length;
    const urgent = st.gabayRequests.filter(function (q) {
      return q.priority === "Urgent" && q.status !== "Released" && q.status !== "Rejected";
    }).length;

    document.getElementById("gabay-kpi-grid").innerHTML =
      '<div class="kpi-card kpi-card--accent"><span class="kpi-label">Enrolled Beneficiaries</span><span class="kpi-value">' + st.gabayEnrollments.length + '</span><span class="kpi-sub">Linked to Resident Registry</span></div>' +
      '<div class="kpi-card"><span class="kpi-label">Pending Requests</span><span class="kpi-value">' + pending + '</span><span class="kpi-sub">Awaiting staff review</span></div>' +
      '<div class="kpi-card"><span class="kpi-label">Released Assistance</span><span class="kpi-value">' + released + '</span><span class="kpi-sub">Verified aid records</span></div>' +
      '<div class="kpi-card kpi-card--danger"><span class="kpi-label">Urgent Medical / Burial</span><span class="kpi-value">' + urgent + '</span><span class="kpi-sub">Prioritized at top of queue</span></div>';

    const sortedQueue = sortRequestsQueue(st.gabayRequests).slice(0, 6);
    document.getElementById("gabay-dash-queue").innerHTML = sortedQueue
      .map(function (q) {
        const r = store.getResidentById(q.residentId);
        return (
          "<tr><td><code>" + esc(q.id) + "</code></td><td><strong>" + esc(r ? r.fullName : q.residentId) + "</strong></td>" +
          '<td><span class="badge ' + (q.priority === "Urgent" ? "badge--danger" : "") + '">' + esc(q.priority) + "</span></td>" +
          '<td><span class="badge">' + esc(q.status) + "</span></td></tr>"
        );
      })
      .join("");

    document.getElementById("gabay-dash-aid").innerHTML = st.gabayAidRecords
      .slice(0, 6)
      .map(function (a) {
        const r = store.getResidentById(a.residentId);
        return "<tr><td><code>" + esc(a.id) + "</code></td><td>" + esc(r ? r.fullName : a.residentId) + "</td><td>" + esc(getProgramName(a.programId)) + "</td><td>" + esc(a.releasedDate) + "</td></tr>";
      })
      .join("");
  }

  function renderPrograms() {
    const store = window.BICIS_STORE;
    const esc = store.escapeHtml;
    document.getElementById("gabay-programs-tbody").innerHTML = store.state.gabayPrograms
      .map(function (p) {
        return "<tr><td><code>" + esc(p.id) + "</code></td><td><strong>" + esc(p.name) + "</strong><div style='font-size:0.76rem;color:var(--text-secondary);'>" + esc(p.description) + "</div></td><td><span class='badge'>" + esc(p.category) + "</span></td><td>" + esc(p.frequency) + "</td></tr>";
      })
      .join("");
  }

  function renderBeneficiaries() {
    const store = window.BICIS_STORE;
    const esc = store.escapeHtml;
    document.getElementById("gabay-enrollments-tbody").innerHTML = store.state.gabayEnrollments
      .map(function (e) {
        const hh = store.getHouseholdById(e.householdId);
        const head = hh && hh.families[0] ? hh.families[0].headName : "Unknown";
        return "<tr><td><code>" + esc(e.id) + "</code></td><td><strong>" + esc(e.householdId) + "</strong> · " + esc(head) + " (" + esc(hh ? hh.purok : "") + ")</td><td>" + esc(getProgramName(e.programId)) + "</td><td>" + esc(e.enrolledDate) + "</td></tr>";
      })
      .join("");
  }

  function renderAidRecords() {
    const store = window.BICIS_STORE;
    const esc = store.escapeHtml;
    const list = store.state.gabayAidRecords;
    const totalPages = Math.max(1, Math.ceil(list.length / GABAY_PAGE_SIZE));
    if (currentAidPage > totalPages) currentAidPage = totalPages;
    const slice = list.slice((currentAidPage - 1) * GABAY_PAGE_SIZE, currentAidPage * GABAY_PAGE_SIZE);

    document.getElementById("gabay-aid-tbody").innerHTML = slice.length
      ? slice
          .map(function (a) {
            const r = store.getResidentById(a.residentId);
            return "<tr><td><code>" + esc(a.id) + "</code></td><td><strong>" + esc(r ? r.fullName : a.residentId) + "</strong></td><td>" + esc(getProgramName(a.programId)) + "</td><td><span class='badge'>" + esc(a.period) + "</span></td><td>" + esc(a.amountOrItem) + "</td><td>" + esc(a.releasedDate) + "</td></tr>";
          })
          .join("")
      : '<tr><td colspan="6" class="empty-state">No aid records have been saved yet.</td></tr>';

    if (window.BICIS_PORTAL && window.BICIS_PORTAL.renderPagination) {
      window.BICIS_PORTAL.renderPagination({
        containerId: "gabay-aid-pagination",
        totalItems: list.length,
        pageSize: GABAY_PAGE_SIZE,
        currentPage: currentAidPage,
        onPageChange: function (p) {
          currentAidPage = p;
          renderAidRecords();
        }
      });
    }
  }

  function renderSeniorPwd() {
    const store = window.BICIS_STORE;
    const esc = store.escapeHtml;
    const q = (document.getElementById("sp-search").value || "").trim().toLowerCase();
    const f = document.getElementById("sp-filter").value;

    const residents = store.getAllResidents().filter(function (r) {
      const isSenior = r.sectors.includes("Senior Citizen") || r.age >= 60;
      const isPwd = r.sectors.includes("PWD");
      if (f === "Senior Citizen" && !isSenior) return false;
      if (f === "PWD" && !isPwd) return false;
      if (f === "all" && !isSenior && !isPwd) return false;
      if (q && !(r.fullName + " " + r.purok + " " + r.id).toLowerCase().includes(q)) return false;
      return true;
    });

    document.getElementById("gabay-sp-tbody").innerHTML = residents.length
      ? residents
          .map(function (r) {
            const aidCount = store.state.gabayAidRecords.filter(function (a) { return a.residentId === r.id; }).length;
            return (
              "<tr><td><code>" + esc(r.id) + "</code></td><td><strong>" + esc(r.fullName) + "</strong></td><td>" + r.age + " / " + esc(r.sex) + "</td><td>" + esc(r.purok) + "</td>" +
              '<td><div class="badge-group">' +
              (r.sectors.includes("Senior Citizen") || r.age >= 60 ? '<span class="badge badge--accent">Senior Citizen</span>' : "") +
              (r.sectors.includes("PWD") ? '<span class="badge badge--warning">PWD</span>' : "") +
              "</div></td><td>" + aidCount + "</td></tr>"
            );
          })
          .join("")
      : '<tr><td colspan="6" class="empty-state">No Senior Citizen or PWD records match your filter.</td></tr>';
  }

  function openRequestDetailModal(reqId) {
    const store = window.BICIS_STORE;
    const esc = store.escapeHtml;
    const req = store.state.gabayRequests.find(function (x) { return x.id === reqId; });
    if (!req) return;
    const r = store.getResidentById(req.residentId);
    const dup = findDuplicateAid(req.residentId, req.programId, req.period);

    const titleEl = document.getElementById("gabay-req-modal-title");
    const bodyEl = document.getElementById("gabay-req-modal-body");
    if (titleEl) titleEl.textContent = "Assistance Request " + req.id;
    if (bodyEl) {
      bodyEl.innerHTML =
        '<div class="info-list">' +
        '<div class="info-list-row"><span class="info-list-label">Resident Name</span><span><strong>' + esc(r ? r.fullName : req.residentId) + "</strong> (" + esc(req.residentId) + ")</span></div>" +
        '<div class="info-list-row"><span class="info-list-label">Household &amp; Address</span><span>' + esc(r ? r.householdId + " · " + r.purok : req.householdId) + "</span></div>" +
        '<div class="info-list-row"><span class="info-list-label">Program &amp; Period</span><span>' + esc(getProgramName(req.programId)) + " · " + esc(req.period) + "</span></div>" +
        '<div class="info-list-row"><span class="info-list-label">Request Type &amp; Priority</span><span>' + esc(req.requestType) + ' · <span class="badge ' + (req.priority === "Urgent" ? "badge--danger" : "") + '">' + esc(req.priority) + "</span></span></div>" +
        '<div class="info-list-row"><span class="info-list-label">Current Status</span><span><span class="badge">' + esc(req.status) + "</span></span></div>" +
        '<div class="info-list-row"><span class="info-list-label">Date Filed</span><span>' + esc(req.createdAt) + "</span></div>" +
        "</div>" +
        '<div style="margin-top:1rem;"><div style="font-weight:700;font-size:0.9rem;margin-bottom:0.35rem;">Submitted Details &amp; Justification</div>' +
        '<p style="color:var(--portal-text-muted);font-size:0.94rem;">' + esc(req.details) + "</p></div>" +
        (dup
          ? '<div class="alert-box alert-box--danger" style="margin-top:1rem;"><strong>Duplicate Check Notice:</strong> This resident already received <em>' + esc(getProgramName(req.programId)) + "</em> for period <strong>" + esc(req.period) + "</strong> (Record <code>" + esc(dup.id) + "</code>, released " + esc(dup.releasedDate) + ").</div>"
          : '<div class="alert-box alert-box--success" style="margin-top:1rem;"><strong>Duplicate Check Clear:</strong> No previous release found for this program and period.</div>');
    }

    const modal = document.getElementById("gabay-request-detail-modal");
    if (modal && window.BICIS && window.BICIS.openModal) {
      window.BICIS.openModal(modal);
    } else if (modal) {
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
    }
  }

  function renderRequestManagement() {
    const store = window.BICIS_STORE;
    const esc = store.escapeHtml;

    let list = sortRequestsQueue(store.state.gabayRequests);
    if (activeReqStatusFilter !== "all") {
      list = list.filter(function (q) { return q.status === activeReqStatusFilter; });
    }

    const tbody = document.getElementById("gabay-mgmt-tbody");
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No assistance requests in this status tab.</td></tr>';
      if (window.BICIS_PORTAL && window.BICIS_PORTAL.renderPagination) {
        window.BICIS_PORTAL.renderPagination({ containerId: "gabay-mgmt-pagination", totalItems: 0, pageSize: GABAY_PAGE_SIZE, currentPage: 1, onPageChange: function () {} });
      }
      return;
    }

    const totalPages = Math.max(1, Math.ceil(list.length / GABAY_PAGE_SIZE));
    if (currentMgmtPage > totalPages) currentMgmtPage = totalPages;
    const pagedList = list.slice((currentMgmtPage - 1) * GABAY_PAGE_SIZE, currentMgmtPage * GABAY_PAGE_SIZE);

    tbody.innerHTML = pagedList
      .map(function (q) {
        const r = store.getResidentById(q.residentId);
        const statusClass =
          q.status === "Approved"
            ? "badge--accent"
            : q.status === "Released"
            ? "badge--success"
            : q.status === "Rejected"
            ? "badge--danger"
            : "badge--warning";

        let actionBtns = '<button type="button" class="table-btn" data-req-view="' + esc(q.id) + '">View Request</button>';
        if (q.status === "Pending") {
          actionBtns +=
            '<button type="button" class="table-btn table-btn--primary" data-req-approve="' + esc(q.id) + '">Approve</button>' +
            '<button type="button" class="table-btn table-btn--danger" data-req-reject="' + esc(q.id) + '">Reject</button>';
        } else if (q.status === "Approved") {
          actionBtns +=
            '<button type="button" class="table-btn table-btn--primary" data-req-release="' + esc(q.id) + '">Release Assistance</button>' +
            '<a href="#indigency" class="table-btn" data-req-cert="' + esc(q.id) + '">Print Certificate</a>';
        } else if (q.status === "Released") {
          actionBtns += '<a href="#indigency" class="table-btn" data-req-cert="' + esc(q.id) + '">Print Certificate</a>';
        }

        return (
          "<tr>" +
          "<td><code>" + esc(q.id) + "</code><div style='font-size:0.82rem;color:var(--portal-text-muted);'>" + esc(q.requestType) + "</div></td>" +
          "<td><strong>" + esc(r ? r.fullName : q.residentId) + "</strong><div style='font-size:0.82rem;color:var(--portal-text-muted);'>Filed: " + esc(q.createdAt) + "</div></td>" +
          "<td>" + esc(getProgramName(q.programId)) + "<div style='font-size:0.82rem;color:var(--portal-text-muted);'>Period: " + esc(q.period) + "</div></td>" +
          '<td><span class="badge ' + (q.priority === "Urgent" ? "badge--danger" : "") + '">' + esc(q.priority) + "</span></td>" +
          '<td><span class="badge ' + statusClass + '">' + esc(q.status) + "</span></td>" +
          '<td><div class="table-actions">' + actionBtns + "</div></td>" +
          "</tr>"
        );
      })
      .join("");

    tbody.querySelectorAll("[data-req-view]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openRequestDetailModal(btn.getAttribute("data-req-view"));
      });
    });

    tbody.querySelectorAll("[data-req-approve]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const req = store.state.gabayRequests.find(function (x) { return x.id === btn.getAttribute("data-req-approve"); });
        if (req) {
          req.status = "Approved";
          store.logActivity("GABAY", "Approved request " + req.id);
          clearBanner("gabay-mgmt-banner");
          renderAll();
          window.BICIS.showToast("Request " + req.id + " has been approved.");
        }
      });
    });

    tbody.querySelectorAll("[data-req-reject]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const req = store.state.gabayRequests.find(function (x) { return x.id === btn.getAttribute("data-req-reject"); });
        if (!req) return;
        const r = store.getResidentById(req.residentId);
        window.BICIS_PORTAL.confirmAction({
          title: "Reject Assistance Request?",
          message: "Are you sure you want to reject request " + req.id + " for " + (r ? r.fullName : req.residentId) + "? This will close the request without releasing aid.",
          confirmLabel: "Reject Request",
          cancelLabel: "Cancel",
          tone: "danger",
          onConfirm: function () {
            req.status = "Rejected";
            store.logActivity("GABAY", "Rejected request " + req.id);
            clearBanner("gabay-mgmt-banner");
            renderAll();
            window.BICIS.showToast("Request " + req.id + " has been rejected.");
          }
        });
      });
    });

    if (window.BICIS_PORTAL && window.BICIS_PORTAL.renderPagination) {
      window.BICIS_PORTAL.renderPagination({
        containerId: "gabay-mgmt-pagination",
        totalItems: list.length,
        pageSize: GABAY_PAGE_SIZE,
        currentPage: currentMgmtPage,
        onPageChange: function (p) {
          currentMgmtPage = p;
          renderRequestManagement();
        }
      });
    }

    tbody.querySelectorAll("[data-req-release]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const req = store.state.gabayRequests.find(function (x) { return x.id === btn.getAttribute("data-req-release"); });
        if (!req || req.status !== "Approved") return;

        // Mandatory duplicate check before release
        const dup = findDuplicateAid(req.residentId, req.programId, req.period);
        if (dup) {
          const r = store.getResidentById(req.residentId);
          showBanner(
            "gabay-mgmt-banner",
            "error",
            "<strong>Duplicate Assistance Detected — Release Blocked:</strong> " +
              esc(r ? r.fullName : req.residentId) +
              " already received <em>" +
              esc(getProgramName(req.programId)) +
              "</em> for period <strong>" +
              esc(req.period) +
              "</strong>.<br><strong>Previous Record:</strong> <code>" +
              esc(dup.id) +
              "</code> · " +
              esc(dup.amountOrItem) +
              " released on <strong>" +
              esc(dup.releasedDate) +
              "</strong> (" +
              esc(dup.remarks) +
              ")."
          );
          return;
        }

        const aidId = store.generateNextId("AID-2026-", store.state.gabayAidRecords.map(function (a) { return a.id; }));
        store.state.gabayAidRecords.unshift({
          id: aidId,
          residentId: req.residentId,
          householdId: req.householdId,
          programId: req.programId,
          period: req.period,
          amountOrItem: "Approved Program Aid (Sample)",
          releasedDate: new Date().toISOString().slice(0, 10),
          remarks: "Released via Request " + req.id
        });
        req.status = "Released";
        store.logActivity("GABAY", "Released aid " + aidId + " for request " + req.id);
        showBanner("gabay-mgmt-banner", "success", "<strong>Assistance Released:</strong> Saved Aid Record <code>" + aidId + "</code> and updated request <code>" + esc(req.id) + "</code> to Released.");
        renderAll();
      });
    });

    tbody.querySelectorAll("[data-req-cert]").forEach(function (link) {
      link.addEventListener("click", function () {
        const certSel = document.getElementById("cert-request-select");
        if (certSel) {
          certSel.value = link.getAttribute("data-req-cert");
          renderCertificate();
        }
      });
    });
  }

  function renderCertificate() {
    const store = window.BICIS_STORE;
    const esc = store.escapeHtml;
    const area = document.getElementById("certificate-preview-area");
    const reqId = document.getElementById("cert-request-select").value;
    const purpose = document.getElementById("cert-purpose-input").value.trim() || "Social Welfare Assistance";

    const req = store.state.gabayRequests.find(function (q) { return q.id === reqId; });
    if (!req) {
      area.innerHTML = '<div class="empty-state">Approve an assistance request in Request Management first to generate a Certificate of Indigency.</div>';
      return;
    }

    const res = store.getResidentById(req.residentId);
    const todayFormatted = new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });

    area.innerHTML =
      '<div class="certificate-paper"><div class="certificate-paper-inner">' +
      '<div style="text-align:center;border-bottom:2px solid #111;padding-bottom:1rem;margin-bottom:1.75rem;">' +
      '<div style="font-size:0.85rem;letter-spacing:0.08em;text-transform:uppercase;">Republic of the Philippines · Province of Albay · City of Legazpi</div>' +
      '<div style="font-size:1.35rem;font-weight:700;margin-top:0.25rem;">OFFICE OF THE PUNONG BARANGAY — BARANGAY DIMAGIBA</div>' +
      '<div style="font-size:0.78rem;color:#555;margin-top:0.2rem;">Generated via BICIS — GABAY Social Welfare Module (Sample Printable Template)</div>' +
      "</div>" +
      '<h2 style="text-align:center;font-size:1.8rem;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:1.75rem;">Certificate of Indigency</h2>' +
      '<p style="margin-bottom:1.1rem;font-size:1.05rem;"><strong>TO WHOM IT MAY CONCERN:</strong></p>' +
      '<p style="text-indent:2.2rem;margin-bottom:1.1rem;line-height:1.85;font-size:1.02rem;">This is to certify that <strong>' +
      esc(res ? res.fullName : req.residentId) +
      "</strong>, of legal age (" +
      (res ? res.age : "N/A") +
      " years old), " +
      esc(res ? res.civilStatus : "") +
      ", and a bonafide resident of <strong>" +
      esc(res ? res.address : "Barangay Dimagiba, Legazpi City, Albay") +
      "</strong> (Registry ID: " +
      esc(req.residentId) +
      " / Household: " +
      esc(req.householdId) +
      "), belongs to an indigent family in this barangay based on verified GABAY Social Welfare records.</p>" +
      '<p style="text-indent:2.2rem;margin-bottom:1.3rem;line-height:1.85;font-size:1.02rem;">This certification is issued upon the request of the above-named resident pursuant to approved request <strong>' +
      esc(req.id) +
      "</strong> (" +
      esc(getProgramName(req.programId)) +
      ") for <strong>" +
      esc(purpose) +
      "</strong>.</p>" +
      '<p style="margin-bottom:2.5rem;font-size:0.98rem;">Issued this <strong>' +
      esc(todayFormatted) +
      "</strong> at Barangay Dimagiba, Legazpi City, Albay, Philippines.</p>" +
      '<div style="display:flex;justify-content:flex-end;margin-top:2.5rem;">' +
      '<div style="text-align:center;min-width:240px;">' +
      '<div style="border-top:1px solid #111;padding-top:0.4rem;font-weight:700;">PUNONG BARANGAY / AUTHORIZED SIGNATORY</div>' +
      '<div style="font-size:0.8rem;color:#555;">Barangay Dimagiba, Legazpi City, Albay</div>' +
      "</div></div></div></div>";
  }

  function renderReports() {
    const store = window.BICIS_STORE;
    const esc = store.escapeHtml;
    const st = store.state;
    document.getElementById("gabay-reports-body").innerHTML =
      '<div class="portal-card"><div class="portal-card-header"><h2 class="portal-card-title">GABAY Social Welfare Summary (Sample)</h2><span class="badge badge--accent">Printable</span></div><div class="portal-card-body">' +
      "<p style='font-size:0.88rem;color:var(--text-secondary);margin-bottom:1rem;'>Active Programs: <strong>" + st.gabayPrograms.length + "</strong> · Enrolled Households: <strong>" + st.gabayEnrollments.length + "</strong> · Total Requests: <strong>" + st.gabayRequests.length + "</strong> · Released Aid Records: <strong>" + st.gabayAidRecords.length + "</strong></p>" +
      '<div class="table-wrap"><table class="data-table"><thead><tr><th>Program</th><th>Enrolled Households</th><th>Aid Releases</th></tr></thead><tbody>' +
      st.gabayPrograms
        .map(function (p) {
          const enr = st.gabayEnrollments.filter(function (e) { return e.programId === p.id; }).length;
          const rel = st.gabayAidRecords.filter(function (a) { return a.programId === p.id; }).length;
          return "<tr><td><strong>" + esc(p.name) + "</strong></td><td>" + enr + "</td><td>" + rel + "</td></tr>";
        })
        .join("") +
      "</tbody></table></div></div></div>";
  }

  function renderProfile() {
    const store = window.BICIS_STORE;
    const role = store.getCurrentRole();
    const esc = store.escapeHtml;
    document.getElementById("gabay-profile-body").innerHTML =
      '<div class="info-list">' +
      '<div class="info-list-row"><span class="info-list-label">Active Preview Role</span><span class="info-list-value"><strong>' + esc(role.label) + "</strong></span></div>" +
      '<div class="info-list-row"><span class="info-list-label">Barangay</span><span class="info-list-value">Barangay Dimagiba, Legazpi City, Albay, Philippines</span></div>' +
      '<div class="info-list-row"><span class="info-list-label">Theme Preference</span><span class="info-list-value">Use the sun/moon button in the top bar (saved in <code>localStorage</code>)</span></div>' +
      '<div class="info-list-row"><span class="info-list-label">Authentication Note</span><span class="info-list-value">Production user accounts, password hashing, and role enforcement must be implemented on the PHP/MySQL backend.</span></div>' +
      "</div>" +
      '<div style="margin-top:1.25rem;display:flex;gap:0.75rem;flex-wrap:wrap;">' +
      '<a href="privacy.html" class="btn btn-secondary btn-sm">Privacy Terms &amp; Agreement</a>' +
      '<a href="login.html" class="btn btn-primary btn-sm">Go to Login Screen</a>' +
      "</div>";
  }

  document.addEventListener("DOMContentLoaded", function () {
    const shell = window.BICIS_PORTAL.initPortalPage({
      moduleId: "gabay",
      defaultView: "dashboard",
      viewTitles: {
        dashboard: "GABAY Dashboard",
        programs: "Assistance Programs",
        beneficiaries: "Program Beneficiaries",
        "aid-records": "Aid Records",
        "senior-pwd": "Senior & PWD Monitoring",
        requests: "New Assistance Request",
        "request-management": "Request Management",
        indigency: "Certificate of Indigency",
        reports: "Reports & Records",
        profile: "Profile & Settings"
      },
      onViewChange: function (viewId) { renderAll(viewId); },
      onRoleChange: function (_, viewId) { renderAll(viewId); }
    });

    // Status tabs for Request Management
    document.querySelectorAll("[data-req-status]").forEach(function (tab) {
      tab.addEventListener("click", function () {
        activeReqStatusFilter = tab.getAttribute("data-req-status");
        document.querySelectorAll("[data-req-status]").forEach(function (t) {
          t.classList.toggle("is-active", t === tab);
        });
        renderRequestManagement();
      });
    });

    document.getElementById("sp-search").addEventListener("input", renderSeniorPwd);
    document.getElementById("sp-filter").addEventListener("change", renderSeniorPwd);
    document.getElementById("cert-request-select").addEventListener("change", renderCertificate);
    document.getElementById("cert-purpose-input").addEventListener("input", renderCertificate);

    // Add Program Form
    document.getElementById("gabay-program-form").addEventListener("submit", function (e) {
      e.preventDefault();
      const store = window.BICIS_STORE;
      const name = document.getElementById("prg-name").value.trim();
      const cat = document.getElementById("prg-category").value;
      const freq = document.getElementById("prg-freq").value;
      const desc = document.getElementById("prg-desc").value.trim();
      if (!name || !desc) return;
      const id = "PRG-" + String(store.state.gabayPrograms.length + 1).padStart(3, "0");
      store.state.gabayPrograms.push({ id: id, name: name, category: cat, frequency: freq, active: true, description: desc });
      store.logActivity("GABAY", "Added assistance program: " + name);
      e.target.reset();
      renderAll(shell.getActiveView());
      window.BICIS.showToast("Program '" + name + "' added.");
    });

    // Enroll Household Form (No Duplicate Enrollment in Same Program)
    document.getElementById("gabay-enroll-form").addEventListener("submit", function (e) {
      e.preventDefault();
      const store = window.BICIS_STORE;
      const hhId = document.getElementById("enroll-household").value;
      const prgId = document.getElementById("enroll-program").value;

      const exists = store.state.gabayEnrollments.find(function (en) {
        return en.householdId === hhId && en.programId === prgId;
      });
      if (exists) {
        showBanner(
          "gabay-enroll-banner",
          "error",
          "<strong>Duplicate Enrollment Blocked:</strong> Household <code>" +
            store.escapeHtml(hhId) +
            "</code> is already enrolled in <em>" +
            store.escapeHtml(getProgramName(prgId)) +
            "</em> (Enrollment " +
            store.escapeHtml(exists.id) +
            ")."
        );
        return;
      }

      const id = store.generateNextId("ENR-", store.state.gabayEnrollments.map(function (x) { return x.id; }));
      store.state.gabayEnrollments.unshift({
        id: id,
        householdId: hhId,
        programId: prgId,
        enrolledDate: new Date().toISOString().slice(0, 10),
        status: "Active"
      });
      store.logActivity("GABAY", "Enrolled household " + hhId + " into " + getProgramName(prgId));
      showBanner("gabay-enroll-banner", "success", "Household <code>" + store.escapeHtml(hhId) + "</code> enrolled successfully (" + id + ").");
      renderAll(shell.getActiveView());
    });

    // Record Aid Form (Duplicate Checking)
    document.getElementById("gabay-aid-form").addEventListener("submit", function (e) {
      e.preventDefault();
      const store = window.BICIS_STORE;
      const resId = document.getElementById("aid-resident").value;
      const prgId = document.getElementById("aid-program").value;
      const period = document.getElementById("aid-period").value.trim();
      const amount = document.getElementById("aid-amount").value.trim();
      const remarks = document.getElementById("aid-remarks").value.trim() || "Direct release";
      if (!period || !amount) return;

      const dup = findDuplicateAid(resId, prgId, period);
      if (dup) {
        showBanner(
          "gabay-aid-banner",
          "error",
          "<strong>Duplicate Assistance Blocked:</strong> Previous aid record <code>" +
            store.escapeHtml(dup.id) +
            "</code> already exists for this resident under <em>" +
            store.escapeHtml(getProgramName(prgId)) +
            "</em> (" +
            store.escapeHtml(period) +
            ", released " +
            store.escapeHtml(dup.releasedDate) +
            ")."
        );
        return;
      }

      const res = store.getResidentById(resId);
      const id = store.generateNextId("AID-2026-", store.state.gabayAidRecords.map(function (a) { return a.id; }));
      store.state.gabayAidRecords.unshift({
        id: id,
        residentId: resId,
        householdId: res ? res.householdId : "",
        programId: prgId,
        period: period,
        amountOrItem: amount,
        releasedDate: new Date().toISOString().slice(0, 10),
        remarks: remarks
      });
      store.logActivity("GABAY", "Recorded aid " + id + " for " + resId);
      showBanner("gabay-aid-banner", "success", "Aid record <code>" + id + "</code> saved in session preview.");
      document.getElementById("aid-amount").value = "";
      document.getElementById("aid-remarks").value = "";
      renderAll(shell.getActiveView());
    });

    // New Assistance Request Form (Medical & Burial Auto-Urgent)
    document.getElementById("gabay-request-form").addEventListener("submit", function (e) {
      e.preventDefault();
      if (window.BICIS_PORTAL && !window.BICIS_PORTAL.validateForm(e.target)) return;
      const store = window.BICIS_STORE;
      const resId = document.getElementById("req-resident").value;
      const reqType = document.getElementById("req-type").value;
      const prgId = document.getElementById("req-program").value;
      const period = document.getElementById("req-period").value.trim();
      const details = document.getElementById("req-details").value.trim();
      if (!details) return;

      const res = store.getResidentById(resId);
      const autoPriority = reqType === "Medical" || reqType === "Burial" ? "Urgent" : "Standard";
      const id = store.generateNextId("REQ-2026-", store.state.gabayRequests.map(function (q) { return q.id; }));

      store.state.gabayRequests.push({
        id: id,
        residentId: resId,
        householdId: res ? res.householdId : "",
        programId: prgId,
        requestType: reqType,
        priority: autoPriority,
        period: period,
        status: "Pending",
        createdAt: new Date().toISOString().slice(0, 10),
        details: details
      });
      store.logActivity("GABAY", "Queued " + autoPriority + " request " + id + " (" + reqType + ")");
      showBanner(
        "gabay-req-banner",
        "success",
        "Request <code>" + id + "</code> queued as <strong>Pending</strong> with priority <strong>" + autoPriority + "</strong>."
      );
      document.getElementById("req-details").value = "";
      renderAll(shell.getActiveView());
    });
  });
})();
