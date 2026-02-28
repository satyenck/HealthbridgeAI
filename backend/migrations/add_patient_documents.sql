-- Migration: Add patient_documents table
-- Date: 2026-02-28
-- Description: Allows patients to upload medical documents (lab reports, MRI scans, prescriptions)
--              that are accessible to all doctors treating them (not linked to specific encounters)

CREATE TABLE IF NOT EXISTS patient_documents (
    file_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    file_type VARCHAR(50) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add index for faster patient document lookups
CREATE INDEX IF NOT EXISTS idx_patient_documents_patient_id ON patient_documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_documents_uploaded_at ON patient_documents(uploaded_at DESC);

-- Add comments
COMMENT ON TABLE patient_documents IS 'Patient-uploaded medical documents accessible to all doctors';
COMMENT ON COLUMN patient_documents.patient_id IS 'Patient who uploaded the document';
COMMENT ON COLUMN patient_documents.file_type IS 'Type: image, video, or document';
COMMENT ON COLUMN patient_documents.file_path IS 'Encrypted file path on disk';
