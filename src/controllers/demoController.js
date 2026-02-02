const db = require('../utils/db');

/**
 * Submit a demo request
 */
exports.submitDemoRequest = async (req, res) => {
  try {
    const { name, email, phone, clinic, size, message } = req.body;

    // Validation
    if (!name || !email || !phone || !clinic) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone, and clinic name are required'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Phone validation (basic)
    const phoneRegex = /^[\d\s\+\-\(\)]+$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format'
      });
    }

    // Check for duplicate recent request (same email within 24 hours)
    const checkDuplicate = db.prepare(`
      SELECT id FROM demo_requests 
      WHERE email = ? 
      AND created_at > datetime('now', '-24 hours')
      LIMIT 1
    `);
    
    const existingRequest = await checkDuplicate.get(email);
    
    if (existingRequest) {
      return res.status(429).json({
        success: false,
        message: 'You have already submitted a demo request recently. We will contact you soon.'
      });
    }

    // Insert demo request
    const stmt = db.prepare(`
      INSERT INTO demo_requests (
        clinic_name,
        contact_person,
        phone,
        email,
        city,
        message,
        status,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
    `);

    const additionalInfo = size ? `Clinic Size: ${size}\n${message || ''}` : message || '';
    
    const result = await stmt.run(
      clinic,
      name,
      phone,
      email,
      'India', // Default city, can be updated if needed
      additionalInfo.trim()
    );

    if (result.changes > 0) {
      // TODO: Send notification email/WhatsApp to admin
      // notificationHelper.sendDemoRequestNotification({
      //   requestId: result.lastInsertRowid,
      //   name,
      //   email,
      //   phone,
      //   clinic
      // });

      return res.status(201).json({
        success: true,
        message: 'Demo request submitted successfully! We will contact you within 24 hours.',
        requestId: result.lastInsertRowid
      });
    } else {
      throw new Error('Failed to insert demo request');
    }

  } catch (error) {
    console.error('Error submitting demo request:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit demo request. Please try again.'
    });
  }
};

/**
 * Get all demo requests (Admin only)
 */
exports.getAllDemoRequests = async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;

    let query = 'SELECT * FROM demo_requests';
    const params = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const stmt = db.prepare(query);
    const requests = await stmt.all(...params);

    return res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });

  } catch (error) {
    console.error('Error fetching demo requests:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch demo requests'
    });
  }
};

/**
 * Update demo request status (Admin only)
 */
exports.updateDemoRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminId } = req.body;

    if (!['pending', 'contacted', 'scheduled', 'completed', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const stmt = db.prepare(`
      UPDATE demo_requests 
      SET 
        status = ?,
        reviewed_by = ?,
        reviewed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    const result = await stmt.run(status, adminId || null, id);

    if (result.changes > 0) {
      return res.status(200).json({
        success: true,
        message: 'Demo request status updated successfully'
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'Demo request not found'
      });
    }

  } catch (error) {
    console.error('Error updating demo request:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update demo request'
    });
  }
};

/**
 * Delete demo request (Admin only)
 */
exports.deleteDemoRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const stmt = db.prepare('DELETE FROM demo_requests WHERE id = ?');
    const result = await stmt.run(id);

    if (result.changes > 0) {
      return res.status(200).json({
        success: true,
        message: 'Demo request deleted successfully'
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'Demo request not found'
      });
    }

  } catch (error) {
    console.error('Error deleting demo request:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete demo request'
    });
  }
};
