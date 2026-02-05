const express = require('express');
const router = express.Router();
const videoJoinTokenService = require('../utils/videoJoinTokenService');
const db = require('../utils/db');

/**
 * Video Consultation Join Routes
 * Handles patient joining video consultations via secure links
 */

// GET /join/:token - Patient clicks join link
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    
    if (!token) {
      return res.status(400).render('error', {
        title: 'Invalid Link',
        message: 'No consultation link provided.',
        backUrl: '/'
      });
    }
    
    // If user is not logged in, redirect to patient video join page
    // Patients don't have accounts - they verify using booking ref + mobile
    if (!req.session || !req.session.patient_id) {
      return res.redirect(`/patient_video_join.html?token=${encodeURIComponent(token)}`);
    }
    
    const patientId = req.session.patient_id;
    
    // Validate the token
    const validationResult = await videoJoinTokenService.validateJoinToken(
      token, 
      patientId, 
      ipAddress, 
      userAgent
    );
    
    if (!validationResult.success) {
      return res.render('join-error', {
        title: 'Unable to Join Consultation',
        message: validationResult.message,
        patientName: req.session.patient_name || 'Patient',
        supportActions: [
          { text: 'Contact Doctor', action: 'contact' },
          { text: 'My Bookings', url: '/check_booking.html' },
          { text: 'Home', url: '/' }
        ]
      });
    }
    
    // Check if patient IDs match for security
    if (patientId !== validationResult.patientId) {
      return res.render('join-error', {
        title: 'Access Denied',
        message: 'This consultation link is not for your account. Please check the link or contact your doctor.',
        patientName: req.session.patient_name || 'Patient',
        supportActions: [
          { text: 'My Bookings', url: '/check_booking.html' },
          { text: 'Home', url: '/' }
        ]
      });
    }
    
    // Mark token as used
    await videoJoinTokenService.markTokenAsUsed(token);
    
    // Redirect to video consultation page with appointment details
    const consultationUrl = `/video_consultation.html` + 
      `?appointment_id=${validationResult.appointmentId}` +
      `&doctor_name=${encodeURIComponent(validationResult.doctorName)}` +
      `&patient_name=${encodeURIComponent(validationResult.patientName)}` +
      `&join_mode=true`;
      
    res.redirect(consultationUrl);
    
  } catch (error) {
    console.error('Join route error:', error);
    res.status(500).render('join-error', {
      title: 'System Error',
      message: 'A system error occurred. Please try again or contact support.',
      patientName: req.session.patient_name || 'Patient',
      supportActions: [
        { text: 'Try Again', action: 'retry' },
        { text: 'Home', url: '/' }
      ]
    });
  }
});

// POST /join/:token - Alternative for POST requests (if needed)
router.post('/:token', async (req, res) => {
  // Redirect POST to GET for consistent handling
  res.redirect(`/join/${req.params.token}`);
});

// GET /join/validate-token/:token - Validate token and return appointment info (no session required)
router.get('/validate-token/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({ success: false, message: 'No token provided' });
    }
    
    // Validate the token (without patient verification)
    const validationResult = await videoJoinTokenService.validateJoinToken(token);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        success: false, 
        message: validationResult.message || 'Invalid or expired token'
      });
    }
    
    // Fetch appointment details
    const appointment = await db.prepare(`
      SELECT 
        b.appointment_id,
        b.appointment_date,
        b.appointment_time,
        b.patient_name,
        b.patient_mobile,
        b.queue_number,
        b.consult_status,
        b.payment_status,
        d.name as doctor_name
      FROM bookings b
      JOIN doctors d ON b.doctor_id = d.doctor_id
      WHERE b.appointment_id = ?
    `).get(validationResult.appointmentId);
    
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    
    res.json({
      success: true,
      appointment_id: appointment.appointment_id,
      patient_name: appointment.patient_name,
      patient_mobile: appointment.patient_mobile ? appointment.patient_mobile.slice(-4) : '', // Only last 4 digits for security
      doctor_name: appointment.doctor_name,
      appointment_date: appointment.appointment_date,
      appointment_time: appointment.appointment_time,
      queue_number: appointment.queue_number
    });
    
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(500).json({ success: false, message: 'Failed to validate token' });
  }
});

// GET /join-status/:appointment_id - Check join status for an appointment
router.get('/status/:appointment_id', async (req, res) => {
  try {
    const { appointment_id } = req.params;
    
    if (!req.session.patient_id) {
      return res.status(401).json({ success: false, message: 'Please log in' });
    }
    
    // Verify appointment belongs to logged in patient
    const appointment = await db.prepare(`
      SELECT appointment_id, patient_id, appointment_date, appointment_time, consultation_type
      FROM bookings 
      WHERE appointment_id = ? AND patient_id = ?
    `).get(appointment_id, req.session.patient_id);
    
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    
    if (appointment.consultation_type !== 'ONLINE') {
      return res.json({ 
        success: true, 
        canJoin: false, 
        message: 'This is not an online consultation' 
      });
    }
    
    // Check if there's an active token
    const activeToken = await db.prepare(`
      SELECT 
        token_id,
        created_at,
        expires_at,
        join_attempts,
        used_at
      FROM consultation_join_tokens
      WHERE appointment_id = ? 
        AND is_expired = FALSE 
        AND expires_at > datetime('now')
      ORDER BY created_at DESC
      LIMIT 1
    `).get(appointment_id);
    
    const consultDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
    const now = new Date();
    const windowStart = new Date(consultDateTime.getTime() - 15 * 60 * 1000); // 15 min before
    const windowEnd = new Date(consultDateTime.getTime() + 30 * 60 * 1000); // 30 min after
    
    let canJoin = false;
    let message = '';
    
    if (!activeToken) {
      message = 'No join link available. Please contact your doctor.';
    } else if (now < windowStart) {
      const waitMinutes = Math.ceil((windowStart - now) / (1000 * 60));
      message = `Consultation starts in ${waitMinutes} minutes. Please wait.`;
    } else if (now > windowEnd) {
      message = 'Consultation time has ended. Please contact your doctor.';
    } else {
      canJoin = true;
      message = 'You can join the consultation now.';
    }
    
    res.json({
      success: true,
      canJoin,
      message,
      hasActiveToken: !!activeToken,
      consultationTime: consultDateTime,
      tokenUsed: activeToken?.used_at ? true : false
    });
    
  } catch (error) {
    console.error('Join status error:', error);
    res.status(500).json({ success: false, message: 'Failed to check join status' });
  }
});

module.exports = router;