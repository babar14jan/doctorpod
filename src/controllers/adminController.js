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
    // Query admins table by mobile or email
    const admin = await db.prepare(
      `SELECT admin_id, name, mobile, email FROM admins WHERE (mobile = ? OR email = ?) AND password = ?`
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
  const namePart = (name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 4)).padEnd(4, 'x');
  const phoneDigits = (phone.match(/\d+/g) || []).join('');
  const phonePart = phoneDigits.slice(-6).padStart(6, '0');
  const clinic_id = namePart + phonePart;
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
}

module.exports = { adminLogin, adminSession, setDriveFolder, getDriveStatus, addClinic };
