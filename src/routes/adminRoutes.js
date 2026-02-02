const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/adminController');
const multer = require('multer');
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

// Serve static HTML for Admin Login
router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/admin_login.html'));
});

// Serve static HTML for Admin Dashboard
router.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/admin_dashboard.html'));
});

router.get('/session', ctrl.adminSession);
router.post('/login', ctrl.adminLogin);
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Logout failed' });
    }
    res.json({ success: true });
  });
});

// Google Drive configuration
router.post('/set-drive-folder', ctrl.setDriveFolder);
router.get('/drive-status', ctrl.getDriveStatus);

// Clinic routes
router.post('/addClinic', upload.single('image'), ctrl.addClinic);
router.post('/updateClinic', upload.single('image'), ctrl.updateClinic);

// Demo request management
router.get('/demo-requests', ctrl.getAllDemoRequests);
router.post('/approve-demo', express.json(), ctrl.approveDemoRequest);
router.post('/reject-demo', express.json(), ctrl.rejectDemoRequest);

module.exports = router;
