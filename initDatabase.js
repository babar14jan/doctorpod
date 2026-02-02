const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_DIR = path.join(__dirname, 'database');
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

console.log('📦 Creating fresh database...');

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
