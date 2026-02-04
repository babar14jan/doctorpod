// Migration script to add video consultation columns to existing database
// Run this script once to update your existing database

const db = require('./src/utils/db');

async function runMigration() {
  console.log('🔄 Running database migration: Add video consultation feature...');
  
  try {
    // Check if columns already exist in clinics table
    const clinicsTableInfo = await db.prepare("PRAGMA table_info(clinics)").all();
    const videoColumnExists = clinicsTableInfo.some(col => col.name === 'enable_video_consultation');
    
    if (!videoColumnExists) {
      console.log('📝 Adding enable_video_consultation column to clinics table...');
      await db.prepare('ALTER TABLE clinics ADD COLUMN enable_video_consultation INTEGER DEFAULT 0').run();
      await db.prepare('UPDATE clinics SET enable_video_consultation = 0 WHERE enable_video_consultation IS NULL').run();
    } else {
      console.log('✅ Column enable_video_consultation already exists in clinics table.');
    }
    
    // Check if columns already exist in bookings table
    const bookingsTableInfo = await db.prepare("PRAGMA table_info(bookings)").all();
    const isVideoColumnExists = bookingsTableInfo.some(col => col.name === 'is_video_consultation');
    const videoStatusColumnExists = bookingsTableInfo.some(col => col.name === 'video_call_status');
    
    if (!isVideoColumnExists) {
      console.log('📝 Adding is_video_consultation column to bookings table...');
      await db.prepare('ALTER TABLE bookings ADD COLUMN is_video_consultation INTEGER DEFAULT 0').run();
      await db.prepare('UPDATE bookings SET is_video_consultation = 0 WHERE is_video_consultation IS NULL').run();
    } else {
      console.log('✅ Column is_video_consultation already exists in bookings table.');
    }
    
    if (!videoStatusColumnExists) {
      console.log('📝 Adding video_call_status column to bookings table...');
      await db.prepare('ALTER TABLE bookings ADD COLUMN video_call_status TEXT DEFAULT NULL').run();
    } else {
      console.log('✅ Column video_call_status already exists in bookings table.');
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('ℹ️  All existing clinics have video consultation disabled by default.');
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
