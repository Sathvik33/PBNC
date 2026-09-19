import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.user import User
from app.models.document import Document
from app.models.question import Question
from app.models.question_warning import QuestionWarning
from app.models.answer_key_entry import AnswerKeyEntry
from app.models.document_relationship import DocumentRelationship
from app.models.enums import QuestionType, QuestionStatus
from app.schemas.question_dto import (
    QuestionDetailResponse,
    QuestionListResponse,
    QuestionWarningResponse,
    AnswerKeyEntryResponse,
    DocumentRelationshipRequest,
    DocumentRelationshipResponse
)
from app.api.dependencies import get_current_user

router = APIRouter(tags=["Questions & Answers"])


@router.get("/documents/{document_id}/questions", response_model=QuestionListResponse)
async def get_document_questions(
    document_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    question_type: Optional[QuestionType] = None,
    status_filter: Optional[QuestionStatus] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    doc_res = await db.execute(
        select(Document).where(Document.id == document_id, Document.owner_id == current_user.id)
    )
    if not doc_res.scalars().first():
        raise HTTPException(status_code=404, detail="Document not found")

    query = select(Question).where(Question.document_id == document_id).options(selectinload(Question.warnings))
    if question_type:
        query = query.where(Question.question_type == question_type)
    if status_filter:
        query = query.where(Question.status == status_filter)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    results = (await db.execute(query.offset(skip).limit(limit))).scalars().all()
    return QuestionListResponse(items=list(results), total=total)


@router.get("/questions/{question_id}", response_model=QuestionDetailResponse)
async def get_question(
    question_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(Question)
        .join(Document, Question.document_id == Document.id)
        .where(Question.id == question_id, Document.owner_id == current_user.id)
        .options(selectinload(Question.warnings))
    )
    res = await db.execute(query)
    q = res.scalars().first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    return q


@router.get("/documents/{document_id}/answers", response_model=List[AnswerKeyEntryResponse])
async def get_document_answers(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    doc_res = await db.execute(
        select(Document).where(Document.id == document_id, Document.owner_id == current_user.id)
    )
    if not doc_res.scalars().first():
        raise HTTPException(status_code=404, detail="Document not found")

    query = select(AnswerKeyEntry).where(AnswerKeyEntry.document_id == document_id)
    entries = (await db.execute(query)).scalars().all()
    return list(entries)


@router.get("/documents/{document_id}/warnings", response_model=List[QuestionWarningResponse])
async def get_document_warnings(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    doc_res = await db.execute(
        select(Document).where(Document.id == document_id, Document.owner_id == current_user.id)
    )
    if not doc_res.scalars().first():
        raise HTTPException(status_code=404, detail="Document not found")

    query = (
        select(QuestionWarning)
        .join(Question, QuestionWarning.question_id == Question.id)
        .where(Question.document_id == document_id)
    )
    warnings = (await db.execute(query)).scalars().all()
    return list(warnings)


@router.post("/documents/{document_id}/relationships", response_model=DocumentRelationshipResponse, status_code=status.HTTP_201_CREATED)
async def create_document_relationship(
    document_id: str,
    body: DocumentRelationshipRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify ownership of both documents
    d1 = (await db.execute(select(Document).where(Document.id == document_id, Document.owner_id == current_user.id))).scalars().first()
    d2 = (await db.execute(select(Document).where(Document.id == body.related_document_id, Document.owner_id == current_user.id))).scalars().first()

    if not d1 or not d2:
        raise HTTPException(status_code=404, detail="One or both documents not found")

    rel = DocumentRelationship(
        id=str(uuid.uuid4()),
        document_id=document_id,
        related_document_id=body.related_document_id,
        relationship_type=body.relationship_type
    )
    db.add(rel)
    await db.commit()
    await db.refresh(rel)
    return rel


@router.get("/documents/{document_id}/relationships", response_model=List[DocumentRelationshipResponse])
async def get_document_relationships(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    doc_res = await db.execute(
        select(Document).where(Document.id == document_id, Document.owner_id == current_user.id)
    )
    if not doc_res.scalars().first():
        raise HTTPException(status_code=404, detail="Document not found")

    rels = (await db.execute(
        select(DocumentRelationship).where(DocumentRelationship.document_id == document_id)
    )).scalars().all()
    return list(rels)
