-- Migration: Add Primary Doctor and Notes to Patient Profile
-- Date: 2025-01-25
-- Description: Adds primary_doctor_id and notes fields to patient_profiles table

-- Add primary_doctor_id column (foreign key to users table)
ALTER TABLE patient_profiles
ADD COLUMN IF NOT EXISTS primary_doctor_id UUID REFERENCES users(user_id);

-- Add notes column for patient's personal notes
ALTER TABLE patient_profiles
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create index on primary_doctor_id for performance
CREATE INDEX IF NOT EXISTS ix_patient_profiles_primary_doctor_id
ON patient_profiles(primary_doctor_id);

-- Add comment for documentation
COMMENT ON COLUMN patient_profiles.primary_doctor_id IS 'UUID of the patient''s primary doctor';
COMMENT ON COLUMN patient_profiles.notes IS 'Personal notes added by the patient';
