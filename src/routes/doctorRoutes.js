const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// ...existing code...

// Endpoint to get QR code path for a doctor (by clinic_id)
router.get('/qr/:doctor_id', async (req, res) => {
	const db = require('../utils/db');
	const doctor = await db.prepare('SELECT clinic_id FROM doctors WHERE doctor_id = ?').get(req.params.doctor_id);
	if (!doctor || !doctor.clinic_id) return res.json({ success: false, message: 'No clinic found for doctor' });
	
	// Fetch QR code path from database
	const clinic = await db.prepare('SELECT qr_code_path FROM clinics WHERE clinic_id = ?').get(doctor.clinic_id);
	const qrPath = clinic?.qr_code_path || null;
	
	if (qrPath) return res.json({ success: true, qrPath });
	return res.json({ success: false, message: 'No QR code found for clinic' });
});
const ctrl = require('../controllers/doctorController');
const multer = require('multer');
const upload = multer();

// Get doctor availability (timings) for a given doctor and clinic
router.get('/availability', ctrl.getDoctorAvailability);

router.get('/all', ctrl.getAllDoctors);
router.get('/clinics/all', ctrl.getAllClinics); // New: get all clinics
router.get('/by-clinic/:clinic_id', ctrl.getDoctorsByClinic); // New: get doctors by clinic_id
router.get('/session', ctrl.getDoctorSession); // Get doctor session info
router.get('/profile', ctrl.getDoctorProfile); // Get doctor profile (doctor only)
// Apply body parser only for /login route to support JSON
router.post('/login', express.json(), express.urlencoded({ extended: true }), ctrl.loginDoctor);
router.post('/add', upload.none(), (req, res, next) => {
	console.log('DEBUG /doctors/add content-type:', req.headers['content-type']);
	console.log('DEBUG /doctors/add req.body:', req.body);
	next();
}, ctrl.addDoctor); // Add doctor (support multipart/form-data for form fields)
router.post('/delete', ctrl.deleteDoctor);
router.post('/update', express.json(), ctrl.updateDoctor);
router.post('/update-profile', express.json(), ctrl.updateDoctorProfile); // Update doctor profile (doctor only)
router.post('/change-password', express.json(), ctrl.changeDoctorPassword); // Change password (doctor only)
router.post('/logout', ctrl.logoutDoctor); // Logout doctor

// Forgot Password - OTP Flow
router.post('/forgot-password/send-otp', express.json(), ctrl.sendPasswordResetOTP);
router.post('/forgot-password/verify-otp', express.json(), ctrl.verifyPasswordResetOTP);
router.post('/forgot-password/reset', express.json(), ctrl.resetPassword);

router.get('/:id', ctrl.getDoctorById);


// Add clinic (admin dashboard)

module.exports = router;
