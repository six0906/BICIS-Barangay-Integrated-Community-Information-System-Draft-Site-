# BICIS — Barangay Integrated Community Information System
**Barangay Dimagiba, Legazpi City, Albay, Philippines**

A unified barangay public website and committee operations platform built strictly with **HTML5, CSS3, and Vanilla JavaScript (ES6+)** — zero external frameworks, bundlers, or third-party JS libraries — designed to run directly under **XAMPP (`htdocs/BICIS/`)** and connect to **PHP + MySQL** via `database/bicis_schema.sql`.

---

## Unified Architecture

1. **Public Website (Preserved)**
   - `index.html` — Editorial landing page, interactive 4-slide Service Carousel, interactive Barangay Dimagiba SVG community map, RA 10173 Privacy Notice, and Contact section.
   - `pages/about.html`, `pages/services.html`, `pages/privacy.html`, `pages/login.html`, `pages/register.html`.
2. **Unified Operations Portal (`pages/portal.html` + `js/portal-shell.js` + `css/portal.css`)**
   - Collapsible unified sidebar (`MAIN`, `CORE RECORDS`, `COMMITTEE MODULES`, `ACCOUNT`), Light/Dark theme sync, and a **Proposed Role Preview** switcher (`Admin`, `Registry Encoder`, `GAD Personnel`, `Social Welfare Staff`, `DRRM Officer`, `DRRM Encoder`, `Resident Read-Only`).
3. **Central Resident Registry (`pages/registry.html` + `js/registry.js` + `js/bicis-store.js`)**
   - Single shared data source for `Households -> Families -> Residents`.
   - Expandable household hierarchy, search/filter/sort, multi-step dynamic Add Household wizard, Edit Household modal, Individual Resident Profile modal with live cross-committee links, and role-gated Delete confirmation.
4. **GAD-CARE — Gender & Development (`pages/gad-care.html` + `js/gad-care.js`)**
   - 8 sub-views: Dashboard, Beneficiary Tagging (from Registry, no duplicates), Needs Assessment, Inventory (stock-in/out + low-stock & expiring alerts), Allocation Rules, Kit Release (duplicate-claim check + auto stock deduction + negative-stock guard), Distribution Logs, and Printable Reports.
5. **GABAY — Social Welfare (`pages/gabay.html` + `js/gabay.js`)**
   - 10 sub-views: Dashboard, Programs, Beneficiaries (household enrollment from Registry, no duplicate program enrollment), Aid Records, Senior & PWD Monitoring (derived from Registry), New Assistance Request (Medical & Burial auto-classified Urgent), Request Management (Urgent-first sorting, Approve/Reject, duplicate-period release blocking with previous record display), Printable Certificate of Indigency, Reports & Records, and Profile & Settings.
6. **HANDA+ — DRRM (`pages/handa-plus.html` + `js/handa-plus.js`)**
   - 13 sub-views: Dashboard, Hazard Tagging by Purok, Printable Priority Rescue List (Registry + authorized GAD/GABAY flags), Evacuation Centers, Check-in & Check-out (live occupancy updates), Relief Inventory, Relief Rules, Relief Distribution (red `"Already Received"` duplicate-claim warning + auto deduction), Disaster Events, Alerts & Advisories, Announcements, Printable QR ID Cards (pure-SVG placeholder awaiting QR library approval), and Barangay Map overlay.
   - Resident Phase 1 view is strictly read-only (current alert level, advisories, announcements, evacuation centers, map); incident reporting is intentionally omitted in Phase 1.
7. **Starter MySQL Schema (`database/bicis_schema.sql`)**
   - Normalized relational schema ready to import in phpMyAdmin (`bicis_db`), keeping `households`, `families`, and `residents` as the single source of truth referenced via foreign keys by GAD-CARE, GABAY, and HANDA+.

---

## XAMPP Deployment (Localhost)

1. Copy the entire `BICIS/` folder into `C:\xampp\htdocs\BICIS\`.
2. Start **Apache** and **MySQL** in the XAMPP Control Panel.
3. Open `http://localhost/phpmyadmin`, create or import `BICIS/database/bicis_schema.sql`.
4. Visit `http://localhost/BICIS/index.html` or go straight to the operations portal at `http://localhost/BICIS/pages/portal.html`.

---

## Data Privacy & Honesty Notes (RA 10173)

- **No Sensitive Data in `localStorage`:** Only the Light/Dark theme preference (`bicis-theme`) is stored in `localStorage`. All resident, household, and committee records run in memory for the current browser session only — refreshing resets sample records until connected to PHP/MySQL.
- **Sample Data Notice:** Sample households, purok hazard levels, evacuation center capacities, relief inventory quantities, alert levels, and proposed user roles are clearly labeled as illustrative/sample pending official Barangay Dimagiba validation.
