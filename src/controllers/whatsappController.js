const db = require('../utils/db');
const fs = require('fs');
const path = require('path');

// Load QR config from JSON (qrcode_path.json)
const qrConfigPath = path.join(__dirname, '../utils/qrcode_path.json');
let qrPaths = {};
try {
  qrPaths = JSON.parse(fs.readFileSync(qrConfigPath, 'utf8'));
} catch (e) {
  console.error('Failed to load QR config:', e);
}

async function sendWhatsApp(req, res){
  try{
    const { mobile, visit_id, message } = req.body;
    if (!mobile && !visit_id) return res.status(400).json({ success: false, message: 'Provide mobile or visit_id' });


    let pdfPath = null;
    let patientId = null;
    if (visit_id) {
      const hist = await db.prepare('SELECT pres_path, patient_id FROM visits WHERE visit_id = ?').get(visit_id);
      if (!hist) return res.status(404).json({ success: false, message: 'Visit not found' });
      pdfPath = hist.pres_path;
      patientId = hist.patient_id;
    }

    let to = mobile;
    if (!to && patientId) {
      const patient = await db.prepare('SELECT mobile FROM patients WHERE patient_id = ?').get(patientId);
      if (patient && patient.mobile) to = patient.mobile;
    }
    to = (to || '').replace(/[^0-9]/g, '');
    if (!to) return res.status(400).json({ success: false, message: 'Invalid mobile' });

    // Build whatsapp url (using wa.me redirect). Country code default to 91 if not present.
    let phone = to;
    if (phone.length === 10) phone = '91' + phone;
    let text = message || `Prescription: ${pdfPath || ''}`;
    // Only add QR code link if include_qr is true
    let includeQr = false;
    let doctorId = null;
    if (typeof req.body.include_qr !== 'undefined') {
      includeQr = !!req.body.include_qr;
    }
    if (visit_id) {
      // Get doctor_id from visits
      const histRow = await db.prepare('SELECT doctor_id FROM visits WHERE visit_id = ?').get(visit_id);
      if (histRow && histRow.doctor_id) doctorId = histRow.doctor_id;
    }
    const qrPath = doctorId ? qrPaths[doctorId] : null;
    if (includeQr && qrPath) {
      const qrUrl = `${req.protocol}://${req.get('host')}${qrPath}`;
      text += `\nPay/Verify QR: ${qrUrl}`;
    }
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    
    res.json({ success: true, whatsappUrl: waUrl });
  }catch(e){ res.status(500).json({ success:false, message: e.message }); }
}

module.exports = { sendWhatsApp };
