-- ====================================================
-- DoctorPod Sample Data - Industry Standard Naming
-- Updated: 2026-01-30
-- ====================================================

-- ===========================
-- Admins (2 records)
-- ===========================
INSERT INTO admins (admin_id, name, mobile, email, password) VALUES
('admin123', 'Md Babar Ali', '9330317102', 'doctorpod.info@gmail.com', 'boss321');

-- ===========================
-- Clinics (11 records - Mix of admin-added and trial signups)
-- ===========================

-- Admin-added clinics (paid subscription)
INSERT INTO clinics (clinic_id, name, phone, email, address, password, owner_name, subscription_type, trial_start_date, trial_end_date, is_trial_expired, source, is_active) VALUES
('CLN_A7F3B2E9C1D5', 'Rooting Reflex', '8240482564', 'rootref@clinic.com', 'Cristopher Road, Kolkata', 'clinic123', 'Jasim Ahmed', 'paid', NULL, NULL, 0, 'admin', 1),
('CLN_K7N3L2O9M1N5', 'Horizon Clinic', '9831553837', 'horizon@clinic.com', 'Cit Road, Kolkata', 'clinic123', 'Md Hasnain Ahmed', 'paid', NULL, NULL, 0, 'admin', 1));

-- Trial signups (30-day free trial)
INSERT INTO clinics (clinic_id, name, phone, email, address, password, owner_name, subscription_type, trial_start_date, trial_end_date, is_trial_expired, source, is_active) VALUES
('CLN_E1H7F6I3G5H9', 'City Health', '9123455666', 'city@clinic.com', 'Garia', 'clinic123', 'Dr. Amit Roy', 'trial', '2026-01-25 10:00:00', '2026-02-08 10:00:00', 0, 'free-trial-signup', 1),
('CLN_F2I8G7J4H6I0', 'Star Clinic', '9123477788', 'star@clinic.com', 'New Town', 'clinic123', 'Dr. Rita Banerjee', 'trial', '2026-01-26 14:30:00', '2026-02-09 14:30:00', 0, 'free-trial-signup', 1),
('CLN_G3J9H8K5I7J1', 'Apex Health', '9123499000', 'apex@clinic.com', 'Park Street', 'clinic123', 'Dr. Vikram Singh', 'trial', '2026-01-27 09:15:00', '2026-02-10 09:15:00', 0, 'free-trial-signup', 1),
('CLN_H4K0I9L6J8K2', 'Nova Clinic', '9123412121', 'nova@clinic.com', 'Tollygunge', 'clinic123', 'Dr. Maya Dutta', 'trial', '2026-01-28 11:45:00', '2026-02-11 11:45:00', 0, 'free-trial-signup', 1),
('CLN_I5L1J0M7K9L3', 'Unity Care', '9123434343', 'unity@clinic.com', 'Barasat', 'clinic123', 'Dr. Ravi Kumar', 'trial', '2026-01-29 16:20:00', '2026-02-12 16:20:00', 0, 'free-trial-signup', 1),
('CLN_J6M2K1N8L0M4', 'Prime Clinic', '9123456565', 'prime@clinic.com', 'Kasba', 'clinic123', 'Dr. Neha Jain', 'trial', '2026-01-30 08:00:00', '2026-02-13 08:00:00', 0, 'free-trial-signup', 1);

