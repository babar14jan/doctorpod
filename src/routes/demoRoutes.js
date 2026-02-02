const express = require('express');
const router = express.Router();
const demoController = require('../controllers/demoController');

/**
 * @route   POST /api/demo/request
 * @desc    Submit a demo request (Public)
 * @access  Public
 */
router.post('/request', demoController.submitDemoRequest);

/**
 * @route   GET /api/demo/requests
 * @desc    Get all demo requests (Admin only)
 * @access  Admin
 */
router.get('/requests', demoController.getAllDemoRequests);

/**
 * @route   PUT /api/demo/requests/:id
 * @desc    Update demo request status (Admin only)
 * @access  Admin
 */
router.put('/requests/:id', demoController.updateDemoRequestStatus);

/**
 * @route   DELETE /api/demo/requests/:id
 * @desc    Delete demo request (Admin only)
 * @access  Admin
 */
router.delete('/requests/:id', demoController.deleteDemoRequest);

module.exports = router;
