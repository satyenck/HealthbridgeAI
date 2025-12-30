"""
Agora Service - Manage video/voice call tokens
Generates RTC tokens for secure Agora video/audio calls
"""
import time
from app.config import settings
from agora_token_builder.RtcTokenBuilder import RtcTokenBuilder, Role_Publisher


class AgoraService:
    def __init__(self):
        self.app_id = settings.AGORA_APP_ID or ""
        self.app_certificate = settings.AGORA_APP_CERTIFICATE or ""

    def generate_call_token(self, channel_name: str, user_id: str) -> dict:
        """
        Generate Agora RTC token for a call session.

        Args:
            channel_name: Unique channel name for the call
            user_id: User ID (string)

        Returns:
            Dictionary with app_id, channel_name, token, uid
        """
        if not self.app_id or not self.app_certificate:
            # For development/testing without Agora credentials
            return {
                "app_id": "test_app_id",
                "channel_name": channel_name,
                "token": "test_token",
                "uid": abs(hash(user_id)) % (10 ** 8),
                "warning": "Using test credentials - Agora not configured"
            }

        # Convert string user_id to integer uid
        uid = abs(hash(user_id)) % (10 ** 8)

        # Token expiration time (1 hour from now)
        expiration_time_in_seconds = 3600
        current_timestamp = int(time.time())
        privilege_expired_ts = current_timestamp + expiration_time_in_seconds

        # Build token with publisher role (can send and receive audio/video)
        token = RtcTokenBuilder.buildTokenWithUid(
            self.app_id,
            self.app_certificate,
            channel_name,
            uid,
            Role_Publisher,
            privilege_expired_ts
        )

        return {
            "app_id": self.app_id,
            "channel_name": channel_name,
            "token": token,
            "uid": uid
        }


agora_service = AgoraService()
