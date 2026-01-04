# Vitals Log Fields Documentation

## Overview
The `vitals_logs` table has been expanded from 9 fields to **113 comprehensive medical assessment fields** to support complete patient health monitoring.

## Migration Details
- **Date**: 2026-01-01
- **Migration File**: `add_vitals_fields.sql`
- **Model File**: `app/models_v2.py` (VitalsLog class)

## Field Categories

### 1. Original Fields (Preserved)
These existing fields remain unchanged:
- `vital_id` (UUID, Primary Key)
- `encounter_id` (UUID, Foreign Key)
- `blood_pressure_sys` (Integer) - Systolic blood pressure
- `blood_pressure_dia` (Integer) - Diastolic blood pressure
- `heart_rate` (Integer) - Beats per minute
- `oxygen_level` (Integer) - SpO2 level
- `weight` (Float) - Patient weight
- `temperature` (Float) - Body temperature
- `recorded_at` (Timestamp) - When vitals were recorded

### 2. Additional Vital Signs (4 fields)
- `height` (Float) - Patient height in cm
- `bmi` (Float) - Body Mass Index
- `respiratory_rate` (Integer) - Breaths per minute
- `pulse` (Integer) - Pulse rate in bpm

### 3. Blood Pressure Derived Metrics (2 fields)
- `mean_arterial_pressure` (Float) - MAP
- `pulse_pressure` (Float) - Systolic - Diastolic difference

### 4. Oxygen and Perfusion (3 fields)
- `oxygen_saturation` (Float) - SpO2 percentage
- `perfusion_index` (Float) - PI percentage
- `capillary_refill_time` (Float) - Seconds

### 5. Metabolic Measurements (4 fields)
- `glucose_level` (Float) - Blood glucose in mg/dL
- `fasting_glucose` (Float) - Fasting blood glucose in mg/dL
- `random_glucose` (Float) - Random blood glucose in mg/dL
- `ketone_level` (Float) - Ketone level in mmol/L

### 6. Body Composition (5 fields)
- `body_fat_percentage` (Float)
- `muscle_mass` (Float) - In kg
- `bone_mass` (Float) - In kg
- `body_water_percentage` (Float)
- `visceral_fat_rating` (Float)

### 7. Circumference Measurements (6 fields)
- `waist_circumference` (Float) - In cm
- `hip_circumference` (Float) - In cm
- `neck_circumference` (Float) - In cm
- `chest_circumference` (Float) - In cm
- `head_circumference` (Float) - In cm (pediatric)
- `mid_upper_arm_circumference` (Float) - MUAC in cm

### 8. Body Ratios (1 field)
- `waist_hip_ratio` (Float)

### 9. Pain Assessment (3 fields)
- `pain_level` (Integer) - 0-10 scale
- `pain_location` (Text)
- `pain_description` (Text)

### 10. Neurological Assessment (6 fields)
- `consciousness_level` (Text) - AVPU scale: Alert, Voice, Pain, Unresponsive
- `glasgow_coma_scale` (Integer) - GCS 3-15
- `pupil_response_left` (Text) - Normal, Sluggish, Fixed
- `pupil_response_right` (Text)
- `pupil_size_left` (Float) - In mm
- `pupil_size_right` (Float) - In mm

### 11. Cardiovascular Additional (4 fields)
- `peripheral_pulse_strength` (Text) - Strong, Weak, Absent
- `capillary_refill_location` (Text) - Central, Peripheral
- `edema_location` (Text)
- `edema_grade` (Integer) - 1-4+

### 12. Respiratory Additional (5 fields)
- `breath_sounds` (Text) - Clear, Wheezes, Crackles, etc.
- `cough_type` (Text) - Dry, Productive, etc.
- `sputum_color` (Text)
- `chest_expansion` (Text) - Equal, Unequal
- `use_of_accessory_muscles` (Boolean)

