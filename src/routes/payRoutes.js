const express = require('express');
const router = express.Router();
const { payRedirect } = require('../controllers/payController');

router.get('/:payment_id', payRedirect);

module.exports = router;
