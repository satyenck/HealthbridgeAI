# HealthbridgeAI Database Schema

**Database**: healthbridge_db
**Total Tables**: 13
**DBMS**: PostgreSQL
**Last Updated**: 2026-01-01

---

## Table of Contents
1. [Users & Authentication](#1-users--authentication)
2. [User Profiles](#2-user-profiles)
3. [Encounters](#3-encounters)
4. [Clinical Data](#4-clinical-data)
5. [Orders & Prescriptions](#5-orders--prescriptions)
6. [Media & Sharing](#6-media--sharing)
7. [Custom Types](#7-custom-types-enums)

---

## 1. Users & Authentication

### `users` - Main user accounts table
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| **user_id** | UUID | NO | uuid_generate_v4() | Primary key |
| email | VARCHAR | YES | - | Unique email address |
| phone_number | VARCHAR | YES | - | Unique phone number |
| **role** | user_role | NO | - | User role (PATIENT, DOCTOR, LAB, PHARMACY, ADMIN) |
| is_active | BOOLEAN | YES | true | Account active status |
| created_at | TIMESTAMP | YES | CURRENT_TIMESTAMP | Account creation timestamp |
| updated_at | TIMESTAMP | YES | - | Last update timestamp |

**Indexes:**
- PRIMARY KEY: user_id
- UNIQUE: email, phone_number
- INDEX: email, phone_number, role

**Referenced By:** All profile tables, encounters, lab_orders, prescriptions, profile_shares

---

## 2. User Profiles

### `patient_profiles` - Patient demographic and health information
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| **user_id** | UUID | NO | - | FK to users.user_id |
| first_name | VARCHAR(100) | NO | - | Patient first name |
| last_name | VARCHAR(100) | NO | - | Patient last name |
| date_of_birth | DATE | NO | - | Date of birth |
| gender | gender_type | NO | - | Gender identity |
| general_health_issues | TEXT | YES | - | Chronic conditions summary |
| primary_doctor_id | UUID | YES | - | FK to users.user_id (doctor) |
| notes | TEXT | YES | - | Patient's personal notes |
| created_at | TIMESTAMP | YES | CURRENT_TIMESTAMP | Profile creation |
| updated_at | TIMESTAMP | YES | - | Last update |

**Indexes:**
- PRIMARY KEY: user_id
- INDEX: date_of_birth, primary_doctor_id

**Foreign Keys:**
- user_id → users(user_id) ON DELETE CASCADE
- primary_doctor_id → users(user_id)

---

### `doctor_profiles` - Doctor professional information
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| **user_id** | UUID | NO | - | FK to users.user_id |
| first_name | VARCHAR(100) | NO | - | Doctor first name |
| last_name | VARCHAR(100) | NO | - | Doctor last name |
| email | VARCHAR | NO | - | Professional email |
| phone | VARCHAR | NO | - | Professional phone |
| address | TEXT | NO | - | Practice address |
| hospital_name | VARCHAR(200) | YES | - | Hospital/clinic name |
| specialty | VARCHAR(100) | YES | - | Medical specialty |
| degree | VARCHAR(100) | YES | - | Medical degree |
| last_degree_year | INTEGER | YES | - | Year of last degree |
| created_at | TIMESTAMP | YES | CURRENT_TIMESTAMP | Profile creation |
| updated_at | TIMESTAMP | YES | - | Last update |

**Indexes:**
- PRIMARY KEY: user_id

**Foreign Keys:**
- user_id → users(user_id) ON DELETE CASCADE

---

### `lab_profiles` - Laboratory business information
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| **user_id** | UUID | NO | - | FK to users.user_id |
| business_name | VARCHAR(200) | NO | - | Lab business name |
| email | VARCHAR | NO | - | Business email |
| phone | VARCHAR | NO | - | Business phone |
| address | TEXT | NO | - | Lab address |
| license_year | INTEGER | YES | - | Year of license |
| created_at | TIMESTAMP | YES | CURRENT_TIMESTAMP | Profile creation |
| updated_at | TIMESTAMP | YES | - | Last update |

**Indexes:**
- PRIMARY KEY: user_id

**Foreign Keys:**
- user_id → users(user_id) ON DELETE CASCADE

---

### `pharmacy_profiles` - Pharmacy business information
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| **user_id** | UUID | NO | - | FK to users.user_id |
| business_name | VARCHAR(200) | NO | - | Pharmacy business name |
| email | VARCHAR | NO | - | Business email |
| phone | VARCHAR | NO | - | Business phone |
| address | TEXT | NO | - | Pharmacy address |
| license_year | INTEGER | YES | - | Year of license |
| created_at | TIMESTAMP | YES | CURRENT_TIMESTAMP | Profile creation |
| updated_at | TIMESTAMP | YES | - | Last update |

**Indexes:**
- PRIMARY KEY: user_id

**Foreign Keys:**
- user_id → users(user_id) ON DELETE CASCADE

---

## 3. Encounters

### `encounters` - Medical encounters/visits
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| **encounter_id** | UUID | NO | uuid_generate_v4() | Primary key |
| patient_id | UUID | NO | - | FK to users.user_id (patient) |
| doctor_id | UUID | YES | - | FK to users.user_id (doctor) |
| encounter_type | encounter_type | NO | - | REMOTE_CONSULT, LIVE_VISIT, INITIAL_LOG |
| input_method | input_method | YES | - | VOICE or MANUAL |
| created_at | TIMESTAMP | YES | CURRENT_TIMESTAMP | Encounter creation |

**Indexes:**
- PRIMARY KEY: encounter_id
- INDEX: patient_id, doctor_id, created_at

**Foreign Keys:**
- patient_id → users(user_id) ON DELETE CASCADE
- doctor_id → users(user_id) ON DELETE SET NULL

**Referenced By:** vitals_logs, lab_results_logs, summary_reports, lab_orders, prescriptions, media_files

---

## 4. Clinical Data

### `vitals_logs` - Comprehensive vital signs and health assessments
**Total Columns: 113**

#### Core Fields (9)
| Column | Type | Description |
|--------|------|-------------|
| **vital_id** | UUID | Primary key |
| encounter_id | UUID | FK to encounters.encounter_id |
| blood_pressure_sys | INTEGER | Systolic blood pressure |
| blood_pressure_dia | INTEGER | Diastolic blood pressure |
| heart_rate | INTEGER | Heart rate (bpm) |
| oxygen_level | INTEGER | Oxygen level (SpO2) |
| weight | FLOAT | Weight |
| temperature | FLOAT | Body temperature |
| recorded_at | TIMESTAMP | When vitals recorded |

#### Additional Categories (104 fields)
- **Basic Vitals (4)**: height, bmi, respiratory_rate, pulse
- **Blood Pressure Metrics (2)**: mean_arterial_pressure, pulse_pressure
- **Oxygen & Perfusion (3)**: oxygen_saturation, perfusion_index, capillary_refill_time
- **Metabolic (4)**: glucose_level, fasting_glucose, random_glucose, ketone_level
- **Body Composition (5)**: body_fat_percentage, muscle_mass, bone_mass, body_water_percentage, visceral_fat_rating
- **Circumferences (6)**: waist, hip, neck, chest, head, mid_upper_arm
- **Pain Assessment (3)**: pain_level, pain_location, pain_description
- **Neurological (6)**: consciousness_level, glasgow_coma_scale, pupil assessments
- **Cardiovascular (4)**: peripheral_pulse_strength, capillary_refill_location, edema
- **Respiratory (5)**: breath_sounds, cough_type, sputum_color, chest_expansion, accessory_muscles
- **Skin (5)**: skin_color, skin_temperature, skin_moisture, skin_turgor, capillary_blanching
- **Hydration (4)**: mucous_membranes, urine_output, urine_color, fluid_intake
- **Gastrointestinal (5)**: bowel_sounds, last_bowel_movement, abdomen_appearance, nausea, vomiting
- **Genitourinary (4)**: urinary_frequency, urinary_urgency, dysuria, incontinence
- **Mobility (4)**: mobility_status, fall_risk_score, balance_assessment, gait_assessment
- **Mental Status (5)**: orientation, mood, affect, speech, memory
- **Sleep (3)**: sleep_quality, sleep_hours, sleep_disturbances
- **Nutrition (4)**: appetite, dietary_intake_percentage, special_diet, nutrition_risk_score
- **Wound (6)**: wound_present, wound_location, wound_size, wound_type, wound_drainage, wound_healing_stage
- **Infection (4)**: fever_present, chills, sweating, signs_of_infection
- **Medication (2)**: medication_timing, fasting_status
- **Environmental (3)**: measurement_position, activity_level_before, environmental_temperature
- **OB/Neonatal (5)**: gestational_age, apgar_scores, fundal_height, fetal_heart_rate
- **Clinical Notes (3)**: clinical_notes, abnormal_findings, assessment_summary
- **Metadata (4)**: measured_by, measurement_device, verified_by, updated_at

**Indexes:**
- PRIMARY KEY: vital_id
- INDEX: encounter_id

**Foreign Keys:**
- encounter_id → encounters(encounter_id) ON DELETE CASCADE

**Full Schema**: See `VITALS_FIELDS_DOCUMENTATION.md` for complete field list

---

### `lab_results_logs` - Laboratory test results
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| **log_id** | UUID | NO | uuid_generate_v4() | Primary key |
| encounter_id | UUID | NO | - | FK to encounters.encounter_id |
| metrics | JSONB | NO | - | Lab metrics (e.g., {"LDL": 100, "HDL": 50}) |
| recorded_at | TIMESTAMP | YES | CURRENT_TIMESTAMP | Test result timestamp |

**Indexes:**
- PRIMARY KEY: log_id
- INDEX: encounter_id
- GIN INDEX: metrics (for JSONB queries)

**Foreign Keys:**
- encounter_id → encounters(encounter_id) ON DELETE CASCADE

---

### `summary_reports` - AI-generated clinical summaries
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| **report_id** | UUID | NO | uuid_generate_v4() | Primary key |
| encounter_id | UUID | NO | - | FK to encounters.encounter_id (UNIQUE) |
| status | report_status | NO | 'GENERATED' | GENERATED, PENDING_REVIEW, REVIEWED |
| priority | priority_level | YES | - | HIGH, MEDIUM, LOW |
| content | JSONB | NO | - | Report content in English |
| gujarati_content | JSONB | YES | - | Cached Gujarati translation |
| hindi_content | JSONB | YES | - | Cached Hindi translation |
| created_at | TIMESTAMP | YES | CURRENT_TIMESTAMP | Report creation |
| updated_at | TIMESTAMP | YES | - | Last update |

**Content Structure (JSONB):**
```json
{
  "symptoms": "text",
  "diagnosis": "text",
  "treatment": "text",
  "tests": "text",
  "prescription": "text",
  "next_steps": "text"
}
```

**Indexes:**
- PRIMARY KEY: report_id
- UNIQUE: encounter_id
- INDEX: status
- GIN INDEX: content (for JSONB queries)

**Foreign Keys:**
- encounter_id → encounters(encounter_id) ON DELETE CASCADE

---

## 5. Orders & Prescriptions

### `lab_orders` - Laboratory test orders
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| **order_id** | UUID | NO | uuid_generate_v4() | Primary key |
| encounter_id | UUID | NO | - | FK to encounters.encounter_id |
| lab_id | UUID | NO | - | FK to users.user_id (lab) |
| instructions | TEXT | NO | - | Test instructions |
| status | order_status | NO | 'SENT' | SENT, RECEIVED, COMPLETED |
| created_at | TIMESTAMP | YES | CURRENT_TIMESTAMP | Order creation |
| updated_at | TIMESTAMP | YES | - | Last update |

**Indexes:**
- PRIMARY KEY: order_id
- INDEX: encounter_id, lab_id

**Foreign Keys:**
- encounter_id → encounters(encounter_id) ON DELETE CASCADE
- lab_id → users(user_id) ON DELETE CASCADE

---

### `prescriptions` - Medication prescriptions
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| **prescription_id** | UUID | NO | uuid_generate_v4() | Primary key |
| encounter_id | UUID | NO | - | FK to encounters.encounter_id |
| pharmacy_id | UUID | NO | - | FK to users.user_id (pharmacy) |
| instructions | TEXT | NO | - | Prescription details |
| status | order_status | NO | 'SENT' | SENT, RECEIVED, COMPLETED |
| created_at | TIMESTAMP | YES | CURRENT_TIMESTAMP | Prescription creation |
| updated_at | TIMESTAMP | YES | - | Last update |

**Indexes:**
- PRIMARY KEY: prescription_id
- INDEX: encounter_id, pharmacy_id

**Foreign Keys:**
- encounter_id → encounters(encounter_id) ON DELETE CASCADE
- pharmacy_id → users(user_id) ON DELETE CASCADE

---

## 6. Media & Sharing

### `media_files` - Encounter media attachments
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| **file_id** | UUID | NO | uuid_generate_v4() | Primary key |
| encounter_id | UUID | NO | - | FK to encounters.encounter_id |
| file_type | VARCHAR(50) | NO | - | MIME type or file category |
| filename | VARCHAR(255) | NO | - | Original filename |
| file_path | VARCHAR(500) | NO | - | Storage path |
| file_size | INTEGER | NO | - | File size in bytes |
| uploaded_at | TIMESTAMP | YES | CURRENT_TIMESTAMP | Upload timestamp |

**Indexes:**
- PRIMARY KEY: file_id
- INDEX: encounter_id

**Foreign Keys:**
- encounter_id → encounters(encounter_id) ON DELETE CASCADE

---

### `profile_shares` - Patient-Doctor access control
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| **share_id** | UUID | NO | uuid_generate_v4() | Primary key |
| patient_id | UUID | NO | - | FK to users.user_id (patient) |
| doctor_id | UUID | NO | - | FK to users.user_id (doctor) |
| access_level | access_level | NO | 'FULL_HISTORY' | FULL_HISTORY, SINGLE_ENCOUNTER |
| created_at | TIMESTAMP | YES | CURRENT_TIMESTAMP | Share creation |

**Indexes:**
- PRIMARY KEY: share_id
- INDEX: patient_id, doctor_id

**Foreign Keys:**
- patient_id → users(user_id) ON DELETE CASCADE
- doctor_id → users(user_id) ON DELETE CASCADE

---

## 7. Custom Types (ENUMs)

### `user_role`
- PATIENT
- DOCTOR
- LAB
- PHARMACY
- ADMIN

### `gender_type`
- Male
- Female
- Other
- Prefer Not to Say

### `encounter_type`
- REMOTE_CONSULT
- LIVE_VISIT
- INITIAL_LOG

### `input_method`
- VOICE
- MANUAL

### `report_status`
- GENERATED
- PENDING_REVIEW
- REVIEWED

### `priority_level`
- HIGH
- MEDIUM
- LOW

### `order_status`
- SENT
- RECEIVED
- COMPLETED

### `access_level`
- FULL_HISTORY
- SINGLE_ENCOUNTER

### `authprovider`
- GOOGLE
- PHONE

---

## Entity Relationship Summary

```
users (1) ─── (1) patient_profiles
      (1) ─── (1) doctor_profiles
      (1) ─── (1) lab_profiles
      (1) ─── (1) pharmacy_profiles

users [patient] (1) ─── (N) encounters
users [doctor]  (1) ─── (N) encounters

encounters (1) ─── (N) vitals_logs
           (1) ─── (N) lab_results_logs
           (1) ─── (1) summary_reports
           (1) ─── (N) lab_orders
           (1) ─── (N) prescriptions
           (1) ─── (N) media_files

users [patient] (N) ─── (N) users [doctor]  (via profile_shares)
```

---

## Database Statistics

| Table | Approximate Columns | Primary Use |
|-------|---------------------|-------------|
| users | 7 | Authentication |
| patient_profiles | 10 | Patient demographics |
| doctor_profiles | 12 | Doctor credentials |
| lab_profiles | 8 | Lab information |
| pharmacy_profiles | 8 | Pharmacy information |
| encounters | 6 | Medical visits |
| vitals_logs | **113** | Comprehensive health metrics |
| lab_results_logs | 4 | Lab test results (JSONB) |
| summary_reports | 9 | AI-generated reports (JSONB) |
| lab_orders | 7 | Lab test orders |
| prescriptions | 7 | Medication prescriptions |
| media_files | 7 | Encounter attachments |
| profile_shares | 5 | Access control |

---

## Key Features

### 1. **Multilingual Support**
- Summary reports support English, Gujarati, and Hindi
- Translation caching in separate JSONB columns
- No repeated AI API calls for same language

### 2. **Flexible Data Storage**
- JSONB for lab results (flexible metric storage)
- JSONB for summary reports (structured clinical content)
- JSONB for translations (consistent structure across languages)

### 3. **Comprehensive Vitals**
- 113 fields covering all medical specialties
- Support for emergency, primary care, OB/GYN, pediatrics
- Clinical notes and metadata for complete documentation

### 4. **Access Control**
- Profile sharing between patients and doctors
- Granular access levels (full history vs single encounter)
- Secure cascade deletion policies

### 5. **Multi-tenant Architecture**
- Support for 5 user roles
- Separate profiles for each user type
- Role-based access control built-in

---

## Migration History

| Date | Description | Files |
|------|-------------|-------|
| 2026-01-01 | Added translation caching to summary_reports | `add_translation_columns.sql` |
| 2026-01-01 | Expanded vitals_logs from 9 to 113 fields | `add_vitals_fields.sql` |
| Earlier | Added primary_doctor_id and notes to patient_profiles | Migration file |

---

## Indexes Strategy

### High Performance Queries
- **UUID Primary Keys**: Fast lookups, globally unique
- **Foreign Key Indexes**: Optimized for JOIN operations
- **JSONB GIN Indexes**: Efficient queries on JSON content
- **Timestamp Indexes**: Quick date-range queries
- **Unique Constraints**: Data integrity on email, phone

### Recommended Additional Indexes (Future)
```sql
-- For vitals trending queries
CREATE INDEX idx_vitals_recorded_at ON vitals_logs(recorded_at);

-- For doctor search
CREATE INDEX idx_doctor_specialty ON doctor_profiles(specialty);

-- For encounter filtering
CREATE INDEX idx_encounters_type_created ON encounters(encounter_type, created_at);
```

---

## Backup & Maintenance

### Critical Tables (High Priority Backup)
1. users
2. patient_profiles
3. encounters
4. vitals_logs
5. summary_reports

### Regular Maintenance
- Vacuum JSONB tables periodically
- Reindex GIN indexes monthly
- Archive old encounters (>5 years) to separate schema
- Monitor table sizes for vitals_logs (grows quickly)

---

## Notes

- All timestamps use `timestamp with time zone` for proper timezone handling
- Cascade deletion ensures referential integrity
- Nullable fields allow flexible data entry
- JSONB enables schema evolution without migrations
- UUID v4 for distributed system compatibility
