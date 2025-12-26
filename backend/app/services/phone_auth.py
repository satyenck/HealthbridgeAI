from twilio.rest import Client
from app.config import settings
import random


class PhoneAuthService:
    def __init__(self):
        if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
            self.client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        else:
            self.client = None
        self.verification_codes = {}

    def send_verification_code(self, phone_number: str) -> bool:
        """
        Send verification code to phone number via SMS
        """
        verification_code = str(random.randint(100000, 999999))

        if self.client and settings.TWILIO_PHONE_NUMBER:
            try:
                message = self.client.messages.create(
                    body=f"Your HealthbridgeAI verification code is: {verification_code}",
                    from_=settings.TWILIO_PHONE_NUMBER,
                    to=phone_number
                )
                self.verification_codes[phone_number] = verification_code
                return True
            except Exception as e:
                raise Exception(f"Failed to send SMS: {str(e)}")
        else:
            # For development/testing - store code in memory
            self.verification_codes[phone_number] = verification_code
            print(f"Development mode - Verification code for {phone_number}: {verification_code}")
            return True

    def verify_code(self, phone_number: str, code: str) -> bool:
        """
        Verify the code sent to phone number
        """
        print(f"DEBUG - Verifying phone: {phone_number}, code: {code}")
        print(f"DEBUG - Stored codes: {self.verification_codes}")
        stored_code = self.verification_codes.get(phone_number)
        print(f"DEBUG - Retrieved stored code: {stored_code}")
        if stored_code and stored_code == code:
            del self.verification_codes[phone_number]
            return True
        return False


phone_auth_service = PhoneAuthService()
