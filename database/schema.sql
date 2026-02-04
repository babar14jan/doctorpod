-- ====================================================
-- DoctorPod SQLite Schema - Full End-to-End 
-- Industry Standard Naming Convention (Plural Tables)
-- ====================================================

-- ===========================
-- 1. Admins Table
-- ===========================
CREATE TABLE IF NOT EXISTS admins (
    admin_id TEXT PRIMARY KEY, -- e.g., Auto-generated unique ID first 4 letters of name + last 4 digits of mobile
    name TEXT NOT NULL,
    mobile TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    password TEXT NOT NULL,  -- plain text 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ===========================
-- 1.5 Demo Requests Table
-- ===========================
CREATE TABLE IF NOT EXISTS demo_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clinic_name TEXT NOT NULL,
    contact_person TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    city TEXT NOT NULL,
    message TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'contacted', 'scheduled', 'completed', 'rejected'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_by TEXT, -- admin_id who reviewed
    reviewed_at DATETIME
);

-- ===========================
-- 2. Clinics Table
-- ===========================
CREATE TABLE IF NOT EXISTS clinics (
    clinic_id TEXT PRIMARY KEY, -- e.g., Auto-generated unique ID first 4 char of name + last 6 of phone
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    email TEXT,
    address TEXT,
    password TEXT NOT NULL,  -- plain text 
    owner_name TEXT, -- Contact person / Dr. name
    upi_id TEXT, -- UPI ID for payments
    qr_code_path TEXT, -- Path to the QR code image
    is_active INTEGER DEFAULT 1,
    logo_path TEXT,
    latitude REAL,
    longitude REAL,
    subscription_type TEXT DEFAULT 'trial', -- 'trial' or 'paid'
    trial_start_date DATETIME,
    trial_end_date DATETIME,
    is_trial_expired INTEGER DEFAULT 0, -- 0 = active, 1 = expired
    enable_voice_prescription INTEGER DEFAULT 0, -- 0 = disabled, 1 = enabled (admin controls)
    enable_video_consultation INTEGER DEFAULT 0, -- 0 = disabled, 1 = enabled (admin controls)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    source TEXT -- Who added (admin)
);

-- ===========================
-- 3. Doctors Table
-- ===========================
CREATE TABLE IF NOT EXISTS doctors (
    doctor_id TEXT PRIMARY KEY,  -- Auto-generated unique ID (first 4 char of name + last 6 of mobile)
    clinic_id TEXT NOT NULL, -- link to clinics.clinic_id
    name TEXT NOT NULL,
    qualification TEXT,
    specialization TEXT,
    mobile TEXT UNIQUE NOT NULL,
    email TEXT,
    password TEXT NOT NULL,  -- plain text password 
    registration_no TEXT, -- Can be null
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    source TEXT, -- Who added (admin/clinic)
    FOREIGN KEY (clinic_id) REFERENCES clinics(clinic_id)
);

-- ===========================
-- 4. Patients Table
-- ===========================
CREATE TABLE IF NOT EXISTS patients (
    patient_id TEXT PRIMARY KEY,      -- first 4 char of name + last 6 of mobile
    full_name TEXT NOT NULL,
    mobile TEXT UNIQUE NOT NULL,
    email TEXT,
    gender TEXT,
    date_of_birth TEXT,
    height_cm REAL,
    blood_group TEXT,
    allergies TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


-- ===========================
-- 5. Availability Slots Table (Doctor Availability)
-- ===========================
CREATE TABLE IF NOT EXISTS availability_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,  -- unique auto-increment ID
    doctor_id TEXT NOT NULL, -- link to doctors.doctor_id
    clinic_id TEXT NOT NULL, -- link to clinics.clinic_id
    day_of_week TEXT NOT NULL, -- e.g., Monday, Mon
    start_time TEXT NOT NULL,  -- '09:00'
    end_time TEXT NOT NULL,    -- '17:00'
    interval_minutes INTEGER DEFAULT 10,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    source TEXT, -- Who added (admin/clinic)
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id),
    FOREIGN KEY (clinic_id) REFERENCES clinics(clinic_id)
);

