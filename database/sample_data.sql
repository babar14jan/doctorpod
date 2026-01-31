-- ====================================================
-- DoctorPod Sample Data - Industry Standard Naming
-- Updated: 2026-01-30
-- ====================================================

-- ===========================
-- Admins (2 records)
-- ===========================
INSERT INTO admins (admin_id, name, mobile, email, password) VALUES
('admin', 'Md Babar Ali', '9330317102', 'babar@doctorpod.in', 'admin321');

-- ===========================
-- Clinics (10 records - Connected to Admin via source)
-- ===========================
INSERT INTO clinics (clinic_id, name, phone, email, address, password, source) VALUES
('ROOT543211', 'Rooting Reflex', '9876543211', 'rootref@clinic.com', 'Cristopher Road, Kolkata', 'clinic123', 'admin'),
('HEAL987654', 'Heal Plus', '9123459876', 'heal@clinic.com', 'Behala, Kolkata', 'clinic123', 'admin'),
('MEDI111222', 'MediCare', '9123411222', 'medi@clinic.com', 'Dum Dum, Kolkata', 'clinic123', 'admin'),
('LIFE333444', 'LifeCare', '9123433444', 'life@clinic.com', 'Howrah', 'clinic123', 'admin'),
('CITY555666', 'City Health', '9123455666', 'city@clinic.com', 'Garia', 'clinic123', 'admin'),
('STAR777888', 'Star Clinic', '9123477788', 'star@clinic.com', 'New Town', 'clinic123', 'admin'),
('APEX999000', 'Apex Health', '9123499000', 'apex@clinic.com', 'Park Street', 'clinic123', 'admin'),
('NOVA121212', 'Nova Clinic', '9123412121', 'nova@clinic.com', 'Tollygunge', 'clinic123', 'admin'),
('UNITY343434', 'Unity Care', '9123434343', 'unity@clinic.com', 'Barasat', 'clinic123', 'admin'),
('PRIME565656', 'Prime Clinic', '9123456565', 'prime@clinic.com', 'Kasba', 'clinic123', 'admin'),
('hori658562', 'Horizon Clinic', '9123658562', 'horizon@clinic.com', 'Salt Lake', 'clinic123', 'admin');

-- ===========================
-- Doctors (11 records - Each linked to clinic)
-- ===========================
INSERT INTO doctors (doctor_id, clinic_id, name, qualification, specialization, mobile, email, password, registration_no, source) VALUES
('JASI432101', 'ROOT543211', 'Dr. Jasim Alam', 'MBBS & MD', 'Pediatrics', '9876543210', 'jasmimalam@gmail.com', 'doc123', 'Reg.45123456', 'admin'),
('ANIL432102', 'HEAL987654', 'Dr. Anil Das', 'MD', 'Medicine', '9000010102', 'anil@doc.com', 'doc123', NULL, 'admin'),
('SOMA432103', 'MEDI111222', 'Dr. Soma Roy', 'MBBS', 'Gynecology', '9000010103', 'soma@doc.com', 'doc123', NULL, 'admin'),
('AMIT432104', 'LIFE333444', 'Dr. Amit Paul', 'MS', 'Orthopedic', '9000010104', 'amit@doc.com', 'doc123', NULL, 'admin'),
('NINA432105', 'CITY555666', 'Dr. Nina Bose', 'MD', 'Pediatrics', '9000010105', 'nina@doc.com', 'doc123', NULL, 'admin'),
('RAHUL432106', 'STAR777888', 'Dr. Rahul Jain', 'MBBS', 'ENT', '9000010106', 'rahul@doc.com', 'doc123', NULL, 'admin'),
('IMRA432107', 'APEX999000', 'Dr. Imran Ali', 'MD', 'Cardiology', '9000010107', 'imran@doc.com', 'doc123', NULL, 'admin'),
('NEEL432108', 'NOVA121212', 'Dr. Neel Mukherjee', 'MBBS', 'Dermatology', '9000010108', 'neel@doc.com', 'doc123', NULL, 'admin'),
('TINA432109', 'UNITY343434', 'Dr. Tina Dutta', 'MD', 'Psychiatry', '9000010109', 'tina@doc.com', 'doc123', NULL, 'admin'),
('KUNJ432110', 'PRIME565656', 'Dr. Kunj Patel', 'MBBS', 'General Physician', '9000010110', 'kunj@doc.com', 'doc123', NULL, 'admin'),
('drma542211', 'hori658562', 'Dr. Masoom Raza', 'MBBS & MD', 'Pediatrics', '98765432111', 'massomraza@gmail.com', 'doc123', 'Reg.4512345676', 'admin');

