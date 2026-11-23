/* ==========================================================================
   BICIS — GAD-CARE Module Controller (All 8 Required Views)
   Connected to Central Resident Registry (BICIS_STORE)
   ========================================================================== */

(function () {
  "use strict";

  function isExpiringSoon(dateStr) {
    if (!dateStr) return false;
    const exp = new Date(dateStr + "T00:00:00");
    const today = new Date();
    const diffDays = (exp - today) / (1000 * 60 * 60 * 24);
    return diffDays <= 45;
  }

  function showInlineBanner(id, type, html) {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = "form-banner form-banner--" + type + " is-visible";
    el.innerHTML = html;
  }

  function renderAll() {
    const store = window.BICIS_STORE;
    const role = store.getCurrentRole();
    const restricted = document.getElementById("gad-restricted");
    const root = document.getElementById("gad-views-root");

    if (!role.permissions.gadAccess) {
      restricted.style.display = "flex";
      root.style.display = "none";
      return;
    }

    restricted.style.display = "none";
    root.style.display = "";

    renderDashboard();
    populateSelectors();
    renderBeneficiaries();
    renderAssessments();
    renderInventory();
    renderRules();
    renderLogs();
    renderReports();
  }

  function renderDashboard() {
    const store = window.BICIS_STORE;
    const esc = store.escapeHtml;
    const st = store.state;

    const taggedCount = st.gadBeneficiaries.length;
    const servedCount = st.gadBeneficiaries.filter(function (b) { return b.served; }).length;
    const releasedKits = st.gadDistributions.reduce(function (s, d) { return s + d.qty; }, 0);
    const pendingAssess = st.gadAssessments.filter(function (a) { return a.status === "Pending"; }).length;
    const urgentAssess = st.gadAssessments.filter(function (a) { return a.status === "Pending" && a.urgency === "Urgent"; }).length;
    const lowStock = st.gadInventory.filter(function (i) { return i.stock <= i.threshold; });
    const expiring = st.gadInventory.filter(function (i) { return isExpiringSoon(i.expiryDate); });

    document.getElementById("gad-kpi-grid").innerHTML =
      '<div class="kpi-card kpi-card--accent"><span class="kpi-label">Tagged Beneficiaries</span><span class="kpi-value">' + taggedCount + '</span><span class="kpi-sub">' + servedCount + " served · " + (taggedCount - servedCount) + " unserved</span></div>" +
      '<div class="kpi-card"><span class="kpi-label">Kits Released</span><span class="kpi-value">' + releasedKits + '</span><span class="kpi-sub">' + st.gadDistributions.length + " distribution log(s)</span></div>" +
      '<div class="kpi-card"><span class="kpi-label">Pending Assessments</span><span class="kpi-value">' + pendingAssess + '</span><span class="kpi-sub">' + urgentAssess + " urgent case(s)</span></div>" +
      '<div class="kpi-card kpi-card--danger"><span class="kpi-label">Low-Stock Items</span><span class="kpi-value">' + lowStock.length + '</span><span class="kpi-sub">' + expiring.length + " expiring within 45 days</span></div>";

    let alertsHtml = "";
    if (lowStock.length) {
      alertsHtml +=
        '<div class="alert-box alert-box--danger"><strong>Low-Stock Alert:</strong> ' +
        lowStock.map(function (i) { return esc(i.name) + " (" + i.stock + " " + esc(i.unit) + " left)"; }).join(" · ") +
        "</div>";
    }
    if (expiring.length) {
      alertsHtml +=
        '<div class="alert-box alert-box--warning"><strong>Expiring Supply Alert (within 45 days):</strong> ' +
        expiring.map(function (i) { return esc(i.name) + " (exp. " + esc(i.expiryDate) + ")"; }).join(" · ") +
        "</div>";
    }
    document.getElementById("gad-alerts-box").innerHTML = alertsHtml;

    document.getElementById("gad-dash-assessments").innerHTML = st.gadAssessments
      .map(function (a) {
        const res = store.getResidentById(a.residentId);
        return (
          "<tr><td><strong>" + esc(res ? res.fullName : a.residentId) + "</strong></td><td>" + esc(a.needCategory) + "</td>" +
          '<td><span class="badge ' + (a.urgency === "Urgent" ? "badge--danger" : "") + '">' + esc(a.urgency) + "</span></td>" +
          '<td><span class="badge ' + (a.status === "Completed" ? "badge--success" : "badge--warning") + '">' + esc(a.status) + "</span></td></tr>"
        );
      })
      .join("");

    document.getElementById("gad-dash-releases").innerHTML = st.gadDistributions
      .slice(0, 6)
      .map(function (d) {
        const res = store.getResidentById(d.residentId);
        const item = st.gadInventory.find(function (i) { return i.id === d.itemId; });
        return (
          "<tr><td>" + esc(res ? res.fullName : d.residentId) + "</td><td>" + esc(item ? item.name : d.itemId) + "</td><td>" + d.qty + "</td><td>" + esc(d.date) + "</td></tr>"
        );
      })
      .join("");
  }

  function populateSelectors() {
    const store = window.BICIS_STORE;
    const esc = store.escapeHtml;
    const activeResidents = store.getAllResidents().filter(function (r) { return r.status === "Active"; });

    const tagSel = document.getElementById("gad-tag-resident");
    if (tagSel) {
      const prev = tagSel.value;
      tagSel.innerHTML = activeResidents
        .map(function (r) {
          return '<option value="' + esc(r.id) + '">' + esc(r.fullName) + " (" + esc(r.id) + " · " + esc(r.purok) + " · " + esc(r.sex) + ", " + r.age + ")</option>";
        })
        .join("");
      if (prev) tagSel.value = prev;
      updateResidentTagPreview();
    }

    const benOpts = store.state.gadBeneficiaries
      .map(function (b) {
        const r = store.getResidentById(b.residentId);
        return '<option value="' + esc(b.residentId) + '">' + esc(r ? r.fullName : b.residentId) + " — " + esc(b.sector) + " (" + esc(b.priority) + ")</option>";
      })
      .join("");

    ["gad-assess-resident", "gad-rel-resident"].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.innerHTML = benOpts;
    });

    const itemOpts = store.state.gadInventory
      .map(function (i) {
        return '<option value="' + esc(i.id) + '">' + esc(i.name) + " (Stock: " + i.stock + " " + esc(i.unit) + ")</option>";
      })
      .join("");

    ["gad-stock-item", "gad-rel-item"].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.innerHTML = itemOpts;
    });
  }

  function updateResidentTagPreview() {
    const store = window.BICIS_STORE;
    const esc = store.escapeHtml;
    const id = document.getElementById("gad-tag-resident").value;
    const res = store.getResidentById(id);
    const box = document.getElementById("gad-tag-preview");
    if (!res || !box) return;
    box.innerHTML =
      "<strong>Retrieved from Resident Registry:</strong> " +
      esc(res.fullName) + " · " + esc(res.sex) + ", Age " + res.age + " · " + esc(res.purok) + " (" + esc(res.householdId) + ")" +
      "<br><span style='color:var(--text-secondary);'>Registry Sectors: " + (res.sectors.length ? esc(res.sectors.join(", ")) : "None") + "</span>";
  }

  function renderBeneficiaries() {
    const store = window.BICIS_STORE;
    const esc = store.escapeHtml;
    const filter = document.getElementById("gad-beneficiary-filter").value;

    const list = store.state.gadBeneficiaries.filter(function (b) {
      if (filter === "served") return b.served;
      if (filter === "unserved") return !b.served;
      return true;
    });

    const tbody = document.getElementById("gad-beneficiaries-tbody");
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No beneficiaries match this filter.</td></tr>';
      return;
    }

    tbody.innerHTML = list
      .map(function (b) {
        const r = store.getResidentById(b.residentId);
        return (
          "<tr>" +
          "<td><strong>" + esc(r ? r.fullName : b.residentId) + "</strong><div style='font-size:0.76rem;color:var(--text-secondary);'>" + esc(r ? r.purok + " · " + r.householdId : "") + "</div></td>" +
          "<td>" + esc(b.sector) + "</td>" +
          '<td><span class="badge ' + (b.priority === "High" ? "badge--accent" : "") + '">' + esc(b.priority) + "</span></td>" +
          '<td><span class="badge ' + (b.served ? "badge--success" : "badge--warning") + '">' + (b.served ? "Served" : "Unserved") + "</span></td>" +
          "</tr>"
        );
      })
      .join("");
  }

  function renderAssessments() {
    const store = window.BICIS_STORE;
    const esc = store.escapeHtml;
    const tbody = document.getElementById("gad-assessments-tbody");

    tbody.innerHTML = store.state.gadAssessments
      .map(function (a) {
        const r = store.getResidentById(a.residentId);
        return (
          "<tr>" +
          "<td><strong>" + esc(r ? r.fullName : a.residentId) + "</strong><div style='font-size:0.75rem;color:var(--text-secondary);'>" + esc(a.remarks) + "</div></td>" +
          "<td>" + esc(a.needCategory) + "</td>" +
          '<td><span class="badge ' + (a.urgency === "Urgent" ? "badge--danger" : "") + '">' + esc(a.urgency) + "</span></td>" +
          '<td><span class="badge ' + (a.status === "Completed" ? "badge--success" : "badge--warning") + '">' + esc(a.status) + "</span></td>" +
          "<td>" +
          (a.status === "Pending"
            ? '<button type="button" class="table-btn table-btn--primary" data-complete-assess="' + esc(a.id) + '">Complete</button>'
            : '<span style="color:var(--text-secondary);font-size:0.78rem;">Done</span>') +
          "</td></tr>"
        );
      })
      .join("");

    tbody.querySelectorAll("[data-complete-assess]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const id = btn.getAttribute("data-complete-assess");
        const rec = store.state.gadAssessments.find(function (x) { return x.id === id; });
        if (rec) {
          rec.status = "Completed";
          store.logActivity("GAD-CARE", "Completed assessment " + id);
          renderAll();
          window.BICIS.showToast("Assessment " + id + " marked as Completed.");
        }
      });
    });
  }

  function renderInventory() {
    const store = window.BICIS_STORE;
    const esc = store.escapeHtml;
    document.getElementById("gad-inventory-tbody").innerHTML = store.state.gadInventory
      .map(function (i) {
        const low = i.stock <= i.threshold;
        const exp = isExpiringSoon(i.expiryDate);
        return (
          "<tr>" +
          "<td><strong>" + esc(i.name) + "</strong></td>" +
          "<td>" + esc(i.category) + "</td>" +
          "<td><strong>" + i.stock + "</strong> " + esc(i.unit) + "</td>" +
          "<td>" + i.threshold + " " + esc(i.unit) + "</td>" +
          "<td>" + esc(i.expiryDate) + "</td>" +
          '<td><div class="badge-group">' +
          (low ? '<span class="badge badge--danger">Low Stock</span>' : '<span class="badge badge--success">Healthy</span>') +
          (exp ? '<span class="badge badge--warning">Expiring Soon</span>' : "") +
          "</div></td></tr>"
        );
      })
      .join("");
  }

  function renderRules() {
    const store = window.BICIS_STORE;
    const esc = store.escapeHtml;
    document.getElementById("gad-rules-tbody").innerHTML = store.state.gadRules
      .map(function (r) {
        const item = store.state.gadInventory.find(function (i) { return i.id === r.itemId; });
        return (
          "<tr><td><code>" + esc(r.id) + "</code></td><td><strong>" + esc(r.sector) + "</strong></td><td>" + esc(item ? item.name : r.itemId) + "</td><td>" + r.qtyPerClaim + "</td><td>" + esc(r.frequency) + "</td><td style='color:var(--text-secondary);'>" + esc(r.notes) + "</td></tr>"
        );
      })
      .join("");
  }

  let currentGadLogPage = 1;
  const GAD_PAGE_SIZE = 6;

  function renderLogs() {
    const store = window.BICIS_STORE;
    const esc = store.escapeHtml;
    const q = (document.getElementById("gad-logs-search").value || "").trim().toLowerCase();

    const rows = store.state.gadDistributions.filter(function (d) {
      if (!q) return true;
      const r = store.getResidentById(d.residentId);
      const item = store.state.gadInventory.find(function (i) { return i.id === d.itemId; });
      return [d.id, d.period, r ? r.fullName : "", item ? item.name : ""].join(" ").toLowerCase().includes(q);
    });

    const totalPages = Math.max(1, Math.ceil(rows.length / GAD_PAGE_SIZE));
    if (currentGadLogPage > totalPages) currentGadLogPage = totalPages;
    const slice = rows.slice((currentGadLogPage - 1) * GAD_PAGE_SIZE, currentGadLogPage * GAD_PAGE_SIZE);

    document.getElementById("gad-logs-tbody").innerHTML = slice.length
      ? slice
          .map(function (d) {
            const r = store.getResidentById(d.residentId);
            const item = store.state.gadInventory.find(function (i) { return i.id === d.itemId; });
            return (
              "<tr><td><code>" + esc(d.id) + "</code></td><td><strong>" + esc(r ? r.fullName : d.residentId) + "</strong></td><td>" + esc(r ? r.purok : "") + "</td><td>" + esc(item ? item.name : d.itemId) + "</td><td>" + d.qty + "</td><td>" + esc(d.period) + "</td><td>" + esc(d.date) + "</td></tr>"
            );
          })
          .join("")
      : '<tr><td colspan="7" class="empty-state">No distribution logs match your search.</td></tr>';

    if (window.BICIS_PORTAL && window.BICIS_PORTAL.renderPagination) {
      window.BICIS_PORTAL.renderPagination({
        containerId: "gad-logs-pagination",
        totalItems: rows.length,
        pageSize: GAD_PAGE_SIZE,
        currentPage: currentGadLogPage,
        onPageChange: function (p) {
          currentGadLogPage = p;
          renderLogs();
        }
      });
    }
  }

  function renderReports() {
    const store = window.BICIS_STORE;
    const esc = store.escapeHtml;
    const st = store.state;
    const served = st.gadBeneficiaries.filter(function (b) { return b.served; }).length;
    const unserved = st.gadBeneficiaries.length - served;

    document.getElementById("gad-reports-body").innerHTML =
      '<div class="portal-card"><div class="portal-card-header"><h2 class="portal-card-title">Barangay Dimagiba — GAD-CARE Summary Report (Sample)</h2><span class="badge badge--accent">Printable</span></div><div class="portal-card-body">' +
      "<p style='font-size:0.88rem;color:var(--text-secondary);margin-bottom:1rem;'>Total Tagged Beneficiaries: <strong>" + st.gadBeneficiaries.length + "</strong> (Served: " + served + " · Unserved: " + unserved + ") · Total Kit Releases: <strong>" + st.gadDistributions.length + "</strong></p>" +
      '<div class="table-wrap"><table class="data-table"><thead><tr><th>Item</th><th>Remaining Stock</th><th>Low-Stock Threshold</th><th>Expiry</th></tr></thead><tbody>' +
      st.gadInventory
        .map(function (i) {
          return "<tr><td>" + esc(i.name) + "</td><td>" + i.stock + " " + esc(i.unit) + "</td><td>" + i.threshold + "</td><td>" + esc(i.expiryDate) + "</td></tr>";
        })
        .join("") +
      "</tbody></table></div></div></div>";
  }

  document.addEventListener("DOMContentLoaded", function () {
    window.BICIS_PORTAL.initPortalPage({
      moduleId: "gad-care",
      defaultView: "dashboard",
      viewTitles: {
        dashboard: "GAD-CARE Dashboard",
        tagging: "Beneficiary Tagging",
        assessments: "Needs Assessment",
        inventory: "Kit & Supply Inventory",
        rules: "Allocation Rules",
        release: "Kit Release",
        logs: "Distribution Logs",
        reports: "Printable Reports"
      },
      onViewChange: function () { renderAll(); },
      onRoleChange: function () { renderAll(); }
    });

    document.getElementById("gad-tag-resident").addEventListener("change", updateResidentTagPreview);
    document.getElementById("gad-beneficiary-filter").addEventListener("change", renderBeneficiaries);
    document.getElementById("gad-logs-search").addEventListener("input", renderLogs);

    // Beneficiary Tagging Form (Duplicate Prevention)
    document.getElementById("gad-tag-form").addEventListener("submit", function (e) {
      e.preventDefault();
      const store = window.BICIS_STORE;
      const resId = document.getElementById("gad-tag-resident").value;
      const sector = document.getElementById("gad-tag-sector").value;
      const priority = document.getElementById("gad-tag-priority").value;
      const notes = document.getElementById("gad-tag-notes").value.trim() || "Tagged via GAD-CARE";

      const duplicate = store.state.gadBeneficiaries.find(function (b) {
        return b.residentId === resId && b.sector === sector;
      });
      if (duplicate) {
        showInlineBanner("gad-tag-banner", "error", "<strong>Duplicate Beneficiary Blocked:</strong> This resident is already tagged under <em>" + store.escapeHtml(sector) + "</em> (" + store.escapeHtml(duplicate.id) + ").");
        return;
      }

      const newId = store.generateNextId("GAD-B-", store.state.gadBeneficiaries.map(function (b) { return b.id; }));
      store.state.gadBeneficiaries.unshift({
        id: newId,
        residentId: resId,
        sector: sector,
        priority: priority,
        served: false,
        taggedDate: new Date().toISOString().slice(0, 10),
        notes: notes
      });
      store.logActivity("GAD-CARE", "Tagged resident " + resId + " as " + sector);
      showInlineBanner("gad-tag-banner", "success", "Beneficiary tagged successfully (" + newId + ") in session preview.");
      document.getElementById("gad-tag-notes").value = "";
      renderAll();
    });

    // Needs Assessment Form
    document.getElementById("gad-assess-form").addEventListener("submit", function (e) {
      e.preventDefault();
      const store = window.BICIS_STORE;
      const resId = document.getElementById("gad-assess-resident").value;
      const need = document.getElementById("gad-assess-need").value;
      const urgency = document.getElementById("gad-assess-urgency").value;
      const remarks = document.getElementById("gad-assess-remarks").value.trim();
      if (!remarks) return;

      const newId = store.generateNextId("GAD-A-", store.state.gadAssessments.map(function (a) { return a.id; }));
      store.state.gadAssessments.unshift({
        id: newId,
        residentId: resId,
        needCategory: need,
        urgency: urgency,
        status: "Pending",
        assessedDate: new Date().toISOString().slice(0, 10),
        remarks: remarks
      });
      store.logActivity("GAD-CARE", "Logged " + urgency + " assessment " + newId + " for " + resId);
      document.getElementById("gad-assess-remarks").value = "";
      renderAll();
      window.BICIS.showToast("Needs assessment " + newId + " recorded.");
    });

    // Inventory Stock-In / Stock-Out (Prevents Negative Inventory)
    document.getElementById("gad-stock-form").addEventListener("submit", function (e) {
      e.preventDefault();
      const store = window.BICIS_STORE;
      const itemId = document.getElementById("gad-stock-item").value;
      const type = document.getElementById("gad-stock-type").value;
      const qty = parseInt(document.getElementById("gad-stock-qty").value, 10) || 0;
      const item = store.state.gadInventory.find(function (i) { return i.id === itemId; });
      if (!item || qty <= 0) return;

      if (type === "out" && item.stock - qty < 0) {
        showInlineBanner("gad-stock-banner", "error", "<strong>Negative Inventory Prevented:</strong> Cannot deduct " + qty + " " + store.escapeHtml(item.unit) + " when only " + item.stock + " remain.");
        return;
      }

      item.stock = type === "in" ? item.stock + qty : item.stock - qty;
      store.logActivity("GAD-CARE", (type === "in" ? "Stock-in +" : "Stock-out -") + qty + " " + item.name);
      showInlineBanner("gad-stock-banner", "success", "Updated <strong>" + store.escapeHtml(item.name) + "</strong> to " + item.stock + " " + store.escapeHtml(item.unit) + ".");
      renderAll();
    });

    // Kit Release Form (Duplicate Claim Check + Auto Stock Deduction + Negative Stock Block)
    document.getElementById("gad-release-form").addEventListener("submit", function (e) {
      e.preventDefault();
      const store = window.BICIS_STORE;
      const resId = document.getElementById("gad-rel-resident").value;
      const itemId = document.getElementById("gad-rel-item").value;
      const qty = parseInt(document.getElementById("gad-rel-qty").value, 10) || 1;
      const period = document.getElementById("gad-rel-period").value.trim();

      const item = store.state.gadInventory.find(function (i) { return i.id === itemId; });
      if (!item) return;

      const duplicateClaim = store.state.gadDistributions.find(function (d) {
        return d.residentId === resId && d.itemId === itemId && d.period.toLowerCase() === period.toLowerCase();
      });
      if (duplicateClaim) {
        showInlineBanner(
          "gad-release-banner",
          "error",
          "<strong>Duplicate Claim Blocked:</strong> This beneficiary already received <em>" +
            store.escapeHtml(item.name) +
            "</em> for period <strong>" +
            store.escapeHtml(period) +
            "</strong> (Log " +
            store.escapeHtml(duplicateClaim.id) +
            " on " +
            store.escapeHtml(duplicateClaim.date) +
            ")."
        );
        return;
      }

      if (item.stock < qty) {
        showInlineBanner(
          "gad-release-banner",
          "error",
          "<strong>Insufficient Stock:</strong> Only " + item.stock + " " + store.escapeHtml(item.unit) + " available. Negative inventory is blocked."
        );
        return;
      }

      item.stock -= qty;
      const ben = store.state.gadBeneficiaries.find(function (b) { return b.residentId === resId; });
      if (ben) ben.served = true;

      const logId = store.generateNextId("GAD-D-", store.state.gadDistributions.map(function (d) { return d.id; }));
      store.state.gadDistributions.unshift({
        id: logId,
        residentId: resId,
        itemId: itemId,
        qty: qty,
        period: period,
        date: new Date().toISOString().slice(0, 10),
        officer: store.getCurrentRole().short
      });
      store.logActivity("GAD-CARE", "Released " + qty + "x " + item.name + " to " + resId + " (" + period + ")");

      let msg = "<strong>Kit Released (" + logId + "):</strong> Deducted " + qty + " from inventory. Remaining stock: <strong>" + item.stock + "</strong>.";
      if (item.stock <= item.threshold) {
        msg += " <span class='badge badge--danger' style='margin-left:0.4rem;'>Low Stock Threshold Reached</span>";
      }
      showInlineBanner("gad-release-banner", "success", msg);
      renderAll();
    });
  });
})();
