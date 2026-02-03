const db = require('../utils/db');
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

// Email configuration for OTP
const emailConfig = {
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com', // Set this in environment variable
    pass: process.env.EMAIL_PASS || 'your-app-password'     // Use Gmail App Password
  }
};

// Create email transporter
let emailTransporter;
try {
  emailTransporter = nodemailer.createTransport(emailConfig);
} catch (error) {
  console.warn('⚠️  Email transporter not configured. OTP will be logged to console only.');
}

// Get all clinics (for admin dashboard)
async function getAllClinics(req, res) {
  try {
    // Only fetch active clinics
    const rows = await db.prepare('SELECT clinic_id, name, phone, email, address, upi_id, qr_code_path, logo_path FROM clinics WHERE is_active = 1 ORDER BY name').all();
    res.json({ success: true, clinics: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// Clinic login endpoint
async function loginClinic(req, res) {
  const { clinic_id, password } = req.body;
  const clinicId = String(clinic_id || '').trim();
  const pass = String(password || '').trim();
  if (!clinicId || !pass) {
    return res.status(400).json({ success: false, message: 'Missing credentials' });
  }
  // Login by clinic_id and password (case-insensitive clinic_id)
  const clinic = await db.prepare('SELECT * FROM clinics WHERE LOWER(clinic_id) = LOWER(?)').get(clinicId);
  if (!clinic || clinic.password !== pass) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
  // Store clinic info in session including logo and address
  req.session.clinic = { 
    clinic_id: clinic.clinic_id, 
    name: clinic.name,
    logo_path: clinic.logo_path,
    address: clinic.address
  };
  res.json({ success: true, clinic_id: clinic.clinic_id, name: clinic.name });
}

// Clinic session check endpoint
async function clinicSession(req, res) {
  if (req.session && req.session.clinic && req.session.clinic.clinic_id) {
    try {
      // Fetch fresh clinic data from database to include logo and address
      const clinic = await db.prepare('SELECT clinic_id, name, logo_path, address FROM clinics WHERE clinic_id = ?').get(req.session.clinic.clinic_id);
      
      if (clinic) {
        // Update session with complete data
        req.session.clinic = {
          clinic_id: clinic.clinic_id,
          name: clinic.name,
          logo_path: clinic.logo_path,
          address: clinic.address
        };
        res.json({ success: true, clinic: req.session.clinic });
      } else {
        res.json({ success: false });
      }
    } catch (error) {
      console.error('Error fetching clinic session:', error);
      res.json({ success: false });
    }
  } else {
    res.json({ success: false });
  }
}

async function deleteClinic(req, res){
  if (!req.session.admin) return res.status(403).json({ success: false, message: 'Unauthorized' });
  const { clinic_id } = req.body;
  if (!clinic_id) return res.status(400).json({ success: false, message: 'Missing clinic_id' });
  try {
    // Soft delete: Mark clinic and related doctors as inactive instead of deleting
    await db.prepare('UPDATE clinics SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE clinic_id = ?').run(clinic_id);
    await db.prepare('UPDATE doctors SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE clinic_id = ?').run(clinic_id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

async function updateClinic(req, res){
  // Allow both admin and clinic to update
  const isAdmin = req.session && req.session.admin;
  const isClinic = req.session && req.session.clinic;
  
  if (!isAdmin && !isClinic) return res.status(403).json({ success: false, message: 'Unauthorized' });
  
  const { clinic_id, name, phone, email, address, password, upi_id } = req.body;
  if (!clinic_id) return res.status(400).json({ success: false, message: 'Missing clinic_id' });
  
  // If clinic is updating, ensure they can only update their own profile
  if (isClinic && req.session.clinic.clinic_id !== clinic_id) {
    return res.status(403).json({ success: false, message: 'You can only update your own profile' });
  }
  
  try {
    const updates = [];
    const values = [];
    
    if (name) { updates.push('name = ?'); values.push(name); }
    if (phone) { updates.push('phone = ?'); values.push(phone); }
    if (email !== undefined) { updates.push('email = ?'); values.push(email); }
    if (address !== undefined) { updates.push('address = ?'); values.push(address); }
    if (password) { updates.push('password = ?'); values.push(password); }
    if (upi_id !== undefined) { updates.push('upi_id = ?'); values.push(upi_id); }
    
    if (updates.length === 0) return res.status(400).json({ success: false, message: 'No fields to update' });
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(clinic_id);
    
    const sql = `UPDATE clinics SET ${updates.join(', ')} WHERE clinic_id = ?`;
    await db.prepare(sql).run(...values);
    
    // Update session if clinic updated their own profile
    if (isClinic) {
      const updated = await db.prepare('SELECT clinic_id, name, logo_path, address FROM clinics WHERE clinic_id = ?').get(clinic_id);
      if (updated) {
        req.session.clinic = { 
          clinic_id: updated.clinic_id, 
          name: updated.name,
          logo_path: updated.logo_path,
          address: updated.address
        };
      }
    }
    
    res.json({ success: true, message: 'Clinic updated successfully' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

// Change password for clinic
async function changePassword(req, res){
  if (!req.session.clinic) return res.status(403).json({ success: false, message: 'Unauthorized' });
  
  const { old_password, new_password, currentPassword, newPassword } = req.body;
  const oldPass = old_password || currentPassword;
  const newPass = new_password || newPassword;
  
  if (!oldPass || !newPass) {
    return res.status(400).json({ success: false, message: 'Both old and new passwords are required' });
  }
  
  const clinic_id = req.session.clinic.clinic_id;
  
  try {
    // Verify old password
    const clinic = await db.prepare('SELECT password FROM clinics WHERE clinic_id = ?').get(clinic_id);
    if (!clinic || clinic.password !== oldPass) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }
    
    // Update to new password
    await db.prepare('UPDATE clinics SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE clinic_id = ?').run(newPass, clinic_id);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// Get clinic profile
async function getProfile(req, res){
  if (!req.session.clinic) return res.status(403).json({ success: false, message: 'Unauthorized' });
  
  const clinic_id = req.session.clinic.clinic_id;
  
  try {
    const clinic = await db.prepare('SELECT clinic_id, name, phone, email, address, upi_id, logo_path, qr_code_path FROM clinics WHERE clinic_id = ?').get(clinic_id);
    if (!clinic) return res.status(404).json({ success: false, message: 'Clinic not found' });
    res.json({ success: true, clinic });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// Update clinic profile (clinic only)
async function updateClinicProfile(req, res) {
  if (!req.session.clinic) return res.status(403).json({ success: false, message: 'Unauthorized' });
  
  const clinic_id = req.session.clinic.clinic_id;
  const { name, phone, address, email, upi_id } = req.body;
  
  // When using upload.any(), files is an array
  const filesArray = req.files || [];
  const qrImageFile = filesArray.find(f => f.fieldname === 'qr_image');
  const logoFile = filesArray.find(f => f.fieldname === 'logo');
  
  if (!name || !phone || !email || !address) {
    return res.status(400).json({ success: false, message: 'Name, phone, email, and address are required' });
  }
  
  try {
    const updates = [];
    const values = [];
    
    // Basic info updates
    updates.push('name = ?', 'phone = ?', 'address = ?', 'email = ?', 'upi_id = ?');
    values.push(name, phone, address, email, upi_id || '');
    
    // Handle logo upload
    if (logoFile) {
      const logoPath = `/asset/logo/${logoFile.filename}`;
      updates.push('logo_path = ?');
      values.push(logoPath);
    }
    
    // Handle QR code upload
    if (qrImageFile) {
      const qrPath = `/asset/QR/${qrImageFile.filename}`;
      updates.push('qr_code_path = ?');
      values.push(qrPath);
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(clinic_id);
    
    const sql = `UPDATE clinics SET ${updates.join(', ')} WHERE clinic_id = ?`;
    await db.prepare(sql).run(...values);
    
    // Update session with new name
    req.session.clinic.name = name;
    
    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (e) {
    console.error('Update profile error:', e);
    res.status(500).json({ success: false, message: e.message });
  }
}

// Signup new clinic with 30-day free trial
async function signupClinic(req, res){
  const { name, phone, email, address, password, owner_name } = req.body;
  const logoFile = req.file;
  
  if (!name || !phone || !email || !password) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }
  
  // Validate phone number (10 digits)
  const phoneDigits = (phone.match(/\d+/g) || []).join('');
  if (phoneDigits.length !== 10) {
    return res.status(400).json({ success: false, message: 'Phone number must be 10 digits' });
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email format' });
  }
  
  // Check if email or phone already exists
  try {
    const existingEmail = await db.prepare('SELECT clinic_id FROM clinics WHERE email = ?').get(email);
    if (existingEmail) {
      return res.status(409).json({ success: false, message: 'Email already registered. Please sign in or use a different email.' });
    }
    
    const existingPhone = await db.prepare('SELECT clinic_id FROM clinics WHERE phone = ?').get(phone);
    if (existingPhone) {
      return res.status(409).json({ success: false, message: 'Phone number already registered. Please sign in or use a different number.' });
    }
  } catch (e) {
    console.error('Error checking existing clinic:', e);
  }
  
  // Auto-generate clinic_id using secure random generation
  const { generateUniqueId, generateSecureId } = require('../utils/idGenerator');
  
  try {
    // Generate unique clinic_id with collision handling
    const clinic_id = await generateUniqueId(
      db,
      'clinics',
      'clinic_id',
        () => generateSecureId('CLN', 12),
      50  // max attempts
    );
    
    // Calculate trial dates (30 days from now)
    const trialStartDate = new Date().toISOString();
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 30);
    const trialEndDateISO = trialEndDate.toISOString();
    
    // Handle logo file
    const logoPath = logoFile ? `/asset/logo/${logoFile.filename}` : null;
    
    // Insert new clinic with trial subscription
    await db.prepare(`
      INSERT INTO clinics (
        clinic_id, name, phone, email, address, password, 
        owner_name, logo_path, subscription_type, trial_start_date, trial_end_date, 
        is_trial_expired, source, created_at, updated_at, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'trial', ?, ?, 0, 'free-trial-signup', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1)
    `).run(clinic_id, name, phone, email, address || '', password, owner_name || name, logoPath, trialStartDate, trialEndDateISO);
    
    // Auto-login the clinic
    req.session.clinic = { clinic_id, name };
    
    res.json({ 
      success: true, 
      clinic_id, 
      message: 'Clinic registered successfully with 30-day free trial!',
      trial_end_date: trialEndDateISO
    });
  } catch (e) {
    console.error('Signup error:', e);
    res.status(500).json({ success: false, message: 'Failed to create account. Please try again.' });
  }
}

// Logout clinic
function logoutClinic(req, res) {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Logout failed' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
}

// ============= FORGOT PASSWORD WITH OTP =============

// Temporary OTP storage (in production, use Redis or database with expiry)
const otpStore = new Map(); // { clinic_id: { otp, phone, expiresAt, token } }

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate verification token
function generateToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Mask email address (e.g., test@example.com -> t***@example.com)
function maskEmail(email) {
  if (!email || !email.includes('@')) return '****@****.com';
  const [username, domain] = email.split('@');
  if (username.length <= 2) {
    return `${username[0]}***@${domain}`;
  }
  return `${username[0]}${'*'.repeat(username.length - 1)}@${domain}`;
}

// Mask phone number (e.g., +91 98765XXXXX -> ******5432) - Kept for SMS (disabled)
function maskPhone(phone) {
  if (!phone) return '****';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length >= 4) {
    return '******' + cleaned.slice(-4);
  }
  return '****';
}

// Send email with OTP
async function sendOTPEmail(email, otp, clinicName) {
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
          .header { background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f0f9ff; padding: 30px; border-radius: 0 0 10px 10px; }
          .otp-box { background: white; border: 2px dashed #0ea5e9; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
          .otp-code { font-size: 32px; font-weight: bold; color: #0ea5e9; letter-spacing: 5px; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏥 DoctorPod</h1>
            <p>Password Reset Request</p>
          </div>
          <div class="content">
            <p>Hello <strong>${clinicName}</strong>,</p>
            <p>We received a request to reset your password. Use the OTP below to proceed:</p>
            
            <div class="otp-box">
              <p style="margin: 0; color: #64748b; font-size: 14px;">Your OTP Code</p>
              <div class="otp-code">${otp}</div>
              <p style="margin: 10px 0 0 0; color: #64748b; font-size: 12px;">Valid for 10 minutes</p>
            </div>
            
            <p><strong>⚠️ Security Note:</strong></p>
            <ul style="color: #64748b; font-size: 14px;">
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
  const { clinic_id } = req.body;
  
  if (!clinic_id) {
    return res.status(400).json({ success: false, message: 'Clinic ID is required' });
  }
  
  try {
    // Verify clinic exists
    const clinic = await db.prepare('SELECT clinic_id, phone, email, name FROM clinics WHERE clinic_id = ?').get(clinic_id);
    
    if (!clinic) {
      return res.status(404).json({ success: false, message: 'Clinic not found' });
    }
    
    if (!clinic.email) {
      return res.status(400).json({ success: false, message: 'No email registered for this clinic. Please contact admin.' });
    }
    
    // Generate OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry
    
    // Store OTP temporarily
    otpStore.set(clinic_id, {
      otp,
      email: clinic.email,
      phone: clinic.phone,
      expiresAt,
      verified: false
    });
    
    // Send OTP via email
    const emailSent = await sendOTPEmail(clinic.email, otp, clinic.name);
    
    // Always log to console for testing/debugging
    console.log('\n===========================================');
    console.log('📧 PASSWORD RESET OTP FOR CLINIC');
    console.log('===========================================');
    console.log(`Clinic: ${clinic.name}`);
    console.log(`Clinic ID: ${clinic_id}`);
    console.log(`Email: ${clinic.email}`);
    console.log(`OTP: ${otp}`);
    console.log(`Email Sent: ${emailSent ? '✅ Yes' : '⚠️  No (check console)'}`);
    console.log(`Valid for: 10 minutes`);
    console.log('===========================================\n');
    
    // SMS Option (Disabled - Keep for future use)
    // const twilioClient = require('twilio')(TWILIO_SID, TWILIO_AUTH_TOKEN);
    // await twilioClient.messages.create({
    //   body: `Your DoctorPod password reset OTP is: ${otp}. Valid for 10 minutes.`,
    //   from: TWILIO_PHONE,
    //   to: clinic.phone
    // });
    
    res.json({ 
      success: true, 
      message: emailSent ? 'OTP sent to your email' : 'OTP generated (check console)',
      maskedEmail: maskEmail(clinic.email),
      // maskedPhone: maskPhone(clinic.phone) // For SMS (future)
    });
    
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
}

// Verify OTP (Step 2)
async function verifyPasswordResetOTP(req, res) {
  const { clinic_id, otp } = req.body;
  
  if (!clinic_id || !otp) {
    return res.status(400).json({ success: false, message: 'Clinic ID and OTP are required' });
  }
  
  try {
    const storedData = otpStore.get(clinic_id);
    
    if (!storedData) {
      return res.status(400).json({ success: false, message: 'OTP not found or expired. Please request a new OTP.' });
    }
    
    // Check expiry
    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(clinic_id);
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new OTP.' });
    }
    
    // Verify OTP
    if (storedData.otp !== otp.trim()) {
      return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
    }
    
    // Generate verification token for password reset
    const token = generateToken();
    storedData.verified = true;
    storedData.token = token;
    storedData.tokenExpiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes to reset password
    
    console.log(`✅ OTP verified for clinic: ${clinic_id}`);
    
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
  const { clinic_id, token, new_password } = req.body;
  
  if (!clinic_id || !token || !new_password) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }
  
  if (new_password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
  }
  
  try {
    const storedData = otpStore.get(clinic_id);
    
    if (!storedData) {
      return res.status(400).json({ success: false, message: 'Session expired. Please start again.' });
    }
    
    // Verify token
    if (!storedData.verified || storedData.token !== token) {
      return res.status(400).json({ success: false, message: 'Invalid or expired session. Please start again.' });
    }
    
    // Check token expiry
    if (Date.now() > storedData.tokenExpiresAt) {
      otpStore.delete(clinic_id);
      return res.status(400).json({ success: false, message: 'Session expired. Please start again.' });
    }
    
    // Update password in database
    await db.prepare('UPDATE clinics SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE clinic_id = ?')
      .run(new_password, clinic_id);
    
    // Clear OTP data
    otpStore.delete(clinic_id);
    
    console.log(`🔐 Password reset successful for clinic: ${clinic_id}`);
    
    res.json({ 
      success: true, 
      message: 'Password reset successfully' 
    });
    
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
}

// ============= DEMO REQUEST MANAGEMENT =============

// Submit demo request
async function submitDemoRequest(req, res) {
  const { clinic_name, contact_person, phone, email, city, message } = req.body;
  
  if (!clinic_name || !contact_person || !phone || !email || !city) {
    return res.status(400).json({ success: false, message: 'All required fields must be filled' });
  }
  
  try {
    // Check if email or phone already exists in demo_requests (pending)
    const existing = await db.prepare('SELECT id FROM demo_requests WHERE (email = ? OR phone = ?) AND status = ?').get(email, phone, 'pending');
    if (existing) {
      return res.status(400).json({ success: false, message: 'A demo request with this email or phone is already pending' });
    }
    
    // Insert demo request
    await db.prepare(`
      INSERT INTO demo_requests (clinic_name, contact_person, phone, email, city, message, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `).run(clinic_name, contact_person, phone, email, city, message || '');
    
    console.log(`\n✅ New demo request received from: ${clinic_name} (${contact_person})`);
    
    res.json({ 
      success: true, 
      message: 'Demo request submitted successfully. Our team will contact you soon.' 
    });
    
  } catch (error) {
    console.error('Error submitting demo request:', error);
    res.status(500).json({ success: false, message: 'Failed to submit demo request' });
  }
}

// Generate QR code for clinic booking
async function generateBookingQR(req, res) {
  try {
    const { clinic_id } = req.params;
    
    // Verify clinic exists
    const clinic = await db.prepare('SELECT clinic_id, name FROM clinics WHERE clinic_id = ? AND is_active = 1').get(clinic_id);
    if (!clinic) {
      return res.status(404).json({ success: false, message: 'Clinic not found' });
    }
    
    // Get base URL from environment or use default
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    
    // Log warning if BASE_URL is not set in production
    if (!process.env.BASE_URL) {
      console.warn('⚠️  BASE_URL environment variable not set. QR codes will use localhost. Set BASE_URL in your environment variables for production deployment.');
    }
    
    const bookingUrl = `${baseUrl}/patient_booking.html?clinic_id=${clinic_id}`;
    
    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(bookingUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',  // Black color for better scanning
        light: '#ffffff'
      }
    });
    
    res.json({ 
      success: true, 
      qrCode: qrDataUrl,
      bookingUrl: bookingUrl,
      clinic_name: clinic.name
    });
    
  } catch (error) {
    console.error('QR generation error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate QR code' });
  }
}

module.exports = { 
  loginClinic, 
  getAllClinics, 
  clinicSession, 
  deleteClinic, 
  updateClinic, 
  changePassword, 
  getProfile, 
  updateClinicProfile, 
  logoutClinic, 
  signupClinic,
  sendPasswordResetOTP,
  verifyPasswordResetOTP,
  resetPassword,
  submitDemoRequest,
  generateBookingQR
};