-- ===========================
-- Patients (10 records)
-- ===========================
INSERT INTO patients (patient_id, full_name, mobile, email, gender, height_cm, blood_group, allergies) VALUES
('RAJU778899', 'Raju Mondal', '9877788990', 'raju@gmail.com', 'Male', 172, 'B+', 'None'),
('SUMI889900', 'Sumi Das', '9888899001', 'sumi@gmail.com', 'Female', 160, 'O+', 'Dust'),
('ANIK667788', 'Anik Paul', '9866677882', 'anik@gmail.com', 'Male', 175, 'A+', 'Penicillin'),
('TINA556677', 'Tina Roy', '9855566773', 'tina@gmail.com', 'Female', 158, 'AB+', 'None'),
('ROHA445566', 'Rohan Singh', '9844455664', 'rohan@gmail.com', 'Male', 170, 'O-', 'Seafood'),
('KART223344', 'Kartik Sen', '9876546666', 'kartik@gmail.com', 'Male', 168, 'A-', 'None'),
('PUJA112233', 'Puja Mitra', '9876547777', 'puja@gmail.com', 'Female', 155, 'O+', 'None'),
('AMIT998877', 'Amit Sharma', '9876548888', 'amitsharma@gmail.com', 'Male', 174, 'B+', 'None'),
('NEHA887766', 'Neha Verma', '9876549999', 'neha@gmail.com', 'Female', 162, 'A+', 'None'),
('SONU665544', 'Sonu Yadav', '9876500000', 'sonu@gmail.com', 'Male', 169, 'O+', 'None');

-- ===========================
-- Availability Slots (Doctor Availability)
-- ===========================
INSERT INTO availability_slots (doctor_id, clinic_id, day_of_week, start_time, end_time, interval_minutes, source) VALUES
('JASI432101', 'ROOT543211', 'Mon', '10:00', '14:00', 15, 'admin'),
('JASI432101', 'ROOT543211', 'Wed', '10:00', '14:00', 15, 'admin'),
('JASI432101', 'ROOT543211', 'Fri', '10:00', '14:00', 15, 'admin'),
('ANIL432102', 'HEAL987654', 'Tue', '09:00', '13:00', 15, 'admin'),
('ANIL432102', 'HEAL987654', 'Thu', '09:00', '13:00', 15, 'admin'),
('SOMA432103', 'MEDI111222', 'Mon', '11:00', '15:00', 20, 'admin'),
('SOMA432103', 'MEDI111222', 'Thu', '11:00', '15:00', 20, 'admin'),
('AMIT432104', 'LIFE333444', 'Wed', '14:00', '18:00', 15, 'admin'),
('NINA432105', 'CITY555666', 'Mon', '09:00', '12:00', 10, 'admin'),
('NINA432105', 'CITY555666', 'Fri', '09:00', '12:00', 10, 'admin'),
('RAHUL432106', 'STAR777888', 'Tue', '10:00', '14:00', 15, 'admin'),
('IMRA432107', 'APEX999000', 'Mon', '16:00', '20:00', 20, 'admin'),
('NEEL432108', 'NOVA121212', 'Wed', '10:00', '14:00', 15, 'admin'),
('TINA432109', 'UNITY343434', 'Thu', '14:00', '18:00', 30, 'admin'),
('KUNJ432110', 'PRIME565656', 'Sat', '09:00', '13:00', 15, 'admin'),
('drma542211', 'hori658562', 'Mon', '10:00', '14:00', 15, 'admin'),
('drma542211', 'hori658562', 'Tue', '10:00', '14:00', 15, 'admin');

