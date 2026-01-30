const db = require('./db');

/**
 * Log a notification to the database
 * @param {Object} params - Notification parameters
 * @param {string} params.patientId - Patient ID
 * @param {string} params.type - Notification type: 'booking_confirmation', 'reminder', 'follow_up', 'prescription', 'cancellation'
 * @param {string} params.channel - Channel: 'whatsapp', 'sms', 'email', 'push'
 * @param {string} params.message - Message content
 * @param {string} [params.status='sent'] - Status: 'pending', 'sent', 'delivered', 'failed'
 * @returns {Object} - Created notification record
 */
function logNotification({ patientId, type, channel, message, status = 'sent' }) {
    const id = `NOTIF_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    const stmt = db.prepare(`
        INSERT INTO notifications (id, patient_id, type, channel, message, status, sent_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    
    try {
        stmt.run(id, patientId, type, channel, message, status);
        return { id, patientId, type, channel, message, status, sent_at: new Date().toISOString() };
    } catch (error) {
        console.error('Failed to log notification:', error);
        return null;
    }
}

/**
 * Update notification status (for delivery confirmation)
 * @param {string} notificationId - Notification ID
 * @param {string} status - New status
 * @param {string} [deliveredAt] - Delivery timestamp
 */
function updateNotificationStatus(notificationId, status, deliveredAt = null) {
    const stmt = db.prepare(`
        UPDATE notifications 
        SET status = ?, delivered_at = ?
        WHERE id = ?
    `);
    
    try {
        stmt.run(status, deliveredAt, notificationId);
        return true;
    } catch (error) {
        console.error('Failed to update notification status:', error);
        return false;
    }
}

/**
 * Get notifications for a patient
 * @param {string} patientId - Patient ID
 * @param {number} [limit=20] - Max records to return
 */
function getPatientNotifications(patientId, limit = 20) {
    const stmt = db.prepare(`
        SELECT * FROM notifications 
        WHERE patient_id = ? 
        ORDER BY sent_at DESC 
        LIMIT ?
    `);
    
    return stmt.all(patientId, limit);
}

/**
 * Get pending notifications (for retry logic)
 */
function getPendingNotifications() {
    const stmt = db.prepare(`
        SELECT * FROM notifications 
        WHERE status = 'pending' 
        ORDER BY sent_at ASC 
        LIMIT 100
    `);
    
    return stmt.all();
}

/**
 * Get notification stats for analytics
 * @param {string} [startDate] - Start date (YYYY-MM-DD)
 * @param {string} [endDate] - End date (YYYY-MM-DD)
 */
function getNotificationStats(startDate, endDate) {
    let query = `
        SELECT 
            type,
            channel,
            status,
            COUNT(*) as count
        FROM notifications
    `;
    
    const params = [];
    if (startDate && endDate) {
        query += ` WHERE DATE(sent_at) BETWEEN ? AND ?`;
        params.push(startDate, endDate);
    }
    
    query += ` GROUP BY type, channel, status`;
    
    const stmt = db.prepare(query);
    return stmt.all(...params);
}

module.exports = {
    logNotification,
    updateNotificationStatus,
    getPatientNotifications,
    getPendingNotifications,
    getNotificationStats
};
