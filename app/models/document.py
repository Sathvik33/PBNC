import uuid
from datetime import datetime
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, Integer, DateTime, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin
from app.models.enums import DocumentStatus

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.document_page import DocumentPage
    from app.models.question import Question
    from app.models.answer_key_entry import AnswerKeyEntry
    from app.models.processing_job import ProcessingJob
    from app.models.document_relationship import DocumentRelationship


class Document(Base, TimestampMixin):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    owner_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(50), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    storage_path: Mapped[str] = mapped_column(String(512), nullable=False)
    status: Mapped[DocumentStatus] = mapped_column(
        SQLEnum(DocumentStatus, native_enum=False),
        default=DocumentStatus.UPLOADED,
        nullable=False,
        index=True
    )
    page_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    processing_started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    processing_completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    owner: Mapped["User"] = relationship("User", back_populates="documents")
    pages: Mapped[List["DocumentPage"]] = relationship("DocumentPage", back_populates="document", cascade="all, delete-orphan", order_by="DocumentPage.page_number")
    questions: Mapped[List["Question"]] = relationship("Question", back_populates="document", cascade="all, delete-orphan")
    answer_key_entries: Mapped[List["AnswerKeyEntry"]] = relationship("AnswerKeyEntry", back_populates="document", cascade="all, delete-orphan")
    processing_jobs: Mapped[List["ProcessingJob"]] = relationship("ProcessingJob", back_populates="document", cascade="all, delete-orphan")
    
    relationships: Mapped[List["DocumentRelationship"]] = relationship(
        "DocumentRelationship",
        foreign_keys="DocumentRelationship.document_id",
        back_populates="document",
        cascade="all, delete-orphan"
    )
