/* ==========================================================================
   BICIS — HANDA+ DRRM Module Controller (All 13 Required Views)
   Connected to Central Resident Registry + Authorized GAD/GABAY Needs
   Strictly enforces Phase 1 Resident Read-Only access on public views
   ========================================================================== */

(function () {
  "use strict";

  const RESIDENT_ALLOWED_VIEWS = ["alerts", "announcements", "centers", "map"];
  const ENCODER_ALLOWED_VIEWS = ["dashboard", "checkin", "distribution", "centers", "alerts", "announcements", "map"];
  let currentDistPage = 1;
  const HANDA_PAGE_SIZE = 6;

  function showBanner(id, type, html) {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = "form-banner form-banner--" + type + " is-visible";
    el.innerHTML = html;
  }

  function buildPlaceholderQrSvg(seedText) {
    // Pure SVG deterministic 9x9 visual pattern (clearly labeled placeholder until QR library is approved)
    let hash = 0;
    for (let i = 0; i < seedText.length; i++) {
      hash = (hash * 31 + seedText.charCodeAt(i)) >>> 0;
    }
    let rects = "";
    // Finder squares (top-left, top-right, bottom-left)
    rects += '<rect x="0" y="0" width="27" height="27" fill="#111"/><rect x="4" y="4" width="19" height="19" fill="#FFF"/><rect x="8" y="8" width="11" height="11" fill="#F15A24"/>';
    rects += '<rect x="63" y="0" width="27" height="27" fill="#111"/><rect x="67" y="4" width="19" height="19" fill="#FFF"/><rect x="71" y="8" width="11" height="11" fill="#111"/>';
    rects += '<rect x="0" y="63" width="27" height="27" fill="#111"/><rect x="4" y="67" width="19" height="19" fill="#FFF"/><rect x="8" y="71" width="11" height="11" fill="#111"/>';

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const inFinder = (r < 3 && c < 3) || (r < 3 && c >= 6) || (r >= 6 && c < 3);
        if (inFinder) continue;
        const bit = ((hash >>> ((r * 9 + c) % 24)) ^ (r * 7 + c * 13)) & 1;
        if (bit) {
          rects += '<rect x="' + c * 10 + '" y="' + r * 10 + '" width="8" height="8" fill="#111"/>';
        }
      }
    }
    return '<svg viewBox="0 0 90 90" width="80" height="80" aria-label="Placeholder QR visual for ' + window.BICIS_STORE.escapeHtml(seedText) + '">' + rects + "</svg>";
  }

  function canAccessView(viewId, role) {
    if (role.permissions.handaFull) return true;
    if (role.permissions.residentOnly) return RESIDENT_ALLOWED_VIEWS.includes(viewId);
    if (role.permissions.handaCheckinRelief) return ENCODER_ALLOWED_VIEWS.includes(viewId);
    // Other non-DRRM staff can still read public DRRM alerts/centers/map
    return RESIDENT_ALLOWED_VIEWS.includes(viewId);
  }

  function renderAll(activeView) {
    const store = window.BICIS_STORE;
    const role = store.getCurrentRole();
    const restricted = document.getElementById("handa-restricted");
    const root = document.getElementById("handa-views-root");

    if (!canAccessView(activeView, role)) {
      restricted.style.display = "flex";
      root.style.display = "none";
      return;
    }

    restricted.style.display = "none";
    root.style.display = "";

    // Toggle publish forms based on role (Read-only for Residents & DRRM Encoders)
    const canPublish = role.permissions.handaPublish;
    const alertPub = document.getElementById("handa-alerts-publish-wrap");
    const annPub = document.getElementById("handa-ann-publish-wrap");
    if (alertPub) alertPub.style.display = canPublish ? "" : "none";
    if (annPub) annPub.style.display = canPublish ? "" : "none";

    populateSelectors();
    renderDashboard();
    renderHazards();
    renderRescueList();
    renderCenters();
    renderCheckin();
    renderInventory();
    renderRules();
    renderDistribution();
    renderEvents();
    renderAlerts();
    renderAnnouncements();
    renderQrCards();
    renderBarangayMap();
  }

  function populateSelectors() {
    const store = window.BICIS_STORE;
    const esc = store.escapeHtml;
    const st = store.state;

    const ciRes = document.getElementById("ci-resident");
    if (ciRes) {
      ciRes.innerHTML = store
        .getAllResidents()
        .filter(function (r) { return r.status === "Active"; })
        .map(function (r) {
          return '<option value="' + esc(r.id) + '">' + esc(r.fullName) + " (" + esc(r.purok) + " · " + esc(r.householdId) + ")</option>";
        })
        .join("");
    }

    const ciCenter = document.getElementById("ci-center");
    if (ciCenter) {
      ciCenter.innerHTML = st.handaCenters
        .map(function (c) {
          return '<option value="' + esc(c.id) + '">' + esc(c.name) + " (" + c.checkedInResidentIds.length + "/" + c.capacity + " · " + esc(c.status) + ")</option>";
        })
        .join("");
    }

    const itemOpts = st.handaInventory
      .map(function (i) {
        return '<option value="' + esc(i.id) + '">' + esc(i.name) + " (Stock: " + i.stock + " " + esc(i.unit) + ")</option>";
      })
      .join("");
    ["h-stock-item", "dist-item"].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.innerHTML = itemOpts;
    });

    const evtSel = document.getElementById("dist-event");
    if (evtSel) {
      evtSel.innerHTML = st.handaEvents
        .map(function (e) {
          return '<option value="' + esc(e.id) + '">' + esc(e.id) + " — " + esc(e.name) + " (" + esc(e.status) + ")</option>";
        })
        .join("");
    }

    const hhSel = document.getElementById("dist-household");
    if (hhSel) {
      hhSel.innerHTML = st.households
        .map(function (h) {
          const head = h.families[0] ? h.families[0].headName : "N/A";
          return '<option value="' + esc(h.id) + '">' + esc(h.id) + " — " + esc(head) + " (" + esc(h.purok) + ")</option>";
        })
        .join("");
    }
  }

  function renderDashboard() {
    const store = window.BICIS_STORE;
    const esc = store.escapeHtml;
    const st = store.state;

    const evacuees = st.handaCenters.reduce(function (s, c) { return s + c.checkedInResidentIds.length; }, 0);
    const openCenters = st.handaCenters.filter(function (c) { return c.status === "Open"; }).length;
    const foodPacks = (st.handaInventory.find(function (i) { return i.id === "DRRM-INV-01"; }) || { stock: 0 }).stock;
    const shortages = st.handaInventory.filter(function (i) { return i.stock <= i.threshold; });
    const priorityList = store.getPriorityRescueHouseholds();

    document.getElementById("handa-alert-banner").innerHTML =
      '<div class="alert-box alert-box--warning"><strong>Current Alert Level:</strong> ' +
      esc(st.handaAlerts.currentLevel) +
      ' <span class="badge badge--warning" style="margin-left:0.5rem;">Updated ' + esc(st.handaAlerts.updatedAt) + "</span></div>";

    document.getElementById("handa-kpi-grid").innerHTML =
      '<div class="kpi-card kpi-card--danger"><span class="kpi-label">Current Evacuees</span><span class="kpi-value">' + evacuees + '</span><span class="kpi-sub">Checked in across shelters</span></div>' +
      '<div class="kpi-card kpi-card--accent"><span class="kpi-label">Open Evacuation Centers</span><span class="kpi-value">' + openCenters + '</span><span class="kpi-sub">of ' + st.handaCenters.length + " sample centers</span></div>" +
      '<div class="kpi-card"><span class="kpi-label">Remaining Relief Packs</span><span class="kpi-value">' + foodPacks + '</span><span class="kpi-sub">Family Food Packs (3-day)</span></div>' +
      '<div class="kpi-card"><span class="kpi-label">Priority Households</span><span class="kpi-value">' + priorityList.length + '</span><span class="kpi-sub">Derived from Registry + GAD + GABAY</span></div>';

    document.getElementById("handa-shortage-box").innerHTML = shortages.length
      ? '<div class="alert-box alert-box--danger"><strong>Inventory Shortage Warning:</strong> ' +
        shortages.map(function (i) { return esc(i.name) + " (" + i.stock + " " + esc(i.unit) + " remaining · threshold " + i.threshold + ")"; }).join(" · ") +
        "</div>"
      : "";

    const reg = store.getRegistryMetrics();
    const gadHigh = st.gadBeneficiaries.filter(function (b) { return b.priority === "High"; }).length;
    const gabayUrg = st.gabayRequests.filter(function (q) { return q.priority === "Urgent" && q.status !== "Rejected"; }).length;
    document.getElementById("handa-needs-summary").innerHTML =
      '<div class="info-list">' +
      '<div class="info-list-row"><span class="info-list-label">Registry Vulnerable</span><span class="info-list-value">' + reg.seniors + " Senior Citizens · " + reg.pwds + " PWDs</span></div>" +
      '<div class="info-list-row"><span class="info-list-label">GAD-CARE Priority</span><span class="info-list-value">' + gadHigh + " high-priority maternal / infant / elderly-woman beneficiaries</span></div>" +
      '<div class="info-list-row"><span class="info-list-label">GABAY Urgent Aid</span><span class="info-list-value">' + gabayUrg + " urgent medical/burial household case(s)</span></div>" +
      "</div>";

    document.getElementById("handa-dash-centers").innerHTML = st.handaCenters
      .map(function (c) {
        return "<tr><td><strong>" + esc(c.name) + '</strong></td><td><span class="badge ' + (c.status === "Open" ? "badge--success" : "badge--warning") + '">' + esc(c.status) + "</span></td><td>" + c.checkedInResidentIds.length + " / " + c.capacity + "</td></tr>";
      })
      .join("");
  }

  function renderHazards() {
    const store = window.BICIS_STORE;
    const esc = store.escapeHtml;
    document.getElementById("handa-hazards-tbody").innerHTML = store.state.handaHazards
      .map(function (hz) {
        const hhCount = store.state.households.filter(function (h) { return h.purok === hz.purok; }).length;
        const badge = hz.riskLevel === "High" ? "badge--danger" : hz.riskLevel === "Medium" ? "badge--warning" : "badge--success";
        return "<tr><td><strong>" + esc(hz.purok) + "</strong></td><td>" + esc(hz.hazardType) + "<div style='font-size:0.74rem;color:var(--text-secondary);'>" + esc(hz.notes) + '</div></td><td><span class="badge ' + badge + '">' + esc(hz.riskLevel) + "</span></td><td>" + hhCount + "</td></tr>";
      })
      .join("");
  }

  function renderRescueList() {
    const store = window.BICIS_STORE;
    const esc = store.escapeHtml;
    const purokF = document.getElementById("rescue-purok-filter").value;
    const tierF = document.getElementById("rescue-tier-filter").value;

    const list = store.getPriorityRescueHouseholds().filter(function (item) {
      if (purokF !== "all" && item.household.purok !== purokF) return false;
      if (tierF !== "all" && item.tier !== tierF) return false;
      return true;
    });

    document.getElementById("handa-rescue-tbody").innerHTML = list.length
      ? list
          .map(function (item) {
            const tierBadge = item.tier === "Critical" ? "badge--danger" : item.tier === "High" ? "badge--accent" : "";
            return (
              "<tr>" +
              '<td><span class="badge ' + tierBadge + '">' + esc(item.tier) + "</span></td>" +
              "<td><strong>" + esc(item.household.id) + "</strong> · " + esc(item.household.purok) + "<div style='font-size:0.74rem;color:var(--text-secondary);'>" + esc(item.household.streetHouseNo) + " (" + item.activeMembers + " active)</div></td>" +
              "<td><strong>" + esc(item.headName) + "</strong><div style='font-size:0.74rem;color:var(--text-secondary);'>" + esc(item.contact) + "</div></td>" +
              '<td><span class="badge ' + (item.hazardLevel === "High" ? "badge--danger" : "badge--warning") + '">' + esc(item.hazardLevel) + "</span></td>" +
              '<td><div class="badge-group">' + item.reasons.map(function (r) { return '<span class="badge">' + esc(r) + "</span>"; }).join("") + "</div></td>" +
              "</tr>"
            );
          })
          .join("")
      : '<tr><td colspan="5" class="empty-state">No priority households match this filter.</td></tr>';
  }

  function renderCenters() {
    const store = window.BICIS_STORE;
    const esc = store.escapeHtml;
    document.getElementById("handa-centers-tbody").innerHTML = store.state.handaCenters
      .map(function (c) {
        const occ = c.checkedInResidentIds.length;
        const pct = Math.round((occ / c.capacity) * 100);
        const badge = c.status === "Open" ? "badge--success" : "badge--warning";
        return "<tr><td><code>" + esc(c.id) + "</code> · <strong>" + esc(c.name) + "</strong></td><td>" + esc(c.address) + "</td><td><strong>" + occ + "</strong> / " + c.capacity + " (" + pct + '%)</td><td><span class="badge ' + badge + '">' + esc(c.status) + "</span></td><td>" + esc(c.contact) + "</td></tr>";
      })
      .join("");
  }

  function renderCheckin() {
    const store = window.BICIS_STORE;
    const esc = store.escapeHtml;
    const rows = [];
    store.state.handaCenters.forEach(function (c) {
      c.checkedInResidentIds.forEach(function (rid) {
        const res = store.getResidentById(rid);
        rows.push({ center: c, residentId: rid, resident: res });
      });
    });

    const tbody = document.getElementById("handa-evacuees-tbody");
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No evacuees currently checked in.</td></tr>';
      return;
    }

    tbody.innerHTML = rows
      .map(function (row) {
        return (
          "<tr>" +
          "<td><strong>" + esc(row.resident ? row.resident.fullName : row.residentId) + "</strong><div style='font-size:0.74rem;color:var(--text-secondary);'>" + esc(row.residentId) + "</div></td>" +
          "<td>" + esc(row.resident ? row.resident.purok : "") + "</td>" +
          "<td>" + esc(row.center.name) + "</td>" +
          '<td><button type="button" class="table-btn table-btn--danger" data-checkout-res="' + esc(row.residentId) + '" data-checkout-center="' + esc(row.center.id) + '">Check Out</button></td>' +
          "</tr>"
        );
      })
      .join("");

    tbody.querySelectorAll("[data-checkout-res]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const rid = btn.getAttribute("data-checkout-res");
        const cid = btn.getAttribute("data-checkout-center");
        const center = store.state.handaCenters.find(function (c) { return c.id === cid; });
        if (!center) return;
        const res = store.getResidentById(rid);
        window.BICIS_PORTAL.confirmAction({
          title: "Check Out Evacuee?",
          message: "Confirm check-out for " + (res ? res.fullName : rid) + " from " + center.name + ". The center headcount will update immediately.",
          confirmLabel: "Confirm Check-Out",
          cancelLabel: "Cancel",
          tone: "danger",
          onConfirm: function () {
            center.checkedInResidentIds = center.checkedInResidentIds.filter(function (id) { return id !== rid; });
            store.logActivity("HANDA+", "Checked out " + rid + " from " + center.name);
            renderAll("checkin");
            window.BICIS.showToast("Evacuee checked out and center headcount updated.");
          }
        });
      });
    });
  }

  function renderInventory() {
    const store = window.BICIS_STORE;
    const esc = store.escapeHtml;
    document.getElementById("handa-inventory-tbody").innerHTML = store.state.handaInventory
      .map(function (i) {
        const low = i.stock <= i.threshold;
        return "<tr><td><code>" + esc(i.id) + "</code></td><td><strong>" + esc(i.name) + "</strong></td><td><strong>" + i.stock + "</strong> " + esc(i.unit) + "</td><td>" + i.threshold + '</td><td><span class="badge ' + (low ? "badge--danger" : "badge--success") + '">' + (low ? "Low Stock" : "Available") + "</span></td></tr>";
      })
      .join("");
  }

  function renderRules() {
    const store = window.BICIS_STORE;
    const esc = store.escapeHtml;
    document.getElementById("handa-rules-tbody").innerHTML = store.state.handaRules
      .map(function (r) {
        const item = store.state.handaInventory.find(function (i) { return i.id === r.itemId; });
        return "<tr><td><code>" + esc(r.id) + "</code></td><td><strong>" + esc(r.targetGroup) + "</strong></td><td>" + esc(item ? item.name : r.itemId) + "</td><td>" + r.qty + "</td><td style='color:var(--text-secondary);'>" + esc(r.notes) + "</td></tr>";
      })
      .join("");
  }

  function renderDistribution() {
    const store = window.BICIS_STORE;
    const esc = store.escapeHtml;
    const list = store.state.handaDistributions;
    const totalPages = Math.max(1, Math.ceil(list.length / HANDA_PAGE_SIZE));
    if (currentDistPage > totalPages) currentDistPage = totalPages;
    const slice = list.slice((currentDistPage - 1) * HANDA_PAGE_SIZE, currentDistPage * HANDA_PAGE_SIZE);

    document.getElementById("handa-dist-tbody").innerHTML = slice.length
      ? slice
          .map(function (d) {
            const item = store.state.handaInventory.find(function (i) { return i.id === d.itemId; });
            return "<tr><td><code>" + esc(d.id) + "</code></td><td><code>" + esc(d.eventId) + "</code></td><td><strong>" + esc(d.householdId) + "</strong></td><td>" + esc(item ? item.name : d.itemId) + " (&times;" + d.qty + ")</td><td>" + esc(d.releasedAt) + "</td></tr>";
          })
          .join("")
      : '<tr><td colspan="5" class="empty-state">No relief claims recorded yet.</td></tr>';

    if (window.BICIS_PORTAL && window.BICIS_PORTAL.renderPagination) {
      window.BICIS_PORTAL.renderPagination({
        containerId: "handa-dist-pagination",
        totalItems: list.length,
        pageSize: HANDA_PAGE_SIZE,
        currentPage: currentDistPage,
        onPageChange: function (p) {
          currentDistPage = p;
          renderDistribution();
        }
      });
    }
  }

  function renderEvents() {
    const store = window.BICIS_STORE;
    const esc = store.escapeHtml;
    document.getElementById("handa-events-tbody").innerHTML = store.state.handaEvents
      .map(function (e) {
        return "<tr><td><code>" + esc(e.id) + "</code></td><td><strong>" + esc(e.name) + "</strong><div style='font-size:0.75rem;color:var(--text-secondary);'>" + esc(e.notes) + "</div></td><td>" + esc(e.type) + '</td><td><span class="badge ' + (e.status === "Active" ? "badge--accent" : "") + '">' + esc(e.status) + "</span></td></tr>";
      })
      .join("");
  }

  function renderAlerts() {
    const store = window.BICIS_STORE;
    const esc = store.escapeHtml;
    const al = store.state.handaAlerts;
    document.getElementById("handa-alerts-list").innerHTML =
      '<div class="alert-box alert-box--warning"><strong>Active Alert Level (Sample):</strong> ' + esc(al.currentLevel) + " · Updated " + esc(al.updatedAt) + "</div>" +
      al.advisories
        .map(function (a) {
          return (
            '<div class="portal-card"><div class="portal-card-header"><h2 class="portal-card-title">' + esc(a.title) + '</h2><span class="badge badge--warning">' + esc(a.level) + " · " + esc(a.date) + '</span></div><div class="portal-card-body"><p style="color:var(--text-secondary);font-size:0.9rem;">' + esc(a.body) + "</p></div></div>"
          );
        })
        .join("");
  }

  function renderAnnouncements() {
    const store = window.BICIS_STORE;
    const esc = store.escapeHtml;
    document.getElementById("handa-ann-list").innerHTML = store.state.handaAnnouncements
      .map(function (n) {
        return (
          '<div class="portal-card"><div class="portal-card-header"><h2 class="portal-card-title">' + esc(n.title) + '</h2><span class="badge">' + esc(n.date) + '</span></div><div class="portal-card-body"><p style="color:var(--text-secondary);font-size:0.9rem;">' + esc(n.body) + '</p><div style="font-size:0.76rem;color:var(--text-secondary);margin-top:0.5rem;">Issued by: ' + esc(n.author) + "</div></div></div>"
        );
      })
      .join("");
  }

  function renderQrCards() {
    const store = window.BICIS_STORE;
    const esc = store.escapeHtml;
    document.getElementById("handa-qr-grid").innerHTML = store.state.households
      .map(function (hh) {
        const head = hh.families[0] ? hh.families[0].headName : "N/A";
        const members = store.getHouseholdMemberCount(hh);
        return (
          '<div class="qr-id-card">' +
          "<div>" +
          '<span class="badge badge--accent" style="margin-bottom:0.4rem;">HANDA+ ID (Sample)</span>' +
          '<div style="font-family:var(--font-serif);font-size:1.15rem;line-height:1.2;">' + esc(head) + "</div>" +
          '<div style="font-family:var(--font-mono);font-size:0.74rem;color:var(--accent);margin-top:0.2rem;">' + esc(hh.id) + "</div>" +
          '<div style="font-size:0.78rem;color:var(--text-secondary);margin-top:0.25rem;">' + esc(hh.purok) + " · " + members + " member(s)<br>Barangay Dimagiba, Legazpi City</div>" +
          "</div>" +
          '<div class="qr-svg-box">' + buildPlaceholderQrSvg(hh.id) + "</div>" +
          "</div>"
        );
      })
      .join("");
  }

  function renderBarangayMap() {
    const store = window.BICIS_STORE;
    const esc = store.escapeHtml;
    const hzByPurok = {};
    store.state.handaHazards.forEach(function (h) { hzByPurok[h.purok] = h; });

    function riskColor(purok) {
      const r = (hzByPurok[purok] || {}).riskLevel;
      if (r === "High") return "var(--error-color)";
      if (r === "Medium") return "var(--accent)";
      return "var(--success-color)";
    }

    document.getElementById("handa-map-container").innerHTML =
      '<div style="display:flex;flex-wrap:wrap;gap:0.65rem;margin-bottom:1rem;">' +
      '<span class="badge badge--danger">High Risk (Sample)</span>' +
      '<span class="badge badge--accent">Medium Risk (Sample)</span>' +
      '<span class="badge badge--success">Low Risk (Sample)</span>' +
      '<span class="badge">Illustrative Schematic · Not Official Survey</span>' +
      "</div>" +
      '<div style="border:1px solid var(--border);background:var(--bg-secondary);overflow:hidden;">' +
      '<svg viewBox="0 0 800 420" width="100%" role="img" aria-label="Illustrative HANDA+ hazard and evacuation map of Barangay Dimagiba">' +
      '<path d="M690 0 C665 110 705 215 675 420 L800 420 L800 0 Z" fill="var(--border)" opacity="0.28"/>' +
      '<text x="745" y="210" text-anchor="middle" transform="rotate(-90 745 210)" fill="var(--text-secondary)" font-size="10" font-family="monospace" letter-spacing="2">TOWARD ALBAY GULF (EAST)</text>' +
      '<rect x="70" y="70" width="170" height="115" fill="var(--bg-elevated)" stroke="' + riskColor("Purok 1") + '" stroke-width="2.2"/>' +
      '<text x="86" y="102" fill="var(--text-primary)" font-size="13" font-weight="700">Purok 1</text><text x="86" y="122" fill="var(--text-secondary)" font-size="10">' + esc((hzByPurok["Purok 1"] || {}).riskLevel) + ' Risk (Sample)</text>' +
      '<rect x="275" y="55" width="185" height="115" fill="var(--bg-elevated)" stroke="' + riskColor("Purok 2") + '" stroke-width="2.2"/>' +
      '<text x="291" y="87" fill="var(--text-primary)" font-size="13" font-weight="700">Purok 2</text><text x="291" y="107" fill="var(--text-secondary)" font-size="10">' + esc((hzByPurok["Purok 2"] || {}).riskLevel) + ' Risk (Sample)</text>' +
      '<rect x="495" y="75" width="165" height="125" fill="var(--bg-elevated)" stroke="' + riskColor("Purok 3") + '" stroke-width="2.4"/>' +
      '<text x="511" y="107" fill="var(--text-primary)" font-size="13" font-weight="700">Purok 3</text><text x="511" y="127" fill="var(--text-secondary)" font-size="10">' + esc((hzByPurok["Purok 3"] || {}).riskLevel) + ' Risk (Sample)</text>' +
      '<rect x="115" y="230" width="210" height="125" fill="var(--bg-elevated)" stroke="' + riskColor("Purok 4") + '" stroke-width="2.2"/>' +
      '<text x="131" y="262" fill="var(--text-primary)" font-size="13" font-weight="700">Purok 4</text><text x="131" y="282" fill="var(--text-secondary)" font-size="10">' + esc((hzByPurok["Purok 4"] || {}).riskLevel) + ' Risk (Sample)</text>' +
      '<rect x="375" y="235" width="250" height="125" fill="var(--bg-elevated)" stroke="' + riskColor("Purok 5") + '" stroke-width="2.4"/>' +
      '<text x="391" y="267" fill="var(--text-primary)" font-size="13" font-weight="700">Purok 5</text><text x="391" y="287" fill="var(--text-secondary)" font-size="10">' + esc((hzByPurok["Purok 5"] || {}).riskLevel) + ' Risk (Sample)</text>' +
      '<circle cx="355" cy="204" r="10" fill="var(--accent)"/><text x="372" y="208" fill="var(--text-primary)" font-size="11" font-weight="700">EVC-01 Covered Court (Open · Sample)</text>' +
      '<circle cx="365" cy="145" r="8" fill="var(--text-primary)"/><text x="379" y="149" fill="var(--text-secondary)" font-size="10">EVC-02 Elem. School (Standby)</text>' +
      '<circle cx="195" cy="204" r="8" fill="var(--accent)"/><text x="72" y="218" fill="var(--text-secondary)" font-size="10">EVC-03 Civic Annex (Open)</text>' +
      "</svg></div>";
  }

  document.addEventListener("DOMContentLoaded", function () {
    const shell = window.BICIS_PORTAL.initPortalPage({
      moduleId: "handa-plus",
      defaultView: "dashboard",
      viewTitles: {
        dashboard: "HANDA+ Dashboard",
        hazards: "Hazard Tagging by Purok",
        "rescue-list": "Priority Rescue List",
        centers: "Evacuation Centers",
        checkin: "Evacuation Check-in & Check-out",
        inventory: "Relief Inventory",
        rules: "Relief Allocation Rules",
        distribution: "Relief Distribution",
        events: "Disaster Events",
        alerts: "Alert Levels & Advisories",
        announcements: "DRRM Announcements",
        "qr-cards": "QR ID Cards",
        map: "Barangay DRRM Map"
      },
      onViewChange: function (viewId) { renderAll(viewId); },
      onRoleChange: function (_, viewId) { renderAll(viewId); }
    });

    document.getElementById("rescue-purok-filter").addEventListener("change", renderRescueList);
    document.getElementById("rescue-tier-filter").addEventListener("change", renderRescueList);

    // Hazard Tagging Form
    document.getElementById("handa-hazard-form").addEventListener("submit", function (e) {
      e.preventDefault();
      const store = window.BICIS_STORE;
      const purok = document.getElementById("hz-purok").value;
      const risk = document.getElementById("hz-risk").value;
      const type = document.getElementById("hz-type").value.trim();
      const notes = document.getElementById("hz-notes").value.trim() || "Updated in session preview";
      const rec = store.state.handaHazards.find(function (h) { return h.purok === purok; });
      if (rec) {
        rec.riskLevel = risk;
        rec.hazardType = type;
        rec.notes = notes;
      }
      store.logActivity("HANDA+", "Updated " + purok + " hazard to " + risk + " (" + type + ")");
      renderAll(shell.getActiveView());
      window.BICIS.showToast(purok + " hazard level updated.");
    });

    // Check-in Form (Updates Live Headcount & Prevents Duplicate Check-in)
    document.getElementById("handa-checkin-form").addEventListener("submit", function (e) {
      e.preventDefault();
      const store = window.BICIS_STORE;
      const resId = document.getElementById("ci-resident").value;
      const centerId = document.getElementById("ci-center").value;
      const center = store.state.handaCenters.find(function (c) { return c.id === centerId; });
      if (!center) return;

      const existingCenter = store.state.handaCenters.find(function (c) {
        return c.checkedInResidentIds.includes(resId);
      });
      if (existingCenter) {
        showBanner("handa-checkin-banner", "error", "<strong>Already Checked In:</strong> Resident <code>" + store.escapeHtml(resId) + "</code> is already checked in at <em>" + store.escapeHtml(existingCenter.name) + "</em>.");
        return;
      }
      if (center.checkedInResidentIds.length >= center.capacity) {
        showBanner("handa-checkin-banner", "error", "<strong>Center at Capacity:</strong> " + store.escapeHtml(center.name) + " has reached its maximum capacity (" + center.capacity + ").");
        return;
      }

      center.checkedInResidentIds.push(resId);
      center.status = "Open";
      store.logActivity("HANDA+", "Checked in " + resId + " at " + center.name);
      showBanner("handa-checkin-banner", "success", "Evacuee checked in successfully. Updated occupancy: <strong>" + center.checkedInResidentIds.length + " / " + center.capacity + "</strong>.");
      renderAll(shell.getActiveView());
    });

    // Relief Stock Adjustment
    document.getElementById("handa-stock-form").addEventListener("submit", function (e) {
      e.preventDefault();
      const store = window.BICIS_STORE;
      const itemId = document.getElementById("h-stock-item").value;
      const type = document.getElementById("h-stock-type").value;
      const qty = parseInt(document.getElementById("h-stock-qty").value, 10) || 0;
      const item = store.state.handaInventory.find(function (i) { return i.id === itemId; });
      if (!item || qty <= 0) return;
      if (type === "out" && item.stock - qty < 0) {
        showBanner("handa-stock-banner", "error", "<strong>Negative Inventory Blocked:</strong> Only " + item.stock + " " + store.escapeHtml(item.unit) + " available.");
        return;
      }
      item.stock = type === "in" ? item.stock + qty : item.stock - qty;
      store.logActivity("HANDA+", "Adjusted relief stock for " + item.name + " to " + item.stock);
      showBanner("handa-stock-banner", "success", "Updated <strong>" + store.escapeHtml(item.name) + "</strong> to " + item.stock + " " + store.escapeHtml(item.unit) + ".");
      renderAll(shell.getActiveView());
    });

    // Relief Distribution Form (Red "Already Received" Duplicate Warning + Auto Deduction)
    document.getElementById("handa-dist-form").addEventListener("submit", function (e) {
      e.preventDefault();
      const store = window.BICIS_STORE;
      const eventId = document.getElementById("dist-event").value;
      const hhId = document.getElementById("dist-household").value;
      const itemId = document.getElementById("dist-item").value;
      const qty = parseInt(document.getElementById("dist-qty").value, 10) || 1;
      const item = store.state.handaInventory.find(function (i) { return i.id === itemId; });
      if (!item) return;

      const duplicate = store.state.handaDistributions.find(function (d) {
        return d.eventId === eventId && d.householdId === hhId && d.itemId === itemId;
      });
      if (duplicate) {
        showBanner(
          "handa-dist-banner",
          "error",
          "<strong>ALREADY RECEIVED — Duplicate Relief Claim Blocked:</strong> Household <code>" +
            store.escapeHtml(hhId) +
            "</code> has already claimed <em>" +
            store.escapeHtml(item.name) +
            "</em> under event <code>" +
            store.escapeHtml(eventId) +
            "</code> (Claim " +
            store.escapeHtml(duplicate.id) +
            " at " +
            store.escapeHtml(duplicate.releasedAt) +
            "). No stock was deducted."
        );
        return;
      }

      if (item.stock < qty) {
        showBanner("handa-dist-banner", "error", "<strong>Insufficient Relief Stock:</strong> Only " + item.stock + " " + store.escapeHtml(item.unit) + " remaining.");
        return;
      }

      item.stock -= qty;
      const relId = store.generateNextId("REL-", store.state.handaDistributions.map(function (d) { return d.id; }));
      const nowStr = new Date().toISOString().slice(0, 16).replace("T", " ");
      store.state.handaDistributions.unshift({
        id: relId,
        eventId: eventId,
        householdId: hhId,
        itemId: itemId,
        qty: qty,
        releasedAt: nowStr,
        officer: store.getCurrentRole().short
      });
      store.logActivity("HANDA+", "Released " + qty + "x " + item.name + " to " + hhId + " (" + eventId + ")");
      let msg = "<strong>Relief Released (" + relId + "):</strong> Automatically deducted " + qty + " " + store.escapeHtml(item.unit) + ". Remaining: <strong>" + item.stock + "</strong>.";
      if (item.stock <= item.threshold) {
        msg += " <span class='badge badge--danger' style='margin-left:0.4rem;'>Low-Stock Warning</span>";
      }
      showBanner("handa-dist-banner", "success", msg);
      renderAll(shell.getActiveView());
    });

    // Disaster Events Form
    document.getElementById("handa-event-form").addEventListener("submit", function (e) {
      e.preventDefault();
      const store = window.BICIS_STORE;
      const name = document.getElementById("evt-name").value.trim();
      if (!name) return;
      const id = store.generateNextId("EVT-2026-", store.state.handaEvents.map(function (ev) { return ev.id; }));
      store.state.handaEvents.unshift({
        id: id,
        name: name,
        type: document.getElementById("evt-type").value,
        status: document.getElementById("evt-status").value,
        startDate: new Date().toISOString().slice(0, 10),
        notes: document.getElementById("evt-notes").value.trim() || "Created in session preview"
      });
      store.logActivity("HANDA+", "Created disaster event " + id + ": " + name);
      e.target.reset();
      renderAll(shell.getActiveView());
      window.BICIS.showToast("Disaster event " + id + " created.");
    });

    // Publish Alert & Advisory
    document.getElementById("handa-alert-form").addEventListener("submit", function (e) {
      e.preventDefault();
      const store = window.BICIS_STORE;
      const level = document.getElementById("alert-level-select").value;
      const title = document.getElementById("alert-title").value.trim();
      const body = document.getElementById("alert-body").value.trim();
      if (!title || !body) return;
      store.state.handaAlerts.currentLevel = level;
      store.state.handaAlerts.updatedAt = new Date().toISOString().slice(0, 16).replace("T", " ");
      store.state.handaAlerts.advisories.unshift({
        id: "ADV-" + String(store.state.handaAlerts.advisories.length + 1).padStart(2, "0"),
        title: title,
        level: level.split("—")[0].trim(),
        date: new Date().toISOString().slice(0, 10),
        body: body
      });
      store.logActivity("HANDA+", "Published advisory: " + title);
      e.target.reset();
      renderAll(shell.getActiveView());
      window.BICIS.showToast("Alert level & advisory published (session).");
    });

    // Publish Announcement
    document.getElementById("handa-ann-form").addEventListener("submit", function (e) {
      e.preventDefault();
      const store = window.BICIS_STORE;
      const title = document.getElementById("ann-title").value.trim();
      const body = document.getElementById("ann-body").value.trim();
      if (!title || !body) return;
      store.state.handaAnnouncements.unshift({
        id: "ANN-" + String(store.state.handaAnnouncements.length + 1).padStart(2, "0"),
        title: title,
        date: new Date().toISOString().slice(0, 10),
        author: store.getCurrentRole().short + " (Sample)",
        body: body
      });
      store.logActivity("HANDA+", "Posted announcement: " + title);
      e.target.reset();
      renderAll(shell.getActiveView());
      window.BICIS.showToast("Announcement published (session).");
    });
  });
})();
