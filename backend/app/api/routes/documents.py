import uuid
import os
from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.core.database import get_db
from app.models.user import User
from app.models.document import Document
from app.models.enums import DocumentStatus
from app.schemas.document import DocumentResponse, DocumentListResponse
from app.services.file_validator import validate_file
from app.services.s3_storage_service import get_storage_service
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    clean_filename, content_type = validate_file(file)

    doc_id = str(uuid.uuid4())
    ext = os.path.splitext(clean_filename)[1].lower()
    storage_filename = f"{doc_id}{ext}"
    storage_path = f"documents/{current_user.id}/{storage_filename}"

    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)

    storage = get_storage_service()
    try:
        saved_path = storage.upload(file.file, storage_path, content_type=content_type)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to persist file in storage: {str(e)}"
        )

    doc = Document(
        id=doc_id,
        owner_id=current_user.id,
        filename=clean_filename,
        file_type=content_type,
        file_size=file_size,
        storage_path=saved_path,
        status=DocumentStatus.UPLOADED,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    count_stmt = select(func.count()).select_from(Document).where(Document.owner_id == current_user.id)
    total = (await db.execute(count_stmt)).scalar() or 0

    stmt = (
        select(Document)
        .where(Document.owner_id == current_user.id)
        .order_by(desc(Document.created_at))
        .offset(skip)
        .limit(limit)
    )
    docs = (await db.execute(stmt)).scalars().all()
    return DocumentListResponse(items=list(docs), total=total)


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Document).where(
        Document.id == document_id,
        Document.owner_id == current_user.id
    )
    res = await db.execute(stmt)
    doc = res.scalars().first()

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access denied"
        )
    return doc


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Document).where(
        Document.id == document_id,
        Document.owner_id == current_user.id
    )
    res = await db.execute(stmt)
    doc = res.scalars().first()

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access denied"
        )

    storage = get_storage_service()
    try:
        storage.delete(doc.storage_path)
    except Exception:
        pass

    await db.delete(doc)
    await db.commit()
    return None
