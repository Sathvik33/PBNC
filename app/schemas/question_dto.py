from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Any, Dict
from datetime import datetime
from app.models.enums import QuestionType, QuestionStatus, WarningType, WarningSeverity, DocumentRelationshipType


class QuestionWarningResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    question_id: str
    warning_type: WarningType
    message: str
    severity: WarningSeverity
    source_page: Optional[int] = None
    resolved: bool
    created_at: datetime


class QuestionOptionDto(BaseModel):
    label: str
    text: str


class QuestionDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    document_id: str
    question_number: Optional[str] = None
    question_text: str
    question_type: QuestionType
    options: Optional[List[Dict[str, Any]]] = None
    answer: Optional[str] = None
    answer_confidence: Optional[float] = None
    confidence: float
    status: QuestionStatus
    source_pages: Optional[List[int]] = None
    source_regions: Optional[List[Dict[str, Any]]] = None
    associated_image: Optional[str] = None
    warnings: List[QuestionWarningResponse] = []
    created_at: datetime


class QuestionListResponse(BaseModel):
    items: List[QuestionDetailResponse]
    total: int


class AnswerKeyEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    document_id: str
    question_number: str
    answer: str
    confidence: float
    source_page: Optional[int] = None
    raw_text: Optional[str] = None
    created_at: datetime


class DocumentRelationshipRequest(BaseModel):
    related_document_id: str
    relationship_type: DocumentRelationshipType


class DocumentRelationshipResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    document_id: str
    related_document_id: str
    relationship_type: DocumentRelationshipType
