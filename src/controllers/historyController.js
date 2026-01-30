// Get all visits for a patient, joined with medicines
async function getVisitsWithMedicinesByPatient(req, res) {
  try {
    const patientId = req.params.patient_id;
    // Get all visits for the patient
    const visits = await db.prepare('SELECT * FROM visits WHERE patient_id = ? ORDER BY visit_time DESC').all(patientId);
    // For each visit, get medicines
    for (const v of visits) {
      v.medicines = await db.prepare('SELECT medicine_name, frequency, timing FROM prescription_items WHERE visit_id = ?').all(v.visit_id);
    }
    res.json({ success: true, visits });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

const db = require('../utils/db');
const { generateVisitId } = require('../utils/idGenerator');

// Save or update a visit (history) and its medicines using new star schema
async function saveVisit(req, res) {
  const { visit_id, patient_id, doctor_id, clinic_id, diagnosis, investigations, advice, temperature, blood_pressure, consultation_fee, medicines, appointment_id, patient_weight, source } = req.body;
  const path = require('path');
  const fs = require('fs');
  const pdfPaths = require('../utils/pdf_paths.json');
  if (!patient_id || !doctor_id || !clinic_id) return res.status(400).json({ success: false, message: 'Missing fields' });

  let visitId = visit_id || generateVisitId();
  // Compose PDF key as in pdf_paths.json (e.g., `${patientName}_${visitId}`)
  let pdfKey = `${(req.body.patient_name || '').replace(/\s+/g, '_')}_${visitId}`;
  let pres_path = pdfPaths[pdfKey] || null;
  // Prepare patient_name, patient_age, patient_gender
  let patientName = req.body.patient_name || '';
  let patientAge = req.body.patient_age || null;
  let patientGender = req.body.patient_gender || '';
  // If appointment_id is present, try to get from bookings
  if (appointment_id) {
    const booking = await db.prepare('SELECT patient_name, patient_age, patient_gender FROM bookings WHERE appointment_id = ?').get(appointment_id);
    if (booking) {
      if (!patientName && booking.patient_name) patientName = booking.patient_name;
      if (!patientAge && booking.patient_age) patientAge = booking.patient_age;
      if (!patientGender && booking.patient_gender) patientGender = booking.patient_gender;
    }
  }
  // Fallback to patients table for gender if still missing
  if ((!patientGender || patientGender === '') && patient_id) {
    const patient = await db.prepare('SELECT gender FROM patients WHERE patient_id = ?').get(patient_id);
    if (patient && patient.gender) patientGender = patient.gender;
  }
  try {
    await db.prepare('BEGIN TRANSACTION').run();
    // Check if visit exists
    const existing = await db.prepare('SELECT * FROM visits WHERE visit_id = ?').get(visitId);
    if (existing) {
      await db.prepare('UPDATE visits SET patient_id = ?, doctor_id = ?, clinic_id = ?, diagnosis = ?, investigations = ?, advice = ?, temperature = ?, blood_pressure = ?, consultation_fee = ?, patient_name = ?, patient_age = ?, patient_gender = ?, appointment_id = ?, patient_weight = ?, pres_path = ?, source = ?, updated_at = CURRENT_TIMESTAMP WHERE visit_id = ?')
        .run(
          patient_id, doctor_id, clinic_id, diagnosis || null, investigations || null, advice || null, temperature || null, blood_pressure || null, consultation_fee || null,
          patientName || null, patientAge || null, patientGender || null, appointment_id || null, patient_weight || null, pres_path, source || null, visitId
        );
      await db.prepare('DELETE FROM prescription_items WHERE visit_id = ?').run(visitId);
      if (Array.isArray(medicines)) {
        const mstmt = db.prepare('INSERT INTO prescription_items (visit_id, doctor_id, medicine_name, frequency, timing) VALUES (?, ?, ?, ?, ?)');
        for (const m of medicines) await mstmt.run(visitId, doctor_id, m.medicine_name, m.frequency || null, m.timing || null);
      }
      await db.prepare('COMMIT').run();
      return res.json({ success: true, visit_id: visitId, updated: true });
    } else {
      await db.prepare('INSERT INTO visits (visit_id, patient_id, doctor_id, clinic_id, diagnosis, investigations, advice, temperature, blood_pressure, consultation_fee, patient_name, patient_age, patient_gender, appointment_id, patient_weight, pres_path, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(
          visitId, patient_id, doctor_id, clinic_id, diagnosis || null, investigations || null, advice || null, temperature || null, blood_pressure || null, consultation_fee || null,
          patientName || null, patientAge || null, patientGender || null, appointment_id || null, patient_weight || null, pres_path, source || null
        );
      if (Array.isArray(medicines)) {
        const mstmt = db.prepare('INSERT INTO prescription_items (visit_id, doctor_id, medicine_name, frequency, timing) VALUES (?, ?, ?, ?, ?)');
        for (const m of medicines) await mstmt.run(visitId, doctor_id, m.medicine_name, m.frequency || null, m.timing || null);
      }
      await db.prepare('COMMIT').run();
      return res.json({ success: true, visit_id: visitId, created: true });
    }
  } catch (e) {
    await db.prepare('ROLLBACK').run();
    res.status(500).json({ success: false, message: e.message });
  }
}

// Get visit by visit_id
async function getVisitById(req, res) {
  try {
    const visitId = req.params.visit_id;
    const visit = await db.prepare('SELECT * FROM visits WHERE visit_id = ?').get(visitId);
    if (!visit) return res.status(404).json({ success: false, message: 'Not found' });
    const medicines = await db.prepare('SELECT medicine_name, frequency, timing FROM prescription_items WHERE visit_id = ?').all(visitId);
    res.json({ success: true, visit, medicines });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// Get all visits for a patient
async function getVisitsByPatient(req, res) {
  try {
    const patientId = req.params.patient_id;
    const visits = await db.prepare('SELECT * FROM visits WHERE patient_id = ? ORDER BY visit_time DESC').all(patientId);
    res.json({ success: true, visits });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// Get all visits for a doctor
async function getVisitsByDoctor(req, res) {
  try {
    const doctorId = req.params.doctor_id;
    const visits = await db.prepare('SELECT * FROM visits WHERE doctor_id = ? ORDER BY visit_time DESC').all(doctorId);
    res.json({ success: true, visits });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}


// Get patient profile and visit timeline (joined)
async function getPatientProfileAndTimeline(req, res) {
  try {
    const patientId = req.params.patient_id;
    // Get patient demographics
    const patient = await db.prepare('SELECT * FROM patients WHERE patient_id = ?').get(patientId);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });
    // Get visit timeline with doctor and clinic info
    const timeline = await db.prepare(`
      SELECT vh.*, d.name AS doctor_name, d.specialization, c.name AS clinic_name, c.address AS clinic_address
      FROM visits vh
      LEFT JOIN doctors d ON vh.doctor_id = d.doctor_id
      LEFT JOIN clinics c ON vh.clinic_id = c.clinic_id
      WHERE vh.patient_id = ?
      ORDER BY vh.visit_time DESC
    `).all(patientId);
    res.json({ success: true, patient, timeline });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

module.exports = { saveVisit, getVisitById, getVisitsByPatient, getVisitsByDoctor, getPatientProfileAndTimeline, getVisitsWithMedicinesByPatient };
