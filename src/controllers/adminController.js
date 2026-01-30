const db = require('../utils/db');
const { setFolderId, isConfigured } = require('../utils/googleDriveHelper');

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

module.exports = { adminLogin, adminSession, setDriveFolder, getDriveStatus };
