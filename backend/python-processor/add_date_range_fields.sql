-- Add date range fields to transactions table
-- This allows filtering by business date ranges instead of upload timestamps

-- Add new columns for date ranges
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS business_date_start DATE,
ADD COLUMN IF NOT EXISTS business_date_end DATE,
ADD COLUMN IF NOT EXISTS date_source TEXT DEFAULT 'upload_time';

-- Add indexes for better performance on date range queries
CREATE INDEX IF NOT EXISTS idx_transactions_business_date_start ON transactions(business_date_start);
CREATE INDEX IF NOT EXISTS idx_transactions_business_date_end ON transactions(business_date_end);
CREATE INDEX IF NOT EXISTS idx_transactions_date_source ON transactions(date_source);

-- Add composite index for date range queries
CREATE INDEX IF NOT EXISTS idx_transactions_business_date_range ON transactions(business_date_start, business_date_end);

-- Add comment to explain the new fields
COMMENT ON COLUMN transactions.business_date_start IS 'Start date extracted from Excel file content or filename';
COMMENT ON COLUMN transactions.business_date_end IS 'End date extracted from Excel file content or filename';
COMMENT ON COLUMN transactions.date_source IS 'Source of date information: filename, excel_content, or upload_time';

-- Verify the schema changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND column_name IN ('business_date_start', 'business_date_end', 'date_source')
ORDER BY ordinal_position;
