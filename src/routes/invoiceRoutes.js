const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/invoiceController');

// Generate invoice
router.post('/generate', express.json(), ctrl.generateInvoice);

// Get invoice by ID
router.get('/:invoice_id', ctrl.getInvoice);

// Get today's checkouts for a clinic
router.get('/clinic/:clinic_id/checkouts', ctrl.getTodaysCheckouts);

// Get video consultations ready for invoice (paid + seen + no invoice yet)
router.get('/clinic/:clinic_id/video-checkouts', ctrl.getVideoReadyForInvoice);

// Get invoice statistics for a clinic
router.get('/clinic/:clinic_id/stats', ctrl.getInvoiceStats);

// Get all invoices with filters
router.get('/clinic/:clinic_id/all', ctrl.getAllInvoices);

// Get all invoices for a clinic (legacy - keep for compatibility)
router.get('/clinic/:clinic_id', ctrl.getInvoicesByClinic);

// Update payment status
router.patch('/:invoice_id/payment', express.json(), ctrl.updatePaymentStatus);

module.exports = router;
