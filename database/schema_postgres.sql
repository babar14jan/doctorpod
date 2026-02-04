-- ====================================================
-- DoctorPod PostgreSQL Schema - Full End-to-End 
-- Industry Standard Naming Convention (Plural Tables)
-- ====================================================

-- ===========================
-- 1. Admins Table
-- ===========================
CREATE TABLE IF NOT EXISTS admins (
    admin_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    mobile TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================
-- 1.5 Demo Requests Table
-- ===========================
CREATE TABLE IF NOT EXISTS demo_requests (
    id SERIAL PRIMARY KEY,
    clinic_name TEXT NOT NULL,
    contact_person TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    city TEXT NOT NULL,
    message TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_by TEXT,
    reviewed_at TIMESTAMP
);

-- ===========================
-- 2. Clinics Table
-- ===========================
CREATE TABLE IF NOT EXISTS clinics (
    clinic_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    email TEXT,
    address TEXT,
    password TEXT NOT NULL,
    owner_name TEXT,
    upi_id TEXT,
    qr_code_path TEXT,
    is_active INTEGER DEFAULT 1,
    logo_path TEXT,
    latitude REAL,
    longitude REAL,
    subscription_type TEXT DEFAULT 'trial',
    trial_start_date TIMESTAMP,
    trial_end_date TIMESTAMP,
    is_trial_expired INTEGER DEFAULT 0,
    enable_voice_prescription INTEGER DEFAULT 0,
    enable_video_consultation INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source TEXT
);

-- ===========================
-- 3. Doctors Table
-- ===========================
CREATE TABLE IF NOT EXISTS doctors (
    doctor_id TEXT PRIMARY KEY,
    clinic_id TEXT NOT NULL,
    name TEXT NOT NULL,
    qualification TEXT,
    specialization TEXT,
    mobile TEXT UNIQUE NOT NULL,
    email TEXT,
    password TEXT NOT NULL,
    registration_no TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source TEXT,
    FOREIGN KEY (clinic_id) REFERENCES clinics(clinic_id)
);

-- ===========================
-- 4. Patients Table
-- ===========================
CREATE TABLE IF NOT EXISTS patients (
    patient_id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    mobile TEXT UNIQUE NOT NULL,
    email TEXT,
    gender TEXT,
    date_of_birth TEXT,
    height_cm REAL,
    blood_group TEXT,
    allergies TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================
-- 5. Availability Slots Table (Doctor Availability)
-- ===========================
CREATE TABLE IF NOT EXISTS availability_slots (
    id SERIAL PRIMARY KEY,
    doctor_id TEXT NOT NULL,
    clinic_id TEXT NOT NULL,
    day_of_week TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    interval_minutes INTEGER DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source TEXT,
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id),
    FOREIGN KEY (clinic_id) REFERENCES clinics(clinic_id)
);

-- ===========================
-- 6. Bookings Table (Appointments)
-- ===========================
CREATE TABLE IF NOT EXISTS bookings (
    appointment_id TEXT PRIMARY KEY,
    doctor_id TEXT NOT NULL,
    clinic_id TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    patient_mobile TEXT NOT NULL,
    patient_age INTEGER,
    patient_gender TEXT,
    blood_group TEXT,
    appointment_date TEXT NOT NULL,
    queue_number INTEGER,
    appointment_time TEXT,
    consult_status TEXT DEFAULT 'not_seen',
    payment_status TEXT DEFAULT 'pending',
    payment_amount REAL,
    payment_method TEXT,
    payment_time TIMESTAMP,
    booking_source TEXT DEFAULT 'online',
    is_video_consultation INTEGER DEFAULT 0,
    video_call_status TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id),
    FOREIGN KEY (clinic_id) REFERENCES clinics(clinic_id),
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

-- ===========================
-- 7. Visits Table (Appointments + Walk-ins)
-- ===========================
CREATE TABLE IF NOT EXISTS visits (
    visit_id TEXT PRIMARY KEY,
    doctor_id TEXT NOT NULL,
    clinic_id TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    appointment_id TEXT DEFAULT NULL,

    patient_name TEXT NOT NULL,
    patient_age INTEGER,
    patient_gender TEXT,

    patient_weight REAL,
    temperature REAL,
    blood_pressure TEXT,

    diagnosis TEXT,
    investigations TEXT,
    advice TEXT,
    consultation_fee REAL,

    follow_up_date TEXT,
    follow_up_notes TEXT,
    is_follow_up INTEGER DEFAULT 0,
    parent_visit_id TEXT,

    include_qr INTEGER DEFAULT 0,

    pres_path TEXT,
    source TEXT,

    visit_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id),
    FOREIGN KEY (clinic_id) REFERENCES clinics(clinic_id),
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (appointment_id) REFERENCES bookings(appointment_id)
);

