const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/medicineController');

// Autocomplete suggestions
router.get('/suggestions', ctrl.getSuggestions);

// Get medicine details by name
router.get('/details', ctrl.getMedicineDetails);

// List all medicines (for admin/management)
router.get('/list', ctrl.listMedicines);

// Add new medicine to master
router.post('/add', ctrl.addToMaster);

module.exports = router;