-- ===========================
-- Doctors (11 records - Each linked to clinic)
-- ===========================
INSERT INTO doctors (doctor_id, clinic_id, name, qualification, specialization, mobile, email, password, registration_no, source) VALUES
('DR_792874827F61', 'CLN_A7F3B2E9C1D5', 'Jasim Ahmed', 'MBBS & MD', 'Pediatrics', '8240482564', 'jasmimalam@gmail.com', 'doc123', '45123456', 'admin'),
('DR_8A3985938G72', 'CLN_B8E4C3F0D2E6', 'Anil Das', 'MD', 'Medicine', '9000010102', 'anil@doc.com', 'doc123', NULL, 'admin'),
('DR_9B40A69A9H83', 'CLN_C9F5D4G1E3F7', 'Soma Roy', 'MBBS', 'Gynecology', '9000010103', 'soma@doc.com', 'doc123', NULL, 'admin'),
('DR_0C51B7AB0I94', 'CLN_D0G6E5H2F4G8', 'Amit Paul', 'MS', 'Orthopedic', '9000010104', 'amit@doc.com', 'doc123', NULL, 'admin'),
('DR_1D62C8BC1J05', 'CLN_E1H7F6I3G5H9', 'Nina Bose', 'MD', 'Pediatrics', '9000010105', 'nina@doc.com', 'doc123', NULL, 'admin'),
('DR_2E73D9CD2K16', 'CLN_F2I8G7J4H6I0', 'Rahul Jain', 'MBBS', 'ENT', '9000010106', 'rahul@doc.com', 'doc123', NULL, 'admin'),
('DR_3F84EADE3L27', 'CLN_G3J9H8K5I7J1', 'Imran Ali', 'MD', 'Cardiology', '9000010107', 'imran@doc.com', 'doc123', NULL, 'admin'),
('DR_4G95FBEF4M38', 'CLN_H4K0I9L6J8K2', 'Neel Mukherjee', 'MBBS', 'Dermatology', '9000010108', 'neel@doc.com', 'doc123', NULL, 'admin'),
('DR_5H06GCF05N49', 'CLN_I5L1J0M7K9L3', 'Tina Dutta', 'MD', 'Psychiatry', '9000010109', 'tina@doc.com', 'doc123', NULL, 'admin'),
('DR_6I17HDG16O50', 'CLN_J6M2K1N8L0M4', 'Kunj Patel', 'MBBS', 'General Physician', '9000010110', 'kunj@doc.com', 'doc123', NULL, 'admin'),
('DR_7J28IEH27P61', 'CLN_K7N3L2O9M1N5', 'Masoom Raza', 'MBBS & MD', 'Pediatrics', '98765432111', 'massomraza@gmail.com', 'doc123', '4512345676', 'admin');

-- ===========================
-- Patients (10 records)
-- ===========================
INSERT INTO patients (patient_id, full_name, mobile, email, gender, height_cm, blood_group, allergies) VALUES
('PAT_EB77524149E8', 'Raju Mondal', '9877788990', 'raju@gmail.com', 'Male', 172, 'B+', 'None'),
('PAT_FC88635250F9', 'Sumi Das', '9888899001', 'sumi@gmail.com', 'Female', 160, 'O+', 'Dust'),
('PAT_GD9974636G0A', 'Anik Paul', '9866677882', 'anik@gmail.com', 'Male', 175, 'A+', 'Penicillin'),
('PAT_HE00857047H1B', 'Tina Roy', '9855566773', 'tina@gmail.com', 'Female', 158, 'AB+', 'None'),
('PAT_IF11968158I2C', 'Rohan Singh', '9844455664', 'rohan@gmail.com', 'Male', 170, 'O-', 'Seafood'),
('PAT_JG22079269J3D', 'Kartik Sen', '9876546666', 'kartik@gmail.com', 'Male', 168, 'A-', 'None'),
('PAT_KH3318A370K4E', 'Puja Mitra', '9876547777', 'puja@gmail.com', 'Female', 155, 'O+', 'None'),
('PAT_LI442BB481L5F', 'Amit Sharma', '9876548888', 'amitsharma@gmail.com', 'Male', 174, 'B+', 'None'),
('PAT_MJ553CC592M6G', 'Neha Verma', '9876549999', 'neha@gmail.com', 'Female', 162, 'A+', 'None'),
('PAT_NK664DD6A3N7H', 'Sonu Yadav', '9876500000', 'sonu@gmail.com', 'Male', 169, 'O+', 'None');

