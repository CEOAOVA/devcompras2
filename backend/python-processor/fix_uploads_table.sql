-- Fix uploads table schema to match backend expectations
-- Run this in your Supabase SQL Editor

-- Add missing columns to uploads table
ALTER TABLE uploads 
ADD COLUMN IF NOT EXISTS file_size BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS store_name TEXT,
ADD COLUMN IF NOT EXISTS records_processed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'processed';

-- Update existing records if any
UPDATE uploads SET 
    file_size = 0,
    records_processed = 0,
    status = 'processed'
WHERE file_size IS NULL OR records_processed IS NULL OR status IS NULL;

-- Add index for status column
CREATE INDEX IF NOT EXISTS idx_uploads_status ON uploads(status);

-- Verify the schema
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'uploads' 
ORDER BY ordinal_position;
