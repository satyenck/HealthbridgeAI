-- Add translation cache columns to summary_reports table
-- Run this SQL script on your PostgreSQL database

ALTER TABLE summary_reports
ADD COLUMN IF NOT EXISTS gujarati_content JSONB,
ADD COLUMN IF NOT EXISTS hindi_content JSONB;

-- Add comment to document the purpose
COMMENT ON COLUMN summary_reports.gujarati_content IS 'Cached Gujarati translation of the summary report content';
COMMENT ON COLUMN summary_reports.hindi_content IS 'Cached Hindi translation of the summary report content';
