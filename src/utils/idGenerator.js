// ============================================
// ENHANCED ID GENERATION UTILITIES - v2.0
// Secure ID Generation with Cryptographic Randomness
// ============================================

const crypto = require('crypto');

// ============================================
// 1. LEGACY FUNCTIONS (For backward compatibility)
// ============================================

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

function generateHistoryId(){
  return `HST-${Date.now().toString(36)}-${randAlphaNum(5)}`;
}

// ============================================
// 2. NEW SECURE ID GENERATION FUNCTIONS
// ============================================

/**
 * Generate a cryptographically secure random ID
 * @param {string} prefix - Optional prefix (e.g., 'CLINIC', 'DR')
 * @param {number} length - Length of random part (default: 12)
 * @returns {string} Secure random ID
 */
function generateSecureId(prefix = '', length = 12) {
  const randomPart = crypto
    .randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .toUpperCase()
    .substring(0, length);
  
  return prefix ? `${prefix}_${randomPart}` : randomPart;
}

/**
 * Generate UUID-like ID
 * @param {string} prefix - Optional prefix
 * @returns {string} UUID format ID
 */
function generateUUID(prefix = '') {
  const bytes = crypto.randomBytes(16);
  let hex = '';
  for (let i = 0; i < 16; i++) {
    hex += bytes[i].toString(16).padStart(2, '0').toUpperCase();
  }
  
  const uuid = `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16)}`;
  return prefix ? `${prefix}-${uuid}` : uuid;
}

/**
 * Generate Clinic ID (secure replacement for name+phone pattern)
 * @returns {string} Secure clinic ID
 */
function generateClinicIdV2() {
  return generateSecureId('CLN', 12);
}

/**
 * Generate Doctor ID (secure replacement)
 * @returns {string} Secure doctor ID
 */
function generateDoctorIdV2() {
  return generateSecureId('DR', 12);
}

/**
 * Generate Patient ID (secure replacement)
 * @returns {string} Secure patient ID
 */
function generatePatientIdV2() {
  return generateSecureId('PAT', 12);
}

/**
 * Generate Admin ID (secure replacement)
 * @returns {string} Secure admin ID
 */
function generateAdminIdV2() {
  return generateSecureId('ADMIN', 10);
}

/**
 * Generate Booking ID with random component
 * @param {string} dateStr - Date string (YYYY-MM-DD format)
 * @param {number} seq - Sequence number (optional, ignored in V2)
 * @returns {string} Booking ID
 */
function generateBookingIdV2(dateStr, seq = 0) {
  const datePart = (dateStr || '').replace(/-/g, '');  // YYYYMMDD
  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase().substring(0, 8);
  return `BK${datePart}${randomPart}`;
}

/**
 * Generate Visit ID with proper formatting
 * @param {string} doctor_id - Doctor ID (first 8 chars used)
 * @param {string} patient_id - Patient ID (first 8 chars used)
 * @param {number} sequence - Visit sequence number
 * @returns {string} Visit ID (format: 8char_doctor + 8char_patient + 3digit_seq)
 * @example generateVisitId('DR_792874827F61', 'PAT_EB77524149E8', 1) → 'DR_79287PAT_EB77001'
 */
function generateVisitId(doctor_id, patient_id, sequence) {
  const docPart = (doctor_id || '').substring(0, 8).toUpperCase().padEnd(8, 'X');
  const patPart = (patient_id || '').substring(0, 8).toUpperCase().padEnd(8, 'X');
  const seqPart = String(sequence || 1).padStart(3, '0');
  return `${docPart}${patPart}${seqPart}`;
}

// ============================================
// 3. UTILITY FUNCTIONS
// ============================================

/**
 * Check if an ID already exists in database
 * @param {object} db - Database connection
 * @param {string} table - Table name
 * @param {string} column - Column name (default: 'id')
 * @param {string} value - Value to check
 * @returns {Promise<boolean>} True if exists, false otherwise
 */
async function idExists(db, table, column = 'id', value) {
  try {
    const result = await db.prepare(`SELECT 1 FROM ${table} WHERE ${column} = ? LIMIT 1`).get(value);
    return !!result;
  } catch (error) {
    console.error(`Error checking ID existence in ${table}.${column}:`, error.message);
    return false;
  }
}

/**
 * Generate unique ID with collision handling
 * @param {object} db - Database connection
 * @param {string} table - Table name to check
 * @param {string} column - Column name
 * @param {function} generator - Function to generate ID
 * @param {number} maxAttempts - Max attempts (default: 10)
 * @returns {Promise<string>} Unique ID
 */
async function generateUniqueId(db, table, column, generator, maxAttempts = 10) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const id = generator();
    const exists = await idExists(db, table, column, id);
    if (!exists) {
      return id;
    }
    if (attempt < maxAttempts - 1) {
      console.warn(`ID collision attempt ${attempt + 1}/${maxAttempts}, regenerating...`);
    }
  }
  throw new Error(`Failed to generate unique ID after ${maxAttempts} attempts`);
}

// ============================================
// 4. EXPORTS
// ============================================

module.exports = {
  // Legacy functions (kept for backward compatibility)
  generateDoctorId,
  generateBookingId,
  generateHistoryId,
  generateVisitId,
  randAlphaNum,
  zeroPad,
  
  // New secure functions
  generateSecureId,
  generateUUID,
  generateClinicIdV2,
  generateDoctorIdV2,
  generatePatientIdV2,
  generateAdminIdV2,
  generateBookingIdV2,
  
  // Utility functions
  idExists,
  generateUniqueId
};
