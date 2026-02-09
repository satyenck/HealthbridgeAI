"""
Encryption Service for HIPAA-compliant file encryption
Encrypts uploaded medical files (images, PDFs, videos) at rest
"""
import os
from cryptography.fernet import Fernet
from fastapi import HTTPException, status


class EncryptionService:
    """
    Service for encrypting and decrypting uploaded files
    Uses Fernet (symmetric encryption) from cryptography library
    """

    def __init__(self):
        """Initialize encryption service with key from environment"""
        encryption_key = os.getenv('ENCRYPTION_KEY')

        if not encryption_key:
            raise ValueError(
                "ENCRYPTION_KEY not found in environment variables. "
                "Generate one with: python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'"
            )

        try:
            self.cipher = Fernet(encryption_key.encode())
        except Exception as e:
            raise ValueError(f"Invalid ENCRYPTION_KEY format: {str(e)}")

    def encrypt_file(self, file_data: bytes) -> bytes:
        """
        Encrypt file data

        Args:
            file_data: Raw file bytes to encrypt

        Returns:
            Encrypted file bytes

        Raises:
            HTTPException: If encryption fails
        """
        try:
            return self.cipher.encrypt(file_data)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to encrypt file: {str(e)}"
            )

    def decrypt_file(self, encrypted_data: bytes) -> bytes:
        """
        Decrypt file data

        Args:
            encrypted_data: Encrypted file bytes

        Returns:
            Decrypted file bytes

        Raises:
            HTTPException: If decryption fails
        """
        try:
            return self.cipher.decrypt(encrypted_data)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to decrypt file: {str(e)}"
            )


# Global instance (initialized once on app startup)
_encryption_service = None


def get_encryption_service() -> EncryptionService:
    """
    Get or create global encryption service instance

    Returns:
        EncryptionService instance
    """
    global _encryption_service
    if _encryption_service is None:
        _encryption_service = EncryptionService()
    return _encryption_service
