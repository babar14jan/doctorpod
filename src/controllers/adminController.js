const db = require('../utils/db');
const { setFolderId, isConfigured } = require('../utils/googleDriveHelper');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

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
  const image = req.file;
  if (!image) {
    return res.status(400).json({ success: false, message: 'Image file is required' });
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
    
    // Update qr_code_path.json with the actual filename
    const qrCodePathFile = path.join(__dirname, '../utils/qr_code_path.json');
    const qrCodePaths = JSON.parse(fs.readFileSync(qrCodePathFile, 'utf8'));
    qrCodePaths[clinic_id] = `public/asset/QR/${image.filename}`;
    fs.writeFileSync(qrCodePathFile, JSON.stringify(qrCodePaths, null, 2));
    
    try {
      await db.prepare('INSERT INTO clinics (clinic_id, name, phone, email, address, password, source, upi_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(clinic_id, name, phone, email, address, password, source, upi_id);
      res.json({ success: true, clinic_id });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// Update clinic (with optional QR upload)
async function updateClinic(req, res) {
  if (!req.session.admin) return res.status(403).json({ success: false, message: 'Unauthorized' });
  
  const { clinic_id, name, phone, email, address, password, upi_id } = req.body;
  const image = req.file; // QR code image (optional)
  
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
    
    // If new QR image is uploaded, update the path
    if (image) {
      const qrCodePathFile = path.join(__dirname, '../utils/qr_code_path.json');
      let qrCodePaths = {};
      try {
        qrCodePaths = JSON.parse(fs.readFileSync(qrCodePathFile, 'utf8'));
      } catch (e) {
        // File doesn't exist or is invalid, start fresh
      }
      qrCodePaths[clinic_id] = `public/asset/QR/${image.filename}`;
      fs.writeFileSync(qrCodePathFile, JSON.stringify(qrCodePaths, null, 2));
      
      updates.push('qr_code_path = ?');
      values.push(`public/asset/QR/${image.filename}`);
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

module.exports = { adminLogin, adminSession, setDriveFolder, getDriveStatus, addClinic, updateClinic, getAllDemoRequests, approveDemoRequest, rejectDemoRequest };
