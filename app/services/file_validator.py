import os
from typing import Tuple
from fastapi import HTTPException, status, UploadFile
from app.core.config import settings

ALLOWED_MIME_TYPES = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
}

# Magic byte signatures
MAGIC_SIGNATURES = {
    b"%PDF-": "application/pdf",
    b"\xff\xd8\xff": "image/jpeg",
    b"\x89PNG\r\n\x1a\n": "image/png",
}


def sanitize_filename(filename: str) -> str:
    base = os.path.basename(filename)
    clean = "".join(c for c in base if c.isalnum() or c in "._- ")
    return clean.strip() or "unnamed_document"


def validate_file(file: UploadFile) -> Tuple[str, str]:
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required"
        )

    clean_name = sanitize_filename(file.filename)
    ext = os.path.splitext(clean_name)[1].lower()
    if ext == ".jpeg":
        ext = ".jpg"

    header = file.file.read(16)
    file.file.seek(0)

    detected_mime = None
    for signature, mime in MAGIC_SIGNATURES.items():
        if header.startswith(signature):
            detected_mime = mime
            break

    if not detected_mime or detected_mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported or corrupted file type. Supported: PDF, JPG, JPEG, PNG"
        )

    expected_ext = ALLOWED_MIME_TYPES[detected_mime]
    if ext != expected_ext:
        clean_name = f"{os.path.splitext(clean_name)[0]}{expected_ext}"

    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)

    if file_size > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {settings.MAX_FILE_SIZE_MB}MB"
        )

    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty"
        )

    return clean_name, detected_mime
