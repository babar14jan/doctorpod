const db = require('../utils/db');

// Add doctor availability
async function addAvailability(req, res) {
  // Allow both admin and clinic to add availability
  const isAdmin = req.session && req.session.admin;
  const isClinic = req.session && req.session.clinic;
  
  if (!isAdmin && !isClinic) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }
  
  const { doctor_id, clinic_id, days, timings, interval_minutes, slot_type } = req.body;
  if (!doctor_id || !clinic_id || !days || !timings) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }
  
  // If clinic is adding, ensure they can only add for their own clinic
  if (isClinic && req.session.clinic.clinic_id !== clinic_id) {
    return res.status(403).json({ success: false, message: 'You can only add availability for your own clinic' });
  }
  
  // Validate slot_type
  const validSlotTypes = ['clinic', 'video', 'both'];
  const slotTypeValue = validSlotTypes.includes(slot_type) ? slot_type : 'clinic';
  
  // timings format: "10:00-13:00"
  let start_time = '', end_time = '';
  if (timings.includes('-')) {
    const [start, end] = timings.split('-');
    start_time = start.trim();
    end_time = end.trim();
  }
  
  // Use interval_minutes from request, fallback to 15
  const interval = (typeof interval_minutes !== 'undefined' && !isNaN(parseInt(interval_minutes, 10))) ? parseInt(interval_minutes, 10) : 15;
  
  try {
    const dayList = days.split(',').map(d => d.trim()).filter(Boolean);
    for (const day of dayList) {
      await db.prepare('INSERT INTO availability_slots (doctor_id, clinic_id, day_of_week, start_time, end_time, interval_minutes, slot_type) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(doctor_id, clinic_id, day, start_time, end_time, interval, slotTypeValue);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// Get all availability for a clinic
async function getAvailabilityByClinic(req, res) {
  try {
    const { clinic_id } = req.params;
    if (!clinic_id) {
      return res.status(400).json({ success: false, message: 'Missing clinic_id' });
    }
    
    // Join with doctors table to get doctor names
    const availability = await db.prepare(`
      SELECT 
        a.id,
        a.doctor_id,
        d.name as doctor_name,
        a.clinic_id,
        a.day_of_week,
        a.start_time,
        a.end_time,
        a.interval_minutes,
        a.slot_type
      FROM availability_slots a
      LEFT JOIN doctors d ON a.doctor_id = d.doctor_id
      WHERE a.clinic_id = ?
      ORDER BY a.doctor_id, 
        CASE a.day_of_week
          WHEN 'Monday' THEN 1
          WHEN 'Tuesday' THEN 2
          WHEN 'Wednesday' THEN 3
          WHEN 'Thursday' THEN 4
          WHEN 'Friday' THEN 5
          WHEN 'Saturday' THEN 6
          WHEN 'Sunday' THEN 7
        END
    `).all(clinic_id);
    
    res.json({ success: true, availability });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// Update availability
async function updateAvailability(req, res) {
  const isAdmin = req.session && req.session.admin;
  const isClinic = req.session && req.session.clinic;
  
  if (!isAdmin && !isClinic) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }
  
  const { id, day_of_week, start_time, end_time, interval_minutes, slot_type } = req.body;
  if (!id) {
    return res.status(400).json({ success: false, message: 'Missing availability ID' });
  }
  
  try {
    const updates = [];
    const values = [];
    
    if (day_of_week) { updates.push('day_of_week = ?'); values.push(day_of_week); }
    if (start_time) { updates.push('start_time = ?'); values.push(start_time); }
    if (end_time) { updates.push('end_time = ?'); values.push(end_time); }
    if (interval_minutes) { updates.push('interval_minutes = ?'); values.push(interval_minutes); }
    if (slot_type && ['clinic', 'video', 'both'].includes(slot_type)) { 
      updates.push('slot_type = ?'); 
      values.push(slot_type); 
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }
    
    values.push(id);
    const sql = `UPDATE availability_slots SET ${updates.join(', ')} WHERE id = ?`;
    await db.prepare(sql).run(...values);
    
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// Delete availability
async function deleteAvailability(req, res) {
  const isAdmin = req.session && req.session.admin;
  const isClinic = req.session && req.session.clinic;
  
  if (!isAdmin && !isClinic) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }
  
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ success: false, message: 'Missing availability ID' });
  }
  
  try {
    await db.prepare('DELETE FROM availability_slots WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

module.exports = { addAvailability, getAvailabilityByClinic, updateAvailability, deleteAvailability };
