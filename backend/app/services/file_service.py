import os
import uuid as uuid_lib
from uuid import UUID
from typing import List
from fastapi import UploadFile, HTTPException, status
from app.models_v2 import MediaFile, PatientDocument
from sqlalchemy.orm import Session
from app.services.encryption_service import get_encryption_service


class FileService:
    UPLOAD_DIR = "uploads/media"
    MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB
    MAX_VIDEO_SIZE = 60 * 1024 * 1024  # 60MB for videos (1 min max as per requirements)

    ALLOWED_EXTENSIONS = {
        "image": [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"],
        "video": [".mp4", ".mov", ".avi", ".mkv", ".webm"],
        "document": [".pdf", ".doc", ".docx", ".txt"]
    }

    @classmethod
    def _get_file_type(cls, filename: str) -> str:
        """Determine file type based on extension"""
        ext = os.path.splitext(filename)[1].lower()

        for file_type, extensions in cls.ALLOWED_EXTENSIONS.items():
            if ext in extensions:
                return file_type

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed: images, videos, PDFs, documents"
        )

    @classmethod
    def _validate_file(cls, file: UploadFile) -> None:
        """Validate file size and type"""
        # Check file size (read first chunk to get size)
        file.file.seek(0, 2)  # Seek to end
        file_size = file.file.tell()
        file.file.seek(0)  # Reset to beginning

        # Get file type for size validation
        file_type = cls._get_file_type(file.filename)

        # Validate size based on file type
        if file_type == "video" and file_size > cls.MAX_VIDEO_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Video size exceeds maximum of {cls.MAX_VIDEO_SIZE / 1024 / 1024}MB (approx 1 min)"
            )
        elif file_size > cls.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File size exceeds maximum allowed size of {cls.MAX_FILE_SIZE / 1024 / 1024}MB"
            )

    @classmethod
    async def save_encounter_file(cls, file: UploadFile, encounter_id: UUID, db: Session) -> MediaFile:
        """Save uploaded file for an encounter and create database record"""
        # Validate file
        cls._validate_file(file)

        # Get file type
        file_type = cls._get_file_type(file.filename)

        # Generate unique filename
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{encounter_id}_{uuid_lib.uuid4().hex}{file_extension}"

        # Ensure upload directory exists
        os.makedirs(cls.UPLOAD_DIR, exist_ok=True)

        # Full file path
        file_path = os.path.join(cls.UPLOAD_DIR, unique_filename)

        # Save file to disk with encryption
        try:
            contents = await file.read()

            # Encrypt file contents for HIPAA compliance
            encryption_service = get_encryption_service()
            encrypted_contents = encryption_service.encrypt_file(contents)

            with open(file_path, "wb") as f:
                f.write(encrypted_contents)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save file: {str(e)}"
            )

        # Create database record
        file_size = len(contents)
        media_file = MediaFile(
            encounter_id=encounter_id,
            file_type=file_type,
            filename=file.filename,
            file_path=file_path,
            file_size=file_size
        )

        db.add(media_file)
        db.commit()
        db.refresh(media_file)

        return media_file

    @classmethod
    async def save_encounter_files(cls, files: List[UploadFile], encounter_id: UUID, db: Session) -> List[MediaFile]:
        """Save multiple files for an encounter"""
        saved_files = []
        for file in files:
            saved_file = await cls.save_encounter_file(file, encounter_id, db)
            saved_files.append(saved_file)
        return saved_files

    @classmethod
    def get_file_path(cls, file_id: UUID, db: Session) -> str:
        """Get file path for a file ID"""
        media_file = db.query(MediaFile).filter(MediaFile.file_id == file_id).first()

        if not media_file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )

        if not os.path.exists(media_file.file_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found on disk"
            )

        return media_file.file_path

    @classmethod
    def read_encrypted_file(cls, file_id: UUID, db: Session) -> bytes:
        """
        Read and decrypt an encrypted file

        Args:
            file_id: UUID of the file to read
            db: Database session

        Returns:
            Decrypted file contents as bytes

        Raises:
            HTTPException: If file not found or decryption fails
        """
        # Get file path
        file_path = cls.get_file_path(file_id, db)

        try:
            # Read encrypted file from disk
            with open(file_path, "rb") as f:
                encrypted_contents = f.read()

            # Decrypt file contents
            encryption_service = get_encryption_service()
            decrypted_contents = encryption_service.decrypt_file(encrypted_contents)

            return decrypted_contents

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to read file: {str(e)}"
            )

    @classmethod
    def delete_file(cls, file_id: UUID, db: Session) -> None:
        """Delete file from disk and database"""
        media_file = db.query(MediaFile).filter(MediaFile.file_id == file_id).first()

        if not media_file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )

        # Delete from disk
        if os.path.exists(media_file.file_path):
            try:
                os.remove(media_file.file_path)
            except Exception as e:
                print(f"Error deleting file from disk: {e}")

        # Delete from database
        db.delete(media_file)
        db.commit()

    # =========================================================================
    # PATIENT DOCUMENT METHODS (not encounter-linked)
    # =========================================================================

    @classmethod
    async def save_patient_document(cls, file: UploadFile, patient_id: UUID, db: Session) -> PatientDocument:
        """Save uploaded document for a patient (not linked to encounter)"""
        # Validate file
        cls._validate_file(file)

        # Get file type
        file_type = cls._get_file_type(file.filename)

        # Generate unique filename
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"patient_{patient_id}_{uuid_lib.uuid4().hex}{file_extension}"

        # Ensure upload directory exists
        os.makedirs(cls.UPLOAD_DIR, exist_ok=True)

        # Full file path
        file_path = os.path.join(cls.UPLOAD_DIR, unique_filename)

        # Save file to disk with encryption
        try:
            contents = await file.read()

            # Encrypt file contents for HIPAA compliance
            encryption_service = get_encryption_service()
            encrypted_contents = encryption_service.encrypt_file(contents)

            with open(file_path, "wb") as f:
                f.write(encrypted_contents)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save file: {str(e)}"
            )

        # Create database record
        file_size = len(contents)
        patient_doc = PatientDocument(
            patient_id=patient_id,
            file_type=file_type,
            filename=file.filename,
            file_path=file_path,
            file_size=file_size
        )

        db.add(patient_doc)
        db.commit()
        db.refresh(patient_doc)

        return patient_doc

    @classmethod
    async def save_patient_documents(cls, files: List[UploadFile], patient_id: UUID, db: Session) -> List[PatientDocument]:
        """Save multiple documents for a patient"""
        saved_files = []
        for file in files:
            saved_file = await cls.save_patient_document(file, patient_id, db)
            saved_files.append(saved_file)
        return saved_files

    @classmethod
    def get_patient_document_path(cls, file_id: UUID, db: Session) -> str:
        """Get file path for a patient document"""
        patient_doc = db.query(PatientDocument).filter(PatientDocument.file_id == file_id).first()

        if not patient_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )

        if not os.path.exists(patient_doc.file_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found on disk"
            )

        return patient_doc.file_path

    @classmethod
    def read_encrypted_patient_document(cls, file_id: UUID, db: Session) -> bytes:
        """Read and decrypt an encrypted patient document"""
        file_path = cls.get_patient_document_path(file_id, db)

        try:
            with open(file_path, "rb") as f:
                encrypted_contents = f.read()

            encryption_service = get_encryption_service()
            decrypted_contents = encryption_service.decrypt_file(encrypted_contents)

            return decrypted_contents

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to read document: {str(e)}"
            )

    @classmethod
    def delete_patient_document(cls, file_id: UUID, db: Session) -> None:
        """Delete patient document from disk and database"""
        patient_doc = db.query(PatientDocument).filter(PatientDocument.file_id == file_id).first()

        if not patient_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )

        # Delete from disk
        if os.path.exists(patient_doc.file_path):
            try:
                os.remove(patient_doc.file_path)
            except Exception as e:
                print(f"Error deleting document from disk: {e}")

        # Delete from database
        db.delete(patient_doc)
        db.commit()
