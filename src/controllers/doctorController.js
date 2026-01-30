// Get doctor availability (timings) for a given doctor and clinic
async function getDoctorAvailability(req, res) {
  try {
    const { doctor_id, clinic_id } = req.query;
    if (!doctor_id || !clinic_id) return res.status(400).json({ success: false, message: 'Missing doctor_id or clinic_id' });
    const rows = await db.prepare('SELECT day_of_week, start_time, end_time FROM availability_slots WHERE doctor_id = ? AND clinic_id = ? ORDER BY id').all(doctor_id, clinic_id);
    res.json({ success: true, availability: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}
const db = require('../utils/db');

async function getAllDoctors(req, res){
  try{
    const rows = await db.prepare('SELECT doctor_id, name, qualification, specialization, mobile, email FROM doctors ORDER BY name').all();
    // attach clinics for each doctor
    for (const d of rows) {
      const clinics = await db.prepare('SELECT clinic_id, name, address FROM clinics WHERE clinic_id = ?').all(d.clinic_id);
      d.clinics = clinics || [];
    }
    res.json({ success: true, doctors: rows });
  }catch(e){ res.status(500).json({ success:false, message: e.message }); }
}


// Allow login with either mobile or email
async function loginDoctor(req, res){
  try {
    const { identifier, password, fetchClinics, clinic_id } = req.body;
    if (!identifier) return res.status(400).json({ success: false, message: 'Missing credentials' });
    // Fetch clinics tagged to this doctor (no password required)
    if (fetchClinics) {
      const user = await db.prepare('SELECT * FROM doctors WHERE doctor_id = ? OR mobile = ?').get(identifier, identifier);
      if (!user) return res.status(404).json({ success: false, message: 'Doctor not found' });
      const clinics = await db.prepare(`SELECT DISTINCT c.clinic_id, c.name, c.address FROM clinics c 
        INNER JOIN availability_slots da ON da.clinic_id = c.clinic_id WHERE da.doctor_id = ?`).all(user.doctor_id);
      let fallbackClinics = [];
      if (!clinics.length && user.clinic_id) {
        const fallback = await db.prepare('SELECT clinic_id, name, address FROM clinics WHERE clinic_id = ?').get(user.clinic_id);
        if (fallback) fallbackClinics = [fallback];
      }
      return res.json({ success: true, id: user.doctor_id, name: user.name, clinics: clinics.length ? clinics : fallbackClinics });
    }
    // Validate selected clinic and password
    if (!password) return res.status(400).json({ success: false, message: 'Missing credentials' });
    const user = await db.prepare('SELECT * FROM doctors WHERE doctor_id = ? OR mobile = ?').get(identifier, identifier);
    if (!user || user.password !== password) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (clinic_id) {
      const validClinic = await db.prepare(`SELECT c.clinic_id, c.name, c.address FROM clinics c 
        INNER JOIN availability_slots da ON da.clinic_id = c.clinic_id WHERE da.doctor_id = ? AND c.clinic_id = ?`).get(user.doctor_id, clinic_id);
      let clinic = validClinic;
      if (!clinic) {
        if (user.clinic_id === clinic_id) {
          clinic = await db.prepare('SELECT clinic_id, name, address FROM clinics WHERE clinic_id = ?').get(clinic_id);
        }
      }
      if (!clinic) return res.status(403).json({ success: false, message: 'You are not assigned to this clinic.' });
      req.session.doctor = { id: user.doctor_id, name: user.name, clinic_id: clinic.clinic_id };
      return res.json({ success: true, id: user.doctor_id, name: user.name, clinic });
    }
    return res.status(400).json({ success: false, message: 'Clinic selection required.' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// Get all clinics (for booking form dropdown)
async function getAllClinics(req, res) {
  try {
    const clinics = await db.prepare('SELECT clinic_id, name, address FROM clinics ORDER BY name').all();
    res.json({ success: true, clinics });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// Get all doctors for a clinic (for booking form dropdown)
async function getDoctorsByClinic(req, res) {
  try {
    const { clinic_id } = req.params;
    if (!clinic_id) return res.status(400).json({ success: false, message: 'Missing clinic_id' });
    const doctors = await db.prepare('SELECT doctor_id, name, qualification, specialization, mobile FROM doctors WHERE clinic_id = ? ORDER BY name').all(clinic_id);
    res.json({ success: true, doctors });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

async function addDoctor(req, res){
  // Allow both admin and clinic to add doctors
  let clinic_id = req.body.clinic_id;
  let source = null;
  if (req.session.admin) {
    source = req.session.admin.admin_id;
  } else if (req.session.clinic) {
    clinic_id = req.session.clinic.clinic_id;
    source = req.session.clinic.clinic_id;
  } else {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }
  const { name, qualification, specialization, phone, email, password, registration_no } = req.body;
  if (!name || !phone || !password || !clinic_id) return res.status(400).json({ success: false, message: 'Missing required fields' });
  // Auto-generate doctor_id: first 4 chars of name (alphanumeric, lowercase, no spaces, pad to 4) + last 6 digits of mobile (pad to 6)
  const namePart = (name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 4)).padEnd(4, 'x');
  const phoneDigits = (phone.match(/\d+/g) || []).join('');
  const phonePart = phoneDigits.slice(-6).padStart(6, '0');
  const doctor_id = namePart + phonePart;
  try {
    await db.prepare('INSERT INTO doctors (doctor_id, clinic_id, name, qualification, specialization, mobile, email, password, source, registration_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(doctor_id, clinic_id, name, qualification || '', specialization || '', phone || null, email || null, password, source, registration_no || null);
    res.json({ success: true, doctor_id });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}


// Add clinic (true clinic creation for admin dashboard)
async function addClinic(req, res){
  if (!req.session.admin) return res.status(403).json({ success: false, message: 'Unauthorized' });
  const { name, phone, email, address, password } = req.body;
  const source = req.session.admin.admin_id;
  if (!name || !phone || !email || !address || !password) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }
  // Auto-generate clinic_id: first 4 chars of name (alphanumeric, lowercase, no spaces) + last 6 digits of phone
  const namePart = (name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 4)).padEnd(4, 'x');
  const phoneDigits = (phone.match(/\d+/g) || []).join('');
  const phonePart = phoneDigits.slice(-6).padStart(6, '0');
  const clinic_id = namePart + phonePart;
  try {
    await db.prepare('INSERT INTO clinics (clinic_id, name, phone, email, address, password, source) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(clinic_id, name, phone, email, address, password, source);
    res.json({ success: true, clinic_id });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

async function getDoctorById(req, res){
  try{
    const doc = await db.prepare('SELECT doctor_id, name, qualification, specialization, mobile, email, clinic_id FROM doctors WHERE doctor_id = ?').get(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    // Get clinic info for this doctor
    let clinics = [];
    if (doc.clinic_id) {
      const clinic = await db.prepare('SELECT clinic_id, name, address FROM clinics WHERE clinic_id = ?').get(doc.clinic_id);
      if (clinic) clinics.push(clinic);
    }
    res.json({ success: true, doctor: doc, clinics });
  }catch(e){ res.status(500).json({ success:false, message: e.message }); }
}

async function deleteDoctor(req, res){
  if (!req.session.admin) return res.status(403).json({ success: false, message: 'Unauthorized' });
  const { id } = req.body;
  if (!id) return res.status(400).json({ success: false, message: 'Missing id' });
  try {
    // delete clinics, bookings and doctor record
    await db.prepare('DELETE FROM fact_booking WHERE doctor_id = ?').run(id);
    await db.prepare('DELETE FROM dim_clinic WHERE doctor_id = ?').run(id);
    await db.prepare('DELETE FROM dim_doctor WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

module.exports = { getAllDoctors, loginDoctor, addDoctor, getDoctorById, deleteDoctor, addClinic };
module.exports = { getAllDoctors, loginDoctor, addDoctor, getDoctorById, deleteDoctor, addClinic, getAllClinics, getDoctorsByClinic, getDoctorAvailability };