-- ===========================
-- 6. Bookings Table (Appointments)
-- ===========================
CREATE TABLE IF NOT EXISTS bookings (
    appointment_id TEXT PRIMARY KEY,        -- Auto-generated unique ID (patient_name 4 char + Timestamp ddmmyyHHMMSS)
    doctor_id TEXT NOT NULL,                -- Link to doctors.doctor_id
    clinic_id TEXT NOT NULL,                -- Link to clinics.clinic_id
    patient_id TEXT NOT NULL,               -- Auto-generated unique ID first 4 char of name + last 6 of mobile
    patient_name TEXT NOT NULL,
    patient_mobile TEXT NOT NULL,
    patient_age INTEGER,
    patient_gender TEXT,                    -- Optional
    blood_group TEXT,                       -- Optional
    appointment_date TEXT NOT NULL,
    queue_number INTEGER,
    appointment_time TEXT,
    consult_status TEXT DEFAULT 'not_seen', -- Values: not_seen/in_progress/seen/no_show/cancelled
    payment_status TEXT DEFAULT 'pending',
    payment_amount REAL,
    payment_method TEXT,
    payment_time DATETIME,
    booking_source TEXT DEFAULT 'online',
    is_video_consultation INTEGER DEFAULT 0, -- 0 = in-person, 1 = video call
    video_call_status TEXT DEFAULT NULL, -- NULL, 'waiting', 'active', 'ended'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id),
    FOREIGN KEY (clinic_id) REFERENCES clinics(clinic_id),
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);


-- ===========================
-- 7. Visits Table (Appointments + Walk-ins)
-- ===========================
CREATE TABLE IF NOT EXISTS visits (
    visit_id TEXT PRIMARY KEY,                 -- patient_name(4) + timestamp
    doctor_id TEXT NOT NULL,                   -- FK → doctors.doctor_id
    clinic_id TEXT NOT NULL,                   -- FK → clinics.clinic_id
    patient_id TEXT NOT NULL,                  -- FK → patients.patient_id
    appointment_id TEXT DEFAULT NULL,          -- NULL for walk-ins

    -- Patient snapshot at visit time
    patient_name TEXT NOT NULL,
    patient_age INTEGER,
    patient_gender TEXT,

    -- Vitals
    patient_weight REAL,
    temperature REAL,
    blood_pressure TEXT,

    -- Medical details
    diagnosis TEXT,
    investigations TEXT, -- Recommended tests/examinations
    advice TEXT,
    consultation_fee REAL,

    -- Follow-up
    follow_up_date TEXT,
    follow_up_notes TEXT,
    is_follow_up INTEGER DEFAULT 0,
    parent_visit_id TEXT,

    -- QR code flag
    include_qr INTEGER DEFAULT 0,

    -- Prescription & metadata
    pres_path TEXT,
    source TEXT,                               -- doctor / clinic / online

    visit_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id),
    FOREIGN KEY (clinic_id) REFERENCES clinics(clinic_id),
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (appointment_id) REFERENCES bookings(appointment_id)
);


-- ===========================
-- 8. Prescription Items Table (Medicines)
-- ===========================
CREATE TABLE IF NOT EXISTS prescription_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,  -- unique auto-increment ID
    visit_id TEXT NOT NULL,    -- Same as visits.visit_id
    doctor_id TEXT NOT NULL,   -- link to visits, visit_medicines.doctor_id MUST == visits.doctor_id      
    medicine_name TEXT NOT NULL,
    dose TEXT,
    frequency TEXT,
    timing TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    source TEXT, -- Who added (doctor)
    FOREIGN KEY (visit_id) REFERENCES visits(visit_id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id)
);


-- ===========================
-- INDEXES for Performance
-- ===========================

