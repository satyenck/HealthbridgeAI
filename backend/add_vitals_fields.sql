-- Migration: Add comprehensive vitals fields to vitals_logs table
-- Date: 2026-01-01
-- Description: Expands vitals_logs with comprehensive medical assessment fields

-- Note: All existing fields (blood_pressure_sys, blood_pressure_dia, heart_rate,
-- oxygen_level, weight, temperature) are preserved

-- Additional vital signs
ALTER TABLE vitals_logs
ADD COLUMN IF NOT EXISTS height FLOAT,
ADD COLUMN IF NOT EXISTS bmi FLOAT,
ADD COLUMN IF NOT EXISTS respiratory_rate INTEGER,
ADD COLUMN IF NOT EXISTS pulse INTEGER;

-- Blood pressure derived metrics
ALTER TABLE vitals_logs
ADD COLUMN IF NOT EXISTS mean_arterial_pressure FLOAT,
ADD COLUMN IF NOT EXISTS pulse_pressure FLOAT;

-- Oxygen and perfusion
ALTER TABLE vitals_logs
ADD COLUMN IF NOT EXISTS oxygen_saturation FLOAT,
ADD COLUMN IF NOT EXISTS perfusion_index FLOAT,
ADD COLUMN IF NOT EXISTS capillary_refill_time FLOAT;

-- Metabolic measurements
ALTER TABLE vitals_logs
ADD COLUMN IF NOT EXISTS glucose_level FLOAT,
ADD COLUMN IF NOT EXISTS fasting_glucose FLOAT,
ADD COLUMN IF NOT EXISTS random_glucose FLOAT,
ADD COLUMN IF NOT EXISTS ketone_level FLOAT;

-- Body composition
ALTER TABLE vitals_logs
ADD COLUMN IF NOT EXISTS body_fat_percentage FLOAT,
ADD COLUMN IF NOT EXISTS muscle_mass FLOAT,
ADD COLUMN IF NOT EXISTS bone_mass FLOAT,
ADD COLUMN IF NOT EXISTS body_water_percentage FLOAT,
ADD COLUMN IF NOT EXISTS visceral_fat_rating FLOAT;

-- Circumference measurements
ALTER TABLE vitals_logs
ADD COLUMN IF NOT EXISTS waist_circumference FLOAT,
ADD COLUMN IF NOT EXISTS hip_circumference FLOAT,
ADD COLUMN IF NOT EXISTS neck_circumference FLOAT,
ADD COLUMN IF NOT EXISTS chest_circumference FLOAT,
ADD COLUMN IF NOT EXISTS head_circumference FLOAT,
ADD COLUMN IF NOT EXISTS mid_upper_arm_circumference FLOAT;

-- Waist-to-hip ratio
ALTER TABLE vitals_logs
ADD COLUMN IF NOT EXISTS waist_hip_ratio FLOAT;

-- Pain assessment
ALTER TABLE vitals_logs
ADD COLUMN IF NOT EXISTS pain_level INTEGER,
ADD COLUMN IF NOT EXISTS pain_location TEXT,
ADD COLUMN IF NOT EXISTS pain_description TEXT;

-- Neurological
ALTER TABLE vitals_logs
ADD COLUMN IF NOT EXISTS consciousness_level TEXT,
ADD COLUMN IF NOT EXISTS glasgow_coma_scale INTEGER,
ADD COLUMN IF NOT EXISTS pupil_response_left TEXT,
ADD COLUMN IF NOT EXISTS pupil_response_right TEXT,
ADD COLUMN IF NOT EXISTS pupil_size_left FLOAT,
ADD COLUMN IF NOT EXISTS pupil_size_right FLOAT;

-- Cardiovascular additional
ALTER TABLE vitals_logs
ADD COLUMN IF NOT EXISTS peripheral_pulse_strength TEXT,
ADD COLUMN IF NOT EXISTS capillary_refill_location TEXT,
ADD COLUMN IF NOT EXISTS edema_location TEXT,
ADD COLUMN IF NOT EXISTS edema_grade INTEGER;

-- Respiratory additional
ALTER TABLE vitals_logs
ADD COLUMN IF NOT EXISTS breath_sounds TEXT,
ADD COLUMN IF NOT EXISTS cough_type TEXT,
ADD COLUMN IF NOT EXISTS sputum_color TEXT,
ADD COLUMN IF NOT EXISTS chest_expansion TEXT,
ADD COLUMN IF NOT EXISTS use_of_accessory_muscles BOOLEAN;

-- Skin assessment
ALTER TABLE vitals_logs
ADD COLUMN IF NOT EXISTS skin_color TEXT,
ADD COLUMN IF NOT EXISTS skin_temperature TEXT,
ADD COLUMN IF NOT EXISTS skin_moisture TEXT,
ADD COLUMN IF NOT EXISTS skin_turgor TEXT,
ADD COLUMN IF NOT EXISTS capillary_blanching TEXT;

-- Hydration status
ALTER TABLE vitals_logs
ADD COLUMN IF NOT EXISTS mucous_membranes TEXT,
ADD COLUMN IF NOT EXISTS urine_output FLOAT,
ADD COLUMN IF NOT EXISTS urine_color TEXT,
ADD COLUMN IF NOT EXISTS fluid_intake FLOAT;

-- Gastrointestinal
ALTER TABLE vitals_logs
ADD COLUMN IF NOT EXISTS bowel_sounds TEXT,
ADD COLUMN IF NOT EXISTS last_bowel_movement TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS abdomen_appearance TEXT,
ADD COLUMN IF NOT EXISTS nausea BOOLEAN,
ADD COLUMN IF NOT EXISTS vomiting BOOLEAN;

