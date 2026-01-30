const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/availabilityController');

router.post('/add', ctrl.addAvailability);

module.exports = router;
