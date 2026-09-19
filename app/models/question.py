import uuid
from typing import List, Optional, Any, Dict, TYPE_CHECKING
from sqlalchemy import String, Text, Float, ForeignKey, Enum as SQLEnum, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin
from app.models.enums import QuestionStatus, QuestionType

if TYPE_CHECKING:
    from app.models.document import Document
    from app.models.question_warning import QuestionWarning


class Question(Base, TimestampMixin):
    __tablename__ = "questions"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    document_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    question_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[QuestionType] = mapped_column(
        SQLEnum(QuestionType, native_enum=False),
        default=QuestionType.UNKNOWN,
        nullable=False
    )
    # List of options: [{"label": "A", "text": "..."}]
    options: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)
    answer: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    answer_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    status: Mapped[QuestionStatus] = mapped_column(
        SQLEnum(QuestionStatus, native_enum=False),
        default=QuestionStatus.EXTRACTED,
        nullable=False,
        index=True
    )
    source_pages: Mapped[Optional[List[int]]] = mapped_column(JSON, nullable=True)
    source_regions: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)
    associated_image: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    raw_extraction: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)

    document: Mapped["Document"] = relationship("Document", back_populates="questions")
    warnings: Mapped[List["QuestionWarning"]] = relationship(
        "QuestionWarning",
        back_populates="question",
        cascade="all, delete-orphan"
    )
