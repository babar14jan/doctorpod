// Script to generate and set assistant_access_id for all doctors who don't have one
const db = require('./src/utils/db');

function makeAssistantId(name, phone) {
  // Get first 4 letters of name (letters only, lowercase, no spaces)
  const namePart = (name || '').replace(/[^a-zA-Z]/g, '').toLowerCase().slice(0, 4).padEnd(4, 'x');
  // Get last 4 digits of phone
  const phonePart = (phone || '').replace(/\D/g, '').slice(-4).padStart(4, '0');
  return namePart + phonePart;
}

async function updateDoctors() {
  const doctors = await db.prepare('SELECT id, name, phone FROM doctors').all();
  for (const doc of doctors) {
    const newId = makeAssistantId(doc.name, doc.phone);
    await db.prepare('UPDATE doctors SET assistant_access_id = ? WHERE id = ?').run(newId, doc.id);
    console.log(`Set assistant_access_id for doctor ${doc.id}: ${newId}`);
  }
  console.log('Done.');
  process.exit(0);
}

updateDoctors();
