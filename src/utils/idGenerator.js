function randAlphaNum(len){
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i=0;i<len;i++) out += chars[Math.floor(Math.random()*chars.length)];
  return out;
}

function zeroPad(num, size){
  let s = String(num);
  while (s.length < size) s = '0' + s;
  return s;
}

function generateDoctorId(){
  return `DOC-${randAlphaNum(5)}-${randAlphaNum(5)}`;
}

function generateBookingId(dateStr, seq){
  // dateStr expected YYYY-MM-DD
  const datePart = (dateStr || '').replace(/-/g, '');
  return `BK${datePart}${zeroPad(seq,3)}`;
}

function generateVisitId(){
  return `VST-${Date.now().toString(36)}-${randAlphaNum(5)}`;
}

function generateHistoryId(){
  return `HST-${Date.now().toString(36)}-${randAlphaNum(5)}`;
}

module.exports = { generateDoctorId, generateBookingId, generateVisitId, generateHistoryId, randAlphaNum };