-- ===========================
-- Availability Slots (Doctor Availability)
-- ===========================
INSERT INTO availability_slots (doctor_id, clinic_id, day_of_week, start_time, end_time, interval_minutes, source) VALUES
('DR_792874827F61', 'CLN_A7F3B2E9C1D5', 'Mon', '10:00', '14:00', 15, 'admin'),
('DR_792874827F61', 'CLN_A7F3B2E9C1D5', 'Wed', '10:00', '14:00', 15, 'admin'),
('DR_792874827F61', 'CLN_A7F3B2E9C1D5', 'Fri', '10:00', '14:00', 15, 'admin'),
('DR_8A3985938G72', 'CLN_B8E4C3F0D2E6', 'Tue', '09:00', '13:00', 15, 'admin'),
('DR_8A3985938G72', 'CLN_B8E4C3F0D2E6', 'Thu', '09:00', '13:00', 15, 'admin'),
('DR_9B40A69A9H83', 'CLN_C9F5D4G1E3F7', 'Mon', '11:00', '15:00', 20, 'admin'),
('DR_9B40A69A9H83', 'CLN_C9F5D4G1E3F7', 'Thu', '11:00', '15:00', 20, 'admin'),
('DR_0C51B7AB0I94', 'CLN_D0G6E5H2F4G8', 'Wed', '14:00', '18:00', 15, 'admin'),
('DR_1D62C8BC1J05', 'CLN_E1H7F6I3G5H9', 'Mon', '09:00', '12:00', 10, 'admin'),
('DR_1D62C8BC1J05', 'CLN_E1H7F6I3G5H9', 'Fri', '09:00', '12:00', 10, 'admin'),
('DR_2E73D9CD2K16', 'CLN_F2I8G7J4H6I0', 'Tue', '10:00', '14:00', 15, 'admin'),
('DR_3F84EADE3L27', 'CLN_G3J9H8K5I7J1', 'Mon', '16:00', '20:00', 20, 'admin'),
('DR_4G95FBEF4M38', 'CLN_H4K0I9L6J8K2', 'Wed', '10:00', '14:00', 15, 'admin'),
('DR_5H06GCF05N49', 'CLN_I5L1J0M7K9L3', 'Thu', '14:00', '18:00', 30, 'admin'),
('DR_6I17HDG16O50', 'CLN_J6M2K1N8L0M4', 'Sat', '09:00', '13:00', 15, 'admin'),
('DR_7J28IEH27P61', 'CLN_K7N3L2O9M1N5', 'Mon', '10:00', '14:00', 15, 'admin'),
('DR_7J28IEH27P61', 'CLN_K7N3L2O9M1N5', 'Tue', '10:00', '14:00', 15, 'admin');

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
('BK202601261A3B4C5','DR_792874827F61','CLN_A7F3B2E9C1D5','PAT_EB77524149E8','Raju Mondal','9877788990',35,'Male','B+','2026-01-26',1,'10:00','seen'),
('BK202601262D5E6F7','DR_8A3985938G72','CLN_B8E4C3F0D2E6','PAT_FC88635250F9','Sumi Das','9888899001',28,'Female','O+','2026-01-26',2,'10:15','seen'),
('BK202601263G7H8I9','DR_9B40A69A9H83','CLN_C9F5D4G1E3F7','PAT_GD9974636G0A','Anik Paul','9866677882',40,'Male','A+','2026-01-26',3,'10:30','seen'),
('BK202601264J9K0L1','DR_0C51B7AB0I94','CLN_D0G6E5H2F4G8','PAT_HE00857047H1B','Tina Roy','9855566773',22,'Female','AB+','2026-01-26',4,'10:45','seen'),
('BK202601265M1N2O3','DR_1D62C8BC1J05','CLN_E1H7F6I3G5H9','PAT_IF11968158I2C','Rohan Singh','9844455664',31,'Male','O-','2026-01-26',5,'11:00','seen'),
('BK202601266P3Q4R5','DR_3F84EADE3L27','CLN_G3J9H8K5I7J1','PAT_JG22079269J3D','Kartik Sen','9876546666',18,'Male','A-','2026-01-26',6,'11:15','not_seen'),
('BK202601267S5T6U7','DR_4G95FBEF4M38','CLN_H4K0I9L6J8K2','PAT_KH3318A370K4E','Puja Mitra','9876547777',27,'Female','O+','2026-01-26',7,'11:30','not_seen'),
('BK202601268V7W8X9','DR_5H06GCF05N49','CLN_I5L1J0M7K9L3','PAT_LI442BB481L5F','Amit Sharma','9876548888',45,'Male','B+','2026-01-26',8,'11:45','cancelled'),
('BK202601269Y9Z0A1','DR_6I17HDG16O50','CLN_J6M2K1N8L0M4','PAT_MJ553CC592M6G','Neha Verma','9876549999',34,'Female','A+','2026-01-26',9,'12:00','no_show'),
('BK202601260B1C2D3','DR_792874827F61','CLN_A7F3B2E9C1D5','PAT_NK664DD6A3N7H','Sonu Yadav','9876500000',29,'Male','O+','2026-01-26',10,'12:15','not_seen');

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
('VIS0202601260001','DR_792874827F61','CLN_A7F3B2E9C1D5','PAT_EB77524149E8','BK202601261A3B4C5','Raju Mondal',35,'Male',72,101.3,'120/80','Viral Fever','X-ray','Rest, fluids',500,'/prescriptions/VIS0202601260001.pdf','doctor'),
('VIS0202601260002','DR_8A3985938G72','CLN_B8E4C3F0D2E6','PAT_FC88635250F9','BK202601262D5E6F7','Sumi Das',28,'Female',58,98.6,'110/70','Cold & Cough',NULL,'Steam inhalation, vitamin C',300,'/prescriptions/VIS0202601260002.pdf','doctor'),
('VIS0202601260003','DR_9B40A69A9H83','CLN_C9F5D4G1E3F7','PAT_GD9974636G0A',NULL,'Anik Paul',40,'Male',80,99.1,'125/85','Lower Back Pain',NULL,'Physiotherapy, posture correction',400,'/prescriptions/VIS0202601260003.pdf','clinic'),
('VIS0202601260004','DR_0C51B7AB0I94','CLN_D0G6E5H2F4G8','PAT_HE00857047H1B',NULL,'Tina Roy',22,'Female',52,98.9,'110/70','Routine Checkup',NULL,'Healthy diet & exercise',250,'/prescriptions/VIS0202601260004.pdf','doctor'),
('VIS0202601260005','DR_1D62C8BC1J05','CLN_E1H7F6I3G5H9','PAT_IF11968158I2C','BK202601265M1N2O3','Rohan Singh',31,'Male',75,100.2,'130/85','Ear Infection',NULL,'Antibiotics for 5 days',350,'/prescriptions/VIS0202601260005.pdf','doctor');

