const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/bookingController');
// Filters for appointment dropdowns
router.get('/doctor/:doctorId/filters', ctrl.getDoctorBookingFilters);

// Doctor/clinic availability endpoint
router.get('/availability', ctrl.getAvailability);
// Endpoint to get clinic timings for slot generation
// (Assuming getClinicTimings is updated in controller)
router.get('/clinic-timings', ctrl.getClinicTimings);

// TODO: Update these endpoints to use new booking logic and schema
router.post('/book', ctrl.bookAppointment);
router.get('/verify', ctrl.verifyBooking);
router.get('/doctor/:id', ctrl.getDoctorBookings);
router.get('/clinic/:clinicId', ctrl.getClinicBookings);
router.put('/:id/status', ctrl.updateBookingStatus);

module.exports = router;