-- ===========================
-- Bookings (10 records)
-- ===========================
INSERT INTO bookings (
    appointment_id,
    doctor_id,
    clinic_id,
    patient_id,
    patient_name,
    patient_mobile,
    patient_age,
    patient_gender,
    blood_group,
    appointment_date,
    queue_number,
    appointment_time,
    consult_status
) VALUES
('RAJU240126100001','JASI432101','ROOT543211','RAJU778899','Raju Mondal','9877788990',35,'Male','B+','2026-01-26',1,'10:00','seen'),
('SUMI240126100002','ANIL432102','HEAL987654','SUMI889900','Sumi Das','9888899001',28,'Female','O+','2026-01-26',2,'10:15','seen'),
('ANIK240126100003','SOMA432103','MEDI111222','ANIK667788','Anik Paul','9866677882',40,'Male','A+','2026-01-26',3,'10:30','seen'),
('TINA240126100004','AMIT432104','LIFE333444','TINA556677','Tina Roy','9855566773',22,'Female','AB+','2026-01-26',4,'10:45','seen'),
('ROHA240126100005','NINA432105','CITY555666','ROHA445566','Rohan Singh','9844455664',31,'Male','O-','2026-01-26',5,'11:00','seen'),
('KART240126100006','IMRA432107','APEX999000','KART223344','Kartik Sen','9876546666',18,'Male','A-','2026-01-26',6,'11:15','not_seen'),
('PUJA240126100007','NEEL432108','NOVA121212','PUJA112233','Puja Mitra','9876547777',27,'Female','O+','2026-01-26',7,'11:30','not_seen'),
('AMIT240126100008','TINA432109','UNITY343434','AMIT998877','Amit Sharma','9876548888',45,'Male','B+','2026-01-26',8,'11:45','cancelled'),
('NEHA240126100009','KUNJ432110','PRIME565656','NEHA887766','Neha Verma','9876549999',34,'Female','A+','2026-01-26',9,'12:00','no_show'),
('SONU240126100010','JASI432101','ROOT543211','SONU665544','Sonu Yadav','9876500000',29,'Male','O+','2026-01-26',10,'12:15','not_seen');

-- ===========================
-- Visits (5 records - linked to bookings + walk-ins)
-- ===========================
INSERT INTO visits (
    visit_id,
    doctor_id,
    clinic_id,
    patient_id,
    appointment_id,
    patient_name,
    patient_age,
    patient_gender,
    patient_weight,
    temperature,
    blood_pressure,
    diagnosis,
    investigations,
    advice,
    consultation_fee,
    pres_path,
    source
) VALUES
('RAJU240126100101','JASI432101','ROOT543211','RAJU778899','RAJU240126100001','Raju Mondal',35,'Male',72,101.3,'120/80','Viral Fever','X-ray','Rest, fluids',500,'/prescriptions/RAJU240126100101.pdf','doctor'),
('SUMI240126100102','ANIL432102','HEAL987654','SUMI889900','SUMI240126100002','Sumi Das',28,'Female',58,98.6,'110/70','Cold & Cough',NULL,'Steam inhalation, vitamin C',300,'/prescriptions/SUMI240126100102.pdf','doctor'),
('ANIK240126100103','SOMA432103','MEDI111222','ANIK667788',NULL,'Anik Paul',40,'Male',80,99.1,'125/85','Lower Back Pain',NULL,'Physiotherapy, posture correction',400,'/prescriptions/ANIK240126100103.pdf','clinic'),
('TINA240126100104','AMIT432104','LIFE333444','TINA556677',NULL,'Tina Roy',22,'Female',52,98.9,'110/70','Routine Checkup',NULL,'Healthy diet & exercise',250,'/prescriptions/TINA240126100104.pdf','doctor'),
('ROHA240126100105','NINA432105','CITY555666','ROHA445566','ROHA240126100005','Rohan Singh',31,'Male',75,100.2,'130/85','Ear Infection',NULL,'Antibiotics for 5 days',350,'/prescriptions/ROHA240126100105.pdf','doctor');

-- ===========================
-- Prescription Items (Medicines - linked to visits)
-- ===========================
INSERT INTO prescription_items (visit_id, doctor_id, medicine_name, dose, frequency, timing, source) VALUES
-- Visit 1: Raju - Viral Fever
('RAJU240126100101','JASI432101','Paracetamol','500mg','Twice a day','After food','doctor'),
('RAJU240126100101','JASI432101','Cetirizine','10mg','Once a day','Night','doctor'),

-- Visit 2: Sumi - Cold & Cough
('SUMI240126100102','ANIL432102','Amoxicillin','500mg','3 times a day','After food','doctor'),
('SUMI240126100102','ANIL432102','Vitamin C','500mg','Once a day','Morning','doctor'),

-- Visit 3: Anik - Lower Back Pain
('ANIK240126100103','SOMA432103','Ibuprofen','400mg','Twice a day','After food','doctor'),
('ANIK240126100103','SOMA432103','Calcium','500mg','Once a day','Morning','doctor'),

-- Visit 4: Tina - Routine Checkup
('TINA240126100104','AMIT432104','Multivitamin','1 tablet','Once a day','Morning','doctor'),
('TINA240126100104','AMIT432104','Vitamin D','1000 IU','Once a day','Morning','doctor'),

