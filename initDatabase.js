const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_DIR = path.join(__dirname, 'database');
const DB_PATH = path.join(DB_DIR, 'doctorpod.db');
const SCHEMA_PATH = path.join(DB_DIR, 'schema.sql');

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR);
const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) throw err;
  db.exec('PRAGMA foreign_keys = ON; ' + schema, (e) => {
    if (e) throw e;
    console.log('Database initialized at', DB_PATH);
    db.close();
  });
});
