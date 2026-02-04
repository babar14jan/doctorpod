-- Migration: Add enable_voice_prescription column to clinics table
-- This allows admin to control whether voice prescription feature is available per clinic

-- For SQLite
ALTER TABLE clinics ADD COLUMN enable_voice_prescription INTEGER DEFAULT 0;

-- Note: For PostgreSQL, use the same command (it works for both)
-- ALTER TABLE clinics ADD COLUMN enable_voice_prescription INTEGER DEFAULT 0;

-- Update existing clinics to have voice disabled by default
UPDATE clinics SET enable_voice_prescription = 0 WHERE enable_voice_prescription IS NULL;
