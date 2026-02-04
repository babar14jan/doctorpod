const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DATABASE_TYPE = process.env.DATABASE_TYPE || 'sqlite';
const DB_DIR = path.join(__dirname, 'database');

async function initializeDatabase() {
  if (DATABASE_TYPE === 'postgres') {
    // PostgreSQL initialization
    const { Pool } = require('pg');
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com') 
        ? { rejectUnauthorized: false } 
        : false
    });

    try {
      console.log('📦 Initializing PostgreSQL database...');
      
      // Read schema
      const SCHEMA_PATH = path.join(DB_DIR, 'schema_postgres.sql');
      const schemaSQL = fs.readFileSync(SCHEMA_PATH, 'utf8');
      
      // Execute schema
      await pool.query(schemaSQL);
      console.log('✅ PostgreSQL schema created successfully');
      
      // Check if we should load sample data
      const SAMPLE_DATA_PATH = path.join(DB_DIR, 'sample_data.sql');
      if (fs.existsSync(SAMPLE_DATA_PATH)) {
        console.log('🌱 Loading sample data...');
        const sampleDataSQL = fs.readFileSync(SAMPLE_DATA_PATH, 'utf8');
        
        // Note: Sample data might need conversion for PostgreSQL
        // For now, we'll skip it or you can manually convert it
        console.log('ℹ️  Sample data file found. You may need to convert it for PostgreSQL.');
        console.log('ℹ️  Please manually insert sample data if needed.');
      }
      
      console.log('✅ Database initialization complete');
      await pool.end();
      
    } catch (error) {
      console.error('❌ Error initializing PostgreSQL database:', error);
      await pool.end();
      process.exit(1);
    }
    
  } else {
    // SQLite initialization (existing logic)
    const sqlite3 = require('sqlite3').verbose();
    const DB_PATH = path.join(DB_DIR, 'doctorpod.db');
    const SCHEMA_PATH = path.join(DB_DIR, 'schema.sql');
    const SAMPLE_DATA_PATH = path.join(DB_DIR, 'sample_data.sql');

    // Ensure database directory exists
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR);
    }

    const dbExists = fs.existsSync(DB_PATH);

    // If DB already exists, skip initialization
    if (dbExists) {
      console.log('ℹ️  Database already exists. Skipping initialization.');
      process.exit(0);
    }

    console.log('📦 Creating fresh SQLite database...');

    const schemaSQL = fs.readFileSync(SCHEMA_PATH, 'utf8');
    const sampleDataSQL = fs.existsSync(SAMPLE_DATA_PATH)
      ? fs.readFileSync(SAMPLE_DATA_PATH, 'utf8')
      : '';

    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) throw err;

      db.exec(
        `
        PRAGMA foreign_keys = ON;
        ${schemaSQL}
        ${sampleDataSQL}
        `,
        (e) => {
          if (e) throw e;

          console.log('✅ Database initialized at', DB_PATH);
          console.log('📄 Tables created from schema.sql');

          if (sampleDataSQL) {
            console.log('🌱 Sample data inserted from sample_data.sql');
          }

          db.close();
        }
      );
    });
  }
}

// Run initialization
initializeDatabase().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
