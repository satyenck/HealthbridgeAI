from google.auth.transport import requests
from google.oauth2 import id_token
from app.config import settings


class GoogleAuthService:
    @staticmethod
    def verify_google_token(token: str) -> dict:
        """
        Verify Google ID token and return user info
        """
        try:
            idinfo = id_token.verify_oauth2_token(
                token,
                requests.Request(),
                settings.GOOGLE_CLIENT_ID
            )

            if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
                raise ValueError('Wrong issuer.')

            return {
                'google_id': idinfo['sub'],
                'email': idinfo['email'],
                'email_verified': idinfo.get('email_verified', False),
                'name': idinfo.get('name', ''),
            }
        except ValueError as e:
            raise Exception(f"Invalid token: {str(e)}")
