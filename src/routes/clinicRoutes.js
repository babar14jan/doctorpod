const express = require('express');
const router = express.Router();

const path = require('path');
const ctrl = require('../controllers/clinicController');
// Serve static HTML for Clinic Dashboard
router.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/clinic_dashboard.html'));
});

// Get all clinics (admin dashboard)
router.get('/all', ctrl.getAllClinics);


// Clinic session check endpoint
router.get('/session', ctrl.clinicSession);

// Clinic login endpoint
router.post('/login', ctrl.loginClinic);

module.exports = router;
