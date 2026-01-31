const db = require('../utils/db');
const fs = require('fs');
const path = require('path');
const dbHelper = require('../utils/dbHelper');

// Load QR config from JSON (qr_code_path.json)
const qrConfigPath = path.join(__dirname, '../utils/qr_code_path.json');
let qrPaths = {};
try {
  qrPaths = JSON.parse(fs.readFileSync(qrConfigPath, 'utf8'));
} catch (e) {
  console.error('Failed to load QR config:', e);
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
      const clinicIdRow = await db.prepare('SELECT clinic_id FROM doctors WHERE doctor_id = ?').get(resolvedDoctorId);
      if (clinicIdRow && clinicIdRow.clinic_id) resolvedClinicId = clinicIdRow.clinic_id;
    }
    let upiLink = null;
    // Use new HTTPS payment link for WhatsApp message
    let payLink = null;
    if (visit_id) {
      payLink = `${req.protocol}://${req.get('host')}/pay/${visit_id}`;
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
    // Always build full prescription PDF URL from server-relative path
    let fullPdfUrl = '';
    if (pdfPath) {
      const origin = req.get('origin') || req.protocol + '://' + req.get('host');
      fullPdfUrl = origin + (pdfPath.startsWith('/') ? pdfPath : '/' + pdfPath);
    }
    // Fetch doctor name for message
    let doctorName = '';
    if (resolvedDoctorId) {
      const doctorRow = await db.prepare('SELECT name FROM doctors WHERE doctor_id = ?').get(resolvedDoctorId);
      if (doctorRow && doctorRow.name) doctorName = doctorRow.name;
    }
    // Start with custom message from frontend, or build default
    let text = message || '';
    if (!text.trim()) {
      text = `*Doctor:* ${doctorName}`;
    }
    // Only append PDF link if not already present
    if (fullPdfUrl && !text.includes(fullPdfUrl)) {
      text += `\n\n*Prescription Link:* ${fullPdfUrl}`;
    }
    // Only append UPI payment link if not already present
    if (payLink && !text.includes(payLink)) {
      text += `\n\nPay Consultation Fee: ${payLink}`;
    }
    // Ensure DoctorPod signature is always the last line
    const doctorpodSignature = '_This is generated via DoctorPod_';
    // Remove any existing signature from anywhere in the message
    text = text.replace(new RegExp(`\\n*${doctorpodSignature}`, 'g'), '').trim();
    // Append signature at the end
    text += `\n\n${doctorpodSignature}`;
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

module.exports = { sendWhatsApp };
