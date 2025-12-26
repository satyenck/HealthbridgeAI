-- Migration: Add Doctor Features to HealthbridgeAI
-- Date: 2025-01-14
-- Description: Adds doctor role, report approval workflow, file uploads, and doctor-patient relationships

-- Add role to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'patient';
ALTER TABLE users ADD COLUMN IF NOT EXISTS license_number VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS specialization VARCHAR(200);

-- Add status and doctor fields to consultations
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS doctor_id INTEGER REFERENCES users(id);
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS doctor_notes TEXT;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP;

-- Create consultation_files table
CREATE TABLE IF NOT EXISTS consultation_files (
    id SERIAL PRIMARY KEY,
    consultation_id INTEGER NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
    file_type VARCHAR(50) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Create doctor_patient_relationships table
CREATE TABLE IF NOT EXISTS doctor_patient_relationships (
    id SERIAL PRIMARY KEY,
    doctor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(doctor_id, patient_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status);
CREATE INDEX IF NOT EXISTS idx_consultations_doctor_id ON consultations(doctor_id);
CREATE INDEX IF NOT EXISTS idx_consultation_files_consultation_id ON consultation_files(consultation_id);
CREATE INDEX IF NOT EXISTS idx_doctor_patient_doctor_id ON doctor_patient_relationships(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_patient_patient_id ON doctor_patient_relationships(patient_id);
