/* ==========================================================================
   BICIS — Resident Registry Controller
   Expandable Household -> Family -> Member Table, Search/Filter/Sort,
   Dynamic Multi-Step Add Household Wizard, Edit, Resident Profile, Delete
   ========================================================================== */

(function () {
  "use strict";

  const SECTOR_OPTIONS = [
    "Senior Citizen",
    "PWD",
    "Solo Parent",
    "Pregnant Woman",
    "Lactating Mother",
    "Women of Reproductive Age",
    "Infant (0-24 mos)",
    "Elderly Woman"
  ];

  let expandedIds = new Set(["HH-2026-001"]);
  let currentRegPage = 1;
  const REG_PAGE_SIZE = 5;
  let pendingDeleteId = null;

  // Wizard state
  let currentStep = 1;
  let draftHousehold = {
    purok: "Purok 1",
    streetHouseNo: "",
    address: "Barangay Dimagiba, Legazpi City, Albay",
    familyCount: 1,
    families: []
  };

  function closeModalById(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");
  }

  function getHouseholdSectors(hh) {
    const tags = new Set();
    hh.families.forEach(function (f) {
      if (f.is4Ps) tags.add("4Ps");
      if (f.isSoloParent) tags.add("Solo Parent");
      f.members.forEach(function (m) {
        m.sectors.forEach(function (s) { tags.add(s); });
      });
    });
    return Array.from(tags);
  }

  function renderKPIs() {
    const grid = document.getElementById("registry-kpi-grid");
    if (!grid) return;
    const m = window.BICIS_STORE.getRegistryMetrics();

    grid.innerHTML =
      '<div class="kpi-card kpi-card--accent"><span class="kpi-label">Total Households</span><span class="kpi-value">' + m.households + '</span><span class="kpi-sub">Registered household units</span></div>' +
      '<div class="kpi-card"><span class="kpi-label">Total Families</span><span class="kpi-value">' + m.families + '</span><span class="kpi-sub">Across all households</span></div>' +
      '<div class="kpi-card"><span class="kpi-label">Total Residents</span><span class="kpi-value">' + m.residents + '</span><span class="kpi-sub">' + m.activeResidents + " active residents</span></div>" +
      '<div class="kpi-card"><span class="kpi-label">Senior Citizens</span><span class="kpi-value">' + m.seniors + '</span><span class="kpi-sub">Age 60+ or tagged</span></div>' +
      '<div class="kpi-card"><span class="kpi-label">PWDs</span><span class="kpi-value">' + m.pwds + '</span><span class="kpi-sub">Shared with GABAY &amp; HANDA+</span></div>';
  }

  function renderTable() {
    const store = window.BICIS_STORE;
    const esc = store.escapeHtml;
    const role = store.getCurrentRole();

    const restrictedBox = document.getElementById("registry-restricted");
    const mainView = document.getElementById("view-dashboard");
    const addBtn = document.getElementById("btn-open-add-hh");

    if (!role.permissions.registryRead) {
      restrictedBox.style.display = "flex";
      mainView.style.display = "none";
      return;
    }

    restrictedBox.style.display = "none";
    mainView.style.display = "";
    if (addBtn) {
      addBtn.style.display = role.permissions.registryWrite ? "" : "none";
    }

    const searchQ = (document.getElementById("reg-search").value || "").trim().toLowerCase();
    const purokF = document.getElementById("reg-purok-filter").value;
    const sectorF = document.getElementById("reg-sector-filter").value;
    const statusF = document.getElementById("reg-status-filter").value;
    const sortBy = document.getElementById("reg-sort").value;

    let rows = store.state.households.filter(function (hh) {
      if (purokF !== "all" && hh.purok !== purokF) return false;

      const sectors = getHouseholdSectors(hh);
      if (sectorF !== "all" && !sectors.includes(sectorF)) return false;

      if (statusF !== "all") {
        const hasStatus = hh.families.some(function (f) {
          return f.members.some(function (m) { return m.status === statusF; });
        });
        if (!hasStatus) return false;
      }

      if (searchQ) {
        const haystack = [hh.id, hh.purok, hh.streetHouseNo, hh.address]
          .concat(
            hh.families.flatMap(function (f) {
              return [f.id, f.headName].concat(
                f.members.map(function (m) { return m.id + " " + m.fullName; })
              );
            })
          )
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(searchQ)) return false;
      }

      return true;
    });

    rows = rows.slice().sort(function (a, b) {
      if (sortBy === "purok-asc") return a.purok.localeCompare(b.purok);
      if (sortBy === "members-desc") return store.getHouseholdMemberCount(b) - store.getHouseholdMemberCount(a);
      if (sortBy === "head-asc") {
        const ha = a.families[0] ? a.families[0].headName : "";
        const hb = b.families[0] ? b.families[0].headName : "";
        return ha.localeCompare(hb);
      }
      return a.id.localeCompare(b.id);
    });

    const countBadge = document.getElementById("registry-result-count");
    if (countBadge) {
      countBadge.textContent = rows.length + " household" + (rows.length === 1 ? "" : "s");
    }

    const tbody = document.getElementById("registry-table-body");
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No households match your search. Try adjusting your filters or click <strong>Register Household</strong> to add a new record.</td></tr>';
      if (window.BICIS_PORTAL && window.BICIS_PORTAL.renderPagination) {
        window.BICIS_PORTAL.renderPagination({ containerId: "registry-pagination", totalItems: 0, pageSize: REG_PAGE_SIZE, currentPage: 1, onPageChange: function () {} });
      }
      return;
    }

    const totalPages = Math.max(1, Math.ceil(rows.length / REG_PAGE_SIZE));
    if (currentRegPage > totalPages) currentRegPage = totalPages;
    const pagedRows = rows.slice((currentRegPage - 1) * REG_PAGE_SIZE, currentRegPage * REG_PAGE_SIZE);

    let html = "";
    pagedRows.forEach(function (hh) {
      const isExpanded = expandedIds.has(hh.id);
      const memberCount = store.getHouseholdMemberCount(hh);
      const sectors = getHouseholdSectors(hh);

      const sectorBadges = sectors.length
        ? sectors
            .slice(0, 4)
            .map(function (s) {
              const accent = s === "Senior Citizen" || s === "PWD" || s === "Pregnant Woman" ? " badge--accent" : "";
              return '<span class="badge' + accent + '">' + esc(s) + "</span>";
            })
            .join("") + (sectors.length > 4 ? '<span class="badge">+' + (sectors.length - 4) + " more</span>" : "")
        : '<span style="color:var(--portal-text-muted);font-size:0.86rem;">General</span>';

      html +=
        "<tr>" +
        '<td><button type="button" class="expand-btn" data-expand-hh="' + esc(hh.id) + '" aria-expanded="' + (isExpanded ? "true" : "false") + '" aria-label="Show or hide family members for ' + esc(hh.id) + '">' + (isExpanded ? "&minus;" : "+") + "</button></td>" +
        '<td><code>' + esc(hh.id) + "</code></td>" +
        "<td><strong>" + esc(hh.purok) + "</strong><div style='font-size:0.84rem;color:var(--portal-text-muted);'>" + esc(hh.streetHouseNo) + "</div></td>" +
        "<td>" + hh.families.length + "</td>" +
        "<td>" + memberCount + "</td>" +
        '<td><div class="badge-group">' + sectorBadges + "</div></td>" +
        '<td class="no-print"><div class="table-actions">' +
        (role.permissions.registryWrite
          ? '<button type="button" class="table-btn" data-edit-hh="' + esc(hh.id) + '">Edit Information</button>'
          : "") +
        (role.permissions.registryDelete
          ? '<button type="button" class="table-btn table-btn--danger" data-delete-hh="' + esc(hh.id) + '">Delete Record</button>'
          : '<button type="button" class="table-btn" disabled title="You do not have permission to delete records in this role">Delete Record</button>') +
        "</div></td>" +
        "</tr>";

      if (isExpanded) {
        const familiesHtml = hh.families
          .map(function (fam) {
            const membersHtml = fam.members
              .map(function (mem) {
                const age = store.calculateAge(mem.birthdate);
                const statusBadge =
                  mem.status === "Active"
                    ? "badge--success"
                    : mem.status === "Transferred"
                    ? "badge--warning"
                    : "badge--danger";
                return (
                  '<div class="member-mini-card">' +
                  '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.5rem;">' +
                  "<div><strong>" + esc(mem.fullName) + "</strong><div style='font-size:0.82rem;color:var(--portal-text-muted);'>" + esc(mem.id) + " · " + esc(mem.relationship) + "</div></div>" +
                  '<span class="badge ' + statusBadge + '">' + esc(mem.status) + "</span>" +
                  "</div>" +
                  '<div style="font-size:0.86rem;color:var(--portal-text-muted);">' + esc(mem.sex) + " · Age " + age + " · " + esc(mem.civilStatus) + " · " + esc(mem.voterStatus) + "</div>" +
                  '<div class="badge-group">' +
                  (mem.sectors.length
                    ? mem.sectors.map(function (s) { return '<span class="badge badge--accent">' + esc(s) + "</span>"; }).join("")
                    : '<span class="badge">Resident</span>') +
                  "</div>" +
                  '<div style="margin-top:0.35rem;"><button type="button" class="table-btn" data-view-resident="' + esc(mem.id) + '">View Details</button></div>' +
                  "</div>"
                );
              })
              .join("");

            return (
              '<div class="family-block">' +
              '<div class="family-block-header">' +
              "<div><span class='badge' style='margin-right:0.5rem;'>" + esc(fam.id) + "</span><strong>Family Head: " + esc(fam.headName) + "</strong> (" + fam.members.length + " members)</div>" +
              '<div class="badge-group">' +
              (fam.is4Ps ? '<span class="badge badge--accent">4Ps Beneficiary</span>' : "") +
              (fam.isSoloParent ? '<span class="badge badge--warning">Solo Parent</span>' : "") +
              "</div>" +
              "</div>" +
              '<div class="member-mini-grid">' + membersHtml + "</div>" +
              "</div>"
            );
          })
          .join("");

        html += '<tr class="hierarchy-detail-row"><td colspan="7">' + familiesHtml + "</td></tr>";
      }
    });

    tbody.innerHTML = html;

    // Bind table actions
    tbody.querySelectorAll("[data-expand-hh]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const id = btn.getAttribute("data-expand-hh");
        if (expandedIds.has(id)) expandedIds.delete(id);
        else expandedIds.add(id);
        renderTable();
      });
    });

    tbody.querySelectorAll("[data-edit-hh]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openEditHouseholdModal(btn.getAttribute("data-edit-hh"));
      });
    });

    tbody.querySelectorAll("[data-delete-hh]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openDeleteModal(btn.getAttribute("data-delete-hh"));
      });
    });

    tbody.querySelectorAll("[data-view-resident]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openResidentProfileModal(btn.getAttribute("data-view-resident"));
      });
    });

    if (window.BICIS_PORTAL && window.BICIS_PORTAL.renderPagination) {
      window.BICIS_PORTAL.renderPagination({
        containerId: "registry-pagination",
        totalItems: rows.length,
        pageSize: REG_PAGE_SIZE,
        currentPage: currentRegPage,
        onPageChange: function (nextPage) {
          currentRegPage = nextPage;
          renderTable();
        }
      });
    }
  }

  /* ------------------------------------------------------------------------
     Individual Resident Profile Modal (Shows Shared Cross-Committee Links)
     ------------------------------------------------------------------------ */
  function openResidentProfileModal(residentId) {
    const store = window.BICIS_STORE;
    const esc = store.escapeHtml;
    const role = store.getCurrentRole();
    const res = store.getResidentById(residentId);
    if (!res) return;

    const gadTags = store.state.gadBeneficiaries.filter(function (b) { return b.residentId === res.id; });
    const gabayEnr = store.state.gabayEnrollments.filter(function (e) { return e.householdId === res.householdId; });
    const gabayAid = store.state.gabayAidRecords.filter(function (a) { return a.residentId === res.id; });
    const checkedCenter = store.state.handaCenters.find(function (c) { return c.checkedInResidentIds.includes(res.id); });

    document.getElementById("res-profile-title").textContent = res.fullName;

    const statusEditor = role.permissions.registryWrite
      ? '<div style="display:flex;align-items:center;gap:0.65rem;margin-top:0.5rem;">' +
        '<select id="profile-status-select" class="form-select" style="max-width:190px;padding:0.45rem 0.7rem;">' +
        '<option value="Active"' + (res.status === "Active" ? " selected" : "") + ">Active</option>" +
        '<option value="Transferred"' + (res.status === "Transferred" ? " selected" : "") + ">Transferred</option>" +
        '<option value="Deceased"' + (res.status === "Deceased" ? " selected" : "") + ">Deceased</option>" +
        "</select>" +
        '<button type="button" id="profile-status-save" class="btn btn-primary btn-sm">Update Status</button>' +
        "</div>"
      : '<span class="badge">' + esc(res.status) + "</span>";

    document.getElementById("resident-profile-body").innerHTML =
      '<div class="info-list">' +
      '<div class="info-list-row"><span class="info-list-label">Resident ID</span><span class="info-list-value"><strong>' + esc(res.id) + "</strong> · Household " + esc(res.householdId) + " / Family " + esc(res.familyId) + "</span></div>" +
      '<div class="info-list-row"><span class="info-list-label">Address</span><span class="info-list-value">' + esc(res.purok) + " — " + esc(res.address) + "</span></div>" +
      '<div class="info-list-row"><span class="info-list-label">Demographics</span><span class="info-list-value">' + esc(res.sex) + " · Born " + esc(res.birthdate) + " (Age " + res.age + ") · " + esc(res.civilStatus) + "</span></div>" +
      '<div class="info-list-row"><span class="info-list-label">Family Role</span><span class="info-list-value">' + esc(res.relationship) + " (Head: " + esc(res.familyHead) + ")</span></div>" +
      '<div class="info-list-row"><span class="info-list-label">Occupation / Educ.</span><span class="info-list-value">' + esc(res.occupation) + " · " + esc(res.education) + "</span></div>" +
      '<div class="info-list-row"><span class="info-list-label">Contact &amp; Voter</span><span class="info-list-value">' + esc(res.contact) + " · " + esc(res.voterStatus) + "</span></div>" +
      '<div class="info-list-row"><span class="info-list-label">Sector Tags</span><span class="info-list-value"><div class="badge-group">' +
      (res.sectors.length ? res.sectors.map(function (s) { return '<span class="badge badge--accent">' + esc(s) + "</span>"; }).join("") : '<span class="badge">General Resident</span>') +
      "</div></span></div>" +
      '<div class="info-list-row"><span class="info-list-label">Resident Status</span><span class="info-list-value">' + statusEditor + "</span></div>" +
      "</div>" +
      '<div class="alert-box" style="margin-top:0.5rem;">' +
      "<strong>Connected Committee References (Shared Resident Record):</strong>" +
      "<ul style='margin-top:0.4rem;padding-left:1.2rem;'>" +
      "<li><strong>GAD-CARE:</strong> " + (gadTags.length ? gadTags.map(function (g) { return esc(g.sector) + " (" + esc(g.priority) + ")"; }).join(", ") : "Not currently tagged") + "</li>" +
      "<li><strong>GABAY:</strong> " + gabayEnr.length + " household program enrollment(s) · " + gabayAid.length + " recorded aid release(s)</li>" +
      "<li><strong>HANDA+:</strong> " + (checkedCenter ? "Currently checked in at " + esc(checkedCenter.name) : "Not currently checked into an evacuation center") + "</li>" +
      "</ul></div>";

    const saveStatusBtn = document.getElementById("profile-status-save");
    if (saveStatusBtn) {
      saveStatusBtn.addEventListener("click", function () {
        const nextStatus = document.getElementById("profile-status-select").value;
        store.updateResidentStatus(res.id, nextStatus);
        renderKPIs();
        renderTable();
        window.BICIS.showToast(res.fullName + " status updated to " + nextStatus + " (session).");
        closeModalById("resident-profile-modal");
      });
    }

    window.BICIS.openModal("resident-profile-modal");
  }

  /* ------------------------------------------------------------------------
     Edit & Delete Household Modals
     ------------------------------------------------------------------------ */
  function openEditHouseholdModal(hhId) {
    const hh = window.BICIS_STORE.getHouseholdById(hhId);
    if (!hh) return;
    document.getElementById("edit-hh-id").value = hh.id;
    document.getElementById("edit-hh-purok").value = hh.purok;
    document.getElementById("edit-hh-street").value = hh.streetHouseNo;
    document.getElementById("edit-hh-address").value = hh.address;
    window.BICIS.openModal("edit-household-modal");
  }

  function openDeleteModal(hhId) {
    const store = window.BICIS_STORE;
    const hh = store.getHouseholdById(hhId);
    if (!hh) return;
    pendingDeleteId = hhId;
    document.getElementById("delete-hh-message").innerHTML =
      "Are you sure you want to delete household <strong>" +
      store.escapeHtml(hh.id) +
      "</strong> (" +
      store.escapeHtml(hh.purok) +
      ", " +
      hh.families.length +
      " family/families, " +
      store.getHouseholdMemberCount(hh) +
      " member(s)) from this session? In production, deleting a household with linked committee transactions must be restricted or archived on the PHP/MySQL backend.";
    window.BICIS.openModal("delete-household-modal");
  }

  /* ------------------------------------------------------------------------
     Multi-Step Add Household Wizard (Dynamically Generates Families & Members)
     ------------------------------------------------------------------------ */
  function updateWizardUI() {
    document.querySelectorAll("[data-step-pill]").forEach(function (pill) {
      const n = parseInt(pill.getAttribute("data-step-pill"), 10);
      pill.classList.toggle("is-active", n === currentStep);
      pill.classList.toggle("is-done", n < currentStep);
    });

    document.querySelectorAll("[data-wizard-step]").forEach(function (panel) {
      const n = parseInt(panel.getAttribute("data-wizard-step"), 10);
      panel.classList.toggle("is-active", n === currentStep);
    });

    document.getElementById("wizard-prev-btn").style.display = currentStep > 1 ? "" : "none";
    document.getElementById("wizard-next-btn").style.display = currentStep < 4 ? "" : "none";
    document.getElementById("wizard-save-btn").style.display = currentStep === 4 ? "" : "none";

    const banner = document.getElementById("add-hh-banner");
    banner.className = "form-banner";
    banner.textContent = "";
  }

  function buildDynamicFamiliesStep() {
    const count = Math.max(1, Math.min(5, parseInt(document.getElementById("add-hh-family-count").value, 10) || 1));
    draftHousehold.familyCount = count;

    while (draftHousehold.families.length < count) {
      draftHousehold.families.push({ headName: "", memberCount: 2, is4Ps: false, isSoloParent: false, members: [] });
    }
    draftHousehold.families.length = count;

    const container = document.getElementById("dynamic-families-container");
    container.innerHTML = draftHousehold.families
      .map(function (fam, idx) {
        return (
          '<div class="dynamic-section-card">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;"><strong>Family ' + (idx + 1) + '</strong><span class="badge">Dynamic Section</span></div>' +
          '<div class="form-grid-2">' +
          '<div class="form-field"><label class="form-label" for="fam-head-' + idx + '">Family Head Full Name</label><input type="text" id="fam-head-' + idx + '" class="form-input" value="' + window.BICIS_STORE.escapeHtml(fam.headName) + '" placeholder="e.g., Pedro A. Cruz" required></div>' +
          '<div class="form-field"><label class="form-label" for="fam-count-' + idx + '">Number of Members</label><input type="number" id="fam-count-' + idx + '" class="form-input" min="1" max="8" value="' + fam.memberCount + '" required></div>' +
          "</div>" +
          '<div style="display:flex;flex-wrap:wrap;gap:1.25rem;">' +
          '<label class="checkbox-field"><input type="checkbox" id="fam-4ps-' + idx + '"' + (fam.is4Ps ? " checked" : "") + "><span>4Ps Household</span></label>" +
          '<label class="checkbox-field"><input type="checkbox" id="fam-solo-' + idx + '"' + (fam.isSoloParent ? " checked" : "") + "><span>Solo Parent Household</span></label>" +
          "</div></div>"
        );
      })
      .join("");
  }

  function buildDynamicMembersStep() {
    const esc = window.BICIS_STORE.escapeHtml;
    const container = document.getElementById("dynamic-members-container");
    let html = "";

    draftHousehold.families.forEach(function (fam, fIdx) {
      const mCount = Math.max(1, Math.min(8, fam.memberCount || 1));
      while (fam.members.length < mCount) {
        fam.members.push({
          fullName: fam.members.length === 0 ? fam.headName : "",
          sex: "Female",
          birthdate: "1995-01-01",
          civilStatus: "Single",
          relationship: fam.members.length === 0 ? "Family Head" : "Member",
          occupation: "",
          education: "High School Graduate",
          contact: "",
          sectors: [],
          voterStatus: "Registered Voter",
          status: "Active"
        });
      }
      fam.members.length = mCount;

      fam.members.forEach(function (mem, mIdx) {
        const key = fIdx + "-" + mIdx;
        const sectorChecks = SECTOR_OPTIONS.map(function (sec, sIdx) {
          const checked = mem.sectors.includes(sec) ? " checked" : "";
          return (
            '<label class="checkbox-field" style="font-size:0.78rem;"><input type="checkbox" name="mem-sec-' + key + '" value="' + esc(sec) + '"' + checked + "><span>" + esc(sec) + "</span></label>"
          );
        }).join("");

        html +=
          '<div class="dynamic-section-card">' +
          '<div style="display:flex;justify-content:space-between;"><strong>Family ' + (fIdx + 1) + " · Member " + (mIdx + 1) + '</strong><span class="badge">' + esc(fam.headName || "Family " + (fIdx + 1)) + "</span></div>" +
          '<div class="form-grid-3">' +
          '<div class="form-field"><label class="form-label">Full Name</label><input type="text" id="mem-name-' + key + '" class="form-input" value="' + esc(mem.fullName) + '" required></div>' +
          '<div class="form-field"><label class="form-label">Sex</label><select id="mem-sex-' + key + '" class="form-select"><option value="Female"' + (mem.sex === "Female" ? " selected" : "") + '>Female</option><option value="Male"' + (mem.sex === "Male" ? " selected" : "") + ">Male</option></select></div>" +
          '<div class="form-field"><label class="form-label">Birthdate</label><input type="date" id="mem-dob-' + key + '" class="form-input" value="' + esc(mem.birthdate) + '" required></div>' +
          "</div>" +
          '<div class="form-grid-3">' +
          '<div class="form-field"><label class="form-label">Civil Status</label><select id="mem-civil-' + key + '" class="form-select"><option>Single</option><option>Married</option><option>Widowed</option><option>Separated</option></select></div>' +
          '<div class="form-field"><label class="form-label">Relationship to Head</label><input type="text" id="mem-rel-' + key + '" class="form-input" value="' + esc(mem.relationship) + '"></div>' +
          '<div class="form-field"><label class="form-label">Occupation</label><input type="text" id="mem-occ-' + key + '" class="form-input" value="' + esc(mem.occupation) + '" placeholder="e.g., Vendor, Student"></div>' +
          "</div>" +
          '<div class="form-grid-3">' +
          '<div class="form-field"><label class="form-label">Education</label><input type="text" id="mem-edu-' + key + '" class="form-input" value="' + esc(mem.education) + '"></div>' +
          '<div class="form-field"><label class="form-label">Contact Number</label><input type="text" id="mem-tel-' + key + '" class="form-input" value="' + esc(mem.contact) + '" placeholder="09XX-XXX-XXXX"></div>' +
          '<div class="form-field"><label class="form-label">Voter / Status</label><div style="display:flex;gap:0.4rem;"><select id="mem-voter-' + key + '" class="form-select"><option>Registered Voter</option><option>Non-Voter</option></select><select id="mem-status-' + key + '" class="form-select"><option>Active</option><option>Transferred</option><option>Deceased</option></select></div></div>' +
          "</div>" +
          '<div><span class="form-label" style="margin-bottom:0.4rem;">Sector Classifications</span><div style="display:flex;flex-wrap:wrap;gap:0.65rem 1rem;">' + sectorChecks + "</div></div>" +
          "</div>";
      });
    });

    container.innerHTML = html;
  }

  function showWizardError(msg) {
    const banner = document.getElementById("add-hh-banner");
    banner.className = "form-banner form-banner--error is-visible";
    banner.textContent = msg;
  }

  function validateAndCollectStep() {
    if (currentStep === 1) {
      const street = document.getElementById("add-hh-street").value.trim();
      const addr = document.getElementById("add-hh-address").value.trim();
      const count = parseInt(document.getElementById("add-hh-family-count").value, 10);
      if (!street || !addr || !count || count < 1 || count > 5) {
        showWizardError("Please complete the Purok, Street/House Number, Address, and Number of Families (1-5).");
        return false;
      }
      draftHousehold.purok = document.getElementById("add-hh-purok").value;
      draftHousehold.streetHouseNo = street;
      draftHousehold.address = addr;
      draftHousehold.familyCount = count;
      buildDynamicFamiliesStep();
      return true;
    }

    if (currentStep === 2) {
      for (let i = 0; i < draftHousehold.families.length; i++) {
        const head = document.getElementById("fam-head-" + i).value.trim();
        const mCount = parseInt(document.getElementById("fam-count-" + i).value, 10);
        if (!head || !mCount || mCount < 1 || mCount > 8) {
          showWizardError("Please enter a valid Family Head name and Member Count (1-8) for Family " + (i + 1) + ".");
          return false;
        }
        draftHousehold.families[i].headName = head;
        draftHousehold.families[i].memberCount = mCount;
        draftHousehold.families[i].is4Ps = document.getElementById("fam-4ps-" + i).checked;
        draftHousehold.families[i].isSoloParent = document.getElementById("fam-solo-" + i).checked;
      }
      buildDynamicMembersStep();
      return true;
    }

    if (currentStep === 3) {
      for (let fIdx = 0; fIdx < draftHousehold.families.length; fIdx++) {
        const fam = draftHousehold.families[fIdx];
        for (let mIdx = 0; mIdx < fam.members.length; mIdx++) {
          const key = fIdx + "-" + mIdx;
          const name = document.getElementById("mem-name-" + key).value.trim();
          const dob = document.getElementById("mem-dob-" + key).value;
          if (!name || !dob) {
            showWizardError("Please enter Full Name and Birthdate for Family " + (fIdx + 1) + ", Member " + (mIdx + 1) + ".");
            return false;
          }
          const sectors = Array.from(document.querySelectorAll('input[name="mem-sec-' + key + '"]:checked')).map(function (cb) { return cb.value; });
          fam.members[mIdx] = {
            fullName: name,
            sex: document.getElementById("mem-sex-" + key).value,
            birthdate: dob,
            civilStatus: document.getElementById("mem-civil-" + key).value,
            relationship: document.getElementById("mem-rel-" + key).value.trim() || "Member",
            occupation: document.getElementById("mem-occ-" + key).value.trim() || "None",
            education: document.getElementById("mem-edu-" + key).value.trim() || "Not Specified",
            contact: document.getElementById("mem-tel-" + key).value.trim() || "None",
            sectors: sectors,
            voterStatus: document.getElementById("mem-voter-" + key).value,
            status: document.getElementById("mem-status-" + key).value
          };
        }
      }
      renderReviewStep();
      return true;
    }

    return true;
  }

  function renderReviewStep() {
    const esc = window.BICIS_STORE.escapeHtml;
    const totalMembers = draftHousehold.families.reduce(function (s, f) { return s + f.members.length; }, 0);
    document.getElementById("hh-review-summary").innerHTML =
      '<div class="alert-box"><strong>Ready to add to Central Resident Registry (Session):</strong> ' +
      esc(draftHousehold.purok) + " · " + esc(draftHousehold.streetHouseNo) + " (" + draftHousehold.families.length + " family/families, " + totalMembers + " member(s)). " +
      "Once saved, these records immediately become selectable in GAD-CARE, GABAY, and HANDA+. Connect <code>api/registry.php</code> for MySQL persistence.</div>" +
      draftHousehold.families
        .map(function (f, i) {
          return (
            '<div class="family-block"><strong>Family ' + (i + 1) + ": " + esc(f.headName) + "</strong> (" + f.members.length + " members)" +
            "<ul style='margin-top:0.5rem;padding-left:1.25rem;font-size:0.86rem;color:var(--text-secondary);'>" +
            f.members.map(function (m) {
              return "<li>" + esc(m.fullName) + " — " + esc(m.sex) + ", Age " + window.BICIS_STORE.calculateAge(m.birthdate) + " (" + esc(m.status) + ")</li>";
            }).join("") +
            "</ul></div>"
          );
        })
        .join("");
  }

  document.addEventListener("DOMContentLoaded", function () {
    window.BICIS_PORTAL.initPortalPage({
      moduleId: "registry",
      defaultView: "dashboard",
      viewTitles: { dashboard: "Resident Registry" },
      onRoleChange: function () {
        renderKPIs();
        renderTable();
      }
    });

    renderKPIs();
    renderTable();

    ["reg-search", "reg-purok-filter", "reg-sector-filter", "reg-status-filter", "reg-sort"].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.addEventListener(id === "reg-search" ? "input" : "change", renderTable);
    });

    document.getElementById("btn-print-registry").addEventListener("click", function () {
      window.print();
    });

    document.getElementById("btn-open-add-hh").addEventListener("click", function () {
      currentStep = 1;
      draftHousehold = {
        purok: "Purok 1",
        streetHouseNo: "",
        address: "Barangay Dimagiba, Legazpi City, Albay",
        familyCount: 1,
        families: []
      };
      document.getElementById("add-hh-street").value = "";
      document.getElementById("add-hh-family-count").value = "1";
      updateWizardUI();
      window.BICIS.openModal("add-household-modal");
    });

    document.getElementById("wizard-next-btn").addEventListener("click", function () {
      if (validateAndCollectStep()) {
        currentStep = Math.min(4, currentStep + 1);
        updateWizardUI();
      }
    });

    document.getElementById("wizard-prev-btn").addEventListener("click", function () {
      currentStep = Math.max(1, currentStep - 1);
      updateWizardUI();
    });

    document.getElementById("wizard-save-btn").addEventListener("click", function () {
      const created = window.BICIS_STORE.addHousehold(draftHousehold);
      expandedIds.add(created.id);
      closeModalById("add-household-modal");
      renderKPIs();
      renderTable();
      window.BICIS.showToast("Household " + created.id + " added to Resident Registry (session).");
    });

    document.getElementById("edit-hh-form").addEventListener("submit", function (event) {
      event.preventDefault();
      const id = document.getElementById("edit-hh-id").value;
      window.BICIS_STORE.updateHousehold(id, {
        purok: document.getElementById("edit-hh-purok").value,
        streetHouseNo: document.getElementById("edit-hh-street").value.trim(),
        address: document.getElementById("edit-hh-address").value.trim()
      });
      closeModalById("edit-household-modal");
      renderTable();
      window.BICIS.showToast("Household " + id + " updated (session).");
    });

    document.getElementById("confirm-delete-hh-btn").addEventListener("click", function () {
      if (!pendingDeleteId) return;
      window.BICIS_STORE.deleteHousehold(pendingDeleteId);
      expandedIds.delete(pendingDeleteId);
      const removed = pendingDeleteId;
      pendingDeleteId = null;
      closeModalById("delete-household-modal");
      renderKPIs();
      renderTable();
      window.BICIS.showToast("Household " + removed + " deleted from session.");
    });
  });
})();
