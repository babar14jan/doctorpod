function parseTime(t){
  const [hh,mm] = t.split(':').map(Number);
  return hh*60 + mm;
}

function formatTime(mins){
  const hh = Math.floor(mins/60).toString().padStart(2,'0');
  const mm = (mins%60).toString().padStart(2,'0');
  return `${hh}:${mm}`;
}

function generateTimeSlots(timings){
  if (!timings) return [];
  // Accept formats like "Mon-Sat 09:00-17:00" or "09:00-17:00"
  const parts = timings.trim().split(' ');
  const range = parts[parts.length-1];
  if (!range || !range.includes('-')) return [];
  const [start, end] = range.split('-');
  let current = parseTime(start);
  const endTime = parseTime(end);
  const slots = [];
  while (current < endTime){
    slots.push(formatTime(current));
    current += 15;
  }
  return slots;
}

module.exports = { parseTime, formatTime, generateTimeSlots };
