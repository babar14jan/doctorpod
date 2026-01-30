const db = require('./db');

async function getNextQueueNumber(doctorId, clinicId, date){
  const row = await db.prepare('SELECT MAX(queue_number) as maxq FROM bookings WHERE doctor_id = ? AND clinic_id = ? AND appointment_date = ?').get(doctorId, clinicId, date);
  return (row && row.maxq) ? (row.maxq + 1) : 1;
}

async function getBookingCountForDate(date){
  const row = await db.prepare('SELECT COUNT(*) as cnt FROM bookings WHERE appointment_date = ?').get(date);
  return row ? row.cnt : 0;
}

async function getAllDoctors(){
  return await db.prepare('SELECT id, name, degree FROM doctors ORDER BY name').all();
}

async function getClinicsByDoctor(doctorId){
  return await db.prepare('SELECT * FROM clinics WHERE doctor_id = ?').all(doctorId);
}

module.exports = { getNextQueueNumber, getBookingCountForDate, getAllDoctors, getClinicsByDoctor };
