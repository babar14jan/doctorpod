// Get all clinics (for admin dashboard)
async function getAllClinics(req, res) {
  try {
    const rows = await db.prepare('SELECT clinic_id, name, phone, email, address, source FROM clinics ORDER BY name').all();
    res.json({ success: true, clinics: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}
const db = require('../utils/db');

// Clinic login endpoint
async function loginClinic(req, res) {
  const { clinic_id, password } = req.body;
  if (!clinic_id || !password) {
    return res.status(400).json({ success: false, message: 'Missing credentials' });
  }
  // Login by clinic_id and password (new schema)
  const clinic = await db.prepare('SELECT * FROM clinics WHERE clinic_id = ?').get(clinic_id);
  if (!clinic || clinic.password !== password) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
  req.session.clinic = { clinic_id: clinic.clinic_id, name: clinic.name };
  res.json({ success: true, clinic_id: clinic.clinic_id, name: clinic.name });
}

// Clinic session check endpoint
function clinicSession(req, res) {
  if (req.session && req.session.clinic) {
    res.json({ success: true, clinic: req.session.clinic });
  } else {
    res.json({ success: false });
  }
}

module.exports = { loginClinic, getAllClinics, clinicSession };
