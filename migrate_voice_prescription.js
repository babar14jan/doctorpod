// Migration script to add enable_voice_prescription column to existing database
// Run this script once to update your existing database

const db = require('./src/utils/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('🔄 Running database migration: Add voice prescription feature control...');
  
  try {
    // Check if column already exists
    const tableInfo = await db.prepare("PRAGMA table_info(clinics)").all();
    const columnExists = tableInfo.some(col => col.name === 'enable_voice_prescription');
    
    if (columnExists) {
      console.log('✅ Column enable_voice_prescription already exists. Migration skipped.');
      return;
    }
    
    // Add column
    console.log('📝 Adding enable_voice_prescription column...');
    await db.prepare('ALTER TABLE clinics ADD COLUMN enable_voice_prescription INTEGER DEFAULT 0').run();
    
    // Update existing clinics
    console.log('📝 Setting default value for existing clinics...');
    await db.prepare('UPDATE clinics SET enable_voice_prescription = 0 WHERE enable_voice_prescription IS NULL').run();
    
    console.log('✅ Migration completed successfully!');
    console.log('ℹ️  All existing clinics have voice prescription disabled by default.');
    console.log('ℹ️  Admin can enable it when creating/editing clinics.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run migration
runMigration().then(() => {
  console.log('🎉 Migration script finished.');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
