const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/pdfController');

router.post('/generate', ctrl.generatePdf);
router.post('/generate-pdf', ctrl.generatePdf); // For compatibility with frontend fetch code

module.exports = router;
