-- ============================================================================
-- Healthbridge AI v2 Database Schema
-- Complete migration from v1 to v2 with UUID support
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables (BACKUP FIRST!)
DROP TABLE IF EXISTS doctor_patient_relationships CASCADE;
DROP TABLE IF EXISTS consultation_files CASCADE;
DROP TABLE IF EXISTS consultations CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================================
-- 1. CORE AUTHENTICATION
-- ============================================================================

CREATE TYPE user_role AS ENUM ('PATIENT', 'DOCTOR', 'LAB', 'PHARMACY', 'ADMIN');

CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR UNIQUE,
    phone_number VARCHAR UNIQUE,
    role user_role NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone_number);

-- ============================================================================
-- 2. USER PROFILES (Role-Specific)
-- ============================================================================

CREATE TYPE gender_type AS ENUM ('Male', 'Female', 'Other', 'Prefer Not to Say');

CREATE TABLE patient_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender gender_type NOT NULL,
    general_health_issues TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_patient_dob ON patient_profiles(date_of_birth);

CREATE TABLE doctor_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR NOT NULL,
    phone VARCHAR NOT NULL,
    address TEXT NOT NULL,
    hospital_name VARCHAR(200),
    specialty VARCHAR(100),
    degree VARCHAR(100),
    last_degree_year INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE lab_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    business_name VARCHAR(200) NOT NULL,
    email VARCHAR NOT NULL,
    phone VARCHAR NOT NULL,
    address TEXT NOT NULL,
    license_year INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE pharmacy_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    business_name VARCHAR(200) NOT NULL,
    email VARCHAR NOT NULL,
    phone VARCHAR NOT NULL,
    address TEXT NOT NULL,
    license_year INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- 3. HEALTH HISTORY & TIMELINE
-- ============================================================================

CREATE TYPE encounter_type AS ENUM ('REMOTE_CONSULT', 'LIVE_VISIT', 'INITIAL_LOG');
CREATE TYPE input_method AS ENUM ('VOICE', 'MANUAL');

CREATE TABLE encounters (
    encounter_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    encounter_type encounter_type NOT NULL,
    input_method input_method,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_encounters_patient ON encounters(patient_id);
CREATE INDEX idx_encounters_doctor ON encounters(doctor_id);
CREATE INDEX idx_encounters_created ON encounters(created_at);

CREATE TABLE vitals_logs (
    vital_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    encounter_id UUID NOT NULL REFERENCES encounters(encounter_id) ON DELETE CASCADE,
    blood_pressure_sys INTEGER,
    blood_pressure_dia INTEGER,
    heart_rate INTEGER,
    oxygen_level INTEGER,
    weight FLOAT,
    temperature FLOAT,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vitals_encounter ON vitals_logs(encounter_id);

CREATE TABLE lab_results_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    encounter_id UUID NOT NULL REFERENCES encounters(encounter_id) ON DELETE CASCADE,
    metrics JSONB NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lab_results_encounter ON lab_results_logs(encounter_id);
CREATE INDEX idx_lab_results_metrics ON lab_results_logs USING GIN (metrics);

-- ============================================================================
-- 4. CLINICAL DOCUMENTATION
-- ============================================================================

CREATE TYPE report_status AS ENUM ('GENERATED', 'PENDING_REVIEW', 'REVIEWED');
CREATE TYPE priority_level AS ENUM ('HIGH', 'MEDIUM', 'LOW');

CREATE TABLE summary_reports (
    report_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    encounter_id UUID NOT NULL UNIQUE REFERENCES encounters(encounter_id) ON DELETE CASCADE,
    status report_status DEFAULT 'GENERATED' NOT NULL,
    priority priority_level,
    content JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_summary_reports_status ON summary_reports(status);
CREATE INDEX idx_summary_reports_content ON summary_reports USING GIN (content);

CREATE TYPE order_status AS ENUM ('SENT', 'RECEIVED', 'COMPLETED');

CREATE TABLE lab_orders (
    order_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    encounter_id UUID NOT NULL REFERENCES encounters(encounter_id) ON DELETE CASCADE,
    lab_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    instructions TEXT NOT NULL,
    status order_status DEFAULT 'SENT' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_lab_orders_encounter ON lab_orders(encounter_id);
CREATE INDEX idx_lab_orders_lab ON lab_orders(lab_id);

CREATE TABLE prescriptions (
    prescription_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    encounter_id UUID NOT NULL REFERENCES encounters(encounter_id) ON DELETE CASCADE,
    pharmacy_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    instructions TEXT NOT NULL,
    status order_status DEFAULT 'SENT' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_prescriptions_encounter ON prescriptions(encounter_id);
CREATE INDEX idx_prescriptions_pharmacy ON prescriptions(pharmacy_id);

-- ============================================================================
-- 5. MEDIA FILES
-- ============================================================================

CREATE TABLE media_files (
    file_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    encounter_id UUID NOT NULL REFERENCES encounters(encounter_id) ON DELETE CASCADE,
    file_type VARCHAR(50) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_media_files_encounter ON media_files(encounter_id);

-- ============================================================================
-- 6. PERMISSIONS & SHARING
-- ============================================================================

CREATE TYPE access_level AS ENUM ('FULL_HISTORY', 'SINGLE_ENCOUNTER');

CREATE TABLE profile_shares (
    share_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    access_level access_level DEFAULT 'FULL_HISTORY' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_profile_shares_patient ON profile_shares(patient_id);
CREATE INDEX idx_profile_shares_doctor ON profile_shares(doctor_id);

-- ============================================================================
-- 7. DOCTOR DASHBOARD VIEW (From SQL query spec)
-- ============================================================================

CREATE OR REPLACE VIEW doctor_dashboard_view AS
SELECT
    p.user_id AS patient_id,
    p.first_name,
    p.last_name,
    p.gender,
    EXTRACT(YEAR FROM AGE(p.date_of_birth)) AS age,
    e.encounter_id,
    e.created_at AS encounter_date,
    e.encounter_type,
    e.input_method AS recording_source,
    v.blood_pressure_sys,
    v.blood_pressure_dia,
    v.heart_rate,
    v.oxygen_level,
    v.weight,
    sr.status AS report_status,
    sr.priority AS ai_priority,
    sr.content->>'symptoms' AS symptoms_summary,
    sr.content->>'diagnosis' AS potential_diagnosis,
    sr.content->>'treatment' AS treatment_plan,
    sr.content->>'next_steps' AS next_steps
FROM
    patient_profiles p
JOIN
    encounters e ON p.user_id = e.patient_id
LEFT JOIN
    vitals_logs v ON e.encounter_id = v.encounter_id
LEFT JOIN
    summary_reports sr ON e.encounter_id = sr.encounter_id
ORDER BY
    e.created_at DESC;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON DATABASE healthbridge_db IS 'Healthbridge AI v2 - UUID-based health tracking system';
