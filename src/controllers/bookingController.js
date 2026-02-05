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
const { generateBookingId, generateBookingIdV2, generatePatientIdV2, generateUniqueId } = require('../utils/idGenerator');

async function bookAppointment(req, res){
  try {
    const {
      patient_name,
      mobile,
      age,
      gender,
      blood_group,
      doctor_id,
      clinic_id,
      appointment_date,
      booking_source,
      is_video_consultation
    } = req.body;

    console.log('[BOOKING DEBUG] Request body received:', req.body);
    console.log('[BOOKING DEBUG] Field validation:', {
      patient_name: !!patient_name,
      mobile: !!mobile,
      age: !!age,
      doctor_id: !!doctor_id,
      clinic_id: !!clinic_id,
      appointment_date: !!appointment_date,
      booking_source: booking_source || 'online (default)'
    });

    // Generate patient_id using secure random generation with collision handling
    const patient_id = await generateUniqueId(
      db,
      'patients',
      'patient_id',
      () => generatePatientIdV2(),
      50
    );

    if (!patient_name || !mobile || !age || !doctor_id || !clinic_id || !appointment_date) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Validate appointment date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
    const [year, month, day] = appointment_date.split('-').map(Number);
    const appointmentDate = new Date(year, month - 1, day);
    appointmentDate.setHours(0, 0, 0, 0);
    
    if (appointmentDate < today) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot book appointments for past dates. Please select today or a future date.' 
      });
    }

    // Use availability_slots for validation
    // Convert appointment_date to day name (short + full)
    const jsDate = new Date(year, month - 1, day);
    console.log('[BOOKING DEBUG] Date parsing:', { 
      appointment_date, 
      year, 
      month, 
      day, 
      jsDate: jsDate.toString(), 
      dayIndex: jsDate.getDay() 
    });
    const shortDays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const dayShort = shortDays[jsDate.getDay()];
    const dayFull = jsDate.toLocaleDateString('en-US', { weekday: 'long' }); // e.g., Monday
    console.log('[BOOKING DEBUG] Calculated days:', { dayShort, dayFull });
    // Debug: log all availabilities for this doctor/clinic
    const allAvail = await db.prepare('SELECT * FROM availability_slots WHERE doctor_id = ? AND clinic_id = ?').all(doctor_id, clinic_id);
    console.log('[BOOKING DEBUG] All availability_slots for doctor/clinic:', allAvail);
    console.log('[BOOKING DEBUG] Number of availability records found:', allAvail.length);
    // Debug: log the day names being searched
    console.log('[BOOKING DEBUG] Searching for day_of_week:', { dayShort, dayFull });
    // Match day_of_week against short or full, case-insensitive
    const avail = allAvail.find(a => {
      const stored = (a.day_of_week || '').trim().toLowerCase();
      const matched = stored === dayShort.toLowerCase() || stored === dayFull.toLowerCase();
      console.log('[BOOKING DEBUG] Comparing:', { stored, dayShort: dayShort.toLowerCase(), dayFull: dayFull.toLowerCase(), matched });
      return matched;
    });
    console.log('[BOOKING DEBUG] Matched doctor_availability:', avail);
    if (!avail) {
      return res.status(400).json({ success: false, message: `Doctor is not available on ${dayShort}. Please choose a valid day based on the timings shown above.` });
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
  console.log('[BOOKING DEBUG] Calculated day:', dayShort, '/', dayFull);
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
  const booking_id = generateBookingIdV2(appointment_date, bookingCount);
  const uuid = 'BKG-' + Date.now().toString(36) + Math.random().toString(36).substr(2,5).toUpperCase();
  
  // Determine booking source: clinic, qr_scan, or online (default)
  const source = booking_source || 'online';
  
  // Calculate tentative visit time based on queue number
  // Tentative time = start_time + (queue_number - 1) * interval_minutes
  const [startHour, startMin] = avail.start_time.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const tentativeMinutes = startMinutes + (queue_number - 1) * interval;
  const tentativeHour = Math.floor(tentativeMinutes / 60);
  const tentativeMin = tentativeMinutes % 60;
  const tentative_time = `${tentativeHour.toString().padStart(2, '0')}:${tentativeMin.toString().padStart(2, '0')}`;

  await db.prepare(`INSERT INTO bookings (
    appointment_id, doctor_id, clinic_id, patient_id, patient_name, patient_mobile, patient_age, patient_gender, blood_group, appointment_date, queue_number, appointment_time, consult_status, booking_source, is_video_consultation
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    'not_seen',
    source,
    is_video_consultation === '1' ? 1 : 0
  );

  // Build response object
  const response = {
    success: true,
    booking_id,
    booking_reference: booking_id, // Same as booking_id for compatibility
    queue_number,
    doctor_name,
    clinic_name,
    appointment_time: availableSlot,
    tentative_time,
    mobile,
    is_video_consultation: is_video_consultation === '1'
  };

  // For video consultations, generate join URL and WhatsApp message
  if (is_video_consultation === '1') {
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const videoJoinUrl = `${baseUrl}/patient_video_join.html?appointment_id=${booking_id}`;
    
    // Format consultation time for message
    const consultTime = new Date(`${appointment_date}T${availableSlot}`);
    const timeStr = consultTime.toLocaleString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Get clinic phone for support
    const clinicInfo = await db.prepare('SELECT phone FROM clinics WHERE clinic_id = ?').get(clinic_id);
    const clinicPhone = clinicInfo?.phone || '';
    
    // Create WhatsApp message
    const whatsappMessage = `🏥 *DoctorPod Video Consultation*

Hi ${patient_name},

Your video consultation is confirmed!

👨‍⚕️ *Doctor:* Dr. ${doctor_name}
📅 *Date:* ${appointment_date}
⏰ *Time:* ${availableSlot}
🎫 *Queue:* #${queue_number}
🆔 *Booking ID:* ${booking_id}

🔗 *Join your consultation:*
${videoJoinUrl}

⚠️ *Important:*
• Join 5-10 min before your slot
• Ensure stable internet
• Test camera & mic beforehand

${clinicPhone ? `Need help? Call: ${clinicPhone}` : ''}

Thank you for choosing DoctorPod! 🩺`;

    // Generate WhatsApp URL
    const whatsappUrl = `https://wa.me/${mobile.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMessage)}`;
    
    response.video_join_url = videoJoinUrl;
    response.whatsapp_url = whatsappUrl;
    response.whatsapp_message = whatsappMessage;
  }

  res.json(response);
  } catch (error) {
    console.error('[BOOKING ERROR]', error);
    res.status(500).json({ success: false, message: error.message || 'Booking failed. Please try again.' });
  }
}

