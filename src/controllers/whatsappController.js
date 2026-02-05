const db = require('../utils/db');
const fs = require('fs');
const path = require('path');
const dbHelper = require('../utils/dbHelper');
const APP_CONFIG = require('../../config/branding');

// Helper function to add "Dr." prefix for display
function formatDoctorName(name) {
  if (!name) return '';
  const trimmed = name.trim();
  // Don't add if already has Dr./DR./dr. prefix
  if (/^dr\.?\s/i.test(trimmed)) return trimmed;
  return `Dr. ${trimmed}`;
}

async function sendWhatsApp(req, res){
  try{
    const { mobile, visit_id, message, consultation_fee, clinic_id, doctor_id } = req.body;
    if (!mobile && !visit_id && !doctor_id) return res.status(400).json({ success: false, message: 'Provide mobile, visit_id, or doctor_id' });


    let pdfPath = null;
    let patientId = null;
    let resolvedDoctorId = doctor_id || null;
    let resolvedClinicId = clinic_id || null;
    // If visit_id is provided, get all info from visit
    if (visit_id) {
      const hist = await db.prepare('SELECT pres_path, patient_id, doctor_id FROM visits WHERE visit_id = ?').get(visit_id);
      if (!hist) return res.status(404).json({ success: false, message: 'Visit not found' });
      pdfPath = hist.pres_path; // This is now always the server-relative path from pdf_paths.json
      patientId = hist.patient_id;
      if (hist.doctor_id) resolvedDoctorId = hist.doctor_id;
    }
    // If doctor_id is provided but not clinic_id, get clinic_id from doctors table
    if (resolvedDoctorId && !resolvedClinicId) {
      const clinicIdRow = await db.prepare('SELECT doctor_id FROM doctors WHERE doctor_id = ?').get(resolvedDoctorId);
      if (clinicIdRow && clinicIdRow.clinic_id) resolvedClinicId = clinicIdRow.clinic_id;
    }
    let upiLink = null;
    // Get base URL from environment or fallback to request
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    
    // Use base URL for payment link
    let payLink = null;
    if (visit_id) {
      payLink = `${baseUrl}/pay/${visit_id}`;
    }

    let to = mobile;
    if (!to && patientId) {
      const patient = await db.prepare('SELECT mobile FROM patients WHERE patient_id = ?').get(patientId);
      if (patient && patient.mobile) to = patient.mobile;
    }
    to = (to || '').replace(/[^0-9]/g, '');
    if (!to) return res.status(400).json({ success: false, message: 'Invalid mobile' });

    // Build WhatsApp url (using wa.me redirect). Country code default to 91 if not present.
    let phone = to;
    if (phone.length === 10) phone = '91' + phone;
    // Always build full prescription PDF URL using base URL
    let fullPdfUrl = '';
    if (pdfPath) {
      fullPdfUrl = baseUrl + (pdfPath.startsWith('/') ? pdfPath : '/' + pdfPath);
    }
    // Fetch doctor name for message
    let doctorName = '';
    if (resolvedDoctorId) {
      const doctorRow = await db.prepare('SELECT name FROM doctors WHERE doctor_id = ?').get(resolvedDoctorId);
      if (doctorRow && doctorRow.name) doctorName = doctorRow.name;
    }
    // Always use doctor and patient name in message
    let patientName = '';
    if (patientId) {
      const patientRow = await db.prepare('SELECT full_name FROM patients WHERE patient_id = ?').get(patientId);
      if (patientRow && patientRow.full_name) patientName = patientRow.full_name;
    }
    // Fetch medicine details for message
    let medicinesText = '';
    if (visit_id) {
      const medicines = await db.prepare('SELECT medicine_name, dose, frequency, timing FROM prescription_items WHERE visit_id = ?').all(visit_id);
      if (medicines && medicines.length) {
        medicinesText = '*Medicines:*\n' + medicines.map((m, i) => `${i+1}. ${m.medicine_name}${m.dose ? ' | ' + m.dose : ''}${m.frequency ? ' | ' + m.frequency : ''}${m.timing ? ' | ' + m.timing : ''}`).join('\n');
      }
    }
    // Fetch consultation fee and UPI ID for message
    let consultationFee = '';
    let upiId = '';
    if (visit_id) {
      const feeRow = await db.prepare('SELECT v.consultation_fee, c.upi_id FROM visits v JOIN clinics c ON v.clinic_id = c.clinic_id WHERE v.visit_id = ?').get(visit_id);
      if (feeRow) {
        consultationFee = feeRow.consultation_fee || '';
        upiId = feeRow.upi_id || '';
      }
    }
    let text = `*Prescription from:* ${formatDoctorName(doctorName)}\n*Patient:* ${patientName}`;
    if (medicinesText) text += `\n\n${medicinesText}`;
    if (consultationFee) text += `\n\n*Consultation Fee:* ₹${consultationFee}`;
    if (upiId) text += `\n*UPI ID:* ${upiId}`;
    // Only append PDF link if not already present
    if (fullPdfUrl && !text.includes(fullPdfUrl)) {
      text += `\n\n*Prescription Link:* ${fullPdfUrl}`;
    }
    // Only append UPI payment link if not already present
    if (payLink && !text.includes(payLink)) {
      text += `\n\n*Payment link:* ${payLink}`;
    }
    // Ensure app signature is always the last line
    const appSignature = APP_CONFIG.signatures.whatsapp;
    // Remove any existing signature from anywhere in the message
    text = text.replace(new RegExp(`\\n*${appSignature}`, 'g'), '').trim();
    // Append signature at the end
    text += `\n\n${appSignature}`;
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    res.json({ success: true, whatsappUrl: waUrl });
  }catch(e){
    console.error('[WhatsApp Link Error]', {
      error: e.message,
      stack: e.stack,
      requestBody: req.body
    });
    res.status(500).json({ success:false, message: e.message });
  }
}

