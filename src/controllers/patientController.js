// src/controllers/patientController.js
const db = require('../utils/db');

// Get patient by mobile number
async function getPatientByMobile(req, res) {
  try {
    const mobile = req.params.mobile;
    if (!mobile) return res.status(400).json({ success: false, message: 'Missing mobile' });
    const patient = await db.prepare('SELECT * FROM patients WHERE mobile = ?').get(mobile);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });
    res.json({ success: true, patient });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

module.exports = { getPatientByMobile };