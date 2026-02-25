"""
Doctor Router - Doctor portal functionality
Patient search, pending reports, patient timeline
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy import func
from typing import List, Optional
from uuid import UUID
from datetime import date
from pydantic import BaseModel

from app.database import get_db
from app.models_v2 import (
    User, PatientProfile, Encounter, VitalsLog, LabResultsLog,
    SummaryReport, ReportStatus, MediaFile, DoctorProfile,
    DoctorAssistantAssociation, UserRole
)
from app.schemas_v2 import (
    PatientProfileResponse, PatientTimelineResponse,
    ComprehensiveEncounterResponse, SummaryReportResponse,
    DoctorProfileResponse
)
from app.auth import get_current_doctor, get_current_doctor_or_assistant

router = APIRouter(prefix="/api/doctor", tags=["Doctor Portal"])


# Request models
class ReviewReportRequest(BaseModel):
    diagnosis: str
    treatment_plan: str = ""
    next_steps: str = ""
    tests: str = ""
    prescription: str = ""


class VoiceEditRequest(BaseModel):
    report_id: str
    audio_base64: str


# ============================================================================
# DOCTOR PROFILE
# ============================================================================

@router.get("/profile/")
async def get_doctor_profile(
    current_doctor: User = Depends(get_current_doctor_or_assistant),
    db: Session = Depends(get_db)
):
    """
    Get the current doctor's profile information.
    For doctor assistants, also returns associated doctors list.
    """
    doctor_profile = db.query(DoctorProfile).filter(
        DoctorProfile.user_id == current_doctor.user_id
    ).first()

    if not doctor_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found"
        )

    # Convert to dict for response
    profile_data = {
        "user_id": str(doctor_profile.user_id),
        "first_name": doctor_profile.first_name,
        "last_name": doctor_profile.last_name,
        "email": doctor_profile.email,
        "phone": doctor_profile.phone,
        "address": doctor_profile.address,
        "hospital_name": doctor_profile.hospital_name,
        "specialty": doctor_profile.specialty,
        "degree": doctor_profile.degree,
        "last_degree_year": doctor_profile.last_degree_year,
        "created_at": doctor_profile.created_at,
        "updated_at": doctor_profile.updated_at,
    }

    # If this is a doctor assistant, add associated doctors
    if current_doctor.role == UserRole.DOCTOR_ASSISTANT:
        associations = db.query(DoctorAssistantAssociation).filter(
            DoctorAssistantAssociation.assistant_id == current_doctor.user_id
        ).all()

        associated_doctors = []
        for assoc in associations:
            # Get the doctor's profile
            assoc_doctor = db.query(DoctorProfile).filter(
                DoctorProfile.user_id == assoc.doctor_id
            ).first()
            if assoc_doctor:
                associated_doctors.append({
                    "user_id": str(assoc_doctor.user_id),
                    "first_name": assoc_doctor.first_name,
                    "last_name": assoc_doctor.last_name,
                    "specialty": assoc_doctor.specialty,
                    "hospital_name": assoc.hospital_name or assoc_doctor.hospital_name,
                })

        profile_data["associated_doctors"] = associated_doctors

    return profile_data


@router.get("/search-public")
async def search_doctors_public(
    query: str = "",
    db: Session = Depends(get_db)
):
    """
    Public endpoint to search doctors by first name or last name.
    Used for patient profile doctor selection dropdown and referral system.
    No authentication required.

    If query is empty, returns all doctors (for referral modal).
    If query is provided, must be at least 2 characters.
    """
    if query and len(query) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query must be at least 2 characters"
        )

    # If query is empty, return all doctors
    if not query:
        doctors = db.query(DoctorProfile).limit(50).all()
    else:
        doctors = db.query(DoctorProfile).filter(
            (DoctorProfile.first_name.ilike(f"%{query}%")) |
            (DoctorProfile.last_name.ilike(f"%{query}%"))
        ).limit(20).all()

    return [
        {
            "user_id": str(d.user_id),
            "first_name": d.first_name,
            "last_name": d.last_name,
            "specialty": d.specialty,
            "hospital_name": d.hospital_name
        }
        for d in doctors
    ]


@router.post("/create-basic")
async def create_basic_doctor(
    name: str,
    phone: str,
    current_patient: User = Depends(lambda: None),  # Allow patient auth
    db: Session = Depends(get_db)
):
    """
    Create a basic doctor profile when patient's doctor is not in list.
    Creates minimal doctor record for reference purposes.
    """
    from app.models_v2 import UserRole
    import uuid

    # Check if doctor with this phone already exists
    existing_user = db.query(User).filter(User.phone_number == phone).first()
    if existing_user:
        # Return existing doctor
        existing_doctor = db.query(DoctorProfile).filter(
            DoctorProfile.user_id == existing_user.user_id
        ).first()
        if existing_doctor:
            return {
                "user_id": str(existing_doctor.user_id),
                "first_name": existing_doctor.first_name,
                "last_name": existing_doctor.last_name
            }

    # Split name into first and last
    name_parts = name.strip().split(maxsplit=1)
    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else ""

    # Create User with role=DOCTOR
    new_user = User(
        user_id=uuid.uuid4(),
        phone_number=phone,
        role=UserRole.DOCTOR,
        is_active=False  # Not active until they verify/claim account
    )
    db.add(new_user)
    db.flush()

    # Create DoctorProfile
    doctor_profile = DoctorProfile(
        user_id=new_user.user_id,
        first_name=first_name,
        last_name=last_name,
        email="",  # Empty until doctor claims account
        phone=phone,
        address="Pending verification"
    )
    db.add(doctor_profile)
    db.commit()

    return {
        "user_id": str(new_user.user_id),
        "first_name": first_name,
        "last_name": last_name
    }


# ============================================================================
# PATIENT SEARCH & MANAGEMENT
# ============================================================================

@router.get("/patients/my-patients", response_model=List[PatientProfileResponse])
async def get_my_patients(
    current_doctor: User = Depends(get_current_doctor_or_assistant),
    db: Session = Depends(get_db)
):
    """
    Get list of unique patients that this doctor has reviewed.
    For doctor assistants, returns patients of all associated doctors.
    Returns patient profiles with basic information.
    """
    # Determine which doctor IDs to query
    if current_doctor.role == UserRole.DOCTOR_ASSISTANT:
        # Get all doctors this assistant is associated with
        associations = db.query(DoctorAssistantAssociation).filter(
            DoctorAssistantAssociation.assistant_id == current_doctor.user_id
        ).all()

        doctor_ids = [assoc.doctor_id for assoc in associations]

        if not doctor_ids:
            # No associated doctors, return empty list
            return []

        # Get unique patient IDs from encounters of associated doctors
        patient_ids = db.query(Encounter.patient_id).join(
            SummaryReport, Encounter.encounter_id == SummaryReport.encounter_id
        ).filter(
            Encounter.doctor_id.in_(doctor_ids),
            SummaryReport.status == ReportStatus.REVIEWED
        ).distinct().all()
    else:
        # Regular doctor - get their own patients
        patient_ids = db.query(Encounter.patient_id).join(
            SummaryReport, Encounter.encounter_id == SummaryReport.encounter_id
        ).filter(
            Encounter.doctor_id == current_doctor.user_id,
            SummaryReport.status == ReportStatus.REVIEWED
        ).distinct().all()

    # Extract patient_id values from tuples
    patient_ids = [pid[0] for pid in patient_ids]

    if not patient_ids:
        return []

    # Get patient profiles
    patients = db.query(PatientProfile).filter(
        PatientProfile.user_id.in_(patient_ids)
    ).all()

    return patients


@router.get("/patients/search", response_model=List[PatientProfileResponse])
async def search_patients(
    query: Optional[str] = None,
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    phone_number: Optional[str] = None,
    dob: Optional[date] = None,
    current_doctor: User = Depends(get_current_doctor_or_assistant),
    db: Session = Depends(get_db)
):
    """
    Search for patients by name, phone number, and/or date of birth.
    Returns patient profiles matching the search criteria.
    """
    db_query = db.query(PatientProfile).join(User, PatientProfile.user_id == User.user_id)

    # If generic query is provided, search first name, last name, phone, and DOB
    if query:
        search_pattern = f"%{query}%"
        # Try to parse as date for DOB search
        try:
            # Try different date formats
            from datetime import datetime
            parsed_date = None
            for fmt in ["%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y/%m/%d"]:
                try:
                    parsed_date = datetime.strptime(query, fmt).date()
                    break
                except ValueError:
                    continue

            if parsed_date:
                db_query = db_query.filter(
                    (PatientProfile.first_name.ilike(search_pattern)) |
                    (PatientProfile.last_name.ilike(search_pattern)) |
                    (User.phone_number.ilike(search_pattern)) |
                    (PatientProfile.date_of_birth == parsed_date)
                )
            else:
                db_query = db_query.filter(
                    (PatientProfile.first_name.ilike(search_pattern)) |
                    (PatientProfile.last_name.ilike(search_pattern)) |
                    (User.phone_number.ilike(search_pattern))
                )
        except:
            # If date parsing fails, just search name and phone
            db_query = db_query.filter(
                (PatientProfile.first_name.ilike(search_pattern)) |
                (PatientProfile.last_name.ilike(search_pattern)) |
                (User.phone_number.ilike(search_pattern))
            )

    # Allow specific field searches
    if first_name:
        db_query = db_query.filter(PatientProfile.first_name.ilike(f"%{first_name}%"))

    if last_name:
        db_query = db_query.filter(PatientProfile.last_name.ilike(f"%{last_name}%"))

    if phone_number:
        db_query = db_query.filter(User.phone_number.ilike(f"%{phone_number}%"))

    if dob:
        db_query = db_query.filter(PatientProfile.date_of_birth == dob)

    profiles = db_query.limit(50).all()  # Limit to prevent excessive results
    return profiles


@router.get("/patients/{patient_id}/timeline", response_model=PatientTimelineResponse)
async def get_patient_timeline(
    patient_id: UUID,
    current_doctor: User = Depends(get_current_doctor_or_assistant),
    db: Session = Depends(get_db)
):
    """
    Get patient's complete health timeline with all encounters and data.
    Returns comprehensive view of patient's medical history.
    """
    # Get patient profile
    patient = db.query(PatientProfile).filter(
        PatientProfile.user_id == patient_id
    ).first()

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )

    # Get all encounters for this patient
    encounters = db.query(Encounter).filter(
        Encounter.patient_id == patient_id
    ).order_by(Encounter.created_at.desc()).all()

    # Build comprehensive encounter data
    comprehensive_encounters = []
    for encounter in encounters:
        # Get all related data for this encounter
        vitals = db.query(VitalsLog).filter(
            VitalsLog.encounter_id == encounter.encounter_id
        ).all()

        lab_results = db.query(LabResultsLog).filter(
            LabResultsLog.encounter_id == encounter.encounter_id
        ).all()

        summary_report = db.query(SummaryReport).filter(
            SummaryReport.encounter_id == encounter.encounter_id
        ).first()

        media_files = db.query(MediaFile).filter(
            MediaFile.encounter_id == encounter.encounter_id
        ).all()

        # Get doctor info if encounter has doctor
        doctor_info = None
        if encounter.doctor_id:
            doctor_info = db.query(DoctorProfile).filter(
                DoctorProfile.user_id == encounter.doctor_id
            ).first()

        comprehensive_encounters.append(
            ComprehensiveEncounterResponse(
                encounter=encounter,
                vitals=vitals,
                lab_results=lab_results,
                summary_report=summary_report,
                media_files=media_files,
                patient_info=patient,
                doctor_info=doctor_info
            )
        )

    # Calculate vitals trends for graphing
    vitals_trend = _calculate_vitals_trend(encounters, db)

    return PatientTimelineResponse(
        patient=patient,
        encounters=comprehensive_encounters,
        vitals_trend=vitals_trend
    )


# ============================================================================
# PENDING REPORTS QUEUE
# ============================================================================

@router.get("/reports/pending")
async def get_pending_reports(
    limit: int = 50,
    current_doctor: User = Depends(get_current_doctor_or_assistant),
    db: Session = Depends(get_db)
):
    """
    Get pending reports for doctor review.
    For doctor assistants, shows reports for all associated doctors.
    Returns:
    - Reports from my patients (assigned to me)
    - Reports not assigned to any doctor (unassigned)
    """
    # Determine which doctor IDs to query
    if current_doctor.role == UserRole.DOCTOR_ASSISTANT:
        # Get all doctors this assistant is associated with
        associations = db.query(DoctorAssistantAssociation).filter(
            DoctorAssistantAssociation.assistant_id == current_doctor.user_id
        ).all()

        doctor_ids = [assoc.doctor_id for assoc in associations]

        if not doctor_ids:
            # No associated doctors, return empty list
            return []

        # Get pending reports for all associated doctors
        reports = db.query(SummaryReport).join(
            Encounter, SummaryReport.encounter_id == Encounter.encounter_id
        ).filter(
            SummaryReport.status == ReportStatus.PENDING_REVIEW,
            # Reports from associated doctors OR unassigned
            (Encounter.doctor_id.in_(doctor_ids)) | (Encounter.doctor_id == None)
        ).order_by(
            SummaryReport.priority.desc(),  # High priority first
            SummaryReport.created_at.asc()  # Older reports first
        ).limit(limit).all()
    else:
        # Regular doctor - get their own pending reports
        reports = db.query(SummaryReport).join(
            Encounter, SummaryReport.encounter_id == Encounter.encounter_id
        ).filter(
            SummaryReport.status == ReportStatus.PENDING_REVIEW,
            # My patients OR unassigned
            (Encounter.doctor_id == current_doctor.user_id) | (Encounter.doctor_id == None)
        ).order_by(
            SummaryReport.priority.desc(),  # High priority first
            SummaryReport.created_at.asc()  # Older reports first
        ).limit(limit).all()

    # Enrich reports with patient information
    enriched_reports = []
    for report in reports:
        encounter = db.query(Encounter).filter(
            Encounter.encounter_id == report.encounter_id
        ).first()

        patient = db.query(PatientProfile).filter(
            PatientProfile.user_id == encounter.patient_id
        ).first()

        user = db.query(User).filter(User.user_id == encounter.patient_id).first()

        content = report.content or {}

        enriched_reports.append({
            "report_id": str(report.report_id),
            "encounter_id": str(report.encounter_id),
            "patient_id": str(encounter.patient_id),
            "patient_name": f"{patient.first_name} {patient.last_name}" if patient else "Unknown",
            "patient_phone": user.phone_number if user else "",
            "created_at": report.created_at.isoformat(),
            "symptoms": content.get("symptoms", ""),
            "preliminary_assessment": content.get("diagnosis", ""),
            "status": report.status.value,
        })

    return enriched_reports


@router.get("/reports/my-reviewed")
async def get_my_reviewed_reports(
    limit: int = 50,
    current_doctor: User = Depends(get_current_doctor_or_assistant),
    db: Session = Depends(get_db)
):
    """
    Get reports reviewed by current doctor.
    For doctor assistants, shows reports reviewed by all associated doctors.
    Returns encounters where doctor is assigned and report is REVIEWED.
    """
    # Determine which doctor IDs to query
    if current_doctor.role == UserRole.DOCTOR_ASSISTANT:
        # Get all doctors this assistant is associated with
        associations = db.query(DoctorAssistantAssociation).filter(
            DoctorAssistantAssociation.assistant_id == current_doctor.user_id
        ).all()

        doctor_ids = [assoc.doctor_id for assoc in associations]

        if not doctor_ids:
            # No associated doctors, return empty list
            return []

        # Get encounters where any of the associated doctors are assigned
        encounters = db.query(Encounter).filter(
            Encounter.doctor_id.in_(doctor_ids)
        ).all()
    else:
        # Regular doctor - get their own encounters
        encounters = db.query(Encounter).filter(
            Encounter.doctor_id == current_doctor.user_id
        ).all()

    encounter_ids = [e.encounter_id for e in encounters]

    if not encounter_ids:
        return []

    # Get reviewed reports for these encounters
    reports = db.query(SummaryReport).filter(
        SummaryReport.encounter_id.in_(encounter_ids),
        SummaryReport.status == ReportStatus.REVIEWED
    ).order_by(SummaryReport.updated_at.desc()).limit(limit).all()

    # Enrich reports with patient information
    enriched_reports = []
    for report in reports:
        encounter = db.query(Encounter).filter(
            Encounter.encounter_id == report.encounter_id
        ).first()

        patient = db.query(PatientProfile).filter(
            PatientProfile.user_id == encounter.patient_id
        ).first()

        user = db.query(User).filter(User.user_id == encounter.patient_id).first()

        content = report.content or {}

        enriched_reports.append({
            "report_id": str(report.report_id),
            "encounter_id": str(report.encounter_id),
            "patient_id": str(encounter.patient_id),
            "patient_name": f"{patient.first_name} {patient.last_name}" if patient else "Unknown",
            "patient_phone": user.phone_number if user else "",
            "created_at": report.created_at.isoformat(),
            "reviewed_at": report.updated_at.isoformat() if report.updated_at else report.created_at.isoformat(),
            "diagnosis": content.get("diagnosis", ""),
            "treatment_plan": content.get("treatment", ""),
            "status": report.status.value,
        })

    return enriched_reports


# ============================================================================
# PATIENT DETAILS
# ============================================================================

@router.get("/patients/{patient_id}", response_model=PatientProfileResponse)
async def get_patient_profile(
    patient_id: UUID,
    current_doctor: User = Depends(get_current_doctor_or_assistant),
    db: Session = Depends(get_db)
):
    """
    Get patient profile information.
    """
    patient = db.query(PatientProfile).filter(
        PatientProfile.user_id == patient_id
    ).first()

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )

    return patient


@router.get("/patients/{patient_id}/reports", response_model=List[SummaryReportResponse])
async def get_patient_reports(
    patient_id: UUID,
    current_doctor: User = Depends(get_current_doctor_or_assistant),
    db: Session = Depends(get_db)
):
    """
    Get all reports for a specific patient.
    """
    # Get all encounters for this patient
    encounters = db.query(Encounter).filter(
        Encounter.patient_id == patient_id
    ).all()

    encounter_ids = [e.encounter_id for e in encounters]

    if not encounter_ids:
        return []

    # Get all reports for these encounters
    reports = db.query(SummaryReport).filter(
        SummaryReport.encounter_id.in_(encounter_ids)
    ).order_by(SummaryReport.created_at.desc()).all()

    return reports


@router.get("/reports/{report_id}")
async def get_report_details(
    report_id: UUID,
    current_doctor: User = Depends(get_current_doctor_or_assistant),
    db: Session = Depends(get_db)
):
    """
    Get detailed information for a specific report.
    """
    report = db.query(SummaryReport).filter(
        SummaryReport.report_id == report_id
    ).first()

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )

    # Get encounter info
    encounter = db.query(Encounter).filter(
        Encounter.encounter_id == report.encounter_id
    ).first()

    # Get patient info
    patient = db.query(PatientProfile).filter(
        PatientProfile.user_id == encounter.patient_id
    ).first()

    user = db.query(User).filter(User.user_id == encounter.patient_id).first()

    # Extract data from JSONB content field
    content = report.content or {}

    return {
        "report_id": str(report.report_id),
        "encounter_id": str(report.encounter_id),
        "patient_id": str(encounter.patient_id),
        "patient_name": f"{patient.first_name} {patient.last_name}",
        "patient_phone": user.phone_number,
        "created_at": report.created_at.isoformat(),
        "reviewed_at": report.updated_at.isoformat() if report.status == ReportStatus.REVIEWED else None,
        "symptoms": content.get("symptoms", ""),
        "preliminary_assessment": content.get("diagnosis", ""),
        "diagnosis": content.get("diagnosis", ""),
        "treatment_plan": content.get("treatment", ""),
        "next_steps": content.get("next_steps", ""),
        "tests": content.get("tests", ""),
        "prescription": content.get("prescription", ""),
        "status": report.status.value,
        "encounter_type": encounter.encounter_type.value if encounter.encounter_type else None,
    }


@router.post("/reports/{report_id}/review")
async def review_report(
    report_id: UUID,
    request: ReviewReportRequest,
    current_doctor: User = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """
    Submit review for a report. Only actual doctors can review, not assistants.
    """
    report = db.query(SummaryReport).filter(
        SummaryReport.report_id == report_id
    ).first()

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )

    # Update report with doctor's review in JSONB content
    content = report.content or {}
    content["diagnosis"] = request.diagnosis
    content["treatment"] = request.treatment_plan
    content["next_steps"] = request.next_steps
    content["tests"] = request.tests
    content["prescription"] = request.prescription
    report.content = content

    # Mark the JSONB field as modified so SQLAlchemy detects the change
    flag_modified(report, "content")

    report.status = ReportStatus.REVIEWED

    # Assign doctor to encounter if not already assigned
    encounter = db.query(Encounter).filter(
        Encounter.encounter_id == report.encounter_id
    ).first()

    if not encounter.doctor_id:
        encounter.doctor_id = current_doctor.user_id

    db.commit()

    return {
        "message": "Report reviewed successfully",
        "report_id": str(report_id),
        "status": "REVIEWED"
    }


@router.post("/reports/voice-edit")
async def voice_edit_report(
    request: VoiceEditRequest,
    current_doctor: User = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """
    Process voice input to edit a report.
    Uses AI to extract diagnosis, treatment plan, and next steps from voice.
    """
    from app.services.gemini_service import gemini_service

    # Transcribe audio
    transcribed_text = gemini_service.transcribe_audio(request.audio_base64)

    # Use AI to extract structured report fields
    extraction_prompt = f"""
    Extract the following medical report information from this doctor's dictation:

    Transcription: "{transcribed_text}"

    Please extract and return a JSON object with these fields:
    - diagnosis: The doctor's diagnosis
    - treatment_plan: Recommended treatment plan
    - next_steps: Next steps or follow-up instructions

    If any field is not mentioned, set it to empty string.
    Return ONLY valid JSON, no additional text.
    """

    response = gemini_service.generate_content(extraction_prompt)

    # Parse JSON response
    import json
    try:
        extracted_data = json.loads(response)
    except:
        # Fallback: try to extract JSON from response
        import re
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            extracted_data = json.loads(json_match.group())
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to extract structured data from voice input"
            )

    return {
        "diagnosis": extracted_data.get("diagnosis", ""),
        "treatment_plan": extracted_data.get("treatment_plan", ""),
        "next_steps": extracted_data.get("next_steps", ""),
        "transcribed_text": transcribed_text
    }


# ============================================================================
# DOCTOR STATISTICS
# ============================================================================

@router.get("/stats")
async def get_doctor_stats(
    current_doctor: User = Depends(get_current_doctor_or_assistant),
    db: Session = Depends(get_db)
):
    """
    Get statistics for current doctor:
    For doctor assistants, shows stats for all associated doctors.
    - Total patients seen (unique patients from reviewed reports)
    - Total consultations (reviewed reports + future appointments)
    - Pending reports to review (my patients + unassigned)
    - Reports reviewed by this doctor
    """
    # Determine which doctor IDs to query
    if current_doctor.role == UserRole.DOCTOR_ASSISTANT:
        # Get all doctors this assistant is associated with
        associations = db.query(DoctorAssistantAssociation).filter(
            DoctorAssistantAssociation.assistant_id == current_doctor.user_id
        ).all()

        doctor_ids = [assoc.doctor_id for assoc in associations]

        if not doctor_ids:
            # No associated doctors, return zero stats
            return {
                "total_patients": 0,
                "consultations": 0,
                "pending_reports": 0,
                "reviewed_reports": 0
            }

        # Get unique patient count from encounters associated doctors have reviewed
        total_patients = db.query(func.count(func.distinct(Encounter.patient_id))).join(
            SummaryReport, Encounter.encounter_id == SummaryReport.encounter_id
        ).filter(
            Encounter.doctor_id.in_(doctor_ids),
            SummaryReport.status == ReportStatus.REVIEWED
        ).scalar()

        # Get consultations (reviewed reports by associated doctors)
        consultations = db.query(func.count(SummaryReport.report_id)).join(
            Encounter, SummaryReport.encounter_id == Encounter.encounter_id
        ).filter(
            Encounter.doctor_id.in_(doctor_ids),
            SummaryReport.status == ReportStatus.REVIEWED
        ).scalar()

        # Get pending reports count (associated doctors' patients + unassigned)
        pending_reports = db.query(func.count(SummaryReport.report_id)).join(
            Encounter, SummaryReport.encounter_id == Encounter.encounter_id
        ).filter(
            SummaryReport.status == ReportStatus.PENDING_REVIEW,
            # Associated doctors' patients OR unassigned
            (Encounter.doctor_id.in_(doctor_ids)) | (Encounter.doctor_id == None)
        ).scalar()

        # Get reports reviewed by associated doctors
        reviewed_reports = db.query(func.count(SummaryReport.report_id)).join(
            Encounter, SummaryReport.encounter_id == Encounter.encounter_id
        ).filter(
            Encounter.doctor_id.in_(doctor_ids),
            SummaryReport.status == ReportStatus.REVIEWED
        ).scalar()
    else:
        # Regular doctor - get their own stats
        # Get unique patient count from encounters this doctor has reviewed
        total_patients = db.query(func.count(func.distinct(Encounter.patient_id))).join(
            SummaryReport, Encounter.encounter_id == SummaryReport.encounter_id
        ).filter(
            Encounter.doctor_id == current_doctor.user_id,
            SummaryReport.status == ReportStatus.REVIEWED
        ).scalar()

        # Get consultations (reviewed reports by this doctor)
        consultations = db.query(func.count(SummaryReport.report_id)).join(
            Encounter, SummaryReport.encounter_id == Encounter.encounter_id
        ).filter(
            Encounter.doctor_id == current_doctor.user_id,
            SummaryReport.status == ReportStatus.REVIEWED
        ).scalar()

        # Get pending reports count (my patients + unassigned)
        pending_reports = db.query(func.count(SummaryReport.report_id)).join(
            Encounter, SummaryReport.encounter_id == Encounter.encounter_id
        ).filter(
            SummaryReport.status == ReportStatus.PENDING_REVIEW,
            # My patients OR unassigned
            (Encounter.doctor_id == current_doctor.user_id) | (Encounter.doctor_id == None)
        ).scalar()

        # Get reports reviewed by this doctor
        reviewed_reports = db.query(func.count(SummaryReport.report_id)).join(
            Encounter, SummaryReport.encounter_id == Encounter.encounter_id
        ).filter(
            Encounter.doctor_id == current_doctor.user_id,
            SummaryReport.status == ReportStatus.REVIEWED
        ).scalar()

    return {
        "total_patients": total_patients,
        "consultations": consultations,
        "pending_reports": pending_reports,
        "reviewed_reports": reviewed_reports
    }


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _calculate_vitals_trend(encounters: List[Encounter], db: Session) -> dict:
    """
    Calculate vitals trends over time for graphing.
    Returns aggregated data points for each vital sign.
    """
    encounter_ids = [e.encounter_id for e in encounters]

    if not encounter_ids:
        return {}

    # Get all vitals for these encounters
    vitals = db.query(VitalsLog).filter(
        VitalsLog.encounter_id.in_(encounter_ids)
    ).order_by(VitalsLog.recorded_at.asc()).all()

    # Build trend data
    trend_data = {
        "blood_pressure_sys": [],
        "blood_pressure_dia": [],
        "heart_rate": [],
        "oxygen_level": [],
        "weight": [],
        "temperature": [],
        "timestamps": []
    }

    for vital in vitals:
        trend_data["timestamps"].append(vital.recorded_at.isoformat())
        trend_data["blood_pressure_sys"].append(vital.blood_pressure_sys)
        trend_data["blood_pressure_dia"].append(vital.blood_pressure_dia)
        trend_data["heart_rate"].append(vital.heart_rate)
        trend_data["oxygen_level"].append(vital.oxygen_level)
        trend_data["weight"].append(vital.weight)
        trend_data["temperature"].append(vital.temperature)

    return trend_data
