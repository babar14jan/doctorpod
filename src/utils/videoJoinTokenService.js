const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-for-video-consultation-tokens';
const TOKEN_EXPIRY_HOURS = 2; // Token valid for 2 hours (15min before + 30min after + buffer)

/**
 * Video Consultation Token Service
 * Handles secure token generation, validation, and session management
 */
class VideoJoinTokenService {
  
  /**
   * Generate a secure join token for video consultation
   * @param {string} appointmentId - The appointment ID
   * @param {string} patientId - Patient ID  
   * @param {string} doctorId - Doctor ID
   * @param {string} clinicId - Clinic ID
   * @param {Date} consultationTime - Scheduled consultation time
   * @returns {Promise<{success: boolean, token?: string, joinUrl?: string, expiresAt?: Date, message?: string}>}
   */
  async generateJoinToken(appointmentId, patientId, doctorId, clinicId, consultationTime) {
    try {
      // Validate consultation time (allow 15 min before to 2 hours after)
      const now = new Date();
      const consultTime = new Date(consultationTime);
      const windowStart = new Date(consultTime.getTime() - 15 * 60 * 1000); // 15 min before
      const windowEnd = new Date(consultTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours after
      
      // Check if we're in a reasonable time window for token generation
      if (now < new Date(consultTime.getTime() - 24 * 60 * 60 * 1000)) { // More than 24h early
        return { success: false, message: 'Too early to generate join link. Please try closer to consultation time.' };
      }
      
      // Generate unique token ID
      const tokenId = crypto.randomUUID();
      
      // Create JWT payload
      const payload = {
        tokenId,
        appointmentId,
        patientId,
        doctorId,
        clinicId,
        type: 'video_consultation_join',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(windowEnd.getTime() / 1000)
      };
      
      // Generate JWT token
      const token = jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });
      
      // Generate token hash for storage (never store plain JWT)
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      
      // Store in database
      await db.prepare(`
        INSERT INTO consultation_join_tokens 
        (token_id, appointment_id, patient_id, doctor_id, clinic_id, token_hash, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(tokenId, appointmentId, patientId, doctorId, clinicId, tokenHash, windowEnd.toISOString());
      
      const joinUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/join/${token}`;
      
      return {
        success: true,
        token,
        joinUrl,
        expiresAt: windowEnd,
        message: 'Join token generated successfully'
      };
      
    } catch (error) {
      console.error('Generate join token error:', error);
      return { success: false, message: 'Failed to generate join token' };
    }
  }
  
