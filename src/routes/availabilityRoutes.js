const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/availabilityController');

router.post('/add', ctrl.addAvailability);
router.get('/by-clinic/:clinic_id', ctrl.getAvailabilityByClinic);
router.post('/update', express.json(), ctrl.updateAvailability);
router.post('/delete', express.json(), ctrl.deleteAvailability);

module.exports = router;
