// GET /bookings/doctor/:doctorId/filters
async function getDoctorBookingFilters(req, res) {
  try {
    const doctorId = req.params.doctorId;
    const statuses = (await db.prepare('SELECT DISTINCT consult_status FROM bookings WHERE doctor_id = ?').all(doctorId)).map(r => r.consult_status);
    const dates = (await db.prepare('SELECT DISTINCT appointment_date FROM bookings WHERE doctor_id = ?').all(doctorId)).map(r => r.appointment_date);
    const times = (await db.prepare('SELECT DISTINCT appointment_time FROM bookings WHERE doctor_id = ?').all(doctorId)).map(r => r.appointment_time);
    res.json({ success: true, statuses, dates, times });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}
// Get all bookings for a doctor
async function getDoctorBookings(req, res) {
  try {
    const doctorId = req.params.id;
    let date = req.query.date;
    let query = 'SELECT * FROM bookings WHERE doctor_id = ?';
    let params = [doctorId];
    if (date) {
      query += ' AND appointment_date = ?';
      params.push(date);
    }
    query += ' ORDER BY appointment_date DESC, appointment_time ASC';
    const bookings = await db.prepare(query).all(...params);
    res.json({ success: true, bookings });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}
const db = require('../utils/db');

// GET /availability?doctorId=&clinicId=&date=
async function getAvailability(req, res) {
  try {
    const { doctorId, clinicId, date } = req.query;
    if (!doctorId || !clinicId) return res.status(400).json({ success: false, message: 'Missing doctorId or clinicId' });

    // Get clinic timings for this doctor/clinic
    const clinic = await db.prepare('SELECT timings, slot_duration FROM dim_clinic WHERE id = ? AND doctor_id = ?').get(clinicId, doctorId);
    if (!clinic) return res.status(404).json({ success: false, message: 'Clinic or doctor not found' });
    const { timings, slot_duration } = clinic;
    if (!timings) return res.json({ success: true, slots: [], summary: 'No timings set for this clinic.' });

    // Parse timings string, e.g. "Mon,Wed,Fri 10:00-14:00"
    // Support multiple sessions: "Mon,Wed,Fri 10:00-14:00; Mon,Wed,Fri 16:00-18:00"
    const sessions = timings.split(';').map(s => s.trim()).filter(Boolean);
    let summary = [];
    let availableSessions = [];
    for (const session of sessions) {
      const [daysPart, timePart] = session.split(' ');
      if (!daysPart || !timePart) continue;
      const days = daysPart.split(',').map(d => d.trim());
      const [start, end] = timePart.split('-').map(t => t.trim());
      summary.push(`${days.join(', ')} | ${start}${end}`);
      availableSessions.push({ days, start, end });
    }
    // If date is provided, filter sessions for that day
    let slots = [];
    let validDay = false;
    if (date) {
      const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' }); // e.g. 'Mon'
      for (const session of availableSessions) {
        if (session.days.includes(dayName)) {
          validDay = true;
          // Generate slots for this session
          const slotMins = parseInt(slot_duration, 10) || 10;
          let [sh, sm] = session.start.split(':').map(Number);
          let [eh, em] = session.end.split(':').map(Number);
          let startMins = sh * 60 + sm;
          let endMins = eh * 60 + em;
          for (let mins = startMins; mins + slotMins <= endMins; mins += slotMins) {
            const h = Math.floor(mins / 60).toString().padStart(2, '0');
            const m = (mins % 60).toString().padStart(2, '0');
            slots.push(`${h}:${m}`);
          }
        }
      }
      // Remove already booked slots
      if (slots.length) {
        const booked = await db.prepare('SELECT appointment_time FROM bookings WHERE doctor_id = ? AND clinic_id = ? AND appointment_date = ?').all(doctorId, clinicId, date);
        const bookedSet = new Set(booked.map(b => b.appointment_time));
        slots = slots.filter(s => !bookedSet.has(s));
      }
    }
    res.json({ success: true, slots, summary: summary.join('; '), validDay });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}
// Get timings for a specific doctor and clinic
async function getClinicTimings(req, res){
  const { doctor_id, clinic_id } = req.query;
  if (!doctor_id || !clinic_id) return res.status(400).json({ success: false, message: 'Missing doctor_id or clinic_id' });
  try {
    const row = await db.prepare('SELECT timings FROM clinics WHERE doctor_id = ? AND id = ?').get(doctor_id, clinic_id);
    if (!row) return res.status(404).json({ success: false, message: 'Clinic not found' });
    res.json({ success: true, timings: row.timings });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}
const { getNextQueueNumber, getBookingCountForDate } = require('../utils/dbHelper');
const { generateBookingId } = require('../utils/idGenerator');

async function bookAppointment(req, res){
  const {
    patient_name,
    mobile,
    age,
    gender,
    blood_group,
    doctor_id,
    clinic_id,
    appointment_date
  } = req.body;

  // Generate patient_id (first 4 chars of name + last 6 of mobile)
  const patient_id = (patient_name.replace(/\s+/g, '').substring(0,4).toUpperCase() + (mobile.slice(-6))).toUpperCase();

  if (!patient_name || !mobile || !age || !doctor_id || !clinic_id || !appointment_date) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  // Use availability_slots for validation
  // Convert appointment_date to short day name (Mon, Tue, etc.)
  const jsDate = new Date(appointment_date);
  const shortDays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const dayName = shortDays[jsDate.getDay()];
  // Debug: log all availabilities for this doctor/clinic
  const allAvail = await db.prepare('SELECT * FROM availability_slots WHERE doctor_id = ? AND clinic_id = ?').all(doctor_id, clinic_id);
  console.log('[BOOKING DEBUG] All availability_slots for doctor/clinic:', allAvail);
  // Debug: log the dayName being searched
  console.log('[BOOKING DEBUG] Searching for day_of_week:', dayName);
  // Try to match day_of_week case-insensitively and trimmed
  const avail = allAvail.find(a => (a.day_of_week || '').trim().toLowerCase() === dayName.trim().toLowerCase());
  console.log('[BOOKING DEBUG] Matched doctor_availability:', avail);
  if (!avail) {
    return res.status(400).json({ success: false, message: 'Doctor is not available on selected date. Please choose a valid day as per timings.' });
  }
  // Generate all possible slots for the day
  const [sh, sm] = avail.start_time.split(':').map(Number);
  const [eh, em] = avail.end_time.split(':').map(Number);
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  const interval = parseInt(avail.interval_minutes, 10) || 10;
  let slots = [];
  for (let mins = startMins; mins + interval <= endMins; mins += interval) {
    const h = Math.floor(mins / 60).toString().padStart(2, '0');
    const m = (mins % 60).toString().padStart(2, '0');
    slots.push(`${h}:${m}`);
  }
  // Get already booked slots for this doctor/clinic/date
  const bookedRows = await db.prepare('SELECT appointment_time FROM bookings WHERE doctor_id = ? AND clinic_id = ? AND appointment_date = ?').all(doctor_id, clinic_id, appointment_date);
  const bookedSet = new Set(bookedRows.map(b => b.appointment_time));
  // Find the first available slot
  const availableSlot = slots.find(s => !bookedSet.has(s));
  // Debug logging for troubleshooting date/day issues
  console.log('[BOOKING DEBUG] Received:', { appointment_date, doctor_id, clinic_id });
  console.log('[BOOKING DEBUG] Calculated dayName:', dayName);
  if (!availableSlot) {
    return res.status(400).json({ success: false, message: 'All slots are booked for this date. Please choose another date.' });
  }
  // Fetch doctor and clinic names
  const doctorRow = await db.prepare('SELECT name FROM doctors WHERE doctor_id = ?').get(doctor_id);
  const doctor_name = doctorRow ? doctorRow.name : '';
    console.log('[BOOKING DEBUG] availability_slots query result:', avail);
  const clinicRow = await db.prepare('SELECT name FROM clinics WHERE clinic_id = ?').get(clinic_id);
  const clinic_name = clinicRow ? clinicRow.name : '';

  // Calculate queue number (1-based)
  const queue_number = slots.findIndex(s => s === availableSlot) + 1;
  const bookingCount = await getBookingCountForDate(appointment_date) + 1;
  const booking_id = generateBookingId(appointment_date, bookingCount);
  const uuid = 'BKG-' + Date.now().toString(36) + Math.random().toString(36).substr(2,5).toUpperCase();

  await db.prepare(`INSERT INTO bookings (
    appointment_id, doctor_id, clinic_id, patient_id, patient_name, patient_mobile, patient_age, patient_gender, blood_group, appointment_date, queue_number, appointment_time, consult_status
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    booking_id,
    doctor_id,
    clinic_id,
    patient_id,
    patient_name,
    mobile,
    age,
    gender || null,
    blood_group || null,
    appointment_date,
    queue_number,
    availableSlot,
    'not_seen'
  );

  res.json({
    success: true,
    booking_id,
    queue_number,
    doctor_name,
    clinic_name,
    appointment_time: availableSlot
  });
}

async function verifyBooking(req, res){
  const { mobile, booking_id, appointment_id, doctor_id } = req.query;
  // Use appointment_id if present, else booking_id
  const lookupId = appointment_id || booking_id;
  let rows;
  // Join bookings, clinics, and doctors tables to get all required info
  const bookingSelect = `SELECT b.*, c.name AS clinic_name, c.phone AS clinic_phone, d.name AS doctor_name FROM bookings b LEFT JOIN clinics c ON b.clinic_id = c.clinic_id LEFT JOIN doctors d ON b.doctor_id = d.doctor_id`;
  if (mobile && lookupId) {
    rows = await db.prepare(bookingSelect + ' WHERE b.patient_mobile = ? AND b.appointment_id = ?').all(mobile, lookupId);
  } else if (mobile) {
    rows = await db.prepare(bookingSelect + ' WHERE b.patient_mobile = ?').all(mobile);
  } else if (lookupId) {
    rows = await db.prepare(bookingSelect + ' WHERE b.appointment_id = ?').all(lookupId);
  } else if (doctor_id) {
    rows = await db.prepare(bookingSelect + ' WHERE b.doctor_id = ?').all(doctor_id);
  } else {
    return res.status(400).json({ success: false, message: 'Provide mobile, booking_id, or doctor_id' });
  }
  res.json({ success: true, bookings: rows });
}

async function getDoctorBookings(req, res){
  try {
    const doctorId = req.params.id;
    const date = req.query.date || null;
    const clinicId = req.query.clinic_id || null;
    const status = req.query.status || null;
    const time = req.query.time || null;
    const appointmentId = req.query.appointment_id || null;
    let query = 'SELECT * FROM bookings WHERE doctor_id = ?';
    let params = [doctorId];
    if (date) {
      query += ' AND appointment_date = ?';
      params.push(date);
    }
    if (clinicId) {
      query += ' AND clinic_id = ?';
      params.push(clinicId);
    }
    if (status) {
      query += ' AND consult_status = ?';
      params.push(status);
    }
    if (time) {
      query += ' AND appointment_time = ?';
      params.push(time);
    }
    if (appointmentId) {
      query += ' AND appointment_id = ?';
      params.push(appointmentId);
    }
    query += ' ORDER BY appointment_date DESC, appointment_time ASC';
    const rows = await db.prepare(query).all(...params);
    res.json({ success: true, bookings: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

async function updateBookingStatus(req, res){
  try {
    const appointmentId = req.params.id;
    const { consult_status } = req.body;
    if (!['pending','seen','cancelled','not_seen','confirmed','completed','in_progress','no_show'].includes(consult_status)) {
      return res.status(400).json({ success: false, message: 'Invalid consult_status' });
    }
    await db.prepare('UPDATE bookings SET consult_status = ?, updated_at = CURRENT_TIMESTAMP WHERE appointment_id = ?').run(consult_status, appointmentId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

module.exports = { bookAppointment, verifyBooking, getDoctorBookings, updateBookingStatus, getClinicTimings, getAvailability, getDoctorBookingFilters };