-- Visit 5: Rohan - Ear Infection
('ROHA240126100105','NINA432105','Amoxicillin','500mg','3 times a day','After food','doctor'),
('ROHA240126100105','NINA432105','Paracetamol','500mg','Twice a day','After food','doctor');

-- ===========================
-- Follow-ups (sample data)
-- ===========================
INSERT INTO follow_ups (visit_id, patient_id, doctor_id, clinic_id, follow_up_date, reason, status) VALUES
('RAJU240126100101', 'RAJU778899', 'JASI432101', 'ROOT543211', '2026-02-02', 'Fever follow-up check', 'pending'),
('ANIK240126100103', 'ANIK667788', 'SOMA432103', 'MEDI111222', '2026-02-10', 'Back pain review', 'pending'),
('ROHA240126100105', 'ROHA445566', 'NINA432105', 'CITY555666', '2026-02-05', 'Ear infection follow-up', 'pending');

-- ===========================
-- Feedbacks (sample data)
-- ===========================
INSERT INTO feedbacks (visit_id, patient_id, doctor_id, clinic_id, rating, feedback_text, would_recommend) VALUES
('RAJU240126100101', 'RAJU778899', 'JASI432101', 'ROOT543211', 5, 'Excellent doctor, very caring', 1),
('SUMI240126100102', 'SUMI889900', 'ANIL432102', 'HEAL987654', 4, 'Good treatment, quick recovery', 1),
('TINA240126100104', 'TINA556677', 'AMIT432104', 'LIFE333444', 5, 'Very thorough checkup', 1);


-- ===========================
-- Medicines Master (Common prescriptions)
-- ===========================
INSERT INTO medicines (name, generic_name, category, form, strength, is_active) VALUES
('Paracetamol', 'Acetaminophen', 'painkiller', 'tablet', '500mg', 1),
('Amoxicillin', 'Amoxicillin', 'antibiotic', 'capsule', '500mg', 1),
('Cetirizine', 'Cetirizine', 'antihistamine', 'tablet', '10mg', 1),
('Ibuprofen', 'Ibuprofen', 'painkiller', 'tablet', '400mg', 1),
('Vitamin C', 'Ascorbic Acid', 'vitamin', 'tablet', '500mg', 1),
('Vitamin D', 'Cholecalciferol', 'vitamin', 'tablet', '1000 IU', 1),
('Calcium', 'Calcium Carbonate', 'supplement', 'tablet', '500mg', 1),
('Multivitamin', 'Multivitamin', 'vitamin', 'tablet', '1 tablet', 1),
('Omeprazole', 'Omeprazole', 'antacid', 'capsule', '20mg', 1),
('Metformin', 'Metformin', 'antidiabetic', 'tablet', '500mg', 1);

-- ===========================
-- Diagnoses Master (Common diagnoses)
-- ===========================
INSERT INTO diagnoses (name, icd_code, category, is_active) VALUES
('Viral Fever', 'R50.9', 'Infectious', 1),
('Cold & Cough', 'J00', 'Infectious', 1),
('Lower Back Pain', 'M54.5', 'Musculoskeletal', 1),
('Ear Infection', 'H66.9', 'ENT', 1),
('Routine Checkup', 'Z00.00', 'Preventive', 1),
('Hypertension', 'I10', 'Chronic', 1),
('Diabetes Mellitus', 'E11.9', 'Chronic', 1),
('Gastritis', 'K29.7', 'GI', 1),
('Allergic Rhinitis', 'J30.9', 'Allergy', 1),
('Migraine', 'G43.9', 'Neurological', 1);

-- ===========================
-- System Settings
-- ===========================
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('default_slot_duration', '15', 'number', 'Default appointment slot duration in minutes'),
('max_bookings_per_slot', '1', 'number', 'Maximum bookings allowed per time slot'),
('reminder_hours_before', '24', 'number', 'Hours before appointment to send reminder'),
('follow_up_reminder_days', '1', 'number', 'Days before follow-up to send reminder'),
('whatsapp_enabled', 'true', 'boolean', 'Enable WhatsApp notifications'),
('sms_enabled', 'false', 'boolean', 'Enable SMS notifications'),
('email_enabled', 'false', 'boolean', 'Enable email notifications'),
('clinic_name', 'DoctorPod', 'string', 'System clinic name'),
('support_email', 'support@doctorpod.in', 'string', 'Support email address'),
('support_phone', '1800-XXX-XXXX', 'string', 'Support phone number');