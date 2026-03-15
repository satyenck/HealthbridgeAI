-- Migration: Add report types to summary_reports table
-- Date: 2026-03-10
-- Description: Add report_type field and modify constraints to support multiple report types per encounter

-- Step 1: Add report_type enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reporttype') THEN
        CREATE TYPE reporttype AS ENUM ('CONVERSATION_TRANSCRIPT', 'AI_GENERATED');
    END IF;
END $$;

-- Step 2: Add report_type column to summary_reports table with default value
ALTER TABLE summary_reports
ADD COLUMN IF NOT EXISTS report_type reporttype;

-- Step 3: Set default value for existing records (they are all AI_GENERATED)
UPDATE summary_reports
SET report_type = 'AI_GENERATED'
WHERE report_type IS NULL;

-- Step 4: Make report_type NOT NULL after setting defaults
ALTER TABLE summary_reports
ALTER COLUMN report_type SET NOT NULL;

-- Step 5: Drop the old unique constraint on encounter_id (if exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'summary_reports_encounter_id_key'
    ) THEN
        ALTER TABLE summary_reports DROP CONSTRAINT summary_reports_encounter_id_key;
    END IF;
END $$;

-- Step 6: Create new unique constraint on (encounter_id, report_type)
-- This allows multiple reports per encounter, but only one of each type
CREATE UNIQUE INDEX IF NOT EXISTS ix_encounter_report_type
ON summary_reports (encounter_id, report_type);

-- Step 7: Create index on report_type for faster queries
CREATE INDEX IF NOT EXISTS ix_summary_reports_report_type
ON summary_reports (report_type);

-- Verification queries (commented out - uncomment to verify)
-- SELECT encounter_id, report_type, status, created_at
-- FROM summary_reports
-- ORDER BY created_at DESC
-- LIMIT 10;

-- SELECT COUNT(*), report_type
-- FROM summary_reports
-- GROUP BY report_type;
