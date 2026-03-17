CREATE DATABASE IF NOT EXISTS surgipartner;
USE surgipartner;

select * from users;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
	mobile VARCHAR(20) DEFAULT NULL UNIQUE,
    role VARCHAR(25) DEFAULT NULL,
    department VARCHAR(100),
    profile_picture varchar(500) DEFAULT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    failed_login_attempts INT DEFAULT 0,
	two_factor_secret VARCHAR(255) DEFAULT NULL,
	two_factor_enabled BOOLEAN DEFAULT FALSE,
    reset_token VARCHAR(255) NULL,
    reset_token_expires DATETIME NULL,
    locked_until TIMESTAMP NULL,
    INDEX idx_email (email),
    INDEX idx_username (username),
    INDEX idx_reset_token (reset_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    permission_key VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    is_custom BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_permission (user_id, permission_key),
    INDEX idx_user_id (user_id),
    INDEX idx_permission_key (permission_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Security audit log table
CREATE TABLE IF NOT EXISTS security_audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  event_type VARCHAR(100) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  metadata JSON,
  severity ENUM('INFO', 'WARNING', 'HIGH', 'CRITICAL') DEFAULT 'INFO',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_event_type (event_type),
  INDEX idx_created_at (created_at),
  INDEX idx_severity (severity)
);

-- Session tracking table
CREATE TABLE IF NOT EXISTS active_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  session_token VARCHAR(255) NOT NULL,
  device_fingerprint VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  UNIQUE KEY idx_session_token (session_token),
  INDEX idx_user_id (user_id),
  INDEX idx_expires_at (expires_at)
);



CREATE OR REPLACE VIEW users_safe AS
SELECT 
    id,
    username,
    email,
    created_at,
    updated_at,
    last_login,
    is_active,
    failed_login_attempts,
    locked_until
FROM users;