  /**
   * Validate a join token and return consultation details
   * @param {string} token - The JWT token
   * @param {string} patientId - Patient ID for verification (optional)
   * @param {string} ipAddress - Client IP for audit
   * @param {string} userAgent - Client user agent for audit
   * @returns {Promise<{success: boolean, appointmentId?: string, patientId?: string, doctorId?: string, message?: string}>}
   */
  async validateJoinToken(token, patientId = null, ipAddress = null, userAgent = null) {
    try {
      // Decode and verify JWT
      let payload;
      try {
        payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
      } catch (jwtError) {
        if (jwtError.name === 'TokenExpiredError') {
          await this._logJoinAttempt(null, patientId, ipAddress, userAgent, false, 'Token expired');
          return { success: false, message: 'Join link has expired. Please contact your doctor for a new link.' };
        } else if (jwtError.name === 'JsonWebTokenError') {
          await this._logJoinAttempt(null, patientId, ipAddress, userAgent, false, 'Invalid token');
          return { success: false, message: 'Invalid join link. Please check the link or contact your doctor.' };
        }
        throw jwtError;
      }
      
      const { tokenId, appointmentId, patientId: tokenPatientId, doctorId, clinicId } = payload;
      
      // Get token record from database
      const tokenRecord = await db.prepare(`
        SELECT t.*, b.appointment_date, b.appointment_time, b.consultation_type, b.payment_status,
               p.full_name as patient_name, d.name as doctor_name
        FROM consultation_join_tokens t
        JOIN bookings b ON t.appointment_id = b.appointment_id
        JOIN patients p ON t.patient_id = p.patient_id  
        JOIN doctors d ON t.doctor_id = d.doctor_id
        WHERE t.token_id = ? AND t.token_hash = ?
      `).get(tokenId, crypto.createHash('sha256').update(token).digest('hex'));
      
      if (!tokenRecord) {
        await this._logJoinAttempt(null, patientId, ipAddress, userAgent, false, 'Token not found');
        return { success: false, message: 'Invalid join link. Please check the link or contact your doctor.' };
      }
      
      // Check if token is already used
      if (tokenRecord.used_at) {
        await this._logJoinAttempt(tokenRecord.id, patientId, ipAddress, userAgent, false, 'Token already used');
        return { success: false, message: 'This join link has already been used. Please contact your doctor if you need to rejoin.' };
      }
      
      // Check expiry
      if (new Date() > new Date(tokenRecord.expires_at)) {
        await this._updateTokenExpiry(tokenRecord.id);
        await this._logJoinAttempt(tokenRecord.id, patientId, ipAddress, userAgent, false, 'Token expired');
        return { success: false, message: 'Join link has expired. Please contact your doctor for a new link.' };
      }
      
      // Check max attempts
      if (tokenRecord.join_attempts >= tokenRecord.max_attempts) {
        await this._logJoinAttempt(tokenRecord.id, patientId, ipAddress, userAgent, false, 'Max attempts exceeded');
        return { success: false, message: 'Maximum join attempts exceeded. Please contact your doctor for a new link.' };
      }
      
      // Verify patient ID if provided
      if (patientId && patientId !== tokenPatientId) {
        await this._incrementJoinAttempts(tokenRecord.id);
        await this._logJoinAttempt(tokenRecord.id, patientId, ipAddress, userAgent, false, 'Patient ID mismatch');
        return { success: false, message: 'This join link is not for your account. Please check the link.' };
      }
      
      // Validate consultation type and payment
      if (tokenRecord.consultation_type !== 'ONLINE') {
        await this._logJoinAttempt(tokenRecord.id, patientId, ipAddress, userAgent, false, 'Not an online consultation');
        return { success: false, message: 'This is not an online consultation. Please visit the clinic.' };
      }
      
      if (tokenRecord.payment_status !== 'CONFIRMED') {
        await this._logJoinAttempt(tokenRecord.id, patientId, ipAddress, userAgent, false, 'Payment not confirmed');
        return { success: false, message: 'Payment not confirmed. Please complete payment before joining.' };
      }
      
      // Check consultation time window (15 min before to 30 min after)
      const now = new Date();
      const consultDateTime = new Date(`${tokenRecord.appointment_date}T${tokenRecord.appointment_time}`);
      const windowStart = new Date(consultDateTime.getTime() - 15 * 60 * 1000);
      const windowEnd = new Date(consultDateTime.getTime() + 30 * 60 * 1000);
      
      if (now < windowStart) {
        const waitMinutes = Math.ceil((windowStart - now) / (1000 * 60));
        await this._logJoinAttempt(tokenRecord.id, patientId, ipAddress, userAgent, false, 'Too early to join');
        return { success: false, message: `Consultation starts in ${waitMinutes} minutes. Please try again at ${windowStart.toLocaleTimeString()}.` };
      }
      
      if (now > windowEnd) {
        await this._updateTokenExpiry(tokenRecord.id);
        await this._logJoinAttempt(tokenRecord.id, patientId, ipAddress, userAgent, false, 'Consultation window ended');
        return { success: false, message: 'Consultation time has ended. Please contact your doctor to reschedule.' };
      }
      
      // Increment attempts and log successful validation
      await this._incrementJoinAttempts(tokenRecord.id);
      await this._logJoinAttempt(tokenRecord.id, patientId, ipAddress, userAgent, true, 'Token validated successfully');
      
      return {
        success: true,
        appointmentId,
        patientId: tokenPatientId,
        doctorId,
        clinicId,
        patientName: tokenRecord.patient_name,
        doctorName: tokenRecord.doctor_name,
        consultationTime: consultDateTime,
        message: 'Join token validated successfully'
      };
      
    } catch (error) {
      console.error('Validate join token error:', error);
      await this._logJoinAttempt(null, patientId, ipAddress, userAgent, false, `System error: ${error.message}`);
      return { success: false, message: 'System error. Please try again or contact support.' };
    }
  }
  
