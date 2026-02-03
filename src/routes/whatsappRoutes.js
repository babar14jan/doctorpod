const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/whatsappController');

router.post('/send', ctrl.sendWhatsApp);
router.post('/send-invoice', ctrl.sendInvoiceWhatsApp);

module.exports = router;