-- Booking indexes
CREATE INDEX IF NOT EXISTS idx_bookings_doctor ON bookings(doctor_id);
CREATE INDEX IF NOT EXISTS idx_bookings_clinic ON bookings(clinic_id);
CREATE INDEX IF NOT EXISTS idx_bookings_patient ON bookings(patient_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(appointment_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(consult_status);
CREATE INDEX IF NOT EXISTS idx_bookings_doctor_date ON bookings(doctor_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_bookings_clinic_date ON bookings(clinic_id, appointment_date);

-- Visit indexes
CREATE INDEX IF NOT EXISTS idx_visits_doctor ON visits(doctor_id);
CREATE INDEX IF NOT EXISTS idx_visits_clinic ON visits(clinic_id);
CREATE INDEX IF NOT EXISTS idx_visits_patient ON visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(visit_time);

-- Availability indexes
CREATE INDEX IF NOT EXISTS idx_availability_doctor ON availability_slots(doctor_id);
CREATE INDEX IF NOT EXISTS idx_availability_day ON availability_slots(day_of_week);
CREATE INDEX IF NOT EXISTS idx_availability_doctor_day ON availability_slots(doctor_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_availability_clinic ON availability_slots(clinic_id);

-- Prescription items indexes
CREATE INDEX IF NOT EXISTS idx_prescription_items_visit ON prescription_items(visit_id);


-- ===========================
-- 9. Audit Logs Table
-- ===========================
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL,           -- INSERT/UPDATE/DELETE
    old_values TEXT,                -- JSON string
    new_values TEXT,                -- JSON string
    user_id TEXT,
    user_type TEXT,                 -- admin/clinic/doctor/patient
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id, user_type);


-- ===========================
-- 10. Daily Analytics Table
-- ===========================
CREATE TABLE IF NOT EXISTS daily_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,             -- YYYY-MM-DD
    doctor_id TEXT,
    clinic_id TEXT,
    total_bookings INTEGER DEFAULT 0,
    completed_visits INTEGER DEFAULT 0,
    cancelled INTEGER DEFAULT 0,
    no_shows INTEGER DEFAULT 0,
    walk_ins INTEGER DEFAULT 0,
    total_revenue REAL DEFAULT 0,
    avg_consultation_fee REAL,
    unique_patients INTEGER DEFAULT 0,
    new_patients INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, doctor_id, clinic_id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id),
    FOREIGN KEY (clinic_id) REFERENCES clinics(clinic_id)
);

CREATE INDEX IF NOT EXISTS idx_analytics_date ON daily_analytics(date);
CREATE INDEX IF NOT EXISTS idx_analytics_doctor ON daily_analytics(doctor_id, date);
CREATE INDEX IF NOT EXISTS idx_analytics_clinic ON daily_analytics(clinic_id, date);


-- ===========================
-- 11. Notifications Table
-- ===========================
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,             -- booking_confirm/reminder/prescription/follow_up/cancellation
    channel TEXT NOT NULL,          -- whatsapp/sms/email
    recipient_mobile TEXT NOT NULL,
    recipient_name TEXT,
    recipient_type TEXT,            -- patient/doctor/clinic
    reference_type TEXT,            -- booking/visit/follow_up
    reference_id TEXT,
    message_content TEXT,
    status TEXT DEFAULT 'pending',  -- pending/sent/delivered/read/failed
    external_id TEXT,               -- WhatsApp/SMS provider message ID
    sent_at DATETIME,
    delivered_at DATETIME,
    read_at DATETIME,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notif_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notif_reference ON notifications(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_notif_recipient ON notifications(recipient_mobile);
CREATE INDEX IF NOT EXISTS idx_notif_date ON notifications(created_at);


-- ===========================
-- 12. Follow-Ups Table
-- ===========================
CREATE TABLE IF NOT EXISTS follow_ups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visit_id TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    doctor_id TEXT NOT NULL,
    clinic_id TEXT NOT NULL,
    follow_up_date TEXT NOT NULL,   -- YYYY-MM-DD
    reason TEXT,
    notes TEXT,
    status TEXT DEFAULT 'pending',  -- pending/notified/booked/completed/missed
    reminder_sent INTEGER DEFAULT 0,
    reminder_sent_at DATETIME,
    booked_appointment_id TEXT,     -- Links to booking if patient booked
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (visit_id) REFERENCES visits(visit_id),
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id),
    FOREIGN KEY (clinic_id) REFERENCES clinics(clinic_id),
    FOREIGN KEY (booked_appointment_id) REFERENCES bookings(appointment_id)
);

CREATE INDEX IF NOT EXISTS idx_followup_date_status ON follow_ups(follow_up_date, status);
CREATE INDEX IF NOT EXISTS idx_followup_patient ON follow_ups(patient_id);
CREATE INDEX IF NOT EXISTS idx_followup_doctor ON follow_ups(doctor_id);


-- ===========================
-- 13. Medicines Master Table
-- ===========================
CREATE TABLE IF NOT EXISTS medicines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    generic_name TEXT,
    brand_name TEXT,
    category TEXT,                  -- antibiotic/painkiller/vitamin/antacid/etc
    form TEXT,                      -- tablet/capsule/syrup/injection/cream
    strength TEXT,                  -- 250mg, 500mg, etc
    common_doses TEXT,              -- JSON: ["250mg", "500mg"]
    common_frequencies TEXT,        -- JSON: ["Once a day", "Twice a day", "Thrice a day"]
    common_timings TEXT,            -- JSON: ["Before food", "After food", "With food"]
    usage_count INTEGER DEFAULT 0,  -- Track popularity for sorting
    is_active INTEGER DEFAULT 1,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, strength)
);

