// Deployment entry point for Render.com and local
// No code needed here, app.js already starts the server
// This file exists for Render's default entrypoint

// Load environment variables from .env file
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Ensure database directory exists
const dbDir = path.join(__dirname, 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log('✅ Created database directory');
}

// Database initialization - only runs if database doesn't exist
const dbPath = path.join(dbDir, 'doctorpod.db');

if (!fs.existsSync(dbPath)) {
  console.log('⚠️  Database not found in database folder. Initializing...');
  try {
    execSync('node initDatabase.js', { stdio: 'inherit' });
    console.log('✅ Database created with schema and sample data');
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    process.exit(1);
  }
} else {
  console.log('✅ Database found. Using existing database.');
}

// server.js – Render entrypoint
const app = require('./app');

// Render requires a direct start
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // Required for Render
app.listen(PORT, HOST, () => console.log(`DoctorPod running on ${HOST}:${PORT}`));
