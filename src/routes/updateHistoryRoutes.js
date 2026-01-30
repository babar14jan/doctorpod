const express = require('express');
const router = express.Router();
const { updateVisit } = require('../controllers/updateHistoryController');

router.post('/update-visit', updateVisit);

module.exports = router;
