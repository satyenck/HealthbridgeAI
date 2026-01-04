# Doctor's Assistant Feature Documentation

## Overview
Added a new user type **DOCTOR_ASSISTANT** who can assist doctors with:
- Entering health vitals for patients
- Recording patient data
- Follow-up activities
- General administrative support

**Key Constraint**: Each assistant can be associated with **maximum 5 doctors or hospitals**.

---

## Database Schema Changes

### 1. Updated User Role ENUM
Added `DOCTOR_ASSISTANT` to the `user_role` enum:

```sql
ALTER TYPE user_role ADD VALUE 'DOCTOR_ASSISTANT';
```

**Current Roles:**
- PATIENT
- DOCTOR
- DOCTOR_ASSISTANT ✨ (NEW)
- LAB
- PHARMACY
- ADMIN

---

### 2. New Table: `doctor_assistant_profiles`

Stores profile information for doctor assistants.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| **user_id** | UUID | NO | Primary key, FK to users.user_id |
| first_name | VARCHAR(100) | NO | Assistant's first name |
| last_name | VARCHAR(100) | NO | Assistant's last name |
| email | VARCHAR | YES | Assistant's email address |
| phone | VARCHAR | NO | Assistant's phone number |
| address | TEXT | YES | Assistant's address |
| created_at | TIMESTAMP | NO | Profile creation time |
| updated_at | TIMESTAMP | YES | Last update time |

**Relationships:**
- One-to-one with `users` table
- One-to-many with `doctor_assistant_associations`

---

### 3. New Table: `doctor_assistant_associations`

Junction table implementing many-to-many relationship between assistants and doctors.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| **association_id** | UUID | NO | Primary key |
| assistant_id | UUID | NO | FK to users.user_id (assistant) |
| doctor_id | UUID | NO | FK to users.user_id (doctor) |
| hospital_name | VARCHAR(200) | YES | Hospital/clinic name |
| created_at | TIMESTAMP | NO | Association creation time |

**Constraints:**
- UNIQUE(assistant_id, doctor_id) - Prevents duplicate associations
- Maximum 5 associations per assistant (enforced at application level)

**Indexes:**
- `idx_doctor_assistant_associations_assistant` on `assistant_id`
- `idx_doctor_assistant_associations_doctor` on `doctor_id`

---

## Backend Model Updates

### Updated `models_v2.py`

**1. UserRole Enum:**
```python
class UserRole(str, enum.Enum):
    """Six distinct user roles in the system"""
    PATIENT = "PATIENT"
    DOCTOR = "DOCTOR"
    DOCTOR_ASSISTANT = "DOCTOR_ASSISTANT"  # NEW
    LAB = "LAB"
    PHARMACY = "PHARMACY"
    ADMIN = "ADMIN"
```

**2. New DoctorAssistantProfile Model:**
```python
class DoctorAssistantProfile(Base):
    """
    Doctor's Assistant profile.
    Assistants help doctors with data entry, vitals recording, and follow-ups.
    Can be associated with up to 5 doctors.
    """
    __tablename__ = "doctor_assistant_profiles"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), primary_key=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=False)
    address = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="doctor_assistant_profile")
    doctor_associations = relationship("DoctorAssistantAssociation",
                                      back_populates="assistant",
                                      cascade="all, delete-orphan")
```

**3. New DoctorAssistantAssociation Model:**
```python
class DoctorAssistantAssociation(Base):
    """
    Junction table linking doctor assistants to doctors.
    Allows many-to-many relationship with max 5 doctors per assistant.
    """
    __tablename__ = "doctor_assistant_associations"

    association_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assistant_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    hospital_name = Column(String(200), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    assistant = relationship("User", foreign_keys=[assistant_id])
    doctor = relationship("User", foreign_keys=[doctor_id])
```

**4. Updated User Model:**
Added relationship to doctor_assistant_profile:
```python
doctor_assistant_profile = relationship("DoctorAssistantProfile",
                                       back_populates="user",
                                       uselist=False,
                                       cascade="all, delete-orphan")
```

---

## Sample Data Created

### Doctor's Assistant
- **Name**: Sarah Johnson
- **Phone**: 1234567890
- **Email**: sarah.johnson@healthbridge.com
- **Address**: HealthBridge Medical Center, San Francisco, CA
- **Role**: DOCTOR_ASSISTANT

### Association
- **Associated Doctor**: Dr. David Mays
- **Hospital**: HealthBridge Medical Center
- **Created**: 2026-01-01

---

## Entity Relationships

```
┌─────────────────┐
│     users       │
│  (DOCTOR_       │
│   ASSISTANT)    │
└────────┬────────┘
         │ 1
         │
         │ 1
┌────────▼─────────────────────┐
│ doctor_assistant_profiles    │
│  - first_name                │
│  - last_name                 │
│  - email, phone, address     │
└────────┬─────────────────────┘
         │ 1
         │
         │ N (max 5)
┌────────▼─────────────────────┐
│ doctor_assistant_            │
│     associations             │
│  - assistant_id              │
│  - doctor_id                 │
│  - hospital_name             │
└────────┬─────────────────────┘
         │ N
         │
         │ 1
┌────────▼────────┐
│     users       │
│   (DOCTOR)      │
└─────────────────┘
```

