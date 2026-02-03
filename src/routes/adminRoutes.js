const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/adminController');
const multer = require('multer');
const path = require('path');


// Configure multer for file uploads (QR and Logo)
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      // Save to different directories based on field name
      if (file.fieldname === 'logo') {
        cb(null, path.join(__dirname, '../../public/asset/logo'));
      } else {
        cb(null, path.join(__dirname, '../../public/asset/QR'));
      }
    },
    filename: (req, file, cb) => {
      const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
      cb(null, `${file.fieldname}_${timestamp}${path.extname(file.originalname)}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') {
      cb(null, true);
    } else {
      cb(new Error('Only .png, .jpg and .jpeg files are allowed'));
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

// Forgot Password - OTP Flow
router.post('/forgot-password/send-otp', express.json(), ctrl.sendPasswordResetOTP);
router.post('/forgot-password/verify-otp', express.json(), ctrl.verifyPasswordResetOTP);
router.post('/forgot-password/reset', express.json(), ctrl.resetPassword);

// Google Drive configuration
router.post('/set-drive-folder', ctrl.setDriveFolder);
router.get('/drive-status', ctrl.getDriveStatus);

// Clinic routes - accept both QR and logo
router.post('/addClinic', upload.any(), ctrl.addClinic);
router.post('/updateClinic', upload.any(), ctrl.updateClinic);

// Demo request management
router.get('/demo-requests', ctrl.getAllDemoRequests);
router.post('/approve-demo', express.json(), ctrl.approveDemoRequest);
router.post('/reject-demo', express.json(), ctrl.rejectDemoRequest);

module.exports = router;
