const db = require('../utils/db');

// Add doctor availability
async function addAvailability(req, res) {
  if (!req.session.admin) return res.status(403).json({ success: false, message: 'Unauthorized' });
  const { doctor_id, clinic_id, days, timings, interval_minutes } = req.body;
  if (!doctor_id || !clinic_id || !days || !timings) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }
  // timings format: "Mon,Tue,Wed 10:00-13:00" or similar, but we get days and timings separately
  // Here, days is a comma-separated string, timings is "10:00-13:00"
  // But from frontend, timings is like "Mon,Tue 10:00-13:00" or just "10:00-13:00" with days separate
  // We'll parse days and timings
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
      await db.prepare('INSERT INTO availability_slots (doctor_id, clinic_id, day_of_week, start_time, end_time, interval_minutes) VALUES (?, ?, ?, ?, ?, ?)')
        .run(doctor_id, clinic_id, day, start_time, end_time, interval);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

module.exports = { addAvailability };