async function verifyBooking(req, res){
  const { mobile, booking_id, appointment_id, doctor_id, clinic_id } = req.query;
  // Use appointment_id if present, else booking_id
  const lookupId = appointment_id || booking_id;
  let rows;
  // Join bookings, clinics, and doctors tables to get all required info
  const bookingSelect = `SELECT b.*, c.name AS clinic_name, c.phone AS clinic_phone, d.name AS doctor_name FROM bookings b LEFT JOIN clinics c ON b.clinic_id = c.clinic_id LEFT JOIN doctors d ON b.doctor_id = d.doctor_id`;
  
  // Build dynamic WHERE clause
  let whereConditions = [];
  let params = [];
  
  if (mobile) {
    whereConditions.push('b.patient_mobile = ?');
    params.push(mobile);
  }
  if (lookupId) {
    whereConditions.push('b.appointment_id = ?');
    params.push(lookupId);
  }
  if (doctor_id) {
    whereConditions.push('b.doctor_id = ?');
    params.push(doctor_id);
  }
  if (clinic_id) {
    whereConditions.push('b.clinic_id = ?');
    params.push(clinic_id);
  }
  
  if (whereConditions.length === 0) {
    return res.status(400).json({ success: false, message: 'Provide mobile, booking_id, doctor_id, or clinic_id' });
  }
  
  const query = bookingSelect + ' WHERE ' + whereConditions.join(' AND ');
  rows = await db.prepare(query).all(...params);
  
  // Calculate tentative_time for each booking
  for (let booking of rows) {
    if (booking.doctor_id && booking.clinic_id && booking.appointment_date && booking.queue_number) {
      // Get availability for this booking
      const [year, month, day] = booking.appointment_date.split('-').map(Number);
      const jsDate = new Date(year, month - 1, day);
      const shortDays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      const dayShort = shortDays[jsDate.getDay()];
      
      const avail = await db.prepare(
        'SELECT start_time, interval_minutes FROM availability_slots WHERE doctor_id = ? AND clinic_id = ? AND LOWER(day_of_week) = ?'
      ).get(booking.doctor_id, booking.clinic_id, dayShort.toLowerCase());
      
      if (avail && avail.start_time && avail.interval_minutes) {
        const [startHour, startMin] = avail.start_time.split(':').map(Number);
        const startMinutes = startHour * 60 + startMin;
        const interval = parseInt(avail.interval_minutes, 10) || 15;
        const tentativeMinutes = startMinutes + (booking.queue_number - 1) * interval;
        const tentativeHour = Math.floor(tentativeMinutes / 60);
        const tentativeMin = tentativeMinutes % 60;
        booking.tentative_time = `${tentativeHour.toString().padStart(2, '0')}:${tentativeMin.toString().padStart(2, '0')}`;
      }
    }
  }
  
  // Return both formats for compatibility
  res.json({ 
    success: true, 
    bookings: rows,
    booking: rows.length > 0 ? rows[0] : null // Return first booking for video join compatibility
  });
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

// Get all bookings for a clinic
async function getClinicBookings(req, res) {
  try {
    const clinicId = req.params.clinicId;
    const query = `
      SELECT b.*, d.name AS doctor_name 
      FROM bookings b 
      LEFT JOIN doctors d ON b.doctor_id = d.doctor_id 
      WHERE b.clinic_id = ? 
      ORDER BY b.appointment_date DESC, b.appointment_time ASC
    `;
    const bookings = await db.prepare(query).all(clinicId);
    res.json({ success: true, bookings });
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

// ========== VIDEO CALL STATUS MANAGEMENT ==========

// Update video call status (used by doctor)
// Status values: 'waiting', 'doctor_ready', 'patient_joined', 'in_progress', 'completed', 'ended'
async function updateVideoCallStatus(req, res) {
  try {
    const appointmentId = req.params.id;
    const { video_call_status } = req.body;
    
    const validStatuses = ['waiting', 'doctor_ready', 'patient_joined', 'in_progress', 'completed', 'ended'];
    if (!validStatuses.includes(video_call_status)) {
      return res.status(400).json({ success: false, message: 'Invalid video_call_status' });
    }
    
    // Verify this is a video consultation
    const booking = await db.prepare('SELECT appointment_id, is_video_consultation FROM bookings WHERE appointment_id = ?').get(appointmentId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    if (!booking.is_video_consultation) {
      return res.status(400).json({ success: false, message: 'This is not a video consultation' });
    }
    
    await db.prepare('UPDATE bookings SET video_call_status = ?, updated_at = CURRENT_TIMESTAMP WHERE appointment_id = ?')
      .run(video_call_status, appointmentId);
    
    res.json({ success: true, video_call_status });
  } catch (e) {
    console.error('Update video call status error:', e);
    res.status(500).json({ success: false, message: e.message });
  }
}

// Get video call status (used by patient to check if doctor is ready)
async function getVideoCallStatus(req, res) {
  try {
    const appointmentId = req.params.id;
    const { mobile } = req.query;
    
    // Get booking with validation
    const booking = await db.prepare(`
      SELECT 
        b.appointment_id, b.patient_name, b.patient_mobile, b.appointment_date, b.appointment_time,
        b.is_video_consultation, b.video_call_status, b.consult_status, b.queue_number,
        d.name as doctor_name, d.specialization
      FROM bookings b
      LEFT JOIN doctors d ON b.doctor_id = d.doctor_id
      WHERE b.appointment_id = ?
    `).get(appointmentId);
    
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    
    // Verify mobile if provided
    if (mobile && booking.patient_mobile !== mobile) {
      return res.status(403).json({ success: false, message: 'Mobile number does not match' });
    }
    
    if (!booking.is_video_consultation) {
      return res.status(400).json({ success: false, message: 'This is not a video consultation' });
    }
    
    // Time window validation: Check if within ±30 minutes of appointment time
    // (Allow 30 min early and 30 min late)
    let timeWindowValid = true;
    let timeWindowMessage = null;
    let minutesUntilWindow = 0;
    
    if (booking.appointment_date && booking.appointment_time) {
      const now = new Date();
      const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Parse appointment datetime
      const appointmentDateTime = new Date(`${booking.appointment_date}T${booking.appointment_time}`);
      const windowStart = new Date(appointmentDateTime.getTime() - 30 * 60000); // 30 minutes before
      const windowEnd = new Date(appointmentDateTime.getTime() + 30 * 60000);   // 30 minutes after
      
      if (now < windowStart) {
        timeWindowValid = false;
        minutesUntilWindow = Math.ceil((windowStart - now) / 60000);
        timeWindowMessage = `Video call will be available ${minutesUntilWindow} minutes before your appointment. Please come back later.`;
      } else if (now > windowEnd) {
        timeWindowValid = false;
        timeWindowMessage = 'The time window for this appointment has expired. Please contact the clinic.';
      }
    }
    
    // Determine if can join (doctor ready AND within time window)
    const canJoin = (booking.video_call_status === 'doctor_ready' || booking.video_call_status === 'in_progress') && timeWindowValid;
    
    res.json({
      success: true,
      appointment_id: booking.appointment_id,
      patient_name: booking.patient_name,
      doctor_name: booking.doctor_name,
      specialization: booking.specialization,
      appointment_date: booking.appointment_date,
      appointment_time: booking.appointment_time,
      queue_number: booking.queue_number,
      video_call_status: booking.video_call_status || 'waiting',
      consult_status: booking.consult_status,
      can_join: canJoin,
      time_window_valid: timeWindowValid,
      time_window_message: timeWindowMessage,
      minutes_until_window: minutesUntilWindow
    });
  } catch (e) {
    console.error('Get video call status error:', e);
    res.status(500).json({ success: false, message: e.message });
  }
}

// ========== PAYMENT STATUS MANAGEMENT (for Clinic Admin) ==========

// Update payment status for a booking
async function updateBookingPaymentStatus(req, res) {
  try {
    const appointmentId = req.params.id;
    const { payment_status, payment_method } = req.body;
    
    const validStatuses = ['pending', 'CONFIRMED', 'failed', 'refunded'];
    if (!validStatuses.includes(payment_status)) {
      return res.status(400).json({ success: false, message: 'Invalid payment_status. Use: pending, CONFIRMED, failed, refunded' });
    }
    
    // Update payment status
    await db.prepare(`
      UPDATE bookings 
      SET payment_status = ?, 
          payment_method = COALESCE(?, payment_method),
          updated_at = CURRENT_TIMESTAMP 
      WHERE appointment_id = ?
    `).run(payment_status, payment_method || null, appointmentId);
    
    console.log(`✅ Payment status updated: ${appointmentId} - ${payment_status}`);
    res.json({ success: true, payment_status });
  } catch (e) {
    console.error('Update payment status error:', e);
    res.status(500).json({ success: false, message: e.message });
  }
}

// Get video consultations for a clinic (for clinic admin to manage payments)
async function getClinicVideoConsultations(req, res) {
  try {
    const { clinic_id } = req.query;
    
    if (!clinic_id) {
      return res.status(400).json({ success: false, message: 'Missing clinic_id' });
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    // Get today's and upcoming video consultations for this clinic
    // NOTE: Patient data is stored directly in bookings table (no separate patients table for booking flow)
    const consultations = await db.prepare(`
      SELECT 
        b.appointment_id,
        b.patient_id, 
        b.appointment_date,
        b.appointment_time,
        b.is_video_consultation,
        b.payment_status,
        b.payment_method,
        b.consult_status,
        b.queue_number,
        b.patient_name,
        b.patient_mobile,
        b.patient_gender as gender,
        b.patient_age as age,
        d.name as doctor_name,
        d.doctor_id
      FROM bookings b
      JOIN doctors d ON b.doctor_id = d.doctor_id
      WHERE b.clinic_id = ?
        AND b.is_video_consultation = 1
        AND b.appointment_date >= ?
        AND b.consult_status != 'cancelled'
      ORDER BY b.appointment_date, b.appointment_time
    `).all(clinic_id, today);
    
    res.json({ success: true, consultations: consultations || [] });
  } catch (e) {
    console.error('Get clinic video consultations error:', e);
    res.status(500).json({ success: false, message: e.message });
  }
}

module.exports = { 
  bookAppointment, verifyBooking, getDoctorBookings, getClinicBookings, 
  updateBookingStatus, getClinicTimings, getAvailability, getDoctorBookingFilters,
  updateVideoCallStatus, getVideoCallStatus,
  updateBookingPaymentStatus, getClinicVideoConsultations 
};