CREATE INDEX IF NOT EXISTS idx_medicine_name ON medicines(name);
CREATE INDEX IF NOT EXISTS idx_medicine_category ON medicines(category);
CREATE INDEX IF NOT EXISTS idx_medicine_usage ON medicines(usage_count DESC);


-- ===========================
-- 14. Diagnoses Master Table
-- ===========================
CREATE TABLE IF NOT EXISTS diagnoses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    icd_code TEXT,                  -- ICD-10 code if applicable
    category TEXT,                  -- Infectious/Chronic/Acute/etc
    common_symptoms TEXT,           -- JSON array
    usage_count INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_diagnosis_name ON diagnoses(name);
CREATE INDEX IF NOT EXISTS idx_diagnosis_usage ON diagnoses(usage_count DESC);


-- ===========================
-- 15. Patient Feedback Table
-- ===========================
CREATE TABLE IF NOT EXISTS feedbacks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visit_id TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    doctor_id TEXT NOT NULL,
    clinic_id TEXT NOT NULL,
    rating INTEGER CHECK(rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    would_recommend INTEGER,        -- 1 = yes, 0 = no
    wait_time_rating INTEGER CHECK(wait_time_rating >= 1 AND wait_time_rating <= 5),
    staff_rating INTEGER CHECK(staff_rating >= 1 AND staff_rating <= 5),
    is_anonymous INTEGER DEFAULT 0,
    is_published INTEGER DEFAULT 1, -- Can hide inappropriate feedback
    response_text TEXT,             -- Doctor/clinic response
    response_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (visit_id) REFERENCES visits(visit_id),
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id),
    FOREIGN KEY (clinic_id) REFERENCES clinics(clinic_id)
);

CREATE INDEX IF NOT EXISTS idx_feedback_doctor ON feedbacks(doctor_id);
CREATE INDEX IF NOT EXISTS idx_feedback_clinic ON feedbacks(clinic_id);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON feedbacks(rating);


-- ===========================
-- 16. System Settings Table
-- ===========================
CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT,
    setting_type TEXT,              -- string/number/boolean/json
    description TEXT,
    updated_by TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


-- ===========================
-- ANALYTICS VIEWS
-- ===========================

