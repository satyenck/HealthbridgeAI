"""
Doctor Router - Doctor portal functionality
Patient search, pending reports, patient timeline
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from uuid import UUID
from datetime import date

from app.database import get_db
from app.models_v2 import (
    User, PatientProfile, Encounter, VitalsLog, LabResultsLog,
    SummaryReport, ReportStatus, MediaFile, DoctorProfile
)
from app.schemas_v2 import (
    PatientProfileResponse, PatientTimelineResponse,
    ComprehensiveEncounterResponse, SummaryReportResponse,
    DoctorProfileResponse
)
from app.auth import get_current_doctor

router = APIRouter(prefix="/api/doctor", tags=["Doctor Portal"])


# ============================================================================
# DOCTOR PROFILE
# ============================================================================

@router.get("/profile/", response_model=DoctorProfileResponse)
async def get_doctor_profile(
    current_doctor: User = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """
    Get the current doctor's profile information
    """
    doctor_profile = db.query(DoctorProfile).filter(
        DoctorProfile.user_id == current_doctor.user_id
    ).first()

    if not doctor_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found"
        )

    return doctor_profile


# ============================================================================
# PATIENT SEARCH & MANAGEMENT
# ============================================================================

@router.get("/patients/my-patients", response_model=List[PatientProfileResponse])
async def get_my_patients(
    current_doctor: User = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """
    Get list of unique patients that this doctor has reviewed.
    Returns patient profiles with basic information.
    """
    # Get unique patient IDs from encounters this doctor has reviewed
    patient_ids = db.query(Encounter.patient_id).join(
        SummaryReport, Encounter.encounter_id == SummaryReport.encounter_id
    ).filter(
        Encounter.doctor_id == current_doctor.user_id,
        SummaryReport.status == ReportStatus.REVIEWED
    ).distinct().all()

    # Extract patient_id values from tuples
    patient_ids = [pid[0] for pid in patient_ids]

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
    current_doctor: User = Depends(get_current_doctor),
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
    current_doctor: User = Depends(get_current_doctor),
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

@router.get("/reports/pending", response_model=List[SummaryReportResponse])
async def get_pending_reports(
    limit: int = 50,
    current_doctor: User = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """
    Get pending reports for doctor review.
    Returns:
    - Reports from my patients (assigned to me)
    - Reports not assigned to any doctor (unassigned)
    """
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

    return reports


@router.get("/reports/my-reviewed", response_model=List[SummaryReportResponse])
async def get_my_reviewed_reports(
    limit: int = 50,
    current_doctor: User = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """
    Get reports reviewed by current doctor.
    Returns encounters where doctor is assigned and report is REVIEWED.
    """
    # Get encounters where this doctor is assigned
    encounters = db.query(Encounter).filter(
        Encounter.doctor_id == current_doctor.user_id
    ).all()

    encounter_ids = [e.encounter_id for e in encounters]

    # Get reviewed reports for these encounters
    reports = db.query(SummaryReport).filter(
        SummaryReport.encounter_id.in_(encounter_ids),
        SummaryReport.status == ReportStatus.REVIEWED
    ).order_by(SummaryReport.updated_at.desc()).limit(limit).all()

    return reports


# ============================================================================
# PATIENT DETAILS
# ============================================================================

@router.get("/patients/{patient_id}", response_model=PatientProfileResponse)
async def get_patient_profile(
    patient_id: UUID,
    current_doctor: User = Depends(get_current_doctor),
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


# ============================================================================
# DOCTOR STATISTICS
# ============================================================================

@router.get("/stats")
async def get_doctor_stats(
    current_doctor: User = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """
    Get statistics for current doctor:
    - Total patients seen (unique patients from reviewed reports)
    - Total consultations (reviewed reports + future appointments)
    - Pending reports to review (my patients + unassigned)
    - Reports reviewed by this doctor
    """
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
