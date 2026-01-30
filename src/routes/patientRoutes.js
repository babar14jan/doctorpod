// src/routes/patientRoutes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/patientController');

// Get patient by mobile
router.get('/by-mobile/:mobile', ctrl.getPatientByMobile);

module.exports = router;