-- ===========================
-- Prescription Items (Medicines - linked to visits)
-- ===========================
INSERT INTO prescription_items (visit_id, doctor_id, medicine_name, dose, frequency, timing, source) VALUES
-- Visit 1: Raju - Viral Fever
('VIS0202601260001','DR_792874827F61','Paracetamol','500mg','Twice a day','After food','doctor'),
('VIS0202601260001','DR_792874827F61','Cetirizine','10mg','Once a day','Night','doctor'),

-- Visit 2: Sumi - Cold & Cough
('VIS0202601260002','DR_8A3985938G72','Amoxicillin','500mg','3 times a day','After food','doctor'),
('VIS0202601260002','DR_8A3985938G72','Vitamin C','500mg','Once a day','Morning','doctor'),

-- Visit 3: Anik - Lower Back Pain
('VIS0202601260003','DR_9B40A69A9H83','Ibuprofen','400mg','Twice a day','After food','doctor'),
('VIS0202601260003','DR_9B40A69A9H83','Calcium','500mg','Once a day','Morning','doctor'),

-- Visit 4: Tina - Routine Checkup
('VIS0202601260004','DR_0C51B7AB0I94','Multivitamin','1 tablet','Once a day','Morning','doctor'),
('VIS0202601260004','DR_0C51B7AB0I94','Vitamin D','1000 IU','Once a day','Morning','doctor'),

-- Visit 5: Rohan - Ear Infection
('VIS0202601260005','DR_1D62C8BC1J05','Amoxicillin','500mg','3 times a day','After food','doctor'),
('VIS0202601260005','DR_1D62C8BC1J05','Paracetamol','500mg','Twice a day','After food','doctor');

