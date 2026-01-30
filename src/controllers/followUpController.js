const db = require('../utils/db');
const { logNotification } = require('../utils/notificationHelper');

/**
 * Get all follow-ups for a doctor
 */
async function getFollowUps(req, res) {
    try {
        const { doctor_id, status, start_date, end_date, limit = 50 } = req.query;
        
        let query = `
            SELECT f.*, 
                   p.name as patient_name, 
                   p.mobile as patient_mobile,
                   vh.diagnosis
            FROM follow_ups f
            JOIN patients p ON f.patient_id = p.patient_id
            LEFT JOIN visits vh ON f.visit_id = vh.visit_id
            WHERE 1=1
        `;
        const params = [];
        
        if (doctor_id) {
            query += ` AND f.doctor_id = ?`;
            params.push(doctor_id);
        }
        
        if (status) {
            query += ` AND f.status = ?`;
            params.push(status);
        }
        
        if (start_date) {
            query += ` AND DATE(f.follow_up_date) >= ?`;
            params.push(start_date);
        }
        
        if (end_date) {
            query += ` AND DATE(f.follow_up_date) <= ?`;
            params.push(end_date);
        }
        
        query += ` ORDER BY f.follow_up_date ASC LIMIT ?`;
        params.push(parseInt(limit));
        
        const followUps = db.prepare(query).all(...params);
        res.json({ success: true, data: followUps });
    } catch (error) {
        console.error('Error fetching follow-ups:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}

/**
 * Get today's follow-ups for reminder dashboard
 */
async function getTodaysFollowUps(req, res) {
    try {
        const { doctor_id } = req.query;
        
        let query = `
            SELECT f.*, 
                   p.name as patient_name, 
                   p.mobile as patient_mobile,
                   vh.diagnosis
            FROM follow_ups f
            JOIN patients p ON f.patient_id = p.patient_id
            LEFT JOIN visits vh ON f.visit_id = vh.visit_id
            WHERE DATE(f.follow_up_date) = DATE('now')
              AND f.status = 'pending'
        `;
        const params = [];
        
        if (doctor_id) {
            query += ` AND f.doctor_id = ?`;
            params.push(doctor_id);
        }
        
        query += ` ORDER BY f.follow_up_date ASC`;
        
        const followUps = db.prepare(query).all(...params);
        res.json({ success: true, data: followUps });
    } catch (error) {
        console.error('Error fetching today\'s follow-ups:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}

/**
 * Create a new follow-up reminder
 */
async function createFollowUp(req, res) {
    try {
        const { patient_id, doctor_id, visit_id, follow_up_date, reason } = req.body;
        
        if (!patient_id || !doctor_id || !follow_up_date) {
            return res.status(400).json({ 
                success: false, 
                message: 'patient_id, doctor_id, and follow_up_date are required' 
            });
        }
        
        const id = `FU_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        
        const stmt = db.prepare(`
            INSERT INTO follow_ups (id, patient_id, doctor_id, visit_id, follow_up_date, reason, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
        `);
        
        stmt.run(id, patient_id, doctor_id, visit_id || null, follow_up_date, reason || null);
        
        res.json({ 
            success: true, 
            message: 'Follow-up created successfully',
            data: { id, patient_id, doctor_id, visit_id, follow_up_date, reason, status: 'pending' }
        });
    } catch (error) {
        console.error('Error creating follow-up:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}

/**
 * Update follow-up status
 */
async function updateFollowUpStatus(req, res) {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;
        
        if (!['pending', 'contacted', 'booked', 'completed', 'cancelled'].includes(status)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid status. Must be: pending, contacted, booked, completed, or cancelled' 
            });
        }
        
        let query = `UPDATE follow_ups SET status = ?`;
        const params = [status];
        
        if (notes) {
            query += `, notes = ?`;
            params.push(notes);
        }
        
        if (status === 'contacted') {
            query += `, contacted_at = datetime('now')`;
        }
        
        query += ` WHERE id = ?`;
        params.push(id);
        
        const result = db.prepare(query).run(...params);
        
        if (result.changes === 0) {
            return res.status(404).json({ success: false, message: 'Follow-up not found' });
        }
        
        res.json({ success: true, message: 'Follow-up status updated' });
    } catch (error) {
        console.error('Error updating follow-up:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}

/**
 * Delete a follow-up
 */
async function deleteFollowUp(req, res) {
    try {
        const { id } = req.params;
        
        const result = db.prepare(`DELETE FROM follow_ups WHERE id = ?`).run(id);
        
        if (result.changes === 0) {
            return res.status(404).json({ success: false, message: 'Follow-up not found' });
        }
        
        res.json({ success: true, message: 'Follow-up deleted' });
    } catch (error) {
        console.error('Error deleting follow-up:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}

/**
 * Send follow-up reminder via WhatsApp
 */
async function sendFollowUpReminder(req, res) {
    try {
        const { id } = req.params;
        
        // Get follow-up details
        const followUp = db.prepare(`
            SELECT f.*, p.name as patient_name, p.mobile as patient_mobile, d.name as doctor_name
            FROM follow_ups f
            JOIN patients p ON f.patient_id = p.patient_id
            JOIN doctors d ON f.doctor_id = d.doctor_id
            WHERE f.id = ?
        `).get(id);
        
        if (!followUp) {
            return res.status(404).json({ success: false, message: 'Follow-up not found' });
        }
        
        if (!followUp.patient_mobile) {
            return res.status(400).json({ success: false, message: 'Patient mobile not available' });
        }
        
        // Format message
        const date = new Date(followUp.follow_up_date).toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        let message = `Hi ${followUp.patient_name},\n\n`;
        message += `This is a reminder for your follow-up appointment with ${followUp.doctor_name}.\n`;
        message += `Scheduled Date: ${date}\n`;
        if (followUp.reason) {
            message += `Reason: ${followUp.reason}\n`;
        }
        message += `\nPlease book your appointment at your earliest convenience.`;
        
        // Build WhatsApp URL
        let phone = followUp.patient_mobile.replace(/[^0-9]/g, '');
        if (phone.length === 10) phone = '91' + phone;
        const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        
        // Log notification
        logNotification({
            patientId: followUp.patient_id,
            type: 'follow_up',
            channel: 'whatsapp',
            message: message.substring(0, 500),
            status: 'sent'
        });
        
        // Update follow-up status
        db.prepare(`
            UPDATE follow_ups 
            SET status = 'contacted', contacted_at = datetime('now')
            WHERE id = ?
        `).run(id);
        
        res.json({ 
            success: true, 
            whatsappUrl: waUrl,
            message: 'Reminder prepared successfully'
        });
    } catch (error) {
        console.error('Error sending follow-up reminder:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}

/**
 * Get follow-up statistics
 */
async function getFollowUpStats(req, res) {
    try {
        const { doctor_id } = req.query;
        
        let baseWhere = doctor_id ? `WHERE doctor_id = ?` : '';
        const params = doctor_id ? [doctor_id] : [];
        
        const stats = db.prepare(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'contacted' THEN 1 ELSE 0 END) as contacted,
                SUM(CASE WHEN status = 'booked' THEN 1 ELSE 0 END) as booked,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
                SUM(CASE WHEN DATE(follow_up_date) = DATE('now') AND status = 'pending' THEN 1 ELSE 0 END) as due_today,
                SUM(CASE WHEN DATE(follow_up_date) < DATE('now') AND status = 'pending' THEN 1 ELSE 0 END) as overdue
            FROM follow_ups
            ${baseWhere}
        `).get(...params);
        
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('Error fetching follow-up stats:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}

module.exports = {
    getFollowUps,
    getTodaysFollowUps,
    createFollowUp,
    updateFollowUpStatus,
    deleteFollowUp,
    sendFollowUpReminder,
    getFollowUpStats
};