### 13. Skin Assessment (5 fields)
- `skin_color` (Text) - Normal, Pale, Cyanotic, Jaundiced
- `skin_temperature` (Text) - Warm, Cool, Hot
- `skin_moisture` (Text) - Dry, Moist, Diaphoretic
- `skin_turgor` (Text) - Normal, Poor
- `capillary_blanching` (Text)

### 14. Hydration Status (4 fields)
- `mucous_membranes` (Text) - Moist, Dry
- `urine_output` (Float) - In mL
- `urine_color` (Text)
- `fluid_intake` (Float) - In mL per day

### 15. Gastrointestinal (5 fields)
- `bowel_sounds` (Text) - Normal, Hyperactive, Hypoactive, Absent
- `last_bowel_movement` (Timestamp)
- `abdomen_appearance` (Text) - Soft, Distended, Rigid
- `nausea` (Boolean)
- `vomiting` (Boolean)

### 16. Genitourinary (4 fields)
- `urinary_frequency` (Text)
- `urinary_urgency` (Boolean)
- `dysuria` (Boolean)
- `incontinence` (Boolean)

### 17. Mobility and Functional Status (4 fields)
- `mobility_status` (Text) - Independent, Assisted, Bedbound
- `fall_risk_score` (Integer)
- `balance_assessment` (Text) - Steady, Unsteady
- `gait_assessment` (Text)

### 18. Mental Status (5 fields)
- `orientation` (Text) - Oriented x3 (Person, Place, Time)
- `mood` (Text)
- `affect` (Text)
- `speech` (Text) - Clear, Slurred, Aphasic
- `memory` (Text) - Intact, Impaired

### 19. Sleep Assessment (3 fields)
- `sleep_quality` (Text)
- `sleep_hours` (Float)
- `sleep_disturbances` (Text)

### 20. Nutrition Assessment (4 fields)
- `appetite` (Text) - Good, Poor, None
- `dietary_intake_percentage` (Integer) - % of meal consumed
- `special_diet` (Text)
- `nutrition_risk_score` (Integer)

### 21. Wound Assessment (6 fields)
- `wound_present` (Boolean)
- `wound_location` (Text)
- `wound_size` (Text) - Length x Width x Depth
- `wound_type` (Text) - Pressure, Surgical, Traumatic
- `wound_drainage` (Text) - Serous, Sanguineous, Purulent
- `wound_healing_stage` (Text)

### 22. Infection Indicators (4 fields)
- `fever_present` (Boolean)
- `chills` (Boolean)
- `sweating` (Boolean)
- `signs_of_infection` (Text)

### 23. Medication-Related Vitals (2 fields)
- `medication_timing` (Text) - Before meds, After meds
- `fasting_status` (Boolean) - For glucose/lipids tests

### 24. Environmental Factors (3 fields)
- `measurement_position` (Text) - Sitting, Standing, Lying, Supine
- `activity_level_before` (Text) - Resting, Post-exercise
- `environmental_temperature` (Float) - Room temp in Celsius

### 25. Special Populations - OB/Neonatal (5 fields)
- `gestational_age` (Integer) - In weeks
- `apgar_score_1min` (Integer) - Neonatal assessment at 1 minute
- `apgar_score_5min` (Integer) - Neonatal assessment at 5 minutes
- `fundal_height` (Float) - In cm
- `fetal_heart_rate` (Integer) - In bpm

### 26. Clinical Notes (3 fields)
- `clinical_notes` (Text) - Free-text observations
- `abnormal_findings` (Text)
- `assessment_summary` (Text)

### 27. Metadata (3 fields)
- `measured_by` (Text) - Healthcare provider name/ID
- `measurement_device` (Text) - Device used for measurement
- `verified_by` (Text) - Supervisor verification

### 28. Timestamps (1 field)
- `updated_at` (Timestamp) - Last update time

## Total Fields: 113

## Usage Notes

### All fields are nullable
All measurement fields are nullable (`nullable=True`) to allow partial vital sign entries. This enables:
- Recording only relevant vitals for each encounter
- Gradual data collection over time
- Flexibility for different types of medical assessments

