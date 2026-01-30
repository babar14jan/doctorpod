const db = require('../utils/db');

// =============================================
// DASHBOARD SUMMARY
// =============================================

// Get overview stats for dashboard
async function getSummary(req, res) {
  try {
    const { doctor_id, clinic_id } = req.query;
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = today.substring(0, 7); // YYYY-MM
    
    let whereClause = '';
    let params = [];
    
    if (doctor_id) {
      whereClause = 'WHERE doctor_id = ?';
      params = [doctor_id];
    } else if (clinic_id) {
      whereClause = 'WHERE clinic_id = ?';
      params = [clinic_id];
    }
    
    // Today's bookings
    const todayBookings = await db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN consult_status = 'seen' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN consult_status = 'not_seen' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN consult_status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN consult_status = 'no_show' THEN 1 ELSE 0 END) as no_shows
      FROM bookings 
      ${whereClause ? whereClause + ' AND' : 'WHERE'} appointment_date = ?
    `).get(...params, today);
    
    // Today's revenue
    const todayRevenue = await db.prepare(`
      SELECT 
        COUNT(*) as visits,
        COALESCE(SUM(consultation_fee), 0) as revenue
      FROM visits 
      ${whereClause ? whereClause + ' AND' : 'WHERE'} DATE(visit_time) = ?
    `).get(...params, today);
    
    // This month's stats
    const monthStats = await db.prepare(`
      SELECT 
        COUNT(*) as total_bookings,
        SUM(CASE WHEN consult_status = 'seen' THEN 1 ELSE 0 END) as completed
      FROM bookings 
      ${whereClause ? whereClause + ' AND' : 'WHERE'} appointment_date LIKE ?
    `).get(...params, `${thisMonth}%`);
    
    const monthRevenue = await db.prepare(`
      SELECT 
        COUNT(*) as visits,
        COALESCE(SUM(consultation_fee), 0) as revenue,
        COALESCE(AVG(consultation_fee), 0) as avg_fee
      FROM visits 
      ${whereClause ? whereClause + ' AND' : 'WHERE'} DATE(visit_time) LIKE ?
    `).get(...params, `${thisMonth}%`);
    
    // Unique patients this month
    const uniquePatients = await db.prepare(`
      SELECT COUNT(DISTINCT patient_id) as count
      FROM visits 
      ${whereClause ? whereClause + ' AND' : 'WHERE'} DATE(visit_time) LIKE ?
    `).get(...params, `${thisMonth}%`);
    
    // New patients this month (first visit ever)
    const newPatients = await db.prepare(`
      SELECT COUNT(*) as count FROM (
        SELECT patient_id, MIN(DATE(visit_time)) as first_visit
        FROM visits
        ${whereClause}
        GROUP BY patient_id
        HAVING first_visit LIKE ?
      )
    `).get(...params, `${thisMonth}%`);
    
    res.json({
      success: true,
      data: {
        today: {
          bookings: todayBookings.total || 0,
          completed: todayBookings.completed || 0,
          pending: todayBookings.pending || 0,
          cancelled: todayBookings.cancelled || 0,
          no_shows: todayBookings.no_shows || 0,
          visits: todayRevenue.visits || 0,
          revenue: todayRevenue.revenue || 0
        },
        month: {
          bookings: monthStats.total_bookings || 0,
          completed: monthStats.completed || 0,
          visits: monthRevenue.visits || 0,
          revenue: monthRevenue.revenue || 0,
          avg_fee: Math.round(monthRevenue.avg_fee || 0),
          unique_patients: uniquePatients.count || 0,
          new_patients: newPatients.count || 0
        }
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// =============================================
// BOOKING TRENDS
// =============================================

async function getBookingTrends(req, res) {
  try {
    const { doctor_id, clinic_id, days = 30 } = req.query;
    
    let whereClause = '';
    let params = [];
    
    if (doctor_id) {
      whereClause = 'AND doctor_id = ?';
      params = [doctor_id];
    } else if (clinic_id) {
      whereClause = 'AND clinic_id = ?';
      params = [clinic_id];
    }
    
    const trends = await db.prepare(`
      SELECT 
        appointment_date as date,
        COUNT(*) as total,
        SUM(CASE WHEN consult_status = 'seen' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN consult_status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN consult_status = 'no_show' THEN 1 ELSE 0 END) as no_shows
      FROM bookings 
      WHERE appointment_date >= DATE('now', '-${parseInt(days)} days') ${whereClause}
      GROUP BY appointment_date
      ORDER BY appointment_date ASC
    `).all(...params);
    
    res.json({ success: true, data: trends });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// =============================================
// REVENUE REPORTS
// =============================================

async function getRevenueTrends(req, res) {
  try {
    const { doctor_id, clinic_id, days = 30, group_by = 'day' } = req.query;
    
    let whereClause = '';
    let params = [];
    
    if (doctor_id) {
      whereClause = 'AND doctor_id = ?';
      params = [doctor_id];
    } else if (clinic_id) {
      whereClause = 'AND clinic_id = ?';
      params = [clinic_id];
    }
    
    let dateGroup = "DATE(visit_time)";
    if (group_by === 'week') {
      dateGroup = "strftime('%Y-%W', visit_time)";
    } else if (group_by === 'month') {
      dateGroup = "strftime('%Y-%m', visit_time)";
    }
    
    const trends = await db.prepare(`
      SELECT 
        ${dateGroup} as period,
        COUNT(*) as visits,
        COALESCE(SUM(consultation_fee), 0) as revenue,
        COALESCE(AVG(consultation_fee), 0) as avg_fee
      FROM visits 
      WHERE DATE(visit_time) >= DATE('now', '-${parseInt(days)} days') ${whereClause}
      GROUP BY ${dateGroup}
      ORDER BY period ASC
    `).all(...params);
    
    res.json({ success: true, data: trends });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// =============================================
// DOCTOR PERFORMANCE
// =============================================

async function getDoctorPerformance(req, res) {
  try {
    const { clinic_id, days = 30 } = req.query;
    
    let whereClause = '';
    let params = [];
    
    if (clinic_id) {
      whereClause = 'AND d.clinic_id = ?';
      params = [clinic_id];
    }
    
    const doctors = await db.prepare(`
      SELECT 
        d.doctor_id,
        d.name as doctor_name,
        d.specialization,
        COUNT(DISTINCT vh.visit_id) as total_visits,
        COUNT(DISTINCT vh.patient_id) as unique_patients,
        COALESCE(SUM(vh.consultation_fee), 0) as total_revenue,
        COALESCE(AVG(vh.consultation_fee), 0) as avg_fee
      FROM doctors d
      LEFT JOIN visits vh ON d.doctor_id = vh.doctor_id 
        AND DATE(vh.visit_time) >= DATE('now', '-${parseInt(days)} days')
      WHERE (d.is_active = 1 OR d.is_active IS NULL) ${whereClause}
      GROUP BY d.doctor_id
      ORDER BY total_revenue DESC
    `).all(...params);
    
    res.json({ success: true, data: doctors });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// =============================================
// TOP MEDICINES
// =============================================

async function getTopMedicines(req, res) {
  try {
    const { doctor_id, clinic_id, limit = 20 } = req.query;
    
    let whereClause = '';
    let params = [];
    
    if (doctor_id) {
      whereClause = 'WHERE vm.doctor_id = ?';
      params = [doctor_id];
    } else if (clinic_id) {
      whereClause = 'WHERE vh.clinic_id = ?';
      params = [clinic_id];
    }
    
    const medicines = await db.prepare(`
      SELECT 
        vm.medicine_name as name,
        vm.dose,
        COUNT(*) as prescription_count,
        COUNT(DISTINCT vm.visit_id) as visit_count
      FROM prescription_items vm
      ${clinic_id ? 'JOIN visits vh ON vm.visit_id = vh.visit_id' : ''}
      ${whereClause}
      GROUP BY vm.medicine_name, vm.dose
      ORDER BY prescription_count DESC
      LIMIT ?
    `).all(...params, parseInt(limit));
    
    res.json({ success: true, data: medicines });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// =============================================
// TOP DIAGNOSES
// =============================================

async function getTopDiagnoses(req, res) {
  try {
    const { doctor_id, clinic_id, limit = 20 } = req.query;
    
    let whereClause = '';
    let params = [];
    
    if (doctor_id) {
      whereClause = 'WHERE doctor_id = ?';
      params = [doctor_id];
    } else if (clinic_id) {
      whereClause = 'WHERE clinic_id = ?';
      params = [clinic_id];
    }
    
    const diagnoses = await db.prepare(`
      SELECT 
        diagnosis,
        COUNT(*) as count,
        COUNT(DISTINCT patient_id) as patient_count
      FROM visits 
      ${whereClause} ${whereClause ? 'AND' : 'WHERE'} diagnosis IS NOT NULL AND diagnosis != ''
      GROUP BY diagnosis
      ORDER BY count DESC
      LIMIT ?
    `).all(...params, parseInt(limit));
    
    res.json({ success: true, data: diagnoses });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// =============================================
// PATIENT INSIGHTS
// =============================================

async function getPatientInsights(req, res) {
  try {
    const { doctor_id, clinic_id } = req.query;
    
    let whereClause = '';
    let params = [];
    
    if (doctor_id) {
      whereClause = 'WHERE vh.doctor_id = ?';
      params = [doctor_id];
    } else if (clinic_id) {
      whereClause = 'WHERE vh.clinic_id = ?';
      params = [clinic_id];
    }
    
    // Gender distribution
    const genderDist = await db.prepare(`
      SELECT 
        patient_gender as gender,
        COUNT(DISTINCT patient_id) as count
      FROM visits 
      ${whereClause} ${whereClause ? 'AND' : 'WHERE'} patient_gender IS NOT NULL
      GROUP BY patient_gender
    `).all(...params);
    
    // Age distribution (buckets)
    const ageDist = await db.prepare(`
      SELECT 
        CASE 
          WHEN patient_age < 18 THEN '0-17'
          WHEN patient_age BETWEEN 18 AND 30 THEN '18-30'
          WHEN patient_age BETWEEN 31 AND 45 THEN '31-45'
          WHEN patient_age BETWEEN 46 AND 60 THEN '46-60'
          ELSE '60+'
        END as age_group,
        COUNT(DISTINCT patient_id) as count
      FROM visits 
      ${whereClause} ${whereClause ? 'AND' : 'WHERE'} patient_age IS NOT NULL
      GROUP BY age_group
      ORDER BY age_group
    `).all(...params);
    
    // Repeat vs new patients (last 30 days)
    const repeatVsNew = await db.prepare(`
      SELECT 
        CASE WHEN visit_count > 1 THEN 'Repeat' ELSE 'New' END as type,
        COUNT(*) as count
      FROM (
        SELECT patient_id, COUNT(*) as visit_count
        FROM visits
        ${whereClause}
        GROUP BY patient_id
      )
      GROUP BY type
    `).all(...params);
    
    res.json({
      success: true,
      data: {
        gender_distribution: genderDist,
        age_distribution: ageDist,
        patient_types: repeatVsNew
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// =============================================
// CLINIC SUMMARY (Admin)
// =============================================

async function getClinicSummary(req, res) {
  try {
    const clinics = await db.prepare(`
      SELECT 
        c.clinic_id,
        c.name as clinic_name,
        c.address,
        c.phone,
        COUNT(DISTINCT d.doctor_id) as total_doctors,
        COUNT(DISTINCT b.appointment_id) as total_bookings,
        COUNT(DISTINCT vh.visit_id) as total_visits,
        COALESCE(SUM(vh.consultation_fee), 0) as total_revenue
      FROM clinics c
      LEFT JOIN doctors d ON c.clinic_id = d.clinic_id AND (d.is_active = 1 OR d.is_active IS NULL)
      LEFT JOIN bookings b ON c.clinic_id = b.clinic_id
      LEFT JOIN visits vh ON c.clinic_id = vh.clinic_id
      WHERE c.is_active = 1 OR c.is_active IS NULL
      GROUP BY c.clinic_id
      ORDER BY total_revenue DESC
    `).all();
    
    res.json({ success: true, data: clinics });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// =============================================
// AGGREGATE DAILY ANALYTICS (for cron job)
// =============================================

async function aggregateDailyAnalytics(date) {
  try {
    const targetDate = date || new Date(Date.now() - 86400000).toISOString().split('T')[0]; // yesterday
    
    // Get all doctor-clinic combinations with activity
    const combinations = await db.prepare(`
      SELECT DISTINCT doctor_id, clinic_id 
      FROM bookings WHERE appointment_date = ?
      UNION
      SELECT DISTINCT doctor_id, clinic_id 
      FROM visits WHERE DATE(visit_time) = ?
    `).all(targetDate, targetDate);
    
    for (const combo of combinations) {
      const { doctor_id, clinic_id } = combo;
      
      // Booking stats
      const bookingStats = await db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN consult_status = 'seen' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN consult_status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
          SUM(CASE WHEN consult_status = 'no_show' THEN 1 ELSE 0 END) as no_shows
        FROM bookings 
        WHERE doctor_id = ? AND clinic_id = ? AND appointment_date = ?
      `).get(doctor_id, clinic_id, targetDate);
      
      // Visit stats
      const visitStats = await db.prepare(`
        SELECT 
          COUNT(*) as visits,
          COALESCE(SUM(consultation_fee), 0) as revenue,
          COALESCE(AVG(consultation_fee), 0) as avg_fee,
          COUNT(DISTINCT patient_id) as unique_patients
        FROM visits 
        WHERE doctor_id = ? AND clinic_id = ? AND DATE(visit_time) = ?
      `).get(doctor_id, clinic_id, targetDate);
      
      // Walk-ins (visits without appointment_id)
      const walkIns = await db.prepare(`
        SELECT COUNT(*) as count
        FROM visits 
        WHERE doctor_id = ? AND clinic_id = ? AND DATE(visit_time) = ? AND appointment_id IS NULL
      `).get(doctor_id, clinic_id, targetDate);
      
      // New patients
      const newPatients = await db.prepare(`
        SELECT COUNT(*) as count FROM (
          SELECT patient_id
          FROM visits
          WHERE doctor_id = ? AND clinic_id = ?
          GROUP BY patient_id
          HAVING MIN(DATE(visit_time)) = ?
        )
      `).get(doctor_id, clinic_id, targetDate);
      
      // Upsert into daily_analytics
      await db.prepare(`
        INSERT INTO daily_analytics 
        (date, doctor_id, clinic_id, total_bookings, completed_visits, cancelled, no_shows, walk_ins, total_revenue, avg_consultation_fee, unique_patients, new_patients)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(date, doctor_id, clinic_id) DO UPDATE SET
          total_bookings = excluded.total_bookings,
          completed_visits = excluded.completed_visits,
          cancelled = excluded.cancelled,
          no_shows = excluded.no_shows,
          walk_ins = excluded.walk_ins,
          total_revenue = excluded.total_revenue,
          avg_consultation_fee = excluded.avg_consultation_fee,
          unique_patients = excluded.unique_patients,
          new_patients = excluded.new_patients,
          updated_at = CURRENT_TIMESTAMP
      `).run(
        targetDate, doctor_id, clinic_id,
        bookingStats.total || 0,
        bookingStats.completed || 0,
        bookingStats.cancelled || 0,
        bookingStats.no_shows || 0,
        walkIns.count || 0,
        visitStats.revenue || 0,
        visitStats.avg_fee || 0,
        visitStats.unique_patients || 0,
        newPatients.count || 0
      );
    }
    
    return { success: true, date: targetDate, processed: combinations.length };
  } catch (e) {
    console.error('Analytics aggregation failed:', e);
    return { success: false, error: e.message };
  }
}

// Endpoint to trigger aggregation manually
async function triggerAggregation(req, res) {
  try {
    const { date } = req.query;
    const result = await aggregateDailyAnalytics(date);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

module.exports = {
  getSummary,
  getBookingTrends,
  getRevenueTrends,
  getDoctorPerformance,
  getTopMedicines,
  getTopDiagnoses,
  getPatientInsights,
  getClinicSummary,
  aggregateDailyAnalytics,
  triggerAggregation
};
