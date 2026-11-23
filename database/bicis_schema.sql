-- ============================================================================
-- BICIS — Barangay Integrated Community Information System
-- Starter Relational MySQL Schema for XAMPP / phpMyAdmin (InnoDB / UTF8MB4)
-- Barangay Dimagiba, Legazpi City, Albay, Philippines
--
-- ARCHITECTURE PRINCIPLE:
--   `households`, `families`, and `residents` form ONE central Resident Registry.
--   GAD-CARE, GABAY, and HANDA+ reference `resident_id` and `household_id` via
--   foreign keys instead of duplicating resident personal data.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS bicis_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE bicis_db;

-- ============================================================================
-- 1. USERS & PROPOSED ROLE-BASED ACCESS (Subject to Final Barangay Approval)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL, -- Always store PHP password_hash(), never plaintext
  purok VARCHAR(60) NULL,
  role ENUM(
    'admin',
    'registry_encoder',
    'gad_personnel',
    'social_welfare_staff',
    'drrm_officer',
    'drrm_encoder',
    'resident'
  ) NOT NULL DEFAULT 'resident',
  privacy_accepted_at DATETIME NOT NULL,
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================================
-- 2. CENTRAL RESIDENT REGISTRY (Shared Single Source of Truth)
-- ============================================================================
CREATE TABLE IF NOT EXISTS households (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  household_code VARCHAR(32) NOT NULL UNIQUE,
  purok VARCHAR(60) NOT NULL,
  street_house_no VARCHAR(180) NOT NULL,
  address VARCHAR(255) NOT NULL,
  created_by INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_hh_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS families (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  family_code VARCHAR(32) NOT NULL UNIQUE,
  household_id INT UNSIGNED NOT NULL,
  family_head_name VARCHAR(150) NOT NULL,
  is_4ps TINYINT(1) NOT NULL DEFAULT 0,
  is_solo_parent TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_fam_household FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS residents (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  resident_code VARCHAR(32) NOT NULL UNIQUE,
  family_id INT UNSIGNED NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  sex ENUM('Male', 'Female') NOT NULL,
  birthdate DATE NOT NULL,
  civil_status ENUM('Single', 'Married', 'Widowed', 'Separated') NOT NULL DEFAULT 'Single',
  relationship_to_head VARCHAR(80) NOT NULL,
  occupation VARCHAR(120) NULL,
  educational_attainment VARCHAR(120) NULL,
  contact_number VARCHAR(40) NULL,
  voter_status ENUM('Registered Voter', 'Non-Voter') NOT NULL DEFAULT 'Non-Voter',
  resident_status ENUM('Active', 'Transferred', 'Deceased') NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_res_family FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS resident_sectors (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  resident_id INT UNSIGNED NOT NULL,
  sector_tag VARCHAR(80) NOT NULL,
  UNIQUE KEY uq_res_sector (resident_id, sector_tag),
  CONSTRAINT fk_sec_resident FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 3. GAD-CARE TABLES (References residents.id)
-- ============================================================================
CREATE TABLE IF NOT EXISTS gad_beneficiaries (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  resident_id INT UNSIGNED NOT NULL,
  gad_sector VARCHAR(80) NOT NULL,
  priority ENUM('High', 'Medium', 'Standard') NOT NULL DEFAULT 'Standard',
  is_served TINYINT(1) NOT NULL DEFAULT 0,
  notes TEXT NULL,
  tagged_at DATE NOT NULL,
  UNIQUE KEY uq_gad_res_sector (resident_id, gad_sector),
  CONSTRAINT fk_gad_ben_res FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS gad_assessments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  resident_id INT UNSIGNED NOT NULL,
  need_category VARCHAR(120) NOT NULL,
  urgency ENUM('Urgent', 'Standard') NOT NULL DEFAULT 'Standard',
  status ENUM('Pending', 'Completed') NOT NULL DEFAULT 'Pending',
  remarks TEXT NULL,
  assessed_at DATE NOT NULL,
  CONSTRAINT fk_gad_assess_res FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS gad_inventory (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  item_name VARCHAR(150) NOT NULL,
  category VARCHAR(80) NOT NULL,
  stock_qty INT UNSIGNED NOT NULL DEFAULT 0,
  low_stock_threshold INT UNSIGNED NOT NULL DEFAULT 10,
  unit VARCHAR(30) NOT NULL DEFAULT 'kits',
  expiry_date DATE NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS gad_allocation_rules (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  gad_sector VARCHAR(80) NOT NULL,
  inventory_id INT UNSIGNED NOT NULL,
  qty_per_claim INT UNSIGNED NOT NULL DEFAULT 1,
  frequency VARCHAR(50) NOT NULL,
  notes VARCHAR(255) NULL,
  CONSTRAINT fk_gad_rule_inv FOREIGN KEY (inventory_id) REFERENCES gad_inventory(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS gad_distributions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  resident_id INT UNSIGNED NOT NULL,
  inventory_id INT UNSIGNED NOT NULL,
  qty INT UNSIGNED NOT NULL,
  claim_period VARCHAR(30) NOT NULL,
  released_by INT UNSIGNED NULL,
  released_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_gad_claim (resident_id, inventory_id, claim_period),
  CONSTRAINT fk_gad_dist_res FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE RESTRICT,
  CONSTRAINT fk_gad_dist_inv FOREIGN KEY (inventory_id) REFERENCES gad_inventory(id) ON DELETE RESTRICT,
  CONSTRAINT fk_gad_dist_usr FOREIGN KEY (released_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================================
-- 4. GABAY SOCIAL WELFARE TABLES (References households.id & residents.id)
-- ============================================================================
CREATE TABLE IF NOT EXISTS gabay_programs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  program_code VARCHAR(32) NOT NULL UNIQUE,
  program_name VARCHAR(150) NOT NULL,
  category VARCHAR(60) NOT NULL,
  frequency VARCHAR(40) NOT NULL,
  description TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS gabay_enrollments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  household_id INT UNSIGNED NOT NULL,
  program_id INT UNSIGNED NOT NULL,
  enrolled_at DATE NOT NULL,
  status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  UNIQUE KEY uq_gabay_hh_prg (household_id, program_id),
  CONSTRAINT fk_gabay_enr_hh FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE RESTRICT,
  CONSTRAINT fk_gabay_enr_prg FOREIGN KEY (program_id) REFERENCES gabay_programs(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS gabay_requests (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  request_code VARCHAR(32) NOT NULL UNIQUE,
  resident_id INT UNSIGNED NOT NULL,
  household_id INT UNSIGNED NOT NULL,
  program_id INT UNSIGNED NOT NULL,
  request_type ENUM('Medical', 'Burial', 'General') NOT NULL DEFAULT 'General',
  priority ENUM('Urgent', 'Standard') NOT NULL DEFAULT 'Standard',
  assistance_period VARCHAR(30) NOT NULL,
  status ENUM('Pending', 'Approved', 'Released', 'Rejected') NOT NULL DEFAULT 'Pending',
  details TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_gabay_req_res FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE RESTRICT,
  CONSTRAINT fk_gabay_req_hh FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE RESTRICT,
  CONSTRAINT fk_gabay_req_prg FOREIGN KEY (program_id) REFERENCES gabay_programs(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS gabay_aid_records (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  resident_id INT UNSIGNED NOT NULL,
  household_id INT UNSIGNED NOT NULL,
  program_id INT UNSIGNED NOT NULL,
  assistance_period VARCHAR(30) NOT NULL,
  amount_or_item VARCHAR(150) NOT NULL,
  remarks VARCHAR(255) NULL,
  released_by INT UNSIGNED NULL,
  released_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_gabay_aid_dup (resident_id, program_id, assistance_period),
  CONSTRAINT fk_gabay_aid_res FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE RESTRICT,
  CONSTRAINT fk_gabay_aid_hh FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE RESTRICT,
  CONSTRAINT fk_gabay_aid_prg FOREIGN KEY (program_id) REFERENCES gabay_programs(id) ON DELETE RESTRICT,
  CONSTRAINT fk_gabay_aid_usr FOREIGN KEY (released_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================================
-- 5. HANDA+ DRRM TABLES (References households.id & residents.id)
-- ============================================================================
CREATE TABLE IF NOT EXISTS handa_hazards (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  purok VARCHAR(60) NOT NULL UNIQUE,
  hazard_type VARCHAR(150) NOT NULL,
  risk_level ENUM('Low', 'Medium', 'High') NOT NULL DEFAULT 'Low',
  notes VARCHAR(255) NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS handa_evacuation_centers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  center_code VARCHAR(32) NOT NULL UNIQUE,
  center_name VARCHAR(150) NOT NULL,
  address VARCHAR(255) NOT NULL,
  capacity INT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('Open', 'Standby', 'Full', 'Closed') NOT NULL DEFAULT 'Standby',
  contact_details VARCHAR(150) NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS handa_checkins (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  center_id INT UNSIGNED NOT NULL,
  resident_id INT UNSIGNED NOT NULL,
  checked_in_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  checked_out_at DATETIME NULL,
  CONSTRAINT fk_ci_center FOREIGN KEY (center_id) REFERENCES handa_evacuation_centers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ci_resident FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS handa_inventory (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  item_name VARCHAR(150) NOT NULL,
  stock_qty INT UNSIGNED NOT NULL DEFAULT 0,
  low_stock_threshold INT UNSIGNED NOT NULL DEFAULT 20,
  unit VARCHAR(30) NOT NULL DEFAULT 'packs',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS handa_events (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_code VARCHAR(32) NOT NULL UNIQUE,
  event_name VARCHAR(160) NOT NULL,
  hazard_category VARCHAR(80) NOT NULL,
  status ENUM('Active', 'Closed') NOT NULL DEFAULT 'Active',
  started_at DATE NOT NULL,
  notes TEXT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS handa_relief_distributions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id INT UNSIGNED NOT NULL,
  household_id INT UNSIGNED NOT NULL,
  inventory_id INT UNSIGNED NOT NULL,
  qty INT UNSIGNED NOT NULL DEFAULT 1,
  released_by INT UNSIGNED NULL,
  released_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_handa_relief_claim (event_id, household_id, inventory_id),
  CONSTRAINT fk_hrel_evt FOREIGN KEY (event_id) REFERENCES handa_events(id) ON DELETE RESTRICT,
  CONSTRAINT fk_hrel_hh FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE RESTRICT,
  CONSTRAINT fk_hrel_inv FOREIGN KEY (inventory_id) REFERENCES handa_inventory(id) ON DELETE RESTRICT,
  CONSTRAINT fk_hrel_usr FOREIGN KEY (released_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS handa_advisories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  alert_level VARCHAR(120) NOT NULL,
  title VARCHAR(180) NOT NULL,
  body TEXT NOT NULL,
  published_by INT UNSIGNED NULL,
  published_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_hadv_usr FOREIGN KEY (published_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS handa_announcements (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  body TEXT NOT NULL,
  published_by INT UNSIGNED NULL,
  published_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_hann_usr FOREIGN KEY (published_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
