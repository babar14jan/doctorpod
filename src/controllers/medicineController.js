
const db = require('../utils/db');

// Autocomplete from medicines (standardized) + prescription_items (doctor's history)
async function getSuggestions(req, res) {
  try {
    const q = (req.query.query || '').trim();
    const doctorId = req.query.doctor_id || '';
    const limit = parseInt(req.query.limit || '10', 10);
    
    if (!q || q.length < 2) return res.json({ success: true, suggestions: [] });
    
    const term = `%${q}%`;
    let results = [];
    
    // First, search medicines (standardized medicines with metadata)
    const masterMeds = await db.prepare(`
      SELECT 
        name, 
        generic_name,
        strength,
        form,
        category,
        common_doses,
        common_frequencies,
        common_timings,
        usage_count,
        'master' as source
      FROM medicines 
      WHERE (name LIKE ? OR generic_name LIKE ?) AND is_active = 1
      ORDER BY usage_count DESC, name ASC 
      LIMIT ?
    `).all(term, term, limit);
    
    // Parse JSON fields
    results = masterMeds.map(m => ({
      ...m,
      common_doses: m.common_doses ? JSON.parse(m.common_doses) : [],
      common_frequencies: m.common_frequencies ? JSON.parse(m.common_frequencies) : [],
      common_timings: m.common_timings ? JSON.parse(m.common_timings) : []
    }));
    
    // If not enough from master, also search prescription_items (organic history)
    if (results.length < limit) {
      const remaining = limit - results.length;
      const existingNames = results.map(r => r.name.toLowerCase());
      
      let historyMeds;
      if (doctorId) {
        // Prioritize this doctor's prescriptions
        historyMeds = await db.prepare(`
          SELECT 
            medicine_name as name, 
            dose,
            frequency,
            timing,
            COUNT(*) as usage_count,
            'history' as source
          FROM prescription_items 
          WHERE medicine_name LIKE ? AND doctor_id = ?
          GROUP BY medicine_name, dose, frequency
          ORDER BY usage_count DESC
          LIMIT ?
        `).all(term, doctorId, remaining);
      } else {
        historyMeds = await db.prepare(`
          SELECT 
            medicine_name as name, 
            dose,
            frequency,
            timing,
            COUNT(*) as usage_count,
            'history' as source
          FROM prescription_items 
          WHERE medicine_name LIKE ?
          GROUP BY medicine_name, dose, frequency
          ORDER BY usage_count DESC
          LIMIT ?
        `).all(term, remaining);
      }
      
      // Filter out duplicates and add to results
      const filtered = historyMeds.filter(m => 
        !existingNames.includes(m.name.toLowerCase())
      );
      results = [...results, ...filtered];
    }
    
    res.json({ success: true, suggestions: results.slice(0, limit) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// Get medicine details by name (for auto-fill)
async function getMedicineDetails(req, res) {
  try {
    const name = (req.query.name || '').trim();
    if (!name) return res.status(400).json({ success: false, message: 'Name required' });
    
    const medicine = await db.prepare(`
      SELECT 
        name, generic_name, strength, form, category,
        common_doses, common_frequencies, common_timings
      FROM medicines 
      WHERE name = ? AND is_active = 1
    `).get(name);
    
    if (!medicine) {
      return res.json({ success: true, medicine: null });
    }
    
    res.json({ 
      success: true, 
      medicine: {
        ...medicine,
        common_doses: medicine.common_doses ? JSON.parse(medicine.common_doses) : [],
        common_frequencies: medicine.common_frequencies ? JSON.parse(medicine.common_frequencies) : [],
        common_timings: medicine.common_timings ? JSON.parse(medicine.common_timings) : []
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// Increment usage count when medicine is prescribed
async function incrementUsage(medicineName) {
  try {
    await db.prepare(`
      UPDATE medicines 
      SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP
      WHERE name = ?
    `).run(medicineName);
  } catch (e) {
    console.error('Failed to increment medicine usage:', e.message);
  }
}

// Add new medicine to master (from doctor's prescription)
async function addToMaster(req, res) {
  try {
    const { name, generic_name, strength, form, category, common_doses, common_frequencies, common_timings, created_by } = req.body;
    
    if (!name) return res.status(400).json({ success: false, message: 'Name required' });
    
    await db.prepare(`
      INSERT OR IGNORE INTO medicines 
      (name, generic_name, strength, form, category, common_doses, common_frequencies, common_timings, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name, 
      generic_name || null, 
      strength || null,
      form || null,
      category || null,
      common_doses ? JSON.stringify(common_doses) : null,
      common_frequencies ? JSON.stringify(common_frequencies) : null,
      common_timings ? JSON.stringify(common_timings) : null,
      created_by || null
    );
    
    res.json({ success: true, message: 'Medicine added to master' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// List all medicines (for admin)
async function listMedicines(req, res) {
  try {
    const category = req.query.category;
    const search = req.query.search;
    const limit = parseInt(req.query.limit || '50', 10);
    const offset = parseInt(req.query.offset || '0', 10);
    
    let sql = `SELECT * FROM medicines WHERE is_active = 1`;
    const params = [];
    
    if (category) {
      sql += ` AND category = ?`;
      params.push(category);
    }
    if (search) {
      sql += ` AND (name LIKE ? OR generic_name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    
    sql += ` ORDER BY usage_count DESC, name ASC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    const medicines = await db.prepare(sql).all(...params);
    
    // Parse JSON fields
    const parsed = medicines.map(m => ({
      ...m,
      common_doses: m.common_doses ? JSON.parse(m.common_doses) : [],
      common_frequencies: m.common_frequencies ? JSON.parse(m.common_frequencies) : [],
      common_timings: m.common_timings ? JSON.parse(m.common_timings) : []
    }));
    
    res.json({ success: true, medicines: parsed });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

module.exports = { getSuggestions, getMedicineDetails, incrementUsage, addToMaster, listMedicines };
