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

  db = {
    prepare: (sql) => {
      const pgSql = convertPlaceholders(sql);
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
      return await pool.query(sql, params);
    }
  };

  console.log('✅ Using PostgreSQL database');

} else {
  // SQLite Connection (for local development)
  const sqlite3 = require('sqlite3').verbose();
  const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'database', 'doctorpod.db');
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