  /**
   * Mark token as used after successful video session start
   * @param {string} token - The JWT token
   */
  async markTokenAsUsed(token) {
    try {
      const payload = jwt.decode(token);
      if (!payload) return;
      
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      await db.prepare(`
        UPDATE consultation_join_tokens 
        SET used_at = CURRENT_TIMESTAMP 
        WHERE token_id = ? AND token_hash = ?
      `).run(payload.tokenId, tokenHash);
    } catch (error) {
      console.error('Mark token as used error:', error);
    }
  }
  
  /**
   * Generate WhatsApp message template for sharing join link
   * @param {string} patientName - Patient's name
   * @param {string} doctorName - Doctor's name  
   * @param {Date} consultationTime - Scheduled time
   * @param {string} joinUrl - The join URL
   * @param {string} clinicPhone - Clinic contact number
   * @returns {string} Formatted WhatsApp message
   */
  generateWhatsAppMessage(patientName, doctorName, consultationTime, joinUrl, clinicPhone = null) {
    const timeStr = consultationTime.toLocaleString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const helpContact = clinicPhone ? `Contact: ${clinicPhone}` : 'Contact your clinic for help';
    
    return `🏥 *DoctorPod Video Consultation*

Hi ${patientName},

Your online consultation with *${doctorName}* is scheduled for:
📅 ${timeStr}

🔗 *Join your consultation:*
${joinUrl}

⚠️ *Important Instructions:*
• Click the link 5-10 minutes before your appointment
• Ensure stable internet connection
• Keep your ID ready if requested
• Test your camera and microphone beforehand

⏰ Join window: 15 minutes before to 30 minutes after scheduled time

Need help? ${helpContact}

Thank you for choosing DoctorPod! 🩺`;
  }
  
  /**
   * Clean up expired tokens (run periodically)
   */
  async cleanupExpiredTokens() {
    try {
      const result = await db.prepare(`
        UPDATE consultation_join_tokens 
        SET is_expired = TRUE 
        WHERE expires_at < CURRENT_TIMESTAMP AND is_expired = FALSE
      `).run();
      
      console.log(`🧹 Cleaned up ${result.changes} expired consultation tokens`);
      return result.changes;
    } catch (error) {
      console.error('Cleanup expired tokens error:', error);
      return 0;
    }
  }
  
  // Private helper methods
  async _incrementJoinAttempts(tokenRecordId) {
    await db.prepare(`
      UPDATE consultation_join_tokens 
      SET join_attempts = join_attempts + 1 
      WHERE id = ?
    `).run(tokenRecordId);
  }
  
  async _updateTokenExpiry(tokenRecordId) {
    await db.prepare(`
      UPDATE consultation_join_tokens 
      SET is_expired = TRUE 
      WHERE id = ?
    `).run(tokenRecordId);
  }
  
  async _logJoinAttempt(tokenRecordId, patientId, ipAddress, userAgent, success, reason) {
    try {
      await db.prepare(`
        INSERT INTO join_attempts 
        (token_id, patient_id, ip_address, user_agent, success, failure_reason)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(tokenRecordId, patientId, ipAddress, userAgent, success, success ? null : reason);
    } catch (error) {
      console.error('Log join attempt error:', error);
    }
  }
}

module.exports = new VideoJoinTokenService();