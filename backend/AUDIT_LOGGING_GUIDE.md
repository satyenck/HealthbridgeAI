# Audit Logging Implementation Guide

## Overview
This guide explains how to apply audit logging to endpoints that access PHI (Protected Health Information) for HIPAA compliance.

## Quick Start

### 1. Import the decorator and enum
```python
from app.services.audit_service import audit_log
from app.models_v2 import AuditAction
from fastapi import Request
```

### 2. Add Request dependency
```python
async def your_endpoint(
    # ... existing parameters ...
    request: Request,  # ADD THIS
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
```

### 3. Apply the decorator
```python
@router.get("/{encounter_id}")
@audit_log(action=AuditAction.VIEW, resource_type="ENCOUNTER")
async def get_encounter(
    encounter_id: UUID,
    request: Request,  # Required for audit logging
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # ... your endpoint code ...
```

## Priority Endpoints for Audit Logging

### CRITICAL (Must have audit logging)
- ✅ **Patient Profile Access**
  - GET /api/profile/ - View patient profile
  - PUT /api/profile/ - Update patient profile
  - GET /api/profile/timeline - View patient timeline

- ✅ **Encounter Access**
  - GET /api/encounters/{id} - View encounter details
  - POST /api/encounters/ - Create encounter
  - PUT /api/encounters/{id} - Update encounter
  - DELETE /api/encounters/{id} - Delete encounter
  - GET /api/encounters/{id}/summary - View summary report

- ✅ **Medical Records**
  - POST /api/encounters/{id}/vitals - Add vitals
  - POST /api/encounters/{id}/lab-results - Add lab results
  - GET /api/encounters/{id}/media/{file_id} - Download medical file
  - POST /api/encounters/{id}/media - Upload medical file

- ✅ **Doctor Access to Patient Data**
  - GET /api/doctor/patients/{id} - View patient profile
  - GET /api/doctor/patients/{id}/timeline - View patient history
  - PUT /api/encounters/{id}/summary - Update diagnosis/treatment

### HIGH Priority
- Lab order creation/updates
- Prescription creation/updates
- Patient data export
- Report generation

### MEDIUM Priority
- Search operations
- List views (already filtered by authorization)
- Statistics/dashboard views

## Examples

### Example 1: Viewing Patient Profile
```python
@router.get("/", response_model=PatientProfileResponse)
@audit_log(action=AuditAction.VIEW, resource_type="PATIENT_PROFILE")
async def get_profile(
    request: Request,  # Added for audit logging
    current_user: User = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    profile = db.query(PatientProfile).filter(
        PatientProfile.user_id == current_user.user_id
    ).first()
    return profile
```

### Example 2: Creating Encounter
```python
@router.post("/", response_model=EncounterResponse)
@audit_log(action=AuditAction.CREATE, resource_type="ENCOUNTER")
async def create_encounter(
    encounter_data: EncounterCreate,
    request: Request,  # Added for audit logging
    current_user: User = Depends(get_current_patient),
    db: Session = Depends(get_db)
):
    encounter = Encounter(
        patient_id=current_user.user_id,
        encounter_type=encounter_data.encounter_type
    )
    db.add(encounter)
    db.commit()
    return encounter
```

### Example 3: Updating Summary Report
```python
@router.put("/{encounter_id}/summary", response_model=SummaryReportResponse)
@audit_log(action=AuditAction.UPDATE, resource_type="SUMMARY_REPORT")
async def update_summary_report(
    encounter_id: UUID,
    report_data: SummaryReportUpdate,
    request: Request,  # Added for audit logging
    current_user: User = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    # ... update logic ...
    return updated_report
```

### Example 4: Downloading Medical File
```python
@router.get("/{encounter_id}/media/{file_id}")
@audit_log(action=AuditAction.VIEW, resource_type="MEDIA_FILE")
async def download_media_file(
    encounter_id: UUID,
    file_id: UUID,
    request: Request,  # Added for audit logging
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # ... download logic ...
    return Response(content=decrypted_content)
```

### Example 5: Deleting Data
```python
@router.delete("/{encounter_id}")
@audit_log(action=AuditAction.DELETE, resource_type="ENCOUNTER")
async def delete_encounter(
    encounter_id: UUID,
    request: Request,  # Added for audit logging
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # ... delete logic ...
    return {"message": "Encounter deleted"}
```

## Manual Audit Logging

For complex scenarios where the decorator doesn't work, use manual logging:

```python
from app.services.audit_service import create_audit_log

async def complex_endpoint(...):
    # ... do work ...

    # Manually create audit log
    create_audit_log(
        db=db,
        user=current_user,
        action=AuditAction.EXPORT,
        resource_type="PATIENT_DATA",
        resource_id=patient_id,
        details={"format": "PDF", "records_count": 50}
    )

    return result
```

## Audit Actions Reference

- **VIEW**: Reading/viewing data
- **CREATE**: Creating new records
- **UPDATE**: Modifying existing records
- **DELETE**: Deleting records
- **EXPORT**: Exporting data (PDF, CSV, etc.)
- **LOGIN**: User authentication events
- **LOGOUT**: User logout events
- **ACCESS_DENIED**: Failed authorization attempts

## Resource Types Reference

Standardize resource type names:
- `PATIENT_PROFILE`
- `ENCOUNTER`
- `SUMMARY_REPORT`
- `VITALS_LOG`
- `LAB_RESULTS`
- `MEDIA_FILE`
- `PRESCRIPTION`
- `LAB_ORDER`
- `DOCTOR_PROFILE`

## Best Practices

1. **Always add Request parameter**: Required for capturing IP and user agent
2. **Use specific resource types**: Be descriptive (`PATIENT_PROFILE` not `PROFILE`)
3. **Don't log passwords/tokens**: Never include sensitive auth data in details
4. **Consistent naming**: Use same resource type strings across endpoints
5. **Test thoroughly**: Verify logs are created after deployment

## Testing Audit Logs

```bash
# View your audit logs
curl -H "Authorization: Bearer {token}" \
  https://api.healthbridgeai.com/api/audit/my-logs

# Admin: View all logs
curl -H "Authorization: Bearer {admin_token}" \
  https://api.healthbridgeai.com/api/audit/logs

# Admin: Get audit statistics
curl -H "Authorization: Bearer {admin_token}" \
  https://api.healthbridgeai.com/api/audit/stats
```

## Deployment Checklist

- [ ] Run database migration (add_audit_logs.sql)
- [ ] Apply decorator to all critical PHI endpoints
- [ ] Test audit log creation
- [ ] Verify audit log viewing endpoints
- [ ] Set up log retention policy
- [ ] Configure alerting for suspicious activity

## HIPAA Requirements Met

✅ Access tracking: Who accessed what and when
✅ Modification tracking: All changes to PHI logged
✅ IP address logging: Network source captured
✅ Session tracking: Link logs to user sessions
✅ Immutable logs: Timestamps cannot be modified
✅ Retention: Logs stored for compliance period
✅ User transparency: Users can view their own logs