### Data Types
- **Integer**: Whole number measurements (heart_rate, pain_level, GCS, etc.)
- **Float**: Decimal measurements (weight, temperature, BMI, glucose, etc.)
- **Text**: Descriptive assessments and clinical observations
- **Boolean**: Yes/No indicators (wound_present, nausea, fasting_status, etc.)
- **Timestamp**: Time-based data (recorded_at, last_bowel_movement, updated_at)

### Recommended Field Groups by Use Case

#### Primary Care Visit
- Basic vitals: blood_pressure, heart_rate, temperature, weight, height, BMI
- Pain assessment
- General assessment: consciousness_level, skin_color

#### Emergency Department
- Critical vitals: blood_pressure, heart_rate, respiratory_rate, oxygen_saturation
- Neurological: glasgow_coma_scale, pupil_responses, consciousness_level
- Perfusion: capillary_refill_time, peripheral_pulse_strength
- Clinical notes and abnormal_findings

#### Diabetes Management
- Metabolic: glucose_level, fasting_glucose, random_glucose, ketone_level
- Weight, BMI, waist_circumference
- Medication timing and fasting_status

#### Cardiac Care
- Cardiovascular: blood_pressure, heart_rate, pulse, edema assessment
- Perfusion index
- Chest pain assessment
- Activity level

#### Pediatric/Neonatal
- Head_circumference, weight, height
- APGAR scores
- Developmental assessments

#### Obstetric Care
- Gestational_age, fundal_height, fetal_heart_rate
- Blood pressure, weight
- Edema assessment

#### Wound Care
- All wound assessment fields
- Infection indicators
- Skin assessment

#### Mental Health
- Mental status fields (orientation, mood, affect, speech, memory)
- Sleep assessment
- Pain level

## API Integration

### Creating Vitals Record
```python
new_vital = VitalsLog(
    encounter_id=encounter.encounter_id,
    blood_pressure_sys=120,
    blood_pressure_dia=80,
    heart_rate=72,
    temperature=98.6,
    # Add any additional fields as needed
    measured_by="Dr. Smith",
    measurement_position="Sitting",
    clinical_notes="Patient reports feeling well"
)
db.add(new_vital)
db.commit()
```

### Querying Vitals
All fields can be queried using SQLAlchemy ORM:
```python
# Get all vitals for an encounter
vitals = db.query(VitalsLog).filter(
    VitalsLog.encounter_id == encounter_id
).order_by(VitalsLog.recorded_at.desc()).all()

# Filter by specific conditions
high_bp_vitals = db.query(VitalsLog).filter(
    VitalsLog.blood_pressure_sys > 140
).all()

# Get vitals with pain levels
pain_records = db.query(VitalsLog).filter(
    VitalsLog.pain_level.isnot(None)
).all()
```

## Database Indexes

Current indexes:
- `vitals_logs_pkey`: Primary key on `vital_id`
- `idx_vitals_encounter`: Index on `encounter_id` for fast encounter-based queries

Consider adding indexes for commonly queried fields:
- `recorded_at` for time-based queries
- `measured_by` for provider-specific reporting
- Specific vital thresholds if doing population health analytics

## Backward Compatibility

✅ **Fully backward compatible**
- All existing vitals records remain unchanged
- All original 9 fields preserved with same data types
- New fields default to NULL for existing records
- No data migration required
- Existing API endpoints continue to work

## Future Enhancements

Potential additions:
1. **Calculated fields**: Automatic BMI calculation from height/weight
2. **Validation rules**: Range checks for vital signs (e.g., heart_rate 30-250)
3. **Alert thresholds**: Configurable warnings for abnormal values
4. **Trends tracking**: Compare current vs previous vitals
5. **Graphing support**: Time-series visualizations for trending
6. **Reference ranges**: Normal ranges by age/gender/condition

## Compliance Considerations

This comprehensive vitals system supports:
- **HIPAA compliance**: Detailed medical record keeping
- **Joint Commission**: Complete vital signs documentation
- **Meaningful Use**: Enhanced patient data capture
- **Quality reporting**: Comprehensive health metrics for quality measures
