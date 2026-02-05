
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/historyController');

// Get all visits for a patient, joined with medicines
router.get('/patient/:patient_id/with-medicines', ctrl.getVisitsWithMedicinesByPatient);

// Save or update a visit (history)
router.post('/save', ctrl.saveVisit);
// Get all visits for a patient (by patient_id)
router.get('/patient/:patient_id', ctrl.getVisitsByPatient);
// Get all visits for a doctor (by doctor_id)
router.get('/doctor/:doctor_id', ctrl.getVisitsByDoctor);

// Get visit by visit_id
router.get('/visit/:visit_id', ctrl.getVisitById);

// Get patient profile and visit timeline (joined)
router.get('/patient/:patient_id/profile', ctrl.getPatientProfileAndTimeline);

// Get prescriptions for a clinic with filters (for clinic dashboard)
router.get('/clinic/:clinic_id/prescriptions', ctrl.getPrescriptionsByClinic);

module.exports = router;
