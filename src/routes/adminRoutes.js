
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/adminController');


const path = require('path');
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

// Google Drive configuration
router.post('/set-drive-folder', ctrl.setDriveFolder);
router.get('/drive-status', ctrl.getDriveStatus);

module.exports = router;
