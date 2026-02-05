const path = require('path');
require('dotenv').config();

// Determine which database to use based on environment
const DATABASE_TYPE = process.env.DATABASE_TYPE || 'sqlite'; // 'sqlite' or 'postgres'

let db;

if (DATABASE_TYPE === 'postgres') {
  // PostgreSQL Connection
  const { Pool } = require('pg');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com') 
      ? { rejectUnauthorized: false } 
      : false
  });

  // Wrapper to maintain compatibility with existing code
  // Converts SQLite ? placeholders to PostgreSQL $1, $2, $3 placeholders
  const convertPlaceholders = (sql) => {
    let index = 0;
    return sql.replace(/\?/g, () => `$${++index}`);
  };

  // Converts SQLite date/time functions to PostgreSQL equivalents
  const convertDateFunctions = (sql) => {
    return sql
      // datetime('now') -> NOW()
      .replace(/datetime\(['"]now['"]\)/gi, 'NOW()')
      // DATE('now') -> CURRENT_DATE
      .replace(/DATE\(['"]now['"]\)/gi, 'CURRENT_DATE')
      // DATE('now', '-X days') -> CURRENT_DATE - INTERVAL 'X days'
      .replace(/DATE\(['"]now['"],\s*['"]-(\d+)\s*days?['"]\)/gi, "(CURRENT_DATE - INTERVAL '$1 days')")
      // DATE('now', '+X days') -> CURRENT_DATE + INTERVAL 'X days'
      .replace(/DATE\(['"]now['"],\s*['"](\+?)(\d+)\s*days?['"]\)/gi, "(CURRENT_DATE + INTERVAL '$2 days')")
      // strftime('%Y-%W', column) -> TO_CHAR(column, 'IYYY-IW')
      .replace(/strftime\(['"]%Y-%W['"],\s*(\w+)\)/gi, "TO_CHAR($1, 'IYYY-IW')")
      // strftime('%Y-%m', column) -> TO_CHAR(column, 'YYYY-MM')
      .replace(/strftime\(['"]%Y-%m['"],\s*(\w+)\)/gi, "TO_CHAR($1, 'YYYY-MM')")
      // JULIANDAY(date1) - JULIANDAY(date2) -> (date1::DATE - date2::DATE)
      .replace(/JULIANDAY\(([^)]+)\)\s*-\s*JULIANDAY\(['"]now['"]\)/gi, "($1::DATE - CURRENT_DATE)")
      .replace(/JULIANDAY\(([^)]+)\)\s*-\s*JULIANDAY\(([^)]+)\)/gi, "($1::DATE - $2::DATE)");
  };

  db = {
    prepare: (sql) => {
      const pgSql = convertDateFunctions(convertPlaceholders(sql));
      return {
        all: async (...params) => {
          const result = await pool.query(pgSql, params);
          return result.rows;
        },
        get: async (...params) => {
          const result = await pool.query(pgSql, params);
          return result.rows[0];
        },
        run: async (...params) => {
          const result = await pool.query(pgSql, params);
          return { 
            lastID: result.rows[0]?.id || null, 
            changes: result.rowCount 
          };
        }
      };
    },
    close: async () => {
      await pool.end();
    },
    // Direct query method for PostgreSQL
    query: async (sql, params = []) => {
      return await pool.query(convertDateFunctions(sql), params);
    }
  };

  console.log('✅ Using PostgreSQL database');

} else {
  // SQLite Connection (for local development)
  const APP_CONFIG = require('../../config/branding');
  const sqlite3 = require('sqlite3').verbose();
  const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'database', APP_CONFIG.database.default_name);
  const rawDb = new sqlite3.Database(DB_PATH);

  // Expose a minimal prepare(...).all/get/run wrapper
  db = {
    prepare: (sql) => ({
      all: (...params) => new Promise((resolve, reject) => {
        rawDb.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
      }),
      get: (...params) => new Promise((resolve, reject) => {
        rawDb.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
      }),
      run: (...params) => new Promise((resolve, reject) => {
        rawDb.run(sql, params, function(err) {
          if (err) return reject(err);
          resolve({ lastID: this.lastID, changes: this.changes });
        });
      })
    }),
    close: () => new Promise((resolve, reject) => rawDb.close(err => err ? reject(err) : resolve())),
    // Query method for consistency
    query: async (sql, params = []) => {
      return new Promise((resolve, reject) => {
        rawDb.all(sql, params, (err, rows) => {
          if (err) return reject(err);
          resolve({ rows });
        });
      });
    }
  };

  console.log('✅ Using SQLite database:', DB_PATH);
}

module.exports = db;