CREATE TABLE IF NOT EXISTS hospitals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    hospital_type VARCHAR(100),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pin_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'India',
    phone VARCHAR(20),
    email VARCHAR(255),
    contact_person VARCHAR(200),
    contact_person_phone VARCHAR(200),
    notes TEXT,
    operation_theatres INT,
    total_beds INT,
    icu_beds INT,
    commission_rate INT,
    accreditations TEXT,
    gst_number VARCHAR(50),
    bank_name VARCHAR(100),
    branch_name VARCHAR(100),
    ifsc_code VARCHAR(50),
    account_number VARCHAR(50),
    partnership_status ENUM('Active', 'Inactive', 'Pending') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_is_partnership_status (partnership_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS doctors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    license_number VARCHAR(100) UNIQUE,
    specialization VARCHAR(255),
    qualification TEXT,
    experience_years INT,
    consultation_fee DECIMAL(10,2),
    primary_hospital_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (primary_hospital_id) REFERENCES hospitals(id) ON DELETE SET NULL,
    INDEX idx_license (license_number),
    INDEX idx_specialization (specialization),
    INDEX idx_primary_hospital (primary_hospital_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    patient_id VARCHAR(50) UNIQUE NOT NULL,
    medical_record_number VARCHAR(100) UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    age INT NOT NUll,
    gender ENUM('Male', 'Female', 'Other') NOT NULL,
    blood_group VARCHAR(10),
    email VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    alternate_phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'India',
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relation VARCHAR(50),
    primary_doctor_id INT,
    primary_hospital_id INT,
    referred_by_role VARCHAR(50),
    referred_by_id INT,
    uhid VARCHAR(50),
    ip_number VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (primary_doctor_id) REFERENCES doctors(id) ON DELETE SET NULL,
    FOREIGN KEY (primary_hospital_id) REFERENCES hospitals(id) ON DELETE SET NULL,
    INDEX idx_patient_id (patient_id),
    INDEX idx_mrn (medical_record_number),
    INDEX idx_name (first_name, last_name),
    INDEX idx_phone (phone),
    INDEX idx_dob (date_of_birth),
    INDEX idx_referrer (referred_by_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE patients ADD CONSTRAINT fk_patients_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;


CREATE TABLE IF NOT EXISTS patient_allergies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    allergen VARCHAR(255) NOT NULL,
    reaction TEXT,
    severity ENUM('Mild', 'Moderate', 'Severe', 'Life-threatening') DEFAULT 'Moderate',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    INDEX idx_patient (patient_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS patient_medical_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    condition_name VARCHAR(255) NOT NULL,
    diagnosed_date DATE,
    status ENUM('Active', 'Resolved', 'Chronic', 'In Remission') DEFAULT 'Active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    INDEX idx_patient (patient_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS patient_medications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    medication_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    start_date DATE,
    end_date DATE,
    is_ongoing BOOLEAN DEFAULT TRUE,
    prescribed_by_doctor_id INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (prescribed_by_doctor_id) REFERENCES doctors(id) ON DELETE SET NULL,
    INDEX idx_patient (patient_id),
    INDEX idx_ongoing (is_ongoing)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS patient_insurance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    provider_name VARCHAR(255) NOT NULL,
    policy_number VARCHAR(100) NOT NULL,
    group_number VARCHAR(100),
    policy_holder_name VARCHAR(255),
    policy_holder_relation VARCHAR(50),
    validity_start_date DATE,
    validity_end_date DATE,
    coverage_amount DECIMAL(12,2),
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    INDEX idx_patient (patient_id),
    INDEX idx_policy_number (policy_number),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS patient_activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    activity_type ENUM('phone_call', 'email', 'message_sms', 'meeting_video', 'note', 'task_completed') NOT NULL,
    description TEXT NOT NULL,
    duration_minutes INT,
    outcome VARCHAR(255),
    additional_notes TEXT,
    created_by_user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_patient (patient_id),
    INDEX idx_type (activity_type),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Patient Notes Table
CREATE TABLE IF NOT EXISTS patient_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    note_text TEXT NOT NULL,
    created_by_user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_patient (patient_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Patient Documents Table
CREATE TABLE IF NOT EXISTS patient_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(100),
    file_path VARCHAR(500),
    file_size INT,
    uploaded_by_user_id INT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_patient (patient_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Patient Payments Table
CREATE TABLE IF NOT EXISTS patient_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method ENUM('cash', 'card', 'upi', 'bank_transfer', 'insurance') NOT NULL,
    payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'completed',
    transaction_id VARCHAR(100),
    notes TEXT,
    created_by_user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_patient (patient_id),
    INDEX idx_date (payment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hospital_surgeons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hospital_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    designation VARCHAR(100),
    department VARCHAR(100),
    image VARCHAR(500) DEFAULT NULL,
    experience VARCHAR(50) DEFAULT NULL,
    available_timings VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
    INDEX idx_hospital (hospital_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; 

-- Patient Surgeries Table
CREATE TABLE IF NOT EXISTS patient_surgeries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    surgery_type VARCHAR(255) NOT NULL,
    surgery_date DATE,
    surgeon_id INT,
    hospital_id INT,
    hospital_surgeon_id INT,
    status ENUM(
  'consultation_scheduled',
  'consulted',
  'preop_cleared',
  'ot_scheduled',
  'surgery_done',
  'discharge',
  'followup',
  'scheduled',
  'completed',
  'cancelled',
  'postponed'
) DEFAULT 'consultation_scheduled',
    consultation_date DATETIME NULL,
    preop_date DATETIME NULL,
    ot_scheduled_date DATETIME NULL,
    discharge_date DATETIME NULL,
    followup_date DATETIME NULL,
    care_buddy_id INT NULL,
    progress_checklist JSON NULL,
    estimated_cost DECIMAL(10,2) NULL,
    payment_method VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (surgeon_id) REFERENCES doctors(id) ON DELETE SET NULL,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE SET NULL,
    FOREIGN KEY (hospital_surgeon_id) REFERENCES hospital_surgeons(id) ON DELETE SET NULL,
    FOREIGN KEY (care_buddy_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_patient (patient_id),
    INDEX idx_date (surgery_date),
    INDEX idx_status (status),
    INDEX idx_surgeon (surgeon_id),
    INDEX idx_hospital (hospital_id),
    INDEX idx_hospital_surgeon (hospital_surgeon_id),
    INDEX idx_care_buddy (care_buddy_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



CREATE TABLE IF NOT EXISTS visits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    encounter_id VARCHAR(50) UNIQUE NOT NULL,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    hospital_id INT NOT NULL,
    visit_date DATE NOT NULL,
    visit_time TIME NOT NULL,
    visit_type ENUM('Consultation', 'Pre-Op', 'Post-Op', 'Emergency', 'Follow-up') NOT NULL,
    reason_for_visit TEXT,
    chief_complaint TEXT,
    status ENUM('Scheduled', 'Checked-in', 'In-Progress', 'Completed', 'Cancelled', 'No-Show') DEFAULT 'Scheduled',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
    INDEX idx_encounter (encounter_id),
    INDEX idx_patient (patient_id),
    INDEX idx_doctor (doctor_id),
    INDEX idx_visit_date (visit_date),
    INDEX idx_status (status),
    INDEX idx_hospital (hospital_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



CREATE TABLE IF NOT EXISTS machines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    machine_id VARCHAR(50) UNIQUE NOT NULL,
    machine_name VARCHAR(255) NOT NULL,
    manufacturer VARCHAR(255),
    model_number VARCHAR(100),
    serial_number VARCHAR(100) UNIQUE,
    category VARCHAR(100),
    type ENUM('For Sale', 'For Rental') DEFAULT 'For Rental',
	status ENUM('Available', 'Rented', 'Sold', 'Maintenance') DEFAULT 'Available',
    clinic_name VARCHAR(100),
    location varchar(100),
    purchase_date DATE,	
    purchase_price DECIMAL(12,2),
    sale_price DECIMAL(12,2),
	rental_price DECIMAL(12,2),
    rental_start_date DATE,
    rental_end_date DATE,
    assigned_hospitals_id INT,
    assigned_doctor_id INT,
    Manufacturing_year VARCHAR(100),
	warranty_start_date DATE,
	warranty_expiry DATE,
    last_Maintenance_date DATE,
    next_Maintenance_date DATE,
    specifications TEXT,
    notes TEXT,
    image_url VARCHAR(500),
    billing_status ENUM('Unbilled', 'Billed') DEFAULT 'Unbilled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_hospitals_id) REFERENCES hospitals(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_doctor_id) REFERENCES doctors(id) ON DELETE SET NULL,
    INDEX idx_machine_id (machine_id),
    INDEX idx_serial (serial_number),
    INDEX idx_status (status),
    INDEX idx_assigned_hospital (assigned_hospitals_id),
    INDEX idx_assigned_doctor (assigned_doctor_id),
    INDEX idx_billing_status (billing_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS machine_consumables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    machine_id INT NOT NULL,
    consumable_name VARCHAR(255) NOT NULL,
    consumable_code VARCHAR(50),
    current_stock INT DEFAULT 0,
    min_stock_level INT DEFAULT 0,
    unit_of_measure VARCHAR(50),
    unit_cost DECIMAL(10,2),
    last_restocked_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE,
    INDEX idx_machine (machine_id),
    INDEX idx_stock_level (current_stock, min_stock_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;




CREATE TABLE IF NOT EXISTS invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    category ENUM('Surgery', 'Machine Sale', 'Machine Rental', 'Consumables') NOT NULL,
    customer_type ENUM('Patient', 'Hospital', 'Doctor') DEFAULT 'Patient',
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    customer_address TEXT,
    bill_date DATE NOT NULL,
    due_date DATE NOT NULL,
    line_items JSON,
    subtotal DECIMAL(12, 2) DEFAULT 0,
    tax_percentage DECIMAL(5, 2) DEFAULT 18,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    discount_percentage DECIMAL(5, 2) DEFAULT 0,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    tds_percentage DECIMAL(5, 2) DEFAULT 0,
    tds_amount DECIMAL(12, 2) DEFAULT 0,
    uhid VARCHAR(50),
    ip_number VARCHAR(50),
    hospital_id INT,
    total_amount DECIMAL(12, 2) DEFAULT 0,
    paid_amount DECIMAL(12, 2) DEFAULT 0,
    payment_status ENUM('pending', 'partial', 'paid', 'overdue') DEFAULT 'pending',
    payment_history JSON,
    notes TEXT,
    surgery_case_id INT NULL,
    terms_conditions TEXT,
    dispatch_doc_no VARCHAR(100),
    dispatch_through VARCHAR(100),
    destination VARCHAR(255),
    company_bank_name VARCHAR(100),
    company_branch_name VARCHAR(100),
    company_ifsc_code VARCHAR(50),
    company_account_number VARCHAR(50),
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE SET NULL,
    INDEX idx_invoice_number (invoice_number),
    INDEX idx_category (category),
    INDEX idx_payment_status (payment_status),
    INDEX idx_due_date (due_date),
    INDEX idx_customer_name (customer_name),
    INDEX idx_bill_date (bill_date),
    INDEX idx_surgery_case_id (surgery_case_id),
    INDEX idx_hospital_id (hospital_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_trail (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT NOT NULL,
    action ENUM('CREATE', 'UPDATE', 'DELETE', 'VIEW') NOT NULL,
    changes JSON,
    performed_by INT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_performed_by (performed_by),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS leads (
	  id INT AUTO_INCREMENT PRIMARY KEY,
	  name VARCHAR(100) NOT NULL,
	  phone VARCHAR(20) NOT NULL,
	  email VARCHAR(100),
	  city VARCHAR(50) NOT NULL,
	  source VARCHAR(50) NOT NULL,
	  status ENUM('new', 'follow-up', 'converted', 'not-converted', 'dummy') DEFAULT 'new',
	  category ENUM('surgery/patient', 'machines', 'consumables') NOT NULL,
	  surgery_name VARCHAR(100),
	  estimated_amount DECIMAL(10, 2),
	  owner_id INT NOT NULL,
	  notes TEXT,
	  not_converted_reason TEXT,
	  consulted_date DATETIME NULL,
	  next_followup_at TIMESTAMP NULL,
	  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
	  INDEX idx_owner_id (owner_id),
	  INDEX idx_status (status),
	  INDEX idx_category (category),
	  INDEX idx_created_at (created_at),
	  INDEX idx_phone (phone),
	  INDEX idx_next_followup (next_followup_at)
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lead_activities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lead_id INT NOT NULL,
  user_id INT NOT NULL,
  activity_type ENUM('call', 'email', 'meeting', 'note', 'status_change') NOT NULL,
  description TEXT,
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_lead_id (lead_id),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS consumables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_name VARCHAR(255) NOT NULL,
    category ENUM('Surgical', 'Disposable', 'Implant', 'Suture', 'Pharmaceutical', 'PPE', 'Other') NOT NULL DEFAULT 'Other',
    manufacturer VARCHAR(255),
    sku VARCHAR(100) UNIQUE NOT NULL,
    unit VARCHAR(50) NOT NULL COMMENT 'e.g., box, piece, pack',
    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    stock_quantity INT NOT NULL DEFAULT 0,
    reorder_level INT NOT NULL DEFAULT 10,
    monthly_usage INT DEFAULT 0,
    expiry_date DATE,
    batch_number VARCHAR(100),
    storage_location VARCHAR(255),
    description TEXT,
    suppliers TEXT COMMENT 'Comma-separated supplier names',
    image_url VARCHAR(500),
    status ENUM('In Stock', 'Low Stock', 'Out of Stock') GENERATED ALWAYS AS (
        CASE 
            WHEN stock_quantity = 0 THEN 'Out of Stock'
            WHEN stock_quantity <= reorder_level THEN 'Low Stock'
            ELSE 'In Stock'
        END
    ) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_sku (sku),
    INDEX idx_status (status),
    INDEX idx_stock (stock_quantity),
    INDEX idx_expiry (expiry_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hospital_consumables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hospital_id INT NOT NULL,
    consumable_id INT NOT NULL,
    quantity INT NOT NULL,
    selling_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,2) GENERATED ALWAYS AS (quantity * selling_price) STORED,
    assigned_date DATE DEFAULT (CURRENT_DATE),
    assigned_by INT,
    status ENUM('Unbilled', 'Billed') DEFAULT 'Unbilled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
    FOREIGN KEY (consumable_id) REFERENCES consumables(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_hospital (hospital_id),
    INDEX idx_consumable (consumable_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;













CREATE TABLE IF NOT EXISTS lead_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lead_id INT NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(100),
    file_path VARCHAR(500),
    file_size INT,
    uploaded_by_user_id INT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_lead (lead_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;




CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    carebuddy_id INT NULL,
    hospital_id INT NULL,
    doctor_id INT NULL,
    machine_id INT NULL,
    
    carebuddy_rating INT NULL,
    carebuddy_review TEXT NULL,
    
    hospital_rating INT NULL,
    hospital_review TEXT NULL,
    
    doctor_rating INT NULL,
    doctor_review TEXT NULL,
    
    machine_rating INT NULL,
    machine_review TEXT NULL,
    
    company_rating INT NULL,
    company_review TEXT NULL,
    
    overall_rating INT NULL,
    overall_review TEXT NULL,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    INDEX idx_patient (patient_id),
    INDEX idx_carebuddy (carebuddy_id),
    INDEX idx_hospital (hospital_id),
    INDEX idx_doctor (doctor_id),
    INDEX idx_machine (machine_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS lead_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lead_id INT NOT NULL,
    changed_by_user_id INT,
    action_type VARCHAR(50) NOT NULL COMMENT 'e.g. status_change, update, created',
    old_values JSON,
    new_values JSON,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_lead (lead_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS lead_integrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  provider ENUM('facebook', 'google', 'whatsapp', 'website', 'instagram') NOT NULL,
  name VARCHAR(100) NOT NULL,
  webhook_url VARCHAR(255),
  secret_key VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  last_lead_received_at TIMESTAMP NULL,
  total_leads_received INT DEFAULT 0,
  auto_assign BOOLEAN DEFAULT FALSE,
  default_lead_source VARCHAR(100),
  default_assignee_id INT,
  config JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (default_assignee_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_provider (provider)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
