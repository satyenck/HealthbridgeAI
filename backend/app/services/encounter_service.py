"""
Encounter Service - AI-powered encounter processing
Handles voice transcription, vitals analysis, and summary report generation
"""
from uuid import UUID
from sqlalchemy.orm import Session
from app.models_v2 import (
    Encounter, PatientProfile, VitalsLog, LabResultsLog,
    SummaryReport, ReportStatus, Priority, ReportType
)
from app.schemas_v2 import SummaryReportContent
from app.services.gemini_service import gemini_service


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
        This creates an AI_GENERATED type report, separate from CONVERSATION_TRANSCRIPT reports.

        Args:
            encounter_id: UUID of the encounter
            patient_description: Patient's symptom description (text or transcribed from voice)
            db: Database session
            auto_assess_priority: Whether to automatically assess priority level

        Returns:
            Created or updated SummaryReport object with report_type = AI_GENERATED
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
        report_content = gemini_service.generate_summary_report(
            patient_description=patient_description,
            health_history=health_history,
            vitals=vitals_dict,
            lab_results=lab_results_dict
        )

        # Assess priority if enabled
        priority = None
        if auto_assess_priority:
            priority_str = gemini_service.assess_priority(
                symptoms=report_content.get("symptoms", ""),
                vitals=vitals_dict
            )
            priority = Priority[priority_str]  # Convert string to enum

        # Check if AI_GENERATED report already exists for this encounter
        existing_report = db.query(SummaryReport).filter(
            SummaryReport.encounter_id == encounter_id,
            SummaryReport.report_type == ReportType.AI_GENERATED
        ).first()

        if existing_report:
            # Update existing AI-generated report
            print(f"=== UPDATING EXISTING AI_GENERATED REPORT ===")
            existing_report.content = report_content
            existing_report.priority = priority
            # Keep status as is (don't change REVIEWED back to PENDING)

            db.commit()
            db.refresh(existing_report)
            return existing_report
        else:
            # Create new AI-generated summary report
            print(f"=== CREATING NEW AI_GENERATED REPORT ===")
            summary_report = SummaryReport(
                encounter_id=encounter_id,
                report_type=ReportType.AI_GENERATED,
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
        Process voice-recorded doctor-patient conversation:
        1. Transcribe audio with speaker identification (Doctor/Patient)
        2. Auto-generate conversation-based summary report with:
           - Full transcript with speaker labels
           - Symptoms discussed
           - Diagnosis provided
           - Medications prescribed
           - Labs ordered
           - Doctor's instructions
           - Next steps

        This creates a CONVERSATION_TRANSCRIPT type report.
        Doctor can later generate a separate AI_GENERATED report if needed.

        Args:
            encounter_id: UUID of the encounter
            audio_base64: Base64 encoded audio data
            db: Database session

        Returns:
            Dictionary with transcription and summary report
        """
        # Transcribe audio with speaker identification
        print(f"=== TRANSCRIBING CONVERSATION WITH SPEAKER IDENTIFICATION ===")
        transcription_text = gemini_service.transcribe_conversation_with_speakers(audio_base64)
        print(f"Transcription length: {len(transcription_text)} characters")
        print(f"First 300 chars: '{transcription_text[:300]}...'")
        print(f"================================================================")

        # Generate conversation-based summary from the transcript
        print(f"=== GENERATING CONVERSATION-BASED SUMMARY ===")
        conversation_summary = gemini_service.generate_conversation_summary(transcription_text)
        print(f"Summary generated with fields: {conversation_summary.keys()}")
        print(f"=============================================")

        # Check if a CONVERSATION_TRANSCRIPT report already exists
        existing_report = db.query(SummaryReport).filter(
            SummaryReport.encounter_id == encounter_id,
            SummaryReport.report_type == ReportType.CONVERSATION_TRANSCRIPT
        ).first()

        if existing_report:
            # Update existing conversation transcript report
            print(f"=== UPDATING EXISTING CONVERSATION REPORT ===")
            existing_report.content = {
                "transcription": transcription_text,
                "symptoms": conversation_summary.get("symptoms", ""),
                "diagnosis": conversation_summary.get("diagnosis", ""),
                "treatment": conversation_summary.get("treatment", ""),
                "tests": conversation_summary.get("tests", ""),
                "prescription": conversation_summary.get("prescription", ""),
                "next_steps": conversation_summary.get("next_steps", "")
            }
            existing_report.status = ReportStatus.PENDING_REVIEW
            db.commit()
            db.refresh(existing_report)
            summary_report = existing_report
            print(f"Report ID: {summary_report.report_id} UPDATED")
        else:
            # Create new conversation transcript report
            print(f"=== CREATING NEW CONVERSATION REPORT ===")
            summary_report = SummaryReport(
                encounter_id=encounter_id,
                report_type=ReportType.CONVERSATION_TRANSCRIPT,
                status=ReportStatus.PENDING_REVIEW,  # Needs doctor review
                priority=None,  # No priority assessment for conversation reports
                content={
                    "transcription": transcription_text,  # Full transcript with speaker labels
                    "symptoms": conversation_summary.get("symptoms", ""),
                    "diagnosis": conversation_summary.get("diagnosis", ""),
                    "treatment": conversation_summary.get("treatment", ""),
                    "tests": conversation_summary.get("tests", ""),
                    "prescription": conversation_summary.get("prescription", ""),
                    "next_steps": conversation_summary.get("next_steps", "")
                }
            )

            db.add(summary_report)
            db.commit()
            db.refresh(summary_report)
            print(f"Report ID: {summary_report.report_id}")

        print(f"Status: {summary_report.status}")
        print(f"====================================")

        return {
            "transcription": {
                "transcription": transcription_text
            },
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
        analysis = gemini_service.analyze_vitals(
            vitals=vitals_dict,
            health_history=health_history
        )

        return analysis


encounter_service = EncounterService()
