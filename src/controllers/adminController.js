const db = require('../utils/db');
const { setFolderId, isConfigured } = require('../utils/googleDriveHelper');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

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

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, '../../public/asset/QR'));
    },
    filename: (req, file, cb) => {
      const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
      cb(null, `${file.fieldname}_${timestamp}${path.extname(file.originalname)}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpeg') {
      cb(null, true);
    } else {
      cb(new Error('Only .png and .jpeg files are allowed'));
    }
  }
});

function adminSession(req, res) {
  if (req.session && req.session.admin) {
    res.json({ success: true, admin: req.session.admin });
  } else {
    res.json({ success: false });
  }
}

async function adminLogin(req, res) {
  const { mobile, password } = req.body;
  
  if (!mobile || !password) {
    return res.status(400).json({ success: false, message: 'Mobile and password are required' });
  }
  
  try {
    // Query admins table by mobile or email (case-insensitive)
    const admin = await db.prepare(
      `SELECT admin_id, name, mobile, email FROM admins WHERE (LOWER(mobile) = LOWER(?) OR LOWER(email) = LOWER(?)) AND password = ?`
    ).get(mobile, mobile, password);
    
    if (admin) {
      req.session.admin = { 
        admin_id: admin.admin_id,
        name: admin.name,
        mobile: admin.mobile,
        email: admin.email
      };
      return res.json({ success: true, admin: { name: admin.name } });
    }
    
    res.status(401).json({ success: false, message: 'Invalid mobile/email or password' });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
}

// Set Google Drive folder ID
function setDriveFolder(req, res) {
  try {
    const { folderId } = req.body;
    if (!folderId) {
      return res.status(400).json({ success: false, message: 'Folder ID is required' });
    }
    setFolderId(folderId);
    res.json({ success: true, message: 'Google Drive folder ID saved successfully' });
  } catch (err) {
    console.error('Set Drive folder error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

// Check Google Drive configuration status
function getDriveStatus(req, res) {
  res.json({ 
    success: true, 
    configured: isConfigured(),
    message: isConfigured() ? 'Google Drive is configured' : 'Google Drive is not configured'
  });
}

async function addClinic(req, res){
  if (!req.session.admin) return res.status(403).json({ success: false, message: 'Unauthorized' });
  if (!req.body) {
    return res.status(400).json({ success: false, message: 'No form data received' });
  }
  const { name, phone, email, address, password, upi_id } = req.body;
  
  // When using upload.any(), files is an array
  const filesArray = req.files || [];
  const qrImage = filesArray.find(f => f.fieldname === 'image');
  const logoImage = filesArray.find(f => f.fieldname === 'logo');
  
  if (!qrImage) {
    return res.status(400).json({ success: false, message: 'QR code image file is required' });
  }
  const source = req.session.admin.admin_id;
  if (!name || !phone || !email || !address || !password) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
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
      50
    );
    
    // Prepare file paths if uploaded
    const qrCodePath = `/asset/QR/${qrImage.filename}`;
    const logoPath = logoImage ? `/asset/logo/${logoImage.filename}` : null;
    
    try {
      await db.prepare('INSERT INTO clinics (clinic_id, name, phone, email, address, password, source, upi_id, logo_path, qr_code_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(clinic_id, name, phone, email, address, password, source, upi_id, logoPath, qrCodePath);
      res.json({ success: true, clinic_id });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// Update clinic (with optional QR and logo upload)
async function updateClinic(req, res) {
  if (!req.session.admin) return res.status(403).json({ success: false, message: 'Unauthorized' });
  
  const { clinic_id, name, phone, email, address, password, upi_id } = req.body;
  
  // When using upload.any(), files is an array
  const filesArray = req.files || [];
  const qrImage = filesArray.find(f => f.fieldname === 'image');
  const logoImage = filesArray.find(f => f.fieldname === 'logo');
  
  if (!clinic_id) return res.status(400).json({ success: false, message: 'Missing clinic_id' });
  
  try {
    const updates = [];
    const values = [];
    
    if (name) { updates.push('name = ?'); values.push(name); }
    if (phone) { updates.push('phone = ?'); values.push(phone); }
    if (email !== undefined) { updates.push('email = ?'); values.push(email); }
    if (address !== undefined) { updates.push('address = ?'); values.push(address); }
    if (password) { updates.push('password = ?'); values.push(password); }
    if (upi_id !== undefined) { updates.push('upi_id = ?'); values.push(upi_id); }
    
    // If new QR image is uploaded, update the path in database
    if (qrImage) {
      updates.push('qr_code_path = ?');
      values.push(`/asset/QR/${qrImage.filename}`);
    }
    
    // If new logo is uploaded, update the logo_path
    if (logoImage) {
      updates.push('logo_path = ?');
      values.push(`/asset/logo/${logoImage.filename}`);
    }
    
    if (updates.length === 0) return res.status(400).json({ success: false, message: 'No fields to update' });
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(clinic_id);
    
    const sql = `UPDATE clinics SET ${updates.join(', ')} WHERE clinic_id = ?`;
    await db.prepare(sql).run(...values);
    
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// ============= DEMO REQUEST MANAGEMENT =============

// Get all demo requests
async function getAllDemoRequests(req, res) {
  if (!req.session.admin) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }
  
  try {
    const requests = await db.prepare(`
      SELECT id, clinic_name, contact_person, phone, email, city, message, status, 
             created_at, reviewed_by, reviewed_at
      FROM demo_requests 
      ORDER BY 
        CASE status 
          WHEN 'pending' THEN 1 
          WHEN 'approved' THEN 2 
          WHEN 'rejected' THEN 3 
        END,
        created_at DESC
    `).all();
    
    res.json({ success: true, requests });
  } catch (error) {
    console.error('Error fetching demo requests:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// Approve demo request and create clinic
async function approveDemoRequest(req, res) {
  if (!req.session.admin) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }
  
  const { request_id, clinic_id, password, subscription_type, trial_days } = req.body;
  
  if (!request_id || !clinic_id || !password) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }
  
  try {
    // Get demo request
    const demoRequest = await db.prepare('SELECT * FROM demo_requests WHERE id = ?').get(request_id);
    
    if (!demoRequest) {
      return res.status(404).json({ success: false, message: 'Demo request not found' });
    }
    
    if (demoRequest.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'This request has already been reviewed' });
    }
    
    // Check if clinic_id already exists
    const existing = await db.prepare('SELECT clinic_id FROM clinics WHERE clinic_id = ?').get(clinic_id);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Clinic ID already exists' });
    }
    
    // Calculate trial dates if trial subscription
    let trial_start_date = null;
    let trial_end_date = null;
    
    if (subscription_type === 'trial') {
      const now = new Date();
      trial_start_date = now.toISOString();
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + (trial_days || 30));
      trial_end_date = endDate.toISOString();
    }
    
    // Create clinic from demo request
    await db.prepare(`
      INSERT INTO clinics (
        clinic_id, name, phone, email, address, password, 
        subscription_type, trial_start_date, trial_end_date, is_trial_expired,
        is_active, source, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, 'admin', CURRENT_TIMESTAMP)
    `).run(
      clinic_id,
      demoRequest.clinic_name,
      demoRequest.phone,
      demoRequest.email,
      demoRequest.city, // Use city as address
      password,
      subscription_type || 'trial',
      trial_start_date,
      trial_end_date
    );
    
    // Update demo request status
    await db.prepare(`
      UPDATE demo_requests 
      SET status = 'approved', 
          reviewed_by = ?, 
          reviewed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.session.admin.admin_id, request_id);
    
    console.log(`✅ Demo request approved and clinic created: ${clinic_id}`);
    
    res.json({ 
      success: true, 
      message: 'Clinic created successfully', 
      clinic_id,
      trial_info: subscription_type === 'trial' ? {
        start: trial_start_date,
        end: trial_end_date,
        days: trial_days || 30
      } : null
    });
    
  } catch (error) {
    console.error('Error approving demo request:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// Reject demo request
async function rejectDemoRequest(req, res) {
  if (!req.session.admin) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }
  
  const { request_id, reason } = req.body;
  
  if (!request_id) {
    return res.status(400).json({ success: false, message: 'Request ID is required' });
  }
  
  try {
    const demoRequest = await db.prepare('SELECT * FROM demo_requests WHERE id = ?').get(request_id);
    
    if (!demoRequest) {
      return res.status(404).json({ success: false, message: 'Demo request not found' });
    }
    
    if (demoRequest.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'This request has already been reviewed' });
    }
    
    // Update demo request status
    await db.prepare(`
      UPDATE demo_requests 
      SET status = 'rejected', 
          reviewed_by = ?, 
          reviewed_at = CURRENT_TIMESTAMP,
          message = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.session.admin.admin_id, reason || demoRequest.message, request_id);
    
    console.log(`❌ Demo request rejected: ${demoRequest.clinic_name}`);
    
    res.json({ success: true, message: 'Demo request rejected' });
    
  } catch (error) {
    console.error('Error rejecting demo request:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// ============= FORGOT PASSWORD FUNCTIONALITY =============

const otpStore = new Map(); // { identifier: { otp, email, expiresAt, token, admin_id } }

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
async function sendOTPEmail(email, otp, adminName) {
  const mailOptions = {
    from: `"DoctorPod" <${emailConfig.auth.user}>`,
    to: email,
    subject: '🔐 Password Reset OTP - DoctorPod Admin',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f0f0ff; padding: 30px; border-radius: 0 0 10px 10px; }
          .otp-box { background: white; border: 2px dashed #6366f1; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
          .otp-code { font-size: 32px; font-weight: bold; color: #6366f1; letter-spacing: 5px; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 DoctorPod Admin</h1>
            <p>Password Reset Request</p>
          </div>
          <div class="content">
            <p>Hello <strong>${adminName}</strong>,</p>
            <p>We received a request to reset your admin password. Use the OTP below to proceed:</p>
            
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
    return res.status(400).json({ success: false, message: 'Mobile or Email is required' });
  }
  
  try {
    // Find admin by mobile or email
    const admin = await db.prepare('SELECT admin_id, mobile, email, name FROM admins WHERE mobile = ? OR LOWER(email) = LOWER(?)').get(identifier, identifier);
    
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    
    if (!admin.email) {
      return res.status(400).json({ success: false, message: 'No email registered for this admin. Please contact support.' });
    }
    
    // Generate OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry
    
    // Store OTP temporarily
    otpStore.set(identifier, {
      otp,
      email: admin.email,
      admin_id: admin.admin_id,
      expiresAt,
      verified: false
    });
    
    // Send OTP via email
    const emailSent = await sendOTPEmail(admin.email, otp, admin.name);
    
    // Log to console for testing/debugging
    console.log('\n===========================================')
    console.log('📧 PASSWORD RESET OTP FOR ADMIN');
    console.log('===========================================')
    console.log(`Admin: ${admin.name}`);
    console.log(`Admin ID: ${admin.admin_id}`);
    console.log(`Email: ${admin.email}`);
    console.log(`OTP: ${otp}`);
    console.log(`Email Sent: ${emailSent ? '✅ Yes' : '⚠️  No (check console)'}`);
    console.log(`Valid for: 10 minutes`);
    console.log('===========================================\n');
    
    res.json({ 
      success: true, 
      message: emailSent ? 'OTP sent to your email' : 'OTP generated (check console)',
      maskedEmail: maskEmail(admin.email)
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
    
    console.log(`✅ OTP verified for admin: ${storedData.admin_id}`);
    
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
    await db.prepare('UPDATE admins SET password = ? WHERE admin_id = ?')
      .run(new_password, storedData.admin_id);
    
    // Clear OTP data
    otpStore.delete(identifier);
    
    console.log(`🔐 Password reset successful for admin: ${storedData.admin_id}`);
    
    res.json({ 
      success: true, 
      message: 'Password reset successful. You can now login with your new password.' 
    });
    
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
}

module.exports = { adminLogin, adminSession, setDriveFolder, getDriveStatus, addClinic, updateClinic, getAllDemoRequests, approveDemoRequest, rejectDemoRequest, sendPasswordResetOTP, verifyPasswordResetOTP, resetPassword };