-- ===========================
-- 8. Prescription Items Table (Medicines)
-- ===========================
CREATE TABLE IF NOT EXISTS prescription_items (
    id SERIAL PRIMARY KEY,
    visit_id TEXT NOT NULL,
    doctor_id TEXT NOT NULL,
    medicine_name TEXT NOT NULL,
    dose TEXT,
    frequency TEXT,
    timing TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source TEXT,
    FOREIGN KEY (visit_id) REFERENCES visits(visit_id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id)
);

-- ===========================
-- INDEXES for Performance
-- ===========================

CREATE INDEX IF NOT EXISTS idx_bookings_doctor ON bookings(doctor_id);
CREATE INDEX IF NOT EXISTS idx_bookings_clinic ON bookings(clinic_id);
CREATE INDEX IF NOT EXISTS idx_bookings_patient ON bookings(patient_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(appointment_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(consult_status);
CREATE INDEX IF NOT EXISTS idx_bookings_doctor_date ON bookings(doctor_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_bookings_clinic_date ON bookings(clinic_id, appointment_date);

CREATE INDEX IF NOT EXISTS idx_visits_doctor ON visits(doctor_id);
CREATE INDEX IF NOT EXISTS idx_visits_clinic ON visits(clinic_id);
CREATE INDEX IF NOT EXISTS idx_visits_patient ON visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(visit_time);

CREATE INDEX IF NOT EXISTS idx_availability_doctor ON availability_slots(doctor_id);
CREATE INDEX IF NOT EXISTS idx_availability_day ON availability_slots(day_of_week);
CREATE INDEX IF NOT EXISTS idx_availability_doctor_day ON availability_slots(doctor_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_availability_clinic ON availability_slots(clinic_id);

CREATE INDEX IF NOT EXISTS idx_prescription_items_visit ON prescription_items(visit_id);

-- ===========================
-- 9. Audit Logs Table
-- ===========================
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL,
    old_values TEXT,
    new_values TEXT,
    user_id TEXT,
    user_type TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id, user_type);

-- ===========================
-- 10. Daily Analytics Table
-- ===========================
CREATE TABLE IF NOT EXISTS daily_analytics (
    id SERIAL PRIMARY KEY,
    date TEXT NOT NULL,
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL,
    channel TEXT NOT NULL,
    recipient_mobile TEXT NOT NULL,
    recipient_name TEXT,
    recipient_type TEXT,
    reference_type TEXT,
    reference_id TEXT,
    message_content TEXT,
    status TEXT DEFAULT 'pending',
    external_id TEXT,
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notif_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notif_reference ON notifications(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_notif_recipient ON notifications(recipient_mobile);
CREATE INDEX IF NOT EXISTS idx_notif_date ON notifications(created_at);

-- ===========================
-- 12. Follow-Ups Table
-- ===========================
CREATE TABLE IF NOT EXISTS follow_ups (
    id SERIAL PRIMARY KEY,
    visit_id TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    doctor_id TEXT NOT NULL,
    clinic_id TEXT NOT NULL,
    follow_up_date TEXT NOT NULL,
    reason TEXT,
    notes TEXT,
    status TEXT DEFAULT 'pending',
    reminder_sent INTEGER DEFAULT 0,
    reminder_sent_at TIMESTAMP,
    booked_appointment_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    generic_name TEXT,
    brand_name TEXT,
    category TEXT,
    form TEXT,
    strength TEXT,
    common_doses TEXT,
    common_frequencies TEXT,
    common_timings TEXT,
    usage_count INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_by TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, strength)
);

CREATE INDEX IF NOT EXISTS idx_medicine_name ON medicines(name);
CREATE INDEX IF NOT EXISTS idx_medicine_category ON medicines(category);
CREATE INDEX IF NOT EXISTS idx_medicine_usage ON medicines(usage_count DESC);

-- ===========================
-- 14. Diagnoses Master Table
-- ===========================
CREATE TABLE IF NOT EXISTS diagnoses (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    icd_code TEXT,
    category TEXT,
    common_symptoms TEXT,
    usage_count INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_diagnosis_name ON diagnoses(name);
CREATE INDEX IF NOT EXISTS idx_diagnosis_usage ON diagnoses(usage_count DESC);

-- ===========================
-- 15. Patient Feedback Table
-- ===========================
CREATE TABLE IF NOT EXISTS feedbacks (
    id SERIAL PRIMARY KEY,
    visit_id TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    doctor_id TEXT NOT NULL,
    clinic_id TEXT NOT NULL,
    rating INTEGER CHECK(rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    would_recommend INTEGER,
    wait_time_rating INTEGER CHECK(wait_time_rating >= 1 AND wait_time_rating <= 5),
    staff_rating INTEGER CHECK(staff_rating >= 1 AND staff_rating <= 5),
    is_anonymous INTEGER DEFAULT 0,
    is_published INTEGER DEFAULT 1,
    response_text TEXT,
    response_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
    id SERIAL PRIMARY KEY,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT,
    setting_type TEXT,
    description TEXT,
    updated_by TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================
-- 17. Invoices Table
-- ===========================
CREATE TABLE IF NOT EXISTS invoices (
    invoice_id TEXT PRIMARY KEY,
    visit_id TEXT NOT NULL,
    clinic_id TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    patient_mobile TEXT,
    doctor_name TEXT,
    consultation_fee REAL DEFAULT 0,
    medicine_charges REAL DEFAULT 0,
    lab_charges REAL DEFAULT 0,
    other_charges REAL DEFAULT 0,
    other_charges_desc TEXT,
    subtotal REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    tax_percentage REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    total_amount REAL NOT NULL,
    payment_status TEXT DEFAULT 'unpaid',
    payment_method TEXT,
    payment_date TIMESTAMP,
    invoice_path TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    FOREIGN KEY (visit_id) REFERENCES visits(visit_id),
    FOREIGN KEY (clinic_id) REFERENCES clinics(clinic_id)
);

-- ===========================
-- ANALYTICS VIEWS
-- ===========================

-- Daily Bookings View
CREATE OR REPLACE VIEW v_daily_bookings AS
SELECT 
    DATE(b.appointment_date::DATE) as booking_date,
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
GROUP BY DATE(b.appointment_date::DATE), b.doctor_id, d.name, b.clinic_id, c.name;

-- Revenue Summary View
CREATE OR REPLACE VIEW v_revenue_summary AS
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
GROUP BY DATE(v.visit_time), v.doctor_id, d.name, v.clinic_id, c.name;

-- Doctor Performance View
CREATE OR REPLACE VIEW v_doctor_performance AS
SELECT 
    d.doctor_id,
    d.name as doctor_name,
    d.specialization,
    COUNT(DISTINCT v.visit_id) as total_visits,
    COUNT(DISTINCT v.patient_id) as unique_patients,
    SUM(COALESCE(v.consultation_fee, 0)) as total_revenue,
    AVG(COALESCE(v.consultation_fee, 0)) as avg_fee_per_visit,
    ROUND(CAST(AVG(COALESCE(f.rating, 0)) AS NUMERIC), 2) as avg_rating,
    COUNT(DISTINCT f.id) as feedback_count
FROM doctors d
LEFT JOIN visits v ON d.doctor_id = v.doctor_id
LEFT JOIN feedbacks f ON d.doctor_id = f.doctor_id
GROUP BY d.doctor_id, d.name, d.specialization;

-- Top Medicines View
CREATE OR REPLACE VIEW v_top_medicines AS
SELECT 
    pi.medicine_name,
    COUNT(*) as prescription_count,
    COUNT(DISTINCT pi.visit_id) as visit_count,
    COUNT(DISTINCT v.patient_id) as patient_count
FROM prescription_items pi
JOIN visits v ON pi.visit_id = v.visit_id
GROUP BY pi.medicine_name
ORDER BY prescription_count DESC;

-- Clinic Summary View
CREATE OR REPLACE VIEW v_clinic_summary AS
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
GROUP BY c.clinic_id, c.name, c.address;

-- Patient Summary View
CREATE OR REPLACE VIEW v_patient_summary AS
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
GROUP BY p.patient_id, p.full_name, p.mobile, p.gender;

-- Pending Follow-ups View
CREATE OR REPLACE VIEW v_pending_followups AS
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
    (f.follow_up_date::DATE - CURRENT_DATE) as days_until_due
FROM follow_ups f
JOIN patients p ON f.patient_id = p.patient_id
JOIN doctors d ON f.doctor_id = d.doctor_id
WHERE f.status = 'pending'
ORDER BY f.follow_up_date ASC;
