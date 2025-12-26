"""
Test authentication endpoints
"""
import pytest
from unittest.mock import patch, MagicMock
from app.models import User, AuthProvider, UserRole


class TestGoogleAuth:
    """Test Google authentication endpoints"""

    @patch('app.routers.auth_router.GoogleAuthService')
    def test_google_login_new_user(self, mock_google_service, client, db_session):
        """Test Google login creates new user"""
        # Mock Google auth service
        mock_instance = MagicMock()
        mock_instance.verify_google_token.return_value = {
            'email': 'newuser@example.com',
            'google_id': 'google_123'
        }
        mock_google_service.return_value = mock_instance

        response = client.post(
            "/api/auth/google",
            json={"id_token": "fake_google_token"}
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["role"] == "patient"

        # Verify user was created in database
        user = db_session.query(User).filter(User.google_id == "google_123").first()
        assert user is not None
        assert user.email == "newuser@example.com"
        assert user.auth_provider == AuthProvider.GOOGLE

    @patch('app.routers.auth_router.GoogleAuthService')
    def test_google_login_existing_user(self, mock_google_service, client, test_user):
        """Test Google login with existing user"""
        mock_instance = MagicMock()
        mock_instance.verify_google_token.return_value = {
            'email': test_user.email,
            'google_id': test_user.google_id
        }
        mock_google_service.return_value = mock_instance

        response = client.post(
            "/api/auth/google",
            json={"id_token": "fake_google_token"}
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    @patch('app.routers.auth_router.GoogleAuthService')
    def test_google_login_invalid_token(self, mock_google_service, client):
        """Test Google login with invalid token"""
        mock_instance = MagicMock()
        mock_instance.verify_google_token.side_effect = Exception("Invalid token")
        mock_google_service.return_value = mock_instance

        response = client.post(
            "/api/auth/google",
            json={"id_token": "invalid_token"}
        )

        assert response.status_code == 401
        assert "Google authentication failed" in response.json()["detail"]


class TestPhoneAuth:
    """Test phone authentication endpoints"""

    @patch('app.routers.auth_router.phone_auth_service')
    def test_send_verification_code(self, mock_phone_service, client):
        """Test sending verification code"""
        mock_phone_service.send_verification_code.return_value = True

        response = client.post(
            "/api/auth/phone/send-code",
            json={"phone_number": "+1234567890"}
        )

        assert response.status_code == 200
        assert response.json()["message"] == "Verification code sent successfully"
        mock_phone_service.send_verification_code.assert_called_once_with("+1234567890")

    @patch('app.routers.auth_router.phone_auth_service')
    def test_verify_phone_new_user(self, mock_phone_service, client, db_session):
        """Test phone verification creates new user"""
        mock_phone_service.verify_code.return_value = True

        response = client.post(
            "/api/auth/phone/verify",
            json={
                "phone_number": "+1234567890",
                "verification_code": "123456"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["role"] == "patient"

        # Verify user was created
        user = db_session.query(User).filter(User.phone_number == "+1234567890").first()
        assert user is not None
        assert user.auth_provider == AuthProvider.PHONE
        assert user.role == UserRole.PATIENT

    @patch('app.routers.auth_router.phone_auth_service')
    def test_verify_phone_invalid_code(self, mock_phone_service, client):
        """Test phone verification with invalid code"""
        mock_phone_service.verify_code.return_value = False

        response = client.post(
            "/api/auth/phone/verify",
            json={
                "phone_number": "+1234567890",
                "verification_code": "000000"
            }
        )

        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid verification code"


class TestDoctorAuth:
    """Test doctor authentication endpoints"""

    @patch('app.routers.auth_router.phone_auth_service')
    def test_send_doctor_verification_code(self, mock_phone_service, client):
        """Test sending verification code for doctor"""
        mock_phone_service.send_verification_code.return_value = True

        response = client.post(
            "/api/auth/doctor/phone/send-code",
            json={"phone_number": "+9876543210"}
        )

        assert response.status_code == 200
        assert response.json()["message"] == "Verification code sent successfully"

    @patch('app.routers.auth_router.phone_auth_service')
    def test_verify_doctor_phone_new_user(self, mock_phone_service, client, db_session):
        """Test doctor phone verification creates new doctor user"""
        mock_phone_service.verify_code.return_value = True

        response = client.post(
            "/api/auth/doctor/phone/verify",
            json={
                "phone_number": "+9876543210",
                "verification_code": "123456",
                "license_number": "DOC789",
                "specialization": "Cardiology"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["role"] == "doctor"

        # Verify doctor was created
        user = db_session.query(User).filter(User.phone_number == "+9876543210").first()
        assert user is not None
        assert user.role == UserRole.DOCTOR
        assert user.license_number == "DOC789"
        assert user.specialization == "Cardiology"

    @patch('app.routers.auth_router.phone_auth_service')
    def test_verify_doctor_phone_upgrade_existing_patient(self, mock_phone_service, client, db_session):
        """Test upgrading existing patient to doctor"""
        # Create a patient user first
        patient = User(
            phone_number="+9876543210",
            auth_provider=AuthProvider.PHONE,
            role=UserRole.PATIENT,
            is_active=1
        )
        db_session.add(patient)
        db_session.commit()

        mock_phone_service.verify_code.return_value = True

        response = client.post(
            "/api/auth/doctor/phone/verify",
            json={
                "phone_number": "+9876543210",
                "verification_code": "123456",
                "license_number": "DOC999",
                "specialization": "Neurology"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "doctor"

        # Verify user was upgraded to doctor
        db_session.refresh(patient)
        assert patient.role == UserRole.DOCTOR
        assert patient.license_number == "DOC999"
        assert patient.specialization == "Neurology"