---

## Use Cases

### 1. Doctor's Assistant Entering Vitals
```python
# Assistant (Sarah Johnson) records vitals for a patient
# on behalf of Dr. David Mays

vital_log = VitalsLog(
    encounter_id=encounter.encounter_id,
    blood_pressure_sys=120,
    blood_pressure_dia=80,
    heart_rate=72,
    measured_by="Sarah Johnson (Assistant to Dr. David Mays)",
    recorded_at=datetime.now()
)
```

### 2. Checking Assistant's Associated Doctors
```sql
SELECT
    da.first_name || ' ' || da.last_name as assistant_name,
    d.first_name || ' ' || d.last_name as doctor_name,
    daa.hospital_name
FROM doctor_assistant_profiles da
JOIN doctor_assistant_associations daa ON da.user_id = daa.assistant_id
JOIN doctor_profiles d ON daa.doctor_id = d.user_id
WHERE da.user_id = 'assistant_user_id';
```

### 3. Enforcing 5-Doctor Limit
```python
# Before creating new association
current_associations = db.query(DoctorAssistantAssociation).filter(
    DoctorAssistantAssociation.assistant_id == assistant_id
).count()

if current_associations >= 5:
    raise HTTPException(
        status_code=400,
        detail="Assistant cannot be associated with more than 5 doctors"
    )
```

---

## API Endpoints (To Be Implemented)

### Recommended Endpoints

**1. Get Assistant Profile**
```
GET /api/assistant/profile/
```

**2. Get Assistant's Doctors**
```
GET /api/assistant/my-doctors
```

**3. Associate with Doctor**
```
POST /api/assistant/associate-doctor
Body: {
  "doctor_id": "uuid",
  "hospital_name": "Hospital Name"
}
```

**4. Remove Doctor Association**
```
DELETE /api/assistant/associate-doctor/{doctor_id}
```

**5. Record Vitals on Behalf of Doctor**
```
POST /api/assistant/record-vitals/{encounter_id}
Body: {
  "blood_pressure_sys": 120,
  "blood_pressure_dia": 80,
  "heart_rate": 72,
  ...
}
```

---

## Authentication Considerations

Doctor's assistants should have:
- ✅ Access to patients of their associated doctors
- ✅ Ability to enter/edit vitals
- ✅ Ability to view patient timelines
- ❌ No access to prescribing medications
- ❌ No access to generating final diagnoses
- ❌ Limited to their associated doctors' patients only

---

## Migration Files

**Created Files:**
- `add_doctor_assistant.sql` - Complete migration script

**Execution:**
```bash
psql -h localhost -U satyenkansara -d healthbridge_db -f add_doctor_assistant.sql
```

---

## Database Verification

### Check Doctor Assistant Exists
```sql
SELECT u.phone_number, u.role, da.first_name, da.last_name, da.email
FROM users u
JOIN doctor_assistant_profiles da ON u.user_id = da.user_id
WHERE u.phone_number = '1234567890';
```

**Result:**
```
phone_number | role             | first_name | last_name | email
1234567890   | DOCTOR_ASSISTANT | Sarah      | Johnson   | sarah.johnson@healthbridge.com
```

### Check Associations
```sql
SELECT
    da.first_name || ' ' || da.last_name as assistant_name,
    COUNT(daa.doctor_id) as associated_doctors_count,
    STRING_AGG(d.first_name || ' ' || d.last_name, ', ') as doctors
FROM doctor_assistant_profiles da
LEFT JOIN doctor_assistant_associations daa ON da.user_id = daa.assistant_id
LEFT JOIN doctor_profiles d ON daa.doctor_id = d.user_id
GROUP BY da.user_id, da.first_name, da.last_name;
```

**Result:**
```
assistant_name | associated_doctors_count | doctors
Sarah Johnson  | 1                        | David Mays
```

---

## Future Enhancements

1. **Permission System**: Granular permissions for different assistant actions
2. **Activity Logging**: Track all actions performed by assistants
3. **Approval Workflow**: Require doctor approval for certain assistant actions
4. **Mobile App**: Dedicated assistant interface
5. **Notifications**: Alert doctors when assistants make changes
6. **Reports**: Generate reports on assistant activities
7. **Training Module**: Built-in training for new assistants

---

## Total Tables in Database: 15

1. users
2. patient_profiles
3. doctor_profiles
4. lab_profiles
5. pharmacy_profiles
6. **doctor_assistant_profiles** ✨ (NEW)
7. encounters
8. vitals_logs
9. lab_results_logs
10. summary_reports
11. lab_orders
12. prescriptions
13. **doctor_assistant_associations** ✨ (NEW)
14. media_files
15. profile_shares

---

## Summary

✅ **Completed:**
- Added DOCTOR_ASSISTANT user role
- Created doctor_assistant_profiles table
- Created doctor_assistant_associations junction table
- Updated SQLAlchemy models
- Created sample assistant (Sarah Johnson, phone: 1234567890)
- Associated sample assistant with Dr. David Mays
- Full documentation created

**Status:** Ready for use in authentication and authorization logic.
