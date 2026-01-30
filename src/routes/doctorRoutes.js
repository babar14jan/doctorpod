
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/doctorController');

// Get doctor availability (timings) for a given doctor and clinic
router.get('/availability', ctrl.getDoctorAvailability);

router.get('/all', ctrl.getAllDoctors);
router.get('/clinics/all', ctrl.getAllClinics); // New: get all clinics
router.get('/by-clinic/:clinic_id', ctrl.getDoctorsByClinic); // New: get doctors by clinic_id
router.post('/login', ctrl.loginDoctor);
router.post('/add', ctrl.addDoctor);
router.post('/delete', ctrl.deleteDoctor);
router.get('/:id', ctrl.getDoctorById);


// Add clinic (admin dashboard)
router.post('/addClinic', ctrl.addClinic);

module.exports = router;
