const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/whatsappController');

router.post('/send', ctrl.sendWhatsApp);

module.exports = router;
