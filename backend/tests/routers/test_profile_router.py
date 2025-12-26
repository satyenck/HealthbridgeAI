"""
Test profile endpoints
"""
import pytest
from datetime import date
from unittest.mock import patch
from app.models import Gender


class TestProfileCRUD:
    """Test profile CRUD operations"""

    def test_create_profile(self, client, auth_headers):
        """Test creating a new profile"""
        profile_data = {
            "first_name": "Jane",
            "last_name": "Smith",
            "date_of_birth": "1995-05-15",
            "gender": "female",
            "health_condition": "Allergies to peanuts"
        }

        response = client.post(
            "/api/profile/",
            json=profile_data,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["first_name"] == "Jane"
        assert data["last_name"] == "Smith"
        assert data["gender"] == "female"
        assert data["health_condition"] == "Allergies to peanuts"

    def test_create_profile_already_exists(self, client, test_user_with_profile, auth_headers):
        """Test creating profile when one already exists"""
        profile_data = {
            "first_name": "Jane",
            "last_name": "Smith",
            "date_of_birth": "1995-05-15",
            "gender": "female"
        }

        response = client.post(
            "/api/profile/",
            json=profile_data,
            headers=auth_headers
        )

        assert response.status_code == 400
        assert "Profile already exists" in response.json()["detail"]

    def test_create_profile_without_auth(self, client):
        """Test creating profile without authentication"""
        profile_data = {
            "first_name": "Jane",
            "last_name": "Smith",
            "date_of_birth": "1995-05-15",
            "gender": "female"
        }

        response = client.post("/api/profile/", json=profile_data)
        assert response.status_code == 401

    def test_get_profile(self, client, test_user_with_profile, auth_headers):
        """Test getting user profile"""
        response = client.get("/api/profile/", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["first_name"] == "John"
        assert data["last_name"] == "Doe"
        assert data["gender"] == "male"

    def test_get_profile_not_found(self, client, auth_headers):
        """Test getting profile when it doesn't exist"""
        response = client.get("/api/profile/", headers=auth_headers)

        assert response.status_code == 404
        assert response.json()["detail"] == "Profile not found"

    def test_update_profile(self, client, test_user_with_profile, auth_headers):
        """Test updating user profile"""
        update_data = {
            "first_name": "Johnny",
            "last_name": "Doe",
            "date_of_birth": "1990-01-01",
            "gender": "male",
            "health_condition": "Updated health info"
        }

        response = client.put(
            "/api/profile/",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["first_name"] == "Johnny"
        assert data["health_condition"] == "Updated health info"

    def test_update_profile_not_found(self, client, auth_headers):
        """Test updating profile when it doesn't exist"""
        update_data = {
            "first_name": "Johnny",
            "last_name": "Doe",
            "date_of_birth": "1990-01-01",
            "gender": "male"
        }

        response = client.put(
            "/api/profile/",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == 404
        assert response.json()["detail"] == "Profile not found"


class TestVoiceTranscription:
    """Test voice transcription endpoints"""

    @patch('app.routers.profile_router.openai_service')
    def test_transcribe_voice(self, mock_openai_service, client, auth_headers):
        """Test voice transcription"""
        mock_openai_service.transcribe_audio.return_value = "This is a test transcription"

        response = client.post(
            "/api/profile/transcribe-voice",
            json={"audio_base64": "fake_base64_audio_data"},
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["transcription"] == "This is a test transcription"
        mock_openai_service.transcribe_audio.assert_called_once_with("fake_base64_audio_data")

    @patch('app.routers.profile_router.openai_service')
    def test_transcribe_voice_error(self, mock_openai_service, client, auth_headers):
        """Test voice transcription with error"""
        mock_openai_service.transcribe_audio.side_effect = Exception("Transcription failed")

        response = client.post(
            "/api/profile/transcribe-voice",
            json={"audio_base64": "fake_base64_audio_data"},
            headers=auth_headers
        )

        assert response.status_code == 500
        assert "Transcription failed" in response.json()["detail"]

    @patch('app.routers.profile_router.openai_service')
    def test_parse_voice_profile(self, mock_openai_service, client, auth_headers):
        """Test parsing voice to profile data"""
        from unittest.mock import MagicMock

        # Mock transcription
        mock_openai_service.transcribe_audio.return_value = "My name is Alice Johnson, born on March 10, 1988. I am female with no health conditions."

        # Mock OpenAI chat completion
        mock_response = MagicMock()
        mock_response.choices[0].message.content = '''{
            "first_name": "Alice",
            "last_name": "Johnson",
            "date_of_birth": "1988-03-10",
            "gender": "female",
            "health_condition": "None"
        }'''
        mock_openai_service.client.chat.completions.create.return_value = mock_response

        response = client.post(
            "/api/profile/parse-voice-profile",
            json={"audio_base64": "fake_base64_audio_data"},
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "transcription" in data
        assert "profile_data" in data
        assert data["profile_data"]["first_name"] == "Alice"
        assert data["profile_data"]["last_name"] == "Johnson"
        assert data["profile_data"]["gender"] == "female"


class TestProfileValidation:
    """Test profile data validation"""

    def test_create_profile_invalid_data(self, client, auth_headers):
        """Test creating profile with invalid data"""
        invalid_data = {
            "first_name": "",  # Empty string should fail
            "last_name": "Smith",
            "date_of_birth": "1995-05-15",
            "gender": "female"
        }

        response = client.post(
            "/api/profile/",
            json=invalid_data,
            headers=auth_headers
        )

        assert response.status_code == 422  # Validation error

    def test_create_profile_invalid_gender(self, client, auth_headers):
        """Test creating profile with invalid gender"""
        invalid_data = {
            "first_name": "Jane",
            "last_name": "Smith",
            "date_of_birth": "1995-05-15",
            "gender": "invalid_gender"
        }

        response = client.post(
            "/api/profile/",
            json=invalid_data,
            headers=auth_headers
        )

        assert response.status_code == 422  # Validation error

    def test_create_profile_missing_required_field(self, client, auth_headers):
        """Test creating profile with missing required field"""
        incomplete_data = {
            "first_name": "Jane",
            # Missing last_name, date_of_birth, gender
        }

        response = client.post(
            "/api/profile/",
            json=incomplete_data,
            headers=auth_headers
        )

        assert response.status_code == 422  # Validation error
