const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/analyticsController');

// Dashboard summary (today + this month stats)
router.get('/summary', ctrl.getSummary);

// Booking trends over time
router.get('/bookings', ctrl.getBookingTrends);

// Revenue trends over time
router.get('/revenue', ctrl.getRevenueTrends);

// Doctor performance comparison
router.get('/doctors', ctrl.getDoctorPerformance);

// Top prescribed medicines
router.get('/medicines', ctrl.getTopMedicines);

// Top diagnoses
router.get('/diagnoses', ctrl.getTopDiagnoses);

// Patient demographics & insights
router.get('/patients', ctrl.getPatientInsights);

// Clinic-wise summary (admin)
router.get('/clinics', ctrl.getClinicSummary);

// Trigger daily aggregation (admin/cron)
router.post('/aggregate', ctrl.triggerAggregation);

module.exports = router;
