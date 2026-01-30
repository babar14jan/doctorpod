const db = require('../utils/db');


// Save/update visit and medicines for a visit using star schema
async function updateVisit(req, res) {
  try {
    const { visit_id, patient_id, doctor_id, clinic_id, diagnosis, investigations, advice, temperature, blood_pressure, consultation_fee, include_qr, medicines } = req.body;
    if (!visit_id) return res.status(400).json({ success: false, message: 'Missing visit_id' });

    // Update visits table
    await db.prepare(`UPDATE visits SET 
      patient_id = ?,
      doctor_id = ?,
      clinic_id = ?,
      diagnosis = ?,
      investigations = ?,
      advice = ?,
      temperature = ?,
      blood_pressure = ?,
      consultation_fee = ?,
      updated_at = CURRENT_TIMESTAMP
      WHERE visit_id = ?
    `).run(
      patient_id,
      doctor_id,
      clinic_id,
      diagnosis,
      investigations,
      advice,
      temperature,
      blood_pressure,
      consultation_fee,
      visit_id
    );

    // Remove old medicines for this visit
    await db.prepare('DELETE FROM prescription_items WHERE visit_id = ?').run(visit_id);

    // Insert new medicines
    if (Array.isArray(medicines)) {
      for (const med of medicines) {
        await db.prepare(`INSERT INTO prescription_items (visit_id, medicine_name, frequency, timing, dose) VALUES (?, ?, ?, ?, ?)`)
          .run(visit_id, med.medicine_name, med.frequency, med.timing, med.dose);
      }
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

module.exports = { updateVisit };
