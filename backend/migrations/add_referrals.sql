-- ============================================================================
-- DOCTOR REFERRAL SYSTEM
-- ============================================================================
-- This migration adds support for doctor-to-doctor patient referrals
--
-- Workflow:
-- 1. Doctor DA refers Patient P to Doctor DB
-- 2. Doctor DB sees referral notification and can book appointment
-- 3. Patient P sees referral notification and can book appointment
-- 4. Doctor DA can track referral status and see appointment outcome
-- ============================================================================

-- Create referral status enum
DO $$ BEGIN
    CREATE TYPE referral_status AS ENUM (
        'PENDING',           -- Referral created, waiting for action
        'ACCEPTED',          -- Doctor DB accepted referral
        'APPOINTMENT_SCHEDULED', -- Appointment scheduled with DB
        'COMPLETED',         -- Appointment completed
        'DECLINED',          -- Doctor DB declined referral
        'CANCELLED'          -- Referral cancelled
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create referrals table
CREATE TABLE IF NOT EXISTS referrals (
    referral_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Core referral information
    patient_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    referring_doctor_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,  -- Doctor DA
    referred_to_doctor_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE, -- Doctor DB

    -- Referral details
    reason TEXT NOT NULL,                    -- Why referring (e.g., "Needs cardiology consult")
    clinical_notes TEXT,                     -- Clinical context for referred doctor
    priority VARCHAR(20) DEFAULT 'MEDIUM',   -- HIGH, MEDIUM, LOW
    specialty_needed VARCHAR(100),           -- Cardiology, Orthopedics, etc.

    -- Source encounter (what prompted referral)
    source_encounter_id UUID REFERENCES encounters(encounter_id) ON DELETE SET NULL,

    -- Status tracking
    status referral_status DEFAULT 'PENDING',

    -- Appointment tracking
    appointment_encounter_id UUID REFERENCES encounters(encounter_id) ON DELETE SET NULL, -- Encounter with Doctor DB
    appointment_scheduled_time TIMESTAMP WITH TIME ZONE,
    appointment_completed_time TIMESTAMP WITH TIME ZONE,

    -- Response from referred-to doctor
    referred_doctor_notes TEXT,              -- Doctor DB's notes about the referral
    accepted_at TIMESTAMP WITH TIME ZONE,
    declined_at TIMESTAMP WITH TIME ZONE,
    declined_reason TEXT,

    -- Notifications tracking
    patient_notified BOOLEAN DEFAULT FALSE,
    patient_viewed_at TIMESTAMP WITH TIME ZONE,
    referred_doctor_viewed_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Indexes for performance
    CONSTRAINT fk_patient FOREIGN KEY (patient_id) REFERENCES users(user_id),
    CONSTRAINT fk_referring_doctor FOREIGN KEY (referring_doctor_id) REFERENCES users(user_id),
    CONSTRAINT fk_referred_to_doctor FOREIGN KEY (referred_to_doctor_id) REFERENCES users(user_id)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_referrals_patient ON referrals(patient_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referring_doctor ON referrals(referring_doctor_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_to_doctor ON referrals(referred_to_doctor_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_created_at ON referrals(created_at DESC);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_referrals_patient_status ON referrals(patient_id, status);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_doctor_status ON referrals(referred_to_doctor_id, status);
CREATE INDEX IF NOT EXISTS idx_referrals_referring_doctor_patient ON referrals(referring_doctor_id, patient_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_referrals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS trigger_referrals_updated_at ON referrals;
CREATE TRIGGER trigger_referrals_updated_at
    BEFORE UPDATE ON referrals
    FOR EACH ROW
    EXECUTE FUNCTION update_referrals_updated_at();

-- Add comments for documentation
COMMENT ON TABLE referrals IS 'Doctor-to-doctor patient referrals with appointment tracking';
COMMENT ON COLUMN referrals.reason IS 'Brief reason for referral visible to all parties';
COMMENT ON COLUMN referrals.clinical_notes IS 'Detailed clinical context for referred-to doctor only';
COMMENT ON COLUMN referrals.status IS 'Current status of referral: PENDING, ACCEPTED, APPOINTMENT_SCHEDULED, COMPLETED, DECLINED, CANCELLED';
COMMENT ON COLUMN referrals.patient_viewed_at IS 'When patient first viewed the referral notification';
COMMENT ON COLUMN referrals.referred_doctor_viewed_at IS 'When referred-to doctor first viewed the referral';
