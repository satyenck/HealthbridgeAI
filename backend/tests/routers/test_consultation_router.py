"""
Test consultation endpoints
"""
import pytest
from unittest.mock import patch, MagicMock
from app.models import Consultation, ReportStatus, UserRole


@pytest.fixture
def test_consultation(db_session, test_user):
    """Create a test consultation"""
    consultation = Consultation(
        user_id=test_user.id,
        patient_description="I have a headache and fever",
        symptoms="Headache, fever",
        potential_diagnosis="Possible flu or viral infection",
        potential_treatment="Rest and fluids",
        next_steps="Monitor symptoms for 48 hours",
        status=ReportStatus.PENDING
    )
    db_session.add(consultation)
    db_session.commit()
    db_session.refresh(consultation)
    return consultation


@pytest.fixture
def reviewed_consultation(db_session, test_user, test_doctor):
    """Create a reviewed consultation"""
    consultation = Consultation(
        user_id=test_user.id,
        patient_description="I have a cough",
        symptoms="Persistent cough",
        potential_diagnosis="Upper respiratory infection",
        potential_treatment="Cough syrup and rest",
        next_steps="Follow up in one week",
        status=ReportStatus.REVIEWED,
        doctor_id=test_doctor.id
    )
    db_session.add(consultation)
    db_session.commit()
    db_session.refresh(consultation)
    return consultation