-- ===========================
-- Follow-ups (sample data)
-- ===========================
INSERT INTO follow_ups (visit_id, patient_id, doctor_id, clinic_id, follow_up_date, reason, status) VALUES
('VIS0202601260001', 'PAT_EB77524149E8', 'DR_792874827F61', 'CLN_A7F3B2E9C1D5', '2026-02-02', 'Fever follow-up check', 'pending'),
('VIS0202601260003', 'PAT_GD9974636G0A', 'DR_9B40A69A9H83', 'CLN_C9F5D4G1E3F7', '2026-02-10', 'Back pain review', 'pending'),
('VIS0202601260005', 'PAT_IF11968158I2C', 'DR_1D62C8BC1J05', 'CLN_E1H7F6I3G5H9', '2026-02-05', 'Ear infection follow-up', 'pending');

-- ===========================
-- Feedbacks (sample data)
-- ===========================
INSERT INTO feedbacks (visit_id, patient_id, doctor_id, clinic_id, rating, feedback_text, would_recommend) VALUES
('VIS0202601260001', 'PAT_EB77524149E8', 'DR_792874827F61', 'CLN_A7F3B2E9C1D5', 5, 'Excellent doctor, very caring', 1),
('VIS0202601260002', 'PAT_FC88635250F9', 'DR_8A3985938G72', 'CLN_B8E4C3F0D2E6', 4, 'Good treatment, quick recovery', 1),
('VIS0202601260004', 'PAT_HE00857047H1B', 'DR_0C51B7AB0I94', 'CLN_D0G6E5H2F4G8', 5, 'Very thorough checkup', 1);


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
-- Invoices (Sample data for visits)
-- ===========================
INSERT INTO invoices (
    invoice_id,
    visit_id,
    clinic_id,
    patient_name,
    patient_mobile,
    doctor_name,
    consultation_fee,
    medicine_charges,
    lab_charges,
    other_charges,
    other_charges_desc,
    subtotal,
    discount,
    tax_percentage,
    tax_amount,
    total_amount,
    payment_status,
    payment_method,
    payment_date,
    invoice_path,
    notes,
    created_by
) VALUES
-- Invoice for Visit 1: Raju - Viral Fever (Paid)
('INV20260126001','VIS0202601260001','CLN_A7F3B2E9C1D5','Raju Mondal','9877788990','Jasim Alam',500,150,200,0,NULL,850,50,5,40,840,'paid','cash','2026-01-26 11:30:00','/pdfs/INV20260126001.pdf','Paid in cash','DR_792874827F61'),

-- Invoice for Visit 2: Sumi - Cold & Cough (Paid via UPI)
('INV20260126002','VIS0202601260002','CLN_B8E4C3F0D2E6','Sumi Das','9888899001','Anil Das',300,80,0,0,NULL,380,0,0,0,380,'paid','upi','2026-01-26 12:00:00','/pdfs/INV20260126002.pdf','Paid via UPI','DR_8A3985938G72'),

-- Invoice for Visit 3: Anik - Lower Back Pain (Unpaid)
('INV20260126003','VIS0202601260003','CLN_C9F5D4G1E3F7','Anik Paul','9866677882','Soma Roy',400,120,0,50,'X-ray consultation',570,0,5,27.14,597.14,'unpaid',NULL,NULL,'/pdfs/INV20260126003.pdf','Follow-up payment pending','DR_9B40A69A9H83'),

-- Invoice for Visit 4: Tina - Routine Checkup (Paid via Card)
('INV20260126004','VIS0202601260004','CLN_D0G6E5H2F4G8','Tina Roy','9855566773','Amit Paul',250,0,0,0,NULL,250,0,0,0,250,'paid','card','2026-01-26 14:15:00','/pdfs/INV20260126004.pdf','Card payment successful','DR_0C51B7AB0I94'),

-- Invoice for Visit 5: Rohan - Ear Infection (Unpaid)
('INV20260126005','VIS0202601260005','CLN_E1H7F6I3G5H9','Rohan Singh','9844455664','Nina Bose',350,100,0,0,NULL,450,0,0,0,450,'unpaid',NULL,NULL,'/pdfs/INV20260126005.pdf','Payment pending','DR_1D62C8BC1J05');

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
('support_email', 'doctorpod.info@gmail.com', 'string', 'Support email address'),
('support_phone', '+91 9330317102', 'string', 'Support phone number');