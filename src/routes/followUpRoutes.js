const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/followUpController');

// Get all follow-ups (with filters)
router.get('/', ctrl.getFollowUps);

// Get today's pending follow-ups
router.get('/today', ctrl.getTodaysFollowUps);

// Get follow-up statistics
router.get('/stats', ctrl.getFollowUpStats);

// Create a new follow-up reminder
router.post('/', ctrl.createFollowUp);

// Update follow-up status
router.put('/:id/status', ctrl.updateFollowUpStatus);

// Send follow-up reminder via WhatsApp
router.post('/:id/remind', ctrl.sendFollowUpReminder);

// Delete a follow-up
router.delete('/:id', ctrl.deleteFollowUp);

module.exports = router;
