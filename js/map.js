/* ==========================================================================
   BICIS — Interactive Illustrated Map Controller
   Centered on Barangay Dimagiba, Legazpi City, Albay, Philippines
   Vanilla JS + Inline SVG + CSS Transforms + MDX-Inspired Cursor Tracking
   ========================================================================== */

(function () {
  "use strict";

  const MAP_FEATURES = {
    "dimagiba-center": {
      category: "Primary Focus · Barangay Center",
      name: "Barangay Dimagiba",
      subtitle: "Legazpi City, Albay, Philippines",
      description:
        "Primary community focus area of the Barangay Integrated Community Information System (BICIS). Use zoom, pan, or select surrounding illustrated service nodes to explore community resources.",
      note: "Location focus: Barangay Dimagiba, Legazpi City, Albay (Region V). Map layout is illustrative."
    },
    "hub-bicis": {
      category: "BICIS · Community Hub",
      name: "Barangay Hall & BICIS Hub",
      subtitle: "Central Information & Records Desk (Illustrative)",
      description:
        "Illustrative marker representing the central barangay administrative desk for community announcements, resident inquiries, public documents, and service referrals.",
      note: "Illustrative map marker — not live GPS coordinates."
    },
    "hub-drrm": {
      category: "DRRM · Preparedness",
      name: "DRRM Evacuation Assembly Zone",
      subtitle: "Emergency Readiness & Safety Area (Illustrative)",
      description:
        "Illustrative community safety area representing designated disaster preparedness briefings, emergency advisories, and resident assembly coordination.",
      note: "Illustrative map marker — confirm official evacuation sites with Barangay DRRM officials."
    },
    "hub-gad": {
      category: "GAD · Community Support",
      name: "GAD Resource & Safe Space Desk",
      subtitle: "Gender & Development Initiative Point (Illustrative)",
      description:
        "Illustrative community resource point highlighting Gender and Development programs, resident awareness initiatives, and inclusive referral information.",
      note: "Illustrative map marker — contact barangay administrators for office hours."
    },
    "hub-welfare": {
      category: "Social Welfare · Assistance",
      name: "Social Welfare Assistance Center",
      subtitle: "Family & Resident Support Desk (Illustrative)",
      description:
        "Illustrative service point representing social welfare inquiries, community assistance program information, and support services for residents and families.",
      note: "Illustrative map marker — verify program schedules through official notices."
    },
    "hub-health": {
      category: "Community Safety · Health",
      name: "Community Health & First Aid Post",
      subtitle: "Primary Care & Wellness Station (Illustrative)",
      description:
        "Illustrative marker representing basic barangay health guidance, first-aid coordination, and maternal/senior wellness announcements.",
      note: "Illustrative map marker — not live emergency dispatch."
    },
    "hub-court": {
      category: "Civic Space · Gathering",
      name: "Multi-Purpose Covered Court",
      subtitle: "Community Assemblies & Briefings (Illustrative)",
      description:
        "Illustrative civic space representing barangay assemblies, community orientations, disaster preparedness drills, and public outreach activities.",
      note: "Illustrative map marker — schematic representation."
    },
    "road-main": {
      category: "Illustrative Roadway",
      name: "Central Barangay Thoroughfare",
      subtitle: "Primary Community Access Route (Illustrative)",
      description:
        "Illustrative east-west primary corridor connecting the central barangay civic area toward surrounding Legazpi City access routes.",
      note: "Illustrative street pattern — not an official survey or street-name database."
    },
    "road-north": {
      category: "Illustrative Roadway",
      name: "North Civic Access Corridor",
      subtitle: "Primary North-South Connector (Illustrative)",
      description:
        "Illustrative north-south connector linking northern residential clusters with the central barangay hub and disaster assembly zone.",
      note: "Illustrative street pattern — schematic representation only."
    },
    "road-east": {
      category: "Illustrative Roadway",
      name: "East Coastal Connector",
      subtitle: "Toward Albay Gulf Direction (Illustrative)",
      description:
        "Illustrative eastern access lane oriented toward the general direction of Albay Gulf, the verified coastal waterbody bordering Legazpi City.",
      note: "Directional regional context (Albay Gulf) with illustrative local roadway."
    },
    "road-loop": {
      category: "Illustrative Roadway",
      name: "Community Inner Service Loop",
      subtitle: "Neighborhood Circulation Path (Illustrative)",
      description:
        "Illustrative inner circulation road connecting residential clusters, the GAD resource desk, and the social welfare assistance point.",
      note: "Illustrative street pattern — schematic representation only."
    },
    "road-south": {
      category: "Illustrative Roadway",
      name: "South Preparedness Lane",
      subtitle: "Secondary Access Path (Illustrative)",
      description:
        "Illustrative southern pathway connecting community clusters to the multi-purpose covered court and health station.",
      note: "Illustrative street pattern — schematic representation only."
    },
    "zone-civic": {
      category: "Illustrative Sector",
      name: "Civic & Public Service Core",
      subtitle: "Central Barangay Dimagiba Zone (Illustrative)",
      description:
        "Illustrative civic cluster grouping core BICIS administration, GAD information, and resident support services.",
      note: "Illustrative zoning block — not official cadastral boundaries."
    },
    "zone-north": {
      category: "Illustrative Sector",
      name: "Northern Community Cluster",
      subtitle: "Residential & Assembly Vicinity (Illustrative)",
      description:
        "Illustrative neighborhood cluster situated near the north corridor and emergency assembly ground.",
      note: "Illustrative zoning block — not official barangay boundaries."
    },
    "zone-south": {
      category: "Illustrative Sector",
      name: "Southern Community Cluster",
      subtitle: "Neighborhood & Social Services Area (Illustrative)",
      description:
        "Illustrative community area bordering the social welfare center and multi-purpose gathering space.",
      note: "Illustrative zoning block — not official barangay boundaries."
    },
    "zone-gulf": {
      category: "Verified Regional Context",
      name: "Toward Albay Gulf (East)",
      subtitle: "Legazpi City Coastal Reference",
      description:
        "Legazpi City, the provincial capital of Albay in Region V (Bicol Region), is a coastal city bordering Albay Gulf. This stylized eastern edge gives directional context only.",
      note: "Verified regional geography (Legazpi City / Albay Gulf); shoreline shape is stylized."
    }
  };

  document.addEventListener("DOMContentLoaded", function () {
    const wrapper = document.getElementById("bicis-map-wrapper");
    const stage = document.getElementById("bicis-map-stage");
    const svg = document.getElementById("bicis-map-svg");
    if (!wrapper || !stage || !svg) return;

    const tooltip = document.getElementById("map-cursor-tooltip");
    const tooltipCat = document.getElementById("tooltip-category");
    const tooltipTitle = document.getElementById("tooltip-title");
    const tooltipMeta = document.getElementById("tooltip-meta");

    const zoomInBtn = document.getElementById("map-zoom-in");
    const zoomOutBtn = document.getElementById("map-zoom-out");
    const resetBtn = document.getElementById("map-reset");
    const fullscreenBtn = document.getElementById("map-fullscreen");
    const zoomReadout = document.getElementById("map-zoom-readout");

    const locationCardTitle = document.getElementById("location-card-title");
    const locationCardSub = document.getElementById("location-card-sub");
    const locationCardStatus = document.getElementById("location-card-status-text");

    const detailPanel = document.getElementById("map-detail-panel");
    const detailTag = document.getElementById("map-detail-tag");
    const detailTitle = document.getElementById("map-detail-title");
    const detailDesc = document.getElementById("map-detail-desc");
    const detailNote = document.getElementById("map-detail-disclaimer");
    const detailCloseBtn = document.getElementById("map-detail-close");

    const MIN_SCALE = 0.8;
    const MAX_SCALE = 2.6;
    const ZOOM_STEP = 0.25;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isTouchPointer = window.matchMedia("(hover: none)").matches;

    let scale = 1;
    let panX = 0;
    let panY = 0;

    let isDragging = false;
    let dragMoved = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let originPanX = 0;
    let originPanY = 0;

    let selectedElement = null;
    let hoveredFeatureId = null;

    /* ----------------------------------------------------------------------
       Transform, Pan Clamping, and Zoom-Level Detail Visibility
       ---------------------------------------------------------------------- */
    function clampPan() {
      const rect = wrapper.getBoundingClientRect();
      const maxOffsetX = Math.max(90, rect.width * 0.45 * scale);
      const maxOffsetY = Math.max(80, rect.height * 0.42 * scale);

      panX = Math.max(-maxOffsetX, Math.min(maxOffsetX, panX));
      panY = Math.max(-maxOffsetY, Math.min(maxOffsetY, panY));
    }

    function applyTransform() {
      clampPan();
      stage.style.transform =
        "translate3d(" + panX.toFixed(1) + "px, " + panY.toFixed(1) + "px, 0) scale(" + scale.toFixed(2) + ")";

      if (zoomReadout) {
        zoomReadout.textContent = Math.round(scale * 100) + "%";
      }

      if (zoomInBtn) zoomInBtn.disabled = scale >= MAX_SCALE - 0.01;
      if (zoomOutBtn) zoomOutBtn.disabled = scale <= MIN_SCALE + 0.01;

      wrapper.classList.toggle("zoom-detail-med", scale >= 1.2);
      wrapper.classList.toggle("zoom-detail-high", scale >= 1.55);
    }

    function zoomBy(delta) {
      const nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, +(scale + delta).toFixed(2)));
      if (nextScale === scale) return;

      // Scale pan proportionally so the current map center stays anchored
      const ratio = nextScale / scale;
      panX *= ratio;
      panY *= ratio;
      scale = nextScale;
      applyTransform();
    }

    function resetView() {
      scale = 1;
      panX = 0;
      panY = 0;
      applyTransform();
      clearSelection();
    }

    /* ----------------------------------------------------------------------
       MDX-Inspired Smooth Cursor-Following Tooltip (requestAnimationFrame)
       ---------------------------------------------------------------------- */
    let targetTipX = 0;
    let targetTipY = 0;
    let currentTipX = 0;
    let currentTipY = 0;
    let tipRafId = null;
    let tipVisible = false;

    function positionTooltipInstant(x, y) {
      currentTipX = x;
      currentTipY = y;
      if (tooltip) {
        tooltip.style.transform = "translate3d(" + x.toFixed(1) + "px, " + y.toFixed(1) + "px, 0)";
      }
    }

    function computeTooltipCoords(clientX, clientY) {
      const rect = wrapper.getBoundingClientRect();
      const tipW = tooltip ? tooltip.offsetWidth || 220 : 220;
      const tipH = tooltip ? tooltip.offsetHeight || 74 : 74;
      const pad = 16;

      let x = clientX - rect.left + 16;
      let y = clientY - rect.top - tipH - 12;

      if (x + tipW + pad > rect.width) {
        x = clientX - rect.left - tipW - 16;
      }
      if (x < pad) x = pad;

      if (y < pad) {
        y = clientY - rect.top + 20;
      }
      if (y + tipH + pad > rect.height) {
        y = rect.height - tipH - pad;
      }

      return { x: x, y: y };
    }

    function animateTooltip() {
      if (!tipVisible || !tooltip) {
        tipRafId = null;
        return;
      }

      const ease = reducedMotion ? 1 : 0.22;
      currentTipX += (targetTipX - currentTipX) * ease;
      currentTipY += (targetTipY - currentTipY) * ease;

      tooltip.style.transform =
        "translate3d(" + currentTipX.toFixed(1) + "px, " + currentTipY.toFixed(1) + "px, 0)";

      if (Math.abs(targetTipX - currentTipX) > 0.35 || Math.abs(targetTipY - currentTipY) > 0.35) {
        tipRafId = window.requestAnimationFrame(animateTooltip);
      } else {
        tipRafId = null;
      }
    }

    function showTooltipForFeature(featureId, clientX, clientY) {
      if (!tooltip || isTouchPointer || isDragging) return;
      const info = MAP_FEATURES[featureId];
      if (!info) return;

      if (tooltipCat) tooltipCat.textContent = info.category;
      if (tooltipTitle) tooltipTitle.textContent = info.name;
      if (tooltipMeta) tooltipMeta.textContent = info.subtitle;

      const coords = computeTooltipCoords(clientX, clientY);
      targetTipX = coords.x;
      targetTipY = coords.y;

      if (!tipVisible) {
        positionTooltipInstant(coords.x, coords.y);
        tipVisible = true;
        tooltip.classList.add("is-visible");
      } else if (!tipRafId) {
        tipRafId = window.requestAnimationFrame(animateTooltip);
      }
    }

    function hideTooltip() {
      tipVisible = false;
      hoveredFeatureId = null;
      if (tooltip) {
        tooltip.classList.remove("is-visible");
      }
      if (tipRafId) {
        window.cancelAnimationFrame(tipRafId);
        tipRafId = null;
      }
    }

    /* ----------------------------------------------------------------------
       Feature Selection & Floating Location Card Sync
       ---------------------------------------------------------------------- */
    function updateLocationCard(feature) {
      if (!locationCardTitle || !locationCardSub) return;

      if (!feature || feature === MAP_FEATURES["dimagiba-center"]) {
        locationCardTitle.textContent = "BARANGAY DIMAGIBA";
        locationCardSub.textContent = "Legazpi City, Albay, Philippines";
        if (locationCardStatus) locationCardStatus.textContent = "Active Community Focus";
      } else {
        locationCardTitle.textContent = feature.name;
        locationCardSub.textContent = "Barangay Dimagiba · Legazpi City, Albay";
        if (locationCardStatus) locationCardStatus.textContent = feature.category;
      }
    }

    function selectFeature(el) {
      if (!el) return;
      const featureId = el.getAttribute("data-feature-id");
      const info = MAP_FEATURES[featureId];
      if (!info) return;

      if (selectedElement) {
        selectedElement.classList.remove("is-selected");
      }

      selectedElement = el;
      selectedElement.classList.add("is-selected");
      wrapper.classList.add("has-selection");

      updateLocationCard(info);

      if (detailPanel) {
        if (detailTag) detailTag.textContent = info.category;
        if (detailTitle) detailTitle.textContent = info.name;
        if (detailDesc) detailDesc.textContent = info.description;
        if (detailNote) detailNote.textContent = info.note;
        detailPanel.classList.add("is-open");
        detailPanel.setAttribute("aria-hidden", "false");
      }
    }

    function clearSelection() {
      if (selectedElement) {
        selectedElement.classList.remove("is-selected");
        selectedElement = null;
      }
      wrapper.classList.remove("has-selection");
      updateLocationCard(null);

      if (detailPanel) {
        detailPanel.classList.remove("is-open");
        detailPanel.setAttribute("aria-hidden", "true");
      }
    }

    /* ----------------------------------------------------------------------
       Interactive SVG Feature Listeners (Hover, Click, Keyboard)
       ---------------------------------------------------------------------- */
    const interactiveElements = svg.querySelectorAll("[data-feature-id]");

    interactiveElements.forEach(function (el) {
      const featureId = el.getAttribute("data-feature-id");

      el.addEventListener("mouseenter", function (event) {
        if (isDragging || isTouchPointer) return;
        hoveredFeatureId = featureId;
        el.classList.add("is-hovered");
        showTooltipForFeature(featureId, event.clientX, event.clientY);
      });

      el.addEventListener("mousemove", function (event) {
        if (isDragging || isTouchPointer) return;
        if (hoveredFeatureId === featureId) {
          showTooltipForFeature(featureId, event.clientX, event.clientY);
        }
      });

      el.addEventListener("mouseleave", function () {
        el.classList.remove("is-hovered");
        if (hoveredFeatureId === featureId) {
          hideTooltip();
        }
      });

      el.addEventListener("click", function (event) {
        if (dragMoved) return;
        event.stopPropagation();
        selectFeature(el);
      });

      el.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectFeature(el);
        }
      });
    });

    /* ----------------------------------------------------------------------
       Mouse & Touch Panning
       ---------------------------------------------------------------------- */
    function startPan(clientX, clientY) {
      isDragging = true;
      dragMoved = false;
      dragStartX = clientX;
      dragStartY = clientY;
      originPanX = panX;
      originPanY = panY;
      wrapper.classList.add("is-dragging");
      hideTooltip();
    }

    function movePan(clientX, clientY) {
      if (!isDragging) return;
      const dx = clientX - dragStartX;
      const dy = clientY - dragStartY;

      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        dragMoved = true;
      }

      panX = originPanX + dx;
      panY = originPanY + dy;
      applyTransform();
    }

    function endPan() {
      if (!isDragging) return;
      isDragging = false;
      wrapper.classList.remove("is-dragging");
      // Reset dragMoved shortly after click fires
      window.setTimeout(function () {
        dragMoved = false;
      }, 30);
    }

    wrapper.addEventListener("mousedown", function (event) {
      if (event.button !== 0) return;
      if (event.target.closest(".map-controls, .map-detail-panel, .map-location-card, .map-badge-pill")) {
        return;
      }
      startPan(event.clientX, event.clientY);
    });

    window.addEventListener("mousemove", function (event) {
      if (isDragging) {
        movePan(event.clientX, event.clientY);
      }
    });

    window.addEventListener("mouseup", endPan);

    wrapper.addEventListener("mouseleave", function () {
      hideTooltip();
    });

    // Touch Panning (Single Finger)
    wrapper.addEventListener(
      "touchstart",
      function (event) {
        if (event.touches.length !== 1) return;
        if (event.target.closest(".map-controls, .map-detail-panel, .map-location-card, .map-badge-pill")) {
          return;
        }
        startPan(event.touches[0].clientX, event.touches[0].clientY);
      },
      { passive: true }
    );

    wrapper.addEventListener(
      "touchmove",
      function (event) {
        if (!isDragging || event.touches.length !== 1) return;
        movePan(event.touches[0].clientX, event.touches[0].clientY);
      },
      { passive: true }
    );

    wrapper.addEventListener("touchend", endPan);

    // Click on empty map canvas dismisses detail panel
    wrapper.addEventListener("click", function (event) {
      if (dragMoved) return;
      if (
        !event.target.closest("[data-feature-id], .map-controls, .map-detail-panel, .map-location-card, .map-badge-pill")
      ) {
        clearSelection();
      }
    });

    /* ----------------------------------------------------------------------
       Dedicated Map Controls (+ / - / Reset / Fullscreen)
       ---------------------------------------------------------------------- */
    if (zoomInBtn) {
      zoomInBtn.addEventListener("click", function () {
        zoomBy(ZOOM_STEP);
      });
    }

    if (zoomOutBtn) {
      zoomOutBtn.addEventListener("click", function () {
        zoomBy(-ZOOM_STEP);
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", resetView);
    }

    if (detailCloseBtn) {
      detailCloseBtn.addEventListener("click", clearSelection);
    }

    // Fullscreen toggle with graceful CSS fallback when native Fullscreen API is blocked
    function toggleFullscreen() {
      const isExpanded = wrapper.classList.contains("is-fullscreen");

      if (!isExpanded) {
        wrapper.classList.add("is-fullscreen");
        document.body.classList.add("no-scroll");
        if (fullscreenBtn) {
          fullscreenBtn.setAttribute("aria-pressed", "true");
          fullscreenBtn.setAttribute("aria-label", "Exit fullscreen map");
        }
        if (wrapper.requestFullscreen) {
          wrapper.requestFullscreen().catch(function () {
            // CSS fixed fullscreen fallback stays active
          });
        }
      } else {
        wrapper.classList.remove("is-fullscreen");
        document.body.classList.remove("no-scroll");
        if (fullscreenBtn) {
          fullscreenBtn.setAttribute("aria-pressed", "false");
          fullscreenBtn.setAttribute("aria-label", "Enter fullscreen map");
        }
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(function () {});
        }
      }
    }

    if (fullscreenBtn) {
      fullscreenBtn.addEventListener("click", toggleFullscreen);
    }

    document.addEventListener("fullscreenchange", function () {
      if (!document.fullscreenElement && wrapper.classList.contains("is-fullscreen")) {
        wrapper.classList.remove("is-fullscreen");
        document.body.classList.remove("no-scroll");
        if (fullscreenBtn) {
          fullscreenBtn.setAttribute("aria-pressed", "false");
          fullscreenBtn.setAttribute("aria-label", "Enter fullscreen map");
        }
      }
    });

    // Keyboard Shortcuts when map has focus
    wrapper.addEventListener("keydown", function (event) {
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        zoomBy(ZOOM_STEP);
      } else if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        zoomBy(-ZOOM_STEP);
      } else if (event.key === "0") {
        event.preventDefault();
        resetView();
      } else if (event.key === "Escape") {
        if (wrapper.classList.contains("is-fullscreen")) {
          toggleFullscreen();
        } else {
          clearSelection();
        }
      }
    });

    // Initial State: Centered on Barangay Dimagiba
    applyTransform();
  });
})();