-- Daily Bookings View
CREATE VIEW IF NOT EXISTS v_daily_bookings AS
SELECT 
    DATE(b.appointment_date) as booking_date,
    b.doctor_id,
    d.name as doctor_name,
    b.clinic_id,
    c.name as clinic_name,
    COUNT(*) as total_bookings,
    SUM(CASE WHEN b.consult_status = 'seen' THEN 1 ELSE 0 END) as completed,
    SUM(CASE WHEN b.consult_status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
    SUM(CASE WHEN b.consult_status = 'not_seen' THEN 1 ELSE 0 END) as pending
FROM bookings b
JOIN doctors d ON b.doctor_id = d.doctor_id
JOIN clinics c ON b.clinic_id = c.clinic_id
GROUP BY DATE(b.appointment_date), b.doctor_id, b.clinic_id;

-- Revenue Summary View
CREATE VIEW IF NOT EXISTS v_revenue_summary AS
SELECT 
    DATE(v.visit_time) as revenue_date,
    v.doctor_id,
    d.name as doctor_name,
    v.clinic_id,
    c.name as clinic_name,
    COUNT(*) as visit_count,
    SUM(COALESCE(v.consultation_fee, 0)) as total_fees,
    AVG(COALESCE(v.consultation_fee, 0)) as avg_fee
FROM visits v
JOIN doctors d ON v.doctor_id = d.doctor_id
JOIN clinics c ON v.clinic_id = c.clinic_id
GROUP BY DATE(v.visit_time), v.doctor_id, v.clinic_id;

-- Doctor Performance View
CREATE VIEW IF NOT EXISTS v_doctor_performance AS
SELECT 
    d.doctor_id,
    d.name as doctor_name,
    d.specialization,
    COUNT(DISTINCT v.visit_id) as total_visits,
    COUNT(DISTINCT v.patient_id) as unique_patients,
    SUM(COALESCE(v.consultation_fee, 0)) as total_revenue,
    AVG(COALESCE(v.consultation_fee, 0)) as avg_fee_per_visit,
    ROUND(AVG(COALESCE(f.rating, 0)), 2) as avg_rating,
    COUNT(DISTINCT f.id) as feedback_count
FROM doctors d
LEFT JOIN visits v ON d.doctor_id = v.doctor_id
LEFT JOIN feedbacks f ON d.doctor_id = f.doctor_id
GROUP BY d.doctor_id;

-- Top Medicines View
CREATE VIEW IF NOT EXISTS v_top_medicines AS
SELECT 
    pi.medicine_name,
    COUNT(*) as prescription_count,
    COUNT(DISTINCT pi.visit_id) as visit_count,
    COUNT(DISTINCT v.patient_id) as patient_count
FROM prescription_items pi
JOIN visits v ON pi.visit_id = v.visit_id
GROUP BY LOWER(pi.medicine_name)
ORDER BY prescription_count DESC;

-- Clinic Summary View
CREATE VIEW IF NOT EXISTS v_clinic_summary AS
SELECT 
    c.clinic_id,
    c.name as clinic_name,
    c.address,
    COUNT(DISTINCT d.doctor_id) as doctor_count,
    COUNT(DISTINCT b.appointment_id) as total_bookings,
    COUNT(DISTINCT v.visit_id) as total_visits,
    SUM(COALESCE(v.consultation_fee, 0)) as total_revenue
FROM clinics c
LEFT JOIN doctors d ON c.clinic_id = d.clinic_id
LEFT JOIN bookings b ON c.clinic_id = b.clinic_id
LEFT JOIN visits v ON c.clinic_id = v.clinic_id
GROUP BY c.clinic_id;

-- Patient Summary View
CREATE VIEW IF NOT EXISTS v_patient_summary AS
SELECT 
    p.patient_id,
    p.full_name as patient_name,
    p.mobile,
    p.gender,
    COUNT(DISTINCT v.visit_id) as total_visits,
    COUNT(DISTINCT v.doctor_id) as doctors_consulted,
    MAX(v.visit_time) as last_visit,
    SUM(COALESCE(v.consultation_fee, 0)) as total_spent
FROM patients p
LEFT JOIN visits v ON p.patient_id = v.patient_id
GROUP BY p.patient_id;

-- Pending Follow-ups View
CREATE VIEW IF NOT EXISTS v_pending_followups AS
SELECT 
    f.id,
    f.patient_id,
    p.full_name as patient_name,
    p.mobile as patient_mobile,
    f.doctor_id,
    d.name as doctor_name,
    f.follow_up_date,
    f.reason,
    f.status,
    JULIANDAY(f.follow_up_date) - JULIANDAY('now') as days_until_due
FROM follow_ups f
JOIN patients p ON f.patient_id = p.patient_id
JOIN doctors d ON f.doctor_id = d.doctor_id
WHERE f.status = 'pending'
ORDER BY f.follow_up_date ASC;

-- ===========================
-- Invoices Table
-- ===========================
CREATE TABLE IF NOT EXISTS invoices (
    invoice_id TEXT PRIMARY KEY,           -- e.g., INV20260203001
    visit_id TEXT NOT NULL,                -- Link to visits table
    clinic_id TEXT NOT NULL,               -- Link to clinics table
    patient_name TEXT NOT NULL,
    patient_mobile TEXT,
    doctor_name TEXT,
    consultation_fee REAL DEFAULT 0,       -- Consultation charge
    medicine_charges REAL DEFAULT 0,       -- Medicine sold at clinic
    lab_charges REAL DEFAULT 0,            -- Lab tests charges
    other_charges REAL DEFAULT 0,          -- Miscellaneous
    other_charges_desc TEXT,               -- Description of other charges
    subtotal REAL DEFAULT 0,               -- Sum of all charges
    discount REAL DEFAULT 0,               -- Discount amount
    tax_percentage REAL DEFAULT 0,         -- GST/Tax percentage
    tax_amount REAL DEFAULT 0,             -- Calculated tax
    total_amount REAL NOT NULL,            -- Final amount
    payment_status TEXT DEFAULT 'unpaid',  -- 'paid', 'unpaid', 'partial'
    payment_method TEXT,                   -- 'cash', 'upi', 'card', 'online'
    payment_date DATETIME,                 -- When payment was received
    invoice_path TEXT,                     -- Path to PDF invoice
    notes TEXT,                            -- Additional notes
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,                       -- Who created (doctor_id/clinic_id)
    FOREIGN KEY (visit_id) REFERENCES visits(visit_id),
    FOREIGN KEY (clinic_id) REFERENCES clinics(clinic_id)
);
