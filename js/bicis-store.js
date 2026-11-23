/* ==========================================================================
   BICIS — Unified Central Data Store (Session Demonstration Layer)
   Single Shared Resident Registry -> Consumed by GAD-CARE, GABAY, HANDA+
   IMPORTANT: Clearly labeled sample data. Never writes personal data or
   passwords to localStorage. Live persistence requires PHP & MySQL (XAMPP).
   ========================================================================== */

(function () {
  "use strict";

  const ROLE_SESSION_KEY = "bicis-preview-role";

  const ROLES = {
    admin: {
      id: "admin",
      label: "Admin (Proposed)",
      short: "Admin",
      permissions: {
        registryRead: true,
        registryWrite: true,
        registryDelete: true,
        gadAccess: true,
        gabayAccess: true,
        handaFull: true,
        handaCheckinRelief: true,
        handaPublish: true,
        residentOnly: false
      }
    },
    registry: {
      id: "registry",
      label: "Registry Encoder (Proposed)",
      short: "Registry Encoder",
      permissions: {
        registryRead: true,
        registryWrite: true,
        registryDelete: false,
        gadAccess: false,
        gabayAccess: false,
        handaFull: false,
        handaCheckinRelief: false,
        handaPublish: false,
        residentOnly: false
      }
    },
    gad: {
      id: "gad",
      label: "GAD Personnel (Proposed)",
      short: "GAD Personnel",
      permissions: {
        registryRead: true,
        registryWrite: false,
        registryDelete: false,
        gadAccess: true,
        gabayAccess: false,
        handaFull: false,
        handaCheckinRelief: false,
        handaPublish: false,
        residentOnly: false
      }
    },
    gabay: {
      id: "gabay",
      label: "Social Welfare Staff (Proposed)",
      short: "GABAY Staff",
      permissions: {
        registryRead: true,
        registryWrite: false,
        registryDelete: false,
        gadAccess: false,
        gabayAccess: true,
        handaFull: false,
        handaCheckinRelief: false,
        handaPublish: false,
        residentOnly: false
      }
    },
    drrm_officer: {
      id: "drrm_officer",
      label: "DRRM Officer (Proposed)",
      short: "DRRM Officer",
      permissions: {
        registryRead: true,
        registryWrite: false,
        registryDelete: false,
        gadAccess: false,
        gabayAccess: false,
        handaFull: true,
        handaCheckinRelief: true,
        handaPublish: true,
        residentOnly: false
      }
    },
    drrm_encoder: {
      id: "drrm_encoder",
      label: "DRRM Encoder (Proposed)",
      short: "DRRM Encoder",
      permissions: {
        registryRead: true,
        registryWrite: false,
        registryDelete: false,
        gadAccess: false,
        gabayAccess: false,
        handaFull: false,
        handaCheckinRelief: true,
        handaPublish: false,
        residentOnly: false
      }
    },
    resident: {
      id: "resident",
      label: "Resident (Phase 1 Read-Only)",
      short: "Resident",
      permissions: {
        registryRead: false,
        registryWrite: false,
        registryDelete: false,
        gadAccess: false,
        gabayAccess: false,
        handaFull: false,
        handaCheckinRelief: false,
        handaPublish: false,
        residentOnly: true
      }
    }
  };

  /* ------------------------------------------------------------------------
     Helper: Calculate Age from ISO Birthdate (relative to 2026-11-21 or today)
     ------------------------------------------------------------------------ */
  function calculateAge(birthdateStr) {
    if (!birthdateStr) return 0;
    const dob = new Date(birthdateStr + "T00:00:00");
    if (isNaN(dob.getTime())) return 0;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return Math.max(0, age);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* ------------------------------------------------------------------------
     1. CENTRAL RESIDENT REGISTRY (Single Source of Truth — Sample Records)
     ------------------------------------------------------------------------ */
  const state = {
    isSampleData: true,
    households: [
      {
        id: "HH-2026-001",
        purok: "Purok 1",
        streetHouseNo: "Sample House 104, Central Path (Illustrative)",
        address: "Purok 1, Barangay Dimagiba, Legazpi City, Albay",
        families: [
          {
            id: "FAM-001-A",
            headName: "Elena M. Reyes",
            is4Ps: true,
            isSoloParent: true,
            members: [
              {
                id: "RES-0001",
                fullName: "Elena M. Reyes",
                sex: "Female",
                birthdate: "1994-05-14",
                civilStatus: "Single",
                relationship: "Family Head",
                occupation: "Home-based Seamstress",
                education: "High School Graduate",
                contact: "0917-000-0101 (Sample)",
                sectors: ["Solo Parent", "Lactating Mother", "Women of Reproductive Age"],
                voterStatus: "Registered Voter",
                status: "Active"
              },
              {
                id: "RES-0002",
                fullName: "Mateo R. Reyes",
                sex: "Male",
                birthdate: "2025-07-18",
                civilStatus: "Single",
                relationship: "Son",
                occupation: "None",
                education: "Not Applicable",
                contact: "0917-000-0101 (Sample)",
                sectors: ["Infant (0-24 mos)"],
                voterStatus: "Non-Voter",
                status: "Active"
              },
              {
                id: "RES-0003",
                fullName: "Lourdes M. Reyes",
                sex: "Female",
                birthdate: "1957-02-09",
                civilStatus: "Widowed",
                relationship: "Mother",
                occupation: "Retired",
                education: "Elementary Graduate",
                contact: "0917-000-0101 (Sample)",
                sectors: ["Senior Citizen", "Elderly Woman"],
                voterStatus: "Registered Voter",
                status: "Active"
              }
            ]
          }
        ]
      },
      {
        id: "HH-2026-002",
        purok: "Purok 2",
        streetHouseNo: "Sample House 218, North Corridor (Illustrative)",
        address: "Purok 2, Barangay Dimagiba, Legazpi City, Albay",
        families: [
          {
            id: "FAM-002-A",
            headName: "Roberto S. Villanueva",
            is4Ps: false,
            isSoloParent: false,
            members: [
              {
                id: "RES-0004",
                fullName: "Roberto S. Villanueva",
                sex: "Male",
                birthdate: "1958-11-02",
                civilStatus: "Married",
                relationship: "Family Head",
                occupation: "Tricycle Operator",
                education: "Vocational",
                contact: "0918-000-0202 (Sample)",
                sectors: ["Senior Citizen", "PWD"],
                voterStatus: "Registered Voter",
                status: "Active"
              },
              {
                id: "RES-0005",
                fullName: "Marites D. Villanueva",
                sex: "Female",
                birthdate: "1962-08-21",
                civilStatus: "Married",
                relationship: "Spouse",
                occupation: "Sari-Sari Storekeeper",
                education: "High School Graduate",
                contact: "0918-000-0202 (Sample)",
                sectors: ["Senior Citizen", "Elderly Woman"],
                voterStatus: "Registered Voter",
                status: "Active"
              }
            ]
          },
          {
            id: "FAM-002-B",
            headName: "Paolo D. Villanueva",
            is4Ps: true,
            isSoloParent: false,
            members: [
              {
                id: "RES-0006",
                fullName: "Paolo D. Villanueva",
                sex: "Male",
                birthdate: "1992-03-11",
                civilStatus: "Married",
                relationship: "Family Head",
                occupation: "Construction Worker",
                education: "High School Graduate",
                contact: "0919-000-0203 (Sample)",
                sectors: [],
                voterStatus: "Registered Voter",
                status: "Active"
              },
              {
                id: "RES-0007",
                fullName: "Clarissa B. Villanueva",
                sex: "Female",
                birthdate: "1996-09-27",
                civilStatus: "Married",
                relationship: "Spouse",
                occupation: "Homemaker",
                education: "College Undergraduate",
                contact: "0919-000-0203 (Sample)",
                sectors: ["Pregnant Woman", "Women of Reproductive Age"],
                voterStatus: "Registered Voter",
                status: "Active"
              }
            ]
          }
        ]
      },
      {
        id: "HH-2026-003",
        purok: "Purok 3",
        streetHouseNo: "Sample House 309, East Connector (Illustrative)",
        address: "Purok 3, Barangay Dimagiba, Legazpi City, Albay",
        families: [
          {
            id: "FAM-003-A",
            headName: "Danilo T. Bautista",
            is4Ps: true,
            isSoloParent: false,
            members: [
              {
                id: "RES-0008",
                fullName: "Danilo T. Bautista",
                sex: "Male",
                birthdate: "1983-06-30",
                civilStatus: "Married",
                relationship: "Family Head",
                occupation: "Fisherfolk",
                education: "Elementary Graduate",
                contact: "0920-000-0304 (Sample)",
                sectors: [],
                voterStatus: "Registered Voter",
                status: "Active"
              },
              {
                id: "RES-0009",
                fullName: "Grace P. Bautista",
                sex: "Female",
                birthdate: "1986-01-19",
                civilStatus: "Married",
                relationship: "Spouse",
                occupation: "Market Vendor",
                education: "High School Graduate",
                contact: "0920-000-0304 (Sample)",
                sectors: ["Women of Reproductive Age"],
                voterStatus: "Registered Voter",
                status: "Active"
              },
              {
                id: "RES-0010",
                fullName: "Jomar P. Bautista",
                sex: "Male",
                birthdate: "2011-04-08",
                civilStatus: "Single",
                relationship: "Son",
                occupation: "Student",
                education: "Junior High School",
                contact: "0920-000-0304 (Sample)",
                sectors: ["PWD"],
                voterStatus: "Non-Voter",
                status: "Active"
              }
            ]
          }
        ]
      },
      {
        id: "HH-2026-004",
        purok: "Purok 4",
        streetHouseNo: "Sample House 412, Inner Loop (Illustrative)",
        address: "Purok 4, Barangay Dimagiba, Legazpi City, Albay",
        families: [
          {
            id: "FAM-004-A",
            headName: "Teresita L. Mendoza",
            is4Ps: false,
            isSoloParent: true,
            members: [
              {
                id: "RES-0011",
                fullName: "Teresita L. Mendoza",
                sex: "Female",
                birthdate: "1979-12-03",
                civilStatus: "Widowed",
                relationship: "Family Head",
                occupation: "Laundry Worker",
                education: "High School Graduate",
                contact: "0921-000-0405 (Sample)",
                sectors: ["Solo Parent", "Women of Reproductive Age"],
                voterStatus: "Registered Voter",
                status: "Active"
              },
              {
                id: "RES-0012",
                fullName: "Angela L. Mendoza",
                sex: "Female",
                birthdate: "2004-10-15",
                civilStatus: "Single",
                relationship: "Daughter",
                occupation: "College Student",
                education: "College Undergraduate",
                contact: "0921-000-0405 (Sample)",
                sectors: ["Women of Reproductive Age"],
                voterStatus: "Registered Voter",
                status: "Active"
              }
            ]
          }
        ]
      },
      {
        id: "HH-2026-005",
        purok: "Purok 5",
        streetHouseNo: "Sample House 521, South Lane (Illustrative)",
        address: "Purok 5, Barangay Dimagiba, Legazpi City, Albay",
        families: [
          {
            id: "FAM-005-A",
            headName: "Arturo G. Navarro",
            is4Ps: false,
            isSoloParent: false,
            members: [
              {
                id: "RES-0013",
                fullName: "Arturo G. Navarro",
                sex: "Male",
                birthdate: "1954-04-22",
                civilStatus: "Married",
                relationship: "Family Head",
                occupation: "Retired Carpenter",
                education: "Elementary Graduate",
                contact: "0922-000-0506 (Sample)",
                sectors: ["Senior Citizen"],
                voterStatus: "Registered Voter",
                status: "Active"
              },
              {
                id: "RES-0014",
                fullName: "Nelia C. Navarro",
                sex: "Female",
                birthdate: "1959-07-04",
                civilStatus: "Married",
                relationship: "Spouse",
                occupation: "Homemaker",
                education: "High School Graduate",
                contact: "0922-000-0506 (Sample)",
                sectors: ["Senior Citizen", "Elderly Woman", "PWD"],
                voterStatus: "Registered Voter",
                status: "Active"
              },
              {
                id: "RES-0015",
                fullName: "Kevin C. Navarro",
                sex: "Male",
                birthdate: "1990-02-17",
                civilStatus: "Single",
                relationship: "Son",
                occupation: "Delivery Rider",
                education: "College Graduate",
                contact: "0922-000-0507 (Sample)",
                sectors: [],
                voterStatus: "Registered Voter",
                status: "Transferred"
              }
            ]
          }
        ]
      }
    ],

    /* ----------------------------------------------------------------------
       2. GAD-CARE STATE (References residentId from Resident Registry)
       ---------------------------------------------------------------------- */
    gadBeneficiaries: [
      { id: "GAD-B-01", residentId: "RES-0007", sector: "Pregnant Woman", priority: "High", served: false, taggedDate: "2026-10-12", notes: "Third trimester prenatal follow-up (Sample)" },
      { id: "GAD-B-02", residentId: "RES-0001", sector: "Lactating Mother", priority: "High", served: true, taggedDate: "2026-10-15", notes: "Breastfeeding support & infant hygiene (Sample)" },
      { id: "GAD-B-03", residentId: "RES-0002", sector: "Infant (0-24 mos)", priority: "High", served: true, taggedDate: "2026-10-15", notes: "Infant care supplies recipient (Sample)" },
      { id: "GAD-B-04", residentId: "RES-0014", sector: "Elderly Woman / PWD", priority: "High", served: false, taggedDate: "2026-10-20", notes: "Mobility assistance & personal care needs (Sample)" },
      { id: "GAD-B-05", residentId: "RES-0011", sector: "Women of Reproductive Age", priority: "Medium", served: false, taggedDate: "2026-10-28", notes: "Menstrual and hygiene kit eligible (Sample)" }
    ],
    gadAssessments: [
      { id: "GAD-A-01", residentId: "RES-0007", needCategory: "Maternity Kit", urgency: "Urgent", status: "Pending", assessedDate: "2026-11-12", remarks: "Due next month; requires maternity & infant starter kit (Sample)" },
      { id: "GAD-A-02", residentId: "RES-0014", needCategory: "Personal Care Supplies", urgency: "Urgent", status: "Pending", assessedDate: "2026-11-15", remarks: "PWD elderly woman needing adult personal care supplies (Sample)" },
      { id: "GAD-A-03", residentId: "RES-0001", needCategory: "Breastfeeding Supplies", urgency: "Standard", status: "Completed", assessedDate: "2026-11-03", remarks: "Released breastfeeding & hygiene kit (Sample)" }
    ],
    gadInventory: [
      { id: "GAD-INV-01", name: "Maternity Kit", category: "Maternity", stock: 14, threshold: 10, unit: "kits", expiryDate: "2027-06-30" },
      { id: "GAD-INV-02", name: "Women's Hygiene Kit", category: "Hygiene", stock: 8, threshold: 12, unit: "kits", expiryDate: "2027-02-15" },
      { id: "GAD-INV-03", name: "Breastfeeding Support Pack", category: "Maternal", stock: 19, threshold: 8, unit: "packs", expiryDate: "2026-12-10" },
      { id: "GAD-INV-04", name: "Infant Care Supply Kit (0-24 mos)", category: "Infant Care", stock: 6, threshold: 10, unit: "kits", expiryDate: "2026-12-18" },
      { id: "GAD-INV-05", name: "Menstrual Care Products", category: "Menstrual", stock: 34, threshold: 15, unit: "packs", expiryDate: "2027-09-01" },
      { id: "GAD-INV-06", name: "Personal Care Supplies (Elderly/PWD)", category: "Personal Care", stock: 11, threshold: 10, unit: "kits", expiryDate: "2027-04-20" }
    ],
    gadRules: [
      { id: "GAD-R-01", sector: "Pregnant Woman", itemId: "GAD-INV-01", qtyPerClaim: 1, frequency: "Per Pregnancy", notes: "1 Maternity Kit per verified expectant mother (Sample Rule)" },
      { id: "GAD-R-02", sector: "Lactating Mother", itemId: "GAD-INV-03", qtyPerClaim: 1, frequency: "Quarterly", notes: "1 Breastfeeding Support Pack per quarter (Sample Rule)" },
      { id: "GAD-R-03", sector: "Infant (0-24 mos)", itemId: "GAD-INV-04", qtyPerClaim: 1, frequency: "Quarterly", notes: "1 Infant Care Supply Kit per infant (Sample Rule)" },
      { id: "GAD-R-04", sector: "Women of Reproductive Age", itemId: "GAD-INV-05", qtyPerClaim: 2, frequency: "Monthly", notes: "2 Menstrual Care Packs per month (Sample Rule)" },
      { id: "GAD-R-05", sector: "Elderly Woman / PWD", itemId: "GAD-INV-06", qtyPerClaim: 1, frequency: "Quarterly", notes: "1 Personal Care Kit per quarter (Sample Rule)" }
    ],
    gadDistributions: [
      { id: "GAD-D-01", residentId: "RES-0001", itemId: "GAD-INV-03", qty: 1, period: "2026-Q4", date: "2026-11-04", officer: "GAD Staff (Sample)" },
      { id: "GAD-D-02", residentId: "RES-0002", itemId: "GAD-INV-04", qty: 1, period: "2026-Q4", date: "2026-11-04", officer: "GAD Staff (Sample)" }
    ],

    /* ----------------------------------------------------------------------
       3. GABAY STATE (References householdId & residentId from Registry)
       ---------------------------------------------------------------------- */
    gabayPrograms: [
      { id: "PRG-4PS", name: "4Ps Household Monitoring", category: "Household", frequency: "Monthly", active: true, description: "Pantawid Pamilyang Pilipino Program coordination & compliance tracking (Sample)." },
      { id: "PRG-SEN", name: "Senior Citizen Social Pension", category: "Senior Citizen", frequency: "Quarterly", active: true, description: "Quarterly pension coordination for indigent senior citizens (Sample)." },
      { id: "PRG-PWD", name: "PWD Benefits & Assistance", category: "PWD", frequency: "Quarterly", active: true, description: "Support assistance and referral services for persons with disabilities (Sample)." },
      { id: "PRG-MED", name: "Emergency Medical Assistance", category: "Medical", frequency: "Per Case", active: true, description: "Urgent medical referral and barangay aid for residents in crisis (Sample)." },
      { id: "PRG-BUR", name: "Burial Assistance Program", category: "Burial", frequency: "Per Case", active: true, description: "Urgent bereavement support for indigent barangay households (Sample)." }
    ],
    gabayEnrollments: [
      { id: "ENR-001", householdId: "HH-2026-001", programId: "PRG-4PS", enrolledDate: "2026-01-18", status: "Active" },
      { id: "ENR-002", householdId: "HH-2026-002", programId: "PRG-SEN", enrolledDate: "2026-02-05", status: "Active" },
      { id: "ENR-003", householdId: "HH-2026-003", programId: "PRG-4PS", enrolledDate: "2026-01-22", status: "Active" },
      { id: "ENR-004", householdId: "HH-2026-003", programId: "PRG-PWD", enrolledDate: "2026-03-10", status: "Active" },
      { id: "ENR-005", householdId: "HH-2026-005", programId: "PRG-SEN", enrolledDate: "2026-02-14", status: "Active" }
    ],
    gabayRequests: [
      { id: "REQ-2026-01", residentId: "RES-0004", householdId: "HH-2026-002", programId: "PRG-MED", requestType: "Medical", priority: "Urgent", period: "2026-Q4", status: "Pending", createdAt: "2026-11-18", details: "Maintenance medication assistance request (Sample)" },
      { id: "REQ-2026-02", residentId: "RES-0011", householdId: "HH-2026-004", programId: "PRG-BUR", requestType: "Burial", priority: "Urgent", period: "2026-Q4", status: "Approved", createdAt: "2026-11-14", details: "Bereavement assistance & Certificate of Indigency request (Sample)" },
      { id: "REQ-2026-03", residentId: "RES-0003", householdId: "HH-2026-001", programId: "PRG-SEN", requestType: "General", priority: "Standard", period: "2026-Q4", status: "Approved", createdAt: "2026-11-10", details: "Q4 Senior Citizen pension release request (Sample)" },
      { id: "REQ-2026-04", residentId: "RES-0010", householdId: "HH-2026-003", programId: "PRG-PWD", requestType: "General", priority: "Standard", period: "2026-Q4", status: "Pending", createdAt: "2026-11-16", details: "PWD educational & mobility benefit application (Sample)" }
    ],
    gabayAidRecords: [
      { id: "AID-2026-01", residentId: "RES-0003", householdId: "HH-2026-001", programId: "PRG-SEN", period: "2026-Q4", amountOrItem: "PHP 1,500 (Sample)", releasedDate: "2026-11-05", remarks: "Q4 Senior Pension already claimed — used to test duplicate block (Sample)" },
      { id: "AID-2026-02", residentId: "RES-0013", householdId: "HH-2026-005", programId: "PRG-SEN", period: "2026-Q4", amountOrItem: "PHP 1,500 (Sample)", releasedDate: "2026-11-06", remarks: "Released at Barangay Hall desk (Sample)" }
    ],

    /* ----------------------------------------------------------------------
       4. HANDA+ STATE (References Registry + Authorized GAD/GABAY Needs)
       NOTE: Clearly labeled sample data awaiting Barangay DRRM confirmation
       ---------------------------------------------------------------------- */
    handaHazards: [
      { purok: "Purok 1", hazardType: "Urban Drainage / Flash Flood (Sample)", riskLevel: "Medium", notes: "Low-lying section near central road — pending official DRRM validation." },
      { purok: "Purok 2", hazardType: "High Wind / Ashfall Exposure (Sample)", riskLevel: "Medium", notes: "Northern residential cluster — pending official DRRM validation." },
      { purok: "Purok 3", hazardType: "Coastal Storm Surge / Flood (Sample)", riskLevel: "High", notes: "Eastern sector toward Albay Gulf — priority pre-emptive evacuation (Sample)." },
      { purok: "Purok 4", hazardType: "Localized Flooding (Sample)", riskLevel: "Low", notes: "Inner loop residential area — pending official DRRM validation." },
      { purok: "Purok 5", hazardType: "Heavy Rain / Runoff (Sample)", riskLevel: "High", notes: "Southern perimeter near creek line — pending official DRRM validation." }
    ],
    handaCenters: [
      {
        id: "EVC-01",
        name: "Dimagiba Multi-Purpose Covered Court (Sample)",
        address: "Civic Core, Barangay Dimagiba, Legazpi City (Illustrative)",
        capacity: 120,
        status: "Open",
        contact: "DRRM Desk Hotline (Sample — Pending Verification)",
        checkedInResidentIds: ["RES-0008", "RES-0009", "RES-0010"]
      },
      {
        id: "EVC-02",
        name: "Dimagiba Elementary School Building A (Sample)",
        address: "North Sector, Barangay Dimagiba, Legazpi City (Illustrative)",
        capacity: 150,
        status: "Standby",
        contact: "School Evacuation Coordinator (Sample — Pending Verification)",
        checkedInResidentIds: []
      },
      {
        id: "EVC-03",
        name: "Barangay Health & Civic Annex (Sample)",
        address: "Central Thoroughfare, Barangay Dimagiba (Illustrative)",
        capacity: 45,
        status: "Open",
        contact: "Priority Medical Shelter Desk (Sample — Pending Verification)",
        checkedInResidentIds: ["RES-0004", "RES-0005"]
      }
    ],
    handaInventory: [
      { id: "DRRM-INV-01", name: "Family Food Pack (3-Day Supply)", stock: 68, threshold: 25, unit: "packs" },
      { id: "DRRM-INV-02", name: "Potable Drinking Water (5L)", stock: 18, threshold: 30, unit: "jugs" },
      { id: "DRRM-INV-03", name: "Emergency Hygiene & Sleeping Kit", stock: 32, threshold: 15, unit: "kits" },
      { id: "DRRM-INV-04", name: "First-Aid & Trauma Refill Pack", stock: 9, threshold: 10, unit: "packs" }
    ],
    handaRules: [
      { id: "HND-R-01", targetGroup: "Standard Household (1-4 members)", itemId: "DRRM-INV-01", qty: 1, notes: "1 Family Food Pack per claim cycle (Sample Rule — Pending DRRM Confirmation)" },
      { id: "HND-R-02", targetGroup: "Large / Multi-Family Household (5+)", itemId: "DRRM-INV-01", qty: 2, notes: "2 Family Food Packs per claim cycle (Sample Rule — Pending DRRM Confirmation)" },
      { id: "HND-R-03", targetGroup: "Priority Household (Senior/PWD/Pregnant/Infant)", itemId: "DRRM-INV-02", qty: 2, notes: "2 Drinking Water Jugs + Priority Queue (Sample Rule)" }
    ],
    handaEvents: [
      { id: "EVT-2026-01", name: "Tropical Depression Advisory — Sample Drill Event", type: "Typhoon / Heavy Rain", status: "Active", startDate: "2026-11-19", notes: "Sample active monitoring event for testing check-in and relief tracking." },
      { id: "EVT-2026-00", name: "Barangay Preparedness Simulation Q3", type: "Preparedness Drill", status: "Closed", startDate: "2026-08-14", notes: "Completed community readiness exercise (Sample)." }
    ],
    handaDistributions: [
      { id: "REL-001", eventId: "EVT-2026-01", householdId: "HH-2026-003", itemId: "DRRM-INV-01", qty: 1, releasedAt: "2026-11-20 09:30", officer: "DRRM Encoder (Sample)" }
    ],
    handaAlerts: {
      currentLevel: "Alert Level 2 — Preparedness & Pre-Emptive Monitoring (Sample)",
      severity: "warning",
      updatedAt: "2026-11-21 08:00",
      advisories: [
        { id: "ADV-01", title: "Moderate to Heavy Rain Monitoring (Sample Advisory)", level: "Level 2", date: "2026-11-21", body: "Residents in Purok 3 and Purok 5 are advised to keep emergency go-bags ready and monitor official Barangay Dimagiba DRRM bulletins. (Sample text pending DRRM confirmation.)" },
        { id: "ADV-02", title: "Evacuation Center Readiness Check (Sample Advisory)", level: "Level 1", date: "2026-11-19", body: "Multi-Purpose Covered Court and Civic Annex are open for priority evacuees during this sample monitoring scenario." }
      ]
    },
    handaAnnouncements: [
      { id: "ANN-01", title: "Barangay Preparedness & Go-Bag Orientation (Sample)", date: "2026-11-20", author: "Barangay DRRM Committee (Sample)", body: "All Purok leaders and residents are encouraged to verify household sector tags at the BICIS Resident Registry desk." },
      { id: "ANN-02", title: "Priority Rescue Verification Reminder (Sample)", date: "2026-11-17", author: "Barangay Dimagiba Office (Sample)", body: "Households with Senior Citizens, PWDs, pregnant women, or infants are requested to confirm updated contact numbers." }
    ],
    activityLog: [
      { time: "2026-11-20 09:30", module: "HANDA+", text: "Released 1 Family Food Pack to HH-2026-003 (Sample)" },
      { time: "2026-11-18 14:15", module: "GABAY", text: "Urgent Medical request REQ-2026-01 queued for RES-0004 (Sample)" },
      { time: "2026-11-15 10:40", module: "GAD-CARE", text: "Urgent assessment GAD-A-02 logged for RES-0014 (Sample)" },
      { time: "2026-11-04 11:05", module: "GAD-CARE", text: "Breastfeeding & Infant kits released to HH-2026-001 (Sample)" }
    ]
  };

  /* ------------------------------------------------------------------------
     Shared Query & Mutation API
     ------------------------------------------------------------------------ */
  function getCurrentRoleKey() {
    try {
      const saved = sessionStorage.getItem(ROLE_SESSION_KEY);
      return saved && ROLES[saved] ? saved : "admin";
    } catch (e) {
      return "admin";
    }
  }

  function setCurrentRoleKey(roleKey) {
    if (!ROLES[roleKey]) return;
    try {
      sessionStorage.setItem(ROLE_SESSION_KEY, roleKey);
    } catch (e) {}
  }

  function getCurrentRole() {
    return ROLES[getCurrentRoleKey()];
  }

  function logActivity(moduleName, text) {
    const now = new Date();
    const stamp =
      now.getFullYear() +
      "-" +
      String(now.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(now.getDate()).padStart(2, "0") +
      " " +
      String(now.getHours()).padStart(2, "0") +
      ":" +
      String(now.getMinutes()).padStart(2, "0");
    state.activityLog.unshift({ time: stamp, module: moduleName, text: text });
    if (state.activityLog.length > 25) state.activityLog.pop();
  }

  function getAllResidents() {
    const list = [];
    state.households.forEach(function (hh) {
      hh.families.forEach(function (fam) {
        fam.members.forEach(function (m) {
          list.push(
            Object.assign({}, m, {
              age: calculateAge(m.birthdate),
              householdId: hh.id,
              purok: hh.purok,
              address: hh.address,
              familyId: fam.id,
              familyHead: fam.headName,
              is4Ps: fam.is4Ps,
              isSoloParent: fam.isSoloParent
            })
          );
        });
      });
    });
    return list;
  }

  function getResidentById(residentId) {
    return getAllResidents().find(function (r) {
      return r.id === residentId;
    }) || null;
  }

  function getHouseholdById(householdId) {
    return state.households.find(function (h) {
      return h.id === householdId;
    }) || null;
  }

  function getHouseholdMemberCount(hh) {
    return hh.families.reduce(function (sum, f) {
      return sum + f.members.length;
    }, 0);
  }

  function getRegistryMetrics() {
    const residents = getAllResidents();
    let totalFamilies = 0;
    state.households.forEach(function (h) {
      totalFamilies += h.families.length;
    });
    return {
      households: state.households.length,
      families: totalFamilies,
      residents: residents.length,
      activeResidents: residents.filter(function (r) { return r.status === "Active"; }).length,
      seniors: residents.filter(function (r) { return r.sectors.includes("Senior Citizen") || r.age >= 60; }).length,
      pwds: residents.filter(function (r) { return r.sectors.includes("PWD"); }).length
    };
  }

  function generateNextId(prefix, existingIds) {
    let maxNum = 0;
    existingIds.forEach(function (id) {
      const m = String(id).match(/(\d+)$/);
      if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    });
    return prefix + String(maxNum + 1).padStart(3, "0");
  }

  function addHousehold(householdObj) {
    const existingResIds = getAllResidents().map(function (r) { return r.id; });
    let resSeq = existingResIds.length;

    const newId = generateNextId("HH-2026-", state.households.map(function (h) { return h.id; }));
    const families = householdObj.families.map(function (fam, fIdx) {
      const famId = "FAM-" + newId.slice(-3) + "-" + String.fromCharCode(65 + fIdx);
      const members = fam.members.map(function (mem) {
        resSeq += 1;
        return Object.assign({}, mem, {
          id: "RES-" + String(resSeq).padStart(4, "0")
        });
      });
      return {
        id: famId,
        headName: fam.headName || (members[0] ? members[0].fullName : "Unassigned"),
        is4Ps: Boolean(fam.is4Ps),
        isSoloParent: Boolean(fam.isSoloParent),
        members: members
      };
    });

    const record = {
      id: newId,
      purok: householdObj.purok,
      streetHouseNo: householdObj.streetHouseNo,
      address: householdObj.address || householdObj.purok + ", Barangay Dimagiba, Legazpi City, Albay",
      families: families
    };

    state.households.unshift(record);
    logActivity("Registry", "Registered household " + newId + " (" + record.purok + ") in session preview");
    return record;
  }

  function updateHousehold(id, updates) {
    const hh = getHouseholdById(id);
    if (!hh) return false;
    hh.purok = updates.purok;
    hh.streetHouseNo = updates.streetHouseNo;
    hh.address = updates.address;
    logActivity("Registry", "Updated household details for " + id);
    return true;
  }

  function deleteHousehold(id) {
    const idx = state.households.findIndex(function (h) { return h.id === id; });
    if (idx === -1) return false;
    state.households.splice(idx, 1);
    logActivity("Registry", "Deleted household " + id + " from session preview");
    return true;
  }

  function updateResidentStatus(residentId, newStatus) {
    for (let i = 0; i < state.households.length; i++) {
      const fams = state.households[i].families;
      for (let j = 0; j < fams.length; j++) {
        const mem = fams[j].members.find(function (m) { return m.id === residentId; });
        if (mem) {
          mem.status = newStatus;
          logActivity("Registry", "Updated " + mem.fullName + " status to " + newStatus);
          return true;
        }
      }
    }
    return false;
  }

  /* Cross-Committee Helper: Priority Households for HANDA+ (uses Registry + GAD + GABAY) */
  function getPriorityRescueHouseholds() {
    const hazardMap = {};
    state.handaHazards.forEach(function (hz) {
      hazardMap[hz.purok] = hz;
    });

    return state.households
      .map(function (hh) {
        const members = [];
        let has4Ps = false;
        let hasSolo = false;
        hh.families.forEach(function (f) {
          if (f.is4Ps) has4Ps = true;
          if (f.isSoloParent) hasSolo = true;
          f.members.forEach(function (m) {
            if (m.status === "Active") {
              members.push(Object.assign({}, m, { age: calculateAge(m.birthdate) }));
            }
          });
        });

        const reasons = [];
        const seniors = members.filter(function (m) { return m.sectors.includes("Senior Citizen") || m.age >= 60; });
        const pwds = members.filter(function (m) { return m.sectors.includes("PWD"); });
        const pregnant = members.filter(function (m) { return m.sectors.includes("Pregnant Woman"); });
        const infants = members.filter(function (m) { return m.sectors.includes("Infant (0-24 mos)") || m.age <= 2; });
        const gadTagged = members.filter(function (m) {
          return state.gadBeneficiaries.some(function (b) { return b.residentId === m.id && b.priority === "High"; });
        });
        const gabayUrgent = state.gabayRequests.some(function (q) {
          return q.householdId === hh.id && q.priority === "Urgent" && q.status !== "Rejected";
        });

        if (pwds.length) reasons.push(pwds.length + " PWD");
        if (seniors.length) reasons.push(seniors.length + " Senior");
        if (pregnant.length) reasons.push(pregnant.length + " Pregnant");
        if (infants.length) reasons.push(infants.length + " Infant");
        if (gadTagged.length) reasons.push("GAD High-Priority");
        if (gabayUrgent) reasons.push("GABAY Urgent Aid");
        if (hasSolo) reasons.push("Solo Parent");
        if (has4Ps) reasons.push("4Ps Household");

        const hz = hazardMap[hh.purok] || { riskLevel: "Low", hazardType: "Unassigned" };
        let score = pwds.length * 3 + pregnant.length * 3 + infants.length * 2 + seniors.length * 2 + gadTagged.length * 2;
        if (hz.riskLevel === "High") score += 4;
        else if (hz.riskLevel === "Medium") score += 2;
        if (gabayUrgent) score += 2;

        return {
          household: hh,
          activeMembers: members.length,
          headName: hh.families[0] ? hh.families[0].headName : "N/A",
          contact: members[0] ? members[0].contact : "N/A",
          hazardLevel: hz.riskLevel,
          hazardType: hz.hazardType,
          reasons: reasons,
          priorityScore: score,
          tier: score >= 7 ? "Critical" : score >= 4 ? "High" : "Standard"
        };
      })
      .filter(function (row) { return row.reasons.length > 0 || row.hazardLevel === "High"; })
      .sort(function (a, b) { return b.priorityScore - a.priorityScore; });
  }

  window.BICIS_STORE = {
    state: state,
    ROLES: ROLES,
    getCurrentRoleKey: getCurrentRoleKey,
    setCurrentRoleKey: setCurrentRoleKey,
    getCurrentRole: getCurrentRole,
    calculateAge: calculateAge,
    escapeHtml: escapeHtml,
    logActivity: logActivity,
    getAllResidents: getAllResidents,
    getResidentById: getResidentById,
    getHouseholdById: getHouseholdById,
    getHouseholdMemberCount: getHouseholdMemberCount,
    getRegistryMetrics: getRegistryMetrics,
    generateNextId: generateNextId,
    addHousehold: addHousehold,
    updateHousehold: updateHousehold,
    deleteHousehold: deleteHousehold,
    updateResidentStatus: updateResidentStatus,
    getPriorityRescueHouseholds: getPriorityRescueHouseholds
  };
})();