class TestCreateConsultation:
    """Test creating consultations"""

    @patch('app.routers.consultation_router.openai_service')
    def test_create_consultation_success(self, mock_openai, client, auth_headers, test_user_with_profile):
        """Test creating a new consultation"""
        mock_openai.generate_consultation_report.return_value = {
            'symptoms': 'Fever, headache, body aches',
            'potential_diagnosis': 'Possible influenza',
            'potential_treatment': 'Rest, fluids, over-the-counter pain relief',
            'next_steps': 'Monitor symptoms and seek medical attention if worsening'
        }

        consultation_data = {
            "patient_description": "I have been feeling unwell with fever and headache for 2 days"
        }

        response = client.post(
            "/api/consultations/",
            json=consultation_data,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["patient_description"] == consultation_data["patient_description"]
        assert data["symptoms"] == "Fever, headache, body aches"
        assert data["potential_diagnosis"] == "Possible influenza"
        assert data["status"] == "pending"

    @patch('app.routers.consultation_router.openai_service')
    def test_create_consultation_without_profile(self, mock_openai, client, auth_headers):
        """Test creating consultation without profile"""
        mock_openai.generate_consultation_report.return_value = {
            'symptoms': 'Fever',
            'potential_diagnosis': 'Common cold',
            'potential_treatment': 'Rest',
            'next_steps': 'Monitor'
        }

        consultation_data = {
            "patient_description": "I have a fever"
        }

        response = client.post(
            "/api/consultations/",
            json=consultation_data,
            headers=auth_headers
        )

        assert response.status_code == 200

    def test_create_consultation_without_auth(self, client):
        """Test creating consultation without authentication"""
        response = client.post(
            "/api/consultations/",
            json={"patient_description": "I have a fever"}
        )
        assert response.status_code == 401

    def test_create_consultation_invalid_description(self, client, auth_headers):
        """Test creating consultation with too short description"""
        response = client.post(
            "/api/consultations/",
            json={"patient_description": "short"},  # Less than 10 characters
            headers=auth_headers
        )
        assert response.status_code == 422


class TestGetConsultations:
    """Test getting consultations list"""

    def test_patient_get_consultations(self, client, auth_headers, reviewed_consultation):
        """Test patient getting their consultations"""
        response = client.get("/api/consultations/", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == reviewed_consultation.id
        assert data[0]["status"] == "reviewed"

    def test_patient_cannot_see_pending_consultations(self, client, auth_headers, test_consultation):
        """Test patient cannot see their pending consultations"""
        response = client.get("/api/consultations/", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 0  # Pending consultations not visible to patients

    def test_doctor_get_pending_consultations(self, client, doctor_auth_headers, test_consultation):
        """Test doctor getting pending consultations"""
        response = client.get("/api/consultations/", headers=doctor_auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        # Should include pending consultations
        pending_found = any(c["status"] == "pending" for c in data)
        assert pending_found

    def test_doctor_get_consultations_with_status_filter(self, client, doctor_auth_headers, test_consultation):
        """Test doctor filtering consultations by status"""
        response = client.get(
            "/api/consultations/",
            params={"status_filter": "pending"},
            headers=doctor_auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        # All returned consultations should be pending
        for consultation in data:
            assert consultation["status"] == "pending"


class TestGetConsultation:
    """Test getting a specific consultation"""

    def test_patient_get_reviewed_consultation(self, client, auth_headers, reviewed_consultation):
        """Test patient getting their reviewed consultation"""
        response = client.get(
            f"/api/consultations/{reviewed_consultation.id}",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == reviewed_consultation.id

    def test_patient_cannot_get_pending_consultation(self, client, auth_headers, test_consultation):
        """Test patient cannot get their pending consultation"""
        response = client.get(
            f"/api/consultations/{test_consultation.id}",
            headers=auth_headers
        )

        assert response.status_code == 403
        assert "not yet reviewed" in response.json()["detail"]

    def test_doctor_get_pending_consultation(self, client, doctor_auth_headers, test_consultation):
        """Test doctor getting pending consultation"""
        response = client.get(
            f"/api/consultations/{test_consultation.id}",
            headers=doctor_auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_consultation.id

    def test_get_nonexistent_consultation(self, client, auth_headers):
        """Test getting non-existent consultation"""
        response = client.get("/api/consultations/99999", headers=auth_headers)

        assert response.status_code == 404


class TestUpdateConsultation:
    """Test updating consultations (Doctor only)"""

    def test_doctor_update_consultation(self, client, doctor_auth_headers, test_consultation, db_session):
        """Test doctor updating a consultation"""
        update_data = {
            "symptoms": "Updated symptoms: Severe headache",
            "potential_diagnosis": "Migraine",
            "potential_treatment": "Prescription medication",
            "next_steps": "Follow up in 2 weeks",
            "doctor_notes": "Patient should avoid bright lights",
            "status": "reviewed"
        }

        response = client.patch(
            f"/api/consultations/{test_consultation.id}",
            json=update_data,
            headers=doctor_auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["symptoms"] == "Updated symptoms: Severe headache"
        assert data["potential_diagnosis"] == "Migraine"
        assert data["status"] == "reviewed"
        assert data["doctor_notes"] == "Patient should avoid bright lights"
        assert data["doctor_id"] is not None
        assert data["reviewed_at"] is not None

    def test_patient_cannot_update_consultation(self, client, auth_headers, test_consultation):
        """Test patient cannot update consultation"""
        update_data = {
            "symptoms": "Trying to update"
        }

        response = client.patch(
            f"/api/consultations/{test_consultation.id}",
            json=update_data,
            headers=auth_headers
        )

        # Should fail because get_current_doctor requires doctor role
        assert response.status_code == 403

    def test_doctor_update_nonexistent_consultation(self, client, doctor_auth_headers):
        """Test updating non-existent consultation"""
        response = client.patch(
            "/api/consultations/99999",
            json={"symptoms": "Test"},
            headers=doctor_auth_headers
        )

        assert response.status_code == 404


class TestVoiceTranscription:
    """Test voice transcription for consultations"""

    @patch('app.routers.consultation_router.openai_service')
    def test_transcribe_consultation_description(self, mock_openai, client, auth_headers):
        """Test transcribing voice description"""
        mock_openai.transcribe_audio.return_value = "I have been experiencing chest pain"

        response = client.post(
            "/api/consultations/transcribe-description",
            json={"audio_base64": "fake_base64_audio"},
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["transcription"] == "I have been experiencing chest pain"

    @patch('app.routers.consultation_router.openai_service')
    def test_transcribe_consultation_error(self, mock_openai, client, auth_headers):
        """Test transcription error handling"""
        mock_openai.transcribe_audio.side_effect = Exception("Transcription failed")

        response = client.post(
            "/api/consultations/transcribe-description",
            json={"audio_base64": "fake_base64_audio"},
            headers=auth_headers
        )

        assert response.status_code == 500


class TestConsultationAuthorization:
    """Test authorization for consultations"""

    def test_patient_cannot_see_other_patient_consultation(self, client, db_session):
        """Test patient cannot see another patient's consultation"""
        # Create another user and their consultation
        from app.models import User, AuthProvider
        other_user = User(
            email="other@example.com",
            auth_provider=AuthProvider.GOOGLE,
            google_id="other_google_id",
            is_active=1,
            role=UserRole.PATIENT
        )
        db_session.add(other_user)
        db_session.commit()

        other_consultation = Consultation(
            user_id=other_user.id,
            patient_description="Other patient's issue",
            status=ReportStatus.REVIEWED
        )
        db_session.add(other_consultation)
        db_session.commit()

        # Create first user's token
        from app.auth import create_access_token
        token = create_access_token(data={"sub": str(other_user.id), "role": "patient"})

        # Try to access with different user's consultation
        from app.models import User as UserModel
        first_user = db_session.query(UserModel).filter(UserModel.email == "testuser@example.com").first()
        if first_user:
            first_token = create_access_token(data={"sub": str(first_user.id), "role": "patient"})
            response = client.get(
                f"/api/consultations/{other_consultation.id}",
                headers={"Authorization": f"Bearer {first_token}"}
            )
            assert response.status_code == 403
