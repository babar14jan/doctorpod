const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const ctrl = require('../controllers/clinicController');

// Configure multer for QR code and logo uploads
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

// Serve static HTML for Clinic Home
router.get('/home', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/clinic_home.html'));
});

// Serve static HTML for Manage Doctors
router.get('/manage-doctors', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/clinic_dashboard.html'));
});

// Get all clinics (admin dashboard)
router.get('/all', ctrl.getAllClinics);


// Clinic session check endpoint
router.get('/session', ctrl.clinicSession);

// Clinic login endpoint
router.post('/login', ctrl.loginClinic);

// Clinic signup endpoint (optional self-registration) - accepts logo upload
router.post('/signup', upload.single('logo'), ctrl.signupClinic);

// Delete clinic (admin only)
router.post('/delete', ctrl.deleteClinic);

// Update clinic (admin or clinic itself)
router.post('/update', express.json(), ctrl.updateClinic);

// Update clinic profile (clinic only) - accepts both QR and logo
router.post('/update-profile', upload.any(), ctrl.updateClinicProfile);

// Change password (clinic only)
router.post('/change-password', express.json(), ctrl.changePassword);

// Logout clinic
router.post('/logout', ctrl.logoutClinic);

// Get clinic profile (clinic only)
router.get('/profile', ctrl.getProfile);

// Forgot Password - OTP Flow
router.post('/forgot-password/send-otp', express.json(), ctrl.sendPasswordResetOTP);
router.post('/forgot-password/verify-otp', express.json(), ctrl.verifyPasswordResetOTP);
router.post('/forgot-password/reset', express.json(), ctrl.resetPassword);

// Demo Request
router.post('/request-demo', express.json(), ctrl.submitDemoRequest);

// Generate QR code for clinic booking
router.get('/generate-qr/:clinic_id', ctrl.generateBookingQR);

// Video Consultations Overview for Clinic
router.get('/video-consultations', ctrl.getVideoConsultationsOverview);

module.exports = router;
