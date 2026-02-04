// Get doctor availability (timings) for a given doctor and clinic
async function getDoctorAvailability(req, res) {
  try {
    const { doctor_id, clinic_id } = req.query;
    if (!doctor_id || !clinic_id) return res.status(400).json({ success: false, message: 'Missing doctor_id or clinic_id' });
    const rows = await db.prepare('SELECT day_of_week, start_time, end_time FROM availability_slots WHERE doctor_id = ? AND clinic_id = ? ORDER BY id').all(doctor_id, clinic_id);
    res.json({ success: true, availability: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}
const db = require('../utils/db');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// Helper function to add "Dr." prefix for display
function formatDoctorName(name) {
  if (!name) return '';
  const trimmed = name.trim();
  // Don't add if already has Dr./DR./dr. prefix
  if (/^dr\.?\s/i.test(trimmed)) return trimmed;
  return `Dr. ${trimmed}`;
}

// Email configuration for OTP
const emailConfig = {
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
};

// Create email transporter
let emailTransporter;
try {
  emailTransporter = nodemailer.createTransport(emailConfig);
} catch (error) {
  console.warn('⚠️  Email transporter not configured. OTP will be logged to console only.');
}

async function getAllDoctors(req, res){
  try{
    // Only fetch active doctors
    const rows = await db.prepare('SELECT doctor_id, name, qualification, specialization, mobile, email, clinic_id FROM doctors WHERE is_active = 1 ORDER BY name').all();
    // attach clinics for each doctor
    for (const d of rows) {
      const clinics = await db.prepare('SELECT clinic_id, name, address FROM clinics WHERE clinic_id = ? AND is_active = 1').all(d.clinic_id);
      d.clinics = clinics || [];
      d.name = formatDoctorName(d.name); // Add Dr. prefix for display
    }
    res.json({ success: true, doctors: rows });
  }catch(e){ res.status(500).json({ success:false, message: e.message }); }
}


// Allow login with either mobile or email
async function loginDoctor(req, res){
  try {
    const { identifier, password, fetchClinics, clinic_id } = req.body;
    if (!identifier) return res.status(400).json({ success: false, message: 'Missing credentials' });
    // Fetch clinics tagged to this doctor (no password required)
    if (fetchClinics) {
      const user = await db.prepare('SELECT * FROM doctors WHERE LOWER(doctor_id) = LOWER(?) OR mobile = ?').get(identifier, identifier);
      if (!user) return res.status(404).json({ success: false, message: 'Doctor not found' });
      const clinics = await db.prepare(`SELECT DISTINCT c.clinic_id, c.name, c.address FROM clinics c 
        INNER JOIN availability_slots da ON da.clinic_id = c.clinic_id WHERE da.doctor_id = ?`).all(user.doctor_id);
      let fallbackClinics = [];
      if (!clinics.length && user.clinic_id) {
        const fallback = await db.prepare('SELECT clinic_id, name, address FROM clinics WHERE clinic_id = ?').get(user.clinic_id);
        if (fallback) fallbackClinics = [fallback];
      }
      return res.json({ success: true, id: user.doctor_id, name: user.name, clinics: clinics.length ? clinics : fallbackClinics });
    }
    // Validate selected clinic and password
    if (!password) return res.status(400).json({ success: false, message: 'Missing credentials' });
    const user = await db.prepare('SELECT * FROM doctors WHERE LOWER(doctor_id) = LOWER(?) OR mobile = ?').get(identifier, identifier);
    if (!user || user.password !== password) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (clinic_id) {
      const validClinic = await db.prepare(`SELECT c.clinic_id, c.name, c.address FROM clinics c 
        INNER JOIN availability_slots da ON da.clinic_id = c.clinic_id WHERE da.doctor_id = ? AND c.clinic_id = ?`).get(user.doctor_id, clinic_id);
      let clinic = validClinic;
      if (!clinic) {
        if (user.clinic_id === clinic_id) {
          clinic = await db.prepare('SELECT clinic_id, name, address FROM clinics WHERE clinic_id = ?').get(clinic_id);
        }
      }
      if (!clinic) return res.status(403).json({ success: false, message: 'You are not assigned to this clinic.' });
      req.session.doctor = { id: user.doctor_id, name: formatDoctorName(user.name), clinic_id: clinic.clinic_id };
      return res.json({ success: true, id: user.doctor_id, name: formatDoctorName(user.name), clinic });
    }
    return res.status(400).json({ success: false, message: 'Clinic selection required.' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// Get all clinics (for booking form dropdown)
async function getAllClinics(req, res) {
  try {
    const clinics = await db.prepare('SELECT clinic_id, name, address, enable_voice_prescription, enable_video_consultation FROM clinics ORDER BY name').all();
    res.json({ success: true, clinics });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// Get all doctors for a clinic (for booking form dropdown)
async function getDoctorsByClinic(req, res) {
  try {
    const { clinic_id } = req.params;
    if (!clinic_id) return res.status(400).json({ success: false, message: 'Missing clinic_id' });
    // Only fetch active doctors
    const doctors = await db.prepare('SELECT doctor_id, name, qualification, specialization, mobile FROM doctors WHERE clinic_id = ? AND is_active = 1 ORDER BY name').all(clinic_id);
    doctors.forEach(d => d.name = formatDoctorName(d.name)); // Add Dr. prefix for display
    res.json({ success: true, doctors });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

async function addDoctor(req, res){
  // Allow both admin and clinic to add doctors
  console.log('=== ADD DOCTOR REQUEST ===');
  console.log('Session:', req.session);
  console.log('Body:', req.body);
  console.log('Headers:', req.headers);
  
  let clinic_id = req.body.clinic_id;
  let source = null;
  if (req.session.admin) {
    source = req.session.admin.admin_id;
    console.log('Request from ADMIN:', source);
  } else if (req.session.clinic) {
    clinic_id = req.session.clinic.clinic_id;
    source = req.session.clinic.clinic_id;
    console.log('Request from CLINIC:', source);
  } else {
    console.log('UNAUTHORIZED: No session found');
    return res.status(403).json({ success: false, message: 'Unauthorized - Please login again' });
  }
  const { name, qualification, specialization, phone, email, password, registration_no } = req.body;
  
  if (!name || !phone || !password || !clinic_id) {
    console.log('MISSING FIELDS:', { name: !!name, phone: !!phone, password: !!password, clinic_id: !!clinic_id });
    return res.status(400).json({ success: false, message: 'Missing required fields: name, phone, password' });
  }
  
  // Normalize doctor name: strip "Dr." or "DR." or "dr." prefix
  const normalizedName = name.trim().replace(/^(dr\.?|DR\.?)\s*/i, '');
  
  // Auto-generate doctor_id using secure random generation
  const { generateUniqueId, generateSecureId } = require('../utils/idGenerator');
  
  try {
    // Generate unique doctor_id with collision handling
    const doctor_id = await generateUniqueId(
      db,
      'doctors',
      'doctor_id',
      () => generateSecureId('DR', 12),
      50
    );

    console.log('Generated doctor_id:', doctor_id);
  
    // ====== PRE-CHECK: Verify no duplicates BEFORE inserting ======
    console.log('🔍 Checking for existing doctor with mobile:', phone);
    try {
      const existingByMobile = await db.prepare('SELECT doctor_id, name, mobile FROM doctors WHERE mobile = ?').get(phone);
      if (existingByMobile) {
        console.log('❌ DUPLICATE FOUND - Doctor with this mobile already exists:', existingByMobile);
        return res.status(400).json({ 
          success: false, 
          message: `Mobile number ${phone} is already registered to Dr. ${existingByMobile.name} (ID: ${existingByMobile.doctor_id})` 
        });
      }
      console.log('✅ No duplicate mobile found');
      
      // Check for duplicate email if email is provided
      if (email) {
        console.log('🔍 Checking for existing doctor with email:', email);
        const existingByEmail = await db.prepare('SELECT doctor_id, name, email FROM doctors WHERE email = ?').get(email);
        if (existingByEmail) {
          console.log('❌ DUPLICATE FOUND - Doctor with this email already exists:', existingByEmail);
          return res.status(400).json({ 
            success: false, 
            message: `Email ${email} is already registered to Dr. ${existingByEmail.name} (ID: ${existingByEmail.doctor_id})` 
          });
        }
        console.log('✅ No duplicate email found');
      }
      console.log('✅ No duplicate ID collision possible (using secure random)');
    } catch (checkError) {
      console.error('⚠️ Error during pre-check (will continue):', checkError);
      // Don't return here - let it try to insert and let DB constraints handle it
    }
  
    // ====== INSERTION: Only reached if no duplicates found ======
    console.log('💾 Attempting to insert doctor into database...');
    try {
      await db.prepare('INSERT INTO doctors (doctor_id, clinic_id, name, qualification, specialization, mobile, email, password, source, registration_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(doctor_id, clinic_id, normalizedName, qualification || '', specialization || '', phone || null, email || null, password, source, registration_no || null);
      console.log('Doctor added successfully!');
      res.json({ success: true, doctor_id });
    } catch (e) {
    console.error('Database error:', e);
    console.error('Error code:', e.code);
    console.error('Error message:', e.message);
    
    // Handle specific constraint errors with user-friendly messages
    const errorMsg = (e.message || '').toLowerCase();
    const errorCode = e.code || '';
    
    if (errorCode === 'SQLITE_CONSTRAINT' || errorMsg.includes('unique constraint failed')) {
      // Check which specific field caused the constraint violation
      if (errorMsg.includes('doctors.mobile')) {
        console.log('Duplicate mobile detected:', phone);
        return res.status(400).json({ 
          success: false, 
          message: `Mobile number ${phone} is already registered. Please use a different number.` 
        });
      } else if (errorMsg.includes('doctors.email')) {
        console.log('Duplicate email detected:', email);
        return res.status(400).json({ 
          success: false, 
          message: `Email ${email} is already registered. Please use a different email.` 
        });
      } else if (errorMsg.includes('doctors.doctor_id')) {
        console.log('Duplicate doctor_id detected:', doctor_id);
        return res.status(400).json({ 
          success: false, 
          message: `A doctor with similar name and mobile number already exists (ID: ${doctor_id}). Please verify the details.` 
        });
      } else {
        console.log('Unknown constraint violation:', errorMsg);
        return res.status(400).json({ 
          success: false, 
          message: 'This doctor information conflicts with an existing record. Please check all fields.' 
        });
      }
    }
    
    res.status(500).json({ success: false, message: 'Database error: ' + (e.message || 'Unknown error') });
  }
  } catch (e) {
    console.error('Doctor creation failed:', e);
    res.status(500).json({ success: false, message: e.message || 'Failed to create doctor' });
  }
}



async function getDoctorById(req, res){
  try{
    const doc = await db.prepare('SELECT doctor_id, name, qualification, specialization, mobile, email, clinic_id FROM doctors WHERE doctor_id = ?').get(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    doc.name = formatDoctorName(doc.name); // Add Dr. prefix for display
    // Get clinic info for this doctor
    let clinics = [];
    if (doc.clinic_id) {
      const clinic = await db.prepare('SELECT clinic_id, name, address FROM clinics WHERE clinic_id = ?').get(doc.clinic_id);
      if (clinic) clinics.push(clinic);
    }
    res.json({ success: true, doctor: doc, clinics });
  }catch(e){ res.status(500).json({ success:false, message: e.message }); }
}

async function deleteDoctor(req, res){
  // Allow both admin and clinic to delete (soft delete) doctors
  const isAdmin = req.session && req.session.admin;
  const isClinic = req.session && req.session.clinic;
  
  if (!isAdmin && !isClinic) return res.status(403).json({ success: false, message: 'Unauthorized' });
  
  const { id } = req.body;
  if (!id) return res.status(400).json({ success: false, message: 'Missing id' });
  
  try {
    // If clinic is deleting, ensure the doctor belongs to their clinic
    if (isClinic) {
      const doctor = await db.prepare('SELECT clinic_id FROM doctors WHERE doctor_id = ?').get(id);
      if (!doctor || doctor.clinic_id !== req.session.clinic.clinic_id) {
        return res.status(403).json({ success: false, message: 'You can only delete doctors from your clinic' });
      }
    }
    
    // Soft delete: Mark doctor as inactive instead of deleting
    await db.prepare('UPDATE doctors SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE doctor_id = ?').run(id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

async function updateDoctor(req, res){
  // Allow admin, clinic, or doctor themselves to update
  const isAdmin = req.session && req.session.admin;
  const isClinic = req.session && req.session.clinic;
  const isDoctor = req.session && req.session.doctor;
  
  if (!isAdmin && !isClinic && !isDoctor) return res.status(403).json({ success: false, message: 'Unauthorized' });
  
  const { doctor_id, name, qualification, specialization, mobile, email, password, registration_no, experience } = req.body;
  if (!doctor_id) return res.status(400).json({ success: false, message: 'Missing doctor_id' });
  
  // If doctor is updating, ensure they can only update their own profile
  if (isDoctor && req.session.doctor.id !== doctor_id) {
    return res.status(403).json({ success: false, message: 'You can only update your own profile' });
  }
  
  try {
    const updates = [];
    const values = [];
    
    if (name) { updates.push('name = ?'); values.push(name); }
    if (qualification !== undefined) { updates.push('qualification = ?'); values.push(qualification); }
    if (specialization !== undefined) { updates.push('specialization = ?'); values.push(specialization); }
    if (mobile) { updates.push('mobile = ?'); values.push(mobile); }
    if (email !== undefined) { updates.push('email = ?'); values.push(email); }
    if (password) { updates.push('password = ?'); values.push(password); }
    if (registration_no !== undefined) { updates.push('registration_no = ?'); values.push(registration_no); }
    if (experience !== undefined) { updates.push('experience = ?'); values.push(experience); }
    
    if (updates.length === 0) return res.status(400).json({ success: false, message: 'No fields to update' });
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(doctor_id);
    
    const sql = `UPDATE doctors SET ${updates.join(', ')} WHERE doctor_id = ?`;
    await db.prepare(sql).run(...values);
    
    // Update session if doctor updated their own profile
    if (isDoctor) {
      const updated = await db.prepare('SELECT doctor_id, name FROM doctors WHERE doctor_id = ?').get(doctor_id);
      if (updated) req.session.doctor = { id: updated.doctor_id, name: formatDoctorName(updated.name), clinic_id: req.session.doctor.clinic_id };
    }
    
    res.json({ success: true, message: 'Doctor updated successfully' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

// Change password for doctor
async function changeDoctorPassword(req, res){
  if (!req.session.doctor) return res.status(403).json({ success: false, message: 'Unauthorized' });
  
  const { old_password, new_password, currentPassword, newPassword } = req.body;
  const oldPass = old_password || currentPassword;
  const newPass = new_password || newPassword;
  
  if (!oldPass || !newPass) {
    return res.status(400).json({ success: false, message: 'Both old and new passwords are required' });
  }
  
  const doctor_id = req.session.doctor.id;
  
  try {
    // Verify old password
    const doctor = await db.prepare('SELECT password FROM doctors WHERE doctor_id = ?').get(doctor_id);
    if (!doctor || doctor.password !== oldPass) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }
    
    // Update to new password
    await db.prepare('UPDATE doctors SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE doctor_id = ?').run(newPass, doctor_id);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// Get doctor profile
async function getDoctorProfile(req, res){
  if (!req.session.doctor) return res.status(403).json({ success: false, message: 'Unauthorized' });
  
  const doctor_id = req.session.doctor.id;
  
  try {
    const doctor = await db.prepare('SELECT doctor_id, name, qualification, specialization, mobile, email, registration_no, clinic_id FROM doctors WHERE doctor_id = ?').get(doctor_id);
    
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });
    
    // Get clinic info including logo
    const clinic = await db.prepare('SELECT clinic_id, name, address, logo_path, enable_voice_prescription, enable_video_consultation FROM clinics WHERE clinic_id = ?').get(doctor.clinic_id);
    
    console.log('📋 getDoctorProfile - Clinic data:', clinic);
    console.log('📋 Logo path from DB:', clinic ? clinic.logo_path : 'NO CLINIC');
    
    // Return flattened structure for dashboard
    const profile = {
      doctor_id: doctor.doctor_id,
      name: formatDoctorName(doctor.name),
      qualification: doctor.qualification,
      specialization: doctor.specialization,
      mobile: doctor.mobile,
      email: doctor.email,
      registration_no: doctor.registration_no,
      clinic_id: clinic ? clinic.clinic_id : null,
      clinic_name: clinic ? clinic.name : null,
      clinic_location: clinic ? clinic.address : null,
      clinic_logo_path: clinic ? clinic.logo_path : null,
      enable_voice_prescription: clinic ? clinic.enable_voice_prescription : 0,
      enable_video_consultation: clinic ? clinic.enable_video_consultation : 0
    };
    
    console.log('📤 Sending profile response with clinic_logo_path:', profile.clinic_logo_path);
    
    res.json({ success: true, doctor: profile });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// Get doctor session info
function getDoctorSession(req, res) {
  if (req.session && req.session.doctor) {
    res.json({ success: true, doctor: req.session.doctor });
  } else {
    res.json({ success: false });
  }
}

// Update doctor profile
async function updateDoctorProfile(req, res) {
  if (!req.session.doctor) return res.status(403).json({ success: false, message: 'Unauthorized' });
  
  const doctor_id = req.session.doctor.id;
  const { name, qualification, specialization, mobile, email, registration_no } = req.body;
  
  // Validate required fields
  if (!name || !qualification || !specialization || !mobile) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }
  
  try {
    // Update doctor profile
    await db.prepare(`
      UPDATE doctors 
      SET name = ?, qualification = ?, specialization = ?, mobile = ?, email = ?, registration_no = ?
      WHERE doctor_id = ?
    `).run(name, qualification, specialization, mobile, email || '', registration_no || '', doctor_id);
    
    // Update session with new name
    req.session.doctor.name = name;
    
    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (e) {
    console.error('updateDoctorProfile error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
}

// Logout doctor
function logoutDoctor(req, res) {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Logout failed' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
}

// ============= FORGOT PASSWORD WITH OTP =============

// Temporary OTP storage (in production, use Redis or database with expiry)
const otpStore = new Map(); // { identifier: { otp, email, expiresAt, token, doctor_id } }

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate verification token
function generateToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Mask email address
function maskEmail(email) {
  if (!email || !email.includes('@')) return '****@****.com';
  const [username, domain] = email.split('@');
  if (username.length <= 2) {
    return `${username[0]}***@${domain}`;
  }
  return `${username[0]}${'*'.repeat(username.length - 1)}@${domain}`;
}

// Send email with OTP
async function sendOTPEmail(email, otp, doctorName) {
  const mailOptions = {
    from: `"DoctorPod" <${emailConfig.auth.user}>`,
    to: email,
    subject: '🔐 Password Reset OTP - DoctorPod',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #ecfdf5; padding: 30px; border-radius: 0 0 10px 10px; }
          .otp-box { background: white; border: 2px dashed #10b981; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
          .otp-code { font-size: 32px; font-weight: bold; color: #10b981; letter-spacing: 5px; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🩺 DoctorPod</h1>
            <p>Password Reset Request</p>
          </div>
          <div class="content">
            <p>Hello <strong>${doctorName}</strong>,</p>
            <p>We received a request to reset your password. Use the OTP below to proceed:</p>
            
            <div class="otp-box">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">Your OTP Code</p>
              <div class="otp-code">${otp}</div>
              <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 12px;">Valid for 10 minutes</p>
            </div>
            
            <p><strong>⚠️ Security Note:</strong></p>
            <ul style="color: #6b7280; font-size: 14px;">
              <li>Do not share this OTP with anyone</li>
              <li>DoctorPod will never ask for your OTP</li>
              <li>If you didn't request this, please ignore this email</li>
            </ul>
          </div>
          <div class="footer">
            <p>© 2026 DoctorPod. All rights reserved.</p>
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    if (emailTransporter) {
      await emailTransporter.sendMail(mailOptions);
      return true;
    } else {
      console.warn('⚠️  Email not sent (transporter not configured)');
      return false;
    }
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    return false;
  }
}

// Send OTP (Step 1)
async function sendPasswordResetOTP(req, res) {
  const { identifier } = req.body;
  
  if (!identifier) {
    return res.status(400).json({ success: false, message: 'Doctor ID or Mobile is required' });
  }
  
  try {
    // Find doctor by doctor_id or mobile
    const doctor = await db.prepare('SELECT doctor_id, mobile, email, name FROM doctors WHERE doctor_id = ? OR mobile = ?').get(identifier, identifier);
    
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }
    
    if (!doctor.email) {
      return res.status(400).json({ success: false, message: 'No email registered for this doctor. Please contact admin.' });
    }
    
    // Generate OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry
    
    // Store OTP temporarily
    otpStore.set(identifier, {
      otp,
      email: doctor.email,
      doctor_id: doctor.doctor_id,
      expiresAt,
      verified: false
    });
    
    // Send OTP via email
    const emailSent = await sendOTPEmail(doctor.email, otp, formatDoctorName(doctor.name));
    
    // Log to console for testing/debugging
    console.log('\\n===========================================');
    console.log('📧 PASSWORD RESET OTP FOR DOCTOR');
    console.log('===========================================');
    console.log(`Doctor: ${formatDoctorName(doctor.name)}`);
    console.log(`Doctor ID: ${doctor.doctor_id}`);
    console.log(`Email: ${doctor.email}`);
    console.log(`OTP: ${otp}`);
    console.log(`Email Sent: ${emailSent ? '✅ Yes' : '⚠️  No (check console)'}`);
    console.log(`Valid for: 10 minutes`);
    console.log('===========================================\\n');
    
    res.json({ 
      success: true, 
      message: emailSent ? 'OTP sent to your email' : 'OTP generated (check console)',
      maskedEmail: maskEmail(doctor.email)
    });
    
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
}

// Verify OTP (Step 2)
async function verifyPasswordResetOTP(req, res) {
  const { identifier, otp } = req.body;
  
  if (!identifier || !otp) {
    return res.status(400).json({ success: false, message: 'Identifier and OTP are required' });
  }
  
  try {
    const storedData = otpStore.get(identifier);
    
    if (!storedData) {
      return res.status(400).json({ success: false, message: 'OTP not found or expired. Please request a new OTP.' });
    }
    
    // Check expiry
    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(identifier);
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new OTP.' });
    }
    
    // Verify OTP
    if (storedData.otp !== otp.trim()) {
      return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
    }
    
    // Generate verification token
    const token = generateToken();
    storedData.verified = true;
    storedData.token = token;
    storedData.tokenExpiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes to reset password
    
    console.log(`✅ OTP verified for doctor: ${storedData.doctor_id}`);
    
    res.json({ 
      success: true, 
      message: 'OTP verified successfully',
      token 
    });
    
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ success: false, message: 'Failed to verify OTP' });
  }
}

// Reset Password (Step 3)
async function resetPassword(req, res) {
  const { identifier, token, new_password } = req.body;
  
  if (!identifier || !token || !new_password) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }
  
  if (new_password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
  }
  
  try {
    const storedData = otpStore.get(identifier);
    
    if (!storedData) {
      return res.status(400).json({ success: false, message: 'Session expired. Please start again.' });
    }
    
    // Verify token
    if (!storedData.verified || storedData.token !== token) {
      return res.status(400).json({ success: false, message: 'Invalid or expired session. Please start again.' });
    }
    
    // Check token expiry
    if (Date.now() > storedData.tokenExpiresAt) {
      otpStore.delete(identifier);
      return res.status(400).json({ success: false, message: 'Session expired. Please start again.' });
    }
    
    // Update password in database
    await db.prepare('UPDATE doctors SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE doctor_id = ?')
      .run(new_password, storedData.doctor_id);
    
    // Clear OTP data
    otpStore.delete(identifier);
    
    console.log(`🔐 Password reset successful for doctor: ${storedData.doctor_id}`);
    
    res.json({ 
      success: true, 
      message: 'Password reset successfully' 
    });
    
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
}

module.exports = { getAllDoctors, loginDoctor, addDoctor, getDoctorById, deleteDoctor, updateDoctor, getAllClinics, getDoctorsByClinic, getDoctorAvailability, changeDoctorPassword, getDoctorProfile, updateDoctorProfile, getDoctorSession, logoutDoctor, sendPasswordResetOTP, verifyPasswordResetOTP, resetPassword };