// Send Invoice via WhatsApp
async function sendInvoiceWhatsApp(req, res) {
  console.log('📱 sendInvoiceWhatsApp called with body:', req.body);
  
  try {
    const { invoice_id, include_prescription = true } = req.body;
    
    if (!invoice_id) {
      console.log('❌ Missing invoice_id');
      return res.status(400).json({ success: false, message: 'Invoice ID is required' });
    }

    console.log('🔍 Fetching invoice:', invoice_id);
    
    // Get invoice details with visit info and patient mobile
    const invoice = await db.prepare(`
      SELECT i.*, v.clinic_id, v.doctor_id, v.pres_path, p.mobile as patient_mobile_from_patient
      FROM invoices i
      LEFT JOIN visits v ON i.visit_id = v.visit_id
      LEFT JOIN patients p ON v.patient_id = p.patient_id
      WHERE i.invoice_id = ?
    `).get(invoice_id);
    
    if (!invoice) {
      console.log('❌ Invoice not found:', invoice_id);
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    
    console.log('✅ Invoice found:', invoice);

    // Get doctor name
    let doctorName = invoice.doctor_name || 'Doctor';
    if (invoice.doctor_id) {
      const doctor = await db.prepare('SELECT name FROM doctors WHERE doctor_id = ?').get(invoice.doctor_id);
      if (doctor) doctorName = doctor.name;
    }

    // Get clinic details for UPI
    let clinicName = '';
    let upiId = '';
    if (invoice.clinic_id) {
      const clinic = await db.prepare('SELECT name, upi_id FROM clinics WHERE clinic_id = ?').get(invoice.clinic_id);
      if (clinic) {
        clinicName = clinic.name;
        upiId = clinic.upi_id || '';
      }
    }

    // Format mobile number - try invoice field first, then patient record
    let mobile = (invoice.patient_mobile || invoice.patient_mobile_from_patient || '').replace(/[^0-9]/g, '');
    
    console.log('📱 Patient mobile from invoice:', invoice.patient_mobile);
    console.log('📱 Patient mobile from patient record:', invoice.patient_mobile_from_patient);
    console.log('📱 Final mobile after cleanup:', mobile);
    
    if (!mobile || mobile.length < 10) {
      console.log('❌ Invalid mobile - length:', mobile.length);
      return res.status(400).json({ success: false, message: 'Invalid patient mobile number. Please update patient contact details.' });
    }
    
    // Smart country code handling
    // If exactly 10 digits, add country code
    if (mobile.length === 10) {
      mobile = '91' + mobile;
    }
    // If 12 digits and starts with 91, keep as is
    else if (mobile.length === 12 && mobile.startsWith('91')) {
      // Already has country code, keep as is
    }
    // If more than 12 or starts with +, strip and rebuild
    else if (mobile.length > 12 || mobile.startsWith('91')) {
      // Remove leading 91 if present and rebuild
      const cleaned = mobile.replace(/^91/, '');
      if (cleaned.length === 10) {
        mobile = '91' + cleaned;
      }
    }
    
    console.log('📱 Final WhatsApp number:', mobile);

    // Build URLs
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const invoicePdfUrl = baseUrl + (invoice.invoice_path.startsWith('/') ? invoice.invoice_path : '/' + invoice.invoice_path);
    
    // Build prescription PDF URL if exists and requested
    let prescriptionPdfUrl = null;
    if (include_prescription && invoice.pres_path) {
      prescriptionPdfUrl = baseUrl + (invoice.pres_path.startsWith('/') ? invoice.pres_path : '/' + invoice.pres_path);
    }
    
    // Build payment link
    let paymentLink = null;
    if (invoice.visit_id && invoice.payment_status === 'unpaid') {
      paymentLink = `${baseUrl}/pay/${invoice.visit_id}`;
    }

    // Build compact message with clear spacing
    const invoiceDate = new Date(invoice.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    
    let message = `*${clinicName || 'Medical Clinic'}*\n\n\n`;
    
    message += `*INVOICE DETAILS*\n`;
    message += `Invoice No: ${invoice.invoice_id}\n`;
    message += `Date: ${invoiceDate}\n\n\n`;
    
    message += `*PATIENT INFORMATION*\n`;
    message += `Name: ${invoice.patient_name}\n`;
    message += `Doctor: ${formatDoctorName(doctorName)}\n\n\n`;
    
    message += `*TOTAL AMOUNT: Rs. ${parseFloat(invoice.total_amount).toFixed(2)}*\n\n\n`;
    
    if (invoice.payment_status === 'paid') {
      message += `Status: PAID ✓`;
      if (invoice.payment_method) message += ` (${invoice.payment_method.toUpperCase()})`;
      message += `\n\n\n`;
    } else {
      message += `Status: PAYMENT PENDING\n\n\n`;
    }
    
    message += `*DOCUMENTS*\n`;
    message += `Invoice PDF:\n${invoicePdfUrl}\n\n`;
    
    if (prescriptionPdfUrl) {
      message += `Prescription PDF:\n${prescriptionPdfUrl}\n\n\n`;
    } else {
      message += `\n`;
    }
    
    if (invoice.payment_status === 'unpaid') {
      message += `*PAYMENT OPTIONS*\n\n`;
      if (upiId) message += `UPI ID: ${upiId}\n\n`;
      if (paymentLink) message += `Pay Online:\n${paymentLink}\n\n\n`;
    }
    
    message += APP_CONFIG.signatures.powered_by;

    // Build WhatsApp URL
    const whatsappUrl = `https://wa.me/${mobile}?text=${encodeURIComponent(message)}`;

    // Note: Notification logging disabled - notifications table not in current schema
    // TODO: Enable after creating notifications table with proper schema
    
    console.log('✅ WhatsApp URL generated successfully');

    res.json({ 
      success: true, 
      whatsapp_url: whatsappUrl,
      message: 'WhatsApp URL generated successfully'
    });

  } catch (error) {
    console.error('Send invoice WhatsApp error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = { sendWhatsApp, sendInvoiceWhatsApp };
