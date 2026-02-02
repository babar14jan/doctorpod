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

// Upsert patient (insert or update patient details)
async function upsertPatient(req, res) {
  try {
    const { patient_id, full_name, mobile, email, gender, date_of_birth, height_cm, blood_group, allergies } = req.body;
    
    if (!patient_id || !full_name || !mobile) {
      return res.status(400).json({ success: false, message: 'Missing required fields: patient_id, full_name, mobile' });
    }

    // Check if patient exists
    const existing = await db.prepare('SELECT * FROM patients WHERE patient_id = ?').get(patient_id);
    
    if (existing) {
      // Update existing patient - only update non-null values
      const updates = [];
      const values = [];
      
      if (full_name) { updates.push('full_name = ?'); values.push(full_name); }
      if (mobile) { updates.push('mobile = ?'); values.push(mobile); }
      if (email !== undefined) { updates.push('email = ?'); values.push(email); }
      if (gender !== undefined) { updates.push('gender = ?'); values.push(gender); }
      if (date_of_birth !== undefined) { updates.push('date_of_birth = ?'); values.push(date_of_birth); }
      if (height_cm !== undefined) { updates.push('height_cm = ?'); values.push(height_cm); }
      if (blood_group !== undefined) { updates.push('blood_group = ?'); values.push(blood_group); }
      if (allergies !== undefined) { updates.push('allergies = ?'); values.push(allergies); }
      
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(patient_id);
      
      const sql = `UPDATE patients SET ${updates.join(', ')} WHERE patient_id = ?`;
      await db.prepare(sql).run(...values);
      
      const updated = await db.prepare('SELECT * FROM patients WHERE patient_id = ?').get(patient_id);
      return res.json({ success: true, patient: updated, action: 'updated' });
    } else {
      // Insert new patient
      await db.prepare(`
        INSERT INTO patients (patient_id, full_name, mobile, email, gender, date_of_birth, height_cm, blood_group, allergies)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(patient_id, full_name, mobile, email || null, gender || null, date_of_birth || null, height_cm || null, blood_group || null, allergies || null);
      
      const inserted = await db.prepare('SELECT * FROM patients WHERE patient_id = ?').get(patient_id);
      return res.json({ success: true, patient: inserted, action: 'created' });
    }
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

module.exports = { getPatientByMobile, upsertPatient };