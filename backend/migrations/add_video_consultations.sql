-- Migration: Add video_consultations table
-- Date: 2026-02-03
-- Description: Creates video_consultations table for video call appointments

-- Create VideoConsultationStatus enum type
DO $$ BEGIN
    CREATE TYPE videoconsultationstatus AS ENUM (
        'SCHEDULED',
        'WAITING',
        'IN_PROGRESS',
        'COMPLETED',
        'CANCELLED',
        'NO_SHOW'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create video_consultations table
CREATE TABLE IF NOT EXISTS video_consultations (
    consultation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID NOT NULL UNIQUE REFERENCES encounters(encounter_id) ON DELETE CASCADE,

    -- Scheduling
    scheduled_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    scheduled_end_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER DEFAULT 30 NOT NULL,

    -- Status tracking
    status videoconsultationstatus DEFAULT 'SCHEDULED' NOT NULL,

    -- Agora video call details
    channel_name VARCHAR(255) NOT NULL UNIQUE,
    agora_app_id VARCHAR(255),

    -- Call session tracking
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_end_time TIMESTAMP WITH TIME ZONE,
    patient_joined_at TIMESTAMP WITH TIME ZONE,
    doctor_joined_at TIMESTAMP WITH TIME ZONE,

    -- Recording
    recording_sid VARCHAR(255),
    recording_resource_id VARCHAR(255),
    recording_url TEXT,
    recording_duration_seconds INTEGER,

    -- Transcription
    transcription_text TEXT,
    transcription_status VARCHAR(50),

    -- Metadata
    patient_notes TEXT,
    doctor_notes TEXT,
    cancellation_reason TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_video_consultations_encounter_id ON video_consultations(encounter_id);
CREATE INDEX IF NOT EXISTS idx_video_consultations_scheduled_start ON video_consultations(scheduled_start_time);
CREATE INDEX IF NOT EXISTS idx_video_consultations_status ON video_consultations(status);
CREATE INDEX IF NOT EXISTS idx_video_consultations_channel_name ON video_consultations(channel_name);
CREATE INDEX IF NOT EXISTS idx_video_consultations_consultation_id ON video_consultations(consultation_id);

-- Composite index for doctor's upcoming consultations
CREATE INDEX IF NOT EXISTS idx_video_consultations_scheduled_status
    ON video_consultations(scheduled_start_time, status);

-- Add comments
COMMENT ON TABLE video_consultations IS 'Video consultation appointments with recording and transcription';
COMMENT ON COLUMN video_consultations.channel_name IS 'Unique Agora channel name for this consultation';
COMMENT ON COLUMN video_consultations.scheduled_start_time IS 'When the consultation is scheduled to start';
COMMENT ON COLUMN video_consultations.status IS 'Current status of the consultation';
COMMENT ON COLUMN video_consultations.recording_url IS 'URL to the recorded video (if available)';
COMMENT ON COLUMN video_consultations.transcription_text IS 'Transcribed text from the video consultation';

-- Grant permissions (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE ON video_consultations TO healthbridge_app;
