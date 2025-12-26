"""
Encounter Service - AI-powered encounter processing
Handles voice transcription, vitals analysis, and summary report generation
"""
from uuid import UUID
from sqlalchemy.orm import Session
from app.models_v2 import (
    Encounter, PatientProfile, VitalsLog, LabResultsLog,
    SummaryReport, ReportStatus, Priority
)
from app.schemas_v2 import SummaryReportContent
from app.services.openai_service import openai_service


class EncounterService:
    """
    Service for AI-powered encounter processing
    """

    @staticmethod
    def generate_ai_summary(
        encounter_id: UUID,
        patient_description: str,
        db: Session,
        auto_assess_priority: bool = True
    ) -> SummaryReport:
        """
        Generate AI-powered summary report for an encounter.

        Args:
            encounter_id: UUID of the encounter
            patient_description: Patient's symptom description (text or transcribed from voice)
            db: Database session
            auto_assess_priority: Whether to automatically assess priority level

        Returns:
            Created SummaryReport object
        """
        # Get encounter
        encounter = db.query(Encounter).filter(
            Encounter.encounter_id == encounter_id
        ).first()

        if not encounter:
            raise ValueError("Encounter not found")

        # Get patient profile for health history
        patient = db.query(PatientProfile).filter(
            PatientProfile.user_id == encounter.patient_id
        ).first()

        health_history = patient.general_health_issues if patient else ""

        # Get latest vitals for this encounter
        latest_vitals = db.query(VitalsLog).filter(
            VitalsLog.encounter_id == encounter_id
        ).order_by(VitalsLog.recorded_at.desc()).first()

        vitals_dict = None
        if latest_vitals:
            vitals_dict = {
                "blood_pressure": f"{latest_vitals.blood_pressure_sys}/{latest_vitals.blood_pressure_dia}",
                "heart_rate": latest_vitals.heart_rate,
                "oxygen_level": latest_vitals.oxygen_level,
                "weight": latest_vitals.weight,
                "temperature": latest_vitals.temperature
            }

        # Get latest lab results for this encounter
        latest_lab_results = db.query(LabResultsLog).filter(
            LabResultsLog.encounter_id == encounter_id
        ).order_by(LabResultsLog.recorded_at.desc()).first()

        lab_results_dict = latest_lab_results.metrics if latest_lab_results else None

        # Generate AI summary report
        report_content = openai_service.generate_summary_report(
            patient_description=patient_description,
            health_history=health_history,
            vitals=vitals_dict,
            lab_results=lab_results_dict
        )

        # Assess priority if enabled
        priority = None
        if auto_assess_priority:
            priority_str = openai_service.assess_priority(
                symptoms=report_content.get("symptoms", ""),
                vitals=vitals_dict
            )
            priority = Priority[priority_str]  # Convert string to enum

        # Create summary report
        summary_report = SummaryReport(
            encounter_id=encounter_id,
            status=ReportStatus.PENDING_REVIEW,  # Needs doctor review
            priority=priority,
            content=report_content
        )

        db.add(summary_report)
        db.commit()
        db.refresh(summary_report)

        return summary_report

    @staticmethod
    def process_voice_encounter(
        encounter_id: UUID,
        audio_base64: str,
        db: Session
    ) -> dict:
        """
        Process voice-recorded encounter:
        1. Transcribe audio using Whisper
        2. Generate AI summary report

        Args:
            encounter_id: UUID of the encounter
            audio_base64: Base64 encoded audio data
            db: Database session

        Returns:
            Dictionary with transcription and summary report
        """
        # Transcribe audio
        transcription = openai_service.transcribe_audio(audio_base64)

        # Generate summary report from transcription
        summary_report = EncounterService.generate_ai_summary(
            encounter_id=encounter_id,
            patient_description=transcription,
            db=db,
            auto_assess_priority=True
        )

        return {
            "transcription": transcription,
            "summary_report": summary_report
        }

    @staticmethod
    def analyze_encounter_vitals(
        encounter_id: UUID,
        db: Session
    ) -> dict:
        """
        Analyze vitals for an encounter and provide AI insights.

        Args:
            encounter_id: UUID of the encounter
            db: Database session

        Returns:
            AI analysis of vital signs
        """
        # Get encounter
        encounter = db.query(Encounter).filter(
            Encounter.encounter_id == encounter_id
        ).first()

        if not encounter:
            raise ValueError("Encounter not found")

        # Get patient profile
        patient = db.query(PatientProfile).filter(
            PatientProfile.user_id == encounter.patient_id
        ).first()

        health_history = patient.general_health_issues if patient else ""

        # Get all vitals for this encounter
        vitals_logs = db.query(VitalsLog).filter(
            VitalsLog.encounter_id == encounter_id
        ).order_by(VitalsLog.recorded_at.desc()).all()

        if not vitals_logs:
            return {"message": "No vitals data available"}

        # Build vitals dictionary from latest reading
        latest = vitals_logs[0]
        vitals_dict = {
            "blood_pressure": f"{latest.blood_pressure_sys}/{latest.blood_pressure_dia}",
            "heart_rate": latest.heart_rate,
            "oxygen_level": latest.oxygen_level,
            "weight": latest.weight,
            "temperature": latest.temperature
        }

        # Get AI analysis
        analysis = openai_service.analyze_vitals(
            vitals=vitals_dict,
            health_history=health_history
        )

        return analysis


encounter_service = EncounterService()