-- Genitourinary
ALTER TABLE vitals_logs
ADD COLUMN IF NOT EXISTS urinary_frequency TEXT,
ADD COLUMN IF NOT EXISTS urinary_urgency BOOLEAN,
ADD COLUMN IF NOT EXISTS dysuria BOOLEAN,
ADD COLUMN IF NOT EXISTS incontinence BOOLEAN;

-- Mobility and functional status
ALTER TABLE vitals_logs
ADD COLUMN IF NOT EXISTS mobility_status TEXT,
ADD COLUMN IF NOT EXISTS fall_risk_score INTEGER,
ADD COLUMN IF NOT EXISTS balance_assessment TEXT,
ADD COLUMN IF NOT EXISTS gait_assessment TEXT;

-- Mental status
ALTER TABLE vitals_logs
ADD COLUMN IF NOT EXISTS orientation TEXT,
ADD COLUMN IF NOT EXISTS mood TEXT,
ADD COLUMN IF NOT EXISTS affect TEXT,
ADD COLUMN IF NOT EXISTS speech TEXT,
ADD COLUMN IF NOT EXISTS memory TEXT;

-- Sleep
ALTER TABLE vitals_logs
ADD COLUMN IF NOT EXISTS sleep_quality TEXT,
ADD COLUMN IF NOT EXISTS sleep_hours FLOAT,
ADD COLUMN IF NOT EXISTS sleep_disturbances TEXT;

-- Nutrition
ALTER TABLE vitals_logs
ADD COLUMN IF NOT EXISTS appetite TEXT,
ADD COLUMN IF NOT EXISTS dietary_intake_percentage INTEGER,
ADD COLUMN IF NOT EXISTS special_diet TEXT,
ADD COLUMN IF NOT EXISTS nutrition_risk_score INTEGER;

-- Wound assessment
ALTER TABLE vitals_logs
ADD COLUMN IF NOT EXISTS wound_present BOOLEAN,
ADD COLUMN IF NOT EXISTS wound_location TEXT,
ADD COLUMN IF NOT EXISTS wound_size TEXT,
ADD COLUMN IF NOT EXISTS wound_type TEXT,
ADD COLUMN IF NOT EXISTS wound_drainage TEXT,
ADD COLUMN IF NOT EXISTS wound_healing_stage TEXT;

-- Infection indicators
ALTER TABLE vitals_logs
ADD COLUMN IF NOT EXISTS fever_present BOOLEAN,
ADD COLUMN IF NOT EXISTS chills BOOLEAN,
ADD COLUMN IF NOT EXISTS sweating BOOLEAN,
ADD COLUMN IF NOT EXISTS signs_of_infection TEXT;

-- Medication-related vitals
ALTER TABLE vitals_logs
ADD COLUMN IF NOT EXISTS medication_timing TEXT,
ADD COLUMN IF NOT EXISTS fasting_status BOOLEAN;

-- Environmental factors
ALTER TABLE vitals_logs
ADD COLUMN IF NOT EXISTS measurement_position TEXT,
ADD COLUMN IF NOT EXISTS activity_level_before TEXT,
ADD COLUMN IF NOT EXISTS environmental_temperature FLOAT;

-- Special populations (OB/Pediatric)
ALTER TABLE vitals_logs
ADD COLUMN IF NOT EXISTS gestational_age INTEGER,
ADD COLUMN IF NOT EXISTS apgar_score_1min INTEGER,
ADD COLUMN IF NOT EXISTS apgar_score_5min INTEGER,
ADD COLUMN IF NOT EXISTS fundal_height FLOAT,
ADD COLUMN IF NOT EXISTS fetal_heart_rate INTEGER;

-- Additional clinical notes
ALTER TABLE vitals_logs
ADD COLUMN IF NOT EXISTS clinical_notes TEXT,
ADD COLUMN IF NOT EXISTS abnormal_findings TEXT,
ADD COLUMN IF NOT EXISTS assessment_summary TEXT;

-- Metadata
ALTER TABLE vitals_logs
ADD COLUMN IF NOT EXISTS measured_by TEXT,
ADD COLUMN IF NOT EXISTS measurement_device TEXT,
ADD COLUMN IF NOT EXISTS verified_by TEXT;

-- Add updated_at column for tracking modifications
ALTER TABLE vitals_logs
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

-- Add comments for key fields
COMMENT ON COLUMN vitals_logs.height IS 'Patient height in centimeters';
COMMENT ON COLUMN vitals_logs.bmi IS 'Body Mass Index (kg/m²)';
COMMENT ON COLUMN vitals_logs.respiratory_rate IS 'Breaths per minute';
COMMENT ON COLUMN vitals_logs.glucose_level IS 'Blood glucose level in mg/dL';
COMMENT ON COLUMN vitals_logs.pain_level IS 'Pain scale 0-10 (0=no pain, 10=worst pain)';
COMMENT ON COLUMN vitals_logs.glasgow_coma_scale IS 'GCS score 3-15 (3=deep coma, 15=fully alert)';
COMMENT ON COLUMN vitals_logs.consciousness_level IS 'AVPU scale: Alert, Voice, Pain, Unresponsive';
COMMENT ON COLUMN vitals_logs.measurement_position IS 'Patient position during measurement: Sitting, Standing, Lying, Supine';
COMMENT ON COLUMN vitals_logs.clinical_notes IS 'Free-text clinical observations';
COMMENT ON COLUMN vitals_logs.measured_by IS 'Healthcare provider who took measurements';
COMMENT ON COLUMN vitals_logs.updated_at IS 'Timestamp of last update to this vital record';
